import { defaultConfig } from '../../src/core/config';
import { ARCHETYPES, DEPTH_HP } from '../../src/core/enemies';
import * as E from '../../src/core/enemies';
import { RUN } from '../../src/core/run';
import { simulateRuns } from '../../src/sim/simulateRun';

const baseHp = [...DEPTH_HP];
const variants: [string, () => void][] = [
  ['baseline', () => {}],
  ['heal 50%', () => { RUN.postFightHeal = 0.5; }],
  ['heal 50% + hp 36', () => { RUN.postFightHeal = 0.5; RUN.startHp = 36; }],
  ['heal 40% + enemy hp -20%', () => { RUN.postFightHeal = 0.4; DEPTH_HP.splice(0, 5, ...baseHp.map((h) => Math.round(h * 0.8))); }],
  ['heal 50% + enemy hp -20%', () => { RUN.postFightHeal = 0.5; DEPTH_HP.splice(0, 5, ...baseHp.map((h) => Math.round(h * 0.8))); }],
  ['full heal', () => { RUN.postFightHeal = 1; }],
];
const saved = { heal: RUN.postFightHeal, hp: RUN.startHp };
for (const [name, fn] of variants) {
  RUN.postFightHeal = saved.heal; RUN.startHp = saved.hp; DEPTH_HP.splice(0, 5, ...baseHp);
  fn();
  const g = simulateRuns(defaultConfig(), 1500, 'greedy', 7);
  const r = simulateRuns(defaultConfig(), 1500, 'random', 7);
  console.log(`${name.padEnd(28)} greedy ${g.winPct.toFixed(1)}% (boss ${g.bossWinPct.toFixed(0)}% reach ${g.reachedBossPct.toFixed(0)}%)  random ${r.winPct.toFixed(1)}%  deaths ${g.deathsAtDepth.map((d) => d.toFixed(0)).join('/')}  kill ${Object.entries(g.killRate).map(([k, v]) => k + ' ' + v.split(' ')[0]).join(' ')}`);
}
void ARCHETYPES; void E;
