import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { BOSS_HP_PER_RELIC, COUNTER_RELICS } from '../src/core/relics';
import { buy, CHIPS, createRun, fightConfig, finishFight, isShopNow, reroll, rerollCost, shopOffers, takeSpoils } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 99, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}

describe('build relics & keen', () => {
  it('KEEN swords deal +1 and HONE adds +2 more', () => {
    const f = fight((c) => (c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen' }]));
    f.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(2);
    const g = fight((c) => {
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen' }];
      c.relics = ['hone'];
    });
    g.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(g.step().events, 'attack')[0].amount).toBe(4);
  });

  it('MIDAS: gold cells on the payline give +1 energy', () => {
    const f = fight((c) => {
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold' }];
      c.relics = ['midas'];
    });
    f.forceNext('player', ['sword', 'shield', 'shield']);
    const en = ofType(f.step().events, 'energyGain');
    expect(en.at(-1)!.amount).toBe(1);
  });

  it('LIGHTNING ROD makes the special cost 4 with a charged build', () => {
    const f = fight((c) => {
      c.player.gilded = [{ reel: 1, symbol: 'bolt', enh: 'charged' }];
      c.relics = ['rod'];
    });
    expect(f.cfg.specialCost).toBe(4);
    expect(fight((c) => (c.relics = ['rod'])).cfg.specialCost).toBe(5);
  });

  it('CACTUS makes spikes hit back for 4', () => {
    const c = defaultConfig();
    c.enemy = { hp: 99, strips: reels3({ sword: 12 }) };
    c.player.gilded = [{ reel: 0, symbol: 'shield', enh: 'spiked' }];
    c.relics = ['cactus'];
    const f = new Fight(c, 2);
    f.forceNext('player', ['shield', 'bolt', 'bolt']);
    f.step();
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const back = ofType(f.step().events, 'attack').find((e) => e.note === 'spiked');
    expect(back?.amount).toBe(4);
  });

  it('PRISM doubles a match that used a WILD', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 6, wild: 6 });
      c.relics = ['prism'];
    });
    f.forceNext('player', ['wild', 'sword', 'sword']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(18);
  });

  it('PIERCE only shows when there was a shield to pierce', () => {
    const f = fight((c) => (c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen' }]));
    f.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(f.step().events, 'attack')[0].note).toBeUndefined();
  });
});

describe('the House cashes out at the start of its turn', () => {
  it('arms at the end of a turn, fires before its next spin, reports the pot left', () => {
    const c = defaultConfig();
    c.enemy = { hp: 99, strips: reels3({ sword: 2, coin: 10 }), ability: { kind: 'jackpot', every: 2, power: 1 }, boss: 'house' };
    const f = new Fight(c, 3);
    f.step();
    f.step(); // House turn 1: charge 1
    f.step();
    const e2 = f.step().events; // House turn 2: charge 2 → armed, no cash yet
    expect(ofType(e2, 'potWin')).toHaveLength(0);
    expect(f.cashPending).toBe(true);
    f.step();
    const before = f.pot;
    const e3 = f.step().events;
    const firstSpin = e3.findIndex((e) => e.type === 'spin');
    const cash = e3.findIndex((e) => e.type === 'potWin');
    expect(cash).toBeGreaterThan(-1);
    expect(cash).toBeLessThan(firstSpin);
    const pw = ofType(e3, 'potWin')[0];
    expect(pw.amount).toBe(Math.ceil(before / 2));
    expect(pw.potLeft).toBe(before - pw.amount);
  });

  it('chips carried in give shield at the start of each House turn', () => {
    const c = defaultConfig();
    c.enemy = { hp: 99, strips: reels3({ sword: 12 }), boss: 'house' };
    c.player.stackShield = 3;
    const f = new Fight(c, 3);
    f.step();
    const ev = f.step().events;
    const gain = ofType(ev, 'shieldGain').find((e) => e.side === 'player');
    expect(gain?.amount).toBe(3);
  });
});

describe('run economy', () => {
  it('earns chips for winning, with interest, and elites offer 2 relics to choose from', () => {
    const run = createRun(base, 3);
    run.player.chips = 10;
    run.depth = 1;
    const elite = run.paths[1].find((e) => e.elite)!;
    run.enemies[1] = elite;
    run.chosen[1] = true;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(rec.chips).toBe(2 + CHIPS.win + CHIPS.eliteBonus); // interest 2 on 10 banked
    expect(run.pendingSpoils).toHaveLength(2);
    for (const r of run.pendingSpoils!) expect(COUNTER_RELICS.has(r)).toBe(false);
    const pick = run.pendingSpoils![1];
    takeSpoils(run, pick);
    expect(run.player.relics).toContain(pick);
    expect(run.pendingSpoils).toBeNull();
  });

  it('the Cashier opens after fights 1, 3 and 5 and sells for chips; rerolls cost more each time', () => {
    const run = createRun(base, 5);
    run.depth = 1;
    expect(isShopNow(run)).toBe(true);
    run.depth = 2;
    expect(isShopNow(run)).toBe(false);
    run.depth = 3;
    run.player.chips = 30;
    const items = shopOffers(run);
    expect(items.length).toBeGreaterThanOrEqual(3);
    const it0 = items[0];
    expect(buy(run, it0)).toBe(true);
    expect(run.player.chips).toBe(30 - it0.price);
    expect(buy(run, it0)).toBe(false);
    const cost = rerollCost(run);
    expect(reroll(run)).not.toBeNull();
    expect(rerollCost(run)).toBe(cost + 1);
  });

  it('the boss gets tougher per relic and your chip stack becomes shield', () => {
    const run = createRun(base, 9);
    run.depth = 5;
    run.player.relics = ['clover', 'fang'] as RelicId[];
    run.player.chips = 12;
    const cfg = fightConfig(run, base);
    expect(cfg.enemy.hp).toBe(run.enemies[5].hp + 2 * BOSS_HP_PER_RELIC);
    expect(cfg.player.stackShield).toBe(Math.floor(12 / CHIPS.stackPer));
  });
});
