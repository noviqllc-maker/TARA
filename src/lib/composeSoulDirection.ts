// src/lib/composeSoulDirection.ts
// A personalized "Soul Direction" reading, assembled deterministically from the natal chart.
// No AI, no network: pure lookup tables keyed on the chart's real structure.
//
// Because the engine's BirthChart does not expose chart.atmakaraka / chart.houses / a single
// mahadasha field, we DERIVE them from the real shape:
//   - Atmakaraka = the graha (Sun..Saturn) at the highest degree WITHIN its sign.
//   - 9th house  = 9th rashi from the Lagna; its lord and any occupants.
//   - Mahādasha  = the running dasha period (phase === 'present').
import { BirthChart, PlanetPosition } from '@/lib/vedic';

export type SoulDirection = {
  lifeTheme: string;
  currentPhase: string;
  naturalGifts: string[];
  growthLessons: string[];
  soulDirection: string;
  spiritualEvolution: string;
};

// Lord of each rashi, indexed by 0-based signIndex (Aries..Pisces).
const SIGN_LORD: string[] = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];
// Element by signIndex (signs cycle Fire, Earth, Air, Water from Aries).
const ELEMENT = ['Fire', 'Earth', 'Air', 'Water'] as const;
const elementOf = (signIndex: number) => ELEMENT[signIndex % 4];
const firstWord = (s: string) => (s || '').trim().split(/[\s\-–]+/)[0] || '';

// ---- archetype tables (all 7 chara-karaka planets) ------------------------------
type Graha = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

// Atmakaraka title. Mercury and Saturn shift by element, per the brief.
function archetypeTitle(ak: Graha, signIndex: number): string {
  const el = elementOf(signIndex);
  switch (ak) {
    case 'Sun': return 'The Sovereign';
    case 'Moon': return 'The Nurturer';
    case 'Mars': return 'The Pioneer';
    case 'Mercury': return el === 'Earth' ? 'The Refiner' : 'The Communicator';
    case 'Jupiter': return 'The Seeker';
    case 'Venus': return 'The Harmonizer';
    case 'Saturn': return el === 'Water' ? 'The Renunciate' : 'The Builder';
    default: return 'The Seeker';
  }
}
function archetypePhrase(title: string): string {
  switch (title) {
    case 'The Sovereign': return 'standing in your own light and helping others find theirs';
    case 'The Nurturer': return 'holding steady space for whatever needs care';
    case 'The Pioneer': return 'clearing a path where others hesitate';
    case 'The Refiner': return 'bringing order, clarity, and quiet beauty to whatever you touch';
    case 'The Communicator': return 'turning ideas into words that connect people';
    case 'The Seeker': return 'widening the horizons of everyone you meet';
    case 'The Harmonizer': return 'drawing beauty and harmony into form';
    case 'The Builder': return 'building slowly the things that are meant to last';
    case 'The Renunciate': return 'finding freedom by releasing the inessential';
    default: return 'growing into your fullest expression';
  }
}

const PLANET_GIFT: Record<Graha, string> = {
  Sun: 'Natural authority and warmth',
  Moon: 'Emotional attunement and a gift for care',
  Mars: 'Courage and the will to act',
  Mercury: 'Sharp discernment and a way with words',
  Jupiter: 'Wisdom and a genuinely generous spirit',
  Venus: 'Aesthetic intelligence and relational grace',
  Saturn: 'Discipline, patience, and staying power',
  Rahu: 'Boldness and an original, unconventional mind',
  Ketu: 'Deep intuition and natural detachment',
};

const ELEMENT_GIFT: Record<(typeof ELEMENT)[number], string> = {
  Fire: 'A creative, radiant drive',
  Earth: 'A grounded, practical steadiness',
  Air: 'A quick, connective mind',
  Water: 'A deep, feeling intuition',
};

// What the 9th lord orients the life toward (dharma / meaning).
const NINTH_DOMAIN: Record<string, string> = {
  Sun: 'leadership and living your own truth',
  Moon: 'nurturing and emotional wisdom',
  Mars: 'bold action and protecting what is right',
  Mercury: 'learning, writing, and sharing knowledge',
  Jupiter: 'philosophy, teaching, and higher meaning',
  Venus: 'beauty, harmony, and devoted relationship',
  Saturn: 'discipline, service, and patient mastery',
};
const NINTH_LIGHT: Record<string, string> = {
  Sun: 'leading with quiet authority',
  Moon: 'nurturing others without losing yourself',
  Mars: 'acting with clean, honest courage',
  Mercury: 'teaching what you have learned',
  Jupiter: 'sharing your wisdom freely',
  Venus: 'loving without conditions',
  Saturn: 'serving with patient devotion',
};

// The shadow each Atmakaraka is here to outgrow.
const AK_SHADOW: Record<Graha, string> = {
  Sun: 'the need to be seen',
  Moon: 'over-giving to feel safe',
  Mars: 'forcing outcomes before their time',
  Mercury: 'the need to prove how much you know',
  Jupiter: 'needing to have all the answers',
  Venus: 'seeking your worth through others’ approval',
  Saturn: 'earning worth only through hardship',
  Rahu: 'chasing more as a cure for restlessness',
  Ketu: 'withdrawing instead of engaging',
};
const AK_SHADOW_SHORT: Record<Graha, string> = {
  Sun: 'needing to be seen',
  Moon: 'over-giving to feel safe',
  Mars: 'forcing outcomes',
  Mercury: 'proving how much you know',
  Jupiter: 'having all the answers',
  Venus: 'seeking approval',
  Saturn: 'proving worth through struggle',
  Rahu: 'chasing what is next',
  Ketu: 'retreating from life',
};

// Saturn's house-of-placement names the central maturing lesson.
const SATURN_LESSON: Record<number, string> = {
  1: 'Learning to trust your own timing and worth',
  2: 'Building real security patiently, without scarcity fear',
  3: 'Finding the courage to speak and act on your own behalf',
  4: 'Making an inner home so peace does not depend on circumstances',
  5: 'Letting joy and creativity be enough, without needing them to prove anything',
  6: 'Turning discipline into service rather than self-criticism',
  7: 'Building patience and equality in your closest partnerships',
  8: 'Trusting change you cannot control; letting go is not losing',
  9: 'Earning your beliefs through experience rather than borrowing them',
  10: 'Defining success on your own terms, not by others’ approval',
  11: 'Choosing a few real bonds over the pull of endless networks',
  12: 'Making peace with solitude and the quiet inner life',
};

// The growth arc of the running Mahādasha.
const MAHA_ARC: Record<string, string> = {
  Sun: 'This Sun chapter is teaching you to lead from a settled centre, so authority becomes service rather than performance.',
  Moon: 'This Moon chapter is softening you toward feeling and care, so you learn to be nourished as much as you nourish.',
  Mars: 'This Mars chapter is forging your will, so you learn to aim your fire instead of scattering it.',
  Mercury: 'This Mercury chapter is sharpening your mind and voice, so understanding turns into something you can actually share.',
  Jupiter: 'This Jupiter chapter is widening your world; the invitation is to grow through generosity rather than accumulation.',
  Venus: 'This Venus chapter is opening you to love and beauty, so you learn to receive as gracefully as you give.',
  Saturn: 'This Saturn chapter is teaching mastery through patience; the slow, honest path is the real one now.',
  Rahu: 'This Rahu chapter is pulling you toward the new and unfamiliar; the work is to stay grounded while you reach.',
  Ketu: 'This Ketu chapter is turning you inward toward meaning; some things fall away so something deeper can form.',
};

// Mahādasha → life-phase category, per the brief.
function phaseCategory(mahaLord: string): string {
  if (['Jupiter', 'Venus', 'Mercury'].includes(mahaLord)) return 'Growth';
  if (['Saturn', 'Sun', 'Moon'].includes(mahaLord)) return 'Integration';
  return 'Challenge'; // Mars, Rahu, Ketu
}

// ---- derivations ---------------------------------------------------------------
const byName = (planets: PlanetPosition[], n: string) => planets.find((p) => p.name === n);

// Atmakaraka: highest degree within its sign among the seven chara-karaka grahas.
function atmakaraka(planets: PlanetPosition[]): PlanetPosition | null {
  const seven = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
    .map((n) => byName(planets, n))
    .filter((p): p is PlanetPosition => !!p);
  if (!seven.length) return null;
  return seven.reduce((best, p) => ((p.longitude % 30) > (best.longitude % 30) ? p : best));
}

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

// ---- main ----------------------------------------------------------------------
export function composeSoulDirection(chart: BirthChart | null): SoulDirection | null {
  if (!chart) return null;

  const sun = byName(chart.planets, 'Sun');
  const ak = atmakaraka(chart.planets);
  if (!sun || !ak) return null; // malformed chart → let the component show the prompt

  const akName = ak.name as Graha;
  const akSignIndex = ak.signIndex;
  const sunElement = elementOf(sun.signIndex);

  // 9th house from the Lagna: rashi, lord, occupants.
  const ninthSignIndex = (chart.ascendant.signIndex + 8) % 12;
  const ninthLord = SIGN_LORD[ninthSignIndex];
  const ninthOccupants = chart.planets.filter((p) => p.house === 9);

  // Running Mahādasha lord.
  const mahaLord = chart.dasha.find((d) => d.phase === 'present')?.planet || firstWord(chart.currentDasha) || 'Jupiter';

  // Saturn placement + 8th-house occupancy for the growth lessons.
  const saturn = byName(chart.planets, 'Saturn');
  const eighthOccupied = chart.planets.some((p) => p.house === 8);

  // 1. Life theme: Atmakaraka archetype (Mercury/Saturn nuance by element).
  const title = archetypeTitle(akName, akSignIndex);
  const lifeTheme = `${title}: ${archetypePhrase(title)}.`;

  // 2. Current phase: running Mahādasha.
  const currentPhase = `${phaseCategory(mahaLord)} (${mahaLord} Mahādasha)`;

  // 3. Natural gifts: Atmakaraka, the 9th-house dharma pull, and the Sun's element (exactly 3).
  const ninthDomain = NINTH_DOMAIN[ninthLord] ?? 'meaning and higher purpose';
  const ninthBenefic = ninthOccupants.some((p) => ['Jupiter', 'Venus'].includes(p.name));
  // A benefic in the 9th (fortune) takes the third slot; otherwise the Sun's element does.
  const thirdGift = ninthBenefic ? 'A blessing of good fortune and grace in your path' : ELEMENT_GIFT[sunElement];
  const gifts = uniq([PLANET_GIFT[akName], `A dharmic pull toward ${ninthDomain}`, thirdGift]);
  const giftPool = [ELEMENT_GIFT[sunElement], PLANET_GIFT.Jupiter, PLANET_GIFT.Venus, PLANET_GIFT.Mercury];
  for (let i = 0; gifts.length < 3 && i < giftPool.length; i++) {
    if (!gifts.includes(giftPool[i])) gifts.push(giftPool[i]);
  }
  const naturalGifts = gifts.slice(0, 3);

  // 4. Growth lessons: the Atmakaraka shadow, Saturn's house, and an 8th-house note (unless
  // Saturn already sits in the 8th, in which case its lesson covers that ground).
  const growthLessons = uniq([
    `Releasing ${AK_SHADOW[akName]}`,
    saturn ? SATURN_LESSON[saturn.house] : SATURN_LESSON[10],
    eighthOccupied && saturn?.house !== 8 ? 'Trusting change you cannot control; letting go is not the same as losing' : '',
  ]).slice(0, 3);

  // 5. Soul direction: the Atmakaraka shadow toward the 9th-lord light.
  const light = NINTH_LIGHT[ninthLord] ?? 'living your purpose openly';
  const soulDirection = `Moving from ${AK_SHADOW_SHORT[akName]} toward ${light}.`;

  // 6. Spiritual evolution: the Mahādasha arc, with a quiet-inner-life note if the 12th is lit.
  const twelfthOccupied = chart.planets.some((p) => p.house === 12);
  const spiritualEvolution =
    (MAHA_ARC[mahaLord] ?? MAHA_ARC.Jupiter) +
    (twelfthOccupied ? ' A quieter, more inward season is part of the work now.' : '');

  return { lifeTheme, currentPhase, naturalGifts, growthLessons, soulDirection, spiritualEvolution };
}
