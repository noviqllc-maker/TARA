// src/lib/eveningRitual.ts
// Support for the Evening Ritual (all free, deterministic, no AI).
//  • Evening-voiced reflection prompts (a dusk-toned extension of the journal pool).
//  • A SINGLE tomorrow-preview line from tomorrow's strongest transiting factor — the same
//    machinery the notifications/forecast use (computeTransitFactor). This is intentionally
//    ONE line: the free tier gets a taste, never a full forecast, so nothing fuller leaks.
import { BirthChart, computeTransitFactor } from '@/lib/vedic';

export const EVENING_PROMPTS = [
  'What did today ask of you — and how did you answer?',
  'What is one thing from today worth keeping?',
  'Where did you feel most like yourself today?',
  'What can you set down before you sleep?',
  'Who or what are you grateful for tonight?',
  'What did today teach you, however small?',
  'What would you do a little differently tomorrow?',
  'What is ready to be forgiven — including in yourself?',
  'Where did your energy go today, and did it serve you?',
  'What small kindness did you give or receive today?',
];

// Deterministic per (user + date) so the prompt is stable through the evening.
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function eveningPrompt(seed: string): string {
  return EVENING_PROMPTS[hashStr(seed) % EVENING_PROMPTS.length];
}

// One-line preview of tomorrow, keyed to tomorrow's strongest transiting graha. Single line
// only — this is the free-tier taste, not a forecast.
const TOMORROW_LINE: Record<string, string> = {
  Sun:     'Tomorrow leans toward clarity and visibility — a day to show up as yourself.',
  Moon:    'Tomorrow runs tender and intuitive — let feeling lead the pace.',
  Mars:    'Tomorrow carries real drive — aim your energy rather than scatter it.',
  Mercury: 'Tomorrow favours the mind and clear exchange — good for words and plans.',
  Jupiter: 'Tomorrow feels a little more open — room to grow and to say yes.',
  Venus:   'Tomorrow softens toward warmth and connection — lead with the heart.',
  Saturn:  'Tomorrow rewards patience and steady effort over speed.',
  Rahu:    'Tomorrow pulls toward something new — reach, but stay grounded.',
  Ketu:    'Tomorrow turns inward — depth and release over motion.',
};

export function tomorrowPreview(chart: BirthChart | null, date: Date = new Date()): string {
  if (!chart) return 'Tomorrow opens quietly — meet it as it comes, one step at a time.';
  const t = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12);
  try {
    const g = computeTransitFactor(chart, t).transiting;
    return TOMORROW_LINE[g] ?? TOMORROW_LINE.Moon;
  } catch {
    return 'Tomorrow opens quietly — meet it as it comes, one step at a time.';
  }
}
