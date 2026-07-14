// src/hooks/useHealth.tsx
// App-wide wellness data. Holds the current metrics (real from Apple Health when
// connected, mock otherwise), and exposes connect/refresh actions.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchHealthMetrics, requestHealthPermissions, isHealthAvailable,
  mockMetrics, HealthMetrics,
} from '@/lib/health';

// Result of a connect attempt, so the UI can respond correctly:
//  'connected'   – flow completed AND real data flowed in
//  'no-data'     – flow completed but nothing came back (read perms likely off in the
//                  Health app). iOS won't re-show the sheet, so guide the user there.
//  'unavailable' – HealthKit not usable (Expo Go / non-iOS)
//  'failed'      – requestAuthorization errored
export type ConnectResult = 'connected' | 'no-data' | 'unavailable' | 'failed';

type HealthState = {
  metrics: HealthMetrics;
  connected: boolean;              // user completed the Apple Health connect flow (persisted)
  needsPermissionCheck: boolean;   // connected, but no data → prompt to enable in Health app
  available: boolean;              // HealthKit usable in this build
  loading: boolean;
  connectAppleHealth: () => Promise<ConnectResult>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<HealthState>({} as HealthState);
const KEY = 'tara.health.connected.v1';

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<HealthMetrics>(mockMetrics());
  const [connected, setConnected] = useState(false);
  const [needsPermissionCheck, setNeedsPermissionCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const available = isHealthAvailable();

  // On launch, if previously connected, restore connected=true and pull fresh data.
  // IMPORTANT: connection is NOT gated on data arriving — iOS never reveals read-denial,
  // so a granted user with no samples today must still read as connected (with a hint).
  useEffect(() => {
    (async () => {
      const was = await AsyncStorage.getItem(KEY);
      if (was === 'apple' && available) {
        setConnected(true);
        setLoading(true);
        const m = await fetchHealthMetrics();
        setMetrics(m);
        setNeedsPermissionCheck(m.source !== 'apple-health');
        setLoading(false);
      }
    })();
  }, [available]);

  const connectAppleHealth = useCallback(async (): Promise<ConnectResult> => {
    if (__DEV__) console.log('[Health] connectAppleHealth() called · available=', available);
    if (!available) return 'unavailable';
    setLoading(true);
    try {
      const completed = await requestHealthPermissions(); // shows the sheet (first time)
      if (!completed) { if (__DEV__) console.log('[Health] connect: auth flow did not complete'); return 'failed'; }

      // Auth flow completed → treat as connected regardless of read grant (iOS gotcha).
      await AsyncStorage.setItem(KEY, 'apple');
      setConnected(true);

      const m = await fetchHealthMetrics();
      setMetrics(m);
      const noData = m.source !== 'apple-health';
      setNeedsPermissionCheck(noData);
      if (__DEV__) console.log('[Health] connect: completed · source=', m.source, '· noData=', noData);
      return noData ? 'no-data' : 'connected';
    } finally {
      setLoading(false);
    }
  }, [available]);

  const refresh = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    const m = await fetchHealthMetrics();
    setMetrics(m);
    setNeedsPermissionCheck(m.source !== 'apple-health');
    setLoading(false);
  }, [connected]);

  return (
    <Ctx.Provider value={{ metrics, connected, needsPermissionCheck, available, loading, connectAppleHealth, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useHealth = () => useContext(Ctx);
