// src/lib/premium.ts
// Single source of truth for the Premium benefit list. Used by BOTH the paywall
// checklist (app/paywall.tsx) and the profile upgrade banner (app/(tabs)/profile.tsx)
// so the two never drift. No ad references — the free tier has no ads either.
export const PREMIUM_BENEFITS = [
  '100 Ask Tara questions every month',
  'Full yearly forecast & timing windows',
  'Complete Life Chapters & dasha timeline',
  'Deep compatibility reports',
  'Advanced Vedic chart analysis',
] as const;
