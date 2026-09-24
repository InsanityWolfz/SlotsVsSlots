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
  mirror: { id: 'mirror', name: 'TWIN REELS', text: 'ANY TWO MATCHING REELS PAY AS A DOUBLE', sprite: 'relicMirror' },
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
  // Legendary (act 2): big, build-bending effects.
  ticket: { id: 'ticket', name: 'GOLDEN TICKET', text: 'FULL SETS NEED ONLY 2 REELS AND PAY ONE STEP MORE', sprite: 'relicTicket' },
  bell: { id: 'bell', name: 'JACKPOT BELL', text: 'JACKPOTS PAY X2 AND REFILL YOUR SPECIAL', sprite: 'relicBell' },
  phoenix: { id: 'phoenix', name: 'PHOENIX FEATHER', text: 'ONCE PER FIGHT, SURVIVE A LETHAL HIT AT 1 HP', sprite: 'relicPhoenix' },
  overcharge: { id: 'overcharge', name: 'OVERCHARGE', text: 'YOUR SPECIAL ECHOES FOR 1/3 DAMAGE', sprite: 'relicOvercharge' },
  key: { id: 'key', name: 'SKELETON KEY', text: 'YOUR DOUBLES PAY X2', sprite: 'relicKey' },
  sandglass: { id: 'sandglass', name: 'GOLDEN HOURGLASS', text: 'ENEMY ABILITIES CHARGE 2 TURNS SLOWER', sprite: 'relicSandglass' },
};

/**
 * BONUS WHEEL / RELIC RUSH (the user's chase features). Each player spin in a run fight rolls for a
 * bonus (natural triples of the chase symbols count too); the voucher pays out after a won fight.
 * Aim: ~2 wheels and ~1 rush per run on average.
 */
export const BONUS = { wheel: 0.028, rush: 0.012 };
/** RELIC RUSH: a 5x3 hold-and-spin grid. */
export const RUSH = { cells: 15, start: 3, respins: 3, stick: 0.07, commonMax: 9, uncommonMax: 12, grandChips: 15 };
/** Relic rarity for RELIC RUSH prizes. */
export const RELIC_TIER: Record<'common' | 'uncommon' | 'legendary', RelicId[]> = {
  // (No counter relics: drafts offer those as PREP cards for a specific enemy — QA_1.)
  common: ['clover', 'battery', 'fang', 'bandage', 'crown'],
  uncommon: ['midas', 'rod', 'cactus', 'prism', 'hone', 'mirror'],
  legendary: ['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass'],
};

export const LEGENDARY: ReadonlySet<RelicId> = new Set<RelicId>(['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass']);
export const BELL_MULT = 2;
export const KEY_MULT = 2;
export const SANDGLASS_SLOW = 2;
/** Act 2 gilds. */
/** LUCKY: chance per level (1 = plain, +1 tier II, +1 full set): each + step × (level − 1). */
export const LUCKY_CHANCE = { each: 0.35, step: 0.15 };
/** BLAZE: special damage per blaze reel = each + (level − 1). */
export const BLAZE_BONUS = { each: 3 };
/** OVERCHARGE: the echo deals this fraction of the special. */
export const OVERCHARGE_ECHO = 1 / 3;
/** TIER II is worth this many gild levels (ITERATION_8: one level made tier II a trap). */
export const TIER_STEP = 2;
/** VAMP heals at most this much per sword group (a VAMP FULL SET was the strongest thing measured). */
export const VAMP_CAP = 3;
/** The Mirror's REFLECTION is capped at this share of your max HP (two from full kill you). */
export const REFLECT_CAP = 0.6;
/** Bomber bombs: fuse in the victim's turns, damage when it runs out (shield blocks). */
export const BOMB = { fuse: 3, damage: 3 };
/** The Mirror's Reflection: never less than this. */
export const REFLECT_MIN = 3;

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
export const BUILD_ENABLER: Partial<Record<RelicId, 'gold' | 'keen' | 'charged' | 'spiked' | 'wild' | 'full'>> = {
  ticket: 'full',
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
