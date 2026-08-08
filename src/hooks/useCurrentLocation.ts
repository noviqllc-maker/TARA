// src/hooks/useCurrentLocation.ts
// Captures the device's current location on mount, caches it in AsyncStorage, and refreshes at
// most once an hour (a 60s tick re-checks staleness but only reads GPS when the cache expires,
// so it stays battery-cheap). Returns the current location or null when it's unavailable.
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentLocation, shouldRefreshLocation, CurrentLocation } from '@/lib/locationService';

const KEY = 'currentLocation';

export function useCurrentLocation() {
  const [current, setCurrent] = useState<CurrentLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ref mirrors the latest value so the interval reads fresh state without re-subscribing.
  const latest = useRef<CurrentLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    const commit = (loc: CurrentLocation | null) => {
      latest.current = loc;
      if (!cancelled) setCurrent(loc);
    };

    const refresh = async () => {
      if (!shouldRefreshLocation(latest.current)) return; // fresh cache -> no GPS read
      const loc = await getCurrentLocation();
      if (loc) {
        commit(loc);
        try { await AsyncStorage.setItem(KEY, JSON.stringify(loc)); } catch {}
      } else if (!latest.current && !cancelled) {
        setError('Location permission denied or unavailable');
      }
    };

    (async () => {
      // Hydrate from cache first so a still-fresh fix shows without a GPS round-trip.
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const cached = JSON.parse(raw) as CurrentLocation;
          if (!shouldRefreshLocation(cached)) commit(cached);
        }
      } catch {}
      await refresh();
    })();

    const interval = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { current, error };
}
