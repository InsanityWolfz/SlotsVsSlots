import { describe, expect, it } from 'vitest';
import { addSeg, Duel, METER, power, symAt, type MSym, type Seg } from '../src/meter/duel';

/** A duel whose next spin for `side` lands exactly these rows (top, payline, bottom: three symbols each). */
function rigged(rows: MSym[][], seed = 1): Duel {
  const d = new Duel(seed);
  const f = d.you;
  f.reels = [0, 1, 2].map((r) => [rows[0][r], rows[1][r], rows[2][r]]);
  // Every stop lands the same 3-cell strip: row 0 is index stop-1, the payline is stop.
  (d as unknown as { rng: { int: () => number } }).rng.int = () => 1;
  return d;
}

describe('the meters prototype', () => {
  it('every sword and shield in sight fills its meter; COIN fills nothing', () => {
    const d = rigged([
      ['sword', 'coin', 'shield'],
      ['coin', 'sword', 'shield'],
      ['sword', 'sword', 'coin'],
    ]);
    const log = d.spin();
    expect(log.line).toBeNull();
    expect(d.you.sword).toEqual([1, 1, 1, 1]);
    expect(d.you.shield).toBe(2);
    expect(log.fills.every((f) => symAt(d.you, f.reel, f.row) === f.meter)).toBe(true);
  });

  it('a payline sword PAIR fills gold, a JACKPOT red-hot; off-line swords stay orange', () => {
    const pair = rigged([
      ['sword', 'coin', 'coin'],
      ['sword', 'sword', 'coin'],
      ['coin', 'coin', 'coin'],
    ]);
    expect(pair.spin().line).toEqual({ tier: 'pair', sym: 'sword' });
    expect(pair.you.sword).toEqual([2, 2, 1]);
    const jack = rigged([
      ['coin', 'coin', 'coin'],
      ['sword', 'sword', 'sword'],
      ['coin', 'coin', 'coin'],
    ]);
    expect(jack.spin().line).toEqual({ tier: 'jackpot', sym: 'sword' });
    expect(jack.you.sword).toEqual([3, 3, 3]);
  });

  it('a payline shield PAIR fills 5, a JACKPOT fills the meter', () => {
    const pair = rigged([
      ['coin', 'coin', 'coin'],
      ['shield', 'shield', 'coin'],
      ['coin', 'coin', 'coin'],
    ]);
    pair.spin();
    expect(pair.you.shield).toBe(METER.shieldPair);
    const jack = rigged([
      ['coin', 'coin', 'coin'],
      ['shield', 'shield', 'shield'],
      ['coin', 'coin', 'coin'],
    ]);
    jack.spin();
    expect(jack.you.shield).toBe(METER.size);
  });

  it('a full sword meter upgrades: a better segment replaces the weakest', () => {
    const m: Seg[] = Array(METER.size).fill(1);
    expect(addSeg(m, 1)).toBe(false);
    expect(addSeg(m, 3)).toBe(true);
    expect(m[0]).toBe(3);
    expect(m.filter((s) => s === 1)).toHaveLength(METER.size - 1);
  });

  it('FIRE hits for the segments times your hit, and empties; one action a turn', () => {
    const d = new Duel(2);
    d.spin();
    d.you.sword = [3, 3, 2, 2, 1, 1, 1, 1, 1, 1];
    d.you.shield = METER.size;
    expect(power(d.you)).toBe(16 * METER.you.hit);
    const log = d.act('sword')!;
    expect(log.damage).toBe(16 * METER.you.hit);
    expect(d.enemy.hp).toBe(METER.slime.hp - 16 * METER.you.hit);
    expect(d.you.sword).toEqual([]);
    expect(d.act('shield')).toBeNull();
  });

  it("a raised SHIELD negates the enemy's attack on its next turn, then drops", () => {
    const d = new Duel(3);
    d.spin();
    d.you.shield = METER.size;
    d.act('shield');
    d.enemy.sword = Array(METER.size).fill(1);
    const logs = d.enemyTurn();
    expect(logs.at(-1)).toMatchObject({ action: 'fire', blocked: true, damage: 0 });
    expect(d.you.hp).toBe(METER.you.hp);
    expect(d.you.guard).toBe(false);
  });

  it('the enemy shield blocks your next fire', () => {
    const d = new Duel(4);
    d.spin();
    d.pass();
    d.enemy.shield = METER.size;
    d.enemy.reels = d.enemy.reels.map((r) => r.map(() => 'coin' as const));
    d.enemyTurn();
    expect(d.enemy.guard).toBe(true);
    d.spin();
    d.you.sword = Array(METER.size).fill(1);
    expect(d.act('sword')).toMatchObject({ blocked: true, damage: 0 });
    expect(d.enemy.hp).toBe(METER.slime.hp);
  });
});
