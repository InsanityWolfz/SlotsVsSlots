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
  devilPay: 1.75,
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

/** Passive rule changes. None of them ask for input mid-fight. */
export const RELICS: Record<RelicId, RelicDef> = {
  mirror: { id: 'mirror', name: 'TWIN REELS', text: 'ANY TWO MATCHING REELS COUNT AS A PAIR', sprite: 'relicMirror' },
  fang: { id: 'fang', name: 'VAMPIRE FANG', text: 'YOUR METER PAYOFFS HEAL 30 MORE', sprite: 'relicFang' },
  bandage: { id: 'bandage', name: 'BANDAGE', text: 'HEAL 60 HP AFTER EACH FIGHT', sprite: 'relicBandage' },
  // Build relics: each amplifies one kind of gild, so committing to a build pays a premium.
  prism: { id: 'prism', name: 'PRISM', text: 'A PAIR OR JACKPOT THAT USES A WILD PAYS X2', sprite: 'relicPrism' },
  // Legendary (act 2): big, build-bending effects.
  ticket: { id: 'ticket', name: 'GOLDEN TICKET', text: 'EVERY CHARM IS ONE STEP STRONGER', sprite: 'relicTicket' },
  // STAR CHART (2026-10-15): the build for uncapped symbol levels (Balatro's Telescope, in spirit).
  starchart: { id: 'starchart', name: 'STAR CHART', text: 'EVERY SYMBOL LEVEL YOU GAIN IS DOUBLED', sprite: 'relicStarchart' },
  bell: { id: 'bell', name: 'JACKPOT BELL', text: 'JACKPOTS PAY X2 AND FILL YOUR METER', sprite: 'relicBell' },
  phoenix: { id: 'phoenix', name: 'PHOENIX FEATHER', text: 'SURVIVE LETHAL DAMAGE AT 1 HP ONCE PER FIGHT', sprite: 'relicPhoenix' },
  overcharge: { id: 'overcharge', name: 'OVERCHARGE', text: 'YOUR METER PAYOFF ECHOES FOR 1/3 DAMAGE', sprite: 'relicOvercharge' },
  key: { id: 'key', name: 'SKELETON KEY', text: 'YOUR PAIRS PAY X2', sprite: 'relicKey' },
  sandglass: { id: 'sandglass', name: 'GOLDEN HOURGLASS', text: 'ENEMY ABILITIES CHARGE 1 SPIN SLOWER', sprite: 'relicSandglass' },
  // Slot machine relics: each machine gets an identity relic and a heal that feeds off its own mechanic.
  // CONTENT WAVE 1 (2026-10-07, playtest/CONTENT_WAVE1_REVIEW.md): slot machine relics, one hook each.
  tower: { id: 'tower', name: 'TOWER SHIELD', text: 'RETAIN 25% OF YOUR SHIELD EACH SPIN (MAX 10% OF YOUR HP)', sprite: 'relicTower', machine: 'knight' },
  capacitor: { id: 'capacitor', name: 'CAPACITOR', text: '25% OF LEFTOVER SHIELD CHARGES LIGHTNING', sprite: 'relicCapacitor', machine: 'tesla' },
  livewire: { id: 'livewire', name: 'LIVE WIRE', text: 'LIGHTNING DAMAGE +30%. EACH STORM COSTS 1 HP', sprite: 'relicLivewire', machine: 'tesla' },
  encore: { id: 'encore', name: 'ENCORE', text: 'REFUND 30 TO YOUR JACKPOT METER AFTER IT PAYS', sprite: 'relicEncore', machine: 'joker' },
  // (WILD WHEEL is gone, user 2026-10-14: "the better result" was a judgement call, not a rule.)
  // CONTENT WAVE 1, part 2.
  coup: { id: 'coup', name: 'COUP DE GRACE', text: 'SWORDS PAY X2 WHILE YOU HAVE MORE HP LEFT THAN THE ENEMY', sprite: 'relicCoup', machine: 'knight' },
  compound: { id: 'compound', name: 'COMPOUND', text: 'HIGH ROLLER CAP INCREASES TO X4', sprite: 'relicCompound', machine: 'midas' },
  meltdown: { id: 'meltdown', name: 'MELTDOWN', text: 'LIGHTNING DAMAGE +1% FOR EACH HP YOU ARE MISSING (MAX 50%)', sprite: 'relicMeltdown', machine: 'tesla' },
  deckdrum: { id: 'deckdrum', name: 'DECK DRUM', text: 'EACH PAIR AND JACKPOT INCREASES CARD DAMAGE BY +1 EACH FIGHT (MAX +5)', sprite: 'relicDeckdrum', machine: 'joker' },
  // Charm relics.
  horseshoe: { id: 'horseshoe', name: 'HORSESHOE', text: 'PAIRS AND JACKPOTS MADE WITH A LUCKY WILD PAY X3', sprite: 'relicHorseshoe', charm: 'lucky' },
  // General.
  underdog: { id: 'underdog', name: 'UNDERDOG', text: 'EVERYTHING PAYS X1.5 WHEN YOU ARE UNDER HALF HP', sprite: 'relicUnderdog' },
  holywater: { id: 'holywater', name: 'HOLY WATER', text: 'IGNORE THE FIRST SABOTAGE EACH FIGHT', sprite: 'relicHolywater' },
  // EXPERT_PLAYTEST_10: relics that make a choice (streaky vs steady, turtle-and-counter, keep the liens or pay them).
  hotstreak: { id: 'hotstreak', name: 'HOT STREAK', text: 'AFTER A JACKPOT, YOUR NEXT SPIN PAYS X2', sprite: 'relicHotStreak' },
  // CONTENT_13.
  pitboss: { id: 'pitboss', name: 'PIT BOSS', text: "THE ENEMY'S FIRST JACKPOT EACH FIGHT DOESN'T COUNT", sprite: 'relicPitBoss' },
  // CASH CASSIDY's MAKE IT RAIN relics.
  rainmaker: { id: 'rainmaker', name: 'RAINMAKER', text: 'MAKE IT RAIN COSTS 2 CHIPS INSTEAD OF 5', sprite: 'relicRainmaker', machine: 'midas', addon: true },
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
  houseofcards: { id: 'houseofcards', name: 'HOUSE OF CARDS', text: 'EACH JACKPOT METER PAYOFF ADDS A WILD TO 2 REELS FOR THE FIGHT', sprite: 'relicHouseOfCards', machine: 'joker' },
  parachute: { id: 'parachute', name: 'GOLDEN PARACHUTE', text: 'A HIT THAT WOULD KILL YOU: PAY 10 CHIPS, LAND AT 25% HP (ONCE PER FIGHT)', sprite: 'relicParachute', machine: 'midas' },
  // The BIG CHOICES that stayed, as legendary relics (user, 2026-10-15). Each keeps its price, said on the card.
  secondline: { id: 'secondline', name: 'SECOND PAYLINE', text: `THE ROW ABOVE YOUR PAYLINE PAYS ITS PAIRS AND JACKPOTS AT HALF. ENEMIES HIT ${pct(LEGEND_RELIC.lineDmg - 1)}% HARDER`, sprite: 'relicLoadedreel' },
  devilsdue: { id: 'devilsdue', name: "DEVIL'S DUE", text: `EVERYTHING PAYS X${LEGEND_RELIC.devilPay}. -${pct(LEGEND_RELIC.devilDecay)}% MAX HP AFTER EVERY FIGHT YOU WIN`, sprite: 'relicChalice' },
  longgame: { id: 'longgame', name: 'THE LONG GAME', text: `EVERYTHING PAYS ${pct(1 - LEGEND_RELIC.longStart)}% LESS, +${pct(LEGEND_RELIC.longStep)}% FOR EVERY FIGHT YOU WIN`, sprite: 'relicMetronome' },
  quickening: { id: 'quickening', name: 'QUICKENING', text: 'YOUR METER STARTS EVERY FIGHT FULL. ENEMY ABILITIES CHARGE 1 SPIN FASTER', sprite: 'relicBattery' },
  glasscannon: { id: 'glasscannon', name: 'GLASS CANNON', text: `PAIRS AND JACKPOTS PAY X${LEGEND_RELIC.glassPay}. NO HEALING BETWEEN FIGHTS`, sprite: 'relicFirstblood' },
  crusade: { id: 'crusade', name: 'CRUSADE', text: `+${LEGEND_RELIC.crusadeStep} SWORD DAMAGE FOR EVERY FIGHT YOU WIN`, sprite: 'relicDrum', machine: 'knight' },
  chainlightning: { id: 'chainlightning', name: 'CHAIN LIGHTNING', text: `LIGHTNING DAMAGE +${pct(LEGEND_RELIC.chainAdd)}%`, sprite: 'relicCoil', machine: 'tesla' },
  highcard: { id: 'highcard', name: 'HIGH CARD', text: `JACKPOTS AND JACKPOT METER PAYOFFS PAY X${LEGEND_RELIC.highCardMul}. PAIRS PAY HALF`, sprite: 'relicWildcard', machine: 'joker' },
  hypeman: { id: 'hypeman', name: 'HYPE MAN', text: "+1 VOLUME BEFORE EVERY OTHER SPIN. NOTES PAY HALF WHEN IT ISN'T THE DROP", sprite: 'relicPulse', machine: 'jukebox' },
  openbar: { id: 'openbar', name: 'OPEN BAR', text: 'MAKE IT RAIN COSTS NOTHING. WINS PAY NO CHIPS', sprite: 'relicTipJar', machine: 'midas' },
};

/**
 * A relic's card text on a given slot machine: meter relics speak your machine's language
 * (LIGHTNING, the HIGH ROLLER bar, the JACKPOT METER). Without a machine, the generic text.
 */
const MACHINE_TEXT: Partial<Record<RelicId, Partial<Record<CabinetId, string>>>> = {
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
/** THE SCORE RACE: what an HP relic does in a race (fight.ts RACE_RULES, run.ts RACE). */
export const RACE_RELIC_TEXT: Partial<Record<RelicId, string>> = {
  underdog: 'EVERYTHING PAYS X1.5 WHILE YOU ARE BEHIND',
  coup: 'SWORDS PAY X2 WHILE YOU ARE AHEAD',
  phoenix: 'ONCE A RUN, A LOST RACE DOES NOT END IT',
  bandage: 'START EVERY RACE HOLDING 30 SHIELD',
  fang: 'YOUR METER PAYOFFS GIVE YOU A HOLD',
  insurance: 'THE FIRST TIME YOU FALL 30% BEHIND: A NUDGE',
  tower: 'YOUR SHIELD STAYS UNTIL A BLOCK SPENDS IT',
  parachute: 'ONE MORE RESPIN EVERY RACE',
  meltdown: 'LIGHTNING +10% FOR EVERY SPIN YOU HAVE PLAYED (MAX 50%)',
};
export const relicText = (r: RelicId, cabinet?: CabinetId | null, race = false) => {
  const t = (race ? RACE_RELIC_TEXT[r] : undefined) ?? (cabinet && MACHINE_TEXT[r]?.[cabinet]) ?? RELICS[r].text;
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
export const WAVE1: ReadonlySet<RelicId> = new Set<RelicId>(['regular', 'housetax', 'punchcard', 'starchart']);
/** Relics that make no sense on a machine even reworded (never offered there). */
export const MACHINE_EXCLUDE: Partial<Record<RelicId, CabinetId[]>> = { overcharge: ['jukebox'], bash: ['tesla', 'joker'] };

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
  common: ['fang', 'bandage', 'bash', 'hotstreak', 'housetax', 'regular', 'punchcard', 'dryspell'],
  uncommon: ['starchart', 'greatsword', 'armoredcar', 'safedeposit', 'prism', 'mirror', 'horseshoe', 'underdog', 'holywater', 'rainmaker', 'tower', 'capacitor', 'livewire', 'encore', 'coup', 'compound', 'meltdown', 'deckdrum', 'turntable', 'mixtape', 'subwoofer', 'goldenspin', 'insurance', 'hitmaker', 'houseofcards', 'parachute'],
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
