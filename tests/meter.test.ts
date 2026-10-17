import { describe, expect, it } from 'vitest';
import { addSeg, Duel, METER, worth, type MSym, type Seg } from '../src/meter/duel';

/** Set a side's reels so its next spin lands exactly these rows (top, middle, bottom: three symbols each). */
function rig(d: Duel, side: 'you' | 'enemy', rows: MSym[][]): void {
  d[side].reels = [0, 1, 2].map((r) => [rows[0][r], rows[1][r], rows[2][r]]);
  (d as unknown as { rng: { int: () => number } }).rng.int = () => 1;
}
const full = (s: Seg = 1): Seg[] => Array(METER.size).fill(s);

describe('the meters prototype', () => {
  it('swords and shields in sight fill their meters; hearts heal and coins pay at once', () => {
    const d = new Duel(1);
    d.you.hp = 100;
    rig(d, 'you', [
      ['sword', 'coin', 'shield'],
      ['heart', 'sword', 'shield'],
      ['coin', 'heart', 'sword'],
    ]);
    const log = d.spin();
    expect(log.lines).toEqual([]);
    expect(d.you.meters.sword).toEqual([1, 1, 1]);
    expect(d.you.meters.shield).toEqual([1, 1]);
    expect(log.healed).toBe(2 * METER.you.heal);
    expect(d.you.hp).toBe(100 + 2 * METER.you.heal);
    expect(log.cashed).toBe(2 * METER.you.coin);
    expect(d.you.coins).toBe(2 * METER.you.coin);
  });

  it('three paylines: a sword pair fills gold, three red-hot; a heart jackpot heals 3x each', () => {
    const d = new Duel(2);
    d.you.hp = 50;
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
    expect(log.healed).toBe(9 * METER.you.heal);
  });

  it('hearts never heal past full HP', () => {
    const d = new Duel(3);
    rig(d, 'you', [
      ['heart', 'heart', 'heart'],
      ['heart', 'heart', 'heart'],
      ['heart', 'heart', 'heart'],
    ]);
    d.you.hp = d.you.maxHp - 7;
    expect(d.spin().healed).toBe(7);
    expect(d.you.hp).toBe(d.you.maxHp);
  });

  it('a SHIELD line pair fills 5, a jackpot all of it', () => {
    const d = new Duel(4);
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

  it('FIRE hits for its total; one action a turn', () => {
    const d = new Duel(5);
    d.spin();
    d.you.meters.sword = [3, 3, 2, 2, 1, 1, 1, 1, 1, 1];
    d.you.meters.shield = full();
    const log = d.act('sword')!;
    expect(log.damage).toBe(16 * METER.you.hit);
    expect(d.act('shield')).toBeNull();
    expect(worth(d.you, 'sword')).toBe(0);
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

  it('a SLIME line win gunks your SWORD meter to 5 bars (the best stay) until you fire', () => {
    const d = new Duel(7);
    d.spin();
    d.pass();
    d.you.meters.sword = [3, 2, 2, 1, 1, 1, 1];
    rig(d, 'enemy', [
      ['slime', 'slime', 'shield'],
      ['heart', 'sword', 'shield'],
      ['sword', 'heart', 'sword'],
    ]);
    const logs = d.enemyTurn();
    expect(logs[0].gunked).toBe(true);
    expect(d.you.swordCap).toBe(METER.gunkCap);
    expect(d.you.meters.sword).toEqual([3, 2, 2, 1, 1]);
    d.spin();
    d.you.meters.sword = [3, 2, 2, 1, 1];
    expect(d.act('sword')!.power).toBe(9 * METER.you.hit);
    expect(d.you.swordCap).toBe(METER.size);
  });

  it('slimes off a line do nothing', () => {
    const d = new Duel(8);
    d.spin();
    d.pass();
    rig(d, 'enemy', [
      ['slime', 'heart', 'shield'],
      ['heart', 'slime', 'shield'],
      ['sword', 'heart', 'slime'],
    ]);
    expect(d.enemyTurn()[0].gunked).toBe(false);
    expect(d.you.swordCap).toBe(METER.size);
  });

  it('the slime fires, else blocks', () => {
    const d = new Duel(9);
    d.spin();
    d.pass();
    d.enemy.meters.shield = full();
    rig(d, 'enemy', [
      ['heart', 'heart', 'coin' as MSym],
      ['heart', 'coin' as MSym, 'heart'],
      ['coin' as MSym, 'heart', 'heart'],
    ]);
    const logs = d.enemyTurn();
    expect(logs.at(-1)!.action).toBe('shield');
  });

  describe('TESLA: CHARGE and the CHAIN', () => {
    const tesla = (seed = 20) => new Duel(seed, 'tesla');

    it('bolts fill a 3-cell CHARGE: +1 each, +2 in a line pair, a jackpot fills it', () => {
      const d = tesla();
      rig(d, 'you', [
        ['bolt' as MSym, 'coin', 'shield'],
        ['heart', 'heart', 'shield'],
        ['coin', 'heart', 'coin'],
      ]);
      d.spin();
      expect(d.you.meters.bolt).toHaveLength(1);
      const p = tesla(21);
      rig(p, 'you', [
        ['bolt' as MSym, 'bolt' as MSym, 'shield'],
        ['heart', 'coin', 'shield'],
        ['coin', 'heart', 'coin'],
      ]);
      p.spin();
      expect(p.you.meters.bolt).toHaveLength(METER.charge);
    });

    it('fires with any charge for charge x hit x CHAIN; back-to-back fires step the chain to the cap', () => {
      const d = tesla();
      const fire = (charge: number) => {
        d.phase = 'act';
        d.enemy.guard = false;
        d.you.meters.bolt = Array(charge).fill(1);
        const log = d.act('sword')!;
        d.phase = 'act';
        return log;
      };
      expect(fire(1)).toMatchObject({ power: 1 * METER.tesla.hit * 1, chain: 1 });
      expect(fire(3)).toMatchObject({ power: 3 * METER.tesla.hit * 2, chain: 2 });
      fire(1);
      fire(1);
      expect(d.you.chain).toBe(METER.chainCap);
      fire(1);
      expect(d.you.chain).toBe(METER.chainCap);
    });

    it('a turn without a FIRE breaks the chain (BLOCK or end turn); a FIRE into a shield holds it', () => {
      const d = tesla();
      d.spin();
      d.you.chain = 3;
      d.you.meters.shield = full();
      d.act('shield');
      expect(d.you.chain).toBe(1);
      const e = tesla(22);
      e.spin();
      e.you.chain = 3;
      e.pass();
      expect(e.you.chain).toBe(1);
      const g = tesla(23);
      g.spin();
      g.you.chain = 3;
      g.enemy.guard = true;
      g.you.meters.bolt = [1];
      expect(g.act('sword')).toMatchObject({ blocked: true });
      expect(g.you.chain).toBe(3);
    });

    it("the slime's gunk shorts the coil: the chain drops to x1", () => {
      const d = tesla();
      d.spin();
      d.you.meters.bolt = [1];
      d.act('sword');
      d.you.chain = 3;
      rig(d, 'enemy', [
        ['slime', 'slime', 'shield'],
        ['heart', 'sword', 'shield'],
        ['sword', 'heart', 'sword'],
      ]);
      expect(d.enemyTurn()[0].gunked).toBe(true);
      expect(d.you.chain).toBe(1);
    });
  });
});
