// EXPERT_PLAYTEST_12 (throwaway): why charms are a trap on BRIAR. End-of-run builds (GREEN, seed 4242) for the greedy
// drafter vs the no-charms drafter: thorns / swords / shields on the strips, symbol levels, charm cells. npx tsx tools/balance/e12_briar.ts N [cab]
import { PATCH12, useSig } from './e12_patch';
import { defaultConfig, type Enh } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { symLevel } from '../../../src/core/charms';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const cab = (process.argv[3] ?? 'thorn') as CabinetId;
useSig(cab);
console.log(PATCH12);
for (const mode of ['greedy', 'no charms']) {
  SIM_BIAS.enh = mode === 'greedy' ? undefined : ((cab === 'tesla' ? 'spiked' : 'charged') as Enh);
  const acc: Record<string, number> = {};
  let n = 0;
  SIM_BIAS.onEnd = (run) => {
    n++;
    const p = run.player;
    const add = (k: string, v: number) => (acc[k] = (acc[k] ?? 0) + v);
    for (const s of p.strips) for (const [k, v] of Object.entries(s)) add(k, v ?? 0);
    for (const k of ['sword', 'shield', 'thorn', 'goldbar']) add('L' + k, symLevel(p.levels, k as never));
    add('charmCells', p.gilded.reduce((a, g) => a + g.n, 0));
    add('maxHp', p.maxHp);
    add('relics', p.relics.length);
    add('depth', run.act * 10 + run.depth);
  };
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  SIM_BIAS.onEnd = undefined;
  console.log(`${mode.padEnd(9)} G ${g.winPct.toFixed(1)} | ` + Object.entries(acc).map(([k, v]) => `${k} ${(v / n).toFixed(1)}`).join('  '));
}
