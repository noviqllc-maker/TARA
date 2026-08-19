// src/lib/calendar.ts
// Deterministic month-calendar data (no AI): per-day tithi markers (Amāvasyā / Pūrṇimā /
// Ekādaśī), the nitya-yoga, observances/festivals, and a full day detail (tithi + nakshatra
// meaning, best horā windows per life area, and the Abhijit / Rāhukālam muhūrta windows).
// Reuses the existing engines: computeTransits, computeObservances, computeCosmicEvents,
// and the astronomy horā schedule. Sun/Moon longitudes come from astronomy-engine, as in
// transits.ts.
import * as Astronomy from 'astronomy-engine';
import { BirthChart, NAKSHATRAS } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { computeObservances, Observance } from '@/lib/observances';
import { varaLord } from '@/lib/panchanga';
import { getHoraSchedule, getAbhijitMuhurta, getRahukalam } from '@/lib/astronomy';

const norm = (x: number) => ((x % 360) + 360) % 360;
function lahiriAyanamsa(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85337 + 1.396042 * T + 0.000308 * T * T;
}
// Sample near sunrise (~06:00 local), matching the panchānga convention (and observances.ts)
// that the tithi/yoga prevailing at sunrise names the day. Keeps the calendar's dots and the
// observance markers in agreement across a tithi that turns over during the night.
const atSunrise = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0, 0);
function sunMoonLon(date: Date): { sun: number; moon: number } {
  return {
    sun: Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun, date, true)).elon,
    moon: Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, date, true)).elon,
  };
}

// ---- Tithi (lunar day) special-marker classification --------------------------
export type TithiSpecial = 'amavasya' | 'purnima' | 'ekadashi' | null;
export function tithiSpecialOf(date: Date): { tithiNum: number; special: TithiSpecial } {
  const { sun, moon } = sunMoonLon(atSunrise(date));
  const tithiNum = Math.floor(norm(moon - sun) / 12); // 0..29
  const special: TithiSpecial =
    tithiNum === 29 ? 'amavasya' : tithiNum === 14 ? 'purnima' : (tithiNum === 10 || tithiNum === 25) ? 'ekadashi' : null;
  return { tithiNum, special };
}

// ---- Nitya yoga (Sun+Moon sidereal longitude) ---------------------------------
const YOGA_NAMES = [
  'Viṣkambha', 'Prīti', 'Āyuṣmān', 'Saubhāgya', 'Śobhana', 'Atigaṇḍa', 'Sukarma', 'Dhṛti', 'Śūla',
  'Gaṇḍa', 'Vṛddhi', 'Dhruva', 'Vyāghāta', 'Harṣaṇa', 'Vajra', 'Siddhi', 'Vyatīpāta', 'Varīyān',
  'Parigha', 'Śiva', 'Siddha', 'Sādhya', 'Śubha', 'Śukla', 'Brahma', 'Aindra', 'Vaidhṛti',
];
// The traditionally auspicious yogas surfaced with a ⭐ on the calendar.
const AUSPICIOUS_YOGAS = new Set([
  'Prīti', 'Āyuṣmān', 'Saubhāgya', 'Śobhana', 'Sukarma', 'Dhṛti', 'Vṛddhi', 'Dhruva', 'Harṣaṇa',
  'Siddhi', 'Siddha', 'Sādhya', 'Śubha', 'Śukla', 'Brahma', 'Aindra',
]);
export function nityaYoga(date: Date): { name: string; major: boolean } {
  const d = atSunrise(date);
  const a = lahiriAyanamsa(d);
  const { sun, moon } = sunMoonLon(d);
  const idx = Math.floor(norm((sun - a) + (moon - a)) / (360 / 27)) % 27;
  const name = YOGA_NAMES[idx];
  return { name, major: AUSPICIOUS_YOGAS.has(name) };
}

// ---- Month grid + per-day markers ---------------------------------------------
export type DayMarker = { special: TithiSpecial; yogaMajor: boolean; observance: Observance | null };
export type DayCell = { date: Date; day: number; inMonth: boolean; isToday: boolean; marker: DayMarker };

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function buildMonth(year: number, month: number, today: Date = new Date()): { weeks: DayCell[][]; label: string } {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay(); // 0 = Sunday

  // Festivals / sankranti / lunar observances for the whole month, mapped by day.
  const obsByDay = new Map<string, Observance>();
  for (const o of computeObservances(first, daysInMonth)) {
    // Prefer a named festival/sankranti for the icon; keep the first per day otherwise.
    const k = dayKey(o.date);
    const existing = obsByDay.get(k);
    if (!existing || (existing.kind !== 'festival' && o.kind === 'festival')) obsByDay.set(k, o);
  }

  const emptyMarker: DayMarker = { special: null, yogaMajor: false, observance: null };
  // Only compute the (heavier) tithi/yoga markers for in-month days; padding days are dimmed.
  const markerFor = (d: Date): DayMarker => ({
    special: tithiSpecialOf(d).special,
    yogaMajor: nityaYoga(d).major,
    observance: obsByDay.get(dayKey(d)) ?? null,
  });

  // The grid starts on the Sunday of the first week and runs whole weeks (5 or 6 as needed).
  const gridStart = new Date(year, month, 1 - startWeekday);
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  const cells: DayCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const inMonth = d.getMonth() === month;
    cells.push({ date: d, day: d.getDate(), inMonth, isToday: sameDay(d, today), marker: inMonth ? markerFor(d) : emptyMarker });
  }

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { weeks, label };
}

// ---- Full day detail (for the tapped-day modal) -------------------------------
export type CalLocation = { lat: number; lon: number; tzOffsetMinutes?: number };
export interface DayDetail {
  dateLabel: string;
  tithi: string;
  tithiMeaning: string;
  nakshatra: string;
  nakshatraMeaning: string;
  yoga: string;
  yogaNote: string;
  observance: Observance | null;
  bestHours: { area: string; window: string | null }[];
  abhijit: string | null;
  rahukalam: string | null;
}

// Short, informational meaning for the day's tithi group.
function tithiMeaning(special: TithiSpecial): string {
  switch (special) {
    case 'amavasya': return 'New Moon: a quiet, inward turning point, traditionally for rest, remembrance, and setting intentions before the next cycle.';
    case 'purnima': return 'Full Moon: emotions and energy run full and receptive, long associated with completion, gratitude, and devotion.';
    case 'ekadashi': return 'The eleventh lunar day, held as a light, sattvic window for fasting, prayer, and turning inward.';
    default: return 'An ordinary lunar day; work with the Moon\'s current sign and nakshatra rather than a special marker.';
  }
}
// Nakshatra meaning via its Vimshottari ruler.
const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const LORD_THEME: Record<string, string> = {
  Ketu: 'insight, detachment, and spiritual depth', Venus: 'warmth, beauty, and connection',
  Sun: 'clarity, will, and visibility', Moon: 'feeling, care, and receptivity',
  Mars: 'drive, courage, and initiative', Rahu: 'ambition and the pull of the new',
  Jupiter: 'growth, wisdom, and good faith', Saturn: 'patience, structure, and steady effort',
  Mercury: 'thought, communication, and skill',
};
function nakshatraMeaning(nak: string): string {
  const i = NAKSHATRAS.indexOf(nak);
  const lord = i >= 0 ? NAK_LORDS[i % 9] : 'Moon';
  return `Ruled by ${lord}; a day colored by ${LORD_THEME[lord] ?? 'its own quiet tone'}.`;
}

// Life area -> horā-ruling planets, in preference order.
const AREA_PLANETS: { area: string; planets: string[] }[] = [
  { area: 'Career', planets: ['Sun', 'Saturn', 'Mars'] },
  { area: 'Love', planets: ['Venus', 'Moon'] },
  { area: 'Money', planets: ['Mercury', 'Jupiter'] },
  { area: 'Spiritual', planets: ['Jupiter', 'Moon'] },
];

export function dayDetail(date: Date, chart: BirthChart | null, location?: CalLocation): DayDetail {
  const t = computeTransits(atSunrise(date), chart); // sunrise sample, so tithi name matches the dot
  const [, tithiName] = t.panchanga.split(' · ');
  const { special } = tithiSpecialOf(date);
  const yoga = nityaYoga(date);
  const dayLord = varaLord(date).lord;

  let bestHours: { area: string; window: string | null }[] = AREA_PLANETS.map((a) => ({ area: a.area, window: null }));
  let abhijit: string | null = null;
  let rahukalam: string | null = null;
  if (location) {
    const { lat, lon, tzOffsetMinutes } = location;
    const schedule = getHoraSchedule(date, lat, lon, dayLord, tzOffsetMinutes);
    if (schedule) {
      bestHours = AREA_PLANETS.map(({ area, planets }) => {
        let window: string | null = null;
        for (const p of planets) {
          const h = schedule.find((x) => x.lord === p);
          if (h) { window = `${h.start} – ${h.end}`; break; }
        }
        return { area, window };
      });
    }
    const ab = getAbhijitMuhurta(date, lat, lon, tzOffsetMinutes);
    abhijit = ab ? `${ab.start} – ${ab.end}` : null;
    const ra = getRahukalam(date, lat, lon, dayLord, tzOffsetMinutes);
    rahukalam = ra ? `${ra.start} – ${ra.end}` : null;
  }

  const obs = computeObservances(date, 1).find((o) => o.daysAway === 0) ?? null;

  return {
    dateLabel: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    tithi: tithiName ?? t.panchanga,
    tithiMeaning: tithiMeaning(special),
    nakshatra: t.moonNakshatra,
    nakshatraMeaning: nakshatraMeaning(t.moonNakshatra),
    yoga: yoga.name,
    yogaNote: yoga.major ? 'A traditionally auspicious yoga.' : 'A neutral yoga for the day.',
    observance: obs,
    bestHours,
    abhijit,
    rahukalam,
  };
}
