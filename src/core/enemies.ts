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
  /** Which acts it shows up in (default: act 1 only). */
  acts?: number[];
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
    acts: [1, 2],
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
    acts: [1, 2],
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
    acts: [1, 2],
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
    acts: [1, 2],
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
    acts: [1, 2],
  },
  // ---- act 2 ----
  {
    id: 'bomber',
    name: 'BOMBER',
    portrait: 'enemyBomber',
    strip: { sword: 4, shield: 3, bomb: 5 },
    hpMul: 1,
    ability: { kind: 'carpet', every: 4, power: 2 },
    minDepth: 0,
    blurb: 'STICKS TICKING BOMBS ON YOUR CELLS. A BOMB YOUR PAYLINE LANDS ON IS DEFUSED',
    acts: [2],
  },
  {
    id: 'hexer',
    name: 'HEXER',
    portrait: 'enemyHexer',
    strip: { sword: 5, shield: 3, hex: 4 },
    hpMul: 1.05,
    ability: { kind: 'curse', every: 4, power: 1 },
    minDepth: 0,
    blurb: 'HEXES YOUR REELS: HALF PAY, GILDS GO DARK',
    acts: [2],
  },
  {
    id: 'vampire',
    name: 'VAMPIRE',
    portrait: 'enemyVampire',
    strip: { sword: 4, shield: 3, fangs: 5 },
    hpMul: 0.95,
    ability: { kind: 'bloodmoon', every: 4, power: 8 },
    minDepth: 0,
    blurb: 'DRAINS YOUR HP TO HEAL ITSELF',
    acts: [2],
  },
  {
    id: 'mimic',
    name: 'MIMIC',
    portrait: 'enemyMimic',
    strip: { sword: 4, shield: 4, mimicSym: 4 },
    hpMul: 1.05,
    ability: { kind: 'gulp', every: 3, power: 2 },
    minDepth: 0,
    blurb: 'COPIES YOUR BEST HIT. EATS YOUR CHIPS',
    acts: [2],
  },
];

export const ACT2_NEW: ReadonlySet<string> = new Set(['bomber', 'hexer', 'vampire', 'mimic']);
export const actsOf = (a: Archetype) => a.acts ?? [1];

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

/**
 * Act 2 boss. It plays a copy of YOUR machine (strips and gilds, but none of your relics) and every
 * few turns throws your last spin's damage back at you. At half HP it cracks and reflects faster.
 */
export const MIRROR: Archetype = {
  id: 'mirror',
  name: 'THE MIRROR',
  portrait: 'enemyMirror',
  strip: { sword: 4, shield: 4, bolt: 4 },
  hpMul: 1,
  ability: { kind: 'reflect', every: 3, power: 20 },
  minDepth: 5,
  blurb: 'PLAYS YOUR OWN MACHINE. THROWS YOUR BEST HIT BACK AT YOU',
  acts: [2],
};
export const BOSSES: Record<number, Archetype> = { 1: BOSS, 2: MIRROR };

// (No 'GILDED' or 'WILD': those are mechanic names.)
const ADJECTIVES = ['GRUMPY', 'SNEAKY', 'FERAL', 'ELDER', 'RABID', 'MANGY', 'CURSED', 'HUNGRY', 'SPITEFUL', 'ANCIENT', 'BITTER', 'GREEDY'];

/** HP for a regular fight at each depth (0-based), before the archetype multiplier. */
export const DEPTH_HP = [21, 26, 31, 34, 37];
/** Act 2 curve: you arrive with a built machine and a legendary. */
export const DEPTH_HP_2 = [52, 62, 73, 85, 97];
/** Mutable so balance sweeps can tune it. */
/** mirrorPower/mirrorFlat: the Mirror's HP = power × your expected damage per spin + flat (ITERATION_6 Package N). */
export const TUNE = { bossHp: 74, act2Mul: 1, act2Swords: 2, mirrorPower: 4, mirrorFlat: 52 };
export const ACTS = 2;
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
  act?: number;
}

/** Rough single-fight danger per archetype (playtest ITERATION_2), used to pick the elite at a fork. */
export const DANGER: Record<string, number> = {
  slime: 5,
  frost: 8,
  golem: 4,
  gremlin: 12,
  thief: 13,
  brute: 20,
  house: 40,
  bomber: 14,
  hexer: 12,
  vampire: 16,
  mimic: 15,
  mirror: 45,
};
export const ELITE_HP_MUL = 1.25;
export const ELITE_HP_MUL_2 = 1.5;

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

export function makeEnemy(a: Archetype, depth: number, rng: Rng, isBoss = false, act = 1): EnemyDef {
  // Frost scales badly late (its freezes stack up with longer fights): plain HP from fight 3.
  const hpMul = a.id === 'frost' && (depth >= 2 || act > 1) ? 1 : a.hpMul;
  const curve = act > 1 ? DEPTH_HP_2.map((h) => h * TUNE.act2Mul) : DEPTH_HP;
  const opener = depth === 0 && act === 1 ? OPENER_HP_MUL : 1;
  // (The Mirror's real HP is sized to your machine in run.enemyHp.)
  const bossHp = a.id === 'mirror' ? 100 : TUNE.bossHp;
  const hp = isBoss ? bossHp : Math.round(curve[Math.min(depth, curve.length - 1)] * hpMul * opener);
  const every = a.ability.every;
  return {
    archetype: a.id,
    depth,
    blurb: a.blurb,
    isBoss,
    name: isBoss ? a.name : `${rng.pick(ADJECTIVES)} ${a.name}`,
    portrait: a.portrait,
    hp,
    strips: (isBoss ? [{ ...a.strip }, { ...a.strip }, { ...a.strip }] : [0, 1, 2].map(() => jitter(a.strip, rng))).map((st) =>
      // Act 2 enemies hit harder.
      act > 1 && !isBoss ? { ...st, sword: (st.sword ?? 0) + TUNE.act2Swords } : st,
    ),
    ability: { ...a.ability, every },
    boss: isBoss ? (a.id === 'mirror' ? 'mirror' : 'house') : null,
    act,
  };
}

/** Fights 2–4 offer a fork: pick which of two enemies to face. */
export const BRANCH_DEPTHS = new Set([1, 2, 3]);

/**
 * The run's map: per depth, the enemy options (1, or 2 at a fork), then the boss. Options at a
 * depth never repeat an archetype offered at the previous depth; the opener is always gentle.
 */
export function generateRunPaths(rng: Rng, act = 1): EnemyDef[][] {
  const out: EnemyDef[][] = [];
  let prev = new Set<string>();
  const inAct = ARCHETYPES.filter((a) => actsOf(a).includes(act));
  for (let depth = 0; depth < RUN_FIGHTS; depth++) {
    let pool = inAct.filter((a) => a.minDepth <= depth && !prev.has(a.id));
    if (depth === 0) pool = act === 1 ? inAct.filter((a) => a.id === 'slime' || a.id === 'frost') : inAct.filter((a) => ACT2_NEW.has(a.id) && a.minDepth === 0);
    if (pool.length === 0) pool = inAct.filter((a) => a.minDepth <= depth);
    const n = BRANCH_DEPTHS.has(depth) ? Math.min(2, pool.length) : 1;
    let picks = rng.shuffle([...pool]).slice(0, n);
    // Act 2 forks always show at least one of the new faces.
    if (act > 1 && !picks.some((a) => ACT2_NEW.has(a.id))) {
      const fresh = pool.filter((a) => ACT2_NEW.has(a.id));
      if (fresh.length) picks = [rng.pick(fresh), ...picks].slice(0, n);
    }
    const opts = picks.map((a) => makeEnemy(a, depth, rng, false, act));
    if (opts.length > 1) {
      // The more dangerous option is the ELITE: tougher, but it pays a relic.
      const elite = opts.reduce((a, b) => ((DANGER[b.archetype] ?? 0) > (DANGER[a.archetype] ?? 0) ? b : a));
      elite.elite = true;
      // The elite thief is already the deadliest node: a lighter bump.
      // Act 2 elites are much tougher (they pay spoils and chips; ITERATION_7: always-elite was +11).
      elite.hp = Math.round(elite.hp * (act > 1 ? ELITE_HP_MUL_2 : elite.archetype === 'thief' ? 1.15 : ELITE_HP_MUL));
      elite.name = `ELITE ${elite.name}`.replace(/^ELITE (\w+) /, 'ELITE ');
    }
    out.push(opts);
    prev = new Set(picks.map((a) => a.id));
  }
  out.push([makeEnemy(BOSSES[act] ?? BOSS, RUN_FIGHTS, rng, true, act)]);
  return out;
}
