// WHITE/GREEN per machine under charm value overrides. CHARM="vamp:0,20,30,40,50;keen:0,20,30,40,50" npx tsx tools/balance/charm_tune.ts [N]
import { defaultConfig, type Enh } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { CHARM_VALUE } from '../../../src/core/charms';
import { simulateRuns } from '../../../src/sim/simulateRun';
import { RUN } from '../../../src/core/run';
if (process.env.HEAL) RUN.postFightHeal = Number(process.env.HEAL);
if (process.env.A3) RUN.act3HealMul = Number(process.env.A3);

const N = Number(process.argv[2] ?? 600);
for (const kv of (process.env.CHARM ?? '').split(';').filter(Boolean)) {
  const [k, v] = kv.split(':');
  CHARM_VALUE[k as Enh] = v.split(',').map(Number);
}
const f = (x: number) => x.toFixed(1).padStart(5);
let tw = 0, tg = 0;
const rows: string[] = [];
for (const cab of CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  tw += w.winPct; tg += g.winPct;
  rows.push(`${cab} ${f(w.winPct)}/${f(g.winPct)}`);
}
console.log(`${process.env.CHARM || 'current'} heal ${RUN.postFightHeal} a3 ${RUN.act3HealMul} | AVG WHITE ${f(tw / 5)} GREEN ${f(tg / 5)} | ${rows.join(' ')}`);
