import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Wordmark } from './Logo';
import { Rule } from './ui';
import { fonts, space, type, useTheme } from '../lib/theme';

/** Kept in step with the tab order in app/(tabs)/_layout.tsx. */
const NAV = [
  { href: '/', label: 'Capture', note: 'Log what just happened' },
  { href: '/timeline', label: 'Record', note: 'Everything written down' },
  { href: '/insights', label: 'Patterns', note: 'What the record adds up to' },
  { href: '/team', label: 'Team', note: 'People and themes' },
] as const;

export const SIDE_PANEL_WIDTH = 244;

/** Transform and opacity only, so the slide runs off the JS thread on device. */
const NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * On a wide screen the tab bar becomes a margin down the left — the same four
 * destinations, but with room for the name and a line of explanation each.
 * Selection is marked the way a tab is: a short accent stroke, not a filled pill.
 *
 * On a phone the same panel slides in over the screen instead; `onNavigate`
 * is how the drawer closes itself once a destination is picked.
 */
export function SidePanel({
  onNavigate,
  style,
}: {
  onNavigate?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View
      style={[
        styles.panel,
        {
          width: SIDE_PANEL_WIDTH,
          backgroundColor: c.paper,
          borderRightColor: c.rule,
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + space.lg,
        },
        style,
      ]}
    >
      <Wordmark size={26} style={{ paddingHorizontal: space.lg }} />
      <Rule style={{ marginTop: space.lg, marginHorizontal: space.lg }} />

      <View style={styles.nav}>
        {NAV.map((item) => {
          const selected = pathname === item.href;
          return (
            <Pressable
              key={item.href}
              onPress={() => {
                router.navigate(item.href);
                onNavigate?.();
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: pressed ? c.sunken : 'transparent' },
              ]}
            >
              <View
                style={[
                  styles.selectedMark,
                  { backgroundColor: selected ? c.accent : 'transparent' },
                ]}
              />
              <View style={styles.itemText}>
                <Text
                  style={{
                    fontFamily: selected ? fonts.sansSemi : fonts.sans,
                    fontSize: 15,
                    color: selected ? c.ink : c.inkSoft,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text style={[type.meta, { color: c.inkFaint }]} numberOfLines={1}>
                  {item.note}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * The phone's stand-in for the panel: the mark, tappable, above the screen.
 * Deliberately the only chrome added — the destinations still live in the tab
 * bar, so this opens the panel rather than replacing anything.
 */
export function PanelHeader({ onOpen }: { onOpen: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: c.paper,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.rule,
      }}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Open navigation"
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? c.sunken : 'transparent' },
        ]}
      >
        <Wordmark size={22} />
      </Pressable>
    </View>
  );
}

/** The panel as a slide-over, for widths that cannot spare a permanent margin. */
export function SidePanelDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 220 : 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [open, progress]);

  // Android's back gesture should dismiss the panel before leaving the screen.
  React.useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  return (
    <View style={[styles.overlay, { pointerEvents: open ? 'auto' : 'none' }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.38] }) },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close navigation"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-SIDE_PANEL_WIDTH, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SidePanel onNavigate={onClose} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRightWidth: StyleSheet.hairlineWidth },
  nav: { paddingTop: space.lg, gap: space.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingRight: space.lg,
    paddingLeft: space.lg - 3,
  },
  // A 3pt stroke in the margin, the printed equivalent of a selected tab.
  selectedMark: { width: 3, alignSelf: 'stretch', minHeight: 30, borderRadius: 2 },
  itemText: { flex: 1, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: space.lg,
  },
  // Clipped so the closed drawer cannot widen the page on web.
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
