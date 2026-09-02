import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '../src/lib/fonts';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { fonts, space, type, useTheme } from '../src/lib/theme';
import { AppearanceProvider } from '../src/state/appearance';
import { AuthProvider, useAuth } from '../src/state/auth';
import { DataProvider } from '../src/state/store';

export default function RootLayout() {
  const fontsReady = useAppFonts();

  return (
    <SafeAreaProvider>
      {/* Above Shell: the splash frame and the setup notice need colours too. */}
      <AppearanceProvider>
        <Shell fontsReady={fontsReady} />
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

function Shell({ fontsReady }: { fontsReady: boolean }) {
  const { c, scheme } = useTheme();

  // Painting the ground before anything else means no white flash on launch.
  if (!fontsReady) {
    return (
      <View style={[styles.center, { backgroundColor: c.paper }]}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <DataProvider>
          <RootNavigator />
        </DataProvider>
      </AuthProvider>
    </>
  );
}

function RootNavigator() {
  const { session, initializing, recovering } = useAuth();
  const { c } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const first = segments[0];
    const inAuthGroup = first === 'sign-in' || first === 'reset-password';
    // A recovery link produces a real session, so the ordinary rule would drop
    // the user into the app with a password they still do not know.
    if (recovering) {
      if (first !== 'reset-password') router.replace('/reset-password');
      return;
    }
    if (!session && !inAuthGroup) router.replace('/sign-in');
    else if (session && inAuthGroup) router.replace('/');
  }, [session, initializing, recovering, segments, router]);

  if (initializing) {
    return (
      <View style={[styles.center, { backgroundColor: c.paper }]}>
        <ActivityIndicator color={c.inkFaint} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.paper },
        headerTintColor: c.ink,
        headerTitleStyle: { fontFamily: fonts.serifMedium, fontSize: 18 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.paper },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="incident/[id]" options={{ title: 'Entry', presentation: 'modal' }} />
      <Stack.Screen name="reportee/[id]" options={{ title: '' }} />
    </Stack>
  );
}

function SetupNotice() {
  const { c } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: c.paper, padding: space.xl, gap: space.lg }]}>
      <Text style={[type.eyebrow, { color: c.inkFaint }]}>Setup required</Text>
      <Text style={[type.title, { color: c.ink, textAlign: 'center' }]}>
        Supabase is not configured
      </Text>
      <Text style={[type.prose, { color: c.inkSoft, textAlign: 'center', maxWidth: 460 }]}>
        Copy <Text style={{ fontFamily: fonts.mono }}>.env.example</Text> to{' '}
        <Text style={{ fontFamily: fonts.mono }}>.env</Text>, fill in your project URL and anon key,
        run the SQL in <Text style={{ fontFamily: fonts.mono }}>supabase/schema.sql</Text>, then
        restart with <Text style={{ fontFamily: fonts.mono }}>npx expo start -c</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
