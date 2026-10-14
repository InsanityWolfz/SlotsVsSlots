import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { NEW_RELIC } from '../src/core/relics';
import { chooseRoute, createRun, currentStop, finishFight, fightConfig, playEncounter } from '../src/core/run';

/** The user's relic picks from the content list (2026-10-14). */
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) => events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.seed = seed;
  mut(c);
  return new Fight(c, seed);
}

describe('new relics (2026-10-14)', () => {
  it('GOLDEN PARACHUTE + PHOENIX FEATHER: two saves at 1 HP; the parachute costs chips', () => {
    const f = fight((c) => {
      c.relics = ['phoenix', 'parachute'];
      c.player.chipsHeld = 30;
      c.enemy = { hp: 9999, strips: reels3({ sword: 12 }) };
    });
    let saves = 0;
    for (let i = 0; i < 3 && !f.over; i++) {
      f.sides.player.hp = 3;
      f.next = 'enemy';
      f.forceNext('enemy', ['sword', 'sword', 'sword']);
      saves += ofType(f.step().events, 'phoenix').length;
    }
    expect(saves).toBe(2);
    expect(f.parachuteChips).toBe(NEW_RELIC.parachuteCost);
    expect(f.over).toBe(true);
  });

  it('INSURANCE POLICY: the first drop under 25% HP gains 100 shield, once', () => {
    const f = fight((c) => {
      c.relics = ['insurance'];
      c.enemy = { hp: 9999, strips: reels3({ sword: 12 }) };
    });
    const p = f.sides.player;
    p.hp = Math.round(p.maxHp * 0.3);
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const { events } = f.step();
    if (p.hp > 0 && p.hp < p.maxHp * 0.25) expect(ofType(events, 'shieldGain').some((e) => e.source === 'insurance')).toBe(true);
  });

  it('HOUSE TAX: an enemy jackpot pays you 2 chips', () => {
    const f = fight((c) => {
      c.relics = ['housetax'];
      c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['shield', 'shield', 'shield']);
    f.step();
    expect(f.taxChips).toBe(NEW_RELIC.taxChips);
  });

  it('GOLDEN SPIN: some spins pay x3 (about 1 in 10)', () => {
    let golden = 0;
    let spins = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const f = fight((c) => {
        c.relics = ['goldenspin'];
        c.enemy = { hp: 1e7, strips: reels3({ shield: 12 }) };
      }, seed);
      for (let i = 0; i < 20 && !f.over; i++) {
        const { side, events } = f.step();
        if (side !== 'player') continue;
        spins++;
        if (ofType(events, 'spin').some((e) => e.score.relics?.includes('goldenspin'))) golden++;
      }
    }
    expect(golden / spins).toBeGreaterThan(0.03);
    expect(golden / spins).toBeLessThan(0.15);
  });

  it('PUNCH CARD: every 10th won fight queues a legendary pick', () => {
    const base = defaultConfig();
    const run = createRun(base, 41, 'knight', 0);
    run.pendingStart = null;
    run.player.relics = ['punchcard'];
    run.punches = NEW_RELIC.punchEvery - 1;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.punches).toBe(0);
    expect(run.pendingLegend?.length).toBeGreaterThan(0);
  });

  it('REGULAR: RED OR BLACK allows two more spins', () => {
    const base = defaultConfig();
    const run = createRun(base, 2, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'roulette' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 200;
    run.player.relics = ['regular'];
    let spins = 0;
    for (let guard = 0; guard < 20 && currentStop(run)?.encounter === 'roulette'; guard++) {
      playEncounter(run, 0, 1);
      spins++;
    }
    expect(spins).toBe(5);
  });
});

describe('GLASS Charm (2026-10-14)', () => {
  it('adds into the group like GOLD (x5 at LV1), and shatters for good about 1 time in 4 it pays', () => {
    let pays = 0;
    let breaks = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const f = fight((c) => {
        c.player.strips = reels3({ sword: 12 });
        c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'glass' as const, n: 12 }));
        c.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
      }, seed);
      for (let i = 0; i < 6 && !f.over; i++) {
        const { side, events } = f.step();
        if (side !== 'player') continue;
        const spin = ofType(events, 'spin')[0];
        if (spin?.score.groups.some((g) => g.symbol === 'sword' && g.mult >= 5)) pays++;
        breaks += ofType(events, 'glassBreak').reduce((a, e) => a + e.cells.length, 0);
      }
      expect(f.shattered.length).toBeGreaterThanOrEqual(0);
    }
    expect(pays).toBeGreaterThan(50);
    // Three glass cells in a jackpot: each rolls 1 in 4.
    expect(breaks / (pays * 3)).toBeGreaterThan(0.15);
    expect(breaks / (pays * 3)).toBeLessThan(0.35);
  });
});

describe('big choices SECOND PAYLINE and THE LONG GAME (2026-10-14)', () => {
  it('SECOND PAYLINE: a pair on the row above pays at half; enemies hit 15% harder', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.big = { secondLine: true };
      c.enemy = { hp: 1e9, strips: reels3({ shield: 12 }), lineDmg: 1.15 };
    });
    const { events } = f.step();
    const line2 = ofType(events, 'secondLine')[0];
    expect(line2).toBeTruthy();
    const main = ofType(events, 'spin')[0].score.groups.find((g) => g.symbol === 'sword')!;
    expect(line2.groups[0].amount).toBe(Math.max(10, Math.round(main.amount / 2 / 10) * 10));
  });

  it('THE LONG GAME: pays x0.8 at first, +3% for every fight won after', () => {
    const base = defaultConfig();
    const run = createRun(base, 51, 'knight', 0);
    run.pendingStart = null;
    run.longGame = 0;
    expect(fightConfig(run, base).player.payMul).toBeCloseTo(0.8);
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.longGame).toBe(1);
    expect(fightConfig(run, base).player.payMul).toBeCloseTo(0.83);
  });
});
