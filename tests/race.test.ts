import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { createRun, fightConfig, finishFight, RACE, raceLives } from '../src/core/run';

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
  it('a race run: a lost race costs a life (the run goes on); a lost boss race ends it', () => {
    const base = defaultConfig();
    const run = createRun(base, 4, 'knight', 0);
    run.pendingStart = null;
    run.race = true;
    const cfg = fightConfig(run, base);
    expect(cfg.race?.spins).toBe(RACE.spins.fight);
    expect(cfg.player.holds).toBe(RACE.holds);
    const f = new Fight(cfg, 1);
    f.winner = 'enemy';
    finishFight(run, f);
    expect(run.over).toBe(false);
    expect(raceLives(run)).toBe(RACE.lives - 1);
  });
});
