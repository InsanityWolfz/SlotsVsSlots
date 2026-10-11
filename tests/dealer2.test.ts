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

describe('THE DEALER: two hands, three cards', () => {
  const run = (hp: number, enemyHp: number, seed: number) => {
    const c = defaultConfig();
    c.player.hp = c.player.startHp = hp;
    c.enemy = { hp: enemyHp, strips: [{ sword: 6 }, { sword: 6 }, { sword: 6 }], ability: { kind: 'deal', every: 3, power: 0 }, boss: 'dealer', name: 'THE DEALER' };
    return new Fight(c, seed);
  };

  it('FIRST HAND: only RAISE or DEUCE, never 3 of a kind in a row; first deal on its 2nd turn', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const f = run(99999, 99999999, seed);
      const dealt: string[] = [];
      let firstDealTurn = -1;
      for (let i = 0; i < 120 && !f.over; i++) {
        const st = f.step();
        for (const e of st.events) {
          if (e.type === 'raise') dealt.push('raise');
          if (e.type === 'lineCard') dealt.push('card');
          if (e.type === 'allInArmed') dealt.push('allin');
          if ((e.type === 'raise' || e.type === 'lineCard') && firstDealTurn < 0) firstDealTurn = st.turn;
        }
      }
      expect(dealt).not.toContain('allin');
      expect(dealt.length).toBeGreaterThan(10);
      for (let k = 2; k < dealt.length; k++) expect(dealt[k] === dealt[k - 1] && dealt[k] === dealt[k - 2]).toBe(false);
      // Turns count both sides: its 2nd turn is turn 4.
      expect(firstDealTurn).toBe(4);
    }
  });

  it('FINAL HAND at half HP: every 2 turns, ALL IN then RAISE, in turn; ALL IN is 25-40% of your max HP through shields, never raised', () => {
    const f = run(20000, 1500, 11);
    const all: CombatEvent[] = [];
    for (let i = 0; i < 600 && !f.over; i++) {
      f.forceNext('player', ['sword', 'sword', 'sword']);
      all.push(...f.step().events);
    }
    const fh = all.findIndex((e) => e.type === 'finalHand');
    expect(fh).toBeGreaterThan(0);
    const after = all.slice(fh).filter((e) => e.type === 'raise' || e.type === 'allInArmed').map((e) => e.type);
    expect(after[0]).toBe('allInArmed');
    for (let k = 1; k < after.length; k++) expect(after[k]).not.toBe(after[k - 1]);
    expect(ofType(all, 'allInHit').length).toBeGreaterThan(1);
    for (const hit of ofType(all, 'allInHit')) {
      expect(hit.amount).toBeGreaterThanOrEqual(5000);
      expect(hit.amount).toBeLessThanOrEqual(8000);
      expect(hit.blocked).toBe(0);
    }
  });
});
