// Why act 2 elites pay: HP into the Mirror, relics, spoils taken.   npx tsx playtest/scratch/it7_elite2.ts [N]
import type { RunState } from '../../src/core/run';
import { avg, cloneRun, CABINET_ORDER, pct, playRun, Rng, type Policy } from './it7_lib';
const N = Number(process.argv[2] ?? 500);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
const snaps: RunState[] = [];
for (const cab of CABINET_ORDER) { const seeds = new Rng(31337 + cab.length), rng = new Rng(4); for (let i = 0; i < N; i++) { try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); } catch (e) { if (e instanceof Snap) snaps.push(e.run); else throw e; } } }
for (const fork of ['safe2', 'elite2']) {
  const mi: { hp: number; max: number; relics: number; chips: number }[] = [];
  const spoils: Record<string, number> = {};
  let w = 0;
  snaps.forEach((s, i) => {
    const hooks = { preFight: (run: RunState, f: any) => { if (f.isMirror) mi.push({ hp: run.player.hp, max: run.player.maxHp, relics: run.player.relics.length, chips: run.player.chips }); } };
    const r = playRun(0, s.cabinet, { ...base, fork, hooks }, new Rng(9000 + i), cloneRun(s));
    if (r.won) w++;
    for (const x of r.relics.filter((x) => !s.player.relics.includes(x))) spoils[x] = (spoils[x] ?? 0) + 1;
  });
  console.log(`${fork}: act2 clear ${pct(w, snaps.length)}  at Mirror: hp ${avg(mi.map((m) => m.hp)).toFixed(1)} / max ${avg(mi.map((m) => m.max)).toFixed(1)}  relics ${avg(mi.map((m) => m.relics)).toFixed(1)}  chips ${avg(mi.map((m) => m.chips)).toFixed(1)}`);
  console.log(`   act 2 relics gained: ${Object.entries(spoils).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / snaps.length).toFixed(2)}`).join(' ')}`);
}
