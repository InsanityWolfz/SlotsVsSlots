// EXPERT_PLAYTEST_8 throwaway: THE DAILY RUN. npx tsx tools/balance/expert8_daily.ts [days] [variants] [stake]
// For each day key: that day's seed + machine, fights fixed by the day (run.daily). Variant 0 = greedy; variants 1..V-1
// = greedy with 25% random picks (a different player on the same day). Compares the spread of per-day win rates with
// fixed fights vs fresh fight seeds, the value of a retry (best of 3), and determinism (same choices, same result).
import { defaultConfig } from '../../src/core/config';
import { dailyCabinet, dailySeed } from '../../src/core/daily';
import { actLength } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import {
  applyOption, buy, chooseEnemy, CHIPS, createRun, draftOffers, finishFight, fightConfig, isShopNow, leaveShop,
  needsChoice, shopOffers, takeChoice, takeLegend, takeSpoils, takeStart, type RunState,
} from '../../src/core/run';
import { choiceValue, greedyValue } from '../../src/sim/simulateRun';

const DAYS = Number(process.argv[2] ?? 120);
const V = Number(process.argv[3] ?? 8);
const STAKE = Number(process.argv[4] ?? 0);
const base = defaultConfig();

function play(key: string, v: number, fixed: boolean): { won: boolean; fights: number; sig: string } {
  const seed = dailySeed(key);
  const run: RunState = createRun(base, seed, dailyCabinet(key), STAKE, STAKE >= 2);
  if (fixed) run.daily = key;
  const r = new Rng((seed ^ (v * 0x9e3779b1)) >>> 0);
  const eps = v === 0 ? 0 : 0.25;
  const pick = <T,>(xs: T[], val: (x: T) => number): T => (r.next() < eps ? r.pick(xs) : xs.reduce((a, b) => (val(b) > val(a) ? b : a)));
  if (run.pendingStart?.length) { takeStart(run, pick(run.pendingStart, () => 0)); run.pendingStart = null; }
  const fr = new Rng((seed ^ 0x5f3759df ^ (v * 7919)) >>> 0);
  let fights = 0;
  const sig: number[] = [];
  while (!run.over && fights < 40) {
    if (needsChoice(run)) chooseEnemy(run, r.next() < 0.5 ? 0 : run.paths[run.depth].length - 1);
    const cfg = fightConfig(run, base);
    const f = new Fight(cfg, fixed ? cfg.seed! : fr.int(0xffffffff));
    while (!f.over && f.turn < 2000) f.step();
    sig.push(f.turn);
    finishFight(run, f);
    fights++;
    while (!run.over && run.pendingChoice?.length) takeChoice(run, pick(run.pendingChoice, (c) => choiceValue(run, c)));
    if (!run.over && run.pendingLegend) { if (run.pendingLegend.length) takeLegend(run, pick(run.pendingLegend, () => 0)); run.pendingLegend = null; }
    if (!run.over && run.pendingSpoils) takeSpoils(run, pick(run.pendingSpoils, (b) => greedyValue(run, { kind: 'relic', relic: b })));
    if (!run.over && !isShopNow(run)) applyOption(run, pick(draftOffers(run), (o) => greedyValue(run, o)));
    if (!run.over && isShopNow(run)) {
      const reserve = run.depth >= actLength(run.act) ? CHIPS.stackPer * 2 : 0;
      for (const it of shopOffers(run)) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
      leaveShop(run);
    }
  }
  return { won: !!run.won, fights, sig: sig.join(',') };
}

const keys: string[] = [];
for (let i = 0; i < DAYS; i++) {
  const d = new Date(2026, 9, 1 + i);
  keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}
const byCab: Record<string, number> = {};
let det = 0;
const res = { fixed: [] as number[], fresh: [] as number[] };
let first = 0, best3 = 0, firstFresh = 0, best3Fresh = 0;
const fightsFirst: number[] = [];
for (const k of keys) {
  byCab[dailyCabinet(k)] = (byCab[dailyCabinet(k)] ?? 0) + 1;
  const a = play(k, 0, true), b = play(k, 0, true);
  if (a.sig === b.sig && a.won === b.won) det++;
  for (const mode of ['fixed', 'fresh'] as const) {
    const out = Array.from({ length: V }, (_, v) => play(k, v, mode === 'fixed'));
    const w = out.filter((o) => o.won).length / V;
    res[mode].push(w);
    const f1 = out[1].won ? 1 : 0, b3 = out.slice(1, 4).some((o) => o.won) ? 1 : 0;
    if (mode === 'fixed') { first += f1; best3 += b3; fightsFirst.push(out[0].fights); } else { firstFresh += f1; best3Fresh += b3; }
  }
}
const stats = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
  const z = xs.filter((x) => x === 0).length, hi = xs.filter((x) => x >= 0.75).length;
  return `mean ${(100 * m).toFixed(1)}%  sd ${(100 * sd).toFixed(1)}  days at 0% ${z}  days >=75% ${hi}`;
};
console.log(`days ${DAYS}, variants ${V}, stake ${STAKE}`);
console.log('machines:', JSON.stringify(byCab));
console.log(`determinism (same choices, same fights): ${det}/${DAYS}`);
console.log(`fixed fights  per-day win: ${stats(res.fixed)}`);
console.log(`fresh fights  per-day win: ${stats(res.fresh)}`);
console.log(`one try vs best of 3 (fixed): ${((100 * first) / DAYS).toFixed(1)}% -> ${((100 * best3) / DAYS).toFixed(1)}%`);
console.log(`one try vs best of 3 (fresh): ${((100 * firstFresh) / DAYS).toFixed(1)}% -> ${((100 * best3Fresh) / DAYS).toFixed(1)}%`);
const byMachine: Record<string, number[]> = {};
keys.forEach((k, i) => (byMachine[dailyCabinet(k)] ??= []).push(res.fixed[i]));
console.log('per machine fixed-day win:', Object.entries(byMachine).map(([c, xs]) => `${c} ${((100 * xs.reduce((a, b) => a + b, 0)) / xs.length).toFixed(0)}% (${xs.length}d)`).join(' | '));
