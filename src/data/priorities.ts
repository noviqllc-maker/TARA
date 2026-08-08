// src/data/priorities.ts
// The onboarding "What matters most right now?" answer. Stored on the profile as
// userPriority and later used to weight which life area Tara leads with. One value only.

export type PriorityKey =
  | 'career' | 'love' | 'family' | 'business'
  | 'health' | 'purpose' | 'learning' | 'money';

export type PriorityOption = { key: PriorityKey; label: string; blurb: string };

export const PRIORITIES: PriorityOption[] = [
  { key: 'career',   label: 'Career',   blurb: 'Growth, direction, and what you are building' },
  { key: 'love',     label: 'Love',     blurb: 'Relationships, romance, and connection' },
  { key: 'family',   label: 'Family',   blurb: 'Home, roots, and the people you care for' },
  { key: 'business', label: 'Business', blurb: 'Ventures, risk, and enterprise' },
  { key: 'health',   label: 'Health',   blurb: 'Body, energy, and wellbeing' },
  { key: 'purpose',  label: 'Purpose',  blurb: 'Meaning, dharma, and your path' },
  { key: 'learning', label: 'Learning', blurb: 'Study, skills, and curiosity' },
  { key: 'money',    label: 'Money',    blurb: 'Wealth, security, and resources' },
];

export const priorityLabel = (key?: PriorityKey): string =>
  PRIORITIES.find((p) => p.key === key)?.label ?? '';
