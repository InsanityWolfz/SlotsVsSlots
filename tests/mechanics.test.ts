import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type AbilityDef, type GameConfig, type RelicId, type StripCounts } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { indexAtRow, insertOffscreen, buildReel } from '../src/core/strip';
import { Rng } from '../src/core/rng';

const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function vs(enemy: StripCounts, opts: { relics?: RelicId[]; ability?: AbilityDef; hp?: number; mut?: (c: GameConfig) => void } = {}): Fight {
  const c = defaultConfig();
  c.enemy = { hp: opts.hp ?? 60, strips: reels3(enemy), ability: opts.ability ?? null };
  c.relics = opts.relics ?? [];
  opts.mut?.(c);
  return new Fight(c, 1234);
}

describe('enemy writers', () => {
  it('ice freezes the least useful reels after clunking them to their worst visible cell', () => {
    const f = vs({ sword: 4, ice: 8 });
    f.forceNext('player', ['sword', 'shield', 'bolt']);
    f.step();
    f.forceNext('enemy', ['ice', 'ice', 'sword']);
    const [fr] = ofType(f.step().events, 'freeze');
    expect(fr.targets).toHaveLength(2);
    expect(fr.turns).toBe(2);
    // Bolt is the most valuable (value 3), so it's never the one frozen in place.
    expect(fr.targets).not.toContain(2);
    const { events } = f.step();
    const [spin] = ofType(events, 'spin');
    fr.targets.forEach((r, i) => {
      expect(spin.frozen[r]).toBe(true);
      expect(spin.stops[r]).toBe(fr.stops[i]);
    });
  });

  it('freeze never holds a reels 1+2 match (no free doubles) and never all 3 reels', () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = defaultConfig();
      c.enemy = { hp: 60, strips: reels3({ ice: 12 }) };
      const f = new Fight(c, seed);
      f.forceNext('player', ['bolt', 'bolt', 'bolt']);
      f.step();
      f.forceNext('enemy', ['ice', 'ice', 'ice']);
      f.step();
      const pl = f.sides.player;
      if (pl.frozen[0] > 0 && pl.frozen[1] > 0) {
        const sym = (r: number) => pl.reels[r].cells[pl.reels[r].stop];
        expect(sym(0).symbol === sym(1).symbol && !sym(0).slimed).toBe(false);
      }
      expect(pl.frozen.filter((t) => t > 0).length).toBeLessThanOrEqual(2);
    }
  });

  it('freeze wears off after its turns and emits thaw', () => {
    const f = vs({ sword: 4, ice: 8 });
    f.step();
    f.forceNext('enemy', ['ice', 'sword', 'shield']); // single ice: 1 reel, 1 turn
    f.step();
    const { events } = f.step();
    expect(ofType(events, 'thaw')[0]).toMatchObject({ status: 'frozen' });
    expect(f.sides.player.frozen.every((t) => t === 0)).toBe(true);
  });

  it('a jammed reel scores nothing for one turn', () => {
    const f = vs({ sword: 4, lock: 8 });
    f.step();
    f.forceNext('enemy', ['lock', 'lock', 'sword']);
    const [lk] = ofType(f.step().events, 'lock');
    expect(lk.targets).toHaveLength(1);
    const r = lk.targets[0];
    const { events } = f.step();
    const [spin] = ofType(events, 'spin');
    expect(spin.locked[r]).toBe(true);
    expect(spin.score.line[r]).toBe('lock');
    expect(ofType(events, 'fizzle').some((e) => e.reels.includes(r))).toBe(true);
  });

  it('claw steals the best visible symbols and they score as empty', () => {
    const f = vs({ sword: 4, claw: 8 });
    f.step();
    f.forceNext('enemy', ['claw', 'claw', 'sword']); // pair → 2 cells
    const [st] = ofType(f.step().events, 'steal');
    expect(st.cells).toHaveLength(2);
    for (const ref of st.cells) expect(f.sides.player.reels[ref.reel].cells[ref.index].stolen).toBe(true);
    // Took the most valuable ones available.
    expect(st.symbols.every((s) => s === 'sword' || s === 'bolt')).toBe(true);
  });

  it('rocks are inserted off-screen without changing what is visible', () => {
    const rng = new Rng(9);
    for (let trial = 0; trial < 200; trial++) {
      const reel = buildReel({ sword: 4, shield: 4, bolt: 4 }, rng);
      reel.stop = rng.int(reel.cells.length);
      const vis = [0, 1, 2].map((row) => reel.cells[indexAtRow(reel, row)]);
      const at = insertOffscreen(reel, { symbol: 'rock', slimed: false }, rng);
      expect(reel.cells[at].symbol).toBe('rock');
      expect([0, 1, 2].map((row) => reel.cells[indexAtRow(reel, row)])).toEqual(vis);
    }
  });

  it('golem rocks grow the player strip', () => {
    const f = vs({ sword: 4, rock: 8 });
    f.step();
    f.forceNext('enemy', ['rock', 'rock', 'rock']);
    const [j] = ofType(f.step().events, 'junk');
    expect(j.inserts.length).toBe(2); // jackpot → 2 rocks
    const total = f.sides.player.reels.reduce((a, r) => a + r.cells.length, 0);
    expect(total).toBe(36 + 2);
  });

  it('single rocks and single locks fizzle', () => {
    for (const sym of ['rock', 'lock'] as const) {
      const f = vs({ sword: 4, [sym]: 8 });
      f.step();
      f.forceNext('enemy', [sym, 'sword', 'shield']);
      const { events } = f.step();
      expect(ofType(events, 'fizzle').some((e) => e.symbol === sym)).toBe(true);
      expect(ofType(events, 'junk')).toHaveLength(0);
      expect(ofType(events, 'lock')).toHaveLength(0);
    }
  });
});

describe('enemy abilities (telegraphed)', () => {
  it('charges once per enemy turn and fires on the Nth', () => {
    const f = vs({ sword: 1, shield: 11 }, { ability: { kind: 'smash', every: 3, power: 5 } });
    const charges: number[] = [];
    let fired = 0;
    for (let i = 0; i < 6; i++) {
      const { events, side } = f.step();
      if (side !== 'enemy') continue;
      const last = ofType(events, 'abilityCharge').at(-1)!;
      charges.push(last.charge);
      fired += ofType(events, 'ability').length;
    }
    expect(charges).toEqual([1, 2, 0]);
    expect(fired).toBe(1);
  });

  it('hourglass slows the charge by one', () => {
    const f = vs({ sword: 1, shield: 11 }, { ability: { kind: 'smash', every: 3, power: 5 }, relics: ['hourglass'] });
    expect(f.sides.enemy.ability!.every).toBe(4);
  });
});

describe('relics', () => {
  it('battery starts with 3 energy', () => {
    expect(vs({ sword: 12 }, { relics: ['battery'] }).sides.player.energy).toBe(3);
  });

  it('mirror makes reels 2+3 a double', () => {
    const f = vs({ sword: 12 }, { relics: ['mirror'] });
    f.forceNext('player', ['shield', 'sword', 'sword']);
    const [spin] = ofType(f.step().events, 'spin');
    expect(spin.score.tier).toBe('pair');
    expect(spin.score.totals.sword).toBe(4);
  });

  it('whetstone adds +3 to sword doubles', () => {
    const f = vs({ shield: 12 }, { relics: ['whetstone'] });
    f.forceNext('player', ['sword', 'sword', 'bolt']);
    const [atk] = ofType(f.step().events, 'attack');
    expect(atk.amount).toBe(7);
  });

  it('fang heals when the special fires', () => {
    const f = vs({ sword: 12 }, { relics: ['fang'], mut: (c) => (c.player.startHp = 10) });
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const [h] = ofType(f.step().events, 'heal');
    expect(h).toMatchObject({ amount: 3, hp: 13, source: 'fang' });
  });

  it('magnet turns rocks on your payline into energy', () => {
    const c = defaultConfig();
    c.player.strips = reels3({ sword: 4, rock: 8 });
    c.enemy = { hp: 60, strips: reels3({ shield: 12 }) };
    c.relics = ['magnet'];
    const f = new Fight(c, 5);
    f.forceNext('player', ['rock', 'rock', 'sword']);
    const [en] = ofType(f.step().events, 'energyGain');
    expect(en.amount).toBe(4);
  });

  it('clover sometimes converts a near-miss into a jackpot (and only then)', () => {
    let lucky = 0;
    let trials = 0;
    for (let s = 0; s < 400; s++) {
      const c = defaultConfig();
      c.enemy = { hp: 60, strips: reels3({ shield: 12 }) };
      c.relics = ['clover'];
      const f = new Fight(c, s);
      f.forceNext('player', ['sword', 'sword', 'shield']);
      const [spin] = ofType(f.step().events, 'spin');
      trials++;
      if (spin.lucky) {
        lucky++;
        expect(spin.score.tier).toBe('triple');
      } else expect(spin.score.tier).toBe('pair');
    }
    expect(lucky / trials).toBeGreaterThan(0.2);
    expect(lucky / trials).toBeLessThan(0.4);
  });

  it('soap lets a slime double cleanse', () => {
    const f = vs({ shield: 12 }, { relics: ['soap'] });
    f.sides.player.reels.forEach((r) => r.cells.forEach((c, i) => (c.slimed = i < 6)));
    f.forceNext('player', ['slime', 'slime', 'sword']);
    expect(ofType(f.step().events, 'cleanse')).toHaveLength(1);
  });
});

describe('boss: the progressive pot', () => {
  const boss = (mut?: (c: GameConfig) => void) =>
    vs({ sword: 2, coin: 10 }, { ability: { kind: 'jackpot', every: 2, power: 1 }, mut: (c) => ((c.enemy.boss = 'house'), mut?.(c)) });

  it('the pot is seeded, grows with coins and the house cut, and is cashed out at you', () => {
    const f = boss();
    expect(f.pot).toBe(5);
    f.forceNext('player', ['shield', 'bolt', 'sword']);
    f.step();
    f.forceNext('enemy', ['coin', 'coin', 'coin']);
    const pots = ofType(f.step().events, 'pot');
    expect(pots[0].total).toBe(14); // 5 seed + 9 coins
    expect(pots.at(-1)!.total).toBe(15); // + the house's cut
    f.forceNext('player', ['bolt', 'shield', 'bolt']);
    f.step();
    const before = f.pot;
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const [cash] = ofType(f.step().events, 'potWin');
    expect(cash.from).toBe('enemy');
    expect(cash.amount).toBe(before + 1);
    expect(f.pot).toBe(0);
  });

  it('a player jackpot steals the pot, ignoring shield; crown steals on doubles', () => {
    const f = boss();
    f.step();
    f.forceNext('enemy', ['coin', 'coin', 'coin']);
    f.step();
    f.forceNext('player', ['shield', 'shield', 'shield']);
    const [win] = ofType(f.step().events, 'potWin');
    expect(win).toMatchObject({ from: 'player', amount: 15, blocked: 0 });
    expect(f.pot).toBe(0);

    const g = boss((c) => (c.relics = ['crown']));
    g.forceNext('player', ['shield', 'shield', 'bolt']);
    expect(ofType(g.step().events, 'potWin')[0]).toMatchObject({ from: 'player', amount: 5 });
  });

  it('at half HP the House goes ALL IN and doubles the pot', () => {
    const f = boss((c) => (c.enemy.hp = 18));
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const [ph] = ofType(f.step().events, 'phase');
    expect(f.allIn).toBe(true);
    expect(ph.pot).toBe(10);
  });
});

describe('counter relics', () => {
  it('mittens: a single ice does nothing', () => {
    const f = vs({ sword: 4, ice: 8 }, { relics: ['mittens'] });
    f.step();
    f.forceNext('enemy', ['ice', 'sword', 'shield']);
    const { events } = f.step();
    expect(ofType(events, 'resist')[0]).toMatchObject({ relic: 'mittens' });
    expect(ofType(events, 'freeze')).toHaveLength(0);
  });

  it('lockpick and mousetrap each fail roughly half the time; mousetrap snaps the thief', () => {
    let jams = 0;
    let steals = 0;
    let snaps = 0;
    for (let seed = 0; seed < 300; seed++) {
      const a = new Fight({ ...defaultConfig(), enemy: { hp: 60, strips: reels3({ lock: 12 }) }, relics: ['lockpick'] }, seed);
      a.step();
      a.forceNext('enemy', ['lock', 'lock', 'lock']);
      jams += ofType(a.step().events, 'lock').reduce((n, e) => n + e.targets.length, 0);
      const b = new Fight({ ...defaultConfig(), enemy: { hp: 60, strips: reels3({ claw: 12 }) }, relics: ['mousetrap'] }, seed);
      b.step();
      b.forceNext('enemy', ['claw', 'sword', 'shield']);
      const hpBefore = b.sides.enemy.hp;
      const ev = b.step().events;
      steals += ofType(ev, 'steal').reduce((n, e) => n + e.cells.length, 0);
      snaps += ofType(ev, 'resist').length;
      if (ofType(ev, 'resist').length) expect(b.sides.enemy.hp).toBe(hpBefore - 3);
    }
    expect(jams / 600).toBeGreaterThan(0.35);
    expect(jams / 600).toBeLessThan(0.65);
    expect(steals / 300).toBeGreaterThan(0.35);
    expect(snaps / 300).toBeGreaterThan(0.35);
  });

  it('pickaxe: rocks on your payline hit; dice: jackpots pay x4', () => {
    const c = defaultConfig();
    c.player.strips = reels3({ sword: 4, rock: 8 });
    c.enemy = { hp: 60, strips: reels3({ bolt: 12 }) };
    c.relics = ['pickaxe'];
    const f = new Fight(c, 5);
    f.forceNext('player', ['rock', 'rock', 'sword']);
    expect(ofType(f.step().events, 'attack').map((e) => e.amount)).toEqual([4, 1]);

    const d = vs({ shield: 12 }, { relics: ['dice'] });
    d.forceNext('player', ['bolt', 'bolt', 'bolt']);
    expect(ofType(d.step().events, 'energyGain')[0].amount).toBe(12);
  });
});
