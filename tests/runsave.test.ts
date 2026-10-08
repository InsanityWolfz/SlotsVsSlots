import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, draftOffers, fightConfig, finishFight, shopOffers, type RunState } from '../src/core/run';

/** STEAM_READINESS S1: a saved run is plain JSON and plays on exactly as the live one would. */
describe('saved runs', () => {
  const play = (run: RunState) => {
    const base = defaultConfig();
    const f = new Fight(fightConfig(run, base), fightConfig(run, base).seed ?? undefined);
    for (let i = 0; i < 400 && !f.over; i++) f.step();
    return finishFight(run, f, true);
  };

  it('round-trips through JSON: same fights, same drafts, same shop', () => {
    const live = createRun(defaultConfig(), 4242, 'knight');
    live.pendingStart = null;
    const copy = JSON.parse(JSON.stringify(live)) as RunState;
    for (let k = 0; k < 3 && !live.over; k++) {
      const a = play(live);
      const b = play(copy);
      expect(b.won).toBe(a.won);
      expect(b.hpAfter).toBe(a.hpAfter);
      if (live.over) break;
      const da = draftOffers(live);
      expect(draftOffers(copy)).toEqual(da);
      applyOption(live, da[0]);
      applyOption(copy, da[0]);
    }
    expect(JSON.stringify(copy)).toBe(JSON.stringify(live));
    expect(shopOffers(copy)).toEqual(shopOffers(live));
  });

  it('a resumed fight is the same fight (no re-rolling by quitting)', () => {
    const run = createRun(defaultConfig(), 99, 'tesla');
    const s1 = fightConfig(run, defaultConfig()).seed;
    const s2 = fightConfig(JSON.parse(JSON.stringify(run)) as RunState, defaultConfig()).seed;
    expect(s1).not.toBeNull();
    expect(s2).toBe(s1);
  });
});
