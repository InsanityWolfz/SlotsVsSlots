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
  | 'empty'
  | 'wild'
  // Act 2 writers
  | 'bomb'
  | 'hex'
  | 'fangs'
  | 'mimicSym';

/**
 * Gilded cells (enhancements that persist for the run):
 * GOLD pays x2, KEEN swords pierce shields, CHARGED bolts give +1 energy, SPIKED shields on your
 * payline hit back for 2 when you're struck.
 */
export type Enh = 'gold' | 'keen' | 'charged' | 'spiked' | 'vamp' | 'lucky' | 'blaze';
export interface Gild {
  reel: number;
  symbol: SymbolId;
  enh: Enh;
  /** Tier II (act 2 upgrade of a gild you already own). */
  tier?: 2;
}
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
  | 'reflect';
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
  | 'mittens'
  | 'lockpick'
  | 'mousetrap'
  | 'pickaxe'
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
  | 'sandglass';

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
  boss?: 'house' | 'mirror' | null;
  /** Enhanced cells, applied to matching symbols on each reel at fight start. */
  gilded?: Gild[];
  /** Boss fight: chips carried in grant this much shield at the start of each House turn. */
  stackShield?: number;
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
  /** null = new random seed each fight. */
  seed: number | null;
}

export const reels3 = (c: StripCounts): StripCounts[] => [{ ...c }, { ...c }, { ...c }];

export function defaultConfig(): GameConfig {
  return {
    player: { hp: 20, strips: reels3({ sword: 4, shield: 4, bolt: 4 }) },
    // Tuned from playtest/PLAYTEST_REPORT.md: ~65% player wins, ~24 turns, cleanse in ~half of fights.
    enemy: { hp: 30, strips: reels3({ sword: 5, shield: 2, slime: 5 }), name: 'SLIME KING', portrait: 'enemyPortrait' },
    base: { sword: 1, shield: 1, bolt: 1, slime: 1, ice: 1, claw: 1, rock: 1, lock: 1, coin: 1, seven: 2, empty: 0, wild: 1, bomb: 1, hex: 1, fangs: 1, mimicSym: 1 },
    pairMult: 2,
    tripleMult: 3,
    pairRule: 'inOrder',
    specialCost: 5,
    specialDamage: 10,
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
