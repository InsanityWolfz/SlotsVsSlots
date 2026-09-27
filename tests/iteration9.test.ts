import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { ARCHETYPES, RUN_FIGHTS } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { applySignature, createRun, describeOption, enemyHp, fightConfig, levelOptions, shopOffers, stripsAfter } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}

describe('ITERATION_8 G1: previews are pure', () => {
  it('looking at level cards or Cashier items never changes the run', () => {
    const run = createRun(base, 5, 'midas');
    run.act = 2;
    run.depth = 1;
    const before = JSON.stringify(run.player);
    for (const o of levelOptions(run)) {
      describeOption(o, run);
      stripsAfter(run, o);
    }
    for (const it of shopOffers(run)) describeOption(it.option, run);
    expect(JSON.stringify(run.player)).toBe(before);
  });
});

describe('counter-enemies', () => {
  it('GROUNDER: a grounded bolt on your payline earths its energy, and your special hits shields', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ bolt: 12 });
      c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
    });
    f.sides.enemy.shield = 50;
    for (const cell of f.sides.player.reels[0].cells) cell.grounded = true;
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const { events } = f.step();
    // A 90-energy jackpot with 1 of 3 bolts grounded: 30 earthed, 60 gained.
    expect(ofType(events, 'energyGain')[0]).toMatchObject({ amount: 60, earthed: 30 });
    const fire = ofType(events, 'specialFire')[0];
    expect(fire.grounded).toBe(true);
    expect(fire.blocked).toBe(50);
  });

  it('GROUNDER writes rods onto bolt cells; EARTH drains energy', () => {
    const f = fight((c) => (c.enemy = { hp: 9999, strips: [{ ground: 12 }, { ground: 12 }, { shield: 12 }], ability: { kind: 'earth', every: 1, power: 30 } }));
    f.sides.player.energy = 40;
    f.next = 'enemy';
    f.forceNext('enemy', ['ground', 'ground', 'shield']);
    const { events } = f.step();
    const g = ofType(events, 'ground')[0];
    expect(g.cells.length).toBe(3);
    for (const ref of g.cells) expect(f.sides.player.reels[ref.reel].cells[ref.index].symbol).toBe('bolt');
    expect(ofType(events, 'earth')[0]).toMatchObject({ amount: 30, total: 10 });
  });

  it('COUNTERFEITER: a faked charm pays plain until it wears off', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const, n: 12 }));
    });
    for (const cell of f.sides.player.reels[0].cells) cell.faked = 1;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const { events } = f.step();
    // Reel 1's gold is faked: only 2 + 2 gold on the line = x4 (not x6).
    expect(ofType(events, 'spin')[0].score.groups[0].notes).toContain('X4 GOLD');
    expect(ofType(events, 'fakeTick')[0].left.every((x) => x === 0)).toBe(true);
    expect(f.sides.player.reels[0].cells.some((c) => c.faked)).toBe(false);
  });

  it('both join the act 2 pool from fight 2', () => {
    for (const id of ['grounder', 'counterfeiter']) {
      const a = ARCHETYPES.find((x) => x.id === id)!;
      expect(a.acts).toEqual([2]);
      expect(a.minDepth).toBe(1);
    }
  });
});

describe('Package P', () => {
  it('the Mirror stops at half HP on the turn it cracks, and copies no keen', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.enemy = { hp: 1000, strips: reels3({ shield: 12 }), ability: { kind: 'reflect', every: 3, power: 200 }, boss: 'mirror' };
    });
    f.sides.enemy.hp = 520;
    f.forceNext('player', ['sword', 'sword', 'sword']); // 90 would take it to 430
    const { events } = f.step();
    expect(ofType(events, 'shatter').length).toBe(1);
    expect(f.sides.enemy.hp).toBe(500);

    const run = createRun(base, 8);
    run.act = 2;
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen', n: 2 }, { reel: 1, symbol: 'shield', enh: 'gold', n: 2 }];
    run.depth = RUN_FIGHTS;
    run.enemies[RUN_FIGHTS] = { ...run.enemies[RUN_FIGHTS], boss: 'mirror', isBoss: true };
    expect(fightConfig(run, base).enemy.gilded).toEqual([{ reel: 1, symbol: 'shield', enh: 'gold', n: 2 }]);
  });

  it('act 2 signatures: KNIGHT +60 max HP, THORN +40 max HP, JOKER wilds on reel 3', () => {
    const k = createRun(base, 9, 'knight');
    const kHp = k.player.maxHp;
    applySignature(k);
    expect(k.player.maxHp).toBe(kHp + 60);
    const t = createRun(base, 9, 'thorn');
    const tHp = t.player.maxHp;
    applySignature(t);
    expect(t.player.maxHp).toBe(tHp + 40);
    const j = createRun(base, 9, 'joker');
    const w = j.player.strips[2].wild ?? 0;
    applySignature(j);
    expect(j.player.strips[2].wild).toBe(w + 2);
  });

  it('JACKPOT BELL refills your special; fragile cabinets get a softer opener', () => {
    const f = fight((c) => {
      c.relics = ['bell'];
      c.player.strips = reels3({ sword: 12 });
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'specialFire').length).toBe(1);

    const m = createRun(base, 10, 'midas');
    const k = createRun(base, 10, 'knight');
    expect(enemyHp(m, m.enemies[0])).toBeLessThan(enemyHp(k, k.enemies[0]));
  });
});
