import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight, MIDAS, RAIN, highRollerMul } from '../src/core/fight';
import { CABINET_ORDER, canPick, OUT_OF_ORDER_LINE } from '../src/core/cabinets';
import { createRun, RUN } from '../src/core/run';
import { charmOptions } from '../src/core/draft';
import { fightConfig } from '../src/core/fightSetup';
import { CABINETS } from '../src/core/cabinets';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function cassidy(chips: number, mut?: (c: GameConfig) => void): Fight {
  const c = fightConfig(createRun(base, 1, 'midas'), base);
  c.enemy = { hp: 99999, strips: reels3({ sword: 6, shield: 6 }) };
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

describe('BANKROLL is OUT OF ORDER (user, 2026-11-17)', () => {
  it('a new run cannot start on it, unlocked or not; the others still can', () => {
    const all = new Set(CABINET_ORDER);
    expect(canPick('midas', all)).toBe(false);
    for (const id of CABINET_ORDER.filter((c) => c !== 'midas')) expect(canPick(id, all)).toBe(true);
    expect(canPick('tesla', new Set(['knight']))).toBe(false);
    expect(OUT_OF_ORDER_LINE).toBe('THIS SLOT MACHINE IS OUT OF ORDER FOR NOW.');
  });
});

describe('CASH CASSIDY / THE BANKROLL', () => {
  it('names and the HIGH ROLLER multiplier', () => {
    expect(CABINETS.midas.hero).toBe('CASH CASSIDY');
    expect(CABINETS.midas.name).toBe('BANKROLL');
    // 1 + chips / 30 in quarter steps (2026-11-16; was / 20).
    expect(highRollerMul(15)).toBe(1.5);
    expect(highRollerMul(45)).toBe(2.5);
    expect(highRollerMul(100)).toBe(MIDAS.maxMul);
  });

  it('MAKE IT RAIN!: a chip jackpot with 10+ chips hits for chips x RAIN.perChip (x the jackpot), counted before it costs 10', () => {
    const f = cassidy(40);
    const { rain, hit } = rainHit(f);
    expect(rain).toBeDefined();
    expect(rain.cost).toBe(RAIN.cost);
    expect(rain.free).toBe(false);
    // The 40 chips held when it lands (its own chips come after): base 40 x RAIN.perChip, x3 for the jackpot.
    expect(hit).toBe(40 * RAIN.perChip * 3);
    // A chip jackpot pays 3 - RAIN.chipLess chips.
    expect(f.chipsNow()).toBe(40 + 3 - RAIN.chipLess - RAIN.cost);
  });

  it('THE HOUSE PAYS (QA call 6): a rain no harder than the chip jackpot it replaces costs nothing', () => {
    // 20 chips x 1.5 = 30, the plain chip jackpot's own base: the rain only hits the floor.
    const f = cassidy(20);
    const { rain, hit } = rainHit(f);
    expect(rain.free).toBe(true);
    expect(rain.cost).toBe(0);
    expect(hit).toBe(20 * RAIN.perChip * 3);
    expect(f.chipsNow()).toBe(20 + 3 - RAIN.chipLess);
    // RAINMAKER saved nothing: no pop.
    const r = cassidy(20, (c) => (c.relics = ['rainmaker']));
    const ev = rainHit(r).ev;
    expect(ev.some((e) => e.type === 'relic' && e.relic === 'rainmaker')).toBe(false);
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

  it('relics: RAINMAKER costs 2; gold fits chips without LOADED CHIPS (retired)', () => {
    const r = cassidy(40, (c) => (c.relics = ['rainmaker']));
    rainHit(r);
    expect(r.chipsNow()).toBe(40 + 3 - RAIN.chipLess - RAIN.rainmakerCost);
    const run = createRun(base, 3, 'midas');
    expect(charmOptions(run, RUN.charmCells, ['gold']).some((o) => o.kind === 'gild' && o.symbol === 'goldbar')).toBe(true);
  });
});
