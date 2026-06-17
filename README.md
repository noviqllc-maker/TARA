# Tara — Vedic Astrology & Wellness Intelligence

An AI-powered Vedic Life Guide built with Expo, React Native, TypeScript, and Expo Router.
Tara blends a user's birth chart, nakshatra, dasha, transits, panchanga, and wellness signals
into personalized daily guidance — designed to feel as habit-forming as Co-Star, rooted in
authentic Jyotish.

## Quick start

```bash
npm install
npx expo start
```

Then press `i` (iOS simulator), `a` (Android), or scan the QR code with the Expo Go app.

> Requires Node 18+ and the Expo CLI (bundled — `npx expo` works without a global install).

## What's inside

```
app/                         # Expo Router routes (file-based)
  _layout.tsx                # Root: fonts, providers, gesture root
  index.tsx                  # Entry — redirects to intro or tabs
  intro.tsx                  # Animated splash + sacred geometry
  loading.tsx                # Cosmic loading sequence
  (onboarding)/              # 5 one-question screens
  (tabs)/                    # Home · Chart · Tara AI · Insights · Profile
  chart/timeline.tsx         # Life Timeline (dasha cycles)
  insights/                  # Love · Career · Wellness · Purpose · Journal
src/
  theme/                     # Colors, typography, spacing, shadows
  components/                # UI kit + animated pieces
  data/mock.ts               # All mock data + types
  lib/ai.ts                  # Tara AI client (Anthropic Messages API)
  hooks/useProfile.tsx       # Persisted onboarding/profile state
```

## Design system

- **Palette:** deep cosmic black, cosmic indigo, antique gold, soft cream, saffron, rose, sage
- **Type:** Fraunces (serif display) + Outfit (sans body), loaded via `@expo-google-fonts`
- **Motion:** Reanimated — twinkling starfield, rotating sacred geometry, animated rings,
  staggered screen entrances, pressable spring/pulse on the primary CTA

## The AI (Tara AI tab)

`src/lib/ai.ts` calls the Anthropic Messages API with the user's chart + wellness context
injected as a system prompt. Chat history persists locally (AsyncStorage) so answers can
reference prior conversations — the start of the AI memory system.

**Before production:** never ship a raw API key in a mobile client. Route `ENDPOINT`
through your own backend (e.g. a Supabase Edge Function) that holds the key server-side.
A graceful offline fallback (`fallbackReply`) keeps the chat working without a backend so
you can demo immediately.

## Swapping mock data for real services

Everything is mock-first by design. The architecture is ready for:

- **Supabase / PostgreSQL** — replace `useProfile` persistence and `mock.ts` reads
- **Birth-chart engine** — compute real planetary positions (e.g. Swiss Ephemeris) and feed
  the same `Planet[]` / `DashaPeriod[]` shapes in `src/data/mock.ts`
- **Wellness sources** — Apple Health, Google Health Connect, Oura, WHOOP, Fitbit, Garmin.
  The onboarding wellness screen and Health & Wellness screen already model connection state;
  wire the native modules and replace the `wellness` mock object.

## Not included (separate deliverable)

The **web admin dashboard** (user management, payments, AI management, analytics, etc.) is a
distinct web application and is intentionally not part of this React Native project.

## Disclaimer

Tara provides astrology and wellness insights for reflection and lifestyle support.
It does not provide medical advice, diagnosis, or treatment. This is shown on every screen.
