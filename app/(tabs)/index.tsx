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

import {
  ReporteePicker,
  SentimentPicker,
  SeverityPicker,
  ThemePicker,
} from '../../src/components/pickers';
import { Button, Field, Panel, Rule, Section } from '../../src/components/ui';
import { fullDateTime } from '../../src/lib/format';
import { fonts, radius, space, type, useTheme } from '../../src/lib/theme';
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
  const { c, sentiment: sentimentInk } = useTheme();
  const {
    activeReportees,
    categories,
    incidents,
    addIncident,
    addCategory,
    deleteIncident,
    pendingCount,
    syncing,
    loading,
  } = useData();

  const [reporteeIds, setReporteeIds] = useState<string[]>([]);
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [severity, setSeverity] = useState(3);
  const [themes, setThemes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<WhenKey>('now');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState<string[]>([]);

  const noteRef = useRef<TextInput>(null);

  const categoryLabels = useMemo(() => categories.map((x) => x.label), [categories]);
  const selected = activeReportees.filter((r) => reporteeIds.includes(r.id));
  const occurredAt = useMemo(() => {
    const minutes = WHEN_OPTIONS.find((w) => w.key === when)?.minutesAgo ?? 0;
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }, [when]);

  const recentIds = useMemo(() => {
    const seen: string[] = [];
    for (const i of incidents) if (!seen.includes(i.reportee_id)) seen.push(i.reportee_id);
    return seen;
  }, [incidents]);

  const todayCount = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return incidents.filter((i) => new Date(i.occurred_at) >= startOfDay).length;
  }, [incidents]);

  function resetForm() {
    setSentiment('neutral');
    setSeverity(3);
    setThemes([]);
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
    if (reporteeIds.length === 0) return;
    setSaving(true);
    try {
      const created = await addIncident({
        reportee_ids: reporteeIds,
        occurred_at: occurredAt,
        sentiment,
        severity,
        themes,
        note: note.trim(),
        local_photo_uri: photoUri,
      });
      setJustSaved(created.map((x) => x.id));
      // Keeping one person selected makes logging a second thing about them
      // quick. Keeping a group selected is a trap: the next, unrelated note
      // would silently land in several people's records.
      if (reporteeIds.length > 1) setReporteeIds([]);
      resetForm();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (!loading && activeReportees.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.paper }]} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={[type.eyebrow, { color: c.inkFaint }]}>NOTHING TO WRITE ON</Text>
          <Text style={[type.display, { color: c.ink, textAlign: 'center' }]}>
            Add your team first
          </Text>
          <Text style={[type.prose, { color: c.inkSoft, textAlign: 'center', maxWidth: 340 }]}>
            An entry has to be about someone. Add your reportees once, and capture becomes three
            taps.
          </Text>
          <Button title="Go to Team" onPress={() => router.push('/team')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.paper }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.masthead}>
            <Text style={[type.eyebrow, { color: c.inkFaint }]}>
              {todayCount === 0 ? 'NOTHING LOGGED TODAY' : `${todayCount} LOGGED TODAY`}
              {pendingCount > 0 ? ` · ${pendingCount} QUEUED${syncing ? ' · SYNCING' : ''}` : ''}
            </Text>
            <Text style={[type.display, { color: c.ink }]}>Capture</Text>
          </View>
          <Rule strong />

          {justSaved.length > 0 ? (
            <View style={[styles.saved, { borderColor: c.rule }]}>
              <View style={{ width: 2, backgroundColor: c.positive, alignSelf: 'stretch' }} />
              <Text style={[type.body, { color: c.ink, flex: 1 }]}>
                {justSaved.length > 1 ? `Saved for ${justSaved.length} people` : 'Saved'}
              </Text>
              <Pressable
                onPress={() => {
                  const ids = justSaved;
                  setJustSaved([]);
                  for (const id of ids) void deleteIncident(id);
                }}
              >
                <Text style={[type.eyebrow, { color: c.accent }]}>UNDO</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const [id] = justSaved;
                  setJustSaved([]);
                  router.push({ pathname: '/incident/[id]', params: { id } });
                }}
              >
                <Text style={[type.eyebrow, { color: c.accent }]}>OPEN</Text>
              </Pressable>
            </View>
          ) : null}

          <Section title="Who">
            <ReporteePicker
              reportees={activeReportees}
              selectedIds={reporteeIds}
              recentIds={recentIds}
              onToggle={(id) => {
                setJustSaved([]);
                setReporteeIds((prev) => {
                  const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
                  // Jump to the note on the first pick only, so adding a second
                  // person does not yank focus away mid-selection.
                  if (prev.length === 0 && next.length === 1) noteRef.current?.focus();
                  return next;
                });
              }}
            />
          </Section>

          {/* The composer is the one raised surface in the app. */}
          <Panel style={{ gap: space.xl }}>
            <View style={{ gap: space.md }}>
              <Text style={[type.eyebrow, { color: c.inkFaint }]}>WHAT HAPPENED</Text>
              <Field
                ref={noteRef}
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="In your own words…"
              />
            </View>

            <View style={{ gap: space.md }}>
              <Text style={[type.eyebrow, { color: c.inkFaint }]}>KIND</Text>
              <SentimentPicker value={sentiment} onChange={setSentiment} />
            </View>

            <View style={{ gap: space.md }}>
              <Text style={[type.eyebrow, { color: c.inkFaint }]}>IMPACT</Text>
              <SeverityPicker
                value={severity}
                onChange={setSeverity}
                tint={sentimentInk[sentiment]}
              />
            </View>
          </Panel>

          <Section title={themes.length > 1 ? `Themes · ${themes.length}` : 'Themes'}>
            <ThemePicker
              themes={categoryLabels}
              value={themes}
              onChange={setThemes}
              onCreate={addCategory}
            />
          </Section>

          <Section
            title="When"
            right={<Text style={[type.meta, { color: c.inkFaint }]}>{fullDateTime(occurredAt)}</Text>}
          >
            <View style={styles.whenRow}>
              {WHEN_OPTIONS.map((w) => {
                const on = when === w.key;
                return (
                  <Pressable
                    key={w.key}
                    onPress={() => setWhen(w.key)}
                    style={({ pressed }) => [styles.when, pressed && { opacity: 0.6 }]}
                  >
                    <Text
                      style={[
                        type.body,
                        {
                          color: on ? c.ink : c.inkFaint,
                          fontFamily: on ? fonts.sansMedium : fonts.sans,
                        },
                      ]}
                    >
                      {w.label}
                    </Text>
                    <View
                      style={{
                        height: on ? 2 : StyleSheet.hairlineWidth,
                        backgroundColor: on ? c.accent : c.rule,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {photoUri ? (
            <View style={styles.photoRow}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              <View style={{ flex: 1, gap: space.sm }}>
                <Text style={[type.body, { color: c.inkSoft }]}>Photo attached</Text>
                <Pressable onPress={() => setPhotoUri(null)}>
                  <Text style={[type.eyebrow, { color: c.accent }]}>REMOVE</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Button title="Attach photo" variant="secondary" onPress={onAddPhoto} />
          )}

          <Button
            title={saveLabel(selected)}
            onPress={save}
            disabled={reporteeIds.length === 0}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** "Save for Asha", "Save for Asha + Vikram", "Save for Asha + 3 others". */
function saveLabel(selected: { name: string }[]): string {
  if (selected.length === 0) return 'Pick someone first';
  const first = selected[0].name.split(' ')[0];
  if (selected.length === 1) return `Save for ${first}`;
  if (selected.length === 2) return `Save for ${first} + ${selected[1].name.split(' ')[0]}`;
  return `Save for ${first} + ${selected.length - 1} others`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: space.xl,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  masthead: { gap: space.sm },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.md,
    paddingRight: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  whenRow: { flexDirection: 'row', gap: space.lg },
  when: { flex: 1, gap: space.sm, alignItems: 'center' },
  photoRow: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  photo: { width: 64, height: 64, borderRadius: radius.sm },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
});
