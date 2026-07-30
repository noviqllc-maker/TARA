// src/data/relational.ts
// Relational & digital-wellness nudges — short lines that encourage real connection, gated
// by engine/calendar conditions so they never invent a truth. Used by the daily-content and
// notification pools.
//
// HONESTY RULES (as established for notification copy): no fake intimacy ("someone may cross
// your path"), no fake urgency/expiry, no fake discovery. Every chart reference is gated by a
// condition that is actually true today: the vāra (weekday) lord — Friday IS Venus's day in
// the app's own mapping — or a confirmed transit (Mercury retrograde, Venus strongest,
// Saturn pressuring the Moon). The one ungated line is plain wellness advice, no chart claim.

export type RelationalCtx = {
  date: Date;
  mercuryRetro?: boolean;   // engine-confirmed Mercury retrograde today
  venusStrong?: boolean;    // Venus is the day's strongest transiting graha
  saturnOnMoon?: boolean;   // Saturn aspecting the natal Moon
};

// tier: 2 = chart-confirmed (most specific), 1 = weekday/vāra lord, 0 = ungated wellness.
type Nudge = { line: string; tier: 0 | 1 | 2; gate: (c: RelationalCtx) => boolean };

const day = (n: number) => (c: RelationalCtx) => c.date.getDay() === n; // 0 Sun … 6 Sat

export const RELATIONAL_NUDGES: Nudge[] = [
  // Chart-confirmed (tier 2)
  { line: 'Mercury is retrograde — reread the message before you send it.',       tier: 2, gate: (c) => !!c.mercuryRetro },
  { line: 'A gentle day to clear up an old misunderstanding, in plain words.',    tier: 2, gate: (c) => !!c.mercuryRetro },
  { line: 'Venus is warm today — a natural moment to reconnect with someone.',    tier: 2, gate: (c) => !!c.venusStrong },
  { line: 'A heavier sky — be patient and plain in your closest conversations.',  tier: 2, gate: (c) => !!c.saturnOnMoon },
  // Weekday / vāra lord (tier 1) — always true on that day
  { line: 'The Moon’s day — check in with someone at home.',                      tier: 1, gate: day(1) }, // Monday
  { line: 'Mars’s day — address a small friction before it grows.',              tier: 1, gate: day(2) }, // Tuesday
  { line: 'Mercury’s day — say the clear, kind thing you’ve been putting off.',  tier: 1, gate: day(3) }, // Wednesday
  { line: 'Jupiter’s day — thank someone who has helped you along.',             tier: 1, gate: day(4) }, // Thursday
  { line: 'Venus’s day — reach out to someone you’ve been meaning to.',          tier: 1, gate: day(5) }, // Friday
  { line: 'Saturn’s day — make room for one unhurried conversation.',            tier: 1, gate: day(6) }, // Saturday
  { line: 'The Sun’s day — appreciate someone out loud.',                        tier: 1, gate: day(0) }, // Sunday
  // Ungated digital wellness (tier 0) — no chart claim, plain advice
  { line: 'One real conversation is worth more than an hour of scrolling today.', tier: 0, gate: () => true },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// The day's relational nudge: pick from the highest-tier eligible lines (chart > weekday >
// wellness), seeded by (user + date) so it's stable per day and rotates. Always returns a
// line — every day has at least its vāra-lord nudge — so callers can surface it freely.
export function pickRelationalNudge(ctx: RelationalCtx, seed: string): string {
  const eligible = RELATIONAL_NUDGES.filter((n) => n.gate(ctx));
  const topTier = Math.max(...eligible.map((n) => n.tier));
  const pool = eligible.filter((n) => n.tier === topTier);
  return pool[hashStr(seed) % pool.length].line;
}
