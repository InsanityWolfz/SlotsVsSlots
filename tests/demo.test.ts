import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { CABINET_ORDER } from '../src/core/cabinets';
import { Fight } from '../src/core/fight';
import { fightConfig } from '../src/core/fightSetup';
import { createRun, currentEnemy, finishFight, runActs, skipToBoss } from '../src/core/run';
import { demoKey, demoMachines, demoRules, demoStakes, setDemo } from '../src/demo';
import { demoClearedHooks, fullGameMachines, HOOK_COLS, STAKES_LINE } from '../src/ui/run/demoCleared';
import { wrap } from '../src/ui/run/shared';

const base = defaultConfig();

/** Beat the act's boss (THE HOUSE in act 1). */
function beatBoss(run: ReturnType<typeof createRun>) {
  skipToBoss(run);
  const f = new Fight(fightConfig(run, base), 3);
  f.winner = 'player';
  finishFight(run, f);
}

describe('the act 1 demo', () => {
  afterEach(() => setDemo(false));

  it('off, it limits nothing', () => {
    const r = demoRules(false);
    expect(r.on).toBe(false);
    expect([...demoMachines(['knight', 'joker'], r)]).toEqual(['knight', 'joker']);
    const stakes = { knight: 5, tesla: 2 };
    expect(demoStakes(stakes, r)).toBe(stakes);
    expect(demoKey('slotvslot.prefs.v2', false)).toBe('slotvslot.prefs.v2');
  });

  it('on: KNIGHT and TESLA at WHITE, one act', () => {
    const r = demoRules(true);
    expect([...demoMachines(CABINET_ORDER, r)].sort()).toEqual(['knight', 'tesla']);
    // Even a save with every machine and stake opens only those two, at WHITE.
    expect([...demoMachines([], r)].sort()).toEqual(['knight', 'tesla']);
    expect(demoStakes({ knight: 5, tesla: 3, joker: 4 }, r)).toEqual({ knight: 0, tesla: 0 });
    expect(r.acts).toBe(1);
  });

  it('on: its saves are its own (every slotvslot. key gets demo.)', () => {
    expect(demoKey('slotvslot.prefs.v2', true)).toBe('demo.slotvslot.prefs.v2');
    expect(demoKey('slotvslot.profile.v1', true)).toBe('demo.slotvslot.profile.v1');
    expect(demoKey('slotvslot.run.v1.bak', true)).toBe('demo.slotvslot.run.v1.bak');
    expect(demoKey('other.key', true)).toBe('other.key');
  });

  it('the full game: beating THE HOUSE starts act 2', () => {
    const run = createRun(base, 21);
    expect(runActs(run)).toBe(2);
    beatBoss(run);
    expect(run.over).toBe(false);
    expect(run.act).toBe(2);
  });

  it('the demo: THE HOUSE is the last fight, and beating it wins the run', () => {
    setDemo(true);
    const run = createRun(base, 21);
    expect(runActs(run)).toBe(1);
    skipToBoss(run);
    expect(currentEnemy(run).isBoss).toBe(true);
    expect(currentEnemy(run).archetype).toBe('house');
    beatBoss(run);
    expect(run.over).toBe(true);
    expect(run.won).toBe(true);
    expect(run.act).toBe(1);
    expect(run.endless).toBeUndefined();
    expect(run.pendingLegend).toBeNull();
  });

  it('the demo: RED stake would add act 3 in the full game, never in the demo', () => {
    setDemo(true);
    expect(runActs(createRun(base, 5, 'tesla', 1))).toBe(1);
    setDemo(false);
    expect(runActs(createRun(base, 5, 'tesla', 1))).toBe(3);
  });

  it('DEMO CLEARED shows the three machines the demo leaves out, each line in two rows at most', () => {
    setDemo(true);
    expect(fullGameMachines()).toEqual(['jukebox', 'joker', 'midas']);
    const hooks = demoClearedHooks();
    expect(hooks).toHaveLength(6);
    for (const h of hooks) {
      expect(h).not.toBe('');
      expect(wrap(h, HOOK_COLS).length).toBeLessThanOrEqual(2);
    }
    expect(STAKES_LINE).toBe('6 STAKES FROM WHITE TO GOLD. IN ENDLESS YOU PLAY ON UNTIL YOU BUST');
  });
});
