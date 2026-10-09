import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import { actLength, generateRunPaths } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight, RAIN, THORNS } from '../src/core/fight';
import { SANDGLASS_SLOW } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import {
  charmOptions,
  createRun,
  enemyHp,
  fightConfig,
  finishFight,
  levelOptions,
  machinePower,
  takeChoice,
  type RunState,
  BIG_CARDS,
  SAFE_CHOICES,
} from '../src/core/run';
import { STAKE } from '../src/core/stakes';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A fight on a slot machine with a punching-bag enemy. */
function on(cabinet: CabinetId, mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.bonusSymbols = false;
  mut?.(c);
  return new Fight(c, seed);
}

describe('signature meters (one per slot machine)', () => {
  it('KNIGHT has no meter; MIDAS / BRIAR / JAX bolts would do nothing (the lightning is TESLA only)', () => {
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
  it('BRIAR SHED: each of her spins, half her thorns lash out (through shields)', () => {
    const f = on('thorn');
    f.sides.player.energy = 100;
    f.sides.enemy.shield = 999;
    f.forceNext('player', ['shield', 'shield', 'shield']);
    const shed = ofType(f.step().events, 'attack').filter((a) => a.note === 'thorns');
    expect(shed).toHaveLength(1);
    expect(shed[0].amount).toBe(50);
    expect(shed[0].hpDamage).toBe(50);
    expect(f.sides.player.energy).toBe(50);
  });

  it('BRIAR: thorns bank their pay; a hit that gets through fires the bank through shields (once per turn), a blocked one does not', () => {
    // (The hit-through volley on its own: SHED off.)
    const shed = THORNS.shed;
    THORNS.shed = 0;
    try {
    const f = on('thorn');
    f.forceNext('player', ['thorn', 'thorn', 'shield']);
    f.step();
    expect(f.sides.player.energy).toBe(40);
    f.sides.enemy.shield = 999;
    f.sides.player.shield = 9999;
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'attack').filter((a) => a.note === 'thorns')).toHaveLength(0);
    expect(f.sides.player.energy).toBe(40);
    f.sides.player.shield = 0;
    f.forceNext('player', ['shield', 'thorn', 'shield']);
    f.step();
    f.sides.player.shield = 0;
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const back = ofType(f.step().events, 'attack').filter((a) => a.note === 'thorns');
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ amount: 50, blocked: 0, hpDamage: 50 });
    expect(f.sides.player.energy).toBe(0);
    } finally {
      THORNS.shed = shed;
    }
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

  it('Blood Chalice: healing past full HP becomes shield', () => {
    const f = on('knight', (c) => {
      c.relics = ['chalice'];
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'vamp', n: 6 }];
    });
    f.forceNext('player', ['sword', 'shield', 'shield']);
    const ev = f.step().events;
    expect(ofType(ev, 'shieldGain').find((e) => e.source === 'chalice')?.amount).toBe(20);
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

  it('charm level cards need a charm you own; symbol level cards stop at level 3', () => {
    const run = createRun(base, 3, 'knight');
    expect(levelOptions(run).some((o) => o.kind === 'charmLevel')).toBe(false);
    run.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'keen', n: 1 });
    expect(levelOptions(run).some((o) => o.kind === 'charmLevel' && o.enh === 'keen')).toBe(true);
    run.player.levels.sym.sword = 3;
    expect(levelOptions(run).some((o) => o.kind === 'symLevel' && o.symbol === 'sword')).toBe(false);
  });
});

/** Beat an act's boss (skips the fights in between). */
function beatBoss(run: RunState): void {
  run.depth = actLength(run.act);
  const f = new Fight(fightConfig(run, base), 1);
  f.winner = 'player';
  finishFight(run, f);
}

describe('post-boss BIG CHOICES', () => {
  it('after the House and THE WHEEL: 3 cards (one with a cost, one of your machine, one free), never repeated', () => {
    const run = createRun(base, 4, 'knight', STAKE.act3, true);
    beatBoss(run);
    const first = run.pendingChoice!;
    expect(first).toHaveLength(3);
    const ids = first.map((c) => c.id);
    expect(ids.some((id) => BIG_CARDS.find((c) => c.id === id)?.machine === 'knight')).toBe(true);
    expect(ids.some((id) => SAFE_CHOICES.has(id))).toBe(true);
    takeChoice(run, first[2]);
    expect(run.pendingChoice).toBeNull();
    beatBoss(run);
    const second = run.pendingChoice!.map((c) => c.id);
    expect(second.some((id) => ids.includes(id))).toBe(false);
  });

  it('ARMS RACE: +1 level to all your symbols for -60 max HP; TWIN REEL copies reel 1 onto reel 3', () => {
    const run = createRun(base, 5, 'midas');
    run.player.gilded = [{ reel: 0, symbol: 'goldbar', enh: 'gold', n: 4 }];
    const hp = run.player.maxHp;
    run.pendingChoice = [{ id: 'armsRace' }, { id: 'masterwork', symbol: 'goldbar' }, { id: 'whetstone', symbol: 'shield' }];
    takeChoice(run, { id: 'armsRace' });
    expect(run.player.levels.sym).toEqual({ shield: 2, goldbar: 2 });
    expect(run.player.maxHp).toBe(hp - Math.round((hp * 0.15) / 10) * 10);

    run.pendingChoice = [{ id: 'cleanCut', reel: 0 }, { id: 'twinReel' }, { id: 'sweepUp' }];
    takeChoice(run, { id: 'twinReel' });
    expect(run.player.strips[2]).toEqual(run.player.strips[0]);
    expect(run.player.gilded.filter((g) => g.reel === 2)).toEqual([{ reel: 2, symbol: 'goldbar', enh: 'gold', n: 4 }]);
  });

  it('GLASS CANNON: paying groups x1.5, and no healing between fights', () => {
    const run = createRun(base, 6, 'knight');
    run.pendingChoice = [{ id: 'glassCannon' }, { id: 'bloodPact' }, { id: 'secondWind' }];
    takeChoice(run, { id: 'glassCannon' });
    const cfg = fightConfig(run, base);
    expect(cfg.player.payMul).toBe(1.5);
    run.player.hp = 100;
    const f = new Fight(cfg, 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.player.hp).toBe(f.sides.player.hp);
  });
});

describe('act 3', () => {
  it('act 3 has 5 fights; its regulars grow with your machine', () => {
    expect(actLength(3)).toBe(5);
    const run = createRun(base, 7, 'knight', STAKE.act3, true);
    run.act = 3;
    run.paths = generateRunPaths(new Rng(2), 3);
    run.enemies = run.paths.map((o) => o[0]);
    const weak = enemyHp(run, run.enemies[1]);
    const p0 = machinePower(run);
    run.player.levels = { sym: { sword: 3, shield: 3 }, charm: { gold: 3 } };
    run.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'gold' as const, n: 6 }));
    run.player.relics = ['key', 'bell'];
    expect(machinePower(run)).toBeGreaterThan(p0);
    expect(enemyHp(run, run.enemies[1])).toBeGreaterThan(weak);
  });

});
