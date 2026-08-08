// src/lib/composeWellness.ts
// Personalized wellness tone, derived deterministically from the day-lord (vara), the natal
// 12th house (rest / spirituality), Jupiter, the Moon, the running Mahadasha, and today's
// Moon phase (no AI). Only the Spiritual/Habits/Practices sections use this; the health rings
// stay driven by real HealthKit metrics in the screen.
import { BirthChart, PlanetPosition } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { varaLord } from '@/lib/panchanga';

export type WellnessReading = {
  spiritualAlignment: string;
  habits: string[];
  practices: string[];
};

const byName = (c: BirthChart, n: string): PlanetPosition | null => c.planets.find((p) => p.name === n) ?? null;
const occupants = (c: BirthChart, h: number) => c.planets.filter((p) => p.house === h);
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

const SPIRIT_BY_LORD: Record<string, string> = {
  Sun: 'Radiant & centered',
  Moon: 'Open & receptive',
  Mars: 'Charged & driven',
  Mercury: 'Curious & clear',
  Jupiter: 'Expansive & open',
  Venus: 'Warm & harmonious',
  Saturn: 'Grounded & focused',
};
const HABIT_BY_LORD: Record<string, string> = {
  Sun: 'Morning light exposure',
  Moon: 'Slower, gentler mornings',
  Mars: 'Physical movement to spend the charge',
  Mercury: 'Short breath breaks between tasks',
  Jupiter: 'Time in nature or unhurried reading',
  Venus: 'Unhurried, pleasant meals',
  Saturn: 'An earlier wind-down',
};
const PRACTICE_BY_LORD: Record<string, string> = {
  Sun: 'Surya namaskar or Gayatri japa',
  Moon: 'Chandra mantra and quiet moon-gazing',
  Mars: 'Grounding practice with the Hanuman Chalisa',
  Mercury: 'Nadi shodhana (alternate-nostril breath)',
  Jupiter: 'Expansion meditation or a Guru mantra',
  Venus: 'Loving-kindness with a Shukra mantra',
  Saturn: 'Stillness practice with a Shani mantra',
};

const MALEFIC = ['Saturn', 'Mars', 'Ketu', 'Rahu'];
const BENEFIC = ['Jupiter', 'Venus', 'Moon'];

export function composeWellness(chart: BirthChart | null, date: Date = new Date()): WellnessReading | null {
  if (!chart) return null;

  const dayLord = varaLord(date).lord as string;
  const twelfthOcc = occupants(chart, 12);
  const twelfthMalefic = twelfthOcc.some((p) => MALEFIC.includes(p.name));
  const twelfthBenefic = twelfthOcc.some((p) => BENEFIC.includes(p.name));
  const jup = byName(chart, 'Jupiter');
  const jupiterStrong = !!jup && [1, 4, 5, 9, 10, 11].includes(jup.house);

  // 3. spiritualAlignment (2–3 words): day-lord tone, shifted by the 12th house.
  let spiritualAlignment = SPIRIT_BY_LORD[dayLord] ?? 'Steady & present';
  if (twelfthMalefic) spiritualAlignment = 'Quiet & inward';
  else if (twelfthBenefic) spiritualAlignment = 'Open & receptive';

  // Moon phase → resting vs. energizing habit.
  let waning = true;
  try {
    const phase = computeTransits(date, chart).moonPhase || '';
    waning = /waning|last quarter|new/i.test(phase);
  } catch { /* default to restful */ }

  // 4. habits (2–3): day-lord habit + a phase-appropriate one + a 12th-strong sleep note.
  const habits = uniq([
    HABIT_BY_LORD[dayLord] ?? 'A steady daily rhythm',
    waning ? 'Extra rest and screen-free evenings' : 'Channel the extra energy, then wind down deliberately',
    (twelfthOcc.length || jupiterStrong) ? 'Protect your sleep; rest is dharmic for you now' : '',
  ]).slice(0, 3);
  if (habits.length < 2) habits.push('A short daily grounding pause');

  // 5. practices (2–3): day-lord practice + a 12th/Jupiter contemplative one + grounding.
  const practices = uniq([
    PRACTICE_BY_LORD[dayLord] ?? 'A few minutes of grounding breath',
    (twelfthOcc.length || jupiterStrong) ? 'Silent meditation or a small act of seva' : 'Box breathing to settle the mind',
    'Five minutes of grounding breath',
  ]).slice(0, 3);

  return { spiritualAlignment, habits, practices };
}
