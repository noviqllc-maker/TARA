// src/data/traitLines.ts
// Trait lines for the placements-reveal screen. Three lines per user, from three
// DELIBERATELY DISTINCT vocabularies:
//   (1) Moon nakshatra → instinct & inner nature
//   (2) Moon sign      → emotions & care
//   (3) Ascendant sign → presence & how they move through the world
// Every entry has two variants; the generator swaps a later line to its alternate if
// it shares a significant word with an earlier line (so no adjective repeats).
import type { BirthChart } from '@/lib/vedic';

type Variants = readonly [primary: string, alternate: string];

// (1) NAKSHATRA — instinct & inner nature.
export const NAKSHATRA_TRAITS: Record<string, Variants> = {
  Ashwini: ['Restless spark, quick to begin', 'A pioneering, impatient streak'],
  Bharani: ['Intense, all-or-nothing creator', 'Fierce inner fire, unafraid'],
  Krittika: ['A cutting, purifying focus', 'Sharp instinct that burns away pretense'],
  Rohini: ['Magnetic, drawn to beauty', 'A fertile, alluring pull'],
  Mrigashira: ['Forever seeking, softly curious', 'A searching, wandering nature'],
  Ardra: ['A storm that clears the air', 'Turbulent, then breakthrough'],
  Punarvasu: ['Ever-renewing, always returns', 'An optimistic, homing streak'],
  Pushya: ['A nourishing, protective core', 'Steadfast, devoted at the root'],
  Ashlesha: ['Coiled, penetrating, perceptive', 'A hypnotic, probing nature'],
  Magha: ['Regal, rooted in lineage', 'A proud, ancestral streak'],
  'Purva Phalguni': ['Playful, made for delight', 'A pleasure-loving, radiant spark'],
  'Uttara Phalguni': ['Loyal, generous to the core', 'A dependable, giving nature'],
  Hasta: ['Deft, resourceful, hands-on', 'A crafty, skillful streak'],
  Chitra: ['Compelled to make things beautiful', 'A designing, brilliant nature'],
  Swati: ['Self-directed, needs open sky', 'An independent, untethered streak'],
  Vishakha: ['Single-minded toward a goal', 'A branching, relentless ambition'],
  Anuradha: ['Builds devotion and alliance', 'A disciplined, faithful nature'],
  Jyeshtha: ['Guarded, shrewd, unbreakable', 'A protective, seasoned streak'],
  Mula: ['Digs for the root of things', 'A truth-seeking, unearthing drive'],
  'Purva Ashadha': ['Buoyant, hard to discourage', 'An invincible, persuasive spark'],
  'Uttara Ashadha': ['Principled, plays the long game', 'An unshakeable, victorious drive'],
  Shravana: ['Listens more than most', 'An attentive, absorbing nature'],
  Dhanishta: ['Moves to an inner rhythm', 'A prosperous, musical streak'],
  Shatabhisha: ['Solitary, drawn to mysteries', 'A reclusive, mending nature'],
  'Purva Bhadrapada': ['Burns with strange conviction', 'A fervent, unconventional fire'],
  'Uttara Bhadrapada': ['Still waters, quietly knowing', 'A serene, oceanic depth'],
  Revati: ['Guides others, boundless inside', 'A far-reaching, benevolent spirit'],
};

// (2) MOON SIGN — emotions & care.
export const MOON_SIGN_TRAITS: Record<string, Variants> = {
  Aries: ['Feels fast, acts on emotion', 'Moods flare bright then pass'],
  Taurus: ['Soothed by comfort and touch', 'Affection that settles slowly'],
  Gemini: ['Processes feelings out loud', 'A light, talkative fondness'],
  Cancer: ['Feeling runs wide and tender', 'Nurtures the people it loves'],
  Leo: ['Loves loudly, big-hearted', 'Affection worn openly'],
  Virgo: ['Cares by quietly tending', 'Fusses lovingly over the details'],
  Libra: ['Needs harmony and closeness', 'Soothed by tenderness and peace'],
  Scorpio: ['Feels everything, shows little', 'Guards a churning heart'],
  Sagittarius: ['Feelings need space to roam', 'Buoyed by warmth and hope'],
  Capricorn: ['Holds feeling behind reserve', 'Devotion proven through effort'],
  Aquarius: ['Cares widely, from a distance', 'Affection given to everyone'],
  Pisces: ['Dreamy, endlessly compassionate', 'A soft, absorbent heart'],
};

// (3) ASCENDANT — presence & how they move through the world.
export const ASCENDANT_TRAITS: Record<string, Variants> = {
  Aries: ['You move first, ask later', 'You enter like a challenge'],
  Taurus: ['You move at your own pace', 'You arrive calm and immovable'],
  Gemini: ['You meet the world talking', 'You dart between rooms and ideas'],
  Cancer: ['You approach with caution', 'You shelter whatever room you enter'],
  Leo: ['You take up space naturally', 'You draw every eye in the room'],
  Virgo: ['You move with quiet exactness', 'You tidy the world as you pass'],
  Libra: ['You bring a room into balance', 'You meet everyone halfway'],
  Scorpio: ['You watch before you reveal', 'You enter without a sound'],
  Sagittarius: ['You aim toward the horizon', 'You breeze in, pointed outward'],
  Capricorn: ['You arrive ready to build', 'You carry a steady authority'],
  Aquarius: ['You stand a step apart', 'You appear a little outside it all'],
  Pisces: ['You blur into any room', 'You drift in, hard to place'],
};

const NAK_FALLBACK: Variants = ['Guided by your own instinct', 'An unmistakable inner compass'];
const MOON_FALLBACK: Variants = ['Led by a feeling heart', 'Steered by what you love'];
const ASC_FALLBACK: Variants = ['You meet the world as yourself', 'You arrive unmistakably you'];

// Structural words to ignore when checking for repeats (rare in these lines, but safe).
const STOPWORDS = new Set([
  'their', 'there', 'which', 'would', 'could', 'should', 'before', 'because', 'while',
  'where', 'these', 'those', 'being', 'other', 'others', 'still', 'within', 'without',
  'toward', 'behind', 'around', 'through', 'between', 'little', 'outside', 'every',
  'everyone', 'everything', 'about', 'whatever',
]);

// Significant words = length > 4, not a stopword.
function significantWords(line: string): string[] {
  return line.toLowerCase().replace(/[^a-z]+/g, ' ').split(' ').filter((w) => w.length > 4 && !STOPWORDS.has(w));
}

// The three trait lines: nakshatra → Moon sign → Ascendant. If a later line shares a
// significant word with an earlier chosen line, swap it for that entry's alternate.
export function getTraitLines(chart: BirthChart): string[] {
  const entries: Variants[] = [
    NAKSHATRA_TRAITS[chart.nakshatra] ?? NAK_FALLBACK,
    MOON_SIGN_TRAITS[chart.moonSign] ?? MOON_FALLBACK,
    ASCENDANT_TRAITS[chart.ascendant.sign] ?? ASC_FALLBACK,
  ];

  const lines: string[] = [entries[0][0]];
  const used = new Set(significantWords(lines[0]));
  for (let i = 1; i < entries.length; i++) {
    let line = entries[i][0];
    if (significantWords(line).some((w) => used.has(w))) line = entries[i][1]; // collision → alternate
    lines.push(line);
    significantWords(line).forEach((w) => used.add(w));
  }
  return lines;
}
