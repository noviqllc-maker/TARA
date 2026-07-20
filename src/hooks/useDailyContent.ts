// src/hooks/useDailyContent.ts
// Central source of the day's engine-composed content (Tara's Message + Cosmic Weather).
// Seeded with (user id + calendar date) so it's identical across app opens within a day,
// rotates across days, and differs per user. Recomputed per calendar day via useMemo —
// no AI call, no network, nothing regenerates on every open.
import { useMemo } from 'react';
import { useChart } from '@/hooks/useChart';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { composeDailyContent, DailyContent } from '@/lib/dailyContent';

export function useDailyContent(): DailyContent {
  const chart = useChart();
  const { session } = useAuth();
  const { profile } = useProfile();
  const dayKey = new Date().toDateString();
  // Prefer the stable Supabase user id; fall back to the profile name (or 'anon') so
  // signed-out users still get stable-per-day, distinct content.
  const uid = session?.user?.id || profile.name || 'anon';
  return useMemo(
    () => composeDailyContent(chart, new Date(), `${uid}:${dayKey}`),
    [chart, uid, dayKey],
  );
}
