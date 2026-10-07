// EXPERT_PLAYTEST_11 (throwaway): selected challenges (greedy, seed 4242) under e11_patch env.
// ONLY=night,all NIGHT_CAB=tesla npx tsx tools/balance/e11_chal.ts N
import { PATCH_LABEL } from './e11_patch';
import { defaultConfig } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { applyChallenge, CHALLENGES } from '../../../src/core/meta';
import { simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 400);
const only = (process.env.ONLY ?? '').split(',').filter(Boolean);
const out: string[] = [];
for (const c0 of CHALLENGES) {
  if (only.length && !only.includes(c0.id)) continue;
  const c = { ...c0, cabinet: ((c0.id === 'night' && process.env.NIGHT_CAB) || c0.cabinet) as CabinetId };
  const base = simulateRuns(defaultConfig(), N, 'greedy', 4242, c.cabinet, c.stake, c.stake >= 2);
  const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, c.cabinet, c.stake, c.stake >= 2, (run) => applyChallenge(run, c));
  out.push(`${c.name} ${c.cabinet} ${s.winPct.toFixed(1)} (plain ${base.winPct.toFixed(1)})`);
}
console.log(`${PATCH_LABEL} ${process.env.HEALMUL ? 'HEALMUL=' + process.env.HEALMUL : ''} | ${out.join(' | ')}`);
