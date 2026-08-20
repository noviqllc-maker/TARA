// src/hooks/useChartMode.ts
// Chart display-mode preference. Default is 'beginner', so first-time users always get the
// plain-language chart; the choice is remembered across sessions the moment the user switches.
//
// Stored in AsyncStorage, NOT Supabase: this is a per-device UI display preference (like the
// app's other local prefs), so it needs no migration, works offline, and applies instantly with
// no network round-trip. If cross-device sync is ever wanted, this is the single place to move
// it to the profile row.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ChartMode = 'beginner' | 'advanced';
const KEY = 'tara.chartMode.v1';

export function useChartMode(): { chartMode: ChartMode; setChartMode: (m: ChartMode) => void } {
  const [chartMode, setMode] = useState<ChartMode>('beginner'); // first-time default

  // Load the saved choice once on mount; absent → stay on 'beginner'.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((v) => { if (!cancelled && (v === 'advanced' || v === 'beginner')) setMode(v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Persist the explicit choice (fire-and-forget; UI updates immediately regardless).
  const setChartMode = (m: ChartMode) => {
    setMode(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  return { chartMode, setChartMode };
}
