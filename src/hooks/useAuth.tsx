// src/hooks/useAuth.tsx
// Sign in with Apple → Supabase Auth. Owns the session (restored on launch, kept in
// AsyncStorage) and orchestrates everything that must happen at sign-in: alias the
// RevenueCat id to the real user, grant the signup credits, and migrate/restore data.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { reconcileOnSignIn, SYNC_KEYS } from '@/lib/sync';
import { flushHistoryQueue } from '@/lib/history';

const APPLE_USER_KEY = 'tara.apple.user'; // Apple's stable user id, for revocation checks
const LOCAL_CLEAR_ON_SIGNOUT = [...SYNC_KEYS, 'tara.chat.v1', 'tara.answer.feedback.v1'];

type AuthState = {
  session: Session | null;
  ready: boolean;                                   // initial session restore finished
  signInWithApple: () => Promise<{ ok: boolean; canceled?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
};

const Ctx = createContext<AuthState>({} as AuthState);

function Purchases(): any | null {
  try { return require('react-native-purchases').default; } catch { return null; }
}

// Alias RevenueCat to the Supabase user so purchases attribute to the real account
// (not the anonymous RC id). MUST run whenever we have a session — including session
// RESTORE on relaunch — so any purchase is linked before it can be initiated.
async function linkRevenueCat(uid: string) {
  try { await Purchases()?.logIn(uid); } catch {}
}

async function clearLocalAccountData() {
  try { await AsyncStorage.multiRemove(LOCAL_CLEAR_ON_SIGNOUT); } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Restore any persisted session on launch, then keep it in sync.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
      if (data.session) {
        linkRevenueCat(data.session.user.id); // fix: alias RC on restore, not only fresh sign-in
        flushHistoryQueue();
        checkAppleRevocation();
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) { linkRevenueCat(s.user.id); flushHistoryQueue(); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Apple revocation edge case: if the user revoked our app in iOS settings, our
  // stored Apple credential is no longer authorized → sign out gracefully.
  const checkAppleRevocation = useCallback(async () => {
    try {
      if (Platform.OS !== 'ios') return;
      const appleUser = await AsyncStorage.getItem(APPLE_USER_KEY);
      if (!appleUser) return;
      const state = await AppleAuthentication.getCredentialStateAsync(appleUser);
      if (state !== AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED) {
        await doSignOut();
      }
    } catch { /* ignore */ }
  }, []);

  const signInWithApple = useCallback(async () => {
    if (!supabaseConfigured) return { ok: false, error: 'Auth is not configured yet.' };
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const token = credential.identityToken;
      if (!token) return { ok: false, error: 'No identity token from Apple.' };

      const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token });
      if (error || !data.session) return { ok: false, error: error?.message ?? 'Sign-in failed.' };
      const uid = data.session.user.id;
      await AsyncStorage.setItem(APPLE_USER_KEY, credential.user);

      // Alias the RevenueCat anonymous id to the real user so purchases follow the
      // account across reinstalls, and credits key on the same id.
      try { await Purchases()?.logIn(uid); } catch {}

      // Grant the 5 free credits (server-side, once per account) + migrate/restore data.
      try { await supabase.rpc('ensure_user_credits'); } catch {}
      await reconcileOnSignIn(uid);

      setSession(data.session);
      return { ok: true };
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return { ok: false, canceled: true };
      return { ok: false, error: e?.message ?? 'Sign-in failed.' };
    }
  }, []);

  const doSignOut = useCallback(async () => {
    try { await Purchases()?.logOut(); } catch {}
    await clearLocalAccountData();
    await AsyncStorage.removeItem(APPLE_USER_KEY);
    try { await supabase.auth.signOut(); } catch {}
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-account'); // JWT attached automatically
      if (error) return false;
    } catch {
      return false;
    }
    await doSignOut();
    return true;
  }, [doSignOut]);

  return (
    <Ctx.Provider value={{ session, ready, signInWithApple, signOut: doSignOut, deleteAccount }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
