// src/lib/blueprint.ts
// Assembles the Soul Blueprint from the natal chart + lookup tables (deterministic, no AI).
import { BirthChart, PlanetPosition, SIGNS } from '@/lib/vedic';
import {
  LAGNA_ESSENCE, NAKSHATRA_ESSENCE, HOUSE_THEME, GRAHA_HOUSE,
  EXALTED, DEBILITATED, OWN_SIGNS, DIGNITY_LINE, YOGA_TEXT, Dignity,
} from '@/data/blueprint';

// Sign lords (Aries…Pisces) — local copy (mirrors vedic/energy).
const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];
const KENDRA = [1, 4, 7, 10];
const COMBUST_ORB: Record<string, number> = { Moon: 12, Mars: 17, Mercury: 12, Venus: 9, Jupiter: 11, Saturn: 15 };
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
export const ord = (n: number) => ORD[n] || `${n}th`;
const low = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);
const norm = (x: number) => ((x % 360) + 360) % 360;
const angSep = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };

export function dignityOf(graha: string, sign: string): Dignity {
  if (EXALTED[graha] === sign) return 'exalted';
  if (DEBILITATED[graha] === sign) return 'debilitated';
  if (OWN_SIGNS[graha]?.includes(sign)) return 'own';
  return 'neutral';
}

export type GrahaCard = {
  name: string; glyph: string; sign: string; house: number; degree: string;
  retrograde: boolean; combust: boolean; dignity: Dignity;
  reading: string; modifier: string | null;
};
export type HouseCell = { house: number; sign: string; lord: string; occupants: string[]; theme: string; reading: string };
export type Pattern = { key: string; text: string };
export type Blueprint = {
  hero: { lagna: string; lagnaLord: string; sun: string; moon: string; nakshatra: string; pada: number; essence: string };
  grahas: GrahaCard[];
  houses: HouseCell[];
  patterns: Pattern[];
  navamsa: { lagna: string; reading: string; notable: { name: string; sign: string }[] };
  takeaway: string;
};

export function computeBlueprint(chart: BirthChart): Blueprint {
  const asc = chart.ascendant;
  const lagnaLord = SIGN_LORDS[asc.signIndex];
  const planetByName = (n: string) => chart.planets.find((p) => p.name === n);
  const houseOfPlanet = (n: string) => planetByName(n)?.house ?? null;
  const sun = planetByName('Sun');

  // ---- HERO essence (3–4 sentences) ----
  const lagnaLordHouse = houseOfPlanet(lagnaLord);
  const essence = [
    `With ${asc.sign} rising, you are ${LAGNA_ESSENCE[asc.sign] ?? 'a soul with your own distinct signature'}.`,
    `Your Moon in ${chart.nakshatra} makes you ${NAKSHATRA_ESSENCE[chart.nakshatra] ?? 'deeply yourself in feeling and instinct'}.`,
    lagnaLordHouse
      ? `${lagnaLord}, the lord of your ascendant, sits in your ${ord(lagnaLordHouse)} house, colouring your path with ${low(HOUSE_THEME[lagnaLordHouse - 1])}.`
      : `${lagnaLord} rules your ascendant and guides how your nature expresses itself.`,
    `Together these weave a life that is unmistakably your own — steady in its core, and unfolding in its own time.`,
  ].join(' ');

  // ---- NINE GRAHAS ----
  const grahas: GrahaCard[] = chart.planets.map((p: PlanetPosition) => {
    const dignity = ['Rahu', 'Ketu'].includes(p.name) ? 'neutral' : dignityOf(p.name, p.sign);
    const combust = !['Sun', 'Rahu', 'Ketu'].includes(p.name)
      && sun != null && angSep(p.longitude, sun.longitude) < (COMBUST_ORB[p.name] ?? 8);
    const base = GRAHA_HOUSE[p.name]?.[p.house - 1] ?? `${p.name} in your ${ord(p.house)} house shapes ${low(HOUSE_THEME[p.house - 1])}.`;
    const flags: string[] = [];
    if (p.retrograde && !['Sun', 'Moon'].includes(p.name)) flags.push('Retrograde here, its energy turns inward and matures through revisiting and deepening.');
    if (combust) flags.push('Close to the Sun (combust), its energy works more inwardly, refined by the Sun’s intensity.');
    const modifier = dignity !== 'neutral' ? DIGNITY_LINE[dignity](p.name) : (flags.length ? flags[0] : null);
    // reading = graha×house line, then dignity/flags appended for a full 2–3 sentence read.
    const reading = [base, dignity !== 'neutral' ? DIGNITY_LINE[dignity](p.name) : '', ...flags].filter(Boolean).join(' ');
    return {
      name: p.name, glyph: p.glyph, sign: p.sign, house: p.house, degree: p.degree,
      retrograde: p.retrograde, combust, dignity, reading, modifier,
    };
  });

  // ---- TWELVE HOUSES ----
  const houses: HouseCell[] = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const signIdx = (asc.signIndex + i) % 12;
    const sign = SIGNS[signIdx];
    const lord = SIGN_LORDS[signIdx];
    const occupants = chart.planets.filter((p) => p.house === house).map((p) => p.name);
    const lordHouse = houseOfPlanet(lord);
    const theme = HOUSE_THEME[i];
    const reading = occupants.length
      ? `${occupants.join(' and ')} ${occupants.length > 1 ? 'occupy' : 'occupies'} this house, so ${low(theme)} is emphasised in your life. Its lord ${lord} sits in your ${ord(lordHouse ?? house)} house, linking this area to ${low(HOUSE_THEME[(lordHouse ?? house) - 1])}.`
      : `No graha sits here, so this house expresses through its lord ${lord} in your ${ord(lordHouse ?? house)} house — connecting ${low(theme)} to ${low(HOUSE_THEME[(lordHouse ?? house) - 1])}.`;
    return { house, sign, lord, occupants, theme, reading };
  });

  // ---- KEY PATTERNS (only when verifiably present) ----
  const patterns: Pattern[] = [];
  const moon = planetByName('Moon'); const jup = planetByName('Jupiter');
  const merc = planetByName('Mercury'); const mars = planetByName('Mars');
  const signDiff = (a?: PlanetPosition, b?: PlanetPosition) => (a && b ? ((a.signIndex - b.signIndex + 12) % 12) : -1);
  if (jup && moon && [0, 3, 6, 9].includes(signDiff(jup, moon))) patterns.push({ key: 'gajakesari', text: YOGA_TEXT.gajakesari });
  if (sun && merc && sun.house === merc.house) patterns.push({ key: 'budhaAditya', text: YOGA_TEXT.budhaAditya });
  if (moon && mars && moon.house === mars.house) patterns.push({ key: 'chandraMangala', text: YOGA_TEXT.chandraMangala });
  // Pancha Mahapurusha (Mars/Mercury/Jupiter/Venus/Saturn strong in a kendra).
  const MAHAPURUSHA: [string, string][] = [['Mars', 'ruchaka'], ['Mercury', 'bhadra'], ['Jupiter', 'hamsa'], ['Venus', 'malavya'], ['Saturn', 'sasa']];
  for (const [g, key] of MAHAPURUSHA) {
    const p = planetByName(g);
    if (p && KENDRA.includes(p.house) && (dignityOf(g, p.sign) === 'own' || dignityOf(g, p.sign) === 'exalted')) patterns.push({ key, text: YOGA_TEXT[key] });
  }
  // Stelliums (3+ grahas in one house).
  const byHouse: Record<number, string[]> = {};
  chart.planets.forEach((p) => { (byHouse[p.house] ??= []).push(p.name); });
  for (let h = 1; h <= 12; h++) {
    if ((byHouse[h]?.length ?? 0) >= 3) patterns.push({ key: `stellium-${h}`, text: `A stellium in your ${ord(h)} house — ${byHouse[h].join(', ')} gather here, concentrating great focus and intensity on ${low(HOUSE_THEME[h - 1])}.` });
  }
  // Exalted / debilitated placements.
  for (const p of chart.planets) {
    if (['Rahu', 'Ketu'].includes(p.name)) continue;
    const d = dignityOf(p.name, p.sign);
    if (d === 'exalted') patterns.push({ key: `exalt-${p.name}`, text: `Exalted ${p.name} in ${p.sign} — placed in its sign of greatest strength, a real gift woven into your chart.` });
    if (d === 'debilitated') patterns.push({ key: `debil-${p.name}`, text: `${p.name} in ${p.sign}, its sign of challenge — a place of growth where its strength is earned through experience, and often quietly redeemed over life.` });
  }

  // ---- NAVAMSA (D9) LENS ----
  const notable = ['Venus', 'Jupiter', 'Moon', 'Saturn']
    .map((n) => { const p = planetByName(n); return p ? { name: n, sign: p.navamsaSign } : null; })
    .filter(Boolean) as { name: string; sign: string }[];
  const navamsa = {
    lagna: asc.navamsaSign,
    reading: `In the Navāṁśa (D9) — the divisional chart that reveals your inner life and partnerships — your D9 ascendant is ${asc.navamsaSign}, ${low(LAGNA_ESSENCE[asc.navamsaSign] ?? 'carrying its own inner tone')}. Venus in ${planetByName('Venus')?.navamsaSign ?? asc.navamsaSign} in the D9 speaks to what you seek in love and commitment, while your D9 as a whole shows the person you are still quietly becoming beneath the surface.`,
    notable,
  };

  // ---- CLOSING takeaway ----
  const takeaway = `${asc.sign} rising, ${chart.moonSign} Moon, ${chart.nakshatra} nakshatra — a ${low(LAGNA_ESSENCE[asc.sign] ?? 'unique')?.split(',')[0]} soul, here to grow into the fullness of who you already are.`;

  return {
    hero: { lagna: asc.sign, lagnaLord, sun: chart.sunSign, moon: chart.moonSign, nakshatra: chart.nakshatra, pada: chart.nakshatraPada, essence },
    grahas, houses, patterns, navamsa, takeaway,
  };
}
