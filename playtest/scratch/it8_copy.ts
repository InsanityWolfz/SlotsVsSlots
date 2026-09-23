// What should the Mirror copy? Variants of the Mirror's gild copy, from identical B1 snapshots, several policies.
//   npx tsx playtest/scratch/it8_copy.ts [N]
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, capOf, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 600);
const POLS: Record<string, Policy> = {
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  hpfirst: { draft: 'hpfirst', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
  safe2: { draft: 'commit', fork: 'safe2', shop: 'commit', legend: 'value' },
};
type V = (f: Fight, run: RunState) => void;
const strip = (f: Fight, pred: (c: any) => boolean) => { for (const reel of f.sides.enemy.reels) for (const c of reel.cells as any[]) if (c.enh && pred(c)) { delete c.enh; delete c.tier; } };
const flatHp = (d: number): V => (f) => { f.sides.enemy.hp = f.sides.enemy.maxHp = f.sides.enemy.maxHp + d; };
const VARS: Record<string, V> = {
  real: () => {},
  plainCopy: (f) => { for (const reel of f.sides.enemy.reels) for (const c of reel.cells as any[]) delete c.tier; },
  noGoldKeen: (f) => strip(f, (c) => c.enh === 'gold' || c.enh === 'keen'),
  noGoldKeen_m20: (f, r) => { strip(f, (c) => c.enh === 'gold' || c.enh === 'keen'); flatHp(20)(f, r); },
  noCopy: (f) => strip(f, () => true),
  noCopy_p30: (f, r) => { strip(f, () => true); flatHp(30)(f, r); },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const [vn, v] of Object.entries(VARS)) {
  const cells: string[] = []; let byCab = '', refl = '';
  for (const [pn, pol] of Object.entries(POLS)) {
    const vals: number[] = [], mw: number[] = []; const reflects: { x: number; cap: number }[] = []; let fired = 0, mf = 0;
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, mwin = 0;
      snaps[cab].forEach((s, i) => {
        const hooks = { preFight: (run: RunState, f: Fight) => { if (f.isMirror) v(f, run); } };
        const r = playRun(0, s.cabinet, { ...pol, hooks }, new Rng(9000 + i), cloneRun(s));
        if (r.won) w++; if (r.hpIntoMirror >= 0) { mr++; if (r.won) mwin++; }
        if (pn === 'commit') for (const f of r.fights) if (f.boss && f.act === 2) { mf++; if (f.reflects.length) fired++; for (const x of f.reflects) reflects.push({ x, cap: capOf(f) }); }
      });
      vals.push((100 * w) / snaps[cab].length); mw.push((100 * mwin) / Math.max(1, mr));
    }
    cells.push(`${pn} ${avg(vals).toFixed(1)}/${avg(mw).toFixed(0)}`);
    if (pn === 'commit') { byCab = CABINET_ORDER.map((c, i) => `${c.slice(0, 2)} ${vals[i].toFixed(0)}(${mw[i].toFixed(0)})`).join(' '); refl = `refl>=1 ${(100 * fired / mf).toFixed(0)}% atCap ${(100 * reflects.filter((r) => r.x >= r.cap).length / reflects.length).toFixed(0)}%`; }
  }
  console.log(`${vn.padEnd(15)} ${cells.join('  ')}\n                commit by cab: ${byCab}  ${refl}`);
}
