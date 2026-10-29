import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { Fight } from '../src/core/fight';

const fight = (holds: number) => {
  const c = defaultConfig();
  c.player.strips = reels3({ sword: 4, shield: 4, bolt: 4 });
  c.player.holds = holds;
  c.enemy = { hp: 99999, strips: reels3({ shield: 12 }) };
  return new Fight(c, 7);
};

describe('HOLD (experiment, 2026-10-15)', () => {
  it('a held reel keeps its stop for your next spin; the HOLD is spent', () => {
    const f = fight(2);
    f.step();
    const before = f.sides.player.reels.map((r) => r.stop);
    f.step();
    expect(f.next).toBe('player');
    expect(f.hold(0)).toBe(true);
    expect(f.hold(1)).toBe(true);
    const spin = f.step().events.find((e) => e.type === 'spin' && e.side === 'player');
    expect(spin && spin.type === 'spin' ? spin.held : undefined).toEqual([true, true, false]);
    expect(f.sides.player.reels[0].stop).toBe(before[0]);
    expect(f.sides.player.reels[1].stop).toBe(before[1]);
    expect(f.holdsLeft).toBe(0);
    expect(f.held).toEqual([false, false, false]);
  });
  it('no more holds than you have, only before your own spin, and a second tap lets go', () => {
    const f = fight(1);
    expect(f.hold(0)).toBe(true);
    expect(f.hold(1)).toBe(false);
    expect(f.hold(0)).toBe(false);
    expect(f.hold(1)).toBe(true);
    f.step();
    expect(f.next).toBe('enemy');
    expect(f.hold(2)).toBe(false);
    expect(fight(0).hold(0)).toBe(false);
  });
});

describe('HOLD in the live game (user, 2026-10-29)', () => {
  it('every run fight has two HOLDs, and the sim bot uses them', async () => {
    const { playRun } = await import('../src/sim/play');
    let held = 0;
    let spins = 0;
    for (const seed of [1, 2, 3])
      playRun(defaultConfig(), seed, 'knight', 0, {
        onEvents: (events) => {
          for (const e of events) {
            if (e.type !== 'spin' || e.side !== 'player') continue;
            spins++;
            if (e.held?.some(Boolean)) held++;
          }
        },
      });
    expect(spins).toBeGreaterThan(0);
    expect(held).toBeGreaterThan(0);
  });
});
