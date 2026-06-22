// src/lib/vedic.ts
// Real Vedic (sidereal) astrology engine — computes an actual birth chart from
// date, time, and place. Pure JS (astronomy-engine), runs in React Native/Hermes.
//
// Pipeline: astronomy-engine gives tropical ecliptic longitudes -> subtract Lahiri
// ayanamsa to get sidereal (Vedic) positions -> derive signs, houses (whole-sign
// from the sidereal ascendant), Moon's nakshatra, and the Vimshottari dasha timeline.
//
// v2 upgrades:
//   • True lunar node (Rahu/Ketu) from the Moon's instantaneous orbital plane,
//     instead of the mean node.
//   • Graha drishti (Vedic planetary aspects), including the special aspects of
//     Mars (4/8), Jupiter (5/9), and Saturn (3/10).
//   • Navamsa (D9) divisional chart sign for every graha and the ascendant.
//   • Antardasha (dasha sub-periods) within the running Mahadasha.

import * as Astronomy from 'astronomy-engine';

const norm = (x: number) => ((x % 360) + 360) % 360;
const DEG = Math.PI / 180;
const MS_PER_DAY = 86400000;
const YEAR_MS = 365.25 * MS_PER_DAY;

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

// Vedic graha drishti — every graha aspects the 7th house from itself; Mars,
// Jupiter and Saturn have additional special aspects. (House offsets, 1 = own house.)
const ASPECT_OFFSETS: Record<string, number[]> = {
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
};
const DEFAULT_ASPECTS = [7];

export type PlanetPosition = {
  name: string;
  glyph: string;
  sign: string;
  signIndex: number;
  house: number;
  degree: string;        // e.g. "12°48′"
  longitude: number;     // sidereal ecliptic longitude
  retrograde: boolean;
  navamsaSign: string;   // D9 divisional-chart sign
  aspectsHouses: number[]; // houses this graha casts its drishti onto
  explanation: string;
};

export type Drishti = {
  from: string;          // aspecting graha
  house: number;         // house receiving the aspect
  targets: string[];     // grahas sitting in that house (graha-to-graha drishti)
};

export type AntarPeriod = {
  planet: string;
  start: string;         // "Mon YYYY"
  end: string;
  phase: 'past' | 'present' | 'future';
};

export type DashaPeriod = {
  planet: string;
  start: number;         // year
  end: number;
  theme: string;
  phase: 'past' | 'present' | 'future';
  antardashas?: AntarPeriod[]; // sub-periods (populated for the running Mahadasha)
};

export type BirthChart = {
  ascendant: { sign: string; signIndex: number; degree: string; navamsaSign: string };
  sunSign: string;
  moonSign: string;
  nakshatra: string;
  nakshatraPada: number;
  rulingPlanet: string;
  planets: PlanetPosition[];
  drishti: Drishti[];
  dasha: DashaPeriod[];
  currentDasha: string;
  currentAntardasha: string;
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
  const jd = date.getTime() / MS_PER_DAY + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85337 + 1.396042 * T + 0.000308 * T * T;
}

// ---- Ascendant (Lagna) from local sidereal time + latitude ----
function computeAscendant(date: Date, lat: number, lon: number, ayan: number): number {
  const jd = date.getTime() / MS_PER_DAY + 2440587.5;
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

// Navamsa (D9): the zodiac is split into 108 arcs of 3°20′; the nth arc maps to
// sign (n mod 12). This single formula yields the correct navamsa for movable,
// fixed and dual signs alike.
function navamsaSign(longitude: number): string {
  return SIGNS[Math.floor(longitude / (30 / 9)) % 12];
}

function siderealLongitude(body: any, date: Date, ayan: number): { lon: number; retro: boolean } {
  const vec = Astronomy.GeoVector(body, date, true);
  const ecl = Astronomy.Ecliptic(vec);
  // crude retrograde check: compare longitude a day later (Sun/Moon never retro)
  let retro = false;
  if (body !== 'Sun' && body !== 'Moon') {
    const vec2 = Astronomy.GeoVector(body, new Date(date.getTime() + MS_PER_DAY), true);
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

const fmtMonthYear = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// Antardasha (sub-period) breakdown for one Mahadasha. The sequence starts on the
// Mahadasha lord, then follows the Vimshottari order; each sub-period lasts
// (mahaYears × antarYears) / 120. nominalStart is when the Mahadasha would have
// begun if it ran in full (may precede birth for the very first Mahadasha).
function buildAntardashas(mahaLord: string, mahaYears: number, nominalStart: Date, now: Date): AntarPeriod[] {
  const startIdx = DASHA_SEQ.findIndex(([l]) => l === mahaLord);
  if (startIdx < 0) return [];
  const out: AntarPeriod[] = [];
  let cursor = new Date(nominalStart);
  for (let i = 0; i < 9; i++) {
    const [lord, yrs] = DASHA_SEQ[(startIdx + i) % 9];
    const dur = (mahaYears * yrs) / 120;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + dur * YEAR_MS);
    const phase: AntarPeriod['phase'] =
      now >= start && now < end ? 'present' : now >= end ? 'past' : 'future';
    out.push({ planet: lord, start: fmtMonthYear(start), end: fmtMonthYear(end), phase });
    cursor = end;
  }
  return out;
}

function buildDasha(moonSid: number, birth: Date): {
  timeline: DashaPeriod[]; current: string; currentAntardasha: string;
} {
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
  let currentAntardasha = '';

  for (let i = 0; i < 9; i++) {
    const [lord, years] = DASHA_SEQ[(startLord + i) % 9];
    const dur = i === 0 ? remaining : years;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + dur * YEAR_MS);
    const phase: DashaPeriod['phase'] =
      now >= start && now < end ? 'present' : now >= end ? 'past' : 'future';

    const period: DashaPeriod = {
      planet: lord,
      start: start.getFullYear(),
      end: end.getFullYear(),
      theme: DASHA_THEMES[lord],
      phase,
    };

    if (phase === 'present') {
      current = `${lord} Mahādasha`;
      // The first Mahadasha is partial, so its sub-periods are timed from the
      // nominal full start (before birth); later ones start exactly at `start`.
      const nominalStart = i === 0 ? new Date(end.getTime() - years * YEAR_MS) : start;
      period.antardashas = buildAntardashas(lord, years, nominalStart, now);
      const running = period.antardashas.find((a) => a.phase === 'present');
      if (running) currentAntardasha = `${lord}–${running.planet} (Antardasha)`;
    }

    timeline.push(period);
    cursor = end;
  }
  return { timeline, current, currentAntardasha };
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
  const houseOf = (signIdx: number) => ((signIdx - ascSignIdx + 12) % 12) + 1;

  const bodies = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const planets: PlanetPosition[] = [];

  let sunSign = '', moonSign = '', moonLon = 0;

  for (const b of bodies) {
    const { lon, retro } = siderealLongitude(b, birth, ayan);
    const signIdx = Math.floor(lon / 30);
    const house = houseOf(signIdx);
    planets.push({
      name: b, glyph: PLANET_GLYPHS[b], sign: SIGNS[signIdx], signIndex: signIdx,
      house, degree: degMin(lon), longitude: lon, retrograde: retro,
      navamsaSign: navamsaSign(lon), aspectsHouses: aspectedHouses(b, house),
      explanation: explain(b, SIGNS[signIdx], house),
    });
    if (b === 'Sun') sunSign = SIGNS[signIdx];
    if (b === 'Moon') { moonSign = SIGNS[signIdx]; moonLon = lon; }
  }

  // Rahu (north lunar node) — true node from the Moon's orbital plane; Ketu opposite
  const rahuLon = computeRahu(birth, ayan);
  const rahuIdx = Math.floor(rahuLon / 30);
  const ketuLon = norm(rahuLon + 180);
  const ketuIdx = Math.floor(ketuLon / 30);
  const rahuHouse = houseOf(rahuIdx);
  const ketuHouse = houseOf(ketuIdx);
  planets.push({
    name: 'Rahu', glyph: '☊', sign: SIGNS[rahuIdx], signIndex: rahuIdx,
    house: rahuHouse, degree: degMin(rahuLon), longitude: rahuLon, retrograde: true,
    navamsaSign: navamsaSign(rahuLon), aspectsHouses: aspectedHouses('Rahu', rahuHouse),
    explanation: explain('Rahu', SIGNS[rahuIdx], rahuHouse),
  });
  planets.push({
    name: 'Ketu', glyph: '☋', sign: SIGNS[ketuIdx], signIndex: ketuIdx,
    house: ketuHouse, degree: degMin(ketuLon), longitude: ketuLon, retrograde: true,
    navamsaSign: navamsaSign(ketuLon), aspectsHouses: aspectedHouses('Ketu', ketuHouse),
    explanation: explain('Ketu', SIGNS[ketuIdx], ketuHouse),
  });

  // Nakshatra (from Moon)
  const nakSpan = 360 / 27;
  const nakIdx = Math.floor(moonLon / nakSpan);
  const pada = Math.floor((moonLon % nakSpan) / (nakSpan / 4)) + 1;

  const { timeline, current, currentAntardasha } = buildDasha(moonLon, birth);

  return {
    ascendant: {
      sign: SIGNS[ascSignIdx], signIndex: ascSignIdx,
      degree: degMin(ascLon), navamsaSign: navamsaSign(ascLon),
    },
    sunSign,
    moonSign,
    nakshatra: NAKSHATRAS[nakIdx],
    nakshatraPada: pada,
    rulingPlanet: SIGN_LORDS[Math.floor(moonLon / 30)],
    planets,
    drishti: deriveDrishti(planets),
    dasha: timeline,
    currentDasha: current,
    currentAntardasha,
    aspects: deriveAspects(planets, SIGNS[ascSignIdx]),
  };
}

// Houses a graha casts its drishti onto, given the house it occupies.
function aspectedHouses(planet: string, house: number): number[] {
  const offsets = ASPECT_OFFSETS[planet] || DEFAULT_ASPECTS;
  return offsets.map((o) => ((house - 1 + (o - 1)) % 12) + 1);
}

// True lunar node (Rahu): the ascending node of the Moon's instantaneous orbit.
// Derived from the orbital angular-momentum vector (r1 × r2) in the J2000 ecliptic
// frame; precession converts it to of-date before applying the ayanamsa. Falls
// back to the mean node if the vector math is unavailable.
function computeRahu(date: Date, ayan: number): number {
  try {
    const t = date.getTime();
    const e1: any = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, date, false));
    const e2: any = Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon, new Date(t + 3600000), false));
    const a = e1.vec, b = e2.vec;
    if (a && b && typeof a.x === 'number') {
      // orbital angular momentum h = a × b; ascending node Ω = atan2(hx, -hy)
      const hx = a.y * b.z - a.z * b.y;
      const hy = a.z * b.x - a.x * b.z;
      const omegaJ2000 = Math.atan2(hx, -hy) / DEG;
      const jd = t / MS_PER_DAY + 2440587.5;
      const T = (jd - 2451545.0) / 36525.0;
      const precession = 1.396971 * T + 0.0003086 * T * T; // J2000 -> of-date, degrees
      return norm(norm(omegaJ2000 + precession) - ayan);
    }
  } catch {}
  return meanNode(date, ayan);
}

// Mean lunar node — standard astronomical formula (fallback for the true node).
function meanNode(date: Date, ayan: number): number {
  const jd = date.getTime() / MS_PER_DAY + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
  return norm(norm(omega) - ayan);
}

// Graha-to-graha drishti: which grahas each aspecting graha throws its drishti at.
function deriveDrishti(planets: PlanetPosition[]): Drishti[] {
  const out: Drishti[] = [];
  for (const p of planets) {
    for (const house of p.aspectsHouses) {
      const targets = planets
        .filter((q) => q.name !== p.name && q.house === house)
        .map((q) => q.name);
      if (targets.length) out.push({ from: p.name, house, targets });
    }
  }
  return out;
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
