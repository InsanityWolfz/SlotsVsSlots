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
  battery: { id: 'battery', name: 'BATTERY', text: 'START EACH FIGHT WITH 3 ENERGY', sprite: 'relicBattery' },
  mirror: { id: 'mirror', name: 'MIRROR', text: 'ANY TWO MATCHING REELS PAY AS A DOUBLE', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'VAMPIRE FANG', text: 'YOUR SPECIAL HEALS 3 HP', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 6 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  mittens: { id: 'mittens', name: 'MITTENS', text: 'FREEZES LAST 1 TURN LESS', sprite: 'relicMittens' },
  lockpick: { id: 'lockpick', name: 'LOCKPICK', text: 'EACH JAM HAS A 50% CHANCE TO FAIL', sprite: 'relicLockpick' },
  mousetrap: { id: 'mousetrap', name: 'MOUSETRAP', text: 'STEALS FAIL 35% OF THE TIME. SNAP: 2 DAMAGE', sprite: 'relicMousetrap' },
  pickaxe: { id: 'pickaxe', name: 'PICKAXE', text: 'ROCKS ON YOUR PAYLINE HIT LIKE SWORDS', sprite: 'relicPickaxe' },
  crown: { id: 'crown', name: 'HIGH ROLLER', text: 'YOUR DOUBLES ALSO STEAL HALF THE HOUSE POT', sprite: 'relicCrown' },
  // Build relics: each amplifies one kind of gild, so committing to a build pays a premium.
  midas: { id: 'midas', name: 'MIDAS', text: 'GOLD CELLS ON YOUR PAYLINE ALSO GIVE +1 ENERGY', sprite: 'relicMidas' },
  rod: { id: 'rod', name: 'LIGHTNING ROD', text: 'IF YOU HAVE CHARGED BOLTS, YOUR SPECIAL COSTS 4', sprite: 'relicRod' },
  cactus: { id: 'cactus', name: 'CACTUS', text: 'SPIKED SHIELDS HIT BACK FOR 4', sprite: 'relicCactus' },
  prism: { id: 'prism', name: 'PRISM', text: 'A MATCH THAT USES A WILD PAYS X2', sprite: 'relicPrism' },
  hone: { id: 'hone', name: 'HONE', text: 'KEEN SWORDS DEAL +2 MORE', sprite: 'relicHone' },
};

export const CLOVER_CHANCE = 0.3;
export const BATTERY_ENERGY = 3;
export const FANG_HEAL = 3;
export const BANDAGE_HEAL = 6;
export const LOCKPICK_CHANCE = 0.5;
export const MOUSETRAP_CHANCE = 0.35;
export const MOUSETRAP_DAMAGE = 2;
export const SPIKED_DAMAGE = 2;
export const CACTUS_DAMAGE = 4;
export const KEEN_BONUS = 1;
export const HONE_BONUS = 2;
export const ROD_SPECIAL_COST = 4;

/** Counter relics are offered as PREP cards when their enemy is on the next fork, never in relic drafts. */
export const COUNTERS: Partial<Record<string, RelicId>> = { frost: 'mittens', gremlin: 'lockpick', thief: 'mousetrap', golem: 'pickaxe' };
export const COUNTER_RELICS: ReadonlySet<RelicId> = new Set(Object.values(COUNTERS) as RelicId[]);
/** What each build relic needs you to own before it's offered (playtest ITERATION_4). */
export const BUILD_ENABLER: Partial<Record<RelicId, 'gold' | 'keen' | 'charged' | 'spiked' | 'wild'>> = {
  midas: 'gold',
  rod: 'charged',
  cactus: 'spiked',
  hone: 'keen',
  prism: 'wild',
};
export const ROD_SPECIAL_DAMAGE = 12;

/** Too strong for drafts (best pick 92% of the time): only elites drop it. */
export const ELITE_ONLY: ReadonlySet<RelicId> = new Set<RelicId>(['mirror']);

/**
 * Boss pot rules. The House SKIMS: each cash-out takes half the pot (rounded up) and leaves the
 * rest growing. It cashes out at the START of its turn (before it spins) so the LETHAL warning is
 * always true (playtest ITERATION_3).
 */
export const POT = { seed: 5, houseCut: 1, cashEvery: 4, skim: 0.5, allInMin: 8 };
/** Boss HP grows with the relics you bring in. */
export const BOSS_HP_PER_RELIC = 3;
