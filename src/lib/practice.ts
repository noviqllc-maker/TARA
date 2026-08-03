// src/lib/practice.ts
// Japa practice tracking: daily completion count + streak, persisted locally (AsyncStorage,
// instant + offline) AND best-effort to the server (public.practice_log) so it survives a
// reinstall. All free — no entitlement checks anywhere. The local cache is the source of
// truth for the UI; the server write is fire-and-forget.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { checkinDate } from '@/lib/checkin';

const KEY = '@tara/practice/japa'; // { [YYYY-MM-DD]: roundsCompleted }
const ROUND = 108;

export type JapaState = {
  today: number;      // rounds completed today
  streak: number;     // consecutive days (ending today, or yesterday if today not yet done)
  beadsToday: number; // convenience: today * 108
};

type DayMap = Record<string, number>;

async function readMap(): Promise<DayMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DayMap) : {};
  } catch { return {}; }
}

async function writeMap(map: DayMap): Promise<void> {
  try {
    // Keep the map bounded (~1 year) so it never grows without limit.
    const entries = Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 400);
    await AsyncStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* best effort */ }
}

// Shift a YYYY-MM-DD key by `delta` days.
function shiftKey(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return checkinDate(new Date(y, m - 1, d + delta));
}

// Current streak from the day-map: count back from today while each day has ≥1 round. If
// today isn't done yet, the streak is measured up to yesterday (so an unfinished today
// doesn't zero a real run).
function streakFrom(map: DayMap, today = checkinDate()): number {
  let cursor = (map[today] ?? 0) >= 1 ? today : shiftKey(today, -1);
  let streak = 0;
  while ((map[cursor] ?? 0) >= 1) { streak++; cursor = shiftKey(cursor, -1); }
  return streak;
}

function toState(map: DayMap): JapaState {
  const today = map[checkinDate()] ?? 0;
  return { today, streak: streakFrom(map), beadsToday: today * ROUND };
}

export async function loadJapa(): Promise<JapaState> {
  return toState(await readMap());
}

// Record one completed mālā (108). Updates the local cache immediately and mirrors the new
// daily total to the server (fire-and-forget; no-op when signed out).
export async function recordRound(): Promise<JapaState> {
  const map = await readMap();
  const key = checkinDate();
  map[key] = (map[key] ?? 0) + 1;
  await writeMap(map);
  void syncToServer(key, map[key]);
  return toState(map);
}

async function syncToServer(entryDate: string, rounds: number): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    await supabase.from('practice_log').upsert(
      { user_id: uid, entry_date: entryDate, japa_rounds: rounds, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' },
    );
  } catch { /* best effort — local cache holds the truth */ }
}

// ---- Evening Ritual: daily completion + streak (same local-first pattern) -------
const EVE_KEY = '@tara/practice/evening'; // { [YYYY-MM-DD]: 1 }

export type EveningState = { doneToday: boolean; streak: number };

function eveStreak(map: DayMap, today = checkinDate()): number {
  let cursor = (map[today] ?? 0) >= 1 ? today : shiftKey(today, -1);
  let streak = 0;
  while ((map[cursor] ?? 0) >= 1) { streak++; cursor = shiftKey(cursor, -1); }
  return streak;
}

async function readEve(): Promise<DayMap> {
  try { const raw = await AsyncStorage.getItem(EVE_KEY); return raw ? (JSON.parse(raw) as DayMap) : {}; }
  catch { return {}; }
}
async function writeEve(map: DayMap): Promise<void> {
  try {
    const entries = Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 400);
    await AsyncStorage.setItem(EVE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* best effort */ }
}

export async function loadEvening(): Promise<EveningState> {
  const map = await readEve();
  return { doneToday: (map[checkinDate()] ?? 0) >= 1, streak: eveStreak(map) };
}

// Mark today's Evening Ritual complete, with the optional one-line reflection. Local first,
// then best-effort to practice_log (evening_done + evening_note).
export async function recordEvening(note?: string): Promise<EveningState> {
  const map = await readEve();
  const key = checkinDate();
  map[key] = 1;
  await writeEve(map);
  void syncEvening(key, note);
  return { doneToday: true, streak: eveStreak(map) };
}

async function syncEvening(entryDate: string, note?: string): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    const row: Record<string, unknown> = { user_id: uid, entry_date: entryDate, evening_done: true, updated_at: new Date().toISOString() };
    if (note && note.trim()) row.evening_note = note.trim().slice(0, 280);
    await supabase.from('practice_log').upsert(row, { onConflict: 'user_id,entry_date' });
  } catch { /* best effort */ }
}

// ---- Mauna: kept-silence completion (occasional — Amāvasyā & Saturdays) ---------
const MAUNA_KEY = '@tara/practice/mauna'; // { [YYYY-MM-DD]: 1 }

export type MaunaState = { doneToday: boolean; total: number };

export async function loadMauna(): Promise<MaunaState> {
  try {
    const raw = await AsyncStorage.getItem(MAUNA_KEY);
    const map = raw ? (JSON.parse(raw) as DayMap) : {};
    return { doneToday: (map[checkinDate()] ?? 0) >= 1, total: Object.values(map).filter((v) => v >= 1).length };
  } catch { return { doneToday: false, total: 0 }; }
}

// Mark today's Mauna kept. Local first, then best-effort to practice_log (mauna_done).
export async function recordMauna(): Promise<MaunaState> {
  let map: DayMap = {};
  try { const raw = await AsyncStorage.getItem(MAUNA_KEY); map = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }
  const key = checkinDate();
  map[key] = 1;
  try {
    const entries = Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 400);
    await AsyncStorage.setItem(MAUNA_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* best effort */ }
  void syncMauna(key);
  return { doneToday: true, total: Object.values(map).filter((v) => v >= 1).length };
}

async function syncMauna(entryDate: string): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    await supabase.from('practice_log').upsert(
      { user_id: uid, entry_date: entryDate, mauna_done: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_date' },
    );
  } catch { /* best effort */ }
}
