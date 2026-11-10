import { describe, expect, it } from 'vitest';
import { endlessPlace, ROOM_V2, type Scene } from '../src/render/rooms';
import { endlessLate } from '../src/render/roomEndless';

// ENDLESS on the rooms v2 journey (user, 2026-11-09): each loop replays the strip toward its boss later in the night.
const scene = (o: Partial<Scene>): Scene => ({ room: 'floor', boss: null, loop: 1, hp: 1, foeHp: 1, turn: null, fight: true, fightIndex: 0, regulars: 4, ...o });

describe('ENDLESS rooms (v2)', () => {
  it('the night gets later each loop, closing time by THE OWNER (loop 5)', () => {
    expect(endlessLate(0)).toBe(0);
    expect(endlessLate(1)).toBeCloseTo(0.3);
    for (let L = 2; L <= 5; L++) expect(endlessLate(L)).toBeGreaterThan(endlessLate(L - 1));
    expect(endlessLate(5)).toBe(1);
    expect(endlessLate(9)).toBe(1);
  });

  it("each loop's strip leads to its boss, and the boss fight is that boss's room", () => {
    ROOM_V2.station = null;
    expect(endlessPlace(scene({ loopBoss: 'house' }))).toEqual({ kind: 'floor', station: 0, exit: true });
    expect(endlessPlace(scene({ loopBoss: 'wheel', fightIndex: 3 }))).toEqual({ kind: 'floor', station: 3, exit: false });
    expect(endlessPlace(scene({ loopBoss: 'dealer', fightIndex: 2 }))).toEqual({ kind: 'hr', station: 2 });
    expect(endlessPlace(scene({ loopBoss: 'owner' }))).toEqual({ kind: 'floor', station: 0, exit: false });
    expect(endlessPlace(scene({ boss: 'house' }))).toEqual({ kind: 'lobby' });
    expect(endlessPlace(scene({ boss: 'wheel' }))).toEqual({ kind: 'wheel' });
    expect(endlessPlace(scene({ boss: 'dealer' }))).toEqual({ kind: 'table' });
    expect(endlessPlace(scene({ boss: 'owner' }))).toEqual({ kind: 'owner' });
    // The screens just before the boss already show their room.
    expect(endlessPlace(scene({ loopBoss: 'dealer', atBoss: true, fight: false }))).toEqual({ kind: 'table' });
  });

  it('outside ENDLESS (and with rooms v2 off) it stays out of the way', () => {
    expect(endlessPlace(scene({ loop: 0, loopBoss: 'house' }))).toBeNull();
    ROOM_V2.on = false;
    expect(endlessPlace(scene({ loopBoss: 'house' }))).toBeNull();
    ROOM_V2.on = true;
  });
});
