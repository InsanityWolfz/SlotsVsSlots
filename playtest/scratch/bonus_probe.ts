// Is the collapse from the bonus cells or the trigger? npx tsx playtest/scratch/bonus_probe.ts
import { defaultConfig } from '../../src/core/config';
import { BONUS } from '../../src/core/relics';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = 800;
const r0 = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'knight');
console.log(`as is: act1 ${r0.act1Pct.toFixed(1)} win ${r0.winPct.toFixed(1)} turns ${r0.avgTurnsPerFight.toFixed(1)}`);
BONUS.wheel = 0; BONUS.rush = 0;
const r1 = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'knight');
console.log(`no triggers (cells still there): act1 ${r1.act1Pct.toFixed(1)} win ${r1.winPct.toFixed(1)} turns ${r1.avgTurnsPerFight.toFixed(1)}`);
