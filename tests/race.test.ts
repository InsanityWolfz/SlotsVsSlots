import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { Fight, RACE_RULES } from '../src/core/fight';
import { applyOption, createRun, fightConfig, finishFight, RACE, shopOffers } from '../src/core/run';

const race = (enemy: Parameters<typeof reels3>[0], ability?: { kind: 'blizzard'; every: number; power: number }, spins = 3) => {
  const c = defaultConfig();
  c.player.strips = reels3({ sword: 12 });
  c.enemy = { hp: 500, strips: reels3(enemy), ...(ability ? { ability } : {}) };
  c.race = { spins, enemyMul: 1 };
  c.player.holds = 3;
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
  it('a GUARD you hold when its cheat fires blocks it, and one guard is spent', () => {
    const f = race({ shield: 12 }, { kind: 'blizzard', every: 1, power: 1 });
    f.step();
    f.sides.player.shield = 2;
    const ev = f.step().events;
    expect(ev.some((e) => e.type === 'sabotageBlocked')).toBe(true);
    expect(ev.some((e) => e.type === 'freeze')).toBe(false);
    expect(f.sides.player.shield).toBe(1);
  });
  it('shields on your payline give GUARDS: one per shield, up to the cap, kept from spin to spin', () => {
    const c = defaultConfig();
    c.player.strips = reels3({ shield: 12 });
    c.enemy = { hp: 500, strips: reels3({ shield: 12 }) };
    c.race = { spins: 5, enemyMul: 1 };
    const f = new Fight(c, 3);
    f.step();
    expect(f.sides.player.shield).toBe(3);
    f.step();
    f.step();
    expect(f.sides.player.shield).toBe(f.guardCap);
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
  it('a HOLD on an iced or jammed reel frees it, holds it, and it pays in full', () => {
    const f = race({ shield: 12 });
    const g = race({ shield: 12 });
    g.sides.player.frozen[0] = 5;
    g.sides.player.locked[1] = 2;
    expect(g.hold(0)).toBe(true);
    expect(g.hold(1)).toBe(true);
    expect(g.sides.player.frozen[0]).toBe(0);
    expect(g.sides.player.locked[1]).toBe(0);
    // A freed reel can't be let go (that would keep the thaw for free).
    expect(g.hold(0)).toBe(true);
    expect(g.held[0]).toBe(true);
    const a = f.step().events.find((e) => e.type === 'spin')!;
    const b = g.step().events.find((e) => e.type === 'spin')!;
    if (a.type !== 'spin' || b.type !== 'spin') throw new Error('no spin');
    const total = (s: typeof a.score) => s.groups.reduce((x, y) => x + y.amount, 0);
    expect(total(b.score)).toBe(total(a.score));
  });

  it("a race run's Cashier sells spin tools, not HEAL or MAX HP; a tool bought is one more every race", () => {
    const base = defaultConfig();
    const run = createRun(base, 6, 'tesla', 0);
    run.pendingStart = null;
    run.race = true;
    run.player.hp = 10;
    const shelf = shopOffers(run);
    expect(shelf.some((i) => i.option.kind === 'heal' || i.option.kind === 'maxHp')).toBe(false);
    expect(shelf.filter((i) => i.option.kind === 'tool').length).toBe(3);
    applyOption(run, { kind: 'tool', tool: 'nudge' });
    expect(fightConfig(run, base).player.nudges).toBe(RACE.nudges + 1);
  });
  it('X2 on your payline doubles the spin; every CHERRY in sight pays (3+ double)', () => {
    const make = () => {
      const c = defaultConfig();
      c.player.strips = reels3({ sword: 6, double: 3, cherry: 3 });
      c.enemy = { hp: 500, strips: reels3({ shield: 12 }) };
      c.race = { spins: 5, enemyMul: 1 };
      return new Fight(c, 11);
    };
    const pay = (line: Parameters<Fight['forceNext']>[1]) => {
      const f = make();
      f.forceNext('player', line);
      const ev = f.step().events;
      const spin = ev.find((e) => e.type === 'spin')!;
      if (spin.type !== 'spin') throw new Error('no spin');
      const scat = ev.find((e) => e.type === 'scatter');
      return { groups: spin.score.groups.reduce((a, g) => a + g.amount, 0), scatter: scat && scat.type === 'scatter' ? scat : null, f };
    };
    const plain = pay(['sword', 'sword', 'cherry']);
    const doubled = pay(['sword', 'sword', 'double']);
    expect(doubled.groups).toBe(plain.groups * 2);
    expect(plain.scatter).not.toBeNull();
    const n = plain.scatter!.cells.length;
    expect(plain.scatter!.amount).toBe(n * RACE_RULES.cherryPay * (n >= 3 ? 2 : 1));
  });
});
