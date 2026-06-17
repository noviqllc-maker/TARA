// src/hooks/useChart.ts
// Computes the user's real Vedic chart from their saved birth profile.
// Memoized so the astronomy math runs once per profile change.
import { useMemo } from 'react';
import { useProfile } from './useProfile';
import { computeChart, BirthChart } from '@/lib/vedic';

export function useChart(): BirthChart | null {
  const { profile } = useProfile();
  return useMemo(() => {
    if (!profile.birthDate || !profile.birthTime) return null;
    try {
      return computeChart({
        date: profile.birthDate,
        time: profile.birthTime,
        lat: profile.lat ?? 20.59,
        lon: profile.lon ?? 78.96,
        tzOffsetMinutes: profile.tzOffsetMinutes ?? 330,
      });
    } catch {
      return null;
    }
  }, [profile.birthDate, profile.birthTime, profile.lat, profile.lon, profile.tzOffsetMinutes]);
}
