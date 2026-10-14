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
  /** Machine-locked, but not an identity relic: it never takes the draft's "your relic" slot or a start pick (the five
   * MAKE IT RAIN relics: as identity relics they pushed BANK VAULT out). */
  addon?: boolean;
  /** Only offered once you own this charm. */
  charm?: Enh;
}

/** Passive rule changes. None of them ask for input mid-fight. */
export const RELICS: Record<RelicId, RelicDef> = {
  clover: { id: 'clover', name: 'LUCKY CLOVER', text: '30% CHANCE A NEAR-MISS BECOMES A JACKPOT', sprite: 'relicClover' },
  battery: { id: 'battery', name: 'BATTERY', text: 'YOUR METER STARTS EACH FIGHT OVER HALF FULL', sprite: 'relicBattery' },
  mirror: { id: 'mirror', name: 'TWIN REELS', text: 'ANY TWO MATCHING REELS COUNT AS A PAIR', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'VAMPIRE FANG', text: 'YOUR METER PAYOFFS HEAL 30 MORE', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 60 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  // Build relics: each amplifies one kind of gild, so committing to a build pays a premium.
  prism: { id: 'prism', name: 'PRISM', text: 'A PAIR OR JACKPOT THAT USES A WILD PAYS X2', sprite: 'relicPrism' },
  hone: { id: 'hone', name: 'EXECUTIONER', text: 'KEEN SWORDS PAY X3 VS ENEMIES UNDER HALF HP', sprite: 'relicExecutioner', charm: 'keen' },
  // Legendary (act 2): big, build-bending effects.
  ticket: { id: 'ticket', name: 'GOLDEN TICKET', text: 'EVERY CHARM IS ONE LEVEL HIGHER', sprite: 'relicTicket' },
  bell: { id: 'bell', name: 'JACKPOT BELL', text: 'JACKPOTS PAY X2 AND FILL YOUR METER', sprite: 'relicBell' },
  phoenix: { id: 'phoenix', name: 'PHOENIX FEATHER', text: 'SURVIVE LETHAL DAMAGE AT 1 HP ONCE PER FIGHT', sprite: 'relicPhoenix' },
  overcharge: { id: 'overcharge', name: 'OVERCHARGE', text: 'YOUR METER PAYOFF ECHOES FOR 1/3 DAMAGE', sprite: 'relicOvercharge' },
  key: { id: 'key', name: 'SKELETON KEY', text: 'YOUR PAIRS PAY X2', sprite: 'relicKey' },
  chalice: { id: 'chalice', name: 'BLOOD CHALICE', text: 'HEALING PAST FULL HP BECOMES SHIELD', sprite: 'relicChalice' },
  sandglass: { id: 'sandglass', name: 'GOLDEN HOURGLASS', text: 'ENEMY ABILITIES CHARGE 1 SPIN SLOWER', sprite: 'relicSandglass' },
  // Slot machine relics: each machine gets an identity relic and a heal that feeds off its own mechanic.
  drum: { id: 'drum', name: 'WAR DRUM', text: 'EACH PAIR AND JACKPOT INCREASES SWORD DAMAGE BY +2 EACH FIGHT (MAX +10)', sprite: 'relicDrum', machine: 'knight' },
  chainmail: { id: 'chainmail', name: 'CHAINMAIL', text: '10% OF LEFTOVER SHIELD HEALS YOUR HP', sprite: 'relicChainmail', machine: 'knight' },
  faraday: { id: 'faraday', name: 'FARADAY CAGE', text: '25% OF SHIELD YOU GAIN ALSO CHARGES LIGHTNING', sprite: 'relicFaraday', machine: 'tesla' },
  static: { id: 'static', name: 'STATIC', text: 'LIGHTNING CHARGES 10 WHEN YOU ARE ATTACKED', sprite: 'relicStatic', machine: 'tesla' },
  capbells: { id: 'capbells', name: 'CAP AND BELLS', text: 'WILDS HEAL 10 HP', sprite: 'relicCapbells', machine: 'joker' },
  // CONTENT WAVE 1 (2026-10-07, playtest/CONTENT_WAVE1_REVIEW.md): slot machine relics, one hook each.
  tower: { id: 'tower', name: 'TOWER SHIELD', text: 'RETAIN 25% OF YOUR SHIELD EACH SPIN (MAX 10% OF YOUR HP)', sprite: 'relicTower', machine: 'knight' },
  headsman: { id: 'headsman', name: 'HEADSMAN', text: 'SWORDS HIT FOR +2% OF YOUR MAX HP', sprite: 'relicHeadsman', machine: 'knight' },
  capacitor: { id: 'capacitor', name: 'CAPACITOR', text: '25% OF LEFTOVER SHIELD CHARGES LIGHTNING', sprite: 'relicCapacitor', machine: 'tesla' },
  livewire: { id: 'livewire', name: 'LIVE WIRE', text: 'LIGHTNING DAMAGE +30%. EACH STORM COSTS 1 HP', sprite: 'relicLivewire', machine: 'tesla' },
  encore: { id: 'encore', name: 'ENCORE', text: 'REFUND 30 TO YOUR JACKPOT METER AFTER IT PAYS', sprite: 'relicEncore', machine: 'joker' },
  // (WILD WHEEL is gone, user 2026-10-14: "the better result" was a judgement call, not a rule.)
  downpour: { id: 'downpour', name: 'DOWNPOUR', text: 'MAKE IT RAIN MAKES YOUR NEXT MAKE IT RAIN PAY X1.4', sprite: 'relicDownpour', machine: 'midas' },
  // CONTENT WAVE 1, part 2.
  coup: { id: 'coup', name: 'COUP DE GRACE', text: 'SWORDS PAY X2 WHILE YOU HAVE MORE HP LEFT THAN THE ENEMY', sprite: 'relicCoup', machine: 'knight' },
  compound: { id: 'compound', name: 'COMPOUND', text: 'HIGH ROLLER CAP INCREASES TO X4', sprite: 'relicCompound', machine: 'midas' },
  meltdown: { id: 'meltdown', name: 'MELTDOWN', text: 'LIGHTNING DAMAGE +1% FOR EACH HP YOU ARE MISSING (MAX 50%)', sprite: 'relicMeltdown', machine: 'tesla' },
  pulse: { id: 'pulse', name: 'PULSE', text: 'LIGHTNING RESETS THE ENEMY ABILITY COUNTDOWN ONCE PER FIGHT', sprite: 'relicPulse', machine: 'tesla' },
  deckdrum: { id: 'deckdrum', name: 'DECK DRUM', text: 'EACH PAIR AND JACKPOT INCREASES CARD DAMAGE BY +1 EACH FIGHT (MAX +5)', sprite: 'relicDeckdrum', machine: 'joker' },
  wildcard: { id: 'wildcard', name: 'WILD CARD', text: 'EACH WILD ON YOUR PAYLINE CHARGES YOUR METER 10', sprite: 'relicWildcard' },
  loadedreel: { id: 'loadedreel', name: 'LOADED REEL', text: 'A LONE WILD IN THE MIDDLE TRIGGERS BOTH PAIRS', sprite: 'relicLoadedreel' },
  // Charm relics.
  horseshoe: { id: 'horseshoe', name: 'HORSESHOE', text: 'PAIRS AND JACKPOTS MADE WITH A LUCKY WILD PAY X3', sprite: 'relicHorseshoe', charm: 'lucky' },
  // General.
  underdog: { id: 'underdog', name: 'UNDERDOG', text: 'EVERYTHING PAYS X1.5 WHEN YOU ARE UNDER HALF HP', sprite: 'relicUnderdog' },
  firstblood: { id: 'firstblood', name: 'FIRST BLOOD', text: 'YOUR FIRST PAIR OR JACKPOT PAYS X3', sprite: 'relicFirstblood' },
  piggy: { id: 'piggy', name: 'PIGGY BANK', text: 'AFTER EACH FIGHT: +1 CHIP FOR EVERY 5 YOU HOLD (MAX +4)', sprite: 'relicPiggy' },
  trophy: { id: 'trophy', name: 'TROPHY BELT', text: '+10 MAX HP FOR EVERY FIGHT YOU WIN', sprite: 'relicTrophy' },
  holywater: { id: 'holywater', name: 'HOLY WATER', text: 'IGNORE THE FIRST SABOTAGE EACH FIGHT', sprite: 'relicHolywater' },
  // EXPERT_PLAYTEST_10: relics that make a choice (streaky vs steady, turtle-and-counter, keep the liens or pay them).
  hotstreak: { id: 'hotstreak', name: 'HOT STREAK', text: 'AFTER A JACKPOT, YOUR NEXT SPIN PAYS X2', sprite: 'relicHotStreak' },
  belt: { id: 'belt', name: 'WHETSTONE BELT', text: 'NEXT SWORD DAMAGE +20 AFTER YOU BLOCK A HIT', sprite: 'relicBelt', machine: 'knight' },
  // CONTENT_13.
  bracelet: { id: 'bracelet', name: 'CHARM BRACELET', text: '+5% PAY FOR EACH CHARM TYPE YOU OWN', sprite: 'relicBracelet' },
  metronome: { id: 'metronome', name: 'METRONOME', text: 'EVERY 3RD SPIN PAYS X1.5', sprite: 'relicMetronome' },
  snakeeyes: { id: 'snakeeyes', name: 'SNAKE EYES', text: 'EACH ENEMY JACKPOT HEALS YOU 25', sprite: 'relicSnakeEyes' },
  pitboss: { id: 'pitboss', name: 'PIT BOSS', text: "THE ENEMY'S FIRST JACKPOT EACH FIGHT DOESN'T COUNT", sprite: 'relicPitBoss' },
  coil: { id: 'coil', name: 'TESLA COIL', text: 'BOLTS ABOVE OR BELOW THE PAYLINE CHARGE 5', sprite: 'relicCoil', machine: 'tesla' },
  // CASH CASSIDY's MAKE IT RAIN relics.
  rainmaker: { id: 'rainmaker', name: 'RAINMAKER', text: 'MAKE IT RAIN COSTS 2 CHIPS INSTEAD OF 5', sprite: 'relicRainmaker', machine: 'midas', addon: true },
  slushfund: { id: 'slushfund', name: 'SLUSH FUND', text: 'MAKE IT RAIN FILLS HIGH ROLLER BY 50', sprite: 'relicSlushFund', machine: 'midas', addon: true },
  tipjar: { id: 'tipjar', name: 'TIP JAR', text: 'MAKE IT RAIN ALSO HEALS YOU 20 HP', sprite: 'relicTipJar', machine: 'midas', addon: true },
  // SHIELD BASH: KNIGHT's (it replaces the BULWARK charm). Not offered to the others (MACHINE_EXCLUDE).
  bash: { id: 'bash', name: 'SHIELD BASH', text: 'LEFTOVER SHIELD EACH SPIN HITS THE ENEMY', sprite: 'relicBash' },
  // THE JUKEBOX (2026-10-08).
  turntable: { id: 'turntable', name: 'TURNTABLE', text: 'AFTER THE DROP, THE VOLUME FALLS TO 5, NOT 3', sprite: 'relicTurntable', machine: 'jukebox' },
  mixtape: { id: 'mixtape', name: 'MIXTAPE', text: 'THE RECORD NEVER SKIPS: A SPIN WITH NO NOTE KEEPS THE VOLUME', sprite: 'relicMixtape', machine: 'jukebox' },
  // KNIGHT has no meter, so this is its multiplier (2026-10-12: KNIGHT had the lowest multiplier of any machine).
  greatsword: { id: 'greatsword', name: 'GREATSWORD', text: 'YOUR SWORDS PAY X1.5', sprite: 'relicGreatsword', machine: 'knight' },
  // CASH CASSIDY's shield build (user, 2026-10-12): relics that scale with the shield you hold.
  armoredcar: { id: 'armoredcar', name: 'ARMORED CAR', text: 'HIGH ROLLER COUNTS 1 CHIP PER 5 SHIELD YOU GAIN THAT SPIN', sprite: 'relicArmoredCar', machine: 'midas' },
  safedeposit: { id: 'safedeposit', name: 'SAFE DEPOSIT', text: 'YOUR CHIPS ALSO HIT FOR THE SHIELD YOU GAIN THAT SPIN', sprite: 'relicSafeDeposit', machine: 'midas' },
  subwoofer: { id: 'subwoofer', name: 'SUBWOOFER', text: 'THE DROP PIERCES SHIELDS', sprite: 'relicSubwoofer', machine: 'jukebox' },
  // The user's picks from the content list (2026-10-14).
  dryspell: { id: 'dryspell', name: 'DRY SPELL', text: 'EACH SPIN WITH NO PAIR: YOUR NEXT PAIR OR JACKPOT PAYS +50% (STACKS TO X4)', sprite: 'relicDrySpell' },
  punchcard: { id: 'punchcard', name: 'PUNCH CARD', text: 'EVERY 6TH FIGHT YOU WIN: PICK A LEGENDARY RELIC', sprite: 'relicPunchCard' },
  goldenspin: { id: 'goldenspin', name: 'GOLDEN SPIN', text: '1 SPIN IN 10 IS GOLDEN: EVERYTHING PAYS X3', sprite: 'relicGoldenSpin' },
  insurance: { id: 'insurance', name: 'INSURANCE POLICY', text: 'THE FIRST TIME EACH FIGHT YOU DROP UNDER 25% HP: GAIN 100 SHIELD', sprite: 'relicInsurance' },
  housetax: { id: 'housetax', name: 'HOUSE TAX', text: 'EVERY ENEMY JACKPOT PAYS YOU 5 CHIPS', sprite: 'relicHouseTax' },
  regular: { id: 'regular', name: 'REGULAR', text: 'ENCOUNTER GAMES GIVE YOU TWO MORE PLAYS', sprite: 'relicRegular' },
  hitmaker: { id: 'hitmaker', name: 'CERTIFIED HITMAKER', text: 'EACH DROP IN A FIGHT HITS +60% MORE THAN THE LAST', sprite: 'relicHitmaker', machine: 'jukebox' },
  houseofcards: { id: 'houseofcards', name: 'HOUSE OF CARDS', text: 'EACH JACKPOT METER PAYOFF ADDS A WILD TO EVERY REEL FOR THE FIGHT', sprite: 'relicHouseOfCards', machine: 'joker' },
  parachute: { id: 'parachute', name: 'GOLDEN PARACHUTE', text: 'A HIT THAT WOULD KILL YOU: PAY 10 CHIPS, LAND AT 25% HP (ONCE PER FIGHT)', sprite: 'relicParachute', machine: 'midas' },
};

/**
 * A relic's card text on a given slot machine: meter relics speak your machine's language
 * (LIGHTNING, the HIGH ROLLER bar, the JACKPOT METER). Without a machine, the generic text.
 */
const MACHINE_TEXT: Partial<Record<RelicId, Partial<Record<CabinetId, string>>>> = {
  battery: {
    tesla: 'LIGHTNING STARTS 30/40 EACH FIGHT',
    midas: 'HIGH ROLLER STARTS AT 60/100 EACH FIGHT',
    joker: 'JACKPOT METER STARTS AT 60/100 EACH FIGHT',
    jukebox: 'THE VOLUME STARTS EACH FIGHT AT 3',
  },
  fang: {
    tesla: 'LIGHTNING HEALS 5 HP',
    midas: 'HIGH ROLLER PAYOFFS HEAL 30 HP',
    joker: 'ALL-JACKPOT SPINS HEAL 30 HP',
    jukebox: 'THE DROP HEALS 30 HP',
  },
  overcharge: {
    tesla: 'YOUR LIGHTNING HITS 30% HARDER',
    midas: 'YOUR HIGH ROLLER PAYOFF ECHOES FOR 1/3 OF ITS DAMAGE',
    joker: 'YOUR ALL-JACKPOTS SPIN ECHOES FOR 1/3 OF ITS DAMAGE',
  },
  wildcard: {
    tesla: 'EACH WILD ON YOUR PAYLINE CHARGES LIGHTNING 5',
    joker: 'EACH WILD ON YOUR PAYLINE ADDS 10 TO YOUR JACKPOT METER',
    jukebox: 'EACH WILD ON YOUR PAYLINE TURNS THE VOLUME UP 1',
  },
  bell: {
    knight: 'JACKPOTS PAY X2',
    tesla: 'JACKPOTS PAY X2 AND FULLY CHARGE YOUR LIGHTNING',
    midas: 'JACKPOTS PAY X2 AND FILL YOUR HIGH ROLLER BAR',
    joker: 'JACKPOTS PAY X1.25 AND FILL YOUR JACKPOT METER',
    jukebox: 'JACKPOTS PAY X2 AND MAX YOUR VOLUME (NOT ON THE DROP)',
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
/** Relics that make no sense on a machine even reworded (never offered there). */
/** Content wave 1: offered in drafts, shops and RELIC RUSH, but not in the starting pick (it keeps each machine's signature relics). */
export const WAVE1: ReadonlySet<RelicId> = new Set<RelicId>(['tower', 'headsman', 'capacitor', 'livewire', 'encore', 'downpour', 'coup', 'compound', 'meltdown', 'pulse', 'deckdrum', 'wildcard', 'loadedreel',
  // (2026-10-14) Slow or economy relics: a trap as the one relic you start with.
  'regular', 'housetax', 'punchcard']);
export const MACHINE_EXCLUDE: Partial<Record<RelicId, CabinetId[]>> = { overcharge: ['jukebox'], bash: ['tesla', 'joker'], wildcard: ['knight', 'midas'] };

/** New-relic numbers (playtest/RELIC_PROPOSALS.md, tuned in the engine). */
export const NEW_RELIC = {
  /** GREATSWORD (KNIGHT): sword groups pay this much more. */
  greatswordMul: 1.5,
  /** ARMORED CAR: this much shield counts as one chip for HIGH ROLLER. */
  armoredShield: UNIT / 2,
  /** SAFE DEPOSIT: your first chip hit each spin also deals this many times this spin's shield. */
  safeDepositMul: 1,
  /** CONTENT_13: CHARM BRACELET +5% per charm type; METRONOME every 3rd spin x1.5; SNAKE EYES heal; TESLA COIL charge
   * (once a spin: 5 per bolt gave TESLA 21%). */
  braceletPer: 0.05,
  metronomeEvery: 3,
  metronomeMul: 1.5,
  snakeHeal: 25,
  coilCharge: 5,
  drumStep: UNIT / 5,
  drumCap: 5,
  chainmailShare: 0.1,
  // CONTENT WAVE 1.
  /** ...at most this share of your max HP a blocked hit. */
  towerShare: 0.25,
  towerCap: 0.1,
  headsmanPct: 0.02,
  capacitorShare: 0.25,
  livewireMul: 0.3,
  /** ...HP a storm (flat). */
  livewireCost: 1,
  encoreKeep: 0.3,
  downpourStep: 0.4,
  /** ...the sword multiplier there. */
  coupBossMul: 2,
  compoundCap: 4,
  meltdownCap: 0.5,
  /** ...lightning +1% per HP missing. */
  meltdownRate: 0.01,
  /** DECK DRUM: per stack on each card (WAR DRUM's half: cards land far more often than swords). */
  deckdrumStep: UNIT / 10,
  wildcardCharge: UNIT / 2,
  /** WILD CARD on JAX's jackpot meter. */
  wildcardMeter: UNIT,
  faradayShare: 0.25,
  staticCharge: UNIT,
  capbellsHeal: UNIT,
  executionerMul: 3,
  horseshoeMul: 3,
  underdogMul: 1.5,
  firstbloodMul: 3,
  piggyPer: 5,
  piggyMax: 4,
  trophyHp: UNIT,
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
  common: ['clover', 'battery', 'fang', 'bandage', 'firstblood', 'piggy', 'trophy', 'bash', 'hotstreak', 'metronome', 'snakeeyes', 'tipjar', 'housetax', 'regular', 'punchcard', 'dryspell'],
  uncommon: ['greatsword', 'armoredcar', 'safedeposit', 'prism', 'hone', 'mirror', 'chalice', 'drum', 'chainmail', 'faraday', 'static', 'capbells', 'horseshoe', 'underdog', 'holywater', 'belt', 'bracelet', 'coil', 'rainmaker', 'slushfund', 'tower', 'headsman', 'capacitor', 'livewire', 'encore', 'downpour', 'coup', 'compound', 'meltdown', 'pulse', 'deckdrum', 'wildcard', 'loadedreel', 'turntable', 'mixtape', 'subwoofer', 'goldenspin', 'insurance', 'hitmaker', 'houseofcards', 'parachute'],
  legendary: ['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass', 'pitboss'],
};

export const LEGENDARY: ReadonlySet<RelicId> = new Set<RelicId>(['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass', 'pitboss']);
/** WHETSTONE BELT: per blocked hit, every sword in your next sword group gets this much more (up to BELT_MAX stacks). */
export const BELT_STEP = 2 * UNIT;
export const BELT_MAX = 1;
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

export const CLOVER_CHANCE = 0.3;
export const BATTERY_ENERGY = 3 * UNIT;
/** Battery on a MIDAS / JAX meter: it starts this full. */
export const BATTERY_SHARE = 0.6;
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
  bracelet: 'charm',
  prism: 'wild',
  chalice: 'vamp',
  // Relics that feed a meter: every slot machine but KNIGHT.
  battery: 'meter',
  overcharge: 'meter',
  fang: 'meter',
  // Wave 1: wild relics wait until you have wilds.
  wildcard: ['wild', 'meter'],
  loadedreel: 'wild',
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
