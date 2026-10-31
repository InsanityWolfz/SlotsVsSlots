import { UNIT, unitsRound, type AbilityDef, type SideConfig, type StripCounts, type SymbolId } from './config';
import { POT } from './relics';
import type { Rng } from './rng';
import type { CabinetId } from './cabinets';
import { ENCOUNTER_IDS } from './encounters';

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
  /** null: no timed ability. */
  ability: AbilityDef | null;
  /** Only these slot machines ever meet it. */
  only?: CabinetId[];
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
    name: 'BARFLY',
    portrait: 'enemyPortrait',
    strip: { sword: 5, shield: 2, slime: 5 },
    hpMul: 1,
    ability: { kind: 'flood', every: 4, power: 3 },
    minDepth: 0,
    blurb: 'SPILLS DRINKS ON YOUR SYMBOLS',
  },
  {
    id: 'brute',
    name: 'LEG BREAKER',
    portrait: 'enemyBrute',
    strip: { sword: 5, shield: 7 },
    hpMul: 1.1,
    ability: { kind: 'smash', every: 3, power: 4 * UNIT },
    minDepth: 1,
    blurb: 'WINDS UP ONE BIG SWING',
    acts: [1, 2],
  },
  {
    id: 'frost',
    name: 'COOLER',
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
    name: 'PICKPOCKET',
    portrait: 'enemyThief',
    strip: { sword: 5, shield: 4, claw: 3 },
    hpMul: 0.9,
    ability: { kind: 'pilfer', every: 3, power: 1 },
    minDepth: 1,
    blurb: 'STEALS YOUR SYMBOLS',
    acts: [1, 2],
  },
  {
    id: 'golem',
    name: 'FENCE',
    portrait: 'enemyGolem',
    strip: { sword: 4, shield: 4, rock: 4 },
    hpMul: 1.56,
    ability: { kind: 'quake', every: 4, power: 2 },
    minDepth: 2,
    blurb: 'CLUTTERS YOUR STRIP WITH ROCKS',
    acts: [1, 2],
  },
  {
    id: 'gremlin',
    name: 'MECHANIC',
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
    name: 'LOAN SHARK',
    portrait: 'enemyBomber',
    strip: { sword: 4, shield: 3, bomb: 5 },
    hpMul: 1,
    ability: { kind: 'carpet', every: 4, power: 2 },
    minDepth: 0,
    blurb: "IOUS YOU DON'T PAY IN TIME HURT YOU",
    acts: [2],
  },
  {
    id: 'hexer',
    name: 'JINX',
    portrait: 'enemyHexer',
    strip: { sword: 5, shield: 3, hex: 4 },
    hpMul: 1.05,
    ability: { kind: 'curse', every: 4, power: 1 },
    minDepth: 0,
    blurb: 'JINXES YOUR REELS FOR HALF PAY',
    acts: [2],
  },
  {
    id: 'vampire',
    name: 'LEECH',
    portrait: 'enemyVampire',
    strip: { sword: 4, shield: 3, fangs: 5 },
    hpMul: 0.95,
    ability: { kind: 'bloodmoon', every: 4, power: 8 * UNIT },
    minDepth: 0,
    blurb: 'DRAINS YOUR HP TO HEAL HIMSELF',
    acts: [2],
  },
  // ---- act 2 counter-enemy: answers a Charm or meter build ----
  {
    id: 'counterfeiter',
    name: 'COUNTERFEITER',
    portrait: 'enemyCounterfeiter',
    strip: { sword: 6, shield: 3, fake: 4 },
    hpMul: 1.1,
    ability: { kind: 'launder', every: 4, power: 2 },
    minDepth: 1,
    blurb: 'REMOVES A CHARM',
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
 * THE REPO MAN: a regular in acts 1-2. Every 3 turns he repossesses your best cell (a charmed one first) for the
 * fight; everything comes back when it ends.
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
  blurb: 'TAKES A CHARM FOR THE FIGHT',
  acts: [],
};
/** THE REPO MAN: at most this many takes a fight, his bounty in chips, the turn of his first take, the acts he's in. */
export const GATEKEEPER = { maxTakes: 2, bounty: 3, firstTurn: 1, acts: 2 };

export const ACT2_NEW: ReadonlySet<string> = new Set(['bomber', 'hexer', 'vampire', 'counterfeiter']);
export const ACT3_NEW: ReadonlySet<string> = new Set(['sharp', 'pitboss', 'croupier']);
/** Act 2's own enemies come back in act 3. */
const ACT3_VETERANS: ReadonlySet<string> = new Set(['bomber', 'vampire', 'hexer']);
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
 * Act 2 boss: THE WHEEL (roulette; playtest/BOSS_REDESIGN.md 1A). PLACE YOUR BETS: each of its turns it drops chips
 * (bets) on your reels; your pairs sweep their reels, a jackpot sweeps them all. NO MORE BETS: every 3rd turn the wheel
 * spins and each chip left hits for 5% of your max HP (one shielded hit). At half HP it SPINS FASTER (3 chips a turn).
 * Its damage is a share of YOUR max HP, never of your hit, so your build changes the odds, not the size.
 */
export const WHEEL: Archetype = {
  id: 'wheel',
  name: 'THE WHEEL',
  portrait: 'enemyWheel',
  strip: { sword: 5, shield: 3, seven: 2, ball: 2 },
  hpMul: 1,
  ability: { kind: 'bets', every: 3, power: 2 },
  minDepth: 5,
  blurb: 'PLACES BETS ON YOUR REELS. PAIRS CLEAR THEM. NO MORE BETS: EVERY CHIP LEFT HITS.',
  acts: [2],
};
/**
 * THE WHEEL's numbers: chips a turn (fast: at half HP, or from the start at GREEN), the most a reel holds, what one chip
 * hits for at NO MORE BETS (a share of your max HP; endless loops use `endlessChip`), chips you gain per chip swept.
 */
export const WHEEL_RULES = { place: 2, fast: 3, maxPerReel: 3, perChip: 0.05, endlessChip: 0.07, sweepChips: 1, clearOnDrop: 1, betOnDrop: 1 };
/** THE WHEEL's chip value per slot machine (x perChip): machines that pair a lot sweep almost every chip. */
export const WHEEL_CHIP: Record<string, number> = { knight: 1, tesla: 1, jukebox: 1, joker: 1, midas: 1, thorn: 1 };
/** What one chip hits for at NO MORE BETS, as a share of your max HP. */
export const wheelChipShare = (cabinet: string | undefined, endless = false): number =>
  (endless ? WHEEL_RULES.endlessChip : WHEEL_RULES.perChip) * (WHEEL_CHIP[cabinet ?? ''] ?? 1);
/** Act 3 boss: three hands, each with its own HP bar (fight.ts DEALER_RULES). */
export const DEALER: Archetype = {
  id: 'dealer',
  name: 'THE DEALER',
  portrait: 'enemyDealer',
  // The House's heavy hitters: sevens. (No CARD: marks belong to the CARD SHARP.)
  strip: { seven: 6, sword: 4, shield: 2 },
  hpMul: 1,
  ability: { kind: 'deal', every: 3, power: 0 },
  minDepth: 3,
  blurb: 'THREE HANDS, THREE HP BARS. EACH HAND IS HARDER: BUST, RAISE, ALL IN.',
  acts: [3],
};
/**
 * THE OWNER (user, 2026-10-14): the man who owns the casino, met at ENDLESS loop 5 (TURBO below). EVERY TRICK IN THE
 * BOOK: every 2 turns he cheats, a different enemy's trick each time (slime, a theft, a freeze, rocks, a hex, bombs).
 */
export const OWNER: Archetype = {
  id: 'owner',
  name: 'THE OWNER',
  portrait: 'enemyOwner',
  strip: { seven: 5, sword: 5, shield: 2 },
  hpMul: 1,
  ability: { kind: 'owner', every: 2, power: 0 },
  minDepth: 5,
  blurb: 'HE OWNS THE PLACE. EVERY TRICK IN THE BOOK.',
  acts: [4],
};
/** THE OWNER's tricks, in the order he plays them (each at this power). */
export const OWNER_TRICKS: { kind: AbilityDef['kind']; power: number }[] = [
  { kind: 'flood', power: 3 },
  { kind: 'hammer', power: 0 },
  { kind: 'pilfer', power: 1 },
  { kind: 'hammer', power: 0 },
  { kind: 'blizzard', power: 1 },
  { kind: 'hammer', power: 0 },
  { kind: 'quake', power: 2 },
  { kind: 'hammer', power: 0 },
  { kind: 'curse', power: 2 },
  { kind: 'hammer', power: 0 },
  { kind: 'carpet', power: 2 },
  { kind: 'hammer', power: 0 },
];
/**
 * THE OWNER as a fight (user, 2026-10-14: he was a one-shot wall). THE HAMMER (every other trick, telegraphed on his HUD)
 * hits `hammer` of your max HP through shields; no turn of his takes more than `capOnYou` of your max HP; at 75 / 50 /
 * 25% of his HP he gets `phaseDmg` harder each time (a banner says so). Every turn of his raises his hits and his cap on you
 * by `rise` (0.06 -> 0.07 with the 11-HP OWNER, 2026-10-15: at 0.06 JOKER beat him 13% and BANKROLL 8%).
 */
export const OWNER_RULES = { hammer: 0.4, capOnYou: 0.45, phaseDmg: 0.15, phases: [0.75, 0.5, 0.25], rise: 0.07 };
/** THE OWNER's turns so far raise his hits and his cap on you by OWNER_RULES.rise each (the fight can't stall). */
export const BOSSES: Record<number, Archetype> = { 1: BOSS, 2: WHEEL, 3: DEALER };

// (No 'GILDED' or 'WILD': those are mechanic names.)
// The casino town's (user, 2026-10-30).
const ADJECTIVES = ['GRUMPY', 'SNEAKY', 'SHADY', 'SLICK', 'CROOKED', 'TWO-BIT', 'BROKE', 'SPITEFUL', 'DESPERATE', 'GREEDY'];

/** HP for a regular fight at each depth (0-based), before the archetype multiplier. */
/** (+6% in I14 to offset BONUS WHEEL / RELIC RUSH payouts.) */
export const DEPTH_HP = [22, 28, 33, 36, 39].map((h) => h * UNIT);
/** Act 2 curve: you arrive with a built machine and a legendary. */
export const DEPTH_HP_2 = [52, 62, 73, 85, 97].map((h) => h * UNIT);
/** Mutable so balance sweeps can tune it. */
/** Act 3: 3 fights, then the Dealer. */
/** Act 3: 5 fights, then the Dealer. */
export const DEPTH_HP_3 = [240, 270, 300, 330, 360].map((h) => h * UNIT);
export const ACT_LENGTH: Record<number, number> = { 1: 5, 2: 5, 3: 5, 4: 3 };
/** ENDLESS (act 4) tuning: per loop, enemy HP x hp^loop and damage x dmg^loop (EXPERT_PLAYTEST_3 D). */
export const ENDLESS = { ramp: 0.1, hp: 2, dmg: 1.35, houseHp: 5, housePot: 1.5, potSeed: 0.3, potCut: 0.15, potSteal: 0.34, houseEvery: 2, potGrowth: 1.5, wheelHp: 5, dealerHp: 6, lastCall: 25, lastCallStep: 0.1, maxTurns: 80, closingWarn: 5, clamp: 1e12, edgeChips: 8 };
/**
 * ENDLESS: each loop multiplies enemy HP (and damage) by its base, and the step itself grows by RAMP every loop,
 * so the climb accelerates: loop L totals base^L x (1 + ramp)^(L(L-1)/2). Only broken builds should see loop 5.
 * 2026-10-12 (pacing): base 2, ramp 0.05 (was 1.45 / 0.15): loops 1-3 were 1-3-spin fights, then a cliff.
 */
export const endlessMul = (base: number, loop: number) => Math.pow(base, loop) * Math.pow(1 + ENDLESS.ramp, (loop * (loop - 1)) / 2);
export const actLength = (act: number) => ACT_LENGTH[act] ?? 5;
/** Fixed boss HP (honest HP, 2026-10-12): the House (bossHp), THE WHEEL, the Dealer, and ENDLESS's loop bosses' base. */
/** ENDLESS help for the machines with no late multiplier (user, 2026-10-15): KNIGHT's VETERAN (swords and shields pay
 * +veteran for every loop cleared) and JUKEBOX's WARM-UP (each fight starts at volume warmUp x the loop, below THE DROP). */
export const LOOP_GROWTH = { veteran: 1, warmUp: 3 };
export const TUNE = { headStart: 2, greenWheel: 0.85, coverCharge: 0.1, turnCap: 0.4, bossTurnCap: 0.6, dealerQuietCap: 0.25, marksPerReel: 2, act1Hp: 0.7, act1Every: 3, rampPerTurn: 0.06, rampMax: 2, regularHp: 1.05, act2Hp: 2.2, act3Hp: 2, act1Swords: 1, enemyShield: 0.5, act3Sevens: 4, bossHp: 120 * UNIT, act2Mul: 1.06, act2Swords: 3, wheelHp: 400 * UNIT, dealerHp: 1300 * UNIT, endlessBossBase: 300 * UNIT, enemyDmg: 1 };
export const ACTS = 2;
/**
 * OVERTIME (user, 2026-10-29: roadmap phase 1, live without a test mode): a fight clock in every act. From round `from` (a round is your
 * spin and the enemy's), every pay on both machines but shields is multiplied by 1 + step for each round of overtime
 * so far; the one-turn damage caps still hold. It replaces act 3's enemy-only ramp. `warn`: rounds of OVERTIME IN n
 * before it. (Sim, 300 runs WHITE / GREEN: growing shields too cut the long fights less and lifted GREEN run wins up to
 * +26; hits only, up to +9.)
 */
export const OVERTIME = { from: 8, step: 0.25, warn: 3 };
/** The round a fight turn is in (fight.turn counts both machines' spins). */
export const overtimeRound = (turn: number) => Math.ceil(turn / 2);
/** OVERTIME's multiplier on this turn's pays (1 before it starts). */
export const overtimeMul = (turn: number) => 1 + OVERTIME.step * Math.max(0, overtimeRound(turn) - OVERTIME.from + 1);
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
  /** ENDLESS loop 5: THE OWNER, the TURBO boss (TURBO below). */
  turbo?: boolean;
}

/**
 * THE TURBO boss (user, 2026-10-14): THE OWNER at loop 5, built to be all but unbeatable (aim: ~0.1% of the runs that
 * reach it). Beating him ends the run, so a broken build or a bug can't go on forever. `hp` is his HP in loop bosses'
 * `hp` is his real HP (user, 2026-10-15): every hit of yours takes exactly 1, whatever it would have done (shields,
 * multipliers and caps don't matter; he never heals), so the fight is about surviving 11 hits. `dmg` is
 * his hits on top of the loop's.
 */
export const TURBO = { loop: 5, hp: 11, dmg: 1.2, potMul: 3 };

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
  wheel: 35,
  sharp: 14,
  pitboss: 14,
  croupier: 13,
  dealer: 50,
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
  // (THE WHEEL's real HP is sized to your machine in run.enemyHp.)
  const bossHp = a.id === 'wheel' ? 100 * UNIT : TUNE.bossHp;
  const hp = isBoss ? bossHp : unitsRound(curve[Math.min(depth, curve.length - 1)] * hpMul * opener * TUNE.regularHp * (act === 2 ? TUNE.act2Hp : act === 1 ? TUNE.act1Hp : TUNE.act3Hp));
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
    boss: isBoss ? (a.id === 'wheel' ? 'wheel' : a.id === 'dealer' ? 'dealer' : a.id === 'owner' ? 'owner' : 'house') : null,
    act,
  };
}

// ---- the act map (2026-10-12): pick a path, not an enemy ----------------------------------

/** A stop on an act's map. FIGHT pays a draft and chips, ELITE a relic pick, SHOP is the Cashier, ENCOUNTER a gamble. */
export type StopKind = 'fight' | 'elite' | 'shop' | 'encounter';
export interface Stop {
  kind: StopKind;
  /** FIGHT / ELITE: who you face. */
  enemy?: EnemyDef;
  /** ENCOUNTER: which one (src/core/encounters.ts). */
  encounter?: string;
}
/**
 * An act: a shared opener fight, then you pick ONE of the routes (every stop shown up front), then the routes rejoin
 * at the Cashier (acts 1-3) and the boss. Endless loops have a single route.
 */
export interface ActMap {
  opener: EnemyDef;
  routes: Stop[][];
  shopBeforeBoss: boolean;
  boss: EnemyDef;
}

/**
 * Route shapes for acts 1-3 (5 stops): F fight, E elite, S Cashier, ? encounter. Three different shapes are dealt
 * per act, and never all with the same number of elites: a path is judged against YOUR run (your HP, your chips,
 * who's on it), not ranked greedy-to-safe.
 */
// (2026-10-12: two shapes with three encounters, the casino path: fewer fights, more gambles.)
/** (User, 2026-10-12: a Cashier sits at stop 3 or earlier, never 4 or 5: one at the end ran into the pre-boss Cashier.) */
export const ROUTE_SHAPES = ['FE?FE', 'F?SF?', 'FES?F', '?FSEF', 'FF?E?', 'EFSF?', 'FS?FE', '?FFEF', 'FS?EF', 'F?E?F', '?F?E?', 'E?F??'];
/** ENDLESS loops pick from 2 paths shaped like the acts' (user, 2026-10-14: they had one short route and no encounters). */
export const ROUTES_PER_ACT = 3;
export const ROUTES_PER_LOOP = 2;
/** Elites hit this much harder than their regular selves (on top of their HP bump). */
export const ELITE_DMG_MUL = 1.25;
/** An act's regular HP curve has 5 steps after the opener; a route's stop i sits on step 1 + i*(len-1)/routeLen. */
const routeDepth = (i: number, routeLen: number, act: number) => Math.min(actLength(act) - 1, 1 + Math.floor((i * (actLength(act) - 1)) / routeLen));


/** The act's map (deterministic for a seed). */
export function generateActMap(rng: Rng, act = 1, loop = 1, cabinet?: CabinetId): ActMap {
  const meets = (a: Archetype) => !a.only || (!!cabinet && a.only.includes(cabinet));
  // ENDLESS (act 4): regulars from acts 2 and 3.
  const inAct = (act >= 4 ? ARCHETYPES.filter((a) => actsOf(a).some((x) => x >= 2)) : ARCHETYPES.filter((a) => actsOf(a).includes(act))).filter(meets);
  // THE REPO MAN joins the act 1-2 pool as a regular (he used to hold fight 4 of every act).
  const pool = act <= GATEKEEPER.acts ? [...inAct, REPO_MAN] : inAct;
  const NEW = act === 3 ? ACT3_NEW : ACT2_NEW;
  // The opener is always gentle: act 1's slime or frost imp; acts 2-3 open on one of the act's new faces.
  const openers = act === 1 ? inAct.filter((a) => a.id === 'slime' || a.id === 'frost') : act < 4 ? inAct.filter((a) => NEW.has(a.id) && a.minDepth === 0) : inAct;
  const openerArch = rng.pick(openers.length ? openers : inAct);
  const opener = makeEnemy(openerArch, 0, rng, false, act);
  const shapes = dealShapes(rng, act >= 4 ? ROUTES_PER_LOOP : ROUTES_PER_ACT);
  const routes = shapes.map((shape) => {
    let prev = openerArch.id;
    const seen = new Set<string>();
    let sawNew = false;
    return [...shape].map((ch, i): Stop => {
      if (ch === 'S') return { kind: 'shop' };
      if (ch === '?') return { kind: 'encounter', encounter: rng.pick(ENCOUNTER_IDS) };
      const depth = routeDepth(i, shape.length, act);
      let options = pool.filter((a) => a.minDepth <= depth && a.id !== prev && !seen.has(a.id));
      // Acts 2-3: a route's first fight is one of the act's new faces.
      if (act >= 2 && act < 4 && !sawNew) {
        const fresh = options.filter((a) => NEW.has(a.id));
        if (fresh.length) options = fresh;
      }
      if (!options.length) options = pool.filter((a) => a.minDepth <= depth && a.id !== prev);
      const a = rng.pick(options.length ? options : inAct);
      prev = a.id;
      seen.add(a.id);
      sawNew ||= NEW.has(a.id);
      const enemy = makeEnemy(a, depth, rng, false, act);
      if (ch !== 'E') return { kind: 'fight', enemy };
      enemy.elite = true;
      // The elite thief is already the deadliest regular: a lighter bump.
      enemy.hp = unitsRound(enemy.hp * (act > 1 ? ELITE_HP_MUL_2 : a.id === 'thief' ? 1.15 : ELITE_HP_MUL));
      enemy.name = `ELITE ${enemy.name}`.replace(/^ELITE (\w+) /, 'ELITE ');
      return { kind: 'elite', enemy };
    });
  });
  // ENDLESS: the boss cycles THE HOUSE -> THE WHEEL -> THE DEALER.
  // Loop 5: THE OWNER.
  const owner = act >= 4 && loop === TURBO.loop;
  const bossArch = owner ? OWNER : act >= 4 ? [BOSS, WHEEL, DEALER][(Math.max(1, loop) - 1) % 3] : (BOSSES[act] ?? BOSS);
  const boss = makeEnemy(bossArch, actLength(act), rng, true, act);
  if (owner) boss.turbo = true;
  return { opener, routes, shopBeforeBoss: true, boss };
}

/** Different route shapes whose elite counts aren't all the same. */
function dealShapes(rng: Rng, n: number): string[] {
  const elites = (s: string) => [...s].filter((c) => c === 'E').length;
  for (let guard = 0; guard < 50; guard++) {
    const picks = rng.shuffle([...ROUTE_SHAPES]).slice(0, n);
    if (new Set(picks.map(elites)).size > 1) return picks;
  }
  return ROUTE_SHAPES.slice(0, n);
}
