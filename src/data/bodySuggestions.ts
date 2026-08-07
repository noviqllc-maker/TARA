// src/data/bodySuggestions.ts
// Lifestyle-grade suggestions appended to the Body Signal reading (premium only). Keyed
// (health state × day lord), 2 variants per cell, chosen deterministically by (user + date).
//
// TONE CONTRACT (hard — every string in this file must obey it):
//   • Lifestyle-grade ONLY: rest, gentle movement, wind-down timing, hydration, breath,
//     meditation/quiet timing. Nothing diagnostic, clinical, or outcome-predictive.
//   • NEVER name a metric's health implication ("your low HRV means…", "poor recovery",
//     "you're run down"). The state is inferred silently; the copy only invites.
//   • Warm, doable within the day. The graha reference stays light and never causal-medical
//     ("Saturn's day favors rest that's earned slowly" — a temperament, not a mechanism).
//   • No promises of results, no "will fix/boost/improve", no numbers, no should-guilt.

export type HealthState = 'depleted' | 'high-output' | 'low-movement' | 'long-rest' | 'steady';
export type DayLord = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

// A light, non-directional nod to the day's ruling graha. Two variants: a full-stop lead-in
// [0] (the action that follows is a new sentence) and a comma lead-in [1] (the action
// continues in lower case). Composed in front of the state action below.
const LORD_LEAD: Record<DayLord, [string, string]> = {
  Sun:     ["The Sun's day leans toward warmth.", "On the Sun's day,"],
  Moon:    ["The Moon's day favors gentleness.", "On the Moon's day,"],
  Mars:    ["Mars's day carries drive.", "On Mars's day,"],
  Mercury: ["Mercury's day likes a light touch.", "On Mercury's day,"],
  Jupiter: ["Jupiter's day favors ease.", "On Jupiter's day,"],
  Venus:   ["Venus's day invites comfort.", "On Venus's day,"],
  Saturn:  ["Saturn's day favors rest that's earned slowly.", "On Saturn's day,"],
};

// The substance of each suggestion, per inferred state. Two variants each. These carry NO
// reference to any metric or its meaning; they read as a kind invitation, not a readout.
// The [0] variant is Capitalized — it follows the full-stop lord lead as a second sentence.
// The [1] variant stays lower-case — it continues the comma lord lead. Pair v0/v0 and v1/v1.
const STATE_ACTION: Record<HealthState, [string, string]> = {
  depleted: [
    'A gentler pace and an earlier wind-down would suit the body well today.',
    'let today ask a little less of you: rest, water, and an unhurried evening.',
  ],
  'high-output': [
    "There's momentum to spend, so move with it, then let the evening cool down slowly.",
    'good energy to put toward something active, balanced by a calm wind-down later.',
  ],
  'low-movement': [
    'A short walk or some easy movement would feel good woven into the day.',
    'the body would welcome a little gentle movement: a walk, a stretch, some air.',
  ],
  'long-rest': [
    'Ease into the day slowly; a little light movement will help you find your footing.',
    'no rush this morning, so let the body wake gradually, with water and light.',
  ],
  steady: [
    'The body feels settled, so keep your usual rhythm of movement, water, and rest.',
    'a balanced day for steady movement, steady breath, and your normal wind-down.',
  ],
};

// Data-missing fallback: keyed on the day lord only (no state inferred), 2 variants each.
// Same tone contract — purely a gentle, graha-flavored lifestyle nudge.
const GENERIC_LORD: Record<DayLord, [string, string]> = {
  Sun:     ['The Sun’s day favors a little daylight and steady, unhurried movement.', "On the Sun's day, a short walk in the light suits the body well."],
  Moon:    ["The Moon's day favors rest, water, and a calm evening.", "On the Moon's day, let the pace stay gentle and unhurried."],
  Mars:    ["Mars's day favors active movement, balanced with a calm wind-down.", "On Mars's day, put some energy into motion, then let it settle."],
  Mercury: ["Mercury's day favors light movement and a few unhurried breaths.", "On Mercury's day, small breaks and a short walk keep the body easy."],
  Jupiter: ["Jupiter's day favors ease: gentle movement and good hydration.", "On Jupiter's day, a relaxed rhythm and plenty of water suit you."],
  Venus:   ["Venus's day favors comfort: a walk somewhere pleasant, unrushed.", "On Venus's day, let movement feel like ease rather than effort."],
  Saturn:  ["Saturn's day favors rest that's earned slowly and an early wind-down.", "On Saturn's day, keep the pace steady and give sleep its full hour."],
};

// Deterministic seed → variant index (0 | 1).
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// State-based suggestion (real data present): graha lead + state action.
export function composeSuggestion(state: HealthState, lord: DayLord, seed: string): string {
  const v = hashStr(`${seed}:body:${state}:${lord}`) % 2;
  return `${LORD_LEAD[lord][v]} ${STATE_ACTION[state][v]}`;
}

// Data-missing suggestion (connected, but today's samples haven't arrived). Day-lord only.
export function composeGeneric(lord: DayLord, seed: string): string {
  const v = hashStr(`${seed}:bodygen:${lord}`) % 2;
  return GENERIC_LORD[lord][v];
}
