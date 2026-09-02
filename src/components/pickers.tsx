import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { fonts, radius, sentimentLabel, space, type, useTheme } from '../lib/theme';
import { SENTIMENTS, type Reportee, type Sentiment } from '../lib/types';
import { type IconName } from './icons';
import { Avatar, Chip, Field, Segmented } from './ui';

function tap() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

/** Past this many people, scrolling a strip is slower than typing a name. */
const SEARCH_THRESHOLD = 8;

export function ReporteePicker({
  reportees,
  selectedIds,
  onToggle,
  recentIds,
}: {
  reportees: Reportee[];
  /** One capture can be about several people (a pair who shipped something together). */
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Reportee ids in most-recently-logged order, used to front-load the strip. */
  recentIds?: string[];
}) {
  const { c } = useTheme();
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

  const selected = reportees.filter((r) => selectedIds.includes(r.id));
  const asGrid = expanded || query.trim().length > 0;

  // The search text is left in place: with multi-select you often want to keep
  // filtering to pick the second person.
  function pick(id: string) {
    tap();
    onToggle(id);
  }

  return (
    <View style={{ gap: space.md }}>
      {showSearch ? (
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${reportees.length} people`}
            placeholderTextColor={c.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (matches.length === 1) pick(matches[0].id);
            }}
            style={[type.body, styles.search, { color: c.ink, borderBottomColor: c.rule }]}
          />
          <Pressable
            onPress={() => {
              setExpanded(!expanded);
              setQuery('');
            }}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse team list' : 'Show whole team'}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[type.eyebrow, { color: c.accent }]}>{asGrid ? 'Less' : 'All'}</Text>
          </Pressable>
        </View>
      ) : null}

      {asGrid ? (
        matches.length === 0 ? (
          <Text style={[type.body, { color: c.inkFaint }]}>
            No one matches “{query.trim()}”.
          </Text>
        ) : (
          <View style={styles.grid}>
            {matches.map((r) => (
              <PersonTile
                key={r.id}
                reportee={r}
                selected={selectedIds.includes(r.id)}
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
              selected={selectedIds.includes(r.id)}
              onPress={() => pick(r.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* A selection can scroll out of view, so always name who is picked. */}
      {selected.length > 0 && (selected.length > 1 || reportees.length > SEARCH_THRESHOLD) ? (
        <Text style={[type.meta, { color: c.inkSoft }]}>
          {selected.map((r) => r.name).join(' · ')}
        </Text>
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
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={reportee.name}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.person, pressed && { opacity: 0.6 }]}
    >
      <View>
        <Avatar name={reportee.name} size={48} />
        {/* Selection is an ink underscore beneath the tile, like a marked card. */}
        <View
          style={[
            styles.selectMark,
            { backgroundColor: selected ? c.accent : 'transparent' },
          ]}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          type.small,
          styles.personName,
          { color: selected ? c.ink : c.inkSoft, fontFamily: selected ? fonts.sansMedium : fonts.sans },
        ]}
      >
        {reportee.name.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

const SENTIMENT_ICON: Record<Sentiment, IconName> = {
  positive: 'win',
  neutral: 'note',
  concern: 'concern',
};

export function SentimentPicker({
  value,
  onChange,
}: {
  value: Sentiment;
  onChange: (s: Sentiment) => void;
}) {
  const { sentiment } = useTheme();
  return (
    <Segmented
      value={value}
      tint={sentiment[value]}
      onChange={(next) => {
        tap();
        onChange(next);
      }}
      items={SENTIMENTS.map((s) => ({
        key: s,
        label: sentimentLabel[s],
        icon: SENTIMENT_ICON[s],
      }))}
    />
  );
}

export function SeverityPicker({
  value,
  onChange,
  tint,
}: {
  value: number;
  onChange: (n: number) => void;
  tint?: string;
}) {
  const { c, shape } = useTheme();
  const ink = tint ?? c.accent;
  return (
    <View style={styles.severityRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => {
              tap();
              onChange(n);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Impact ${n} of 5`}
            accessibilityState={{ selected: n === value }}
            // The bar is short, so the touch target is the full-height column
            // around it rather than the bar itself.
            style={({ pressed }) => [styles.severityColumn, pressed && { opacity: 0.7 }]}
          >
            <View
              style={{
                height: 11 + n * 4.5,
                width: '100%',
                borderRadius: Math.min(shape.control, 5),
                backgroundColor: filled ? ink : c.sunken,
              }}
            />
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
  const { c } = useTheme();
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
    <View style={{ gap: space.md }}>
      <View style={styles.themeWrap}>
        {themes.map((label) => (
          <Chip
            key={label}
            label={label}
            selected={value.includes(label)}
            onPress={() => toggle(label)}
          />
        ))}
        {onCreate && !adding ? (
          <Chip label="＋ New" dashed onPress={() => setAdding(true)} />
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
            <Text style={[type.eyebrow, { color: c.accent }]}>{busy ? '…' : 'Add'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setAdding(false);
              setDraft('');
            }}
            style={styles.addAction}
          >
            <Text style={[type.eyebrow, { color: c.inkFaint }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { gap: space.lg, paddingVertical: space.xs, paddingRight: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingVertical: space.xs },
  person: { alignItems: 'center', width: 56, gap: space.sm },
  selectMark: { height: 2, marginTop: 5, borderRadius: 1 },
  personName: { maxWidth: 56, textAlign: 'center' },
  searchRow: { flexDirection: 'row', gap: space.lg, alignItems: 'center' },
  search: { flex: 1, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: space.lg },
  sentiment: { flex: 1, gap: space.sm, paddingBottom: 2 },
  severityRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40 },
  severityColumn: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  themeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  addRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-end' },
  addAction: { paddingVertical: space.sm },
});
