import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, space } from '../src/lib/theme';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { AuthProvider, useAuth } from '../src/state/auth';
import { DataProvider } from '../src/state/store';

export default function RootLayout() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <DataProvider>
          <RootNavigator />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === 'sign-in';
    if (!session && !inAuthGroup) router.replace('/sign-in');
    else if (session && inAuthGroup) router.replace('/');
  }, [session, initializing, segments, router]);

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="incident/[id]" options={{ title: 'Incident', presentation: 'modal' }} />
      <Stack.Screen name="reportee/[id]" options={{ title: '' }} />
    </Stack>
  );
}

function SetupNotice() {
  return (
    <View style={[styles.center, { padding: space.xl, gap: space.md }]}>
      <Text style={styles.setupTitle}>Supabase is not configured</Text>
      <Text style={styles.setupBody}>
        Copy <Text style={styles.code}>.env.example</Text> to{' '}
        <Text style={styles.code}>.env</Text>, fill in{' '}
        <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_URL</Text> and{' '}
        <Text style={styles.code}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> from your project, run the SQL
        in <Text style={styles.code}>supabase/schema.sql</Text>, then restart with{' '}
        <Text style={styles.code}>npx expo start -c</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  setupTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  setupBody: {
    color: colors.textDim,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 460,
  },
  code: { color: colors.accent, fontFamily: 'monospace' },
});
