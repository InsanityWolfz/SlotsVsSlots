import { UNIT, unitsRound, type AbilityDef, type SideConfig, type StripCounts, type SymbolId } from './config';
import { POT } from './relics';
import type { Rng } from './rng';

/** An enemy template. Every enemy writes something onto the player's machine. */
export interface Archetype {
  id: string;
  name: string;
  /** A named character (THE REPO MAN): no random adjective. */
  fixedName?: string;
  portrait: string;
  /** Per-reel strip composition before jitter. */
  strip: StripCounts;
  /** HP multiplier on the depth curve. */
  hpMul: number;
  /** null: no timed ability (THE MIRROR: its shards do the reflecting). */
  ability: AbilityDef | null;
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
    ability: { kind: 'smash', every: 3, power: 4 * UNIT },
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
    ability: { kind: 'blizzard', every: 4, power: 1 },
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
    ability: { kind: 'jam', every: 4, power: 1 },
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
    blurb: 'HEXES YOUR REELS: HALF PAY, CHARMS GO DARK',
    acts: [2],
  },
  {
    id: 'vampire',
    name: 'VAMPIRE',
    portrait: 'enemyVampire',
    strip: { sword: 4, shield: 3, fangs: 5 },
    hpMul: 0.95,
    ability: { kind: 'bloodmoon', every: 4, power: 8 * UNIT },
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
  // ---- act 2 counter-enemies: each one answers a dominant build ----
  {
    id: 'grounder',
    name: 'GROUNDER',
    portrait: 'enemyGrounder',
    strip: { sword: 5, shield: 5, ground: 3 },
    hpMul: 1,
    ability: { kind: 'earth', every: 4, power: 3 * UNIT },
    minDepth: 1,
    blurb: 'RODS IN YOUR BOLTS: A GROUNDED BOLT GIVES NO ENERGY',
    acts: [2],
  },
  {
    id: 'counterfeiter',
    name: 'COUNTERFEITER',
    portrait: 'enemyCounterfeiter',
    strip: { sword: 6, shield: 3, fake: 4 },
    hpMul: 1.1,
    ability: { kind: 'launder', every: 4, power: 2 },
    minDepth: 1,
    blurb: 'COUNTERFEITS A CHARM: IT PAYS PLAIN FOR 3 TURNS',
    acts: [2],
  },
];

// ---- act 3 (a short true ending, GREEN stake and up) ----
ARCHETYPES.push(
  {
    id: 'sharp',
    name: 'CARD SHARP',
    portrait: 'enemySharp',
    strip: { sword: 5, shield: 3, card: 4 },
    hpMul: 1,
    ability: { kind: 'mark', every: 4, power: 3 },
    minDepth: 0,
    blurb: 'MARKS YOUR CELLS: A MARKED CARD ON YOUR PAYLINE HITS YOU FOR 20',
    acts: [3],
  },
  {
    id: 'pitboss',
    name: 'PIT BOSS',
    portrait: 'enemyPitBoss',
    strip: { sword: 5, shield: 4, gavel: 3 },
    hpMul: 1.1,
    ability: { kind: 'penalty', every: 4, power: 4 * UNIT },
    minDepth: 0,
    blurb: 'CONFISCATES YOUR CHARMS FOR THE FIGHT (ITS AUDIT TAKES ONE EVERY FEW TURNS)',
    acts: [3],
  },
  {
    id: 'croupier',
    name: 'CROUPIER',
    portrait: 'enemyCroupier',
    strip: { sword: 5, shield: 3, rake: 4 },
    hpMul: 0.95,
    ability: { kind: 'houseTake', every: 4, power: 3 },
    minDepth: 0,
    blurb: 'RAKES YOUR WINNINGS: YOUR GROUPS PAY LESS FOR A FEW TURNS',
    acts: [3],
  },
);

/**
 * THE GATEKEEPER (EXPERT_PLAYTEST_8 E11): fight 4 of every act (no fork; the Cashier opens before the boss) is THE REPO MAN. Every 3 turns he repossesses
 * your best cell (a charmed one first) and what he holds when he falls STAYS GONE until the act's boss falls, unless
 * you pay it off at the Cashier. His writes outlast the fight, the game's hook between bosses.
 */
export const REPO_MAN: Archetype = {
  id: 'repo',
  name: 'REPO MAN',
  fixedName: 'THE REPO MAN',
  portrait: 'enemyRepoMan',
  // A plain strip: he only takes on his telegraphed turns (gavels would take on their own).
  strip: { sword: 7, shield: 5 },
  hpMul: 1.3,
  ability: { kind: 'repo', every: 3, power: 1 },
  minDepth: 2,
  blurb: 'TAKES A CHARM FOR THE FIGHT.',
  acts: [],
};
/** The gatekeeper's fight (0-based depth), how many cells he can take in one fight, a lien's price, his bounty, the turn of
 * his first take, the acts he holds (act 3 has the Pit Boss's confiscates), and whether his liens outlast his fight (a
 * measuring knob: false returns them at once). */
// persist false (2026-10-07, user: the liens were noise): what he takes comes back when his fight ends.
export const GATEKEEPER = { depth: 3, maxTakes: 2, lienPrice: 3, bounty: 3, firstTurn: 1, acts: 2, persist: false };

export const ACT2_NEW: ReadonlySet<string> = new Set(['bomber', 'hexer', 'vampire', 'mimic', 'grounder', 'counterfeiter']);
export const ACT3_NEW: ReadonlySet<string> = new Set(['sharp', 'pitboss', 'croupier']);
/** Act 2's own enemies come back in act 3. */
const ACT3_VETERANS: ReadonlySet<string> = new Set(['bomber', 'vampire', 'hexer', 'mimic']);
export const actsOf = (a: Archetype) => (ACT3_VETERANS.has(a.id) ? [...(a.acts ?? [1]), 3] : a.acts ?? [1]);

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
 * Act 2 boss. Its own reels (it used to copy yours, and your special symbols did nothing on its side: sword builds
 * were crushed and the rest breezed through). Each SHARD on its payline throws a share of your last spin's damage
 * back at you (at least a little); cracked at half HP, the shards cut deeper.
 */
export const MIRROR: Archetype = {
  id: 'mirror',
  name: 'THE MIRROR',
  portrait: 'enemyMirror',
  strip: { sword: 5, shield: 3, shard: 3 },
  hpMul: 1,
  ability: null,
  minDepth: 5,
  blurb: 'ITS SHARDS THROW YOUR LAST HIT BACK AT YOU',
  acts: [2],
};
/**
 * Act 3 boss. THE HOUSE's partner: every few turns it deals a face-up card (shown a turn ahead) —
 * SHUFFLE your reels, CUT your commonest symbol, or RAISE the stakes (its next hit and your next
 * jackpot pay double). It can't fall below half HP until it has dealt once; at half HP it plays
 * HOUSE RULES and deals faster.
 */
export const DEALER: Archetype = {
  id: 'dealer',
  name: 'THE DEALER',
  portrait: 'enemyDealer',
  // The House's heavy hitters: sevens.
  strip: { seven: 6, sword: 3, shield: 2, card: 4 },
  hpMul: 1,
  ability: { kind: 'deal', every: 3, power: 0 },
  minDepth: 3,
  blurb: 'DEALS FACE-UP CARDS ONTO YOUR PAYLINE, GOES ALL IN, RAISES. THE HOUSE HAS A PARTNER',
  acts: [3],
};
export const BOSSES: Record<number, Archetype> = { 1: BOSS, 2: MIRROR, 3: DEALER };

// (No 'GILDED' or 'WILD': those are mechanic names.)
const ADJECTIVES = ['GRUMPY', 'SNEAKY', 'FERAL', 'ELDER', 'RABID', 'MANGY', 'CURSED', 'HUNGRY', 'SPITEFUL', 'ANCIENT', 'BITTER', 'GREEDY'];

/** HP for a regular fight at each depth (0-based), before the archetype multiplier. */
/** (+6% in I14 to offset BONUS WHEEL / RELIC RUSH payouts.) */
export const DEPTH_HP = [22, 28, 33, 36, 39].map((h) => h * UNIT);
/** Act 2 curve: you arrive with a built machine and a legendary. */
export const DEPTH_HP_2 = [52, 62, 73, 85, 97].map((h) => h * UNIT);
/** Mutable so balance sweeps can tune it. */
/** mirrorPower/mirrorFlat: the Mirror's HP = power × your expected damage per spin + flat (ITERATION_6 Package N). */
/** Act 3: 3 fights, then the Dealer. */
/**
 * Act 3: 5 fights, then the Dealer. Regular act 3 enemies are sized to YOUR machine (like the bosses:
 * act3Power x machinePower x the depth step, never below this curve) so their abilities get seen.
 */
export const DEPTH_HP_3 = [120, 135, 150, 165, 180].map((h) => h * UNIT);
export const ACT3_DEPTH_MUL = [1, 1.1, 1.2, 1.3, 1.4];
export const ACT_LENGTH: Record<number, number> = { 1: 5, 2: 5, 3: 5, 4: 3 };
/** ENDLESS (act 4) tuning: per loop, enemy HP x hp^loop and damage x dmg^loop (EXPERT_PLAYTEST_3 D). */
export const ENDLESS = { ramp: 0.15, hp: 1.45, hpBy: { knight: 1.05, tesla: 1.5, thorn: 1.3, joker: 1.2, midas: 1.7, jukebox: 1.2 } as Record<string, number>, dmgBy: { knight: 1.18, midas: 1.35 } as Record<string, number>, dmg: 1.35, houseHp: 3, housePot: 1.5, potSeed: 0.3, potCut: 0.15, potSteal: 0.34, houseEvery: 2, potGrowth: 1.5, bustKeep: 1 / 3, mirrorHp: 4, dealerHp: 6, lastCall: 25, lastCallStep: 0.1, maxTurns: 80, closingWarn: 5, clamp: 1e12, edgeChips: 8 };
/**
 * ENDLESS: each loop multiplies enemy HP (and damage) by its base, and the step itself grows by RAMP every loop,
 * so the climb accelerates: loop L totals base^L x (1 + ramp)^(L(L-1)/2). Only broken builds should see loop 5.
 */
export const endlessMul = (base: number, loop: number) => Math.pow(base, loop) * Math.pow(1 + ENDLESS.ramp, (loop * (loop - 1)) / 2);
export const actLength = (act: number) => ACT_LENGTH[act] ?? 5;
/** Act 3 (ITERATION_12 playtest, commit at GREEN): Dealer HP = 7 x typical-spin power + 60 (+4/relic), less bursty strip -> ~62% Dealer win. */
export const TUNE = { dailyAct3: 0.45, greenMirror: 0.5, coverCharge: 0.1, turnCap: 0.4, bossTurnCap: 0.6, dealerQuietCap: 0.25, marksPerReel: 2, act1Hp: 0.7, act1Every: 3, act2Power: 1.6, rampPerTurn: 0.06, act3Heal: 0.5, rampMax: 2, regularHp: 1.05, act2Hp: 1.6, act1Swords: 1, enemyShield: 0.5, act3Power: 4, act3Flat: 20 * UNIT, dealerPower: 10, dealerFlat: 50 * UNIT, act3Sevens: 4, bossHp: 95 * UNIT, act2Mul: 1.06, act2Swords: 2, mirrorPower: 3, mirrorFlat: 30 * UNIT, mirrorPerRelic: 4 * UNIT, mirrorSpecialWeight: 1, powerElastic: 0.5 };
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
  /** HIGH STAKES BLUE: this fork option was placed as the counter to your build. */
  counter?: boolean;
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
  sharp: 14,
  pitboss: 14,
  croupier: 13,
  dealer: 50,
  grounder: 12,
  counterfeiter: 12,
};
export const ELITE_HP_MUL = 1.25;
export const ELITE_HP_MUL_2 = 1.3;

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
  const curve = act > 2 ? DEPTH_HP_3 : act > 1 ? DEPTH_HP_2.map((h) => h * TUNE.act2Mul) : DEPTH_HP;
  const opener = depth === 0 && act === 1 ? OPENER_HP_MUL : 1;
  // (The Mirror's real HP is sized to your machine in run.enemyHp.)
  const bossHp = a.id === 'mirror' ? 100 * UNIT : TUNE.bossHp;
  const hp = isBoss ? bossHp : unitsRound(curve[Math.min(depth, curve.length - 1)] * hpMul * opener * TUNE.regularHp * (act === 2 ? TUNE.act2Hp : act === 1 ? TUNE.act1Hp : 1));
  // Act 1 regulars use their ability every 3 turns at most, so players see what each enemy does (EXPERT_PLAYTEST_2 G2).
  // Every regular uses its ability at least every 3 turns (31-40% of act 2-3 abilities never fired: EXPERT_PLAYTEST_2 A1).
  const every = !a.ability ? 0 : !isBoss ? Math.min(a.ability.every, TUNE.act1Every) : a.ability.every;
  return {
    archetype: a.id,
    depth,
    blurb: a.blurb,
    isBoss,
    // The adjective is always drawn (keeps seeded runs' fights the same), but named characters keep their name.
    name: ((adj) => (isBoss ? a.name : (a.fixedName ?? `${adj} ${a.name}`)))(isBoss ? '' : rng.pick(ADJECTIVES)),
    portrait: a.portrait,
    hp,
    strips: (isBoss ? [{ ...a.strip }, { ...a.strip }, { ...a.strip }] : [0, 1, 2].map(() => jitter(a.strip, rng))).map((st) =>
      // Act 2 enemies hit harder.
      isBoss ? st : act > 2 ? { ...st, sword: (st.sword ?? 0) + TUNE.act2Swords, seven: (st.seven ?? 0) + TUNE.act3Sevens } : act > 1 ? { ...st, sword: (st.sword ?? 0) + TUNE.act2Swords } : { ...st, sword: (st.sword ?? 0) + TUNE.act1Swords },
    ),
    ability: a.ability ? { ...a.ability, every } : null,
    boss: isBoss ? (a.id === 'mirror' ? 'mirror' : a.id === 'dealer' ? 'dealer' : 'house') : null,
    act,
  };
}

/** Fights 2–4 offer a fork: pick which of two enemies to face. */
export const BRANCH_DEPTHS = new Set([1, 2, 3]);

/**
 * The run's map: per depth, the enemy options (1, or 2 at a fork), then the boss. Options at a
 * depth never repeat an archetype offered at the previous depth; the opener is always gentle.
 */
export function generateRunPaths(rng: Rng, act = 1, loop = 1): EnemyDef[][] {
  const out: EnemyDef[][] = [];
  let prev = new Set<string>();
  // ENDLESS (act 4): regulars from acts 2 and 3.
  const inAct = act >= 4 ? ARCHETYPES.filter((a) => actsOf(a).some((x) => x >= 2)) : ARCHETYPES.filter((a) => actsOf(a).includes(act));
  const len = actLength(act);
  for (let depth = 0; depth < len; depth++) {
    // THE GATEKEEPER holds fight 4 of acts 1-2 (not act 3, not endless).
    if (depth === GATEKEEPER.depth && act <= GATEKEEPER.acts) {
      out.push([makeEnemy(REPO_MAN, depth, rng, false, act)]);
      prev = new Set([REPO_MAN.id]);
      continue;
    }
    let pool = inAct.filter((a) => a.minDepth <= depth && !prev.has(a.id));
    if (depth === 0 && act < 4) pool = act === 1 ? inAct.filter((a) => a.id === 'slime' || a.id === 'frost') : act === 2 ? inAct.filter((a) => ACT2_NEW.has(a.id) && a.minDepth === 0) : inAct.filter((a) => ACT3_NEW.has(a.id));
    if (pool.length === 0) pool = inAct.filter((a) => a.minDepth <= depth);
    const branch = BRANCH_DEPTHS.has(depth);
    const n = branch ? Math.min(2, pool.length) : 1;
    let picks = rng.shuffle([...pool]).slice(0, n);
    // Act 2 forks always show at least one of the new faces.
    // Act 2 and 3 forks always show at least one of the act's new faces.
    const NEW = act === 3 ? ACT3_NEW : ACT2_NEW;
    if (act >= 2 && act < 4 && !picks.some((a) => NEW.has(a.id))) {
      const fresh = pool.filter((a) => NEW.has(a.id));
      if (fresh.length) picks = [rng.pick(fresh), ...picks].slice(0, n);
    }
    const opts = picks.map((a) => makeEnemy(a, depth, rng, false, act));
    if (opts.length > 1) {
      // The more dangerous option is the ELITE: tougher, but it pays a relic.
      const elite = opts.reduce((a, b) => ((DANGER[b.archetype] ?? 0) > (DANGER[a.archetype] ?? 0) ? b : a));
      elite.elite = true;
      // The elite thief is already the deadliest node: a lighter bump.
      // Act 2 elites are much tougher (they pay spoils and chips; ITERATION_7: always-elite was +11).
      elite.hp = unitsRound(elite.hp * (act > 1 ? ELITE_HP_MUL_2 : elite.archetype === 'thief' ? 1.15 : ELITE_HP_MUL));
      elite.name = `ELITE ${elite.name}`.replace(/^ELITE (\w+) /, 'ELITE ');
    }
    out.push(opts);
    prev = new Set(picks.map((a) => a.id));
  }
  // ENDLESS: the boss cycles THE HOUSE -> THE MIRROR -> THE DEALER.
  const boss = act >= 4 ? [BOSS, MIRROR, DEALER][(Math.max(1, loop) - 1) % 3] : (BOSSES[act] ?? BOSS);
  out.push([makeEnemy(boss, len, rng, true, act)]);
  return out;
}
