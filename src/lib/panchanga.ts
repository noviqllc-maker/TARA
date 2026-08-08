// src/lib/panchanga.ts
// Deterministic "Today's Cosmic Events" — no AI, no randomness, changes day to day.
// Combines the live panchanga (Moon sign/nakshatra/tithi from computeTransits) with
// the vara (weekday) lord and the standard Vedic associations that follow from it:
// planet of the day, an auspicious power-hour window (day-lord horā), and the day
// lord's lucky colour + number. Everything keys off the calendar day + weekday, so the
// card is stable within a day and rotates across the week.

import { BirthChart } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { getSunriseSunset, getHoraWindows, getRahukalam, getAbhijitMuhurta } from '@/lib/astronomy';

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
// The "Power hours" label doesn't overclaim precision, so the fixed-sunrise approximation
// is fine for launch.
// TODO(post-launch): upgrade to location-accurate horā / Abhijit muhūrta windows once the
// engine computes real sunrise/sunset for the user's coordinates (needs lat/lon + date).
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

// A localized clock window ("HH:MM" to "HH:MM") with a one-line meaning.
export type TimeWindow = { start: string; end: string; description: string };

export type CosmicEvents = {
  moonSign: string;
  moonNakshatra: string;
  tithi: string;          // just the tithi name (paksha carried separately if needed)
  paksha: string;
  vara: string;           // Sanskrit weekday
  dayLord: DayLord;       // planet of the day
  dayLordGlyph: string;
  luckyColor: string;
  luckyColorHex: string;
  luckyNumber: number;
  // Location-aware solar timing. Null when the birth place is unknown (no lat/lon) or in
  // polar day/night; consumers fall back gracefully rather than showing a faked window.
  sunrise: string | null;   // "HH:MM" local to the birth place
  sunset: string | null;
  powerHours: (TimeWindow & { lord: DayLord; windowMinutes: number }) | null;
  rahukalam: TimeWindow | null;
  abhijitMuhurta: TimeWindow | null;
};

export type CosmicLocation = { lat: number; lon: number; tzOffsetMinutes?: number };

export function computeCosmicEvents(
  chart: BirthChart | null,
  date: Date = new Date(),
  location?: CosmicLocation,
): CosmicEvents {
  const t = computeTransits(date, chart);
  // computeTransits packs panchanga as "<paksha> · <tithi>"; split it back out.
  const [paksha, tithi] = t.panchanga.split(' · ');
  const vw = VARA[date.getDay()];
  const info = DAY_LORD_INFO[vw.lord];

  // Location-aware windows only when we have real coordinates; otherwise leave them null so
  // the UI degrades gracefully instead of presenting a location-agnostic guess as precise.
  let sunrise: string | null = null;
  let sunset: string | null = null;
  let powerWindow: CosmicEvents['powerHours'] = null;
  let rahukalam: TimeWindow | null = null;
  let abhijitMuhurta: TimeWindow | null = null;
  if (location) {
    const { lat, lon, tzOffsetMinutes } = location;
    const ss = getSunriseSunset(date, lat, lon);
    sunrise = ss.sunrise ? fmtLocal(ss.sunrise, tzOffsetMinutes) : null;
    sunset = ss.sunset ? fmtLocal(ss.sunset, tzOffsetMinutes) : null;
    const hora = getHoraWindows(date, lat, lon, vw.lord, tzOffsetMinutes);
    if (hora) {
      powerWindow = {
        lord: vw.lord,
        start: hora.start,
        end: hora.end,
        windowMinutes: hora.windowMinutes,
        description: `${vw.lord}'s horā`,
      };
    }
    rahukalam = getRahukalam(date, lat, lon, vw.lord, tzOffsetMinutes);
    abhijitMuhurta = getAbhijitMuhurta(date, lat, lon, tzOffsetMinutes);
  }

  return {
    moonSign: t.moonSign,
    moonNakshatra: t.moonNakshatra,
    tithi: tithi ?? t.panchanga,
    paksha: paksha ?? '',
    vara: vw.vara,
    dayLord: vw.lord,
    dayLordGlyph: vw.glyph,
    luckyColor: info.color,
    luckyColorHex: info.hex,
    luckyNumber: info.number,
    sunrise,
    sunset,
    powerHours: powerWindow,
    rahukalam,
    abhijitMuhurta,
  };
}

// Format an absolute instant as "HH:MM" at the birth place's timezone (minutes east of
// UTC). Mirrors astronomy.fmtHM; kept here so the panchanga module owns its own display.
function fmtLocal(instant: Date, tzOffsetMinutes?: number): string {
  const two = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (tzOffsetMinutes == null) return `${two(instant.getHours())}:${two(instant.getMinutes())}`;
  const shifted = new Date(instant.getTime() + tzOffsetMinutes * 60_000);
  return `${two(shifted.getUTCHours())}:${two(shifted.getUTCMinutes())}`;
}
