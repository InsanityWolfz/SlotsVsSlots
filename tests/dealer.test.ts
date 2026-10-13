import { describe, expect, it } from 'vitest';
import { defaultConfig, UNIT } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { allInRange, DEALER_RULES, Fight } from '../src/core/fight';

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

describe('THE DEALER: three hands, three HP bars', () => {
  const run = (hp: number, enemyHp: number, seed: number) => {
    const c = defaultConfig();
    c.player.hp = c.player.startHp = hp;
    c.enemy = { hp: enemyHp, strips: [{ sword: 6 }, { sword: 6 }, { sword: 6 }], ability: { kind: 'deal', every: 3, power: 0 }, boss: 'dealer', name: 'THE DEALER' };
    return new Fight(c, seed);
  };

  it('THE DEAL: only BUSTs; first deal on its 2nd turn', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const f = run(99999, 99999999, seed);
      const dealt: string[] = [];
      let firstDealTurn = -1;
      for (let i = 0; i < 120 && !f.over; i++) {
        const st = f.step();
        for (const e of st.events) {
          if (e.type === 'lineCard') dealt.push(e.card);
          if (e.type === 'allInArmed') dealt.push('allin');
          if (e.type === 'lineCard' && firstDealTurn < 0) firstDealTurn = st.turn;
        }
      }
      expect(dealt.length).toBeGreaterThan(10);
      expect(new Set(dealt)).toEqual(new Set(['bust']));
      // Turns count both sides: its 2nd turn is turn 4.
      expect(firstDealTurn).toBe(4);
    }
  });

  it('beating a hand starts the next with its own bar; hand 3 is ALL IN every 2 turns, 25-40% of your max HP through shields', () => {
    const total = 3000;
    const f = run(20000, total, 11);
    expect(f.sides.enemy.maxHp).toBe(Math.round((total * DEALER_RULES.hands[0]) / UNIT) * UNIT);
    const all: CombatEvent[] = [];
    for (let i = 0; i < 600 && !f.over; i++) {
      f.forceNext('player', ['sword', 'sword', 'sword']);
      all.push(...f.step().events);
    }
    const hands = ofType(all, 'dealerHand');
    expect(hands.map((e) => e.hand)).toEqual([2, 3]);
    for (const h of hands) expect(h.hp).toBe(Math.round((total * DEALER_RULES.hands[h.hand - 1]) / UNIT) * UNIT);
    expect(hands[1].every).toBe(DEALER_RULES.allInEvery);
    const h3 = all.indexOf(hands[1]);
    expect(all.slice(h3).some((e) => e.type === 'lineCard')).toBe(false);
    expect(all.slice(0, h3).some((e) => e.type === 'allInArmed')).toBe(false);
    expect(ofType(all, 'allInHit').length).toBeGreaterThan(1);
    for (const hit of ofType(all, 'allInHit')) {
      expect(hit.amount).toBeGreaterThanOrEqual(5000);
      expect(hit.amount).toBeLessThanOrEqual(8000);
      expect(hit.blocked).toBe(0);
    }
  });

  it('a faster clock (FAST HANDS, QUICKENING, the stakes) stays faster in every hand', () => {
    const c = defaultConfig();
    c.player.hp = c.player.startHp = 20000;
    c.enemy = { hp: 3000, strips: [{ sword: 6 }, { sword: 6 }, { sword: 6 }], ability: { kind: 'deal', every: 2, power: 0 }, boss: 'dealer', name: 'THE DEALER' };
    const f = new Fight(c, 11);
    const all: CombatEvent[] = [];
    for (let i = 0; i < 600 && !f.over; i++) {
      f.forceNext('player', ['sword', 'sword', 'sword']);
      all.push(...f.step().events);
    }
    expect(ofType(all, 'dealerHand').map((e) => e.every)).toEqual([2, 2]);
  });

  it('RAISE: from hand 2 its hits are bigger', () => {
    const hit = (hand: number) => {
      const f = run(99999, 99999, 3);
      f.dealerHand = hand;
      f.next = 'enemy';
      f.forceNext('enemy', ['sword', 'sword', 'sword']);
      return ofType(f.step().events, 'attack')[0].amount;
    };
    expect(hit(2)).toBe(hit(1) * DEALER_RULES.raiseMul);
  });
});

describe('THE DEALER in ENDLESS', () => {
  it('ALL IN grows with the loop, never past loopMax of your max HP', () => {
    expect(allInRange(1000, 0, 0)).toBe(250);
    expect(allInRange(1000, 0, 2)).toBe(380);
    expect(allInRange(1000, Infinity, 2)).toBe(600);
    expect(allInRange(1000, Infinity, 20)).toBe(1000 * DEALER_RULES.loopMax);
  });
});
