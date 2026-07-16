// src/data/taraQuestions.ts
// Suggested questions for Ask Tara — five life themes, plus a per-day set derived
// from the user's ACTIVE transits/dasha (existing engine outputs, no new astronomy).
// Emotionally resonant, diaspora-aware phrasing. On-brand cosmic/gold theme.
import { BirthChart, computeTransitFactor } from '@/lib/vedic';
import { dayOfYear } from '@/lib/nudges';
import { colors } from '@/theme';

export type QuestionCategory = {
  key: 'Mind' | 'Love' | 'Career' | 'Money' | 'Destiny';
  label: string;
  icon: string;   // emoji glyph shown on the tab
  color: string;  // themed accent for the active tab (never black-and-white)
  questions: string[];
};

export const taraQuestions: QuestionCategory[] = [
  {
    key: 'Mind', label: 'Mind', icon: '🧠', color: colors.lav,
    questions: [
      "Why can't I stop overthinking lately?",
      "What's draining my energy?",
      'What lesson is life trying to teach me?',
      'What should I focus on this week?',
      "What's blocking my inner peace?",
    ],
  },
  {
    key: 'Love', label: 'Love', icon: '❤️', color: colors.rose,
    questions: [
      'Is this person meant to stay in my life?',
      'What does my chart reveal about marriage?',
      'When is my strongest period for love?',
      'Why do I repeat the same relationship patterns?',
      'What kind of partner am I attracting?',
    ],
  },
  {
    key: 'Career', label: 'Career', icon: '💼', color: colors.goldSoft,
    questions: [
      'Am I on the right career path?',
      'When will my hard work pay off?',
      'Should I start my own business?',
      'What career suits my birth chart?',
      "What's holding back my success?",
    ],
  },
  {
    key: 'Money', label: 'Money', icon: '💰', color: colors.sage,
    questions: [
      'Will my finances improve soon?',
      "What's blocking abundance in my life?",
      'When is my strongest wealth period?',
      'Should I buy a house this year?',
      'How can I attract more prosperity?',
    ],
  },
  {
    key: 'Destiny', label: 'Destiny', icon: '✨', color: colors.saffron,
    questions: [
      'Which dasha is shaping my life right now?',
      'What is my life purpose?',
      'What karmic lesson am I living through?',
      'Which planet is influencing me most?',
      'What chapter of life am I entering?',
    ],
  },
];

// ---- "Based on your chart today" — per-day prompts from active transits/dasha ----
const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

const PLANET_PROMPTS: Record<string, string[]> = {
  Sun: ['Where am I being called to lead right now?', 'What truth am I ready to stand in?'],
  Moon: ['What is my heart really asking for?', 'How do I find emotional steadiness now?'],
  Mars: ['Where should I channel my energy this week?', 'What am I ready to fight for?'],
  Mercury: ['What conversation is mine to have now?', 'Where should I trust my own mind?'],
  Jupiter: ['Where should I take a bigger leap?', 'What growth is opening up for me now?'],
  Venus: ['Is love entering a new chapter?', 'What am I learning to truly value?'],
  Saturn: ['What is this slower phase teaching me?', 'What am I being asked to build patiently?'],
  Rahu: ['What ambition is pulling me forward?', 'What am I being drawn to explore?'],
  Ketu: ['What am I ready to release?', 'Where is life asking me to let go?'],
};

// Deterministic per calendar day (dayOfYear); stable within a day, no randomness.
export function chartTodayPrompts(chart: BirthChart, date: Date = new Date()): string[] {
  const day = dayOfYear(date);
  const maha = PLANETS.find((p) => (chart.currentDasha || '').includes(p)) || '';
  const antarPart = (chart.currentAntardasha || '').split('–')[1] || '';
  const antar = PLANETS.find((p) => antarPart.includes(p)) || '';
  let transit = '';
  try { transit = computeTransitFactor(chart, date).transiting; } catch { /* keep going */ }

  // Active grahas, most significant first: running Mahadasha, live transit, Antardasha.
  const active: string[] = [];
  for (const p of [maha, transit, antar]) if (p && !active.includes(p)) active.push(p);

  const out: string[] = [];
  active.forEach((p, i) => {
    const pool = PLANET_PROMPTS[p];
    if (pool) { const q = pool[(day + i) % pool.length]; if (!out.includes(q)) out.push(q); }
  });

  // Marriage/commitment cue when a benefic (Venus/Jupiter) runs the dasha.
  if ([maha, antar].some((p) => p === 'Venus' || p === 'Jupiter')) {
    const q = 'Is this a good year for commitment?';
    if (!out.includes(q)) out.push(q);
  }

  // Always surface at least 3.
  const filler = [
    maha ? `What is my ${maha} period trying to teach me?` : 'What chapter of life am I entering?',
    'What should I focus on this season?',
  ];
  for (const f of filler) { if (out.length >= 3) break; if (!out.includes(f)) out.push(f); }

  return out.slice(0, 4);
}
