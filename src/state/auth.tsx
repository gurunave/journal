import type { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';

/**
 * Where the emailed recovery link comes back to. On web that is a real URL on
 * this origin; on device it is the app's own scheme, which Expo resolves to the
 * dev-client URL while developing. Whatever this produces must also be listed
 * under Authentication -> URL Configuration -> Redirect URLs in Supabase, or the
 * link bounces to the site URL instead.
 */
function recoveryRedirect(): string {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/reset-password`;
  }
  return Linking.createURL('/reset-password');
}

type AuthValue = {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  /** Sends the recovery mail. Resolves even for an unknown address. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password for the session opened by a recovery link. */
  setPassword: (password: string) => Promise<void>;
  /** True between following a recovery link and choosing the new password. */
  recovering: boolean;
  endRecovery: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // A recovery link signs the user in. Without this flag the router would
      // treat that as a normal session and drop them straight into the app,
      // still not knowing their password.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      },
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // With email confirmation on, Supabase returns a user but no session.
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: recoveryRedirect(),
        });
        if (error) throw error;
      },
      async setPassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecovering(false);
      },
      recovering,
      endRecovery() {
        setRecovering(false);
      },
    }),
    [session, initializing, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
