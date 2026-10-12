import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { buy, CHIPS, createRun, fightConfig, finishFight, isShopNow, reroll, rerollCost, shopOffers, takeSpoils, skipToBoss, currentEnemy } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}

describe('build relics & keen', () => {
  it('KEEN swords add +40 to their group (CONTENT_13); EXECUTIONER (hone) makes them x3 once the enemy is under half HP', () => {
    const f = fight((c) => (c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen', n: 4 }]));
    f.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(50);
    const g = fight((c) => {
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen', n: 4 }];
      c.relics = ['hone'];
    });
    g.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(g.step().events, 'attack')[0].amount).toBe(50);
    g.step();
    g.sides.enemy.hp = 100;
    g.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(g.step().events, 'attack')[0].amount).toBe(150);
  });

  it('LIGHTNING ROD makes the special cost 40 with a charged build', () => {
    const f = fight((c) => {
      c.player.gilded = [{ reel: 1, symbol: 'bolt', enh: 'charged', n: 4 }];
      c.relics = ['rod'];
    });
    expect(f.cfg.specialCost).toBe(40);
    expect(fight((c) => (c.relics = ['rod'])).cfg.specialCost).toBe(50);
  });

  it('PRISM doubles a match that used a WILD', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 6, wild: 6 });
      c.relics = ['prism'];
    });
    f.forceNext('player', ['wild', 'sword', 'sword']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(180);
  });

  it('PIERCE only shows when there was a shield to pierce', () => {
    const f = fight((c) => (c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen', n: 4 }]));
    f.forceNext('player', ['sword', 'bolt', 'shield']);
    expect(ofType(f.step().events, 'attack')[0].note).toBeUndefined();
  });
});

describe('the House cashes out at the start of its turn', () => {
  it('arms at the end of a turn, fires before its next spin, reports the pot left', () => {
    const c = defaultConfig();
    c.enemy = { hp: 9999, strips: reels3({ sword: 2, coin: 10 }), ability: { kind: 'jackpot', every: 2, power: 1 }, boss: 'house' };
    c.player.hp = 9999;
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
    expect(pw.amount).toBe(Math.ceil(before / 20) * 10);
    expect(pw.potLeft).toBe(before - pw.amount);
  });

  it('chips carried in give shield at the start of each House turn', () => {
    const c = defaultConfig();
    c.enemy = { hp: 9999, strips: reels3({ sword: 12 }), boss: 'house' };
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
    const elite = run.map.routes.flat().find((st) => st.kind === 'elite')!.enemy!;
    run.enemies[0] = elite;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(rec.chips).toBe(2 + CHIPS.win + CHIPS.eliteBonus); // interest 2 on 10 banked
    expect(run.pendingSpoils).toHaveLength(2);
    const pick = run.pendingSpoils![1];
    takeSpoils(run, pick);
    expect(run.player.relics).toContain(pick);
    expect(run.pendingSpoils).toBeNull();
  });

  it('the Cashier is a stop (on routes, and before every boss) and sells for chips; rerolls cost more each time', () => {
    const run = createRun(base, 5);
    expect(isShopNow(run)).toBe(false);
    skipToBoss(run);
    run.stop--;
    expect(isShopNow(run)).toBe(true);
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

  it("the boss's HP doesn't depend on your relics (honest HP), and your chips don't shield you", () => {
    const run = createRun(base, 9);
    skipToBoss(run);
    run.player.relics = ['clover', 'fang'] as RelicId[];
    run.player.chips = 12;
    const cfg = fightConfig(run, base);
    expect(cfg.enemy.hp).toBe(currentEnemy(run).hp);
    expect(cfg.player.stackShield ?? 0).toBe(0);
  });
});
