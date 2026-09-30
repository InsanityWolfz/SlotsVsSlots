/**
 * SIDE BETS (EXPERT_PLAYTEST_5 C1): before a regular fight, the Cashier's table offers 2 bets on how it goes.
 * Stake chips on one; the fight stays watch-only, and the bet is just a question you chose to care about.
 * Each bet's line is sized by quietly playing the fight ahead a dozen times (other seeds), so it's close to a coin flip.
 */
import { UNIT } from './config';
import type { CombatEvent } from './events';
import type { Rng } from './rng';

/** QUICK: win by your Nth spin. CLEAN: take at most N damage. JACKPOTS: land N jackpots. BIG HIT: one turn of N+ damage. */
export type BetKind = 'quick' | 'clean' | 'jackpot' | 'big';
export interface SideBet {
  kind: BetKind;
  target: number;
  /** Paid back as stake x pay. */
  pay: number;
}
export interface PlacedBet extends SideBet {
  stake: number;
}
export const BET_STAKES = [3, 6, 12] as const;
/** How many rehearsals size a bet, and the odds a line aims for. */
export const BETS = { samples: 12, aim: 0.55, hardBelow: 0.42, minP: 0.25, maxP: 0.75 };

/** What a fight has done so far, as far as the bets care. */
export interface BetTrack {
  spins: number;
  lost: number;
  jackpots: number;
  best: number;
  cur: number;
}
export const newTrack = (): BetTrack => ({ spins: 0, lost: 0, jackpots: 0, best: 0, cur: 0 });

/** Feed one combat event to a tracker (the engine and the playback both use this). */
export function trackEvent(t: BetTrack, e: CombatEvent): void {
  switch (e.type) {
    case 'turnStart':
      if (e.side === 'player') t.cur = 0;
      return;
    case 'spin':
      if (e.side !== 'player' || e.bonus) return;
      t.spins++;
      if (e.score.tier === 'triple') t.jackpots++;
      return;
    case 'attack':
    case 'specialFire':
      if (e.from === 'player' && e.to === 'enemy') {
        t.cur += e.amount;
        t.best = Math.max(t.best, t.cur);
      }
      if (e.to === 'player') t.lost += e.hpDamage;
      return;
    case 'allInHit':
    case 'potWin':
      if (e.to === 'player') t.lost += e.hpDamage;
      return;
    case 'markedHit':
    case 'blast':
      if (e.side === 'player') t.lost += e.hpDamage;
      return;
    case 'closingTime':
      if (e.side === 'player') t.lost += e.hp;
      return;
    case 'coverCharge':
      if (e.side === 'player') t.lost += e.amount;
      return;
  }
}

/** A bet's state: still live, won, or busted. `done`: the fight is over and you won it. */
export function betState(b: SideBet, t: BetTrack, done: boolean): 'live' | 'won' | 'lost' {
  switch (b.kind) {
    case 'quick':
      return t.spins > b.target ? 'lost' : done ? 'won' : 'live';
    case 'clean':
      return t.lost > b.target ? 'lost' : done ? 'won' : 'live';
    case 'jackpot':
      return t.jackpots >= b.target ? 'won' : done ? 'lost' : 'live';
    case 'big':
      return t.best >= b.target ? 'won' : done ? 'lost' : 'live';
  }
}

/** The bet's words (condition and payout only: no odds). */
export function describeBet(b: SideBet): { name: string; rule: string } {
  switch (b.kind) {
    case 'quick':
      return { name: 'QUICK HANDS', rule: `WIN BY YOUR SPIN ${b.target}` };
    case 'clean':
      return { name: 'CLEAN HANDS', rule: b.target <= 0 ? 'WIN WITHOUT A SCRATCH' : `WIN, LOSING ${b.target} HP OR LESS` };
    case 'jackpot':
      return { name: 'HIGH ROLLER', rule: b.target === 1 ? 'LAND A JACKPOT' : `LAND ${b.target} JACKPOTS` };
    case 'big':
      return { name: 'BIG HIT', rule: `DEAL ${b.target}+ IN ONE TURN` };
  }
}

/** The tracker line under the VS during the fight. */
export function betProgress(b: SideBet, t: BetTrack): string {
  switch (b.kind) {
    case 'quick':
      return `${Math.max(0, b.target - t.spins)} SPINS LEFT`;
    case 'clean':
      return b.target <= 0 ? (t.lost ? 'HIT!' : 'NO SCRATCH YET') : `${Math.max(0, b.target - t.lost)} HP TO SPARE`;
    case 'jackpot':
      return `${Math.min(t.jackpots, b.target)} OF ${b.target}`;
    case 'big':
      return `BEST ${t.best}`;
  }
}

const hits = (xs: number[], ok: (x: number) => boolean) => xs.filter(ok).length / Math.max(1, xs.length);

/** Pick the line for one kind from the rehearsals: the candidate whose odds sit nearest the aim. */
export function lineFor(kind: BetKind, runs: BetTrack[]): SideBet | null {
  const vals = runs.map((t) => (kind === 'quick' ? t.spins : kind === 'clean' ? t.lost : kind === 'jackpot' ? t.jackpots : t.best));
  const round = (x: number) => (kind === 'clean' || kind === 'big' ? Math.floor(x / UNIT) * UNIT : x);
  const cands = [...new Set(vals.map(round))].filter((x) => (kind === 'jackpot' || kind === 'big' ? x > 0 : x >= 0));
  let best: { target: number; p: number } | null = null;
  for (const target of cands) {
    const p = hits(vals, (v) => (kind === 'quick' || kind === 'clean' ? v <= target : v >= target));
    if (p < BETS.minP || p > BETS.maxP) continue;
    if (!best || Math.abs(p - BETS.aim) < Math.abs(best.p - BETS.aim)) best = { target, p };
  }
  if (!best) return null;
  return { kind, target: best.target, pay: best.p < BETS.hardBelow ? 3 : 2 };
}

/** Up to 2 bets from a fight's rehearsals (the winning ones); none if you usually lose it. */
export function betsFrom(wins: BetTrack[], samples: number, rng: Rng): SideBet[] {
  if (wins.length < samples / 2) return [];
  const out: SideBet[] = [];
  for (const k of rng.shuffle<BetKind>(['quick', 'clean', 'jackpot', 'big'])) {
    const b = lineFor(k, wins);
    if (b) out.push(b);
    if (out.length === 2) break;
  }
  return out;
}
