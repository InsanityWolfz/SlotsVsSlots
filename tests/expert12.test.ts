import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { createRun, offerChoices } from '../src/core/run';
import { Rng } from '../src/core/rng';

const base = defaultConfig();

describe('EXPERT_PLAYTEST_12: THE FORGE when every symbol is maxed', () => {
  it('still offers level cards: they go past the cap now (LIMIT BREAK, 2026-10-08)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = createRun(base, seed, 'knight');
      for (const s of ['sword', 'shield'] as const) run.player.levels.sym[s] = 3;
      offerChoices(run, new Rng(seed));
      expect(run.pendingChoice).toHaveLength(3);
    }
  });
});
