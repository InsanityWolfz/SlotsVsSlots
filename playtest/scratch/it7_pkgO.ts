// Package O candidates from identical B1 snapshots: Mirror HP formula x REFLECTION cap, across policies
// (commit / notier / hpfirst / random draft / elite2).   npx tsx playtest/scratch/it7_pkgO.ts [N]
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { avg, cloneRun, CABINET_ORDER, DRAFTS, machinePower, playRun, Rng, type Policy } from './it7_lib';
import { cappedPower } from './it7_power';
const N = Number(process.argv[2] ?? 500);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(31337 + cab.length), rng = new Rng(4); const out: RunState[] = [];
  for (let i = 0; i < N; i++) { try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); } catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; } }
  return out;
}
const hpFirst: Policy = { ...base, draft: (run, offers, rng) => offers.find((o) => o.kind === 'maxHp') ?? offers.find((o) => o.kind === 'heal' && run.player.hp < run.player.maxHp * 0.8) ?? DRAFTS.commit(run, offers, rng) };
const POLS: Record<string, Policy> = {
  commit: base,
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  hpfirst: hpFirst,
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
};
type V = { hp: (r: RunState) => number; cap: (r: RunState) => number };
const VARIANTS: Record<string, V> = {
  'now: 3P+55, cap 20': { hp: (r) => 3 * machinePower(r) + 55, cap: () => 20 },
  'typical 4c+55, cap 20': { hp: (r) => 4 * cappedPower(r, 20).power + 55, cap: () => 20 },
  'now, cap 60% maxHP': { hp: (r) => 3 * machinePower(r) + 55, cap: (r) => Math.round(0.6 * r.player.maxHp) },
  'typical 4c+55, cap 60%': { hp: (r) => 4 * cappedPower(r, 20).power + 55, cap: (r) => Math.round(0.6 * r.player.maxHp) },
  'typical 4c+45, cap 60%': { hp: (r) => 4 * cappedPower(r, 20).power + 45, cap: (r) => Math.round(0.6 * r.player.maxHp) },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab);
for (const [vn, v] of Object.entries(VARIANTS)) {
  const cells: string[] = []; let byCab = '';
  for (const [pn, pol] of Object.entries(POLS)) {
    const vals: number[] = [], mw: number[] = [];
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, mwin = 0;
      snaps[cab].forEach((s, i) => {
        const hooks = { preFight: (run: RunState, f: Fight) => { if (f.isMirror) { f.sides.enemy.hp = f.sides.enemy.maxHp = Math.round(v.hp(run)); f.sides.enemy.ability = { ...f.sides.enemy.ability!, power: v.cap(run) }; } } };
        const r = playRun(0, s.cabinet, { ...pol, hooks }, new Rng(9000 + i), cloneRun(s));
        if (r.won) w++; if (r.hpIntoMirror >= 0) { mr++; if (r.won) mwin++; }
      });
      vals.push((100 * w) / snaps[cab].length); mw.push((100 * mwin) / Math.max(1, mr));
    }
    cells.push(`${pn} ${avg(vals).toFixed(1)}/${avg(mw).toFixed(0)}`);
    if (pn === 'commit') byCab = CABINET_ORDER.map((c, i) => `${c} ${vals[i].toFixed(0)}`).join(' ');
  }
  console.log(`${vn.padEnd(24)} ${cells.join('  ')}  | commit ${byCab}`);
}
