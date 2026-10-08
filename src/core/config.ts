export type SideId = 'player' | 'enemy';
/**
 * Every symbol that can sit on a strip. Which symbols "write" on the opponent depends on the
 * side: an enemy whose strips contain ice freezes you; ice on your own payline is dead.
 * 'empty' is what a stolen cell scores as.
 */
export type SymbolId =
  | 'sword'
  | 'shield'
  | 'bolt'
  | 'slime'
  | 'ice'
  | 'claw'
  | 'rock'
  | 'lock'
  | 'coin'
  | 'seven'
  /** THE MIRROR's own symbol: a shard throws your last hit back. */
  | 'shard'
  | 'empty'
  | 'wild'
  // Act 2 writers
  | 'bomb'
  | 'hex'
  | 'fangs'
  | 'mimicSym'
  // Act 2 counter-enemies
  | 'ground'
  | 'fake'
  // Act 3
  | 'card'
  | 'gavel'
  | 'rake'
  // The player's chase symbols (BONUS WHEEL / RELIC RUSH)
  | 'bonusSym'
  | 'relicSym'
  // Signature symbols (each fills its slot machine's meter)
  | 'goldbar'
  | 'thorn'
  /** JESTER JAX's attack symbol: a playing card (shown as CARD; 'card' is the Dealer's mark). It hits like a sword. */
  | 'ace';

/** The player's sword-like symbols: they hit, take KEEN and VAMP, and feed the sword relics. */
export const BLADES: ReadonlySet<SymbolId> = new Set<SymbolId>(['sword', 'ace']);
/** A symbol's name on screen (code ids that read differently: goldbar is a CHIP, ace is a CARD). */
export const symLabel = (s: SymbolId): string => (s === 'goldbar' ? 'CHIP' : s === 'ace' ? 'CARD' : s.toUpperCase());

/**
 * CHARMS live on single cells (code name: gild / enh). GOLD adds a multiplier, KEEN swords add base
 * and pierce, VAMP swords heal, LUCKY cells can land as WILDs, CHARGED / BLAZE bolts feed TESLA's
 * special. SPIKED is retired (BRIAR's thorns replaced it); the id stays so old saves still read.
 */
export type Enh = 'gold' | 'keen' | 'charged' | 'spiked' | 'vamp' | 'lucky' | 'blaze' | 'thorny' | 'lucre' | 'trick';
/** `n` cells of `symbol` on reel `reel` carry charm `enh` (at most one charm per cell). */
export interface Gild {
  reel: number;
  symbol: SymbolId;
  enh: Enh;
  n: number;
}
/** Levels live on the TYPE: every sword (or gold charm), including ones added later. Level 1 = base. */
export interface Levels {
  sym: Partial<Record<SymbolId, number>>;
  charm: Partial<Record<Enh, number>>;
}
export const emptyLevels = (): Levels => ({ sym: {}, charm: {} });
export type StripCounts = Partial<Record<SymbolId, number>>;

/** When a combatant's shield drops to 0. */
export type ShieldReset = 'ownTurnStart' | 'roundEnd' | 'never';
/** inOrder: only a run starting at reel 1 counts (real slot). anyTwo: any 2 matching symbols. */
export type PairRule = 'inOrder' | 'anyTwo';

/**
 * Enemy special that charges one pip per enemy turn and fires when full. Always visible on
 * the enemy HUD as a countdown — a passive telegraph, never an input prompt.
 */
export type AbilityKind =
  | 'flood'
  | 'smash'
  | 'fortify'
  | 'blizzard'
  | 'pilfer'
  | 'quake'
  | 'jam'
  | 'jackpot'
  // Act 2
  | 'carpet'
  | 'curse'
  | 'bloodmoon'
  | 'gulp'
  | 'reflect'
  | 'earth'
  | 'launder'
  // Act 3
  | 'mark'
  | 'penalty'
  | 'houseTake'
  | 'deal'
  // THE GATEKEEPER (fight 4 of every act): repossesses a cell until the act's boss falls
  | 'repo';
export interface AbilityDef {
  kind: AbilityKind;
  /** Enemy turns per charge. */
  every: number;
  power: number;
}

export type RelicId =
  | 'clover'
  | 'battery'
  | 'mirror'
  | 'fang'
  | 'bandage'
  | 'crown'
  | 'midas'
  | 'rod'
  | 'cactus'
  | 'prism'
  | 'hone'
  // Legendary (act 2)
  | 'ticket'
  | 'bell'
  | 'phoenix'
  | 'overcharge'
  | 'key'
  | 'sandglass'
  // Charm relic
  | 'chalice'
  // Slot machine relics (only offered on that machine)
  | 'drum'
  | 'chainmail'
  | 'vault'
  | 'decree'
  | 'rosehip'
  | 'graft'
  | 'faraday'
  | 'static'
  | 'capbells'
  | 'stacked'
  // CONTENT WAVE 1 (2026-10-07): one hook each
  | 'bramble'
  | 'riposte'
  | 'capacitor'
  | 'encore'
  | 'downpour'
  | 'nestegg'
  | 'wildwheel'
  | 'livewire'
  | 'headsman'
  | 'tower'
  | 'coup'
  | 'compound'
  | 'hedge'
  | 'meltdown'
  | 'pulse'
  | 'wildcard'
  | 'loadedreel'
  | 'deckdrum'
  // Charm relics (hone = EXECUTIONER, midas = GOLD LEAF keep their old ids for saves)
  | 'kiss'
  | 'horseshoe'
  // General
  | 'underdog'
  | 'firstblood'
  | 'piggy'
  | 'trophy'
  | 'holywater'
  | 'bash'
  // EXPERT_PLAYTEST_10's new relics
  | 'hotstreak'
  | 'belt'
  | 'toll'
  // CONTENT_13
  | 'bracelet'
  | 'metronome'
  | 'snakeeyes'
  | 'pitboss'
  | 'coil'
  | 'taxman'
  // CASH CASSIDY (MAKE IT RAIN)
  | 'loadedchips'
  | 'rainmaker'
  | 'slushfund'
  | 'tipjar'
  | 'loosechange'
  // Side bets
  | 'loaded'
  | 'marker'
  | 'highlimit';

/** The fight rules a BIG CHOICE can add (the player's side only; set on the run, passed to every fight). */
export interface BigMods {
  /** EXCALIBUR: sword pairs pay as jackpots... */
  swordPairJackpot?: boolean;
  /** ...and shield pairs block nothing. */
  shieldPairsBlockNothing?: boolean;
  /** SHIELD WALL: your shield never resets, up to this share of your max HP. */
  shieldKeep?: number;
  /** SHIELD SLAM: shields also hit for this share of what they block. */
  shieldSlam?: number;
  /** CRUSADE: each sword hits for this much more. */
  swordBonus?: number;
  /** CHAIN LIGHTNING: every lightning strike hits twice. */
  strikeTwice?: boolean;
  /** MAD SCIENCE: lightning damage multiplier... */
  lightningMul?: number;
  /** ...and each storm costs this share of your max HP. */
  stormCost?: number;
  /** STORM FRONT: a lightning strike opens every fight. */
  startStrike?: boolean;
  /** GROUND WIRE: each lightning strike heals this much more. */
  strikeHeal?: number;
  /** DOUBLE FEATURE: the jackpot meter pays two spins in a row. */
  doublePayoff?: boolean;
  /** HIGH CARD: jackpots (and meter payoffs) pay this much more; pairs pay this much. */
  jackpotMul?: number;
  pairMul?: number;
  /** TRUMP CARD: these symbols' damage pierces shields. */
  pierce?: SymbolId[];
  /** NO LIMIT: HIGH ROLLER has no max. */
  noHighRollerCap?: boolean;
  /** OPEN BAR / MONSOON: what MAKE IT RAIN costs. */
  rainCost?: number;
  /** MONSOON: every chip pair makes it rain, at full damage. */
  monsoon?: boolean;
  /** QUICKENING: your meter starts every fight full. */
  startFull?: boolean;
  /** WARDED: this many sabotages a fight wash off. */
  wards?: number;
}

export interface SideConfig {
  hp: number;
  /** One composition per reel, left to right. */
  strips: StripCounts[];
  /** HP at fight start if below max (run carry-over). */
  startHp?: number;
  startEnergy?: number;
  name?: string;
  /** Sprite id for the HUD portrait. */
  portrait?: string;
  ability?: AbilityDef | null;
  /** Boss rule set, if any. */
  boss?: 'house' | 'mirror' | 'dealer' | null;
  /** Charmed cells, dealt onto matching symbols on each reel at fight start. */
  gilded?: Gild[];
  /** Symbol and charm levels (the player, and the Mirror's copy of your symbol levels). */
  levels?: Levels;
  /** GLASS CANNON: every paying group pays this much more. */
  payMul?: number;
  /** BLOOD PACT: your meter fills this many times faster. */
  meterMul?: number;
  /** BIG CHOICES that change the fight itself (the player only). */
  big?: BigMods;
  /** Boss fight: chips carried in grant this much shield at the start of each House turn. */
  stackShield?: number;
  /** BONUS WHEEL / RELIC RUSH symbols ride on this side's reels (run fights only). */
  bonusSymbols?: boolean;
  /** THE DECK REMEMBERS: marked cards waiting on this side's reels when the fight starts. */
  startMarks?: number;
  /** Which act this side comes from (enemy). */
  act?: number;
  /** ENDLESS: enemy damage multiplier (1.12^loop), LAST CALL / 80-turn cap on, and a starting shield (HOUSE EDGE). */
  dmgMul?: number;
  endless?: boolean;
  startShield?: number;
  /** HOUSE EDGE "EARLY BIRD": the enemy spins first. */
  first?: boolean;
  /** MIDAS: chips held when the fight starts (the VAULT pre-fills from them). */
  chipsHeld?: number;
  /** Boss sizing: your real max HP (the sizing dummy's HP is huge, so %-of-max-HP relics read this instead). */
  sizeHp?: number;
  /** The side bet on this fight (MIDAS cashes it mid-fight, into the vault). */
  sideBet?: import('./bets').PlacedBet;
  /** HOUSE EDGE "HOUSE CUT": your healing multiplier. */
  healMul?: number;
  /** Relics this side carries (the Mirror copies one at GREEN stake). */
  relics?: RelicId[];
}

export interface GameConfig {
  player: SideConfig;
  enemy: SideConfig;
  /** Base value of one symbol on the payline, before multipliers. */
  base: Record<SymbolId, number>;
  pairMult: number;
  tripleMult: number;
  pairRule: PairRule;
  specialCost: number;
  specialDamage: number;
  specialIgnoresShield: boolean;
  shieldReset: ShieldReset;
  cleanseOnSlimeTriple: boolean;
  /** Player relics active this fight. */
  relics: RelicId[];
  /** The run's starting machine (its rules apply in every fight). */
  cabinet?: import('./cabinets').CabinetId;
  /** HIGH STAKES level of the run (0 = base game). */
  stake?: number;
  /** null = new random seed each fight. */
  seed: number | null;
}

/** Every number in the game is on a x10 scale (a plain symbol pays 10). The presentation divides by this where it counts pips. */
export const UNIT = 10;

/** Round to whole UNITs (so halves and thirds of x10 numbers stay on the old grid). */
export const unitsUp = (x: number) => Math.ceil(x / UNIT - 1e-9) * UNIT;
export const unitsRound = (x: number) => Math.round(x / UNIT) * UNIT;
export const unitsDown = (x: number) => Math.floor(x / UNIT + 1e-9) * UNIT;

export const reels3 = (c: StripCounts): StripCounts[] => [{ ...c }, { ...c }, { ...c }];

export function defaultConfig(): GameConfig {
  return {
    player: { hp: 20 * UNIT, strips: reels3({ sword: 4, shield: 4, bolt: 4 }) },
    // Tuned from playtest/PLAYTEST_REPORT.md: ~65% player wins, ~24 turns, cleanse in ~half of fights.
    enemy: { hp: 30 * UNIT, strips: reels3({ sword: 5, shield: 2, slime: 5 }), name: 'SLIME KING', portrait: 'enemyPortrait' },
    base: { sword: UNIT, shield: UNIT, bolt: UNIT, slime: UNIT, ice: UNIT, claw: UNIT, rock: UNIT, lock: UNIT, coin: UNIT, seven: 2 * UNIT, shard: UNIT, empty: 0, wild: UNIT, bomb: UNIT, hex: UNIT, fangs: UNIT, mimicSym: UNIT, ground: UNIT, fake: UNIT, card: UNIT, gavel: UNIT, rake: UNIT, bonusSym: 0, relicSym: 0, goldbar: UNIT, thorn: UNIT, ace: UNIT },
    pairMult: 2,
    tripleMult: 3,
    pairRule: 'inOrder',
    specialCost: 5 * UNIT,
    specialDamage: 10 * UNIT,
    specialIgnoresShield: true,
    shieldReset: 'ownTurnStart',
    cleanseOnSlimeTriple: true,
    relics: [],
    seed: null,
  };
}

export function cloneConfig(c: GameConfig): GameConfig {
  return JSON.parse(JSON.stringify(c)) as GameConfig;
}

/** Merge a partial/stale saved config over defaults so new fields always exist. */
export function mergeConfig(saved: unknown): GameConfig {
  const base = defaultConfig();
  if (!saved || typeof saved !== 'object') return base;
  const s = saved as Partial<GameConfig>;
  return {
    ...base,
    ...s,
    player: { ...base.player, ...(s.player ?? {}) },
    enemy: { ...base.enemy, ...(s.enemy ?? {}) },
    base: { ...base.base, ...(s.base ?? {}) },
    relics: s.relics ?? [],
  };
}
