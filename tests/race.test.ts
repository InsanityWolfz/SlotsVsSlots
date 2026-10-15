import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { Fight, RACE_RULES } from '../src/core/fight';
import { createRun, fightConfig, finishFight, RACE } from '../src/core/run';

const race = (enemy: Parameters<typeof reels3>[0], ability?: { kind: 'blizzard'; every: number; power: number }, spins = 3) => {
  const c = defaultConfig();
  c.player.strips = reels3({ sword: 12 });
  c.enemy = { hp: 500, strips: reels3(enemy), ...(ability ? { ability } : {}) };
  c.race = { spins, enemyMul: 1 };
  return new Fight(c, 3);
};

describe('THE SCORE RACE (sandbox)', () => {
  it('both machines spin `spins` times; hits are score, nobody loses HP; the higher score wins', () => {
    const f = race({ shield: 12 });
    const hp = f.sides.player.hp;
    let turns = 0;
    while (!f.over && turns < 50) {
      f.step();
      turns++;
    }
    expect(turns).toBe(6);
    expect(f.sides.player.hp).toBe(hp);
    expect(f.sides.enemy.hp).toBe(f.sides.enemy.maxHp);
    expect(f.raceScore.player).toBeGreaterThan(0);
    expect(f.winner).toBe('player');
    expect(f.raceLeft).toBe(0);
  });
  it('a shield you hold when its ability fires blocks it, and is spent', () => {
    const f = race({ shield: 12 }, { kind: 'blizzard', every: 1, power: 1 });
    f.step();
    f.sides.player.shield = 30;
    const ev = f.step().events;
    expect(ev.some((e) => e.type === 'sabotageBlocked')).toBe(true);
    expect(ev.some((e) => e.type === 'freeze')).toBe(false);
    expect(f.sides.player.shield).toBe(0);
  });
  it('a race run: its tools come from RACE, and one lost race ends the run', () => {
    const base = defaultConfig();
    const run = createRun(base, 4, 'knight', 0);
    run.pendingStart = null;
    run.race = true;
    const cfg = fightConfig(run, base);
    expect(cfg.race?.spins).toBe(RACE.spins.fight);
    expect([cfg.player.holds, cfg.player.nudges, cfg.player.respins]).toEqual([RACE.holds, RACE.nudges, RACE.respins]);
    const f = new Fight(cfg, 1);
    f.winner = 'enemy';
    finishFight(run, f);
    expect(run.over).toBe(true);
  });
  it('land, then NUDGE (the symbol above drops in) and RESPIN, then the spin scores where it stopped', () => {
    const c = defaultConfig();
    c.player.strips = reels3({ sword: 4, shield: 4, bolt: 4 });
    c.player.nudges = 2;
    c.player.respins = 1;
    c.enemy = { hp: 500, strips: reels3({ shield: 12 }) };
    c.race = { spins: 3, enemyMul: 1 };
    const f = new Fight(c, 9);
    expect(f.nudge(0)).toBe(false); // nothing has landed yet
    const l = f.land()!;
    expect(l.moved).toEqual([true, true, true]);
    expect(f.land()).toBeNull();
    const n = f.sides.player.reels[0].cells.length;
    const before = f.landed![0];
    expect(f.nudge(0)).toBe(true);
    expect(f.landed![0]).toBe((before - 1 + n) % n);
    expect(f.respin(1)).toBe(true);
    expect(f.respin(2)).toBe(false); // one RESPIN
    const stops = [...f.landed!];
    const spin = f.step().events.find((e) => e.type === 'spin' && e.side === 'player');
    expect(f.sides.player.reels.map((r) => r.stop)).toEqual(stops);
    expect(spin && spin.type === 'spin' ? spin.held : undefined).toEqual([true, true, true]);
    expect(f.landed).toBeNull();
    expect([f.nudgesLeft, f.respinsLeft]).toEqual([1, 0]);
  });
  it('THE THIEF steals a share of your score; THE BRUTE scores big; a shield blocks either', () => {
    const thief = race({ shield: 12 }, { kind: 'pilfer', every: 1, power: 1 } as never);
    thief.step();
    const before = thief.raceScore.player;
    expect(before).toBeGreaterThan(0);
    thief.sides.player.shield = 0;
    const ev = thief.step().events;
    expect(ev.some((e) => e.type === 'raceScore' && e.side === 'player' && e.amount < 0)).toBe(true);
    expect(thief.raceScore.player).toBe(before - Math.round(before * RACE_RULES.thiefShare));
    const brute = race({ shield: 12 }, { kind: 'smash', every: 1, power: 40 } as never);
    brute.step();
    brute.sides.player.shield = 10;
    expect(brute.step().events.some((e) => e.type === 'sabotageBlocked')).toBe(true);
    expect(brute.raceScore.enemy).toBe(0);
  });
  it('a frozen reel of yours scores half', () => {
    const f = race({ shield: 12 });
    const g = race({ shield: 12 });
    g.sides.player.frozen[0] = 5;
    const a = f.step().events.find((e) => e.type === 'spin')!;
    const b = g.step().events.find((e) => e.type === 'spin')!;
    if (a.type !== 'spin' || b.type !== 'spin') throw new Error('no spin');
    const total = (s: typeof a.score) => s.groups.reduce((x, y) => x + y.amount, 0);
    expect(total(b.score)).toBeLessThan(total(a.score));
  });
});
