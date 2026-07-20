// src/data/traitLines.ts
// Warm, specific trait lines for the placements-reveal screen. Three lines per user:
// (1) Moon nakshatra (27), (2) Moon sign (12), (3) Ascendant sign (12). Consistent
// with Vedic characterizations; each is meant to feel seen, never insulting.
import type { BirthChart } from '@/lib/vedic';

// Keyed by nakshatra name (exactly as the engine's NAKSHATRAS array spells them).
export const NAKSHATRA_TRAITS: Record<string, string> = {
  Ashwini: 'Fast starter, restless heart',
  Bharani: 'Fierce, creative, transformative',
  Krittika: 'Sharp, bright, purifying',
  Rohini: 'Magnetic, sensual, grounded',
  Mrigashira: 'Curious seeker, gentle wanderer',
  Ardra: 'Stormy mind, renewing spirit',
  Punarvasu: 'Hopeful, generous, ever-returning',
  Pushya: 'Nurturing, steady, quietly wise',
  Ashlesha: 'Intuitive, hypnotic, deep',
  Magha: 'Regal, proud, ancestral',
  Magh: 'Regal, proud, ancestral',
  'Purva Phalguni': 'Warm, playful, creative',
  'Uttara Phalguni': 'Loyal, giving, dependable',
  Hasta: 'Skilled hands, clever mind',
  Chitra: 'Radiant, artful, precise',
  Swati: 'Independent, breezy, self-made',
  Vishakha: 'Driven, focused, determined',
  Anuradha: 'Devoted, friendly, disciplined',
  Jyeshtha: 'Protective, sharp, resilient',
  Mula: 'Truth-seeking, rooted, intense',
  'Purva Ashadha': 'Bold, persuasive, buoyant',
  'Uttara Ashadha': 'Principled, patient, victorious',
  Shravana: 'Listening, learned, connected',
  Dhanishta: 'Rhythmic, ambitious, generous',
  Shatabhisha: 'Private, healing, visionary',
  'Purva Bhadrapada': 'Fiery, idealistic, deep',
  'Uttara Bhadrapada': 'Calm, wise, compassionate',
  Revati: 'Tender, guiding, expansive',
};

// Keyed by Moon sign.
export const MOON_SIGN_TRAITS: Record<string, string> = {
  Aries: 'Quick to feel, quick to act',
  Taurus: 'Steady and sensual',
  Gemini: 'Curious and quick',
  Cancer: 'Your feeling runs deep',
  Leo: 'Warm-hearted and proud',
  Virgo: 'Precise and quietly caring',
  Libra: 'You seek harmony',
  Scorpio: 'Intense and private',
  Sagittarius: 'Free and seeking',
  Capricorn: 'Patient and driven',
  Aquarius: 'Original and humane',
  Pisces: 'Dreamy and kind',
};

// Keyed by Ascendant (lagna) sign.
export const ASCENDANT_TRAITS: Record<string, string> = {
  Aries: 'You lead with courage',
  Taurus: 'You move with patience',
  Gemini: 'You meet the world curious',
  Cancer: 'You protect what you love',
  Leo: 'You shine without asking',
  Virgo: 'You refine what you touch',
  Libra: 'You bring people together',
  Scorpio: 'You feel beneath the surface',
  Sagittarius: 'You aim for meaning',
  Capricorn: 'You build to last',
  Aquarius: 'You see a different future',
  Pisces: 'You dissolve every boundary',
};

// The three trait lines for a chart, in order: nakshatra → Moon sign → Ascendant.
export function getTraitLines(chart: BirthChart): string[] {
  return [
    NAKSHATRA_TRAITS[chart.nakshatra] ?? 'Guided by your own rhythm',
    MOON_SIGN_TRAITS[chart.moonSign] ?? 'Led by a feeling heart',
    ASCENDANT_TRAITS[chart.ascendant.sign] ?? 'You meet the world as yourself',
  ];
}
