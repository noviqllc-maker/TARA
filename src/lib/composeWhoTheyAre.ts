// src/lib/composeWhoTheyAre.ts
// A deterministic "Who You Are" personality reading from a natal chart (no AI). Built for the
// Vedic Calculator, so it works for ANY entered chart, not just the signed-in user. Derives
// the archetype from the Sun sign refined by the Atmakaraka (soul planet), and reads real
// placements for strengths, tendencies, and growth. Mirrors composeSoulDirection's approach.
import { BirthChart, PlanetPosition } from '@/lib/vedic';

export interface PersonalityAnalysis {
  coreArchetype: string;
  strengths: string[];
  naturalTendencies: string[];
  challenges: string[];
  lifeTheme: string;
}

const ELEMENT = ['Fire', 'Earth', 'Air', 'Water'] as const;
type Element = (typeof ELEMENT)[number];
const elementOf = (signIndex: number): Element => ELEMENT[signIndex % 4];
const byName = (c: BirthChart, n: string): PlanetPosition | null => c.planets.find((p) => p.name === n) ?? null;
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const cap = (n: number) => Math.max(1, Math.min(12, n));

// Archetype by Sun sign (the visible self), plus a one-line "life's work" phrase.
const SUN_ARCHETYPE: Record<string, string> = {
  Aries: 'The Pioneer', Taurus: 'The Cultivator', Gemini: 'The Messenger', Cancer: 'The Nurturer',
  Leo: 'The Creator', Virgo: 'The Craftsman', Libra: 'The Peacemaker', Scorpio: 'The Alchemist',
  Sagittarius: 'The Seeker', Capricorn: 'The Strategist', Aquarius: 'The Visionary', Pisces: 'The Mystic',
};
const ARCHETYPE_PHRASE: Record<string, string> = {
  'The Pioneer': 'blazing trails and starting what others only imagine',
  'The Cultivator': 'building lasting, beautiful things with patience',
  'The Messenger': 'connecting people and ideas through your words',
  'The Nurturer': 'caring for what and whom you love',
  'The Creator': 'expressing your unique vision so others can feel it',
  'The Craftsman': 'refining the world one careful detail at a time',
  'The Peacemaker': 'bringing harmony and fairness where there is friction',
  'The Alchemist': 'turning intensity and change into real growth',
  'The Seeker': 'chasing meaning and widening everyone\'s horizons',
  'The Strategist': 'building steadily toward goals that outlast the moment',
  'The Visionary': 'imagining a better future and inviting others into it',
  'The Mystic': 'feeling deeply and translating the unseen into art and care',
};
const SUN_STRENGTH: Record<string, string> = {
  Aries: 'Natural courage and initiative', Taurus: 'Steady persistence and a grounded presence',
  Gemini: 'Quick wit and a gift for connecting ideas', Cancer: 'Deep empathy and a protective instinct',
  Leo: 'Natural charisma and warm, generous leadership', Virgo: 'Sharp discernment and a talent for making things work',
  Libra: 'Diplomacy and an eye for fairness and beauty', Scorpio: 'Emotional depth and the power to transform',
  Sagittarius: 'Optimism and a hunger for meaning', Capricorn: 'Discipline and long-range strategic thinking',
  Aquarius: 'Original thinking and a humanitarian streak', Pisces: 'Intuition, compassion, and imagination',
};
// Soul-planet (Atmakaraka) gift.
const AK_GIFT: Record<string, string> = {
  Sun: 'natural authority and warmth', Moon: 'emotional attunement and care',
  Mars: 'courage and the drive to act', Mercury: 'sharp discernment and a way with words',
  Jupiter: 'wisdom and genuine generosity', Venus: 'aesthetic intelligence and relational grace',
  Saturn: 'discipline, patience, and staying power',
};
const MOON_PROCESS: Record<Element, string> = {
  Fire: 'You act on feeling and often lead before you are asked',
  Earth: 'You process slowly and trust what you can build and touch',
  Air: 'You think things through and talk them out to understand them',
  Water: 'You feel first, reading the mood of a room before you speak',
};
const RISING_APPROACH: Record<Element, string> = {
  Fire: 'You meet life head-on, with energy and directness',
  Earth: 'You approach life practically, one solid step at a time',
  Air: 'You meet the world through ideas, curiosity, and people',
  Water: 'You move through life intuitively, guided by feel more than plan',
};
// Saturn's house, framed as the growth edge (never a flaw).
const SATURN_GROWTH: Record<number, string> = {
  1: 'Learning to trust your own timing instead of forcing it (Saturn in the 1st)',
  2: 'Building security patiently rather than chasing it (Saturn in the 2nd)',
  3: 'Finding the confidence to speak up and be heard (Saturn in the 3rd)',
  4: 'Making peace with home and roots (Saturn in the 4th)',
  5: 'Letting joy and creativity in without over-guarding them (Saturn in the 5th)',
  6: 'Setting healthy boundaries with work and worry (Saturn in the 6th)',
  7: 'Learning to trust and lean on others (Saturn in the 7th)',
  8: 'Softening the grip of control around what you cannot predict (Saturn in the 8th)',
  9: 'Questioning inherited beliefs to find your own (Saturn in the 9th)',
  10: 'Building authority slowly without over-identifying with status (Saturn in the 10th)',
  11: 'Choosing your circle with care (Saturn in the 11th)',
  12: 'Making rest and letting go feel safe rather than like loss (Saturn in the 12th)',
};

// Atmakaraka = the graha (Sun..Saturn) at the highest degree within its sign.
const CHARA = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
function atmakaraka(chart: BirthChart): PlanetPosition | null {
  const cand = chart.planets.filter((p) => CHARA.includes(p.name));
  if (!cand.length) return null;
  return [...cand].sort((a, b) => (b.longitude % 30) - (a.longitude % 30))[0];
}

export function composeWhoTheyAre(chart: BirthChart | null): PersonalityAnalysis | null {
  if (!chart) return null;

  const sun = byName(chart, 'Sun');
  const moon = byName(chart, 'Moon');
  const ak = atmakaraka(chart);
  const sunSign = sun?.sign ?? chart.sunSign;
  const archetype = SUN_ARCHETYPE[sunSign] ?? 'The Seeker';

  const moonEl = elementOf(moon?.signIndex ?? 0);
  const risingEl = elementOf(chart.ascendant.signIndex);

  // Strengths: Sun-sign trait, Atmakaraka gift, Mercury/Moon flavor, a benefic in a strong house.
  const merc = byName(chart, 'Mercury');
  const benefics = chart.planets.filter((p) => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p.name) && [1, 4, 5, 7, 9, 10].includes(p.house));
  const strengths = uniq([
    `${SUN_STRENGTH[sunSign] ?? 'A distinct, capable presence'} (Sun in ${sunSign})`,
    ak ? `A soul-level gift for ${AK_GIFT[ak.name] ?? 'depth and focus'} (${ak.name} is your Atmakaraka)` : '',
    merc ? `A ${elementOf(merc.signIndex) === 'Air' ? 'articulate, quick' : elementOf(merc.signIndex) === 'Earth' ? 'practical, precise' : elementOf(merc.signIndex) === 'Fire' ? 'direct, decisive' : 'intuitive, feeling-led'} mind (Mercury in ${merc.sign})` : '',
    benefics[0] ? `${benefics[0].name} in your ${ORD[benefics[0].house]} house lends real support in that area of life` : '',
    `A ${moonEl.toLowerCase()} emotional nature that ${moonEl === 'Water' ? 'feels deeply' : moonEl === 'Fire' ? 'brings warmth and drive' : moonEl === 'Earth' ? 'stays steady' : 'stays curious and light'}`,
  ]).slice(0, 5);

  // Natural tendencies: how they move through life (Moon, Rising, Atmakaraka).
  const naturalTendencies = uniq([
    MOON_PROCESS[moonEl],
    RISING_APPROACH[risingEl],
    ak ? `At your core you are drawn toward ${AK_GIFT[ak.name] ?? 'depth'}, and life keeps pointing you back to it` : '',
  ]).slice(0, 3);

  // Challenges (framed as growth): Saturn's house, any retrograde, and the archetype's shadow.
  const saturn = byName(chart, 'Saturn');
  const retro = chart.planets.find((p) => p.retrograde && !['Rahu', 'Ketu'].includes(p.name));
  const challenges = uniq([
    saturn ? SATURN_GROWTH[cap(saturn.house)] : 'Learning patience with your own unfolding',
    retro ? `Your ${retro.name} is retrograde, so you tend to rework its lessons inwardly first; growth comes from finishing what you revisit, not restarting it` : '',
    ARCHETYPE_SHADOW[archetype] ?? '',
  ]).slice(0, 3);
  if (challenges.length < 2) challenges.push('Trusting that steady effort counts, even when results are slow to show');

  // Life theme: archetype's work + the current growth edge.
  const growthClause = saturn ? SATURN_GROWTH[cap(saturn.house)].replace(/\s*\(Saturn.*\)$/, '').replace(/^Learning to |^Making |^Building |^Finding |^Setting |^Choosing |^Questioning |^Softening |^Letting /, (m) => m.toLowerCase()) : 'honoring both your gifts and your limits';
  const lifeTheme = `As ${archetype}, your life's work is ${ARCHETYPE_PHRASE[archetype] ?? 'growing into your fullest expression'}, while ${growthClause}.`;

  return { coreArchetype: archetype, strengths, naturalTendencies, challenges, lifeTheme };
}

// The gentle shadow side of each archetype, framed as an invitation, not a flaw.
const ARCHETYPE_SHADOW: Record<string, string> = {
  'The Pioneer': 'Slowing down enough to finish what you start, not just begin it',
  'The Cultivator': 'Staying open to change when comfort turns into a rut',
  'The Messenger': 'Letting depth in, not only breadth, so ideas take root',
  'The Nurturer': 'Caring for yourself with the same devotion you give others',
  'The Creator': 'Creating for the joy of it, not only for recognition',
  'The Craftsman': 'Easing the grip of perfectionism so good enough can ship',
  'The Peacemaker': 'Speaking your own needs, not only keeping the peace',
  'The Alchemist': 'Letting some things be light, not everything a depth',
  'The Seeker': 'Grounding the vision in one committed path',
  'The Strategist': 'Making room for warmth and play alongside the plan',
  'The Visionary': 'Bringing others along, not racing too far ahead',
  'The Mystic': 'Keeping a loving boundary so you do not absorb every mood',
};
