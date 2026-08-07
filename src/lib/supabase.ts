// src/lib/supabase.ts
// Supabase client for React Native. Session is persisted in AsyncStorage and
// auto-refreshed, so the user stays signed in across launches. URL + anon key come
// from app.json -> expo.extra (the anon key is public/safe for the client; RLS
// enforces per-user access server-side).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

// Prefer EXPO_PUBLIC_ env vars (inlined at bundle time from .env, like the RevenueCat
// key); fall back to app.json -> expo.extra. The anon key is a public/publishable key
// — safe in the client; RLS enforces per-user access server-side.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // native app — no URL-based session detection
  },
});

// True when the URL + anon key are set to real values (not blank / a placeholder).
export const supabaseConfigured =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('REPLACE');

if (__DEV__ && !supabaseConfigured) {
  console.warn(
    '[Supabase] Not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
    'in .env and restart Metro (npx expo start -c). Sign in with Apple is disabled until then.',
  );
}
