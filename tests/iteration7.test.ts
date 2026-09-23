import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, optionDeltas, shopOffers, tierUps } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 99, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}
const gold3 = (tier?: 2) => [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const, ...(tier ? { tier } : {}) }));

describe('gild levels (tier II, full sets, hexes)', () => {
  it('GOLD: x2 plain, x3 tier II; one multiplier per group (1 + levels)', () => {
    const single = (gilded: ReturnType<typeof gold3>) => {
      const f = fight((c) => {
        c.player.strips = [{ sword: 12 }, { shield: 12 }, { bolt: 12 }];
        c.player.gilded = gilded;
      });
      f.forceNext('player', ['sword', 'shield', 'bolt']);
      return ofType(f.step().events, 'attack')[0].amount;
    };
    expect(single([gold3()[0]])).toBe(2);
    expect(single([gold3(2)[0]])).toBe(3);
  });

  it('a hex breaks a FULL SET while it lasts', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = gold3();
    });
    f.sides.player.hexed[2] = 2;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const g = ofType(f.step().events, 'spin')[0].score.groups[0];
    // 9 x(1+1+1) (reels 1-2, plain gold now; GOLD is one multiplier per group) with reel 3 dark, then halved.
    expect(g.notes).toEqual(['X3', 'HALF']);
    expect(g.amount).toBe(13);
    expect(g.fullSet).toBeFalsy();
  });

  it('a SPIKED FULL SET hits back for the shield you had up', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ shield: 12 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'shield' as SymbolId, enh: 'spiked' as const }));
      c.enemy = { hp: 99, strips: reels3({ sword: 12 }) };
    });
    f.forceNext('player', ['shield', 'shield', 'shield']); // 9 shield
    f.step();
    f.forceNext('enemy', ['sword', 'shield', 'shield']);
    const back = ofType(f.step().events, 'attack').find((a) => a.note === 'spiked')!;
    expect(back.amount).toBe(9);
  });

  it('act 2 offers TIER II upgrades of gilds you own; taking one upgrades in place', () => {
    const run = createRun(base, 3, 'midas');
    expect(tierUps(run)).toEqual([]);
    run.act = 2;
    const ups = tierUps(run);
    expect(ups.length).toBe(1);
    applyOption(run, ups[0]);
    expect(run.player.gilded).toEqual([{ reel: 0, symbol: 'sword', enh: 'gold', tier: 2 }]);
    expect(tierUps(run)).toEqual([]);
    run.depth = 1;
    expect(shopOffers(run).length).toBeLessThanOrEqual(5);
  });

  it('stat lines cover VAMP and BLAZE', () => {
    const run = createRun(base, 4);
    expect(optionDeltas(run, { kind: 'gild', enh: 'vamp', symbol: 'sword', reel: 0 }, base).gain).toMatch(/^HEAL/);
    expect(optionDeltas(run, { kind: 'gild', enh: 'blaze', symbol: 'bolt', reel: 0 }, base).gain).toMatch(/^SPECIAL/);
  });
});

describe('Package N: the Mirror and act 2 writers', () => {
  it("the Mirror's bolts charge nothing and it never casts your rocks", () => {
    const f = fight((c) => {
      c.enemy = { hp: 99, strips: reels3({ bolt: 10, rock: 2 }), ability: { kind: 'reflect', every: 3, power: 20 }, boss: 'mirror' };
    });
    expect(f.sides.enemy.casts.size).toBe(0);
    f.next = 'enemy';
    f.forceNext('enemy', ['bolt', 'bolt', 'bolt']);
    const { events } = f.step();
    expect(ofType(events, 'energyGain').length).toBe(0);
    expect(ofType(events, 'specialFire').length).toBe(0);
  });

  it('REFLECTION throws your best hit since the last one', () => {
    const f = fight((c) => {
      c.player.strips = [{ sword: 6, shield: 6 }, { sword: 6, shield: 6 }, { sword: 6, shield: 6 }];
      c.enemy = { hp: 99, strips: reels3({ shield: 12 }), ability: { kind: 'reflect', every: 2, power: 20 }, boss: 'mirror' };
    });
    f.forceNext('player', ['sword', 'sword', 'sword']); // 9
    f.step();
    f.step(); // enemy: charge 1
    f.forceNext('player', ['sword', 'shield', 'shield']); // 1
    f.step();
    const hit = ofType(f.step().events, 'attack').find((a) => a.note === 'reflect')!;
    expect(hit.amount).toBe(9);
    expect(f.reflectBank).toBe(0);
  });

  it('single hexes fizzle; bombs are never planted on the payline', () => {
    const f = fight((c) => (c.enemy = { hp: 99, strips: [{ hex: 12 }, { shield: 12 }, { sword: 12 }] }));
    f.next = 'enemy';
    f.forceNext('enemy', ['hex', 'shield', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'hex').length).toBe(0);
    expect(ofType(events, 'fizzle').some((z) => z.symbol === 'hex')).toBe(true);

    for (let seed = 1; seed < 20; seed++) {
      const g = fight((c) => (c.enemy = { hp: 99, strips: [{ bomb: 12 }, { bomb: 12 }, { bomb: 12 }] }), seed);
      g.next = 'enemy';
      const planted = ofType(g.step().events, 'bomb').flatMap((b) => b.cells);
      for (const ref of planted) expect(ref.index).not.toBe(g.sides.player.reels[ref.reel].stop);
    }
  });
});
