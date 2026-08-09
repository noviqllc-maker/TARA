// src/lib/ai.ts
// Ask Tara client — calls YOUR Supabase Edge Function (which holds the API key
// server-side). The Anthropic key is never in the app. Set the function URL in
// app.json -> expo.extra.taraAiUrl.

import Constants from 'expo-constants';
import { BirthChart, computeAllTransits } from '@/lib/vedic';
import { HealthMetrics } from '@/lib/health';
import { computeTransits } from '@/lib/transits';
import { varaLord } from '@/lib/panchanga';
import { detectCategory, buildCategoryPrompt } from '@/lib/askTaraCategory';

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
    // Natal snapshot (sign + house + D9 Navamsa of every graha). D9 is included so the
    // category guidance can genuinely lean on it (love/purpose) instead of inventing it.
    const natal = chart.planets.map((pl) => `${pl.name} in ${pl.sign} (house ${pl.house}, D9 ${pl.navamsaSign})`).join(', ');
    // Atmakaraka: the soul significator = the graha (Sun..Saturn) at the highest degree
    // within its sign. Surfaced so purpose questions can cite it truthfully.
    const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const ak = [...chart.planets]
      .filter((p) => GRAHAS.includes(p.name))
      .sort((a, b) => (b.longitude % 30) - (a.longitude % 30))[0]?.name;
    const akLine = ak ? ` Atmakaraka (soul planet): ${ak}.` : '';
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
    return `Today's date: ${dateStr}. User: ${name}. Lagna ${chart.ascendant.sign}, Moon ${chart.moonSign}, Sun ${chart.sunSign}, Nakshatra ${chart.nakshatra} pada ${chart.nakshatraPada}. ${dashaLine}${akLine} Natal planets: ${natal}. Current transits: ${transitTable}.${retroLine}${aspLine} ${sky} ${w}`;
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
    if (!res.ok) {
      if (__DEV__) { const b = await res.text().catch(() => ''); console.warn('[askTara] edge non-OK → fallback.', res.status, b.slice(0, 400)); }
      return fallbackReply(history);
    }
    const data = await res.json();
    const out = data.text && String(data.text).trim();
    if (!out && __DEV__) console.warn('[askTara] empty text → fallback.');
    return out || fallbackReply(history);
  } catch (e) {
    if (__DEV__) console.warn('[askTara] fetch threw → fallback:', String(e));
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
  error?: boolean;       // true → the model response was unparseable; render the graceful
                         // error state and refund the credit. NEVER accompanied by raw JSON.
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
  // Classify the question and prepend category-specific prioritization, so the WHY leads with
  // the right chart factors (10th for career, 7th/Venus for love, etc.) instead of defaulting
  // to today's transit. Placed early so Claude weights it before the general rules.
  const categoryGuidance = buildCategoryPrompt(detectCategory(q));
  const system = [
    "You are Tara, a warm, grounded guide who happens to use Vedic astrology. You speak like a trusted friend who reads charts, not an astrologer lecturing about one.",
    categoryGuidance,
    // 1. Opener
    "OPENING: never open with an astrological factor, planet, house, or transit. Open with a direct human response to the question: the short answer, the pattern you notice, or a conversational hook (e.g. \"Here's what stands out.\" / \"You're asking at an interesting moment.\"). Vary your openers across answers. Never start with the user's name. Do NOT mention the transiting Moon unless the question is specifically about today's mood or energy.",
    // 2. Structure
    `STRUCTURE: ${TEMPLATES[tpl]} Put each lead-in on its own line in the exact form 'Label — content' (space, em dash, space). No markdown, no '#', no bullet points.`,
    // Punctuation: no em-dashes in prose (applies to the answer, the takeaway, and the
    // follow-ups). The ONLY allowed em-dash is the 'Label — content' lead-in separator above.
    'PUNCTUATION: Use commas, periods, or semicolons instead of em-dashes (—). Never use em-dashes in responses. (Sole exception: the "Label — content" lead-in separator defined above, which the app parses and shows the reader as a colon; keep that one exactly.)',
    // Timing
    "For yearly, life-direction, or timing questions, lead with the running Mahadasha/Antardasha or slow planets (Saturn, Jupiter, Rahu, Ketu). Never today's Moon. Timing claims must derive ONLY from the provided dasha/transit data.",
    // 3. Translation rule
    "TRANSLATION RULE: every astrological mechanism you cite MUST be immediately paired with a lived-experience translation of how it feels in daily life. For example, \"Mercury retrograde in your 3rd: you'll catch yourself rewriting the same message three times before sending.\" The astrology explains; the human sentence lands it.",
    // 8. Guardrails
    "Only use chart factors present in the provided context. Never invent planets, houses, dashas, aspects, or transits. Warm, specific, never doom or fear; no medical, legal, or financial directives.",
    `LENGTH: ${tpl === 'E' ? '60–120' : '120–200'} words for the answer body (excluding the takeaway).`,
    // 4/5/6. Structured output
    'OUTPUT: respond with ONLY the JSON object and nothing else. No code fences (no ```), no "json" label, no preamble, no trailing text, nothing before the opening { or after the closing }. Escape every newline inside a string value as \\n (a JSON string may not contain a raw line break) and escape any double-quote inside a value as \\".',
    'Use exactly these fields: {"factors":[1–3 SHORT UPPERCASE labels naming the factors you actually leaned on, e.g. "JUPITER–MERCURY ANTARDASHA","MERCURY RETROGRADE","SATURN IN 10TH"],"answer":"the templated answer text: no takeaway, no follow-ups inside it","takeaway":"one memorable standalone sentence that sums it up","followups":["three short, specific questions the user might naturally ask next"]}.',
    language && language !== 'English' ? `Write answer, takeaway, and followups in ${language}; keep Sanskrit terms as-is. Keep factors in English uppercase.` : '',
  ].filter(Boolean).join(' ');
  const userMsg = `Question: ${q}\n\n(Engine-detected strongest transit. Cite ONLY if genuinely relevant to this question: ${factorLabel})`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMsg }], context, system, maxTokens: 1500 }),
    });
    if (!res.ok) {
      // DEV diagnosis: surface WHY we fall back (edge 4xx/5xx → the short canned reply).
      if (__DEV__) { const b = await res.text().catch(() => ''); console.warn('[askTaraAnswer] edge non-OK → offline fallback.', res.status, b.slice(0, 400)); }
      return offline();
    }
    const data = await res.json();
    const text = String(data?.text ?? '').trim();
    // DEV diagnosis: the raw model response at the parse site. TODO(remove-before-release).
    if (__DEV__) console.log('[askTaraAnswer] raw model response:', JSON.stringify(text).slice(0, 2000));
    const parsed = parseAnswer(text);
    if (parsed) return { answer: parsed.answer, factors: parsed.factors ?? [factorLabel], takeaway: parsed.takeaway, followups: parsed.followups };
    // Unrecoverable: DO NOT render the raw JSON. Signal an error so the screen shows a
    // graceful message and refunds the credit.
    if (__DEV__) console.warn('[askTaraAnswer] unparseable response — rendering error state. raw:', text);
    return { answer: '', factors: [factorLabel], error: true };
  } catch (e) {
    if (__DEV__) console.warn('[askTaraAnswer] fetch/parse threw → offline fallback:', String(e));
    return offline();
  }
}

// ---- robust answer parsing (defense in depth) ----------------------------------
// Order: strip fences/prose → isolate the outer {...} → strict JSON.parse → repaired parse
// (escape raw control chars inside strings) → regex-extract the "answer" field. Returns null
// ONLY when nothing usable can be recovered (caller then renders the error state). The raw
// model text is NEVER returned as the answer.
const tryParse = (s: string): any => { try { return JSON.parse(s); } catch { return null; } };

// Strip every ```json / ``` fence (models sometimes wrap or double-wrap the JSON).
const stripFences = (t: string): string => t.replace(/```(?:json)?/gi, '').trim();

// Escape raw newlines/tabs that appear INSIDE string values (the most common breakage:
// template answers put real line breaks in the "answer" string). A small state machine so
// structural whitespace between tokens is left untouched.
function repairJson(j: string): string {
  let out = '', inStr = false, esc = false;
  for (const ch of j) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr && (ch === '\n' || ch === '\r')) { out += '\\n'; continue; }
    if (inStr && ch === '\t') { out += '\\t'; continue; }
    out += ch;
  }
  return out;
}

const unescapeJson = (s: string): string =>
  s.replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

// Regex-extract one top-level string field's value (tolerant of raw or escaped newlines).
function regexField(src: string, key: string): string | undefined {
  const m = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(src);
  const v = m ? unescapeJson(m[1]).trim() : '';
  return v || undefined;
}
function regexArray(src: string, key: string): string[] | undefined {
  const m = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`).exec(src);
  if (!m) return undefined;
  const items = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => unescapeJson(x[1]).trim()).filter(Boolean).slice(0, 3);
  return items.length ? items : undefined;
}

function fromObject(o: any): TaraAnswer | null {
  const answer = typeof o?.answer === 'string' ? o.answer.trim() : '';
  if (!answer) return null;
  const strArr = (v: any): string[] | undefined =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()).slice(0, 3) : undefined;
  return {
    answer,
    factors: strArr(o.factors),
    takeaway: typeof o.takeaway === 'string' && o.takeaway.trim() ? o.takeaway.trim() : undefined,
    followups: strArr(o.followups),
  };
}

const regexEnvelope = (src: string): TaraAnswer | null => {
  const ra = regexField(src, 'answer');
  return ra ? { answer: ra, takeaway: regexField(src, 'takeaway'), followups: regexArray(src, 'followups'), factors: regexArray(src, 'factors') } : null;
};

export function parseAnswer(text: string): TaraAnswer | null {
  if (!text || !text.trim()) return null;
  const s = stripFences(text);
  const a = s.indexOf('{'), b = s.lastIndexOf('}');

  // No object markers at all → genuine plain prose (e.g. a template-E answer sans envelope).
  if (a === -1) return { answer: s };

  const closed = b > a ? s.slice(a, b + 1) : null;

  // (b) A complete {...} block → strict parse, then a repaired re-parse.
  if (closed) {
    const o = tryParse(closed) ?? tryParse(repairJson(closed));
    if (o && typeof o === 'object') {
      const built = fromObject(o);
      if (built) return built;
      // Parsed as an object but no usable answer field → regex, else error. NEVER raw JSON.
      return regexEnvelope(closed);
    }
  }

  // Envelope-shaped but unparseable (bad chars) OR truncated (no closing brace) →
  // (d) regex-extract the answer field from what we have.
  const candidate = closed ?? s.slice(a);
  if (/"answer"\s*:/.test(candidate)) return regexEnvelope(candidate);

  // A stray '{' inside otherwise-plain prose → treat the whole text as the answer.
  return { answer: s };
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
