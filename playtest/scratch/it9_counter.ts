// Counter-enemies under a controlled experiment: from identical B1 snapshots (commit through act 1),
// fight ONE act 2 regular enemy at depth d (not elite) and compare archetypes, by cabinet and by build.
//   npx tsx playtest/scratch/it9_counter.ts [N] [depth]
import { Fight } from '../../src/core/fight';
import { fightConfig } from '../../src/core/run';
import { ARCHETYPES, actsOf, makeEnemy } from '../../src/core/enemies';
import { BASE, CABINET_ORDER, CSTATS, counterOf, pct, avg, Rng, snapshots } from './it9_lib';

const N = Number(process.argv[2] ?? 800);
const D = Number(process.argv[3] ?? 2);
const A2 = ARCHETYPES.filter((a) => actsOf(a).includes(2));
type R = { won: boolean; lost: number; turns: number; s: any; build: string };
const all: Record<string, Record<string, R[]>> = {};
for (const cab of CABINET_ORDER) {
  const snaps = snapshots(cab, N, 777);
  all[cab] = {};
  for (const a of A2) {
    const out: R[] = [];
    snaps.forEach((s, i) => {
      const run = JSON.parse(JSON.stringify(s));
      const rng = new Rng(9000 + i);
      const e = makeEnemy(a, D, rng, false, 2);
      run.depth = D; run.enemies[D] = e; run.chosen[D] = true;
      const f = new Fight(fightConfig(run, BASE), 5000 + i);
      while (!f.over && f.turn < 2000) f.step();
      out.push({ won: f.winner === 'player', lost: (run.player.hp - Math.max(0, f.sides.player.hp)) / run.player.maxHp, turns: f.turn, s: CSTATS.get(f), build: counterOf(run) ?? 'none' });
    });
    all[cab][a.id] = out;
  }
}
console.log(`single act 2 fight at depth ${D} (B${D + 1}, regular HP) from B1 snapshots. death% / hp lost% / turns`);
console.log('cabinet  ' + A2.map((a) => a.id.padEnd(20)).join(''));
for (const cab of CABINET_ORDER) {
  console.log(cab.padEnd(9) + A2.map((a) => { const x = all[cab][a.id]; return `${pct(x.filter((r) => !r.won).length, x.length)}/${(100 * avg(x.map((r) => r.lost))).toFixed(0)}/${avg(x.map((r) => r.turns)).toFixed(0)}`.padEnd(20); }).join(''));
}
console.log('\nby build class (counterOf): hp lost %  (n)');
for (const b of ['grounder', 'counterfeiter', 'none']) {
  const row = A2.map((a) => { const x = CABINET_ORDER.flatMap((c) => all[c][a.id].filter((r) => r.build === b)); return `${(100 * avg(x.map((r) => r.lost))).toFixed(1)} d${pct(x.filter((r) => !r.won).length, x.length)}`.padEnd(20); });
  console.log(`${b.padEnd(14)} n ${CABINET_ORDER.flatMap((c) => all[c].grounder.filter((r) => r.build === b)).length}  ${row.join('')}`);
}
console.log('\ncounter mechanics (per fight averages):');
for (const id of ['grounder', 'counterfeiter']) for (const cab of CABINET_ORDER) {
  const x = all[cab][id].map((r) => r.s).filter(Boolean);
  console.log(`${id.padEnd(14)} ${cab.padEnd(7)} rods ${avg(x.map((s) => s.grounded)).toFixed(1)} specials ${avg(x.map((s) => s.specials)).toFixed(1)} grounded specials ${avg(x.map((s) => s.groundedSpecials)).toFixed(2)} blocked ${avg(x.map((s) => s.groundedBlocked)).toFixed(1)} earth ${avg(x.map((s) => s.earth)).toFixed(1)} | fakes ${avg(x.map((s) => s.faked)).toFixed(1)} fakedSpins ${avg(x.map((s) => s.fakedSpins)).toFixed(1)} laundered ${avg(x.map((s) => s.laundered)).toFixed(1)}`);
}
