// Act 2 elite fixes: elite2 - safe2 from identical B1 snapshots.   npx tsx playtest/scratch/it7_elitefix.ts [N]
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { avg, cloneRun, CABINET_ORDER, DRAFTS, playRun, Rng, type Policy } from './it7_lib';
const N = Number(process.argv[2] ?? 500);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(31337 + cab.length), rng = new Rng(4); const out: RunState[] = [];
  for (let i = 0; i < N; i++) { try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); } catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; } }
  return out;
}
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab);
type Fix = { hpMul?: number; dropRelic?: number };
const FIXES: Record<string, Fix> = { now: {}, 'elite HP x1.5 (was 1.25)': { hpMul: 1.5 / 1.25 }, 'elite HP x1.75': { hpMul: 1.75 / 1.25 }, 'no relic spoils in act 2 (chips only)': { dropRelic: 1 }, 'x1.5 HP + spoils 50%': { hpMul: 1.2, dropRelic: 0.5 } };
for (const [fn, fx] of Object.entries(FIXES)) {
  const res: Record<string, number[]> = { elite2: [], safe2: [] };
  for (const fork of ['elite2', 'safe2']) for (const cab of CABINET_ORDER) {
    let w = 0;
    snaps[cab].forEach((s, i) => {
      const rng = new Rng(5 + i);
      let lastElite2 = false;
      const draft = (run: RunState, offers: any, r: Rng) => {
        if (lastElite2 && fx.dropRelic && rng.next() < fx.dropRelic) run.player.relics.pop();
        return DRAFTS.commit(run, offers, r);
      };
      const hooks = { preFight: (run: RunState, f: Fight) => { const e = run.enemies[run.depth]; lastElite2 = run.act === 2 && !!e.elite; if (lastElite2 && fx.hpMul) f.sides.enemy.hp = f.sides.enemy.maxHp = Math.round(f.sides.enemy.maxHp * fx.hpMul); } };
      if (playRun(0, s.cabinet, { ...base, fork, draft, hooks }, new Rng(9000 + i), cloneRun(s)).won) w++;
    });
    res[fork].push((100 * w) / snaps[cab].length);
  }
  console.log(`${fn.padEnd(40)} elite2 ${avg(res.elite2).toFixed(1)}  safe2 ${avg(res.safe2).toFixed(1)}  diff ${(avg(res.elite2) - avg(res.safe2)).toFixed(1)}`);
}
