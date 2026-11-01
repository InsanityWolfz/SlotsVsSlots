import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { BUILD_UP, Fight } from '../src/core/fight';
import type { LineScore } from '../src/core/scoring';

/** BUILD-UP (test branch, 2026-11-01): each spin with no pair or jackpot adds +25% to your next pair or jackpot, up to x2. */
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) => events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
function fight(relics: RelicId[] = [], mut?: (c: GameConfig) => void): Fight {
  const c = defaultConfig();
  c.seed = 7;
  c.relics = relics;
  c.player.strips = reels3({ sword: 4, shield: 4, empty: 4 });
  c.enemy = { hp: 1e6, strips: reels3({ empty: 12 }) };
  mut?.(c);
  return new Fight(c, 7);
}
const DEAD: SymbolId[] = ['empty', 'empty', 'empty'];
const SINGLE: SymbolId[] = ['sword', 'empty', 'empty'];
const PAIR: SymbolId[] = ['sword', 'sword', 'empty'];
/** Your spin with this line, then the enemy's (blank) spin. */
function spin(f: Fight, line: SymbolId[]): { score: LineScore; events: CombatEvent[] } {
  f.forceNext('player', line);
  const r = f.step();
  f.step();
  const sp = r.events.find((e): e is Extract<CombatEvent, { type: 'spin' }> => e.type === 'spin')!;
  return { score: sp.score, events: r.events };
}
const swordPay = (s: LineScore) => s.groups.find((g) => g.symbol === 'sword')!.amount;
const plainPair = () => swordPay(spin(fight(), PAIR).score);

afterEach(() => {
  BUILD_UP.on = 1;
});

describe('BUILD-UP', () => {
  it('each spin with no pair adds +25% to the next pair (dead or singles alike)', () => {
    for (const [dead, mul] of [[1, 1.25], [2, 1.5], [4, 2]] as const) {
      const f = fight();
      for (let i = 0; i < dead; i++) spin(f, DEAD);
      expect(f.buildUpMul()).toBe(mul);
      expect(swordPay(spin(f, PAIR).score)).toBe(Math.round(plainPair() * mul));
    }
  });

  it('caps at x2', () => {
    const f = fight();
    for (let i = 0; i < 7; i++) spin(f, DEAD);
    expect(f.buildUpMul()).toBe(BUILD_UP.cap);
  });

  it('singles grow it too, and are not multiplied by it (only pairs and jackpots cash it)', () => {
    const f = fight();
    spin(f, DEAD);
    const lone = swordPay(spin(fight(), SINGLE).score);
    expect(swordPay(spin(f, SINGLE).score)).toBe(lone);
    expect(f.buildUp).toBe(2);
  });

  it('the pair cashes it in: it shows on the climb and the meter empties', () => {
    const f = fight();
    spin(f, DEAD);
    spin(f, DEAD);
    const { score, events } = spin(f, PAIR);
    expect(score.groups.find((g) => g.symbol === 'sword')!.notes).toContain('X1.5 BUILD-UP');
    expect(f.buildUp).toBe(0);
    expect(ofType(events, 'buildUp').at(-1)).toMatchObject({ cashed: true, mul: 1 });
  });

  it('a dead spin tells the screen the new multiplier', () => {
    const f = fight();
    const { events } = spin(f, DEAD);
    expect(ofType(events, 'buildUp')).toEqual([{ type: 'buildUp', side: 'player', mul: 1.25, stacks: 1 }]);
  });

  it('only your spins build it, and a new fight starts at x1', () => {
    const f = fight();
    f.next = 'enemy';
    f.step();
    expect(f.buildUp).toBe(0);
  });

  it('off (the A/B switch), nothing changes', () => {
    BUILD_UP.on = 0;
    const f = fight();
    spin(f, DEAD);
    spin(f, DEAD);
    expect(f.buildUp).toBe(0);
    expect(swordPay(spin(f, PAIR).score)).toBe(plainPair());
  });

  it('DRY SPELL: +50% a spin, up to x4', () => {
    const f = fight(['dryspell']);
    spin(f, SINGLE);
    expect(f.buildUpMul()).toBe(1.5);
    for (let i = 0; i < 8; i++) spin(f, SINGLE);
    expect(f.buildUpMul()).toBe(BUILD_UP.dryCap);
  });
});
