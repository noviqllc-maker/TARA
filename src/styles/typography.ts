// src/styles/typography.ts
// Tara's unified type scale — a refinement, NOT a rebrand. Fraunces (serif) stays as the
// luxury accent for the emotional / branded moments; Outfit (sans) carries everything else for
// readability. One scale, consistent line-heights (~150% on body), semantic colors preserved.
//
// Font rule:
//   Fraunces  → Hero greeting, Screen titles, Card titles, large report titles.
//   Outfit    → Section headers, body, secondary body, captions, metadata, buttons, labels, nav.
//
// These are the raw style objects; the shared <Text> (components/ui) exposes them as `variant`
// names. Each entry carries an explicit fontFamily + fontWeight so <Text>'s weight→family
// resolver renders the exact bundled face (no faux-bold on iOS). Colors are applied by <Text>
// (default cream); this module never hardcodes a palette, so the semantic colors stay intact.
import { fonts } from '@/theme';

export const TYPO = {
  // Fraunces — display / branded
  heroGreeting: { fontFamily: fonts.serifSemi, fontWeight: '600' as const, fontSize: 42, lineHeight: 48, letterSpacing: -0.5 },
  screenTitle:  { fontFamily: fonts.serifSemi, fontWeight: '600' as const, fontSize: 34, lineHeight: 40, letterSpacing: -0.3 },
  cardTitle:    { fontFamily: fonts.serifSemi, fontWeight: '600' as const, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  // Outfit — content
  sectionHeader:{ fontFamily: fonts.sansMed,   fontWeight: '500' as const, fontSize: 18, lineHeight: 24 },
  body:         { fontFamily: fonts.sans,       fontWeight: '400' as const, fontSize: 16, lineHeight: 24, letterSpacing: 0.2 },
  secondaryBody:{ fontFamily: fonts.sans,       fontWeight: '400' as const, fontSize: 15, lineHeight: 23 },
  caption:      { fontFamily: fonts.sansMed,    fontWeight: '500' as const, fontSize: 13, lineHeight: 18 },
  metadata:     { fontFamily: fonts.sans,       fontWeight: '400' as const, fontSize: 12, lineHeight: 16 },
} as const;

// Spacing rules for headings, so vertical rhythm is consistent screen to screen.
export const TYPE_SPACING = {
  headingAbove: 16, // space above a section header
  headingBelow: 12, // space below a section header, before its content
  cardPadding: 20,  // internal card padding (was 18) for a calmer, more premium density
} as const;

export type TypoVariant = keyof typeof TYPO;
