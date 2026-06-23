// src/data/taraQuestions.ts
// Suggested questions for Tara AI, grouped into the same five categories as the
// Today energy rings. Warm, personal, first-person — what someone would actually
// ask a trusted Vedic life guide.

export type QuestionCategory = {
  key: 'Mind' | 'Relationships' | 'Career' | 'Body' | 'Spiritual';
  label: string;
  questions: string[];
};

export const taraQuestions: QuestionCategory[] = [
  {
    key: 'Mind',
    label: 'Mind',
    questions: [
      "What's weighing on my mind right now?",
      'How do I quiet the overthinking that keeps me up?',
      'Where should I put my focus this week?',
      'Why have I been feeling so scattered lately?',
      'What is my mind trying to tell me?',
    ],
  },
  {
    key: 'Relationships',
    label: 'Relationships',
    questions: [
      'Is now a good time to have a hard conversation?',
      'What does my chart say about my closest relationship?',
      'How can I feel more understood by the people I love?',
      "Am I giving more than I'm receiving right now?",
      'What kind of partner truly suits my nature?',
    ],
  },
  {
    key: 'Career',
    label: 'Career',
    questions: [
      'Should I make a move at work this week?',
      "What's my real professional strength right now?",
      'Is this the right time to start something new?',
      'How do I find work that actually feels like mine?',
      "What's quietly blocking my growth at work?",
    ],
  },
  {
    key: 'Body',
    label: 'Body',
    questions: [
      'What does my body need from me today?',
      'How can I restore my energy this week?',
      'Why have I been feeling so drained?',
      'What daily rhythm would suit me best?',
      'How do I bring my body back into balance?',
    ],
  },
  {
    key: 'Spiritual',
    label: 'Spiritual',
    questions: [
      "What's my soul lesson in this period?",
      'What practice would ground me today?',
      'What am I being asked to release right now?',
      'How do I reconnect with my sense of purpose?',
      'What is my current dasha trying to teach me?',
    ],
  },
];
