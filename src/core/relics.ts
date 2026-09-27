import { UNIT, type RelicId } from './config';

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
  battery: { id: 'battery', name: 'BATTERY', text: 'YOUR METER STARTS EACH FIGHT MORE THAN HALF FULL', sprite: 'relicBattery' },
  mirror: { id: 'mirror', name: 'TWIN REELS', text: 'ANY TWO MATCHING REELS PAY AS A DOUBLE', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'VAMPIRE FANG', text: 'YOUR METER PAYOFF HEALS 30 MORE (BRIAR: 10)', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 60 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  crown: { id: 'crown', name: 'HIGH ROLLER', text: 'YOUR DOUBLES HEAL 5 (AND STEAL HALF THE HOUSE POT)', sprite: 'relicCrown' },
  // Build relics: each amplifies one kind of gild, so committing to a build pays a premium.
  midas: { id: 'midas', name: 'MIDAS', text: 'GOLD CELLS ON YOUR PAYLINE ALSO FILL YOUR METER BY 10', sprite: 'relicMidas' },
  rod: { id: 'rod', name: 'LIGHTNING ROD', text: 'IF YOU HAVE CHARGED BOLTS, YOUR SPECIAL COSTS 40', sprite: 'relicRod' },
  cactus: { id: 'cactus', name: 'CACTUS', text: 'BANKING THORNS ALSO SHIELDS YOU FOR 30% OF THEM', sprite: 'relicCactus' },
  prism: { id: 'prism', name: 'PRISM', text: 'A MATCH THAT USES A WILD PAYS X2', sprite: 'relicPrism' },
  hone: { id: 'hone', name: 'HONE', text: 'KEEN SWORDS DEAL +40 MORE', sprite: 'relicHone' },
  // Legendary (act 2): big, build-bending effects.
  ticket: { id: 'ticket', name: 'GOLDEN TICKET', text: 'EVERY CHARM IS ONE LEVEL HIGHER (EVEN PAST LEVEL 3)', sprite: 'relicTicket' },
  bell: { id: 'bell', name: 'JACKPOT BELL', text: 'JACKPOTS PAY X2 AND FILL YOUR METER', sprite: 'relicBell' },
  phoenix: { id: 'phoenix', name: 'PHOENIX FEATHER', text: 'ONCE PER FIGHT, SURVIVE A LETHAL HIT AT 1 HP', sprite: 'relicPhoenix' },
  overcharge: { id: 'overcharge', name: 'OVERCHARGE', text: 'YOUR METER PAYOFF ECHOES FOR 1/3 DAMAGE', sprite: 'relicOvercharge' },
  key: { id: 'key', name: 'SKELETON KEY', text: 'YOUR DOUBLES PAY X2', sprite: 'relicKey' },
  chalice: { id: 'chalice', name: 'BLOOD CHALICE', text: 'HEALING PAST FULL HP BECOMES SHIELD', sprite: 'relicChalice' },
  sandglass: { id: 'sandglass', name: 'GOLDEN HOURGLASS', text: 'ENEMY ABILITIES CHARGE 1 TURN SLOWER', sprite: 'relicSandglass' },
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
  common: ['clover', 'battery', 'fang', 'bandage', 'crown'],
  uncommon: ['midas', 'rod', 'cactus', 'prism', 'hone', 'mirror', 'chalice'],
  legendary: ['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass'],
};

export const LEGENDARY: ReadonlySet<RelicId> = new Set<RelicId>(['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass']);
export const BELL_MULT = 2;
export const KEY_MULT = 2;
/** Golden Hourglass: enemy abilities take this many more turns (was 2: 76% run win, the top relic by 12+ points). */
export const SANDGLASS_SLOW = 1;
/** OVERCHARGE: the echo deals this fraction of the special. */
export const OVERCHARGE_ECHO = 1 / 3;
/** The Mirror's REFLECTION is capped at this share of your max HP (two from full kill you). */
export const REFLECT_CAP = 0.6;
/** The Mirror plays your build, so its hits are capped at this share of your max HP (your gold jackpots would one-shot you). */
export const MIRROR_HIT_CAP = 0.4;
/** Bomber bombs: fuse in the victim's turns, damage when it runs out (shield blocks). */
export const BOMB = { fuse: 3, damage: 3 * UNIT };
/** The Mirror's Reflection: never less than this. */
export const REFLECT_MIN = 3 * UNIT;

export const CLOVER_CHANCE = 0.3;
export const BATTERY_ENERGY = 3 * UNIT;
/** Battery on a MIDAS / JAX meter: it starts this full. */
export const BATTERY_SHARE = 0.6;
/** MIDAS: a full meter makes your next paying group pay this many times. */
export const MIDAS_RAISE = 4;
/** Cactus: banking thorns shields you for this share of what you banked. */
export const CACTUS_SHARE = 0.3;
export const FANG_HEAL = 3 * UNIT;
/** BRIAR's thorns fire almost every enemy turn, so its Fang heal is smaller (35% win with 30, probe 2026-09-27). */
export const FANG_THORN_HEAL = 1 * UNIT;
export const BANDAGE_HEAL = 6 * UNIT;
/** HIGH ROLLER: every double you land heals this much. */
export const CROWN_HEAL = UNIT / 2;
export const HONE_BONUS = 4 * UNIT;
export const ROD_SPECIAL_COST = 4 * UNIT;

/** What each build relic needs you to own before it's offered (playtest ITERATION_4). */
export type Enabler = 'gold' | 'keen' | 'charged' | 'vamp' | 'wild' | 'charm' | 'meter' | 'thorns';
export const BUILD_ENABLER: Partial<Record<RelicId, Enabler | Enabler[]>> = {
  ticket: 'charm',
  midas: ['gold', 'meter'],
  rod: 'charged',
  cactus: 'thorns',
  hone: 'keen',
  prism: 'wild',
  chalice: 'vamp',
  // Relics that feed a meter: every slot machine but KNIGHT.
  battery: 'meter',
  overcharge: 'meter',
  fang: 'meter',
};
export const ROD_SPECIAL_DAMAGE = 12 * UNIT;

/** Too strong for drafts (best pick 92% of the time): only elites drop it. */
export const ELITE_ONLY: ReadonlySet<RelicId> = new Set<RelicId>(['mirror']);

/**
 * Boss pot rules. The House SKIMS: each cash-out takes half the pot (rounded up) and leaves the
 * rest growing. It cashes out at the START of its turn (before it spins) so the LETHAL warning is
 * always true (playtest ITERATION_3).
 */
export const POT = { seed: 5 * UNIT, houseCut: UNIT, cashEvery: 4, skim: 0.5, allInMin: 8 * UNIT };
/** Boss HP grows with the relics you bring in. */
export const BOSS_HP_PER_RELIC = 3 * UNIT;
