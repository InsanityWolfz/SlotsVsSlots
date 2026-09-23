// Rollout value of every draft card AND every fork choice. npx tsx playtest/scratch/it2_decisions.ts [points] [rollouts] [contPolicy]
import { RELICS } from '../../src/core/relics';
import { applyOption, chooseEnemy, cloneRun, createRun, draftOffers, fightConfig, finishFight, Fight, FORKS, needsChoice, optType, POLICIES, rollout, Rng, BASE, RUN_FIGHTS } from './it2_lib';
import type { RunState } from '../../src/core/run';

const POINTS = Number(process.argv[2] ?? 400);
const R = Number(process.argv[3] ?? 300);
const contName = process.argv[4] ?? 'hpFirst';
const cont = POLICIES[contName];
const forkCont = FORKS.simGreedy;
const rng = new Rng(1234);
const seeds = new Rng(555);

const typeStats: Record<string, { n: number; best: number; deltaSum: number }> = {};
const spreads: number[] = [];
const byDepth: Record<number, number[]> = {};
const relicDraftSpreads: number[] = []; // |relicA - relicB|
const relicVsOther: number[] = []; // best relic - other card
const kindCount: Record<string, number> = {};
const fork = { n: 0, spread: [] as number[], pairs: {} as Record<string, { n: number; aBetter: number; delta: number }>, greedyLoss: 0, randomLoss: 0, counter: { n: 0, pickedCountered: 0, delta: 0 } };
const polLoss: Record<string, number> = { greedy: 0, hpFirst: 0, random: 0, swapFirst: 0, first: 0 };
let collected = 0;

const COUNTER: Record<string, string> = { frost: 'mittens', gremlin: 'lockpick', thief: 'mousetrap', golem: 'pickaxe' };

function forkPoint(run: RunState) {
  const opts = run.paths[run.depth];
  const vals = opts.map((_, i) => { const r2 = cloneRun(run); chooseEnemy(r2, i); return rollout(r2, cont, forkCont, R, rng); });
  const mx = Math.max(...vals), mn = Math.min(...vals);
  fork.n++;
  fork.spread.push(mx - mn);
  const g = FORKS.simGreedy(run, rng);
  fork.greedyLoss += mx - vals[g];
  fork.randomLoss += mx - (vals[0] + vals[1]) / 2;
  const [a, b] = opts.map((o) => o.archetype);
  const [x, y, va, vb] = a < b ? [a, b, vals[0], vals[1]] : [b, a, vals[1], vals[0]];
  const k = `${x} vs ${y}`;
  const s = (fork.pairs[k] ??= { n: 0, aBetter: 0, delta: 0 });
  s.n++; s.delta += va - vb; if (va > vb) s.aBetter++;
  // counter relic held for one option?
  const ci = opts.findIndex((o) => COUNTER[o.archetype] && run.player.relics.includes(COUNTER[o.archetype] as any));
  if (ci >= 0) { fork.counter.n++; fork.counter.delta += vals[ci] - vals[1 - ci]; if (vals[ci] >= vals[1 - ci]) fork.counter.pickedCountered++; }
  return vals.indexOf(mx);
}

while (collected < POINTS) {
  const run = createRun(BASE, seeds.int(0xffffffff));
  while (!run.over && collected < POINTS) {
    if (needsChoice(run)) chooseEnemy(run, forkPoint(run));
    const fight = new Fight(fightConfig(run, BASE), rng.int(0xffffffff));
    while (!fight.over) fight.step();
    finishFight(run, fight);
    if (run.over) break;
    const offers = draftOffers(run);
    const vals = offers.map((o) => { const r2 = cloneRun(run); applyOption(r2, o); return rollout(r2, cont, forkCont, R, rng); });
    const mx = Math.max(...vals), mn = Math.min(...vals);
    spreads.push(mx - mn);
    (byDepth[run.depth] ??= []).push(mx - mn);
    offers.forEach((o, i) => {
      const t = optType(o);
      const s = (typeStats[t] ??= { n: 0, best: 0, deltaSum: 0 });
      s.n++; s.deltaSum += vals[i] - mx; if (vals[i] === mx) s.best++;
      kindCount[o.kind] = (kindCount[o.kind] ?? 0) + 1;
    });
    const relicIdx = offers.map((o, i) => (o.kind === 'relic' ? i : -1)).filter((i) => i >= 0);
    if (relicIdx.length === 2) {
      relicDraftSpreads.push(Math.abs(vals[relicIdx[0]] - vals[relicIdx[1]]));
      const other = offers.findIndex((o) => o.kind !== 'relic');
      if (other >= 0) relicVsOther.push(Math.max(vals[relicIdx[0]], vals[relicIdx[1]]) - vals[other]);
    }
    for (const p of Object.keys(polLoss)) polLoss[p] += mx - vals[offers.indexOf(POLICIES[p](run, offers, new Rng(collected)))];
    applyOption(run, offers[vals.indexOf(mx)]);
    collected++;
  }
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
spreads.sort((a, b) => a - b);
console.log(`cont=${contName}; draft points ${POINTS}, rollouts ${R} (SE ~${(100 * Math.sqrt(0.25 / R)).toFixed(1)} pts per value)`);
console.log(`DRAFT spread best-worst: avg ${(100 * avg(spreads)).toFixed(1)}, median ${(100 * med(spreads)).toFixed(1)}, p90 ${(100 * spreads[Math.floor(spreads.length * 0.9)]).toFixed(1)}; <5pts ${(100 * spreads.filter((s) => s < 0.05).length / spreads.length).toFixed(0)}%`);
console.log(`by depth (after fight N): ${Object.entries(byDepth).map(([d, xs]) => `F${d}: ${(100 * avg(xs)).toFixed(1)} (n${xs.length})`).join('  ')}`);
console.log(`relic drafts: |relicA-relicB| avg ${(100 * avg(relicDraftSpreads)).toFixed(1)} median ${(100 * med(relicDraftSpreads)).toFixed(1)} (<5pts ${(100 * relicDraftSpreads.filter((s) => s < 0.05).length / Math.max(1, relicDraftSpreads.length)).toFixed(0)}%); best relic minus the 3rd card avg ${(100 * avg(relicVsOther)).toFixed(1)} (3rd card better ${(100 * relicVsOther.filter((x) => x < 0).length / Math.max(1, relicVsOther.length)).toFixed(0)}%)`);
console.log(`policy loss per draft vs oracle (pts): ${Object.entries(polLoss).map(([k, v]) => `${k} ${(100 * v / POINTS).toFixed(1)}`).join('  ')}`);
console.log(`offer mix: ${JSON.stringify(kindCount)}`);
console.log('type                 offered best%  avgDeltaVsBest');
for (const [t, s] of Object.entries(typeStats).sort((a, b) => b[1].deltaSum / b[1].n - a[1].deltaSum / a[1].n))
  console.log(`${t.padEnd(22)} ${String(s.n).padStart(5)} ${(100 * s.best / s.n).toFixed(0).padStart(5)} ${(100 * s.deltaSum / s.n).toFixed(1).padStart(8)}`);
console.log(`\nFORKS n=${fork.n}: spread avg ${(100 * avg(fork.spread)).toFixed(1)} median ${(100 * med(fork.spread)).toFixed(1)} (<3pts ${(100 * fork.spread.filter((s) => s < 0.03).length / fork.n).toFixed(0)}%); simGreedy loses ${(100 * fork.greedyLoss / fork.n).toFixed(1)}/fork, random loses ${(100 * fork.randomLoss / fork.n).toFixed(1)}/fork`);
for (const [k, s] of Object.entries(fork.pairs).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k.padEnd(20)} n${String(s.n).padStart(4)}  first-named better ${(100 * s.aBetter / s.n).toFixed(0)}%  avg delta ${(100 * s.delta / s.n).toFixed(1)} pts`);
console.log(`  counter relic held for one option: n=${fork.counter.n}, countered option better ${(100 * fork.counter.pickedCountered / Math.max(1, fork.counter.n)).toFixed(0)}%, avg delta ${(100 * fork.counter.delta / Math.max(1, fork.counter.n)).toFixed(1)} pts`);
void RELICS; void RUN_FIGHTS;
