// scripts/test-guna.mjs
// Validates src/lib/compatibility.ts against the §7 test cases in the spec.
// Run: node scripts/test-guna.mjs   (Node 22+ strips the engine's TS types natively)
import { gunaMilan } from '../src/lib/compatibility.ts';

let pass = 0, fail = 0;
function check(name, got, want) {
  const ok = got === want;
  console.log(`  ${ok ? '✓' : '✗'} ${name}: got ${got}, want ${want}`);
  ok ? pass++ : fail++;
}
function show(label, A, B) {
  const r = gunaMilan(A, B);
  const b = r.breakdown;
  console.log(`\n${label}`);
  console.log(`  Varna ${b.varna} · Vashya ${b.vashya} · Tara ${b.tara} · Yoni ${b.yoni} · Maitri ${b.maitri} · Gana ${b.gana} · Bhakoot ${b.bhakoot} · Nadi ${b.nadi}`);
  console.log(`  Total ${r.total}/36 — ${r.rating}   (Nadi dosha: ${r.doshas.nadi}, Bhakoot dosha: ${r.doshas.bhakoot})`);
  return r;
}

// Test A — Rohini/Taurus (bride) × Hasta/Virgo (groom) → 25/36, Bhakoot dosha
const A = show('Test A — Rohini/Taurus (bride) × Hasta/Virgo (groom)',
  { nakshatra: 4, rashi: 2, role: 'bride' }, { nakshatra: 13, rashi: 6, role: 'groom' });
check('A total', A.total, 25);
check('A rating', A.rating, 'Good');
check('A bhakoot dosha flagged', A.doshas.bhakoot, true);

// Test B — Punarvasu/Cancer (both) → 28/36, Nadi dosha
const B = show('Test B — Punarvasu/Cancer (both)',
  { nakshatra: 7, rashi: 4, role: 'bride' }, { nakshatra: 7, rashi: 4, role: 'groom' });
check('B total', B.total, 28);
check('B rating', B.rating, 'Good');
check('B nadi dosha flagged', B.doshas.nadi, true);

// Test C — Gana directionality (Ashwini=Deva, Magha=Rakshasa)
console.log('\nTest C — Gana directional asymmetry');
const fwd = gunaMilan({ nakshatra: 1, rashi: 1, role: 'bride' }, { nakshatra: 10, rashi: 5, role: 'groom' });
check('C bride Deva / groom Rakshasa → Gana 6', fwd.breakdown.gana, 6);
const rev = gunaMilan({ nakshatra: 10, rashi: 5, role: 'bride' }, { nakshatra: 1, rashi: 1, role: 'groom' });
check('C bride Rakshasa / groom Deva → Gana 1', rev.breakdown.gana, 1);

console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'}: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
