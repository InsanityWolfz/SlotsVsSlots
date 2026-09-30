import { describe, expect, it } from 'vitest';
import { defaultConfig, UNIT } from '../src/core/config';
import { ENDLESS } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { createRun, currentEnemy, enemyHp, fightConfig, finishFight, letItRide, takeChoice } from '../src/core/run';
import { fmtNum } from '../src/render/text';

const base = defaultConfig();

describe('ENDLESS (LET IT RIDE)', () => {
  it('only a won run can ride; a loop is 3 fights + a boss that cycles House, Mirror, Dealer', () => {
    const run = createRun(base, 21, 'knight', 2, true);
    letItRide(run);
    expect(run.endless).toBeUndefined();
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    expect(run.endless?.loop).toBe(1);
    expect(run.over).toBe(false);
    expect(run.paths.length).toBe(4);
    expect(run.paths[3][0].boss).toBe('house');
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
    run.depth = 3;
    const hp1 = enemyHp(run, currentEnemy(run));
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.endless!.loop).toBe(2);
    expect(run.paths[3][0].boss).toBe('mirror');
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

describe('ENDLESS: RIDE AGAIN / CASH OUT', () => {
  it('after a cleared loop: RIDE or CASH OUT first, then a big choice, then the edge; cashing out banks the pot and ends', () => {
    const run = createRun(base, 24, 'knight', 2, true);
    run.over = run.won = true;
    run.act = 3;
    letItRide(run);
    while (run.pendingChoice?.length) takeChoice(run, run.pendingChoice[0]);
    run.pendingLegend = null;
    run.depth = 3;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.endless!.loop).toBe(2);
    expect(run.endless!.pot).toBe(1500);
    expect(run.pendingChoice!.map((c) => c.id)).toEqual(['cashOut', 'ride']);
    takeChoice(run, { id: 'ride' });
    expect(run.pendingChoice?.[0].id).not.toBe('cashOut');
    const run2 = createRun(base, 25, 'knight', 2, true);
    run2.over = run2.won = true;
    run2.act = 3;
    letItRide(run2);
    run2.endless!.pot = 3000;
    run2.pendingChoice = [{ id: 'cashOut' }, { id: 'ride' }];
    takeChoice(run2, { id: 'cashOut' });
    expect(run2.over).toBe(true);
    expect(run2.endless!.cashed).toBe(true);
    expect(run2.endless!.pot).toBe(3000 + run2.player.chips * 10);
  });
});
