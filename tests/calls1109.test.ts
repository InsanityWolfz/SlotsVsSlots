import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { draftOffers, skipDraft } from '../src/core/draft';
import { createRun, passedThisAct, RUN } from '../src/core/run';
import { runSummary } from '../src/core/runLog';
import { LEGEND_RELIC } from '../src/core/relics';
import { sanitizePrefs } from '../src/saves';

/** The user's calls from the 2026-11-09 QA report (1, 3, 5; 6 is in cassidy.test.ts). */
describe('QA calls 2026-11-09', () => {
  it('call 1: a new save starts at SPEED 2X; a saved speed is kept', () => {
    expect(sanitizePrefs({}, true).speed).toBe(2);
    expect(sanitizePrefs(null, true).speed).toBe(2);
    expect(sanitizePrefs({ speed: 1, speedV: 2 }, true).speed).toBe(1);
    expect(sanitizePrefs({ speed: 8, speedV: 2 }, true).speed).toBe(8);
  });

  it('call 3: SKIP takes no card, pays 2 chips, turns all three cards down for the act, and the RUN LOG says so', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const run = createRun(defaultConfig(), seed);
      run.pendingStart = null;
      run.records.push({ enemy: 'TEST', won: true, turns: 3, hpBefore: 300, hpAfter: 280, rocksAdded: 0, rocksCrumbled: 0 } as (typeof run.records)[number]);
      const offers = draftOffers(run);
      const strips = JSON.stringify(run.player.strips);
      const chips = run.player.chips;
      skipDraft(run);
      expect(RUN.skipChips).toBe(2);
      expect(run.player.chips).toBe(chips + 2);
      expect(JSON.stringify(run.player.strips)).toBe(strips);
      expect(passedThisAct(run).size).toBe(offers.length);
      expect(run.records.at(-1)!.skipped).toBe(true);
      expect(run.records.at(-1)!.pick).toBeUndefined();
      expect(runSummary(run)).toContain('SKIPPED THE DRAFT (+2 CHIPS)');
    }
  });

  it('call 5: SECOND MORTGAGE pays x1.5', () => {
    expect(LEGEND_RELIC.devilPay).toBe(1.5);
  });
});
