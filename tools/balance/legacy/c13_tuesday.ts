// CONTENT_13 (throwaway): the official tuesday table (seed 4242, greedy) with the C13 content in the pools.
// C13=... npx tsx tools/balance/c13_tuesday.ts [N]   (CABS=knight,... limits machines)
import { C13_LABEL, levelCheck, useCab, STATS } from './c13_patch';
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { CHOICE_LOG, simulateRuns } from './c13_sim';

const N = Number(process.argv[2] ?? 1000);
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(C13_LABEL());
console.log(levelCheck());
console.log(`N ${N} per row, greedy drafting`);
console.log('machine | WHITE win  act1  House Mirror | GREEN win  reachD  hpInD  Dealer | relic runs (GREEN, new content)');
const tot = { w: 0, g: 0, d: 0, hp: 0 };
const cabs = (process.env.CABS ? process.env.CABS.split(',') : CABINET_ORDER) as typeof CABINET_ORDER;
for (const cab of cabs) {
  useCab(cab);
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  tot.w += w.winPct; tot.g += g.winPct; tot.d += g.dealerWinPct; tot.hp += g.hpIntoDealerPct;
  const rel = Object.entries(g.relicWin).filter(([k]) => ['bracelet', 'metronome', 'counterweight', 'rust', 'snakeeyes', 'pitboss', 'coil', 'taxman', 'grudge', 'overtime'].includes(k)).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log(`${cab.padEnd(7)} | ${f(w.winPct)} ${f(w.act1Pct)} ${f(w.bossWinPct)} ${f(w.mirrorWinPct)} | ${f(g.winPct)} ${f(g.reachedDealerPct)} ${f(g.hpIntoDealerPct)} ${f(g.dealerWinPct)} | ${rel}`);
}
console.log(`AVG     | ${f(tot.w / cabs.length)}                     | ${f(tot.g / cabs.length)}        ${f(tot.hp / cabs.length)} ${f(tot.d / cabs.length)}`);
console.log(`stats ${JSON.stringify(STATS)}`);
console.log(Object.entries(CHOICE_LOG).sort((a, b) => b[1][0] - a[1][0]).slice(0, 8).map(([k, [n, w]]) => `${k} ${n} (${((100 * w) / n).toFixed(0)}%)`).join(' | '));
