import type { RelicId } from './config';

export interface RelicDef {
  id: RelicId;
  name: string;
  /** Short enough for a draft card (pixel font, ~18 chars per line). */
  text: string;
  sprite: string;
}

/** Passive rule changes. None of them ask for input mid-fight. */
export const RELICS: Record<RelicId, RelicDef> = {
  clover: { id: 'clover', name: 'LUCKY CLOVER', text: '30% CHANCE A NEAR-MISS BECOMES A JACKPOT', sprite: 'relicClover' },
  whetstone: { id: 'whetstone', name: 'WHETSTONE', text: 'SWORD DOUBLES AND JACKPOTS DEAL +3', sprite: 'relicWhetstone' },
  soap: { id: 'soap', name: 'SOAP', text: 'A SLIME DOUBLE ALSO CLEANSES', sprite: 'relicSoap' },
  battery: { id: 'battery', name: 'BATTERY', text: 'START EACH FIGHT WITH 3 ENERGY', sprite: 'relicBattery' },
  mirror: { id: 'mirror', name: 'MIRROR', text: 'ANY TWO MATCHING REELS PAY AS A DOUBLE', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'VAMPIRE FANG', text: 'YOUR SPECIAL HEALS 3 HP', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 6 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  hourglass: { id: 'hourglass', name: 'HOURGLASS', text: 'ENEMY ABILITIES CHARGE 1 TURN SLOWER', sprite: 'relicHourglass' },
  magnet: { id: 'magnet', name: 'MAGNET', text: 'ROCKS ON YOUR PAYLINE GIVE ENERGY', sprite: 'relicMagnet' },
  mittens: { id: 'mittens', name: 'MITTENS', text: 'FREEZES LAST 1 TURN LESS', sprite: 'relicMittens' },
  lockpick: { id: 'lockpick', name: 'LOCKPICK', text: 'EACH JAM HAS A 50% CHANCE TO FAIL', sprite: 'relicLockpick' },
  mousetrap: { id: 'mousetrap', name: 'MOUSETRAP', text: 'STEALS FAIL 35% OF THE TIME. SNAP: 2 DAMAGE', sprite: 'relicMousetrap' },
  pickaxe: { id: 'pickaxe', name: 'PICKAXE', text: 'ROCKS ON YOUR PAYLINE HIT LIKE SWORDS', sprite: 'relicPickaxe' },
  dice: { id: 'dice', name: 'LOADED DICE', text: 'YOUR JACKPOTS PAY X4 INSTEAD OF X3', sprite: 'relicDice' },
  crown: { id: 'crown', name: 'HIGH ROLLER', text: 'YOUR DOUBLES ALSO STEAL HALF THE HOUSE POT', sprite: 'relicCrown' },
};

export const CLOVER_CHANCE = 0.3;
export const WHETSTONE_BONUS = 3;
export const BATTERY_ENERGY = 3;
export const FANG_HEAL = 3;
export const BANDAGE_HEAL = 6;
export const LOCKPICK_CHANCE = 0.5;
export const MOUSETRAP_CHANCE = 0.35;
export const MOUSETRAP_DAMAGE = 2;
export const SPIKED_DAMAGE = 2;

/** Counter relics are offered as PREP cards when their enemy is on the next fork, never in relic drafts. */
export const COUNTERS: Partial<Record<string, RelicId>> = { frost: 'mittens', gremlin: 'lockpick', thief: 'mousetrap', golem: 'pickaxe' };
export const COUNTER_RELICS: ReadonlySet<RelicId> = new Set(Object.values(COUNTERS) as RelicId[]);

/**
 * Boss pot rules. The House SKIMS: each cash-out takes half the pot (rounded up) and leaves the
 * rest growing, so it's many medium swings instead of one lottery one-shot (playtest ITERATION_2).
 */
export const POT = { seed: 5, houseCut: 1, cashEvery: 4, skim: 0.5, allInMin: 8 };
