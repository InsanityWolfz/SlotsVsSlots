// Iteration-8 playtest helpers: it7_lib (tier-aware commit etc.) + HP-first drafts, B1 snapshots and
// Mirror stats. Package O is in the real code now: no preFight emulation hooks. Reviewer scratch.
import type { RunState } from '../../src/core/run';
import { REFLECT_CAP, REFLECT_MIN } from '../../src/core/relics';
import { DRAFTS, playRun, Rng, pct, avg, type FightRec, type Policy } from './it7_lib';

export * from './it7_lib';

DRAFTS.hpfirst = (run, offers, rng) =>
  offers.find((o) => o.kind === 'maxHp') ?? offers.find((o) => o.kind === 'heal' && run.player.hp < run.player.maxHp * 0.8) ?? DRAFTS.commit(run, offers, rng);

export const P = {
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' } as Policy,
};

class Snap { constructor(public run: RunState) {} }
export const cloneRun = (r: RunState): RunState => JSON.parse(JSON.stringify(r));
/** Play commit through act 1 (+ legendary + intro Cashier) and snapshot at B1. */
export function snapshots(cab: any, N: number, seed = 31337, pol: Policy = P.commit): RunState[] {
  const seeds = new Rng(seed + cab.length), rng = new Rng(4);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    try { playRun(seeds.int(0xffffffff), cab, { ...pol, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}
export const capOf = (f: FightRec) => Math.max(REFLECT_MIN, Math.round(f.maxHp * REFLECT_CAP));
export function mirrorLine(ms: FightRec[]): string {
  const refl = ms.flatMap((f) => f.reflects.map((x) => ({ x, cap: capOf(f) })));
  return `n ${ms.length} win ${pct(ms.filter((f) => f.won).length, ms.length)}% refl>=1 ${pct(ms.filter((f) => f.reflects.length >= 1).length, ms.length)}% >=2 ${pct(ms.filter((f) => f.reflects.length >= 2).length, ms.length)}% atCap ${pct(refl.filter((r) => r.x >= r.cap).length, refl.length)}% meanRefl ${avg(refl.map((r) => r.x)).toFixed(1)} cap ${avg(ms.map(capOf)).toFixed(1)} HP ${avg(ms.map((f) => f.enemyHp)).toFixed(0)} turns ${avg(ms.map((f) => f.turns)).toFixed(1)}`;
}
