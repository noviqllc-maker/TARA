// src/lib/mantras.ts
// The nine graha mantras for the Japa practice — Devanagari, transliteration, a one-line
// meaning, and the graha's traditional day. Deterministic lookup; the featured mantra for a
// given day is the vāra (weekday) lord's, reusing the same day-lord the rest of the app uses.
import { varaLord } from '@/lib/panchanga';

export type GrahaMantra = {
  graha: string;
  glyph: string;
  devanagari: string;
  translit: string;
  meaning: string;   // one line
  day: string;       // traditional day of the week
};

// Order follows the classical navagraha sequence.
export const MANTRA_LIB: GrahaMantra[] = [
  { graha: 'Sun',     glyph: '☉', devanagari: 'ॐ सूर्याय नमः',      translit: 'Oṃ Sūryāya Namaḥ',       meaning: 'Salutations to the Sun: vitality, confidence, and clear purpose.', day: 'Sunday' },
  { graha: 'Moon',    glyph: '☾', devanagari: 'ॐ चन्द्राय नमः',     translit: 'Oṃ Chandrāya Namaḥ',      meaning: 'Salutations to the Moon: calm, care, and steady feeling.',        day: 'Monday' },
  { graha: 'Mars',    glyph: '♂', devanagari: 'ॐ मङ्गलाय नमः',     translit: 'Oṃ Maṅgalāya Namaḥ',      meaning: 'Salutations to Mars: courage, focus, and channelled energy.',      day: 'Tuesday' },
  { graha: 'Mercury', glyph: '☿', devanagari: 'ॐ बुधाय नमः',       translit: 'Oṃ Budhāya Namaḥ',        meaning: 'Salutations to Mercury: clear thought and honest speech.',         day: 'Wednesday' },
  { graha: 'Jupiter', glyph: '♃', devanagari: 'ॐ गुरवे नमः',        translit: 'Oṃ Gurave Namaḥ',         meaning: 'Salutations to Jupiter (the Guru): wisdom, grace, and growth.',     day: 'Thursday' },
  { graha: 'Venus',   glyph: '♀', devanagari: 'ॐ शुक्राय नमः',      translit: 'Oṃ Śukrāya Namaḥ',        meaning: 'Salutations to Venus: love, harmony, and beauty.',                 day: 'Friday' },
  { graha: 'Saturn',  glyph: '♄', devanagari: 'ॐ शनैश्चराय नमः',   translit: 'Oṃ Śanaiścarāya Namaḥ',   meaning: 'Salutations to Saturn: patience, structure, and enduring strength.', day: 'Saturday' },
  { graha: 'Rahu',    glyph: '☊', devanagari: 'ॐ राहवे नमः',       translit: 'Oṃ Rāhave Namaḥ',         meaning: 'Salutations to Rahu: grounding ambition and clearing confusion.',  day: 'Saturday' },
  { graha: 'Ketu',    glyph: '☋', devanagari: 'ॐ केतवे नमः',       translit: 'Oṃ Ketave Namaḥ',         meaning: 'Salutations to Ketu: release, detachment, and inner clarity.',     day: 'Tuesday' },
];

const BY_GRAHA: Record<string, GrahaMantra> = MANTRA_LIB.reduce((m, x) => ((m[x.graha] = x), m), {} as Record<string, GrahaMantra>);

export const mantraFor = (graha: string): GrahaMantra => BY_GRAHA[graha] ?? BY_GRAHA.Moon;

// The featured graha for a date = the weekday lord (Sun..Saturn). Rahu/Ketu are never day
// lords, so the featured mantra is always one of the seven vāra grahas.
export const dayMantra = (date: Date = new Date()): GrahaMantra => mantraFor(varaLord(date).lord);
