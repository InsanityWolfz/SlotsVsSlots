// EXPERT_PLAYTEST_12 (throwaway): THE SURGERY set, forced. For each option (and SWEEP UP under SWEEP=lvl|full|sig2 from
// e12_patch.ts), GREEN win% of the runs that took it (seed 4242, all machines). npx tsx tools/balance/e12_sweep.ts N [choices]
import { PATCH12, useSig } from './e12_patch';
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import type { BigChoiceId } from '../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const CH = (process.argv[3] ?? 'cleanCut,twinReel,sweepUp').split(',') as BigChoiceId[];
console.log(PATCH12);
for (const c of CH) {
  SIM_BIAS.choice = c;
  const per: string[] = [];
  let tt = 0, tw = 0;
  for (const cab of CABINET_ORDER) {
    useSig(cab);
    let took = 0, won = 0;
    SIM_BIAS.onEnd = (run) => {
      if (!(run as { took?: string[] }).took?.includes(c)) return;
      took++;
      if (run.won) won++;
    };
    simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
    tt += took; tw += won;
    per.push(`${cab} ${((100 * won) / Math.max(1, took)).toFixed(1)} (${took})`);
  }
  console.log(`${c.padEnd(9)} took ${tt}, won ${((100 * tw) / Math.max(1, tt)).toFixed(1)}% | ${per.join('  ')}`);
}
