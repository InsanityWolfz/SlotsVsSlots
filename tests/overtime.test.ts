import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { OVERTIME, overtimeMul } from '../src/core/enemies';
import { createRun, fightConfig } from '../src/core/run';

/** A sword jackpot every spin against a wall: the pays only change with the clock. */
const fight = (overtime: boolean, act = 1) => {
  const c = defaultConfig();
  c.player = { hp: 9_999_999, strips: reels3({ sword: 12 }) };
  c.enemy = { hp: 9_999_999, strips: reels3({ sword: 12 }), act };
  c.overtime = overtime;
  return new Fight(c, 7);
};

/** Each round's pay, yours and the enemy's (a round is your spin and the enemy's). */
function pays(f: Fight, rounds: number): { mine: number[]; theirs: number[]; banners: number } {
  const mine: number[] = [];
  const theirs: number[] = [];
  let banners = 0;
  while (f.turn < rounds * 2 && !f.over) {
    for (const e of f.step().events) {
      if (e.type === 'overtime') banners++;
      if (e.type === 'spin') (e.side === 'player' ? mine : theirs).push(e.score.groups.reduce((a, g) => a + g.amount, 0));
    }
  }
  return { mine, theirs, banners };
}

describe('OVERTIME (TEST)', () => {
  it('starts at its round and grows by its step each round', () => {
    const from = OVERTIME.from;
    expect(overtimeMul(2 * from - 2)).toBe(1);
    expect(overtimeMul(2 * from - 1)).toBe(1 + OVERTIME.step);
    expect(overtimeMul(2 * from)).toBe(1 + OVERTIME.step);
    expect(overtimeMul(2 * from + 2)).toBe(1 + 2 * OVERTIME.step);
  });

  it('multiplies both machines\' hits from its round on, and is announced once', () => {
    const { mine, theirs, banners } = pays(fight(true), OVERTIME.from + 2);
    const at = (xs: number[], round: number) => xs[round - 1];
    expect(at(mine, OVERTIME.from - 1)).toBe(at(mine, 1));
    expect(at(mine, OVERTIME.from) / at(mine, 1)).toBeCloseTo(1 + OVERTIME.step, 1);
    expect(at(mine, OVERTIME.from + 2) / at(mine, 1)).toBeCloseTo(1 + 3 * OVERTIME.step, 1);
    expect(at(theirs, OVERTIME.from) / at(theirs, 1)).toBeCloseTo(1 + OVERTIME.step, 1);
    expect(banners).toBe(1);
  });

  it('never grows shields', () => {
    const c = defaultConfig();
    c.player = { hp: 9_999_999, strips: reels3({ shield: 12 }) };
    c.enemy = { hp: 9_999_999, strips: reels3({ sword: 12 }), act: 1 };
    c.overtime = true;
    const { mine } = pays(new Fight(c, 7), OVERTIME.from + 2);
    expect(new Set(mine).size).toBe(1);
  });

  it('is off in a normal fight', () => {
    const { mine, banners } = pays(fight(false), OVERTIME.from + 2);
    expect(new Set(mine).size).toBe(1);
    expect(banners).toBe(0);
  });

  it('replaces act 3\'s enemy-only ramp', () => {
    const late = (overtime: boolean) => {
      const { theirs } = pays(fight(overtime, 3), OVERTIME.from - 1);
      return theirs[theirs.length - 1] / theirs[0];
    };
    expect(late(false)).toBeGreaterThan(1);
    expect(late(true)).toBe(1);
  });

  it('a run flagged OVERTIME puts the clock in every fight', () => {
    const run = createRun(defaultConfig(), 5, 'knight', 0);
    expect(fightConfig(run, defaultConfig()).overtime).toBeUndefined();
    run.overtime = true;
    expect(fightConfig(run, defaultConfig()).overtime).toBe(true);
  });
});
