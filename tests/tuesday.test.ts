import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import { actLength, generateRunPaths } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { MIRROR_HIT_CAP, SANDGLASS_SLOW } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import {
  BIG_SETS,
  charmOptions,
  createRun,
  enemyHp,
  fightConfig,
  finishFight,
  levelOptions,
  machinePower,
  takeChoice,
  type RunState,
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

  it('MIDAS: gold bars fill the meter; full, the next PAIR or JACKPOT pays x4 (singles wait), bars while ready add +1', () => {
    const f = on('midas');
    f.sides.player.hp = 100;
    f.forceNext('player', ['goldbar', 'goldbar', 'shield']);
    const fill = ofType(f.step().events, 'meter')[0];
    expect(fill).toMatchObject({ total: 20, armed: true, raise: 4 });
    expect(f.sides.player.armed).toBe(true);
    // Ready and no pair: a FREE SPIN (the enemy waits). Singles don't use it up; the gold bar raises it to x5.
    f.forceNext('player', ['shield', 'goldbar', 'sword']);
    const wait = f.step().events;
    expect(ofType(wait, 'turnStart')[0]).toMatchObject({ side: 'player', free: true });
    expect(ofType(wait, 'payoff')).toHaveLength(0);
    expect(ofType(wait, 'meter')[0]).toMatchObject({ armed: true, raise: 5 });
    f.step();
    f.forceNext('player', ['shield', 'shield', 'goldbar']);
    const ev = f.step().events;
    expect(ofType(ev, 'payoff')[0].kind).toBe('raise');
    const shield = ofType(ev, 'spin')[0].score.groups[0];
    expect(shield.notes).toContain('X5 MIDAS');
    expect(ofType(ev, 'heal').some((h) => h.source === 'payoff')).toBe(true);
    // The gold bar that landed during the payoff refills the (now empty) meter.
    expect(f.sides.player.energy).toBe(10);
    expect(f.raiseMult).toBe(4);
  });

  it('BRIAR: thorns bank their pay; being attacked (blocked or not) fires the bank through shields, once per turn', () => {
    const f = on('thorn');
    f.forceNext('player', ['thorn', 'thorn', 'shield']);
    f.step();
    expect(f.sides.player.energy).toBe(60);
    f.sides.enemy.shield = 999;
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const ev = f.step().events;
    const back = ofType(ev, 'attack').filter((a) => a.note === 'thorns');
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ amount: 60, blocked: 0, hpDamage: 60 });
    expect(f.sides.player.energy).toBe(0);
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
    const run = createRun(base, 3, 'midas'); // 4 gold swords on reel 1: no plain swords there
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
  it('after the House and the Mirror: 1 of 3 from a set you have not seen; one safe pick', () => {
    const run = createRun(base, 4, 'knight', STAKE.act3, true);
    beatBoss(run);
    const first = run.pendingChoice!;
    expect(first).toHaveLength(3);
    const set = BIG_SETS.findIndex((ids) => ids.includes(first[0].id));
    expect(first.map((c) => c.id)).toEqual(BIG_SETS[set]);
    takeChoice(run, first[2]);
    expect(run.pendingChoice).toBeNull();
    beatBoss(run);
    const second = run.pendingChoice!;
    expect(BIG_SETS.findIndex((ids) => ids.includes(second[0].id))).not.toBe(set);
  });

  it('ARMS RACE: +1 level to all your symbols for -60 max HP; TWIN REEL copies reel 1 onto reel 3', () => {
    const run = createRun(base, 5, 'midas');
    const hp = run.player.maxHp;
    run.pendingChoice = [{ id: 'armsRace' }, { id: 'masterwork', symbol: 'sword' }, { id: 'whetstone', symbol: 'shield' }];
    takeChoice(run, { id: 'armsRace' });
    expect(run.player.levels.sym).toEqual({ sword: 2, shield: 2, goldbar: 2 });
    expect(run.player.maxHp).toBe(hp - 60);

    run.pendingChoice = [{ id: 'cleanCut', reel: 0 }, { id: 'twinReel' }, { id: 'sweepUp' }];
    takeChoice(run, { id: 'twinReel' });
    expect(run.player.strips[2]).toEqual(run.player.strips[0]);
    expect(run.player.gilded.filter((g) => g.reel === 2)).toEqual([{ reel: 2, symbol: 'sword', enh: 'gold', n: 4 }]);
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

describe('act 3 and the Mirror', () => {
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

  it("the Mirror's hits are capped at a share of your max HP", () => {
    const c = defaultConfig();
    c.player.hp = 300;
    c.enemy = { hp: 9999, strips: reels3({ sword: 12 }), boss: 'mirror', gilded: [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'gold' as const, n: 12 })) };
    const f = new Fight(c, 3);
    f.step();
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const hit = ofType(f.step().events, 'attack')[0];
    expect(hit.amount).toBe(Math.round(300 * MIRROR_HIT_CAP));
  });
});
