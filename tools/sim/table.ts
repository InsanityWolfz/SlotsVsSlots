// THE OFFICIAL TABLE (2026-10-07 sim rewrite). npx tsx tools/sim/table.ts [N] [machine]
// Per slot machine, greedy bot: WHITE (acts 1-2) and GREEN (act 3 + the Dealer), pacing, jackpot rate, chips per
// fight won and the measured power that sizes the late bosses. Log its numbers in loop/STATE.md.
// Gates: WHITE 41-45, GREEN 16-19, fight-4 deaths 3-6% (WHITE).
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { CHOICE_LOG, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 1000);
const only = process.argv[3] as CabinetId | undefined;
const f = (x: number, w = 5) => x.toFixed(1).padStart(w);
const r = (x: number) => String(Math.round(x)).padStart(5);
console.log(`N ${N} per row, greedy bot`);
console.log('machine | WHITE  act1 House Mirror f4die hpH% hpM% | GREEN  Dealer hpD% a3die a3lost | jack% chips/f | power mirror act3 dealer');
const tot = { w: 0, g: 0 };
const cabs = only ? [only] : CABINET_ORDER;
for (const cab of cabs) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  tot.w += w.winPct;
  tot.g += g.winPct;
  console.log(
    `${cab.padEnd(7)} | ${f(w.winPct)} ${f(w.act1Pct)} ${f(w.bossWinPct)} ${f(w.mirrorWinPct)} ${f(w.deathsAtDepth[3])} ${f(w.hpIntoHousePct)} ${f(w.hpIntoMirrorPct)} |` +
      ` ${f(g.winPct)} ${f(g.dealerWinPct)} ${f(g.hpIntoDealerPct)} ${f(g.act3Regular.diePct)} ${f(g.act3Regular.lostPct)} |` +
      ` ${f(w.jackpotPct)} ${f(w.chipsPerFight, 7)} | ${r(g.power.mirror)} ${r(g.power.act3)} ${r(g.power.dealer)}`,
  );
}
console.log(`AVG     | ${f(tot.w / cabs.length)}${' '.repeat(43)}| ${f(tot.g / cabs.length)}`);
console.log('\nbig choices (all rows): taken / won%');
console.log(Object.entries(CHOICE_LOG).sort((a, b) => b[1][0] - a[1][0]).map(([k, [n, won]]) => `${k} ${n} (${((100 * won) / n).toFixed(0)}%)`).join(' | '));
