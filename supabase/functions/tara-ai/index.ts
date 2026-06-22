// supabase/functions/tara-ai/index.ts
// Secure server-side proxy for Tara AI.
// The Anthropic API key lives ONLY here (as a Supabase secret), never in the app.
// The app calls this function; this function calls Anthropic and returns the text.
//
// Deploy:  supabase functions deploy tara-ai --no-verify-jwt
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const SYSTEM = `You are Tara, an AI Vedic Life Guide. You blend authentic Jyotish (birth chart, nakshatra, dasha, transits, panchanga) with wellness signals to give warm, grounded, personalized daily guidance. You are insightful and empathetic, never generic and never a cheap horoscope. You give lifestyle and reflective guidance only — never medical, legal, or financial advice presented as certainty. Keep answers concise (3-6 sentences) unless asked for depth.

Formatting: Do not use emojis or decorative symbols. When a response has multiple sections, use short bold markdown labels (e.g. **Work & Focus**) followed by 1-3 sentences. Keep formatting minimal and elegant — warmth should come through your words, not symbols.`;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    if (!ANTHROPIC_API_KEY) {
      return json({ error: 'Server not configured' }, 500);
    }

    const { messages, context } = await req.json();
    if (!Array.isArray(messages)) {
      return json({ error: 'messages array required' }, 400);
    }

    // Basic guard: cap message count/length to control cost/abuse.
    const trimmed = messages.slice(-20).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 4000),
    }));

    const system = context
      ? `${SYSTEM}\n\nContext for this user:\n${String(context).slice(0, 2000)}`
      : SYSTEM;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages: trimmed,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: 'Upstream error', detail: errText.slice(0, 300) }, 502);
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();

    return json({ text });
  } catch (e) {
    return json({ error: 'Bad request', detail: String(e).slice(0, 200) }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
