// EXPERT_PLAYTEST_11 (throwaway): fight-4 (THE REPO MAN) deaths per machine, GREEN and WHITE, under e11_patch env.
// GATE=knight:1.3 npx tsx tools/balance/e11_a4.ts N
import { PATCH_LABEL } from './e11_patch';
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 400);
let a4g = 0, a4w = 0, tw = 0, tg = 0;
const rows: string[] = [];
for (const cab of CABINET_ORDER) {
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  a4g += g.deathsAtDepth[3]; a4w += w.deathsAtDepth[3]; tw += w.winPct; tg += g.winPct;
  rows.push(`${cab} A4 ${w.deathsAtDepth[3].toFixed(1)}/${g.deathsAtDepth[3].toFixed(1)} win ${w.winPct.toFixed(1)}/${g.winPct.toFixed(1)}`);
}
console.log(`${PATCH_LABEL} | fight-4 deaths W ${(a4w / 5).toFixed(1)} G ${(a4g / 5).toFixed(1)} | win W ${(tw / 5).toFixed(1)} G ${(tg / 5).toFixed(1)} | ${rows.join(' | ')}`);
