// src/hooks/useHealth.tsx
// App-wide wellness data. Holds the current metrics (real from Apple Health when
// connected, mock otherwise), and exposes connect/refresh actions.
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchHealthMetrics, requestHealthPermissions, isHealthAvailable,
  mockMetrics, HealthMetrics,
} from '@/lib/health';

type HealthState = {
  metrics: HealthMetrics;
  connected: boolean;          // Apple Health connected & permitted
  available: boolean;          // HealthKit usable in this build
  loading: boolean;
  connectAppleHealth: () => Promise<boolean>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<HealthState>({} as HealthState);
const KEY = 'tara.health.connected.v1';

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<HealthMetrics>(mockMetrics());
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const available = isHealthAvailable();

  // On launch, if previously connected, pull fresh data.
  useEffect(() => {
    (async () => {
      const was = await AsyncStorage.getItem(KEY);
      if (was === 'apple' && available) {
        setLoading(true);
        const m = await fetchHealthMetrics();
        setMetrics(m);
        setConnected(m.source === 'apple-health');
        setLoading(false);
      }
    })();
  }, [available]);

  const connectAppleHealth = useCallback(async () => {
    if (!available) return false;
    setLoading(true);
    const granted = await requestHealthPermissions();
    if (granted) {
      const m = await fetchHealthMetrics();
      setMetrics(m);
      setConnected(m.source === 'apple-health');
      await AsyncStorage.setItem(KEY, 'apple');
      setLoading(false);
      return m.source === 'apple-health';
    }
    setLoading(false);
    return false;
  }, [available]);

  const refresh = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setMetrics(await fetchHealthMetrics());
    setLoading(false);
  }, [connected]);

  return (
    <Ctx.Provider value={{ metrics, connected, available, loading, connectAppleHealth, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useHealth = () => useContext(Ctx);
