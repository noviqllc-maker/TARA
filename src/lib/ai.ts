// src/lib/ai.ts
// Ask Tara client — calls YOUR Supabase Edge Function (which holds the API key
// server-side). The Anthropic key is never in the app. Set the function URL in
// app.json -> expo.extra.taraAiUrl.

import Constants from 'expo-constants';
import { BirthChart, computeAllTransits } from '@/lib/vedic';
import { HealthMetrics } from '@/lib/health';
import { computeTransits } from '@/lib/transits';
import { varaLord } from '@/lib/panchanga';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

function endpoint(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  return extra.taraAiUrl || undefined;
}

// Context string built from the user's REAL chart + REAL wellness (when connected).
function buildContext(name: string, chart: BirthChart | null, health?: HealthMetrics | null): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Live sky for today (real panchanga + Moon transit relative to the user's chart)
  const t = computeTransits(today, chart);
  const vl = varaLord(today);
  const sky = `Today's sky: ${t.moonPhase}, Moon in ${t.moonSign} (${t.moonNakshatra}), ${t.panchanga}, ${vl.vara} (day of ${vl.lord}). ${t.transitText}.`;

  const w = health
    ? `Wellness today (${health.source === 'apple-health' ? 'from Apple Health' : 'estimated'}): recovery ${health.recovery}/100, sleep ${health.sleep}/100${health.sleepHours ? ` (${health.sleepHours}h)` : ''}, HRV ${health.hrv}ms, resting HR ${health.rhr}, steps ${health.steps}.`
    : '';

  if (chart) {
    // Natal snapshot (sign + house of every graha).
    const natal = chart.planets.map((pl) => `${pl.name} in ${pl.sign} (house ${pl.house})`).join(', ');
    // FULL current transit table for THIS user — every graha's live sign, the natal
    // house it's transiting, and retrograde (not just the Moon).
    const tr = computeAllTransits(chart, today);
    const transitTable = tr.map((x) => `${x.name} ${x.sign} h${x.house}${x.retrograde ? ' (R)' : ''}`).join(', ');
    const retro = tr.filter((x) => x.retrograde && x.name !== 'Rahu' && x.name !== 'Ketu').map((x) => x.name);
    const retroLine = retro.length ? ` Retrograde now: ${retro.join(', ')}.` : '';
    // Dasha depth: running Mahadasha + Antardasha.
    const dashaLine = `Dasha: ${chart.currentDasha}; Antardasha: ${chart.currentAntardasha}.`;
    // A few significant natal aspects (already human-readable from the engine).
    const aspLine = chart.aspects?.length ? ` Natal aspects: ${chart.aspects.slice(0, 4).join('; ')}.` : '';
    return `Today's date: ${dateStr}. User: ${name}. Lagna ${chart.ascendant.sign}, Moon ${chart.moonSign}, Sun ${chart.sunSign}, Nakshatra ${chart.nakshatra} pada ${chart.nakshatraPada}. ${dashaLine} Natal planets: ${natal}. Current transits: ${transitTable}.${retroLine}${aspLine} ${sky} ${w}`;
  }
  return `Today's date: ${dateStr}. User: ${name}. (Birth chart not yet available.) ${sky} ${w}`;
}

export async function askTara(
  history: ChatMessage[],
  name = 'friend',
  chart: BirthChart | null = null,
  health: HealthMetrics | null = null,
  language = 'English',
): Promise<string> {
  const url = endpoint();
  if (!url) return fallbackReply(history); // no backend configured yet → graceful demo reply

  const context = buildContext(name, chart, health) + (
    language && language !== 'English'
      ? ` Respond entirely in ${language}, in warm, natural phrasing. Keep Sanskrit astrology terms (nakshatra, dasha, rashi/sign names) as-is.`
      : ''
  );

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        context,
      }),
    });
    if (!res.ok) return fallbackReply(history);
    const data = await res.json();
    return (data.text && String(data.text).trim()) || fallbackReply(history);
  } catch {
    return fallbackReply(history);
  }
}

// ---- Ask Tara answer view -------------------------------------------------------
// The answer experience: a warm, human-first answer that happens to use Vedic astrology.
// The model returns structured JSON so the client can render distinct parts: the answer
// body (with template lead-ins), the 1–3 factors actually leaned on (attribution header),
// a standalone takeaway line, and 3 tailored follow-up questions.
export type TaraAnswer = {
  answer: string;
  factors?: string[];    // 1–3 short factor labels the answer actually used (attribution)
  takeaway?: string;     // one memorable standalone line, rendered distinctly
  followups?: string[];  // 3 tailored next questions (rendered as prefill chips)
};

// Five answer structures. The client detects "Label — content" lead-ins on their own
// lines and styles them; template E is plain conversational prose (no lead-ins).
const TEMPLATES: Record<'A' | 'B' | 'C' | 'D' | 'E', string> = {
  A: "TEMPLATE A. Five lead-ins, each on its own line: 'Short answer — …', 'Why — …', 'Best timing — …', 'Watch out — …', 'Tara's advice — …'.",
  B: "TEMPLATE B. Three lead-ins, each on its own line: 'The pattern — …', 'Why your chart says this — …', 'What helps now — …'.",
  C: "TEMPLATE C. Three lead-ins, each on its own line: 'Big picture — …', 'What's changing — …', 'What to do — …'.",
  D: "TEMPLATE D. Three lead-ins, each on its own line: 'Your challenge — …', 'Your strength — …', 'The opportunity — …'.",
  E: "TEMPLATE E. A single flowing conversational answer with NO section lead-ins (best for short/simple questions). May be shorter (60–120 words).",
};

const strHash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

// Choose a template by (question shape + topic + seeded rotation) so consecutive answers
// vary. Short questions → E; timing questions → A/C (they carry 'best timing' / 'what's
// changing'); otherwise rotate A–D by a hash of the question.
function pickTemplate(question: string, topic: string): 'A' | 'B' | 'C' | 'D' | 'E' {
  const words = question.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 6) return 'E';
  const timing = /\b(when|timing|time|year|month|soon|window|period|right time|good time)\b/i.test(question);
  const h = strHash(question.toLowerCase() + ':' + topic);
  if (timing) return (['A', 'C'] as const)[h % 2];
  return (['A', 'B', 'C', 'D'] as const)[h % 4];
}

export async function askTaraAnswer(
  question: string,
  factorLabel: string,
  name = 'friend',
  chart: BirthChart | null = null,
  health: HealthMetrics | null = null,
  language = 'English',
  topic = 'general',
): Promise<TaraAnswer> {
  const url = endpoint();
  const q = question.trim();
  const offline = (): TaraAnswer => ({ answer: fallbackReply([{ role: 'user', content: q }]), factors: [factorLabel] });
  if (!url) return offline();

  const context = buildContext(name, chart, health);
  const tpl = pickTemplate(q, topic);
  const system = [
    "You are Tara, a warm, grounded guide who happens to use Vedic astrology. You speak like a trusted friend who reads charts, not an astrologer lecturing about one.",
    // 1. Opener
    "OPENING: never open with an astrological factor, planet, house, or transit. Open with a direct human response to the question: the short answer, the pattern you notice, or a conversational hook (e.g. \"Here's what stands out.\" / \"You're asking at an interesting moment.\"). Vary your openers across answers. Never start with the user's name. Do NOT mention the transiting Moon unless the question is specifically about today's mood or energy.",
    // 2. Structure
    `STRUCTURE: ${TEMPLATES[tpl]} Put each lead-in on its own line in the exact form 'Label — content' (space, em dash, space). No markdown, no '#', no bullet points.`,
    // Punctuation: no em-dashes in prose (applies to the answer, the takeaway, and the
    // follow-ups). The ONLY allowed em-dash is the 'Label — content' lead-in separator above.
    'PUNCTUATION: do not use em-dashes (the "—" character) anywhere in your prose. Use a period, comma, or colon instead. The only exception is the required "Label — content" lead-in separator specified above, which must be kept exactly as written.',
    // Timing
    "For yearly, life-direction, or timing questions, lead with the running Mahadasha/Antardasha or slow planets (Saturn, Jupiter, Rahu, Ketu). Never today's Moon. Timing claims must derive ONLY from the provided dasha/transit data.",
    // 3. Translation rule
    "TRANSLATION RULE: every astrological mechanism you cite MUST be immediately paired with a lived-experience translation of how it feels in daily life. For example, \"Mercury retrograde in your 3rd: you'll catch yourself rewriting the same message three times before sending.\" The astrology explains; the human sentence lands it.",
    // 8. Guardrails
    "Only use chart factors present in the provided context. Never invent planets, houses, dashas, aspects, or transits. Warm, specific, never doom or fear; no medical, legal, or financial directives.",
    `LENGTH: ${tpl === 'E' ? '60–120' : '120–200'} words for the answer body (excluding the takeaway).`,
    // 4/5/6. Structured output
    'Return ONLY minified JSON with exactly these fields: {"factors":[1–3 SHORT UPPERCASE labels naming the factors you actually leaned on, e.g. "JUPITER–MERCURY ANTARDASHA","MERCURY RETROGRADE","SATURN IN 10TH"],"answer":"the templated answer text: no takeaway, no follow-ups inside it","takeaway":"one memorable standalone sentence that sums it up","followups":["three short, specific questions the user might naturally ask next"]}.',
    language && language !== 'English' ? `Write answer, takeaway, and followups in ${language}; keep Sanskrit terms as-is. Keep factors in English uppercase.` : '',
  ].filter(Boolean).join(' ');
  const userMsg = `Question: ${q}\n\n(Engine-detected strongest transit. Cite ONLY if genuinely relevant to this question: ${factorLabel})`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMsg }], context, system, maxTokens: 900 }),
    });
    if (!res.ok) return offline();
    const data = await res.json();
    const text = String(data?.text ?? '').trim();
    return parseAnswer(text) ?? { answer: text || offline().answer, factors: [factorLabel] };
  } catch {
    return offline();
  }
}

// Pull the structured answer from the model text; tolerant of ```json fences/preamble.
function parseAnswer(text: string): TaraAnswer | null {
  if (!text) return null;
  const s = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  try {
    const o = JSON.parse(s.slice(a, b + 1));
    const answer = typeof o.answer === 'string' ? o.answer.trim() : '';
    if (!answer) return null;
    const strArr = (v: any): string[] | undefined =>
      Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 3) : undefined;
    return {
      answer,
      factors: strArr(o.factors),
      takeaway: typeof o.takeaway === 'string' && o.takeaway.trim() ? o.takeaway.trim() : undefined,
      followups: strArr(o.followups),
    };
  } catch { return null; }
}

// Offline / not-yet-deployed fallback so the chat never dead-ends.
function fallbackReply(history: ChatMessage[]): string {
  const last = (history[history.length - 1]?.content || '').toLowerCase();
  if (last.includes('stuck'))
    return "The Moon moving through your 8th house often feels like stuckness, but it's really a turning-inward. With recovery low today, what reads as blockage is your system asking for restoration. Give yourself one quiet ritual and let clarity surface by evening.";
  if (last.includes('job') || last.includes('career') || last.includes('venture'))
    return "Your Jupiter Mahādasha favors long-term expansion, and Rahu in your 10th house pulls toward visible, unconventional work. This is a strong multi-year window for building, but today's reflective transit suggests planning over launching. Revisit once the current Moon phase clears.";
  if (last.includes('love') || last.includes('relationship'))
    return "Venus sits beautifully on your ascendant, giving warmth and magnetism in connection. Today asks for patience over problem-solving. Lead with listening. The deeper rhythm is sound; let this tender transit pass before big conversations.";
  return "With the Moon transiting your 8th house under your Jupiter Mahādasha, today favors reflection over action. Keep things light, hydrate, and protect your focus. What feels heavy now is likely a threshold, not a wall.";
}
