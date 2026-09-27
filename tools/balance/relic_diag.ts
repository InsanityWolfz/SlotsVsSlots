// Throwaway: where does a proposal win or lose? NO_TABLE=1 npx tsx tools/balance/relic_diag.ts N cab id,id
import { defaultConfig } from '../../src/core/config';
import type { CabinetId } from '../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import './relic_proposals';
const N = Number(process.argv[2] ?? 300);
const cab = process.argv[3] as CabinetId;
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(`${cab} N ${N} GREEN | win act1 House Mirror reachD Dealer hpInD | a3die a3lost`);
for (const id of ['base', ...process.argv[4].split(',')]) {
  SIM_BIAS.startRelic = id === 'base' ? undefined : (id as any);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true);
  console.log(`${id.padEnd(10)} | ${f(g.winPct)} ${f(g.act1Pct)} ${f(g.bossWinPct)} ${f(g.mirrorWinPct)} ${f(g.reachedDealerPct)} ${f(g.dealerWinPct)} ${f(g.hpIntoDealerPct)} | ${f(g.act3Regular.diePct)} ${f(g.act3Regular.lostPct)}`);
}
