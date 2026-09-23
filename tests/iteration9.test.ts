import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { ARCHETYPES, RUN_FIGHTS } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { applyOption, applySignature, createRun, enemyHp, fightConfig, optionDeltas, shopOffers, stripsAfter, tierUps } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 99, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}

describe('ITERATION_8 G1/G2: previews are pure; tier II covers new cells', () => {
  it('looking at a TIER II card or item never changes the run', () => {
    const run = createRun(base, 5, 'midas');
    run.act = 2;
    run.depth = 1;
    const before = JSON.stringify(run.player);
    for (const o of tierUps(run)) {
      optionDeltas(run, o, base);
      stripsAfter(run, o);
    }
    for (const it of shopOffers(run)) optionDeltas(run, it.option, base);
    expect(JSON.stringify(run.player)).toBe(before);
  });

  it('a gild added after its TIER II comes in at tier II', () => {
    const run = createRun(base, 6, 'midas');
    run.act = 2;
    applyOption(run, tierUps(run)[0]);
    applyOption(run, { kind: 'gild', enh: 'gold', symbol: 'sword', reel: 1 });
    expect(run.player.gilded.every((g) => g.tier === 2)).toBe(true);
    expect(tierUps(run)).toEqual([]);
  });
});

describe('counter-enemies', () => {
  it('GROUNDER: a grounded bolt on your payline earths its energy, and your special hits shields', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ bolt: 12 });
      c.enemy = { hp: 99, strips: reels3({ shield: 12 }) };
    });
    f.sides.enemy.shield = 5;
    for (const cell of f.sides.player.reels[0].cells) cell.grounded = true;
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const { events } = f.step();
    // A 9-energy jackpot with 1 of 3 bolts grounded: 3 earthed, 6 gained.
    expect(ofType(events, 'energyGain')[0]).toMatchObject({ amount: 6, earthed: 3 });
    const fire = ofType(events, 'specialFire')[0];
    expect(fire.grounded).toBe(true);
    expect(fire.blocked).toBe(5);
  });

  it('GROUNDER writes rods onto bolt cells; EARTH drains energy', () => {
    const f = fight((c) => (c.enemy = { hp: 99, strips: [{ ground: 12 }, { ground: 12 }, { shield: 12 }], ability: { kind: 'earth', every: 1, power: 3 } }));
    f.sides.player.energy = 4;
    f.next = 'enemy';
    f.forceNext('enemy', ['ground', 'ground', 'shield']);
    const { events } = f.step();
    const g = ofType(events, 'ground')[0];
    expect(g.cells.length).toBe(3);
    for (const ref of g.cells) expect(f.sides.player.reels[ref.reel].cells[ref.index].symbol).toBe('bolt');
    expect(ofType(events, 'earth')[0]).toMatchObject({ amount: 3, total: 1 });
  });

  it('COUNTERFEITER: a faked gild pays plain until it wears off', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const, tier: 2 as const }));
    });
    for (const cell of f.sides.player.reels[0].cells) cell.faked = 1;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const { events } = f.step();
    // Levels: faked reel 1 (plain) + 4 + 4 (tier II +2, set +1) = x10 (not x13).
    expect(ofType(events, 'spin')[0].score.groups[0].notes).toContain('X10');
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
      c.enemy = { hp: 100, strips: reels3({ shield: 12 }), ability: { kind: 'reflect', every: 3, power: 20 }, boss: 'mirror' };
    });
    f.sides.enemy.hp = 52;
    f.forceNext('player', ['sword', 'sword', 'sword']); // 9 would take it to 43
    const { events } = f.step();
    expect(ofType(events, 'shatter').length).toBe(1);
    expect(f.sides.enemy.hp).toBe(50);

    const run = createRun(base, 8);
    run.act = 2;
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen' }, { reel: 1, symbol: 'bolt', enh: 'charged' }];
    run.depth = RUN_FIGHTS;
    run.enemies[RUN_FIGHTS] = { ...run.enemies[RUN_FIGHTS], boss: 'mirror', isBoss: true };
    expect(fightConfig(run, base).enemy.gilded).toEqual([{ reel: 1, symbol: 'bolt', enh: 'charged' }]);
  });

  it('act 2 signatures: KNIGHT +6 max HP, THORN tier II spikes +4, JOKER wilds on reel 3', () => {
    const k = createRun(base, 9, 'knight');
    applySignature(k);
    expect(k.player.maxHp).toBe(38);
    const t = createRun(base, 9, 'thorn');
    applySignature(t);
    expect(t.player.gilded.every((g) => g.tier === 2)).toBe(true);
    expect(t.player.maxHp).toBe(32);
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
