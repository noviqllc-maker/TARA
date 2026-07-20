// src/lib/topic.ts
// Lightweight topic classification for a free-text question, plus the grahas/houses
// most relevant to each life theme. Used to bias which transit factor Ask Tara leads
// with (career → 10th house / Saturn / Sun; love → Venus / 7th; etc.) so the answer's
// "Celestial Calculation" reflects the real driver instead of always defaulting to the
// Moon. Pure text + tables; no astronomy here.

export type Topic = 'career' | 'love' | 'money' | 'health' | 'spiritual' | 'mind' | 'general';

// The grahas and houses that carry each theme in Vedic astrology. Order matters only
// as documentation; the factor scorer just checks membership.
export const TOPIC_FOCUS: Record<Topic, { grahas: string[]; houses: number[] }> = {
  career:    { grahas: ['Saturn', 'Sun', 'Mercury', 'Mars'], houses: [10, 6, 11] },
  love:      { grahas: ['Venus', 'Moon', 'Mars'],            houses: [7, 5, 8] },
  money:     { grahas: ['Jupiter', 'Venus', 'Mercury'],      houses: [2, 11, 5] },
  health:    { grahas: ['Sun', 'Mars', 'Moon', 'Saturn'],    houses: [1, 6, 8] },
  spiritual: { grahas: ['Jupiter', 'Ketu', 'Sun', 'Saturn'], houses: [9, 12, 5] },
  mind:      { grahas: ['Moon', 'Mercury'],                  houses: [4, 1, 3] },
  general:   { grahas: [],                                   houses: [] },
};

// Keyword → topic. First matching topic (in priority order) wins; falls back to 'general'.
const RULES: [Topic, RegExp][] = [
  ['love',      /\b(love|relationship|partner|marriage|marry|spouse|dating|romance|romantic|ex|crush|breakup|husband|wife|girlfriend|boyfriend|soulmate|commit|commitment)\b/i],
  ['career',    /\b(career|job|work|business|boss|promotion|profession|company|startup|venture|interview|colleague|office|quit|resign|hustle|ambition)\b/i],
  ['money',     /\b(money|finance|financial|wealth|income|salary|savings?|debt|invest|investment|abundance|prosperity|afford|rich|loan|property|buy a house)\b/i],
  ['health',    /\b(health|body|energy|tired|exhausted|sleep|illness|sick|anxiety|anxious|stress|stressed|burnout|recover|recovery|fitness|workout|pain)\b/i],
  ['spiritual', /\b(spiritual|purpose|dharma|karma|karmic|soul|meaning|meditation|awaken|enlighten|god|divine|faith|destiny|life purpose|calling)\b/i],
  ['mind',      /\b(mind|overthink|overthinking|focus|clarity|decision|decide|confused|confusion|peace|calm|thought|thoughts|mental|emotion|emotional|mood|feeling)\b/i],
];

export function classifyTopic(question: string): Topic {
  const q = (question || '').toLowerCase();
  for (const [topic, re] of RULES) if (re.test(q)) return topic;
  return 'general';
}
