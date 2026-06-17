// src/hooks/useTransits.ts
import { useMemo } from 'react';
import { computeTransits, Transits } from '@/lib/transits';
import { useChart } from './useChart';

export function useTransits(): Transits {
  const chart = useChart();
  // Recompute per calendar day (stable within a day).
  const dayKey = new Date().toDateString();
  return useMemo(() => computeTransits(new Date(), chart), [dayKey, chart]);
}
