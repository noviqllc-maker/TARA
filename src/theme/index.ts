// src/theme/index.ts
// Tara design system — Deep cosmic, antique gold, refined.

export const colors = {
  black: '#08060c',
  bg: '#0e0a14',
  bg2: '#120c1c',
  indigo: '#241733',
  indigoSoft: '#2c1f3f',
  card: 'rgba(244,236,225,0.04)',
  cardSolid: 'rgba(36,23,51,0.55)',
  line: 'rgba(205,163,73,0.22)',

  cream: '#f5eee1',
  gold: '#cda349',
  goldSoft: '#e2c878',
  saffron: '#e8923a',
  terra: '#c2683f',
  rose: '#d98a86',
  sage: '#7e9b7a',
  lav: '#9d8bbd',
  muted: '#b6a8c4',
  mutedDim: 'rgba(182,168,196,0.6)',
} as const;

// Domain accent colors used across energy dashboards
export const domainColors = {
  Mind: colors.lav,
  Relationships: colors.rose,
  Career: colors.goldSoft,
  Body: colors.sage,
  Spiritual: colors.saffron,
} as const;

// All text now uses the iOS system font (SF Pro). Weight is controlled per-style
// via fontWeight ('400' regular, '600' semibold, '700' bold) — not via family name.
export const fonts = {
  serif: 'System',
  serifMed: 'System',
  sans: 'System',
  sansMed: 'System',
  sansSemi: 'System',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
} as const;

export const radius = {
  sm: 11,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const shadow = {
  glow: {
    shadowColor: colors.lav,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 10,
  },
  gold: {
    shadowColor: colors.terra,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
};

export type DomainKey = keyof typeof domainColors;

/* ============================================================================
 * TEMPLE-MATERIAL DESIGN SYSTEM (v2) — warm stone / vermillion / turmeric / sandalwood.
 * Additive: the cosmic tokens above remain for un-migrated screens. New screens use these.
 * ==========================================================================*/

export const ds = {
  stone: '#2B1B1E',     // app base — temple stone at dusk (primary background)
  stone2: '#3B2529',    // gradient depth for the stone base
  kumkum: '#BF4E30',    // primary accent — vermillion (CTAs, eyebrows)
  marigold: '#D8A31E',  // secondary accent — turmeric gold (hairlines, icons, highlights)
  sandal: '#F5EBDD',    // card/surface — sandalwood cream
  ink: '#2B2233',       // text on light/sandal surfaces
  night: '#1B1030',     // RESERVED — birth chart / nakshatra screens only
  moonlight: '#C8BEE0', // RESERVED — birth chart / nakshatra screens only

  // Derived helpers
  onStone: '#F5EBDD',                  // primary text on stone
  onStoneMuted: 'rgba(245,235,221,0.62)', // muted text on stone
  inkMuted: 'rgba(43,34,51,0.58)',     // muted text on sandal
  hairline: 'rgba(216,163,30,0.35)',   // marigold border @35%
  marigoldTint: 'rgba(216,163,30,0.15)', // icon-circle fill
  stoneSurface: 'rgba(0,0,0,0.22)',    // translucent dark surface for FlatCards on stone
} as const;

// Font families (loaded in app/_layout.tsx via @expo-google-fonts).
export const type = {
  display: 'Fraunces_400Regular',
  displayMed: 'Fraunces_500Medium',
  displaySemi: 'Fraunces_600SemiBold',
  body: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtra: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoMed: 'IBMPlexMono_500Medium',
} as const;

// New spacing scale: 4, 8, 12, 16, 24, 32, 48
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

// New radii: card = 28, chip = 12, pill = 999
export const radii = { card: 28, chip: 12, pill: 999 } as const;
