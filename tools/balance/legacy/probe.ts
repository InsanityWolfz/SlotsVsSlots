// Quick HP probe: per machine, P at the Mirror / act 3 / Dealer and the HP they get. npx tsx tools/balance/probe.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 300);
for (const cab of CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  console.log(`${cab.padEnd(7)} WHITE ${w.winPct.toFixed(1)} Mirror ${w.mirrorWinPct.toFixed(0)} | GREEN ${g.winPct.toFixed(1)} Mirror ${g.mirrorWinPct.toFixed(0)} a3 die ${g.act3Regular.diePct.toFixed(1)} lost ${g.act3Regular.lostPct.toFixed(0)} t ${g.act3Regular.turns.toFixed(1)} hpInD ${g.hpIntoDealerPct.toFixed(0)} Dealer ${g.dealerWinPct.toFixed(0)} (reach ${g.reachedDealerPct.toFixed(0)})`);
}
