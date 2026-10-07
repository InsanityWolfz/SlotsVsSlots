// ENDLESS REPORT (2026-10-07 sim rewrite). npx tsx tools/sim/endless.ts [N] [machine]
// GREEN runs that beat the Dealer always LET IT RIDE and never cash out, so this measures how far builds really get
// (the old harness cashed out at loop 5, which looked like a wall). Target: only truly broken builds reach loop 5.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 400);
const only = process.argv[3] as CabinetId | undefined;
const q = (xs: number[], p: number) => (xs.length ? xs[Math.floor(p * (xs.length - 1))] : 0);
SIM_BIAS.ride = true;
SIM_BIAS.noCashOut = true;
console.log(`N ${N} GREEN runs per machine; riders = Dealer winners (always ride)`);
for (const cab of only ? [only] : CABINET_ORDER) {
  const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  const L = s.endlessLoops;
  const reach = (k: number) => ((100 * L.filter((x) => x >= k).length) / Math.max(1, L.length)).toFixed(0).padStart(3);
  console.log(
    `${cab.padEnd(7)} riders ${String(L.length).padStart(4)}  cleared p50 ${q(L, 0.5)} p90 ${q(L, 0.9)} max ${Math.max(0, ...L)}  ` +
      `| riders reaching loop 2 ${reach(1)}%  3 ${reach(2)}%  4 ${reach(3)}%  5 ${reach(4)}%  6 ${reach(5)}%`,
  );
}
