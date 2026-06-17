// src/lib/ai.ts
// Tara AI client — calls YOUR Supabase Edge Function (which holds the API key
// server-side). The Anthropic key is never in the app. Set the function URL in
// app.json -> expo.extra.taraAiUrl.

import Constants from 'expo-constants';
import { cosmicWeather } from '@/data/mock';
import { BirthChart } from '@/lib/vedic';
import { HealthMetrics } from '@/lib/health';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

function endpoint(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  return extra.taraAiUrl || undefined;
}

// Context string built from the user's REAL chart + REAL wellness (when connected).
function buildContext(name: string, chart: BirthChart | null, health?: HealthMetrics | null): string {
  const w = health
    ? `Wellness today (${health.source === 'apple-health' ? 'from Apple Health' : 'estimated'}): recovery ${health.recovery}/100, sleep ${health.sleep}/100${health.sleepHours ? ` (${health.sleepHours}h)` : ''}, HRV ${health.hrv}ms, resting HR ${health.rhr}, steps ${health.steps}.`
    : '';
  if (chart) {
    const p = chart.planets.map((pl) => `${pl.name} in ${pl.sign} (house ${pl.house})`).join(', ');
    return `User: ${name}. Lagna ${chart.ascendant.sign}, Moon ${chart.moonSign}, Sun ${chart.sunSign}, Nakshatra ${chart.nakshatra} pada ${chart.nakshatraPada}, ${chart.currentDasha}. Planets: ${p}. Today's sky: ${cosmicWeather.transit}, ${cosmicWeather.moonPhase}. ${w}`;
  }
  return `User: ${name}. (Birth chart not yet available.) Today's sky: ${cosmicWeather.transit}, ${cosmicWeather.moonPhase}. ${w}`;
}

export async function askTara(
  history: ChatMessage[],
  name = 'friend',
  chart: BirthChart | null = null,
  health: HealthMetrics | null = null,
): Promise<string> {
  const url = endpoint();
  if (!url) return fallbackReply(history); // no backend configured yet → graceful demo reply

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        context: buildContext(name, chart, health),
      }),
    });
    if (!res.ok) return fallbackReply(history);
    const data = await res.json();
    return (data.text && String(data.text).trim()) || fallbackReply(history);
  } catch {
    return fallbackReply(history);
  }
}

// Offline / not-yet-deployed fallback so the chat never dead-ends.
function fallbackReply(history: ChatMessage[]): string {
  const last = (history[history.length - 1]?.content || '').toLowerCase();
  if (last.includes('stuck'))
    return "The Moon moving through your 8th house often feels like stuckness, but it's really a turning-inward. With recovery low today, what reads as blockage is your system asking for restoration. Give yourself one quiet ritual and let clarity surface by evening.";
  if (last.includes('job') || last.includes('career') || last.includes('venture'))
    return "Your Jupiter Mahādasha favors long-term expansion, and Rahu in your 10th house pulls toward visible, unconventional work. This is a strong multi-year window for building — but today's reflective transit suggests planning over launching. Revisit once the current Moon phase clears.";
  if (last.includes('love') || last.includes('relationship'))
    return "Venus sits beautifully on your ascendant, giving warmth and magnetism in connection. Today asks for patience over problem-solving — lead with listening. The deeper rhythm is sound; let this tender transit pass before big conversations.";
  return "With the Moon transiting your 8th house under your Jupiter Mahādasha, today favors reflection over action. Keep things light, hydrate, and protect your focus. What feels heavy now is likely a threshold, not a wall.";
}
