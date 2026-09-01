import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { SentimentCounts } from '../lib/analytics';
import { colors, radius, sentimentColor, space } from '../lib/theme';
import { SENTIMENTS } from '../lib/types';

/** Stacked proportion bar: win / note / concern. */
export function SentimentBar({ counts, height = 8 }: { counts: SentimentCounts; height?: number }) {
  const total = counts.positive + counts.neutral + counts.concern;
  if (total === 0) {
    return <View style={[styles.track, { height, borderRadius: height / 2 }]} />;
  }
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, flexDirection: 'row' }]}>
      {SENTIMENTS.map((s) =>
        counts[s] > 0 ? (
          <View key={s} style={{ flex: counts[s], backgroundColor: sentimentColor[s] }} />
        ) : null,
      )}
    </View>
  );
}

/** Vertical bars, one per period, stacked by sentiment. */
export function TrendBars({
  data,
  height = 96,
}: {
  data: { label: string; counts: SentimentCounts; total: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <View>
      <View style={[styles.trendRow, { height }]}>
        {data.map((d, idx) => (
          <View key={idx} style={styles.trendColumn}>
            <View style={[styles.bar, { height: Math.max(2, (d.total / max) * height) }]}>
              {SENTIMENTS.map((s) =>
                d.counts[s] > 0 ? (
                  <View key={s} style={{ flex: d.counts[s], backgroundColor: sentimentColor[s] }} />
                ) : null,
              )}
              {d.total === 0 ? <View style={{ flex: 1, backgroundColor: colors.border }} /> : null}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.trendRow}>
        {data.map((d, idx) => (
          <View key={idx} style={styles.trendColumn}>
            <Text numberOfLines={1} style={styles.trendLabel}>
              {idx % 2 === 0 ? d.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal ranked bars for categories. */
export function RankedBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <View style={{ gap: space.sm }}>
      {data.map((d) => (
        <View key={d.label} style={{ gap: 4 }}>
          <View style={styles.rankLine}>
            <Text style={styles.rankLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <Text style={styles.rankCount}>{d.count}</Text>
          </View>
          <View style={[styles.track, { height: 6, borderRadius: 3 }]}>
            <View
              style={{
                width: `${(d.count / max) * 100}%`,
                backgroundColor: colors.accent,
                height: '100%',
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function Legend() {
  return (
    <View style={styles.legend}>
      {SENTIMENTS.map((s) => (
        <View key={s} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: sentimentColor[s] }]} />
          <Text style={styles.legendText}>
            {s === 'positive' ? 'Win' : s === 'neutral' ? 'Note' : 'Concern'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: colors.surfaceAlt, overflow: 'hidden', width: '100%' },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  trendColumn: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: radius.sm, overflow: 'hidden', width: '100%' },
  trendLabel: { color: colors.textFaint, fontSize: 9, marginTop: 4 },
  rankLine: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  rankLabel: { color: colors.textDim, fontSize: 13, flex: 1 },
  rankCount: { color: colors.text, fontSize: 13, fontWeight: '700' },
  legend: { flexDirection: 'row', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textFaint, fontSize: 11 },
});
