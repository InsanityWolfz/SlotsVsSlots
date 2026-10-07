// CHALLENGES and THE WEEKLY CHALLENGE: greedy win rate per challenge, and over a span of weeks. npx tsx tools/sim/challenges.ts [N] [weeks]
import { defaultConfig } from '../../src/core/config';
import { applyChallenge, applyWeekly, CHALLENGES, weekly } from '../../src/core/meta';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 400);
const WEEKS = Number(process.argv[3] ?? 12);
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(`N ${N} per row, greedy`);
for (const c of CHALLENGES) {
  const base = simulateRuns(defaultConfig(), N, 'greedy', 4242, c.cabinet, c.stake, c.stake >= 2);
  const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, c.cabinet, c.stake, c.stake >= 2, (run) => applyChallenge(run, c));
  console.log(`${c.name.padEnd(15)} ${c.cabinet.padEnd(6)} stake ${c.stake}  win ${f(s.winPct)}  (plain ${f(base.winPct)})  ${c.edges.join('+') || '-'}${c.chips != null ? ` chips ${c.chips}` : ''}`);
}
// The weekly: fixed fights per week, so each week is one seed; the variance comes from drafting (random policy picks).
let tot = 0;
const rows: string[] = [];
for (let w = 30; w < 30 + WEEKS; w++) {
  const key = `2026-W${w}`;
  const wk = weekly(key);
  const s = simulateRuns(defaultConfig(), Math.max(40, N / 5), 'random', 4242 + w, wk.cabinet, 0, false, (run) => {
    run.seed = wk.seed;
    applyWeekly(run, key);
  });
  tot += s.winPct;
  rows.push(`${key} ${wk.cabinet}+${wk.edges.join('+')} ${s.winPct.toFixed(0)}%`);
}
console.log(`WEEKLY (random drafting) mean ${(tot / WEEKS).toFixed(1)}%:  ${rows.join(' | ')}`);
