import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, sentimentColor, sentimentIcon, sentimentLabel, space } from '../lib/theme';
import { SENTIMENTS, type Reportee, type Sentiment } from '../lib/types';
import { Avatar, Chip } from './ui';

function tap() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

/** Horizontal reportee strip — one tap to pick who this is about. */
export function ReporteeStrip({
  reportees,
  selectedId,
  onSelect,
}: {
  reportees: Reportee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {reportees.map((r) => {
        const selected = r.id === selectedId;
        return (
          <Pressable
            key={r.id}
            onPress={() => {
              tap();
              onSelect(r.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={r.name}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.person, pressed && { opacity: 0.7 }]}
          >
            <View style={selected ? styles.personRingActive : styles.personRing}>
              <Avatar name={r.name} size={52} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.personName, selected && { color: colors.text, fontWeight: '700' }]}
            >
              {r.name.split(' ')[0]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SentimentPicker({
  value,
  onChange,
}: {
  value: Sentiment;
  onChange: (s: Sentiment) => void;
}) {
  return (
    <View style={styles.row}>
      {SENTIMENTS.map((s) => {
        const selected = s === value;
        const tint = sentimentColor[s];
        return (
          <Pressable
            key={s}
            onPress={() => {
              tap();
              onChange(s);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.sentiment,
              selected && { backgroundColor: tint + '22', borderColor: tint },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.sentimentIcon, { color: selected ? tint : colors.textFaint }]}>
              {sentimentIcon[s]}
            </Text>
            <Text style={[styles.sentimentText, selected && { color: tint }]}>
              {sentimentLabel[s]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SeverityPicker({
  value,
  onChange,
  tint = colors.accent,
}: {
  value: number;
  onChange: (n: number) => void;
  tint?: string;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = n === value;
        return (
          <Pressable
            key={n}
            onPress={() => {
              tap();
              onChange(n);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Impact ${n} of 5`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.severity,
              selected && { backgroundColor: tint + '26', borderColor: tint },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={[styles.severityText, selected && { color: tint }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  value: string | null;
  onChange: (label: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {categories.map((label) => (
        <Chip
          key={label}
          label={label}
          compact
          selected={value === label}
          onPress={() => {
            tap();
            onChange(value === label ? null : label);
          }}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space.md, paddingVertical: space.xs, paddingRight: space.lg },
  person: { alignItems: 'center', width: 64, gap: space.xs },
  personRing: {
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personRingActive: {
    padding: 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  personName: { color: colors.textDim, fontSize: 12, maxWidth: 64 },
  row: { flexDirection: 'row', gap: space.sm },
  chipRow: { gap: space.sm, paddingRight: space.lg },
  sentiment: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  sentimentIcon: { fontSize: 14 },
  sentimentText: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  severity: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: { color: colors.textDim, fontSize: 17, fontWeight: '700' },
});
