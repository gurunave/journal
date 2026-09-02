import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PanelHeader, SidePanel, SidePanelDrawer } from '../../src/components/SidePanel';
import { fonts, useTheme } from '../../src/lib/theme';

/**
 * Above this the panel is a permanent margin down the left; below it the same
 * panel slides in over the screen, opened from the mark in the header.
 */
const SIDE_PANEL_BREAKPOINT = 900;

/**
 * Tab marks are set in the interface face rather than drawn as icons: the app
 * is a written record, and a lettered tab reads like an index tab on a ledger.
 */
function TabMark({ label, focused }: { label: string; focused: boolean }) {
  const { c } = useTheme();
  return (
    <View style={styles.mark}>
      <View style={{ height: 2, width: 14, backgroundColor: focused ? c.accent : 'transparent' }} />
      <Text
        style={{
          fontFamily: focused ? fonts.sansSemi : fonts.sans,
          fontSize: 12,
          letterSpacing: 0.3,
          color: focused ? c.ink : c.inkFaint,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= SIDE_PANEL_BREAKPOINT;
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Growing into the wide layout makes the slide-over redundant.
  React.useEffect(() => {
    if (wide) setMenuOpen(false);
  }, [wide]);

  const closeMenu = React.useCallback(() => setMenuOpen(false), []);

  // The header already clears the notch, so the screens beneath it must not
  // clear it a second time. Zeroing the top inset for them is what keeps the
  // provider — and so the navigator — in one place at every width.
  const screenInsets = React.useMemo(
    () => (wide ? insets : { ...insets, top: 0 }),
    [wide, insets],
  );

  return (
    // The navigator keeps its place in the tree at every width, so crossing the
    // breakpoint swaps the panel in and out without remounting the screens.
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.paper }}>
      {wide ? <SidePanel /> : null}
      <View style={{ flex: 1 }}>
        {wide ? null : <PanelHeader onOpen={() => setMenuOpen(true)} />}
        <SafeAreaInsetsContext.Provider value={screenInsets}>
          <Tabs
            screenOptions={{
              headerShown: false,
              sceneStyle: { backgroundColor: c.paper },
              tabBarShowLabel: false,
              tabBarStyle: wide
                ? { display: 'none' }
                : {
                    backgroundColor: c.paper,
                    borderTopColor: c.rule,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    height: 62,
                    paddingTop: 8,
                  },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                tabBarIcon: ({ focused }) => <TabMark label="Capture" focused={focused} />,
              }}
            />
            <Tabs.Screen
              name="timeline"
              options={{
                tabBarIcon: ({ focused }) => <TabMark label="Record" focused={focused} />,
              }}
            />
            <Tabs.Screen
              name="insights"
              options={{
                tabBarIcon: ({ focused }) => <TabMark label="Patterns" focused={focused} />,
              }}
            />
            <Tabs.Screen
              name="team"
              options={{ tabBarIcon: ({ focused }) => <TabMark label="Team" focused={focused} /> }}
            />
          </Tabs>
        </SafeAreaInsetsContext.Provider>
        {wide ? null : <SidePanelDrawer open={menuOpen} onClose={closeMenu} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', gap: 6, width: 76 },
});
