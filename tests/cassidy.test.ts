import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight, RAIN, highRollerMul } from '../src/core/fight';
import { charmOptions, createRun, fightConfig, RUN } from '../src/core/run';
import { CABINETS } from '../src/core/cabinets';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function cassidy(chips: number, mut?: (c: GameConfig) => void): Fight {
  const c = fightConfig(createRun(base, 1, 'midas'), base);
  c.enemy = { hp: 99999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.bonusSymbols = false;
  c.player.gilded = [];
  c.player.chipsHeld = chips;
  mut?.(c);
  return new Fight(c, 7);
}
const rainHit = (f: Fight) => {
  f.forceNext('player', ['goldbar', 'goldbar', 'goldbar']);
  const ev = f.step().events;
  return { rain: ofType(ev, 'makeItRain')[0], hit: ofType(ev, 'attack')[0]?.amount ?? 0, ev };
};

describe('CASH CASSIDY / THE BANKROLL', () => {
  it('names and the HIGH ROLLER multiplier', () => {
    expect(CABINETS.midas.hero).toBe('CASH CASSIDY');
    expect(CABINETS.midas.name).toBe('BANKROLL');
    expect(highRollerMul(10)).toBe(1.5);
    expect(highRollerMul(100)).toBe(3);
  });

  it('MAKE IT RAIN!: a chip jackpot with 5+ chips hits for chips x2 (x the jackpot), counted before it costs 5', () => {
    const f = cassidy(20);
    const { rain, hit } = rainHit(f);
    expect(rain).toBeDefined();
    expect(rain.cost).toBe(RAIN.cost);
    // The 20 chips held when it lands (its own chips come after): base 20 x RAIN.perChip, x3 for the jackpot.
    expect(hit).toBe(20 * RAIN.perChip * 3);
    // A chip jackpot pays 3 - RAIN.chipLess chips.
    expect(f.chipsNow()).toBe(20 + 3 - RAIN.chipLess - RAIN.cost);
  });

  it('under 5 chips a chip jackpot is a plain hit (chips are his weapon) and pays its chips', () => {
    const f = cassidy(4);
    const { rain, hit } = rainHit(f);
    expect(rain).toBeUndefined();
    expect(hit).toBeGreaterThan(0);
    expect(f.chipsNow()).toBe(4 + 3 - RAIN.chipLess);
  });

  it('a full HIGH ROLLER bar multiplies the rain (no cap)', () => {
    const plain = rainHit(cassidy(40)).hit;
    const f = cassidy(40);
    f.sides.player.energy = f.meterCost;
    f.sides.player.armed = true;
    expect(rainHit(f).hit).toBeGreaterThan(plain * 2);
  });

  it('relics: RAINMAKER costs 2; LOOSE CHANGE rains on a pair; TIP JAR heals; gold fits chips without LOADED CHIPS (retired)', () => {
    const r = cassidy(20, (c) => (c.relics = ['rainmaker']));
    rainHit(r);
    expect(r.chipsNow()).toBe(20 + 3 - RAIN.chipLess - RAIN.rainmakerCost);
    const l = cassidy(20, (c) => (c.relics = ['loosechange']));
    l.forceNext('player', ['goldbar', 'goldbar', 'shield']);
    expect(ofType(l.step().events, 'makeItRain')).toHaveLength(1);
    const t = cassidy(20, (c) => (c.relics = ['tipjar']));
    t.sides.player.hp -= 100;
    expect(ofType(rainHit(t).ev, 'heal').some((h) => h.source === 'tipjar')).toBe(true);
    const run = createRun(base, 3, 'midas');
    expect(charmOptions(run, RUN.charmCells, ['gold']).some((o) => o.kind === 'gild' && o.symbol === 'goldbar')).toBe(true);
  });
});
