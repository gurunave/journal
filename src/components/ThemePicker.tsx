import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { space, THEMES, type, useTheme, type ThemeDef } from '../lib/theme';
import { useAppearance } from '../state/appearance';

/**
 * Each theme is shown in its own colours rather than as a name in the current
 * ones — a swatch of the actual paper, ink, accent and the three sentiment
 * tones, so the choice is made by looking rather than by reading.
 */
function Swatch({ t, selected, onPress }: { t: ThemeDef; selected: boolean; onPress: () => void }) {
  const { c, shape } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${t.name} theme`}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.75 }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: t.c.paper,
            borderRadius: t.shape.card,
            // Selection is carried by the ring, so it reads on light and dark alike.
            borderColor: selected ? c.accent : t.c.rule,
            borderWidth: selected ? 2.5 : Math.max(t.shape.borderW, StyleSheet.hairlineWidth),
          },
        ]}
      >
        <View style={[styles.bar, { backgroundColor: t.c.ink }]} />
        <View style={styles.dots}>
          {[t.c.accent, t.c.positive, t.c.neutral, t.c.concern].map((x, i) => (
            // keyed by slot: a palette may repeat a hex across roles
            <View
              key={i}
              style={{ width: 13, height: 13, borderRadius: t.shape.chip === 999 ? 7 : 3, backgroundColor: x }}
            />
          ))}
        </View>
        <View style={[styles.line, { backgroundColor: t.c.sunken }]} />
        <View style={[styles.line, { backgroundColor: t.c.sunken, width: '55%' }]} />
      </View>
      <Text
        numberOfLines={1}
        style={[
          type.small,
          { color: selected ? c.ink : c.inkSoft, fontFamily: selected ? type.eyebrow.fontFamily : type.small.fontFamily },
        ]}
      >
        {t.name}
      </Text>
    </Pressable>
  );
}

export function ThemePicker() {
  const { c } = useTheme();
  const { themeId, setThemeId } = useAppearance();
  const current = THEMES.find((t) => t.id === themeId);

  return (
    <View style={{ gap: space.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {THEMES.map((t) => (
          <Swatch key={t.id} t={t} selected={t.id === themeId} onPress={() => setThemeId(t.id)} />
        ))}
      </ScrollView>
      {current ? (
        <Text style={[type.meta, { color: c.inkFaint }]}>
          {current.name} — {current.blurb}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.md, paddingRight: space.md },
  item: { gap: 6, width: 96 },
  card: { height: 86, padding: 9, gap: 6, justifyContent: 'flex-start' },
  bar: { height: 5, width: '62%', borderRadius: 3 },
  dots: { flexDirection: 'row', gap: 5, paddingTop: 2 },
  line: { height: 5, width: '85%', borderRadius: 3, marginTop: 1 },
});
