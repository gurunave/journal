import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { relativeTime } from '../lib/format';
import { colors, radius, sentimentColor, sentimentIcon, space } from '../lib/theme';
import type { Incident } from '../lib/types';
import { Avatar } from './ui';

export function IncidentRow({
  incident,
  reporteeName,
  showAvatar = true,
  onPress,
}: {
  incident: Incident;
  reporteeName: string;
  showAvatar?: boolean;
  onPress?: () => void;
}) {
  const tint = sentimentColor[incident.sentiment];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {showAvatar ? (
        <Avatar name={reporteeName} size={36} />
      ) : (
        <View style={[styles.dot, { backgroundColor: tint }]} />
      )}

      <View style={styles.body}>
        <View style={styles.headerLine}>
          {showAvatar ? <Text style={styles.name}>{reporteeName}</Text> : null}
          <Text style={[styles.badge, { color: tint }]}>
            {sentimentIcon[incident.sentiment]} {incident.severity}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.time}>{relativeTime(incident.occurred_at)}</Text>
        </View>

        {incident.themes?.length ? (
          <View style={styles.themeRow}>
            {incident.themes.map((theme) => (
              <Text key={theme} style={styles.theme}>
                {theme}
              </Text>
            ))}
          </View>
        ) : null}

        {incident.note ? (
          <Text numberOfLines={2} style={styles.note}>
            {incident.note}
          </Text>
        ) : (
          <Text style={[styles.note, { color: colors.textFaint, fontStyle: 'italic' }]}>
            No note
          </Text>
        )}

        <View style={styles.metaLine}>
          {incident.pending ? <Text style={styles.pending}>⟳ queued</Text> : null}
          {incident.photo_path || incident.local_photo_uri ? (
            <Text style={styles.meta}>📎 photo</Text>
          ) : null}
          {incident.discussed_at ? <Text style={styles.meta}>✓ discussed</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  body: { flex: 1, gap: 3 },
  headerLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  badge: { fontSize: 12, fontWeight: '700' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 1 },
  theme: {
    color: colors.textFaint,
    fontSize: 11,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  time: { color: colors.textFaint, fontSize: 12 },
  note: { color: colors.textDim, fontSize: 14, lineHeight: 19 },
  metaLine: { flexDirection: 'row', gap: space.md },
  meta: { color: colors.textFaint, fontSize: 11 },
  pending: { color: colors.accent, fontSize: 11, fontWeight: '600' },
});
