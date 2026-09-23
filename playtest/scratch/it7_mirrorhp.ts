// Package O candidates for the Mirror's HP (the "Mirror tax"): replay act 2 from identical B1 snapshots
// with different Mirror HP formulas and policies.   npx tsx playtest/scratch/it7_mirrorhp.ts [N]
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { avg, cloneRun, CABINET_ORDER, machinePower, playRun, Rng, type Policy } from './it7_lib';

const N = Number(process.argv[2] ?? 600);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(31337 + cab.length), rng = new Rng(4);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) { const c = cloneRun(run); (c as any).p0 = machinePower(run); (c as any).r0 = run.player.relics.length; throw new Snap(c); } } } }, rng); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}
type F = (run: RunState) => number;
const FORMULAS: Record<string, F> = {
  'now 3P+55': (r) => Math.round(3 * machinePower(r) + 55),
  'frozen 3P0+55': (r) => Math.round(3 * (r as any).p0 + 55),
  'frozen 3P0+65': (r) => Math.round(3 * (r as any).p0 + 65),
  'frozen 3P0+45+3/relic': (r) => Math.round(3 * (r as any).p0 + 45 + 3 * r.player.relics.length),
  'sqrt 30vP': (r) => Math.round(30 * Math.sqrt(machinePower(r))),
  'half 1.5P+85': (r) => Math.round(1.5 * machinePower(r) + 85),
  '1.5P0+1.5P+55': (r) => Math.round(1.5 * (r as any).p0 + 1.5 * machinePower(r) + 55),
};
const POLS: Record<string, Policy> = {
  commit: base,
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab);
for (const [fn, f] of Object.entries(FORMULAS)) {
  const cells: string[] = [];
  const perCab: Record<string, number> = {};
  const hps: number[] = [];
  for (const [pn, pol] of Object.entries(POLS)) {
    const vals: number[] = []; const mw: number[] = [];
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, mwin = 0;
      snaps[cab].forEach((s, i) => {
        const hooks = { preFight: (run: RunState, fight: Fight) => { if (fight.isMirror) { const hp = f(run); fight.sides.enemy.hp = fight.sides.enemy.maxHp = hp; if (pn === 'commit') hps.push(hp); } } };
        const r = playRun(0, s.cabinet, { ...pol, hooks }, new Rng(9000 + i), cloneRun(s));
        if (r.won) w++;
        if (r.hpIntoMirror >= 0) { mr++; if (r.won) mwin++; }
      });
      const v = (100 * w) / snaps[cab].length;
      vals.push(v); mw.push((100 * mwin) / Math.max(1, mr));
      if (pn === 'commit') perCab[cab] = v;
    }
    cells.push(`${pn} ${avg(vals).toFixed(1)}/${avg(mw).toFixed(0)}`);
  }
  console.log(`${fn.padEnd(24)} ${cells.join('  ')}  | commit by cab ${CABINET_ORDER.map((c) => `${c} ${perCab[c].toFixed(1)}`).join(' ')}  | mirrorHP avg ${avg(hps).toFixed(0)}`);
}
