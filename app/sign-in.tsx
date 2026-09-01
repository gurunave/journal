import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, Rule } from '../src/components/ui';
import { space, type, useTheme } from '../src/lib/theme';
import { useAuth } from '../src/state/auth';

export default function SignIn() {
  const { c } = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Email and password are both needed.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice('Confirm the address from your inbox, then sign in.');
          setMode('signin');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
            <Text style={[type.eyebrow, { color: c.inkFaint }]}>A RECORD OF YOUR TEAM</Text>
            <Text style={[type.display, { color: c.ink }]}>Journal</Text>
            <Rule strong />
            <Text style={[type.prose, { color: c.inkSoft }]}>
              Write down what your people did while you still remember it. Read it back before the
              1:1.
            </Text>
          </View>

          <View style={{ gap: space.xl }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              placeholder="you@company.com"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error ? <Text style={[type.small, { color: c.danger }]}>{error}</Text> : null}
            {notice ? <Text style={[type.small, { color: c.positive }]}>{notice}</Text> : null}

            <Button
              title={mode === 'signin' ? 'Sign in' : 'Create account'}
              onPress={submit}
              loading={busy}
            />
            <Button
              variant="quiet"
              title={mode === 'signin' ? 'Create an account instead' : 'I already have an account'}
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setNotice(null);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
