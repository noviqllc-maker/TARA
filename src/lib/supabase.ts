// src/lib/supabase.ts
// Supabase client for React Native. Session is persisted in AsyncStorage and
// auto-refreshed, so the user stays signed in across launches. URL + anon key come
// from app.json -> expo.extra (the anon key is public/safe for the client; RLS
// enforces per-user access server-side).
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
const SUPABASE_URL = extra.supabaseUrl ?? '';
const SUPABASE_ANON_KEY = extra.supabaseAnonKey ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // native app — no URL-based session detection
  },
});

// True when the anon key/URL have been configured (guards graceful behavior in dev).
export const supabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'REPLACE_WITH_SUPABASE_ANON_KEY';
