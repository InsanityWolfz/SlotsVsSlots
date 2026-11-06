import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { applyPlay, dealPlays, PLAYS } from '../src/core/plays';
import { Rng } from '../src/core/rng';

/** SPIN CHOICES (experiment build): reels land, a play resolves on them, then the spin pays. */
const fight = () => {
  const c = defaultConfig();
  c.player.strips = reels3({ sword: 6, shield: 6 });
  c.enemy = { hp: 99999, strips: reels3({ shield: 12 }) };
  return new Fight(c, 3);
};
const playerSpin = (f: Fight) => f.step().events.find((e) => e.type === 'spin' && e.side === 'player');

describe('SPIN CHOICES', () => {
  it('the spin pays where the reels landed', () => {
    const f = fight();
    const landed = f.land()!;
    const spin = playerSpin(f);
    expect(spin?.type === 'spin' && spin.stops).toEqual(landed.orig);
  });
  it('a nudge moves one reel one cell before the spin pays', () => {
    const f = fight();
    const landed = f.land()!;
    applyPlay(f, { id: 'nudge', reel: 2, dir: -1 });
    const len = f.sides.player.reels[2].cells.length;
    const spin = playerSpin(f);
    expect(spin?.type === 'spin' && spin.stops[2]).toBe((landed.orig[2] - 1 + len) % len);
    expect(spin?.type === 'spin' && spin.held).toEqual([true, true, false]);
  });
  it('LET IT RIDE pays nothing now; DOUBLE DOWN doubles the enemy\'s next hits too', () => {
    const f = fight();
    f.land();
    applyPlay(f, { id: 'ride' });
    const spin = playerSpin(f);
    expect(spin?.type === 'spin' && spin.score.groups.every((g) => g.amount === 0)).toBe(true);
    expect(f.carry.player).toBe(PLAYS.ride);
    f.step();
    f.land();
    applyPlay(f, { id: 'double' });
    f.step();
    expect(f.carry.enemy).toBe(PLAYS.double);
    expect(f.carry.player).toBe(1);
  });
  it('deals different kinds, each able to do something', () => {
    const f = fight();
    f.land();
    const deal = dealPlays(f, new Rng(1));
    expect(deal).toHaveLength(PLAYS.perSpin);
    expect(new Set(deal.map((p) => p.id)).size).toBe(deal.length);
    expect(deal.some((p) => p.id === 'clean')).toBe(false);
  });
});
