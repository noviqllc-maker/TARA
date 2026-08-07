// src/lib/yearAhead.ts
// The "Year Ahead" living 12-month view — computed deterministically from the existing
// engine (NO AI). Starts at the CURRENT month, so it stays current every time the owner
// opens it.
//
// Design note (why this file is shaped the way it is): the dasha barely changes month to
// month, so leading every card with it makes all twelve read alike. Instead each month is
// led by its most DISTINCTIVE factor — a station, an ingress, a dasha shift, an aspect to
// the natal Moon/lagna, or (only when nothing else moves) the score trend / texture. The
// dasha becomes a supporting sentence drawn from a rotating pool. Exact event days are
// found by binary-searching the engine (transitBodyOn), so "Sep 9" is real, not invented.
import { BirthChart, computeAllTransits, computeTransitFactor, transitBodyOn, PlanetTransit, SIGNS } from '@/lib/vedic';
import { MAHA_MEANING, ANTAR_THEME } from '@/data/dashaMeaning';

export type KeyDate = { date: string; text: string };
export type LifeAreas = { career?: string; love?: string; money?: string };

export type YearMonth = {
  key: string;               // 'YYYY-M'
  label: string;             // "September 2026"
  monthWord: string;         // "September"
  mahaLord: string;
  antarLord: string;
  dashaLabel: string;        // "Jupiter–Saturn"
  transition: string | null; // highlighted dasha shift this month (for the ✦ box), or null
  differentiator: string;    // the month's lead sentence — what makes it distinct (collapsed preview)
  transits: string[];        // notable transits this month (Major transits list)
  keyDates: KeyDate[];       // 2–4 dated events inside the month
  lifeAreas: LifeAreas;      // Career / Love / Money lines (a domain is omitted when nothing applies)
  theme: string;             // 4–6 sentence composed theme (expanded view)
  windows: string[];         // 2–3 timing-window chips
  strength: number;          // 0–100
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_IDX: Record<string, number> = MONTHS.reduce((m, s, i) => ((m[s] = i), m), {} as Record<string, number>);
const SLOW = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'];
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ord = (n: number | null | undefined) => (n && ORD[n]) || 'current';

// Per-graha tone: month-theme flavour, an action verb, a timing-window phrase, a base
// strength (benefics score higher). Mirrors the dailyContent/dashaMeaning vocabularies.
const GRAHA: Record<string, { theme: string; verb: string; window: string; strength: number }> = {
  Sun:     { theme: 'purpose, visibility and leadership', verb: 'step into your authority', window: 'Strong for leadership',       strength: 64 },
  Moon:    { theme: 'feeling, home and care',             verb: 'tend what matters',        window: 'Good for home & care',        strength: 66 },
  Mars:    { theme: 'drive, courage and momentum',        verb: 'take decisive action',     window: 'Strong for bold moves',       strength: 58 },
  Mercury: { theme: 'thinking, learning and exchange',    verb: 'communicate and plan',     window: 'Sharp for deals & study',     strength: 68 },
  Jupiter: { theme: 'growth, opportunity and meaning',    verb: 'expand and say yes',       window: 'Favorable for growth',        strength: 80 },
  Venus:   { theme: 'love, beauty and connection',        verb: 'connect and enjoy',        window: 'Good for relationships',      strength: 76 },
  Saturn:  { theme: 'discipline, structure and patience', verb: 'build slowly',             window: 'Patience over speed',         strength: 54 },
  Rahu:    { theme: 'ambition and the unconventional',    verb: 'reach for the new',        window: 'Bold, unconventional moves',  strength: 56 },
  Ketu:    { theme: 'release, depth and reflection',      verb: 'release and reflect',      window: 'Reflection over launches',    strength: 52 },
};
const g = (name: string) => GRAHA[name] ?? GRAHA.Jupiter;

// Short "house of …" phrase for lead + life-area composition.
const HOUSE_SHORT: Record<number, string> = {
  1: 'identity and vitality', 2: 'money and security', 3: 'communication and courage',
  4: 'home and roots', 5: 'creativity and romance', 6: 'work and wellbeing',
  7: 'partnership', 8: 'depth and change', 9: 'fortune and belief',
  10: 'career and standing', 11: 'gains and networks', 12: 'rest and release',
};

// What each graha's forward motion is "green light" for (station + key-date benefits).
const BODY_BENEFIT: Record<string, string> = {
  Mercury: 'signing, talking and travel', Venus: 'relationships and money',
  Mars: 'action and initiative', Jupiter: 'growth and opportunity',
  Saturn: 'commitments and structure', Sun: 'leadership and visibility', Moon: 'home and inner matters',
};
const benefitOf = (b: string) => BODY_BENEFIT[b] ?? g(b).theme;

// A cleaner noun phrase for the "favours" sentence (reads better than BODY_BENEFIT there).
const BODY_DOMAIN: Record<string, string> = {
  Mercury: 'communication and plans', Venus: 'relationships and finances', Mars: 'initiative and drive',
  Jupiter: 'growth and opportunity', Saturn: 'long-term structure', Sun: 'leadership', Moon: 'home life',
};
const domainOf = (b: string) => BODY_DOMAIN[b] ?? g(b).theme;

// Openers that all read grammatically after "September ___ as/when …".
const OPENERS = ['sharpens', 'turns a corner', 'opens up', 'shifts', 'deepens', 'quickens', 'steadies', 'lifts', 'recalibrates', 'gathers focus'];

// Domain significators — which grahas / natal houses carry each life area.
const DOMAIN: Record<'career' | 'love' | 'money', { grahas: string[]; houses: number[] }> = {
  career: { grahas: ['Sun', 'Saturn', 'Mars', 'Mercury', 'Jupiter'], houses: [1, 2, 6, 10, 11] },
  love:   { grahas: ['Venus', 'Moon'],                               houses: [1, 5, 7, 11] },
  money:  { grahas: ['Jupiter', 'Venus', 'Mercury', 'Saturn'],       houses: [2, 5, 9, 11] },
};
// When only the dasha touches a domain, this is the flavour of its line.
const DOMAIN_FLAVOR: Record<'career' | 'love' | 'money', Record<string, string>> = {
  career: { Sun: 'stepping into authority', Saturn: 'patient, structural progress', Mars: 'decisive pushes', Mercury: 'deals and communication', Jupiter: 'growth and mentorship' },
  love:   { Venus: 'warmth and connection', Moon: 'tenderness and care' },
  money:  { Jupiter: 'expansion and opportunity', Venus: 'ease and enjoyment', Mercury: 'clever, well-timed deals', Saturn: 'disciplined saving' },
};

// The dasha-context sentence (b) — 8 phrasings, rotated + de-duplicated across the year so
// the Jupiter–Mercury line never repeats verbatim card to card.
function dashaContextCandidates(chapter: string, lord: string, theme: string): string[] {
  return [
    `Underneath it all, you're still moving through your ${chapter}.`,
    `The ${lord} sub-period keeps its hand on the wheel, tilting things toward ${theme}.`,
    `Your ${chapter} stays the backdrop, with ${lord} setting the undertone.`,
    `Running quietly beneath the month, ${lord}'s influence favours ${theme}.`,
    `This all unfolds inside your ${chapter}, a longer arc that ${lord} is colouring now.`,
    `${lord}'s sub-period continues to shape the bigger picture toward ${theme}.`,
    `The through-line remains your ${chapter}, steady under the month's shifts.`,
    `As a slower current, ${lord} keeps nudging you toward ${theme}.`,
    `Zoom out and it's all still your ${chapter}, with ${lord} tinting the days.`,
    `Beneath the headlines, ${lord} quietly draws you toward ${theme}.`,
    `Your longer season of ${chapter} holds, with ${lord} shading it toward ${theme}.`,
    `The bigger arc, your ${chapter}, keeps its own slow rhythm underneath.`,
  ];
}

// Closing directive (d) — rotated + de-duplicated.
const DIRECTIVES = [
  'Move deliberately, and let the month come to you.',
  'Say yes to what grows you, and pass on the rest.',
  'Put the important things in writing.',
  'Protect your energy and pick your moments.',
  'Start what you can sustain, not just what excites you.',
  'Tend the relationships that feed you.',
  'Build a little every day. It compounds.',
  'Trust the slower, surer path this month.',
  'Choose depth over speed.',
  'Keep your promises small and your follow-through complete.',
  'Follow through on the one thing that matters most.',
  'Let steadiness, not urgency, set your pace.',
  'Make room for rest inside the effort.',
  'Act on what you can control, and release the rest.',
];

// ---- deterministic helpers (same style as energy.ts) --------------------------
const clampRound = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const jitter = (key: string, amp: number) => ((hashStr(key) % 1000) / 1000 * 2 - 1) * amp;
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const ordinalDay = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };

// Choose the first candidate not yet used anywhere this computation, starting at a seeded
// offset and wrapping — the variety guard behind requirement 4 (no two months share an
// identical sentence). `optional` slots (e.g. the "meanwhile" clause) return '' rather than
// repeat when every candidate is taken, so we drop the sentence instead of duplicating it.
function chooseUnique(seed: string, candidates: string[], used: Set<string>, optional = false): string {
  const n = candidates.length;
  if (!n) return '';
  const start = hashStr(seed) % n;
  for (let k = 0; k < n; k++) {
    const c = candidates[(start + k) % n];
    if (!used.has(c)) { used.add(c); return c; }
  }
  if (optional) return '';
  const c = candidates[start]; used.add(c); return c;
}

// Parse "Mon YYYY" → Date at the 1st of that month.
function parseMonYear(s: string): Date | null {
  const m = /([A-Za-z]{3})\w*\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mo = MONTH_IDX[m[1] as keyof typeof MONTH_IDX];
  if (mo === undefined) return null;
  return new Date(Number(m[2]), mo, 1);
}

// Resolve which Mahadasha + Antardasha lord is running at `date`.
function resolveDasha(chart: BirthChart, date: Date) {
  const present = chart.dasha.find((d) => d.phase === 'present');
  const antars = present?.antardashas ?? [];
  for (const a of antars) {
    const s = parseMonYear(a.start); const e = parseMonYear(a.end);
    if (s && e && date >= s && date < e) return { mahaLord: present!.planet, antarLord: a.planet };
  }
  const idx = chart.dasha.findIndex((d) => d.phase === 'present');
  const next = idx >= 0 ? chart.dasha[idx + 1] : undefined;
  if (next && date.getFullYear() >= next.start) return { mahaLord: next.planet, antarLord: next.planet };
  return { mahaLord: present?.planet ?? chart.dasha[0]?.planet ?? 'Jupiter', antarLord: present?.planet ?? 'Jupiter' };
}

// Structured dasha transition landing inside [monthStart, monthEnd), if any.
type DashaEvent = { kind: 'dashaMaha' | 'dashaAntar'; lord: string; text: string };
function dashaTransition(chart: BirthChart, monthStart: Date, monthEnd: Date): DashaEvent | null {
  const idx = chart.dasha.findIndex((d) => d.phase === 'present');
  const present = idx >= 0 ? chart.dasha[idx] : undefined;
  const next = idx >= 0 ? chart.dasha[idx + 1] : undefined;
  if (next) {
    const lastAntarEnd = present?.antardashas?.length ? parseMonYear(present.antardashas[present.antardashas.length - 1].end) : null;
    const boundary = lastAntarEnd ?? new Date(next.start, 0, 1);
    if (boundary >= monthStart && boundary < monthEnd) return { kind: 'dashaMaha', lord: next.planet, text: `${next.planet} Mahādasha begins: a new life chapter` };
  }
  for (const a of present?.antardashas ?? []) {
    const s = parseMonYear(a.start);
    if (s && s >= monthStart && s < monthEnd) return { kind: 'dashaAntar', lord: a.planet, text: `${present!.planet}–${a.planet} sub-period begins` };
  }
  return null;
}

// ---- signal detection ---------------------------------------------------------
type Signal = {
  kind: 'dashaMaha' | 'dashaAntar' | 'station' | 'ingress' | 'aspect';
  body?: string;
  lord?: string;             // dasha lord (dasha events)
  toSign?: string;
  house?: number;
  direction?: 'direct' | 'retrograde';
  natal?: string;
  aspect?: string;
  day?: number;              // exact day-of-month (dated events only)
  date?: string;             // "Sep 9"
  salience: number;
};

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

// Binary-search the first day in the month on which `pred` becomes true (a graha's sign or
// retro flag flips exactly once inside the month). Returns 1 if it's already true at day 1.
function firstDayWhere(last: number, pred: (d: number) => boolean): number {
  if (pred(1)) return 1;
  let lo = 1, hi = last;
  while (lo < hi) { const md = (lo + hi) >> 1; if (pred(md)) hi = md; else lo = md + 1; }
  return lo;
}

// Sign/station events that occur strictly WITHIN month i, detected by comparing each body's
// position on the 1st of this month vs the 1st of next month, then pinning the exact day.
function detectEvents(y: number, m: number, monthWord: string, start: PlanetTransit[], end: PlanetTransit[]): Signal[] {
  const last = daysInMonth(y, m);
  const at = (name: string, arr: PlanetTransit[]) => arr.find((p) => p.name === name);
  const signIdx = (s: string) => SIGNS.indexOf(s);
  const out: Signal[] = [];

  // Stations — a graha reverses direction (never Sun/Moon; nodes are always retrograde).
  for (const body of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const s = at(body, start); const e = at(body, end);
    if (!s || !e || s.retrograde === e.retrograde) continue;
    const day = firstDayWhere(last, (d) => transitBodyOn(body, new Date(y, m, d, 12)).retrograde === e.retrograde);
    const sal = body === 'Jupiter' || body === 'Saturn' ? 88 : body === 'Mars' ? 76 : body === 'Mercury' ? 74 : 72;
    out.push({ kind: 'station', body, direction: e.retrograde ? 'retrograde' : 'direct', day, date: `${monthWord} ${day}`, salience: sal });
  }

  // Ingresses — a graha changes sign (Sun excluded: it ingresses every month, so it never
  // makes a month distinctive).
  for (const body of ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Mars', 'Venus', 'Mercury']) {
    const s = at(body, start); const e = at(body, end);
    if (!s || !e || s.sign === e.sign) continue;
    const targetIdx = signIdx(e.sign);
    const day = firstDayWhere(last, (d) => transitBodyOn(body, new Date(y, m, d, 12)).signIndex === targetIdx);
    const sal = body === 'Jupiter' || body === 'Saturn' ? 90 : body === 'Rahu' || body === 'Ketu' ? 82
      : body === 'Mars' ? 70 : body === 'Venus' ? 58 : 56;
    out.push({ kind: 'ingress', body, toSign: e.sign, house: e.house, day, date: `${monthWord} ${day}`, salience: sal });
  }

  return out;
}

// ---- lead / theme / life-area composition -------------------------------------
type Ctx = { M: string; prevM: string; antarLord: string; mahaLord: string };

function leadCandidates(sig: Signal, ctx: Ctx, openerSeed: string): string[] {
  const M = ctx.M;
  const ops = OPENERS.slice();
  const start = hashStr(openerSeed) % ops.length;
  const opener = (k: number) => ops[(start + k) % ops.length];
  switch (sig.kind) {
    case 'dashaMaha':
      return [`${M} opens a new chapter as your ${sig.lord!} Mahādasha begins. The year's backdrop resets here.`];
    case 'dashaAntar':
      return [`${M} retunes as your ${sig.lord!} sub-period begins, shifting the texture of the months just ahead.`];
    case 'station': {
      const b = sig.body!; const benefit = benefitOf(b); const d = ordinalDay(sig.day!);
      if (sig.direction === 'direct')
        return [0, 1, 2].map((k) => `${M} ${opener(k)} as ${b} stations direct on the ${d}: forward motion returns to ${benefit}.`);
      return [
        `${M} asks for a second pass as ${b} turns retrograde on the ${d}: a stretch to revisit ${benefit}, not rush it.`,
        `${M} settles inward as ${b} turns retrograde on the ${d}, favouring review over launch around ${benefit}.`,
      ];
    }
    case 'ingress': {
      const b = sig.body!; const hs = HOUSE_SHORT[sig.house ?? 1];
      return [0, 1, 2].map((k) => `${M} ${opener(k)} when ${b} enters ${sig.toSign}, and your ${ord(sig.house)} house of ${hs} takes focus.`);
    }
    case 'aspect': {
      const b = sig.body!;
      if (sig.natal === 'Moon')
        return [0, 1].map((k) => `${M} ${opener(k)} as transiting ${b} ${(sig.aspect || 'meets').toLowerCase()}s your natal Moon, setting the month's emotional weather.`);
      return [`${M} brings you into focus as ${b} crosses your ascendant: a month that turns on your own direction.`];
    }
  }
  return [`${M} keeps an even, workmanlike rhythm.`];
}

// Fallback leads when the month has no distinctive transit (never the bare dasha line).
function scoreLead(M: string, prevM: string, delta: number): string {
  return delta >= 0
    ? `${M} lifts into a brighter, more open stretch after ${prevM}'s slower build.`
    : `${M} eases into a quieter, more inward stretch after ${prevM}'s push: a build rather than a breakthrough.`;
}
function textureLead(M: string, strength: number): string {
  if (strength >= 68) return `${M} carries a steady, favourable current: no single headline, just momentum you can use.`;
  if (strength >= 52) return `${M} keeps an even, workmanlike rhythm: a month for quiet, real progress.`;
  return `${M} runs slower and more reflective: a season for maintenance over launches.`;
}

// The 5th theme sentence — a "meanwhile" clause from a secondary signal. Two phrasings so
// the variety guard has room to dodge a collision; if both are taken the sentence is dropped.
function meanwhileCandidates(sig: Signal): string[] {
  let clause: string | null = null;
  switch (sig.kind) {
    case 'station': clause = sig.direction === 'direct'
      ? `${sig.body} also turns direct, easing something that had stalled`
      : `${sig.body} slips retrograde, so hold the big commitments there lightly`; break;
    case 'ingress': clause = `${sig.body} shifts into your ${ord(sig.house)} house of ${HOUSE_SHORT[sig.house ?? 1]}`; break;
    case 'aspect': clause = sig.natal === 'Moon' ? `${sig.body} keeps working on your inner weather` : `${sig.body} lingers on your ascendant`; break;
  }
  if (!clause) return [];
  // Not lowercased — every clause starts with a graha's proper name.
  return [`Meanwhile, ${clause}.`, `At the same time, ${clause}.`];
}

// Key-date line for a dated signal.
function keyDateText(sig: Signal): string {
  switch (sig.kind) {
    case 'dashaMaha': return `${sig.lord} Mahādasha begins: a new multi-year chapter opens.`;
    case 'dashaAntar': return `${sig.lord} sub-period begins: the year's texture shifts.`;
    case 'station': return sig.direction === 'direct'
      ? `${sig.body} stations direct: green light for ${benefitOf(sig.body!)}.`
      : `${sig.body} turns retrograde: review ${benefitOf(sig.body!)} before committing.`;
    case 'ingress': return `${sig.body} enters ${sig.toSign}: a fresh emphasis on ${HOUSE_SHORT[sig.house ?? 1]}.`;
    default: return '';
  }
}

// One life-area line, or null to omit the domain. Prefers a real transit touching the
// domain; falls back to the running dasha only if a domain-significator lord is active.
function lifeAreaLine(domain: 'career' | 'love' | 'money', sigs: Signal[], mahaLord: string, antarLord: string): string | null {
  const dom = DOMAIN[domain];
  const relevant = sigs
    .filter((s) => (s.body && dom.grahas.includes(s.body)) || (s.house && dom.houses.includes(s.house)))
    .sort((a, b) => b.salience - a.salience)[0];
  if (relevant) {
    const b = relevant.body!;
    if (relevant.kind === 'station')
      return relevant.direction === 'direct'
        ? `${b} turning direct clears a hold-up: a good stretch to restart what stalled.`
        : `${b} retrograde favours revisiting and refining over launching.`;
    if (relevant.kind === 'ingress')
      return `${b}'s move into your ${ord(relevant.house)} house draws focus to ${HOUSE_SHORT[relevant.house ?? 1]}.`;
    if (relevant.kind === 'aspect')
      return `${b}'s aspect to your natal Moon sharpens your instincts here.`;
  }
  const lord = dom.grahas.includes(antarLord) ? antarLord : dom.grahas.includes(mahaLord) ? mahaLord : null;
  if (lord) {
    const flavor = DOMAIN_FLAVOR[domain][lord] ?? g(lord).theme;
    return `Your ${lord} period keeps ${flavor} in focus.`;
  }
  return null;
}

// The concrete "what it favours" sentence (c). The phrase varies by the lead signal's body /
// house (so it rarely collides), and five lead-in templates give the variety guard headroom.
function favorsCandidates(top: Signal | null, antarLord: string): string[] {
  const verb = g(antarLord).verb;
  let phrase: string;
  if (top?.kind === 'station') phrase = top.direction === 'direct' ? `getting ${domainOf(top.body!)} moving again` : `revisiting ${domainOf(top.body!)} rather than pushing it`;
  else if (top?.kind === 'ingress') phrase = `settling into ${HOUSE_SHORT[top.house ?? 1]} and building there`;
  else if (top?.kind === 'aspect') phrase = 'trusting your read on people and timing';
  else if (top?.kind === 'dashaMaha' || top?.kind === 'dashaAntar') phrase = lower(ANTAR_THEME[top.lord!]?.rewards?.[0] ?? g(top.lord!).theme);
  else phrase = lower(ANTAR_THEME[antarLord]?.rewards?.[0] ?? g(antarLord).theme);
  return [
    `It favours ${phrase}, a good time to ${verb}.`,
    `This is a month for ${phrase}.`,
    `Good energy here for ${phrase}.`,
    `Lean into ${phrase}; there's room to ${verb}.`,
    `The month rewards ${phrase}.`,
  ];
}

// ---- main ---------------------------------------------------------------------
export function computeYearAhead(chart: BirthChart, from: Date = new Date()): YearMonth[] {
  const startMonth = new Date(from.getFullYear(), from.getMonth(), 1);
  // Per-user seed so phrase rotation differs between charts (deterministic, no uid needed).
  const userSeed = `${chart.ascendant.signIndex}:${chart.moonSign}:${Math.round(chart.planets[0]?.longitude ?? 0)}`;

  // Boundary tables at the 1st of months 0..12 (so an event in month i is start[i] vs
  // start[i+1]); mid tables at the 15th for house/aspect context.
  const boundary: PlanetTransit[][] = [];
  for (let i = 0; i <= 12; i++) boundary.push(computeAllTransits(chart, new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1, 12)));
  const midTables: PlanetTransit[][] = [];
  for (let i = 0; i < 12; i++) midTables.push(computeAllTransits(chart, new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 15, 12)));

  // Pass 1 — per-month facts, signals, and strength (needed before score-trend leads).
  type Row = {
    y: number; m: number; key: string; label: string; monthWord: string; prevWord: string;
    mahaLord: string; antarLord: string; dasha: DashaEvent | null;
    signals: Signal[]; aspect: Signal | null; flags: Flags; strength: number;
  };
  const rows: Row[] = [];
  for (let i = 0; i < 12; i++) {
    const y = startMonth.getFullYear(); const m0 = startMonth.getMonth();
    const monthStart = new Date(y, m0 + i, 1);
    const monthEnd = new Date(y, m0 + i + 1, 1);
    const mid = new Date(y, m0 + i, 15, 12);
    const label = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthWord = label.split(' ')[0];
    const prevWord = new Date(y, m0 + i - 1, 1).toLocaleDateString('en-US', { month: 'long' });
    const key = `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`;

    const { mahaLord, antarLord } = resolveDasha(chart, mid);
    const dasha = dashaTransition(chart, monthStart, monthEnd);
    const events = detectEvents(monthStart.getFullYear(), monthStart.getMonth(), monthWord, boundary[i], boundary[i + 1]);

    // Aspect to the natal Moon or a slow graha crossing the ascendant (no crisp date).
    let aspect: Signal | null = null;
    try {
      const f = computeTransitFactor(chart, mid, 'general');
      if (f.natalPlanet === 'Moon' && f.aspectName) aspect = { kind: 'aspect', body: f.transiting, aspect: f.aspectName, natal: 'Moon', salience: 68 };
      else if (f.house === 1 && SLOW.includes(f.transiting)) aspect = { kind: 'aspect', body: f.transiting, natal: 'Ascendant', salience: 64 };
    } catch { /* ignore */ }

    const signals: Signal[] = [...events];
    if (aspect) signals.push(aspect);
    if (dasha) signals.push({ kind: dasha.kind, lord: dasha.lord, salience: dasha.kind === 'dashaMaha' ? 100 : 78 } as Signal);

    // Flags (strength + windows) from the mid-month table.
    const mt = midTables[i];
    const H = (n: string) => mt.find((p) => p.name === n)?.house;
    const isRetro = (n: string) => !!mt.find((p) => p.name === n)?.retrograde;
    const jup = H('Jupiter'); const sat = H('Saturn'); const sun = H('Sun');
    const flags: Flags = {
      jupiter: jup === 1 || [5, 9, 10, 11].includes(jup ?? 0),
      saturn: sat === 1 || sat === 10,
      career: [jup, sat, sun].includes(10),
      retro: ['Mercury', 'Venus', 'Mars'].some(isRetro),
      moon: aspect?.natal === 'Moon',
    };

    let adj = 0;
    if (flags.jupiter) adj += 8;
    if (flags.career) adj += 5;
    if (flags.retro) adj -= 6;
    if (flags.saturn) adj -= 3;
    if (flags.moon) adj += 3;
    const base = g(antarLord).strength * 0.6 + g(mahaLord).strength * 0.4;
    const strength = clampRound(base + adj + jitter(key + antarLord, 4));

    rows.push({ y, m: monthStart.getMonth(), key, label, monthWord, prevWord, mahaLord, antarLord, dasha, signals, aspect, flags, strength });
  }

  // Pass 2 — compose, with ONE global variety guard so no two months share any identical
  // sentence (requirement 4), across every slot: lead, dasha, favours, meanwhile, directive.
  const used = new Set<string>();
  const out: YearMonth[] = [];

  for (let i = 0; i < 12; i++) {
    const r = rows[i];
    const ctx: Ctx = { M: r.monthWord, prevM: r.prevWord, antarLord: r.antarLord, mahaLord: r.mahaLord };
    const ranked = r.signals.slice().sort((a, b) => b.salience - a.salience);
    const top = ranked[0] ?? null;
    const delta = i > 0 ? r.strength - rows[i - 1].strength : 0;

    // (a) LEAD — the distinctive factor. Falls back to score trend, then texture; never the
    // bare dasha line. Month name in every fallback keeps them unique by construction.
    let leadPool: string[];
    if (top) leadPool = leadCandidates(top, ctx, userSeed + r.key + 'lead');
    else if (Math.abs(delta) >= 6) leadPool = [scoreLead(r.monthWord, r.prevWord, delta)];
    else leadPool = [textureLead(r.monthWord, r.strength)];
    const lead = chooseUnique(userSeed + r.key + 'lead', leadPool, used);

    // (b) dasha context — rotated pool.
    const chapter = (MAHA_MEANING[r.mahaLord]?.chapter ?? 'current chapter').toLowerCase();
    const dashaCtx = chooseUnique(userSeed + r.key + 'dasha', dashaContextCandidates(chapter, r.antarLord, g(r.antarLord).theme), used);

    // (c) favours + optional (e) meanwhile clause (dropped rather than duplicated).
    const favors = chooseUnique(userSeed + r.key + 'fav', favorsCandidates(top, r.antarLord), used);
    const meanwhile = ranked[1] ? chooseUnique(userSeed + r.key + 'mw', meanwhileCandidates(ranked[1]), used, true) : '';

    // (d) directive — rotated pool.
    const directive = chooseUnique(userSeed + r.key + 'dir', DIRECTIVES, used);

    const theme = [lead, dashaCtx, favors, meanwhile, directive].filter(Boolean).join(' ');

    // Key dates — dated signals (dasha + stations + ingresses), most significant first.
    const dated = ranked.filter((s) => s.kind === 'dashaMaha' || s.kind === 'dashaAntar' || s.kind === 'station' || s.kind === 'ingress');
    const keyDates: KeyDate[] = dated.slice(0, 4).map((s) => ({
      date: s.date ?? `Early ${r.monthWord}`,
      text: keyDateText(s),
    }));

    // Life areas — omit a domain gracefully when nothing applies.
    const lifeAreas: LifeAreas = {};
    const career = lifeAreaLine('career', r.signals, r.mahaLord, r.antarLord);
    const love = lifeAreaLine('love', r.signals, r.mahaLord, r.antarLord);
    const money = lifeAreaLine('money', r.signals, r.mahaLord, r.antarLord);
    if (career) lifeAreas.career = career;
    if (love) lifeAreas.love = love;
    if (money) lifeAreas.money = money;

    // Major transits list — short forms of the dated events + the aspect.
    const transits: string[] = [];
    for (const s of dated) {
      if (s.kind === 'station') transits.push(`${s.body} stations ${s.direction} (${s.date})`);
      else if (s.kind === 'ingress') transits.push(`${s.body} enters ${s.toSign} (${s.date})`);
      else if (s.kind === 'dashaMaha') transits.push(`${s.lord} Mahādasha begins`);
      else if (s.kind === 'dashaAntar') transits.push(`${s.lord} sub-period begins`);
    }
    if (r.aspect) transits.push(r.aspect.natal === 'Moon' ? `${r.aspect.body} ${(r.aspect.aspect || 'aspect').toLowerCase()}s your natal Moon` : `${r.aspect.body} on your ascendant`);
    const transitsOut = Array.from(new Set(transits)).slice(0, 3);

    // Timing windows — aim 2–3; add a hold-off chip on retrograde, and a domain window if thin.
    const win = new Set<string>([g(r.antarLord).window]);
    if (r.flags.retro) win.add('Hold off on signing');
    if (r.flags.jupiter) win.add('Favorable for growth');
    if (r.flags.saturn) win.add('Patience over speed');
    if (r.flags.career) win.add('Career momentum');
    if (r.flags.moon) win.add('Tend your inner world');
    if (top?.kind === 'ingress' || top?.kind === 'station') win.add('Fresh-start window');
    if (win.size < 2) {
      if (lifeAreas.career) win.add('Good for work moves');
      else if (lifeAreas.love) win.add('Warm for connection');
      else win.add('Steady for money matters');
    }
    const windows = Array.from(win).slice(0, 3);

    out.push({
      key: r.key, label: r.label, monthWord: r.monthWord,
      mahaLord: r.mahaLord, antarLord: r.antarLord, dashaLabel: `${r.mahaLord}–${r.antarLord}`,
      transition: r.dasha?.text ?? null,
      differentiator: lead,
      transits: transitsOut, keyDates, lifeAreas, theme, windows, strength: r.strength,
    });
  }
  return out;
}

type Flags = { retro: boolean; jupiter: boolean; saturn: boolean; career: boolean; moon: boolean };
