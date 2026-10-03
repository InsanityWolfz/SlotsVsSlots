import { UNIT, type Enh, type RelicId } from './config';
import type { CabinetId } from './cabinets';

export interface RelicDef {
  id: RelicId;
  name: string;
  /** Short enough for a draft card (pixel font, ~18 chars per line). */
  text: string;
  sprite: string;
  /** Only offered on this slot machine. */
  machine?: CabinetId;
  /** Only offered once you own this charm. */
  charm?: Enh;
  /** Never offered any more (kept so old saves and collections still load). */
  retired?: boolean;
}

/** Passive rule changes. None of them ask for input mid-fight. */
export const RELICS: Record<RelicId, RelicDef> = {
  clover: { id: 'clover', name: 'LUCKY CLOVER', text: '30% CHANCE A NEAR-MISS BECOMES A JACKPOT', sprite: 'relicClover' },
  battery: { id: 'battery', name: 'BATTERY', text: 'YOUR METER STARTS EACH FIGHT MORE THAN HALF FULL', sprite: 'relicBattery' },
  mirror: { id: 'mirror', name: 'TWIN REELS', text: 'ANY TWO MATCHING REELS PAY AS A PAIR', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'VAMPIRE FANG', text: 'YOUR METER PAYOFF HEALS 30 MORE (TESLA AND BRIAR: 10)', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 60 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  crown: { id: 'crown', name: 'HIGH ROLLER', text: 'YOUR PAIRS HEAL 5 (AND STEAL HALF THE HOUSE POT)', sprite: 'relicCrown' },
  // Build relics: each amplifies one kind of gild, so committing to a build pays a premium.
  midas: { id: 'midas', name: 'GOLD LEAF', text: 'GOLD ON A CELL THAT PAYS NOTHING JOINS YOUR BIGGEST GROUP', sprite: 'relicGoldleaf', charm: 'gold', retired: true },
  rod: { id: 'rod', name: 'LIGHTNING ROD', text: 'WITH CHARGED BOLTS: CHEAPER LIGHTNING, +10 LIGHTNING DAMAGE', sprite: 'relicRod', machine: 'tesla' },
  cactus: { id: 'cactus', name: 'CACTUS', text: 'THORNS YOU LAND ALSO SHIELD YOU FOR 30% OF THEM', sprite: 'relicCactus', machine: 'thorn' },
  prism: { id: 'prism', name: 'PRISM', text: 'A MATCH THAT USES A WILD PAYS X2', sprite: 'relicPrism' },
  hone: { id: 'hone', name: 'EXECUTIONER', text: 'KEEN SWORDS PAY X3 WHEN THE ENEMY IS UNDER HALF HP', sprite: 'relicExecutioner', charm: 'keen' },
  // Legendary (act 2): big, build-bending effects.
  ticket: { id: 'ticket', name: 'GOLDEN TICKET', text: 'EVERY CHARM IS ONE LEVEL HIGHER (EVEN PAST LEVEL 3)', sprite: 'relicTicket' },
  bell: { id: 'bell', name: 'JACKPOT BELL', text: 'JACKPOTS PAY X2 (JOKER: X1.25) AND FILL YOUR METER', sprite: 'relicBell' },
  phoenix: { id: 'phoenix', name: 'PHOENIX FEATHER', text: 'ONCE PER FIGHT, SURVIVE A LETHAL HIT AT 1 HP', sprite: 'relicPhoenix' },
  overcharge: { id: 'overcharge', name: 'OVERCHARGE', text: 'YOUR METER PAYOFF ECHOES FOR 1/3 DAMAGE', sprite: 'relicOvercharge' },
  key: { id: 'key', name: 'SKELETON KEY', text: 'YOUR PAIRS PAY X2', sprite: 'relicKey' },
  chalice: { id: 'chalice', name: 'BLOOD CHALICE', text: 'HEALING PAST FULL HP BECOMES SHIELD', sprite: 'relicChalice' },
  sandglass: { id: 'sandglass', name: 'GOLDEN HOURGLASS', text: 'ENEMY ABILITIES CHARGE 1 TURN SLOWER', sprite: 'relicSandglass' },
  // Slot machine relics: each machine gets an identity relic and a heal that feeds off its own mechanic.
  drum: { id: 'drum', name: 'WAR DRUM', text: 'EACH SPIN THAT PAYS: EVERY SWORD +2 THIS FIGHT (MAX +10)', sprite: 'relicDrum', machine: 'knight' },
  chainmail: { id: 'chainmail', name: 'CHAINMAIL', text: 'LEFTOVER SHIELD HEALS YOU 10% OF IT EACH TURN', sprite: 'relicChainmail', machine: 'knight' },
  vault: { id: 'vault', name: "KING'S VAULT", text: 'AFTER EACH WIN, ONE OF YOUR SWORDS TURNS GOLD FOR GOOD', sprite: 'relicVault', machine: 'midas' },
  decree: { id: 'decree', name: 'ROYAL DECREE', text: 'YOUR MIDAS TOUCH ALSO SPREADS TO THE CELLS ABOVE AND BELOW', sprite: 'relicDecree', machine: 'midas', retired: true },
  rosehip: { id: 'rosehip', name: 'ROSE HIP', text: 'YOUR THORN VOLLEYS HEAL YOU 10% OF WHAT THEY FIRE', sprite: 'relicRosehip', machine: 'thorn' },
  graft: { id: 'graft', name: 'GRAFT', text: 'GOLD AND VAMP CHARMS FIT THORNS', sprite: 'relicGraft', machine: 'thorn' },
  faraday: { id: 'faraday', name: 'FARADAY CAGE', text: 'SHIELD YOU GAIN ALSO CHARGES LIGHTNING (1/4 AS MUCH)', sprite: 'relicFaraday', machine: 'tesla' },
  static: { id: 'static', name: 'STATIC', text: "WHEN YOU'RE ATTACKED, YOUR LIGHTNING CHARGES 5", sprite: 'relicStatic', machine: 'tesla' },
  capbells: { id: 'capbells', name: 'CAP AND BELLS', text: 'EVERY WILD ON YOUR PAYLINE HEALS 10', sprite: 'relicCapbells', machine: 'joker' },
  stacked: { id: 'stacked', name: 'STACKED DECK', text: 'WILDS TAKE GOLD, KEEN AND VAMP CHARMS. CHARMED WILDS FILL YOUR METER X2', sprite: 'relicStacked', machine: 'joker' },
  // Charm relics.
  kiss: { id: 'kiss', name: "VAMPIRE'S KISS", text: 'VAMP CHARMS FIT ANY SYMBOL AND HEAL WHEN IT PAYS', sprite: 'relicKiss', charm: 'vamp' },
  horseshoe: { id: 'horseshoe', name: 'HORSESHOE', text: 'A MATCH MADE WITH A LUCKY WILD PAYS X3', sprite: 'relicHorseshoe', charm: 'lucky' },
  // General.
  underdog: { id: 'underdog', name: 'UNDERDOG', text: 'UNDER HALF HP, EVERYTHING PAYS X1.5', sprite: 'relicUnderdog' },
  firstblood: { id: 'firstblood', name: 'FIRST BLOOD', text: 'YOUR FIRST PAYING SPIN EACH FIGHT PAYS X3', sprite: 'relicFirstblood' },
  piggy: { id: 'piggy', name: 'PIGGY BANK', text: 'AFTER EACH WIN: +1 CHIP PER 5 CHIPS YOU HOLD (MAX +4)', sprite: 'relicPiggy' },
  trophy: { id: 'trophy', name: 'TROPHY BELT', text: '+10 MAX HP FOR EVERY FIGHT YOU WIN', sprite: 'relicTrophy' },
  holywater: { id: 'holywater', name: 'HOLY WATER', text: 'THE FIRST CHEAT ON YOUR REELS EACH FIGHT WASHES OFF', sprite: 'relicHolywater' },
  // EXPERT_PLAYTEST_10: relics that make a choice (streaky vs steady, turtle-and-counter, keep the liens or pay them).
  hotstreak: { id: 'hotstreak', name: 'HOT STREAK', text: 'AFTER A JACKPOT, YOUR NEXT SPIN PAYS X2', sprite: 'relicHotStreak' },
  belt: { id: 'belt', name: 'WHETSTONE BELT', text: 'BLOCKED HITS SHARPEN YOUR NEXT SWORD GROUP: +10 PER SWORD (MAX +40)', sprite: 'relicBelt', machine: 'knight' },
  toll: { id: 'toll', name: 'TOLL BOOTH', text: 'AFTER EACH WIN: +2 CHIPS FOR EVERY LIEN THE REPO MAN HOLDS', sprite: 'relicToll' },
  bash: { id: 'bash', name: 'SHIELD BASH', text: 'YOUR LEFTOVER SHIELD HITS BACK FOR ITS FULL AMOUNT EACH TURN', sprite: 'relicBash' },
  // Side bets (EXPERT_PLAYTEST_6 E11): relics that change which bet you want.
  loaded: { id: 'loaded', name: 'LOADED DICE', text: 'YOUR SIDE BETS PAY 20% MORE', sprite: 'relicLoaded' },
  marker: { id: 'marker', name: 'MARKER', text: 'YOUR FIRST BUSTED SIDE BET EACH ACT: UP TO 5 CHIPS BACK (10 WITH HIGH LIMIT)', sprite: 'relicMarker' },
  highlimit: { id: 'highlimit', name: 'HIGH LIMIT', text: 'DOUBLES YOUR SIDE BET STAKES, AND SO YOUR WINNINGS: 4, 10 OR ALL IN UP TO 40', sprite: 'relicHighLimit' },
};
/** LOADED DICE: every side bet's pay x1.2 (a flat +0.5 made the x1.5 SAFE bet pay 133-143%: EXPERT_PLAYTEST_8 E5). */
export const LOADED_MUL = 1.2;

/**
 * A relic's card text on a given slot machine: meter relics speak your machine's language
 * (LIGHTNING, the MIDAS TOUCH, the THORNS, the JACKPOT METER). Without a machine, the generic text.
 */
const MACHINE_TEXT: Partial<Record<RelicId, Partial<Record<CabinetId, string>>>> = {
  battery: {
    tesla: 'YOUR LIGHTNING STARTS EACH FIGHT 30 CHARGED',
    midas: 'YOUR GOLD METER STARTS EACH FIGHT MORE THAN HALF FULL',
    thorn: 'YOUR THORNS START EACH FIGHT AT 30',
    joker: 'YOUR JACKPOT METER STARTS EACH FIGHT MORE THAN HALF FULL',
  },
  fang: {
    tesla: 'EVERY LIGHTNING STRIKE HEALS 30 MORE',
    midas: 'EVERY MIDAS TOUCH HEALS 30 MORE',
    thorn: 'YOUR THORN VOLLEYS HEAL 10 MORE',
    joker: 'YOUR ALL-JACKPOTS SPIN HEALS 30 MORE',
  },
  overcharge: {
    tesla: 'YOUR LIGHTNING ECHOES FOR 1/3 DAMAGE',
    midas: 'YOUR MIDAS TOUCH SPIN ECHOES FOR 1/3 OF ITS DAMAGE',
    joker: 'YOUR ALL-JACKPOTS SPIN ECHOES FOR 1/3 OF ITS DAMAGE',
  },
  bell: {
    knight: 'JACKPOTS PAY X2',
    tesla: 'JACKPOTS PAY X2 AND FULLY CHARGE YOUR LIGHTNING',
    midas: 'JACKPOTS PAY X2 AND FILL YOUR GOLD METER',
    thorn: 'JACKPOTS PAY X2 AND ADD THEIR PAY TO YOUR THORNS',
    joker: 'JACKPOTS PAY X2 AND FILL YOUR JACKPOT METER',
  },
};
export const relicText = (r: RelicId, cabinet?: CabinetId | null) => (cabinet && MACHINE_TEXT[r]?.[cabinet]) ?? RELICS[r].text;
/** Relics that make no sense on a machine even reworded (never offered there). */
export const MACHINE_EXCLUDE: Partial<Record<RelicId, CabinetId[]>> = { overcharge: ['thorn'] };

/** New-relic numbers (playtest/RELIC_PROPOSALS.md, tuned in the engine). */
export const NEW_RELIC = {
  drumStep: UNIT / 5,
  drumCap: 5,
  chainmailShare: 0.1,
  rosehipShare: 0.1,
  faradayShare: 0.25,
  staticCharge: UNIT / 2,
  capbellsHeal: UNIT,
  executionerMul: 3,
  horseshoeMul: 3,
  underdogMul: 1.5,
  firstbloodMul: 3,
  piggyPer: 5,
  piggyMax: 4,
  trophyHp: UNIT,
  bashShare: 1,
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
  common: ['clover', 'battery', 'fang', 'bandage', 'crown', 'graft', 'firstblood', 'piggy', 'trophy', 'bash', 'loaded', 'marker', 'hotstreak'],
  uncommon: ['rod', 'cactus', 'prism', 'hone', 'mirror', 'chalice', 'drum', 'chainmail', 'vault', 'decree', 'rosehip', 'faraday', 'static', 'capbells', 'stacked', 'kiss', 'horseshoe', 'underdog', 'holywater', 'highlimit', 'belt', 'toll'],
  legendary: ['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass'],
};

export const LEGENDARY: ReadonlySet<RelicId> = new Set<RelicId>(['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass']);
/** WHETSTONE BELT: per blocked hit, every sword in your next sword group gets this much more (up to BELT_MAX stacks). */
export const BELT_STEP = 1 * UNIT;
export const BELT_MAX = 4;
export const BELL_MULT = 2;
/** JOKER's jackpots already fill its meter: the Bell's x2 there was 77.5% wins vs 5.8 (EXPERT_PLAYTEST_10). */
export const BELL_MULT_JOKER = 1.25;
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
/** MIDAS TOUCH: a cell holds at most this many gold touches (+x6). */
export const MIDAS_TOUCH_CAP = 3;
/** Cactus: banking thorns shields you for this share of what you banked. */
export const CACTUS_SHARE = 0.3;
export const FANG_HEAL = 3 * UNIT;
/** TESLA's lightning pays off often: a common heal of 30 there was 36.7% wins vs 9.2 (EXPERT_PLAYTEST_10). */
export const FANG_TESLA_HEAL = 1 * UNIT;
/** BRIAR's thorns fire almost every enemy turn, so its Fang heal is smaller (35% win with 30, probe 2026-09-27). */
export const FANG_THORN_HEAL = 1 * UNIT;
export const BANDAGE_HEAL = 6 * UNIT;
/** HIGH ROLLER: every double you land heals this much. */
export const CROWN_HEAL = UNIT / 2;
export const ROD_SPECIAL_COST = 4 * UNIT;
/** LIGHTNING ROD: extra lightning damage per charged bolt you own. */
export const ROD_PER_CHARGED = 1 * UNIT;
/** ...up to this much (TESLA owns many: +30 each made TESLA 66% WHITE). */
export const ROD_MAX_BONUS = 1 * UNIT;

/** What each build relic needs you to own before it's offered (playtest ITERATION_4). */
export type Enabler = 'gold' | 'keen' | 'charged' | 'vamp' | 'wild' | 'charm' | 'meter' | 'thorns';
export const BUILD_ENABLER: Partial<Record<RelicId, Enabler | Enabler[]>> = {
  ticket: 'charm',
  rod: 'charged',
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
export const POT = { seed: 8 * UNIT, houseCut: 2 * UNIT, cashEvery: 3, skim: 0.5, allInMin: 8 * UNIT };
/** Boss HP grows with the relics you bring in. */
export const BOSS_HP_PER_RELIC = 3 * UNIT;
