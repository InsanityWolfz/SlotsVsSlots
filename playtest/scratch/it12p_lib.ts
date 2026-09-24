// Iteration-12 playtest helpers (reviewer): it10_lib + ACT 3 (Dealer instrumentation, act3 full runs,
// Dealer-entry snapshots, forced deals, GREEN-aware legendary pick). Package R + act 3 are real code.
import { Fight } from '../../src/core/fight';
import { createRun, fightConfig, fullSets, machinePower, mirrorCopy, type RunState } from '../../src/core/run';
import { mirrorCanUse } from '../../src/core/stakes';
import type { CabinetId } from '../../src/core/cabinets';
import type { RelicId } from '../../src/core/config';
import { BASE, cloneRun, LEGENDS, playRun, Rng, type Policy, type RunRec } from './it10_lib';

export * from './it10_lib';

/** Per-fight act 3 stats (read after the fight). */
export interface A3 {
  marks: number; markedHp: number; markedHits: number; confiscated: number; confEnhs: number; rakes: number;
  deals: Record<string, number>; firstDealTurn: number; hpFracAtFirstDeal: number; gateHeld: number; houseRulesTurn: number;
  raiseHitHp: number; raiseJackpots: number; raiseJackpotDmg: number; shuffleSwaps: number; cutCells: number;
  dealerHpTaken: number; sevenHp: number;
}
export const A3S = new WeakMap<Fight, A3>();
const origStep = Fight.prototype.step;
(Fight.prototype as any).step = function (this: any) {
  const wasRaiseE = this.raiseEnemy, wasRaiseP = this.raisePlayer, hpBefore = this.sides.enemy.hp, dealtBefore = this.dealt;
  const res = origStep.call(this);
  let s = A3S.get(this);
  if (!s) A3S.set(this, (s = { marks: 0, markedHp: 0, markedHits: 0, confiscated: 0, confEnhs: 0, rakes: 0, deals: {}, firstDealTurn: -1, hpFracAtFirstDeal: -1, gateHeld: 0, houseRulesTurn: -1, raiseHitHp: 0, raiseJackpots: 0, raiseJackpotDmg: 0, shuffleSwaps: 0, cutCells: 0, dealerHpTaken: 0, sevenHp: 0 }));
  for (const ev of res.events as any[]) {
    if (ev.type === 'mark' && ev.to === 'player') s.marks += ev.cells.length;
    if (ev.type === 'markedHit' && ev.side === 'player') { s.markedHp += ev.hpDamage; s.markedHits++; }
    if (ev.type === 'confiscate' && ev.to === 'player') { s.confiscated += ev.cells.length; s.confEnhs += ev.enhs.length; }
    if (ev.type === 'rake' && ev.to === 'player') s.rakes++;
    if (ev.type === 'shuffle') { s.deals.shuffle = (s.deals.shuffle ?? 0) + 1; s.shuffleSwaps += ev.swaps.length; }
    if (ev.type === 'cut') { s.deals.cut = (s.deals.cut ?? 0) + 1; s.cutCells += ev.cells.length; }
    if (ev.type === 'raise') s.deals.raise = (s.deals.raise ?? 0) + 1;
    if (ev.type === 'houseRules') s.houseRulesTurn = this.turn;
    if (ev.type === 'attack' && ev.from === 'enemy' && wasRaiseE && !this.raiseEnemy && ev.note !== 'reflect') s.raiseHitHp += ev.hpDamage;
    if (ev.type === 'attack' && ev.from === 'player' && this.isDealer) s.dealerHpTaken += ev.hpDamage;
  }
  if (this.isDealer && !dealtBefore && this.dealt) { s.firstDealTurn = this.turn; s.hpFracAtFirstDeal = this.sides.enemy.hp / this.sides.enemy.maxHp; }
  if (this.isDealer && !dealtBefore && res.side === 'player' && this.sides.enemy.hp === Math.floor(this.sides.enemy.maxHp / 2) && hpBefore > this.sides.enemy.hp) s.gateHeld++;
  if (this.isDealer && wasRaiseP && !this.raisePlayer && res.side === 'player') s.raiseJackpots++;
  return res;
};

/** Full act3-enabled runs at a stake, paired by index across stakes. */
export function fullRuns3(cab: CabinetId, pol: Policy, N: number, stake = 2, act3 = true, seed = 4242): RunRec[] {
  const seeds = new Rng(seed);
  const out: RunRec[] = [];
  for (let i = 0; i < N; i++) { const s = seeds.int(0xffffffff); out.push(playRun(0, cab, pol, new Rng(s ^ 0x5bd1e995), createRun(BASE, s, cab, stake, act3))); }
  return out;
}

class Snap { constructor(public run: RunState) {} }
/** Snapshot runs at a given (act, depth) fight entry. */
export function snapsAt(cab: CabinetId, N: number, pol: Policy, stake: number, act: number, depth: number, seed = 777): RunState[] {
  const seeds = new Rng(seed + cab.length);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    const s = seeds.int(0xffffffff);
    try { playRun(0, cab, { ...pol, hooks: { preFight: (run) => { if (run.act === act && run.depth === depth) throw new Snap(cloneRun(run)); } } }, new Rng(s ^ 0x5bd1e995), createRun(BASE, s, cab, stake, true)); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}

/** Force the Dealer's cards: 'shuffle' | 'cut' | 'raise' | 'none' (it still counts as dealt) | null (normal). */
let FORCE: string | null = null;
export const forceDeal = (c: string | null) => { FORCE = c; };
const origDeal = (Fight.prototype as any).deal;
(Fight.prototype as any).deal = function (this: any, me: any, foe: any, events: any[]) {
  if (!FORCE) return origDeal.call(this, me, foe, events);
  if (FORCE === 'none') { this.dealt = true; return; }
  this.nextDeal = FORCE;
  return origDeal.call(this, me, foe, events);
};

/** Play one fight from a snapshot (the run isn't changed). */
export function fightFrom(run: RunState, seed: number): Fight {
  const f = new Fight(fightConfig(run, BASE), seed);
  while (!f.over && f.turn < 3000) f.step();
  return f;
}
export const isSetBuild = (run: RunState) => fullSets(run.player.gilded, run.player.relics).size > 0;
export { machinePower, mirrorCopy };

/** GREEN-aware legendary pick: best value among legendaries the Mirror can't use; else value. */
const LEG_VALUE: Record<string, number> = { ticket: 8, bell: 8, phoenix: 9, overcharge: 9.5, key: 9, sandglass: 8.5 };
LEGENDS.greenAware = (run, offer, rng) => {
  if (run.stake < 2) return LEGENDS.value(run, offer, rng);
  const safe = offer.filter((x) => !mirrorCanUse(x as RelicId));
  return safe.length ? safe.reduce((a, b) => ((LEG_VALUE[b] ?? 0) > (LEG_VALUE[a] ?? 0) ? b : a)) : LEGENDS.value(run, offer, rng);
};
LEGENDS.copyOnly = (run, offer, rng) => {
  const c = offer.filter((x) => mirrorCanUse(x as RelicId));
  return c.length ? c.reduce((a, b) => ((LEG_VALUE[b] ?? 0) > (LEG_VALUE[a] ?? 0) ? b : a)) : LEGENDS.value(run, offer, rng);
};
