// src/lib/places.ts
// Google Places Autocomplete + geocoding + timezone lookup.
// Set your key in app.json -> expo.extra.googlePlacesApiKey
import Constants from 'expo-constants';

export type Place = { description: string; placeId: string };
export type GeoResult = { lat: number; lon: number; tzOffsetMinutes: number };

function getKey(): string | undefined {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  return extra.googlePlacesApiKey || undefined;
}
export function hasPlacesKey(): boolean { return !!getKey(); }

export async function searchPlaces(query: string): Promise<Place[]> {
  const key = getKey();
  if (!key || query.trim().length < 2) return [];
  try {
    const url =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
      `?input=${encodeURIComponent(query)}&types=(cities)&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.predictions)) return [];
    return data.predictions.slice(0, 5).map((p: any) => ({
      description: p.description as string, placeId: p.place_id as string,
    }));
  } catch { return []; }
}

// Resolve a placeId -> lat/lon, then lat/lon -> timezone offset at the birth date.
export async function geocodePlace(placeId: string, birthDate: string): Promise<GeoResult | null> {
  const key = getKey();
  if (!key) return null;
  try {
    const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${key}`;
    const dRes = await fetch(dUrl);
    const dData = await dRes.json();
    const loc = dData.result?.geometry?.location;
    if (!loc) return null;
    const lat = loc.lat, lon = loc.lng;

    // timezone at the birth timestamp (handles historical DST)
    const ts = Math.floor(new Date(birthDate + 'T12:00:00Z').getTime() / 1000);
    const tzUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lon}&timestamp=${ts}&key=${key}`;
    const tzRes = await fetch(tzUrl);
    const tz = await tzRes.json();
    const offsetSec = (tz.rawOffset || 0) + (tz.dstOffset || 0);
    return { lat, lon, tzOffsetMinutes: Math.round(offsetSec / 60) };
  } catch { return null; }
}

// Fallback when no key/geocode: rough coordinates so a chart still computes.
export function fallbackGeo(): GeoResult {
  // Default to India (IST) as a sensible default for the target audience.
  return { lat: 20.59, lon: 78.96, tzOffsetMinutes: 330 };
}
