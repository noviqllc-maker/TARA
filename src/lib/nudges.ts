// src/lib/nudges.ts
// Context-aware premium nudge copy. The marketing LINE comes from the single approved
// source (PREMIUM_COPY in @/lib/premium): home has its own line, every other context
// rotates through the shared banner pool — chosen per day by (dayOfYear % length) so it's
// stable within a day and rotates daily, NO render-time randomness. The CTA stays
// context-specific (accurate, feature-named where it helps).
import { PREMIUM_COPY } from '@/lib/premium';

export type NudgeContext =
  | 'home' | 'tara_ai' | 'chart'
  | 'life_love' | 'life_career' | 'life_health' | 'life_purpose';

export type NudgeMessage = { line: string; cta: string };

// Per-context call-to-action label (not marketing copy — button text).
const CTA: Record<NudgeContext, string> = {
  home: 'Unlock Premium',
  tara_ai: 'Go Premium',
  chart: 'Unlock Full Chart',
  life_love: 'Unlock Compatibility',
  // Was 'See My Year' — the yearly forecast is now the Year Ahead shop report, not a
  // premium benefit, so this CTA must not imply premium includes it.
  life_career: 'Go Premium',
  life_health: 'Go Premium',
  life_purpose: 'Go Premium',
};

// 0-based day of the year. Stable within a day; advances by 1 each calendar day.
export function dayOfYear(d: Date = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

// The deterministic message for a context on a given day.
export function nudgeForContext(context: NudgeContext, d: Date = new Date()): NudgeMessage {
  if (context === 'home') return { line: PREMIUM_COPY.homeNudgeLine, cta: CTA.home };
  const pool = PREMIUM_COPY.bannerPool;
  return { line: pool[dayOfYear(d) % pool.length], cta: CTA[context] };
}
