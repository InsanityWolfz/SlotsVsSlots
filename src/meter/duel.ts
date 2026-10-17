import { Rng } from '../core/rng';
import { wrap } from '../core/strip';

/**
 * THE METERS PROTOTYPE (user, 2026-10-17): KNIGHT vs SLIME, swords and shields only. Every SWORD and SHIELD in sight
 * (anywhere on the 3x3, not just the payline) fills its meter; a meter is full at METER.size (10). After your spin you may
 * use ONE full meter: fire the SWORD (hit for your damage) or raise the SHIELD (it negates the enemy's attack on its
 * next turn, if it attacks). The enemy plays the same meters: it fires a full SWORD at once, else raises a full SHIELD.
 * Pure rules, no drawing.
 */
export type MSym = 'sword' | 'shield';

export const METER = {
  /** Symbols to fill a meter (5 filled in about one spin: user, 2026-10-17). */
  size: 10,
  strip: { sword: 6, shield: 6 } as Record<MSym, number>,
  you: { hp: 200, hit: 100 },
  slime: { hp: 180, hit: 50 },
};

export interface Fighter {
  hp: number;
  maxHp: number;
  hit: number;
  /** Each reel's strip, and the cell on the payline (the middle row). */
  reels: MSym[][];
  stops: number[];
  meter: Record<MSym, number>;
  /** A raised shield: it negates the other side's attack on its next turn. */
  guard: boolean;
}

export type Side = 'you' | 'enemy';
export type Phase = 'spin' | 'act' | 'enemy' | 'over';

/** What a turn did, for the screen to play. */
export interface TurnLog {
  side: Side;
  /** Symbols counted this spin, by reel and row (row 0 = top). */
  counted: { reel: number; row: number; sym: MSym }[];
  /** Meter values after the fill. */
  meter: Record<MSym, number>;
  action: 'fire' | 'shield' | null;
  /** The fire's damage dealt (0 if blocked or none). */
  damage: number;
  blocked: boolean;
}

function fighter(stats: { hp: number; hit: number }, rng: Rng): Fighter {
  const reels = [0, 1, 2].map(() => {
    const strip: MSym[] = [];
    for (const s of ['sword', 'shield'] as const) for (let i = 0; i < METER.strip[s]; i++) strip.push(s);
    return rng.shuffle(strip);
  });
  return { hp: stats.hp, maxHp: stats.hp, hit: stats.hit, reels, stops: reels.map((r) => rng.int(r.length)), meter: { sword: 0, shield: 0 }, guard: false };
}

/** The symbol on a reel's row (0 = top, 1 = payline, 2 = bottom). */
export function symAt(f: Fighter, reel: number, row: number): MSym {
  const strip = f.reels[reel];
  return strip[wrap(f.stops[reel] + row - 1, strip.length)];
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
    this.enemy = fighter(METER.slime, this.rng);
  }

  private spinAndFill(side: Side): TurnLog {
    const f = this[side];
    f.stops = f.reels.map((r) => this.rng.int(r.length));
    const counted: TurnLog['counted'] = [];
    for (let reel = 0; reel < 3; reel++)
      for (let row = 0; row < 3; row++) {
        const sym = symAt(f, reel, row);
        counted.push({ reel, row, sym });
        f.meter[sym] = Math.min(METER.size, f.meter[sym] + 1);
      }
    return { side, counted, meter: { ...f.meter }, action: null, damage: 0, blocked: false };
  }

  /** Is this meter full? */
  full(side: Side, m: MSym): boolean {
    return this[side].meter[m] >= METER.size;
  }

  /** Your spin: the meters fill. Then you may act (one full meter) or pass. */
  spin(): TurnLog {
    if (this.phase !== 'spin') throw new Error(`spin in phase ${this.phase}`);
    const log = this.spinAndFill('you');
    this.phase = 'act';
    return log;
  }

  /** Use a full meter: fire the SWORD or raise the SHIELD (one a turn). Returns the action's log. */
  act(m: MSym): TurnLog | null {
    if (this.phase !== 'act' || !this.full('you', m)) return null;
    const log = this.use('you', m);
    this.phase = this.winner ? 'over' : 'enemy';
    return log;
  }

  /** End your turn without acting. */
  pass(): void {
    if (this.phase === 'act') this.phase = 'enemy';
  }

  private use(side: Side, m: MSym): TurnLog {
    const f = this[side];
    const other = this[side === 'you' ? 'enemy' : 'you'];
    f.meter[m] = 0;
    const log: TurnLog = { side, counted: [], meter: { ...f.meter }, action: m === 'sword' ? 'fire' : 'shield', damage: 0, blocked: false };
    if (m === 'shield') f.guard = true;
    else if (other.guard) log.blocked = true;
    else {
      log.damage = Math.min(other.hp, f.hit);
      other.hp -= log.damage;
      if (other.hp <= 0) this.winner = side;
    }
    log.meter = { ...f.meter };
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
