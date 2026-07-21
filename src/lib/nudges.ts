// src/lib/nudges.ts
// Context-aware premium nudge copy. One message is chosen per day by (dayOfYear %
// length) so it's stable within a day and rotates daily — NO render-time randomness.
export type NudgeContext =
  | 'home' | 'tara_ai' | 'chart'
  | 'life_love' | 'life_career' | 'life_health' | 'life_purpose';

export type NudgeMessage = { line: string; cta: string };

export const NUDGE_MESSAGES: Record<NudgeContext, NudgeMessage[]> = {
  home: [
    { line: 'Your chart has more to say — unlock every insight, every day.', cta: 'Go Premium' },
    { line: 'Bring every question to Tara — 100 a month with Premium.', cta: 'Go Premium' },
    { line: 'See your whole year, not just today.', cta: 'Unlock Year View' },
  ],
  tara_ai: [
    { line: '100 Ask Tara questions every month with Premium.', cta: 'Go Premium' },
    { line: 'Go deeper — full chart analysis and your year of timing windows.', cta: 'Go Premium' },
  ],
  chart: [
    { line: 'Your full dasha timeline & deep chart readings await.', cta: 'Unlock Full Chart' },
    { line: 'Every planet, every period — decoded with Premium.', cta: 'Go Premium' },
  ],
  life_love: [
    { line: 'Ask your relationship questions — 100 a month with Premium.', cta: 'Go Premium' },
    { line: 'Deep compatibility readings for the connections that matter.', cta: 'Unlock Compatibility' },
  ],
  life_career: [
    { line: 'Know your career timing windows all year — not just today.', cta: 'See My Year' },
    { line: 'Bring every career doubt to Tara — 100 questions a month.', cta: 'Go Premium' },
  ],
  life_health: [
    { line: "Blend your body's rhythm with your chart, every single day.", cta: 'Go Premium' },
  ],
  life_purpose: [
    { line: "Go deeper into your dharma with Tara's Premium guidance.", cta: 'Go Premium' },
  ],
};

// 0-based day of the year. Stable within a day; advances by 1 each calendar day.
export function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

// The deterministic message for a context on a given day.
export function nudgeForContext(context: NudgeContext, d: Date = new Date()): NudgeMessage {
  const arr = NUDGE_MESSAGES[context];
  return arr[dayOfYear(d) % arr.length];
}
