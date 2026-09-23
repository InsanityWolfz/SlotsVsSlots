import type { AbilityDef, SideConfig, StripCounts, SymbolId } from './config';
import type { Rng } from './rng';

/** An enemy template. Every enemy writes something onto the player's machine. */
export interface Archetype {
  id: string;
  name: string;
  portrait: string;
  /** Per-reel strip composition before jitter. */
  strip: StripCounts;
  /** HP multiplier on the depth curve. */
  hpMul: number;
  ability: AbilityDef;
  /** Earliest fight (0-based) this archetype can appear at. */
  minDepth: number;
  /** One-line description for the intent/telegraph tooltip and the run map. */
  blurb: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'slime',
    name: 'SLIME',
    portrait: 'enemyPortrait',
    strip: { sword: 5, shield: 2, slime: 5 },
    hpMul: 1,
    ability: { kind: 'flood', every: 4, power: 3 },
    minDepth: 0,
    blurb: 'SLIMES YOUR SYMBOLS',
  },
  {
    id: 'brute',
    name: 'BRUTE',
    portrait: 'enemyBrute',
    strip: { sword: 6, shield: 6 },
    hpMul: 1.1,
    ability: { kind: 'smash', every: 3, power: 4 },
    minDepth: 0,
    blurb: 'HITS HARD',
  },
  {
    id: 'frost',
    name: 'FROST IMP',
    portrait: 'enemyFrost',
    strip: { sword: 5, shield: 2, ice: 5 },
    hpMul: 0.9,
    ability: { kind: 'blizzard', every: 4, power: 2 },
    minDepth: 1,
    blurb: 'FREEZES YOUR REELS',
  },
  {
    id: 'thief',
    name: 'RAT THIEF',
    portrait: 'enemyThief',
    strip: { sword: 5, shield: 3, claw: 4 },
    hpMul: 0.9,
    ability: { kind: 'pilfer', every: 3, power: 1 },
    minDepth: 1,
    blurb: 'STEALS YOUR BEST SYMBOLS',
  },
  {
    id: 'golem',
    name: 'ROCK GOLEM',
    portrait: 'enemyGolem',
    strip: { sword: 4, shield: 4, rock: 4 },
    hpMul: 1.25,
    ability: { kind: 'quake', every: 4, power: 2 },
    minDepth: 2,
    blurb: 'CLUTTERS YOUR STRIP WITH ROCKS (PERMANENT)',
  },
  {
    id: 'gremlin',
    name: 'GREMLIN',
    portrait: 'enemyGremlin',
    strip: { sword: 5, shield: 3, lock: 4 },
    hpMul: 0.95,
    ability: { kind: 'jam', every: 4, power: 2 },
    minDepth: 2,
    blurb: 'JAMS YOUR REELS',
  },
];

export const BOSS: Archetype = {
  id: 'house',
  name: 'THE HOUSE',
  portrait: 'enemyBoss',
  strip: { sword: 4, shield: 3, coin: 3, seven: 2 },
  hpMul: 1,
  ability: { kind: 'jackpot', every: 5, power: 1 },
  minDepth: 5,
  blurb: 'THE HOUSE ALWAYS WINS... RIGHT?',
};

const ADJECTIVES = ['GRUMPY', 'SNEAKY', 'FERAL', 'ELDER', 'RABID', 'GILDED', 'CURSED', 'HUNGRY', 'SPITEFUL', 'ANCIENT', 'WILD', 'GREEDY'];

/** HP for a regular fight at each depth (0-based), before the archetype multiplier. */
export const DEPTH_HP = [16, 20, 23, 26, 28];
export const BOSS_HP = 50;
export const RUN_FIGHTS = 5;

export interface EnemyDef extends SideConfig {
  archetype: string;
  depth: number;
  blurb: string;
  isBoss: boolean;
}

function jitter(strip: StripCounts, rng: Rng): StripCounts {
  // Move one symbol between two kinds so no two enemies of an archetype are identical.
  const out = { ...strip };
  const kinds = Object.keys(out) as SymbolId[];
  if (kinds.length < 2 || rng.next() < 0.3) return out;
  const from = rng.pick(kinds);
  const to = rng.pick(kinds.filter((k) => k !== from));
  if ((out[from] ?? 0) > 2) {
    out[from]! -= 1;
    out[to] = (out[to] ?? 0) + 1;
  }
  return out;
}

export function makeEnemy(a: Archetype, depth: number, rng: Rng, isBoss = false): EnemyDef {
  const hp = isBoss ? BOSS_HP : Math.round(DEPTH_HP[Math.min(depth, DEPTH_HP.length - 1)] * a.hpMul);
  const every = a.ability.every;
  return {
    archetype: a.id,
    depth,
    blurb: a.blurb,
    isBoss,
    name: isBoss ? a.name : `${rng.pick(ADJECTIVES)} ${a.name}`,
    portrait: a.portrait,
    hp,
    strips: isBoss ? [{ ...a.strip }, { ...a.strip }, { ...a.strip }] : [0, 1, 2].map(() => jitter(a.strip, rng)),
    ability: { ...a.ability, every },
    boss: isBoss ? 'house' : null,
  };
}

/** The run's enemy sequence: 5 procedural fights (no archetype repeats back-to-back), then the boss. */
export function generateRunEnemies(rng: Rng): EnemyDef[] {
  const out: EnemyDef[] = [];
  const used = new Set<string>();
  for (let depth = 0; depth < RUN_FIGHTS; depth++) {
    let pool = ARCHETYPES.filter((a) => a.minDepth <= depth && !used.has(a.id));
    if (pool.length === 0) pool = ARCHETYPES.filter((a) => a.minDepth <= depth);
    // Ramp in the writer enemies: first fight is always a gentle one.
    const a = rng.pick(pool);
    used.add(a.id);
    out.push(makeEnemy(a, depth, rng));
  }
  out.push(makeEnemy(BOSS, RUN_FIGHTS, rng, true));
  return out;
}
