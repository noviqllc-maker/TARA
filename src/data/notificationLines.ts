// src/data/notificationLines.ts
// Daily-notification copy + selection. getNotificationLine() chooses a body with a
// strict priority: (a) event-triggered (only when the engine confirms the event),
// (b) chart-personalized from current conditions, (c) a static rotation that avoids
// the last 7 used. No fake-intimacy / false-scarcity lines.
import { dayOfYear } from '@/lib/nudges';

export type NotificationContext = {
  date: Date;
  // (a) event-triggered — set true ONLY when the astro engine confirms it for this user
  dashaChange?: boolean;
  transitOnMoon?: boolean;
  solarReturnWeek?: boolean;
  // (b) chart-personalized (current conditions)
  moonNakshatraChanged?: boolean;
  strongestGraha?: string; // day's strongest transiting graha
  // (c) static rotation — recently used bodies to avoid
  recent?: string[];
};

export const NOTIFICATION_LINES = {
  event: {
    dashaChange: 'Your dasha period is shifting. A new chapter is beginning.',
    moonTransit: 'A rare alignment touches your Moon sign today.',
    solarReturn: 'Your birthday chart for the year ahead is ready.',
  },
  chart: {
    moonNakshatra: 'The Moon changed nakshatras overnight — your energy shifts with it.',
    venus: 'Venus is active in your chart today. Relationships come into focus.',
    saturn: 'Saturn asks for patience today. Slow is strong.',
    jupiter: 'Jupiter favors decisions made before noon.',
    timingWindow: 'A timing window opens this afternoon. See when.',
  },
  static: {
    curiosity: [
      'Before today gets busy, there’s one thing worth knowing.',
      'Your chart has a message waiting.',
      'Something shifted in the sky overnight.',
      'Today isn’t an ordinary day for your chart.',
      'One minute with Tara before your day begins.',
    ],
    warm: [
      'Something is working in your favor today.',
      'Today’s stars favor a small, brave step.',
      'You’re more aligned than you think.',
      'Trust your first instinct today.',
    ],
  },
} as const;

const STATIC_POOL: string[] = [...NOTIFICATION_LINES.static.curiosity, ...NOTIFICATION_LINES.static.warm];

// True if a body belongs to the static rotation (so callers only "remember" those).
export function isStaticLine(body: string): boolean {
  return STATIC_POOL.includes(body);
}

export function getNotificationLine(ctx: NotificationContext): string {
  // a. event-triggered — highest priority, only when confirmed
  if (ctx.dashaChange) return NOTIFICATION_LINES.event.dashaChange;
  if (ctx.transitOnMoon) return NOTIFICATION_LINES.event.moonTransit;
  if (ctx.solarReturnWeek) return NOTIFICATION_LINES.event.solarReturn;

  // b. chart-personalized
  if (ctx.moonNakshatraChanged) return NOTIFICATION_LINES.chart.moonNakshatra;
  switch (ctx.strongestGraha) {
    case 'Venus': return NOTIFICATION_LINES.chart.venus;
    case 'Saturn': return NOTIFICATION_LINES.chart.saturn;
    case 'Jupiter': return NOTIFICATION_LINES.chart.jupiter;
  }
  if (ctx.strongestGraha) return NOTIFICATION_LINES.chart.timingWindow;

  // c. static rotation — avoid the last 7 used, deterministic per day
  const recent = ctx.recent ?? [];
  const available = STATIC_POOL.filter((l) => !recent.includes(l));
  const pool = available.length ? available : STATIC_POOL;
  return pool[dayOfYear(ctx.date) % pool.length];
}
