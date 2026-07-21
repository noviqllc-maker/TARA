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

// The same five benefits, reordered so a context-specific soft-lock leads with its most
// relevant line (e.g. the chart sheet leads with the dasha timeline, the love sheet with
// compatibility). No lines added or removed — never introduces an unbuilt claim.
export function benefitsLeadingWith(lead: (typeof PREMIUM_BENEFITS)[number]): string[] {
  return [lead, ...PREMIUM_BENEFITS.filter((b) => b !== lead)];
}

// Single source of truth for premium MARKETING copy (subtitles + rotating banners).
// Benefit LISTS live in PREMIUM_BENEFITS above; these are the voice/framing lines.
// Honesty guardrails: no "without limits" (conflicts with the 100/month cap) and nothing
// close to another app's tagline (e.g. "Your life, decoded").
export const PREMIUM_COPY = {
  paywallSubtitle: 'Your stars have always been speaking. Tara helps you understand them.',
  homeNudgeLine: "Go beyond today's horoscope. Understand your life's bigger picture.",
  softLockSubtitle: 'Personal guidance, written from your unique birth chart. No two readings are ever the same.',
  // Rotating short banners for nudges that vary (chosen deterministically per day).
  bannerPool: [
    'Unlock your complete cosmic blueprint.',
    'Premium guidance for every chapter of life.',
    'Go beyond predictions. Understand yourself.',
    'Every answer begins with your birth chart.',
    'Because your future deserves more than a daily horoscope.',
  ],
} as const;
