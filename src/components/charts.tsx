import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SentimentCounts } from '../lib/analytics';
import { sentimentLabel, space, type, useTheme } from '../lib/theme';
import { SENTIMENTS } from '../lib/types';

/**
 * A single ruled band split by sentiment. Drawn as one continuous stroke rather
 * than separate bars: the proportion is the point, not the segments.
 */
export function SentimentBar({ counts, height = 6 }: { counts: SentimentCounts; height?: number }) {
  const { c, sentiment } = useTheme();
  const total = counts.positive + counts.neutral + counts.concern;

  if (total === 0) return <View style={{ height, backgroundColor: c.rule }} />;

  return (
    <View style={{ height, flexDirection: 'row', backgroundColor: c.rule }}>
      {SENTIMENTS.map((s) =>
        counts[s] > 0 ? (
          <View key={s} style={{ flex: counts[s], backgroundColor: sentiment[s] }} />
        ) : null,
      )}
    </View>
  );
}

/**
 * Twelve weeks as columns hanging from a baseline, with the scale's top value
 * printed so the bars name a number rather than gesturing at one.
 */
export function TrendBars({
  data,
  height = 88,
}: {
  data: { label: string; counts: SentimentCounts; total: number }[];
  height?: number;
}) {
  const { c, sentiment } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.scaleRow}>
        <Text style={[type.meta, { color: c.inkFaint }]}>{max}</Text>
        <View style={[styles.scaleRule, { backgroundColor: c.rule }]} />
      </View>

      <View style={[styles.trendRow, { height }]}>
        {data.map((d, idx) => (
          <View key={idx} style={styles.trendColumn}>
            <View style={{ height: Math.max(2, (d.total / max) * height), width: '100%' }}>
              {d.total === 0 ? (
                <View style={{ flex: 1, backgroundColor: c.rule }} />
              ) : (
                SENTIMENTS.map((s) =>
                  d.counts[s] > 0 ? (
                    <View key={s} style={{ flex: d.counts[s], backgroundColor: sentiment[s] }} />
                  ) : null,
                )
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.baseline, { backgroundColor: c.ruleStrong }]} />

      <View style={styles.trendRow}>
        {data.map((d, idx) => (
          <View key={idx} style={styles.trendColumn}>
            {/* Every other tick, so labels never collide. */}
            <Text numberOfLines={1} style={[type.meta, styles.tick, { color: c.inkFaint }]}>
              {idx % 3 === 0 ? d.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Ranked list with the count set in mono, aligned as a ledger column. */
export function RankedBars({ data }: { data: { label: string; count: number }[] }) {
  const { c } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={{ gap: space.md }}>
      {data.map((d) => (
        <View key={d.label} style={{ gap: 6 }}>
          <View style={styles.rankLine}>
            <Text style={[type.body, { color: c.ink, flex: 1 }]} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={[type.meta, { color: c.inkSoft }]}>{d.count}</Text>
          </View>
          <View style={{ height: 2, backgroundColor: c.rule }}>
            <View
              style={{ width: `${(d.count / max) * 100}%`, height: '100%', backgroundColor: c.accent }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function Legend() {
  const { c, sentiment } = useTheme();
  return (
    <View style={styles.legend}>
      {SENTIMENTS.map((s) => (
        <View key={s} style={styles.legendItem}>
          <View style={{ width: 10, height: 2, backgroundColor: sentiment[s] }} />
          <Text style={[type.meta, { color: c.inkFaint }]}>{sentimentLabel[s]}</Text>
        </View>
      ))}
    </View>
  );
}

/** A figure and its label, set as a ledger cell. */
export function Figure({ value, label, tint }: { value: string; label: string; tint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={[type.figure, { color: tint ?? c.ink }]}>{value}</Text>
      <Text style={[type.eyebrow, { color: c.inkFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  scaleRule: { flex: 1, height: StyleSheet.hairlineWidth },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  trendColumn: { flex: 1, justifyContent: 'flex-end' },
  baseline: { height: StyleSheet.hairlineWidth },
  tick: { fontSize: 9.5 },
  rankLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  legend: { flexDirection: 'row', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
