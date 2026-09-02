import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { space, type, useTheme } from '../lib/theme';

/**
 * The mark is the app in miniature: a ruled page with a margin rule down the
 * left, the way a ledger is laid out. The margin stroke carries the accent — it
 * is the same firm vertical stroke sentiment is marked with — and the written
 * lines run in ink, the last one short because a record is never finished.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Rect x={3} y={3} width={2.5} height={18} rx={1.25} fill={c.accent} />
      <Rect x={9.5} y={5.9} width={11.5} height={1.6} rx={0.8} fill={c.ink} />
      <Rect x={9.5} y={11.2} width={11.5} height={1.6} rx={0.8} fill={c.inkSoft} />
      <Rect x={9.5} y={16.5} width={6.5} height={1.6} rx={0.8} fill={c.inkFaint} />
    </Svg>
  );
}

/** The mark set with the name, for a panel head or a sign-in page. */
export function Wordmark({
  size = 24,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View style={[styles.row, style]} accessibilityRole="header">
      <LogoMark size={size} />
      <Text style={[type.title, { color: c.ink, fontSize: size * 0.82 }]}>Journal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
