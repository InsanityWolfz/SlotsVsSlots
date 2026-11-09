import { beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig, mergeConfig } from '../src/core/config';
import { CABINET_ORDER } from '../src/core/cabinets';
import { createRun, type RunState } from '../src/core/run';
import { MAX_STAKE } from '../src/core/stakes';
import { playRun } from '../src/sim/play';
import { loadRunSave, RUN_KEY } from '../src/saves';

/**
 * QA FUNC-07 (2026-11-09): a saved run is cleaned on load (CLAUDE.md: "Saves are cleaned on load"). In the browser a
 * stake of 99 opened the crash panel on every CONTINUE, garbage TWENTY-ONE state did the same, and a run at -50 HP
 * fought on. Values a player could live with are clamped; a made-up place on the map drops the save.
 */
const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
  };
});
const put = (mut: (r: RunState) => void, at = 'fight') => {
  const run = createRun(mergeConfig(undefined), 31, 'tesla', 1);
  mut(run);
  mem.set(RUN_KEY, JSON.stringify({ v: 1, at, run }));
};
/** An encounter stop with a game in play (`state`) is where the run stands. */
const atEncounter = (id: string, state: unknown) => (r: RunState) => {
  r.route = 0;
  r.map.routes[0][0] = { kind: 'encounter', encounter: id } as RunState['map']['routes'][number][number];
  r.stop = 1;
  r.depth = 1;
  (r as { encounterState?: unknown }).encounterState = state;
};

describe('FUNC-07: a saved run is cleaned on load', () => {
  it('a sane save loads (control)', () => {
    put(() => {});
    expect(loadRunSave()?.run.stake).toBe(1);
  });
  it('an out-of-range stake is clamped', () => {
    put((r) => (r.stake = 99));
    expect(loadRunSave()!.run.stake).toBe(MAX_STAKE);
  });
  it('HP at or under 0 plays on at 1; a missing number is full; over the max is the max', () => {
    put((r) => (r.player.hp = -50));
    expect(loadRunSave()!.run.player.hp).toBe(1);
    put((r) => ((r.player as { hp: unknown }).hp = 'abc'));
    const s = loadRunSave()!;
    expect(s.run.player.hp).toBe(s.run.player.maxHp);
    put((r) => (r.player.hp = 1e9));
    const t = loadRunSave()!;
    expect(t.run.player.hp).toBe(t.run.player.maxHp);
  });
  it('chips that are not a count become 0', () => {
    put((r) => ((r.player as { chips: unknown }).chips = null));
    expect(loadRunSave()!.run.player.chips).toBe(0);
    put((r) => (r.player.chips = -7));
    expect(loadRunSave()!.run.player.chips).toBe(0);
  });
  it("a made-up place on the map drops the save (act 7, depth 99, stop 99, a route that isn't there)", () => {
    const muts: ((r: RunState) => void)[] = [(r) => (r.act = 7), (r) => (r.depth = 99), (r) => (r.stop = 99), (r) => (r.route = 42)];
    for (const mut of muts) {
      put(mut);
      expect(loadRunSave()).toBeNull();
    }
  });
  it('no enemies or no strips drops the save', () => {
    put((r) => (r.enemies = []));
    expect(loadRunSave()).toBeNull();
    put((r) => (r.player.strips = []));
    expect(loadRunSave()).toBeNull();
  });
  it('a game in play with garbage state starts over (TWENTY-ONE, HIGHER OR LOWER, THE CLAW)', () => {
    put(atEncounter('bj', { p: 'x', d: null, bet: 'y' }), 'next');
    expect(loadRunSave()!.run.encounterState).toBeUndefined();
    put(atEncounter('hilo', { card: 'x', pot: -5, bet: null }), 'next');
    expect(loadRunSave()!.run.encounterState).toBeUndefined();
    put(atEncounter('claw', { won: 'x', misses: null }), 'next');
    expect(loadRunSave()!.run.encounterState).toBeUndefined();
  });
  it('a game in play with good state is kept as it was', () => {
    const states: [string, object][] = [
      ['bj', { bet: 3, p: [10, 6], d: [9], dealt: 1 }],
      ['bj', { dealt: 2 }],
      ['hilo', { bet: 2, pot: 2, card: 7, right: 0, game: 1 }],
      ['hilo', { games: 1 }],
      ['claw', { won: [1], misses: [0, 2, 0] }],
    ];
    for (const [id, st] of states) {
      put(atEncounter(id, st), 'next');
      expect(loadRunSave()!.run.encounterState).toEqual(st);
    }
  });
  it('unknown relics in a pending pick are dropped (an empty pick is no pick)', () => {
    put((r) => ((r as { pendingSpoils: unknown }).pendingSpoils = ['nope', 'bandage']), 'after');
    expect(loadRunSave()!.run.pendingSpoils).toEqual(['bandage']);
    put((r) => ((r as { pendingLegend: unknown }).pendingLegend = ['nope']), 'after');
    expect(loadRunSave()!.run.pendingLegend).toBeNull();
  });
  it('a broken saved Cashier shelf is dealt again; a good one is kept', () => {
    put((r) => ((r as { shelf?: unknown }).shelf = [{ option: null, price: 'x' }]), 'next');
    expect(loadRunSave()!.run.shelf).toBeUndefined();
    const shelf = [{ option: { kind: 'maxHp', amount: 40 }, price: 8, sold: true }];
    put((r) => ((r as { shelf?: unknown }).shelf = shelf), 'next');
    expect(loadRunSave()!.run.shelf).toEqual(shelf);
  });
  it('ride is only a won run', () => {
    put((r) => {
      r.over = true;
      r.won = false;
    }, 'ride');
    expect(loadRunSave()).toBeNull();
  });
  it('every real run state before a fight survives the cleaning unchanged (5 machines, WHITE and RED, into ENDLESS)', () => {
    let checked = 0;
    for (const cab of CABINET_ORDER)
      for (const stake of [0, 1])
        for (let seed = 1; seed <= 4; seed++)
          playRun(defaultConfig(), seed * 977 + stake, cab, stake, {
            ride: true,
            onFight: (run) => {
              const json = JSON.stringify(run);
              mem.set(RUN_KEY, JSON.stringify({ v: 1, at: 'fight', run }));
              const back = loadRunSave();
              expect(back, `${cab} ${stake} ${seed} act ${run.act} depth ${run.depth} stop ${run.stop}`).not.toBeNull();
              expect(JSON.stringify(back!.run)).toBe(json);
              checked++;
            },
          });
    expect(checked).toBeGreaterThan(200);
  }, 20_000);
});
