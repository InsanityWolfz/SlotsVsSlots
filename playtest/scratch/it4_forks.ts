// Rollout-valued forks and elite spoils. npx tsx playtest/scratch/it4_forks.ts [decisions] [rollouts]
import { cloneRun, DRAFTS, FORKS, rollout4, Rng, SHOPS, SPOILS } from './it4_lib';
import { createRun, draftOffers, applyOption, finishFight, fightConfig, needsChoice, chooseEnemy, isShopNow, takeSpoils, Fight, BASE } from './it4_lib';
import { leaveShop } from '../../src/core/run';
import type { RelicId } from '../../src/core/config';
const M = Number(process.argv[2] ?? 500), R = Number(process.argv[3] ?? 300);
const D = DRAFTS.greedy, F = FORKS.sim, S = SHOPS.smart;
const rr = new Rng(1), seeds = new Rng(31), fr = new Rng(3);
const forkD: { d: number; depth: number; hp: number; arch: string }[] = [];
const spoilD: { spread: number; pair: string; best: RelicId; worst: RelicId }[] = [];
while (forkD.length < M) {
  const run = createRun(BASE, seeds.int(0xffffffff));
  while (!run.over) {
    if (needsChoice(run)) {
      const opts = run.paths[run.depth]; const ei = opts.findIndex((e) => e.elite);
      if (ei >= 0) {
        const v = [0, 1].map((i) => { const c = cloneRun(run); chooseEnemy(c, i); return rollout4(c, D, F, S, R, rr); });
        forkD.push({ d: v[ei] - v[1 - ei], depth: run.depth, hp: run.player.hp / run.player.maxHp, arch: `${opts[ei].archetype}*>${opts[1 - ei].archetype}` });
      }
      chooseEnemy(run, F(run, fr));
    }
    const fight = new Fight(fightConfig(run, BASE), fr.int(0xffffffff));
    while (!fight.over) fight.step();
    finishFight(run, fight);
    if (!run.over && run.pendingSpoils) {
      const sp = run.pendingSpoils;
      if (sp.length === 2) {
        const v = sp.map((r) => { const c = cloneRun(run); takeSpoils(c, r); applyOption(c, D(c, draftOffers(c), fr)); if (isShopNow(c)) { S(c, fr); leaveShop(c); } return rollout4(c, D, F, S, R, rr); });
        spoilD.push({ spread: Math.abs(v[0] - v[1]), pair: sp.join('/'), best: v[0] >= v[1] ? sp[0] : sp[1], worst: v[0] >= v[1] ? sp[1] : sp[0] });
      }
      takeSpoils(run, SPOILS.greedy(run, run.pendingSpoils, fr));
    }
    if (run.over) break;
    applyOption(run, D(run, draftOffers(run), fr));
    if (isShopNow(run)) { S(run, fr); leaveShop(run); }
  }
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
console.log(`forks n=${forkD.length} (R=${R}): elite - safe avg ${(100 * avg(forkD.map((x) => x.d))).toFixed(1)} pts; elite better ${(100 * forkD.filter((x) => x.d > 0).length / forkD.length).toFixed(0)}%; |diff|<2pts ${(100 * forkD.filter((x) => Math.abs(x.d) < 0.02).length / forkD.length).toFixed(0)}%; avg |diff| ${(100 * avg(forkD.map((x) => Math.abs(x.d)))).toFixed(1)}`);
for (const [lo, hi] of [[0, 0.5], [0.5, 0.7], [0.7, 0.9], [0.9, 1.01]]) { const x = forkD.filter((f) => f.hp >= lo && f.hp < hi); console.log(`  HP [${lo},${hi}) n=${x.length} elite-safe ${(100 * avg(x.map((f) => f.d))).toFixed(1)}`); }
for (const dp of [1, 2, 3]) { const x = forkD.filter((f) => f.depth === dp); console.log(`  fork F${dp + 1} n=${x.length} elite-safe ${(100 * avg(x.map((f) => f.d))).toFixed(1)}, better ${(100 * x.filter((f) => f.d > 0).length / Math.max(1, x.length)).toFixed(0)}%`); }
const byA: Record<string, number[]> = {}; for (const f of forkD) (byA[f.arch.split('>')[0]] ??= []).push(f.d);
console.log('  by elite archetype: ' + Object.entries(byA).map(([k, v]) => `${k} ${(100 * avg(v)).toFixed(1)} (n=${v.length})`).join(', '));
console.log(`spoils n=${spoilD.length}: avg spread ${(100 * avg(spoilD.map((s) => s.spread))).toFixed(1)} pts; trivial(<2) ${(100 * spoilD.filter((s) => s.spread < 0.02).length / spoilD.length).toFixed(0)}%`);
const wins: Record<string, [number, number]> = {}; for (const s of spoilD) { (wins[s.best] ??= [0, 0])[0]++; wins[s.best][1]++; (wins[s.worst] ??= [0, 0])[1]++; }
console.log('  spoils relic best%: ' + Object.entries(wins).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]).map(([k, [w, n]]) => `${k} ${(100 * w / n).toFixed(0)}%(${n})`).join(' '));
