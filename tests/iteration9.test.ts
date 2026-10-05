import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { ARCHETYPES, RUN_FIGHTS } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { createRun, describeOption, enemyHp, fightConfig, levelOptions, shopOffers, stripsAfter } from '../src/core/run';

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
  it('the Mirror stops at half HP on the turn it cracks, and copies none of your charms', () => {
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
    expect(fightConfig(run, base).enemy.gilded ?? []).toEqual([]);
  });


  it('JACKPOT BELL refills your special; fragile cabinets get a softer opener', () => {
    const f = fight((c) => {
      c.relics = ['bell'];
      c.player.strips = reels3({ sword: 12 });
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'specialFire').length).toBe(1);

    // A fragile machine (under 260 HP) gets a softer opener. MIDAS isn't fragile any more (300 HP).
    const m = createRun(base, 10, 'joker');
    const k = createRun(base, 10, 'knight');
    expect(enemyHp(m, m.enemies[0])).toBeLessThan(enemyHp(k, k.enemies[0]));
  });
});

describe('THE MIRROR: SHARDS', () => {
  const mirror = (shards: string[], cracked = false) => {
    const f = new Fight(
      (() => {
        const c = fightConfig(createRun(base, 3, 'knight'), base);
        c.player.strips = reels3({ sword: 12 });
        c.player.bonusSymbols = false;
        c.enemy = { hp: 9999, strips: reels3({ sword: 4, shield: 4, shard: 4 }), ability: null, boss: 'mirror' };
        return c;
      })(),
      5,
    );
    if (cracked) (f as unknown as { shattered: boolean }).shattered = true;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const dealt = ofType(f.step().events, 'attack')[0].amount;
    f.forceNext('enemy', shards as never);
    const hit = ofType(f.step().events, 'attack').find((a) => a.note === 'reflect')?.amount ?? 0;
    return { dealt, hit };
  };
  it('each shard throws a third of your last hit back (a jackpot: all of it); cracked, a half each; at least 30', () => {
    const one = mirror(['shard', 'sword', 'shield']);
    expect(one.hit).toBe(Math.max(30, Math.round(one.dealt / 3 / 10) * 10));
    const all = mirror(['shard', 'shard', 'shard']);
    expect(all.hit).toBe(Math.max(30, Math.round(all.dealt / 10) * 10));
    expect(all.hit).toBeGreaterThanOrEqual(one.hit);
    const cracked = mirror(['shard', 'sword', 'shield'], true);
    expect(cracked.hit).toBeGreaterThan(one.hit - 1);
  });
});

describe('on-symbol numbers match the calculation (audit)', () => {
  it('act 3: an enemy sword group hits for exactly what its banner says (LATE is on the banner, not hidden)', () => {
    const c = fightConfig(createRun(base, 3, 'knight'), base);
    c.player.bonusSymbols = false;
    c.enemy = { hp: 9999, strips: reels3({ sword: 12 }), ability: null, act: 3 };
    const f = new Fight(c, 4);
    let ok = 0;
    for (let i = 0; i < 16 && !f.over; i++) {
      const { side, events } = f.step();
      if (side !== 'enemy') continue;
      const spin = ofType(events, 'spin')[0];
      const g = spin.score.groups.find((x) => x.symbol === 'sword' && x.amount > 0);
      const atk = ofType(events, 'attack').find((a) => a.from === 'enemy');
      // (The first enemy hit in act 3 splits off a COVER CHARGE that goes through your shield.)
      if (!g || !atk || ofType(events, 'coverCharge').length) continue;
      expect(atk.amount).toBe(g.amount);
      if (g.notes?.some((n) => n.endsWith('LATE'))) ok++;
    }
    expect(ok).toBeGreaterThan(0);
  });

  it("THE MIRROR announces what each shard throws back after your spin", () => {
    const c = fightConfig(createRun(base, 3, 'knight'), base);
    c.player.strips = reels3({ sword: 12 });
    c.player.bonusSymbols = false;
    c.enemy = { hp: 9999, strips: reels3({ shard: 12 }), ability: null, boss: 'mirror' };
    const f = new Fight(c, 5);
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const ev = f.step().events;
    const dealt = ofType(ev, 'attack')[0].amount;
    const charge = ofType(ev, 'mirrorCharge')[0];
    expect(charge.last).toBe(dealt);
    expect(charge.each).toBe(Math.round(dealt / 3 / 10) * 10);
    const shards = ofType(f.step().events, 'shardReflect')[0];
    expect(shards.count).toBe(3);
    expect(shards.amount).toBe(Math.max(30, Math.round(dealt / 10) * 10));
  });
});

describe('THE HOUSE pot never goes negative (endless loop 4: user bug)', () => {
  it('a skim takes at most half the pot; the loop growth only multiplies the hit', () => {
    const c = fightConfig(createRun(base, 3, 'knight'), base);
    c.player.bonusSymbols = false;
    c.enemy = { hp: 99999, strips: reels3({ sword: 4, shield: 4, coin: 4 }), ability: { kind: 'jackpot', every: 1, power: 0 }, boss: 'house', endless: true, dmgMul: Math.pow(1.35, 4) };
    c.player.hp = 99999 * 10;
    const f = new Fight(c, 3);
    for (let i = 0; i < 40 && !f.over; i++) {
      const { events } = f.step();
      for (const e of events) if (e.type === 'potWin') expect(e.potLeft).toBeGreaterThanOrEqual(0);
      expect((f as unknown as { pot: number }).pot).toBeGreaterThanOrEqual(0);
    }
  });
});
