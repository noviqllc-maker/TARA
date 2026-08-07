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

function grahaTopic(g?: string): 'career' | 'love' | 'money' | undefined {
  switch (g) {
    case 'Venus': return 'love';
    case 'Jupiter': return 'money';
    case 'Saturn': case 'Sun': case 'Mars': case 'Mercury': return 'career';
    default: return undefined;
  }
}

// The planetary bodies that are actually TRUE today (empty → not a planetary day).
function planetaryEligible(ctx: NotificationContext): string[] {
  const P = NOTIFICATION_LINES.planetary;
  const out: string[] = [];
  if (ctx.moonNakshatraChanged) out.push(...P.nakshatra);
  if (ctx.dashaChange) out.push(P.dasha);
  if (ctx.mercuryRetro) out.push(P.mercuryRetro);
  if (ctx.transitOnMoon && ctx.strongestGraha === 'Jupiter') out.push(P.jupiter);
  if (ctx.transitOnMoon && ctx.strongestGraha === 'Saturn') out.push(P.saturn);
  if (out.length) out.push(P.shifted); // only ever paired with a real event
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

export function pickNotification(ctx: NotificationContext, seed: string, prevTitle?: string): NotifPick {
  const planetary = planetaryEligible(ctx);
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

  let title: string;
  let body: string;
  switch (category) {
    case 'planetary':  title = TITLE.planetary;  body = pickSeeded(planetary, seed + ':b'); break;
    case 'relational': title = TITLE.relational; body = pickRelationalNudge(relCtx(ctx), seed + ':relb'); break;
    case 'career':     title = TITLE.career;     body = pickSeeded(NOTIFICATION_LINES.careerMoney, seed + ':b'); break;
    case 'money':      title = TITLE.money;      body = pickSeeded(NOTIFICATION_LINES.careerMoney, seed + ':b'); break;
    case 'love':       title = TITLE.love;       body = pickSeeded(NOTIFICATION_LINES.love, seed + ':b'); break;
    default:           title = hashStr(seed + ':t') % 2 === 0 ? TITLE.general : TITLE.fallback;
                       body = pickSeeded(GENERAL_POOL, seed + ':b');
  }

  // No title two days running (skip for relational — swapping its title would mismatch body).
  if (prevTitle && title === prevTitle && category !== 'relational') {
    if (category === 'general') {
      title = title === TITLE.general ? TITLE.fallback : TITLE.general;
    } else {
      title = TITLE.fallback !== prevTitle ? TITLE.fallback : TITLE.general;
    }
  }
  return { title, body };
}

// ---- midday & evening slots ----------------------------------------------------
// Distinct pools per slot → a line can never repeat across slots in one day (the morning
// pools above and these two are disjoint).
const MIDDAY_LINES = [
  'Your strongest window opens soon.',
  'A good hour for bold moves is coming up.',
  'The day’s energy is turning. Mind your timing.',
  'Your power hours are near. Make them count.',
  'Midday check: the sky favors a focused push now.',
];
const EVENING_LINES = [
  'A minute to reflect: how did today’s energy land?',
  'How did today’s guidance play out? Take a moment.',
  'Before the day closes, check in with yourself.',
  'A quiet moment to journal how today felt.',
  'How did today land? Tara’s listening.',
];

// Midday = timing/energy focus. Fixed title, seeded body.
export function pickMidday(seed: string): NotifPick {
  return { title: 'Timing Window', body: pickSeeded(MIDDAY_LINES, seed) };
}

// Evening = reflection / journal-prompt flavored. Streak-aware when the caller passes local
// practice state. VOICE RULES (hard): never loss-framed — no "don't lose/break", no "streak
// ends", no countdown or guilt. The number is the hook; the invitation is the verb; only
// rhythm/continuation language. Streak digits use ✦ (not the flame), per the unification.
export type EveningCtx = { streak: number; doneToday: boolean };
export function pickEvening(seed: string, ctx?: EveningCtx): NotifPick {
  // Already closed today → a gentle acknowledgment, no ask.
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
    return { title: `Evening Reflection ✦ ${n}-day streak`, body: pickSeeded(pool, seed) };
  }
  // Streak 0 or 1 → the existing generic evening copy, unchanged.
  return { title: 'Evening Reflection', body: pickSeeded(EVENING_LINES, seed) };
}
