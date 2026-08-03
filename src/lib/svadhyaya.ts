// src/lib/svadhyaya.ts
// Deterministic "Teaching of the Day" selection (no AI, no storage — past teachings are
// recomputable, not saved). Design:
//   • Types ALTERNATE by calendar day: even day-index → shloka, odd → concept.
//   • Within each type, we walk a per-user PERMUTATION of that list by the count of that
//     type's days, so an entry never repeats until its whole list cycles (each list ≥26,
//     and a type appears only every other day → no repeat for well over 30 days).
//   • Seeded by the user id + the day's vāra (weekday) lord, so rotation is keyed to the
//     day-lord and differs per user, deterministically.
import { SHLOKAS, CONCEPTS, Teaching } from '@/data/svadhyaya';
import { varaLord } from '@/lib/panchanga';

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// mulberry32 PRNG — deterministic from a 32-bit seed.
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function permutation(n: number, seed: string): number[] {
  const rand = mulberry32(hashStr(seed));
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const DAY_MS = 86_400_000;
// Whole-day index (stable per local calendar day; not engine-determinism, so Date math is fine).
const dayIndex = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
const mod = (n: number, m: number) => ((n % m) + m) % m;

export type DailyTeaching = { teaching: Teaching; dayLord: string; isToday: boolean };

// The teaching for a given user + date.
export function teachingForDate(uid: string, date: Date): DailyTeaching {
  const t = dayIndex(date);
  const dayLord = varaLord(date).lord;
  const isShloka = mod(t, 2) === 0;
  const list = isShloka ? SHLOKAS : CONCEPTS;
  // The permutation must be STABLE per (user, type) — it is the fixed order we walk by date.
  // (The day-lord keys the annotation/resonance, NOT the permutation; folding it in here
  // would reshuffle the order every weekday and break the no-repeat walk.)
  const perm = permutation(list.length, `${uid}:svadhyaya:${isShloka ? 's' : 'c'}`);
  const tType = Math.floor(t / 2);                 // count of this type's days
  const teaching = list[perm[mod(tType, list.length)]];
  return { teaching, dayLord, isToday: t === dayIndex(new Date()) };
}

// Previously-shown teachings (yesterday backwards), for the "browse past teachings" list.
export function pastTeachings(uid: string, count = 20, from: Date = new Date()): { date: Date; teaching: Teaching }[] {
  const out: { date: Date; teaching: Teaching }[] = [];
  for (let k = 1; k <= count; k++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - k);
    out.push({ date: d, teaching: teachingForDate(uid, d).teaching });
  }
  return out;
}
