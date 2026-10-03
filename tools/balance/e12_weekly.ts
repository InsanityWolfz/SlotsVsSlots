// EXPERT_PLAYTEST_12 (throwaway): the weekly vs its own machine's plain WHITE run, both random drafting, over W weeks.
// npx tsx tools/balance/e12_weekly.ts N weeks [from]
import { defaultConfig } from '../../src/core/config';
import { applyWeekly, weekly } from '../../src/core/meta';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 200);
const WEEKS = Number(process.argv[3] ?? 26);
const FROM = Number(process.argv[4] ?? 30);
const plain = new Map<string, number>();
const bySetup = new Map<string, number[]>();
let tw = 0, tp = 0;
for (let w = FROM; w < FROM + WEEKS; w++) {
  const key = `2026-W${w}`;
  const wk = weekly(key);
  if (!plain.has(wk.cabinet)) plain.set(wk.cabinet, simulateRuns(defaultConfig(), N * 2, 'random', 999, wk.cabinet, 0).winPct);
  const s = simulateRuns(defaultConfig(), N, 'random', 4242 + w, wk.cabinet, 0, false, (run) => { run.seed = wk.seed; applyWeekly(run, key); }).winPct;
  const p = plain.get(wk.cabinet)!;
  tw += s; tp += p;
  const tag = `${wk.edges.join('+')}${wk.chips != null ? ' chips0' : ''}`;
  bySetup.set(tag, [...(bySetup.get(tag) ?? []), s / p]);
  console.log(`${key} ${wk.cabinet.padEnd(6)} ${tag.padEnd(18)} ${s.toFixed(1).padStart(5)} (plain ${p.toFixed(1)})`);
}
console.log(`mean ${(tw / WEEKS).toFixed(1)} vs plain ${(tp / WEEKS).toFixed(1)} (x${(tw / tp).toFixed(2)})`);
for (const [k, v] of bySetup) console.log(`  ${k.padEnd(18)} x${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)} (${v.length} weeks)`);
