import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { generateRunPaths, RUN_FIGHTS } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { POT } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import { counterFor, createRun, fightConfig, finishFight, mirrorCopy, scarReel, takeLegend } from '../src/core/run';
import { MAX_STAKE, STAKE, STAKES } from '../src/core/stakes';

const base = defaultConfig();

/** Beat the House so the run moves to act 2 (at this stake). */
function toAct2(cabinet: 'knight' | 'tesla' | 'midas', stake: number, seed = 3) {
  const run = createRun(base, seed, cabinet, stake);
  run.depth = RUN_FIGHTS;
  const f = new Fight(fightConfig(run, base), 1);
  f.winner = 'player';
  finishFight(run, f);
  if (run.pendingLegend) takeLegend(run, run.pendingLegend[0]);
  return run;
}

describe('HIGH STAKES', () => {
  it('has 6 stakes, clamps the level, and stores it on the run and fight config', () => {
    expect(STAKES.length).toBe(MAX_STAKE + 1);
    expect(createRun(base, 1, 'knight', 99).stake).toBe(MAX_STAKE);
    const run = createRun(base, 1, 'knight', 2);
    expect(fightConfig(run, base).stake).toBe(2);
  });

  it('BLUE: one act 2 fork (fight 3) is your counter, marked', () => {
    for (let seed = 1; seed < 12; seed++) {
      const run = toAct2('tesla', STAKE.counterForks, seed);
      expect(counterFor(run)).toBe('grounder');
      const fork = run.paths[2];
      const c = fork.find((e) => e.archetype === 'grounder');
      expect(c?.counter).toBe(true);
      expect(run.paths.flat().filter((e) => e.counter).length).toBe(1);
    }
  });

  it('RED (SCARS): every 4th win leaves a permanent rock (reel 3 first)', () => {
    const run = createRun(base, 4, 'midas', STAKE.scars);
    const rocks = () => run.player.strips.reduce((a, x) => a + (x.rock ?? 0), 0);
    for (let i = 0; i < 4; i++) {
      const f = new Fight(fightConfig(run, base), i + 1);
      f.winner = 'player';
      finishFight(run, f);
    }
    expect(rocks()).toBe(1);
    expect(run.player.strips[2].rock).toBe(1);
    expect(run.records[3].scar).toBe(2);
    expect(scarReel(run)).toBe(1);
  });

  it('BLACK: the House carries bombs and skims every 3 turns', () => {
    const run = createRun(base, 2, 'knight', STAKE.houseDirty);
    run.depth = RUN_FIGHTS;
    const cfg = fightConfig(run, base);
    expect(cfg.enemy.strips.every((s) => (s.bomb ?? 0) === STAKE.houseBombsPerReel)).toBe(true);
    expect(new Fight(cfg, 1).sides.enemy.ability!.every).toBe(STAKE.houseSkimEvery);
    const plain = createRun(base, 2, 'knight', 1);
    plain.depth = RUN_FIGHTS;
    expect(new Fight(fightConfig(plain, base), 1).sides.enemy.ability!.every).toBe(POT.cashEvery);
  });

  it('GREEN: the Mirror copies one of your relics; BLUE (act 2) / GOLD (all): abilities charge faster', () => {
    const run = toAct2('knight', STAKE.mirrorRelic);
    run.player.relics.push('key');
    run.depth = RUN_FIGHTS;
    run.paths = generateRunPaths(new Rng(1), 2);
    run.enemies = run.paths.map((o) => o[0]);
    expect(fightConfig(run, base).enemy.relics).toEqual(['key']);
    // Your legendary comes first when the Mirror can use it (over ordinary relics).
    run.player.relics = ['prism', 'phoenix'];
    expect(mirrorCopy(run)).toBe('phoenix');
    run.player.relics = ['prism', 'overcharge'];
    expect(mirrorCopy(run)).toBe('prism');

    const c = defaultConfig();
    c.enemy = { hp: 99, strips: reels3({ shield: 12 }), ability: { kind: 'smash', every: 3, power: 4 } };
    expect(new Fight({ ...c, stake: STAKE.fasterAct2 }, 1).sides.enemy.ability!.every).toBe(3);
    expect(new Fight({ ...c, stake: STAKE.fasterAct2, enemy: { ...c.enemy, act: 2 } }, 1).sides.enemy.ability!.every).toBe(2);
    expect(new Fight({ ...c, stake: STAKE.fasterAll }, 1).sides.enemy.ability!.every).toBe(2);
    expect(new Fight(c, 1).sides.enemy.ability!.every).toBe(3);
  });
});
