// src/lib/sync.ts
// Moves a user's data between anonymous on-device storage and their Supabase account
// (table user_data, RLS-protected). On first sign-in the local (anonymous) data is
// MIGRATED up; for a returning user on a fresh install it is RESTORED down. Chat is
// intentionally excluded — it stays local-only per the privacy setting.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { SHOP_PRODUCT_IDS } from '@/lib/products';

// Keys that belong to the account: birth data/profile (+ onboarding answers),
// journal entries, and cached reports.
const REPORT_KEYS = SHOP_PRODUCT_IDS.map((id) => `tara.report.${id}.v1`);
export const SYNC_KEYS = ['tara.profile.v1', 'tara.journal.v1', ...REPORT_KEYS];

const parse = (raw: string | null): any | undefined => {
  if (raw == null) return undefined;
  try { return JSON.parse(raw); } catch { return raw; }
};

// Push one key's current local value to the signed-in user's account. No-op when
// signed out. Call after writes so the server copy stays current for future restores.
export async function pushKey(key: string): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    const value = parse(await AsyncStorage.getItem(key));
    if (value === undefined) return;
    await supabase.from('user_data').upsert(
      { user_id: uid, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' },
    );
  } catch { /* best effort */ }
}

// Reconcile at sign-in. Server value wins when present (RESTORE); otherwise the local
// anonymous value is pushed up (MIGRATE). Returns what happened for logging/routing.
export async function reconcileOnSignIn(userId: string): Promise<{ restored: string[]; migrated: string[] }> {
  const restored: string[] = [];
  const migrated: string[] = [];
  try {
    const { data: rows } = await supabase.from('user_data').select('key,value').eq('user_id', userId);
    const server = new Map<string, any>((rows ?? []).map((r: any) => [r.key, r.value]));

    for (const key of SYNC_KEYS) {
      if (server.has(key)) {
        await AsyncStorage.setItem(key, JSON.stringify(server.get(key)));
        restored.push(key);
      } else {
        const value = parse(await AsyncStorage.getItem(key));
        if (value !== undefined) {
          await supabase.from('user_data').upsert(
            { user_id: userId, key, value, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,key' },
          );
          migrated.push(key);
        }
      }
    }
  } catch { /* best effort — never block sign-in */ }
  if (__DEV__) console.log('[Sync] reconcile — restored:', restored, '· migrated:', migrated);
  return { restored, migrated };
}
