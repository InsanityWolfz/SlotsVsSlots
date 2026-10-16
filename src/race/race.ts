import { Rng } from '../core/rng';
import { wrap } from '../core/strip';

/**
 * THE NEW GAME's race (step 2 of the rebuild: docs/VISION.md, signed off 2026-10-16). Pure rules, no drawing.
 * Both Slot Machines spin RACE.spins times; the rival spins first each round, so the race ends on your spin with a
 * visible target. You get HOLD (keep up to 2 reels, one HOLD a reel) and NUDGE (one a spin: the symbol above drops
 * onto the payline). The higher score wins; a tie is yours.
 */

/** The classic payers, cheap to rich. */
export const PAYERS = ['cherry', 'bar', 'coin', 'seven'] as const;
export type Payer = (typeof PAYERS)[number];

export const PAYER_NAME: Record<Payer, string> = { cherry: 'CHERRY', bar: 'BAR', coin: 'COIN', seven: 'SEVEN' };

/**
 * A reel symbol: a payer, or KNIGHT's SWORD (step 3, VISION "the SWORD pays its EDGE"): each SWORD on your payline
 * pays its EDGE now (on top of a pair the other reels make); a sword that spun or was nudged onto the line then
 * doubles the EDGE for the rest of the race. A held sword strikes but doesn't sharpen. Three SWORDs pay
 * RACE.swordJackpot. A sword never matches, so it breaks three of a kind.
 */
export type Sym = Payer | 'sword';

/** What a pair and three of a kind pay (any two of the three payline symbols matching is a pair). */
export const PAYTABLE: Record<Payer, { pair: number; triple: number }> = {
  cherry: { pair: 10, triple: 50 },
  bar: { pair: 20, triple: 100 },
  coin: { pair: 40, triple: 200 },
  seven: { pair: 80, triple: 777 },
};

/** Cells a symbol takes on each reel's strip. Yours swings (KNIGHT: 20 payers + 2 SWORDs); the rival's is steadier
 * (more pairs, a rare SEVEN, no swords). */
export const YOUR_STRIP: Partial<Record<Sym, number>> = { cherry: 8, bar: 6, coin: 4, seven: 2, sword: 2 };
export const RIVAL_STRIP: Partial<Record<Sym, number>> = { cherry: 10, bar: 6, coin: 3, seven: 1 };

/** Starting counts (tuned in play, not balanced). edge: a SWORD's first strike (it doubles as it sharpens). */
export const RACE = { spins: 5, holds: 2, nudges: 2, maxHeld: 2, bet: 1, edge: 10, swordJackpot: 777 };

/**
 * The plain rival's cheat, GUNK (VISION "the first rival cheat"): on these spins (1-based), after its own spin, it
 * gunks one cell of your pair on your standing payline (the leftmost; your best single payer if there's no pair; never
 * a SWORD). The gunked symbol still matches, but any pay it's part of is halved (rounded down). The gunk washes off
 * after your next spin, held or not; NUDGEd off the line, it goes with its symbol.
 */
export const GUNK = { on: [2, 4] };

/** A gunked cell: which reel, and which strip cell on it. */
export interface Gunk {
  reel: number;
  cell: number;
}

export interface SlotMachine {
  /** Each reel's strip, top to bottom. */
  reels: Sym[][];
  /** The strip index on the payline, per reel. */
  stops: number[];
}

export function buildMachine(counts: Partial<Record<Sym, number>>, rng: Rng): SlotMachine {
  const reels = [0, 1, 2].map(() => {
    const strip: Sym[] = [];
    for (const p of [...PAYERS, 'sword' as const]) for (let i = 0; i < (counts[p] ?? 0); i++) strip.push(p);
    return rng.shuffle(strip);
  });
  return { reels, stops: reels.map((r) => rng.int(r.length)) };
}

/** The symbol on a reel's row (0 = top, 1 = payline, 2 = bottom). */
export function symbolAt(m: SlotMachine, reel: number, row = 1): Sym {
  const strip = m.reels[reel];
  return strip[wrap(m.stops[reel] + row - 1, strip.length)];
}

export const payline = (m: SlotMachine): Sym[] => [0, 1, 2].map((r) => symbolAt(m, r));

/** One SWORD's strike: what it paid, and whether it sharpened (doubled the EDGE) after. */
export interface Strike {
  reel: number;
  pay: number;
  sharpened: boolean;
}

export interface LinePay {
  tier: 'none' | 'pair' | 'triple';
  /** What made the pair or three of a kind ('sword': three SWORDs, KNIGHT's jackpot). */
  symbol: Payer | 'sword' | null;
  /** The reels that matched. */
  reels: number[];
  /** The whole pay: the paytable's (times the BET) plus the swords' strikes. */
  pay: number;
  /** The swords' part of the pay (their strikes). */
  edge: number;
  /** The reels with a SWORD on the payline. */
  swords: number[];
  /** Each sword's strike, left to right (filled in by the race, which knows the EDGE). */
  strikes: Strike[];
  /** What GUNK took off this pay (0 if none). */
  cut: number;
}

/** What a payline's payers pay (SWORDs never match; their strikes are the race's: Race.pay). */
export function scoreLine(line: Sym[], bet = 1): LinePay {
  const swords = line.flatMap((s, i) => (s === 'sword' ? [i] : []));
  for (const tier of ['triple', 'pair'] as const) {
    const need = tier === 'triple' ? 3 : 2;
    // The richest match wins (two pairs can't happen on three reels, but keep it honest).
    for (const p of [...PAYERS].reverse()) {
      const reels = line.flatMap((s, i) => (s === p ? [i] : []));
      if (reels.length >= need) return { tier, symbol: p, reels, pay: PAYTABLE[p][tier] * bet, edge: 0, swords, strikes: [], cut: 0 };
    }
  }
  return { tier: 'none', symbol: null, reels: [], pay: 0, edge: 0, swords, strikes: [], cut: 0 };
}

/**
 * Where the race is:
 * - 'rival': the rival's spin is next (rivalSpin()).
 * - 'hold': your turn, before the spin: tap reels to HOLD, then spin().
 * - 'landed': your reels landed; NUDGE (if you have one) or pay().
 * - 'over': the race is decided.
 */
export type RacePhase = 'rival' | 'hold' | 'landed' | 'over';

export interface RaceOpts {
  seed?: number;
  spins?: number;
  holds?: number;
  nudges?: number;
  bet?: number;
}

export class Race {
  readonly rng: Rng;
  readonly you: SlotMachine;
  readonly rival: SlotMachine;
  readonly spins: number;
  readonly bet: number;
  phase: RacePhase = 'rival';
  /** Spins taken: round is the rival's and your current spin (0-based). */
  round = 0;
  score = { you: 0, rival: 0 };
  holdsLeft: number;
  nudgesLeft: number;
  /** The reels you've picked to HOLD for your next spin. */
  held = [false, false, false];
  /** You've used this spin's NUDGE. */
  nudged = false;
  /** KNIGHT's EDGE: what the next SWORD strike pays (it doubles each time a sword sharpens). */
  edge = RACE.edge;
  /** The rival's GUNK on one of your cells, until your next spin pays (null: none). */
  gunk: Gunk | null = null;
  /** The reels held for the spin that just landed, and the reel nudged (a nudged sword is fresh: it sharpens). */
  private spunHeld = [false, false, false];
  private nudgedReel = -1;
  /** Each side's pays, spin by spin. */
  log: { you: LinePay[]; rival: LinePay[] } = { you: [], rival: [] };
  /** Your lead (+) or deficit (-) when your last spin started: was the race decided before it? (VISION's watch number.) */
  lastSpinGap: number | null = null;

  constructor(o: RaceOpts = {}) {
    this.rng = new Rng(o.seed ?? Rng.randomSeed());
    this.spins = o.spins ?? RACE.spins;
    this.holdsLeft = o.holds ?? RACE.holds;
    this.nudgesLeft = o.nudges ?? RACE.nudges;
    this.bet = o.bet ?? RACE.bet;
    this.you = buildMachine(YOUR_STRIP, this.rng);
    this.rival = buildMachine(RIVAL_STRIP, this.rng);
  }

  get lastSpin(): boolean {
    return this.round === this.spins - 1;
  }

  /** What you need from here to win (a tie is yours): 0 when you already lead or tie. */
  get need(): number {
    return Math.max(0, this.score.rival - this.score.you);
  }

  get won(): boolean {
    return this.score.you >= this.score.rival;
  }

  private spinTo(m: SlotMachine, keep: boolean[] = [false, false, false]): void {
    m.stops = m.stops.map((s, r) => (keep[r] ? s : this.rng.int(m.reels[r].length)));
  }

  /** The rival spins (no tools: it just plays). */
  rivalSpin(): LinePay {
    if (this.phase !== 'rival') throw new Error(`rivalSpin in phase ${this.phase}`);
    this.spinTo(this.rival);
    const pay = scoreLine(payline(this.rival), this.bet);
    this.score.rival += pay.pay;
    this.log.rival.push(pay);
    if (GUNK.on.includes(this.round + 1)) this.gunk = this.gunkTarget();
    this.phase = 'hold';
    if (this.lastSpin) this.lastSpinGap = this.score.you - this.score.rival;
    return pay;
  }

  /** GUNK's target on your standing payline: the leftmost cell of your pair, else your best single payer, never a SWORD. */
  gunkTarget(): Gunk | null {
    const line = payline(this.you);
    const p = scoreLine(line);
    let reel = p.symbol && p.symbol !== 'sword' ? p.reels[0] : -1;
    if (reel < 0) {
      let best = 0;
      line.forEach((s, i) => {
        if (s !== 'sword' && PAYTABLE[s].pair > best) [best, reel] = [PAYTABLE[s].pair, i];
      });
    }
    return reel < 0 ? null : { reel, cell: this.you.stops[reel] };
  }

  /** Is the gunked cell on your payline right now? */
  get gunkOnLine(): boolean {
    const g = this.gunk;
    return !!g && this.you.stops[g.reel] === g.cell;
  }

  /** Reels held right now. */
  get heldCount(): number {
    return this.held.filter(Boolean).length;
  }

  /** Can this reel be held (or let go)? */
  canHold(reel: number): boolean {
    if (this.phase !== 'hold') return false;
    if (this.held[reel]) return true;
    return this.heldCount < RACE.maxHeld && this.heldCount < this.holdsLeft;
  }

  /** HOLD a reel for your next spin, or let it go. Returns whether it's held now. */
  toggleHold(reel: number): boolean {
    if (!this.canHold(reel)) return this.held[reel];
    this.held[reel] = !this.held[reel];
    return this.held[reel];
  }

  /** Your spin: held reels keep their symbols (each costs a HOLD), the rest spin. Lands without paying yet. */
  spin(): void {
    if (this.phase !== 'hold') throw new Error(`spin in phase ${this.phase}`);
    this.holdsLeft -= this.heldCount;
    this.spunHeld = this.held.slice();
    this.nudgedReel = -1;
    this.spinTo(this.you, this.held);
    this.nudged = false;
    this.phase = 'landed';
  }

  canNudge(reel: number): boolean {
    return this.phase === 'landed' && !this.nudged && this.nudgesLeft > 0 && reel >= 0 && reel < 3;
  }

  /** NUDGE a landed reel down one cell: the symbol above drops onto the payline. One a spin. */
  nudge(reel: number): boolean {
    if (!this.canNudge(reel)) return false;
    const strip = this.you.reels[reel];
    this.you.stops[reel] = wrap(this.you.stops[reel] - 1, strip.length);
    this.nudgesLeft--;
    this.nudged = true;
    this.nudgedReel = reel;
    return true;
  }

  /** Is there anything left to do before paying? (Otherwise the spin pays on its own.) */
  get canStillNudge(): boolean {
    return this.phase === 'landed' && !this.nudged && this.nudgesLeft > 0;
  }

  /** Score your landed spin, then on to the next round (or the end). */
  pay(): LinePay {
    if (this.phase !== 'landed') throw new Error(`pay in phase ${this.phase}`);
    const pay = scoreLine(payline(this.you));
    // GUNK: a pay the gunked cell is part of is halved (the swords' strikes never are).
    if (this.gunkOnLine && pay.reels.includes(this.gunk!.reel)) {
      pay.cut = pay.pay - Math.floor(pay.pay / 2);
      pay.pay -= pay.cut;
    }
    this.gunk = null;
    if (pay.swords.length === 3) {
      // Three SWORDs: KNIGHT's jackpot (as rare as three SEVENs), and the EDGE sharpens.
      Object.assign(pay, { tier: 'triple', symbol: 'sword', reels: [0, 1, 2], pay: RACE.swordJackpot });
      this.edge *= 2;
    } else {
      // Each sword strikes for the EDGE, left to right; a fresh one (spun or nudged in, not held) then doubles it.
      for (const reel of pay.swords) {
        const sharpened = !this.spunHeld[reel] || this.nudgedReel === reel;
        pay.strikes.push({ reel, pay: this.edge, sharpened });
        pay.edge += this.edge;
        if (sharpened) this.edge *= 2;
      }
      pay.pay += pay.edge;
    }
    this.score.you += pay.pay;
    this.log.you.push(pay);
    this.held = [false, false, false];
    this.round++;
    this.phase = this.round >= this.spins ? 'over' : 'rival';
    return pay;
  }
}
