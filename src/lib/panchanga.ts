// src/lib/panchanga.ts
// Deterministic "Today's Cosmic Events" — no AI, no randomness, changes day to day.
// Combines the live panchanga (Moon sign/nakshatra/tithi from computeTransits) with
// the vara (weekday) lord and the standard Vedic associations that follow from it:
// planet of the day, an auspicious power-hour window (day-lord horā), and the day
// lord's lucky colour + number. Everything keys off the calendar day + weekday, so the
// card is stable within a day and rotates across the week.

import { BirthChart } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';

export type DayLord =
  | 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

// Weekday (0 = Sunday) → { Sanskrit vāra, ruling graha, glyph }.
const VARA: { vara: string; lord: DayLord; glyph: string }[] = [
  { vara: 'Ravivāra',    lord: 'Sun',     glyph: '☉' }, // Sunday
  { vara: 'Somavāra',    lord: 'Moon',    glyph: '☾' }, // Monday
  { vara: 'Maṅgalavāra', lord: 'Mars',    glyph: '♂' }, // Tuesday
  { vara: 'Budhavāra',   lord: 'Mercury', glyph: '☿' }, // Wednesday
  { vara: 'Guruvāra',    lord: 'Jupiter', glyph: '♃' }, // Thursday
  { vara: 'Śukravāra',   lord: 'Venus',   glyph: '♀' }, // Friday
  { vara: 'Śanivāra',    lord: 'Saturn',  glyph: '♄' }, // Saturday
];

// Standard Vedic day-lord associations: lucky colour (with a swatch hex) and number.
const DAY_LORD_INFO: Record<DayLord, { color: string; hex: string; number: number }> = {
  Sun:     { color: 'Orange',  hex: '#e8913a', number: 1 },
  Moon:    { color: 'White',   hex: '#f2ede3', number: 2 },
  Mars:    { color: 'Red',     hex: '#c0392b', number: 9 },
  Mercury: { color: 'Green',   hex: '#3faf6f', number: 5 },
  Jupiter: { color: 'Yellow',  hex: '#e2c052', number: 3 },
  Venus:   { color: 'Pink',    hex: '#e6a9c0', number: 6 },
  Saturn:  { color: 'Indigo',  hex: '#5566a8', number: 8 },
};

function fmtHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${period}`;
}

// The day lord's own auspicious horā window in the afternoon. Approximates sunrise at
// 6:00 local; the day lord rules horā 0 (6–7 AM) and recurs 7 hours later (1–2 PM),
// giving a workable midday "power hour". The graha shown rotates with the weekday.
export function powerHours(date: Date): { lord: DayLord; window: string } {
  const lord = VARA[date.getDay()].lord;
  const start = 6 + 7; // horā index 7 after a 6 AM sunrise → 1 PM
  return { lord, window: `${fmtHour(start)} – ${fmtHour(start + 1)}` };
}

// Weekday lord for a date (Sun..Saturn). Small helper reused by the AI context builder.
export function varaLord(date: Date): { vara: string; lord: DayLord } {
  const v = VARA[date.getDay()];
  return { vara: v.vara, lord: v.lord };
}

export type CosmicEvents = {
  moonSign: string;
  moonNakshatra: string;
  tithi: string;          // just the tithi name (paksha carried separately if needed)
  paksha: string;
  vara: string;           // Sanskrit weekday
  dayLord: DayLord;       // planet of the day
  dayLordGlyph: string;
  power: { lord: DayLord; window: string };
  luckyColor: string;
  luckyColorHex: string;
  luckyNumber: number;
};

export function computeCosmicEvents(chart: BirthChart | null, date: Date = new Date()): CosmicEvents {
  const t = computeTransits(date, chart);
  // computeTransits packs panchanga as "<paksha> · <tithi>"; split it back out.
  const [paksha, tithi] = t.panchanga.split(' · ');
  const vw = VARA[date.getDay()];
  const info = DAY_LORD_INFO[vw.lord];
  return {
    moonSign: t.moonSign,
    moonNakshatra: t.moonNakshatra,
    tithi: tithi ?? t.panchanga,
    paksha: paksha ?? '',
    vara: vw.vara,
    dayLord: vw.lord,
    dayLordGlyph: vw.glyph,
    power: powerHours(date),
    luckyColor: info.color,
    luckyColorHex: info.hex,
    luckyNumber: info.number,
  };
}
