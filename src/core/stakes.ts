import type { AbilityDef } from './config';
import { SANDGLASS_SLOW } from './relics';

/**
 * HIGH STAKES: a per-cabinet difficulty ladder (ITERATION_9's recommendation). Winning a run at a
 * stake unlocks the next one for that cabinet. Stakes are cumulative, and each one adds a RULE
 * rather than bigger numbers.
 */
export interface Stake {
  level: number;
  name: string;
  color: string;
  rule: string;
}

export const STAKES: Stake[] = [
  { level: 0, name: 'WHITE', color: '#e8e0f0', rule: 'THE BASE GAME' },
  { level: 1, name: 'RED', color: '#e04a3a', rule: 'SCARS: EVERY 4TH FIGHT YOU WIN LEAVES A PERMANENT ROCK ON YOUR MACHINE' },
  { level: 2, name: 'GREEN', color: '#5ed15a', rule: 'THE WHEEL STARTS FAST: 3 CHIPS A TURN FROM THE START' },
  { level: 3, name: 'BLACK', color: '#8a7aa8', rule: 'THE HOUSE CHEATS: SKIMS EVERY 2, BOMBS YOUR PAYLINE' },
  { level: 4, name: 'BLUE', color: '#3b8ef0', rule: 'ACT 2 ABILITIES CHARGE FASTER' },
  { level: 5, name: 'GOLD', color: '#ffd23f', rule: 'EVERY ENEMY ABILITY CHARGES FASTER. BOSSES HAVE +8% HP' },
];
export const MAX_STAKE = STAKES.length - 1;

/** Stake rule thresholds (cumulative). */
export const STAKE = {
  /** RED: permanent scar rocks (ITERATION_10: counter forks on every fork did nothing and got repetitive). */
  scars: 1,
  scarEvery: 4,
  /** GREEN: THE WHEEL STARTS FAST (3 chips a turn from its first turn). */
  wheelFast: 2,
  houseDirty: 3,
  houseBombsPerReel: 1,
  /** BLUE: one act 2 fork (fight 3) is your counter, marked. */
  counterForks: 4,
  /** BLACK: the House skims every 2 turns (the base is every 3). */
  houseSkimEvery: 2,
  fasterAct2: 4,
  fasterAll: 5,
  /** GOLD: bosses have this much more HP. */
  goldBossHp: 1.08,
  /** ACT 3 (THE DEALER): runs at GREEN or higher continue after THE WHEEL. */
  act3: 2,
  /** Tried and rejected (ITERATION_10 sweep): pot +8 helped the player; halved healing was -7.4 alone. */
  halfHeal: 99,
};

/**
 * An enemy ability as it will really behave in a fight: the Golden Hourglass, BLACK's faster skim
 * and BLUE/GOLD's faster charge. Shared by the Fight and every card that shows a cadence.
 */
export function effectiveAbility(ab: AbilityDef, o: { stake: number; act: number; sandglass: boolean }): AbilityDef {
  // The Dealer's deals and THE WHEEL's NO MORE BETS ignore the Hourglass (ITERATION_12 L6: it disabled the boss mechanic).
  let every = ab.every + (o.sandglass && ab.kind !== 'deal' && ab.kind !== 'bets' ? SANDGLASS_SLOW : 0);
  if (ab.kind === 'jackpot' && o.stake >= STAKE.houseDirty) every = STAKE.houseSkimEvery + (o.sandglass ? SANDGLASS_SLOW : 0);
  const faster = o.stake >= STAKE.fasterAll || (o.stake >= STAKE.fasterAct2 && o.act > 1);
  // (Not the bosses' clocks: a faster House skim is BLACK's own rule, and THE WHEEL's countdown is its whole fight.)
  if (faster && ab.kind !== 'jackpot' && ab.kind !== 'bets') every = Math.max(2, every - 1);
  return every === ab.every ? ab : { ...ab, every };
}

export const stakeOf = (level: number): Stake => STAKES[Math.max(0, Math.min(MAX_STAKE, level))];

/**
 * HIGH STAKES ladder, per slot machine: only a WON run (the whole run you played, so at GREEN+ with
 * act 3 on that means beating the Dealer) at this machine's best stake unlocks the next one.
 * Returns the new best stake, or null if nothing unlocks.
 */
export function stakeUnlock(best: number, run: { won: boolean; stake: number }): number | null {
  return run.won && run.stake >= best && run.stake < MAX_STAKE ? run.stake + 1 : null;
}
