import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { GATEKEEPER } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { createRun, fightConfig, finishFight, shopOffers } from '../src/core/run';

describe('THE GATEKEEPER: the REPO MAN', () => {
  it('takes a charm for the fight only: it is back after, and nothing is held (no liens)', () => {
    const base = defaultConfig();
    const run = createRun(base, 5, 'knight');
    run.pendingStart = null;
    run.chosen = run.chosen.map(() => true);
    run.depth = GATEKEEPER.depth;
    expect(run.enemies[run.depth].archetype).toBe('repo');
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 2 }];
    const f = new Fight(fightConfig(run, base), 3);
    const gold = f.sides.player.reels[0].cells.find((c) => c.enh === 'gold')!;
    gold.confiscated = gold.enh;
    delete gold.enh;
    f.winner = 'player';
    finishFight(run, f);
    expect(run.liens ?? []).toEqual([]);
    expect(run.player.gilded).toEqual([{ reel: 0, symbol: 'sword', enh: 'gold', n: 2 }]);
    expect(shopOffers(run).some((i) => i.option.kind === 'payLien')).toBe(false);
  });

  it('with no charms on your reels his take fizzles (he never steals a cell)', () => {
    const base = defaultConfig();
    const run = createRun(base, 5, 'knight');
    run.pendingStart = null;
    run.chosen = run.chosen.map(() => true);
    run.depth = GATEKEEPER.depth;
    run.player.gilded = [];
    const f = new Fight(fightConfig(run, base), 3);
    for (let t = 0; t < 30 && !f.over; t++) {
      const ev = f.step().events;
      expect(ev.some((e) => e.type === 'steal')).toBe(false);
    }
  });
});
