// src/lib/compatibilityDeep.ts
// Deep, deterministic relationship compatibility from two real birth charts (no AI). Every
// section reads real fields: both charts' planets (sign/house/element), houses derived from
// the ascendant + sign lords, per-planet D9 (navamsaSign), and each person's running Dasha.
// Copy is plain-English first, then a short "Vedic basis" line. Language is probabilistic
// ("likely", "may", "tends to"), never predictive of events, and never uses over-promising
// tier names like a "destined match".
import { BirthChart, PlanetPosition, computeAllTransits } from '@/lib/vedic';

export interface CompatibilityAnalysis {
  scoreContext: string;
  connectionType: string;
  relationshipSnapshot: { headline: string; summary: string; vedic: string };
  emotionalCompatibility: { plainEnglish: string; moonSigns: string; nakshatras: string; moonToMoon: string; emotionalNeeds: string; conflictSensitivity: string; vedic: string };
  loveAttraction: { plainEnglish: string; venus: string; mars: string; chemistry: string; affectionStyle: string; attraction: string; vedic: string };
  communication: { plainEnglish: string; mercuryAnalysis: string; directness: string; misunderstandings: string; bestPractice: string; vedic: string };
  longTermPartnership: { plainEnglish: string; seventhHouse: string; venus: string; jupiter: string; stability: string; commitmentStyle: string; frictionPoints: string; vedic: string };
  navamsaCompatibility: { plainEnglish: string; userNavamsa: string; partnerNavamsa: string; deeperNature: string; maturation: string; timeWeight: string; vedic: string };
  strengths: string[];
  growthAreas: string[];
  conflictPattern: { whatHappens: string; cycleName: string; whatWorks: string[] };
  sharedLifeAreas: { emotional: number; communication: number; romance: number; commitment: number; family: number; money: number; growth: number; scoringBasis: string };
  // One plain-English sentence per score, naming the actual driver + outcome (tap to reveal).
  lifeAreaExplanations: Record<'emotional' | 'communication' | 'romance' | 'commitment' | 'family' | 'money' | 'growth', string>;
  relationshipClimate: { userCurrentPhase: string; partnerCurrentPhase: string; mutualInfluence: string; favorableWindow: string; considerations: string[] };
  taraGuidance: string[];
}

// ---- shared derivation helpers (same pattern as the other compose* engines) ----
const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const ELEMENT = ['Fire', 'Earth', 'Air', 'Water'] as const;
type Element = (typeof ELEMENT)[number];
const elementOf = (signIndex: number): Element => ELEMENT[signIndex % 4];
const byName = (c: BirthChart, n: string): PlanetPosition | null => c.planets.find((p) => p.name === n) ?? null;
const houseLord = (c: BirthChart, h: number) => SIGN_LORD[(c.ascendant.signIndex + h - 1) % 12];
const occupants = (c: BirthChart, h: number) => c.planets.filter((p) => p.house === h);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
const firstWord = (s: string) => (s || '').trim().split(/[\s\-–(]+/)[0] || '';

const BENEFIC = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const MALEFIC = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];

// Element affinity: same element is in sync; Fire+Air and Earth+Water complement; the rest
// take more effort. Returns a base 0-100 and a plain word.
function elementPair(a: Element, b: Element): { score: number; word: string } {
  if (a === b) return { score: 88, word: 'naturally in sync' };
  const friendly = (a === 'Fire' && b === 'Air') || (a === 'Air' && b === 'Fire') || (a === 'Earth' && b === 'Water') || (a === 'Water' && b === 'Earth');
  if (friendly) return { score: 74, word: 'complementary' };
  const workable = (a === 'Fire' && b === 'Earth') || (a === 'Earth' && b === 'Fire') || (a === 'Air' && b === 'Water') || (a === 'Water' && b === 'Air');
  if (workable) return { score: 58, word: 'workable with effort' };
  return { score: 48, word: 'quite different' };
}

// A small +/- nudge from who sits in a house (benefics lift, malefics lower).
function houseTone(c: BirthChart, h: number): number {
  const occ = occupants(c, h);
  let t = 0;
  for (const p of occ) { if (BENEFIC.includes(p.name)) t += 7; if (MALEFIC.includes(p.name)) t -= 5; }
  return t;
}
const combinedHouseTone = (a: BirthChart, b: BirthChart, h: number) => houseTone(a, h) + houseTone(b, h);

const MOON_STYLE: Record<Element, string> = { Fire: 'warm and expressive', Earth: 'grounded and reliable', Air: 'light and curious', Water: 'deep and intuitive' };
const MOON_NEED: Record<Element, string> = { Fire: 'honesty and freedom', Earth: 'steady reassurance', Air: 'space and real conversation', Water: 'emotional patience' };
const MARS_DRIVE: Record<Element, string> = { Fire: 'passionate and direct', Earth: 'steady and physical', Air: 'mental and flirtatious', Water: 'intense and emotionally driven' };
const MERCURY_STYLE: Record<Element, string> = { Fire: 'direct, sometimes blunt', Earth: 'practical and concrete', Air: 'articulate and diplomatic', Water: 'indirect and feeling-led' };
const VENUS_AFFECTION: Record<string, string> = {
  Aries: 'bold, direct pursuit and spontaneity', Taurus: 'touch, loyalty, and steady presence',
  Gemini: 'words, wit, and playful talk', Cancer: 'nurturing, care, and emotional safety',
  Leo: 'warmth, generosity, and grand gestures', Virgo: 'acts of service and quiet devotion',
  Libra: 'harmony, thoughtfulness, and shared beauty', Scorpio: 'intensity, depth, and total loyalty',
  Sagittarius: 'adventure, honesty, and shared freedom', Capricorn: 'commitment, reliability, and effort',
  Aquarius: 'friendship, space, and unconventional care', Pisces: 'tenderness, empathy, and romance',
};
const SEVENTH_OCC: Record<string, string> = {
  Sun: 'a partner who is a steady, central presence', Moon: 'deep emotional attunement to a partner',
  Mars: 'passion and protectiveness, with some heat', Mercury: 'a talkative, curious partnership',
  Jupiter: 'a generous, growth-minded partnership', Venus: 'natural affection, harmony, and grace',
  Saturn: 'loyalty and endurance that deepens slowly', Rahu: 'a magnetic, unconventional pull',
  Ketu: 'a soulful, karmic, sometimes detached bond',
};

const connectionTypeFor = (score: number): string =>
  score >= 32 ? 'Exceptional Bond' : score >= 24 ? 'Strong Potential' : score >= 18 ? 'Growing Connection' : 'Karmic Learning';
const tierWord = (score: number): string =>
  score >= 32 ? 'exceptionally strong' : score >= 24 ? 'strong' : score >= 18 ? 'moderate and promising' : 'gentle, more of a learning match';

export function composeCompatibilityDeep(userChart: BirthChart, partnerChart: BirthChart, gunaScore: number): CompatibilityAnalysis {
  const uMoon = byName(userChart, 'Moon'), pMoon = byName(partnerChart, 'Moon');
  const uVenus = byName(userChart, 'Venus'), pVenus = byName(partnerChart, 'Venus');
  const uMars = byName(userChart, 'Mars'), pMars = byName(partnerChart, 'Mars');
  const uMerc = byName(userChart, 'Mercury'), pMerc = byName(partnerChart, 'Mercury');

  // Elements of the key planets (fall back to Moon element if a planet is somehow missing).
  const uMoonEl = elementOf(uMoon?.signIndex ?? 0), pMoonEl = elementOf(pMoon?.signIndex ?? 0);
  const uVenEl = elementOf(uVenus?.signIndex ?? 0), pVenEl = elementOf(pVenus?.signIndex ?? 0);
  const uMarsEl = elementOf(uMars?.signIndex ?? 0), pMarsEl = elementOf(pMars?.signIndex ?? 0);
  const uMercEl = elementOf(uMerc?.signIndex ?? 0), pMercEl = elementOf(pMerc?.signIndex ?? 0);

  const moonPair = elementPair(uMoonEl, pMoonEl);
  const venPair = elementPair(uVenEl, pVenEl);
  const mercPair = elementPair(uMercEl, pMercEl);
  const sameMoonSign = uMoon && pMoon && uMoon.signIndex === pMoon.signIndex;
  const oppMoon = uMoon && pMoon && ((uMoon.signIndex - pMoon.signIndex + 12) % 12 === 6);

  // ---- 1. Relationship Snapshot ----------------------------------------------------
  const connectionType = connectionTypeFor(gunaScore);
  const scoreContext = `${gunaScore} of 36 points is ${tierWord(gunaScore)} on the traditional Ashtakoota scale, but the score is only the starting point. The real story is in the patterns below: how you feel, talk, attract, and grow together.`;
  const easyArea = moonPair.score >= 74 ? 'emotional understanding comes easily' : venPair.score >= 74 ? 'affection and attraction flow naturally' : 'you share a genuine, workable foundation';
  const effortArea = mercPair.score < 60 ? 'communication styles differ and need patience' : moonPair.score < 60 ? 'your emotional rhythms run at different speeds' : 'staying intentional about time together takes some effort';
  const relationshipSnapshot = {
    headline: `${connectionType}: a ${tierWord(gunaScore)} match with real depth to explore`,
    summary: `Your charts show ${moonPair.word === 'quite different' ? 'two distinct emotional worlds that can still meet' : 'a genuine emotional resonance'}. The easy part: ${easyArea}. The part that takes care: ${effortArea}. This works best when affection is expressed openly and neither of you assumes the other already knows.`,
    vedic: `Based on: the ${gunaScore}/36 Ashtakoota score, both Moons (${uMoon?.sign} and ${pMoon?.sign}), the 7th house of partnership, and the Venus-Mars interaction.`,
  };

  // ---- 2. Emotional Compatibility --------------------------------------------------
  const emotionalCompatibility = {
    plainEnglish: sameMoonSign
      ? 'You feel things in a very similar way, which brings quick familiarity. The care is making sure that sameness does not turn into a shared blind spot.'
      : uMoonEl === pMoonEl
        ? `You feel things in a similar key; you are both ${MOON_STYLE[uMoonEl]} by nature, so there is quick familiarity. The care is not mistaking that sameness for reading each other's minds.`
        : `You process emotions differently. One of you leans ${MOON_STYLE[uMoonEl]}, the other ${MOON_STYLE[pMoonEl]}. Neither is wrong; they just move at different speeds.`,
    moonSigns: `Your Moon is in ${uMoon?.sign} (${uMoonEl}, ${MOON_STYLE[uMoonEl]}); their Moon is in ${pMoon?.sign} (${pMoonEl}, ${MOON_STYLE[pMoonEl]}). These two are ${moonPair.word}.`,
    nakshatras: `Emotionally your birth stars are ${userChart.nakshatra} and ${partnerChart.nakshatra}. ${sameMoonSign ? 'A shared Moon sign gives a strong instinctive read on each other.' : 'Expect to translate for each other now and then, rather than assume.'}`,
    moonToMoon: sameMoonSign ? 'Same Moon sign: you often feel the same thing at the same time.' : oppMoon ? 'Opposite Moon signs: strong pull, with a built-in push. You complete and challenge each other.' : `${moonPair.word === 'naturally in sync' || moonPair.word === 'complementary' ? 'You generally understand each other without much explaining.' : 'Understanding each other emotionally takes a little patience and translation.'}`,
    emotionalNeeds: `You most need ${MOON_NEED[uMoonEl]}; they most need ${MOON_NEED[pMoonEl]}. Naming these out loud prevents most quiet resentments.`,
    conflictSensitivity: (occupants(userChart, 8).some((p) => p.name === 'Saturn') || occupants(partnerChart, 8).some((p) => p.name === 'Saturn') || occupants(userChart, 4).some((p) => p.name === 'Saturn') || occupants(partnerChart, 4).some((p) => p.name === 'Saturn'))
      ? 'One of you can be sensitive to perceived rejection and may go quiet rather than say so. Reassurance goes a long way.'
      : 'Neither chart shows heavy emotional armoring, so repair after a rough moment tends to come fairly quickly.',
    vedic: `Based on: Moon signs (${uMoon?.sign} vs ${pMoon?.sign}, ${moonPair.word}), Moon elements, birth-star difference, and Saturn's contact with the 4th and 8th houses.`,
  };

  // ---- 3. Love & Attraction --------------------------------------------------------
  const marsVenusHarmony = elementPair(uVenEl, pMarsEl).score >= 74 || elementPair(pVenEl, uMarsEl).score >= 74;
  const loveAttraction = {
    plainEnglish: `Attraction here is ${venPair.score >= 74 ? 'easy and mutual' : venPair.score >= 58 ? 'real, and grows as you learn each other' : 'more of a slow burn than instant fireworks'}. You are drawn to different things in love, which keeps it interesting.`,
    venus: `Your Venus is in ${uVenus?.sign} (house ${uVenus?.house}); theirs in ${pVenus?.sign} (house ${pVenus?.house}). Venus shows what each of you finds beautiful and how you give affection.`,
    mars: `Your Mars is ${MARS_DRIVE[uMarsEl]}; theirs is ${MARS_DRIVE[pMarsEl]}. Mars is the spark and the drive behind desire.`,
    chemistry: marsVenusHarmony ? 'Romantic chemistry is warm and playful; the pull is mutual and fairly effortless.' : venPair.score >= 58 ? 'Chemistry is steady and deepens with familiarity rather than exploding on day one.' : 'Chemistry needs a little tending; it rewards patience and shared experiences over intensity.',
    affectionStyle: `You tend to show love through ${VENUS_AFFECTION[uVenus?.sign ?? 'Libra'] ?? 'warmth and care'}; they show it through ${VENUS_AFFECTION[pVenus?.sign ?? 'Libra'] ?? 'warmth and care'}. Learning each other's love language matters more than matching it.`,
    attraction: (occupants(userChart, 5).length || occupants(partnerChart, 5).length) ? 'With planets in the 5th house of romance, playfulness and creative dates keep the spark alive.' : 'Romance grows best here through shared plans and small, consistent gestures rather than only grand ones.',
    vedic: `Based on: Venus placements (${uVenus?.sign}/${pVenus?.sign}), Mars drive, the Venus-Mars cross-aspect, and the 5th house of romance.`,
  };

  // ---- 4. Communication ------------------------------------------------------------
  const communication = {
    plainEnglish: mercPair.score >= 74 ? 'You tend to think and talk on the same wavelength, so conversation is one of your easiest strengths.' : 'You think and talk differently. One of you gets to the point; the other circles it first. Both are valid; the mismatch just needs awareness.',
    mercuryAnalysis: `Your Mercury is in ${uMerc?.sign} (${MERCURY_STYLE[uMercEl]}); theirs in ${pMerc?.sign} (${MERCURY_STYLE[pMercEl]}).`,
    directness: uMercEl === pMercEl ? 'You are similarly direct (or similarly indirect), so intent rarely gets lost.' : `One of you is more ${MERCURY_STYLE[uMercEl].includes('direct') || uMercEl === 'Air' ? 'direct' : 'measured'}, the other more ${MERCURY_STYLE[pMercEl].includes('direct') || pMercEl === 'Air' ? 'direct' : 'measured'}. Match your pace to the topic, not your habit.`,
    misunderstandings: mercPair.score < 60 ? 'Most friction here starts as a misread tone, not a real disagreement. Assume good intent before reacting.' : 'Misunderstandings are usually quick to clear once you say the quiet part out loud.',
    bestPractice: (uMercEl === 'Water' || pMercEl === 'Water' || mercPair.score < 60) ? 'Talk important things face to face, not over text, where tone gets lost. Give the slower processor time to answer.' : 'Keep decisions verbal and specific; a quick check-in beats assuming you both remember it the same way.',
    vedic: `Based on: Mercury signs (${uMerc?.sign} vs ${pMerc?.sign}, ${mercPair.word}) and the 3rd house of communication.`,
  };

  // ---- 5. Long-Term Partnership ----------------------------------------------------
  const uSeventh = occupants(userChart, 7), pSeventh = occupants(partnerChart, 7);
  const seventhDriver = uSeventh[0]?.name ?? pSeventh[0]?.name ?? houseLord(userChart, 7);
  const saturnInSeventh = uSeventh.some((p) => p.name === 'Saturn') || pSeventh.some((p) => p.name === 'Saturn');
  const jupInSeventh = uSeventh.some((p) => p.name === 'Jupiter') || pSeventh.some((p) => p.name === 'Jupiter');
  const longTermPartnership = {
    plainEnglish: saturnInSeventh ? 'This is built to last, though it may feel more like duty and steadiness before it feels like romance. What starts practical tends to deepen into real devotion.' : jupInSeventh ? 'The long-term potential here is genuinely strong; there is a natural sense of growing together rather than apart.' : 'The foundation for a long partnership is here; it strengthens as you build shared routines and weather a few storms together.',
    seventhHouse: `The 7th house of partnership shows ${SEVENTH_OCC[seventhDriver] ?? 'a steady, workable bond'}.`,
    venus: `Venus (loyalty and warmth) sits in ${uVenus?.sign} for you and ${pVenus?.sign} for them, coloring how devotion is expressed.`,
    jupiter: jupInSeventh ? 'Jupiter touching the 7th is a classic marker of growth, generosity, and good faith in partnership.' : 'Jupiter supports the bond best when you keep learning and growing side by side rather than in parallel.',
    stability: (byName(userChart, 'Saturn')?.house === 7 || byName(partnerChart, 'Saturn')?.house === 7 || moonPair.score >= 74) ? 'Stability is a real strength; once committed, you both tend to stay and work things through.' : 'Stability comes from intention here more than from autopilot; the reward matches the effort.',
    commitmentStyle: saturnInSeventh ? 'Commitment is taken seriously and slowly; promises made here are meant.' : 'Commitment tends to feel warm and natural rather than heavy.',
    frictionPoints: saturnInSeventh ? 'Early coolness or a duty-first tone can read as distance; name it so it does not calcify.' : 'Watch for taking the good foundation for granted; partnerships fade from neglect more than from conflict.',
    vedic: `Based on: 7th house occupants (${uSeventh.map((p) => p.name).join(', ') || 'none directly'} / ${pSeventh.map((p) => p.name).join(', ') || 'none directly'}), Venus, Jupiter's contact with the 7th, and Saturn's role.`,
  };

  // ---- 6. Navamsa / D9 Compatibility -----------------------------------------------
  const uD9Venus = uVenus?.navamsaSign, pD9Venus = pVenus?.navamsaSign;
  const uD9Moon = uMoon?.navamsaSign, pD9Moon = pMoon?.navamsaSign;
  const d9MoonPair = (uD9Moon && pD9Moon) ? elementPair(elementOf(['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(uD9Moon)), elementOf(['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(pD9Moon))) : moonPair;
  const d9Deeper = d9MoonPair.score >= moonPair.score;
  const navamsaCompatibility = {
    plainEnglish: `The Navamsa (D9) is the deeper, private layer of a relationship, the one that shows up after the early glow. Here, your bond ${d9Deeper ? 'reads warmer and steadier than the surface suggests' : 'asks for a little more conscious care than the surface suggests'}.`,
    userNavamsa: `Your D9 rising is ${userChart.ascendant.navamsaSign}, with Venus in ${uD9Venus} and Moon in ${uD9Moon}.`,
    partnerNavamsa: `Their D9 rising is ${partnerChart.ascendant.navamsaSign}, with Venus in ${pD9Venus} and Moon in ${pD9Moon}.`,
    deeperNature: d9Deeper ? 'At the soul level there is more mutual respect and ease than first meetings reveal.' : 'At the soul level the connection is real but rewards patience; depth is earned here, not automatic.',
    maturation: 'As the relationship matures, the D9 layer becomes more of what you actually live day to day, so tending it now pays off later.',
    timeWeight: d9Deeper ? 'This bond tends to get easier and richer with time.' : 'This bond tends to need ongoing, conscious effort, and repays it.',
    vedic: `Based on: D9 (Navamsa) rising signs (${userChart.ascendant.navamsaSign}/${partnerChart.ascendant.navamsaSign}) and the D9 Moon and Venus placements.`,
  };

  // ---- 7. Strengths (chart-derived) ------------------------------------------------
  const strengths = uniq([
    moonPair.score >= 74 ? `Emotional resonance: both Moons (${uMoonEl}/${pMoonEl}) are ${moonPair.word}, giving secure, easy attachment.` : '',
    venPair.score >= 74 ? 'Natural affection: your Venus signs harmonize, so warmth and attraction come easily.' : '',
    jupInSeventh ? 'Jupiter touches the 7th house, a classic blessing for growth and good faith in partnership.' : '',
    (occupants(userChart, 7).some((p) => BENEFIC.includes(p.name)) || occupants(partnerChart, 7).some((p) => BENEFIC.includes(p.name))) ? 'A benefic in the 7th house supports a genuinely kind, cooperative partnership.' : '',
    gunaScore >= 24 ? `A solid ${gunaScore}/36 traditional score gives a strong baseline of compatibility.` : '',
    mercPair.score >= 74 ? 'You communicate on the same wavelength, which resolves most friction before it grows.' : '',
  ]);
  if (strengths.length < 3) strengths.push('You each bring something the other lacks, which is its own kind of strength when you lean into it.');

  // ---- 8. Growth Areas (framed as understanding, not problems) ---------------------
  const growthAreas = uniq([
    mercPair.score < 60 ? 'Different communication speeds: one gets to the point, one needs to circle it. Give each other the pace you each need.' : '',
    moonPair.score < 60 ? 'Different emotional rhythms: one may want reassurance while the other wants space. Name the need instead of expecting it to be read.' : '',
    (occupants(userChart, 8).length || occupants(partnerChart, 8).length) ? 'Sensitive topics (intimacy, shared money, trust) run deep here and deserve unhurried, honest conversations.' : '',
    saturnInSeventh ? 'An early duty-first tone can feel cool; let warmth in on purpose so it does not read as distance.' : '',
    (uVenEl !== pVenEl) ? 'You value and show love differently; treat that as two languages to learn, not a mismatch to fix.' : '',
  ]);
  if (growthAreas.length < 2) growthAreas.push('Complacency is the main risk of a good match; keep choosing each other on ordinary days.');

  // ---- 9. Conflict Pattern ---------------------------------------------------------
  // Base-form verbs so they read correctly after "you tend to ..." and "they ...".
  const styleFor = (el: Element) => el === 'Fire' ? 'confront it head-on' : el === 'Water' ? 'go quiet and withdraw' : el === 'Earth' ? 'dig in and wait it out' : 'talk it all through';
  const uStyle = styleFor(uMarsEl), pStyle = styleFor(pMarsEl);
  const oneWithdraws = (uMarsEl === 'Water') !== (pMarsEl === 'Water');
  const cycleName = oneWithdraws ? 'the pursue-and-withdraw cycle' : uMarsEl === pMarsEl && uMarsEl === 'Fire' ? 'the spark-and-clash cycle' : uMarsEl === pMarsEl && uMarsEl === 'Water' ? 'the silent-standoff cycle' : uMarsEl === pMarsEl && uMarsEl === 'Earth' ? 'the stubborn-standoff cycle' : 'the over-analyze cycle';
  const conflictPattern = {
    whatHappens: `Under stress, you tend to ${uStyle} while they ${pStyle}. When those two responses meet, it can settle into ${cycleName}.`,
    cycleName: cycleName.replace(/^the /, '').replace(/ cycle$/, ' pattern'),
    whatWorks: uniq([
      oneWithdraws ? 'When one goes quiet, that is processing, not rejection. Agree on a short pause, then a set time to reconnect.' : 'Slow the first ten minutes down; heat cools faster than either of you expects.',
      'Swap accusations ("you always") for the actual need underneath ("I felt unseen when...").',
      moonPair.score < 60 ? 'Reassure first, solve second; the feeling has to settle before the fix can land.' : 'Name one thing you appreciate before raising the hard thing; it keeps the door open.',
    ]),
  };

  // ---- 10. Shared Life Areas (documented 0-100 scoring) ----------------------------
  const emotional = clamp(moonPair.score + combinedHouseTone(userChart, partnerChart, 4) / 2);
  const communicationScore = clamp(mercPair.score + combinedHouseTone(userChart, partnerChart, 3) / 2);
  const romance = clamp(venPair.score + combinedHouseTone(userChart, partnerChart, 5) / 2);
  const commitment = clamp((elementPair(elementOf(byName(userChart, houseLord(userChart, 7)) ? byName(userChart, houseLord(userChart, 7))!.signIndex : 0), elementOf(byName(partnerChart, houseLord(partnerChart, 7)) ? byName(partnerChart, houseLord(partnerChart, 7))!.signIndex : 0)).score) + combinedHouseTone(userChart, partnerChart, 7) / 2 + (jupInSeventh ? 8 : 0));
  const family = clamp((emotional + Math.max(0, 60 + combinedHouseTone(userChart, partnerChart, 4) + combinedHouseTone(userChart, partnerChart, 10) / 2)) / 2);
  const money = clamp(58 + combinedHouseTone(userChart, partnerChart, 2) + combinedHouseTone(userChart, partnerChart, 11) / 2 + ((byName(userChart, 'Jupiter')?.house === 2 || byName(userChart, 'Jupiter')?.house === 11) ? 6 : 0));
  const growthScore = clamp(58 + combinedHouseTone(userChart, partnerChart, 9) + (firstWord(userChart.currentDasha) === firstWord(partnerChart.currentDasha) ? 8 : 0));
  const sharedLifeAreas = {
    emotional, communication: communicationScore, romance, commitment, family, money, growth: growthScore,
    scoringBasis: 'Each score is 0-100, derived from element harmony of the ruling planets plus a nudge for benefic or malefic planets in the relevant house. Emotional = Moon element match + 4th-house tone; Communication = Mercury match + 3rd house; Romance = Venus match + 5th house; Commitment = 7th-lord match + 7th house + Jupiter; Family = emotional blended with the 4th and 10th; Money = 2nd and 11th house tone plus Jupiter; Growth = 9th house tone plus a bonus when both run the same Dasha lord. These are compatibility tendencies, not guarantees.',
  };

  // One-sentence "why this number" per score — the actual driver + a band-based outcome, so a
  // tap answers the immediate "why is communication 46?" question. Deterministic, no generics.
  const band = (s: number) => (s >= 78 ? 'runs high' : s >= 64 ? 'is solid' : s >= 50 ? 'is mixed' : 'needs building');
  const jupMoney = byName(userChart, 'Jupiter')?.house === 2 || byName(userChart, 'Jupiter')?.house === 11;
  const sameDasha = firstWord(userChart.currentDasha) === firstWord(partnerChart.currentDasha);
  const lifeAreaExplanations = {
    emotional: `Both Moons are ${moonPair.word}, so emotional understanding ${band(emotional)}.`,
    communication: `Mercury styles are ${mercPair.word}, so everyday communication ${band(communicationScore)}.`,
    romance: `Venus signs are ${venPair.word}, so romantic chemistry ${band(romance)}.`,
    commitment: `${jupInSeventh ? 'Jupiter blesses the 7th house of partnership, so ' : 'From your 7th-house footing, '}long-term commitment ${band(commitment)}.`,
    family: `Your emotional match blended with the home and public houses (4th and 10th) means shared family life ${band(family)}.`,
    money: `The shared-resources houses, the 2nd and 11th${jupMoney ? " with Jupiter's help" : ''}, mean money harmony ${band(money)}.`,
    growth: `The 9th house of shared meaning${sameDasha ? ', plus a shared Dasha chapter,' : ''} means growing together ${band(growthScore)}.`,
  };

  // ---- 11. Relationship Climate (both Dashas + a modest live transit note) ---------
  const uDashaLord = firstWord(userChart.currentDasha), pDashaLord = firstWord(partnerChart.currentDasha);
  const DASHA_THEME: Record<string, string> = {
    Sun: 'visibility and identity', Moon: 'feeling, care, and home', Mars: 'drive, action, and initiative',
    Mercury: 'learning, ideas, and communication', Jupiter: 'expansion, optimism, and growth',
    Venus: 'love, comfort, and relationships', Saturn: 'discipline, patience, and building',
    Rahu: 'ambition and reaching for the new', Ketu: 'introspection and letting go',
  };
  let jupHouseUser: number | null = null;
  try { jupHouseUser = computeAllTransits(userChart, new Date()).find((t) => t.name === 'Jupiter')?.house ?? null; } catch { jupHouseUser = null; }
  const favorable = (jupHouseUser === 5 || jupHouseUser === 7 || jupHouseUser === 11)
    ? 'Jupiter is currently moving through a relationship-friendly part of your chart, so this phase may favor warmth, commitment talks, and shared plans.'
    : (uDashaLord === 'Venus' || pDashaLord === 'Venus' || uDashaLord === 'Jupiter' || pDashaLord === 'Jupiter')
      ? 'A Venus or Jupiter period is running for one of you, which tends to soften and open the relationship. A good stretch for honest, hopeful conversations.'
      : 'This is more of a build-and-tend phase than a dramatic one; steady, ordinary care compounds well right now.';
  const relationshipClimate = {
    userCurrentPhase: `You are in a ${uDashaLord} Mahadasha, a chapter of ${DASHA_THEME[uDashaLord] ?? 'growth and change'}.`,
    partnerCurrentPhase: `They are in a ${pDashaLord} Mahadasha, a chapter of ${DASHA_THEME[pDashaLord] ?? 'growth and change'}.`,
    mutualInfluence: uDashaLord === pDashaLord
      ? `You are both in a ${uDashaLord} period, so you are moving through similar life themes at once, which makes it easy to understand where the other is.`
      : `You are in different life chapters right now (${DASHA_THEME[uDashaLord] ?? 'change'} for you, ${DASHA_THEME[pDashaLord] ?? 'change'} for them). One of you may be more focused inward or on work while the other reaches outward; naming that prevents mismatched expectations.`,
    favorableWindow: favorable,
    considerations: uniq([
      'Talk openly about what each of you needs from this particular season, not the relationship in general.',
      (uDashaLord === 'Saturn' || pDashaLord === 'Saturn') ? 'A Saturn period asks for patience; if one of you feels heavier or more serious now, meet it with steadiness rather than pressure.' : '',
      'Timing here is about tendencies, not fixed events; use it to choose good moments, not to predict outcomes.',
    ]),
  };

  // ---- 12. Tara Guidance (3 specific, drawn from the analysis) ----------------------
  const taraGuidance = uniq([
    communication.bestPractice,
    oneWithdraws ? 'When one of you needs quiet, treat it as processing time, not distance, and set a time to circle back.' : 'Reassure before you problem-solve; the feeling has to settle before the fix can land.',
    (jupHouseUser === 5 || jupHouseUser === 7 || jupHouseUser === 11) ? 'This phase leans favorable for the bigger conversations; it is a good window to talk about where you are headed together.' : 'Small, consistent gestures matter more than grand ones for this pairing; let ordinary days do the work.',
  ]).slice(0, 3);

  return {
    scoreContext, connectionType, relationshipSnapshot, emotionalCompatibility, loveAttraction,
    communication, longTermPartnership, navamsaCompatibility, strengths, growthAreas,
    conflictPattern, sharedLifeAreas, lifeAreaExplanations, relationshipClimate, taraGuidance,
  };
}
