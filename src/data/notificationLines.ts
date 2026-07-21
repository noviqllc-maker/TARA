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

const TITLE = {
  general: "Today's Cosmic Briefing",
  fallback: 'Your Daily Guidance',
  planetary: 'Planetary Shift',
  career: 'Career Timing',
  love: 'Love Forecast',
  money: 'Money Insight',
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
      'The sky changed overnight — so did your chart.',
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
export function pickNotification(ctx: NotificationContext, seed: string, prevTitle?: string): NotifPick {
  const planetary = planetaryEligible(ctx);
  let category: 'planetary' | 'career' | 'love' | 'money' | 'general';
  if (planetary.length) {
    category = 'planetary';
  } else {
    const topic = grahaTopic(ctx.strongestGraha);
    // ~1 in 3 non-event days gets topic flavor; the rest stay general.
    category = topic && hashStr(seed + ':cat') % 3 === 0 ? topic : 'general';
  }

  let title: string;
  let body: string;
  switch (category) {
    case 'planetary': title = TITLE.planetary; body = pickSeeded(planetary, seed + ':b'); break;
    case 'career':    title = TITLE.career;    body = pickSeeded(NOTIFICATION_LINES.careerMoney, seed + ':b'); break;
    case 'money':     title = TITLE.money;     body = pickSeeded(NOTIFICATION_LINES.careerMoney, seed + ':b'); break;
    case 'love':      title = TITLE.love;      body = pickSeeded(NOTIFICATION_LINES.love, seed + ':b'); break;
    default:          title = hashStr(seed + ':t') % 2 === 0 ? TITLE.general : TITLE.fallback;
                      body = pickSeeded(GENERAL_POOL, seed + ':b');
  }

  // No title two days running.
  if (prevTitle && title === prevTitle) {
    if (category === 'general') {
      title = title === TITLE.general ? TITLE.fallback : TITLE.general;
    } else {
      title = TITLE.fallback !== prevTitle ? TITLE.fallback : TITLE.general;
    }
  }
  return { title, body };
}
