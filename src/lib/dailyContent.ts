// src/lib/dailyContent.ts
// Deterministic, engine-driven daily content — NO AI. Tara's Message and the Cosmic
// Weather insight cards are composed from template pools keyed to the day's real
// astrological factors (Moon nakshatra, day lord, strongest transit, Mahadasha /
// Antardasha lords, retrogrades), each card carrying a "because {mechanism}" clause.
//
// All randomness is seeded with (user id + calendar date) so content is stable across
// app opens within a day, but rotates across days and differs per user. Warm, non-doom
// tone throughout; reuses the dashaMeaning + house-theme vocabularies.

import { BirthChart, computeTransitFactor, computeAllTransits, NAKSHATRAS } from '@/lib/vedic';
import { computeTransits, houseTheme } from '@/lib/transits';
import { computeCosmicEvents } from '@/lib/panchanga';
import { MAHA_MEANING } from '@/data/dashaMeaning';
import { pickRelationalNudge } from '@/data/relational';
import { colors } from '@/theme';

// ---- seeded RNG (xmur3 hash → mulberry32) --------------------------------------
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
class Rng {
  private a: number;
  constructor(seed: string) { this.a = xmur3(seed)(); }
  next(): number {
    let t = (this.a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)] ?? arr[0]; }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// ---- vocabulary (reuses house themes + dashaMeaning; warm, non-doom) -----------
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ord = (n: number | null) => (n && ORD[n]) || 'current';
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lower = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

// A short "energy" lead for each graha (3 phrasings for day-to-day rotation).
const GRAHA_LEADS: Record<string, string[]> = {
  Sun: ['Your sense of purpose runs clear today.', 'There’s a quiet pull toward being seen and standing tall.', 'Confidence and clarity are within reach.'],
  Moon: ['Feelings run close to the surface.', 'A tender, intuitive current moves through the day.', 'Your inner weather asks to be honored.'],
  Mars: ['Energy runs high and ready to move.', 'There’s courage and drive to spend well.', 'A day with real momentum in it.'],
  Mercury: ['The mind is quick and curious.', 'Ideas and conversations want to flow.', 'A sharp, connective mental current.'],
  Jupiter: ['A spacious, hopeful current opens up.', 'Growth and meaning feel close today.', 'Doors feel a little more open than usual.'],
  Venus: ['Warmth and ease soften the day.', 'Connection and beauty come more naturally now.', 'A gentle, magnetic current runs through today.'],
  Saturn: ['Steady effort compounds now.', 'A grounded, patient current holds the day.', 'Slow and solid beats fast and loud today.'],
  Rahu: ['A restless pull toward something new.', 'Ambition hums under the surface.', 'The unfamiliar looks unusually appealing.'],
  Ketu: ['A quiet, inward tide moves today.', 'Something wants to be released, not chased.', 'Depth matters more than motion right now.'],
};

// Short headlines for Tara's Message, keyed to the day's driving graha.
const GRAHA_HEADLINES: Record<string, string[]> = {
  Sun: ['Today rewards showing up as yourself.', 'Lead with clarity, not volume.', 'Let your intention be the light.'],
  Moon: ['Today rewards feeling over fixing.', 'Let the heart set the pace.', 'Softness is the strategy today.'],
  Mars: ['Today rewards aimed effort over noise.', 'Move, but choose your direction.', 'Channel the fire, don’t scatter it.'],
  Mercury: ['Today rewards clear words over clever ones.', 'Let the mind organize, not spiral.', 'One clear thought moves everything.'],
  Jupiter: ['Today rewards thinking a little bigger.', 'Say yes to the wider horizon.', 'Growth favors the generous today.'],
  Venus: ['Today rewards warmth over winning.', 'Lead with connection, not correction.', 'Let ease do some of the work.'],
  Saturn: ['Today rewards patience over pressure.', 'Build slow, build once.', 'The long game is the winning one.'],
  Rahu: ['Today rewards bold moves with a grounded heart.', 'Reach, but keep your feet on the earth.', 'Ambition works best when it’s anchored.'],
  Ketu: ['Today rewards release over reaching.', 'Let go, and let clarity arrive.', 'Less is genuinely more today.'],
};

const MANTRAS: Record<string, { mantra: string; note: string }> = {
  Sun: { mantra: 'Oṃ Sūryāya Namaḥ', note: 'Chant to strengthen confidence and vitality.' },
  Moon: { mantra: 'Oṃ Chandrāya Namaḥ', note: 'Chant 11 times to soothe and steady the emotions.' },
  Mars: { mantra: 'Oṃ Maṅgalāya Namaḥ', note: 'Chant to focus courage and calm the temper.' },
  Mercury: { mantra: 'Oṃ Budhāya Namaḥ', note: 'Chant to steady the mind and clear communication.' },
  Jupiter: { mantra: 'Oṃ Gurave Namaḥ', note: 'Chant to invite wisdom and expansion.' },
  Venus: { mantra: 'Oṃ Śukrāya Namaḥ', note: 'Chant to open the heart and soften the day.' },
  Saturn: { mantra: 'Oṃ Śanaye Namaḥ', note: 'Chant to steady patience and ease pressure.' },
  Rahu: { mantra: 'Oṃ Rāhave Namaḥ', note: 'Chant to ground ambition and clear confusion.' },
  Ketu: { mantra: 'Oṃ Ketave Namaḥ', note: 'Chant to support release and inner clarity.' },
};

const JOURNAL_PROMPTS = [
  'What am I being asked to release rather than achieve today?',
  'Where is my energy genuinely wanting to go right now?',
  'What would softness change about today?',
  'What am I ready to stop carrying?',
  'Where can I trust my own mind today?',
  'What small, honest step is mine to take?',
  'What am I learning to truly value?',
  'What would it feel like to move a little slower today?',
];

// A one-line quality for each of the 27 nakshatras (Moon-in-nakshatra flavor).
const NAKSHATRA_QUALITY: Record<string, string> = {
  Ashwini: 'A swift, fresh-start energy hums today.', Bharani: 'A day of intensity and honest transformation.',
  Krittika: 'A sharp, purifying clarity cuts through.', Rohini: 'A lush, sensual, growth-loving current.',
  Mrigashira: 'A curious, searching, gentle restlessness.', Ardra: 'An emotionally charged, clearing sky.',
  Punarvasu: 'A return to safety and renewal.', Pushya: 'A nourishing, steadying, caretaking warmth.',
  Ashlesha: 'A deep, intuitive, inward pull.', Magha: 'A dignified, ancestral, honoring tone.',
  'Purva Phalguni': 'A playful, pleasure-loving ease.', 'Uttara Phalguni': 'A generous, reliable, service-minded warmth.',
  Hasta: 'A skillful, hands-on, capable current.', Chitra: 'A bright, creative, design-loving spark.',
  Swati: 'An independent, breezy, balancing air.', Vishakha: 'A determined, goal-focused drive.',
  Anuradha: 'A devoted, friendship-building warmth.', Jyeshtha: 'A protective, seniority-holding intensity.',
  Mula: 'A root-seeking, get-to-the-truth energy.', 'Purva Ashadha': 'An optimistic, invincible momentum.',
  'Uttara Ashadha': 'A steady, principled, enduring strength.', Shravana: 'A listening, learning, connective quiet.',
  Dhanishta: 'A rhythmic, abundant, capable beat.', Shatabhisha: 'A healing, private, unconventional current.',
  'Purva Bhadrapada': 'A visionary, intense, purpose-driven charge.', 'Uttara Bhadrapada': 'A deep, calming, wise stillness.',
  Revati: 'A soft, compassionate, journey’s-end tenderness.',
};

// ---- factor extraction ---------------------------------------------------------
const firstWord = (s: string) => (s || '').trim().split(/\s+/)[0] || '';
function antarLordOf(s: string): string {
  // "Jupiter–Saturn (Antardasha)" → "Saturn"
  const core = (s || '').split('(')[0];
  const parts = core.split('–');
  return (parts[1] || parts[0] || '').trim();
}
// Vimshottari lord of a nakshatra (Ashwini = Ketu, cycling every 9).
const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
function nakshatraLord(nak: string): string {
  const i = NAKSHATRAS.indexOf(nak);
  return i >= 0 ? NAK_LORDS[i % 9] : 'Moon';
}

// ---- composition helpers -------------------------------------------------------
type CardInput = { graha: string; house: number | null; mechanism: string; leadPool: string[] };

function composeBody(rng: Rng, { house, mechanism, leadPool }: CardInput): string {
  const lead = rng.pick(leadPool);
  const lean = house ? lower(houseTheme(house).lean) : 'steady, mindful action';
  const advice = rng.pick([`Lean into ${lean}`, `Give your energy to ${lean}`, `Let today favor ${lean}`]);
  // Why-first: the guidance up front, then an explicit "Why?" naming the real transit driver.
  return `${lead} ${advice}.\n\nWhy? ${cap(mechanism)}.`;
}

// ---- public types --------------------------------------------------------------
// One short "cosmic line" for the Home hero, keyed to the day's strongest graha. Phrased
// as "{Graha} <verb-phrase> today." — Moon/Sun read with a leading article.
const COSMIC_LINES: Record<string, string[]> = {
  Sun: ['is lighting your way today.', 'brings quiet confidence today.', 'favors honest self-expression today.'],
  Moon: ['favors creativity today.', 'softens the mood today.', 'turns your attention inward today.'],
  Mars: ['fuels bold action today.', 'sharpens your drive today.', 'favors decisive moves today.'],
  Mercury: ['sharpens your thinking today.', 'favors clear conversations today.', 'quickens the mind today.'],
  Jupiter: ['is quietly opening doors today.', 'widens your horizons today.', 'favors growth today.'],
  Venus: ['warms your connections today.', 'favors love and beauty today.', 'softens the day with grace today.'],
  Saturn: ['rewards patience today.', 'asks you to build slowly today.', 'favors steady effort today.'],
  Rahu: ['pulls you toward something new today.', 'stirs your ambition today.', 'favors bold reinvention today.'],
  Ketu: ['invites you to let go today.', 'turns you inward today.', 'favors quiet reflection today.'],
};
const withArticle = (g: string) => (g === 'Moon' || g === 'Sun' ? `The ${g}` : g);
function composeCosmicLine(rng: Rng, graha: string): string {
  return `${withArticle(graha)} ${rng.pick(COSMIC_LINES[graha] ?? COSMIC_LINES.Moon)}`;
}

// ---- plain-English daily guidance (Home hero) ----------------------------------
// Personal, actionable, warm — and deliberately free of astrology vocabulary: no planet,
// house, sign, or transit is ever named. The day's driving graha is used only as a private
// tone seed; the reader sees advice, not a mechanism. This is what replaces the jargon-laden
// "Why? {planet} is moving through your Nth house" body on Home. 3-4 sentences.
const GRAHA_ACTION: Record<string, string[]> = {
  Sun: ['Lead with quiet confidence and let your actions speak.', 'Show up as yourself and let clarity guide your choices.'],
  Moon: ['Let your feelings inform you without letting them run the show.', 'Be gentle with yourself and follow what feels steadying.'],
  Mars: ['Aim your energy at one clear target instead of scattering it.', 'Move with intention, and choose your efforts with care.'],
  Mercury: ['Say what you mean simply, and let one clear thought lead.', 'Get organized before you act, and keep things honest.'],
  Jupiter: ['Think a little bigger and say yes to what expands you.', 'Be generous, and trust that there is room to grow.'],
  Venus: ['Lead with warmth and let connection matter more than being right.', 'Choose ease and kindness over control today.'],
  Saturn: ['Go slow and build something that lasts.', 'Trust patient effort over quick results.'],
  Rahu: ['Reach for what is new, but keep your feet on the ground.', 'Let ambition move you without losing your center.'],
  Ketu: ['Let go of what you have outgrown rather than forcing more.', 'Make room for quiet, and trust what you already know.'],
};
const GUIDANCE_FOCUS = [
  'Put your energy into one thing that genuinely matters, and let the smaller stuff wait.',
  'Choose a single meaningful priority and give it your real attention.',
  'Focus on what is in front of you, and leave a little room instead of controlling every outcome.',
];
const GUIDANCE_CLOSE = [
  'Stay open to the people and opportunities around you, and let the rest unfold naturally.',
  'Be kind to yourself as the day moves, and trust that steady beats rushed.',
  'Leave space for things to breathe, and let the day meet you halfway.',
];
function composeGuidance(rng: Rng, driver: string): string {
  const open = rng.pick(GRAHA_LEADS[driver] ?? GRAHA_LEADS.Moon);
  const act = rng.pick(GRAHA_ACTION[driver] ?? GRAHA_ACTION.Moon);
  return `${open} ${act} ${rng.pick(GUIDANCE_FOCUS)} ${rng.pick(GUIDANCE_CLOSE)}`;
}

export type DailyMessage = { headline: string; body: string };
export type DailyInsight = { key: string; label: string; color: string; text: string; question: string };
export type DailyContent = {
  message: DailyMessage;
  guidance: string;          // plain-English, jargon-free daily advice for the Home hero
  cosmicLine: string;        // one-line Home hero note from the day's strongest graha
  weatherSummary: string;
  insights: DailyInsight[];
  avoid: string;
  leanInto: string;
  mantra: string;
  mantraNote: string;
  mantraGraha: string;       // the graha the day's mantra derives from (day-lord)
  journalPrompt: string;
  relationalLine: string;    // a relational / digital-wellness nudge, engine/calendar-gated
};

// Anchor every engine read to local noon of the given day, so the astrological factors
// (Moon position, transits) are identical no matter what time the app is opened — the
// content only changes when the calendar day does.
const noonOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

// Fallback when no chart yet (onboarding incomplete) — still deterministic per day.
function noChartContent(rng: Rng, date: Date): DailyContent {
  const t = computeTransits(noonOf(date), null);
  const graha = 'Moon';
  const body = `${rng.pick(GRAHA_LEADS.Moon)} ${rng.pick(['Lean into rest and reflection', 'Give your energy to quiet care'])}.\n\nWhy? The Moon sits in ${t.moonNakshatra}.`;
  return {
    message: { headline: rng.pick(GRAHA_HEADLINES.Moon), body },
    guidance: composeGuidance(rng, 'Moon'),
    cosmicLine: composeCosmicLine(rng, 'Moon'),
    weatherSummary: `The Moon moves through ${t.moonSign} in ${t.moonNakshatra}, ${t.panchanga}. Add your birth details to personalize today’s reading to your chart.`,
    insights: [
      { key: 'emotional', label: 'Emotional Energy', color: colors.rose, question: 'Why does my emotional energy feel this way today?', text: `${NAKSHATRA_QUALITY[t.moonNakshatra] ?? 'A gentle lunar current moves today.'} Honor it without acting on every wave, because the Moon sits in ${t.moonNakshatra}.` },
      { key: 'nakshatra', label: 'Moon’s Nakshatra', color: colors.saffron, question: 'What does my Moon’s nakshatra mean today?', text: `${NAKSHATRA_QUALITY[t.moonNakshatra] ?? 'A quiet, reflective tone.'} because the Moon sits in ${t.moonNakshatra}.` },
    ],
    avoid: 'Major decisions, overcommitting, harsh self-judgment.',
    leanInto: 'Rest, hydration, journaling, gentle routine.',
    mantra: MANTRAS[graha].mantra,
    mantraNote: MANTRAS[graha].note,
    mantraGraha: graha,
    journalPrompt: rng.pick(JOURNAL_PROMPTS),
    // No chart yet → only weekday-lord (tier-1) lines are eligible; the pick is stable per day.
    relationalLine: pickRelationalNudge({ date }, `nochart:${date.toDateString()}`),
  };
}

// ---- main composer -------------------------------------------------------------
export function composeDailyContent(chart: BirthChart | null, date: Date, seed: string): DailyContent {
  const rng = new Rng(seed);
  if (!chart) return noChartContent(rng, date);

  const day = noonOf(date);
  const t = computeTransits(day, chart);
  const events = computeCosmicEvents(chart, day);
  const factor = computeTransitFactor(chart, day, 'general');
  const allT = computeAllTransits(chart, day);
  const houseOf = (name: string) => allT.find((x) => x.name === name)?.house ?? null;
  const retros = allT.filter((x) => x.retrograde && x.name !== 'Rahu' && x.name !== 'Ketu').map((x) => x.name);
  const mahaLord = firstWord(chart.currentDasha);
  const antarLord = antarLordOf(chart.currentAntardasha);
  const moonNak = t.moonNakshatra;
  const moonHouse = t.moonHouse;

  // Mechanism string for the strongest transit factor.
  const transitMechanism = factor.aspectName && factor.natalPlanet
    ? `transiting ${factor.transiting} ${lower(factor.aspectName)}s your natal ${factor.natalPlanet}`
    : `${factor.transiting} is moving through your ${ord(factor.house ?? null)} house`;

  // ---- candidate insight sections (a larger pool; 5-6 are chosen per day) -------
  type Cand = { key: string; label: string; color: string; question: string; graha: string; house?: number | null; text: string };
  const cands: Cand[] = [];
  const add = (c: Omit<Cand, 'text' | 'house'>, input: CardInput) => cands.push({ ...c, house: input.house ?? null, text: composeBody(rng, input) });

  add({ key: 'emotional', label: 'Emotional Energy', color: colors.rose, question: 'Why does my emotional energy feel this way today?', graha: 'Moon' },
    { graha: 'Moon', house: moonHouse, mechanism: `the Moon is transiting your ${ord(moonHouse)} house`, leadPool: GRAHA_LEADS.Moon });

  add({ key: 'mental', label: 'Mental Energy', color: colors.lav, question: 'Why is my mind moving like this today?', graha: 'Mercury' },
    { graha: 'Mercury', house: houseOf('Mercury'), mechanism: `Mercury is ${retros.includes('Mercury') ? 'retrograde in' : 'moving through'} your ${ord(houseOf('Mercury'))} house`, leadPool: GRAHA_LEADS.Mercury });

  add({ key: 'relationship', label: 'Relationship Energy', color: colors.rose, question: "What's shaping my relationships today?", graha: 'Venus' },
    { graha: 'Venus', house: houseOf('Venus'), mechanism: `Venus is moving through your ${ord(houseOf('Venus'))} house`, leadPool: GRAHA_LEADS.Venus });

  {
    const g = ['Saturn', 'Sun', 'Mercury'].find((n) => [10, 6, 11].includes(houseOf(n) ?? -1)) ?? 'Saturn';
    add({ key: 'career', label: 'Career Energy', color: colors.goldSoft, question: 'Why is my career energy where it is today?', graha: g },
      { graha: g, house: houseOf(g), mechanism: `${g} is moving through your ${ord(houseOf(g))} house`, leadPool: GRAHA_LEADS[g] });
  }
  {
    const g = ['Mars', 'Sun'].find((n) => [1, 6, 8].includes(houseOf(n) ?? -1)) ?? 'Mars';
    add({ key: 'body', label: 'Body Signal', color: colors.sage, question: 'What is my body signalling today?', graha: g },
      { graha: g, house: houseOf(g), mechanism: `${g} is moving through your ${ord(houseOf(g))} house`, leadPool: GRAHA_LEADS[g] });
  }

  add({ key: 'spiritual', label: 'Spiritual Guidance', color: colors.saffron, question: 'What spiritual guidance is here for me today?', graha: 'Jupiter' },
    { graha: 'Jupiter', house: houseOf('Jupiter'), mechanism: `Jupiter is moving through your ${ord(houseOf('Jupiter'))} house`, leadPool: GRAHA_LEADS.Jupiter });

  // Dasha focus (Mahadasha lord).
  cands.push({
    key: 'dasha', label: 'Your Chapter', color: colors.gold, question: 'What is my current life chapter asking of me?', graha: mahaLord, house: null,
    text: `${rng.pick(GRAHA_LEADS[mahaLord] ?? GRAHA_LEADS.Jupiter)} This is your ${lower(MAHA_MEANING[mahaLord]?.chapter ?? 'current chapter')}, because your ${mahaLord} Mahādasha is running.`,
  });

  // Transit spotlight (strongest factor).
  add({ key: 'transit', label: 'Transit Spotlight', color: colors.lav, question: "What's the biggest cosmic influence on me today?", graha: factor.transiting },
    { graha: factor.transiting, house: factor.house ?? null, mechanism: transitMechanism, leadPool: GRAHA_LEADS[factor.transiting] ?? GRAHA_LEADS.Sun });

  // Nakshatra note.
  cands.push({
    key: 'nakshatra', label: 'Moon’s Nakshatra', color: colors.saffron, question: 'What does my Moon’s nakshatra mean today?', graha: nakshatraLord(moonNak), house: null,
    text: `${NAKSHATRA_QUALITY[moonNak] ?? 'A quiet lunar tone colors the day.'} ${rng.pick(['Let it guide your pace', 'Work with it, not against it'])}, because the Moon sits in ${moonNak}.`,
  });

  // Retrograde watch (only if something is retrograde).
  if (retros.length) {
    const g = retros[0];
    cands.push({
      key: 'retrograde', label: 'Retrograde Watch', color: colors.terra, question: 'How is the retrograde affecting me right now?', graha: g, house: null,
      text: `${rng.pick(GRAHA_LEADS[g] ?? GRAHA_LEADS.Saturn)} A day to revisit and refine rather than launch, because ${g} is retrograde.`,
    });
  }

  // ---- choose 5-6, rotating by day and varying the graha cited -----------------
  // Seed the used set with the Home guidance's driver so the Insights cards NEVER re-lead with
  // the same planet the "Today's Guidance" card already covered (this drops the redundant
  // Transit Spotlight, which was computed from the identical driver + mechanism). House-lean
  // dedup then stops two cards on the same house repeating the identical "favor X" advice, so
  // every card answers a genuinely different question.
  const shuffled = rng.shuffle(cands);
  const chosen: Cand[] = [];
  const usedGrahas = new Set<string>([factor.transiting]);
  const usedHouses = new Set<number>();
  if (factor.house != null) usedHouses.add(factor.house); // Home already gave this house's advice
  for (const c of shuffled) {
    if (chosen.length >= 6) break;
    if (usedGrahas.has(c.graha)) continue;              // don't repeat one planet across the day
    if (c.house != null && usedHouses.has(c.house)) continue; // don't repeat a house's advice
    chosen.push(c);
    usedGrahas.add(c.graha);
    if (c.house != null) usedHouses.add(c.house);
  }
  // If the variety guards left us short of 5, backfill from the rest (still never the driver).
  for (const c of shuffled) {
    if (chosen.length >= 5) break;
    if (chosen.includes(c) || usedGrahas.has(c.graha)) continue;
    chosen.push(c);
    usedGrahas.add(c.graha);
  }

  // ---- Tara's Message (headline + 2-sentence body from the strongest factor) ---
  const driver = factor.transiting;
  const message: DailyMessage = {
    headline: rng.pick(GRAHA_HEADLINES[driver] ?? GRAHA_HEADLINES.Moon),
    body: composeBody(rng, { graha: driver, house: factor.house ?? null, mechanism: transitMechanism, leadPool: GRAHA_LEADS[driver] ?? GRAHA_LEADS.Sun }),
  };

  // ---- overview + avoid/lean/mantra/journal ------------------------------------
  const weatherSummary = `Today's mood: your emotions move through ${t.moonSign}, in ${moonNak} (${t.panchanga}, on ${events.vara}, day of ${events.dayLord}).\n\nWhy? You're in your ${lower(MAHA_MEANING[mahaLord]?.chapter ?? 'current chapter')}${antarLord ? `, with the ${antarLord} sub-period active` : ''}.`;
  const mh = houseTheme(moonHouse);
  const dayMantra = MANTRAS[events.dayLord] ?? MANTRAS.Moon;

  return {
    message,
    guidance: composeGuidance(rng, driver),
    cosmicLine: composeCosmicLine(rng, driver),
    weatherSummary,
    insights: chosen.map(({ key, label, color, text, question }) => ({ key, label, color, text, question })),
    avoid: cap(mh.avoid) + '.',
    leanInto: cap(mh.lean) + '.',
    mantra: dayMantra.mantra,
    mantraNote: dayMantra.note,
    mantraGraha: events.dayLord,
    journalPrompt: rng.pick(JOURNAL_PROMPTS),
    // Engine-gated relational nudge: Mercury retro / Venus-strong / Saturn-on-Moon are all
    // confirmed here; otherwise it falls to the day's vāra-lord line. Seeded per (user + day).
    relationalLine: pickRelationalNudge(
      { date, mercuryRetro: retros.includes('Mercury'), venusStrong: driver === 'Venus', saturnOnMoon: factor.natalPlanet === 'Moon' && driver === 'Saturn' },
      `${seed}:rel`,
    ),
  };
}
