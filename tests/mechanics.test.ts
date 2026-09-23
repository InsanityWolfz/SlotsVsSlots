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
  it('ice freezes the least useful reels; frozen reels do not move next spin', () => {
    const f = vs({ sword: 4, ice: 8 });
    f.forceNext('player', ['sword', 'shield', 'bolt']);
    f.step();
    f.forceNext('enemy', ['ice', 'ice', 'sword']);
    const [fr] = ofType(f.step().events, 'freeze');
    expect(fr.targets).toHaveLength(2);
    expect(fr.turns).toBe(2);
    // Lowest-value payline symbols get frozen: shield (reel 2) and bolt (reel 3), not the sword.
    expect(fr.targets).toEqual([1, 2]);
    const before = f.sides.player.reels.map((r) => r.stop);
    const { events } = f.step();
    const [spin] = ofType(events, 'spin');
    expect(spin.frozen).toEqual([false, true, true]);
    expect(spin.stops[1]).toBe(before[1]);
    expect(spin.stops[2]).toBe(before[2]);
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
    f.forceNext('enemy', ['lock', 'sword', 'shield']);
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
    expect(j.inserts.length).toBe(3); // jackpot → 3 rocks
    const total = f.sides.player.reels.reduce((a, r) => a + r.cells.length, 0);
    expect(total).toBe(36 + 3);
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

  it('coins grow the pot; the House cashes it out on its ability', () => {
    const f = boss();
    f.forceNext('player', ['shield', 'bolt', 'sword']);
    f.step();
    f.forceNext('enemy', ['coin', 'coin', 'coin']);
    const e1 = f.step().events;
    expect(ofType(e1, 'pot')[0].total).toBe(9);
    f.forceNext('player', ['bolt', 'shield', 'bolt']);
    f.step();
    f.forceNext('enemy', ['sword', 'coin', 'sword']);
    const e2 = f.step().events;
    const [cash] = ofType(e2, 'potWin');
    expect(cash.from).toBe('enemy');
    expect(cash.amount).toBe(10);
    expect(f.pot).toBe(0);
  });

  it('a player jackpot steals the pot, ignoring shield', () => {
    const f = boss();
    f.step();
    f.forceNext('enemy', ['coin', 'coin', 'coin']);
    f.step();
    f.forceNext('player', ['shield', 'shield', 'shield']);
    const [win] = ofType(f.step().events, 'potWin');
    expect(win).toMatchObject({ from: 'player', amount: 9, blocked: 0 });
    expect(f.pot).toBe(0);
  });
});
