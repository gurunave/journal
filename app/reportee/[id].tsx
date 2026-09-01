import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IncidentRow } from '../../src/components/IncidentRow';
import { Legend, RankedBars, SentimentBar } from '../../src/components/charts';
import { Avatar, Button, Card, EmptyState, SectionHeader } from '../../src/components/ui';
import { countCategories, countSentiments } from '../../src/lib/analytics';
import { fullDateTime, pluralize, relativeTime } from '../../src/lib/format';
import { colors, sentimentLabel, space } from '../../src/lib/theme';
import type { Incident } from '../../src/lib/types';
import { useData } from '../../src/state/store';

export default function ReporteeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { reportees, incidents, oneOnOnes, logOneOnOne } = useData();

  const reportee = reportees.find((r) => r.id === id) ?? null;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const mine = useMemo(
    () => incidents.filter((i) => i.reportee_id === id),
    [incidents, id],
  );
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
      <View style={styles.center}>
        <Text style={styles.missing}>This person is no longer available.</Text>
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

    const message = `This marks ${pluralize(
      undiscussed.length,
      'entry',
      'entries',
    )} as discussed.`;

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.header}>
        <Avatar name={reportee.name} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{reportee.name}</Text>
          {reportee.role ? <Text style={styles.role}>{reportee.role}</Text> : null}
          <Text style={styles.meta}>
            {lastOneOnOne
              ? `Last 1:1 ${relativeTime(lastOneOnOne.held_at)}`
              : 'No 1:1 logged yet'}
          </Text>
        </View>
      </Card>

      {mine.length > 0 ? (
        <Card style={{ gap: space.md }}>
          <View style={styles.statRow}>
            <Stat label="Entries" value={String(mine.length)} />
            <Stat label="Wins" value={String(counts.positive)} tint={colors.positive} />
            <Stat label="Concerns" value={String(counts.concern)} tint={colors.concern} />
            <Stat
              label="Avg impact"
              value={(mine.reduce((s, i) => s + i.severity, 0) / mine.length).toFixed(1)}
            />
          </View>
          <SentimentBar counts={counts} height={10} />
          <Legend />
        </Card>
      ) : null}

      <View style={styles.block}>
        <SectionHeader title={`1:1 prep · ${undiscussed.length} to cover`} />
        {undiscussed.length === 0 ? (
          <Card>
            <Text style={styles.hint}>
              Nothing new since the last 1:1. Capture as things happen and this fills itself in.
            </Text>
          </Card>
        ) : (
          <Card style={{ gap: space.md }}>
            <Text style={styles.brief}>{brief}</Text>
            <Button
              title={copied ? 'Copied ✓' : 'Copy talking points'}
              variant="secondary"
              onPress={copyBrief}
            />
            <Button title="Log 1:1 as held" onPress={markHeld} loading={busy} />
          </Card>
        )}
      </View>

      {themes.length > 0 ? (
        <View style={styles.block}>
          <SectionHeader title="Recurring themes" />
          <Card>
            <RankedBars data={themes} />
          </Card>
        </View>
      ) : null}

      <View style={styles.block}>
        <SectionHeader title="History" />
        {mine.length === 0 ? (
          <EmptyState title="Nothing captured yet" body={`Log the first note about ${reportee.name.split(' ')[0]}.`} />
        ) : (
          <Card style={{ padding: space.xs }}>
            {mine.map((i) => (
              <IncidentRow
                key={i.id}
                incident={i}
                reporteeName={reportee.name}
                showAvatar={false}
                onPress={() => router.push({ pathname: '/incident/[id]', params: { id: i.id } })}
              />
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: space.lg,
    paddingBottom: space.xxl,
    gap: space.lg,
    maxWidth: 720,
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
  header: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  role: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  meta: { color: colors.textFaint, fontSize: 12, marginTop: 4 },
  block: { gap: space.sm },
  statRow: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, gap: 2 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textFaint, fontSize: 11 },
  hint: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  brief: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
