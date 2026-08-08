// src/lib/relationshipNarrative.ts
// A warm, plain-language relationship narrative derived purely from a Guṇa Milan result.
// Deterministic (a pure function of the score + pairing details), no AI. The tier comes from
// the /36 total; the "dynamics" are the specific, actionable pairing notes (Yoni temperament,
// Varna worldview, Nadi rhythm) drawn from GunaResult.details.
//
// Tone: informational and non-doom. A low score is framed as a teaching bond, never a verdict.
// (No em-dashes, per the app copy standard.)
import { GunaResult } from '@/lib/compatibility';

export type NarrativeTier = 'power-couple' | 'soulmate' | 'love-in-progress' | 'karmic';

export type RelationshipNarrative = {
  tier: NarrativeTier;
  title: string;       // "Power Couple" | "Soulmate" | "Love in Progress" | "Karmic Connection"
  summary: string;     // 2–3 sentence tier narrative
  dynamics: string[];  // specific Yoni / Varna / Nadi notes that apply to this pairing
};

// ---- tier by /36 total ---------------------------------------------------------
function tierFor(total: number): { tier: NarrativeTier; title: string; summary: string } {
  if (total >= 32) return {
    tier: 'power-couple', title: 'Power Couple',
    summary: 'This is a rare, high-harmony match. You read as spiritually aligned, with a shared sense of mission and a natural pull in the same direction. Two natural leaders who amplify each other rather than compete: the work is simply to keep choosing the same horizon.',
  };
  if (total >= 24) return {
    tier: 'soulmate', title: 'Soulmate',
    summary: 'A deeply compatible, soulmate-tier match. The emotional understanding runs deep and mostly effortless; you tend to get each other without much explaining. Growth here is a shared project, so you become more yourselves together, not less.',
  };
  if (total >= 18) return {
    tier: 'love-in-progress', title: 'Love in Progress',
    summary: 'A real, workable match with a learning curve. The foundation is sound, but a few temperaments pull in different directions, so harmony here is built rather than assumed. Name the friction points early and this becomes a bond that deepens with practice.',
  };
  return {
    tier: 'karmic', title: 'Karmic Connection',
    summary: 'A karmic, teaching relationship. A lower score does not mean wrong; it means this bond asks more of you both and tends to surface exactly the lessons each of you is here to learn. It rewards patience, honest communication, and a willingness to grow rather than to be right.',
  };
}

// ---- specific pairing dynamics -------------------------------------------------
const isPair = (a: string, b: string, x: string, y: string) => (a === x && b === y) || (a === y && b === x);

function yoniNote(d: GunaResult['details']['yoni']): string | null {
  const { a, b, relation } = d;
  if (relation === 'same') {
    return `Same Yoni animal (the ${a}): you are instinctively alike, which is comforting but can blur boundaries. Keep a little healthy separateness so closeness does not become enmeshment.`;
  }
  if (relation === 'bitter') {
    if (isPair(a, b, 'Mongoose', 'Serpent')) {
      return "Mongoose and Serpent: the Mongoose's directness can land like an attack, and the Serpent answers by withdrawing into silence. The Serpent's sharp words, when they come, catch the Mongoose off guard. The path: the Mongoose softens its approach, and the Serpent learns to name its needs early instead of retreating.";
    }
    return `${a} and ${b} are opposing Yoni animals, so temperaments can rub the wrong way. Named early and out loud, that friction becomes a useful contrast rather than a standoff.`;
  }
  return null; // neutral yoni → nothing notable to flag
}

function varnaNote(d: GunaResult['details']['varna']): string | null {
  const { a, b } = d;
  if (a === b) return null; // shared worldview, no friction to name
  if (isPair(a, b, 'Brahmin', 'Kshatriya')) {
    return 'Brahmin and Kshatriya: different worldviews, knowledge versus power. It works when the Brahmin respects the Kshatriya’s decisiveness and the Kshatriya honors the Brahmin’s wisdom.';
  }
  return `${a} and ${b}: two different operating styles. It works when each of you respects what the other naturally leads with.`;
}

function nadiNote(d: GunaResult['details']['nadi']): string | null {
  if (!d.same) return null;
  return 'You share the same life-force rhythm (Nadi): either deep, easy sync or mirror-image conflict, with little in between. This one calls for intentional, explicit communication.';
}

export function relationshipNarrative(result: GunaResult): RelationshipNarrative {
  const { tier, title, summary } = tierFor(result.total);
  const dynamics = [
    yoniNote(result.details.yoni),
    varnaNote(result.details.varna),
    nadiNote(result.details.nadi),
  ].filter((x): x is string => !!x);
  return { tier, title, summary, dynamics };
}
