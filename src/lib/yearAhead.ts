// src/lib/yearAhead.ts
// The "Year Ahead" living 12-month view — computed deterministically from the existing
// engine (NO AI). Starts at the CURRENT month, so it stays current every time the owner
// opens it. Per month: the running Mahadasha–Antardasha (+ any transition that month),
// the notable slow-graha transits, a warm theme, timing-window chips, and a 0–100
// month-strength score. Reuses dashaMeaning (MAHA_MEANING/ANTAR_THEME) + the energy-score
// approach; same tone rules as dailyContent (warm, specific, non-doom).
import { BirthChart, computeAllTransits, computeTransitFactor, PlanetTransit } from '@/lib/vedic';
import { MAHA_MEANING, ANTAR_THEME } from '@/data/dashaMeaning';

export type YearMonth = {
  key: string;               // 'YYYY-M'
  label: string;             // "July 2026"
  mahaLord: string;
  antarLord: string;
  dashaLabel: string;        // "Jupiter–Saturn"
  transition: string | null; // highlighted mid-month event (dasha shift), or null
  transits: string[];        // notable transits this month
  theme: string;             // 2–3 sentence theme
  windows: string[];         // 2–3 timing-window chips
  strength: number;          // 0–100
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_IDX: Record<string, number> = MONTHS.reduce((m, s, i) => ((m[s] = i), m), {} as Record<string, number>);
const SLOW = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ord = (n: number | null | undefined) => (n && ORD[n]) || 'current';

// Per-graha tone: month theme flavor, an action verb, a timing-window phrase, and a base
// strength (benefics score higher). Mirrors the dailyContent/dashaMeaning vocabularies.
const GRAHA: Record<string, { theme: string; verb: string; window: string; strength: number }> = {
  Sun:     { theme: 'purpose, visibility and leadership', verb: 'step into your authority', window: 'Strong for leadership', strength: 64 },
  Moon:    { theme: 'feeling, home and care',             verb: 'tend what matters',        window: 'Good for home & care',  strength: 66 },
  Mars:    { theme: 'drive, courage and momentum',        verb: 'take decisive action',      window: 'Strong for bold moves', strength: 58 },
  Mercury: { theme: 'thinking, learning and exchange',    verb: 'communicate and plan',      window: 'Sharp for deals & study', strength: 68 },
  Jupiter: { theme: 'growth, opportunity and meaning',    verb: 'expand and say yes',        window: 'Favorable for growth',  strength: 80 },
  Venus:   { theme: 'love, beauty and connection',        verb: 'connect and enjoy',         window: 'Good for relationships', strength: 76 },
  Saturn:  { theme: 'discipline, structure and patience', verb: 'build slowly',              window: 'Patience over speed',   strength: 54 },
  Rahu:    { theme: 'ambition and the unconventional',    verb: 'reach for the new',         window: 'Bold, unconventional moves', strength: 56 },
  Ketu:    { theme: 'release, depth and reflection',      verb: 'release and reflect',       window: 'Reflection over launches', strength: 52 },
};
const g = (name: string) => GRAHA[name] ?? GRAHA.Jupiter;

// ---- deterministic helpers (same style as energy.ts) --------------------------
const clampRound = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const jitter = (key: string, amp: number) => ((hashStr(key) % 1000) / 1000 * 2 - 1) * amp;

// Parse "Mon YYYY" → Date at the 1st of that month.
function parseMonYear(s: string): Date | null {
  const m = /([A-Za-z]{3})\w*\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mo = MONTH_IDX[m[1] as keyof typeof MONTH_IDX];
  if (mo === undefined) return null;
  return new Date(Number(m[2]), mo, 1);
}

// Resolve which Mahadasha lord + Antardasha lord is running at `date`, using the present
// Maha's antardashas (month precision) and falling back to the next Maha (whose first
// antardasha is the Maha lord itself) once the present Maha ends.
function resolveDasha(chart: BirthChart, date: Date) {
  const present = chart.dasha.find((d) => d.phase === 'present');
  const antars = present?.antardashas ?? [];
  for (const a of antars) {
    const s = parseMonYear(a.start); const e = parseMonYear(a.end);
    if (s && e && date >= s && date < e) return { mahaLord: present!.planet, antarLord: a.planet, boundary: s };
  }
  // Past the present Maha → the next Maha has begun.
  const idx = chart.dasha.findIndex((d) => d.phase === 'present');
  const next = idx >= 0 ? chart.dasha[idx + 1] : undefined;
  if (next && date.getFullYear() >= next.start) {
    return { mahaLord: next.planet, antarLord: next.planet, boundary: new Date(next.start, 0, 1) };
  }
  // Fallback: present Maha lord, first (own) antardasha.
  return { mahaLord: present?.planet ?? chart.dasha[0]?.planet ?? 'Jupiter', antarLord: present?.planet ?? 'Jupiter', boundary: null };
}

// The dasha transition, if any, that lands inside [monthStart, monthEnd).
function dashaTransition(chart: BirthChart, monthStart: Date, monthEnd: Date): string | null {
  const idx = chart.dasha.findIndex((d) => d.phase === 'present');
  const present = idx >= 0 ? chart.dasha[idx] : undefined;
  const next = idx >= 0 ? chart.dasha[idx + 1] : undefined;
  // Mahadasha change (the bigger event) — next Maha starts this month.
  if (next) {
    const nextStart = new Date(next.start, 0, 1);
    // Approximate the Maha boundary from the present Maha's last antardasha end (month-precise).
    const lastAntarEnd = present?.antardashas?.length ? parseMonYear(present.antardashas[present.antardashas.length - 1].end) : null;
    const boundary = lastAntarEnd ?? nextStart;
    if (boundary >= monthStart && boundary < monthEnd) return `${next.planet} Mahādasha begins — a new life chapter`;
  }
  // Antardasha change within the present Maha.
  for (const a of present?.antardashas ?? []) {
    const s = parseMonYear(a.start);
    if (s && s >= monthStart && s < monthEnd) return `${present!.planet}–${a.planet} sub-period begins`;
  }
  return null;
}

// Notable transits during a month: slow grahas changing sign/house or stationing, plus a
// transit aspecting the natal Moon or ascendant. `prev` is the previous month's table.
function monthTransits(chart: BirthChart, mid: Date, cur: PlanetTransit[], prev: PlanetTransit[]): { notes: string[]; flags: { retro: boolean; jupiter: boolean; saturn: boolean; career: boolean; moon: boolean } } {
  const notes: string[] = [];
  const flags = { retro: false, jupiter: false, saturn: false, career: false, moon: false };
  const prevOf = (name: string) => prev.find((p) => p.name === name);

  for (const name of [...SLOW, 'Mars']) {
    const c = cur.find((p) => p.name === name); const p = prevOf(name);
    if (!c || !p) continue;
    if (c.sign !== p.sign) notes.push(`${name} enters ${c.sign}`);
    else if (c.house !== p.house) notes.push(`${name} moves into your ${ord(c.house)} house`);
    if (c.retrograde !== p.retrograde && name !== 'Rahu' && name !== 'Ketu') {
      notes.push(`${name} turns ${c.retrograde ? 'retrograde' : 'direct'}`);
      flags.retro = flags.retro || c.retrograde;
    }
    if (name === 'Jupiter' && (c.house === 1 || [5, 9, 10, 11].includes(c.house))) flags.jupiter = true;
    if (name === 'Saturn' && (c.house === 1 || c.house === 10)) flags.saturn = true;
    if ((name === 'Jupiter' || name === 'Saturn' || name === 'Sun') && c.house === 10) flags.career = true;
  }

  // Transit aspecting the natal Moon or sitting on the ascendant.
  try {
    const f = computeTransitFactor(chart, mid, 'general');
    if (f.natalPlanet === 'Moon' && f.aspectName) { notes.push(`${f.transiting} ${f.aspectName.toLowerCase()}s your natal Moon`); flags.moon = true; }
    else if (f.house === 1 && SLOW.includes(f.transiting)) notes.push(`${f.transiting} transits your ascendant`);
  } catch { /* ignore */ }

  return { notes: dedupe(notes).slice(0, 3), flags };
}
const dedupe = (a: string[]) => Array.from(new Set(a));
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export function computeYearAhead(chart: BirthChart, from: Date = new Date()): YearMonth[] {
  const startMonth = new Date(from.getFullYear(), from.getMonth(), 1);
  // Precompute transit tables for the month BEFORE the window through month 11.
  const midFor = (i: number) => new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 15);
  const tables: PlanetTransit[][] = [];
  for (let i = -1; i < 12; i++) tables.push(computeAllTransits(chart, midFor(i)));

  const out: YearMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
    const monthEnd = new Date(startMonth.getFullYear(), startMonth.getMonth() + i + 1, 1);
    const mid = midFor(i);
    const label = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const key = `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`;

    const { mahaLord, antarLord } = resolveDasha(chart, mid);
    const transition = dashaTransition(chart, monthStart, monthEnd);
    const { notes, flags } = monthTransits(chart, mid, tables[i + 1], tables[i]);

    // Theme — 2–3 warm sentences from the dominant (antardasha) factor + the chapter.
    const a = g(antarLord);
    const chapter = (MAHA_MEANING[mahaLord]?.chapter ?? 'current chapter').toLowerCase();
    const reward = ANTAR_THEME[antarLord]?.rewards?.[0];
    const s1 = `You're moving through your ${chapter}, with ${antarLord} coloring the month toward ${a.theme}.`;
    const s2 = reward ? `It rewards ${lower(reward)}.` : `A month to ${a.verb}.`;
    const s3 = notes.length ? `${cap(notes[0])} adds its own weight — ${a.verb}.` : `Lean into ${a.theme}.`;
    const theme = `${s1} ${s2} ${s3}`;

    // Timing windows — from the antardasha lord + the month's transit flags.
    const win = new Set<string>([a.window]);
    if (flags.retro) win.add('Review before signing');
    if (flags.jupiter) win.add('Favorable for growth');
    if (flags.saturn) win.add('Patience over speed');
    if (flags.career) win.add('Career momentum');
    if (flags.moon) win.add('Tend your emotional world');
    const windows = Array.from(win).slice(0, 3);

    // Strength — antar (60%) + maha (40%) base, adjusted by transit flags, small jitter.
    let adj = 0;
    if (flags.jupiter) adj += 8;
    if (flags.career) adj += 5;
    if (flags.retro) adj -= 6;
    if (flags.saturn) adj -= 3;
    if (flags.moon) adj += 3;
    const base = a.strength * 0.6 + g(mahaLord).strength * 0.4;
    const strength = clampRound(base + adj + jitter(key + antarLord, 4));

    out.push({
      key, label, mahaLord, antarLord, dashaLabel: `${mahaLord}–${antarLord}`,
      transition, transits: notes, theme, windows, strength,
    });
  }
  return out;
}
