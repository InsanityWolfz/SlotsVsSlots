import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, levelOptions, shopOffers } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}
describe('charm levels, hexes and level cards (Tuesday rework)', () => {
  it('GOLD: x2, whatever an old save says its level is (Charms have no levels: 2026-10-15)', () => {
    const single = (lvl: number) => {
      const f = fight((c) => {
        c.player.strips = [{ sword: 12 }, { shield: 12 }, { bolt: 12 }];
        c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 12 }];
        c.player.levels = { sym: {}, charm: { gold: lvl } };
      });
      f.forceNext('player', ['sword', 'shield', 'bolt']);
      return ofType(f.step().events, 'attack')[0].amount;
    };
    expect(single(1)).toBe(20);
    expect(single(2)).toBe(20);
  });

  it("a hex darkens its reel's charm and halves the group", () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const, n: 12 }));
    });
    f.sides.player.hexed[2] = 2;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const g = ofType(f.step().events, 'spin')[0].score.groups[0];
    // 30 x (3 x (2 + 2)) with reel 3's gold dark = 360, then halved.
    expect(g.notes).toEqual(['X4 GOLD', 'HALF']);
    expect(g.amount).toBe(180);
    expect(g.cut).toBe(180);
  });

  it('level cards: symbol levels live on the TYPE with no cap; an old charm level card does nothing', () => {
    const run = createRun(base, 3, 'midas');
    applyOption(run, { kind: 'charmLevel', enh: 'gold' });
    applyOption(run, { kind: 'symLevel', symbol: 'sword' });
    expect(run.player.levels).toEqual({ sym: { sword: 2 }, charm: {} });
    for (let i = 0; i < 6; i++) applyOption(run, { kind: 'symLevel', symbol: 'sword' });
    expect(run.player.levels.sym.sword).toBe(8);
    applyOption(run, { kind: 'gild', enh: 'gold', symbol: 'shield', reel: 1, n: 2 });
    expect(run.player.gilded.find((g) => g.symbol === 'shield')).toEqual({ reel: 1, symbol: 'shield', enh: 'gold', n: 2 });
    // No cap: a level card is still on offer, and never a charm level.
    // (BANKROLL levels its own symbols: its chips at any level.)
    run.player.levels.sym.goldbar = 9;
    expect(levelOptions(run).some((o) => o.kind === 'symLevel' && o.symbol === 'goldbar')).toBe(true);
    expect(levelOptions(run).some((o) => o.kind === 'charmLevel')).toBe(false);
    run.depth = 1;
    expect(shopOffers(run).length).toBeLessThanOrEqual(5);
  });
});

describe('Package N: act 2 writers', () => {
  it('single hexes fizzle; bombs are never planted on the payline', () => {
    const f = fight((c) => (c.enemy = { hp: 9999, strips: [{ hex: 12 }, { shield: 12 }, { sword: 12 }] }));
    f.next = 'enemy';
    f.forceNext('enemy', ['hex', 'shield', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'hex').length).toBe(0);
    expect(ofType(events, 'fizzle').some((z) => z.symbol === 'hex')).toBe(true);

    for (let seed = 1; seed < 20; seed++) {
      const g = fight((c) => (c.enemy = { hp: 9999, strips: [{ bomb: 12 }, { bomb: 12 }, { bomb: 12 }] }), seed);
      g.next = 'enemy';
      const planted = ofType(g.step().events, 'bomb').flatMap((b) => b.cells);
      for (const ref of planted) expect(ref.index).not.toBe(g.sides.player.reels[ref.reel].stop);
    }
  });
});
