// EXPERT_PLAYTEST_12 (throwaway): the weekly's setup mix. (1) How weeks distribute over (machine, setup) now vs a
// proposal: the week's machine, then a setup picked uniformly among the ones that don't read like a challenge, with
// MARKED DECK setups added. (2) Random-draft difficulty of the MARKED setups vs plain, per machine. npx tsx tools/balance/e12_weekly2.ts N
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { dailySeed } from '../../../src/core/daily';
import { CHALLENGES, WEEKLY_SETUPS, weekly } from '../../../src/core/meta';
import { startEdges, type EdgeId } from '../../../src/core/run';
import { simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 200);
type W = { edges: EdgeId[]; chips?: number };
const tag = (w: W) => `${w.edges.join('+')}${w.chips != null ? ' chips0' : ''}`;
const NEW: W[] = [...WEEKLY_SETUPS, { edges: ['marked'] }, { edges: ['marked', 'fast'] }, { edges: ['marked'], chips: 0 }];
const reads = (cab: string, w: W) => CHALLENGES.some((c) => c.cabinet === cab && c.edges.some((e) => w.edges.includes(e)));
const now = new Map<string, number>(), prop = new Map<string, number>();
const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const WEEKS = 520;
for (let w = 1; w <= WEEKS; w++) {
  const key = `${2026 + Math.floor(w / 53)}-W${(w % 52) + 1}`;
  const wk = weekly(key);
  inc(now, `${wk.cabinet} ${tag(wk)}`);
  const cab = CABINET_ORDER[dailySeed(`weekly:${key}:machine`) % CABINET_ORDER.length];
  const ok = NEW.filter((s) => !reads(cab, s));
  inc(prop, `${cab} ${tag(ok[dailySeed(`weekly:${key}:edge`) % ok.length])}`);
}
const show = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((100 * v) / WEEKS).toFixed(0)}%`).join(' | ');
console.log(`NOW (${now.size} setups over ${WEEKS} weeks): ${show(now)}`);
console.log(`PROPOSAL (${prop.size} setups): ${show(prop)}`);
for (const cab of CABINET_ORDER) {
  const plain = simulateRuns(defaultConfig(), N, 'random', 999, cab, 0).winPct;
  const row = [`${cab.padEnd(6)} plain ${plain.toFixed(1)}`];
  for (const w of NEW.slice(-3)) {
    const s = simulateRuns(defaultConfig(), N, 'random', 999, cab, 0, false, (run) => { run.mods = [...w.edges]; if (w.chips != null) run.player.chips = w.chips; startEdges(run, w.edges); }).winPct;
    row.push(`${tag(w)} ${s.toFixed(1)} (x${(s / plain).toFixed(2)})`);
  }
  console.log(row.join(' | '));
}
