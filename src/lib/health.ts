// src/lib/health.ts
// Apple Health (HealthKit) integration. iOS-only, needs a dev/production build
// (NOT Expo Go) because it uses a native module. Everywhere else it safely no-ops
// and the app falls back to mock wellness numbers — so nothing ever crashes.
//
// Reads: sleep, resting heart rate, HRV (SDNN), steps, active energy.
// Maps raw metrics -> the wellness scores the UI already shows.

import { Platform } from 'react-native';

export type HealthMetrics = {
  source: 'apple-health' | 'mock';
  sleep: number;       // 0-100 score
  recovery: number;    // 0-100 score (composite of HRV + RHR + sleep)
  hrv: number;         // ms
  rhr: number;         // bpm
  steps: number;
  activeEnergy: number; // kcal
  sleepHours: number;
};

// Lazy require so non-iOS / Expo Go never tries to load the native module.
function getHealthKit(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@kingstinct/react-native-healthkit');
  } catch {
    return null;
  }
}

export function isHealthAvailable(): boolean {
  return !!getHealthKit();
}

// The read-only types Tara uses. Shared by the auth request and the dev logging.
const READ_TYPES = [
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKCategoryTypeIdentifierSleepAnalysis',
];

// Request read permission for the metrics Tara uses.
//
// v14 of @kingstinct/react-native-healthkit (nitro rewrite) changed the signature:
// requestAuthorization now takes a SINGLE object { toShare, toRead } — NOT the old
// two positional arrays (read, write). Passing arrays made the native side read
// `.toRead` off an array (undefined) → it requested NOTHING → no permission sheet
// ever appeared and it silently resolved. This is the fix.
//
// Returns whether the auth *flow completed* (dialog shown or already decided) — NOT
// whether read access was granted. iOS never reveals read-denial (reads just return
// empty), so callers must not treat "no data" as "not connected".
export async function requestHealthPermissions(): Promise<boolean> {
  const HK = getHealthKit();
  if (!HK) { if (__DEV__) console.log('[Health] requestPermissions: no native module (Expo Go / non-iOS)'); return false; }
  try {
    const available = HK.isHealthDataAvailable(); // synchronous in v14
    if (!available) { if (__DEV__) console.log('[Health] requestPermissions: isHealthDataAvailable=false'); return false; }
    if (__DEV__) console.log('[Health] requestAuthorization → { toShare: [], toRead:', READ_TYPES, '}');
    const ok = await HK.requestAuthorization({ toShare: [], toRead: READ_TYPES });
    if (__DEV__) console.log('[Health] requestAuthorization resolved:', ok);
    return ok !== false; // v14 returns a boolean; treat anything non-false as "flow completed"
  } catch (e) {
    if (__DEV__) console.warn('[Health] requestAuthorization threw:', e);
    return false;
  }
}

// ---- score mapping helpers ----
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Sleep score from hours slept (7.5-8.5h ~ 100)
function sleepScore(hours: number): number {
  if (hours <= 0) return 0;
  if (hours >= 7.5 && hours <= 8.5) return clamp(95 + (8 - Math.abs(8 - hours)) * 2);
  if (hours < 7.5) return clamp((hours / 8) * 95);
  return clamp(100 - (hours - 8.5) * 8); // too much sleep dips slightly
}

// Recovery: composite of HRV (higher better), resting HR (lower better), sleep.
function recoveryScore(hrv: number, rhr: number, sScore: number): number {
  // HRV: ~20ms poor, ~70ms great
  const hrvN = clamp(((hrv - 20) / 50) * 100);
  // RHR: ~75 poor, ~50 great
  const rhrN = clamp(((75 - rhr) / 25) * 100);
  return Math.round(clamp(hrvN * 0.45 + rhrN * 0.3 + sScore * 0.25));
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const lastNight = () => { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); return d; };

// Read today's metrics from HealthKit and map to scores.
export async function fetchHealthMetrics(): Promise<HealthMetrics> {
  const HK = getHealthKit();
  if (!HK) return mockMetrics();

  try {
    const now = new Date();

    // Most-recent samples for HR-based metrics
    const hrvSample = await safeLatest(HK, 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'ms');
    const rhrSample = await safeLatest(HK, 'HKQuantityTypeIdentifierRestingHeartRate', 'count/min');

    // Sums for today
    const steps = await safeSum(HK, 'HKQuantityTypeIdentifierStepCount', startOfToday(), now, 'count');
    const energy = await safeSum(HK, 'HKQuantityTypeIdentifierActiveEnergyBurned', startOfToday(), now, 'kcal');

    // Sleep: total asleep duration since last evening
    const sleepHours = await safeSleepHours(HK, lastNight(), now);

    const hrv = hrvSample || 45;
    const rhr = rhrSample || 60;
    const sScore = sleepScore(sleepHours || 7);
    const recovery = recoveryScore(hrv, rhr, sScore);

    // If literally nothing came back, fall back to mock so the UI isn't empty.
    if (!hrvSample && !rhrSample && !steps && !sleepHours) return mockMetrics();

    return {
      source: 'apple-health',
      sleep: Math.round(sScore),
      recovery,
      hrv: Math.round(hrv),
      rhr: Math.round(rhr),
      steps: Math.round(steps || 0),
      activeEnergy: Math.round(energy || 0),
      sleepHours: Math.round((sleepHours || 0) * 10) / 10,
    };
  } catch {
    return mockMetrics();
  }
}

// ---- defensive readers (library API shapes vary by version) ----
async function safeLatest(HK: any, type: string, unit: string): Promise<number> {
  try {
    const s = await HK.getMostRecentQuantitySample(type, unit);
    return s?.quantity ?? 0;
  } catch { return 0; }
}
async function safeSum(HK: any, type: string, from: Date, to: Date, unit: string): Promise<number> {
  try {
    // v14 query options: { filter: { date: { startDate, endDate } }, limit, unit }.
    // The old { from, to, unit } shape passed no filter/limit → the query returned nothing.
    const samples = await HK.queryQuantitySamples(type, {
      filter: { date: { startDate: from, endDate: to } }, limit: 0, unit, ascending: false,
    });
    if (Array.isArray(samples)) return samples.reduce((a: number, s: any) => a + (s.quantity || 0), 0);
    return 0;
  } catch { return 0; }
}
async function safeSleepHours(HK: any, from: Date, to: Date): Promise<number> {
  try {
    const samples = await HK.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      filter: { date: { startDate: from, endDate: to } }, limit: 0, ascending: false,
    });
    if (!Array.isArray(samples)) return 0;
    // CategoryValueSleepAnalysis: 0 inBed, 1 asleep(Unspecified), 2 awake, 3 core, 4 deep, 5 REM.
    // "Asleep" = 1 or ≥3 (older strings kept as a fallback). Sum durations → hours.
    let ms = 0;
    for (const s of samples) {
      const v = s.value;
      const asleep = v === 1 || v >= 3 || (typeof v === 'string' && v.toLowerCase().includes('asleep'));
      if (asleep && s.startDate && s.endDate) {
        ms += new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
      }
    }
    return ms / 3600000;
  } catch { return 0; }
}

// Mock fallback (matches the original data so screens look right pre-connection).
export function mockMetrics(): HealthMetrics {
  return {
    source: 'mock', sleep: 62, recovery: 48, hrv: 41, rhr: 58,
    steps: 4280, activeEnergy: 320, sleepHours: 6.4,
  };
}
