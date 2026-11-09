import { describe, expect, it } from 'vitest';
import { STREET_STATIONS, streetStation } from '../src/render/roomStreet';
import { ROOM_V2, streetPlace, type Scene } from '../src/render/rooms';

const base: Scene = { room: 'alley', boss: null, loop: 0, hp: 1, foeHp: 1, turn: null, fight: true };

describe('the journey: act 1 walks down the street toward the casino', () => {
  it('spreads an act of regular fights over the four stations, the first far off and the last the block before the door', () => {
    expect(STREET_STATIONS).toBe(4);
    const run = (n: number) => Array.from({ length: n }, (_, i) => streetStation(i, n));
    expect(run(4)).toEqual([0, 1, 2, 3]);
    expect(run(3)).toEqual([0, 2, 3]);
    expect(run(5)).toEqual([0, 1, 2, 2, 3]);
    expect(run(6)).toEqual([0, 1, 1, 2, 2, 3]);
    expect(run(1)).toEqual([0]);
    // never backward
    for (const n of [2, 3, 4, 5, 6, 7, 8]) for (let i = 1; i < n; i++) expect(streetStation(i, n)).toBeGreaterThanOrEqual(streetStation(i - 1, n));
  });

  it('puts the act 1 boss (and the screens just before it) at the casino door, and leaves the other acts alone', () => {
    expect(streetPlace({ ...base, fightIndex: 0, regulars: 4 })).toBe(0);
    expect(streetPlace({ ...base, fightIndex: 3, regulars: 4 })).toBe(3);
    expect(streetPlace({ ...base, fight: false, atBoss: true })).toBe('door');
    expect(streetPlace({ ...base, boss: 'house' })).toBe('door');
    expect(streetPlace({ ...base, room: 'floor' })).toBeNull();
    expect(streetPlace({ ...base, loop: 2 })).toBeNull();
    expect(streetPlace({ ...base, boss: 'wheel' })).toBeNull();
    ROOM_V2.on = false;
    expect(streetPlace(base)).toBeNull();
    ROOM_V2.on = true;
  });
});
