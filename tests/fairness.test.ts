import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { TUNE } from '../src/core/enemies';

const reels3 = (s: Record<string, number>) => [{ ...s }, { ...s }, { ...s }];

describe('fairness guards (EXPERT_PLAYTEST_3)', () => {
  it('E2: a regular enemy never takes more than 40% of your max HP in one turn', () => {
    const c = defaultConfig();
    c.player.hp = c.player.startHp = 200;
    c.player.strips = reels3({ rock: 12 }) as never;
    c.enemy = { hp: 99999, strips: reels3({ seven: 12 }) as never, name: 'BRUTE' };
    const f = new Fight(c, 3);
    let worst = 0;
    for (let i = 0; i < 12 && !f.over; i++) {
      const hp = f.sides.player.hp;
      const { side } = f.step();
      if (side === 'enemy') worst = Math.max(worst, hp - f.sides.player.hp);
    }
    expect(worst).toBeLessThanOrEqual(200 * TUNE.turnCap);
  });

  it('E3: a reel that just thawed cannot be frozen on the very next enemy turn', () => {
    const c = defaultConfig();
    c.player.strips = reels3({ sword: 12 }) as never;
    c.enemy = { hp: 99999, strips: reels3({ ice: 12 }) as never, ability: { kind: 'blizzard', every: 1, power: 3 }, name: 'FROST' };
    const f = new Fight(c, 5);
    const frozenAfterThaw: boolean[] = [];
    let thawed: number[] = [];
    for (let i = 0; i < 30 && !f.over; i++) {
      const { events } = f.step();
      for (const e of events as CombatEvent[]) {
        if (e.type === 'thaw' && e.side === 'player' && e.status === 'frozen') thawed = e.reels;
        if (e.type === 'freeze' && e.to === 'player') {
          frozenAfterThaw.push(e.targets.some((r) => thawed.includes(r)));
          thawed = [];
        }
      }
    }
    expect(frozenAfterThaw.some(Boolean)).toBe(false);
  });

  it('E4: marks are capped per reel', () => {
    const c = defaultConfig();
    c.player.strips = reels3({ sword: 12 }) as never;
    c.enemy = { hp: 99999, strips: reels3({ card: 12 }) as never, ability: { kind: 'mark', every: 1, power: 6 }, name: 'SHARP' };
    const f = new Fight(c, 9);
    for (let i = 0; i < 20 && !f.over; i++) f.step();
    for (const reel of f.sides.player.reels) expect(reel.cells.filter((x) => x.carded).length).toBeLessThanOrEqual(TUNE.marksPerReel);
  });
});
