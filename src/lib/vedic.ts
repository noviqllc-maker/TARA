// src/lib/vedic.ts
// Real Vedic (sidereal) astrology engine — computes an actual birth chart from
// date, time, and place. Pure JS (astronomy-engine), runs in React Native/Hermes.
//
// Pipeline: astronomy-engine gives tropical ecliptic longitudes -> subtract Lahiri
// ayanamsa to get sidereal (Vedic) positions -> derive signs, houses (whole-sign
// from the sidereal ascendant), Moon's nakshatra, and the Vimshottari dasha timeline.

import * as Astronomy from 'astronomy-engine';

const norm = (x: number) => ((x % 360) + 360) % 360;
const DEG = Math.PI / 180;

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Each sign's ruling planet (used for chart context)
const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

// Vimshottari dasha sequence: [lord, years]; 120-year cycle
const DASHA_SEQ: [string, number][] = [
  ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7],
  ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17],
];

const PLANET_GLYPHS: Record<string, string> = {
  Sun: '☉', Moon: '☾', Mars: '♂', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋',
};

export type PlanetPosition = {
  name: string;
  glyph: string;
  sign: string;
  signIndex: number;
  house: number;
  degree: string;        // e.g. "12°48′"
  longitude: number;     // sidereal ecliptic longitude
  retrograde: boolean;
  explanation: string;
};

export type DashaPeriod = {
  planet: string;
  start: number;         // year
  end: number;
  theme: string;
  phase: 'past' | 'present' | 'future';
};

export type BirthChart = {
  ascendant: { sign: string; signIndex: number; degree: string };
  sunSign: string;
  moonSign: string;
  nakshatra: string;
  nakshatraPada: number;
  rulingPlanet: string;
  planets: PlanetPosition[];
  dasha: DashaPeriod[];
  currentDasha: string;
  aspects: string[];
};

export type BirthInput = {
  date: string;          // "YYYY-MM-DD"
  time: string;          // "HH:MM" (local)
  lat: number;
  lon: number;
  tzOffsetMinutes: number; // minutes to subtract to get UTC (e.g. IST = +330)
};

// ---- Lahiri ayanamsa (sidereal correction angle) ----
function lahiriAyanamsa(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85337 + 1.396042 * T + 0.000308 * T * T;
}

// ---- Ascendant (Lagna) from local sidereal time + latitude ----
function computeAscendant(date: Date, lat: number, lon: number, ayan: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  gmst = norm(gmst);
  const ramc = norm(gmst + lon);
  const obl = 23.4392911 - 0.0130042 * T;
  const asc = Math.atan2(
    Math.cos(ramc * DEG),
    -(Math.sin(ramc * DEG) * Math.cos(obl * DEG) + Math.tan(lat * DEG) * Math.sin(obl * DEG)),
  );
  return norm(norm(asc / DEG) - ayan);
}

function degMin(longitude: number): string {
  const within = longitude % 30;
  const d = Math.floor(within);
  const m = Math.floor((within - d) * 60);
  return `${d}°${m.toString().padStart(2, '0')}′`;
}

function siderealLongitude(body: any, date: Date, ayan: number): { lon: number; retro: boolean } {
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  // crude retrograde check: compare longitude a day later (Sun/Moon never retro)
  let retro = false;
  if (body !== 'Sun' && body !== 'Moon') {
    const vec2 = Astronomy.GeoVector(body, new Date(date.getTime() + 86400000), true);
    const ecl2 = Astronomy.Ecliptic(vec2);
    let diff = ecl2.elon - ecl.elon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    retro = diff < 0;
  }
  return { lon: norm(ecl.elon - ayan), retro };
}

// ---- Interpretation text (sign + house themes) ----
function explain(planet: string, sign: string, house: number): string {
  const houseThemes: Record<number, string> = {
    1: 'self, vitality, and how you meet the world',
    2: 'wealth, speech, and family values',
    3: 'courage, communication, and siblings',
    4: 'home, mother, and inner peace',
    5: 'creativity, romance, and children',
    6: 'health, service, and overcoming obstacles',
    7: 'partnership, marriage, and others',
    8: 'transformation, depth, and hidden matters',
    9: 'fortune, dharma, and higher learning',
    10: 'career, status, and public life',
    11: 'gains, networks, and aspirations',
    12: 'release, spirituality, and the unseen',
  };
  const planetThemes: Record<string, string> = {
    Sun: 'Your core identity and vitality express here',
    Moon: 'Your emotional nature and mind are anchored here',
    Mars: 'Your drive, courage, and energy focus here',
    Mercury: 'Your intellect and communication operate here',
    Jupiter: 'Growth, wisdom, and good fortune expand here',
    Venus: 'Love, beauty, and harmony flow here',
    Saturn: 'Discipline, patience, and lasting structure build here',
    Rahu: 'A karmic hunger and worldly ambition pull here',
    Ketu: 'Detachment and past-life mastery sit here',
  };
  return `${planetThemes[planet] || 'This planet operates here'}, in ${sign} — shaping your ${houseThemes[house]}.`;
}

const DASHA_THEMES: Record<string, string> = {
  Ketu: 'Spiritual turning, release, and inward focus',
  Venus: 'Love, beauty, comfort, and creative abundance',
  Sun: 'Identity, leadership, recognition, and clarity',
  Moon: 'Emotion, nurturing, home, and intuition',
  Mars: 'Drive, courage, action, and building',
  Rahu: 'Ambition, worldly desire, and unconventional growth',
  Jupiter: 'Wisdom, expansion, fortune, and meaning',
  Saturn: 'Discipline, mastery, responsibility, and legacy',
  Mercury: 'Intellect, communication, learning, and commerce',
};

function buildDasha(moonSid: number, birth: Date): { timeline: DashaPeriod[]; current: string } {
  const nakSpan = 360 / 27;
  const nakIdx = Math.floor(moonSid / nakSpan);
  const posInNak = (moonSid % nakSpan) / nakSpan;
  const startLord = nakIdx % 9;
  const firstYears = DASHA_SEQ[startLord][1];
  const remaining = firstYears - posInNak * firstYears;

  const now = new Date();
  const timeline: DashaPeriod[] = [];
  let cursor = new Date(birth);
  let current = '';

  for (let i = 0; i < 9; i++) {
    const [lord, years] = DASHA_SEQ[(startLord + i) % 9];
    const dur = i === 0 ? remaining : years;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + dur * 365.25 * 86400000);
    const phase: DashaPeriod['phase'] =
      now >= start && now < end ? 'present' : now >= end ? 'past' : 'future';
    if (phase === 'present') current = `${lord} Mahādasha`;
    timeline.push({
      planet: lord,
      start: start.getFullYear(),
      end: end.getFullYear(),
      theme: DASHA_THEMES[lord],
      phase,
    });
    cursor = end;
  }
  return { timeline, current };
}

// ---- Main entry point ----
export function computeChart(input: BirthInput): BirthChart {
  // Build a UTC Date from local birth date/time + timezone offset
  const [y, mo, d] = input.date.split('-').map(Number);
  const [h, mi] = input.time.split(':').map(Number);
  const utcMs = Date.UTC(y, (mo || 1) - 1, d || 1, h || 0, mi || 0) - input.tzOffsetMinutes * 60000;
  const birth = new Date(utcMs);

  const ayan = lahiriAyanamsa(birth);
  const ascLon = computeAscendant(birth, input.lat, input.lon, ayan);
  const ascSignIdx = Math.floor(ascLon / 30);

  const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const planets: PlanetPosition[] = [];

  let sunSign = '', moonSign = '', moonLon = 0;

  for (const b of bodies) {
    const { lon, retro } = siderealLongitude(b, birth, ayan);
    const signIdx = Math.floor(lon / 30);
    const house = ((signIdx - ascSignIdx + 12) % 12) + 1;
    planets.push({
      name: b, glyph: PLANET_GLYPHS[b], sign: SIGNS[signIdx], signIndex: signIdx,
      house, degree: degMin(lon), longitude: lon, retrograde: retro,
      explanation: explain(b, SIGNS[signIdx], house),
    });
    if (b === 'Sun') sunSign = SIGNS[signIdx];
    if (b === 'Moon') { moonSign = SIGNS[signIdx]; moonLon = lon; }
  }

  // Rahu (north lunar node) — mean node; Ketu is opposite
  const meanNode = computeRahu(birth, ayan);
  const rahuIdx = Math.floor(meanNode / 30);
  const ketuLon = norm(meanNode + 180);
  const ketuIdx = Math.floor(ketuLon / 30);
  planets.push({
    name: 'Rahu', glyph: '☊', sign: SIGNS[rahuIdx], signIndex: rahuIdx,
    house: ((rahuIdx - ascSignIdx + 12) % 12) + 1, degree: degMin(meanNode),
    longitude: meanNode, retrograde: true, explanation: explain('Rahu', SIGNS[rahuIdx], ((rahuIdx - ascSignIdx + 12) % 12) + 1),
  });
  planets.push({
    name: 'Ketu', glyph: '☋', sign: SIGNS[ketuIdx], signIndex: ketuIdx,
    house: ((ketuIdx - ascSignIdx + 12) % 12) + 1, degree: degMin(ketuLon),
    longitude: ketuLon, retrograde: true, explanation: explain('Ketu', SIGNS[ketuIdx], ((ketuIdx - ascSignIdx + 12) % 12) + 1),
  });

  // Nakshatra (from Moon)
  const nakSpan = 360 / 27;
  const nakIdx = Math.floor(moonLon / nakSpan);
  const pada = Math.floor((moonLon % nakSpan) / (nakSpan / 4)) + 1;

  const { timeline, current } = buildDasha(moonLon, birth);

  return {
    ascendant: { sign: SIGNS[ascSignIdx], signIndex: ascSignIdx, degree: degMin(ascLon) },
    sunSign,
    moonSign,
    nakshatra: NAKSHATRAS[nakIdx],
    nakshatraPada: pada,
    rulingPlanet: SIGN_LORDS[Math.floor(moonLon / 30)],
    planets,
    dasha: timeline,
    currentDasha: current,
    aspects: deriveAspects(planets, SIGNS[ascSignIdx]),
  };
}

// Mean lunar node (Rahu) — standard astronomical formula
function computeRahu(date: Date, ayan: number): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  // Mean longitude of ascending node (tropical), then sidereal
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  return norm(norm(omega) - ayan);
}

function deriveAspects(planets: PlanetPosition[], ascSign: string): string[] {
  const out: string[] = [];
  const byName = (n: string) => planets.find((p) => p.name === n);
  const sun = byName('Sun'), moon = byName('Moon'), jup = byName('Jupiter'), sat = byName('Saturn');
  if (sun && moon && sun.signIndex === moon.signIndex)
    out.push('Sun conjunct Moon — unified will and emotion (New Moon nature)');
  if (jup) out.push(`Jupiter in ${jup.sign} (house ${jup.house}) — your growth and fortune expand here`);
  if (sat) out.push(`Saturn in ${sat.sign} (house ${sat.house}) — where discipline builds lasting reward`);
  if (moon) out.push(`Moon in ${moon.sign} — the emotional tone of your chart`);
  return out.slice(0, 4);
}
