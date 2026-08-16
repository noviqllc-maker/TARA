// src/lib/composeHealthAction.ts
// Six concrete, deterministic wellness pointers for the day (no AI). Every field ties to a
// real chart factor: the day-lord (vara), today's transit Moon, the natal Moon/Saturn/Mars/
// Venus placements, the day-lord's horā window, and 8th/6th-house involvement for risk. This
// is lifestyle/reflective guidance only, never medical or diagnostic.
import { BirthChart, PlanetPosition } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { varaLord, powerHours } from '@/lib/panchanga';

export interface HealthAction {
  todaysAction: string;
  avoidToday: string;
  bestHour: string;
  biggestOpportunity: string;
  riskLevel: 'low' | 'medium' | 'high';
  oneDecisionToMake: string;
}

const ELEMENT = ['Fire', 'Earth', 'Air', 'Water'] as const;
type Element = (typeof ELEMENT)[number];
const elementOf = (signIndex: number): Element => ELEMENT[signIndex % 4];
const SIGN_ORDER = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const elementOfSign = (sign: string): Element => elementOf(Math.max(0, SIGN_ORDER.indexOf(sign)));
const byName = (c: BirthChart, n: string): PlanetPosition | null => c.planets.find((p) => p.name === n) ?? null;
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

// Day-lord (vara) → the movement/practice that best fits the day's energy.
const DAY_ACTION: Record<string, string> = {
  Sun: 'a short burst of morning light and movement to set the day with intention',
  Moon: 'gentle, restorative movement with a little extra hydration and rest',
  Mars: 'channelling the charge into real effort: strength work or a brisk, purposeful walk',
  Mercury: 'a mind-clearing practice: breathwork, journaling, or one focused learning block',
  Jupiter: 'expansive, feel-good movement: a longer walk, a good stretch, or time outdoors',
  Venus: 'something that genuinely feels good: gentle yoga, a warm bath, or a nourishing meal',
  Saturn: 'a grounding ritual: slow yoga, an unhurried walk, and an earlier night',
};

// What to ease off, by the element of today's transit Moon (before house overrides).
const AVOID_BY_EL: Record<Element, string> = {
  Fire: 'overexertion and stimulants; the fire runs high today, so pace yourself and do not burn out',
  Earth: 'rigid, all-or-nothing routines; let the day have a little give rather than forcing it',
  Air: 'skipped meals and screen overload; your nervous system is asking for steadiness',
  Water: 'heavy or late meals; digestion is sensitive today, so keep it lighter and earlier',
};

// What the body responds to best while the Moon transits each house today.
const MOON_HOUSE_BODY: Record<number, string> = {
  1: 'active, energising movement', 2: 'steady routines and good food', 3: 'short, playful bursts of activity',
  4: 'rest and real comfort', 5: 'movement that feels like play', 6: 'consistent, simple healthy habits',
  7: 'partnered or social activity', 8: 'deep rest and recovery', 9: 'movement outdoors or a change of scene',
  10: 'disciplined, goal-based training', 11: 'group or social exercise', 12: 'quiet, restorative practices',
};

export function composeHealthAction(chart: BirthChart | null, date: Date = new Date()): HealthAction | null {
  if (!chart) return null;

  const dayLord = varaLord(date).lord;
  const moon = byName(chart, 'Moon');
  const saturn = byName(chart, 'Saturn');
  const mars = byName(chart, 'Mars');
  const venus = byName(chart, 'Venus');
  const jupiter = byName(chart, 'Jupiter');

  let transitMoonHouse: number | null = null;
  let transitMoonSign = moon?.sign ?? '';
  try {
    const t = computeTransits(date, chart);
    transitMoonHouse = t.moonHouse;
    transitMoonSign = t.moonSign || transitMoonSign;
  } catch {}
  const transitMoonEl = elementOfSign(transitMoonSign);

  // 1. Today's action — day-lord driven.
  const todaysAction = `${dayLord} rules today, so lean into ${DAY_ACTION[dayLord] ?? DAY_ACTION.Moon}.`;

  // 2. Avoid today — 8th-house involvement and Saturn/6th take priority over the element note.
  const eighthInvolved = moon?.house === 8 || saturn?.house === 8 || transitMoonHouse === 8;
  const recoveryDay = saturn?.house === 6 || transitMoonHouse === 6;
  const avoidToday = eighthInvolved
    ? 'Avoid intense new physical challenges today; the body is in a deeper, more sensitive phase, so gentleness beats proving anything.'
    : recoveryDay
      ? 'Avoid pushing through fatigue today; recovery matters more than intensity while the 6th house is active.'
      : `Avoid ${AVOID_BY_EL[transitMoonEl]}.`;

  // 3. Best hour — the day-lord's horā window.
  const p = powerHours(date);
  const bestHour = `${p.window} is your steadiest window today, the ${dayLord} horā; save your main effort for it.`;

  // 4. Biggest opportunity — strongest supporting placement, else today's transit Moon house.
  let biggestOpportunity: string;
  if (mars && [1, 3, 10, 11].includes(mars.house)) {
    biggestOpportunity = `Your Mars in the ${ORD[mars.house]} house makes this a strong window to push physical limits or start something demanding.`;
  } else if (venus && [1, 4, 6, 12].includes(venus.house)) {
    biggestOpportunity = 'Your Venus supports restorative care today: massage, a self-care routine, or slow, pleasurable movement.';
  } else if (jupiter && [1, 4, 5, 9, 10].includes(jupiter.house)) {
    biggestOpportunity = 'Jupiter is well placed to build capacity: a longer session or a new healthy habit can take root now.';
  } else if (transitMoonHouse) {
    biggestOpportunity = `With the Moon moving through your ${ORD[transitMoonHouse]} house today, your body responds best to ${MOON_HOUSE_BODY[transitMoonHouse]}.`;
  } else {
    biggestOpportunity = 'A steady, moderate day; consistency will do more for you than intensity.';
  }

  // 5. Risk level. HIGH is deliberately rare, only the strong structural markers: the natal
  // Moon in the 8th, or a Saturn-Moon conjunction (same house). MEDIUM covers softer stress:
  // a transient 8th-house Moon today, Saturn in a dusthana, a Moon in the 6th/12th, Saturn's
  // wider aspect on the Moon, or Mars in the 1st. Otherwise LOW.
  const moonIn8 = moon?.house === 8;
  const saturnConjMoon = !!saturn && !!moon && saturn.house === moon.house;
  const saturnAspectsMoon = !!saturn && !!moon && !!saturn.aspectsHouses?.includes(moon.house);
  let riskLevel: HealthAction['riskLevel'];
  if (moonIn8 || saturnConjMoon) {
    riskLevel = 'high';
  } else if (
    transitMoonHouse === 8 ||
    (saturn && [6, 8, 12].includes(saturn.house)) ||
    (moon && [6, 12].includes(moon.house)) ||
    saturnAspectsMoon ||
    (mars && mars.house === 1)
  ) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // 6. One decision to make — the day's tie-breaker, keyed to the risk read.
  const oneDecisionToMake =
    riskLevel === 'high'
      ? 'Rest or push? Today your body says rest first; you have nothing to prove.'
      : riskLevel === 'medium'
        ? 'Move or pause? Start gentle and let your energy tell you how far to go.'
        : 'You have energy to spend. Put it into real movement or deliberate recovery, on purpose rather than by default.';

  return { todaysAction, avoidToday, bestHour, biggestOpportunity, riskLevel, oneDecisionToMake };
}
