import { defaultConfig } from '../../src/core/config';
import { DEPTH_HP, TUNE } from '../../src/core/enemies';
import { CHIPS } from '../../src/core/run';
import { simulateRuns } from '../../src/sim/simulateRun';

const baseHp = [...DEPTH_HP];
const baseChips = JSON.parse(JSON.stringify(CHIPS));
type V = [string, () => void];
const variants: V[] = [
  ['hp x1.2, boss 66, win2 prices+2', () => { DEPTH_HP.splice(0, 5, ...baseHp.map((h) => Math.round(h * 1.2))); TUNE.bossHp = 66; CHIPS.win = 2; CHIPS.prices.gild = 10; CHIPS.prices.relic = 12; }],
  ['hp x1.2, boss 72, win2 prices+2', () => { DEPTH_HP.splice(0, 5, ...baseHp.map((h) => Math.round(h * 1.2))); TUNE.bossHp = 72; CHIPS.win = 2; CHIPS.prices.gild = 10; CHIPS.prices.relic = 12; }],
  ['hp x1.25, boss 70, win2 prices+2', () => { DEPTH_HP.splice(0, 5, ...baseHp.map((h) => Math.round(h * 1.25))); TUNE.bossHp = 70; CHIPS.win = 2; CHIPS.prices.gild = 10; CHIPS.prices.relic = 12; }],
];
for (const [name, fn] of variants) {
  DEPTH_HP.splice(0, 5, ...baseHp); TUNE.bossHp = 48; Object.assign(CHIPS, JSON.parse(JSON.stringify(baseChips)));
  fn();
  const g = simulateRuns(defaultConfig(), 1500, 'greedy', 11);
  const r = simulateRuns(defaultConfig(), 1500, 'random', 11);
  console.log(`${name.padEnd(46)} greedy ${g.winPct.toFixed(1)} (boss ${g.bossWinPct.toFixed(0)}%)  random ${r.winPct.toFixed(1)}  deaths ${g.deathsAtDepth.map((d) => d.toFixed(0)).join('/')}  turns ${g.avgTurnsPerFight.toFixed(1)}`);
}
