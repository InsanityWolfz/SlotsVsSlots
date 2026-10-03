// EXPERT_PLAYTEST_11 (throwaway): one machine's official-style WHITE/GREEN under e11_patch env. npx tsx tools/balance/e11_one.ts N machine
import { PATCH_LABEL } from './e11_patch';
import { defaultConfig } from '../../src/core/config';
import type { CabinetId } from '../../src/core/cabinets';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 600);
const cab = (process.argv[3] ?? 'joker') as CabinetId;
const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
console.log(`${cab} ${PATCH_LABEL}: WHITE ${w.winPct.toFixed(1)} (House ${w.bossWinPct.toFixed(0)}, Mirror ${w.mirrorWinPct.toFixed(0)}) | GREEN ${g.winPct.toFixed(1)} (reach Dealer ${g.reachedDealerPct.toFixed(0)}, Dealer ${g.dealerWinPct.toFixed(0)})`);
