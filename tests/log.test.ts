import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { formatRow, rowsToCsv, turnRow, type TurnRow } from '../src/core/log';
import { StatsTracker } from '../src/core/stats';

describe('combat log + stats', () => {
  it('a turn row captures the line and its effects', () => {
    const f = new Fight(defaultConfig(), 5);
    f.forceNext('player', ['sword', 'sword', 'bolt']);
    const row = turnRow(f, f.step(), 1);
    expect(row).toMatchObject({ side: 'player', tier: 'pair', attack: 4, hpDamage: 4, energyGain: 1, enemyHp: 36 });
    expect(formatRow(row)).toContain('SWD SWD BLT DOUBLE');
  });

  it('stats totals agree with the log over a whole fight', () => {
    const f = new Fight(defaultConfig(), 99);
    const tracker = new StatsTracker(f);
    const rows: TurnRow[] = [];
    let n = 0;
    while (!f.over) {
      const r = f.step();
      tracker.record(r.events);
      rows.push(turnRow(f, r, 1));
      if (++n > 1000) throw new Error('runaway fight');
    }
    const s = tracker.stats;
    const sum = (side: string, k: 'hpDamage' | 'slimed' | 'specials') => rows.filter((r) => r.side === side).reduce((a, r) => a + r[k], 0);
    expect(s.sides.player.damageDealt).toBe(sum('player', 'hpDamage'));
    expect(s.sides.enemy.damageDealt).toBe(sum('enemy', 'hpDamage'));
    expect(s.sides.enemy.slimeApplied).toBe(sum('enemy', 'slimed'));
    expect(s.sides.player.specials).toBe(sum('player', 'specials'));
    expect(s.winner).toBe(f.winner);
    expect(rows.at(-1)!.winner).toBe(f.winner);
    const loser = f.winner === 'player' ? 'enemy' : 'player';
    expect(s.sides[f.winner!].damageDealt).toBe(f.sides[loser].maxHp);
  });

  it('CSV has a header and one line per row', () => {
    const f = new Fight(defaultConfig(), 3);
    const rows = [turnRow(f, f.step(), 1), turnRow(f, f.step(), 1)];
    const csv = rowsToCsv(rows).split('\n');
    expect(csv).toHaveLength(3);
    expect(csv[0].startsWith('fight,seed,turn,side,line')).toBe(true);
  });
});
