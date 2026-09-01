import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, useTheme } from '../../src/lib/theme';

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.paper },
        tabBarShowLabel: false,
        tabBarStyle: {
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
        options={{ tabBarIcon: ({ focused }) => <TabMark label="Capture" focused={focused} /> }}
      />
      <Tabs.Screen
        name="timeline"
        options={{ tabBarIcon: ({ focused }) => <TabMark label="Record" focused={focused} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{ tabBarIcon: ({ focused }) => <TabMark label="Patterns" focused={focused} /> }}
      />
      <Tabs.Screen
        name="team"
        options={{ tabBarIcon: ({ focused }) => <TabMark label="Team" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', gap: 6, width: 76 },
});
