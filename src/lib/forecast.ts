// src/lib/forecast.ts
// "Weekly & Monthly Guidance" — a rolling forecast computed deterministically from the
// existing engine (NO AI). WEEK AHEAD = the next 7 days, each with a day-strength, a short
// headline, an expandable reading, and an Ask-Tara bridge. MONTH AHEAD = the next ~30 days'
// real events (stations / ingresses / dasha shifts, exact days binary-searched), opportunity
// windows, watch periods, and a month theme.
//
// Recompute-per-day: everything is derived from `from` (defaults to today), so opening it on
// any day returns that day's forward view — always current, nothing cached or stale.
//
// Vocabulary note: this file deliberately avoids the Year Ahead theme vocabulary (its
// OPENERS, "It favours…", "carries a steady favourable current", its DIRECTIVES) so the two
// products never read alike. Day/month copy here is its own register.
import { BirthChart, computeAllTransits, computeTransitFactor, transitBodyOn, SIGNS } from '@/lib/vedic';
import { computeTransits, houseTheme } from '@/lib/transits';
import { MAHA_MEANING } from '@/data/dashaMeaning';

export type ForecastDay = {
  key: string;         // 'YYYY-M-D'
  label: string;       // "Thu, Aug 6"
  rel: string;         // "Today" | "Tomorrow" | "Thursday"
  glyph: string;       // dominant graha glyph
  strength: number;    // 0–100
  headline: string;    // collapsed one-liner (the moon-house mood + tone)
  reading: string;     // 2–4 sentence expanded reading
  question: string;    // Ask-Tara bridge (prefilled, never auto-sent)
};

export type ForecastMark = { date: string; text: string };

export type MonthAhead = {
  label: string;               // "The Month Ahead · Aug 6 – Sep 5"
  strength: number;            // 0–100 average tenor
  theme: string;               // 2–4 sentence composed theme (distinct from Year Ahead)
  keyDates: ForecastMark[];    // real dated events
  opportunities: ForecastMark[]; // favourable windows
  watch: ForecastMark[];       // periods to move carefully
};

export type Forecast = { week: ForecastDay[]; month: MonthAhead };

const MS_DAY = 86_400_000;
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ord = (n: number | null | undefined) => (n && ORD[n]) || 'current';
const GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿', Jupiter: '♃', Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

// Per-graha day tone + base day-strength. Benefics score higher; the phrasing is day-scale
// (a "today" voice), intentionally different from the month-scale GRAHA table in yearAhead.
const TONE: Record<string, { day: string; strength: number }> = {
  Sun:     { day: 'rewards showing up fully and being seen', strength: 63 },
  Moon:    { day: 'moves with your moods — gentler, more inward', strength: 62 },
  Mars:    { day: 'carries an edge of drive and heat', strength: 58 },
  Mercury: { day: 'favours words, plans and quick exchanges', strength: 67 },
  Jupiter: { day: 'leans generous, open and a little lucky', strength: 78 },
  Venus:   { day: 'softens toward warmth, ease and connection', strength: 75 },
  Saturn:  { day: 'asks for patience, focus and doing things properly', strength: 54 },
  Rahu:    { day: 'has an unconventional, restless pull', strength: 56 },
  Ketu:    { day: 'turns quiet, detached and reflective', strength: 52 },
};
const tone = (g: string) => TONE[g] ?? TONE.Jupiter;

// Short "house of …" phrase (kept separate from yearAhead's private copy).
const HOUSE_OF: Record<number, string> = {
  1: 'self and vitality', 2: 'money and values', 3: 'communication and courage',
  4: 'home and roots', 5: 'creativity and romance', 6: 'work and wellbeing',
  7: 'partnership', 8: 'depth and change', 9: 'meaning and fortune',
  10: 'career and standing', 11: 'gains and community', 12: 'rest and release',
};

// ---- deterministic helpers ----------------------------------------------------
const clampRound = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const jitter = (key: string, amp: number) => ((hashStr(key) % 1000) / 1000 * 2 - 1) * amp;
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Choose the first unused candidate from a seeded offset (variety guard for the 7 day cards).
function chooseUnique(seed: string, candidates: string[], used: Set<string>): string {
  const n = candidates.length;
  if (!n) return '';
  const start = hashStr(seed) % n;
  for (let k = 0; k < n; k++) { const c = candidates[(start + k) % n]; if (!used.has(c)) { used.add(c); return c; } }
  const c = candidates[start]; used.add(c); return c;
}

// ---- per-day strength (shared by the week cards and the month window scan) -----
function dayStrength(chart: BirthChart, date: Date, graha: string, factorHouse: number | null): number {
  let adj = 0;
  const t = computeTransits(date, chart);
  const mh = t.moonHouse ?? 0;
  if ([1, 5, 9, 10, 11].includes(mh)) adj += 6;
  if ([6, 8, 12].includes(mh)) adj -= 6;
  if ([5, 9, 10, 11].includes(factorHouse ?? 0)) adj += 4;
  if ([6, 8, 12].includes(factorHouse ?? 0)) adj -= 4;
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  return clampRound(tone(graha).strength + adj + jitter(key + graha, 4));
}

// ---- week composition ----------------------------------------------------------
function relLabel(offset: number, date: Date): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return WEEKDAY[date.getDay()];
}

function dayReading(chart: BirthChart, date: Date, rel: string, seedBase: string, used: Set<string>): Omit<ForecastDay, 'key' | 'label' | 'rel' | 'strength'> {
  const f = computeTransitFactor(chart, date, 'general');
  const t = computeTransits(date, chart);
  const g = f.transiting;
  const ht = houseTheme(t.moonHouse);
  const mh = t.moonHouse;

  // Collapsed headline: the moon-house mood (changes as the Moon moves) — reliably distinct
  // across the week even when the dominant graha repeats. Variety-guarded anyway.
  const headline = chooseUnique(seedBase + 'h', [
    `${ht.mood}.`,
    `${ht.mood.replace(/ and /, ', ')}.`,
  ], used);

  // Expanded reading: day tone → moon placement → an aspect/action → a lean/ease-off line.
  const lead = `The day ${tone(g).day}.`;
  const moon = `The Moon moves through your ${ord(mh)} house of ${HOUSE_OF[mh ?? 1] ?? 'daily rhythm'}, so ${lower(ht.mood)} colours the hours.`;
  const aspect = f.natalPlanet && f.aspectName
    ? `Transiting ${g} ${lower(f.aspectName)}s your natal ${f.natalPlanet}, sharpening the theme.`
    : `${g} moving through your ${ord(f.house)} house sets the undertone.`;
  const guide = `Lean into ${lower(ht.lean)}; ease off ${lower(ht.avoid)}.`;
  const reading = [lead, moon, aspect, guide].join(' ');

  const relWord = rel === 'Today' ? 'today' : rel === 'Tomorrow' ? 'tomorrow' : rel;
  const question = `What should I focus on ${relWord}, ${fmtShort(date)}?`;

  return { glyph: GLYPH[g] ?? '✦', headline, reading, question };
}

// ---- month window events -------------------------------------------------------
type FEvent = {
  kind: 'station' | 'ingress' | 'dashaMaha' | 'dashaAntar';
  body?: string; dir?: 'direct' | 'retrograde'; toSign?: string; house?: number;
  lord?: string; offset: number; date: string; salience: number; favourable: boolean;
};

const MONTH_IDX: Record<string, number> = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  .reduce((m, s, i) => ((m[s] = i), m), {} as Record<string, number>);
function parseMonYear(s: string): Date | null {
  const m = /([A-Za-z]{3})\w*\s+(\d{4})/.exec(s || '');
  if (!m) return null;
  const mo = MONTH_IDX[m[1] as keyof typeof MONTH_IDX];
  if (mo === undefined) return null;
  return new Date(Number(m[2]), mo, 1);
}

// First day-offset in [0,days] where pred(offset) holds (a single monotonic flip).
function firstOffsetWhere(days: number, pred: (o: number) => boolean): number {
  if (pred(0)) return 0;
  let lo = 0, hi = days;
  while (lo < hi) { const md = (lo + hi) >> 1; if (pred(md)) hi = md; else lo = md + 1; }
  return lo;
}

function detectWindowEvents(chart: BirthChart, from: Date, days: number): FEvent[] {
  const start = computeAllTransits(chart, from);
  const end = computeAllTransits(chart, addDays(from, days));
  const at = (name: string, arr: typeof start) => arr.find((p) => p.name === name);
  const out: FEvent[] = [];

  // Stations (direction flips).
  for (const body of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
    const s = at(body, start); const e = at(body, end);
    if (!s || !e || s.retrograde === e.retrograde) continue;
    const off = firstOffsetWhere(days, (o) => transitBodyOn(body, addDays(from, o)).retrograde === e.retrograde);
    const sal = body === 'Jupiter' || body === 'Saturn' ? 86 : body === 'Mars' ? 74 : body === 'Mercury' ? 72 : 70;
    out.push({ kind: 'station', body, dir: e.retrograde ? 'retrograde' : 'direct', offset: off, date: fmtShort(addDays(from, off)), salience: sal, favourable: !e.retrograde });
  }
  // Ingresses (sign changes; Sun excluded — monthly, never distinctive).
  for (const body of ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Mars', 'Venus', 'Mercury']) {
    const s = at(body, start); const e = at(body, end);
    if (!s || !e || s.sign === e.sign) continue;
    const targetIdx = SIGNS.indexOf(e.sign);
    const off = firstOffsetWhere(days, (o) => transitBodyOn(body, addDays(from, o)).signIndex === targetIdx);
    const sal = body === 'Jupiter' || body === 'Saturn' ? 88 : body === 'Rahu' || body === 'Ketu' ? 80 : body === 'Mars' ? 68 : 56;
    const benefic = ['Jupiter', 'Venus', 'Mercury'].includes(body) && [1, 2, 5, 9, 10, 11].includes(e.house ?? 0);
    out.push({ kind: 'ingress', body, toSign: e.sign, house: e.house, offset: off, date: fmtShort(addDays(from, off)), salience: sal, favourable: benefic });
  }
  // Dasha shifts inside the window.
  const idx = chart.dasha.findIndex((d) => d.phase === 'present');
  const present = idx >= 0 ? chart.dasha[idx] : undefined;
  const next = idx >= 0 ? chart.dasha[idx + 1] : undefined;
  const winStart = from; const winEnd = addDays(from, days);
  if (present) {
    for (const a of present.antardashas ?? []) {
      const s = parseMonYear(a.start);
      if (s && s >= winStart && s < winEnd) {
        const off = Math.max(0, Math.round((s.getTime() - from.getTime()) / MS_DAY));
        out.push({ kind: 'dashaAntar', lord: a.planet, offset: off, date: fmtShort(s), salience: 82, favourable: true });
      }
    }
    if (next) {
      const lastEnd = present.antardashas?.length ? parseMonYear(present.antardashas[present.antardashas.length - 1].end) : null;
      if (lastEnd && lastEnd >= winStart && lastEnd < winEnd) {
        const off = Math.max(0, Math.round((lastEnd.getTime() - from.getTime()) / MS_DAY));
        out.push({ kind: 'dashaMaha', lord: next.planet, offset: off, date: fmtShort(lastEnd), salience: 100, favourable: true });
      }
    }
  }
  return out.sort((a, b) => a.offset - b.offset);
}

const BENEFIT: Record<string, string> = {
  Mercury: 'signing, talking and travel', Venus: 'relationships and money', Mars: 'action and initiative',
  Jupiter: 'growth and opportunity', Saturn: 'commitments and structure', Sun: 'leadership and visibility', Moon: 'home and inner matters',
};
const benefit = (b?: string) => (b && BENEFIT[b]) || 'the areas it touches';

function markText(e: FEvent): string {
  switch (e.kind) {
    case 'dashaMaha': return `${e.lord} Mahādasha begins — a new multi-year chapter opens.`;
    case 'dashaAntar': return `${e.lord} sub-period begins — the season's texture shifts.`;
    case 'station': return e.dir === 'direct'
      ? `${e.body} turns direct — a green light returns for ${benefit(e.body)}.`
      : `${e.body} turns retrograde — revisit ${benefit(e.body)} before committing.`;
    case 'ingress': return `${e.body} enters ${e.toSign} — fresh emphasis on your ${ord(e.house)} house of ${HOUSE_OF[e.house ?? 1] ?? 'daily life'}.`;
  }
}

// ---- month theme (deliberately NOT Year Ahead's vocabulary) --------------------
function monthTenor(strength: number): string {
  if (strength >= 68) return 'The next four weeks run broadly in your favour — the sky is mostly on your side.';
  if (strength >= 54) return 'The next four weeks are mixed in the best way — real openings alongside a few spots to move carefully.';
  return 'The next four weeks ask for a lighter touch — the pace is slower, better suited to tending than launching.';
}
// Closers kept disjoint from yearAhead's DIRECTIVES.
const MONTH_CLOSERS = [
  'Work with the calendar above: press on the green days, go gently on the amber ones.',
  'Let the dated moments anchor your plans, and keep the rest flexible.',
  'Spend your best energy on the windows that open, not the whole month at once.',
  'Plan the big asks around the strong stretches; leave the quiet ones for repair.',
];

function composeMonthTheme(strength: number, top: FEvent | null, mahaLord: string, antarLord: string, seed: string): string {
  const tenor = monthTenor(strength);
  let turning = '';
  if (top) {
    if (top.kind === 'dashaMaha') turning = `The pivot is ${top.date}, when your ${top.lord} Mahādasha opens a new chapter.`;
    else if (top.kind === 'dashaAntar') turning = `The pivot is ${top.date}, as your ${top.lord} sub-period begins and the tone resets.`;
    else if (top.kind === 'station') turning = top.dir === 'direct'
      ? `Around ${top.date}, ${top.body} turning direct frees up ${benefit(top.body)}.`
      : `Around ${top.date}, ${top.body} turning retrograde is your cue to slow down on ${benefit(top.body)}.`;
    else turning = `Around ${top.date}, ${top.body} entering ${top.toSign} shifts the emphasis onto your ${ord(top.house)} house.`;
  }
  const chapter = lower(MAHA_MEANING[mahaLord]?.chapter ?? 'current chapter');
  const periodLabel = mahaLord === antarLord ? `${mahaLord}` : `${mahaLord}–${antarLord}`;
  const backdrop = `Your ${periodLabel} period sets the longer background note beneath it all — you're still inside your ${chapter}.`;
  const closer = MONTH_CLOSERS[hashStr(seed + 'close') % MONTH_CLOSERS.length];
  return [tenor, turning, backdrop, closer].filter(Boolean).join(' ');
}

// ---- main ----------------------------------------------------------------------
export function computeForecast(chart: BirthChart, from: Date = new Date()): Forecast {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  const userSeed = `${chart.ascendant.signIndex}:${chart.moonSign}`;

  // WEEK — the next 7 days (today included), each fully composed.
  const usedWeek = new Set<string>();
  const week: ForecastDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const f = computeTransitFactor(chart, d, 'general');
    const strength = dayStrength(chart, d, f.transiting, f.house ?? null);
    const rel = relLabel(i, d);
    const body = dayReading(chart, d, rel, `${userSeed}:${i}:`, usedWeek);
    week.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      label: fmtDay(d), rel, strength, ...body,
    });
  }

  // MONTH — the next 30 days.
  const DAYS = 30;
  const events = detectWindowEvents(chart, today, DAYS);

  // Daily strengths across the window (for tenor + best/worst stretches).
  const strengths: number[] = [];
  for (let o = 0; o <= DAYS; o++) {
    const d = addDays(today, o);
    const f = computeTransitFactor(chart, d, 'general');
    strengths.push(dayStrength(chart, d, f.transiting, f.house ?? null));
  }
  const avg = clampRound(strengths.reduce((a, b) => a + b, 0) / strengths.length);

  // Best / weakest contiguous 3-day stretch → an opportunity / a watch window.
  function bestStretch(pickMax: boolean): { a: number; b: number } {
    let bi = 0, bv = pickMax ? -1 : 101;
    for (let o = 0; o + 2 <= DAYS; o++) {
      const m = (strengths[o] + strengths[o + 1] + strengths[o + 2]) / 3;
      if (pickMax ? m > bv : m < bv) { bv = m; bi = o; }
    }
    return { a: bi, b: bi + 2 };
  }
  const strong = bestStretch(true);
  const weak = bestStretch(false);
  const stretchLabel = (s: { a: number; b: number }) => `${fmtShort(addDays(today, s.a))} – ${fmtShort(addDays(today, s.b))}`;

  // Key dates — the real dated events, most significant first.
  const keyDates: ForecastMark[] = events
    .slice()
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 4)
    .sort((a, b) => a.offset - b.offset)
    .map((e) => ({ date: e.date, text: markText(e) }));

  // Opportunities — favourable events + the strongest stretch.
  const opportunities: ForecastMark[] = [];
  opportunities.push({ date: stretchLabel(strong), text: 'Your strongest stretch — good for initiative, asks and first moves.' });
  for (const e of events.filter((x) => x.favourable && (x.kind === 'station' || x.kind === 'ingress')).slice(0, 2)) {
    opportunities.push({
      date: `From ${e.date}`,
      text: e.kind === 'station'
        ? `${e.body} direct reopens momentum for ${benefit(e.body)}.`
        : `${e.body} in ${e.toSign} warms up ${HOUSE_OF[e.house ?? 1] ?? 'new ground'}.`,
    });
  }

  // Watch — retrograde turns + any body already retrograde + the weakest stretch.
  const watch: ForecastMark[] = [];
  for (const e of events.filter((x) => x.kind === 'station' && x.dir === 'retrograde').slice(0, 2)) {
    watch.push({ date: `From ${e.date}`, text: `${e.body} retrograde — hold big commitments on ${benefit(e.body)} lightly.` });
  }
  const startRetro = computeAllTransits(chart, today).filter((p) => p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' && !events.some((e) => e.kind === 'station' && e.body === p.name));
  if (startRetro[0]) watch.push({ date: 'Now', text: `${startRetro[0].name} is retrograde — a stretch to review rather than launch.` });
  if (watch.length < 2) watch.push({ date: stretchLabel(weak), text: 'A quieter, lower-energy stretch — schedule rest and maintenance here.' });

  // Dasha lords at mid-window for the theme.
  const mid = addDays(today, 15);
  const present = chart.dasha.find((d) => d.phase === 'present');
  const antar = present?.antardashas?.find((a) => {
    const s = parseMonYear(a.start); const e = parseMonYear(a.end);
    return s && e && mid >= s && mid < e;
  });
  const mahaLord = present?.planet ?? chart.dasha[0]?.planet ?? 'Jupiter';
  const antarLord = antar?.planet ?? mahaLord;
  const top = events.slice().sort((a, b) => b.salience - a.salience)[0] ?? null;

  const month: MonthAhead = {
    label: `${fmtShort(today)} – ${fmtShort(addDays(today, DAYS))}`,
    strength: avg,
    theme: composeMonthTheme(avg, top, mahaLord, antarLord, userSeed),
    keyDates,
    opportunities: opportunities.slice(0, 3),
    watch: watch.slice(0, 3),
  };

  return { week, month };
}
