import { Rng } from '../core/rng';
import { wrap } from '../core/strip';

/**
 * THE METERS PROTOTYPE (user, 2026-10-17): KNIGHT vs SLIME. Every SWORD and SHIELD in sight (anywhere on the 3x3)
 * fills its meter; a meter is full at METER.size. The PAYLINE decides how good the fill is:
 * - SWORD: a sword off the payline fills an orange segment (worth 1); swords in a payline PAIR fill gold (2); a payline
 *   JACKPOT (three swords) fills red-hot (3). A full meter keeps upgrading: a better segment replaces the weakest. A
 *   FIRE hits for the segments' total times your hit unit.
 * - SHIELD: fills faster instead: a payline pair fills METER.shieldPair, a jackpot fills the whole meter. A raised
 *   shield negates the other side's attack on its next turn.
 * - COIN fills nothing yet (it breaks up the payline: two symbols on three reels would always pair).
 * After your spin you may use ONE full meter (FIRE or SHIELD). The enemy plays the same meters: it fires a full SWORD
 * at once, else raises a full SHIELD. Pure rules, no drawing.
 */
export type MSym = 'sword' | 'shield' | 'coin';
export type Meter = 'sword' | 'shield';

export const METER = {
  /** Segments to fill a meter (5 filled in about one spin: user, 2026-10-17). */
  size: 10,
  /** A payline SHIELD pair fills this many (a jackpot fills it all). */
  shieldPair: 5,
  strip: { sword: 5, shield: 5, coin: 4 } as Record<MSym, number>,
  /** hit: damage per sword-segment point (orange 1, gold 2, red-hot 3), so a full meter hits for 10x to 30x. */
  you: { hp: 200, hit: 10 },
  slime: { hp: 300, hit: 8 },
};

/** A sword segment's worth: 1 orange (off the payline), 2 gold (a payline pair), 3 red-hot (a payline jackpot). */
export type Seg = 1 | 2 | 3;

export interface Fighter {
  hp: number;
  maxHp: number;
  hit: number;
  /** Each reel's strip, and the cell on the payline (the middle row). */
  reels: MSym[][];
  stops: number[];
  /** The SWORD meter's segments, best first. */
  sword: Seg[];
  shield: number;
  /** A raised shield: it negates the other side's attack on its next turn. */
  guard: boolean;
}

export type Side = 'you' | 'enemy';
export type Phase = 'spin' | 'act' | 'enemy' | 'over';

/** One fill, in the order the screen plays them. */
export interface Fill {
  reel: number;
  row: number;
  meter: Meter;
  /** A sword segment's worth (shields: 1 a symbol; a pair/jackpot's extra shows as `amount`). */
  seg: Seg;
  /** Shield segments this fill adds (1, or the pair/jackpot bonus). */
  amount: number;
}

/** What a turn did, for the screen to play. */
export interface TurnLog {
  side: Side;
  /** The payline's match, if any ('pair' or 'jackpot', and the symbol). */
  line: { tier: 'pair' | 'jackpot'; sym: MSym } | null;
  fills: Fill[];
  action: 'fire' | 'shield' | null;
  /** The fire's damage dealt (0 if blocked or none), and what it would have dealt. */
  damage: number;
  power: number;
  blocked: boolean;
}

function fighter(stats: { hp: number; hit: number }, rng: Rng): Fighter {
  const reels = [0, 1, 2].map(() => {
    const strip: MSym[] = [];
    for (const s of ['sword', 'shield', 'coin'] as const) for (let i = 0; i < METER.strip[s]; i++) strip.push(s);
    return rng.shuffle(strip);
  });
  return { hp: stats.hp, maxHp: stats.hp, hit: stats.hit, reels, stops: reels.map((r) => rng.int(r.length)), sword: [], shield: 0, guard: false };
}

/** The symbol on a reel's row (0 = top, 1 = payline, 2 = bottom). */
export function symAt(f: Fighter, reel: number, row: number): MSym {
  const strip = f.reels[reel];
  return strip[wrap(f.stops[reel] + row - 1, strip.length)];
}

/** Add a sword segment: fill an empty slot, or (full) replace the weakest if this one is better. Kept best first. */
export function addSeg(meter: Seg[], seg: Seg): boolean {
  if (meter.length < METER.size) meter.push(seg);
  else if (meter[meter.length - 1] < seg) meter[meter.length - 1] = seg;
  else return false;
  meter.sort((a, b) => b - a);
  return true;
}

/** A sword meter's FIRE: its segments' total times the hit unit. */
export const power = (f: Fighter): number => f.sword.reduce((a, s) => a + s, 0) * f.hit;

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
    this.enemy = fighter(METER.slime, this.rng);
  }

  /** Spin a side and fill its meters from what landed (payline matches first, so they're never crowded out). */
  private spinAndFill(side: Side): TurnLog {
    const f = this[side];
    f.stops = f.reels.map((r) => this.rng.int(r.length));
    const line = [0, 1, 2].map((r) => symAt(f, r, 1));
    let match: TurnLog['line'] = null;
    for (const s of ['sword', 'shield'] as const) {
      const n = line.filter((x) => x === s).length;
      if (n >= 2) match = { tier: n === 3 ? 'jackpot' : 'pair', sym: s };
    }
    const fills: Fill[] = [];
    const cells: { reel: number; row: number; sym: MSym; lined: boolean }[] = [];
    for (let reel = 0; reel < 3; reel++)
      for (let row = 0; row < 3; row++) {
        const sym = symAt(f, reel, row);
        cells.push({ reel, row, sym, lined: row === 1 && match?.sym === sym });
      }
    cells.sort((a, b) => Number(b.lined) - Number(a.lined));
    // A shield pair/jackpot's bonus rides on its first lined shield.
    let shieldBonus = match?.sym === 'shield' ? (match.tier === 'jackpot' ? METER.size : METER.shieldPair) - (match.tier === 'jackpot' ? 3 : 2) : 0;
    for (const c of cells) {
      if (c.sym === 'sword') {
        const seg: Seg = c.lined ? (match!.tier === 'jackpot' ? 3 : 2) : 1;
        if (addSeg(f.sword, seg)) fills.push({ reel: c.reel, row: c.row, meter: 'sword', seg, amount: 1 });
      } else if (c.sym === 'shield') {
        const amount = Math.min(METER.size - f.shield, 1 + (c.lined ? shieldBonus : 0));
        if (c.lined) shieldBonus = 0;
        if (amount > 0) {
          f.shield += amount;
          fills.push({ reel: c.reel, row: c.row, meter: 'shield', seg: 1, amount });
        }
      }
    }
    return { side, line: match, fills, action: null, damage: 0, power: 0, blocked: false };
  }

  /** Is this meter full? */
  full(side: Side, m: Meter): boolean {
    return m === 'sword' ? this[side].sword.length >= METER.size : this[side].shield >= METER.size;
  }

  /** Your spin: the meters fill. Then you may act (one full meter) or pass. */
  spin(): TurnLog {
    if (this.phase !== 'spin') throw new Error(`spin in phase ${this.phase}`);
    const log = this.spinAndFill('you');
    this.phase = 'act';
    return log;
  }

  /** Use a full meter: FIRE the sword or raise the SHIELD (one a turn). */
  act(m: Meter): TurnLog | null {
    if (this.phase !== 'act' || !this.full('you', m)) return null;
    const log = this.use('you', m);
    this.phase = this.winner ? 'over' : 'enemy';
    return log;
  }

  /** End your turn without acting. */
  pass(): void {
    if (this.phase === 'act') this.phase = 'enemy';
  }

  private use(side: Side, m: Meter): TurnLog {
    const f = this[side];
    const other = this[side === 'you' ? 'enemy' : 'you'];
    const log: TurnLog = { side, line: null, fills: [], action: m === 'sword' ? 'fire' : 'shield', damage: 0, power: 0, blocked: false };
    if (m === 'shield') {
      f.shield = 0;
      f.guard = true;
      return log;
    }
    log.power = power(f);
    f.sword = [];
    if (other.guard) log.blocked = true;
    else {
      log.damage = Math.min(other.hp, log.power);
      other.hp -= log.damage;
      if (other.hp <= 0) this.winner = side;
    }
    return log;
  }

  /** The enemy's turn: it spins, then fires a full SWORD, else raises a full SHIELD. Your shield lasts this turn only. */
  enemyTurn(): TurnLog[] {
    if (this.phase !== 'enemy') throw new Error(`enemyTurn in phase ${this.phase}`);
    // The enemy's own shield covered your turn just played; it drops now.
    this.enemy.guard = false;
    const logs = [this.spinAndFill('enemy')];
    if (this.full('enemy', 'sword')) logs.push(this.use('enemy', 'sword'));
    else if (this.full('enemy', 'shield')) logs.push(this.use('enemy', 'shield'));
    // Your shield covered this turn; it drops now.
    this.you.guard = false;
    this.turn++;
    this.phase = this.winner ? 'over' : 'spin';
    return logs;
  }
}
