// Decision value via rollouts. For many real decision points, estimate run-win% after each offered card
// (rest of run played by the relic-first policy). Reports: decision spread, per-card-type delta vs the
// best option in its offer, how often each type is the best, and an oracle policy win rate.
import { applyOption, cloneRun, createRun, draftOffers, fightConfig, finishFight, Fight, optType, POLICIES, rollout, Rng, BASE } from './it1_lib';

const POINTS = Number(process.argv[2] ?? 500);
const R = Number(process.argv[3] ?? 300);
const cont = POLICIES.relicFirst;
const rng = new Rng(1234);
const seeds = new Rng(555);
const typeStats: Record<string, { n: number; best: number; deltaSum: number; winSum: number }> = {};
const spreads: number[] = [];
const byDepth: Record<number, number[]> = {};
let collected = 0;
let oracleVsGreedyGain = 0;

while (collected < POINTS) {
  const run = createRun(BASE, seeds.int(0xffffffff));
  while (!run.over && collected < POINTS) {
    const fight = new Fight(fightConfig(run, BASE), rng.int(0xffffffff));
    while (!fight.over) fight.step();
    finishFight(run, fight);
    if (run.over) break;
    const offers = draftOffers(run);
    const vals = offers.map((o) => {
      const r2 = cloneRun(run);
      applyOption(r2, o);
      return rollout(r2, cont, R, rng);
    });
    const mx = Math.max(...vals), mn = Math.min(...vals);
    spreads.push(mx - mn);
    (byDepth[run.depth] ??= []).push(mx - mn);
    offers.forEach((o, i) => {
      const t = optType(o);
      const s = (typeStats[t] ??= { n: 0, best: 0, deltaSum: 0, winSum: 0 });
      s.n++;
      s.deltaSum += vals[i] - mx;
      s.winSum += vals[i];
      if (vals[i] === mx) s.best++;
    });
    const gIdx = offers.indexOf(POLICIES.relicFirst(run, offers, rng));
    oracleVsGreedyGain += mx - vals[gIdx];
    applyOption(run, offers[vals.indexOf(mx)]); // follow the oracle path
    collected++;
  }
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
spreads.sort((a, b) => a - b);
console.log(`decision points ${POINTS}, rollouts ${R} each (SE ~${(100 * Math.sqrt(0.25 / R)).toFixed(1)} pts)`);
console.log(`spread best-worst: avg ${(100 * avg(spreads)).toFixed(1)} pts, median ${(100 * spreads[Math.floor(spreads.length / 2)]).toFixed(1)}, p90 ${(100 * spreads[Math.floor(spreads.length * 0.9)]).toFixed(1)}; share of decisions with spread <5pts: ${(100 * spreads.filter((s) => s < 0.05).length / spreads.length).toFixed(0)}%`);
console.log(`by depth (after fight N): ${Object.entries(byDepth).map(([d, xs]) => `F${d}: ${(100 * avg(xs)).toFixed(1)}`).join('  ')}`);
console.log(`relicFirst loses avg ${(100 * oracleVsGreedyGain / POINTS).toFixed(1)} pts per decision vs oracle`);
console.log('type              offered  best%  avgDeltaVsBest  avgRunWin');
for (const [t, s] of Object.entries(typeStats).sort((a, b) => b[1].deltaSum / b[1].n - a[1].deltaSum / a[1].n))
  console.log(`${t.padEnd(18)} ${String(s.n).padStart(6)} ${(100 * s.best / s.n).toFixed(0).padStart(6)} ${(100 * s.deltaSum / s.n).toFixed(1).padStart(10)} ${(100 * s.winSum / s.n).toFixed(1).padStart(10)}`);
