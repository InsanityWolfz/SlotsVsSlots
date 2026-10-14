import { describe, expect, it } from 'vitest';
import { defaultConfig, UNIT } from '../src/core/config';
import { ENDLESS } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { actStops, chooseRoute, createRun, currentEnemy, endlessScore, enemyHp, fightConfig, finishFight, letItRide, skipToBoss, takeChoice } from '../src/core/run';
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
    expect(run.pendingChoice?.length).toBe(3);
    takeChoice(run, run.pendingChoice![0]);
    expect(run.endless!.edges.length).toBe(1);
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
  it('a cleared loop grows the pot; the score is the pot plus chips x10', () => {
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
    expect(endlessScore(run)).toBe(1500 + run.player.chips * 10);
  });
});
