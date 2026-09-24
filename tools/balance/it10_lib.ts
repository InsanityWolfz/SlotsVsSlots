// Iteration-10 playtest helpers: it9_lib + HIGH STAKES (stake-aware snapshots / full runs, rule toggles).
// Package Q + HIGH STAKES are in the real code. Reviewer scratch.
import { createRun, type RunState } from '../../src/core/run';
import { STAKE } from '../../src/core/stakes';
import { BASE, cloneRun, playRun, Rng, P, type Policy, type RunRec } from './it9_lib';
import type { CabinetId } from '../../src/core/cabinets';

export * from './it9_lib';

class Snap { constructor(public run: RunState) {} }
/** Play `pol` through act 1 (+ legendary + intro Cashier) at `stake` and snapshot at B1. */
export function snapshotsAt(cab: CabinetId, N: number, seed = 777, pol: Policy = P.commit, stake = 0): RunState[] {
  const seeds = new Rng(seed + cab.length), rng = new Rng(4);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    const start = createRun(BASE, seeds.int(0xffffffff), cab, stake);
    try { playRun(0, cab, { ...pol, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng, start); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}
/** Full runs at a stake with per-run seeds shared across stakes (paired by index). */
export function fullRuns(cab: CabinetId, pol: Policy, N: number, stake = 0, seed = 4242): RunRec[] {
  const seeds = new Rng(seed);
  const out: RunRec[] = [];
  for (let i = 0; i < N; i++) { const s = seeds.int(0xffffffff); out.push(playRun(0, cab, pol, new Rng(s ^ 0x5bd1e995), createRun(BASE, s, cab, stake))); }
  return out;
}
export const STAKE_ORIG = { ...STAKE };
const RULES = ['scars', 'mirrorRelic', 'houseDirty', 'counterForks', 'fasterAct2', 'fasterAll'] as const;
/** Enable only the named rules (thresholds 1), everything else off (99). null = restore. */
export function onlyRules(rules: string[] | null) {
  if (!rules) { Object.assign(STAKE, STAKE_ORIG); return; }
  for (const k of RULES) (STAKE as any)[k] = rules.includes(k) ? 1 : 99;
}
