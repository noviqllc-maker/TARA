// src/lib/composeCurrentChapter.ts
// A deterministic "Current Chapter" reading (no AI): the running Mahadasha and Antardasha in
// plain English, the live Jupiter/Saturn transits over the chart, the emotional tone of the
// moment, what to watch, and one piece of guidance. Reads the real dasha timeline and
// computeAllTransits; works for any entered chart (for the Vedic Calculator).
import { BirthChart, computeAllTransits } from '@/lib/vedic';

export interface LifeChapter {
  mahadasha: string;
  antardasha: string;
  majorTransits: { description: string; jupiterTransit: string; timing: string };
  currentEnergy: string;
  whatToWatch: string[];
  guidance: string;
}

const firstWord = (s: string) => (s || '').trim().split(/[\s\-–(]+/)[0] || '';
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const MAHA_KEYWORDS: Record<string, string> = {
  Sun: 'authority, visibility, and identity', Moon: 'emotion, home, and care',
  Mars: 'drive, action, and courage', Mercury: 'communication, learning, and commerce',
  Jupiter: 'expansion, growth, and wisdom', Venus: 'love, comfort, and creativity',
  Saturn: 'discipline, patience, and building', Rahu: 'ambition, reinvention, and the new',
  Ketu: 'introspection, release, and spirituality',
};
// The emotional tone each Mahadasha lord tends to set.
const MAHA_TONE: Record<string, string> = {
  Sun: 'a visible, identity-forming', Moon: 'a tender, inward', Mars: 'an active, driven',
  Mercury: 'a busy, communicative', Jupiter: 'an expansive, hopeful', Venus: 'a warm, relational',
  Saturn: 'a serious, building', Rahu: 'an ambitious, restless', Ketu: 'a reflective, letting-go',
};
// What a slow planet's transit through a house tends to emphasize (plain English).
const JUP_HOUSE: Record<number, string> = {
  1: 'growth in confidence and a fresh sense of direction', 2: 'support for income, family, and self-worth',
  3: 'bold communication, courage, and new skills', 4: 'ease at home and inner contentment',
  5: 'luck with creativity, romance, and children', 6: 'help overcoming obstacles and improving routines',
  7: 'growth through partnership and commitment', 8: 'depth, shared resources, and transformation',
  9: 'luck with higher learning, travel, and belief', 10: 'career expansion and public recognition',
  11: 'gains, networks, and fulfilled hopes', 12: 'spiritual growth, rest, and gentle release',
};
const SAT_HOUSE: Record<number, string> = {
  1: 'a call to build discipline and take yourself seriously', 2: 'a focus on securing finances patiently',
  3: 'deliberate practice and steady effort in communication', 4: 'work on home, roots, and emotional foundations',
  5: 'maturing your creativity and how you take risks', 6: 'real discipline paying off in work and health',
  7: 'commitment being tested and, if sound, deepened', 8: 'slow, honest work with shared resources and trust',
  9: 're-examining beliefs and long-term direction', 10: 'career responsibility and earned, lasting authority',
  11: 'pruning your goals and circle to what truly matters', 12: 'a quieter, more inward, restorative season',
};

export function composeCurrentChapter(chart: BirthChart | null): LifeChapter | null {
  if (!chart) return null;

  const present = chart.dasha.find((d) => d.phase === 'present');
  const mahaLord = present?.planet || firstWord(chart.currentDasha) || 'Jupiter';
  const mahaYears = present ? ` (${present.start}–${present.end})` : '';
  const mahadasha = `${mahaLord} Mahādasha${mahaYears}: ${MAHA_KEYWORDS[mahaLord] ?? 'a distinct chapter of growth'}.`;

  // Running Antardasha (sub-period) from the present Mahadasha, else parse currentAntardasha.
  const antar = present?.antardashas?.find((a) => a.phase === 'present');
  const antarLord = antar?.planet || (chart.currentAntardasha || '').split('(')[0].split(/[–-]/)[1]?.trim() || mahaLord;
  const antarYears = antar ? ` (${antar.start}–${antar.end})` : '';
  const antardasha = `${antarLord} Antardasha${antarYears}: ${MAHA_KEYWORDS[antarLord] ?? 'a sub-theme within the larger chapter'}.`;

  // Live slow-planet transits over this chart.
  const transits = computeAllTransits(chart, new Date());
  const jupHouse = transits.find((t) => t.name === 'Jupiter')?.house ?? null;
  const satHouse = transits.find((t) => t.name === 'Saturn')?.house ?? null;

  const jupiterTransit = jupHouse
    ? `Jupiter is transiting your ${ORD[jupHouse]} house: ${JUP_HOUSE[jupHouse]}.`
    : 'Jupiter continues its slow, supportive circuit of your chart.';
  const description = satHouse
    ? `Saturn is transiting your ${ORD[satHouse]} house: ${SAT_HOUSE[satHouse]}.`
    : 'Saturn continues its patient work of building where it moves.';
  // Timing anchor: prefer the Antardasha end, else the Mahadasha end year.
  const timing = antar ? `This sub-phase runs through ${antar.end}.` : present ? `This chapter runs through ${present.end}.` : 'This phase is current.';
  const majorTransits = { description, jupiterTransit, timing };

  // Emotional tone: the Mahadasha's tone, tempered by Saturn's current weight.
  const saturnReality = satHouse && [1, 4, 7, 8, 10, 12].includes(satHouse);
  const currentEnergy = `You are in ${MAHA_TONE[mahaLord] ?? 'a distinct'} phase (${mahaLord} Mahādasha), refined by the ${antarLord} sub-period. ${saturnReality ? 'Saturn\'s transit adds a reality-check right now, so this reads more like a building season than a harvest one: steady effort compounds, shortcuts do not.' : 'The current transits are broadly supportive, so it is a good stretch to act on what you have been preparing.'}`;

  // What to watch: live retrogrades + the pull of an expansive or ambitious Mahadasha.
  const retros = transits.filter((t) => t.retrograde && !['Rahu', 'Ketu'].includes(t.name)).map((t) => t.name);
  const whatToWatch = uniq([
    retros.length ? `${retros.join(' and ')} ${retros.length > 1 ? 'are' : 'is'} retrograde now, so give that area extra clarity and avoid rushing decisions in it` : '',
    (mahaLord === 'Jupiter' || mahaLord === 'Rahu') ? 'This expansive phase can tempt overcommitment; grow deliberately rather than saying yes to everything' : '',
    saturnReality ? 'Saturn asks for follow-through; unfinished commitments feel heavier now until you close or renegotiate them' : 'A generally open window; the main risk is coasting rather than choosing',
  ]).slice(0, 3);

  // Guidance: tie the Mahadasha's opportunity to Saturn's caution.
  const guidance = (mahaLord === 'Jupiter' || jupHouse)
    ? `Lean into ${mahaLord === 'Jupiter' ? 'this expansion' : 'the openings Jupiter is bringing'}, but verify before you commit; ${saturnReality ? 'Saturn is quietly asking you to build on solid ground.' : 'pace the growth so it lasts.'}`
    : `Work with the ${mahaLord} theme of ${MAHA_KEYWORDS[mahaLord] ?? 'growth'}; ${saturnReality ? 'let Saturn\'s patience shape the how, and finish what you start.' : 'the timing supports steady, intentional action.'}`;

  return { mahadasha, antardasha, majorTransits, currentEnergy, whatToWatch, guidance };
}
