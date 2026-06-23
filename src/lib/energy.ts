// src/lib/energy.ts
// Derives today's "energy" scores (0–100) from REAL signals — the user's birth
// chart, today's Moon transit, the moon phase, and Apple Health metrics — instead
// of hardcoded mock numbers. Pure & deterministic: same inputs (same calendar day)
// always yield the same scores; different days differ. No Math.random.

import { BirthChart } from '@/lib/vedic';
import { HealthMetrics } from '@/lib/health';
import { Transits } from '@/lib/transits';
import { EnergyDomain, SnapshotStat } from '@/data/mock';

export type DailyEnergy = {
  domains: EnergyDomain[];   // rings: Mind, Relationships, Career, Body, Spiritual
  snapshot: SnapshotStat[];  // stats: Love, Career, Vitality, Wealth, Mood
};

// Sign lords (Aries…Pisces) — used to find a house's ruling planet. Mirrors the
// table in vedic.ts (kept local so this module stays self-contained).
const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

// Emotional/mental "tone" of the Moon transiting each house (1–12), 0–100.
// Derived from the house mood descriptions in transits.ts/houseTheme.
const HOUSE_TONE: Record<number, number> = {
  1: 70, 2: 64, 3: 68, 4: 58, 5: 78, 6: 50,
  7: 66, 8: 40, 9: 75, 10: 64, 11: 72, 12: 46,
};

// Spiritual potency by moon phase (New/Full are the strongest windows).
const PHASE_SPIRIT: Record<string, number> = {
  'New Moon': 80, 'Waxing Crescent': 66, 'First Quarter': 58, 'Waxing Gibbous': 70,
  'Full Moon': 82, 'Waning Gibbous': 62, 'Last Quarter': 56, 'Waning Crescent': 60,
};

// ---- deterministic helpers ----
const clampRound = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Stable per-calendar-day key (local time) used to seed daily variation.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// FNV-1a string hash → unsigned 32-bit int (no Math.random).
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic jitter in [-amp, amp], seeded by (day + metric key). Same day +
// same metric → same offset; different day → different offset.
function seededJitter(key: string, metric: string, amp: number): number {
  const r = (hashStr(`${key}|${metric}`) % 1000) / 1000; // 0..1
  return (r * 2 - 1) * amp;
}

// Score for the Moon transiting a house, by life area. strongFavor > favor > base,
// challenge dips below base. Null moon house (no chart) → neutral.
function transitScore(
  moonHouse: number | null,
  favor: number[],
  strongFavor: number[] = [],
  challenge: number[] = [],
): number {
  if (moonHouse == null) return 55;
  if (strongFavor.includes(moonHouse)) return 82;
  if (favor.includes(moonHouse)) return 72;
  if (challenge.includes(moonHouse)) return 42;
  return 56;
}

export function computeDailyEnergy(input: {
  chart: BirthChart | null;
  health: HealthMetrics;
  transits: Transits;
  date: Date;
}): DailyEnergy {
  const { chart, health, transits, date } = input;
  const key = dayKey(date);
  const moonHouse = transits.moonHouse; // 1–12 relative to ascendant, or null
  const recovery = clampRound(health.recovery);
  const sleep = clampRound(health.sleep);
  const J = (metric: string, amp = 5) => seededJitter(key, metric, amp);

  // --- chart helpers (all null-safe) ---
  const houseOfPlanet = (name: string): number | null =>
    chart?.planets.find((p) => p.name === name)?.house ?? null;

  const lordOfHouse = (house: number): string | null => {
    if (!chart) return null;
    const signIdx = (chart.ascendant.signIndex + (house - 1)) % 12;
    return SIGN_LORDS[signIdx];
  };

  // How well a planet is placed natally (dignity by house). Neutral if unknown.
  const placement = (planet: string | null): number => {
    if (!planet) return 55;
    const h = houseOfPlanet(planet);
    if (h == null) return 55;
    if ([1, 4, 5, 7, 9, 10].includes(h)) return 76; // kendra / trikona (strong)
    if (h === 11) return 70;                          // house of gains
    if (h === 3) return 62;                           // mild upachaya
    if ([6, 8, 12].includes(h)) return 42;            // dusthana (weak)
    return 56;
  };

  // ---- Body / Vitality ----
  // With Apple Health connected, use the real recovery/sleep blend. Otherwise the
  // `health` numbers are only the mock fallback — so derive Body from the chart:
  // ascendant-lord dignity (the body itself), natal Mars (stamina/vitality karaka),
  // and today's Moon transit through the health houses (1 = vitality, 6 = healing).
  let vitalityBase: number;
  if (health.source === 'apple-health') {
    vitalityBase = recovery * 0.6 + sleep * 0.4;
  } else {
    const ascLord = placement(lordOfHouse(1));
    const mars = placement('Mars');
    const healthTransit = transitScore(moonHouse, [1, 6]);
    vitalityBase = ascLord * 0.4 + mars * 0.3 + healthTransit * 0.3;
  }
  const Body = clampRound(vitalityBase + J('body', 4));
  const Vitality = clampRound(vitalityBase + J('vitality', 4));

  // ---- Mind / Mood → Moon-house tone, modulated by recovery ----
  const tone = moonHouse ? HOUSE_TONE[moonHouse] : 60;
  const mindBase = tone * 0.6 + recovery * 0.4;
  const Mind = clampRound(mindBase + J('mind'));
  const Mood = clampRound(mindBase + J('mood'));

  // ---- Relationships / Love → Moon in 5/7/11 + natal Venus placement ----
  const relTransit = transitScore(moonHouse, [5, 11], [7]);
  const venus = placement('Venus');
  const loveBase = relTransit * 0.55 + venus * 0.45;
  const Relationships = clampRound(loveBase + J('relationships'));
  const Love = clampRound(loveBase + J('love'));

  // ---- Career → Moon in 6/10 + natal 10th-house lord placement ----
  const careerTransit = transitScore(moonHouse, [6], [10]);
  const tenthLord = placement(lordOfHouse(10));
  const Career = clampRound(careerTransit * 0.55 + tenthLord * 0.45 + J('career'));

  // ---- Wealth → Moon in 2/11 + natal 2nd-house lord placement ----
  const wealthTransit = transitScore(moonHouse, [2, 11]);
  const secondLord = placement(lordOfHouse(2));
  const Wealth = clampRound(wealthTransit * 0.6 + secondLord * 0.4 + J('wealth'));

  // ---- Spiritual (ring only) → Moon in 9/12 + moon phase + recovery ----
  const spiritTransit = transitScore(moonHouse, [4, 8], [9, 12]);
  const phaseScore = PHASE_SPIRIT[transits.moonPhase] ?? 62;
  const Spiritual = clampRound(spiritTransit * 0.6 + recovery * 0.25 + phaseScore * 0.15 + J('spirit', 4));

  return {
    domains: [
      { key: 'Mind', score: Mind },
      { key: 'Relationships', score: Relationships },
      { key: 'Career', score: Career },
      { key: 'Body', score: Body },
      { key: 'Spiritual', score: Spiritual },
    ],
    snapshot: [
      { label: 'Love', value: Love },
      { label: 'Career', value: Career },
      { label: 'Vitality', value: Vitality },
      { label: 'Wealth', value: Wealth },
      { label: 'Mood', value: Mood },
    ],
  };
}
