// scripts/validate-guna.ts
// Standalone validation of the Guna Milan engine against the §7 test cases in
// docs/ashtakoota-guna-milan-engine-spec.md.
//
// Run: npx tsx scripts/validate-guna.ts
import { gunaMilan, PersonMoon, GunaResult } from '../src/lib/compatibility';

let passed = 0;
let failed = 0;

function assert(name: string, got: unknown, want: unknown): void {
  const ok = got === want;
  console.log(`  ${ok ? '✓' : '✗'} ${name}: got ${got}, want ${want}`);
  ok ? passed++ : failed++;
}

function print(label: string, A: PersonMoon, B: PersonMoon): GunaResult {
  const r = gunaMilan(A, B);
  const b = r.breakdown;
  console.log(`\n${label}`);
  console.log(`  Varna ${b.varna} · Vashya ${b.vashya} · Tara ${b.tara} · Yoni ${b.yoni} · Maitri ${b.maitri} · Gana ${b.gana} · Bhakoot ${b.bhakoot} · Nadi ${b.nadi}`);
  console.log(`  Total ${r.total}/36 — ${r.rating}   (Nadi dosha: ${r.doshas.nadi}, Bhakoot dosha: ${r.doshas.bhakoot})`);
  return r;
}

// ── Test A — Rohini/Taurus (bride) × Hasta/Virgo (groom) → 25/36, Bhakoot dosha ──
const a = print(
  'Test A — Rohini/Taurus (bride) × Hasta/Virgo (groom)',
  { nakshatra: 4, rashi: 2, role: 'bride' },
  { nakshatra: 13, rashi: 6, role: 'groom' },
);
assert('A total', a.total, 25);
assert('A Bhakoot = 0 (dosha)', a.breakdown.bhakoot, 0);
assert('A Bhakoot dosha flagged', a.doshas.bhakoot, true);

// ── Test B — Punarvasu/Cancer (both) → 28/36, Nadi dosha ──
const b = print(
  'Test B — Punarvasu/Cancer (both)',
  { nakshatra: 7, rashi: 4, role: 'bride' },
  { nakshatra: 7, rashi: 4, role: 'groom' },
);
assert('B total', b.total, 28);
assert('B Nadi = 0 (dosha)', b.breakdown.nadi, 0);
assert('B Nadi dosha flagged', b.doshas.nadi, true);

// ── Test C — Gana directional asymmetry (Ashwini=Deva, Magha=Rakshasa) ──
console.log('\nTest C — Gana directional asymmetry');
const cFwd = gunaMilan(
  { nakshatra: 1, rashi: 1, role: 'bride' },   // Ashwini (Deva)
  { nakshatra: 10, rashi: 5, role: 'groom' },  // Magha (Rakshasa)
);
assert('C bride Deva / groom Rakshasa → Gana 6', cFwd.breakdown.gana, 6);
const cRev = gunaMilan(
  { nakshatra: 10, rashi: 5, role: 'bride' },  // Magha (Rakshasa)
  { nakshatra: 1, rashi: 1, role: 'groom' },   // Ashwini (Deva)
);
assert('C bride Rakshasa / groom Deva → Gana 1', cRev.breakdown.gana, 1);

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
