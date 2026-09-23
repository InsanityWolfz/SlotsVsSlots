// SCARS sanity: act 1 with scars alone, and rock counts. npx tsx playtest/scratch/it11_scars.ts
import { defaultConfig } from '../../src/core/config';
import { STAKE } from '../../src/core/stakes';
import { simulateRuns } from '../../src/sim/simulateRun';
import { createRun, fightConfig, finishFight } from '../../src/core/run';
import { Fight } from '../../src/core/fight';
const keys = ['mirrorRelic', 'houseDirty', 'counterForks', 'fasterAct2', 'fasterAll'] as const;
for (const k of keys) (STAKE as any)[k] = 99;
for (const every of [99, 3, 4]) {
  STAKE.scarEvery = every;
  const r = simulateRuns(defaultConfig(), 1500, 'greedy', 4242, 'knight', 1);
  console.log(`scarEvery ${every}: win ${r.winPct.toFixed(1)} act1 ${r.act1Pct.toFixed(1)} rocks at end ${r.avgRocksAtEnd.toFixed(1)}`);
}
// trace one run's rocks
STAKE.scarEvery = 2;
const run = createRun(defaultConfig(), 7, 'knight', 1);
for (let i = 0; i < 5; i++) {
  const f = new Fight(fightConfig(run, defaultConfig()), i + 1);
  f.winner = 'player';
  finishFight(run, f);
  console.log(i, JSON.stringify(run.player.strips.map((s) => s.rock ?? 0)), 'hp', run.player.hp, '/', run.player.maxHp);
}
