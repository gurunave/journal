import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryPicker, ReporteeStrip, SentimentPicker, SeverityPicker } from '../../src/components/pickers';
import { Button, Card, Field, SectionHeader } from '../../src/components/ui';
import { fullDateTime } from '../../src/lib/format';
import { colors, radius, sentimentColor, space } from '../../src/lib/theme';
import type { Sentiment } from '../../src/lib/types';
import { useData } from '../../src/state/store';

type WhenKey = 'now' | '1h' | '3h' | 'yesterday';

const WHEN_OPTIONS: { key: WhenKey; label: string; minutesAgo: number }[] = [
  { key: 'now', label: 'Now', minutesAgo: 0 },
  { key: '1h', label: '1h ago', minutesAgo: 60 },
  { key: '3h', label: '3h ago', minutesAgo: 180 },
  { key: 'yesterday', label: 'Yesterday', minutesAgo: 60 * 24 },
];

export default function Capture() {
  const router = useRouter();
  const {
    activeReportees,
    categories,
    incidents,
    addIncident,
    deleteIncident,
    pendingCount,
    syncing,
    loading,
  } = useData();

  const [reporteeId, setReporteeId] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [severity, setSeverity] = useState(3);
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<WhenKey>('now');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const noteRef = useRef<TextInput>(null);

  const categoryLabels = useMemo(() => categories.map((c) => c.label), [categories]);
  const selected = activeReportees.find((r) => r.id === reporteeId) ?? null;
  const occurredAt = useMemo(() => {
    const minutes = WHEN_OPTIONS.find((w) => w.key === when)?.minutesAgo ?? 0;
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }, [when]);

  const todayCount = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return incidents.filter((i) => new Date(i.occurred_at) >= startOfDay).length;
  }, [incidents]);

  function resetForm() {
    setSentiment('neutral');
    setSeverity(3);
    setCategory(null);
    setNote('');
    setWhen('now');
    setPhotoUri(null);
  }

  async function pickPhoto(source: 'library' | 'camera') {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.6,
        allowsEditing: false,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert('Could not open photos', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function onAddPhoto() {
    if (Platform.OS === 'web') {
      void pickPhoto('library');
      return;
    }
    Alert.alert('Attach photo', undefined, [
      { text: 'Take photo', onPress: () => void pickPhoto('camera') },
      { text: 'Choose from library', onPress: () => void pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function save() {
    if (!reporteeId) return;
    setSaving(true);
    try {
      const created = await addIncident({
        reportee_id: reporteeId,
        occurred_at: occurredAt,
        sentiment,
        severity,
        category,
        note: note.trim(),
        local_photo_uri: photoUri,
      });
      setJustSavedId(created.id);
      resetForm();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (!loading && activeReportees.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Add your team first</Text>
          <Text style={styles.emptyBody}>
            Capture needs someone to attribute a note to. Add your reportees once and entry becomes
            three taps.
          </Text>
          <Button title="Go to Team" onPress={() => router.push('/team')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Capture</Text>
              <Text style={styles.subtitle}>
                {todayCount === 0
                  ? 'Nothing logged today'
                  : `${todayCount} logged today`}
                {pendingCount > 0 ? ` · ${pendingCount} queued${syncing ? ' (syncing)' : ''}` : ''}
              </Text>
            </View>
          </View>

          {justSavedId ? (
            <View style={styles.savedBanner}>
              <Text style={styles.savedText}>Saved</Text>
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() => {
                  const id = justSavedId;
                  setJustSavedId(null);
                  void deleteIncident(id);
                }}
              >
                <Text style={styles.savedAction}>Undo</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const id = justSavedId;
                  setJustSavedId(null);
                  router.push({ pathname: '/incident/[id]', params: { id } });
                }}
              >
                <Text style={styles.savedAction}>Open</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.block}>
            <SectionHeader title="Who" />
            <ReporteeStrip
              reportees={activeReportees}
              selectedId={reporteeId}
              onSelect={(id) => {
                setReporteeId(id);
                setJustSavedId(null);
                noteRef.current?.focus();
              }}
            />
          </View>

          <View style={styles.block}>
            <SectionHeader title="What kind" />
            <SentimentPicker value={sentiment} onChange={setSentiment} />
          </View>

          <View style={styles.block}>
            <SectionHeader title={`Impact · ${severity}/5`} />
            <SeverityPicker
              value={severity}
              onChange={setSeverity}
              tint={sentimentColor[sentiment]}
            />
          </View>

          {categoryLabels.length > 0 ? (
            <View style={styles.block}>
              <SectionHeader title="Theme" />
              <CategoryPicker
                categories={categoryLabels}
                value={category}
                onChange={setCategory}
              />
            </View>
          ) : null}

          <View style={styles.block}>
            <SectionHeader title="Note" />
            <Field
              ref={noteRef}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="What happened, in your own words…"
            />
          </View>

          <View style={styles.block}>
            <SectionHeader title="When" />
            <View style={styles.whenRow}>
              {WHEN_OPTIONS.map((w) => (
                <Pressable
                  key={w.key}
                  onPress={() => setWhen(w.key)}
                  style={({ pressed }) => [
                    styles.whenChip,
                    when === w.key && styles.whenChipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Text style={[styles.whenText, when === w.key && { color: colors.accent }]}>
                    {w.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.whenStamp}>{fullDateTime(occurredAt)}</Text>
          </View>

          <View style={styles.block}>
            {photoUri ? (
              <Card style={styles.photoCard}>
                <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
                <View style={{ flex: 1, gap: space.sm }}>
                  <Text style={styles.photoLabel}>Photo attached</Text>
                  <Button title="Remove" variant="ghost" onPress={() => setPhotoUri(null)} />
                </View>
              </Card>
            ) : (
              <Button title="＋ Attach photo" variant="secondary" onPress={onAddPhoto} />
            )}
          </View>

          <Button
            title={selected ? `Save for ${selected.name.split(' ')[0]}` : 'Pick someone first'}
            onPress={save}
            disabled={!reporteeId}
            loading={saving}
            style={{ marginTop: space.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  block: { gap: space.sm },
  whenRow: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  whenChip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  whenChipActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  whenText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  whenStamp: { color: colors.textFaint, fontSize: 12 },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    backgroundColor: colors.positive + '1A',
    borderColor: colors.positive + '55',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  savedText: { color: colors.positive, fontWeight: '700' },
  savedAction: { color: colors.text, fontWeight: '600' },
  photoCard: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  photo: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  photoLabel: { color: colors.textDim, fontSize: 14 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '700' },
  emptyBody: {
    color: colors.textDim,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 380,
  },
});
