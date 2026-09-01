import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Legend, RankedBars, SentimentBar, TrendBars } from '../../src/components/charts';
import { Avatar, Card, Chip, EmptyState, SectionHeader } from '../../src/components/ui';
import {
  RANGES,
  countCategories,
  countSentiments,
  staleReportees,
  statsByReportee,
  weeklyTrend,
  type RangeKey,
} from '../../src/lib/analytics';
import { relativeTime } from '../../src/lib/format';
import { colors, radius, space } from '../../src/lib/theme';
import { withinRange } from '../../src/lib/analytics';
import { useData } from '../../src/state/store';

export default function Insights() {
  const router = useRouter();
  const { incidents, activeReportees } = useData();
  const [range, setRange] = useState<RangeKey>('90d');

  const scoped = useMemo(() => withinRange(incidents, range), [incidents, range]);
  const totals = useMemo(() => countSentiments(scoped), [scoped]);
  const stats = useMemo(() => statsByReportee(scoped, activeReportees), [scoped, activeReportees]);
  const themes = useMemo(() => countCategories(scoped).slice(0, 8), [scoped]);
  const trend = useMemo(() => weeklyTrend(scoped, 12), [scoped]);
  const stale = useMemo(() => staleReportees(stats, 21), [stats]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {RANGES.map((r) => (
          <Chip
            key={r.key}
            compact
            label={r.label}
            selected={range === r.key}
            onPress={() => setRange(r.key)}
          />
        ))}
      </ScrollView>

      {scoped.length === 0 ? (
        <EmptyState
          title="No data in this range"
          body="Capture a few incidents, or widen the time range."
        />
      ) : (
        <>
          <Card style={{ gap: space.md }}>
            <View style={styles.statRow}>
              <Stat label="Entries" value={String(scoped.length)} />
              <Stat label="Wins" value={String(totals.positive)} tint={colors.positive} />
              <Stat label="Concerns" value={String(totals.concern)} tint={colors.concern} />
              <Stat
                label="Avg impact"
                value={(scoped.reduce((s, i) => s + i.severity, 0) / scoped.length).toFixed(1)}
              />
            </View>
            <SentimentBar counts={totals} height={10} />
            <Legend />
          </Card>

          <View style={styles.block}>
            <SectionHeader title="Last 12 weeks" />
            <Card>
              <TrendBars data={trend} />
            </Card>
          </View>

          <View style={styles.block}>
            <SectionHeader title="By person" />
            <Card style={{ padding: 0 }}>
              {stats.map((s, idx) => (
                <Pressable
                  key={s.reportee.id}
                  onPress={() =>
                    router.push({ pathname: '/reportee/[id]', params: { id: s.reportee.id } })
                  }
                  style={({ pressed }) => [
                    styles.personRow,
                    idx > 0 && styles.personRowBorder,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <Avatar name={s.reportee.name} size={38} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={styles.personHeader}>
                      <Text style={styles.personName}>{s.reportee.name}</Text>
                      <Text style={styles.personMeta}>
                        {s.total === 0
                          ? 'nothing logged'
                          : `${s.total} · avg ${s.avgSeverity.toFixed(1)}`}
                      </Text>
                    </View>
                    <SentimentBar counts={s.counts} height={6} />
                    <Text style={styles.personMeta}>
                      {s.lastAt ? `last ${relativeTime(s.lastAt)}` : 'no entries in range'}
                      {s.undiscussed > 0 ? ` · ${s.undiscussed} not yet discussed` : ''}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </Card>
          </View>

          <View style={styles.block}>
            <SectionHeader title="Themes" />
            <Card>
              <RankedBars data={themes} />
            </Card>
          </View>

          {stale.length > 0 ? (
            <View style={styles.block}>
              <SectionHeader title="Quiet for 3+ weeks" />
              <Card style={{ gap: space.sm }}>
                <Text style={styles.hint}>
                  Nothing captured for these people lately. That is usually a gap in your notes, not
                  in their work.
                </Text>
                <View style={styles.staleRow}>
                  {stale.map((s) => (
                    <Chip
                      key={s.reportee.id}
                      compact
                      label={s.reportee.name}
                      onPress={() =>
                        router.push({ pathname: '/reportee/[id]', params: { id: s.reportee.id } })
                      }
                    />
                  ))}
                </View>
              </Card>
            </View>
          ) : null}
        </>
      )}
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
  chipRow: { gap: space.sm, paddingRight: space.lg },
  block: { gap: space.sm },
  statRow: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, gap: 2 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textFaint, fontSize: 11 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  personRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderRadius: 0,
  },
  personHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  personName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  personMeta: { color: colors.textFaint, fontSize: 12 },
  chevron: { color: colors.textFaint, fontSize: 22 },
  hint: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  staleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
