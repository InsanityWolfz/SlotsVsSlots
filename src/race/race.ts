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

/** What a pair and three of a kind pay (any two of the three payline symbols matching is a pair). */
export const PAYTABLE: Record<Payer, { pair: number; triple: number }> = {
  cherry: { pair: 10, triple: 50 },
  bar: { pair: 20, triple: 100 },
  coin: { pair: 40, triple: 200 },
  seven: { pair: 80, triple: 777 },
};

/** Cells a symbol takes on each reel's 20-cell strip. Yours swings; the rival's is steadier (more pairs, a rare SEVEN). */
export const YOUR_STRIP: Record<Payer, number> = { cherry: 8, bar: 6, coin: 4, seven: 2 };
export const RIVAL_STRIP: Record<Payer, number> = { cherry: 10, bar: 6, coin: 3, seven: 1 };

/** Step 2's starting counts (tuned in play, not balanced). */
export const RACE = { spins: 5, holds: 2, nudges: 2, maxHeld: 2, bet: 1 };

export interface SlotMachine {
  /** Each reel's strip, top to bottom. */
  reels: Payer[][];
  /** The strip index on the payline, per reel. */
  stops: number[];
}

export function buildMachine(counts: Record<Payer, number>, rng: Rng): SlotMachine {
  const reels = [0, 1, 2].map(() => {
    const strip: Payer[] = [];
    for (const p of PAYERS) for (let i = 0; i < counts[p]; i++) strip.push(p);
    return rng.shuffle(strip);
  });
  return { reels, stops: reels.map((r) => rng.int(r.length)) };
}

/** The symbol on a reel's row (0 = top, 1 = payline, 2 = bottom). */
export function symbolAt(m: SlotMachine, reel: number, row = 1): Payer {
  const strip = m.reels[reel];
  return strip[wrap(m.stops[reel] + row - 1, strip.length)];
}

export const payline = (m: SlotMachine): Payer[] => [0, 1, 2].map((r) => symbolAt(m, r));

export interface LinePay {
  tier: 'none' | 'pair' | 'triple';
  symbol: Payer | null;
  /** The reels that matched. */
  reels: number[];
  pay: number;
}

export function scoreLine(line: Payer[], bet = 1): LinePay {
  for (const tier of ['triple', 'pair'] as const) {
    const need = tier === 'triple' ? 3 : 2;
    // The richest match wins (two pairs can't happen on three reels, but keep it honest).
    for (const p of [...PAYERS].reverse()) {
      const reels = line.flatMap((s, i) => (s === p ? [i] : []));
      if (reels.length >= need) return { tier, symbol: p, reels, pay: PAYTABLE[p][tier] * bet };
    }
  }
  return { tier: 'none', symbol: null, reels: [], pay: 0 };
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
    this.phase = 'hold';
    if (this.lastSpin) this.lastSpinGap = this.score.you - this.score.rival;
    return pay;
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
    this.score.you += pay.pay;
    this.log.you.push(pay);
    this.held = [false, false, false];
    this.round++;
    this.phase = this.round >= this.spins ? 'over' : 'rival';
    return pay;
  }
}
