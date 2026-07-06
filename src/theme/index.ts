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

// Brand type: Fraunces (elegant serif) for headings/wordmark/display numbers,
// Outfit (clean sans) for body/labels/buttons/inputs. Loaded in app/_layout.tsx.
// The shared <Text> (components/ui) maps fontWeight → the correct weighted family,
// so existing `fontWeight` values keep rendering the right weight.
export const fonts = {
  // Fraunces — display / headings
  serif: 'Fraunces_400Regular',
  serifMed: 'Fraunces_500Medium',
  serifSemi: 'Fraunces_600SemiBold',
  serifBold: 'Fraunces_700Bold',
  // Outfit — body / supporting
  sansLight: 'Outfit_300Light',
  sans: 'Outfit_400Regular',
  sansMed: 'Outfit_500Medium',
  sansSemi: 'Outfit_600SemiBold',
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
