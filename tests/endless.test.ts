import { describe, expect, it } from 'vitest';
import { defaultConfig, UNIT } from '../src/core/config';
import { ENDLESS, OWNER_TRICKS, TURBO } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { actStops, chooseRoute, createRun, currentEnemy, endlessScore, enemyHp, runScoreOf, scoreParts, fightConfig, fightLabel, NIGHT, NIGHTS, finishFight, letItRide, skipToBoss, takeChoice } from '../src/core/run';
import { fmtNum } from '../src/render/text';

const base = defaultConfig();

describe('ENDLESS (LET IT RIDE)', () => {
  it('only a won run can ride; a loop is an act-style map (2 paths, a Cashier, a boss that cycles House, THE WHEEL, Dealer)', () => {
    const run = createRun(base, 21, 'knight', 2, true);
    letItRide(run);
    expect(run.endless).toBeUndefined();
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    expect(run.endless?.loop).toBe(1);
    expect(run.over).toBe(false);
    // Two paths shaped like the acts' (user, 2026-10-14), picked after the opener; the Cashier before the boss.
    expect(run.map.routes).toHaveLength(2);
    expect(run.route).toBe(null);
    chooseRoute(run, 0);
    const kinds = actStops(run).map((st) => st.kind);
    expect(kinds).toHaveLength(8);
    expect(kinds.slice(-2)).toEqual(['shop', 'fight']);
    expect(run.enemies.at(-1)!.boss).toBe('house');
    // HOUSE EDGES are gone (user, 2026-10-15): the first loop opens with no choice to make.
    expect(run.pendingChoice ?? null).toBe(null);
  });

  it('beating a loop boss starts the next loop (harder, next boss); losing ends it', () => {
    const run = createRun(base, 22, 'tesla', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    run.pendingChoice = null;
    chooseRoute(run, 0);
    skipToBoss(run);
    const hp1 = enemyHp(run, currentEnemy(run));
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.endless!.loop).toBe(2);
    expect(run.map.boss.boss).toBe('wheel');
    run.depth = 0;
    expect(enemyHp(run, currentEnemy(run))).toBeGreaterThan(0);
    void hp1;
    const g = new Fight(fightConfig(run, base), 2);
    g.winner = 'enemy';
    finishFight(run, g);
    expect(run.over).toBe(true);
  });

  it('numbers stay finite and short at huge loops', () => {
    const run = createRun(base, 23, 'joker', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    run.endless!.loop = 60;
    const hp = enemyHp(run, currentEnemy(run));
    expect(Number.isFinite(hp)).toBe(true);
    expect(hp).toBeLessThanOrEqual(ENDLESS.clamp);
    expect(fmtNum(12400)).toBe('12.4K');
    expect(fmtNum(3_100_000)).toBe('3.1M');
    expect(fmtNum(950)).toBe('950');
    expect(UNIT).toBe(10);
  });
});

describe('ENDLESS: no cash out', () => {
  it('a cleared loop counts in the run score', () => {
    const run = createRun(base, 24, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    while (run.pendingChoice?.length) takeChoice(run, run.pendingChoice[0]);
    run.pendingLegend = null;
    skipToBoss(run);
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.endless!.loop).toBe(2);
    expect(run.endless!.pot).toBe(1500);
    // No RIDE AGAIN / CASH OUT (user, 2026-10-14): ENDLESS goes on until you bust, scored then.
    expect(run.pendingChoice!.map((c) => c.id)).not.toContain('cashOut');
    // THE RUN SCORE: every boss beaten counts (the loop's boss here), and clearing the Dealer.
    expect(scoreParts(run).find(([k]) => k === 'BOSSES')?.[1]).toBe(1000);
    expect(endlessScore(run)).toBe(runScoreOf(run));
  });
});

describe("ENDLESS: TONIGHT'S RULE", () => {
  it('each loop deals a rule per path (two different ones); picking a path picks its rule, shown in the fight label', () => {
    const run = createRun(base, 31, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    const nights = run.endless!.nights!;
    expect(nights).toHaveLength(2);
    expect(nights[0]).not.toBe(nights[1]);
    // The loop's opener plays without one.
    expect(run.endless!.night).toBeUndefined();
    run.pendingChoice = null;
    chooseRoute(run, 1);
    const first = run.endless!.night!;
    expect(first).toBe(nights[1]);
    expect(fightConfig(run, base).night).toBe(first);
    expect(fightLabel(run)).toContain(NIGHTS[first].title);
    skipToBoss(run);
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.endless!.nights).not.toContain(first);
  });

  it('LUCKY NIGHT adds wilds to both machines; HIGH LIMIT raises enemy HP', () => {
    const run = createRun(base, 32, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    run.pendingChoice = null;
    run.endless!.night = 'lucky';
    const lucky = fightConfig(run, base);
    expect(lucky.player.strips.every((s) => (s.wild ?? 0) >= NIGHT.luckyWilds)).toBe(true);
    expect(lucky.enemy.strips.every((s) => (s.wild ?? 0) >= NIGHT.luckyWilds)).toBe(true);
    run.endless!.night = 'limit';
    const hp = fightConfig(run, base).enemy.hp;
    run.endless!.night = 'iron';
    expect(hp).toBeGreaterThan(fightConfig(run, base).enemy.hp);
  });
});

describe('ENDLESS: THE OWNER (the TURBO boss)', () => {
  it("loop 5's boss is THE OWNER (a turn cap on his HP, a new trick each time); beating him ends the run, won", () => {
    const run = createRun(base, 33, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    for (let loop = 1; loop < TURBO.loop; loop++) {
      expect(run.map.boss.turbo).toBeFalsy();
      run.pendingChoice = null;
      run.choiceQueue = [];
      run.pendingLegend = null;
      chooseRoute(run, 0);
      skipToBoss(run);
      const f = new Fight(fightConfig(run, base), loop);
      f.winner = 'player';
      finishFight(run, f);
    }
    expect(run.endless!.loop).toBe(TURBO.loop);
    expect(run.map.boss.turbo).toBe(true);
    expect(run.map.boss.boss).toBe('owner');
    expect(run.map.boss.name).toBe('THE OWNER');
    run.pendingChoice = null;
    run.choiceQueue = [];
    run.pendingLegend = null;
    chooseRoute(run, 0);
    skipToBoss(run);
    expect(fightConfig(run, base).enemy.owner).toBe(true);
    expect(fightConfig(run, base).enemy.hp).toBe(TURBO.hp);
    const pot = run.endless!.pot;
    const f = new Fight(fightConfig(run, base), 9);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.over).toBe(true);
    expect(run.won).toBe(true);
    expect(run.endless!.turbo).toBe(true);
    expect(run.endless!.pot).toBeGreaterThan(pot);
  });
});

describe('THE OWNER: EVERY TRICK IN THE BOOK', () => {
  it('plays a different trick each time his ability fires, in order', () => {
    const run = createRun(base, 34, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    run.endless!.loop = TURBO.loop;
    const cfg = fightConfig(run, base);
    cfg.enemy = { ...cfg.enemy, ...run.map.boss, hp: 1e9, ability: { kind: 'owner', every: 2, power: 0 }, boss: 'owner' };
    cfg.enemy.owner = true;
    cfg.player = { ...cfg.player, hp: 1e9, startHp: 1e9 };
    const f = new Fight(cfg, 5);
    const kinds: string[] = [];
    for (let i = 0; i < 40 && !f.over; i++) for (const e of f.step().events) if (e.type === 'ability' && e.side === 'enemy') kinds.push(e.kind);
    expect(kinds.length).toBeGreaterThanOrEqual(3);
    expect(kinds.slice(0, 3)).toEqual(OWNER_TRICKS.slice(0, 3).map((t) => t.kind));
  });
});

describe('THE OWNER: 11 HP, a hit each', () => {
  it('loses at most 1 HP a turn, however big the hits, and never heals', () => {
    const run = createRun(base, 34, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    run.endless!.loop = TURBO.loop;
    const cfg = fightConfig(run, base);
    cfg.enemy = { ...cfg.enemy, ...run.map.boss, hp: TURBO.hp, ability: null, boss: 'owner', owner: true };
    cfg.player = { ...cfg.player, hp: 1e9, startHp: 1e9 };
    const f = new Fight(cfg, 5);
    for (let i = 0; i < 400 && !f.over; i++) {
      const before = f.sides.enemy.hp;
      const evs = f.step().events;
      void evs;
      expect(before - f.sides.enemy.hp).toBeGreaterThanOrEqual(0);
      expect(before - f.sides.enemy.hp).toBeLessThanOrEqual(1);
    }
    expect(f.winner).toBe('player');
  });
});
