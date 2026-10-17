import { describe, expect, it } from 'vitest';
import { addSeg, Duel, METER, worth, type MSym, type Seg } from '../src/meter/duel';

/** Set a side's reels so its next spin lands exactly these rows (top, middle, bottom: three symbols each). */
function rig(d: Duel, side: 'you' | 'enemy', rows: MSym[][]): void {
  d[side].reels = [0, 1, 2].map((r) => [rows[0][r], rows[1][r], rows[2][r]]);
  (d as unknown as { rng: { int: () => number } }).rng.int = () => 1;
}
const full = (s: Seg = 1): Seg[] => Array(METER.size).fill(s);

describe('the meters prototype', () => {
  it('every symbol in sight fills its meter (off a line: plain segments)', () => {
    const d = new Duel(1);
    rig(d, 'you', [
      ['sword', 'coin', 'shield'],
      ['heart', 'sword', 'shield'],
      ['coin', 'heart', 'sword'],
    ]);
    const log = d.spin();
    expect(log.lines).toEqual([]);
    expect(d.you.meters.sword).toEqual([1, 1, 1]);
    expect(d.you.meters.shield).toEqual([1, 1]);
    expect(d.you.meters.heart).toEqual([1, 1]);
    expect(d.you.meters.coin).toEqual([1, 1]);
  });

  it('three paylines: a pair on any row fills gold, three red-hot (QUALITY meters)', () => {
    const d = new Duel(2);
    rig(d, 'you', [
      ['sword', 'sword', 'coin'],
      ['heart', 'heart', 'heart'],
      ['coin', 'shield', 'sword'],
    ]);
    const log = d.spin();
    expect(log.lines).toEqual([
      { row: 0, tier: 'pair', sym: 'sword' },
      { row: 1, tier: 'jackpot', sym: 'heart' },
    ]);
    expect(d.you.meters.sword).toEqual([2, 2, 1]);
    expect(d.you.meters.heart).toEqual([3, 3, 3]);
  });

  it('a SHIELD line pair fills 5, a jackpot all of it (FAST meters)', () => {
    const d = new Duel(3);
    rig(d, 'you', [
      ['coin', 'heart', 'coin'],
      ['shield', 'shield', 'heart'],
      ['heart', 'coin', 'heart'],
    ]);
    d.spin();
    expect(d.you.meters.shield).toHaveLength(METER.pairFill);
  });

  it('a full meter upgrades: a better segment replaces the weakest', () => {
    const m = full();
    expect(addSeg(m, 1)).toBe(false);
    expect(addSeg(m, 3)).toBe(true);
    expect(m[0]).toBe(3);
  });

  it('a full COIN meter cashes out on its own', () => {
    const d = new Duel(4);
    d.you.meters.coin = [...Array(METER.size - 1).fill(1), 1] as Seg[];
    d.you.meters.coin.pop();
    rig(d, 'you', [
      ['coin', 'heart', 'shield'],
      ['heart', 'sword', 'shield'],
      ['sword', 'heart', 'sword'],
    ]);
    const log = d.spin();
    expect(log.cashed).toBe(METER.size * METER.you.coin);
    expect(d.you.coins).toBe(log.cashed);
    expect(d.you.meters.coin).toEqual([]);
  });

  it('FIRE hits for its total, HEAL heals for its total (only when hurt), one action a turn', () => {
    const d = new Duel(5);
    d.spin();
    d.you.meters.sword = [3, 3, 2, 2, 1, 1, 1, 1, 1, 1];
    d.you.meters.heart = full();
    expect(d.canAct('you', 'heart')).toBe(false); // full HP
    const log = d.act('sword')!;
    expect(log.damage).toBe(16 * METER.you.hit);
    expect(d.act('heart')).toBeNull();
    d.phase = 'act';
    d.you.hp = 50;
    const h = d.act('heart')!;
    expect(h.healed).toBe(worth({ ...d.you, meters: { ...d.you.meters, heart: full() } }, 'heart'));
  });

  it("a raised SHIELD negates the slime's next attack", () => {
    const d = new Duel(6);
    d.spin();
    d.you.meters.shield = full();
    d.act('shield');
    d.enemy.meters.sword = full();
    const logs = d.enemyTurn();
    expect(logs.at(-1)).toMatchObject({ action: 'sword', blocked: true, damage: 0 });
    expect(d.you.hp).toBe(METER.you.hp);
  });

  it('a full SLIME meter gunks your SWORD meter to 5 bars (the best stay) until you fire', () => {
    const d = new Duel(7);
    d.spin();
    d.pass();
    d.you.meters.sword = [3, 2, 2, 1, 1, 1, 1];
    d.enemy.meters.slime = full();
    d.enemy.meters.slime.pop();
    rig(d, 'enemy', [
      ['slime', 'heart', 'shield'],
      ['heart', 'sword', 'shield'],
      ['sword', 'heart', 'sword'],
    ]);
    const logs = d.enemyTurn();
    expect(logs[0].gunked).toBe(true);
    expect(d.you.swordCap).toBe(METER.gunkCap);
    expect(d.you.meters.sword).toEqual([3, 2, 2, 1, 1]);
    expect(d.full('you', 'sword')).toBe(true);
    expect(d.enemy.meters.slime).toEqual([]);
    // A weak fire: 5 bars; then the meter is back to full size.
    d.spin();
    d.you.meters.sword = [3, 2, 2, 1, 1];
    expect(d.act('sword')!.power).toBe(9 * METER.you.hit);
    expect(d.you.swordCap).toBe(METER.size);
  });

  it('the slime fires, else blocks, else heals (when hurt)', () => {
    const d = new Duel(8);
    d.spin();
    d.pass();
    d.enemy.meters.shield = full();
    d.enemy.meters.heart = full();
    d.enemy.hp = 100;
    const logs = d.enemyTurn();
    expect(logs.at(-1)!.action).toBe('shield');
  });
});
