// EXPERT_PLAYTEST_11 (throwaway): one machine, builds-style rows + official-style W/G, under e11_patch env.
// npx tsx tools/balance/e11_cab.ts N machine [rows=baseline,vamp,+bell]
import { PATCH_LABEL } from './e11_patch';
import { defaultConfig, type Enh } from '../../src/core/config';
import type { CabinetId } from '../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 300);
const cab = (process.argv[3] ?? 'joker') as CabinetId;
const ROWS = (process.argv[4] ?? 'baseline,vamp,+bell').split(',');
const out: string[] = [];
SIM_BIAS.noStart = true;
for (const r of ROWS) {
  SIM_BIAS.startRelic = r.startsWith('+') ? (r.slice(1) as never) : undefined;
  SIM_BIAS.enh = r === 'baseline' || r.startsWith('+') ? undefined : r === 'none' ? ((cab === 'tesla' ? 'spiked' : 'charged') as Enh) : (r as Enh);
  out.push(`${r} ${simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct.toFixed(1)}`);
}
SIM_BIAS.noStart = false; SIM_BIAS.enh = undefined; SIM_BIAS.startRelic = undefined;
const w = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0);
const g = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true);
console.log(`${cab} ${PATCH_LABEL} | ${out.join('  ')} | official W ${w.winPct.toFixed(1)} G ${g.winPct.toFixed(1)} (Dealer ${g.dealerWinPct.toFixed(0)})`);
