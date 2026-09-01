import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, sentimentColor, sentimentIcon, sentimentLabel, space } from '../lib/theme';
import { SENTIMENTS, type Reportee, type Sentiment } from '../lib/types';
import { Avatar, Chip, Field } from './ui';

function tap() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

/** Past this many people, scrolling a strip is slower than typing a name. */
const SEARCH_THRESHOLD = 8;

export function ReporteePicker({
  reportees,
  selectedId,
  onSelect,
  recentIds,
}: {
  reportees: Reportee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Reportee ids in most-recently-logged order, used to front-load the strip. */
  recentIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const showSearch = reportees.length > SEARCH_THRESHOLD;

  // Recently logged people first: on a big team those are overwhelmingly who
  // the next entry is about. Everyone else keeps a stable alphabetical order
  // so the strip does not reshuffle under your thumb.
  const ordered = useMemo(() => {
    if (!recentIds?.length) return reportees;
    const rank = new Map(recentIds.map((id, idx) => [id, idx] as const));
    return [...reportees].sort((a, b) => {
      const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return ra - rb || a.name.localeCompare(b.name);
    });
  }, [reportees, recentIds]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.role ?? '').toLowerCase().includes(q),
    );
  }, [ordered, query]);

  const selected = reportees.find((r) => r.id === selectedId) ?? null;

  function pick(id: string) {
    tap();
    onSelect(id);
    setQuery('');
    setExpanded(false);
  }

  // Searching or expanded: wrapped grid, so every match is reachable without
  // horizontal scrolling.
  const asGrid = expanded || query.trim().length > 0;

  return (
    <View style={{ gap: space.sm }}>
      {showSearch ? (
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${reportees.length} people`}
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (matches.length === 1) pick(matches[0].id);
            }}
            style={styles.search}
          />
          <Pressable
            onPress={() => {
              setExpanded(!expanded);
              setQuery('');
            }}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse team list' : 'Show whole team'}
            style={({ pressed }) => [styles.expandButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.expandText}>{asGrid ? 'Less' : 'All'}</Text>
          </Pressable>
        </View>
      ) : null}

      {asGrid ? (
        matches.length === 0 ? (
          <Text style={styles.noMatch}>No one matches “{query.trim()}”.</Text>
        ) : (
          <View style={styles.grid}>
            {matches.map((r) => (
              <PersonTile
                key={r.id}
                reportee={r}
                selected={r.id === selectedId}
                onPress={() => pick(r.id)}
              />
            ))}
          </View>
        )
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {matches.map((r) => (
            <PersonTile
              key={r.id}
              reportee={r}
              selected={r.id === selectedId}
              onPress={() => pick(r.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Off-screen selection would otherwise be invisible once the strip scrolls. */}
      {selected && !asGrid && reportees.length > SEARCH_THRESHOLD ? (
        <Text style={styles.selectedHint}>Selected: {selected.name}</Text>
      ) : null}
    </View>
  );
}

function PersonTile({
  reportee,
  selected,
  onPress,
}: {
  reportee: Reportee;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={reportee.name}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.person, pressed && { opacity: 0.7 }]}
    >
      <View style={selected ? styles.personRingActive : styles.personRing}>
        <Avatar name={reportee.name} size={52} />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.personName, selected && { color: colors.text, fontWeight: '700' }]}
      >
        {reportee.name.split(' ')[0]}
      </Text>
    </Pressable>
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

/**
 * Multi-select themes. Wraps rather than scrolls so a selection made earlier
 * never scrolls out of sight, and offers inline creation so a theme you think
 * of mid-capture does not send you to another screen.
 */
export function ThemePicker({
  themes,
  value,
  onChange,
  onCreate,
}: {
  themes: string[];
  value: string[];
  onChange: (next: string[]) => void;
  onCreate?: (label: string) => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(label: string) {
    tap();
    onChange(value.includes(label) ? value.filter((t) => t !== label) : [...value, label]);
  }

  async function commit() {
    const label = draft.trim();
    if (!label) {
      setAdding(false);
      return;
    }
    const existing = themes.find((t) => t.toLowerCase() === label.toLowerCase());
    if (existing) {
      if (!value.includes(existing)) onChange([...value, existing]);
    } else {
      setBusy(true);
      try {
        await onCreate?.(label);
      } catch {
        // Adding to the theme catalogue needs the network; the theme itself is
        // stored as text on the incident, so keep the selection either way and
        // let the catalogue catch up next time it is added.
      } finally {
        setBusy(false);
      }
      onChange([...value, label]);
    }
    setDraft('');
    setAdding(false);
  }

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.themeWrap}>
        {themes.map((label) => (
          <Chip
            key={label}
            label={label}
            compact
            selected={value.includes(label)}
            onPress={() => toggle(label)}
          />
        ))}
        {onCreate && !adding ? (
          <Pressable
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a new theme"
            style={({ pressed }) => [styles.addChip, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addChipText}>＋ New</Text>
          </Pressable>
        ) : null}
      </View>

      {adding ? (
        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <Field
              value={draft}
              onChangeText={setDraft}
              placeholder="Name the theme"
              autoFocus
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={commit}
              editable={!busy}
            />
          </View>
          <Pressable onPress={commit} disabled={busy} style={styles.addAction}>
            <Text style={styles.addActionText}>{busy ? '…' : 'Add'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setAdding(false);
              setDraft('');
            }}
            style={styles.addAction}
          >
            <Text style={[styles.addActionText, { color: colors.textFaint }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space.md, paddingVertical: space.xs, paddingRight: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingVertical: space.xs },
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
  searchRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  search: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  expandButton: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  expandText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  noMatch: { color: colors.textFaint, fontSize: 13, paddingVertical: space.sm },
  selectedHint: { color: colors.textFaint, fontSize: 12 },
  row: { flexDirection: 'row', gap: space.sm },
  themeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  addChip: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent + '66',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addChipText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  addAction: { paddingHorizontal: space.sm, paddingVertical: space.sm },
  addActionText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
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
