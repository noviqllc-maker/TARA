// src/lib/history.ts
// Server-side Ask Tara question history (survives reinstall). Each answer is written
// to the RLS-protected ask_history table. If the user is somehow unauthenticated (or
// a write fails), the entry is queued locally and flushed on the next auth.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const QUEUE_KEY = 'tara.history.queue.v1';

export type HistoryEntry = {
  id?: string;
  question: string;
  answer: string;
  factor?: string | null;
  created_at?: string;
};

async function queue(row: { question: string; answer: string; factor: string | null }): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ ...row, queued_at: new Date().toISOString() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-100)));
  } catch { /* best effort */ }
}

// Persist a Q&A to the server. Queues locally if signed out or the write fails.
// Returns the new row's id (so the answer view can attach a 👍/👎 rating), or null.
export async function saveHistory(question: string, answer: string, factor?: string | null): Promise<string | null> {
  const row = { question, answer, factor: factor ?? null };
  try {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) { await queue(row); return null; }
    const { data, error } = await supabase.from('ask_history').insert({ user_id: uid, ...row }).select('id').single();
    if (error) { await queue(row); return null; }
    return (data?.id as string) ?? null;
  } catch {
    await queue(row);
    return null;
  }
}

// Attach / change the thumbs rating on an answer row (1 = 👍, -1 = 👎). RLS restricts the
// update to the caller's own rows. Best-effort; no-op when there's no server row id.
export async function setHistoryFeedback(id: string, feedback: 1 | -1): Promise<void> {
  try { await supabase.from('ask_history').update({ feedback }).eq('id', id); } catch { /* best effort */ }
}

// Flush any queued entries (call after auth). Best effort; clears the queue on success.
export async function flushHistoryQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || !list.length) return;
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    const rows = list.map((r: any) => ({
      user_id: uid, question: r.question, answer: r.answer, factor: r.factor ?? null, created_at: r.queued_at,
    }));
    const { error } = await supabase.from('ask_history').insert(rows);
    if (!error) await AsyncStorage.removeItem(QUEUE_KEY);
  } catch { /* best effort */ }
}

// Newest-first history for the signed-in user (from the server).
export async function fetchHistory(limit = 100): Promise<HistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('ask_history')
      .select('id,question,answer,factor,created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as HistoryEntry[];
  } catch {
    return [];
  }
}
