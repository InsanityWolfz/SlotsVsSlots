import { UNIT, type Enh, type RelicId } from './config';
import type { CabinetId } from './cabinets';
import { MIDAS, RAIN, VOLUME } from './fightRules';
import { charmValue } from './charms';

export interface RelicDef {
  id: RelicId;
  name: string;
  /** The full rule, as the relic's tip and the COLLECTION show it. A card face shows it too when it fits two lines;
   * a longer rule's face leaves detail out (src/ui/run/cardText.ts), never rewords it. */
  text: string;
  sprite: string;
  /** Only offered on this slot machine. */
  machine?: CabinetId;
  /** Machine-locked, but not an identity relic: it never takes the draft's "your relic" slot or a start pick (the five
   * MAKE IT RAIN relics: as identity relics they pushed BANK VAULT out). */
  addon?: boolean;
  /** Only offered once you own this charm. */
  charm?: Enh;
}

/**
 * The legendary relics that were BIG CHOICES until 2026-10-15 (user: cut the choice screen, keep these ten with their
 * trade-offs). Their numbers are the big choices' own.
 */
export const LEGEND_RELIC = {
  /** SECOND PAYLINE: the enemy's hits are this much harder. */
  lineDmg: 1.15,
  /** THE LONG GAME: pay starts at this, +longStep for every fight you win after you get it. */
  longStart: 0.8,
  longStep: 0.03,
  /** GLASS CANNON: paying groups pay this much (and no healing between fights). */
  glassPay: 1.5,
  /** DEVIL'S DUE: everything pays this much; every win takes devilDecay of your max HP. */
  devilPay: 1.5,
  devilDecay: 0.08,
  /** CRUSADE: sword damage per fight won after you get it. */
  crusadeStep: 5,
  /** CHAIN LIGHTNING: lightning damage +this (adds with the other lightning boosts). */
  chainAdd: 1,
  /** HIGH CARD: jackpots (and jackpot meter payoffs) pay this much; pairs pay pairMul. */
  highCardMul: 1.5,
  highCardPairMul: 0.5,
};
const pct = (x: number) => Math.round(x * 100);

/** The content batch's numbers (user, 2026-11-07: CUT, LEAN MACHINE, STEADY HANDS, PAIR STREAK, STICKY FINGERS). */
export const CONTENT_1107 = {
  /** LEAN MACHINE: a reel this many cells or fewer (reels start at 12)... */
  leanCells: 11,
  /** ...pays its symbols at this much. */
  leanMul: 1.5,
  /** STEADY HANDS: more HOLDs a fight, and a jackpot on a spin with a held reel pays this much. */
  steadyHolds: 1,
  steadyMul: 2,
  /** PAIR STREAK: each attack pair or jackpot in a row pays this much more than the last, up to the cap. */
  streakStep: 0.5,
  streakCap: 2.5,
  /** STICKY FINGERS: chips per cell an enemy spoils, at most this many a fight. */
  stickyChips: 1,
  stickyMax: 5,
  /** CUT: a reel never goes below this many cells. */
  cutFloor: 6,
};

/** Passive rule changes. None of them ask for input mid-fight. */
export const RELICS: Record<RelicId, RelicDef> = {
  mirror: { id: 'mirror', name: 'TWIN REELS', text: 'ANY 2 MATCHING REELS ARE A PAIR', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'ROOM SERVICE', text: 'EACH METER PAYOFF HEALS 30 MORE HP', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 60 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  // Build relics: each amplifies one kind of gild, so committing to a build pays a premium.
  prism: { id: 'prism', name: 'PRISM', text: 'A PAIR OR JACKPOT WITH A WILD PAYS X2', sprite: 'relicPrism' },
  // Legendary (act 2): big, build-bending effects.
  ticket: { id: 'ticket', name: 'GOLDEN TICKET', text: `EVERY CHARM IS STRONGER. GOLD PAYS X${charmValue('gold', 2)}, NOT X${charmValue('gold', 1)}`, sprite: 'relicTicket' },
  // STAR CHART (2026-10-15): the build for uncapped symbol levels (Balatro's Telescope, in spirit).
  starchart: { id: 'starchart', name: 'STAR CHART', text: 'SYMBOL LEVELS YOU GAIN ARE DOUBLED', sprite: 'relicStarchart' },
  bell: { id: 'bell', name: 'JACKPOT BELL', text: 'JACKPOTS PAY X2 AND FILL YOUR METER', sprite: 'relicBell' },
  phoenix: { id: 'phoenix', name: "RABBIT'S FOOT", text: 'SURVIVE 1 KILLING HIT AT 1 HP EACH FIGHT', sprite: 'relicPhoenix' },
  overcharge: { id: 'overcharge', name: 'OVERCHARGE', text: 'EACH METER PAYOFF HITS AGAIN FOR 1/3 DAMAGE', sprite: 'relicOvercharge' },
  key: { id: 'key', name: 'LOADED DICE', text: 'YOUR PAIRS PAY X2', sprite: 'relicKey' },
  sandglass: { id: 'sandglass', name: 'GOLDEN HOURGLASS', text: 'ENEMY ABILITIES TAKE 1 MORE SPIN TO CHARGE. THE WHEEL AND THE DEALER ARE NOT SLOWED', sprite: 'relicSandglass' },
  // Slot machine relics: each machine gets an identity relic and a heal that feeds off its own mechanic.
  // CONTENT WAVE 1 (2026-10-07, playtest/CONTENT_WAVE1_REVIEW.md): slot machine relics, one hook each.
  tower: { id: 'tower', name: 'TOWER SHIELD', text: 'KEEP 25% OF YOUR LEFTOVER SHIELD EACH SPIN, UP TO 10% OF YOUR MAX HP', sprite: 'relicTower', machine: 'knight' },
  capacitor: { id: 'capacitor', name: 'CAPACITOR', text: '25% OF LEFTOVER SHIELD CHARGES LIGHTNING', sprite: 'relicCapacitor', machine: 'tesla' },
  livewire: { id: 'livewire', name: 'LIVE WIRE', text: 'LIGHTNING DEALS 30% MORE DAMAGE. LIGHTNING STORMS COST 1 HP EACH', sprite: 'relicLivewire', machine: 'tesla' },
  encore: { id: 'encore', name: 'ENCORE', text: 'YOUR JACKPOT METER KEEPS 30 AFTER IT PAYS', sprite: 'relicEncore', machine: 'joker' },
  // (WILD WHEEL is gone, user 2026-10-14: "the better result" was a judgement call, not a rule.)
  // CONTENT WAVE 1, part 2.
  coup: { id: 'coup', name: 'COUP DE GRACE', text: 'SWORDS PAY X2 WHILE YOU HAVE MORE HP LEFT THAN THE ENEMY', sprite: 'relicCoup', machine: 'knight' },
  compound: { id: 'compound', name: 'COMPOUND', text: `HIGH ROLLER GOES UP TO X4, NOT X${MIDAS.maxMul}`, sprite: 'relicCompound', machine: 'midas' },
  meltdown: { id: 'meltdown', name: 'MELTDOWN', text: 'LIGHTNING DEALS 1% MORE DAMAGE FOR EACH MISSING HP, UP TO 50%', sprite: 'relicMeltdown', machine: 'tesla' },
  deckdrum: { id: 'deckdrum', name: 'DECK DRUM', text: 'SPINS THAT PAY ADD 1 CARD DAMAGE FOR THE REST OF THE FIGHT, UP TO 5', sprite: 'relicDeckdrum', machine: 'joker' },
  // Charm relics.
  horseshoe: { id: 'horseshoe', name: 'HORSESHOE', text: 'A PAIR OR JACKPOT WITH A LUCKY WILD PAYS X3', sprite: 'relicHorseshoe', charm: 'lucky' },
  // General.
  underdog: { id: 'underdog', name: 'UNDERDOG', text: 'EVERYTHING PAYS X1.5 UNDER HALF HP', sprite: 'relicUnderdog' },
  holywater: { id: 'holywater', name: 'BOUNCER', text: 'THE FIRST ENEMY ABILITY THAT SABOTAGES YOUR REELS IS BLOCKED EACH FIGHT', sprite: 'relicHolywater' },
  // EXPERT_PLAYTEST_10: relics that make a choice (streaky vs steady, turtle-and-counter, keep the liens or pay them).
  hotstreak: { id: 'hotstreak', name: 'HOT STREAK', text: 'JACKPOTS MAKE YOUR NEXT SPIN PAY X2', sprite: 'relicHotStreak' },
  // CONTENT_13.
  pitboss: { id: 'pitboss', name: 'PIT BOSS', text: 'FIRST ENEMY JACKPOT IS BLOCKED EACH FIGHT', sprite: 'relicPitBoss' },
  // CASH CASSIDY's MAKE IT RAIN relics.
  rainmaker: { id: 'rainmaker', name: 'RAINMAKER', text: `MAKE IT RAIN COSTS ${RAIN.rainmakerCost} CHIPS, NOT ${RAIN.cost}`, sprite: 'relicRainmaker', machine: 'midas', addon: true },
  // SHIELD BASH: KNIGHT's (it replaces the BULWARK charm). Not offered to the others (MACHINE_EXCLUDE).
  bash: { id: 'bash', name: 'SHIELD BASH', text: 'LEFTOVER SHIELD HITS THE ENEMY EACH SPIN', sprite: 'relicBash' },
  // THE JUKEBOX (2026-10-08).
  turntable: { id: 'turntable', name: 'TURNTABLE', text: 'THE DROP LEAVES THE VOLUME AT 5, NOT 3', sprite: 'relicTurntable', machine: 'jukebox' },
  mixtape: { id: 'mixtape', name: 'MIXTAPE', text: 'A SPIN WITH NO NOTE KEEPS THE VOLUME', sprite: 'relicMixtape', machine: 'jukebox' },
  // KNIGHT has no meter, so this is its multiplier (2026-10-12: KNIGHT had the lowest multiplier of any machine).
  greatsword: { id: 'greatsword', name: 'GREATSWORD', text: 'YOUR SWORDS PAY X1.5', sprite: 'relicGreatsword', machine: 'knight' },
  // CASH CASSIDY's shield build (user, 2026-10-12): relics that scale with the shield you hold.
  armoredcar: { id: 'armoredcar', name: 'ARMORED CAR', text: 'HIGH ROLLER COUNTS EVERY 5 SHIELD FROM THAT SPIN AS 1 CHIP. MORE CHIPS MAKE IT HIT HARDER', sprite: 'relicArmoredCar', machine: 'midas' },
  safedeposit: { id: 'safedeposit', name: 'SAFE DEPOSIT', text: 'ONCE EACH SPIN A CHIP SYMBOL HIT ADDS THE SHIELD YOU GAIN THAT SPIN', sprite: 'relicSafeDeposit', machine: 'midas' },
  subwoofer: { id: 'subwoofer', name: 'SUBWOOFER', text: 'THE DROP ALSO DEALS YOUR SHIELD AS DAMAGE', sprite: 'relicSubwoofer', machine: 'jukebox' },
  // The user's picks from the content list (2026-10-14).
  dryspell: { id: 'dryspell', name: 'DRY SPELL', text: 'BUILD-UP GROWS 50% EACH SPIN UP TO X4', sprite: 'relicDrySpell' },
  punchcard: { id: 'punchcard', name: 'PUNCH CARD', text: 'PICK A LEGENDARY RELIC EVERY 6 FIGHTS YOU WIN', sprite: 'relicPunchCard' },
  goldenspin: { id: 'goldenspin', name: 'GOLDEN SPIN', text: 'EACH SPIN HAS A 10% CHANCE TO PAY X3', sprite: 'relicGoldenSpin' },
  insurance: { id: 'insurance', name: 'INSURANCE POLICY', text: 'GAIN 100 SHIELD UNDER 25% HP ONCE EACH FIGHT', sprite: 'relicInsurance' },
  housetax: { id: 'housetax', name: 'HOUSE TAX', text: 'EACH ENEMY JACKPOT PAYS YOU 5 CHIPS', sprite: 'relicHouseTax' },
  regular: { id: 'regular', name: 'REGULAR', text: 'TABLE GAMES GIVE YOU 2 MORE PLAYS', sprite: 'relicRegular' },
  hitmaker: { id: 'hitmaker', name: 'CERTIFIED HITMAKER', text: 'EACH DROP HITS 60% HARDER PER DROP SO FAR THIS FIGHT', sprite: 'relicHitmaker', machine: 'jukebox' },
  houseofcards: { id: 'houseofcards', name: 'HOUSE OF CARDS', text: 'EACH METER PAYOFF GIVES YOUR REELS 2 TEMPORARY WILDS. THEY LAST UNTIL THE FIGHT ENDS', sprite: 'relicHouseOfCards', machine: 'joker' },
  parachute: { id: 'parachute', name: 'GOLDEN PARACHUTE', text: 'FOR 10 CHIPS SURVIVE 1 KILLING HIT AT 25% HP EACH FIGHT', sprite: 'relicParachute', machine: 'midas' },
  // The BIG CHOICES that stayed, as legendary relics (user, 2026-10-15). Each keeps its price, said on the card.
  secondline: { id: 'secondline', name: 'SECOND PAYLINE', text: `THE ROW ABOVE YOUR PAYLINE PAYS HALF, FOR PAIRS AND JACKPOTS ONLY. ENEMIES HIT ${pct(LEGEND_RELIC.lineDmg - 1)}% HARDER`, sprite: 'relicLoadedreel' },
  devilsdue: { id: 'devilsdue', name: 'SECOND MORTGAGE', text: `EVERYTHING PAYS X${LEGEND_RELIC.devilPay}. WINS COST ${pct(LEGEND_RELIC.devilDecay)}% OF YOUR MAX HP EACH`, sprite: 'relicChalice' },
  longgame: { id: 'longgame', name: 'THE LONG GAME', text: `EVERYTHING PAYS ${pct(1 - LEGEND_RELIC.longStart)}% LESS. EACH WIN ADDS ${pct(LEGEND_RELIC.longStep)}% WITH NO LIMIT`, sprite: 'relicMetronome' },
  quickening: { id: 'quickening', name: 'ESPRESSO SHOT', text: 'YOUR METER STARTS HALF FULL EACH FIGHT', sprite: 'relicBattery' },
  glasscannon: { id: 'glasscannon', name: 'GLASS CANNON', text: `EVERYTHING PAYS X${LEGEND_RELIC.glassPay}. NO HEALING BETWEEN FIGHTS. BEATING AN ACT'S BOSS STILL HEALS YOU`, sprite: 'relicFirstblood' },
  crusade: { id: 'crusade', name: 'CRUSADE', text: `SWORDS HIT ${LEGEND_RELIC.crusadeStep} HARDER FOR EACH FIGHT YOU WIN`, sprite: 'relicDrum', machine: 'knight' },
  chainlightning: { id: 'chainlightning', name: 'CHAIN LIGHTNING', text: `LIGHTNING DEALS ${pct(LEGEND_RELIC.chainAdd)}% MORE DAMAGE`, sprite: 'relicCoil', machine: 'tesla' },
  highcard: { id: 'highcard', name: 'HIGH CARD', text: `JACKPOTS PAY X${LEGEND_RELIC.highCardMul}. PAIRS PAY HALF`, sprite: 'relicWildcard', machine: 'joker' },
  hypeman: { id: 'hypeman', name: 'HYPE MAN', text: 'VOLUME RISES 1 EVERY 2 SPINS. NOTES PAY HALF EXCEPT ON THE DROP', sprite: 'relicPulse', machine: 'jukebox' },
  openbar: { id: 'openbar', name: 'OPEN BAR', text: 'MAKE IT RAIN IS FREE. WINS PAY NO CHIPS', sprite: 'relicTipJar', machine: 'midas' },
  // The content batch (user, 2026-11-07).
  lean: { id: 'lean', name: 'LEAN MACHINE', text: `SYMBOLS ON A REEL OF ${CONTENT_1107.leanCells} OR FEWER PAY X${CONTENT_1107.leanMul}`, sprite: 'relicLean' },
  steadyhands: { id: 'steadyhands', name: 'STEADY HANDS', text: `HELD JACKPOTS PAY X${CONTENT_1107.steadyMul}. GAIN ${CONTENT_1107.steadyHolds} HOLD EACH FIGHT`, sprite: 'relicSteady' },
  pairstreak: { id: 'pairstreak', name: 'PAIR STREAK', text: `ATTACK PAIRS IN A ROW PAY X${1 + CONTENT_1107.streakStep}, THEN X${1 + 2 * CONTENT_1107.streakStep}, THEN X${CONTENT_1107.streakCap}. A SPIN WITHOUT ONE RESETS IT`, sprite: 'relicPairStreak' },
  sticky: { id: 'sticky', name: 'STICKY FINGERS', text: `SABOTAGE PAYS YOU UP TO ${CONTENT_1107.stickyMax} CHIPS EACH FIGHT. YOU GET ${CONTENT_1107.stickyChips} FOR EACH SYMBOL OR REEL SABOTAGED`, sprite: 'relicSticky' },
};

/**
 * A relic's card text on a given slot machine: meter relics speak your machine's language
 * (LIGHTNING, the HIGH ROLLER bar, the JACKPOT METER). Without a machine, the generic text.
 */
const MACHINE_TEXT: Partial<Record<RelicId, Partial<Record<CabinetId, string>>>> = {
  fang: {
    tesla: 'EACH LIGHTNING STORM HEALS 15 MORE HP',
    midas: 'HIGH ROLLER HEALS 30 MORE HP',
    joker: 'ALL JACKPOTS HEALS 30 MORE HP',
    jukebox: 'THE DROP HEALS 30 MORE HP',
  },
  overcharge: {
    tesla: 'LIGHTNING DEALS 30% MORE DAMAGE',
    midas: 'HIGH ROLLER HITS AGAIN FOR 1/3 DAMAGE',
    joker: 'ALL JACKPOTS HITS AGAIN FOR 1/3 DAMAGE',
  },
  bell: {
    knight: 'JACKPOTS PAY X2',
    tesla: 'JACKPOTS PAY X2 AND FULLY CHARGE LIGHTNING',
    midas: 'JACKPOTS PAY X2 AND FILL HIGH ROLLER',
    joker: "JACKPOTS PAY X1.25 AND FILL THE METER. ALL JACKPOTS DOESN'T REFILL IT",
    jukebox: "JACKPOTS PAY X2 AND FILL THE VOLUME. A JACKPOT ON THE DROP DOESN'T FILL IT",
  },
  // (TESLA's is the user's line, 2026-11-12: LIGHTNING charges, the other meters fill. THE JUKEBOX's volume is a number.)
  quickening: {
    tesla: 'LIGHTNING STARTS HALF CHARGED EACH FIGHT',
    midas: 'HIGH ROLLER STARTS HALF FULL EACH FIGHT',
    joker: 'JACKPOT METER STARTS HALF FULL EACH FIGHT',
    jukebox: `THE VOLUME STARTS AT ${Math.floor(VOLUME.max / 2)} EACH FIGHT`,
  },
};
/** Machines that attack with something other than swords: relic texts name their symbol instead. */
const ATTACK_WORD: Partial<Record<CabinetId, string>> = { joker: 'CARD', midas: 'CHIP', tesla: 'BOLT', jukebox: 'NOTE' };
const METER_WORD: Partial<Record<CabinetId, string>> = { tesla: 'LIGHTNING', midas: 'HIGH ROLLER', joker: 'JACKPOT METER', jukebox: 'VOLUME' };
export const relicText = (r: RelicId, cabinet?: CabinetId | null) => {
  const t = (cabinet && MACHINE_TEXT[r]?.[cabinet]) ?? RELICS[r].text;
  const w = cabinet ? ATTACK_WORD[cabinet] : undefined;
  // "YOUR METER" names the machine's own meter (wording pass, user 2026-10-13).
  const m = cabinet ? METER_WORD[cabinet] : undefined;
  const named = m ? t.replace(/YOUR METER/g, `YOUR ${m}`) : t;
  return w ? named.replace(/SWORD/g, w) : named;
};
/**
 * Offered in drafts, shops and RELIC RUSH, but never in the starting pick: slow or economy relics, a trap as the one
 * relic you start with (2026-10-14). (Content wave 1's machine relics were kept out too, to leave room for each
 * machine's signature relics; those were cut on 2026-10-15, so wave 1's are the start picks now.)
 */
export const WAVE1: ReadonlySet<RelicId> = new Set<RelicId>(['regular', 'housetax', 'punchcard', 'starchart', 'sticky']);
/** Relics that make no sense on a machine even reworded (never offered there). */
// ESPRESSO SHOT on BANKROLL: the HIGH ROLLER bar already starts at half or more from 10 chips held (89% of its fights),
// so only the cost was left (QA COMBOS-02).
export const MACHINE_EXCLUDE: Partial<Record<RelicId, CabinetId[]>> = { overcharge: ['jukebox'], bash: ['tesla', 'joker'], quickening: ['midas'] };
/** Relics a relic you hold switches off entirely (never offered with it: QA COMBOS-06). */
export const DEAD_WITH: Partial<Record<RelicId, RelicId[]>> = {
  // OPEN BAR's rain is free: RAINMAKER's cheaper rain saves nothing.
  rainmaker: ['openbar'],
  // GLASS CANNON: no healing between fights, and that is all BANDAGE does.
  bandage: ['glasscannon'],
};

/** New-relic numbers (playtest/RELIC_PROPOSALS.md, tuned in the engine). */
export const NEW_RELIC = {
  /** GREATSWORD (KNIGHT): sword groups pay this much more. */
  greatswordMul: 1.5,
  /** ARMORED CAR: this much shield counts as one chip for HIGH ROLLER. */
  armoredShield: UNIT / 2,
  /** SAFE DEPOSIT: your first chip hit each spin also deals this many times this spin's shield. */
  safeDepositMul: 1,
  /** DECK DRUM: at most this many stacks. */
  drumCap: 5,
  // CONTENT WAVE 1.
  /** ...at most this share of your max HP a blocked hit. */
  towerShare: 0.25,
  towerCap: 0.1,
  capacitorShare: 0.25,
  livewireMul: 0.3,
  /** ...HP a storm (flat). */
  livewireCost: 1,
  encoreKeep: 0.3,
  /** ...the sword multiplier there. */
  coupBossMul: 2,
  compoundCap: 4,
  meltdownCap: 0.5,
  /** ...lightning +1% per HP missing. */
  meltdownRate: 0.01,
  /** DECK DRUM: per stack on each card. */
  deckdrumStep: UNIT / 10,
  horseshoeMul: 3,
  underdogMul: 1.5,
  bashShare: 1,
  // The user's picks (2026-10-14).
  /** DRY SPELL: +25% a dry spin, up to 8 stacks (x3). */
  dryStep: 0.5,
  dryMax: 6,
  goldenChance: 0.1,
  goldenMul: 3,
  insuranceShare: 0.25,
  insuranceShield: 10 * UNIT,
  taxChips: 5,
  punchEvery: 6,
  hitmakerStep: 0.6,
  parachuteCost: 10,
  /** GOLDEN PARACHUTE: you land at this share of your max HP. */
  parachuteHp: 0.25,
  /** REGULAR: more plays at each encounter game. */
  regularPlays: 2,
};

/** The ten legendaries that were BIG CHOICES. */
export const BIG_LEGENDS: RelicId[] = ['secondline', 'devilsdue', 'longgame', 'quickening', 'glasscannon', 'crusade', 'chainlightning', 'highcard', 'hypeman', 'openbar'];
/** Relic rarity. */
export const RELIC_TIER: Record<'common' | 'uncommon' | 'legendary', RelicId[]> = {
  common: ['fang', 'bandage', 'bash', 'hotstreak', 'housetax', 'regular', 'punchcard', 'dryspell', 'sticky'],
  uncommon: ['starchart', 'greatsword', 'armoredcar', 'safedeposit', 'prism', 'mirror', 'horseshoe', 'underdog', 'holywater', 'rainmaker', 'tower', 'capacitor', 'livewire', 'encore', 'coup', 'compound', 'meltdown', 'deckdrum', 'turntable', 'mixtape', 'subwoofer', 'goldenspin', 'insurance', 'hitmaker', 'houseofcards', 'parachute', 'lean', 'steadyhands', 'pairstreak'],
  legendary: ['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass', 'pitboss', ...BIG_LEGENDS],
};

export const LEGENDARY: ReadonlySet<RelicId> = new Set<RelicId>(RELIC_TIER.legendary);
export const BELL_MULT = 2;
/** JOKER's jackpots already fill its meter: the Bell's x2 there was 77.5% wins vs 5.8 (EXPERT_PLAYTEST_10). */
export const BELL_MULT_JOKER = 1.25;
export const KEY_MULT = 2;
/** Golden Hourglass: enemy abilities take this many more turns (was 2: 76% run win, the top relic by 12+ points). */
export const SANDGLASS_SLOW = 1;
/** OVERCHARGE: the echo deals this fraction of the special. */
export const OVERCHARGE_ECHO = 1 / 3;
/** OVERCHARGE on TESLA: every lightning strike hits this much harder (not an echo per strike). */
export const OVERCHARGE = { lightning: 0.3 };
/** Bomber bombs: fuse in the victim's turns, damage when it runs out (shield blocks). */
export const BOMB = { fuse: 3, damage: 3 * UNIT };

/** MIDAS TOUCH: a cell holds at most this many gold touches (+x6). */
export const MIDAS_TOUCH_CAP = 3;
export const FANG_HEAL = 3 * UNIT;
/** TESLA's lightning pays off often: a common heal of 30 there was 36.7% wins vs 9.2 (EXPERT_PLAYTEST_10). */
export const FANG_TESLA_HEAL = UNIT / 2;
export const BANDAGE_HEAL = 6 * UNIT;

/** What each build relic needs you to own before it's offered (playtest ITERATION_4). */
export type Enabler = 'gold' | 'keen' | 'charged' | 'vamp' | 'wild' | 'charm' | 'meter';
export const BUILD_ENABLER: Partial<Record<RelicId, Enabler | Enabler[]>> = {
  ticket: 'charm',
  prism: 'wild',
  // Relics that feed a meter: every slot machine but KNIGHT.
  overcharge: 'meter',
  fang: 'meter',
  // QUICKENING fills a meter: every machine but KNIGHT.
  quickening: 'meter',
};

/** Too strong for drafts (best pick 92% of the time): only elites drop it. */
export const ELITE_ONLY: ReadonlySet<RelicId> = new Set<RelicId>(['mirror']);

/**
 * Boss pot rules. The House SKIMS: each cash-out takes half the pot (rounded up) and leaves the
 * rest growing. It cashes out at the START of its turn (before it spins) so the LETHAL warning is
 * always true (playtest ITERATION_3).
 */
// 2026-10-09 (BOSS_REDESIGN 2): a shorter House with a fatter pot (seed 8 -> 12, cut 2 -> 3), and LAST CALL: from its
// turn `lastCall` (both sides' spins) it skims every turn.
export const POT = { seed: 12 * UNIT, houseCut: 3 * UNIT, cashEvery: 3, skim: 0.5, allInMin: 8 * UNIT, lastCall: 20 };
