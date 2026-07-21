// src/data/remedies.ts
// Traditional remedy lookup tables for the Personal Remedies report (deterministic, no AI).
// Framed as tradition and "traditionally associated" — supportive, non-fatalistic, never
// prescriptive or medical. Gemstones are optional tradition, never pressured.

export type GrahaRemedy = {
  mantra: string;
  mantraMeaning: string;
  day: string;
  color: string;
  donation: string;
  gemstone: string;
  metal: string;
  finger: string;
  seva: string;
  micro: string;      // one small day-of practice
};

export const GRAHA_REMEDY: Record<string, GrahaRemedy> = {
  Sun: {
    mantra: 'Oṃ Sūryāya Namaḥ',
    mantraMeaning: 'salutations to the Sun — source of vitality, confidence, and clarity',
    day: 'Sunday', color: 'orange / copper-red',
    donation: 'wheat, jaggery, or copper to those in need on a Sunday',
    gemstone: 'Ruby', metal: 'gold', finger: 'ring finger',
    seva: 'offer water to the rising sun and honour your father or elders',
    micro: 'greet the morning light and set one clear intention for the day',
  },
  Moon: {
    mantra: 'Oṃ Chandrāya Namaḥ',
    mantraMeaning: 'salutations to the Moon — source of calm, care, and nourishment',
    day: 'Monday', color: 'white / silver',
    donation: 'rice, milk, or white cloth on a Monday',
    gemstone: 'Pearl', metal: 'silver', finger: 'little finger',
    seva: 'offer water or milk, and care for your mother or an elder',
    micro: 'take a few genuinely quiet minutes to rest and feel',
  },
  Mars: {
    mantra: 'Oṃ Maṅgalāya Namaḥ',
    mantraMeaning: 'salutations to Mars — source of courage, energy, and focus',
    day: 'Tuesday', color: 'red',
    donation: 'red lentils (masoor) or jaggery on a Tuesday',
    gemstone: 'Red Coral', metal: 'copper or gold', finger: 'ring finger',
    seva: 'physical service, or supporting the disciplined and the brave',
    micro: 'channel your energy into one focused physical effort',
  },
  Mercury: {
    mantra: 'Oṃ Budhāya Namaḥ',
    mantraMeaning: 'salutations to Mercury — source of intellect and clear speech',
    day: 'Wednesday', color: 'green',
    donation: 'green gram (moong) or support for a student’s education on a Wednesday',
    gemstone: 'Emerald', metal: 'gold', finger: 'little finger',
    seva: 'help someone learn, or share knowledge generously',
    micro: 'learn or write one small, clear thing',
  },
  Jupiter: {
    mantra: 'Oṃ Gurave Namaḥ',
    mantraMeaning: 'salutations to Jupiter (the Guru) — source of wisdom and grace',
    day: 'Thursday', color: 'yellow / gold',
    donation: 'turmeric, yellow lentils (chana dal), or support for a teacher on a Thursday',
    gemstone: 'Yellow Sapphire', metal: 'gold', finger: 'index finger',
    seva: 'support a teacher, a student, or a place of learning',
    micro: 'read or reflect on something meaningful',
  },
  Venus: {
    mantra: 'Oṃ Śukrāya Namaḥ',
    mantraMeaning: 'salutations to Venus — source of love, beauty, and harmony',
    day: 'Friday', color: 'white / pink',
    donation: 'white sweets, sugar, or something beautiful to someone without on a Friday',
    gemstone: 'Diamond (or white sapphire)', metal: 'silver or platinum', finger: 'middle finger',
    seva: 'create a little beauty, or care tenderly for a relationship',
    micro: 'make one small act of beauty, art, or kindness',
  },
  Saturn: {
    mantra: 'Oṃ Śanaischarāya Namaḥ',
    mantraMeaning: 'salutations to Saturn — source of patience, structure, and enduring strength',
    day: 'Saturday', color: 'deep blue / black',
    donation: 'black sesame (til), iron, or support for labourers and the elderly on a Saturday',
    gemstone: 'Blue Sapphire', metal: 'iron or steel', finger: 'middle finger',
    seva: 'serve the elderly, workers, or those the world overlooks',
    micro: 'complete one disciplined, unglamorous task fully',
  },
  Rahu: {
    mantra: 'Oṃ Rāhave Namaḥ',
    mantraMeaning: 'salutations to Rahu — teacher of worldly wisdom and reinvention',
    day: 'Saturday', color: 'smoky grey / mixed',
    donation: 'brown or grey blankets, or support for the marginalised',
    gemstone: 'Hessonite (Gomed)', metal: 'silver or mixed', finger: 'middle finger',
    seva: 'help outsiders, migrants, or the overlooked',
    micro: 'ground one big ambition into a single concrete step',
  },
  Ketu: {
    mantra: 'Oṃ Ketave Namaḥ',
    mantraMeaning: 'salutations to Ketu — guide toward detachment and inner freedom',
    day: 'Tuesday', color: 'grey / earth tones',
    donation: 'multicoloured cloth, or support for spiritual seekers',
    gemstone: "Cat's Eye (Lehsunia)", metal: 'silver or mixed', finger: 'middle finger',
    seva: 'quietly support spiritual or charitable work',
    micro: 'spend a few minutes in stillness, letting something go',
  },
};

// ---- Sade Sati / Dhaiyya phase copy (Saturn relative to natal Moon sign) ----
export const SADE_SATI: Record<string, { title: string; body: string }> = {
  rising: {
    title: 'Sade Sati · Rising phase',
    body: 'Saturn is in the sign just before your Moon — the first of the three phases. Life gently asks you to slow down, simplify, and prepare. Tend your health and rest, release what has grown heavy, and let this be a season of quiet groundwork rather than push.',
  },
  peak: {
    title: 'Sade Sati · Peak phase',
    body: 'Saturn transits your Moon sign — the central phase, when the mind feels the weight most. This is a maturing, foundation-laying time. Steady routines, patience, and honest simplicity carry you through, and what you build now tends to last.',
  },
  setting: {
    title: 'Sade Sati · Setting phase',
    body: 'Saturn has moved into the sign after your Moon — the final phase, and the pressure begins to ease. Consolidate what you have built and slowly rebuild your resources with the wisdom this cycle has given you.',
  },
  dhaiyya4: {
    title: 'Small Panoti · Dhaiyya (4th)',
    body: 'Saturn transits the fourth from your Moon — a shorter 2½-year influence on home and heart. Tend your inner security and domestic life with patience; it is a time to strengthen your roots.',
  },
  dhaiyya8: {
    title: 'Small Panoti · Dhaiyya (8th)',
    body: 'Saturn transits the eighth from your Moon — a shorter 2½-year influence on depth and change. Meet it with steadiness and inner work; it favours transformation over sudden moves.',
  },
  clear: {
    title: 'Sade Sati · Clear',
    body: 'You are not currently in Sade Sati or a Dhaiyya — Saturn is not pressuring your Moon right now. This is naturally a lighter period for the mind; a good time to build steadily while the skies are kind.',
  },
};

export const SATURN_SUPPORT =
  'Traditional support during Saturn’s influence: chant Oṃ Śanaischarāya Namaḥ, serve the elderly and workers, offer black sesame on Saturdays, and above all keep patient, humble routines — Saturn rewards steadiness, not struggle.';

// ---- chart-condition copy (only rendered when the engine confirms it) ----
export const CONDITION_TEXT = {
  mangalPresent:
    'Mars sits in a house traditionally linked to Maṅgal Dosha. In balanced terms this simply means your relationship energy runs strong and passionate. Classically it is read only alongside a partner’s chart, and it naturally softens with age and with a partner of matching temperament. Traditional support: honour Mars (Tuesdays, red lentils, devotion to Hanuman) and lead with patience in close relationships.',
  mangalAbsent:
    'No Maṅgal Dosha indicated — Mars sits outside the houses traditionally associated with it.',
  kalaSarpaPresent:
    'A Kāla Sarpa pattern — all your planets fall to one side of the Rahu–Ketu axis. Traditionally this is read as a life of concentrated intensity and karmic focus rather than misfortune: energy gathers and then releases in surges. Support: honour Rahu and Ketu, keep a steady spiritual practice, and pace your ambitions.',
  kalaSarpaAbsent:
    'No Kāla Sarpa pattern — your planets sit on both sides of the nodal axis.',
  grahanAbsent:
    'No Grahaṇ (eclipse) combination between your luminaries and the nodes.',
};

// A Grahan (eclipse) combination — luminary + node together. `luminary` and `node` fill in.
export const grahanText = (luminary: string, node: string, house: number): string =>
  `A Grahaṇ (eclipse) combination — your ${luminary} joins ${node} in the ${ord(house)} house. Traditionally this deepens intuition and intensity, and asks for grounding and clear boundaries. Support: honour both the ${luminary} and ${node}, and protect your rest and steady routines.`;

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
function ord(n: number): string { return ORD[n] || `${n}th`; }

// ---- weekday → ruling graha (for the weekly rhythm grid) ----
export const WEEKDAY_LORD: { day: string; graha: string }[] = [
  { day: 'Sunday', graha: 'Sun' },
  { day: 'Monday', graha: 'Moon' },
  { day: 'Tuesday', graha: 'Mars' },
  { day: 'Wednesday', graha: 'Mercury' },
  { day: 'Thursday', graha: 'Jupiter' },
  { day: 'Friday', graha: 'Venus' },
  { day: 'Saturday', graha: 'Saturn' },
];
