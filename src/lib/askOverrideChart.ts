// src/lib/askOverrideChart.ts
// Lets the Vedic Calculator send an entered chart to the Ask Tara answer view, so a question
// is answered about THAT chart instead of the signed-in user's. Same consume-once module
// pattern as askDraft: the calculator sets it before navigating; the answer view takes it
// once (gated by a `src=calc` param) and clears it, so it never leaks into a later ask.
import { BirthChart } from '@/lib/vedic';

type Override = { chart: BirthChart; name: string };
let pending: Override | null = null;

export function setOverrideChart(o: Override): void { pending = o; }

// Returns the pending override chart and clears it (consume-once).
export function takeOverrideChart(): Override | null {
  const o = pending;
  pending = null;
  return o;
}
