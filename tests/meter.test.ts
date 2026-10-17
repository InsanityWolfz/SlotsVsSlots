import { describe, expect, it } from 'vitest';
import { Duel, METER, symAt } from '../src/meter/duel';

describe('the meters prototype', () => {
  it('every sword and shield in sight (all 9 cells) fills its meter, capped at full', () => {
    const d = new Duel(1);
    const log = d.spin();
    expect(log.counted).toHaveLength(9);
    const swords = log.counted.filter((c) => c.sym === 'sword').length;
    expect(d.you.meter.sword).toBe(Math.min(METER.size, swords));
    expect(d.you.meter.shield).toBe(Math.min(METER.size, 9 - swords));
    expect(log.counted.every((c) => c.sym === symAt(d.you, c.reel, c.row))).toBe(true);
  });

  it('a full SWORD fires for your hit and empties; only a full meter can be used, once a turn', () => {
    const d = new Duel(2);
    d.spin();
    d.you.meter = { sword: METER.size, shield: METER.size };
    const log = d.act('sword')!;
    expect(log.damage).toBe(METER.you.hit);
    expect(d.enemy.hp).toBe(METER.slime.hp - METER.you.hit);
    expect(d.you.meter.sword).toBe(0);
    expect(d.act('shield')).toBeNull(); // one a turn
    expect(d.phase).toBe('enemy');
  });

  it("a raised SHIELD negates the enemy's attack on its next turn, then drops", () => {
    const d = new Duel(3);
    d.spin();
    d.you.meter.shield = METER.size;
    d.act('shield');
    d.enemy.meter.sword = METER.size; // it will fire
    const logs = d.enemyTurn();
    expect(logs[1]).toMatchObject({ action: 'fire', blocked: true, damage: 0 });
    expect(d.you.hp).toBe(METER.you.hp);
    expect(d.you.guard).toBe(false);
  });

  it('the enemy fires a full sword at once; its shield blocks your next fire', () => {
    const d = new Duel(4);
    d.spin();
    d.pass();
    d.enemy.meter = { sword: 0, shield: METER.size };
    d.enemy.reels = d.enemy.reels.map((r) => r.map(() => 'shield' as const)); // its spin adds no swords
    d.enemyTurn();
    expect(d.enemy.guard).toBe(true);
    d.spin();
    d.you.meter.sword = METER.size;
    expect(d.act('sword')).toMatchObject({ blocked: true, damage: 0 });
    expect(d.enemy.hp).toBe(METER.slime.hp);
  });

  it('two fires kill the slime (180 HP, 100 a hit)', () => {
    const d = new Duel(5);
    for (let i = 0; i < 2; i++) {
      d.phase = 'act';
      d.enemy.guard = false;
      d.you.meter.sword = METER.size;
      d.act('sword');
      if (!d.winner) d.phase = 'act';
    }
    expect(d.winner).toBe('you');
    expect(d.phase).toBe('over');
  });
});
