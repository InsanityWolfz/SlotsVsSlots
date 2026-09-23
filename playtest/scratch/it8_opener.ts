// Opener (A1) death rate per cabinet, real fightConfig.   npx tsx playtest/scratch/it8_opener.ts
import { Fight } from '../../src/core/fight';
import { createRun, fightConfig } from '../../src/core/run';
import { BASE, CABINET_ORDER, Rng } from './it8_lib';
const seeds = new Rng(99);
for (const cab of CABINET_ORDER) {
  const by: Record<string, [number, number, number]> = {};
  for (let i = 0; i < 4000; i++) {
    const run = createRun(BASE, seeds.int(0xffffffff), cab);
    const f = new Fight(fightConfig(run, BASE), seeds.int(0xffffffff));
    while (!f.over && f.turn < 2000) f.step();
    const k = run.enemies[0].archetype; const e = (by[k] ??= [0, 0, 0]); e[0]++; if (f.winner !== 'player') e[1]++; e[2] += f.turn;
  }
  console.log(cab.padEnd(7), Object.entries(by).map(([k, [n, d, t]]) => `${k} die ${(100 * d / n).toFixed(1)}% turns ${(t / n).toFixed(1)}`).join(' | '));
}
