// src/lib/panchangExplain.ts
// Orchestrates the daily panchāṅga explanation: one AI call per user per day (via askPanchang),
// cached in AsyncStorage per user + date, with a deterministic chart-tied fallback so it always
// works offline. The fallback is also what shows instantly while the AI response loads.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BirthChart, computeAllTransits, NAKSHATRAS } from '@/lib/vedic';
import { computeTransits } from '@/lib/transits';
import { nityaYoga } from '@/lib/calendar';
import { askPanchang, PanchangExplained } from '@/lib/ai';

const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const TITHI_KW: Record<string, string> = {
  Pratipadā: 'new beginnings and fresh starts', Dvitīyā: 'building and laying foundations',
  Tṛtīyā: 'effort, momentum, and courage', Caturthī: 'clearing obstacles and focus',
  Pañcamī: 'learning, creativity, and planning', Ṣaṣṭhī: 'health, service, and routine',
  Saptamī: 'movement, connection, and travel', Aṣṭamī: 'depth, resolve, and transformation',
  Navamī: 'energy, drive, and finishing what you started', Daśamī: 'achievement and steady progress',
  Ekādaśī: 'devotion, lightness, and turning inward', Dvādaśī: 'release, generosity, and winding down',
  Trayodaśī: 'vitality, warmth, and connection', Caturdaśī: 'intensity, clearing, and care',
  Pūrṇimā: 'fullness, completion, and gratitude', Amāvasyā: 'rest, renewal, and remembrance',
};
const HOUSE_LEAN: Record<number, string> = {
  1: 'a good day to lead and put yourself forward', 2: 'tend to money, food, and what you value',
  3: 'reach out, communicate, and take small brave steps', 4: 'nurture home, rest, and your inner base',
  5: 'make space for creativity, play, and romance', 6: 'handle work, health, and the daily details',
  7: 'focus on partners and one-to-one time', 8: 'go gently; favor rest and honest, deeper work',
  9: 'learn, travel, or reconnect with your bigger why', 10: 'push on career, visibility, and long goals',
  11: 'connect with your network and future hopes', 12: 'slow down, reflect, and let something go',
};
const NAK_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const LORD_THEME: Record<string, string> = {
  Ketu: 'insight and letting go', Venus: 'warmth and connection', Sun: 'clarity and will',
  Moon: 'feeling and care', Mars: 'drive and initiative', Rahu: 'ambition and the new',
  Jupiter: 'growth and good faith', Saturn: 'patience and structure', Mercury: 'thought and skill',
};

export function panchangFacts(chart: BirthChart | null, date: Date): { tithi: string; nakshatra: string; yoga: string; moonHouse: number | null } {
  const t = computeTransits(date, chart);
  const [, tithi] = t.panchanga.split(' · ');
  return { tithi: tithi ?? t.panchanga, nakshatra: t.moonNakshatra, yoga: nityaYoga(date).name, moonHouse: t.moonHouse };
}

// Deterministic, chart-tied explanation (also the instant/offline version).
export function deterministicPanchang(chart: BirthChart | null, date: Date): PanchangExplained {
  const t = computeTransits(date, chart);
  const [, tithiName] = t.panchanga.split(' · ');
  const nak = t.moonNakshatra;
  const yoga = nityaYoga(date);
  const mh = t.moonHouse;

  const tithi = `${tithiName ?? t.panchanga} (${TITHI_KW[tithiName ?? ''] ?? 'the day\'s lunar tone'}).${mh ? ` The Moon is transiting your ${ORD[mh]} house today, so ${HOUSE_LEAN[mh]}.` : ''}`;

  const nakIdx = NAKSHATRAS.indexOf(nak);
  const ruler = nakIdx >= 0 ? NAK_LORDS[nakIdx % 9] : 'Moon';
  let nakHouse: number | null = null;
  try { nakHouse = chart ? (computeAllTransits(chart, date).find((x) => x.name === ruler)?.house ?? null) : null; } catch {}
  const nakshatra = `${nak} (ruled by ${ruler}, themes of ${LORD_THEME[ruler] ?? 'its own tone'}).${nakHouse ? ` ${ruler} is transiting your ${ORD[nakHouse]} house now, coloring the day with ${LORD_THEME[ruler] ?? 'that energy'}.` : ''}`;

  const yogaText = `${yoga.name}. ${yoga.major ? 'A traditionally auspicious combination, a supportive day to begin or commit to something.' : 'A neutral combination; let the tithi and nakshatra set the tone of the day.'}`;

  return { tithi, nakshatra, yoga: yogaText };
}

// Cache-first: today's cached AI result, else the AI call (cached on success), else the
// deterministic fallback. Only ever called for "today" by the hook, so it fires once a day.
export async function getPanchangExplained(
  uid: string, name: string, chart: BirthChart | null, date: Date,
): Promise<{ data: PanchangExplained; source: 'cache' | 'ai' | 'offline' | 'nochart' }> {
  const key = `panchang.explain.v1:${uid}:${ymd(date)}`;
  try { const c = await AsyncStorage.getItem(key); if (c) return { data: JSON.parse(c), source: 'cache' }; } catch {}

  const fallback = deterministicPanchang(chart, date);
  if (!chart) return { data: fallback, source: 'nochart' };

  const ai = await askPanchang(name, chart, panchangFacts(chart, date));
  if (ai) { try { await AsyncStorage.setItem(key, JSON.stringify(ai)); } catch {} return { data: ai, source: 'ai' }; }
  return { data: fallback, source: 'offline' };
}
