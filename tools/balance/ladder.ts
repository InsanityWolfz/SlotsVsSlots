// HIGH STAKES ladder per slot machine (greedy). npx tsx tools/balance/ladder.ts [N] [machine]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { MAX_STAKE, STAKES } from '../../src/core/stakes';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 600);
const cabs = (process.argv[3] ? [process.argv[3]] : CABINET_ORDER) as CabinetId[];
for (const cab of cabs) {
  const row: string[] = [];
  for (let s = 0; s <= MAX_STAKE; s++) {
    const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, s, true);
    row.push(`${STAKES[s].name} ${g.winPct.toFixed(1)} (H${g.bossWinPct.toFixed(0)})`);
  }
  console.log(`${cab.padEnd(7)} ${row.join('  ')}`);
}
