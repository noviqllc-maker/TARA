// src/hooks/useDailyEnergy.ts
// Shared daily-energy scores (rings + snapshot), computed from the user's chart,
// today's Moon transit, the moon phase, and Apple Health. Memoized per calendar day
// so every screen (Home, Love, Career) shows the same, stable numbers.
import { useMemo } from 'react';
import { useChart } from './useChart';
import { useHealth } from './useHealth';
import { useTransits } from './useTransits';
import { computeDailyEnergy, DailyEnergy } from '@/lib/energy';

export function useDailyEnergy(): DailyEnergy {
  const chart = useChart();
  const { metrics } = useHealth();
  const transits = useTransits();
  const dayKey = new Date().toDateString();
  return useMemo(
    () => computeDailyEnergy({ chart, health: metrics, transits, date: new Date() }),
    [chart, metrics, transits, dayKey],
  );
}
