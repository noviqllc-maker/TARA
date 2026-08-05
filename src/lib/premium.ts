// src/lib/premium.ts
// Single source of truth for the Premium benefit list. Used by BOTH the paywall
// checklist (app/paywall.tsx) and the profile upgrade banner (app/(tabs)/profile.tsx)
// so the two never drift. No ad references — the free tier has no ads either.
//
// TRUTH RULE: every line here must map to a shipped feature. The 12-month "Year Ahead" is
// the ownership-gated shop report (app/report/year-ahead.tsx), NOT a premium benefit — but
// the rolling "Weekly & Monthly Guidance" forecast (app/insights/forecast.tsx) IS premium,
// so it appears below. Removed in the truth-up: "Complete Life Chapters & dasha timeline",
// "Deep compatibility reports", "Advanced Vedic chart analysis" — none were implemented.
export const PREMIUM_BENEFITS = [
  '100 Ask Tara questions every month',
  'Weekly & Monthly Guidance — your forecast, always current',
  'Health-aware daily guidance, tuned to your real rhythm',
  'Early access to new Tara features',
] as const;

// The same four benefits, reordered so a context-specific soft-lock leads with its most
// relevant line (e.g. the chart & love sheets lead with the forecast / Ask-Tara access).
// No lines added or removed — never introduces an unbuilt claim.
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
  // No "blueprint" here — it collides with the "Birth/Soul Blueprint" shop report.
  bannerPool: [
    'Premium guidance for every chapter of life.',
    'Go beyond predictions. Understand yourself.',
    'Every answer begins with your birth chart.',
    'Because your future deserves more than a daily horoscope.',
  ],
} as const;
