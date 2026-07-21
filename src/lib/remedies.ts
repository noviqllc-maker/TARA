// src/lib/remedies.ts
// Assembles the Personal Remedies report: a permanent natal layer + a LIVING layer that
// recomputes on open (running dasha lords + Sade Sati). Deterministic, no AI.
import { BirthChart, computeAllTransits, SIGNS } from '@/lib/vedic';
import { dignityOf, ord } from '@/lib/blueprint';
import {
  GRAHA_REMEDY, GrahaRemedy, SADE_SATI, SATURN_SUPPORT, CONDITION_TEXT, grahanText, WEEKDAY_LORD,
} from '@/data/remedies';

const firstWord = (s: string) => (s || '').trim().split(/\s+/)[0] || '';
const antarLordOf = (s: string) => { const core = (s || '').split('(')[0]; const parts = core.split('–'); return (parts[1] || parts[0] || '').trim(); };
const DUSTHANA = [6, 8, 12];
const norm = (x: number) => ((x % 360) + 360) % 360;

export type ConditionItem = { key: string; title: string; present: boolean; text: string };
export type StrengthGraha = { name: string; why: string; remedy: GrahaRemedy };
export type Remedies = {
  focus: {
    mahaLord: string; antarLord: string;
    mahaRemedy: GrahaRemedy; antarRemedy: GrahaRemedy;
    sadeSati: { title: string; body: string; support?: string };
  };
  conditions: ConditionItem[];
  strengthen: { weakest: StrengthGraha; supportive: StrengthGraha };
  weekly: { day: string; graha: string; micro: string }[];
};

export function computeRemedies(chart: BirthChart, now: Date = new Date()): Remedies {
  const p = (n: string) => chart.planets.find((x) => x.name === n);
  const mahaLord = firstWord(chart.currentDasha) || 'Jupiter';
  const antarLord = antarLordOf(chart.currentAntardasha) || mahaLord;
  const remedy = (g: string) => GRAHA_REMEDY[g] ?? GRAHA_REMEDY.Jupiter;

  // ---- LIVING: Sade Sati (Saturn's transit sign vs natal Moon sign) ----
  let sadeKey: keyof typeof SADE_SATI = 'clear';
  try {
    const tr = computeAllTransits(chart, now);
    const satSign = tr.find((x) => x.name === 'Saturn')?.sign;
    const satIdx = satSign ? SIGNS.indexOf(satSign) : -1;
    const moonIdx = SIGNS.indexOf(chart.moonSign);
    if (satIdx >= 0 && moonIdx >= 0) {
      const diff = (satIdx - moonIdx + 12) % 12; // Saturn's sign counted from natal Moon
      sadeKey = diff === 11 ? 'rising' : diff === 0 ? 'peak' : diff === 1 ? 'setting' : diff === 3 ? 'dhaiyya4' : diff === 7 ? 'dhaiyya8' : 'clear';
    }
  } catch { /* keep 'clear' */ }
  const sade = SADE_SATI[sadeKey];
  const inSaturnPhase = sadeKey !== 'clear';

  // ---- CHART CONDITIONS (only what the engine can verify) ----
  const conditions: ConditionItem[] = [];
  // Mangal dosha — Mars in 1/2/4/7/8/12 from lagna.
  const mars = p('Mars');
  const mangal = !!mars && [1, 2, 4, 7, 8, 12].includes(mars.house);
  conditions.push({ key: 'mangal', title: 'Maṅgal (Mars) Dosha', present: mangal, text: mangal ? CONDITION_TEXT.mangalPresent : CONDITION_TEXT.mangalAbsent });

  // Kala Sarpa — all 7 non-node grahas on one side of the Rahu–Ketu axis.
  const rahu = p('Rahu');
  let kala = false;
  if (rahu) {
    const others = chart.planets.filter((x) => !['Rahu', 'Ketu'].includes(x.name));
    const angles = others.map((x) => norm(x.longitude - rahu.longitude));
    const allBetween = angles.every((a) => a > 0 && a < 180);
    const allOutside = angles.every((a) => a > 180 && a < 360);
    kala = allBetween || allOutside;
  }
  conditions.push({ key: 'kala', title: 'Kāla Sarpa', present: kala, text: kala ? CONDITION_TEXT.kalaSarpaPresent : CONDITION_TEXT.kalaSarpaAbsent });

  // Grahan — Sun or Moon conjunct (same house as) Rahu or Ketu.
  const sun = p('Sun'); const moon = p('Moon'); const ketu = p('Ketu');
  const grahanHit = (lum?: { house: number }, node?: { name: string; house: number }) => (lum && node && lum.house === node.house ? node : null);
  const grahanNode = grahanHit(sun, rahu) ?? grahanHit(sun, ketu) ?? grahanHit(moon, rahu) ?? grahanHit(moon, ketu);
  if (grahanNode) {
    const lum = (sun && sun.house === grahanNode.house) ? 'Sun' : 'Moon';
    conditions.push({ key: 'grahan', title: 'Grahaṇ (eclipse)', present: true, text: grahanText(lum, grahanNode.name, grahanNode.house) });
  } else {
    conditions.push({ key: 'grahan', title: 'Grahaṇ (eclipse)', present: false, text: CONDITION_TEXT.grahanAbsent });
  }

  // ---- STRENGTHENING SET (weakest + most supportive natal grahas) ----
  const nonNode = chart.planets.filter((x) => !['Rahu', 'Ketu'].includes(x.name));
  const weakestP =
    nonNode.find((x) => dignityOf(x.name, x.sign) === 'debilitated')
    ?? nonNode.find((x) => DUSTHANA.includes(x.house))
    ?? nonNode[nonNode.length - 1];
  const weakWhy =
    dignityOf(weakestP.name, weakestP.sign) === 'debilitated' ? `challenged in ${weakestP.sign}, so a little support helps it shine`
      : DUSTHANA.includes(weakestP.house) ? `placed in your ${ord(weakestP.house)} house, a house of challenge — strengthening it brings ease`
        : `the graha that most welcomes your support right now`;

  const supportiveP =
    nonNode.find((x) => dignityOf(x.name, x.sign) === 'exalted')
    ?? nonNode.find((x) => dignityOf(x.name, x.sign) === 'own')
    ?? nonNode.find((x) => [1, 4, 5, 7, 9, 10].includes(x.house))
    ?? nonNode[0];
  const supWhy =
    dignityOf(supportiveP.name, supportiveP.sign) === 'exalted' ? `exalted in ${supportiveP.sign} — your strongest ally, worth honouring often`
      : dignityOf(supportiveP.name, supportiveP.sign) === 'own' ? `strong in its own sign — a natural source of support`
        : `well placed in your ${ord(supportiveP.house)} house — a dependable strength to lean on`;

  return {
    focus: {
      mahaLord, antarLord,
      mahaRemedy: remedy(mahaLord), antarRemedy: remedy(antarLord),
      sadeSati: { title: sade.title, body: sade.body, support: inSaturnPhase ? SATURN_SUPPORT : undefined },
    },
    conditions,
    strengthen: {
      weakest: { name: weakestP.name, why: weakWhy, remedy: remedy(weakestP.name) },
      supportive: { name: supportiveP.name, why: supWhy, remedy: remedy(supportiveP.name) },
    },
    weekly: WEEKDAY_LORD.map(({ day, graha }) => ({ day, graha, micro: remedy(graha).micro })),
  };
}
