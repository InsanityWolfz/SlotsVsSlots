// Sweep the Mirror HP formula (power x k + flat) for greedy vs random.   npx tsx playtest/scratch/it7_mirror.ts
import { defaultConfig } from '../../src/core/config';
import { TUNE } from '../../src/core/enemies';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 1000);
for (const [k, flat] of [[6, 20], [4, 40], [3, 55], [2, 70], [0, 90]]) {
  TUNE.mirrorPower = k;
  TUNE.mirrorFlat = flat;
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242);
  const r = simulateRuns(defaultConfig(), N, 'random', 4242);
  const m = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'midas');
  const t = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'thorn');
  console.log(`k ${k} flat ${flat}: greedy ${g.winPct.toFixed(1)} (mirror ${g.mirrorWinPct.toFixed(0)})  random ${r.winPct.toFixed(1)} (mirror ${r.mirrorWinPct.toFixed(0)})  midas ${m.winPct.toFixed(1)}/${m.mirrorWinPct.toFixed(0)}  thorn ${t.winPct.toFixed(1)}/${t.mirrorWinPct.toFixed(0)}`);
}
