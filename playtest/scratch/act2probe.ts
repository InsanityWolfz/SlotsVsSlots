// Act 2 probe: per-archetype HP lost / turns in act 2, plus sweeps of the act-2 HP curve and the Mirror.
//   npx tsx playtest/scratch/act2probe.ts [runs]
import { defaultConfig } from '../../src/core/config';
import { TUNE } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { applyOption, chooseEnemy, createRun, draftOffers, finishFight, fightConfig, isShopNow, needsChoice, takeLegend, takeSpoils } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { greedyValue, simulateRuns } from '../../src/sim/simulateRun';

const runs = Number(process.argv[2] ?? 600);
const base = defaultConfig();

function probe() {
  const stats: Record<string, { n: number; lost: number; turns: number; deaths: number }> = {};
  const rng = new Rng(99);
  for (let i = 0; i < runs; i++) {
    const run = createRun(base, rng.int(0xffffffff));
    while (!run.over) {
      if (needsChoice(run)) chooseEnemy(run, rng.int(run.paths[run.depth].length));
      const e = run.enemies[run.depth];
      const before = run.player.hp;
      const f = new Fight(fightConfig(run, base), rng.int(0xffffffff));
      while (!f.over && f.turn < 2000) f.step();
      const act = run.act;
      finishFight(run, f);
      if (act === 2) {
        const s = (stats[e.archetype] ??= { n: 0, lost: 0, turns: 0, deaths: 0 });
        s.n++;
        s.lost += before - f.sides.player.hp;
        s.turns += f.turn;
        if (f.winner !== 'player') s.deaths++;
      }
      if (run.over) break;
      if (run.pendingLegend) {
        takeLegend(run, run.pendingLegend[0]);
        run.pendingLegend = null;
        continue;
      }
      if (run.pendingSpoils) takeSpoils(run, run.pendingSpoils[0]);
      const offers = draftOffers(run);
      applyOption(run, offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a)));
      void isShopNow;
    }
  }
  for (const [k, s] of Object.entries(stats))
    console.log(`${k.padEnd(8)} n ${String(s.n).padStart(4)}  hp lost ${(s.lost / s.n).toFixed(1).padStart(5)}  turns ${(s.turns / s.n).toFixed(1).padStart(5)}  deaths ${((100 * s.deaths) / s.n).toFixed(0)}%`);
}

probe();
if (process.argv.includes('--sweep')) {
  for (const mul of [1, 1.3, 1.6])
    for (const mh of [70, 90, 110]) {
      TUNE.act2Mul = mul;
      TUNE.mirrorHp = mh;
      const g = simulateRuns(base, runs, 'greedy', 4242);
      const r = simulateRuns(base, runs, 'random', 4242);
      console.log(
        `act2Mul ${mul} mirror ${mh}: greedy ${g.winPct.toFixed(1)}% (act1 ${g.act1Pct.toFixed(0)}, mirror win ${g.mirrorWinPct.toFixed(0)}, B-deaths ${g.deathsAtDepth.slice(6, 11).reduce((a, b) => a + b, 0).toFixed(0)}%)  random ${r.winPct.toFixed(1)}%`,
      );
    }
}
