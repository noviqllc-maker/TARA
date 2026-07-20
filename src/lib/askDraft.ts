// src/lib/askDraft.ts
// Preserves the user's typed question across the Ask Tara → answer-view round trip,
// so closing an out-of-credits / interrupted answer (via X, back-swipe, or the
// purchase flow) returns them to the question page with their text intact. UI-only;
// touches no credit logic. The answer view sets it while a question is pending and
// clears it on success; the Ask Tara screen consumes it on focus.
let draft = '';

export function setAskDraft(q: string): void { draft = q; }

// Returns the pending draft and clears it (consume-once).
export function takeAskDraft(): string {
  const q = draft;
  draft = '';
  return q;
}
