// Tuesday balance harness (official greedy sim). npx tsx tools/balance/tuesday.ts [N]
// Prints, per slot machine: WHITE (acts 1-2) and GREEN (act 3 + Dealer) numbers.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 1000);
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(`N ${N} per row, greedy drafting`);
console.log('machine | WHITE win  act1  House Mirror  t/fight(a1,a2) | GREEN win  reachD  hpInD  Dealer | act3 regular: die  lost  turns');
const tot = { w: 0, g: 0, d: 0, hp: 0 };
for (const cab of CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  tot.w += w.winPct; tot.g += g.winPct; tot.d += g.dealerWinPct; tot.hp += g.hpIntoDealerPct;
  console.log(
    `${cab.padEnd(7)} | ${f(w.winPct)} ${f(w.act1Pct)} ${f(w.bossWinPct)} ${f(w.mirrorWinPct)}  ${w.turnsByAct[0].toFixed(1)},${w.turnsByAct[1].toFixed(1)} | ${f(g.winPct)} ${f(g.reachedDealerPct)} ${f(g.hpIntoDealerPct)} ${f(g.dealerWinPct)} | ${f(g.act3Regular.diePct)} ${f(g.act3Regular.lostPct)} ${f(g.act3Regular.turns)}`,
  );
}
const n = CABINET_ORDER.length;
console.log(`AVG     | ${f(tot.w / n)}                                | ${f(tot.g / n)}        ${f(tot.hp / n)} ${f(tot.d / n)}`);
