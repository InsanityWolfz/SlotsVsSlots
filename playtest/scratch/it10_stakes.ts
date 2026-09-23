// Each HIGH STAKES rule alone (others off), knight greedy.   npx tsx playtest/scratch/it10_stakes.ts [N]
import { defaultConfig } from '../../src/core/config';
import { STAKE } from '../../src/core/stakes';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 1500);
const keys = ['counterForks', 'houseEdge', 'mirrorRelic', 'fasterAbilities', 'houseBombs', 'halfHeal'] as const;
const orig = { ...STAKE };
const off = () => keys.forEach((k) => ((STAKE as any)[k] = 99));
off();
const base = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'knight', 1);
console.log(`none        win ${base.winPct.toFixed(1)} act1 ${base.act1Pct.toFixed(1)}`);
for (const k of keys) {
  off();
  (STAKE as any)[k] = 1;
  const r = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'knight', 1);
  console.log(`${k.padEnd(16)} win ${r.winPct.toFixed(1)} (${(r.winPct - base.winPct).toFixed(1)})  act1 ${r.act1Pct.toFixed(1)}`);
}
off(); STAKE.fasterAbilities = 1; STAKE.fasterAct2Only = 1;
const r = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'knight', 1);
console.log(`fasterAct2Only   win ${r.winPct.toFixed(1)} (${(r.winPct - base.winPct).toFixed(1)})  act1 ${r.act1Pct.toFixed(1)}`);
Object.assign(STAKE, orig);
