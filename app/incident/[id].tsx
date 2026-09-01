import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SentimentPicker, SeverityPicker, ThemePicker } from '../../src/components/pickers';
import { Avatar, Button, Field, Rule, Section } from '../../src/components/ui';
import { fullDateTime } from '../../src/lib/format';
import { signedPhotoUrl } from '../../src/lib/photos';
import { radius, space, type, useTheme } from '../../src/lib/theme';
import type { Sentiment } from '../../src/lib/types';
import { useData } from '../../src/state/store';

export default function IncidentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { c, sentiment: sentimentInk } = useTheme();
  const { incidents, reportees, categories, addCategory, updateIncident, deleteIncident } =
    useData();

  const incident = incidents.find((x) => x.id === id) ?? null;
  const reportee = reportees.find((r) => r.id === incident?.reportee_id) ?? null;

  // Sibling rows from the same capture. Each person keeps their own row, so
  // editing here only ever changes this person's copy.
  const alsoWith = useMemo(() => {
    if (!incident?.group_id) return [];
    return incidents
      .filter((x) => x.group_id === incident.group_id && x.id !== incident.id)
      .map((x) => reportees.find((r) => r.id === x.reportee_id)?.name ?? 'Unknown');
  }, [incidents, reportees, incident?.group_id, incident?.id]);

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

  const categoryLabels = useMemo(() => categories.map((x) => x.label), [categories]);

  useEffect(() => {
    navigation.setOptions({ title: reportee?.name ?? 'Entry' });
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
      <View style={[styles.center, { backgroundColor: c.paper }]}>
        <Text style={[type.prose, { color: c.inkFaint }]}>This entry is no longer available.</Text>
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
    <ScrollView style={{ backgroundColor: c.paper }} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Avatar name={reportee?.name ?? '?'} size={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[type.title, { color: c.ink }]}>{reportee?.name ?? 'Unknown'}</Text>
          <Text style={[type.meta, { color: c.inkFaint }]}>
            {fullDateTime(incident.occurred_at)}
          </Text>
        </View>
      </View>
      <Rule strong />

      {alsoWith.length ? (
        <Text style={[type.small, { color: c.inkSoft }]}>
          The same capture was also logged for {alsoWith.join(', ')}. Edits here apply to{' '}
          {reportee?.name.split(' ')[0] ?? 'this person'} only.
        </Text>
      ) : null}
      {incident.pending ? (
        <Text style={[type.meta, { color: c.accent }]}>Queued — will sync</Text>
      ) : null}
      {incident.discussed_at ? (
        <Text style={[type.meta, { color: c.positive }]}>
          Discussed on {fullDateTime(incident.discussed_at)}
        </Text>
      ) : null}

      <Section title="What happened">
        <Field value={note} onChangeText={setNote} multiline placeholder="In your own words…" />
      </Section>

      <Section title="Kind">
        <SentimentPicker value={sentiment} onChange={setSentiment} />
      </Section>

      <Section title="Impact">
        <SeverityPicker value={severity} onChange={setSeverity} tint={sentimentInk[sentiment]} />
      </Section>

      <Section title={themes.length > 1 ? `Themes · ${themes.length}` : 'Themes'}>
        <ThemePicker
          themes={categoryLabels}
          value={themes}
          onChange={setThemes}
          onCreate={addCategory}
        />
      </Section>

      {photoUrl ? (
        <Section title="Photo">
          <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
        </Section>
      ) : null}

      <View style={{ gap: space.md }}>
        <Button title="Save changes" onPress={save} disabled={!dirty} loading={saving} />
        <Button title="Delete entry" variant="danger" onPress={confirmDelete} />
      </View>
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
  content: {
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: space.xl,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  head: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  photo: { width: '100%', height: 250, borderRadius: radius.sm },
});
