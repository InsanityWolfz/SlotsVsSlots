export type SideId = 'player' | 'enemy';
export type SymbolId = 'sword' | 'shield' | 'bolt' | 'slime';
export type StripCounts = Partial<Record<SymbolId, number>>;

/** When a combatant's shield drops to 0. */
export type ShieldReset = 'ownTurnStart' | 'roundEnd' | 'never';
/** inOrder: only a run starting at reel 1 counts (real slot). anyTwo: any 2 matching symbols. */
export type PairRule = 'inOrder' | 'anyTwo';

export interface SideConfig {
  hp: number;
  /** One composition per reel, left to right. */
  strips: StripCounts[];
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
  /** null = new random seed each fight. */
  seed: number | null;
}

const reels3 = (c: StripCounts): StripCounts[] => [{ ...c }, { ...c }, { ...c }];

export function defaultConfig(): GameConfig {
  return {
    player: { hp: 20, strips: reels3({ sword: 4, shield: 4, bolt: 4 }) },
    enemy: { hp: 40, strips: reels3({ sword: 4, shield: 4, slime: 4 }) },
    base: { sword: 1, shield: 1, bolt: 1, slime: 1 },
    pairMult: 2,
    tripleMult: 3,
    pairRule: 'inOrder',
    specialCost: 5,
    specialDamage: 10,
    specialIgnoresShield: true,
    shieldReset: 'ownTurnStart',
    cleanseOnSlimeTriple: true,
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
  };
}
