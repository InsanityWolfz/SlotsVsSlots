import type { RelicId } from './config';

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
  { level: 1, name: 'RED', color: '#e04a3a', rule: 'ACT 2 FORKS ALWAYS OFFER THE COUNTER TO YOUR BUILD' },
  { level: 2, name: 'GREEN', color: '#5ed15a', rule: 'THE MIRROR COPIES ONE OF YOUR RELICS' },
  { level: 3, name: 'BLACK', color: '#8a7aa8', rule: 'THE HOUSE PLAYS DIRTY: IT PLANTS BOMBS AND SKIMS EVERY 3 TURNS' },
  { level: 4, name: 'BLUE', color: '#3b8ef0', rule: 'ACT 2 ENEMY ABILITIES CHARGE 1 TURN FASTER' },
  { level: 5, name: 'GOLD', color: '#ffd23f', rule: 'EVERY ENEMY ABILITY CHARGES 1 TURN FASTER' },
];
export const MAX_STAKE = STAKES.length - 1;

/** Stake rule thresholds (cumulative). */
export const STAKE = {
  counterForks: 1,
  mirrorRelic: 2,
  houseDirty: 3,
  houseBombsPerReel: 2,
  houseSkimEvery: 3,
  fasterAct2: 4,
  fasterAll: 5,
  /** Tried and rejected (ITERATION_10 sweep): pot +8 helped the player; halved healing was -7.4 alone. */
  halfHeal: 99,
};

/** Relics the Mirror can use against you at BLACK stake (in order of preference). */
export const MIRROR_COPYABLE: RelicId[] = ['key', 'bell', 'prism', 'hone', 'mirror', 'clover'];

export const stakeOf = (level: number): Stake => STAKES[Math.max(0, Math.min(MAX_STAKE, level))];
