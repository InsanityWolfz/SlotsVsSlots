// Candidate replacement stake rules (reviewer monkeypatches), each ALONE vs base, commit, full runs, paired seeds.
//   npx tsx playtest/scratch/it10_alt.ts [N]
import { avg, CABINET_ORDER, fullRuns, onlyRules, pairedDiff, pct, P, type Policy, type RunRec } from './it10_lib';
import { LEGENDARY } from '../../src/core/relics';

const N = Number(process.argv[2] ?? 1500);
const W = (rs: RunRec[]) => rs.map((r) => r.won);
const sd = (d: [number, number]) => `${d[0] >= 0 ? '+' : ''}${d[0].toFixed(1)}±${d[1].toFixed(1)}`;
const hooked = (preFight: (run: any, fight: any) => void): Policy => ({ ...P.commit, hooks: { preFight } });

// SCARS: every 2nd fight you win leaves a permanent rock on your reel with the most bolts/swords (like a curse card).
let scarEvery = 2;
const scars = hooked((run) => {
  const n = run.records.length;
  if (n > 0 && n % scarEvery === 0 && !run._scar?.[n]) {
    (run._scar ??= {})[n] = 1;
    const r = [0, 1, 2].reduce((b, i) => ((run.player.strips[i].sword ?? 0) > (run.player.strips[b].sword ?? 0) ? i : b), 0);
    run.player.strips[r].rock = (run.player.strips[r].rock ?? 0) + 1;
  }
});
// LEGEND MIRROR: the Mirror copies your act 2 legendary (whatever it is).
const legend = hooked((run, fight) => {
  if (fight.cfg.enemy.boss !== 'mirror') return;
  const l = run.player.relics.find((r: any) => LEGENDARY.has(r));
  if (l) fight.sides.enemy.relics.add(l);
});
// ELITE COUNTERS: RED as now, and the counter comes in at elite HP (x1.3), no chips.
const eliteCounter = hooked((run, fight) => {
  if (run.act < 2 || run.depth === 0 || fight.cfg.enemy.boss) return;
  const a = run.enemies[run.depth].archetype;
  if ((a === 'grounder' || a === 'counterfeiter') && !run.enemies[run.depth].elite) { fight.sides.enemy.hp = Math.round(fight.sides.enemy.hp * 1.3); fight.sides.enemy.maxHp = fight.sides.enemy.hp; }
});

console.log(`candidate stake rules alone vs base (stake 1, all shipped rules off), commit, N ${N}`);
for (const cab of CABINET_ORDER) {
  onlyRules([]); const base = fullRuns(cab, P.commit, N, 1);
  const cells: string[] = [];
  scarEvery = 2; cells.push(`scars/2 ${sd(pairedDiff(W(fullRuns(cab, scars, N, 1)), W(base)))}`);
  scarEvery = 3; cells.push(`scars/3 ${sd(pairedDiff(W(fullRuns(cab, scars, N, 1)), W(base)))}`);
  const lg = fullRuns(cab, legend, N, 1);
  cells.push(`legendMirror ${sd(pairedDiff(W(lg), W(base)))}`);
  onlyRules(['counterForks']); cells.push(`red+eliteCounter ${sd(pairedDiff(W(fullRuns(cab, eliteCounter, N, 1)), W(base)))}`);
  onlyRules(['mirrorRelic']); cells.push(`(shipped green ${sd(pairedDiff(W(fullRuns(cab, P.commit, N, 1)), W(base)))})`);
  console.log(`${cab.padEnd(7)} base ${pct(base.filter((r) => r.won).length, N)}  ${cells.join('  ')}`);
  // legendary value under legendMirror: win rate by legend taken
  const by: Record<string, boolean[]> = {};
  for (const r of lg) if (r.legend) (by[r.legend] ??= []).push(r.won);
  const byB: Record<string, boolean[]> = {};
  for (const r of base) if (r.legend) (byB[r.legend] ??= []).push(r.won);
  console.log(`        win by legend (base -> legendMirror): ${Object.keys(byB).map((k) => `${k} ${pct(byB[k].filter(Boolean).length, byB[k].length)}->${by[k] ? pct(by[k].filter(Boolean).length, by[k].length) : '-'}`).join('  ')}`);
}
onlyRules(null);
