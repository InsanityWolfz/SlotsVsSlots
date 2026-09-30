import { describe, expect, it } from 'vitest';
import { defaultConfig, UNIT } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';

const dealerFight = () => {
  const c = defaultConfig();
  c.player.hp = c.player.startHp = 300;
  c.enemy = { hp: 99999, strips: [{ seven: 6, sword: 6 }, { seven: 6, sword: 6 }, { seven: 6, sword: 6 }], ability: { kind: 'deal', every: 3, power: 0 }, boss: 'dealer', name: 'THE DEALER' };
  return new Fight(c, 7);
};
const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

describe('THE DEALER (rework): cards on your payline, ALL IN', () => {
  it('a JOKER card makes that payline cell wild for your next spin; a DEUCE makes it pay nothing', () => {
    const f = dealerFight();
    f.lineCard = { reel: 1, card: 'joker' };
    f.forceNext('player', ['sword', 'shield', 'sword']);
    const spin = ofType(f.step().events, 'spin')[0];
    expect(spin.score.line[1]).toBe('wild');
    expect(spin.score.tier).toBe('triple');
    expect(f.lineCard).toBeNull();
    const g = dealerFight();
    g.lineCard = { reel: 0, card: 'deuce' };
    g.forceNext('player', ['sword', 'sword', 'sword']);
    const s2 = ofType(g.step().events, 'spin')[0];
    expect(s2.score.line[0]).toBe('empty');
    expect(s2.score.tier).not.toBe('triple');
  });

  it('an ACE doubles the group through its reel', () => {
    const f = dealerFight();
    f.lineCard = { reel: 2, card: 'ace' };
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const g = ofType(f.step().events, 'spin')[0].score.groups[0];
    expect(g.notes).toContain('ACE X2');
  });

  it('ALL IN: its next attack is one hit of its whole visible hand, capped at 45% of your max HP', () => {
    const f = dealerFight();
    f.step(); // your turn
    f.dealerAllIn = true;
    const hit = ofType(f.step().events, 'allInHit')[0];
    expect(hit).toBeTruthy();
    expect(hit.amount).toBeGreaterThanOrEqual(UNIT);
    expect(hit.amount).toBeLessThanOrEqual(Math.round((300 * 0.45) / UNIT) * UNIT);
    expect(f.dealerAllIn).toBe(false);
  });
});
