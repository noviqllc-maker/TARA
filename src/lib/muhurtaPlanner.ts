// src/lib/muhurtaPlanner.ts
// A personal muhūrta shortlist (deterministic, no AI): scans the next N days and ranks the most
// favorable ones for a chosen purpose from the day's tithi, nakshatra, nitya-yoga, weekday lord,
// and the live transits over the user's own chart. This is a traditional day-level heuristic,
// offered for context; it is not a full classical muhūrta (lagna/tārābala/chandrabala) and not
// medical, legal, or financial advice.
import { BirthChart, computeAllTransits, NAKSHATRAS } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { tithiSpecialOf, nityaYoga } from '@/lib/calendar';
import { varaLord } from '@/lib/panchanga';
import { getHoraSchedule, getAbhijitMuhurta, getRahukalam } from '@/lib/astronomy';

export type Purpose = 'marriage' | 'travel' | 'business' | 'moving' | 'surgery' | 'interview';
export const PURPOSES: { key: Purpose; label: string }[] = [
  { key: 'marriage', label: 'Marriage' }, { key: 'travel', label: 'Travel' },
  { key: 'business', label: 'Business' }, { key: 'moving', label: 'Moving Home' },
  { key: 'surgery', label: 'Surgery' }, { key: 'interview', label: 'Interview' },
];

export interface MuhurtaDate {
  date: Date;
  dateLabel: string;
  score: number;          // 0-100
  quality: 'Excellent' | 'Good' | 'Fair';
  tithi: string;
  nakshatra: string;
  yoga: string;
  reasons: string[];
  cautions: string[];
}

type Cfg = {
  good: Set<string>;      // favorable nakshatras
  avoid: Set<string>;     // unfavorable nakshatras
  goodVaras: Set<string>;
  badVaras: Set<string>;
  keyHouse: number;       // the house this purpose activates
  marsHelps: boolean;     // surgery wants Mars strength; most purposes treat Mars on the key house as friction
  dashaLords: Set<string>;
  horaPlanet: string;     // planet whose horā is the "best hour" for this purpose
};
const S = (...a: string[]) => new Set(a);
const CFG: Record<Purpose, Cfg> = {
  marriage: {
    good: S('Rohini', 'Mrigashira', 'Magha', 'Uttara Phalguni', 'Hasta', 'Swati', 'Anuradha', 'Mula', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'),
    avoid: S('Bharani', 'Krittika', 'Ashlesha', 'Vishakha', 'Jyeshtha'),
    goodVaras: S('Moon', 'Mercury', 'Jupiter', 'Venus'), badVaras: S('Mars', 'Saturn'),
    keyHouse: 7, marsHelps: false, dashaLords: S('Venus', 'Jupiter', 'Moon'), horaPlanet: 'Venus',
  },
  travel: {
    good: S('Ashwini', 'Mrigashira', 'Punarvasu', 'Pushya', 'Hasta', 'Anuradha', 'Shravana', 'Dhanishta', 'Revati'),
    avoid: S('Bharani', 'Krittika', 'Ashlesha', 'Magha', 'Vishakha', 'Mula'),
    goodVaras: S('Moon', 'Mercury', 'Venus', 'Jupiter'), badVaras: S('Mars', 'Sun'),
    keyHouse: 3, marsHelps: false, dashaLords: S('Mercury', 'Moon', 'Venus'), horaPlanet: 'Mercury',
  },
  business: {
    good: S('Ashwini', 'Rohini', 'Mrigashira', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Dhanishta', 'Revati'),
    avoid: S('Bharani', 'Krittika', 'Ashlesha', 'Jyeshtha', 'Mula'),
    goodVaras: S('Mercury', 'Jupiter', 'Venus', 'Sun'), badVaras: S('Saturn'),
    keyHouse: 10, marsHelps: false, dashaLords: S('Mercury', 'Jupiter', 'Sun'), horaPlanet: 'Mercury',
  },
  moving: {
    good: S('Rohini', 'Mrigashira', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Revati'),
    avoid: S('Bharani', 'Krittika', 'Ashlesha', 'Magha', 'Mula'),
    goodVaras: S('Moon', 'Mercury', 'Jupiter', 'Venus'), badVaras: S('Mars', 'Saturn'),
    keyHouse: 4, marsHelps: false, dashaLords: S('Moon', 'Venus', 'Jupiter'), horaPlanet: 'Moon',
  },
  surgery: {
    good: S('Ashwini', 'Krittika', 'Pushya', 'Hasta', 'Anuradha', 'Shravana', 'Mula', 'Revati'),
    avoid: S('Rohini', 'Ashlesha', 'Jyeshtha'),
    goodVaras: S('Mars', 'Sun', 'Saturn'), badVaras: S('Venus'),
    keyHouse: 6, marsHelps: true, dashaLords: S('Mars', 'Sun', 'Saturn'), horaPlanet: 'Mars',
  },
  interview: {
    good: S('Ashwini', 'Pushya', 'Hasta', 'Chitra', 'Swati', 'Anuradha', 'Shravana', 'Revati'),
    avoid: S('Bharani', 'Ashlesha', 'Jyeshtha', 'Mula'),
    goodVaras: S('Mercury', 'Jupiter', 'Sun'), badVaras: S('Saturn', 'Mars'),
    keyHouse: 10, marsHelps: false, dashaLords: S('Mercury', 'Sun', 'Jupiter'), horaPlanet: 'Mercury',
  },
};

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const atSunrise = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0, 0);
const firstWord = (s: string) => (s || '').trim().split(/[\s\-–(]+/)[0] || '';
// Riktā tithis (the 4th, 9th, 14th of each fortnight): tithiNum 3,8,13,18,23,28.
const isRikta = (n: number) => [3, 8, 13, 18, 23, 28].includes(n);

function scoreDay(chart: BirthChart, date: Date, purpose: Purpose): MuhurtaDate {
  const cfg = CFG[purpose];
  const d = atSunrise(date);
  const t = computeTransits(d, chart);
  const [, tithiName] = t.panchanga.split(' · ');
  const { tithiNum, special } = tithiSpecialOf(d);
  const yoga = nityaYoga(d);
  const nak = t.moonNakshatra;
  const dayLord = varaLord(date).lord;
  const transits = computeAllTransits(chart, d);
  const houseOf = (name: string) => transits.find((x) => x.name === name)?.house ?? null;

  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 50;

  // Tithi
  if (special === 'amavasya') { score -= 26; cautions.push('New Moon (Amāvasyā), traditionally avoided for new beginnings.'); }
  else if (special === 'purnima') { score -= 8; cautions.push('Full Moon (Pūrṇimā); energy runs high, so proceed mindfully.'); }
  else if (isRikta(tithiNum)) { score -= 12; cautions.push('A Riktā tithi, traditionally weak for auspicious starts.'); }
  else { score += 4; }

  // Nakshatra
  if (cfg.good.has(nak)) { score += 18; reasons.push(`${nak} is a favorable star for ${purpose}.`); }
  else if (cfg.avoid.has(nak)) { score -= 18; cautions.push(`${nak} is traditionally avoided for ${purpose}.`); }

  // Yoga
  if (yoga.major) { score += 12; reasons.push(`${yoga.name} is an auspicious yoga.`); }
  else if (yoga.bad) { score -= 15; cautions.push(`${yoga.name} is an inauspicious yoga.`); }

  // Weekday (vāra) lord
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  if (cfg.goodVaras.has(dayLord)) { score += 8; reasons.push(`${weekday} (${dayLord}'s day) suits ${purpose}.`); }
  else if (cfg.badVaras.has(dayLord)) { score -= 8; cautions.push(`${weekday} (${dayLord}'s day) is less ideal for ${purpose}.`); }

  // Transits over the user's own key house
  const kh = cfg.keyHouse;
  if (houseOf('Jupiter') === kh) { score += 14; reasons.push(`Jupiter is transiting your ${ORD[kh]} house, a strong support for ${purpose}.`); }
  if (purpose === 'marriage' && houseOf('Venus') === kh) { score += 8; reasons.push(`Venus is transiting your 7th house, warm for partnership.`); }
  if (houseOf('Moon') === kh) { score += 5; reasons.push(`The Moon moves through your ${ORD[kh]} house today.`); }
  if (houseOf('Mars') === kh) {
    if (cfg.marsHelps) { score += 8; reasons.push(`Mars is transiting your ${ORD[kh]} house, lending decisive energy.`); }
    else { score -= 12; cautions.push(`Mars is transiting your ${ORD[kh]} house, which can add friction.`); }
  }
  for (const p of ['Saturn', 'Rahu', 'Ketu']) {
    if (houseOf(p) === kh) { score -= 8; cautions.push(`${p} is transiting your ${ORD[kh]} house, so temper expectations.`); }
  }

  // Running Mahādasha (constant over the window, a gentle tilt)
  const mahaLord = firstWord(chart.currentDasha);
  if (cfg.dashaLords.has(mahaLord)) { score += 6; reasons.push(`Your ${mahaLord} Mahādasha broadly supports ${purpose}.`); }

  score = clamp(score);
  const quality = score >= 72 ? 'Excellent' : score >= 58 ? 'Good' : 'Fair';
  return {
    date, dateLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    score, quality, tithi: tithiName ?? t.panchanga, nakshatra: nak, yoga: yoga.name,
    reasons: reasons.slice(0, 4), cautions: cautions.slice(0, 3),
  };
}

// Scan the next `days` days (from tomorrow) and return the top `count` by score. Premium-only:
// returns [] when isPremium is false (the screen shows an upgrade prompt in that case).
export function findMuhurtaDates(chart: BirthChart | null, purpose: Purpose, days = 90, count = 5, isPremium = false): MuhurtaDate[] {
  if (!chart || !isPremium) return [];
  const today = new Date();
  const out: MuhurtaDate[] = [];
  for (let i = 1; i <= days; i++) {
    out.push(scoreDay(chart, new Date(today.getFullYear(), today.getMonth(), today.getDate() + i), purpose));
  }
  // Rank by score, then earliest date, and take the top few.
  out.sort((a, b) => (b.score - a.score) || (a.date.getTime() - b.date.getTime()));
  return out.slice(0, count);
}

// Time windows for a chosen date: Abhijit, Rāhukālam (to avoid), and the purpose's best horā.
export function muhurtaWindows(
  date: Date, purpose: Purpose, location: { lat: number; lon: number; tzOffsetMinutes?: number },
): { abhijit: string | null; rahukalam: string | null; bestHora: string | null } {
  const { lat, lon, tzOffsetMinutes } = location;
  const dayLord = varaLord(date).lord;
  const ab = getAbhijitMuhurta(date, lat, lon, tzOffsetMinutes);
  const ra = getRahukalam(date, lat, lon, dayLord, tzOffsetMinutes);
  const schedule = getHoraSchedule(date, lat, lon, dayLord, tzOffsetMinutes);
  const h = schedule?.find((x) => x.lord === CFG[purpose].horaPlanet);
  return {
    abhijit: ab ? `${ab.start} – ${ab.end}` : null,
    rahukalam: ra ? `${ra.start} – ${ra.end}` : null,
    bestHora: h ? `${h.start} – ${h.end} (${CFG[purpose].horaPlanet} horā)` : null,
  };
}
