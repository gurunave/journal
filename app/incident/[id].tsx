import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SentimentPicker, SeverityPicker, ThemePicker } from '../../src/components/pickers';
import { Avatar, Button, Card, Field, SectionHeader } from '../../src/components/ui';
import { fullDateTime } from '../../src/lib/format';
import { signedPhotoUrl } from '../../src/lib/photos';
import { colors, sentimentColor, space } from '../../src/lib/theme';
import type { Sentiment } from '../../src/lib/types';
import { useData } from '../../src/state/store';

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { incidents, reportees, categories, addCategory, updateIncident, deleteIncident } =
    useData();

  const incident = incidents.find((x) => x.id === id) ?? null;
  const reportee = reportees.find((r) => r.id === incident?.reportee_id) ?? null;

  const [sentiment, setSentiment] = useState<Sentiment>(incident?.sentiment ?? 'neutral');
  const [severity, setSeverity] = useState(incident?.severity ?? 3);
  const [themes, setThemes] = useState<string[]>(incident?.themes ?? []);
  const [note, setNote] = useState(incident?.note ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // On a deep link or a page reload the incident arrives after this screen
  // mounts, so seed the form the first time each id resolves. Keyed on the id
  // only, so it never clobbers edits in progress.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!incident || hydratedFor.current === incident.id) return;
    hydratedFor.current = incident.id;
    setSentiment(incident.sentiment);
    setSeverity(incident.severity);
    setThemes(incident.themes ?? []);
    setNote(incident.note);
  }, [incident]);

  const categoryLabels = useMemo(() => categories.map((c) => c.label), [categories]);

  useEffect(() => {
    navigation.setOptions({ title: reportee?.name ?? 'Incident' });
  }, [navigation, reportee?.name]);

  useEffect(() => {
    let active = true;
    if (incident?.local_photo_uri) {
      setPhotoUrl(incident.local_photo_uri);
    } else if (incident?.photo_path) {
      void signedPhotoUrl(incident.photo_path).then((url) => {
        if (active) setPhotoUrl(url);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      active = false;
    };
  }, [incident?.photo_path, incident?.local_photo_uri]);

  if (!incident) {
    return (
      <View style={styles.center}>
        <Text style={styles.missing}>This entry is no longer available.</Text>
      </View>
    );
  }

  const dirty =
    sentiment !== incident.sentiment ||
    severity !== incident.severity ||
    !sameThemes(themes, incident.themes) ||
    note !== incident.note;

  async function save() {
    setSaving(true);
    try {
      await updateIncident(incident!.id, { sentiment, severity, themes, note: note.trim() });
      router.back();
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    const remove = () => {
      void deleteIncident(incident!.id);
      router.back();
    };
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (window.confirm('Delete this entry? This cannot be undone.')) remove();
      return;
    }
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Avatar name={reportee?.name ?? '?'} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{reportee?.name ?? 'Unknown'}</Text>
          <Text style={styles.stamp}>{fullDateTime(incident.occurred_at)}</Text>
          {incident.pending ? <Text style={styles.pending}>Queued — will sync</Text> : null}
          {incident.discussed_at ? (
            <Text style={styles.discussed}>
              Discussed in a 1:1 on {fullDateTime(incident.discussed_at)}
            </Text>
          ) : null}
        </View>
      </Card>

      <View style={styles.block}>
        <SectionHeader title="What kind" />
        <SentimentPicker value={sentiment} onChange={setSentiment} />
      </View>

      <View style={styles.block}>
        <SectionHeader title={`Impact · ${severity}/5`} />
        <SeverityPicker value={severity} onChange={setSeverity} tint={sentimentColor[sentiment]} />
      </View>

      <View style={styles.block}>
        <SectionHeader title={themes.length > 1 ? `Themes · ${themes.length}` : 'Themes'} />
        <ThemePicker
          themes={categoryLabels}
          value={themes}
          onChange={setThemes}
          onCreate={addCategory}
        />
      </View>

      <View style={styles.block}>
        <SectionHeader title="Note" />
        <Field value={note} onChangeText={setNote} multiline placeholder="What happened…" />
      </View>

      {photoUrl ? (
        <View style={styles.block}>
          <SectionHeader title="Photo" />
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        </View>
      ) : null}

      <Button title="Save changes" onPress={save} disabled={!dirty} loading={saving} />
      <Button title="Delete entry" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

/** Order is not meaningful, so compare themes as sets. */
function sameThemes(a: string[], b: string[] | undefined): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();
  return left.length === right.length && left.every((x, i) => x === right[i]);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: space.xl,
  },
  missing: { color: colors.textDim, fontSize: 15 },
  headerCard: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  stamp: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  pending: { color: colors.accent, fontSize: 12, marginTop: 4 },
  discussed: { color: colors.positive, fontSize: 12, marginTop: 4 },
  block: { gap: space.sm },
  photo: { width: '100%', height: 260, borderRadius: 12, backgroundColor: colors.surfaceAlt },
});
