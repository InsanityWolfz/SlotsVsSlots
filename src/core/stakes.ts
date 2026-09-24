import type { AbilityDef, RelicId } from './config';
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
  { level: 2, name: 'GREEN', color: '#5ed15a', rule: 'THE MIRROR COPIES YOUR LEGENDARY (OR YOUR BEST RELIC IT CAN USE)' },
  { level: 3, name: 'BLACK', color: '#8a7aa8', rule: 'THE HOUSE CHEATS: SKIMS EVERY 3 TURNS, BOMBS YOUR PAYLINE, IGNORES YOUR CHIP SHIELD' },
  { level: 4, name: 'BLUE', color: '#3b8ef0', rule: 'ACT 2 ABILITIES CHARGE FASTER. ONE ACT 2 FORK IS YOUR COUNTER' },
  { level: 5, name: 'GOLD', color: '#ffd23f', rule: 'EVERY ENEMY ABILITY CHARGES FASTER. BOSSES HAVE +8% HP' },
];
export const MAX_STAKE = STAKES.length - 1;

/** Stake rule thresholds (cumulative). */
export const STAKE = {
  /** RED: permanent scar rocks (ITERATION_10: counter forks on every fork did nothing and got repetitive). */
  scars: 1,
  scarEvery: 4,
  mirrorRelic: 2,
  houseDirty: 3,
  houseBombsPerReel: 2,
  /** BLUE: one act 2 fork (fight 3) is your counter, marked. */
  counterForks: 4,
  houseSkimEvery: 3,
  fasterAct2: 4,
  fasterAll: 5,
  /** GOLD: bosses have this much more HP. */
  goldBossHp: 1.08,
  /** ACT 3 (THE DEALER): runs at GREEN or higher continue after the Mirror. */
  act3: 2,
  /** Tried and rejected (ITERATION_10 sweep): pot +8 helped the player; halved healing was -7.4 alone. */
  halfHeal: 99,
};

/** Relics the Mirror can use against you at GREEN stake (legendaries first, then the best of the rest). */
export const MIRROR_COPYABLE: RelicId[] = ['phoenix', 'key', 'bell', 'prism', 'hone', 'mirror', 'clover'];
export const mirrorCanUse = (r: RelicId) => MIRROR_COPYABLE.includes(r);

/**
 * An enemy ability as it will really behave in a fight: the Golden Hourglass, BLACK's faster skim
 * and BLUE/GOLD's faster charge. Shared by the Fight and every card that shows a cadence.
 */
export function effectiveAbility(ab: AbilityDef, o: { stake: number; act: number; sandglass: boolean }): AbilityDef {
  // The Dealer's deals ignore the Hourglass (ITERATION_12 L6: it disabled the boss mechanic).
  let every = ab.every + (o.sandglass && ab.kind !== 'deal' ? SANDGLASS_SLOW : 0);
  if (ab.kind === 'jackpot' && o.stake >= STAKE.houseDirty) every = STAKE.houseSkimEvery + (o.sandglass ? SANDGLASS_SLOW : 0);
  const faster = o.stake >= STAKE.fasterAll || (o.stake >= STAKE.fasterAct2 && o.act > 1);
  if (faster && ab.kind !== 'jackpot') every = Math.max(2, every - 1);
  return every === ab.every ? ab : { ...ab, every };
}

export const stakeOf = (level: number): Stake => STAKES[Math.max(0, Math.min(MAX_STAKE, level))];
