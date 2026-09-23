import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { RUN_FIGHTS } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { applyOption, chooseEnemy, createRun, draftOffers, fightConfig, finishFight, needsChoice, optionDelta, RUN } from '../src/core/run';

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
      expect(['slime', 'frost']).toContain(run.enemies[0].archetype);
      for (let i = 1; i < RUN_FIGHTS; i++) for (const o of run.paths[i]) for (const q of run.paths[i - 1]) expect(o.archetype).not.toBe(q.archetype);
      for (const d of [1, 2, 3]) expect(run.paths[d]).toHaveLength(2);
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
    applyOption(run, { kind: 'swap', from: 'shield', to: 'bolt', count: 2, reel: 0 });
    expect(run.player.strips[0]).toMatchObject({ shield: 2, bolt: 6 });
    applyOption(run, { kind: 'relic', relic: 'clover' });
    expect(run.player.relics).toEqual(['clover']);
    run.player.hp = 10;
    applyOption(run, { kind: 'heal', amount: RUN.healCard });
    expect(run.player.hp).toBe(10 + RUN.healCard);
    const max = run.player.maxHp;
    applyOption(run, { kind: 'maxHp', amount: 6 });
    expect(run.player.maxHp).toBe(max + 6);
  });

  it('only 2 rocks per fight stay permanently; the rest crumble', () => {
    const run = createRun(base, 8);
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

  it('forks: choosing sets the enemy', () => {
    const run = createRun(base, 21);
    run.depth = 1;
    expect(needsChoice(run)).toBe(true);
    chooseEnemy(run, 1);
    expect(run.enemies[1]).toBe(run.paths[1][1]);
    expect(needsChoice(run)).toBe(false);
  });

  it('card stat deltas move the right way', () => {
    const run = createRun(base, 4);
    const d = optionDelta(run, { kind: 'swap', from: 'shield', to: 'bolt', count: 2, reel: 0 }, base);
    const [, from, to] = d.match(/([\d.]+) TO ([\d.]+)/)!;
    expect(d.startsWith('ENERGY')).toBe(true);
    expect(Number(to)).toBeGreaterThan(Number(from));
  });
});
