// ENDLESS REPORT (2026-10-07 sim rewrite). npx tsx tools/sim/endless.ts [N] [machine]
// GREEN runs that beat the Dealer always LET IT RIDE and never cash out, so this measures how far builds really get
// (the old harness cashed out at loop 5, which looked like a wall). Target: only truly broken builds reach loop 5.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import { ENDLESS } from '../../src/core/enemies';
import { machinePower } from '../../src/core/run';
// Probe: ENDLESS_JSON='{"ramp":0.1,"hpBy":{"midas":1.4}}' overrides the endless knobs for this run.
if (process.env.ENDLESS_JSON) {
  const o = JSON.parse(process.env.ENDLESS_JSON);
  for (const [k, v] of Object.entries(o)) (ENDLESS as Record<string, unknown>)[k] = typeof v === 'object' ? { ...(ENDLESS as Record<string, object>)[k], ...(v as object) } : v;
  console.log('ENDLESS override', JSON.stringify(o));
}

const N = Number(process.argv[2] ?? 400);
const only = process.argv[3] as CabinetId | undefined;
const q = (xs: number[], p: number) => (xs.length ? xs[Math.floor(p * (xs.length - 1))] : 0);
SIM_BIAS.ride = true;
SIM_BIAS.noCashOut = true;
console.log(`N ${N} GREEN runs per machine; riders = Dealer winners (always ride)`);
for (const cab of only ? [only] : CABINET_ORDER) {
  // Best builds: each rider's final build power, so the top 10% (the closest the greedy bot gets to a "broken" build)
  // gets its own row: the target is "only broken builds reach loop 5".
  const riders: { loops: number; power: number }[] = [];
  SIM_BIAS.onEnd = (run) => {
    if (run.endless) riders.push({ loops: run.endless.loop - 1, power: machinePower(run) });
  };
  const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  SIM_BIAS.onEnd = undefined;
  const L = s.endlessLoops;
  const top = [...riders].sort((a, b) => b.power - a.power).slice(0, Math.max(1, Math.round(riders.length / 10))).map((r) => r.loops);
  const topReach = (k: number) => ((100 * top.filter((x) => x >= k).length) / Math.max(1, top.length)).toFixed(0).padStart(3);
  const reach = (k: number) => ((100 * L.filter((x) => x >= k).length) / Math.max(1, L.length)).toFixed(0).padStart(3);
  console.log(
    `${cab.padEnd(7)} riders ${String(L.length).padStart(4)}  cleared p50 ${q(L, 0.5)} p90 ${q(L, 0.9)} max ${Math.max(0, ...L)}  ` +
      `| riders reaching loop 2 ${reach(1)}%  3 ${reach(2)}%  4 ${reach(3)}%  5 ${reach(4)}%  6 ${reach(5)}%`,
  );
  console.log(`${''.padEnd(7)} best 10% (${top.length} by build power)          | reaching loop 2 ${topReach(1)}%  3 ${topReach(2)}%  4 ${topReach(3)}%  5 ${topReach(4)}%  6 ${topReach(5)}%`);
}
