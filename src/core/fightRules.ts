/** The fight's rule tables, types and helpers (split from fight.ts, 2026-10-29). */
import { UNIT, type AbilityDef, type Enh, type Levels, type RelicId, type SideConfig, type SideId, type SymbolId } from './config';
import type { CombatEvent } from './events';
import { Rng } from './rng';
import { buildReel, type Reel } from './strip';
/** MIDAS (the economy machine): VAULT pips per chips held, payoff scale and cap, chips from gold bars. */
// houseSkim 2 -> 0 (BOSS_REDESIGN 2): the House's hidden chip skim drained CASSIDY's rain (his House ran 32 turns).
export const MIDAS = { houseSkim: 0, chipsPerPip: 2, chipsPerMul: 20, maxMul: 2.5 };
/**
 * CASH CASSIDY's MAKE IT RAIN!: a chip jackpot with at least `cost` chips held hits for chips (up to `maxChips`, user 2026-10-12) x `perChip` (base: the
 * jackpot, charms, relics and a full HIGH ROLLER bar multiply it), counted before it costs `cost` chips.
 * RAINMAKER lowers the cost; OPEN BAR makes it free.
 */
// Built at x2 / 10 chips (the user's draft), the rain cost more than it hit: CASSIDY 20.8 WHITE. x3 / 5 measured 39.6 / 18.8.
/** chipLess: a chip group pays (its size - chipLess) chips, at least 1. */
// 2026-10-07 (no swords): chips now hit too and land 1.5x as often, and rain grows with chips held (uncapped), so
// rain x3 + a chip per symbol made CASSIDY 83 / 63. Now x2, and a group pays its size - 1 chips (1, 1, 2).
/** Pot steals: 1 = any jackpot steals the boss pot, 0 = only a jackpot of your attack symbol (probe knob). */
export const POT_STEAL = { any: 1 };
/** additive 1: your MULT bonuses (GOLD, relics, HIGH ROLLER, volume) ADD into one pool instead of
 * multiplying each other (the pair / jackpot tier still multiplies). lightningAdd 1 (on since 2026-10-12, the user's
 * call): TESLA's bolts pool (their charge), and the lightning's own boosts add up too (+30% and +100% make +130%, not
 * x2.6; CHAIN LIGHTNING is +100%). Slows TESLA's late growth without a cap. */
/**
 * teslaOneAxis (TESLA rework, user 2026-11-01, option 1: "more action and less sustain"): every lightning boost adds
 * CHARGE (more bolts) and every bolt hits the same; bolts are half size (half the charge for half the damage, so a bolt
 * pair fires at once); the storm heals once, not per bolt. `stormHeal`: that heal (x the machine's per-bolt heal).
 */
export const PAY = { additive: 0, lightningAdd: 1, teslaOneAxis: 1, stormHeal: 3 };
/** THE JUKEBOX: +25% note damage per volume level (was +20%, 2026-10-12), max 6, a noteless spin skips 2, and THE DROP leaves it at 3 (TURNTABLE: 5). */
export const VOLUME = { perLevel: 0.32, max: 6, skip: 2, after: 3, turntable: 5, hypePay: 0.5 };
export const RAIN = { maxChips: 100, perChip: 1.5, cost: 10, rainmakerCost: 2, chipLess: 1 };
/** The HIGH ROLLER bar's payoff multiplier for a chip count: 1 + chips / 20, max x2.5 (quarter steps). */
export const highRollerMul = (chips: number, cap = MIDAS.maxMul) => Math.min(cap, Math.round((1 + Math.max(0, chips) / MIDAS.chipsPerMul) * 4) / 4);

/** Act 3: marked-card bite, the Croupier's rake, and the Dealer's shuffle size. */
export const MARK_DAMAGE = 2 * UNIT;
export const RAKE_CUT = UNIT;
/** Writer tiers: what an enemy double / jackpot of one symbol pays. */
export const PAIR_PAY = 4 * UNIT;
export const JACKPOT_PAY = 9 * UNIT;
/**
 * THE DEALER plays three hands, each with its own HP bar (shares of its total HP); beating a hand starts the next,
 * harder one. 1 THE DEAL: every 3 turns it deals a BUST (your best reel's payline cell pays nothing next spin).
 * 2 RAISE: its hits are x1.5 from now on (still BUSTs). 3 ALL IN: every 2 turns, ALL IN (a share of your max HP,
 * through shields). (2026-10-12, user: simpler, drawn out, the hardest boss.)
 */
export const DEALER_RULES = { hands: [0.27, 0.31, 0.42], raiseMul: 1.5, bustEvery: 3, allInEvery: 2, allInFloor: 0.25, allInCap: 0.4, loopStep: 0.25, loopMax: 0.6 };
export const DEALER_HANDS = ['THE DEAL', 'RAISE', 'ALL IN'];
/** ALL IN's hit for a visible hand worth `hand`, clamped to DEALER_RULES' floor and cap of `maxHp`. In ENDLESS both
 * shares grow by `loopStep` a loop (up to `loopMax` of your max HP): its hit kept pace with nothing (user, 2026-10-12).
 * loopMax is the boss one-turn cap (TUNE.bossTurnCap): past it the shown range promised hits that couldn't land (playtest C). */
export const allInRange = (maxHp: number, hand: number, loop = 0): number => {
  const k = 1 + DEALER_RULES.loopStep * loop;
  const share = (x: number) => Math.min(DEALER_RULES.loopMax, x * k);
  return Math.max(UNIT, Math.round((maxHp * share(DEALER_RULES.allInFloor)) / UNIT) * UNIT, Math.min(hand, Math.round((maxHp * share(DEALER_RULES.allInCap)) / UNIT) * UNIT));
};

/** A meter payoff's heal, named for the popup. */
export const PAYOFF_WORD: Record<string, string> = { special: 'LIGHTNING', vault: 'HIGH ROLLER', volume: 'THE DROP', jackpots: 'JACKPOT' };

/** Counterfeit coins last this many of your turns. */
export const FAKE_TURNS = 3;

/** Symbols that act on the opponent when they're native to the caster's strips. */
export const WRITERS: ReadonlySet<SymbolId> = new Set(['slime', 'ice', 'claw', 'rock', 'lock', 'coin', 'bomb', 'hex', 'fangs', 'mimicSym', 'fake', 'card', 'gavel', 'rake', 'ball']);
/** HOLY WATER washes off these writes (not coins, drains or the Mimic's hit) and these abilities. */
export const REEL_WRITES: ReadonlySet<SymbolId> = new Set(['slime', 'ice', 'claw', 'rock', 'lock', 'bomb', 'hex', 'card', 'gavel', 'rake', 'fake', 'ball']);
export const FIZZLE_SINGLES: ReadonlySet<SymbolId> = new Set(['lock', 'rock', 'hex', 'gavel', 'ball']);
export const WRITER_ABILITIES: ReadonlySet<string> = new Set(['repo', 'flood', 'blizzard', 'jam', 'pilfer', 'quake', 'carpet', 'curse', 'gulp', 'launder', 'mark', 'houseTake', 'penalty']);
/** Groups that "pay" for RAISE and MIDAS's x4 (the ones that hit, shield or charge). */
export const PAYING: ReadonlySet<SymbolId> = new Set(['sword', 'ace', 'shield', 'bolt', 'seven', 'goldbar', 'note']);
/** The groups OVERTIME grows: the ones that hit. */
export const OVERTIME_HITS: ReadonlySet<SymbolId> = new Set(['sword', 'ace', 'seven', 'goldbar', 'note']);
/** A cell's charm as the WILD wheel shows it (only charms that change a jackpot's pay or heal). */
export const wheelCharm = (cell: { enh?: Enh; faked?: number }): Enh | undefined =>
  cell.enh && (cell.enh === 'gold' || cell.enh === 'keen' || cell.enh === 'vamp' || cell.enh === 'charged') && !((cell.faked ?? 0) > 0) ? cell.enh : undefined;

/** Symbols the 3-WILD bonus reel (and a WILD in JAX's payoff) can pick. */
export const WHEEL_SYMBOLS: ReadonlySet<SymbolId> = new Set(['sword', 'ace', 'shield', 'bolt', 'goldbar', 'note']);
export const JACKPOTABLE = WHEEL_SYMBOLS;

export interface Combatant {
  side: SideId;
  hp: number;
  maxHp: number;
  shield: number;
  /** The signature meter: TESLA's energy, MIDAS's gold, JAX's wilds. */
  energy: number;
  /** MIDAS / JAX: the meter is full and waiting to pay off. */
  armed: boolean;
  reels: Reel[];
  /** Writer symbols native to this side's strips. */
  casts: Set<SymbolId>;
  /** Remaining own-turns each reel stays frozen (doesn't spin). */
  frozen: number[];
  /** Remaining own-turns each reel is jammed (scores nothing). */
  locked: number[];
  /** Remaining own-turns each reel is jinxed (pays half; user, 2026-10-30: its Charms stay lit). */
  hexed: number[];
  /** The Croupier's rake: remaining own-turns your groups pay less. */
  raked: number;
  ability: AbilityDef | null;
  charge: number;
  relics: Set<RelicId>;
  /** Symbol and charm levels (the player). */
  levels?: Levels;
}

export interface TurnResult {
  turn: number;
  side: SideId;
  events: CombatEvent[];
}

export const other = (s: SideId): SideId => (s === 'player' ? 'enemy' : 'player');

/** 1 → 1 reel for 1 turn, a double (40) → 2 reels × 2 turns, a jackpot (90) → 3 × 3. */
export const statusSize = (amount: number) => Math.max(1, Math.min(3, Math.round(Math.sqrt(amount / UNIT))));

export function makeCombatant(side: SideId, sc: SideConfig, rng: Rng, relics: RelicId[]): Combatant {
  const reels = sc.strips.map((counts, r) => buildReel(counts, rng, (sc.gilded ?? []).filter((g) => g.reel === r)));
  const casts = new Set<SymbolId>();
  for (const c of sc.strips) for (const [s, n] of Object.entries(c)) if ((n ?? 0) > 0 && WRITERS.has(s as SymbolId)) casts.add(s as SymbolId);
  // The player's own slime/rock are debuffs, never casts.
  if (side === 'player') casts.clear();
  return {
    side,
    hp: Math.min(sc.hp, sc.startHp ?? sc.hp),
    maxHp: sc.hp,
    shield: 0,
    energy: sc.startEnergy ?? 0,
    armed: false,
    reels,
    casts,
    frozen: reels.map(() => 0),
    locked: reels.map(() => 0),
    hexed: reels.map(() => 0),
    raked: 0,
    ability: sc.ability ?? null,
    charge: 0,
    relics: new Set(relics),
    levels: sc.levels,
  };
}

/** What an enemy's effect symbols do at this pay (single / pair / jackpot), in plain words, matching write(). */
export function effectText(sym: SymbolId, amount: number): string {
  const pair = amount >= PAIR_PAY;
  const jackpot = amount >= JACKPOT_PAY;
  const n = statusSize(amount);
  const s = (k: number, one: string, many = `${one}S`) => `${k} ${k === 1 ? one : many}`;
  switch (sym) {
    case 'slime':
      return `SPILLS ON ${s(Math.round(amount / UNIT), 'CELL')}`;
    case 'ice':
      return `FREEZES ${s(pair ? 2 : 1, 'REEL')} FOR ${s(jackpot ? 3 : pair ? 2 : 1, 'TURN')}`;
    case 'lock':
      return pair ? `JAMS ${s(jackpot ? 2 : 1, 'REEL')}` : 'FIZZLES';
    case 'claw':
      return `STEALS ${s(n, 'CELL')}`;
    case 'rock':
      return pair ? `ADDS ${s(jackpot ? 2 : 1, 'ROCK')}` : 'FIZZLES';
    case 'coin':
      return `+${amount} TO THE POT`;
    case 'bomb':
      return `STICKS ${s(n, 'IOU')}`;
    case 'hex':
      return pair ? `JINXES ${s(jackpot ? 2 : 1, 'REEL')}` : 'FIZZLES';
    case 'fangs':
      return `DRAINS ${(jackpot ? 7 : pair ? 4 : 2) * UNIT}`;
    case 'card':
      return `MARKS ${s(n, 'CELL')}`;
    case 'gavel':
      return pair ? `SEIZES ${jackpot ? 4 : 2} CHARMS` : 'FIZZLES';
    case 'rake':
      return `RAKES YOUR PAY FOR ${s(n, 'TURN')}`;
    case 'fake':
      return `FAKES ${s(2 * n, 'CHARM')}`;
    case 'mimicSym':
      return jackpot ? 'COPIES YOUR BEST HIT X2' : pair ? 'COPIES YOUR BEST HIT' : 'COPIES HALF YOUR BEST HIT';
    case 'ball':
      return pair ? `BETS ${s(jackpot ? 2 : 1, 'MORE CHIP', 'MORE CHIPS')}` : 'FIZZLES';
    default:
      return '';
  }
}
