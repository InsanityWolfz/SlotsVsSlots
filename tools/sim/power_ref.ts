// Median measured machinePower at the Mirror, act 3 regulars and the Dealer (greedy, GREEN). npx tsx tools/sim/power_ref.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { actLength } from '../../src/core/enemies';
import { machinePower } from '../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)] ?? 0;
for (const cab of (process.argv[3] ? [process.argv[3]] : CABINET_ORDER) as typeof CABINET_ORDER) {
  const m: number[] = [], a3: number[] = [], d: number[] = [];
  SIM_BIAS.onFight = (run) => {
    if (run.act === 2 && run.depth === actLength(2)) m.push(machinePower(run));
    else if (run.act === 3 && run.depth < actLength(3)) a3.push(machinePower(run));
    else if (run.act === 3) d.push(machinePower(run));
  };
  simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  const f = (a: number[]) => `${Math.round(med(a))} (p10 ${Math.round(q(a, 0.1))}, p90 ${Math.round(q(a, 0.9))})`;
  console.log(`${cab.padEnd(7)} mirror ${f(m)} | act3 ${f(a3)} | dealer ${f(d)}`);
}
