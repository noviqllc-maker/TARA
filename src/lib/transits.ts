// src/lib/transits.ts
// Live "today" sky: moon phase, tithi (panchanga), the Moon's current nakshatra,
// and — relative to the user's birth chart — which house the Moon is transiting.
// This is what makes the daily guidance personal and current.

import * as Astronomy from 'astronomy-engine';
import { SIGNS, NAKSHATRAS, BirthChart } from '@/lib/vedic';

const norm = (x: number) => ((x % 360) + 360) % 360;

function lahiriAyanamsa(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85337 + 1.396042 * T + 0.000308 * T * T;
}

const PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

const TITHI_NAMES = [
  'Pratipada', 'Dvitīyā', 'Tritīyā', 'Chaturthī', 'Pañchamī', 'Ṣaṣṭhī',
  'Saptamī', 'Aṣṭamī', 'Navamī', 'Daśamī', 'Ekādaśī', 'Dvādaśī',
  'Trayodaśī', 'Chaturdaśī', 'Pūrṇimā',
];

export type Transits = {
  moonPhase: string;
  moonSign: string;
  moonNakshatra: string;
  panchanga: string;       // paksha + tithi
  transitText: string;     // e.g. "Moon transiting your 8th house"
  moonHouse: number | null;
};

export function computeTransits(date: Date, chart: BirthChart | null): Transits {
  const a = lahiriAyanamsa(date);
  const sunLon = Astronomy.Ecliptic(Astronomy.GeoVector('Sun', date, true)).elon;
  const moonLon = Astronomy.Ecliptic(Astronomy.GeoVector('Moon', date, true)).elon;

  const elong = norm(moonLon - sunLon);
  const phase = PHASES[Math.floor(((elong + 22.5) % 360) / 45)];

  const moonSid = norm(moonLon - a);
  const moonSignIdx = Math.floor(moonSid / 30);
  const moonNak = NAKSHATRAS[Math.floor(moonSid / (360 / 27))];

  // Tithi (lunar day) and paksha (waxing/waning fortnight)
  const tithiNum = Math.floor(elong / 12); // 0..29
  const paksha = tithiNum < 15 ? 'Shukla Pakṣa' : 'Krishna Pakṣa';
  const tIdx = tithiNum % 15;
  const tithiName = tIdx === 14 && tithiNum >= 15 ? 'Amāvasyā' : TITHI_NAMES[tIdx];
  const panchanga = `${paksha} · ${tithiName}`;

  // Which of the user's houses is the Moon transiting now?
  let moonHouse: number | null = null;
  let transitText = `Moon in ${SIGNS[moonSignIdx]}`;
  if (chart) {
    moonHouse = ((moonSignIdx - chart.ascendant.signIndex + 12) % 12) + 1;
    transitText = `Moon transiting your ${ordinal(moonHouse)} house`;
  }

  return {
    moonPhase: phase,
    moonSign: SIGNS[moonSignIdx],
    moonNakshatra: moonNak,
    panchanga,
    transitText,
    moonHouse,
  };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// House-based daily theme — the seed for personalized guidance.
export function houseTheme(house: number | null): { mood: string; lean: string; avoid: string } {
  const themes: Record<number, { mood: string; lean: string; avoid: string }> = {
    1: { mood: 'Self-focused and energized', lean: 'Personal initiatives, movement, fresh starts', avoid: 'Self-neglect, overcommitting to others' },
    2: { mood: 'Grounded and value-seeking', lean: 'Finances, family, nourishing food', avoid: 'Impulsive spending, harsh words' },
    3: { mood: 'Communicative and bold', lean: 'Conversations, short trips, courage', avoid: 'Overthinking, scattered effort' },
    4: { mood: 'Inward and tender', lean: 'Home, rest, emotional care', avoid: 'Big external pushes, confrontation' },
    5: { mood: 'Creative and playful', lean: 'Self-expression, romance, joy', avoid: 'Ego clashes, gambling with stakes' },
    6: { mood: 'Practical and service-minded', lean: 'Health routines, tackling tasks', avoid: 'Conflict, overwork, worry spirals' },
    7: { mood: 'Relational and collaborative', lean: 'Partnership, listening, fairness', avoid: 'Going it alone, people-pleasing' },
    8: { mood: 'Deep and transformative', lean: 'Reflection, rest, inner work', avoid: 'Major decisions, emotional reactivity' },
    9: { mood: 'Expansive and seeking', lean: 'Learning, travel, meaning, faith', avoid: 'Dogmatism, overpromising' },
    10: { mood: 'Driven and visible', lean: 'Career moves, responsibility, structure', avoid: 'Burnout, neglecting home' },
    11: { mood: 'Social and aspirational', lean: 'Networks, goals, community', avoid: 'Spreading thin, hollow busyness' },
    12: { mood: 'Quiet and dissolving', lean: 'Solitude, sleep, spiritual practice', avoid: 'Big launches, draining commitments' },
  };
  return house ? themes[house] : { mood: 'Balanced', lean: 'Steady, mindful action', avoid: 'Extremes' };
}
