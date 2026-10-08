import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type GameConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { createRun, fightConfig } from '../src/core/run';
import { CHARM_VALUE } from '../src/core/charms';

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
    // 3 payline notes + 6 off the payline, and they hit as one.
    expect(drop.cells.length).toBe(9);
    expect(ofType(evs, 'attack').filter((a) => a.from === 'player').length).toBe(1);
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

  it('at the drop, a LUCKY cell off the payline rolls; a WILD plays as a note', () => {
    const old = CHARM_VALUE.lucky[1];
    CHARM_VALUE.lucky[1] = 100;
    try {
      const f = juke((c) => {
        c.player.strips = [{ note: 12 }, { note: 12 }, { shield: 12 }];
        c.player.gilded = [{ reel: 2, symbol: 'shield', enh: 'lucky', n: 12 }];
      });
      f.sides.player.energy = 6 * UNIT;
      f.sides.player.armed = true;
      const drop = ofType(round(f, ['note', 'note', 'shield']), 'drop')[0];
      // 3 on the payline (the lucky shield turned WILD), 4 notes off it, and 2 lucky shields off it come up WILD.
      expect(drop.cells.length).toBe(9);
      expect(drop.cells.filter((c) => c.wild).map((c) => c.reel)).toEqual([2, 2]);
    } finally {
      CHARM_VALUE.lucky[1] = old;
    }
  });

  it('HEADLINER doubles the whole drop (the payline notes too); the drop ignores what enemies wrote', () => {
    const mk = (big?: object) =>
      juke((c) => {
        c.player.strips = reels3({ note: 12 });
        if (big) c.player.big = big;
      });
    const amt = (f: Fight) => {
      f.sides.player.energy = f.meterCost;
      f.sides.player.armed = true;
      return ofType(round(f, ['note', 'note', 'note']), 'drop')[0].amount;
    };
    const plain = amt(mk());
    expect(amt(mk({ dropMul: 2 }))).toBe(plain * 2);
    // A jammed reel sits the drop out; a grounded note off the payline too.
    const j = mk();
    j.sides.player.locked[0] = 2;
    j.sides.player.energy = 60;
    j.sides.player.armed = true;
    const dj = ofType(round(j, ['note', 'note', 'note']), 'drop')[0];
    expect(dj.cells.filter((c) => c.row !== 1 && c.reel === 0).length).toBe(0);
  });

  it('BATTERY starts at 3; QUICKENING starts at max (the first spin drops)', () => {
    expect(juke((c) => (c.relics = ['battery'])).volume).toBe(3);
    const q = juke((c) => {
      c.player.strips = reels3({ note: 12 });
      c.player.big = { startFull: true };
    });
    expect(ofType(round(q, ['note', 'note', 'note']), 'drop').length).toBe(1);
  });

  it('the volume meter is full at 6 (HEADLINER raises it to 8)', () => {
    expect(juke().meterCost).toBe(6 * UNIT);
    expect(juke((c) => (c.player.big = { volumeMax: 8 })).meterCost).toBe(8 * UNIT);
  });
});

describe('THE JUKEBOX in the profile', () => {
  it('the ECHO Charm survives a profile reload', async () => {
    const { sanitizeProfile } = await import('../src/core/profile');
    const p = sanitizeProfile({ found: { relics: [], charms: ['echo', 'gold'] } });
    expect(p.found.charms).toContain('echo');
  });
});
