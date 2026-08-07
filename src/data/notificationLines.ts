// src/data/notificationLines.ts
// Daily-notification copy + selection. pickNotification() returns a { title, body } pair:
//   • Titles rotate by content CATEGORY (general / planetary / career / love / money /
//     fallback). Planetary titles are used ONLY when the engine confirms a real event.
//   • Bodies come from category-matched pools (all approved copy).
//   • Selection is seeded by (user id + date), deterministic per user per day, and the
//     caller threads prevTitle so no title repeats two days running.
// Honesty guardrails (do NOT add): fake intimacy ("someone may cross your path"), fake
// urgency/expiry, or fake discovery ("I noticed something") — except "Something shifted
// overnight." which is permitted ONLY alongside a real, engine-confirmed chart event.

export type NotificationContext = {
  date: Date;
  // event-triggered — set true ONLY when the astro engine confirms it for this user
  dashaChange?: boolean;
  transitOnMoon?: boolean;      // a slow graha aspecting the natal Moon
  moonNakshatraChanged?: boolean;
  mercuryRetro?: boolean;       // Mercury retrograde today
  solarReturnWeek?: boolean;    // (kept for context; no dedicated copy)
  // chart-personalized
  strongestGraha?: string;      // day's strongest transiting graha
};

export type NotifPick = { title: string; body: string };

import { pickRelationalNudge, RelationalCtx } from '@/data/relational';

const TITLE = {
  general: "Today's Cosmic Briefing",
  fallback: 'Your Daily Guidance',
  planetary: 'Planetary Shift',
  career: 'Career Timing',
  love: 'Love Forecast',
  money: 'Money Insight',
  relational: 'A Gentle Nudge',
} as const;

export const NOTIFICATION_LINES = {
  // General / curiosity — the everyday, always-safe pool.
  general: [
    'Before today gets busy, there’s something you should know.',
    'One minute with Tara before your day begins.',
    'Your energy today looks different than yesterday.',
    'Today’s guidance was written just for you.',
    'Your stars are pointing toward an opportunity.',
    'Your personal guidance is ready.',
    'Your chart is asking for your attention.',
    'The day has a shape. See it before it starts.',
    'A clear read on your day is waiting.',
    'Start the day with the sky on your side.',
  ],
  // Planetary — ONLY when the engine confirms the event is true that day.
  planetary: {
    nakshatra: [
      'The Moon has entered a new nakshatra.',
      'The sky changed overnight. So did your chart.',
    ],
    mercuryRetro: 'Mercury is slowing things down for a reason.',
    jupiter: 'Jupiter is opening a new door.',
    dasha: 'Your dasha is entering a powerful phase.',
    saturn: 'Saturn is teaching you something today.',
    shifted: 'Something shifted overnight.', // permitted only alongside a real event
  },
  careerMoney: [
    'Your strongest work window starts soon.',
    'Today favors bold decisions. See why.',
    'There’s one decision worth waiting on.',
    'A good day to move one thing forward at work.',
    'Money matters read clearer today. Take a look.',
  ],
  love: [
    'Love energy is shifting today.',
    'Venus has a message for you.',
    'Your relationships are under a new influence today.',
  ],
  wellness: [
    'Your mind deserves a moment today.',
    'Today’s guidance may bring clarity.',
    'Trust yourself a little more today.',
  ],
  positive: [
    'The universe is working quietly in your favor.',
    'Today has more potential than you realize.',
    'Trust the path you’re on today.',
  ],
} as const;

// The "general" title (Today's Cosmic Briefing / Your Daily Guidance) draws from a safe,
// non-committal blend so it never over-promises.
const GENERAL_POOL: string[] = [
  ...NOTIFICATION_LINES.general,
  ...NOTIFICATION_LINES.wellness,
  ...NOTIFICATION_LINES.positive,
];

// ---- seeded, deterministic selection ------------------------------------------
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const pickSeeded = (arr: readonly string[], seed: string): string => arr[hashStr(seed) % arr.length];

// Like pickSeeded, but skips any body in `avoid` (the recent-bodies no-repeat window). Starts
// at the seeded index and walks the pool; if every entry is in `avoid` (pool smaller than the
// window), it falls back to the seeded pick rather than returning nothing.
function pickAvoiding(pool: readonly string[], seed: string, avoid?: Set<string>): string {
  const n = pool.length;
  if (!n) return '';
  const start = hashStr(seed) % n;
  if (avoid && avoid.size) {
    for (let k = 0; k < n; k++) { const c = pool[(start + k) % n]; if (!avoid.has(c)) return c; }
  }
  return pool[start];
}

function grahaTopic(g?: string): 'career' | 'love' | 'money' | undefined {
  switch (g) {
    case 'Venus': return 'love';
    case 'Jupiter': return 'money';
    case 'Saturn': case 'Sun': case 'Mars': case 'Mercury': return 'career';
    default: return undefined;
  }
}

// The planetary bodies that are actually TRUE today (empty → not a planetary day). `seed`
// throttles the ~daily moon-nakshatra change so "Planetary Shift" stays a NOTABLE headline
// rather than firing every morning; the rarer triggers below are always surfaced when true.
function planetaryEligible(ctx: NotificationContext, seed: string): string[] {
  const P = NOTIFICATION_LINES.planetary;
  const out: string[] = [];
  // The Moon changes nakshatra almost daily, so on its own it isn't a "shift" worth
  // headlining every day — surface it only occasionally (seeded ~1 in 3) so other categories
  // (general / career / love / relational) get their turn and the title stays meaningful.
  if (ctx.moonNakshatraChanged && hashStr(seed + ':nak') % 3 === 0) out.push(...P.nakshatra);
  if (ctx.dashaChange) out.push(P.dasha);
  if (ctx.mercuryRetro) out.push(P.mercuryRetro);
  if (ctx.transitOnMoon && ctx.strongestGraha === 'Jupiter') out.push(P.jupiter);
  if (ctx.transitOnMoon && ctx.strongestGraha === 'Saturn') out.push(P.saturn);
  if (out.length) out.push(P.shifted); // only ever paired with a real, engine-confirmed event
  return out;
}

// Choose the day's { title, body }. `seed` = `${userId}:${YYYY-MM-DD}`. `prevTitle` is
// the previous day's title so we never repeat a title two days running.
// Build a RelationalCtx from the notification context (weekday + confirmed transits).
function relCtx(ctx: NotificationContext): RelationalCtx {
  return {
    date: ctx.date,
    mercuryRetro: ctx.mercuryRetro,
    venusStrong: ctx.strongestGraha === 'Venus',
    saturnOnMoon: ctx.transitOnMoon && ctx.strongestGraha === 'Saturn',
  };
}

export function pickNotification(ctx: NotificationContext, seed: string, prevTitle?: string, avoid?: Set<string>): NotifPick {
  // The planetary gate is consulted HERE, at scheduling time, from engine-confirmed context
  // (see buildNotificationContext). Shift/planetary bodies exist only when this is non-empty.
  const planetary = planetaryEligible(ctx, seed);
  let category: 'planetary' | 'career' | 'love' | 'money' | 'general' | 'relational';
  if (planetary.length) {
    category = 'planetary';
  } else if (hashStr(seed + ':rel') % 4 === 0) {
    // ~1 in 4 non-event days surfaces a relational / digital-wellness nudge (always gated).
    category = 'relational';
  } else {
    const topic = grahaTopic(ctx.strongestGraha);
    // ~1 in 3 of the rest gets topic flavor; the remainder stay general.
    category = topic && hashStr(seed + ':cat') % 3 === 0 ? topic : 'general';
  }

  // Title and body are chosen together from the SAME category so they always cohere. The
  // body is drawn from the category's own pool; a shift-language body can only appear under
  // the planetary category (→ 'Planetary Shift' title).
  let title: string;
  let body: string;
  switch (category) {
    case 'planetary':  title = TITLE.planetary;  body = pickAvoiding(planetary, seed + ':b', avoid); break;
    case 'relational': title = TITLE.relational; body = pickRelationalNudge(relCtx(ctx), seed + ':relb'); break;
    case 'career':     title = TITLE.career;     body = pickAvoiding(NOTIFICATION_LINES.careerMoney, seed + ':b', avoid); break;
    case 'money':      title = TITLE.money;      body = pickAvoiding(NOTIFICATION_LINES.careerMoney, seed + ':b', avoid); break;
    case 'love':       title = TITLE.love;       body = pickAvoiding(NOTIFICATION_LINES.love, seed + ':b', avoid); break;
    default:           title = hashStr(seed + ':t') % 2 === 0 ? TITLE.general : TITLE.fallback;
                       body = pickAvoiding(GENERAL_POOL, seed + ':b', avoid);
  }

  // No title two days running — but ONLY swap between the two interchangeable generic titles
  // (both back the same GENERAL_POOL body). Category-specific titles stay locked to their
  // body's category, so we never mislabel a planetary/career/love body under a generic title.
  if (category === 'general' && prevTitle && title === prevTitle) {
    title = title === TITLE.general ? TITLE.fallback : TITLE.general;
  }
  return { title, body };
}

// ---- midday & evening slots ----------------------------------------------------
// Distinct pools per slot → a line can never repeat across slots in one day (the morning
// pools above and these two are disjoint).
const MIDDAY_STATIC = [
  'Your strongest window opens soon.',
  'A good hour for bold moves is coming up.',
  'The day’s energy is turning. Mind your timing.',
  'Your power hours are near. Make them count.',
  'Midday check: the sky favors a focused push now.',
  'The timing sharpens this afternoon. Use it well.',
  'A focused push now travels further than one later.',
  'Momentum builds through the afternoon. Ride it.',
];
const EVENING_LINES = [
  'A minute to reflect: how did today’s energy land?',
  'How did today’s guidance play out? Take a moment.',
  'Before the day closes, check in with yourself.',
  'A quiet moment to journal how today felt.',
  'How did today land? Tara’s listening.',
];

// Midday = timing/energy focus. When the day's power-hour window and lord are known, two
// specific, chart-derived lines lead the pool (e.g. "Your strongest window opens at 1 PM
// today.") so the slot beats the generic. `avoid` enforces the cross-day no-repeat.
export type MiddayCtx = { powerStart?: string; dayLord?: string };
export function pickMidday(seed: string, ctx?: MiddayCtx, avoid?: Set<string>): NotifPick {
  const pool = ctx?.powerStart
    ? [
        `Your strongest window opens at ${ctx.powerStart} today.`,
        `${ctx.dayLord ?? 'The day'}’s hour favors a focused push near ${ctx.powerStart}.`,
        ...MIDDAY_STATIC,
      ]
    : MIDDAY_STATIC;
  return { title: 'Timing Window', body: pickAvoiding(pool, seed, avoid) };
}

// Evening = reflection / journal-prompt flavored. Streak-aware when the caller passes local
// practice state. VOICE RULES (hard): never loss-framed — no "don't lose/break", no "streak
// ends", no countdown or guilt. The number is the hook; the invitation is the verb; only
// rhythm/continuation language. Streak digits use ✦ (not the flame), per the unification.
export type EveningCtx = { streak: number; doneToday: boolean };
export function pickEvening(seed: string, ctx?: EveningCtx, avoid?: Set<string>): NotifPick {
  // Already closed today → a gentle acknowledgment, no ask. (Fixed line, exempt from avoid.)
  if (ctx?.doneToday) {
    return { title: 'Evening Reflection ✦', body: 'Day closed ✦. See tomorrow’s line when you’re ready.' };
  }
  const n = ctx?.streak ?? 0;
  if (n >= 2) {
    const pool = [
      `Your ${n}-day streak is ready for tonight’s close.`,
      `${n} evenings closed in a row. Tonight makes ${n + 1}.`,
      `A quiet close keeps your ${n}-day rhythm alive.`,
    ];
    return { title: `Evening Reflection ✦ ${n}-day streak`, body: pickAvoiding(pool, seed, avoid) };
  }
  // Streak 0 or 1 → the existing generic evening copy, unchanged.
  return { title: 'Evening Reflection', body: pickAvoiding(EVENING_LINES, seed, avoid) };
}
