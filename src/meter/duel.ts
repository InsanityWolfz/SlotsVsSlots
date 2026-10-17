import { Rng } from '../core/rng';
import { wrap } from '../core/strip';

/**
 * THE METERS PROTOTYPE (user, 2026-10-17): KNIGHT vs SLIME. Two meters a side, SWORD and SHIELD (10 to fill), fed by
 * every sword and shield in sight (anywhere on the 3x3). THREE PAYLINES (top, middle, bottom rows) set the worth:
 * - SWORD: off a winning line, a plain segment (worth 1); in a line PAIR, gold (2); in a line JACKPOT, red-hot (3). A
 *   full meter keeps upgrading (a better segment replaces the weakest). FIRE hits for its total x hit.
 * - SHIELD: fills faster: a line pair fills METER.pairFill at once, a jackpot fills it all. A raised shield negates
 *   the other side's attack on its next turn.
 * - HEART and COIN have no meter: they pay the moment they land (heal / coins, x2 in a line pair, x3 in a jackpot).
 * - SLIME (the slime's reels) has no meter: a SLIME line win gunks your SWORD meter down to METER.gunkCap bars (the
 *   best stay) until you fire.
 * After your spin you FIRE or BLOCK (one a turn, if full) or end the turn; the slime fires, else blocks. Pure rules.
 */
export type MSym = 'sword' | 'shield' | 'heart' | 'coin' | 'slime';
export type Seg = 1 | 2 | 3;

export const QUALITY: readonly MSym[] = ['sword', 'heart', 'coin'];
export const isQuality = (s: MSym) => QUALITY.includes(s);

export const METER = {
  /** Segments to fill a meter. */
  size: 10,
  /** A line pair fills the SHIELD meter by this many; a jackpot fills it all. */
  pairFill: 5,
  /** A SLIME line win gunks the other side's SWORD meter down to this many bars, until it fires. */
  gunkCap: 5,
  // Strips and heals tuned so a fight runs about 9 turns (simulated; the 4-symbol version ran 19, healing and gunking
  // every other turn).
  you: { hp: 200, hit: 10, heal: 4, coin: 1, strip: { sword: 5, shield: 4, heart: 3, coin: 3 } as Partial<Record<MSym, number>> },
  slime: { hp: 300, hit: 8, heal: 3, coin: 0, strip: { sword: 5, shield: 4, heart: 3, slime: 2 } as Partial<Record<MSym, number>> },
};

export type Side = 'you' | 'enemy';
export type Phase = 'spin' | 'act' | 'enemy' | 'over';
/** The actions a full meter can take (one a turn). */
export type Action = 'sword' | 'shield';

export interface Fighter {
  hp: number;
  maxHp: number;
  stats: (typeof METER)['you'];
  /** Each reel's strip, and the cell on the middle row. */
  reels: MSym[][];
  stops: number[];
  /** Every meter's segments, best first (FAST meters hold 1s). */
  meters: Record<MSym, Seg[]>;
  /** A raised shield: it negates the other side's attack on its next turn. */
  guard: boolean;
  /** The SWORD meter's size: METER.size, or METER.gunkCap while it's gunked (until it fires). */
  swordCap: number;
  coins: number;
}

export interface Fill {
  reel: number;
  row: number;
  meter: MSym;
  /** The segment's worth (QUALITY), or 1. */
  seg: Seg;
  /** Segments this fill adds (FAST meters: 1, or a line's pair/jackpot fill). */
  amount: number;
}

export interface LineWin {
  row: number;
  tier: 'pair' | 'jackpot';
  sym: MSym;
}

/** What a turn did, for the screen to play. */
export interface TurnLog {
  side: Side;
  lines: LineWin[];
  fills: Fill[];
  /** Coins the spin's COINs paid. */
  cashed: number;
  /** A SLIME line win gunked the other side's SWORD meter. */
  gunked: boolean;
  action: Action | null;
  /** FIRE: what it dealt (0 if blocked) and its power. A spin: what its HEARTs healed. */
  damage: number;
  power: number;
  healed: number;
  blocked: boolean;
}

const newLog = (side: Side): TurnLog => ({ side, lines: [], fills: [], cashed: 0, gunked: false, action: null, damage: 0, power: 0, healed: 0, blocked: false });

function fighter(stats: Fighter['stats'], rng: Rng): Fighter {
  const reels = [0, 1, 2].map(() => {
    const strip: MSym[] = [];
    for (const [s, n] of Object.entries(stats.strip) as [MSym, number][]) for (let i = 0; i < n; i++) strip.push(s);
    return rng.shuffle(strip);
  });
  return {
    hp: stats.hp,
    maxHp: stats.hp,
    stats,
    reels,
    stops: reels.map((r) => rng.int(r.length)),
    meters: { sword: [], shield: [], heart: [], coin: [], slime: [] },
    guard: false,
    swordCap: METER.size,
    coins: 0,
  };
}

/** The strip index on a reel's row (0 = top, 1 = middle, 2 = bottom). */
export const cellIndex = (f: Fighter, reel: number, row: number) => wrap(f.stops[reel] + row - 1, f.reels[reel].length);
export const symAt = (f: Fighter, reel: number, row: number): MSym => f.reels[reel][cellIndex(f, reel, row)];

/** Add a segment: fill an empty slot, or (full) replace the weakest if this one is better. Kept best first. */
export function addSeg(meter: Seg[], seg: Seg, cap = METER.size): boolean {
  if (meter.length < cap) meter.push(seg);
  else if (meter[meter.length - 1] < seg) meter[meter.length - 1] = seg;
  else return false;
  meter.sort((a, b) => b - a);
  return true;
}

export const total = (m: Seg[]) => m.reduce((a, s) => a + s, 0);
/** What a full meter does: SWORD's hit, HEART's heal, COIN's cash-out. */
export function worth(f: Fighter, m: MSym): number {
  const t = total(f.meters[m]);
  return m === 'sword' ? t * f.stats.hit : m === 'heart' ? t * f.stats.heal : m === 'coin' ? t * f.stats.coin : 0;
}

export class Duel {
  readonly rng: Rng;
  you: Fighter;
  enemy: Fighter;
  phase: Phase = 'spin';
  turn = 1;
  winner: Side | null = null;

  constructor(seed = Rng.randomSeed()) {
    this.rng = new Rng(seed);
    this.you = fighter(METER.you, this.rng);
    this.enemy = fighter(METER.slime as Fighter['stats'], this.rng);
  }

  /** A meter's size (the SWORD's shrinks while gunked). */
  cap(side: Side, m: MSym): number {
    return m === 'sword' ? this[side].swordCap : METER.size;
  }

  full(side: Side, m: MSym): boolean {
    return this[side].meters[m].length >= this.cap(side, m);
  }

  /** Spin a side and fill its meters from what landed (line wins first, so they're never crowded out). */
  private spinAndFill(side: Side): TurnLog {
    const f = this[side];
    const log = newLog(side);
    f.stops = f.reels.map((r) => this.rng.int(r.length));
    // Line wins: on each row, a symbol on 2+ cells.
    for (let row = 0; row < 3; row++) {
      const syms = [0, 1, 2].map((r) => symAt(f, r, row));
      for (const s of new Set(syms)) {
        const n = syms.filter((x) => x === s).length;
        if (n >= 2) log.lines.push({ row, tier: n === 3 ? 'jackpot' : 'pair', sym: s });
      }
    }
    const lineOf = (reel: number, row: number, s: MSym) => log.lines.find((l) => l.row === row && l.sym === s && symAt(f, reel, row) === s);
    const cells: { reel: number; row: number; sym: MSym; line: LineWin | undefined }[] = [];
    for (let reel = 0; reel < 3; reel++)
      for (let row = 0; row < 3; row++) {
        const sym = symAt(f, reel, row);
        cells.push({ reel, row, sym, line: lineOf(reel, row, sym) });
      }
    cells.sort((a, b) => Number(!!b.line) - Number(!!a.line));
    // A FAST meter's line bonus rides on that line's first cell.
    const bonusDone = new Set<LineWin>();
    for (const c of cells) {
      const meter = f.meters[c.sym];
      // HEART and COIN have no meter: they pay the moment they land (a line win pays 2x or 3x).
      if (c.sym === 'heart' || c.sym === 'coin') {
        const seg: Seg = c.line ? (c.line.tier === 'jackpot' ? 3 : 2) : 1;
        let amount = seg * (c.sym === 'heart' ? f.stats.heal : f.stats.coin);
        if (c.sym === 'heart') amount = Math.min(amount, f.maxHp - f.hp - log.healed);
        if (amount <= 0) continue;
        if (c.sym === 'heart') log.healed += amount;
        else log.cashed += amount;
        log.fills.push({ reel: c.reel, row: c.row, meter: c.sym, seg, amount });
        continue;
      }
      // SLIME has no meter either: only a line win counts (it gunks, below).
      if (c.sym === 'slime') continue;
      if (isQuality(c.sym)) {
        const seg: Seg = c.line ? (c.line.tier === 'jackpot' ? 3 : 2) : 1;
        if (addSeg(meter, seg, this.cap(side, c.sym))) log.fills.push({ reel: c.reel, row: c.row, meter: c.sym, seg, amount: 1 });
      } else {
        let amount = 1;
        if (c.line && !bonusDone.has(c.line)) {
          bonusDone.add(c.line);
          amount = c.line.tier === 'jackpot' ? METER.size : METER.pairFill;
        } else if (c.line) amount = 0;
        amount = Math.min(amount, METER.size - meter.length);
        if (amount <= 0) continue;
        for (let i = 0; i < amount; i++) meter.push(1);
        log.fills.push({ reel: c.reel, row: c.row, meter: c.sym, seg: 1, amount });
      }
    }
    f.hp += log.healed;
    f.coins += log.cashed;
    // A SLIME line win (pair or jackpot) gunks the other side's SWORD meter.
    if (log.lines.some((l) => l.sym === 'slime')) {
      const o = this[side === 'you' ? 'enemy' : 'you'];
      o.swordCap = METER.gunkCap;
      o.meters.sword = o.meters.sword.slice(0, METER.gunkCap);
      log.gunked = true;
    }
    return log;
  }

  /** Your spin: the meters fill (COIN cashes out). Then you may act (one full meter) or pass. */
  spin(): TurnLog {
    if (this.phase !== 'spin') throw new Error(`spin in phase ${this.phase}`);
    const log = this.spinAndFill('you');
    this.phase = 'act';
    return log;
  }

  /** Can this action go now (its meter is full)? */
  canAct(side: Side, a: Action): boolean {
    return this.full(side, a);
  }

  /** FIRE the sword or raise the SHIELD (one a turn). */
  act(a: Action): TurnLog | null {
    if (this.phase !== 'act' || !this.canAct('you', a)) return null;
    const log = this.use('you', a);
    this.phase = this.winner ? 'over' : 'enemy';
    return log;
  }

  pass(): void {
    if (this.phase === 'act') this.phase = 'enemy';
  }

  private use(side: Side, a: Action): TurnLog {
    const f = this[side];
    const other = this[side === 'you' ? 'enemy' : 'you'];
    const log = newLog(side);
    log.action = a;
    if (a === 'shield') f.guard = true;
    else {
      log.power = worth(f, 'sword');
      if (other.guard) log.blocked = true;
      else {
        log.damage = Math.min(other.hp, log.power);
        other.hp -= log.damage;
        if (other.hp <= 0) this.winner = side;
      }
    }
    f.meters[a] = [];
    // Firing clears a gunked SWORD meter.
    if (a === 'sword') f.swordCap = METER.size;
    return log;
  }

  /** The slime's turn: it spins (its SLIME meter may gunk you), then fires, else blocks, else heals (one a turn). */
  enemyTurn(): TurnLog[] {
    if (this.phase !== 'enemy') throw new Error(`enemyTurn in phase ${this.phase}`);
    this.enemy.guard = false;
    const logs = [this.spinAndFill('enemy')];
    const act = (['sword', 'shield'] as const).find((a) => this.canAct('enemy', a));
    if (act) logs.push(this.use('enemy', act));
    this.you.guard = false;
    this.turn++;
    this.phase = this.winner ? 'over' : 'spin';
    return logs;
  }
}
