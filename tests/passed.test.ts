import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { draftOffers, takeDraft } from '../src/core/draft';
import { createRun, passedThisAct, passOn } from '../src/core/run';

/** Offers turned down this act aren't dealt again this act (expert playtest 2026-11-06). */
describe('no repeats in an act', () => {
  const kind = (o: ReturnType<typeof draftOffers>[number]) =>
    o.kind === 'gild' ? `gild:${o.enh}:${o.symbol}` : o.kind === 'swap' ? `swap:${o.from}:${o.to}` : o.kind === 'add' ? `add:${o.symbol}` : JSON.stringify(o);
  it('taking a card turns the other two down for the act, and the next deal skips them', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const run = createRun(defaultConfig(), seed);
      run.pendingStart = null;
      const first = draftOffers(run);
      expect(first.length).toBe(3);
      takeDraft(run, first[0]);
      const passed = passedThisAct(run);
      expect(passed.size).toBe(2);
      run.depth++;
      const next = draftOffers(run);
      expect(next.length).toBe(3);
      for (const o of next) expect(passed.has(kind(o))).toBe(false);
    }
  });
  it('a new act starts a clean list', () => {
    const run = createRun(defaultConfig(), 9);
    passOn(run, ['relic:tower']);
    expect(passedThisAct(run).has('relic:tower')).toBe(true);
    run.act++;
    expect(passedThisAct(run).size).toBe(0);
  });
});
