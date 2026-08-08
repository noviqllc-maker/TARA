// src/lib/composeLove.ts
// Personalized relationship reading, derived deterministically from the natal chart plus the
// live transit Moon (no AI). Built from Venus, the Moon, and the 7th (partnership) / 5th
// (romance) houses of the real chart; the daily advice tracks today's transit Moon.
import { BirthChart, PlanetPosition } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';

export type LoveReading = {
  influence: string;
  strengths: string[];
  challenges: string[];
  growth: string[];
  advice: string;
};

const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const ELEMENT = ['Fire', 'Earth', 'Air', 'Water'] as const;
const elementOf = (signIndex: number) => ELEMENT[signIndex % 4];
const byName = (c: BirthChart, n: string): PlanetPosition | null => c.planets.find((p) => p.name === n) ?? null;
const houseLord = (c: BirthChart, h: number) => SIGN_LORD[(c.ascendant.signIndex + h - 1) % 12];
const occupants = (c: BirthChart, h: number) => c.planets.filter((p) => p.house === h);
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

const VENUS_FLAVOR: Record<(typeof ELEMENT)[number], string> = {
  Fire: 'passionate warmth and bold affection',
  Earth: 'steady devotion and a sensual, present kind of love',
  Air: 'playful charm and easy, curious connection',
  Water: 'deep feeling and tender intimacy',
};
const MOON_NEED: Record<(typeof ELEMENT)[number], string> = {
  Fire: 'honesty and freedom',
  Earth: 'steady reassurance',
  Air: 'space and real conversation',
  Water: 'emotional patience',
};
const MOON_STRENGTH: Record<(typeof ELEMENT)[number], string> = {
  Fire: 'Warm, generous emotional energy',
  Earth: 'A grounding, reliable heart',
  Air: 'Emotional lightness and curiosity',
  Water: 'A nurturing, intuitive instinct',
};
// Strength contributed by a planet sitting in (or lording) the 7th house of partnership.
const SEVENTH_STRENGTH: Record<string, string> = {
  Sun: 'Warmth and steady presence in partnership',
  Moon: 'Deep emotional attunement to a partner',
  Mars: 'Passion and protective devotion',
  Mercury: 'A communicative, curious partnership style',
  Jupiter: 'Generous, growth-minded partnership',
  Venus: 'Natural harmony, affection, and grace',
  Saturn: 'Deep loyalty and lasting commitment',
  Rahu: 'A magnetic, unconventional pull',
  Ketu: 'A soulful, karmic kind of bond',
};
// Challenge introduced by a harder planet in the 7th.
const SEVENTH_CHALLENGE: Record<string, string> = {
  Saturn: 'Emotional distance or quiet avoidance',
  Mars: 'Friction and impatience under stress',
  Rahu: 'Idealizing a partner, then disillusion',
  Ketu: 'Detachment or ambivalence',
  Mercury: 'Overthinking instead of feeling',
  Sun: 'Pride, or the need to be right',
};
const MOON_SHADOW: Record<(typeof ELEMENT)[number], string> = {
  Fire: 'Reactivity in the heat of the moment',
  Earth: 'Holding feelings in',
  Air: 'Living in the head, not the heart',
  Water: 'Absorbing others’ moods as your own',
};
// Each challenge maps to its growth edge.
const GROWTH: Record<string, string> = {
  'Emotional distance or quiet avoidance': 'Naming needs early instead of withdrawing',
  'Friction and impatience under stress': 'Softening before you push',
  'Idealizing a partner, then disillusion': 'Seeing your partner as they are, not as imagined',
  'Detachment or ambivalence': 'Choosing presence over distance',
  'Overthinking instead of feeling': 'Trusting feeling over analysis',
  'Pride, or the need to be right': 'Choosing connection over being right',
  'Reactivity in the heat of the moment': 'Pausing before you react',
  'Holding feelings in': 'Voicing needs early, and receiving as well as giving',
  'Living in the head, not the heart': 'Letting yourself feel, not only analyze',
  'Absorbing others’ moods as your own': 'Keeping a loving boundary around your own heart',
};
const HOUSE_ADVICE: Record<number, string> = {
  1: 'Lead with your own warmth today; you set the tone.',
  4: 'Tend the emotional home today; small comforts matter more than big talks.',
  5: 'A light, playful day for romance; let joy lead.',
  7: 'Turn toward your partner today; presence over problem-solving.',
  8: 'Go gently with intense feelings today; honesty over pressure.',
  10: 'Warmth may take a back seat to duty today; make a little deliberate space for connection.',
  12: 'A quieter, more private day; choose softness over hard conversations.',
};

export function composeLove(chart: BirthChart | null, date: Date = new Date()): LoveReading | null {
  if (!chart) return null;

  const venus = byName(chart, 'Venus');
  const moon = byName(chart, 'Moon');
  if (!venus || !moon) return null;

  const venusEl = elementOf(venus.signIndex);
  const moonEl = elementOf(moon.signIndex);
  const seventhOcc = occupants(chart, 7);
  const seventhLord = houseLord(chart, 7);

  // 3. influence: real Venus + Moon placements.
  const influence = `Venus in ${venus.sign} gives you ${VENUS_FLAVOR[venusEl]}; your Moon in ${moon.sign} asks for ${MOON_NEED[moonEl]} in love.`;

  // 4. strengths (3): Venus element, Moon element, and the 7th house.
  const seventhDriver = seventhOcc[0]?.name ?? seventhLord;
  const strengths = uniq([
    `${VENUS_FLAVOR[venusEl][0].toUpperCase()}${VENUS_FLAVOR[venusEl].slice(1)}`,
    MOON_STRENGTH[moonEl],
    SEVENTH_STRENGTH[seventhDriver] ?? SEVENTH_STRENGTH.Venus,
  ]).slice(0, 3);

  // 5. challenges (2–3): hard planets in the 7th, then the Moon's shadow.
  const hardSeventh = seventhOcc.filter((p) => SEVENTH_CHALLENGE[p.name]).map((p) => SEVENTH_CHALLENGE[p.name]);
  const challenges = uniq([...hardSeventh, MOON_SHADOW[moonEl]]).slice(0, 3);
  if (!challenges.length) challenges.push(MOON_SHADOW[moonEl]);

  // 6. growth: the learning edge for each challenge.
  const growth = uniq(challenges.map((c) => GROWTH[c] ?? 'Meeting your partner halfway, honestly')).slice(0, 3);

  // 7. advice: tracks today's transit Moon (which of your houses it moves through).
  let advice = HOUSE_ADVICE[7];
  try {
    const mh = computeTransits(date, chart).moonHouse;
    if (mh && HOUSE_ADVICE[mh]) advice = HOUSE_ADVICE[mh];
    else advice = 'Lead with softness today; presence over problem-solving.';
  } catch {
    advice = 'Lead with softness today; presence over problem-solving.';
  }

  return { influence, strengths, challenges, growth, advice };
}
