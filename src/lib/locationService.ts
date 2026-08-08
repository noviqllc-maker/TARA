// src/lib/locationService.ts
// Current-location capture for the "where you are now" Cosmic Events card. Reads the device
// GPS through expo-location (foreground permission) and degrades gracefully to null when the
// permission is denied or no fix is available. No external network APIs.

import * as Location from 'expo-location';

export type CurrentLocation = {
  lat: number;
  lon: number;
  tzOffsetMinutes: number; // minutes east of UTC (IST = +330), used by the astronomy formatter
  capturedAt: number;      // epoch ms; the cache expires an hour after this
};

const HOUR_MS = 3_600_000;
const SAME_CITY_KM = 10;

// Capture the device's current position. Returns null on denied permission, no signal, or any
// error, so callers can simply fall back to the birth-place card.
export async function getCurrentLocation(): Promise<CurrentLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    // The device already knows its exact, DST-correct UTC offset, which is more accurate than a
    // longitude/15 estimate, so read it straight from the runtime (minutes east of UTC).
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      tzOffsetMinutes,
      capturedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// Refresh when never captured, or when the cached fix is more than an hour old.
export function shouldRefreshLocation(location: CurrentLocation | null): boolean {
  if (!location) return true;
  return Date.now() - location.capturedAt > HOUR_MS;
}

// Two coordinates count as "the same place" when under ~10 km apart (same city): the current
// card is redundant then, so we only show the birth card.
export function isSameLocation(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): boolean {
  return haversineKm(a.lat, a.lon, b.lat, b.lon) < SAME_CITY_KM;
}

// Great-circle distance in kilometers.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
