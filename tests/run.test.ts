import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { RUN_FIGHTS } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, draftOffers, fightConfig, finishFight, RUN } from '../src/core/run';

const base = defaultConfig();

function playFight(run: ReturnType<typeof createRun>, seed: number) {
  const f = new Fight(fightConfig(run, base), seed);
  while (!f.over) f.step();
  return f;
}

describe('run', () => {
  it('generates 5 procedural fights then the boss, gentle first', () => {
    for (let s = 0; s < 50; s++) {
      const run = createRun(base, s);
      expect(run.enemies).toHaveLength(RUN_FIGHTS + 1);
      expect(run.enemies.at(-1)!.isBoss).toBe(true);
      expect(['slime', 'brute']).toContain(run.enemies[0].archetype);
      for (let i = 1; i < RUN_FIGHTS; i++) expect(run.enemies[i].archetype).not.toBe(run.enemies[i - 1].archetype);
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
    expect(run.player.hp).toBe(Math.min(run.player.maxHp, hpAfter + Math.round(RUN.startHp * RUN.postFightHeal)));
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
    expect(run.player.strips[1].sword).toBe(5);
    applyOption(run, { kind: 'remove', symbol: 'shield', reel: 0 });
    expect(run.player.strips[0].shield).toBe(3);
    applyOption(run, { kind: 'relic', relic: 'clover' });
    expect(run.player.relics).toEqual(['clover']);
    run.player.hp = 10;
    applyOption(run, { kind: 'heal', amount: RUN.healCard });
    expect(run.player.hp).toBe(10 + RUN.healCard);
    const max = run.player.maxHp;
    applyOption(run, { kind: 'maxHp', amount: 6 });
    expect(run.player.maxHp).toBe(max + 6);
  });

  it('rocks the golem adds persist into the next fight', () => {
    const run = createRun(base, 8);
    const f = new Fight(fightConfig(run, base), 2);
    f.sides.player.reels[0].cells.push({ symbol: 'rock', slimed: false });
    f.sides.enemy.hp = 0;
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(rec.rocksAdded).toBe(1);
    expect(run.player.strips[0].rock).toBe(1);
    expect(fightConfig(run, base).player.strips[0].rock).toBe(1);
  });
});
