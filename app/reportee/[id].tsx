import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IncidentRow } from '../../src/components/IncidentRow';
import { Figure, Legend, RankedBars, SentimentBar } from '../../src/components/charts';
import { Avatar, Button, EmptyState, Rule, Section } from '../../src/components/ui';
import { countCategories, countSentiments } from '../../src/lib/analytics';
import { fullDateTime, pluralize, relativeTime } from '../../src/lib/format';
import { fonts, sentimentLabel, space, type, useTheme } from '../../src/lib/theme';
import type { Incident } from '../../src/lib/types';
import { useData } from '../../src/state/store';

export default function ReporteeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { c } = useTheme();
  const { reportees, incidents, oneOnOnes, logOneOnOne } = useData();

  const reportee = reportees.find((r) => r.id === id) ?? null;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const mine = useMemo(() => incidents.filter((i) => i.reportee_id === id), [incidents, id]);
  const undiscussed = useMemo(() => mine.filter((i) => !i.discussed_at), [mine]);
  const lastOneOnOne = useMemo(
    () => oneOnOnes.find((o) => o.reportee_id === id) ?? null,
    [oneOnOnes, id],
  );

  const counts = useMemo(() => countSentiments(mine), [mine]);
  const themes = useMemo(() => countCategories(mine).slice(0, 6), [mine]);

  useEffect(() => {
    navigation.setOptions({ title: reportee?.name ?? '' });
  }, [navigation, reportee?.name]);

  if (!reportee) {
    return (
      <View style={[styles.center, { backgroundColor: c.paper }]}>
        <Text style={[type.prose, { color: c.inkFaint }]}>This person is no longer available.</Text>
      </View>
    );
  }

  const brief = buildBrief(reportee.name, undiscussed, lastOneOnOne?.held_at ?? null);

  async function copyBrief() {
    await Clipboard.setStringAsync(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function markHeld() {
    const run = async () => {
      setBusy(true);
      try {
        await logOneOnOne(reportee!.id);
      } catch (err) {
        Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setBusy(false);
      }
    };
    const message = `This marks ${pluralize(undiscussed.length, 'entry', 'entries')} as discussed.`;

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || window.confirm(message)) void run();
      return;
    }
    Alert.alert('Log 1:1 as held?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log it', onPress: () => void run() },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: c.paper }} contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Avatar name={reportee.name} size={52} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[type.title, { color: c.ink }]}>{reportee.name}</Text>
          {reportee.role ? (
            <Text style={[type.body, { color: c.inkSoft }]}>{reportee.role}</Text>
          ) : null}
          <Text style={[type.meta, { color: c.inkFaint }]}>
            {lastOneOnOne ? `LAST 1:1 ${relativeTime(lastOneOnOne.held_at).toUpperCase()}` : 'NO 1:1 LOGGED'}
          </Text>
        </View>
      </View>
      <Rule strong />

      {mine.length > 0 ? (
        <View style={{ gap: space.lg }}>
          <View style={styles.figures}>
            <Figure value={String(mine.length)} label="Entries" />
            <Figure value={String(counts.positive)} label="Wins" tint={c.positive} />
            <Figure value={String(counts.concern)} label="Concerns" tint={c.concern} />
            <Figure
              value={(mine.reduce((s, i) => s + i.severity, 0) / mine.length).toFixed(1)}
              label="Avg impact"
            />
          </View>
          <SentimentBar counts={counts} height={6} />
          <Legend />
        </View>
      ) : null}

      <Section title={`1:1 prep · ${undiscussed.length} to cover`}>
        {undiscussed.length === 0 ? (
          <Text style={[type.prose, { color: c.inkSoft }]}>
            Nothing new since the last 1:1. Capture as things happen and this fills itself in.
          </Text>
        ) : (
          <View style={{ gap: space.lg }}>
            <Text style={[styles.brief, { color: c.inkSoft }]}>{brief}</Text>
            <Button
              title={copied ? 'Copied' : 'Copy talking points'}
              variant="secondary"
              onPress={copyBrief}
            />
            <Button title="Log 1:1 as held" onPress={markHeld} loading={busy} />
          </View>
        )}
      </Section>

      {themes.length > 0 ? (
        <Section title="Recurring themes">
          <RankedBars data={themes} />
        </Section>
      ) : null}

      <Section title="History">
        {mine.length === 0 ? (
          <EmptyState
            title="Nothing captured yet"
            body={`Log the first note about ${reportee.name.split(' ')[0]}.`}
          />
        ) : (
          <View>
            {mine.map((i, idx) => (
              <View key={i.id}>
                {idx > 0 ? <Rule /> : null}
                <IncidentRow
                  incident={i}
                  reporteeName={reportee.name}
                  showName={false}
                  onPress={() => router.push({ pathname: '/incident/[id]', params: { id: i.id } })}
                />
              </View>
            ))}
          </View>
        )}
      </Section>
    </ScrollView>
  );
}

/** Plain-text talking points, grouped so the 1:1 opens with the wins. */
function buildBrief(name: string, items: Incident[], since: string | null): string {
  if (items.length === 0) return `Nothing new to cover with ${name}.`;

  const lines: string[] = [
    `1:1 with ${name}`,
    since ? `Since last 1:1 on ${fullDateTime(since)}` : 'All entries so far',
    '',
  ];

  for (const group of ['positive', 'neutral', 'concern'] as const) {
    const inGroup = items.filter((i) => i.sentiment === group);
    if (inGroup.length === 0) continue;
    lines.push(`${sentimentLabel[group].toUpperCase()}S (${inGroup.length})`);
    for (const i of inGroup) {
      const when = new Date(i.occurred_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const theme = i.themes?.length ? ` [${i.themes.join(', ')}]` : '';
      lines.push(`• ${when}${theme} (impact ${i.severity}/5): ${i.note || 'no note'}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

const styles = StyleSheet.create({
  content: {
    padding: space.xl,
    paddingBottom: space.xxl,
    gap: space.xl,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  head: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  figures: { flexDirection: 'row', gap: space.md },
  brief: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 20 },
});
