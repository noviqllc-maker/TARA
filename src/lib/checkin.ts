// src/lib/checkin.ts
// Server persistence for the Daily Check-in (mood journal + "how accurate was Tara").
// One row per (user, date) in public.daily_checkin. Upserted on save, loaded on open —
// so entries survive reinstall. No-ops when signed out (the screen keeps a local cache).
import { supabase } from '@/lib/supabase';

export type Checkin = {
  mood?: string;
  energy?: number;
  stress?: number;
  notes?: string;
  accuracy?: string; // 'Accurate' | 'Somewhat Accurate' | 'Not Accurate'
};

// Local calendar date, YYYY-MM-DD (the check-in is keyed by the user's local day).
export function checkinDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Today's check-in from the server (null if signed out / none / error).
export async function loadTodayCheckin(): Promise<Checkin | null> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from('daily_checkin')
      .select('mood,energy,stress,notes,accuracy')
      .eq('user_id', uid)
      .eq('entry_date', checkinDate())
      .maybeSingle();
    if (error || !data) return null;
    return data as Checkin;
  } catch {
    return null;
  }
}

// Upsert today's check-in. Only the provided fields are written, so a partial save (e.g.
// just the accuracy rating) never clobbers the rest of the row.
export async function saveCheckin(entry: Checkin): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    await supabase.from('daily_checkin').upsert(
      { user_id: uid, entry_date: checkinDate(), ...entry, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' },
    );
  } catch { /* best effort — the screen keeps a local cache */ }
}
