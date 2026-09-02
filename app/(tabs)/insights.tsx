import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Figure, Legend, RankedBars, SentimentBar, TrendBars } from '../../src/components/charts';
import { Chip, EmptyState, Rule, Section } from '../../src/components/ui';
import {
  RANGES,
  countCategories,
  countSentiments,
  staleReportees,
  statsByReportee,
  weeklyTrend,
  withinRange,
  type RangeKey,
} from '../../src/lib/analytics';
import { relativeTime } from '../../src/lib/format';
import { space, type, useTheme } from '../../src/lib/theme';
import { useData } from '../../src/state/store';

export default function Insights() {
  const router = useRouter();
  const { c } = useTheme();
  const { incidents, activeReportees } = useData();
  const [range, setRange] = useState<RangeKey>('90d');

  const scoped = useMemo(() => withinRange(incidents, range), [incidents, range]);
  const totals = useMemo(() => countSentiments(scoped), [scoped]);
  const stats = useMemo(() => statsByReportee(scoped, activeReportees), [scoped, activeReportees]);
  const themes = useMemo(() => countCategories(scoped).slice(0, 8), [scoped]);
  const trend = useMemo(() => weeklyTrend(scoped, 12), [scoped]);
  const stale = useMemo(() => staleReportees(stats, 21), [stats]);

  const avgImpact = scoped.length
    ? (scoped.reduce((s, i) => s + i.severity, 0) / scoped.length).toFixed(1)
    : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.masthead}>
          <Text style={[type.eyebrow, { color: c.inkFaint }]}>What the record shows</Text>
          <Text style={[type.display, { color: c.ink }]}>Patterns</Text>
        </View>
        <Rule strong />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {RANGES.map((r) => (
            <Chip
              key={r.key}
              label={r.label}
              selected={range === r.key}
              onPress={() => setRange(r.key)}
            />
          ))}
        </ScrollView>

        {scoped.length === 0 ? (
          <EmptyState
            title="Nothing in this range"
            body="Capture a few entries, or widen the range above."
          />
        ) : (
          <>
            <View style={{ gap: space.lg }}>
              <View style={styles.figures}>
                <Figure value={String(scoped.length)} label="Entries" />
                <Figure value={String(totals.positive)} label="Wins" tint={c.positive} />
                <Figure value={String(totals.concern)} label="Concerns" tint={c.concern} />
                <Figure value={avgImpact} label="Avg impact" />
              </View>
              <SentimentBar counts={totals} height={6} />
              <Legend />
            </View>

            <Section title="Last 12 weeks">
              <TrendBars data={trend} />
            </Section>

            <Section title="By person">
              <View>
                {stats.map((s, idx) => (
                  <View key={s.reportee.id}>
                    {idx > 0 ? <Rule /> : null}
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/reportee/[id]', params: { id: s.reportee.id } })
                      }
                      style={({ pressed }) => [
                        styles.personRow,
                        pressed && { backgroundColor: c.sunken },
                      ]}
                    >
                      <View style={{ flex: 1, gap: space.sm }}>
                        <View style={styles.personHead}>
                          <Text style={[type.heading, { color: c.ink, flex: 1 }]} numberOfLines={1}>
                            {s.reportee.name}
                          </Text>
                          <Text style={[type.meta, { color: c.inkSoft }]}>
                            {s.total === 0 ? '—' : `${s.total} · ${s.avgSeverity.toFixed(1)}`}
                          </Text>
                        </View>
                        <SentimentBar counts={s.counts} height={4} />
                        <Text style={[type.meta, { color: c.inkFaint }]}>
                          {s.lastAt ? `last ${relativeTime(s.lastAt)}` : 'no entries in range'}
                          {s.undiscussed > 0 ? ` · ${s.undiscussed} to discuss` : ''}
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            </Section>

            <Section title="Themes">
              <RankedBars data={themes} />
            </Section>

            {stale.length > 0 ? (
              <Section title="Quiet for 3+ weeks">
                <Text style={[type.prose, { color: c.inkSoft }]}>
                  Nothing captured about these people lately. That is usually a gap in the record
                  rather than in their work.
                </Text>
                <View style={styles.staleRow}>
                  {stale.map((s) => (
                    <Chip
                      key={s.reportee.id}
                      label={s.reportee.name}
                      onPress={() =>
                        router.push({ pathname: '/reportee/[id]', params: { id: s.reportee.id } })
                      }
                    />
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  masthead: { gap: space.sm },
  chipRow: { gap: space.sm, paddingRight: space.xl },
  figures: { flexDirection: 'row', gap: space.md },
  personRow: { paddingVertical: space.lg },
  personHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  staleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
