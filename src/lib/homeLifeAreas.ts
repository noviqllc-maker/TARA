// src/lib/homeLifeAreas.ts
// Deterministic one-line teasers for Home's "Your Life Areas" cards, with built-in
// deduplication so no two cards lead with the SAME primary graha on a given day (which is what
// made Love / Wellness / Purpose all read like "Venus softens the day" with different nouns).
//
// How the dedup works (no AI, no regeneration loop): the cards are composed in display order.
// Each card first tries its REAL strongest transiting graha (computeTransitFactor); if that
// graha was already claimed by an earlier card, it falls to the next unused graha from a short,
// topic-appropriate candidate list. With 4 cards and 7+ candidates each, a distinct driver
// always resolves, so openings and tones vary as a consequence, and no card is ever blank.
import { BirthChart, computeTransitFactor } from '@/lib/vedic';
import { Topic } from '@/lib/topic';

// Two tone phrasings per graha (seeded pick varies by day + area).
const GRAHA_TONE: Record<string, string[]> = {
  Sun: ['the Sun lends clarity', 'the Sun brings a steadying focus'],
  Moon: ['the Moon softens the mood', 'the Moon deepens feeling'],
  Mars: ['Mars brings drive', 'Mars sharpens your edge'],
  Mercury: ['Mercury quickens the mind', 'Mercury favours clear words'],
  Jupiter: ['Jupiter opens things up', 'Jupiter widens the view'],
  Venus: ['Venus warms the day', 'Venus draws people closer'],
  Saturn: ['Saturn asks for patience', 'Saturn rewards steady effort'],
  Rahu: ['Rahu stirs ambition', 'Rahu pulls toward the new'],
  Ketu: ['Ketu turns you inward', 'Ketu invites you to let go'],
};
const DOMAIN_ADVICE: Partial<Record<Topic, string[]>> = {
  love: ['listen first', 'lead with warmth', 'say the kind thing'],
  career: ['pick one priority', 'move with intention', 'let steadiness lead'],
  health: ['tend your energy gently', 'rest counts as work today', 'keep the rhythm simple'],
  spiritual: ['make room for reflection', 'follow what holds meaning', 'trust the quiet pull'],
};
// Fallback drivers per topic (its natural rulers, in preference order), walked for the first
// unused graha when the real strongest one is already taken by an earlier card.
const TOPIC_CANDIDATES: Partial<Record<Topic, string[]>> = {
  love: ['Venus', 'Moon', 'Mars', 'Jupiter', 'Mercury', 'Sun', 'Saturn'],
  career: ['Sun', 'Saturn', 'Mercury', 'Mars', 'Jupiter', 'Venus', 'Moon'],
  health: ['Moon', 'Mars', 'Sun', 'Saturn', 'Mercury', 'Jupiter', 'Venus'],
  spiritual: ['Jupiter', 'Ketu', 'Sun', 'Saturn', 'Moon', 'Mercury', 'Venus'],
};

function teaserHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Compose one teaser per topic (in the given display order), guaranteeing a distinct primary
// graha across the set. Returns null in a slot when there's no chart or no vocabulary for it.
export function composeLifeAreaTeasers(
  chart: BirthChart | null,
  date: Date,
  topics: Topic[],
  seedBase: string,
): (string | null)[] {
  if (!chart) return topics.map(() => null);
  const used = new Set<string>();
  return topics.map((topic) => {
    // 1. Real strongest driver for this area.
    let graha: string | null = null;
    try { graha = computeTransitFactor(chart, date, topic).transiting; } catch { graha = null; }
    // 2. Dedup: if it's missing or already claimed, take the next unused topic-appropriate graha.
    if (!graha || used.has(graha)) {
      const alt = (TOPIC_CANDIDATES[topic] ?? []).find((g) => !used.has(g));
      if (alt) graha = alt;
    }
    if (!graha) return null;
    const tones = GRAHA_TONE[graha];
    const advice = DOMAIN_ADVICE[topic];
    if (!tones?.length || !advice?.length) return null;
    used.add(graha);
    const seed = `${seedBase}:${topic}`;
    const tone = tones[teaserHash(seed + ':tone') % tones.length];
    const a = advice[teaserHash(seed) % advice.length];
    return `${cap(tone)}. ${cap(a)}.`;
  });
}
