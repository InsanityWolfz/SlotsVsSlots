/**
 * Rules text (QA RULES stream, 2026-11-09): the Cashier's prices (HP_GAME "Balance", 2026-11-07) and what each item does vs its
 * card. Passing = the shelf matches the rules doc; a failure names a price or text that differs.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, UNIT } from '../src/core/config';
import { createRun, RUN, type RunState } from '../src/core/run';
import { buy, reroll, rerollCost, shopOffers } from '../src/core/shop';
import { cardFace } from '../src/ui/run/cardText';
import { LEGENDARY } from '../src/core/relics';
import type { CabinetId } from '../src/core/cabinets';

function shopRun(cab: CabinetId = 'knight', act = 1): RunState {
  const r = createRun(defaultConfig(), 5, cab, 0);
  r.pendingStart = null;
  r.act = act;
  r.player.chips = 500;
  r.player.hp = Math.round(r.player.maxHp / 2);
  return r;
}
const find = (items: ReturnType<typeof shopOffers>, kind: string) => items.find((i) => i.option.kind === kind)!;

describe('the Cashier', () => {
  it('HEAL: 10 chips, up to 120 HP, +5 each one bought this run, once a visit', () => {
    const r = shopRun();
    const heal = find(shopOffers(r), 'heal');
    expect(heal.price).toBe(10);
    expect(heal.option).toEqual({ kind: 'heal', amount: 12 * UNIT });
    expect(cardFace(heal.option, r).text).toBe('HEAL 120 HP');
    const hp = r.player.hp;
    buy(r, heal);
    expect(r.player.hp).toBe(hp + 120);
    expect(shopOffers(r).some((i) => i.option.kind === 'heal')).toBe(false);
    r.healBought = false;
    r.player.hp = 100;
    expect(find(shopOffers(r), 'heal').price).toBe(15);
  });
  it('+MAX HP: 8 chips for +40 max HP (and 40 healed), +6 each one bought', () => {
    const r = shopRun();
    const mx = find(shopOffers(r), 'maxHp');
    expect(mx.price).toBe(8);
    expect(cardFace(mx.option, r)).toMatchObject({ title: '+40 MAX HP', text: 'GAIN 40 MAX HP AND HEAL 40 HP' });
    const [max, hp] = [r.player.maxHp, r.player.hp];
    buy(r, mx);
    expect([r.player.maxHp - max, r.player.hp - hp]).toEqual([40, 40]);
    expect(find(shopOffers(r), 'maxHp').price).toBe(14);
  });
  it('levels: 10 chips, +4 for every level gained this run', () => {
    const r = shopRun();
    const lv = find(shopOffers(r), 'symLevel');
    expect(lv.price).toBe(10);
    buy(r, lv);
    expect(find(shopOffers(r), 'symLevel').price).toBe(14);
  });
  it('relics 10; THE BIG ONE (a legendary) 24 in act 1, 20 after', () => {
    const r = shopRun();
    const items = shopOffers(r);
    const relics = items.filter((i) => i.option.kind === 'relic');
    const big = relics.find((i) => i.option.kind === 'relic' && LEGENDARY.has(i.option.relic))!;
    expect(big.price).toBe(24);
    for (const i of relics.filter((x) => x !== big)) expect(i.price).toBe(10);
    expect(find(shopOffers(shopRun('knight', 2)), 'relic') && shopOffers(shopRun('knight', 2)).find((i) => i.showcase)!.price).toBe(20);
  });
  it('REROLL costs 1, then 2, then 3', () => {
    const r = shopRun();
    const costs: number[] = [];
    for (let i = 0; i < 3; i++) {
      costs.push(rerollCost(r));
      reroll(r);
    }
    expect(costs).toEqual([1, 2, 3]);
  });
  it('BANKROLL pays 20% less at the Cashier (named nowhere in its pitch)', () => {
    const r = shopRun('midas');
    expect(find(shopOffers(r), 'maxHp').price).toBe(7);
    // (Its HEAL is full price: the discount skips it.)
    expect(find(shopOffers(r), 'heal').price).toBe(10);
  });
  it('the starting HP is the machine\'s, not RUN.startHp (sanity)', () => {
    expect(shopRun('knight').player.maxHp).toBe(400);
    expect(RUN.healCard).toBe(120);
  });
});
