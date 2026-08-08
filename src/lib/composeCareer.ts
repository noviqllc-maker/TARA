// src/lib/composeCareer.ts
// Personalized Career & Money reading, derived deterministically from the natal chart plus
// today's transits (no AI, no network). The engine's BirthChart has no houses[] / sun field,
// so we derive the 10th (career) and 2nd (wealth) houses, their lords and occupants, the
// running Mahadasha, and live Jupiter/Saturn transits from the real shape.
import { BirthChart, PlanetPosition, computeAllTransits } from '@/lib/vedic';

export type CareerReading = {
  financialOutlook: string;
  shortTerm: string[];
  longTerm: string[];
  influences: string;
  careerTiming: string;
  moneyTiming: string;
};

const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const byName = (c: BirthChart, n: string): PlanetPosition | null => c.planets.find((p) => p.name === n) ?? null;
const houseSignIndex = (c: BirthChart, h: number) => (c.ascendant.signIndex + h - 1) % 12;
const houseLord = (c: BirthChart, h: number) => SIGN_LORD[houseSignIndex(c, h)];
const occupants = (c: BirthChart, h: number) => c.planets.filter((p) => p.house === h);
const firstWord = (s: string) => (s || '').trim().split(/[\s\-–]+/)[0] || '';
const mahaLordOf = (c: BirthChart) => c.dasha.find((d) => d.phase === 'present')?.planet || firstWord(c.currentDasha) || 'Jupiter';
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));
const cap = (n: number) => Math.max(1, Math.min(12, n));

// Action a 10th-lord (or Mahadasha lord) planet suggests in the near term.
const PLANET_ACTION: Record<string, string> = {
  Sun: 'Put your name forward; visibility is supported now',
  Moon: 'Tend the relationships and people-side of your work',
  Mars: 'Take decisive initiative on something you have delayed',
  Mercury: 'Refine your offering and sharpen how you communicate it',
  Jupiter: 'Say yes to a growth, teaching, or mentorship opening',
  Venus: 'Strengthen partnerships and client goodwill',
  Saturn: 'Consolidate, systematize, and follow through patiently',
  Rahu: 'Test a bold, unconventional, higher-visibility angle',
  Ketu: 'Focus on mastery and depth over recognition',
};
// Long-arc direction a planet in the 10th (or the 10th lord) points toward.
const CAREER_ARC: Record<string, string> = {
  Sun: 'Leadership and authority roles suit your long arc',
  Moon: 'Public-facing, caregiving, or hospitality work',
  Mars: 'Building, engineering, or competitive fields',
  Mercury: 'Knowledge-based, writing, or trade-driven income',
  Jupiter: 'Teaching, advising, or expansive growth roles',
  Venus: 'Creative, relational, or beauty-adjacent fields',
  Saturn: 'Slow-built authority in institutions and long games',
  Rahu: 'Unconventional, public-facing, or frontier ventures',
  Ketu: 'Specialist, research, or behind-the-scenes mastery',
};

export function composeCareer(chart: BirthChart | null, date: Date = new Date()): CareerReading | null {
  if (!chart) return null;

  const maha = mahaLordOf(chart);
  const transits = computeAllTransits(chart, date);
  const transitHouse = (n: string) => transits.find((t) => t.name === n)?.house ?? null;

  const tenthLord = houseLord(chart, 10);
  const secondLord = houseLord(chart, 2);
  const tenthOcc = occupants(chart, 10);
  const secondOcc = occupants(chart, 2);

  const jup = byName(chart, 'Jupiter'), sat = byName(chart, 'Saturn'), mars = byName(chart, 'Mars'), sun = byName(chart, 'Sun');
  const inWealth = (p: PlanetPosition | null) => !!p && (p.house === 2 || p.house === 10);
  const aspectsWealth = (p: PlanetPosition | null) => !!p && (p.aspectsHouses.includes(2) || p.aspectsHouses.includes(10));
  const jTH = transitHouse('Jupiter'), sTH = transitHouse('Saturn');
  const jupiterWealth = inWealth(jup) || aspectsWealth(jup) || jTH === 2 || jTH === 10;
  const saturnWealth = inWealth(sat) || aspectsWealth(sat) || sTH === 2 || sTH === 10;
  const marsSunWealth = inWealth(mars) || inWealth(sun);

  // 3. financialOutlook
  let financialOutlook: string;
  if (jupiterWealth) financialOutlook = `Strong growth potential under your ${maha} Mahādasha; the money houses are well supported.`;
  else if (saturnWealth) financialOutlook = `Steady, deliberate wealth-building under your ${maha} Mahādasha; slow and durable beats fast.`;
  else if (marsSunWealth) financialOutlook = `Room for aggressive expansion under your ${maha} Mahādasha, but pace yourself; do not overextend.`;
  else financialOutlook = `A stable, incremental outlook under your ${maha} Mahādasha; build patiently on what already works.`;

  // 4. shortTerm (next ~6 months)
  const shortTerm = uniq([
    PLANET_ACTION[tenthLord] ?? PLANET_ACTION.Saturn,
    PLANET_ACTION[maha] ?? '',
    (jTH === 10 || jTH === 2) ? 'Act on the window opening in your work now; Jupiter is transiting your career/money axis' : '',
  ]);
  for (const p of [PLANET_ACTION.Mercury, PLANET_ACTION.Venus]) { if (shortTerm.length >= 2) break; if (!shortTerm.includes(p)) shortTerm.push(p); }

  // 5. longTerm (1–3 years): from an actual 10th occupant, else the 10th lord, plus the next dasha.
  const tenthDriver = tenthOcc[0]?.name ?? tenthLord;
  const presIdx = chart.dasha.findIndex((d) => d.phase === 'present');
  const nextDasha = presIdx >= 0 ? chart.dasha[presIdx + 1]?.planet : undefined;
  const longTerm = uniq([
    tenthOcc[0] ? `${CAREER_ARC[tenthOcc[0].name] ?? CAREER_ARC.Saturn} (${tenthOcc[0].name} in your 10th)` : CAREER_ARC[tenthDriver] ?? CAREER_ARC.Saturn,
    CAREER_ARC[maha] ?? '',
    nextDasha ? `As your ${nextDasha} period approaches, ${(CAREER_ARC[nextDasha] ?? 'a new professional chapter').toLowerCase()}` : '',
  ]).slice(0, 3);

  // 6. influences: real planets in the real 2nd/10th (or their lords' placements).
  const infl: string[] = [];
  for (const p of [...tenthOcc, ...secondOcc]) {
    const house = p.house === 10 ? '10th house of career' : '2nd house of wealth';
    infl.push(`${p.name} in your ${house}`);
  }
  let influences: string;
  if (infl.length) {
    influences = `${infl.slice(0, 2).join(' and ')} shape your professional life directly.`;
  } else {
    const tlHouse = byName(chart, tenthLord)?.house ?? null;
    const slHouse = byName(chart, secondLord)?.house ?? null;
    influences = `Your career lord ${tenthLord} sits in the ${ORD[cap(tlHouse ?? 10)]} house and your wealth lord ${secondLord} in the ${ORD[cap(slHouse ?? 2)]}, so progress comes through those areas of life.`;
  }

  // 7. careerTiming: Mahadasha lord's relationship to the 10th.
  const pres = chart.dasha.find((d) => d.phase === 'present');
  const endYr = pres?.end;
  const mahaActivates10 = maha === tenthLord || tenthOcc.some((p) => p.name === maha) || (byName(chart, maha)?.aspectsHouses.includes(10));
  const careerTiming = mahaActivates10
    ? `A strong career window: your ${maha} period directly activates your 10th house of work${endYr ? `, now through ${endYr}` : ''}.`
    : `Your ${maha} period supports steady progress${endYr ? ` through ${endYr}` : ''}; the biggest public push lands when a 10th-house planet's period runs.`;

  // 8. moneyTiming: wealth transits (Jupiter to the 2nd, Saturn's weight on it).
  let moneyTiming: string;
  if (jTH === 2 || jTH === 11) moneyTiming = 'Favorable for increases now; Jupiter is lifting your money houses, so ask and expand.';
  else if (sTH === 2) moneyTiming = `A season to consolidate rather than stretch; hold steady and tighten costs${endYr ? ` before ${endYr}` : ''}.`;
  else if (jupiterWealth) moneyTiming = 'A broadly supportive stretch for income; reinvest gains rather than letting them idle.';
  else moneyTiming = `Money moves incrementally now; secure your base${endYr ? ` before your ${maha} period ends in ${endYr}` : ''}.`;

  return { financialOutlook, shortTerm: shortTerm.slice(0, 3), longTerm, influences, careerTiming, moneyTiming };
}
