import { describe, expect, it } from 'vitest';
import { defaultConfig, type RelicId } from '../src/core/config';
import { ENCOUNTERS, SLOT } from '../src/core/encounters';
import { Rng } from '../src/core/rng';
import { createRun } from '../src/core/run';

const base = defaultConfig();
const slot = ENCOUNTERS.slot;
const ctx = (ups: string[] = []) => ({ relics: ['clover', 'battery', 'fang'] as RelicId[], upgrade: () => (ups.push('LEVEL'), 'LEVEL') });

describe('THE PRIZE SLOT', () => {
  it('offers LOW (chips), MEDIUM (HP) and HIGH (a relic the house names) buy-ins, then WALK AWAY', () => {
    const run = createRun(base, 3, 'knight');
    run.player.relics = ['drum', 'chainmail'];
    const c = slot.choices(run, new Rng(9));
    expect(c.map((x) => x.label)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'WALK AWAY']);
    expect(c[0].stake).toBe(`${SLOT.low.chips} CHIPS`);
    expect(c[2].relic && run.player.relics.includes(c[2].relic)).toBe(true);
    // No relic to stake: HIGH is off.
    run.player.relics = [];
    expect(slot.choices(run, new Rng(9))[2].disabled).toBe(true);
  });

  it('a buy-in takes its stake and plays its pulls; HIGH takes the very relic its card named', () => {
    const run = createRun(base, 4, 'knight');
    run.player.chips = 20;
    const low = slot.play(run, 0, new Rng(1), ctx());
    expect(low.pulls).toHaveLength(SLOT.low.pulls);
    run.player.relics = ['drum', 'chainmail', 'belt'];
    const named = slot.choices(run, new Rng(5))[2].relic;
    const high = slot.play(run, 2, new Rng(5), { ...ctx(), relics: [] });
    expect(high.pulls).toHaveLength(SLOT.high.pulls);
    expect(run.player.relics).not.toContain(named);
  });

  it('is seeded: the same stop plays out the same way', () => {
    const play = () => {
      const run = createRun(base, 6, 'knight');
      run.player.chips = 20;
      return [slot.play(run, 0, new Rng(77), ctx()), run.player.chips];
    };
    expect(play()).toEqual(play());
  });

  it('pays mostly chips, and roughly what a buy-in costs (a first pass: tune with the new sim)', () => {
    let chips = 0;
    let other = 0;
    let paid = 0;
    let pulls = 0;
    for (let i = 0; i < 1500; i++) {
      const run = createRun(base, i + 1, 'knight');
      run.player.chips = 40;
      run.player.hp = Math.round(run.player.maxHp / 2);
      const ups: string[] = [];
      const c0 = run.player.chips;
      const r0 = run.player.relics.length;
      const res = slot.play(run, 0, new Rng(i * 13 + 1), ctx(ups));
      pulls += res.pulls!.length;
      paid += res.pulls!.filter((p) => p.wins.length).length;
      chips += run.player.chips - c0 + SLOT.low.chips;
      other += (ups.length + run.player.relics.length - r0) * 12;
    }
    const share = chips / (chips + other);
    expect(share).toBeGreaterThan(0.7);
    expect(share).toBeLessThan(0.9);
    const back = (chips + other) / 1500 / SLOT.low.chips;
    expect(back).toBeGreaterThan(0.85);
    expect(back).toBeLessThan(1.15);
    // Most pulls pay something (every CHIP on the line does): a pull is rarely dead air.
    expect(paid / pulls).toBeGreaterThan(0.75);
  });
});
