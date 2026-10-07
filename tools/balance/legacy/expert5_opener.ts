// Expert playtest 5 (throwaway): per-machine deaths by fight (act 1, GREEN). npx tsx tools/balance/expert5_opener.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 600);
for (const c of CABINET_ORDER) {
  const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
  console.log(c.padEnd(6), 'deaths% fights 1-6:', s.deathsAtDepth.slice(0, 6).map((x) => x.toFixed(1)).join(' '), '| turns by act', s.turnsByAct.map((x) => x.toFixed(1)).join(','));
}
