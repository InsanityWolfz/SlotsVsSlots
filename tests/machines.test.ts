import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { CABINETS, CABINET_ORDER } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { BUILD_ENABLER } from '../src/core/relics';
import { CHIPS, createRun, draftOffers, fightConfig, relicFits, rerollCost, shopOffers } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

describe('cabinets', () => {
  it('each cabinet starts the run with its own machine, HP and gilds', () => {
    for (const id of CABINET_ORDER) {
      const run = createRun(base, 1, id);
      const cab = CABINETS[id];
      expect(run.cabinet).toBe(id);
      expect(run.player.maxHp).toBe(cab.hp);
      expect(run.player.gilded).toEqual(cab.gilded);
      expect(run.player.strips).toEqual(cab.strips);
      expect(run.player.chips).toBe(cab.startChips ?? CHIPS.start);
      expect(fightConfig(run, base).cabinet).toBe(id);
    }
  });

  it('TESLA changes the special; JOKER lets WILDs pair any two reels', () => {
    const t = new Fight(fightConfig(createRun(base, 2, 'tesla'), base), 1);
    // One axis (2026-11-01): half-size bolts, 20 charge for 22 damage.
    expect(t.cfg.specialCost).toBe(20);
    expect(t.cfg.specialDamage).toBe(22);

    const c = fightConfig(createRun(base, 3, 'joker'), base);
    c.player.strips = reels3({ sword: 6, wild: 3, bolt: 3 });
    c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
    const f = new Fight(c, 4);
    f.forceNext('player', ['bolt', 'sword', 'wild']);
    const [spin] = ofType(f.step().events, 'spin');
    expect(spin.score.tier).toBe('pair');
  });

  it('MIDAS earns +1 chip per win', () => {
    const run = createRun(base, 5, 'midas');
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    const before = run.player.chips;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return import('../src/core/run').then(({ finishFight }) => {
      const rec = finishFight(run, f);
      expect(rec.chips).toBe(CHIPS.win + 1 + Math.min(CHIPS.interestCap, Math.floor(before / CHIPS.interestPer)));
    });
  });
});

describe('pay math: BASE x MULT (charms on cells, levels on types)', () => {
  it('gold charms in a group ADD, then multiply with the jackpot: 3 gold bolts = 30 x 18 = 540', () => {
    const c = defaultConfig();
    c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
    c.specialCost = 9999;
    c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'bolt' as const, enh: 'gold' as const, n: 4 }));
    const f = new Fight(c, 1);
    f.forceNext('player', ['bolt', 'sword', 'shield']);
    const one = ofType(f.step().events, 'spin')[0].score.groups[0];
    expect([one.base, one.mult, one.amount]).toEqual([10, 2, 20]);
    const g = new Fight(c, 1);
    g.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const three = ofType(g.step().events, 'spin')[0].score.groups[0];
    expect([three.base, three.mult, three.amount]).toEqual([30, 18, 540]);
  });

  it('symbol levels raise every cell of the type (10, 16, 22... +6 a level, no cap); Charms have no levels (gold is x2)', () => {
    const c = defaultConfig();
    c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
    c.player.levels = { sym: { sword: 3 }, charm: { gold: 2 } };
    c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 4 }];
    const f = new Fight(c, 1);
    f.forceNext('player', ['sword', 'sword', 'shield']);
    const pair = ofType(f.step().events, 'spin')[0].score.groups[0];
    // Two level-3 swords (22 each), one gold (x2, an old save's level ignored): 44 x (2 x 2).
    expect([pair.base, pair.mult, pair.amount]).toEqual([44, 4, 176]);
  });
});

describe('build-aware offers & the heal service', () => {
  it('build relics are only offered once you own their enabler', () => {
    for (let s = 0; s < 40; s++) {
      const run = createRun(base, s);
      for (const d of [2, 4]) {
        run.depth = d;
        for (const o of draftOffers(run)) if (o.kind === 'relic' && BUILD_ENABLER[o.relic]) expect(relicFits(run, o.relic)).toBe(true);
      }
      run.depth = 3;
      for (const it of shopOffers(run)) if (it.option.kind === 'relic' && BUILD_ENABLER[it.option.relic]) expect(relicFits(run, it.option.relic)).toBe(true);
    }
    // Charm relics (HORSESHOE) need the charm; machine relics stay home.
    const tesla = createRun(base, 1, 'tesla');
    expect(relicFits(tesla, 'horseshoe')).toBe(false);
    tesla.player.gilded.push({ reel: 0, symbol: 'bolt', enh: 'lucky', n: 2 });
    expect(relicFits(tesla, 'horseshoe')).toBe(true);
    expect(relicFits(createRun(base, 1, 'jukebox'), 'turntable')).toBe(true);
  });

  it('HEAL is a permanent service slot, hidden at full HP; first reroll costs 1', () => {
    const run = createRun(base, 6);
    run.depth = 1;
    expect(shopOffers(run).some((i) => i.option.kind === 'heal')).toBe(false);
    run.player.hp -= 50;
    const heal = shopOffers(run).find((i) => i.option.kind === 'heal');
    expect(heal?.price).toBe(CHIPS.prices.heal);
    expect(rerollCost(run)).toBe(1);
  });
});
