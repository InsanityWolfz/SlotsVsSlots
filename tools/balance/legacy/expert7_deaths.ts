// EXPERT_PLAYTEST_7 throwaway: where runs die (fight index and enemy), WHITE and GREEN. npx tsx tools/balance/expert7_deaths.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import type { RunState } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 300);
const base = defaultConfig();
for (const stake of [0, 2]) {
  const byFight: Record<string, number> = {}; const byEnemy: Record<string, number> = {}; let runs = 0;
  const hpAtBoss: number[] = [];
  SIM_BIAS.onEnd = (run: RunState) => {
    runs++;
    const last = run.records.at(-1);
    if (run.won || !last || last.won) return;
    const k = `a${last.act}.${last.depth}`; byFight[k] = (byFight[k] ?? 0) + 1;
    byEnemy[last.archetype ?? last.enemy] = (byEnemy[last.archetype ?? last.enemy] ?? 0) + 1;
  };
  for (const cab of CABINET_ORDER) simulateRuns(base, N, 'greedy', 991, cab, stake, stake >= 2);
  const f = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / runs).toFixed(1)}%`).join(' | ');
  console.log(`${stake ? 'GREEN' : 'WHITE'} runs ${runs}\n by fight: ${Object.entries(byFight).sort().map(([k, v]) => `${k} ${(100 * v / runs).toFixed(1)}`).join(' ')}\n by enemy: ${f(byEnemy)}`);
}
