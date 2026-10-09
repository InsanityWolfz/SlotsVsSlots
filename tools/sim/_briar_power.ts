// Throwaway (BRIAR redesign): power_ref for thorn with THORNS knob edits. npx tsx tools/sim/_briar_power.ts N "THORNS.parry=1"
import { defaultConfig } from '../../src/core/config';
import { actLength } from '../../src/core/enemies';
import { machinePower } from '../../src/core/run';
import * as fight from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
const [nArg, edits = ''] = process.argv.slice(2);
for (const e of edits.split(';').filter(Boolean)) { const [p, v] = e.split('='); const k = p.split('.'); let o: any = fight; for (const x of k.slice(0, -1)) o = o[x]; o[k[k.length - 1]] = Number(v); }
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const m: number[] = [], a3: number[] = [], d: number[] = [];
SIM_BIAS.onFight = (run) => {
  if (run.act === 2 && run.depth === actLength(2)) m.push(machinePower(run));
  else if (run.act === 3 && run.depth < actLength(3)) a3.push(machinePower(run));
  else if (run.act === 3) d.push(machinePower(run));
};
simulateRuns(defaultConfig(), Number(nArg ?? 150), 'greedy', 4242, 'thorn', 2, true);
console.log(`[${edits}] power medians: wheel ${Math.round(med(m))} act3 ${Math.round(med(a3))} dealer ${Math.round(med(d))}`);
