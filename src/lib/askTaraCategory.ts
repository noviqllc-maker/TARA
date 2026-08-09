// src/lib/askTaraCategory.ts
// Category-weighted Ask Tara: classify a question by keyword, then hand Claude a short
// prompt segment telling it which chart factors to prioritize. This stops every answer from
// defaulting to "Today's Moon/transit..." and makes career/love/health/purpose answers lead
// with the factors that actually matter for each. No AI, no network; pure string matching.
//
// The guidance is framed as "when you explain the WHY, prioritize these factors" so it stays
// consistent with the answer prompt's rule to OPEN with a human sentence, not a planet.

export type AskCategory = 'career' | 'love' | 'money' | 'health' | 'purpose' | 'timing' | 'general';

const CATEGORY_KEYWORDS: Record<Exclude<AskCategory, 'general'>, string[]> = {
  career: ['career', 'job', 'work', 'business', 'profession', 'vocation', 'promotion', 'employment', 'boss', 'office', 'industry'],
  love: ['love', 'relationship', 'partner', 'marriage', 'romance', 'dating', 'attraction', 'connected', 'intimate', 'spouse', 'crush', 'ex'],
  money: ['money', 'wealth', 'income', 'salary', 'investment', 'financial', 'finances', 'profit', 'revenue', 'rich', 'debt', 'savings'],
  health: ['health', 'wellness', 'body', 'exercise', 'illness', 'disease', 'energy', 'pain', 'healing', 'medical', 'sleep', 'stress'],
  purpose: ['purpose', 'soul', 'calling', 'destiny', 'meaning', 'spiritual', 'path', 'direction', 'dharma', 'life purpose'],
  timing: ['when', 'best time', 'right time', 'window', 'period', 'phase', 'auspicious', 'muhurta'],
};

// First-match wins, in the order above. 'timing' is last so a topical question ("when should
// I change jobs?") classifies by its topic (career), and pure "when is a good time" falls to
// timing. Returns 'general' when nothing matches.
export function detectCategory(question: string): AskCategory {
  const lower = (question || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category as AskCategory;
  }
  return 'general';
}

const CATEGORY_PROMPTS: Record<AskCategory, string> = {
  career:
    'CATEGORY = CAREER. When you explain the why, prioritize these chart factors in order: the 10th house and its lord (path, public life, what you are known for); the 6th house (daily work, service, effort); Jupiter versus Saturn (when to expand versus consolidate); the running Mahadasha and Antardasha (the multi-year phase you are in). Reference today\'s transit only if it genuinely bears on the career question, and never lead the astrology with the transiting Moon unless it actually aspects the 10th.',
  love:
    'CATEGORY = LOVE. When you explain the why, prioritize these chart factors in order: the 7th house and its lord (partnership, marriage, the other person); Venus (attraction, warmth, what you value); the Moon (how you bond emotionally); the Navamsa (D9) for the deeper, soul-level relationship pattern. Note any relationship yoga only if it is present in the data. Use transits for timing, after the above; do not lead a love answer with a Mahadasha unless that lord sits in or aspects the 7th.',
  money:
    'CATEGORY = MONEY. When you explain the why, prioritize these chart factors in order: the 2nd house and its lord (income, resources, what you hold); the 11th house (gains, networks, friends who bring wealth); Jupiter (growth and fortune); Venus (what you attract); then the running Mahadasha as the overall prosperity phase. Keep today\'s transit to a brief closing timing note, not the lead.',
  health:
    'CATEGORY = HEALTH. When you explain the why, prioritize these chart factors in order: the 1st house (the body, overall vitality); the Moon (mind-body link, emotional health); the 6th house (daily habits, healing, routine); the 8th house (longevity, chronic patterns); Saturn (where patience and discipline are needed). Keep guidance lifestyle and reflective, never medical or diagnostic. Do not lead with today\'s Moon unless it is directly relevant.',
  purpose:
    'CATEGORY = PURPOSE. When you explain the why, prioritize these chart factors in order: the 9th house (dharma, higher learning, the soul\'s intent); the 10th house (life direction, public contribution); the 12th house (spirituality, letting go); the Atmakaraka (the soul significator, your deepest drive); the running Mahadasha as this chapter of the long arc; the Sun (core identity). This is the soul\'s long arc, not today\'s transit; do not lead with the transiting Moon.',
  timing:
    'CATEGORY = TIMING. When you answer, prioritize in order: the running Mahadasha and Antardasha (does this period support the action); the slow transits (Saturn, Jupiter, Rahu, Ketu); then the favorable and inauspicious daily windows (Abhijit versus Rahukalam) if the provided data includes them; finally the question-specific house (10th for career timing, 7th for love, and so on). Lead with the window and be concrete about the phase. Never base timing on the transiting Moon alone.',
  general:
    'CATEGORY = GENERAL. Answer the question first in plain human terms, then explain through the chart: the houses relevant to the topic, the running Mahadasha (the season of life), then the Sun and Moon (identity and emotion), then any genuine yoga. Do not default to opening the explanation with today\'s transit.',
};

// Return the guidance segment for a category (defaults to general). The optional chart is
// accepted for future chart-aware tuning; the current guidance is chart-agnostic.
export function buildCategoryPrompt(category: string): string {
  return CATEGORY_PROMPTS[(category as AskCategory)] ?? CATEGORY_PROMPTS.general;
}
