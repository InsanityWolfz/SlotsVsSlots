import { describe, expect, it } from 'vitest';
import { HR_STATIONS, hrStation } from '../src/render/roomHighRoller';
import { hrPlace, ROOM_V2, streetPlace, type Scene } from '../src/render/rooms';

const base: Scene = { room: 'vip', boss: null, loop: 0, hp: 1, foeHp: 1, turn: null, fight: true };

describe('the journey: act 3 walks down the high-roller room toward THE DEALER', () => {
  it('spreads an act of regular fights over the four stations, never backward', () => {
    expect(HR_STATIONS).toBe(4);
    const run = (n: number) => Array.from({ length: n }, (_, i) => hrStation(i, n));
    expect(run(4)).toEqual([0, 1, 2, 3]);
    expect(run(3)).toEqual([0, 2, 3]);
    expect(run(1)).toEqual([0]);
    for (const n of [2, 3, 4, 5, 6, 7, 8]) for (let i = 1; i < n; i++) expect(hrStation(i, n)).toBeGreaterThanOrEqual(hrStation(i - 1, n));
  });

  it("puts THE DEALER's fight (and the screens just before it) at his table, and leaves the other rooms alone", () => {
    expect(hrPlace({ ...base, fightIndex: 0, regulars: 4 })).toBe(0);
    expect(hrPlace({ ...base, fightIndex: 3, regulars: 4 })).toBe(3);
    expect(hrPlace({ ...base, fight: false, atBoss: true })).toBe('table');
    expect(hrPlace({ ...base, boss: 'dealer' })).toBe('table');
    // ENDLESS keeps the old rooms (the `late` hook isn't wired yet), and so do THE OWNER and the other acts.
    expect(hrPlace({ ...base, loop: 1 })).toBeNull();
    expect(hrPlace({ ...base, boss: 'owner' })).toBeNull();
    expect(hrPlace({ ...base, room: 'floor' })).toBeNull();
    expect(streetPlace(base)).toBeNull();
    ROOM_V2.station = 7;
    expect(hrPlace(base)).toBe(HR_STATIONS - 1);
    ROOM_V2.station = null;
    ROOM_V2.on = false;
    expect(hrPlace(base)).toBeNull();
    ROOM_V2.on = true;
  });
});
