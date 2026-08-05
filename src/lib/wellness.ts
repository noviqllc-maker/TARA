// src/lib/wellness.ts
// Classifies today's already-read HealthKit metrics (see @/lib/health) into a single
// dominant "body state", then maps (state × day lord) → a lifestyle-grade suggestion that
// the Body Signal card appends for premium users. Deterministic, no AI, no network, and no
// new HealthKit permissions — it only reads categories already requested.
//
// Nothing here interprets a metric medically. Classification is silent and internal; only
// the copy in @/data/bodySuggestions is ever shown, and that copy names no metric.

import { HealthMetrics } from '@/lib/health';
import {
  HealthState, DayLord, composeSuggestion, composeGeneric,
} from '@/data/bodySuggestions';

export type SleepBand = 'short' | 'normal' | 'long';
export type ActivityBand = 'low' | 'typical' | 'high';
export type RecoveryBand = 'low' | 'moderate' | 'high';

export type HealthClassification = {
  hasData: boolean;          // real Apple Health samples present (not the mock fallback)
  sleep: SleepBand;
  activity: ActivityBand;    // vs the user's own 7-day step average ('typical' when unknown)
  recovery: RecoveryBand;
  state: HealthState;        // the single dominant signal the suggestion keys on
};

// Classical vāra (weekday) lords: Sun=Sunday … Saturn=Saturday.
const WEEKDAY_LORDS: DayLord[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export function dayLordOf(date: Date): DayLord {
  return WEEKDAY_LORDS[date.getDay()];
}

function sleepBand(hours: number): SleepBand {
  if (hours <= 0) return 'normal';       // unknown → neutral
  if (hours < 6) return 'short';
  if (hours > 9) return 'long';
  return 'normal';
}

// Today's steps vs the user's own 7-day average. No baseline (0) → 'typical' (we never guess
// against an absolute step target — the comparison is only ever personal).
function activityBand(steps: number, avg7d: number): ActivityBand {
  if (!avg7d || avg7d <= 0) return 'typical';
  const ratio = steps / avg7d;
  if (ratio < 0.7) return 'low';
  if (ratio > 1.3) return 'high';
  return 'typical';
}

// Recovery proxy from the composite recovery score the engine already computes (HRV+RHR+sleep).
function recoveryBand(recovery: number): RecoveryBand {
  if (recovery < 45) return 'low';
  if (recovery > 68) return 'high';
  return 'moderate';
}

// Collapse the three bands into one dominant state, rest-first. Short sleep or low recovery
// means the body is asking for less; only then do we read the activity bands.
function dominantState(sleep: SleepBand, activity: ActivityBand, recovery: RecoveryBand): HealthState {
  if (sleep === 'short' || recovery === 'low') return 'depleted';
  if (activity === 'high') return 'high-output';
  if (sleep === 'long') return 'long-rest';
  if (activity === 'low') return 'low-movement';
  return 'steady';
}

export function classifyHealth(m: HealthMetrics): HealthClassification {
  const sleep = sleepBand(m.sleepHours);
  const activity = activityBand(m.steps, m.stepsAvg7d);
  const recovery = recoveryBand(m.recovery);
  return {
    hasData: m.source === 'apple-health',
    sleep, activity, recovery,
    state: dominantState(sleep, activity, recovery),
  };
}

// State-based suggestion from real data. `seed` = `${uid}:${YYYY-MM-DD}` (per user, per day).
export function bodySuggestion(m: HealthMetrics, date: Date, seed: string): string {
  return composeSuggestion(classifyHealth(m).state, dayLordOf(date), seed);
}

// Data-missing suggestion (connected, but no samples today) — day-lord only, no state.
export function genericBodySuggestion(date: Date, seed: string): string {
  return composeGeneric(dayLordOf(date), seed);
}
