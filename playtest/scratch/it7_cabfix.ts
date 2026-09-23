// Cabinet levers for act 2 spread, from identical B1 snapshots (commit).  npx tsx playtest/scratch/it7_cabfix.ts [N]
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { cloneRun, CABINET_ORDER, machinePower, pct, playRun, Rng, type Policy } from './it7_lib';
import { cappedPower } from './it7_power';
const N = Number(process.argv[2] ?? 600);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(31337 + cab.length), rng = new Rng(4); const out: RunState[] = [];
  for (let i = 0; i < N; i++) { try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); } catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; } }
  return out;
}
const rodAware = (run: RunState, f: Fight) => { if (f.isMirror) f.sides.enemy.hp = f.sides.enemy.maxHp = Math.round(3 * cappedPower(run, 999).power + 55); };
const V: Record<string, { mut?: (r: RunState) => void; hook?: (r: RunState, f: Fight) => void }> = {
  base: {},
  '+4 maxHP at act 2': { mut: (r) => { r.player.maxHp += 4; r.player.hp += 4; } },
  '+6 maxHP at act 2': { mut: (r) => { r.player.maxHp += 6; r.player.hp += 6; } },
  'rod/battery-aware Mirror HP': { hook: rodAware },
};
for (const cab of CABINET_ORDER) {
  const snaps = snapshots(cab);
  const cells = Object.entries(V).map(([k, v]) => {
    let w = 0;
    snaps.forEach((s, i) => { const r0 = cloneRun(s); v.mut?.(r0); if (playRun(0, r0.cabinet, { ...base, hooks: v.hook ? { preFight: v.hook } : undefined }, new Rng(9000 + i), r0).won) w++; });
    return `${k} ${pct(w, snaps.length)}`;
  });
  console.log(`${cab.padEnd(7)} ${cells.join(' | ')}`);
}
void machinePower;
