import { describe, expect, it } from 'vitest';
import { defaultConfig, type GameConfig, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { isNearMiss, scoreLine } from '../src/core/scoring';
import { visibleCells } from '../src/core/strip';

const cfg = defaultConfig();
const totals = (line: SymbolId[], c: GameConfig = cfg) => scoreLine(line, c).totals;
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

describe('scoring (in-order)', () => {
  it('one of each = base values', () => {
    expect(totals(['sword', 'shield', 'bolt'])).toEqual({ sword: 10, shield: 10, bolt: 10 });
    expect(scoreLine(['sword', 'shield', 'bolt'], cfg).tier).toBe('none');
  });
  it('pair on reels 1+2 = (1+1)*2, plus the loose third', () => {
    const s = scoreLine(['sword', 'sword', 'shield'], cfg);
    expect(s.tier).toBe('pair');
    expect(s.totals).toEqual({ sword: 40, shield: 10 });
  });
  it('reels 2+3 matching is NOT a pair', () => {
    const s = scoreLine(['shield', 'sword', 'sword'], cfg);
    expect(s.tier).toBe('none');
    expect(s.totals).toEqual({ shield: 10, sword: 20 });
  });
  it('reels 1+3 matching is NOT a pair', () => {
    expect(scoreLine(['bolt', 'sword', 'bolt'], cfg).tier).toBe('none');
  });
  it('triple = (1+1+1)*3', () => {
    expect(totals(['bolt', 'bolt', 'bolt'])).toEqual({ bolt: 90 });
    expect(scoreLine(['sword', 'sword', 'sword'], cfg).tier).toBe('triple');
  });
  it('groups resolve left to right', () => {
    const s = scoreLine(['shield', 'bolt', 'sword'], cfg);
    expect(s.groups.map((g) => g.symbol)).toEqual(['shield', 'bolt', 'sword']);
  });
  it('slime breaks a combo', () => {
    expect(scoreLine(['sword', 'slime', 'sword'], cfg).tier).toBe('none');
  });
  it('anyTwo rule counts reels 2+3', () => {
    const c = { ...defaultConfig(), pairRule: 'anyTwo' as const };
    expect(scoreLine(['shield', 'sword', 'sword'], c).totals).toEqual({ shield: 10, sword: 40 });
  });
  it('near-miss = first two reels match', () => {
    expect(isNearMiss(['sword', 'sword', 'bolt'])).toBe(true);
    expect(isNearMiss(['sword', 'bolt', 'bolt'])).toBe(false);
  });
});

function fight(mut?: (c: GameConfig) => void): Fight {
  const c = defaultConfig();
  mut?.(c);
  return new Fight(c, 42);
}

describe('fight resolution', () => {
  it('player goes first, then alternates', () => {
    const f = fight();
    expect(f.step().side).toBe('player');
    expect(f.step().side).toBe('enemy');
    expect(f.step().side).toBe('player');
  });

  it('sword pair deals 40 damage', () => {
    const f = fight();
    f.forceNext('player', ['sword', 'sword', 'shield']);
    const { events } = f.step();
    const [atk] = ofType(events, 'attack');
    expect(atk.amount).toBe(40);
    expect(f.sides.enemy.hp).toBe(260);
    expect(f.sides.player.shield).toBe(10);
  });

  it('shield absorbs damage before HP', () => {
    const f = fight();
    f.forceNext('player', ['bolt', 'shield', 'bolt']);
    f.step(); // player: shield 1
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const [atk] = ofType(f.step().events, 'attack');
    expect(atk.blocked).toBe(10);
    expect(atk.hpDamage).toBe(80);
    expect(f.sides.player.hp).toBe(120);
  });

  it("each side's shield resets at the start of its own turn", () => {
    const f = fight();
    f.forceNext('player', ['shield', 'shield', 'shield']);
    f.step();
    expect(f.sides.player.shield).toBe(90);
    f.forceNext('enemy', ['shield', 'shield', 'bolt' as SymbolId]); // enemy has no bolt: falls back to random
    f.step();
    expect(f.sides.player.shield).toBeLessThanOrEqual(90); // survived through the enemy turn (maybe dented)
    const shieldBefore = f.sides.player.shield;
    const { events } = f.step(); // player's next turn wipes it first
    const [reset] = ofType(events, 'shieldReset');
    if (shieldBefore > 0) expect(reset.lost).toBe(shieldBefore);
  });

  it('enemy shield drops at the start of the enemy turn, after absorbing the player attack', () => {
    const f = fight();
    f.forceNext('player', ['bolt', 'bolt', 'shield']);
    f.step();
    f.forceNext('enemy', ['shield', 'shield', 'shield']);
    f.step();
    // Enemy shields are worth half (TUNE.enemyShield): a jackpot of them is 45.
    expect(f.sides.enemy.shield).toBe(45);
    f.forceNext('player', ['sword', 'sword', 'bolt']);
    const [atk] = ofType(f.step().events, 'attack');
    expect(atk.blocked).toBe(40);
    expect(f.sides.enemy.shield).toBe(5);
    const { events } = f.step();
    expect(ofType(events, 'shieldReset')[0]).toMatchObject({ side: 'enemy', lost: 5 });
  });

  it('bolt triple fires the special once and overflows 40 energy', () => {
    const f = fight();
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const { events } = f.step();
    const fires = ofType(events, 'specialFire');
    expect(fires).toHaveLength(1);
    expect(fires[0].amount).toBe(100);
    expect(f.sides.player.energy).toBe(40);
    expect(f.sides.enemy.hp).toBe(200);
  });

  it('special can fire multiple times from carried energy', () => {
    const f = fight((c) => (c.specialCost = 40));
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const fires = ofType(f.step().events, 'specialFire');
    expect(fires).toHaveLength(2);
    expect(f.sides.player.energy).toBe(10);
  });

  it('special ignores shield by default, respects it when toggled', () => {
    for (const ignore of [true, false]) {
      const f = fight((c) => (c.specialIgnoresShield = ignore));
      f.forceNext('player', ['shield', 'bolt', 'shield']);
      f.step();
      f.forceNext('enemy', ['shield', 'shield', 'sword']);
      f.step(); // enemy shield 20 (a double of half-value shields)
      f.forceNext('player', ['bolt', 'bolt', 'bolt']);
      const [fire] = ofType(f.step().events, 'specialFire');
      expect(fire.blocked).toBe(ignore ? 0 : 20);
    }
  });

  it('enemy slime pair slimes 4 distinct visible player cells, plus 1 for the loose slime', () => {
    const f = fight();
    f.step();
    f.forceNext('enemy', ['slime', 'slime', 'sword']);
    const [sl] = ofType(f.step().events, 'slime');
    expect(sl.cells).toHaveLength(4);
    const visible = visibleCells(f.sides.player.reels).map((c) => `${c.reel}:${c.index}`);
    const keys = sl.cells.map((c) => `${c.reel}:${c.index}`);
    expect(new Set(keys).size).toBe(4);
    for (const k of keys) expect(visible).toContain(k);
    for (const c of sl.cells) expect(f.sides.player.reels[c.reel].cells[c.index].slimed).toBe(true);
  });

  it('slime jackpot covers all 9 visible and cannot double-slime', () => {
    const f = fight();
    f.step();
    f.forceNext('enemy', ['slime', 'slime', 'slime']);
    const [sl] = ofType(f.step().events, 'slime');
    expect(sl.cells).toHaveLength(9);
    // Player lands the exact same stops again → nothing clean is visible.
    const stops = f.sides.player.reels.map((r) => r.stop);
    f.step();
    f.sides.player.reels.forEach((r, i) => (r.stop = stops[i]));
    f.forceNext('enemy', ['slime', 'sword', 'shield']);
    const [again] = ofType(f.step().events, 'slime');
    expect(again.cells).toHaveLength(0);
    expect(again.wasted).toBe(1);
  });

  it('slimed player symbols score as slime and fizzle', () => {
    const f = fight();
    f.sides.player.reels.forEach((r) => r.cells.forEach((c) => (c.slimed = c.symbol === 'sword')));
    f.forceNext('player', ['slime', 'bolt', 'shield']);
    const { events } = f.step();
    expect(ofType(events, 'fizzle')).toHaveLength(1);
    expect(ofType(events, 'attack')).toHaveLength(0);
  });

  it('player slime triple cleanses every slimed cell on every strip', () => {
    const f = fight();
    let slimedCount = 0;
    f.sides.player.reels.forEach((r) =>
      r.cells.forEach((c, i) => {
        c.slimed = i % 2 === 0;
        if (c.slimed) slimedCount++;
      }),
    );
    f.forceNext('player', ['slime', 'slime', 'slime']);
    const [cl] = ofType(f.step().events, 'cleanse');
    expect(cl.cells).toHaveLength(slimedCount);
    expect(f.sides.player.reels.every((r) => r.cells.every((c) => !c.slimed))).toBe(true);
  });

  it('death ends the fight and stops resolving', () => {
    const f = fight((c) => (c.enemy.hp = 30));
    f.forceNext('player', ['sword', 'sword', 'bolt']);
    const { events } = f.step();
    expect(f.winner).toBe('player');
    expect(events.at(-1)).toMatchObject({ type: 'fightEnd', winner: 'player' });
    expect(ofType(events, 'energyGain')).toHaveLength(0);
    expect(() => f.step()).toThrow();
  });

  it('same seed → same fight', () => {
    const run = () => {
      const f = new Fight(defaultConfig(), 777);
      const log: string[] = [];
      while (!f.over) log.push(JSON.stringify(f.step().events));
      return log.join('\n');
    };
    expect(run()).toBe(run());
  });
});
