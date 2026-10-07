// Throwaway (relic proposals): why do charms hurt JAX? npx tsx tools/balance/jax_charms.ts [N] [cab]
import { defaultConfig, type Enh } from '../../../src/core/config';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import type { CabinetId } from '../../../src/core/cabinets';
const N = Number(process.argv[2] ?? 300);
const cab = (process.argv[3] ?? 'joker') as CabinetId;
const f = (x: number) => x.toFixed(1).padStart(5);
console.log('bias     | win  act1 House Mirror reachD Dealer | a3die a3lost a3turns | deaths by depth (0-17)');
for (const e of [undefined, 'charged', 'gold', 'lucky', 'keen', 'vamp'] as (Enh | undefined)[]) {
  SIM_BIAS.enh = e;
  const g = simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true);
  console.log(`${String(e ?? 'greedy').padEnd(8)} | ${f(g.winPct)} ${f(g.act1Pct)} ${f(g.bossWinPct)} ${f(g.mirrorWinPct)} ${f(g.reachedDealerPct)} ${f(g.dealerWinPct)} | ${f(g.act3Regular.diePct)} ${f(g.act3Regular.lostPct)} ${f(g.act3Regular.turns)} | ${g.deathsAtDepth.map((d) => d.toFixed(0)).join(' ')}`);
}
