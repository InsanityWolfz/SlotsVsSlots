// CONTENT_13 build check: MIDAS (or CAB) WHITE/GREEN with some new content taken out of the pools.
// OFF=lucre,taxman,... CAB=midas npx tsx tools/balance/c13b_ablate.ts N
import { defaultConfig, type Enh, type RelicId } from '../../src/core/config';
import type { CabinetId } from '../../src/core/cabinets';
import { RELICS, RELIC_TIER } from '../../src/core/relics';
import { ACT1_GILDS } from '../../src/core/run';
import { simulateRuns } from '../../src/sim/simulateRun';
import { RAIN } from '../../src/core/fight';

if (process.env.PER) RAIN.perChip = Number(process.env.PER);
if (process.env.COST) RAIN.cost = Number(process.env.COST);
import { BOSS_MUL } from '../../src/core/run';
for (const kv of (process.env.BMUL ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  const [c, key] = k.split('.');
  (BOSS_MUL as unknown as Record<string, Record<string, number>>)[c][key] = Number(v);
}

const OFF = (process.env.OFF ?? '').split(',').filter(Boolean);
for (const id of OFF) {
  const i = ACT1_GILDS.indexOf(id as Enh);
  if (i >= 0) ACT1_GILDS.splice(i, 1);
  for (const t of ['common', 'uncommon', 'legendary'] as const) {
    const j = RELIC_TIER[t].indexOf(id as RelicId);
    if (j >= 0) RELIC_TIER[t].splice(j, 1);
  }
  if (id in RELICS) (RELICS[id as RelicId] as { retired?: boolean }).retired = true;
}
const N = Number(process.argv[2] ?? 600);
const cab = (process.env.CAB ?? 'midas') as CabinetId;
const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
console.log(`${cab} PER=${RAIN.perChip} COST=${RAIN.cost} BMUL=${process.env.BMUL ?? '-'} OFF=${OFF.join(',') || '-'}  WHITE ${w.winPct.toFixed(1)}  GREEN ${g.winPct.toFixed(1)}`);
