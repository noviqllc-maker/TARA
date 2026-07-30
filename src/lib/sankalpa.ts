// src/lib/sankalpa.ts
// Sankalpa (intention) storage — a short intention set under an auspicious window, revisited
// at the next window of the same type. Local-first (AsyncStorage) with best-effort server
// mirroring (public.sankalpa) so history survives reinstall. All free; no gating.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { checkinDate } from '@/lib/checkin';

const KEY = '@tara/practice/sankalpa';

export type SankalpaState = 'active' | 'reflected' | 'renewed' | 'completed';
export type Sankalpa = {
  id: string;
  windowType: string;   // 'amavasya' | 'purnima' | 'sankranti' | 'ekadashi'
  windowLabel: string;  // display name of the window it was set under
  setDate: string;      // YYYY-MM-DD
  text: string;
  state: SankalpaState;
  reflectNote?: string;
  updatedAt: string;    // ISO
};

// A non-cryptographic local id (fine for a user record key). Math.random is acceptable here —
// this is not engine determinism, just a unique row id.
function newId(): string {
  return `sk_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

async function read(): Promise<Sankalpa[]> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Sankalpa[]) : []; }
  catch { return []; }
}
async function write(list: Sankalpa[]): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); } catch { /* best effort */ }
}

// Load all sankalpas (newest first). On an empty local cache, tries a one-time server pull so
// a reinstall restores history.
export async function loadSankalpas(): Promise<Sankalpa[]> {
  let list = await read();
  if (list.length === 0) {
    const pulled = await pullFromServer();
    if (pulled.length) { list = pulled; await write(list); }
  }
  return [...list].sort((a, b) => (a.setDate < b.setDate ? 1 : a.setDate > b.setDate ? -1 : 0));
}

export async function addSankalpa(windowType: string, windowLabel: string, text: string): Promise<Sankalpa> {
  const s: Sankalpa = {
    id: newId(), windowType, windowLabel, setDate: checkinDate(), text: text.trim().slice(0, 280),
    state: 'active', updatedAt: new Date().toISOString(),
  };
  const list = await read();
  list.unshift(s);
  await write(list);
  void upsertServer(s);
  return s;
}

export async function updateSankalpa(id: string, patch: Partial<Pick<Sankalpa, 'state' | 'reflectNote'>>): Promise<Sankalpa[]> {
  const list = await read();
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    await write(list);
    void upsertServer(list[i]);
  }
  return loadSankalpas();
}

// The most recent still-open (active/renewed) sankalpa of a given window type — the one a
// returning window invites you to revisit.
export async function openSankalpaFor(windowType: string): Promise<Sankalpa | null> {
  const list = await read();
  const open = list.filter((s) => s.windowType === windowType && (s.state === 'active' || s.state === 'renewed'));
  open.sort((a, b) => (a.setDate < b.setDate ? 1 : -1));
  // Only surface it as a revisit if it was set on an EARLIER day (not the one just created).
  const s = open[0];
  return s && s.setDate < checkinDate() ? s : null;
}

// ---- server mirror -------------------------------------------------------------
async function upsertServer(s: Sankalpa): Promise<void> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    await supabase.from('sankalpa').upsert({
      id: s.id, user_id: uid, window_type: s.windowType, window_label: s.windowLabel,
      set_date: s.setDate, text: s.text, state: s.state, reflect_note: s.reflectNote ?? null,
      updated_at: s.updatedAt,
    }, { onConflict: 'id' });
  } catch { /* best effort */ }
}

async function pullFromServer(): Promise<Sankalpa[]> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from('sankalpa')
      .select('id,window_type,window_label,set_date,text,state,reflect_note,updated_at')
      .eq('user_id', uid)
      .order('set_date', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id, windowType: r.window_type, windowLabel: r.window_label, setDate: r.set_date,
      text: r.text, state: r.state, reflectNote: r.reflect_note ?? undefined, updatedAt: r.updated_at,
    }));
  } catch { return []; }
}
