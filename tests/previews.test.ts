import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { ARCHETYPES } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import {
  createRun,
  describeOption,
  enemyHp,
  fightConfig,
  levelOptions,
  shopOffers,
  stripsAfter,
  skipToBoss,
} from '../src/core/run';

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

  it('the counterfeiter joins the act 2 pool from fight 2', () => {
    for (const id of ['counterfeiter']) {
      const a = ARCHETYPES.find((x) => x.id === id)!;
      expect(a.acts).toEqual([2]);
      expect(a.minDepth).toBe(1);
    }
  });
});

describe('Package P', () => {
  it('THE WHEEL holds at half HP on the turn it SPINS FASTER, and carries none of your charms', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.enemy = { hp: 1000, strips: reels3({ shield: 12 }), ability: { kind: 'bets', every: 3, power: 2 }, boss: 'wheel' };
    });
    f.sides.enemy.hp = 520;
    f.forceNext('player', ['sword', 'sword', 'sword']); // 90 would take it to 430
    const { events } = f.step();
    expect(ofType(events, 'wheelFast').length).toBe(1);
    expect(f.sides.enemy.hp).toBe(500);

    const run = createRun(base, 8);
    run.act = 2;
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen', n: 2 }, { reel: 1, symbol: 'shield', enh: 'gold', n: 2 }];
    skipToBoss(run);
    run.enemies[run.depth] = { ...run.enemies[run.depth], boss: 'wheel', isBoss: true };
    expect(fightConfig(run, base).enemy.gilded ?? []).toEqual([]);
  });


  it('JACKPOT BELL refills your special; every machine meets the same opener (honest HP)', () => {
    const f = fight((c) => {
      c.relics = ['bell'];
      c.player.strips = reels3({ sword: 12 });
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'specialFire').length).toBe(1);

    const m = createRun(base, 10, 'joker');
    const k = createRun(base, 10, 'knight');
    expect(enemyHp(m, m.enemies[0])).toBe(enemyHp(k, k.enemies[0]));
  });
});

describe('on-symbol numbers match the calculation (audit)', () => {
  it('an enemy sword group hits for exactly what its banner says (OVERTIME is on the banner, not hidden)', () => {
    const c = fightConfig(createRun(base, 3, 'knight'), base);
    c.enemy = { hp: 999999, strips: reels3({ sword: 12 }), ability: null, act: 3 };
    c.player.hp = c.player.startHp = 999999;
    const f = new Fight(c, 4);
    let ok = 0;
    for (let i = 0; i < 22 && !f.over; i++) {
      const { side, events } = f.step();
      if (side !== 'enemy') continue;
      const spin = ofType(events, 'spin')[0];
      const g = spin.score.groups.find((x) => x.symbol === 'sword' && x.amount > 0);
      const atk = ofType(events, 'attack').find((a) => a.from === 'enemy');
      // (The first enemy hit in act 3 splits off a COVER CHARGE that goes through your shield.)
      if (!g || !atk || ofType(events, 'coverCharge').length) continue;
      expect(atk.amount).toBe(g.amount);
      if (g.notes?.some((n) => n.endsWith('OVERTIME'))) ok++;
    }
    expect(ok).toBeGreaterThan(0);
  });

});

describe('THE HOUSE pot never goes negative (endless loop 4: user bug)', () => {
  it('a skim takes at most half the pot; the loop growth only multiplies the hit', () => {
    const c = fightConfig(createRun(base, 3, 'knight'), base);
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
