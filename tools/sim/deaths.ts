// Where WHITE runs die, fight by fight (% of all runs). npx tsx tools/sim/deaths.ts [N] [machine|all] ["path=value;..."]
import { defaultConfig } from '../../src/core/config';
import * as cabMod from '../../src/core/cabinets';
import * as runMod from '../../src/core/run';
import * as enemies from '../../src/core/enemies';
import * as fight from '../../src/core/fight';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const only = process.argv[3] && process.argv[3] !== 'all' ? (process.argv[3] as CabinetId) : undefined;
const roots: Record<string, unknown> = { ...cabMod, ...runMod, ...enemies, ...fight };
for (const e of (process.argv[4] ?? '').split(';').filter(Boolean)) {
  const [path, val] = e.split('=');
  const keys = path.trim().split('.');
  let o = roots as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys[keys.length - 1]] = Number(val);
}
const stake = Number(process.env.STAKE ?? 0);
for (const cab of only ? [only] : CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, stake, stake >= 2);
  const d = w.deathsAtDepth;
  const sum = (a: number, b: number) => d.slice(a, b).reduce((x, y) => x + y, 0);
  console.log(`${cab.padEnd(7)} won ${w.winPct.toFixed(1)} | act1 ${sum(0, 5).toFixed(1)} House ${d[5].toFixed(1)} act2 ${sum(6, 11).toFixed(1)} Wheel ${d[11].toFixed(1)}${stake >= 2 ? ` act3 ${sum(12, 15).toFixed(1)} Dealer ${(d[15] ?? 0).toFixed(1)}` : ''} | ${d.map((x) => x.toFixed(0)).join(' ')}`);
}
