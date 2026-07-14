// src/lib/reports.ts
// Deliverable content for the three shop products. Uses ONLY the existing Vedic
// engine outputs (BirthChart + transits) and the existing Tara AI backend — no new
// astronomy. Each report is generated once, then cached permanently keyed by
// product + a hash of the birth data, so it regenerates only if birth data changes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { BirthChart } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';

export type ReportKind = 'shop_year_ahead' | 'shop_birth_blueprint' | 'shop_dosha_remedies';
export type ReportSection = { heading: string; body: string };
export type Report = {
  kind: ReportKind;
  title: string;
  sections: ReportSection[];
  generatedAt: string; // ISO
  hash: string;        // birth-data hash this content was generated for
};

export const REPORT_META: Record<ReportKind, { title: string; loading: string }> = {
  shop_year_ahead: { title: 'Year Ahead Report', loading: 'Tara is mapping your year…' },
  shop_birth_blueprint: { title: 'Birth Blueprint', loading: 'Tara is reading your chart…' },
  shop_dosha_remedies: { title: 'Dosha Remedies', loading: 'Tara is preparing your remedies…' },
};

export const REPORT_FOOTER = 'For reflection and wellness purposes.';

export function isReportKind(x: unknown): x is ReportKind {
  return x === 'shop_year_ahead' || x === 'shop_birth_blueprint' || x === 'shop_dosha_remedies';
}

// ---- birth-data hash (cache key) ----------------------------------------------
export type BirthKeyFields = {
  birthDate?: string; birthTime?: string; lat?: number; lon?: number; tzOffsetMinutes?: number;
};
export function birthHash(p: BirthKeyFields): string {
  const s = `${p.birthDate}|${p.birthTime}|${p.lat}|${p.lon}|${p.tzOffsetMinutes}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ---- persistence (permanent cache) --------------------------------------------
const keyFor = (kind: ReportKind) => `tara.report.${kind}.v1`;

export async function loadReport(kind: ReportKind, hash: string): Promise<Report | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(kind));
    if (!raw) return null;
    const r = JSON.parse(raw) as Report;
    // Only serve the cache if it matches the current birth data — else it's stale.
    return r?.hash === hash && Array.isArray(r.sections) && r.sections.length ? r : null;
  } catch { return null; }
}
export async function saveReport(r: Report): Promise<void> {
  try { await AsyncStorage.setItem(keyFor(r.kind), JSON.stringify(r)); } catch {}
}
export async function clearReport(kind: ReportKind): Promise<void> {
  try { await AsyncStorage.removeItem(keyFor(kind)); } catch {}
}

// ---- structured chart data for the AI (no free-form astrology invented here) ---
function planet(chart: BirthChart, name: string) {
  const p = chart.planets.find((x) => x.name === name);
  return p ? { sign: p.sign, house: p.house, retrograde: p.retrograde } : null;
}
function occupantsOfHouse(chart: BirthChart, house: number) {
  return chart.planets.filter((p) => p.house === house).map((p) => p.name);
}
function nextMonthLabels(count: number, from: Date): string[] {
  const out: string[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < count; i++) {
    out.push(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

// Dusthana (6/8/12) placement or retrograde → flag as "needs support" for remedies.
function afflictedPlanets(chart: BirthChart): string[] {
  const dusthana = new Set([6, 8, 12]);
  return chart.planets
    .filter((p) => !['Rahu', 'Ketu'].includes(p.name) && (dusthana.has(p.house) || p.retrograde))
    .map((p) => `${p.name} in ${p.sign} (house ${p.house}${p.retrograde ? ', retrograde' : ''})`);
}

function chartData(kind: ReportKind, chart: BirthChart) {
  const core = {
    lagna: chart.ascendant.sign,
    moonSign: chart.moonSign,
    sunSign: chart.sunSign,
    nakshatra: chart.nakshatra,
    nakshatraPada: chart.nakshatraPada,
    rulingPlanet: chart.rulingPlanet,
  };

  if (kind === 'shop_year_ahead') {
    const now = new Date();
    const t = computeTransits(now, chart);
    return {
      ...core,
      currentDasha: chart.currentDasha,
      currentAntardasha: chart.currentAntardasha,
      // Mahadasha timeline (lord + years + antardasha sub-periods the engine exposes).
      dashaTimeline: chart.dasha.map((d) => ({
        lord: d.planet, fromYear: d.start, toYear: d.end, phase: d.phase, theme: d.theme,
        antardashas: (d.antardashas ?? []).map((a) => ({ lord: a.planet, start: a.start, end: a.end, phase: a.phase })),
      })),
      natalJupiter: planet(chart, 'Jupiter'),
      natalSaturn: planet(chart, 'Saturn'),
      currentMoonTransit: { sign: t.moonSign, house: t.moonHouse, note: t.transitText },
      months: nextMonthLabels(12, now),
    };
  }

  if (kind === 'shop_birth_blueprint') {
    return {
      ...core,
      ascendantDegree: chart.ascendant.degree,
      planets: chart.planets.map((p) => ({ name: p.name, sign: p.sign, house: p.house, retrograde: p.retrograde })),
      venus: planet(chart, 'Venus'),
      seventhHouseOccupants: occupantsOfHouse(chart, 7),
      tenthHouseOccupants: occupantsOfHouse(chart, 10),
      currentDasha: chart.currentDasha,
    };
  }

  // shop_dosha_remedies
  return {
    ...core,
    mars: planet(chart, 'Mars'),       // Mangal dosha indicator
    saturn: planet(chart, 'Saturn'),   // Shani influence
    rahu: planet(chart, 'Rahu'),
    ketu: planet(chart, 'Ketu'),
    afflicted: afflictedPlanets(chart),
  };
}

// ---- fixed section spec per report (keeps output format consistent) ------------
function sectionSpec(kind: ReportKind, chart: BirthChart): string {
  if (kind === 'shop_year_ahead') {
    const months = nextMonthLabels(12, new Date());
    return [
      'Produce sections IN THIS ORDER:',
      '1) heading "The Year\'s Theme" — ~80 words on the year\'s overall theme, grounded in the ruling Mahadasha lord.',
      `2) EXACTLY 12 monthly sections, one per month, with these EXACT headings in order: ${months.join(', ')}.`,
      '   Each monthly body is 60–90 words and MUST cover: the month\'s tone, a career note, a relationship note, and one key date range to act on or hold back.',
      '3) heading "Three to Prioritise This Year" — three concise priorities as a short paragraph.',
    ].join('\n');
  }
  if (kind === 'shop_birth_blueprint') {
    return [
      'Produce sections IN THIS ORDER, each heading EXACTLY as written:',
      '1) "Core Nature" — personality drawn from lagna + Moon sign + nakshatra.',
      '2) "Strengths & Growth Edges" — natural strengths and the edges to grow.',
      '3) "Career Path" — suitable directions from the 10th house and dasha lords, with concrete field examples.',
      '4) "Love & Relationships" — patterns from Venus and the 7th house, and what they need in a partner.',
      "5) \"Your Life's Thread\" — a ~100-word synthesis that ties it together.",
    ].join('\n');
  }
  // dosha
  const inds: string[] = [];
  const mars = planet(chart, 'Mars');
  const sat = planet(chart, 'Saturn');
  const rahu = planet(chart, 'Rahu');
  if (mars) inds.push(`Mangal/Mars (Mars in ${mars.sign}, house ${mars.house})`);
  if (sat) inds.push(`Shani/Saturn (Saturn in ${sat.sign}, house ${sat.house})`);
  if (rahu) inds.push('the Rahu–Ketu axis');
  return [
    'Start with one section heading "Understanding Your Remedies" — a warm, 2–3 sentence, non-fearful framing.',
    `Then ONE section for EACH of these indicators: ${inds.join('; ')}${'.'}`,
    'Also add a section for any clearly afflicted/weak planet listed in the data (skip if none).',
    'Each indicator section MUST cover, as short labelled paragraphs within the body:',
    '  • What it is in THIS chart — plain language, empowering, never doom-based.',
    '  • Colors — which to favour, tied to the ruling planet\'s weekday.',
    '  • Donations (daan) — traditional items + the weekday, framed as acts of goodwill.',
    '  • Simple practices — an optional mantra or fasting day, presented as tradition, not obligation.',
    'TONE: empowering and supportive. NO "cursed" framing. Do NOT pressure toward expensive gemstones — gemstones may be mentioned only as optional tradition.',
  ].join('\n');
}

// ---- AI call (reuses the existing Tara edge function) --------------------------
function endpoint(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  return extra.taraAiUrl || undefined;
}

function buildPrompt(kind: ReportKind, chart: BirthChart): { context: string; prompt: string } {
  const data = chartData(kind, chart);
  const context =
    `You are Tara, a warm, grounded Vedic astrology guide writing a premium "${REPORT_META[kind].title}". ` +
    'Base everything ONLY on the chart data provided — do not invent positions. Write with warmth and clarity, ' +
    'second person ("you"). This is for reflection and wellness, not prediction or fear.';
  const prompt = [
    `Write the "${REPORT_META[kind].title}" using this chart data (JSON):`,
    '```json',
    JSON.stringify(data, null, 2),
    '```',
    '',
    sectionSpec(kind, chart),
    '',
    'Return ONLY valid minified JSON in EXACTLY this shape, no prose, no markdown fences:',
    '{"sections":[{"heading":"...","body":"..."}]}',
    'Use "\\n\\n" between paragraphs inside a body. Do not include any key other than "sections".',
  ].join('\n');
  return { context, prompt };
}

// Pull the {"sections":[...]} object out of the model text, tolerant of stray
// prose or ```json fences around it.
function parseSections(text: string): ReportSection[] {
  if (!text) return [];
  let s = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return [];
  s = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(s) as { sections?: unknown };
    if (!Array.isArray(obj.sections)) return [];
    return obj.sections
      .map((x: any) => ({ heading: String(x?.heading ?? '').trim(), body: String(x?.body ?? '').trim() }))
      .filter((x) => x.heading && x.body);
  } catch { return []; }
}

// Generate a fresh report. Throws on failure so the screen can show retry UI.
export async function generateReport(kind: ReportKind, chart: BirthChart, hash: string): Promise<Report> {
  const url = endpoint();
  if (!url) throw new Error('AI backend not configured');
  const { context, prompt } = buildPrompt(kind, chart);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], context }),
  });
  if (!res.ok) throw new Error(`AI backend error ${res.status}`);
  const data = await res.json();
  const sections = parseSections(String(data?.text ?? ''));
  if (!sections.length) throw new Error('Could not parse report');
  return {
    kind,
    title: REPORT_META[kind].title,
    sections,
    generatedAt: new Date().toISOString(),
    hash,
  };
}
