import { describe, expect, it } from 'vitest';
import { climbSteps, noteStep } from '../src/present/director';
import type { ScoreGroup } from '../src/core/scoring';

const group = (over: Partial<ScoreGroup>): ScoreGroup => ({ symbol: 'sword', reels: [0, 1, 2], amount: 0, base: 39, mult: 3, matched: true, ...over });

describe('THE CLIMB (feel pass, 2026-10-15)', () => {
  it('reads the engine notes as steps', () => {
    expect(noteStep('X1.5 DRY')).toEqual({ f: 1.5, text: '×1.5 DRY' });
    expect(noteStep('HOT X2')).toEqual({ f: 2, text: '×2 HOT' });
    expect(noteStep('HIGH ROLLER X2.5')).toEqual({ f: 2.5, text: '×2.5 HIGH ROLLER' });
    expect(noteStep('VOL +32%')?.f).toBeCloseTo(1.32);
    expect(noteStep('X2')).toEqual({ f: 2, text: '×2' });
    for (const flat of ['DROP +3', 'ECHO', '-5 RAKE', 'HALF', 'CRUSADE +5', 'MAKE IT RAIN!']) expect(noteStep(flat)).toBeNull();
  });
  it('starts at the base, climbs, and always ends on the exact total', () => {
    const cases: Partial<ScoreGroup>[] = [
      { base: 39, mult: 3 },
      { base: 39, mult: 3 * 1.5 * 2, notes: ['X1.5 DRY', 'X2 GOLDEN'] },
      { base: 52, mult: 2 * 1.32, reels: [0, 1], notes: ['VOL +32%'] },
      // Notes that don't multiply out exactly (pooled lightning): still ends on the engine's total.
      { base: 40, mult: 4.1, notes: ['X1.5', 'X1.3'] },
      { base: 30, mult: 1, matched: false, reels: [2] },
    ];
    for (const c of cases) {
      const g = group(c);
      const steps = climbSteps(g, (g.reels.length >= 3 ? 'triple' : g.reels.length === 2 ? 'pair' : 'none'));
      expect(steps[0].value).toBe(g.base);
      expect(steps.at(-1)!.value).toBe(Math.round(g.base * g.mult));
      for (let i = 1; i < steps.length; i++) expect(steps[i].value).toBeGreaterThanOrEqual(steps[i - 1].value - 1e-9);
    }
  });
  it('names the line first: JACKPOT for three, PAIR for two', () => {
    expect(climbSteps(group({}), 'triple')[1].label).toBe('×3 JACKPOT');
    expect(climbSteps(group({ reels: [0, 1], mult: 2 }), 'pair')[1].label).toBe('×2 PAIR');
  });
});
