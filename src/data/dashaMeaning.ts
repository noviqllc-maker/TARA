// src/data/dashaMeaning.ts
// Plain-English "Life Chapters" copy for the dasha timeline. MAHA_MEANING gives each of
// the 9 grahas a short, everyday-language read as a Mahadasha (a multi-year chapter).
// ANTAR_THEME gives each graha's flavour as an Antardasha (a sub-period), split into
// what the period rewards and what to watch for. Warm and specific — never doom.

export type ChapterMeaning = { chapter: string; meaning: string };

export const MAHA_MEANING: Record<string, ChapterMeaning> = {
  Sun: {
    chapter: 'Chapter of Self & Visibility',
    meaning: 'This is a chapter about stepping into your own authority. You’re meant to be seen — through leadership, recognition, or simply owning who you are. It rewards honesty and clear intention, and asks you to stop shrinking to fit smaller rooms.',
  },
  Moon: {
    chapter: 'Chapter of the Heart',
    meaning: 'A softer, more emotional chapter centred on home, care, and belonging. Your inner life sets the weather now. It’s a strong window for nurturing relationships and tending your roots — and a reminder that rest and feeling are not detours, they’re the work.',
  },
  Mars: {
    chapter: 'Chapter of Drive & Courage',
    meaning: 'Energy runs high and direct. This is a build-and-fight-for-it chapter — starting things, defending what matters, moving your body and your goals forward. It rewards decisive action and channelled effort, and asks you to aim your fire rather than scatter it.',
  },
  Mercury: {
    chapter: 'Chapter of Mind & Skill',
    meaning: 'A quick, curious, connective chapter. Learning, communication, business, and clever problem-solving all come alive. It’s a great window for study, writing, deals, and networks — and it rewards you for keeping your word and organising the noise into a plan.',
  },
  Jupiter: {
    chapter: 'Chapter of Growth & Meaning',
    meaning: 'One of the most expansive chapters — wisdom, opportunity, teaching, and faith in something larger. Doors tend to open and mentors appear. It rewards generosity and the courage to think bigger, and asks you not to mistake comfort for the finish line.',
  },
  Venus: {
    chapter: 'Chapter of Love & Beauty',
    meaning: 'A warm, magnetic chapter about relationships, pleasure, art, and the good things in life. Connection and creativity flow more easily now. It rewards you for valuing what (and who) truly matters — and gently warns against chasing only comfort or approval.',
  },
  Saturn: {
    chapter: 'Chapter of Mastery & Structure',
    meaning: 'A serious, foundation-laying chapter. Progress is slower but far more durable — this is where real discipline turns into lasting results. It rewards patience, responsibility, and doing the unglamorous work, and asks you to trust the long game over the quick win.',
  },
  Rahu: {
    chapter: 'Chapter of Ambition & Reinvention',
    meaning: 'A restless, boundary-pushing chapter that pulls you toward the new, the foreign, and the unconventional. Ambition surges and life can change fast. It rewards bold, focused reinvention — and asks you to stay grounded so hunger doesn’t become the whole story.',
  },
  Ketu: {
    chapter: 'Chapter of Release & Depth',
    meaning: 'An inward, spiritual chapter about letting go and finding meaning beneath the surface. Some outer things loosen their grip so something deeper can form. It rewards reflection, simplicity, and inner work — and asks you to trust what you’re releasing.',
  },
};

export type AntarTheme = { rewards: string[]; watch: string[] };

export const ANTAR_THEME: Record<string, AntarTheme> = {
  Sun: {
    rewards: ['Stepping into leadership', 'Recognition and clarity of purpose', 'Confidence in your own voice'],
    watch: ['Ego clashes with authority', 'Pushing too hard to be seen'],
  },
  Moon: {
    rewards: ['Emotional connection and care', 'Home, family, and inner peace', 'Following your intuition'],
    watch: ['Mood swings and over-sensitivity', 'Leaning on others for steadiness'],
  },
  Mars: {
    rewards: ['Bold action and momentum', 'Physical energy and courage', 'Finishing what you start'],
    watch: ['Impatience and quick temper', 'Conflict from acting too fast'],
  },
  Mercury: {
    rewards: ['Sharp thinking and learning', 'Communication, deals, and travel', 'Turning ideas into plans'],
    watch: ['Overthinking and scattered focus', 'Saying yes to too much'],
  },
  Jupiter: {
    rewards: ['Growth, luck, and new doors', 'Guidance from mentors', 'Optimism and generosity'],
    watch: ['Overcommitting or overpromising', 'Comfort dulling your edge'],
  },
  Venus: {
    rewards: ['Love, harmony, and connection', 'Creativity and pleasure', 'Financial and social ease'],
    watch: ['Overindulgence or avoidance', 'Seeking approval over truth'],
  },
  Saturn: {
    rewards: ['Discipline that builds real results', 'Responsibility and maturity', 'Slow, lasting progress'],
    watch: ['Heaviness, delay, or self-doubt', 'Burnout from carrying too much'],
  },
  Rahu: {
    rewards: ['Ambition and fresh opportunities', 'Unconventional wins', 'Reinvention and reach'],
    watch: ['Restlessness and shortcuts', 'Chasing more without grounding'],
  },
  Ketu: {
    rewards: ['Insight and letting go', 'Spiritual depth and focus', 'Freedom from what weighed you down'],
    watch: ['Feeling detached or unmotivated', 'Withdrawing too far inward'],
  },
};
