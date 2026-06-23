// src/lib/compatibility.ts
// Ashtakoota (Guna Milan) compatibility engine — scores two charts out of 36.
// Implemented per docs/ashtakoota-guna-milan-engine-spec.md. 100% deterministic
// (no Math.random) — the score is a pure function of the two Moons.
//
// Inputs are each person's Moon nakshatra (1–27) and Moon rashi (1–12, 1=Aries…12=Pisces).
// Convention: A = bride/girl, B = groom/boy. Varna and Gana are DIRECTIONAL and honor this.
//
// Documented v1 simplifications (see spec §2, §4, §9):
//   • Vashya uses whole-sign groups (no Sagittarius/Capricorn half-sign split):
//     Sagittarius→Human, Capricorn→Aquatic, Leo→Wild.
//   • Yoni uses the 4 / 2 / 0 matrix (same animal / neutral / bitter-enemy); the
//     3/1 friend/enemy gradations are deferred refinements.

import type { BirthChart } from './vedic';

export type Role = 'bride' | 'groom';

export interface PersonMoon {
  nakshatra: number; // 1–27
  rashi: number;     // 1–12 (1=Aries … 12=Pisces)
  role?: Role;
}

export type KootaKey =
  | 'varna' | 'vashya' | 'tara' | 'yoni' | 'maitri' | 'gana' | 'bhakoot' | 'nadi';

export interface GunaResult {
  total: number;                       // 0–36
  breakdown: Record<KootaKey, number>; // individual koota scores
  doshas: { nadi: boolean; bhakoot: boolean };
  rating: string;                      // Challenging | Acceptable | Good | Excellent
  tone: string;                        // warm one-line description
}

// ---- §3 Master nakshatra table (array index = nakshatra − 1) ----
type Animal =
  | 'Horse' | 'Elephant' | 'Sheep' | 'Serpent' | 'Dog' | 'Cat' | 'Rat'
  | 'Cow' | 'Buffalo' | 'Tiger' | 'Deer' | 'Monkey' | 'Mongoose' | 'Lion';
type Gana = 'Deva' | 'Manushya' | 'Rakshasa';
type Nadi = 'Aadi' | 'Madhya' | 'Antya';

const NAK_YONI: Animal[] = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat', 'Sheep', 'Cat', 'Rat',
  'Rat', 'Cow', 'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer', 'Dog', 'Monkey',
  'Mongoose', 'Monkey', 'Lion', 'Horse', 'Lion', 'Cow', 'Elephant',
];
const NAK_GANA: Gana[] = [
  'Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya', 'Deva', 'Deva', 'Rakshasa', 'Rakshasa',
  'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya',
  'Manushya', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva',
];
const NAK_NADI: Nadi[] = [
  'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya', 'Antya',
  'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya',
  'Antya', 'Antya', 'Madhya', 'Aadi', 'Aadi', 'Madhya', 'Antya',
];

// ---- Koota 1 · Varna (max 1) — element-based rank; groom ≥ bride → 1 ----
// Signs cycle Fire→Earth→Air→Water; ranks Kshatriya(3),Vaishya(2),Shudra(1),Brahmin(4).
const VARNA_RANK = [3, 2, 1, 4];
function varnaRank(rashi: number): number { return VARNA_RANK[(rashi - 1) % 4]; }
export function scoreVarna(brideRashi: number, groomRashi: number): number {
  return varnaRank(groomRashi) >= varnaRank(brideRashi) ? 1 : 0;
}

// ---- Koota 2 · Vashya (max 2) — whole-sign groups + symmetric matrix ----
type VGroup = 'Quad' | 'Human' | 'Aquatic' | 'Wild' | 'Insect';
const VASHYA_GROUP: VGroup[] = [
  'Quad', 'Quad', 'Human', 'Aquatic', 'Wild', 'Human',
  'Human', 'Insect', 'Human', 'Aquatic', 'Human', 'Aquatic',
];
const VG_INDEX: Record<VGroup, number> = { Quad: 0, Human: 1, Aquatic: 2, Wild: 3, Insect: 4 };
const VASHYA_MATRIX: number[][] = [
  [2, 1, 1, 0, 1],
  [1, 2, 1, 0, 1],
  [1, 1, 2, 1, 0.5],
  [0, 0, 1, 2, 0],
  [1, 1, 0.5, 0, 2],
];
export function scoreVashya(aRashi: number, bRashi: number): number {
  return VASHYA_MATRIX[VG_INDEX[VASHYA_GROUP[aRashi - 1]]][VG_INDEX[VASHYA_GROUP[bRashi - 1]]];
}

// ---- Koota 3 · Tara / Dina (max 3) — inclusive nakshatra counts; %9 in {3,5,7} unlucky ----
export function scoreTara(aNak: number, bNak: number): number {
  const countAtoB = ((bNak - aNak + 27) % 27) + 1;
  const countBtoA = ((aNak - bNak + 27) % 27) + 1;
  const unlucky = (r: number) => r === 3 || r === 5 || r === 7;
  const favA = !unlucky(countAtoB % 9);
  const favB = !unlucky(countBtoA % 9);
  if (favA && favB) return 3;
  if (favA || favB) return 1.5;
  return 0;
}

// ---- Koota 4 · Yoni (max 4) — same=4, bitter-enemy=0, else neutral=2 ----
const YONI_BITTER: [Animal, Animal][] = [
  ['Cow', 'Tiger'], ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Cat', 'Rat'],
  ['Dog', 'Deer'], ['Monkey', 'Sheep'], ['Serpent', 'Mongoose'],
];
function isBitterEnemy(x: Animal, y: Animal): boolean {
  return YONI_BITTER.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
}
export function scoreYoni(aNak: number, bNak: number): number {
  const x = NAK_YONI[aNak - 1], y = NAK_YONI[bNak - 1];
  if (x === y) return 4;
  if (isBitterEnemy(x, y)) return 0;
  return 2;
}

// ---- Koota 5 · Graha Maitri (max 5) — Moon-sign lords' mutual friendship ----
type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';
const SIGN_LORD: Planet[] = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];
const PL: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
// F = friend, N = neutral, E = enemy (row's relationship toward column).
const FRIEND: string[][] = [
  ['-', 'F', 'F', 'N', 'F', 'E', 'E'], // Sun
  ['F', '-', 'N', 'F', 'N', 'N', 'N'], // Moon
  ['F', 'F', '-', 'E', 'F', 'N', 'N'], // Mars
  ['F', 'E', 'N', '-', 'N', 'F', 'N'], // Mercury
  ['F', 'F', 'F', 'E', '-', 'E', 'N'], // Jupiter
  ['E', 'E', 'N', 'F', 'N', '-', 'F'], // Venus
  ['E', 'E', 'E', 'F', 'N', 'F', '-'], // Saturn
];
function planetRel(a: Planet, b: Planet): string { return FRIEND[PL.indexOf(a)][PL.indexOf(b)]; }
export function scoreGrahaMaitri(aRashi: number, bRashi: number): number {
  const la = SIGN_LORD[aRashi - 1], lb = SIGN_LORD[bRashi - 1];
  if (la === lb) return 5; // same lord → mutual friend
  const r1 = planetRel(la, lb), r2 = planetRel(lb, la);
  const both = (x: string, y: string) => (r1 === x && r2 === y) || (r1 === y && r2 === x);
  if (both('F', 'F')) return 5;
  if (both('F', 'N')) return 4;
  if (both('N', 'N')) return 3;
  if (both('F', 'E')) return 1;
  if (both('N', 'E')) return 0.5;
  return 0; // Enemy & Enemy
}

// ---- Koota 6 · Gana (max 6) — DIRECTIONAL: rows = groom, cols = bride ----
const GANA_INDEX: Record<Gana, number> = { Deva: 0, Manushya: 1, Rakshasa: 2 };
const GANA_MATRIX: number[][] = [
  [6, 5, 1], // groom Deva     → bride Deva/Manushya/Rakshasa
  [6, 6, 0], // groom Manushya
  [6, 0, 6], // groom Rakshasa
];
export function scoreGana(brideNak: number, groomNak: number): number {
  const bride = NAK_GANA[brideNak - 1], groom = NAK_GANA[groomNak - 1];
  return GANA_MATRIX[GANA_INDEX[groom]][GANA_INDEX[bride]];
}

// ---- Koota 7 · Bhakoot (max 7) — mutual rashi positions; 2/12, 5/9, 6/8 = dosha ----
export function scoreBhakoot(aRashi: number, bRashi: number): number {
  const d1 = ((bRashi - aRashi + 12) % 12) + 1;
  const d2 = ((aRashi - bRashi + 12) % 12) + 1;
  const [lo, hi] = d1 <= d2 ? [d1, d2] : [d2, d1];
  const dosha = (lo === 2 && hi === 12) || (lo === 5 && hi === 9) || (lo === 6 && hi === 8);
  return dosha ? 0 : 7;
}

// ---- Koota 8 · Nadi (max 8) — same Nadi = 0 (dosha), different = 8 ----
export function scoreNadi(aNak: number, bNak: number): number {
  return NAK_NADI[aNak - 1] === NAK_NADI[bNak - 1] ? 0 : 8;
}

// ---- §5 Rating bands ----
function ratingBand(total: number): { rating: string; tone: string } {
  if (total <= 17) return { rating: 'Challenging', tone: 'This match asks for conscious effort — strong bonds here are built, not gifted.' };
  if (total <= 24) return { rating: 'Acceptable', tone: 'A workable foundation with real room to grow together.' };
  if (total <= 32) return { rating: 'Good', tone: 'Naturally harmonious — an easy, supportive connection.' };
  return { rating: 'Excellent', tone: 'Rare and deeply aligned across mind, heart and spirit.' };
}

// ---- §6 Main entry point ----
export function gunaMilan(A: PersonMoon, B: PersonMoon): GunaResult {
  // A = bride/girl, B = groom/boy (document this convention).
  const varna = scoreVarna(A.rashi, B.rashi);
  const vashya = scoreVashya(A.rashi, B.rashi);
  const tara = scoreTara(A.nakshatra, B.nakshatra);
  const yoni = scoreYoni(A.nakshatra, B.nakshatra);
  const maitri = scoreGrahaMaitri(A.rashi, B.rashi);
  const gana = scoreGana(A.nakshatra, B.nakshatra); // directional
  const bhakoot = scoreBhakoot(A.rashi, B.rashi);
  const nadi = scoreNadi(A.nakshatra, B.nakshatra);

  const total = varna + vashya + tara + yoni + maitri + gana + bhakoot + nadi;
  const band = ratingBand(total);

  return {
    total,
    breakdown: { varna, vashya, tara, yoni, maitri, gana, bhakoot, nadi },
    doshas: { nadi: nadi === 0, bhakoot: bhakoot === 0 },
    rating: band.rating,
    tone: band.tone,
  };
}

// Extract a PersonMoon from a computed chart. computeChart is 0-based internally and
// exposes the Moon's sidereal longitude + 0-based signIndex on its planets[] entry;
// we add 1 to land on the spec's 1-based nakshatra (1–27) and rashi (1–12).
export function personMoonFromChart(chart: BirthChart, role?: Role): PersonMoon {
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const moonLon = moon ? moon.longitude : 0;
  return {
    nakshatra: Math.floor(moonLon / (360 / 27)) + 1, // 1–27
    rashi: (moon ? moon.signIndex : 0) + 1,           // 1–12
    role,
  };
}

// Display metadata for the 8-koota breakdown (in canonical order).
export const KOOTA_META: { key: KootaKey; label: string; max: number }[] = [
  { key: 'varna', label: 'Varna', max: 1 },
  { key: 'vashya', label: 'Vashya', max: 2 },
  { key: 'tara', label: 'Tara', max: 3 },
  { key: 'yoni', label: 'Yoni', max: 4 },
  { key: 'maitri', label: 'Graha Maitri', max: 5 },
  { key: 'gana', label: 'Gana', max: 6 },
  { key: 'bhakoot', label: 'Bhakoot', max: 7 },
  { key: 'nadi', label: 'Nadi', max: 8 },
];
