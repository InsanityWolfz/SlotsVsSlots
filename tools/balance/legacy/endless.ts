// ENDLESS gate: among Dealer winners who LET IT RIDE, loops reached (target median 2-3, p90 <= 6). npx tsx tools/balance/endless.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 400);
const base = defaultConfig();
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; };
for (const id of CABINET_ORDER) {
  const loops: number[] = [];
  SIM_BIAS.ride = true;
  SIM_BIAS.onEnd = (run) => { if (run.endless) loops.push(run.endless.loop - 1); };
  simulateRuns(base, N, 'greedy', 4242, id, 2, true);
  console.log(`${id.padEnd(7)} riders ${String(loops.length).padStart(4)}  loops cleared p50 ${q(loops, 0.5)}  p90 ${q(loops, 0.9)}  max ${Math.max(0, ...loops)}`);
}
