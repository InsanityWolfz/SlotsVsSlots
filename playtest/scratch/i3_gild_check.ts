import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import { applyOption, chooseEnemy, createRun, draftOffers, fightConfig, finishFight, needsChoice, type DraftOption, type RunState } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';

const base = defaultConfig();
function play(val: (r: RunState, o: DraftOption) => number, n: number, seed: number) {
  const seeds = new Rng(seed); let wins = 0;
  for (let i = 0; i < n; i++) {
    const run = createRun(base, seeds.int(0xffffffff));
    while (!run.over) {
      if (needsChoice(run)) chooseEnemy(run, run.paths[run.depth].findIndex((e) => !e.elite));
      const f = new Fight(fightConfig(run, base), seeds.int(0xffffffff));
      while (!f.over && f.turn < 2000) f.step();
      finishFight(run, f);
      if (!run.over) { const offers = draftOffers(run); applyOption(run, offers.reduce((a, b) => (val(run, b) > val(run, a) ? b : a))); }
    }
    if (run.won) wins++;
  }
  return (100 * wins / n).toFixed(1);
}
const N = 2500;
console.log('greedy            ', play(greedyValue, N, 1));
console.log('never gild        ', play((r, o) => (o.kind === 'gild' ? -99 : greedyValue(r, o)), N, 1));
console.log('gild first        ', play((r, o) => (o.kind === 'gild' ? 99 : greedyValue(r, o)), N, 1));
console.log('wild first        ', play((r, o) => (o.kind === 'swap' && o.to === 'wild' ? 99 : greedyValue(r, o)), N, 1));
console.log('never wild        ', play((r, o) => (o.kind === 'swap' && o.to === 'wild' ? -99 : greedyValue(r, o)), N, 1));
for (const e of ['gold', 'keen', 'charged', 'spiked'])
  console.log(`only gild ${e.padEnd(8)}`, play((r, o) => (o.kind === 'gild' ? (o.enh === e ? 99 : -99) : greedyValue(r, o)), N, 1));
