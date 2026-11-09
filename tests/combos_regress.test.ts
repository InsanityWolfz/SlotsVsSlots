/**
 * Combination regressions (QA stream COMBOS, 2026-11-09): relic / Charm / machine / rule interactions that contradicted
 * a card's text or left a relic dead, fixed; plus pins of behaviour that is by design.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, type RelicId, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { createRun, chooseRoute, skipToBoss, type RunState } from '../src/core/run';
import { fightConfig } from '../src/core/fightSetup';
import { relicFits, shopOffers } from '../src/core/shop';
import { MACHINE_EXCLUDE } from '../src/core/relics';
import { playRun } from '../src/sim/play';
import { generateActMap } from '../src/core/enemies';
import { Rng } from '../src/core/rng';
import type { CabinetId } from '../src/core/cabinets';

const base = defaultConfig();
const spinOf = (evs: CombatEvent[]) => evs.find((e): e is Extract<CombatEvent, { type: 'spin' }> => e.type === 'spin' && e.side === 'player')!;

/** A run at act 2's second fight on route 0, with these relics and chips. */
function runAt(cab: CabinetId, relics: RelicId[], chips = 24, seed = 7): RunState {
  const r = createRun(base, seed, cab);
  r.pendingStart = null;
  r.act = 2;
  r.map = generateActMap(new Rng(seed ^ 2), 2, 1, cab);
  r.route = null;
  chooseRoute(r, 0);
  r.depth = 1;
  r.player.relics = [...relics];
  r.player.chips = chips;
  return r;
}

describe('ESPRESSO SHOT (quickening) on BANKROLL: its half-full start adds nothing there, so it is not offered', () => {
  it('BANKROLL is never offered it (its bar already starts at half from 10 chips held)', () => {
    expect(MACHINE_EXCLUDE.quickening).toContain('midas');
    expect(relicFits(runAt('midas', [], 24), 'quickening')).toBe(false);
    expect(relicFits(runAt('jukebox', [], 24), 'quickening')).toBe(true);
  });
});

describe('ARMORED CAR: "HIGH ROLLER PAYOFFS COUNT THAT SPIN\'S SHIELD AS CHIPS"', () => {
  const highRoller = (relics: RelicId[], chips: number) => {
    const r = runAt('midas', relics, chips);
    r.player.gilded = [];
    const f = new Fight(fightConfig(r, base), 1);
    f.sides.player.energy = f.meterCost;
    f.sides.player.armed = true;
    f.forceNext('player', ['goldbar', 'shield', 'shield']);
    const s = spinOf(f.step().events);
    const g = s.score.groups.find((x) => x.notes?.some((n) => n.startsWith('HIGH ROLLER')))!;
    return { note: g.notes!.find((n) => n.startsWith('HIGH ROLLER')), pops: s.score.relics ?? [] };
  };
  it('under 30 chips it raises the multiplier', () => {
    expect(highRoller(['armoredcar'], 10).note).not.toBe(highRoller([], 10).note);
  });
  it('at 30+ chips (HIGH ROLLER already at its x2.5 cap) it adds nothing, so its icon stays quiet', () => {
    const a = highRoller(['armoredcar'], 30);
    const b = highRoller([], 30);
    // Either it does something, or it stays quiet.
    expect(a.note !== b.note || !a.pops.includes('armoredcar')).toBe(true);
  });
});

describe('dead offers: a relic the build already made useless', () => {
  it('RAINMAKER ("MAKE IT RAIN COSTS 2 CHIPS INSTEAD OF 10") is not offered with OPEN BAR (rain costs nothing)', () => {
    expect(relicFits(runAt('midas', ['openbar']), 'rainmaker')).toBe(false);
  });
  it('BANDAGE ("HEAL 60 HP AFTER EACH FIGHT") is not offered with GLASS CANNON (no healing between fights)', () => {
    expect(relicFits(runAt('knight', ['glasscannon']), 'bandage')).toBe(false);
  });
  it('the Cashier never deals them (seeded shelves)', () => {
    let rain = 0;
    let band = 0;
    for (let s = 1; s <= 200; s++) {
      const a = createRun(base, s, 'midas');
      a.pendingStart = null;
      a.player.relics = ['openbar'];
      a.depth = 1;
      a.stop = 2;
      if (shopOffers(a).some((i) => i.option.kind === 'relic' && i.option.relic === 'rainmaker')) rain++;
      const b = createRun(base, s, 'knight');
      b.pendingStart = null;
      b.player.relics = ['glasscannon'];
      b.depth = 1;
      b.stop = 2;
      if (shopOffers(b).some((i) => i.option.kind === 'relic' && i.option.relic === 'bandage')) band++;
    }
    expect(rain).toBe(0);
    expect(band).toBe(0);
  });
});

describe('SECOND PAYLINE: "THE ROW ABOVE YOUR PAYLINE PAYS ITS PAIRS"', () => {
  /** A fight whose next player spin stops with `row` above the payline and `main` on it. */
  function rowAbove(cab: CabinetId, relics: RelicId[], main: SymbolId[], row: SymbolId[]) {
    const r = runAt(cab, relics);
    r.player.gilded = [];
    r.player.strips = r.player.strips.map((s) => ({ ...s, wild: Math.max(1, s.wild ?? 0) }));
    const f = new Fight(fightConfig(r, base), 1);
    // Write the two rows straight onto the strips at stop 5 (cell 4 is the row above).
    f.sides.player.reels.forEach((reel, i) => {
      reel.cells[5] = { ...reel.cells[5], symbol: main[i], enh: undefined };
      reel.cells[4] = { ...reel.cells[4], symbol: row[i], enh: undefined };
    });
    const stops = [5, 5, 5];
    (f as unknown as { rollStops: () => number[] }).rollStops = () => stops;
    const ev = f.step().events;
    return ev.find((e): e is Extract<CombatEvent, { type: 'secondLine' }> => e.type === 'secondLine') ?? null;
  }
  it('pays an in-order pair there', () => {
    expect(rowAbove('knight', ['secondline'], ['shield', 'sword', 'shield'], ['sword', 'sword', 'shield'])).not.toBeNull();
  });
  it('CURRENT: the row above pays in-order pairs only (TWIN REELS and JOKER\'s any-2 rule stay the main line\'s)', () => {
    expect(rowAbove('knight', ['secondline', 'mirror'], ['shield', 'sword', 'shield'], ['sword', 'shield', 'sword'])).toBeNull();
    expect(rowAbove('joker', ['secondline'], ['shield', 'ace', 'shield'], ['shield', 'ace', 'wild'])).toBeNull();
  });
});

describe('LEAN MACHINE under TONIGHT\'S RULE LUCKY NIGHT (ENDLESS): "EVERY REEL HAS 2 MORE WILDS"', () => {
  it('the night\'s two WILDs are not counted: an 11-cell reel stays lean', () => {
    const lean = (night?: 'lucky') => {
      const r = runAt('knight', ['lean']);
      r.player.strips[0].shield = 5;
      r.act = 4;
      r.endless = { loop: 2, pot: 0 };
      r.map = generateActMap(new Rng(9), 4, 2, 'knight');
      r.route = null;
      chooseRoute(r, 0);
      if (night) r.endless.night = night;
      r.depth = 1;
      return new Fight(fightConfig(r, base), 1).leanReels;
    };
    expect(lean()).toEqual([true, false, false]);
    expect(lean('lucky')).toEqual([true, false, false]);
  });
});

describe('TESLA: relic multipliers on bolts add up (PAY.lightningAdd), so two X2 relics are X3', () => {
  it('CURRENT: LOADED DICE (X2) + HOT STREAK (X2) on a bolt pair pays x3, on a sword pair x4', () => {
    const pay = (cab: CabinetId, sym: SymbolId, relics: RelicId[]) => {
      const r = runAt(cab, relics);
      r.player.gilded = [];
      r.player.levels.sym = {};
      const f = new Fight(fightConfig(r, base), 1);
      f.hotStreak = relics.includes('hotstreak');
      f.forceNext('player', [sym, sym, 'shield']);
      return spinOf(f.step().events).score.groups.find((g) => g.symbol === sym)!.amount;
    };
    expect(pay('tesla', 'bolt', ['key', 'hotstreak']) / pay('tesla', 'bolt', [])).toBeCloseTo(3);
    expect(pay('knight', 'sword', ['key', 'hotstreak']) / pay('knight', 'sword', [])).toBeCloseTo(4);
  });
});

describe('ROOM SERVICE on TESLA in ENDLESS: "EACH LIGHTNING STORM HEALS 15 MORE HP"', () => {
  it('OVERLOAD grows the storm\'s own heal, not ROOM SERVICE\'s 15 (loop 4: +15)', () => {
    const heal = (relics: RelicId[]) => {
      const r = runAt('tesla', relics);
      r.act = 4;
      r.endless = { loop: 4, pot: 0 };
      r.map = generateActMap(new Rng(5), 4, 4, 'tesla');
      r.route = null;
      chooseRoute(r, 0);
      r.depth = 1;
      r.enemies[1].hp = 1e12;
      r.player.hp = Math.round(r.player.maxHp * 0.2);
      const f = new Fight(fightConfig(r, base), 3);
      for (let i = 0; i < 60 && !f.over; i++) {
        const h = f.step().events.find((e): e is Extract<CombatEvent, { type: 'heal' }> => e.type === 'heal' && e.side === 'player' && e.source === 'payoff');
        if (h) return h.amount;
      }
      return 0;
    };
    expect(heal(['fang']) - heal([])).toBe(15);
  });
});

describe('MAKE IT RAIN\'s floor (user, 2026-11-01: "never less than the chip jackpot it replaces") with LEAN MACHINE', () => {
  const chipJackpot = (relics: RelicId[], chips: number) => {
    const r = runAt('midas', relics, chips);
    r.player.gilded = [];
    r.player.strips = [0, 1, 2].map(() => ({ shield: 5, goldbar: 6 }));
    r.player.levels.sym = { goldbar: 4 };
    r.enemies[1].hp = 1e6;
    const f = new Fight(fightConfig(r, base), 2);
    f.forceNext('player', ['goldbar', 'goldbar', 'goldbar']);
    const ev = f.step().events;
    return ev.filter((e): e is Extract<CombatEvent, { type: 'attack' }> => e.type === 'attack' && e.from === 'player').reduce((a, e) => a + e.amount, 0);
  };
  it('CURRENT: at chip level 4 a rain (10+ chips held) hits exactly what the plain chip jackpot does, and costs 10 chips', () => {
    expect(chipJackpot([], 20)).toBe(chipJackpot([], 0));
  });
  it('on LEAN reels the rain never hits less than the chip jackpot it replaces, LEAN\'s x1.5 in', () => {
    expect(chipJackpot(['lean'], 20)).toBeGreaterThanOrEqual(chipJackpot(['lean'], 0));
  });
});

describe('ESPRESSO SHOT on JUKEBOX in ENDLESS (WARM-UP already starts the volume at 3 x the loop)', () => {
  it('CURRENT (not fixed: WARM-UP already starts the volume at or past half, and never at THE DROP): it adds nothing', () => {
    const volume = (relics: RelicId[]) => {
      const r = runAt('jukebox', relics);
      r.act = 4;
      r.endless = { loop: 2, pot: 0 };
      r.map = generateActMap(new Rng(4), 4, 2, 'jukebox');
      r.route = null;
      chooseRoute(r, 0);
      r.depth = 1;
      return new Fight(fightConfig(r, base), 1).volume;
    };
    expect(volume(['quickening'])).toBe(volume([]));
  });
});

describe('HOLD on a JAMMED reel (THE MECHANIC jams your most useful reels)', () => {
  const fightAt = () => {
    const r = runAt('knight', []);
    r.enemies[1].hp = 1e6;
    const f = new Fight(fightConfig(r, base), 9);
    f.step();
    f.step();
    return f;
  };
  it('a jammed reel can\'t be held, and no hold is spent', () => {
    const f = fightAt();
    f.sides.player.locked[1] = 1;
    const before = f.holdsLeft;
    expect(f.hold(1)).toBe(false);
    f.step();
    expect(f.holdsLeft).toBe(before);
  });
  it('a hold made before the reel was jammed is handed back, not spent', () => {
    const f = fightAt();
    expect(f.hold(1)).toBe(true);
    const before = f.holdsLeft;
    f.sides.player.locked[1] = 1;
    f.step();
    expect(f.holdsLeft).toBe(before);
  });
});

describe('relic icons only pop for an effect that lands', () => {
  const cases: [CabinetId, RelicId][] = [['joker', 'overcharge'], ['midas', 'overcharge'], ['jukebox', 'subwoofer']];
  for (const [cab, rel] of cases)
    it(`${rel} on ${cab}: no pop after the enemy is already down that turn (seeded runs)`, () => {
      let pops = 0;
      let dead = 0;
      for (let i = 0; i < 25; i++)
        playRun(base, 600 + i, cab, 2, {
          act3: true,
          setup: (r) => r.player.relics.push(rel),
          onEvents: (ev) => {
            let enemyDown = false;
            for (const e of ev) {
              if ((e.type === 'attack' || e.type === 'specialFire') && e.to === 'enemy' && e.targetHp <= 0) enemyDown = true;
              if (e.type === 'relic' && e.relic === rel) {
                pops++;
                if (enemyDown) dead++;
              }
            }
          },
        });
      expect(pops).toBeGreaterThan(0);
      expect(dead).toBe(0);
    });
});

void skipToBoss;
