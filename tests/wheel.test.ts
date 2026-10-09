import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import { BOSSES, generateRunPaths, RUN_FIGHTS, TUNE, WHEEL, WHEEL_RULES } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight, MIDAS } from '../src/core/fight';
import { POT } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import { createRun, enemyHp, fightConfig, migrateRun } from '../src/core/run';
import { STAKE, STAKES } from '../src/core/stakes';

const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A WHEEL fight: your reels never pair (sword / shield / bolt) unless forced, its own reels are plain shields. */
function wheel(edit?: (c: GameConfig) => void): Fight {
  const c = defaultConfig();
  c.player.hp = 400;
  c.player.strips = [{ sword: 12 }, { shield: 12 }, { bolt: 12 }];
  c.enemy = { hp: 5000, strips: reels3({ shield: 12 }), ability: { ...WHEEL.ability! }, boss: 'wheel' };
  edit?.(c);
  return new Fight(c, 7);
}

describe('THE WHEEL: PLACE YOUR BETS', () => {
  it('is the act 2 boss, and the endless cycle is HOUSE, WHEEL, DEALER', () => {
    expect(BOSSES[2].id).toBe('wheel');
    const loops = [1, 2, 3].map((loop) => generateRunPaths(new Rng(loop), 4, loop).at(-1)![0].boss);
    expect(loops).toEqual(['house', 'wheel', 'dealer']);
  });

  it('each of its turns drops 2 chips on 2 different reels; a reel holds at most 3', () => {
    const f = wheel();
    f.step();
    const placed = ofType(f.step().events, 'betPlaced')[0];
    expect(placed.reels).toHaveLength(2);
    expect(new Set(placed.reels).size).toBe(2);
    expect(placed.bets.reduce((a, b) => a + b, 0)).toBe(2);
    expect(placed.left).toBe(2);
    expect(placed.per).toBe(20); // 5% of 400
    // Many turns without a drop: no reel ever passes 3.
    const g = wheel((c) => (c.enemy.ability = { kind: 'bets', every: 99, power: 2 }));
    for (let i = 0; i < 20; i++) g.step();
    expect(Math.max(...g.bets)).toBe(WHEEL_RULES.maxPerReel);
    expect(g.betTotal).toBe(9);
  });

  it('a pair sweeps its reels (BETS CLEARED), a jackpot sweeps them all (TABLE CLEARED); every swept chip is yours', () => {
    const f = wheel((c) => (c.player.strips = reels3({ sword: 6, shield: 6 })));
    f.bets.splice(0, 3, 2, 1, 3);
    f.forceNext('player', ['sword', 'sword', 'shield']);
    const ev = f.step().events;
    const sw = ofType(ev, 'betSwept')[0];
    expect(sw.reels).toEqual([0, 1]);
    expect(sw.chips).toBe(3);
    expect(sw.table).toBe(false);
    expect(f.bets).toEqual([0, 0, 3]);
    expect(f.betChips).toBe(3);
    expect(f.midasChips).toBe(3);

    const g = wheel((c) => (c.player.strips = reels3({ sword: 12 })));
    g.bets.splice(0, 3, 1, 2, 3);
    g.forceNext('player', ['sword', 'sword', 'sword']);
    const all = ofType(g.step().events, 'betSwept')[0];
    expect(all.table).toBe(true);
    expect(all.chips).toBe(6);
    expect(g.betTotal).toBe(0);
  });

  it('dead symbols never sweep, and a spin with no pair leaves the bets', () => {
    const f = wheel((c) => (c.player.strips = reels3({ rock: 12 })));
    f.bets.splice(0, 3, 1, 1, 1);
    f.forceNext('player', ['rock', 'rock', 'rock']);
    expect(ofType(f.step().events, 'betSwept')).toHaveLength(0);
    expect(f.betTotal).toBe(3);
    const g = wheel();
    g.bets.splice(0, 3, 1, 1, 1);
    expect(ofType(g.step().events, 'betSwept')).toHaveLength(0);
  });

  it('NO MORE BETS (every 3rd turn): no chips placed; each chip left hits for 5% of your max HP as one shielded hit, then the table clears', () => {
    const f = wheel();
    for (let i = 0; i < 4; i++) f.step(); // you, it (2 chips), you, it (2 chips)
    expect(f.betTotal).toBe(4);
    f.step(); // your spin: no pair
    f.sides.player.shield = 30;
    const hp = f.sides.player.hp;
    const ev = f.step().events;
    expect(ofType(ev, 'betPlaced')).toHaveLength(0);
    const nmb = ofType(ev, 'noMoreBets')[0];
    expect(nmb.chips).toBe(4);
    expect(nmb.per).toBe(20);
    expect(nmb.amount).toBe(80);
    expect(nmb.blocked).toBe(30);
    expect(hp - f.sides.player.hp).toBe(50);
    expect(f.betTotal).toBe(0);
    expect(ofType(ev, 'ability')[0].kind).toBe('bets');
  });

  it('its BALL: a pair bets 1 more chip, a jackpot 2; a single fizzles', () => {
    const f = wheel((c) => (c.enemy.strips = reels3({ ball: 6, shield: 6 })));
    f.step();
    f.forceNext('enemy', ['ball', 'ball', 'shield']);
    const ev = f.step().events;
    const ball = ofType(ev, 'betPlaced').find((e) => e.ball)!;
    expect(ball.reels).toHaveLength(1);
    expect(f.betTotal).toBe(3);
    const g = wheel((c) => (c.enemy.strips = reels3({ ball: 12 })));
    g.step();
    g.forceNext('enemy', ['ball', 'ball', 'ball']);
    g.step();
    expect(g.betTotal).toBe(4);
  });

  it('THE WHEEL SPINS FASTER at half HP: its HP holds at half for that turn, then it drops 3 chips a turn (one per reel)', () => {
    const f = wheel((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.enemy.hp = 1000;
    });
    f.sides.enemy.hp = 520;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const ev = f.step().events;
    expect(ofType(ev, 'wheelFast')).toHaveLength(1);
    expect(f.sides.enemy.hp).toBe(500);
    expect(f.fast).toBe(true);
    const placed = ofType(f.step().events, 'betPlaced')[0];
    expect([...placed.reels].sort()).toEqual([0, 1, 2]);
  });

  it('GREEN: THE WHEEL STARTS FAST (3 chips from its first turn, no half-HP gate) and is sized x0.85', () => {
    const f = wheel((c) => (c.stake = STAKE.wheelFast));
    expect(f.fast).toBe(true);
    f.step();
    expect(ofType(f.step().events, 'betPlaced')[0].reels).toHaveLength(3);
    expect(STAKES[STAKE.wheelFast].rule).toContain('THE WHEEL STARTS FAST');
    expect(STAKES.map((s) => s.rule).join(' ')).not.toMatch(/MIRROR|ZERO/);
    // The same run at WHITE and GREEN: GREEN's WHEEL has 85% of the HP (the flat and per-relic parts too).
    const at = (stake: number) => {
      const run = createRun(defaultConfig(), 11, 'knight', stake, stake >= STAKE.act3);
      run.act = 2;
      run.paths = generateRunPaths(new Rng(3), 2);
      run.enemies = run.paths.map((o) => o[0]);
      run.depth = RUN_FIGHTS;
      return enemyHp(run, run.enemies[RUN_FIGHTS]);
    };
    expect(Math.abs(at(STAKE.wheelFast) - at(0) * TUNE.greenWheel)).toBeLessThanOrEqual(10);
  });

  it('a saved run from before THE WHEEL loads its act 2 boss as THE WHEEL', () => {
    const run = createRun(defaultConfig(), 5, 'knight');
    run.act = 2;
    run.paths = generateRunPaths(new Rng(9), 2);
    run.enemies = run.paths.map((o) => o[0]);
    const old = JSON.parse(JSON.stringify(run));
    old.paths[RUN_FIGHTS][0] = { ...old.paths[RUN_FIGHTS][0], archetype: 'mirror', boss: 'mirror', name: 'THE MIRROR', portrait: 'enemyMirror', strips: [{ sword: 5, shield: 3, shard: 3 }], ability: null };
    old.enemies[RUN_FIGHTS] = old.paths[RUN_FIGHTS][0];
    const fixed = migrateRun(old);
    expect(fixed.enemies[RUN_FIGHTS].boss).toBe('wheel');
    expect(fixed.paths[RUN_FIGHTS][0].name).toBe('THE WHEEL');
    fixed.depth = RUN_FIGHTS;
    const cfg = fightConfig(fixed, defaultConfig());
    expect(cfg.enemy.boss).toBe('wheel');
    expect(cfg.enemy.strips.every((s) => !('shard' in s))).toBe(true);
  });
});

describe('THE HOUSE (BOSS_REDESIGN 2)', () => {
  it('a fatter pot (seed 12, cut 3), no chip skim on CASSIDY, and LAST CALL: from turn 20 it skims every turn', () => {
    expect(POT.seed).toBe(120);
    expect(POT.houseCut).toBe(30);
    expect(MIDAS.houseSkim).toBe(0);
    const c = defaultConfig();
    c.player.hp = 99999;
    c.player.strips = [{ sword: 12 }, { shield: 12 }, { bolt: 12 }];
    c.enemy = { hp: 99999, strips: reels3({ shield: 12 }), ability: { kind: 'jackpot', every: POT.cashEvery, power: 1 }, boss: 'house' };
    const f = new Fight(c, 3);
    const skims: number[] = [];
    let lastCall = 0;
    for (let i = 0; i < 30; i++) {
      const { events } = f.step();
      if (ofType(events, 'potWin').length) skims.push(f.turn);
      if (ofType(events, 'lastCall').some((e) => e.house)) lastCall = f.turn;
    }
    // Every 3 of its turns before LAST CALL (it cashes at the start of its next turn), then every turn from 20.
    expect(skims.filter((t) => t < POT.lastCall)).toEqual([8, 14]);
    expect(skims.filter((t) => t >= POT.lastCall)).toEqual([20, 22, 24, 26, 28, 30]);
    expect(lastCall).toBe(18);
  });
});
