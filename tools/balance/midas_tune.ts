// One machine's WHITE and GREEN under BOSS_MUL overrides (and hp:<units>). MUL=mirror:2.4,dealer:1.35,hp:33 npx tsx tools/balance/midas_tune.ts [N] [machine]
import { defaultConfig } from '../../src/core/config';
import type { CabinetId } from '../../src/core/cabinets';
import { BOSS_MUL } from '../../src/core/run';
import { CABINETS } from '../../src/core/cabinets';
import { UNIT } from '../../src/core/config';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 1000);
const cab = (process.argv[3] ?? 'midas') as CabinetId;
for (const kv of (process.env.MUL ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  if (k === 'hp') (CABINETS[cab] as { hp: number }).hp = Number(v) * UNIT;
  else (BOSS_MUL[cab] as Record<string, number>)[k] = Number(v);
}
const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
console.log(`${cab} ${process.env.MUL || 'current'}: WHITE ${w.winPct.toFixed(1)} (House ${w.bossWinPct.toFixed(0)}, Mirror ${w.mirrorWinPct.toFixed(0)}) | GREEN ${g.winPct.toFixed(1)} (reach Dealer ${g.reachedDealerPct.toFixed(0)}, Dealer ${g.dealerWinPct.toFixed(0)})`);
