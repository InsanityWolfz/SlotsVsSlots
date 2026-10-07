// EXPERT_PLAYTEST_12 (throwaway): how often a run reaches a boss's big choice with every symbol at the cap (MASTERWORK then
// targets a maxed symbol and ARMS RACE is all cost). Counted at the next act's first fight. npx tsx tools/balance/e12_maxed.ts N
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { LEVEL_CAP, symLevel } from '../../../src/core/charms';
import { CABINETS } from '../../../src/core/cabinets';
import type { RunState } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const levelSyms = (run: RunState) => CABINETS[run.cabinet].symbols.filter((s) => run.player.strips.some((x) => (x[s] ?? 0) > 0));
const N = Number(process.argv[2] ?? 300);
for (const cab of CABINET_ORDER) {
  let seen = 0, maxed = 0;
  const done = new Set<unknown>();
  SIM_BIAS.onFight = (run) => {
    const r = run as RunState & { _pre?: boolean };
    // Before the boss fight: levels don't change during a fight, so this is the state the big choice sees.
    if ((run.enemies[run.depth] as { boss?: string } | undefined)?.boss) r._pre = levelSyms(run).every((s) => symLevel(run.player.levels, s) >= LEVEL_CAP);
    if (run.depth !== 0 || run.act < 2 || done.has(`${run.seed}:${run.act}`)) return;
    done.add(`${run.seed}:${run.act}`);
    seen++;
    if (r._pre) maxed++;
  };
  simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  console.log(`${cab} boss choices ${seen}, every symbol already maxed when THE FORGE/MELT/... is rolled ${((100 * maxed) / Math.max(1, seen)).toFixed(1)}%`);
}
