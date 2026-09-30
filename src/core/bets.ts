/**
 * SIDE BETS (EXPERT_PLAYTEST_5 C1): before a regular fight, the Cashier's table offers 2 bets on how it goes.
 * Stake chips on one; the fight stays watch-only, and the bet is just a question you chose to care about.
 * Each bet's line is sized by quietly playing the fight ahead a dozen times (other seeds), so it's close to a coin flip.
 */
import { UNIT } from './config';
import type { CombatEvent } from './events';
import type { Rng } from './rng';

/** QUICK: win by your Nth spin. CLEAN: take at most N damage. JACKPOTS: land N jackpots. BIG HIT: one turn of N+ damage. */
export type BetKind = 'quick' | 'clean' | 'jackpot' | 'big' | 'early' | 'survive';
/** The Dealer's own table (EXPERT_PLAYTEST_6 E8): win before his FINAL HAND; survive an ALL IN. */
export const DEALER_BETS: BetKind[] = ['early', 'survive'];
export interface SideBet {
  kind: BetKind;
  target: number;
  /** Paid back as stake x pay. */
  pay: number;
}
export interface PlacedBet extends SideBet {
  stake: number;
  /** Placed with the ALL IN button. */
  allIn?: boolean;
}
export const BET_STAKES = [2, 5] as const;
/** ALL IN stakes every chip you hold, up to this (more in endless, where chips pile up). */
export const ALL_IN_STAKE = { cap: 20, endlessCap: 50 };
/** HOT HAND: each bet won in a row makes the next lines bolder and pay +1 (up to x4). A bust resets it. */
export const HOT_HAND = { max: 2, ret: 1.1, bias: 0 };
/** How many rehearsals size a bet, and the odds a line aims for. */
export const BETS = { samples: 12, aim: 0.55, hardBelow: 0.31, minP: 0.25, maxP: 0.75 };

/** What a fight has done so far, as far as the bets care. */
export interface BetTrack {
  /** The Dealer played his FINAL HAND; ALL INs that hit you. */
  finalHand?: boolean;
  allIns?: number;
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
      if (e.to === 'player') t.allIns = (t.allIns ?? 0) + 1;
      if (e.to === 'player') t.lost += e.hpDamage;
      return;
    case 'potWin':
      if (e.to === 'player') t.lost += e.hpDamage;
      return;
    case 'finalHand':
      t.finalHand = true;
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
    case 'early':
      return t.finalHand ? 'lost' : done ? 'won' : 'live';
    case 'survive':
      return t.allIns ? 'won' : done ? 'lost' : 'live';
  }
}

/** The bet's words (condition and payout only: no odds). */
export function describeBet(b: SideBet): { name: string; rule: string } {
  switch (b.kind) {
    case 'quick':
      return { name: 'QUICK HANDS', rule: `WIN BY ROUND ${b.target}` };
    case 'clean':
      return { name: 'CLEAN HANDS', rule: b.target <= 0 ? 'WIN WITHOUT A SCRATCH' : `WIN, LOSING ${num(b.target)} HP OR LESS` };
    case 'jackpot':
      return { name: 'HIGH ROLLER', rule: b.target === 1 ? 'LAND A JACKPOT' : `LAND ${b.target} JACKPOTS` };
    case 'big':
      return { name: 'BIG HIT', rule: `DEAL ${num(b.target)}+ IN ONE TURN` };
    case 'early':
      return { name: 'FOLD HIM EARLY', rule: 'WIN BEFORE HIS FINAL HAND' };
    case 'survive':
      return { name: 'TAKE THE HIT', rule: 'SURVIVE AN ALL IN' };
  }
}

/** The tracker line under the VS during the fight. */
export function betProgress(b: SideBet, t: BetTrack): string {
  switch (b.kind) {
    case 'quick':
      return b.target - t.spins === 1 ? 'LAST ROUND' : `${Math.max(0, b.target - t.spins)} ROUNDS LEFT`;
    case 'clean':
      return b.target <= 0 ? (t.lost ? 'HIT!' : 'NO SCRATCH YET') : `${num(Math.max(0, b.target - t.lost))} HP TO SPARE`;
    case 'jackpot':
      return `${Math.min(t.jackpots, b.target)} OF ${b.target}`;
    case 'big':
      return `BEST ${num(t.best)}`;
    case 'early':
      return t.finalHand ? 'FINAL HAND!' : 'NO FINAL HAND YET';
    case 'survive':
      return t.allIns ? 'SURVIVED!' : 'NO ALL IN YET';
  }
}

/** Big numbers the endless way (12.4K); core can't reach the renderer's fmtNum. */
const num = (n: number) => (n >= 1e9 ? `${+(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${+(n / 1e3).toFixed(1)}K` : String(n));
/** What a won bet makes you (the stake came off your chips when you placed it). */
export const betProfit = (b: PlacedBet) => betPayout(b) - b.stake;
/** What a won bet pays back, in whole chips (pays can be x1.5, x2.5 ...). */
export const betPayout = (b: PlacedBet) => Math.floor(b.stake * b.pay);

const hits = (xs: number[], ok: (x: number) => boolean) => xs.filter(ok).length / Math.max(1, xs.length);

/** Pick the line for one kind from the rehearsals: the candidate whose odds sit nearest the aim. */
export function lineFor(kind: BetKind, runs: BetTrack[], enemyHp = Infinity, streak = 0): SideBet | null {
  const hot = Math.min(HOT_HAND.max, streak);
  const aim = hot ? HOT_HAND.ret / (2 + hot) - HOT_HAND.bias : BETS.aim;
  const minP = hot ? Math.max(0.1, aim - 0.1) : BETS.minP;
  const maxP = hot ? aim + 0.12 : BETS.maxP;
  const vals = runs.map((t) => (kind === 'quick' ? t.spins : kind === 'clean' ? t.lost : kind === 'jackpot' ? t.jackpots : t.best));
  const round = (x: number) => (kind === 'clean' || kind === 'big' ? Math.floor(x / UNIT) * UNIT : x);
  const cands = [...new Set(vals.map(round))].filter((x) => (kind === 'jackpot' || kind === 'big' ? x > 0 : x >= 0) && !(kind === 'big' && x > enemyHp));
  let best: { target: number; p: number } | null = null;
  for (const target of cands) {
    const p = hits(vals, (v) => (kind === 'quick' || kind === 'clean' ? v <= target : v >= target));
    if (p < minP || p > maxP) continue;
    if (!best || Math.abs(p - aim) < Math.abs(best.p - aim)) best = { target, p };
  }
  if (!best) return null;
  return { kind, target: best.target, pay: hot ? 2 + hot : best.p < BETS.hardBelow ? 3 : 2 };
}

/**
 * The Dealer's table: his own two bets when the rehearsals make a fair line, topped up with regular kinds so it's
 * always set (an empty table told you how the finale would go: EXPERT_PLAYTEST_7 E4). Odds are on the rehearsals
 * you won (a lost Dealer fight ends the run, bet and all); if you rarely win, on all of them.
 */
export function dealerBets(all: { t: BetTrack; won: boolean }[], rng: Rng, enemyHp = Infinity): SideBet[] {
  const wins = all.filter((x) => x.won).map((x) => x.t);
  const base = wins.length >= 3 ? wins : all.map((x) => x.t);
  const out: SideBet[] = [];
  for (const kind of DEALER_BETS) {
    const p = base.filter((t) => (kind === 'early' ? !t.finalHand : !!t.allIns)).length / Math.max(1, base.length);
    if (p < 0.12 || p > 0.8) continue;
    out.push({ kind, target: 0, pay: Math.max(1.5, Math.min(5, Math.round((2 * 1.05) / p) / 2)) });
  }
  for (const k of rng.shuffle<BetKind>(['big', 'quick', 'clean', 'jackpot'])) {
    if (out.length >= 2) break;
    const b = lineFor(k, base, enemyHp);
    if (b) out.push(b);
  }
  return out;
}

/** Up to 2 bets from a fight's rehearsals (the winning ones); none if you usually lose it. */
export function betsFrom(wins: BetTrack[], samples: number, rng: Rng, enemyHp = Infinity, streak = 0): SideBet[] {
  if (wins.length < samples / 2) return [];
  const out: SideBet[] = [];
  for (const k of rng.shuffle<BetKind>(['quick', 'clean', 'jackpot', 'big'])) {
    const b = lineFor(k, wins, enemyHp, streak);
    if (b) out.push(b);
    if (out.length === 2) break;
  }
  return out;
}
