// src/lib/composePlanetDetails.ts
// Per-planet "tap for details" reading: eight life-area fields derived deterministically from
// the planet's real sign, house, dignity, and retrograde state, plus its live transit (no AI).
// Remedies are given as informational cultural associations, not prescriptions, in keeping
// with the app's non-doom, non-directive register.
import { BirthChart, PlanetPosition, computeAllTransits } from '@/lib/vedic';

export interface PlanetDetails {
  career: string;
  marriage: string;
  money: string;
  health: string;
  strength: string;
  weakness: string;
  remedies: string;
  currentTransit: string;
}

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const HOUSE_AREA: Record<number, string> = {
  1: 'self and vitality', 2: 'wealth and speech', 3: 'courage and communication', 4: 'home and heart',
  5: 'creativity and romance', 6: 'work and health', 7: 'partnership', 8: 'transformation and depth',
  9: 'fortune and dharma', 10: 'career and standing', 11: 'gains and networks', 12: 'release and the inner life',
};

const CAREER: Record<string, string> = {
  Sun: 'leadership, authority, government, or health and service roles',
  Moon: 'public-facing, caregiving, hospitality, or work with the public',
  Mars: 'engineering, sport, surgery, defense, or anything competitive',
  Mercury: 'communication, writing, trade, analysis, or teaching',
  Jupiter: 'teaching, law, advising, finance, or guidance',
  Venus: 'art, design, beauty, relationships, or hospitality',
  Saturn: 'long-game institutions, structure, labor, or steady service',
  Rahu: 'unconventional, technical, foreign, or high-visibility ventures',
  Ketu: 'research, healing, spirituality, or specialist niches',
};
const MARRIAGE: Record<string, string> = {
  Sun: 'a proud, steady partner; ego needs managing so warmth can lead',
  Moon: 'deep emotional needs; you seek security and real care in a partner',
  Mars: 'passion and drive, with friction if independence is squeezed',
  Mercury: 'a talkative, curious bond built on words and shared ideas',
  Jupiter: 'a generous, growth-minded partnership, often with a wise partner',
  Venus: 'natural warmth and magnetism; you draw affection and value harmony',
  Saturn: 'loyalty and endurance; commitment is serious and deepens slowly',
  Rahu: 'an unconventional or cross-cultural attraction, intense but idealizing',
  Ketu: 'a karmic, soulful bond that can feel fated yet a little detached',
};
const MONEY: Record<string, string> = {
  Sun: 'earnings through position and authority; steady when you feel confident',
  Moon: 'cash flow that ebbs and flows with mood and the public; saving needs intent',
  Mars: 'money through effort, property, or bold moves; watch impulsive spending',
  Mercury: 'income through skills, trade, and communication; often many small streams',
  Jupiter: 'wealth that flows with generosity and good faith; fortune favors the fair',
  Venus: 'money through partnerships, beauty, and comfort; you enjoy spending well',
  Saturn: 'slow, durable accumulation; discipline builds lasting security',
  Rahu: 'unusual or speculative paths with big swings, so caution genuinely pays',
  Ketu: 'finances best kept simple; detachment serves you better than grasping',
};
// Reflective wellness temperament per graha (traditional associations, framed as lifestyle
// invitations rather than physical claims). Not medical or diagnostic.
const HEALTH: Record<string, string> = {
  Sun: 'vitality and steady energy; watch overexertion and pride-driven stress',
  Moon: 'closely tied to sleep, mood, and routine; steadiness in these supports the rest',
  Mars: 'high drive; pacing yourself matters so intensity does not tip into strain',
  Mercury: 'a busy, active mind; a calmer pace and real rest tend to help you most',
  Jupiter: 'generally robust; moderation serves you better than over-indulgence',
  Venus: 'comfort and balance; keeping sweetness and rest in proportion serves you',
  Saturn: 'stamina over time; prevention, patience, and rest matter most',
  Rahu: 'when things feel scattered, grounding and routine steady you',
  Ketu: 'calm and simplicity serve you; a steady routine settles the restlessness',
};
const STRENGTH_GIFT: Record<string, string> = {
  Sun: 'natural leadership, courage, and clarity of purpose',
  Moon: 'emotional intelligence and a real gift for care',
  Mars: 'drive, courage, and the will to act',
  Mercury: 'sharp thinking and a way with words',
  Jupiter: 'wisdom, optimism, and generosity',
  Venus: 'magnetism, grace, and artistic sense',
  Saturn: 'discipline, patience, and staying power',
  Rahu: 'ambition and the nerve to break new ground',
  Ketu: 'insight, focus, and a knack for the essential',
};
const WEAKNESS_SHADOW: Record<string, string> = {
  Sun: 'pride or the need to be right can isolate you',
  Moon: 'moods and over-sensitivity can cloud judgment',
  Mars: 'impatience and anger can burn bridges',
  Mercury: 'overthinking and second-guessing delay decisions',
  Jupiter: 'over-optimism or excess can overreach',
  Venus: 'over-indulgence or people-pleasing can drain you',
  Saturn: 'heaviness, fear, or self-doubt can slow you',
  Rahu: 'obsession, illusion, and over-reaching',
  Ketu: 'detachment or scattered focus can leave things unfinished',
};
// Informational cultural associations (NOT prescriptions): mantra, stone, and supportive act.
const REMEDY: Record<string, string> = {
  Sun: 'the Surya mantra (Om Suryaya Namah), ruby, offering water at dawn, and honoring a father figure',
  Moon: 'the Chandra mantra (Om Chandraya Namah), pearl, honoring one\'s mother, and calming time near water',
  Mars: 'the Mangala mantra (Om Angarakaya Namah), red coral, physical discipline, and generosity with red items',
  Mercury: 'the Budha mantra (Om Budhaya Namah), emerald, study, and supporting students or clear communication',
  Jupiter: 'the Guru mantra (Om Brihaspataye Namah), yellow sapphire, learning, and acts of generosity',
  Venus: 'the Shukra mantra (Om Shukraya Namah), diamond, art and beauty, and honoring partnerships',
  Saturn: 'the Shani mantra (Om Shanaischaraya Namah), blue sapphire, service to elders and workers, and steady routine',
  Rahu: 'the Rahu mantra (Om Rahave Namah), hessonite, and grounding, honest routines',
  Ketu: 'the Ketu mantra (Om Ketave Namah), cat\'s eye, meditation, and spiritual study',
};

const EXALT: Record<string, string> = { Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra' };
const DEBIL: Record<string, string> = { Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces', Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries' };
const OWN: Record<string, string[]> = { Sun: ['Leo'], Moon: ['Cancer'], Mars: ['Aries', 'Scorpio'], Mercury: ['Gemini', 'Virgo'], Jupiter: ['Sagittarius', 'Pisces'], Venus: ['Taurus', 'Libra'], Saturn: ['Capricorn', 'Aquarius'] };
const STRONG_HOUSES = [1, 4, 5, 7, 9, 10, 11];
const DUSTHANA = [6, 8, 12];

export function composePlanetDetails(chart: BirthChart, planetName: string, date: Date = new Date()): PlanetDetails | null {
  const pl = chart.planets.find((p) => p.name === planetName);
  if (!pl) return null;
  const p = pl.name;
  const sign = pl.sign;
  const house = pl.house;
  const area = HOUSE_AREA[house] ?? 'this area of life';

  const career = `${cap(CAREER[p] ?? 'a distinct professional path')}. In ${sign}, in your ${ORD[house]} house of ${area}, that is where it most plays out.`;
  const marriage = `${cap(MARRIAGE[p] ?? 'its own relational tone')}.${house === 7 ? ' It sits in your 7th house of partnership, so it speaks directly to marriage.' : ''}`;
  const money = `${cap(MONEY[p] ?? 'a steady approach to resources')}.${[2, 11].includes(house) ? ` Its place in your ${ORD[house]} house of ${area} ties it directly to your finances.` : ''}`;
  const health = `${cap(HEALTH[p] ?? 'a balanced constitution')}.${[1, 6, 8].includes(house) ? ` Its ${ORD[house]}-house placement makes this worth real, gentle attention.` : ''}`;

  // Strength: exalted / own sign / strong house, else the planet's core gift.
  const gift = STRENGTH_GIFT[p] ?? 'its own quiet strength';
  let strength: string;
  if (EXALT[p] === sign) strength = `${p} is exalted in ${sign}, one of its strongest placements, giving ${gift}.`;
  else if (OWN[p]?.includes(sign)) strength = `${p} sits in its own sign ${sign}, comfortable and strong, giving ${gift}.`;
  else if (STRONG_HOUSES.includes(house)) strength = `Well placed in your ${ORD[house]} house, ${p} lends ${gift}.`;
  else strength = `${cap(gift)} is ${p}'s gift here, best expressed with conscious effort.`;

  // Weakness: debilitated / retrograde / dusthana, else the planet's shadow.
  const shadow = WEAKNESS_SHADOW[p] ?? 'its energy can scatter without focus';
  let weakness: string;
  if (DEBIL[p] === sign) weakness = `In ${sign}, ${p} is debilitated and works against the grain: ${shadow}. It strengthens with conscious effort.`;
  else if (pl.retrograde) weakness = `Retrograde here, ${p} turns inward: ${shadow}, so you tend to rework its lessons before acting.`;
  else if (DUSTHANA.includes(house)) weakness = `In the ${ORD[house]} house, ${p} asks for care: ${shadow}.`;
  else weakness = `The shadow to watch with ${p}: ${shadow}.`;

  const remedies = `Traditionally associated supports (offered for context, not as prescriptions): ${REMEDY[p] ?? 'steady, mindful routine'}.`;

  // Current transit: where the planet is in the live sky, and the natal house it moves through.
  let currentTransit = `${p}'s current position is quietly shaping your ${area}.`;
  try {
    const t = computeAllTransits(chart, date).find((x) => x.name === p);
    if (t) {
      const th = HOUSE_AREA[t.house] ?? 'this area of life';
      currentTransit = `Right now ${p} is transiting ${t.sign}${t.retrograde ? ' (retrograde)' : ''}, moving through your ${ORD[t.house]} house, so its themes are active in your ${th}.`;
    }
  } catch {}

  return { career, marriage, money, health, strength, weakness, remedies, currentTransit };
}
