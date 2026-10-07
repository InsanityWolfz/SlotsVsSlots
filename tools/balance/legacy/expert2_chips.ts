// Expert playtest 2 (throwaway): chips on hand before each fight (greedy GREEN). npx tsx tools/balance/expert2_chips.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import type { RunState } from '../../../src/core/run';
const N = Number(process.argv[2] ?? 200);
const by: Record<string, number[]> = {};
SIM_BIAS.onFight = (run: RunState) => { (by[`${run.act}.${run.depth}`] ??= []).push(run.player.chips); };
for (const c of CABINET_ORDER as CabinetId[]) simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
console.log('chips on hand before fight act.depth: p10/p50/p90');
console.log(Object.entries(by).map(([k, v]) => `${k}: ${q(v, 0.1)}/${q(v, 0.5)}/${q(v, 0.9)}`).join('  '));
