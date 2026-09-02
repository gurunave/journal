import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '../src/components/Logo';
import { Button, Field, Rule } from '../src/components/ui';
import { space, type, useTheme } from '../src/lib/theme';
import { useAuth } from '../src/state/auth';

/** Matches what Supabase enforces by default, so the error arrives before the round trip. */
const MIN_LENGTH = 6;

export default function ResetPassword() {
  const { c } = useTheme();
  const router = useRouter();
  const { setPassword, endRecovery, user } = useAuth();

  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await setPassword(password);
      // The recovery link already signed them in, so there is nothing further
      // to do but let the router take them to the app.
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.md }}>
            <View style={styles.lockup}>
              <LogoMark size={34} />
              <Text style={[type.display, { color: c.ink }]}>New password</Text>
            </View>
            <Rule strong />
            <Text style={[type.prose, { color: c.inkSoft }]}>
              {user?.email
                ? `Choose a new password for ${user.email}.`
                : 'Choose a new password for your account.'}
            </Text>
          </View>

          <View style={{ gap: space.xl }}>
            <Field
              label="New password"
              value={password}
              onChangeText={setPasswordValue}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="••••••••"
            />
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="••••••••"
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error ? <Text style={[type.small, { color: c.danger }]}>{error}</Text> : null}

            <Button title="Set password" onPress={submit} loading={busy} />
            <Button
              variant="quiet"
              title="Cancel"
              onPress={() => {
                endRecovery();
                router.replace('/sign-in');
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: space.xl,
    gap: space.xxl,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
});
