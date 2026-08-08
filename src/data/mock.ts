// src/data/mock.ts
// Shared display types + app chrome only. The former mock user-data blobs (userProfile,
// planets, aspects, dashaTimeline, snapshot, wellness, love, career, purpose,
// suggestedQuestions, todayEnergy) were replaced by chart-derived engines
// (composeSoulDirection / composeCareer / composeLove / composeWellness) and deleted.

export type EnergyDomain = {
  key: 'Mind' | 'Relationships' | 'Career' | 'Body' | 'Spiritual';
  score: number;
};

export type SnapshotStat = { label: string; value: number };

// Rotating splash-screen loading messages (UI chrome, not user data).
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
