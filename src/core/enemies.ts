import type { AbilityDef, SideConfig, StripCounts, SymbolId } from './config';
import { POT } from './relics';
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
    strip: { sword: 5, shield: 7 },
    hpMul: 1.1,
    ability: { kind: 'smash', every: 3, power: 4 },
    minDepth: 1,
    blurb: 'HITS HARD',
  },
  {
    id: 'frost',
    name: 'FROST IMP',
    portrait: 'enemyFrost',
    strip: { sword: 6, shield: 2, ice: 4 },
    hpMul: 1.1,
    ability: { kind: 'blizzard', every: 4, power: 2 },
    minDepth: 0,
    blurb: 'FREEZES YOUR REELS',
  },
  {
    id: 'thief',
    name: 'RAT THIEF',
    portrait: 'enemyThief',
    strip: { sword: 5, shield: 4, claw: 3 },
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
    hpMul: 1.56,
    ability: { kind: 'quake', every: 4, power: 2 },
    minDepth: 2,
    blurb: 'CLUTTERS YOUR STRIP WITH ROCKS (PERMANENT)',
  },
  {
    id: 'gremlin',
    name: 'GREMLIN',
    portrait: 'enemyGremlin',
    strip: { sword: 5, shield: 3, lock: 4 },
    hpMul: 1.19,
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
  ability: { kind: 'jackpot', every: POT.cashEvery, power: 1 },
  minDepth: 5,
  blurb: 'THE HOUSE ALWAYS WINS... RIGHT?',
};

const ADJECTIVES = ['GRUMPY', 'SNEAKY', 'FERAL', 'ELDER', 'RABID', 'GILDED', 'CURSED', 'HUNGRY', 'SPITEFUL', 'ANCIENT', 'WILD', 'GREEDY'];

/** HP for a regular fight at each depth (0-based), before the archetype multiplier. */
export const DEPTH_HP = [16, 20, 23, 26, 28];
export const BOSS_HP = 48;
/** The opener is always gentle, and a bit softer. */
export const OPENER_HP_MUL = 0.85;
export const RUN_FIGHTS = 5;

export interface EnemyDef extends SideConfig {
  archetype: string;
  depth: number;
  blurb: string;
  isBoss: boolean;
  /** The harder option at a fork: x1.25 HP, drops a free relic when beaten. */
  elite?: boolean;
}

/** Rough single-fight danger per archetype (playtest ITERATION_2), used to pick the elite at a fork. */
export const DANGER: Record<string, number> = { slime: 5, frost: 8, golem: 4, gremlin: 6, thief: 33, brute: 16, house: 40 };
export const ELITE_HP_MUL = 1.25;

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
  const hp = isBoss ? BOSS_HP : Math.round(DEPTH_HP[Math.min(depth, DEPTH_HP.length - 1)] * a.hpMul * (depth === 0 ? OPENER_HP_MUL : 1));
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

/** Fights 2–4 offer a fork: pick which of two enemies to face. */
export const BRANCH_DEPTHS = new Set([1, 2, 3]);

/**
 * The run's map: per depth, the enemy options (1, or 2 at a fork), then the boss. Options at a
 * depth never repeat an archetype offered at the previous depth; the opener is always gentle.
 */
export function generateRunPaths(rng: Rng): EnemyDef[][] {
  const out: EnemyDef[][] = [];
  let prev = new Set<string>();
  for (let depth = 0; depth < RUN_FIGHTS; depth++) {
    let pool = ARCHETYPES.filter((a) => a.minDepth <= depth && !prev.has(a.id));
    if (depth === 0) pool = ARCHETYPES.filter((a) => a.id === 'slime' || a.id === 'frost');
    if (pool.length === 0) pool = ARCHETYPES.filter((a) => a.minDepth <= depth);
    const n = BRANCH_DEPTHS.has(depth) ? Math.min(2, pool.length) : 1;
    const picks = rng.shuffle([...pool]).slice(0, n);
    const opts = picks.map((a) => makeEnemy(a, depth, rng));
    if (opts.length > 1) {
      // The more dangerous option is the ELITE: tougher, but it pays a relic.
      const elite = opts.reduce((a, b) => ((DANGER[b.archetype] ?? 0) > (DANGER[a.archetype] ?? 0) ? b : a));
      elite.elite = true;
      elite.hp = Math.round(elite.hp * ELITE_HP_MUL);
      elite.name = `ELITE ${elite.name}`.replace(/^ELITE (\w+) /, 'ELITE ');
    }
    out.push(opts);
    prev = new Set(picks.map((a) => a.id));
  }
  out.push([makeEnemy(BOSS, RUN_FIGHTS, rng, true)]);
  return out;
}
