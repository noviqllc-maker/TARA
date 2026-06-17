// src/lib/numerology.ts
// Simple deterministic calculations from birth date.

// Life Path Number: sum all digits of the birth date, reduce to a single digit
// (keeping master numbers 11, 22, 33).
export function lifePathNumber(birthDate: string): number {
  const digits = birthDate.replace(/\D/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  const reduce = (n: number): number => {
    if (n === 11 || n === 22 || n === 33) return n;
    if (n < 10) return n;
    return reduce(String(n).split('').map(Number).reduce((a, b) => a + b, 0));
  };
  return reduce(sum);
}

const ZODIAC = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
  'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
];

// Chinese zodiac animal from birth year (approximate — uses Gregorian year).
export function chineseZodiac(birthDate: string): string {
  const year = parseInt(birthDate.slice(0, 4), 10);
  if (!year) return '—';
  // 2020 was the Year of the Rat (index 0)
  const idx = ((year - 2020) % 12 + 12) % 12;
  return ZODIAC[idx];
}
