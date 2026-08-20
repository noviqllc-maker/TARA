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

export type ForecastMark = { date: string; text: string };
export type ForecastWindow = { dateRange: string; reason: string };

// One day in the week arc: a single actionable headline + the strength that drives the arc bar.
// No per-day bestFor / mechanics / "Why this?" — the value now lives in the week narrative.
export type WeekDay = {
  key: string;         // 'YYYY-M-D'
  dayName: string;     // "Thursday"
  rel: string;         // "Today" | "Tomorrow" | weekday
  dateLabel: string;   // "Aug 22"
  headline: string;    // one plain-English, actionable line
  strength: number;    // 0–100, drives the energy-arc bar
};

// The week as a genuine arc: a story, its energy shape, seven day-lines, best windows, one
// caution, and a takeaway (not seven stitched-together daily forecasts).
export type WeeklyGuidance = {
  weekRange: string;            // "Aug 20 – Aug 26"
  weekStory: string;           // 2–3 sentence arc narrative
  energyShape: string;         // "Building through the week, peaks Thursday, quietest Sunday"
  days: WeekDay[];
  bestWindows: ForecastWindow[];
  watchOut: string;            // one caution for the week
  oneThingToRemember: string;  // takeaway
};

// The month, scannable: a story, key dated events, strongest windows, cautions, a takeaway.
export type MonthlyGuidance = {
  monthRange: string;          // "Aug 20 – Sep 19"
  monthStory: string;          // 2–4 sentence narrative
  strengthLabel: string;       // qualitative tenor ("Broadly favourable" / "Mixed" / "Quieter")
  keyDates: ForecastMark[];    // real dated events
  strongestWindows: ForecastMark[];
  watchOut: ForecastMark[];
  oneThingToRemember: string;
};

export type Forecast = { week: WeeklyGuidance; month: MonthlyGuidance };

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
  Moon:    { day: 'moves with your moods, gentler and more inward', strength: 62 },
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
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

// Qualitative energy tier from the day-strength — we show this, never a raw "/100".
function scoreLabel(strength: number): string {
  if (strength >= 72) return 'High energy';
  if (strength >= 58) return 'Steady energy';
  if (strength >= 46) return 'Lower energy';
  return 'Slow energy';
}
// Qualitative tenor word for the month header.
function monthTenorLabel(strength: number): string {
  if (strength >= 68) return 'Broadly favourable';
  if (strength >= 54) return 'Mixed, with real openings';
  return 'Quieter, a lighter touch';
}
// What the day supports, drawn from the Moon-house lean (already plain English). First three.
function bestForOf(moonHouse: number | null): string[] {
  const lean = houseTheme(moonHouse).lean; // e.g. "Conversations, short trips, courage"
  return lean.split(',').map((s) => cap(s.trim())).filter(Boolean).slice(0, 3);
}
// Actionable, plain-English headlines by energy tier (no astrology vocabulary). Variety-guarded.
const HEADLINES: Record<string, string[]> = {
  high: ['A strong day to make your move.', 'Momentum is with you today.', 'Good day to start and to ask.', 'Push on what matters most.'],
  steady: ['Steady progress beats big swings today.', 'Build on what is already working.', 'A workable day for real progress.', 'Keep it moving, one step at a time.'],
  lower: ['Ease the pace and keep it simple.', 'Tend rather than push today.', 'A lighter day; protect your energy.', 'Do less, but do it well.'],
  slow: ['A day for rest and inner work.', 'Go quiet and let things settle.', 'Rest counts as progress today.', 'Save the big moves for later.'],
};
// A per-day focus nudge that changes day to day, so two same-Moon-house days still read
// differently (the deterministic anti-repetition lever for consecutive days). Plain, actionable.
const NUDGES = [
  'Start with the thing you have been putting off.',
  'Let one clear priority lead the day.',
  'Leave a little room instead of packing the hours.',
  'Follow the task that has the most energy behind it.',
  'Keep your promises small and your focus real.',
  'Move at a pace you could keep tomorrow.',
  'Say the honest thing sooner rather than later.',
  'Finish one thing before you start the next.',
];
const tierOf = (s: number) => (s >= 72 ? 'high' : s >= 58 ? 'steady' : s >= 46 ? 'lower' : 'slow');
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

// (The per-day rich reading/mechanics builder was removed with the arc rewrite; the week now
// surfaces one headline per day via HEADLINES + the narrative, not a card per day.)

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
    case 'dashaMaha': return `${e.lord} Mahādasha begins: a new life chapter opens.`;
    case 'dashaAntar': return `${e.lord} sub-period begins: the season's texture shifts.`;
    case 'station': return e.dir === 'direct'
      ? `${e.body} turns direct: a green light returns for ${benefit(e.body)}.`
      : `${e.body} turns retrograde: revisit ${benefit(e.body)} before committing.`;
    case 'ingress': return `${e.body} enters ${e.toSign}: fresh emphasis on your ${ord(e.house)} house of ${HOUSE_OF[e.house ?? 1] ?? 'daily life'}.`;
  }
}

// ---- month theme (deliberately NOT Year Ahead's vocabulary) --------------------
function monthTenor(strength: number): string {
  if (strength >= 68) return 'The next four weeks run broadly in your favour. The sky is mostly on your side.';
  if (strength >= 54) return 'The next four weeks are mixed in the best way: real openings alongside a few spots to move carefully.';
  return 'The next four weeks ask for a lighter touch. The pace is slower, better suited to tending than launching.';
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
  const backdrop = `Your ${periodLabel} period sets the longer background note beneath it all. You're still inside your ${chapter}.`;
  const closer = MONTH_CLOSERS[hashStr(seed + 'close') % MONTH_CLOSERS.length];
  return [tenor, turning, backdrop, closer].filter(Boolean).join(' ');
}

// ---- week arc (narrative from the 7 day-strengths) -----------------------------
const relPhrase = (rel: string) => (rel === 'Today' ? 'today' : rel === 'Tomorrow' ? 'tomorrow' : `on ${rel}`);

// A short label for the week's energy shape, from the 7 strengths.
function describeEnergyArc(strengths: number[], dates: Date[]): string {
  const peakIdx = strengths.indexOf(Math.max(...strengths));
  const lowIdx = strengths.indexOf(Math.min(...strengths));
  const first = (strengths[0] + strengths[1] + strengths[2]) / 3;
  const last = (strengths[4] + strengths[5] + strengths[6]) / 3;
  const shape = last - first > 6 ? 'Building through the week' : first - last > 6 ? 'Strongest early, then easing' : 'A fairly even week';
  if (lowIdx === peakIdx) return `${shape}, steady throughout`;
  return `${shape}, peaks ${WEEKDAY[dates[peakIdx].getDay()]}, quietest ${WEEKDAY[dates[lowIdx].getDay()]}`;
}

// A 2–3 sentence week narrative: the arc, where to push vs. rest, and the dasha backdrop.
function composeWeekStory(strengths: number[], rels: string[], mahaLord: string): string {
  const peakIdx = strengths.indexOf(Math.max(...strengths));
  const lowIdx = strengths.indexOf(Math.min(...strengths));
  const first = (strengths[0] + strengths[1] + strengths[2]) / 3;
  const last = (strengths[4] + strengths[5] + strengths[6]) / 3;
  const arc = last - first > 6 ? 'builds as it goes on' : first - last > 6 ? 'is strongest in the first half' : 'holds a steady, even pace';
  const s1 = `This week ${arc}.`;
  const s2 = peakIdx === lowIdx
    ? 'Energy stays level, so choose your moments by what matters rather than by the day.'
    : `The strongest push comes ${relPhrase(rels[peakIdx])}, so aim your important moves there; keep ${relPhrase(rels[lowIdx])} for rest and repair.`;
  const chapter = lower(MAHA_MEANING[mahaLord]?.chapter ?? 'current chapter');
  const s3 = `Underneath it, your ${chapter} sets the longer rhythm.`;
  return [s1, s2, s3].join(' ');
}

// ---- main ----------------------------------------------------------------------
export function computeForecast(chart: BirthChart, from: Date = new Date()): Forecast {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  const userSeed = `${chart.ascendant.signIndex}:${chart.moonSign}`;

  // ---- WEEK — the next 7 days as an arc -----------------------------------------
  const usedWeek = new Set<string>();
  const weekDates: Date[] = [];
  const weekRels: string[] = [];
  const weekStrengths: number[] = [];
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const f = computeTransitFactor(chart, d, 'general');
    const strength = dayStrength(chart, d, f.transiting, f.house ?? null);
    const rel = relLabel(i, d);
    weekDates.push(d); weekRels.push(rel); weekStrengths.push(strength);
    const headline = chooseUnique(`${userSeed}:${i}:h`, HEADLINES[tierOf(strength)], usedWeek);
    days.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
      dayName: WEEKDAY[d.getDay()], rel, dateLabel: fmtShort(d), headline, strength,
    });
  }
  const wFirst = (weekStrengths[0] + weekStrengths[1] + weekStrengths[2]) / 3;
  const wLast = (weekStrengths[4] + weekStrengths[5] + weekStrengths[6]) / 3;

  // Week windows / one caution, from the 7-day strengths + any events inside the week.
  const weekEvents = detectWindowEvents(chart, today, 6);
  const twoDay = (pickMax: boolean) => {
    let idx = 0, bv = pickMax ? -1 : 201;
    for (let i = 0; i + 1 < 7; i++) { const m = weekStrengths[i] + weekStrengths[i + 1]; if (pickMax ? m > bv : m < bv) { bv = m; idx = i; } }
    return idx;
  };
  const bwi = twoDay(true), wwi = twoDay(false);
  const bestWindows: ForecastWindow[] = [
    { dateRange: `${fmtShort(weekDates[bwi])} – ${fmtShort(weekDates[bwi + 1])}`, reason: 'Your strongest stretch this week: good for first moves, asks, and starting things.' },
  ];
  for (const e of weekEvents.filter((x) => x.favourable && (x.kind === 'station' || x.kind === 'ingress')).slice(0, 1)) {
    bestWindows.push({
      dateRange: `From ${e.date}`,
      reason: e.kind === 'station' ? `${e.body} turns direct, reopening momentum for ${benefit(e.body)}.` : `${e.body} enters ${e.toSign}, warming up ${HOUSE_OF[e.house ?? 1] ?? 'new ground'}.`,
    });
  }
  const weekRetroStation = weekEvents.find((x) => x.kind === 'station' && x.dir === 'retrograde');
  const nowRetroWk = computeAllTransits(chart, today).filter((p) => p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu');
  const weakRange = `${fmtShort(weekDates[wwi])} – ${fmtShort(weekDates[wwi + 1])}`;
  const watchOutWeek = weekRetroStation
    ? `Around ${weekRetroStation.date}, ${weekRetroStation.body} turns retrograde, so hold big ${benefit(weekRetroStation.body)} decisions lightly.`
    : nowRetroWk[0]
      ? `${nowRetroWk[0].name} is retrograde this week, so favour reviewing and refining over launching.`
      : `The quieter stretch is ${weakRange}; keep it for rest and maintenance rather than big pushes.`;
  const weekTakeaway = wLast - wFirst > 6 ? 'Your week builds, so save the big move for the peak, not Monday.'
    : wFirst - wLast > 6 ? 'The early days are your launchpad, so front-load what matters.'
    : 'A steady week: consistency will carry you further than any single push.';
  const mahaLordWeek = chart.dasha.find((d) => d.phase === 'present')?.planet ?? chart.dasha[0]?.planet ?? 'Jupiter';

  const week: WeeklyGuidance = {
    weekRange: `${fmtShort(today)} – ${fmtShort(addDays(today, 6))}`,
    weekStory: composeWeekStory(weekStrengths, weekRels, mahaLordWeek),
    energyShape: describeEnergyArc(weekStrengths, weekDates),
    days,
    bestWindows,
    watchOut: watchOutWeek,
    oneThingToRemember: weekTakeaway,
  };

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
  opportunities.push({ date: stretchLabel(strong), text: 'Your strongest stretch: good for initiative, asks and first moves.' });
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
    watch.push({ date: `From ${e.date}`, text: `${e.body} retrograde: hold big commitments on ${benefit(e.body)} lightly.` });
  }
  const startRetro = computeAllTransits(chart, today).filter((p) => p.retrograde && p.name !== 'Rahu' && p.name !== 'Ketu' && !events.some((e) => e.kind === 'station' && e.body === p.name));
  if (startRetro[0]) watch.push({ date: 'Now', text: `${startRetro[0].name} is retrograde: a stretch to review rather than launch.` });
  if (watch.length < 2) watch.push({ date: stretchLabel(weak), text: 'A quieter, lower-energy stretch: schedule rest and maintenance here.' });

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

  const monthTakeaway = avg >= 68 ? 'The month is on your side: make your biggest asks in the strong windows above.'
    : avg >= 54 ? 'Press on the strong windows and go gently on the quiet ones; timing is everything this month.'
    : 'A tending month more than a launching one: protect your energy and pick your moments.';

  const month: MonthlyGuidance = {
    monthRange: `${fmtShort(today)} – ${fmtShort(addDays(today, DAYS))}`,
    monthStory: composeMonthTheme(avg, top, mahaLord, antarLord, userSeed),
    strengthLabel: monthTenorLabel(avg),
    keyDates,
    strongestWindows: opportunities.slice(0, 3),
    watchOut: watch.slice(0, 3),
    oneThingToRemember: monthTakeaway,
  };

  return { week, month };
}
