import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { relativeTime } from '../lib/format';
import { fonts, space, type, useTheme } from '../lib/theme';
import type { Incident } from '../lib/types';

/**
 * A ledger line: a sentiment stroke in the gutter, the observation as prose,
 * and its measurements in mono. Deliberately not a card — a stack of these
 * should read as one continuous record, not a pile of tiles.
 */
export function IncidentRow({
  incident,
  reporteeName,
  alsoWith = [],
  showName = true,
  onPress,
}: {
  incident: Incident;
  reporteeName: string;
  /** Other people the same capture covered, when their rows are collapsed here. */
  alsoWith?: string[];
  showName?: boolean;
  onPress?: () => void;
}) {
  const { c, sentiment } = useTheme();
  const ink = sentiment[incident.sentiment];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.sunken }]}
    >
      {/* The gutter stroke: this entry's sentiment, at a glance, down the page. */}
      <View style={[styles.gutter, { backgroundColor: ink }]} />

      <View style={styles.body}>
        <View style={styles.headline}>
          {showName ? (
            <Text style={[type.heading, { color: c.ink, flex: 1 }]} numberOfLines={1}>
              {reporteeName}
              {alsoWith.length ? (
                <Text style={[type.body, { color: c.inkFaint }]}>
                  {alsoWith.length === 1 ? `  with ${alsoWith[0]}` : `  with ${alsoWith.length} others`}
                </Text>
              ) : null}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Text style={[type.meta, { color: c.inkFaint }]}>
            {relativeTime(incident.occurred_at)}
          </Text>
        </View>

        {incident.note ? (
          <Text numberOfLines={3} style={[type.prose, { color: c.inkSoft }]}>
            {incident.note}
          </Text>
        ) : (
          <Text style={[type.prose, { color: c.inkFaint, fontFamily: fonts.serifItalic }]}>
            No note
          </Text>
        )}

        <View style={styles.metaRow}>
          <Text style={[type.meta, { color: ink }]}>
            {incident.severity}/5
          </Text>
          {incident.themes?.length ? (
            <Text style={[type.meta, { color: c.inkFaint, flex: 1 }]} numberOfLines={1}>
              {incident.themes.join(' · ')}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {incident.pending ? <Text style={[type.meta, { color: c.accent }]}>queued</Text> : null}
          {incident.photo_path || incident.local_photo_uri ? (
            <Text style={[type.meta, { color: c.inkFaint }]}>photo</Text>
          ) : null}
          {incident.discussed_at ? (
            <Text style={[type.meta, { color: c.inkFaint }]}>discussed</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.lg },
  gutter: { width: 2, borderRadius: 1 },
  body: { flex: 1, gap: 6 },
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: 2 },
});
