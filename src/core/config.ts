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
  /** THE WHEEL's own symbol: the ivory BALL. A pair on its payline bets 1 more chip on you, a jackpot 2. */
  | 'ball'
  | 'empty'
  | 'wild'
  // Act 2 writers
  | 'bomb'
  | 'hex'
  | 'fangs'
  | 'mimicSym'
  // Act 2 counter-enemy
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
  /** JESTER JAX's attack symbol: a playing card (shown as CARD; 'card' is the Dealer's mark). It hits like a sword. */
  | 'ace'
  /** DJ DECIBEL's attack symbol (THE JUKEBOX): a NOTE turns up the volume. It hits like a sword. */
  | 'note'
  /** THE SCORE RACE: the CHERRY scatter (pays for every cherry in sight, payline or not). */
  | 'cherry'
  /** THE NEW GAME's classic BAR payer. */
  | 'bar'
  /** THE SCORE RACE: X2 on your payline doubles the spin's pay (it pays nothing itself). */
  | 'double';

/** The player's sword-like symbols: they hit, take KEEN and VAMP, and feed the sword relics. */
export const BLADES: ReadonlySet<SymbolId> = new Set<SymbolId>(['sword', 'ace', 'note']);
/** A symbol's name on screen (code ids that read differently: goldbar is a CHIP, ace is a CARD). */
export const symLabel = (s: SymbolId): string => (s === 'goldbar' ? 'CHIP' : s === 'ace' ? 'CARD' : s === 'double' ? 'X2' : s.toUpperCase());

/**
 * CHARMS live on single cells (code name: gild / enh). GOLD adds a multiplier, KEEN swords add base
 * and pierce, VAMP swords heal, LUCKY cells can land as WILDs, CHARGED / BLAZE bolts feed TESLA's
 * special. SPIKED is retired; the id stays so old saves still read.
 */
export type Enh = 'gold' | 'keen' | 'charged' | 'spiked' | 'vamp' | 'lucky' | 'blaze' | 'lucre' | 'trick' | 'echo' | 'glass';
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
  | 'launder'
  // Act 3
  | 'mark'
  | 'penalty'
  | 'houseTake'
  | 'deal'
  // THE WHEEL (act 2 boss): PLACE YOUR BETS, and every few turns NO MORE BETS
  | 'bets'
  // THE GATEKEEPER (fight 4 of every act): repossesses a cell until the act's boss falls
  | 'repo'
  // THE OWNER (ENDLESS loop 5): EVERY TRICK IN THE BOOK, a different enemy's trick each time; every other one is THE HAMMER
  | 'owner'
  | 'hammer';
export interface AbilityDef {
  kind: AbilityKind;
  /** Enemy turns per charge. */
  every: number;
  power: number;
}

export type RelicId =
  | 'mirror'
  | 'fang'
  | 'bandage'
  | 'prism'
  // Legendary (act 2)
  | 'ticket'
  | 'starchart'
  | 'bell'
  | 'phoenix'
  | 'overcharge'
  | 'key'
  | 'sandglass'
  // Charm relic
  // Slot machine relics (only offered on that machine)
  // CONTENT WAVE 1 (2026-10-07): one hook each
  | 'capacitor'
  | 'encore'
  | 'livewire'
  | 'tower'
  | 'coup'
  | 'compound'
  | 'meltdown'
  | 'deckdrum'
  // Charm relics
  | 'horseshoe'
  // General
  | 'underdog'
  | 'holywater'
  | 'bash'
  // EXPERT_PLAYTEST_10's new relics
  | 'hotstreak'
  // CONTENT_13
  | 'pitboss'
  // CASH CASSIDY (MAKE IT RAIN)
  | 'rainmaker'
  // Side bets
  // THE JUKEBOX (2026-10-08)
  | 'turntable'
  | 'mixtape'
  | 'subwoofer'
  // CASH CASSIDY's shield build (user, 2026-10-12).
  | 'armoredcar'
  // KNIGHT's multiplier relic (2026-10-12).
  | 'greatsword'
  | 'safedeposit'
  // The user's picks from the content list (2026-10-14).
  | 'dryspell'
  | 'punchcard'
  | 'goldenspin'
  | 'insurance'
  | 'housetax'
  | 'regular'
  | 'hitmaker'
  | 'houseofcards'
  | 'parachute'
  // The BIG CHOICES that stayed, as legendary relics (user, 2026-10-15): each keeps its trade-off.
  | 'secondline'
  | 'devilsdue'
  | 'longgame'
  | 'quickening'
  | 'glasscannon'
  | 'crusade'
  | 'chainlightning'
  | 'highcard'
  | 'hypeman'
  | 'openbar';

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
  boss?: 'house' | 'wheel' | 'dealer' | 'owner' | null;
  /** Charmed cells, dealt onto matching symbols on each reel at fight start. */
  gilded?: Gild[];
  /** Symbol and charm levels (the player). */
  levels?: Levels;
  /** GLASS CANNON / DEVIL'S DUE / THE LONG GAME: every paying group pays this much (run.ts legendPayMul). */
  payMul?: number;
  /** CRUSADE: each sword hits for this much more (it grows with every win). */
  swordBonus?: number;
  /** ENDLESS, KNIGHT's VETERAN: swords and shields pay this much more (grows each loop cleared). */
  veteranMul?: number;
  /** ENDLESS, JUKEBOX's WARM-UP: the volume each fight starts at. */
  volumeStart?: number;
  /** FAST NIGHT: your meter fills this many times faster. */
  meterMul?: number;
  /** Boss fight: chips carried in grant this much shield at the start of each House turn. */
  stackShield?: number;
  /** THE DECK REMEMBERS: marked cards waiting on this side's reels when the fight starts. */
  startMarks?: number;
  /** THE SCORE RACE's spin tools this fight: HOLD (keep a reel before a spin), NUDGE and RESPIN (after it lands). */
  holds?: number;
  nudges?: number;
  respins?: number;
  /** Which act this side comes from (enemy). */
  act?: number;
  /** ENDLESS: enemy damage multiplier (1.12^loop), LAST CALL / 80-turn cap on, and a starting shield (HOUSE EDGE). */
  dmgMul?: number;
  /** BLACK and up: enemies hit this much harder (stakes.ts stakeDmg; its own note on the banner). */
  stakeDmg?: number;
  endless?: boolean;
  /** ENDLESS: the loop this fight is in (the Dealer's ALL IN grows with it). */
  loop?: number;
  startShield?: number;
  /** SECOND PAYLINE (legendary relic): the enemy's hits are this much harder. */
  lineDmg?: number;
  /** THE OWNER: TURBO.hp HP, every hit takes 1 (TURBO in enemies.ts). */
  owner?: boolean;
  /** HOUSE EDGE "EARLY BIRD": the enemy spins first. */
  first?: boolean;
  /** MIDAS: chips held when the fight starts (the VAULT pre-fills from them). */
  chipsHeld?: number;
  /** Boss sizing: your real max HP (the sizing dummy's HP is huge, so %-of-max-HP relics read this instead). */
  sizeHp?: number;
  /** HOUSE EDGE "HOUSE CUT": your healing multiplier. */
  healMul?: number;
  /** Relics this side carries. */
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
  /** ENDLESS: TONIGHT'S RULE, for both machines (run.ts NIGHTS). */
  night?: 'happy' | 'limit' | 'lucky' | 'showdown' | 'iron' | 'fast';
  /** OVERTIME (TEST, roadmap phase 1): the fight clock, both machines' hits (enemies.ts OVERTIME). */
  overtime?: boolean;
  /** null = new random seed each fight. */
  seed: number | null;
  /**
   * THE SCORE RACE (sandbox, user 2026-10-15): no HP. Both machines spin `spins` times; what a spin pays is its score
   * (the enemy's x enemyMul), and the higher score wins. A shield you hold when the enemy's ability fires blocks it.
   */
  race?: { spins: number; enemyMul: number; /** GOLEM: its score each spin per rock on your reels. */ perRock?: number };
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
    base: { sword: UNIT, shield: UNIT, bolt: UNIT, slime: UNIT, ice: UNIT, claw: UNIT, rock: UNIT, lock: UNIT, coin: UNIT, seven: 2 * UNIT, ball: UNIT, empty: 0, wild: UNIT, bomb: UNIT, hex: UNIT, fangs: UNIT, mimicSym: UNIT, fake: UNIT, card: UNIT, gavel: UNIT, rake: UNIT, bonusSym: 0, relicSym: 0, goldbar: UNIT, ace: UNIT, note: UNIT, cherry: 0, double: 0, bar: 0 },
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
