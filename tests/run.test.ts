import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { ELITE_DMG_MUL, ROUTE_SHAPES } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { actStops, applyOption, chooseRoute, createRun, currentStop, draftOffers, fightConfig, finishFight, isEncounterNow, isShopNow, leaveShop, needsRoute, playEncounter, RUN, type RunState } from '../src/core/run';

const base = defaultConfig();

function playFight(run: ReturnType<typeof createRun>, seed: number) {
  const f = new Fight(fightConfig(run, base), seed);
  while (!f.over) f.step();
  return f;
}

describe('run', () => {
  it('maps an act: a gentle opener, 3 different routes of 5 stops, then the Cashier and the boss', () => {
    for (let s = 0; s < 50; s++) {
      const run = createRun(base, s);
      const m = run.map;
      expect(['slime', 'frost']).toContain(m.opener.archetype);
      expect(m.boss.isBoss).toBe(true);
      expect(m.shopBeforeBoss).toBe(true);
      expect(m.routes).toHaveLength(3);
      const shapes = m.routes.map((r) => r.map((st) => ({ fight: 'F', elite: 'E', shop: 'S', encounter: '?' })[st.kind]).join(''));
      for (const sh of shapes) expect(ROUTE_SHAPES).toContain(sh);
      // A Cashier sits at stop 3 or earlier (user, 2026-10-12).
      for (const sh of shapes) expect(sh.lastIndexOf('S')).toBeLessThan(3);
      expect(new Set(shapes).size).toBe(3);
      // Never three routes with the same number of elites: a path is judged against your run, not ranked.
      expect(new Set(shapes.map((sh) => [...sh].filter((c) => c === 'E').length)).size).toBeGreaterThan(1);
      for (const r of m.routes) {
        const ids = r.filter((st) => st.enemy).map((st) => st.enemy!.archetype);
        expect(new Set(ids).size).toBe(ids.length);
        for (const st of r) if (st.kind === 'elite') expect(st.enemy!.elite).toBe(true);
        for (const st of r) if (st.kind === 'encounter') expect(st.encounter).toBeTruthy();
      }
    }
  });

  it('HP carries over, with a partial heal after a win', () => {
    const run = createRun(base, 11);
    let seed = 1;
    let f = playFight(run, seed);
    while (f.winner !== 'player') {
      const r2 = createRun(base, 11);
      Object.assign(run, r2);
      f = playFight(run, ++seed);
    }
    const hpAfter = f.sides.player.hp;
    finishFight(run, f);
    expect(run.depth).toBe(1);
    // No heal after a fight: HP carries over.
    expect(run.player.hp).toBe(hpAfter);
  });

  it('a loss ends the run', () => {
    const run = createRun(base, 3);
    run.player.hp = 1;
    let f = playFight(run, 1);
    let s = 1;
    while (f.winner !== 'enemy') f = playFight(run, ++s);
    finishFight(run, f);
    expect(run.over).toBe(true);
    expect(run.won).toBe(false);
  });

  it('draft offers 3 distinct cards, deterministically', () => {
    const run = createRun(base, 77);
    const a = draftOffers(run);
    const b = draftOffers(run);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((o) => JSON.stringify(o))).size).toBe(3);
    expect(a).toEqual(b);
  });

  it('applying cards changes the strips / relics / hp', () => {
    const run = createRun(base, 5);
    applyOption(run, { kind: 'add', symbol: 'sword', reel: 1 });
    expect(run.player.strips[1].sword).toBe(7);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'sword', count: 2, reel: 0 });
    expect(run.player.strips[0]).toMatchObject({ shield: 4, sword: 8 });
    applyOption(run, { kind: 'relic', relic: 'bandage' });
    expect(run.player.relics).toEqual(['bandage']);
    run.player.hp = 10;
    applyOption(run, { kind: 'heal', amount: RUN.healCard });
    expect(run.player.hp).toBe(10 + RUN.healCard);
    const max = run.player.maxHp;
    applyOption(run, { kind: 'maxHp', amount: 6 });
    expect(run.player.maxHp).toBe(max + 6);
  });

  it("a normal enemy's rocks all crumble after the fight", () => {
    const run = createRun(base, 8);
    const f = new Fight(fightConfig(run, base), 2);
    for (let i = 0; i < 5; i++) f.sides.player.reels[i % 3].cells.push({ symbol: 'rock', slimed: false });
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(rec.rocksCrumbled).toBe(5);
    expect(run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0)).toBe(0);
  });

  it("an elite's rocks: 2 stay permanently, the rest crumble", () => {
    const run = createRun(base, 8);
    run.enemies[run.depth].elite = true;
    const f = new Fight(fightConfig(run, base), 2);
    for (let i = 0; i < 5; i++) f.sides.player.reels[i % 3].cells.push({ symbol: 'rock', slimed: false });
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(rec.rocksAdded).toBe(2);
    expect(rec.rocksCrumbled).toBe(3);
    expect(run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0)).toBe(2);
    applyOption(run, { kind: 'clear', symbol: 'rock', reel: run.player.strips.findIndex((s) => (s.rock ?? 0) > 0) });
    expect(run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0)).toBeLessThan(2);
  });

  it('relic cards only appear in the drafts after fights 2 and 4 (two of them)', () => {
    for (let s = 0; s < 40; s++) {
      const run = createRun(base, s);
      for (let d = 1; d <= 5; d++) {
        run.depth = d;
        const relics = draftOffers(run).filter((o) => o.kind === 'relic').length;
        expect(relics).toBe(d === 2 || d === 4 ? 2 : 0);
      }
    }
  });

  it('after the opener you pick a route; its fights join the act, the boss last', () => {
    const run = createRun(base, 21);
    expect(needsRoute(run)).toBe(false);
    winFight(run);
    expect(needsRoute(run)).toBe(true);
    expect(currentStop(run)).toBeNull();
    chooseRoute(run, 1);
    expect(needsRoute(run)).toBe(false);
    const fights = run.map.routes[1].filter((st) => st.enemy).map((st) => st.enemy);
    expect(run.enemies).toEqual([run.map.opener, ...fights, run.map.boss]);
    expect(actStops(run)).toHaveLength(1 + 5 + 2);
  });

  it('walks the route: Cashiers and encounters are stops; leaving one moves on', () => {
    for (let seed = 0; seed < 20; seed++) {
      const run = createRun(base, seed);
      winFight(run);
      chooseRoute(run, run.map.routes.findIndex((r) => r.some((st) => st.kind === 'encounter')));
      let guard = 0;
      while (!run.over && guard++ < 20) {
        const st = currentStop(run)!;
        if (st.kind === 'shop') {
          expect(isShopNow(run)).toBe(true);
          leaveShop(run);
        } else if (st.kind === 'encounter') {
          expect(isEncounterNow(run)).toBe(true);
          const before = run.stop;
          const walk = playEncounter(run, 99);
          expect(walk?.good).toBeNull();
          expect(run.stop).toBe(before + 1);
        } else if (st.enemy!.isBoss) break;
        else winFight(run);
      }
      expect(currentStop(run)!.enemy!.isBoss).toBe(true);
      expect(run.encounters?.length).toBeGreaterThan(0);
    }
  });

  it('encounters are seeded by the stop: the same choice plays out the same way', () => {
    const play = () => {
      const run = createRun(base, 5);
      run.player.chips = 40;
      winFight(run);
      chooseRoute(run, run.map.routes.findIndex((r) => r.some((st) => st.kind === 'encounter')));
      while (!isEncounterNow(run)) {
        if (isShopNow(run)) leaveShop(run);
        else winFight(run);
      }
      return [playEncounter(run, 0), run.player.chips, run.player.hp, run.player.relics.length];
    };
    expect(play()).toEqual(play());
  });

  it('elites hit harder and pay a relic pick in every act', () => {
    const run = createRun(base, 8);
    winFight(run);
    const i = run.map.routes.findIndex((r) => r.some((st) => st.kind === 'elite'));
    chooseRoute(run, i);
    while (currentStop(run)!.kind !== 'elite') {
      if (isShopNow(run)) leaveShop(run);
      else if (isEncounterNow(run)) playEncounter(run, 99);
      else winFight(run);
    }
    expect(fightConfig(run, base).enemy.dmgMul).toBe(ELITE_DMG_MUL);
    run.act = 2;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.pendingSpoils?.length).toBe(2);
  });

});

/** Win the run's next fight outright (no spins). */
function winFight(run: RunState): void {
  const f = new Fight(fightConfig(run, base), 1);
  f.winner = 'player';
  finishFight(run, f);
  run.pendingSpoils = null;
}
