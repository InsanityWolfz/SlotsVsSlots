import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type GameConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { createRun, fightConfig } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e) => e.type === t) as Extract<CombatEvent, { type: T }>[];

function juke(mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, 'jukebox'), base);
  c.enemy = { hp: 99999, strips: reels3({ shield: 12 }) };
  c.player.bonusSymbols = false;
  mut?.(c);
  return new Fight(c, seed);
}
/** Player spin, then the enemy's. */
function round(f: Fight, line: string[]): CombatEvent[] {
  f.forceNext('player', line as never);
  const evs = f.step().events;
  f.step();
  return evs;
}

describe('THE JUKEBOX (DJ DECIBEL)', () => {
  it('notes on the payline turn the volume up; a spin with no note skips 2', () => {
    const f = juke();
    round(f, ['note', 'note', 'shield']);
    expect(f.volume).toBe(2);
    round(f, ['shield', 'shield', 'shield']);
    expect(f.volume).toBe(0);
  });

  it('notes hit +20% per volume', () => {
    const f = juke();
    round(f, ['note', 'note', 'note']); // volume 3
    const hit = ofType(round(f, ['note', 'note', 'shield']), 'attack')[0].amount;
    const g = juke();
    const plain = ofType(round(g, ['note', 'note', 'shield']), 'attack')[0].amount;
    expect(hit).toBeGreaterThan(plain);
  });

  it('at 6 the beat drops: every note in the window hits, then the volume falls to 3', () => {
    const f = juke((c) => (c.player.strips = reels3({ note: 12 })));
    round(f, ['note', 'note', 'note']);
    round(f, ['note', 'note', 'note']);
    expect(f.volume).toBe(6);
    const evs = round(f, ['note', 'note', 'note']);
    const drop = ofType(evs, 'drop')[0];
    expect(drop.cells.length).toBe(6);
    expect(drop.amount).toBeGreaterThan(0);
    expect(f.volume).toBe(3);
  });

  it('TURNTABLE leaves the volume at 5 after the drop; MIXTAPE stops the skip', () => {
    const f = juke((c) => {
      c.player.strips = reels3({ note: 12 });
      c.relics = ['turntable'];
    });
    round(f, ['note', 'note', 'note']);
    round(f, ['note', 'note', 'note']);
    round(f, ['note', 'note', 'note']);
    expect(f.volume).toBe(5);
    const m = juke((c) => (c.relics = ['mixtape']));
    round(m, ['note', 'note', 'shield']);
    round(m, ['shield', 'shield', 'shield']);
    expect(m.volume).toBe(2);
  });

  it('a WILD only turns the volume up when it pairs as a note', () => {
    const f = juke((c) => (c.player.strips = reels3({ note: 4, shield: 4, wild: 4 })));
    round(f, ['wild', 'shield', 'shield']);
    // The wild paired with the shields: no note, so the record skips (from 0, nothing to lose).
    expect(f.volume).toBe(0);
    round(f, ['note', 'wild', 'shield']);
    expect(f.volume).toBe(2);
  });

  it('the volume meter is full at 6 (HEADLINER raises it to 8)', () => {
    expect(juke().meterCost).toBe(6 * UNIT);
    expect(juke((c) => (c.player.big = { volumeMax: 8 })).meterCost).toBe(8 * UNIT);
  });
});
