// Iteration-9 playtest helpers: it8_lib + counter-enemy instrumentation (GROUNDER / COUNTERFEITER) and
// build-aware fork policies (dodge or face the counter to your build). Package P is in the real code.
import type { Enh } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { CABINETS } from '../../src/core/cabinets';
import type { RunState } from '../../src/core/run';
import { buildOf, FORKS, type FightRec } from './it8_lib';

export * from './it8_lib';

/** Per-fight counter-enemy stats, keyed by Fight instance (read after the fight). */
export interface CounterStats { grounded: number; groundedSpecials: number; groundedBlocked: number; earth: number; faked: number; fakedSpins: number; laundered: number; specials: number; specialDmg: number }
export const CSTATS = new WeakMap<Fight, CounterStats>();
const origStep = Fight.prototype.step;
(Fight.prototype as any).step = function (this: Fight) {
  const res = origStep.call(this);
  let s = CSTATS.get(this);
  if (!s) CSTATS.set(this, (s = { grounded: 0, groundedSpecials: 0, groundedBlocked: 0, earth: 0, faked: 0, fakedSpins: 0, laundered: 0, specials: 0, specialDmg: 0 }));
  for (const ev of res.events as any[]) {
    if (ev.type === 'ground' && ev.to === 'player') s.grounded += ev.cells.length;
    if (ev.type === 'fake' && ev.to === 'player') s.faked += ev.cells.length;
    if (ev.type === 'earth' && ev.to === 'player') s.earth += ev.amount;
    if (ev.type === 'gulp') s.laundered += ev.chips;
    if (ev.type === 'specialFire' && ev.from === 'player') { s.specials++; s.specialDmg += ev.hpDamage; if (ev.grounded) { s.groundedSpecials++; s.groundedBlocked += ev.blocked; } }
    if (ev.type === 'spin' && ev.side === 'player' && this.sides.player.reels.some((r) => r.cells[r.stop]?.faked)) s.fakedSpins++;
  }
  return res;
};

/** Which counter-enemy answers this run's build (null = neither really bites). */
export function counterOf(run: RunState): 'grounder' | 'counterfeiter' | null {
  const g = run.player.gilded;
  const n = (e: Enh) => g.filter((x) => x.enh === e).length;
  const spec = run.cabinet === 'tesla' || n('charged') >= 2 || n('blaze') >= 2 || run.player.relics.includes('rod') || run.player.relics.includes('overcharge');
  if (spec) return 'grounder';
  if (g.length >= 3) return 'counterfeiter';
  return null;
}
const fork = (run: RunState) => run.paths[run.depth];
/** dodge: greedy, but never walk into the counter to your build if the other road is open. */
FORKS.dodge = (run, rng) => {
  const i = FORKS.greedy(run, rng);
  if (run.act < 2) return i;
  const c = counterOf(run), opts = fork(run);
  if (c && opts[i].archetype === c && opts.length > 1) return 1 - i;
  return i;
};
/** face: always take the counter to your build when offered (worst case for the build). */
FORKS.face = (run, rng) => {
  const i = FORKS.greedy(run, rng);
  if (run.act < 2) return i;
  const c = counterOf(run), opts = fork(run);
  const j = opts.findIndex((e) => e.archetype === c);
  return j >= 0 ? j : i;
};
/** anyCounter: take any grounder/counterfeiter when offered (to measure them directly). */
FORKS.counter = (run, rng) => {
  const i = FORKS.greedy(run, rng);
  if (run.act < 2) return i;
  const j = fork(run).findIndex((e) => e.archetype === 'grounder' || e.archetype === 'counterfeiter');
  return j >= 0 ? j : i;
};
export const buildLabel = (run: RunState) => buildOf(run) ?? 'none';
export const cabHp = (c: string) => (CABINETS as any)[c].hp;
export const lostFrac = (f: FightRec) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp;
/** Paired difference mean ± standard error. */
export function pairedDiff(a: boolean[], b: boolean[]): [number, number] {
  const d = a.map((x, i) => (x ? 1 : 0) - (b[i] ? 1 : 0));
  const m = d.reduce((s, x) => s + x, 0) / d.length;
  const v = d.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, d.length - 1);
  return [100 * m, 100 * Math.sqrt(v / d.length)];
}
