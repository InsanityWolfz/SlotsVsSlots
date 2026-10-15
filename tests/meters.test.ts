import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import { actLength, generateActMap } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight, RAIN } from '../src/core/fight';
import { SANDGLASS_SLOW } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import { applyOption, charmOptions, createRun, enemyHp, fightConfig, levelOptions, levelsGained, chooseRoute } from '../src/core/run';
import { symValue } from '../src/core/charms';
import { STAKE } from '../src/core/stakes';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A fight on a slot machine with a punching-bag enemy. */
function on(cabinet: CabinetId, mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  mut?.(c);
  return new Fight(c, seed);
}

describe('signature meters (one per slot machine)', () => {
  it('KNIGHT has no meter; MIDAS / JAX bolts would do nothing (the lightning is TESLA only)', () => {
    const k = on('knight', (c) => (c.player.strips = reels3({ sword: 4, shield: 4, bolt: 4 })));
    expect(k.meter).toBeNull();
    expect(k.special).toBe(false);
    k.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const ev = k.step().events;
    expect(ofType(ev, 'energyGain')).toHaveLength(0);
    expect(ofType(ev, 'fizzle').length).toBeGreaterThan(0);
    expect(on('tesla').special).toBe(true);
  });

  it('CASH CASSIDY HIGH ROLLER: pre-fills from chips held; chip symbols hit, fill it and pay chips; full, the next paying group multiplies', () => {
    const f = on('midas');
    f.sides.player.hp = 100;
    const start = f.sides.player.energy;
    f.forceNext('player', ['goldbar', 'goldbar', 'shield']);
    const evs = f.step().events;
    const chips = ofType(evs, 'midasChips')[0];
    expect(chips.amount).toBe(2 - RAIN.chipLess); // a chip pair pays 1
    expect(ofType(evs, 'attack').some((a) => a.from === 'player')).toBe(true); // chips are his weapon
    expect(f.sides.player.energy).toBeGreaterThan(start);
    f.sides.player.energy = f.meterCost;
    f.sides.player.armed = true;
    f.step();
    f.forceNext('player', ['goldbar', 'goldbar', 'shield']);
    const spin = ofType(f.step().events, 'spin')[0];
    expect(spin.score.groups.some((g) => g.notes?.some((n) => n.startsWith('HIGH ROLLER X')))).toBe(true);
  });

  it('JAX: each WILD on the payline fills the meter; full, the next spin pays every cell as a jackpot of itself', () => {
    const f = on('joker', (c) => (c.player.strips = reels3({ sword: 4, shield: 4, wild: 4 })));
    f.sides.player.energy = 60;
    f.forceNext('player', ['wild', 'shield', 'wild']);
    f.step();
    expect(f.sides.player.armed).toBe(true);
    f.step();
    f.forceNext('player', ['sword', 'shield', 'sword']);
    const ev = f.step().events;
    expect(ofType(ev, 'payoff')[0].kind).toBe('jackpots');
    const s = ofType(ev, 'spin')[0].score;
    expect(s.jackpots).toBe(true);
    expect(s.groups.map((g) => [g.symbol, g.amount])).toEqual([
      ['sword', 90],
      ['shield', 90],
      ['sword', 90],
    ]);
  });

  it('3 WILDS: a bonus reel picks one of your symbols and the line pays its jackpot', () => {
    const f = on('knight', (c) => (c.player.strips = reels3({ sword: 4, shield: 4, wild: 4 })));
    f.forceNext('player', ['wild', 'wild', 'wild']);
    const s = ofType(f.step().events, 'spin')[0].score;
    expect(['sword', 'shield']).toContain(s.wildPick);
    expect(s.tier).toBe('triple');
    expect(s.groups[0].symbol).toBe(s.wildPick);
  });

  it('the Golden Hourglass slows enemy abilities by 1 turn', () => {
    expect(SANDGLASS_SLOW).toBe(1);
  });
});

describe('charm and level cards', () => {
  it('charm cards only target plain cells, and only when there are enough of them', () => {
    const run = createRun(base, 3, 'knight');
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 6 }]; // 6 gold swords on reel 1: no plain swords there
    const opts = charmOptions(run, 2);
    expect(opts.some((o) => o.kind === 'gild' && o.reel === 0 && o.symbol === 'sword')).toBe(false);
    expect(opts.some((o) => o.kind === 'gild' && o.reel === 1 && o.symbol === 'sword')).toBe(true);
    // TESLA-only charms never show up for the others.
    expect(opts.some((o) => o.kind === 'gild' && (o.enh === 'charged' || o.enh === 'blaze'))).toBe(false);
  });

  it('no charm level cards; symbol level cards have no cap; the Cashier\'s level price climbs; STAR CHART doubles them', () => {
    const run = createRun(base, 3, 'knight');
    run.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'keen', n: 1 });
    expect(levelOptions(run).some((o) => o.kind === 'charmLevel')).toBe(false);
    run.player.levels.sym.sword = 9;
    expect(levelOptions(run).some((o) => o.kind === 'symLevel' && o.symbol === 'sword')).toBe(true);
    // Levels gained over the start (KNIGHT: swords 3, shields 2).
    expect(levelsGained(run)).toBe(6);
    applyOption(run, { kind: 'symLevel', symbol: 'sword' });
    expect(run.player.levels.sym.sword).toBe(10);
    run.player.relics.push('starchart');
    applyOption(run, { kind: 'symLevel', symbol: 'sword' });
    expect(run.player.levels.sym.sword).toBe(12);
    expect(symValue(12)).toBe(10 + 6 * 11);
  });
});


describe('act 3', () => {
  it("act 3's HP curve has 5 steps; honest HP: your build doesn't change an enemy's HP, and every machine meets the same", () => {
    expect(actLength(3)).toBe(5);
    const run = createRun(base, 7, 'knight', STAKE.act3, true);
    run.act = 3;
    run.map = generateActMap(new Rng(2), 3);
    run.route = null;
    chooseRoute(run, 0);
    const weak = enemyHp(run, run.enemies[1]);
    run.player.levels = { sym: { sword: 3, shield: 3 }, charm: { gold: 3 } };
    run.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'gold' as const, n: 6 }));
    run.player.relics = ['key', 'bell'];
    expect(enemyHp(run, run.enemies[1])).toBe(weak);
    for (const cab of ['tesla', 'joker', 'midas', 'jukebox'] as const) expect(enemyHp({ ...run, cabinet: cab }, run.enemies[1])).toBe(weak);
  });

});
