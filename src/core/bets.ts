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
/** SAFE: likely, pays x1.5. LONG: a long shot, pays x3 (more on a HOT HAND). EVEN: a coin flip at x2. */
export type LineStyle = 'safe' | 'long' | 'even';
export const LINES: Record<LineStyle, { aim: number; pay: number; band: number }> = {
  safe: { aim: 0.78, pay: 1.5, band: 0.12 },
  long: { aim: 0.34, pay: 3, band: 0.1 },
  even: { aim: 0.55, pay: 2, band: 0.2 },
};
export interface SideBet {
  kind: BetKind;
  target: number;
  /** Which line of the table this is (the regular table is one SAFE, one LONG: EXPERT_PLAYTEST_7 E7). */
  style?: LineStyle;
  /** HOT HAND: bets won in a row that bolded this line. */
  hot?: number;
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
/** HOT HAND: each bet won in a row makes the next LONG SHOT bolder and pay +1 (up to x5). A bust resets it. */
export const HOT_HAND = { max: 2 };
/** How many rehearsals size a bet, and the odds a line aims for. */
export const BETS = { samples: 12 };

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
export function lineFor(kind: BetKind, runs: BetTrack[], enemyHp = Infinity, style: LineStyle = 'even', streak = 0, maxHp = Infinity): SideBet | null {
  const L = LINES[style];
  // HOT HAND bolds only the long shot: it pays +1 per bet won in a row, sized so the return holds.
  const hot = style === 'long' ? Math.min(HOT_HAND.max, streak) : 0;
  const pay = L.pay + hot;
  const aim = hot ? L.aim * (L.pay / pay) : L.aim;
  const vals = runs.map((t) => (kind === 'quick' ? t.spins : kind === 'clean' ? t.lost : kind === 'jackpot' ? t.jackpots : t.best));
  const round = (x: number) => (kind === 'clean' || kind === 'big' ? Math.floor(x / UNIT) * UNIT : x);
  // CLEAN HANDS with a limit at or past your max HP reads as free money (it counts healed-back damage): not offered (EXPERT_PLAYTEST_9 D8).
  const cands = [...new Set(vals.map(round))].filter((x) => (kind === 'jackpot' || kind === 'big' ? x > 0 : x >= 0) && !(kind === 'big' && x > enemyHp) && !(kind === 'clean' && x >= maxHp));
  let best: { target: number; p: number } | null = null;
  for (const target of cands) {
    const p = hits(vals, (v) => (kind === 'quick' || kind === 'clean' ? v <= target : v >= target));
    const band = hot ? L.band * 1.5 : L.band;
    if (p < aim - band || p > aim + band) continue;
    if (!best || Math.abs(p - aim) < Math.abs(best.p - aim)) best = { target, p };
  }
  if (!best) return null;
  return { kind, target: best.target, pay, ...(style !== 'even' ? { style } : {}), ...(hot ? { hot } : {}) };
}

/**
 * The Dealer's table: his own two bets when the rehearsals make a fair line, topped up with regular kinds so it's
 * always set (an empty table told you how the finale would go: EXPERT_PLAYTEST_7 E4). Odds are on the rehearsals
 * you won (a lost Dealer fight ends the run, bet and all); if you rarely win, on all of them.
 */
export function dealerBets(all: { t: BetTrack; won: boolean }[], rng: Rng, enemyHp = Infinity, maxHp = Infinity): SideBet[] {
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
    const b = lineFor(k, base, enemyHp, 'even', 0, maxHp);
    if (b) out.push(b);
  }
  return out;
}

/** Up to 2 bets from a fight's rehearsals (the winning ones); none if you usually lose it. */
export function betsFrom(wins: BetTrack[], samples: number, rng: Rng, enemyHp = Infinity, streak = 0, maxHp = Infinity): SideBet[] {
  if (wins.length < samples / 2) return [];
  // One SAFE bet and one LONG SHOT (on different kinds); a coin flip fills in if a kind can't make its line.
  const kinds = rng.shuffle<BetKind>(['quick', 'clean', 'jackpot', 'big']);
  const out: SideBet[] = [];
  for (const style of ['safe', 'long'] as const) {
    const left = kinds.filter((k) => !out.some((b) => b.kind === k));
    const b =
      left.map((k) => lineFor(k, wins, enemyHp, style, streak, maxHp)).find(Boolean) ??
      (streak ? left.map((k) => lineFor(k, wins, enemyHp, style, 0, maxHp)).find(Boolean) : null) ??
      left.map((k) => lineFor(k, wins, enemyHp, 'even', 0, maxHp)).find(Boolean);
    if (b) out.push(b);
  }
  return out;
}
