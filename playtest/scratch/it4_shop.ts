// Rollout-valued Cashier decisions. npx tsx playtest/scratch/it4_shop.ts [visits] [rollouts]
import { buy, cloneRun, CHIPS, DRAFTS, FORKS, playRun4, reroll, rollout4, Rng, SHOPS, shopOffers, leaveShop, type Run4 } from './it4_lib';
import { createRun, draftOffers, applyOption, finishFight, fightConfig, needsChoice, chooseEnemy, isShopNow, takeSpoils, Fight, BASE, RUN_FIGHTS } from './it4_lib';
import { SPOILS } from './it4_lib';
import type { RunState, DraftOption } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';

const VISITS = Number(process.argv[2] ?? 600), R = Number(process.argv[3] ?? 300);
const D = DRAFTS.greedy, F = FORKS.sim, S = SHOPS.simGreedy;
const rr = new Rng(123);
const lbl = (o: DraftOption) => o.kind === 'gild' ? `gild ${o.enh} ${o.symbol}` : o.kind === 'relic' ? `relic ${o.relic}` : o.kind === 'swap' ? `wild x2` : o.kind === 'remove' ? `remove ${o.symbol}` : o.kind;
type Row = { label: string; price: number; d: number; best: boolean; shop: number };
const rows: Row[] = [];
const chipVal: number[][] = [[], [], []];
const noneBest: number[] = [0, 0, 0], visits = [0, 0, 0], spreads: number[] = [], rerollD: number[] = [];
const afford: number[][] = [[], [], []];
const seeds = new Rng(777), fr = new Rng(5);
let v = 0;
const cont = (run: RunState) => rollout4(run, D, F, S, R, rr);
// Play runs; at each shop pause and evaluate.
while (v < VISITS) {
  const run = createRun(BASE, seeds.int(0xffffffff));
  while (!run.over && v < VISITS) {
    if (needsChoice(run)) chooseEnemy(run, F(run, fr));
    const fight = new Fight(fightConfig(run, BASE), fr.int(0xffffffff));
    while (!fight.over) fight.step();
    finishFight(run, fight);
    if (!run.over && run.pendingSpoils) takeSpoils(run, SPOILS.greedy(run, run.pendingSpoils, fr));
    if (run.over) break;
    applyOption(run, D(run, draftOffers(run), fr));
    if (!isShopNow(run)) continue;
    const si = [1, 3, 5].indexOf(run.depth);
    visits[si]++; v++;
    const items = shopOffers(run);
    afford[si].push(run.player.chips);
    // Evaluate "leave" (future shops still simGreedy) = afterLeave
    const leave = (r: RunState) => { leaveShop(r); r.depth; return r; };
    const base = cont(leave(cloneRun(run)));
    const vals: { label: string; price: number; val: number }[] = [{ label: 'LEAVE', price: 0, val: base }];
    items.forEach((it, i) => {
      if (run.player.chips < it.price) return;
      const c = cloneRun(run); const its = shopOffers(c); buy(c, its[i]); leaveShop(c);
      vals.push({ label: lbl(it.option), price: it.price, val: cont(c) });
    });
    if (run.player.chips >= 2) { // reroll then buy by simGreedy
      const c = cloneRun(run); reroll(c); S(c, fr); leaveShop(c); rerollD.push(cont(c) - base);
    }
    { const c = cloneRun(run); c.player.chips += 5; leaveShop(c); chipVal[si].push(cont(c) - base); }
    const top = Math.max(...vals.map((x) => x.val));
    if (vals.length > 1) spreads.push(top - Math.min(...vals.map((x) => x.val)));
    if (base === top) noneBest[si]++;
    for (const x of vals.slice(1)) rows.push({ label: x.label, price: x.price, d: x.val - base, best: x.val === top, shop: si });
    // Continue the run as simGreedy
    S(run, fr); leaveShop(run);
    if (v % 50 === 0) console.error(`visits ${v}`);
  }
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * p)] ?? 0; };
console.log(`visits ${VISITS}, rollouts ${R} (SE ~${(100 * Math.sqrt(0.25 / R) * 1.41).toFixed(1)} pts on a diff)`);
for (let s = 0; s < 3; s++) console.log(`shop ${s + 1}: n=${visits[s]} chips on arrival avg ${avg(afford[s]).toFixed(1)} (p10 ${q(afford[s], .1)} p90 ${q(afford[s], .9)}); can afford gild ${(100 * afford[s].filter((c) => c >= CHIPS.prices.gild).length / afford[s].length).toFixed(0)}% relic ${(100 * afford[s].filter((c) => c >= CHIPS.prices.relic).length / afford[s].length).toFixed(0)}%; LEAVE best ${(100 * noneBest[s] / visits[s]).toFixed(0)}%; +5 chips worth ${(100 * avg(chipVal[s])).toFixed(1)} pts`);
console.log(`reroll(then simGreedy) vs leave: ${(100 * avg(rerollD)).toFixed(1)} pts (n=${rerollD.length}, >0 ${(100 * rerollD.filter((x) => x > 0.02).length / rerollD.length).toFixed(0)}%)`);
console.log(`decision spread (best-worst) avg ${(100 * avg(spreads)).toFixed(1)} pts; trivial (<2pts) ${(100 * spreads.filter((s) => s < 0.02).length / spreads.length).toFixed(0)}%`);
const by: Record<string, Row[]> = {};
for (const r of rows) (by[r.label.replace(/ (sword|bolt|shield)$/, (m) => m)] ??= []).push(r);
console.log('item                     n   price  dWin vs leave   best%   dWin@shop1/2/3');
for (const [k, rs] of Object.entries(by).sort((a, b) => avg(b[1].map((r) => r.d)) - avg(a[1].map((r) => r.d)))) {
  const s = [0, 1, 2].map((i) => { const x = rs.filter((r) => r.shop === i); return x.length ? (100 * avg(x.map((r) => r.d))).toFixed(1) : '-'; });
  console.log(`${k.padEnd(24)} ${String(rs.length).padStart(4)} ${String(rs[0].price).padStart(5)} ${(100 * avg(rs.map((r) => r.d))).toFixed(1).padStart(8)}       ${(100 * rs.filter((r) => r.best).length / rs.length).toFixed(0).padStart(4)}   ${s.join(' / ')}`);
}
