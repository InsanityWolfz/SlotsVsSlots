// One machine's WHITE + GREEN row (quick tuning). npx tsx tools/balance/one.ts <machine> [N]
import { defaultConfig } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { simulateRuns } from '../../../src/sim/simulateRun';
const cab = (process.argv[2] ?? 'midas') as CabinetId;
const N = Number(process.argv[3] ?? 600);
const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(`${cab} | WHITE ${f(w.winPct)} act1 ${f(w.act1Pct)} House ${f(w.bossWinPct)} Mirror ${f(w.mirrorWinPct)} t ${w.turnsByAct[0].toFixed(1)},${w.turnsByAct[1].toFixed(1)} | GREEN ${f(g.winPct)} reachD ${f(g.reachedDealerPct)} Dealer ${f(g.dealerWinPct)} a3die ${f(g.act3Regular.diePct)}`);
