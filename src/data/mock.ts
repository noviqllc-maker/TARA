// src/data/mock.ts
// All mock data + types. Swap these for Supabase / AI APIs later.

export type Planet = {
  name: string;
  glyph: string;
  sign: string;
  house: number;
  degree: string;
  retrograde?: boolean;
  explanation: string;
};

export type EnergyDomain = {
  key: 'Mind' | 'Relationships' | 'Career' | 'Body' | 'Spiritual';
  score: number;
};

export type SnapshotStat = { label: string; value: number };

export type DashaPeriod = {
  planet: string;
  start: string;
  end: string;
  theme: string;
  phase: 'past' | 'present' | 'future';
};

export const userProfile = {
  name: 'Penny',
  birthDate: '1994-09-23',
  birthTime: '04:42',
  birthPlace: 'Tirupati, India',
  sunSign: 'Virgo',
  moonSign: 'Virgo',
  risingSign: 'Taurus',
  nakshatra: 'Hasta',
  rulingPlanet: 'Mercury',
  lifePathNumber: 7,
  chineseZodiac: 'Dog',
  subscription: 'Free' as 'Free' | 'Premium',
};

export const todayEnergy: EnergyDomain[] = [
  { key: 'Mind', score: 64 },
  { key: 'Relationships', score: 72 },
  { key: 'Career', score: 81 },
  { key: 'Body', score: 48 },
  { key: 'Spiritual', score: 88 },
];

export const snapshot: SnapshotStat[] = [
  { label: 'Love', value: 72 },
  { label: 'Career', value: 81 },
  { label: 'Vitality', value: 48 },
  { label: 'Wealth', value: 66 },
  { label: 'Mood', value: 58 },
];

export const tarasMessage = {
  headline: 'Today rewards silence more than speed.',
  body: 'Moon energy suggests reflection over reaction. The transit through your 8th house turns attention inward — let plans stay soft and decisions wait for clearer skies.',
};

export const cosmicWeather = {
  nakshatra: 'Hasta',
  dasha: 'Jupiter Mahādasha',
  transit: 'Moon transiting 8th house',
  panchanga: 'Shukla Pakṣa · Dvitīyā',
  moonPhase: 'Waning Gibbous',
};

export const planets: Planet[] = [
  { name: 'Sun', glyph: '☉', sign: 'Virgo', house: 5, degree: '6°14′', explanation: 'Your core identity expresses through service, precision, and analytical care. Leadership comes quietly through competence.' },
  { name: 'Moon', glyph: '☾', sign: 'Virgo', house: 5, degree: '12°48′', explanation: 'Emotional security through order and usefulness. You process feelings by problem-solving — remember rest is also productive.' },
  { name: 'Mars', glyph: '♂', sign: 'Cancer', house: 3, degree: '21°02′', retrograde: false, explanation: 'Drive shows up in communication and protecting those close to you. Channel restlessness into focused short-term action.' },
  { name: 'Mercury', glyph: '☿', sign: 'Libra', house: 6, degree: '2°31′', explanation: 'A diplomatic, balanced mind that weighs every side. Strong for negotiation and refining systems.' },
  { name: 'Jupiter', glyph: '♃', sign: 'Gemini', house: 2, degree: '15°55′', explanation: 'Growth through learning, words, and resourcefulness. Your Mahādasha lord — a multi-year season of expansion.' },
  { name: 'Venus', glyph: '♀', sign: 'Taurus', house: 1, degree: '9°20′', explanation: 'Venus in its own sign on your ascendant — natural grace, aesthetic sense, and magnetism. Beauty is part of your path.' },
  { name: 'Saturn', glyph: '♄', sign: 'Pisces', house: 11, degree: '24°07′', retrograde: true, explanation: 'Long-term gains arrive through patient, compassionate networks. Discipline around hopes yields lasting reward.' },
  { name: 'Rahu', glyph: '☊', sign: 'Aquarius', house: 10, degree: '3°44′', explanation: 'Karmic pull toward unconventional careers and public visibility. Innovation is your growth edge.' },
  { name: 'Ketu', glyph: '☋', sign: 'Leo', house: 4, degree: '3°44′', explanation: 'Detachment from ego-driven comfort. Inner home is built through letting go of needing recognition.' },
];

export const aspects = [
  'Jupiter trine Ascendant — expansive self-expression',
  'Moon conjunct Sun — unified will and emotion (New Moon nature)',
  'Saturn sextile Mercury — structured, reliable thinking',
];

export const dashaTimeline: DashaPeriod[] = [
  { planet: 'Moon', start: '2009', end: '2019', theme: 'Emotional foundation & home', phase: 'past' },
  { planet: 'Mars', start: '2019', end: '2026', theme: 'Drive, courage, building', phase: 'past' },
  { planet: 'Jupiter', start: '2026', end: '2042', theme: 'Wisdom, expansion, abundance', phase: 'present' },
  { planet: 'Saturn', start: '2042', end: '2061', theme: 'Mastery, legacy, structure', phase: 'future' },
];

export const insights = {
  cosmicWeather: 'A reflective, inward-turning current. The Moon in your 8th house favors depth over momentum.',
  emotional: 'Tender and intuitive. Emotions run close to the surface — honor them without acting on every wave.',
  mental: 'Slightly scattered. Single-task and protect your focus; clarity returns by evening.',
  relationship: 'Warm but sensitive. A good day to listen rather than resolve.',
  career: 'Quietly strong. Behind-the-scenes work pays off — avoid launching anything new.',
  body: 'Recovery is low. Your nervous system is conserving energy; choose gentle movement.',
  spiritual: 'Highly aligned. A rare open window for meditation and inner work.',
  avoid: 'Major decisions, confrontations, overcommitting, caffeine after noon.',
  leanInto: 'Journaling, hydration, early rest, grounding practices, quiet creativity.',
  mantra: 'Oṃ Som Somāya Namaḥ',
  mantraNote: 'Chant 11 times to soothe and steady lunar energy.',
  journalPrompt: 'What am I being asked to release rather than achieve today?',
};

export const wellness = {
  energyBalance: 54,
  stress: 6,
  recovery: 48,
  sleep: 62,
  hrv: 41,
  restingHr: 58,
  steps: 4280,
  moodTrend: [4, 5, 3, 6, 5, 4, 5],
  bodyFocus: 'Restoration & hydration',
  mindFocus: 'Single-tasking',
  spiritualAlignment: 'Open & receptive',
  habits: ['Earlier wind-down', 'Screen-free evening', 'Morning light exposure'],
  practices: ['5-min grounding', 'Box breathing', 'Chandra mantra'],
};

export const love = {
  score: 78,
  influence: 'Venus in lagna strengthens magnetism; Moon transit asks for emotional patience.',
  strengths: ['Deep loyalty', 'Aesthetic harmony', 'Nurturing instinct'],
  challenges: ['Over-analysis', 'Holding feelings in'],
  growth: ['Voicing needs early', 'Receiving as well as giving'],
  advice: 'Lead with softness today. Your partner needs presence, not solutions.',
};

export const career = {
  energy: 81,
  financialOutlook: 'Steady with growth potential under Jupiter Mahādasha.',
  shortTerm: ['Refine existing projects', 'Strengthen partnerships'],
  longTerm: ['Public-facing ventures (Rahu in 10th)', 'Knowledge-based income'],
  influences: 'Jupiter expands the 2nd house of wealth; Rahu pushes career visibility.',
  careerTiming: 'Favorable window: Jun–Sep for launches once the current Moon transit clears.',
  moneyTiming: 'Best saving/investing window aligns with the next Shukla Pakṣa.',
};

export const purpose = {
  theme: 'The Refiner — bringing order, beauty, and healing to what you touch.',
  phase: 'Expansion (early Jupiter Mahādasha)',
  gifts: ['Discernment', 'Aesthetic intelligence', 'Devotion'],
  lessons: ['Trusting intuition over perfectionism', 'Rest as worthiness'],
  soulDirection: 'Moving from service-for-approval toward service-as-offering.',
  guidance: 'Your growth is in surrender, not control. Let Jupiter widen your horizons.',
};

// AI suggested questions
export const suggestedQuestions = [
  'Why am I feeling stuck this week?',
  'What should I focus on this month?',
  'Is this a good time for a new venture?',
  'How can I support my energy today?',
];

// Rotating loading messages
export const loadingMessages = [
  'Consulting the Panchanga…',
  'Reading your Nakshatra…',
  'Tracing your Dasha timeline…',
  'Mapping planetary influences…',
  'Decoding your cosmic blueprint…',
  'Preparing your energy forecast…',
  'Tara is getting to know you…',
];

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function todayLong(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
