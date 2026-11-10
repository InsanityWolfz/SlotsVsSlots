/**
 * THE ROOMS (user, 2026-10-13: "the background is kind of boring"; v2 and v3 the same day, after the playtesters
 * called v1 the best visual feature yet: "really get creative"). Each act is a place, and it stays behind every screen
 * of the act (the Cashier, the encounters, the drafts), not only the fights:
 *   act 1 THE ALLEY: night, rain. Pigeons on the laundry line (they scatter on your jackpot), a cat on the dumpster,
 *     a bookie's chalkboard, a rat, a gutter pouring, a doorman by the DEN door (it swings open on your jackpot, the
 *     peephole slides now and then), the DEN neon in the puddle, car headlights sweeping past.
 *   act 2 THE FLOOR: neon CASINO / LUCKY 7 down the walls, a neon cherries sign over the floor, eye-in-the-sky cameras
 *     that watch whichever machine is spinning, gamblers with their own stories (one wins a bucket of coins, one
 *     bonks his machine), a waitress crossing, a balloon drop on your jackpot.
 *   act 3 THE VIP ROOM: a grand chandelier with candle flames (it sways on your jackpot), past bosses' portraits whose
 *     eyes follow the play, Slot Machines under glass, a pianist, a champagne tower that fills on your jackpot,
 *     velvet ropes, cigar haze, gold dust in the light.
 *   ENDLESS goes round the three, darker and more gold each loop, and the room escalates (user, 2026-10-14): a back
 *   row of fans fills in, loose bills drift down the strips, spotlights sweep from loop 3, and THE TURBO brings red
 *   beacons.
 * Bosses take the open column between the HUDs: the House's vault door (it loses rivets as the House loses HP and
 * stands ajar near the end), THE WHEEL's table seen at an angle with its croupier, the Dealer himself behind his felt.
 * The crowd at the corners dresses for the room; your jackpot makes them jump, theirs puts their hands on their heads,
 * and under 30% HP one of them can't look.
 *
 * Where it draws: the fight covers the middle (the two machines, their HUDs, the marquee, the buttons), so the detail
 * lives in the side strips (x < 40 and x > 280 here), the column between the HUDs (x 125-195, y 17-62) and the floor.
 * Behind the turn text in the middle, a quiet zone (a shadow pool) keeps the fight readable. Drawn in chunky pixels at
 * a quarter size (320x180), scaled up 4x without smoothing; the still parts once per room, the live parts every frame.
 * Nothing flashes: the strongest tint is under 0.1 (FLASH_CAP is 0.2).
 * Files: the acts in roomAlley.ts, roomFloor.ts and roomVip.ts, the bosses in roomBosses.ts, the shared helpers in roomKit.ts;
 * this one keeps the types, the room cache, the crowd, the Rooms class and roomFor.
 */
import { alley, buildAlley } from './roomAlley';
import { dealer, owner, vault, wheel } from './roomBosses';
import { buildFloor, floor } from './roomFloor';
import { canvas, FLOOR_Y, hexA, LH, LW, MID, NEON, rect, seeded, type RoomArt } from './roomKit';
import { drawEntrance, entranceCheer, entranceUpdate } from './roomEntrance';
import { buildVip, vip } from './roomVip';
import { drawStreet, streetStation } from './roomStreet';
import { drawFloorStation, FLOOR_STATIONS, floorStation } from './roomCasinoFloor';
import { drawWheelRoom, wheelRoomUpdate } from './roomWheel';
import { drawHighRoller, hrStation, HR_STATIONS, type DealerState } from './roomHighRoller';
import { drawLobby, drawNightCrew, drawOwnerRoom, endlessLate, lobbyUpdate, ownerUpdate } from './roomEndless';
import { drawMenuStreet, drawPawnShop, type MenuPlace } from './roomMenu';

/** Rooms v2 (the style key, 2026-11-09): THE HOUSE's room is the casino entrance, and act 1 is the street toward it
 * (roomStreet.ts). Off: the old alley and vault. `station` forces act 1's station (dbg, the gallery); null: by depth. */
export const ROOM_V2 = { on: true, station: null as number | null };

/** Act 1 on the v2 street: which place this scene is at (a street station, or the casino's door), or null when the
 * scene isn't act 1's street (another act, ENDLESS, a menu). */
export function streetPlace(s: Scene): number | 'door' | null {
  if (!ROOM_V2.on || s.room !== 'alley' || s.loop > 0) return null;
  if (s.boss === 'house' || (!s.boss && s.atBoss)) return 'door';
  if (s.boss) return null;
  if (ROOM_V2.station !== null) return ROOM_V2.station;
  return streetStation(s.fightIndex ?? 0, s.regulars ?? 4);
}
/** Act 2 on the v2 casino floor (roomCasinoFloor.ts): a station down the aisle, or THE WHEEL's table at its end (her
 * fight, and the screens just before it); null when the scene isn't a run's act 2 floor (the menus keep their floor). */
export function floorPlace(s: Scene): number | 'wheel' | null {
  if (!ROOM_V2.on || s.room !== 'floor' || s.loop > 0) return null;
  if (s.boss === 'wheel') return 'wheel';
  if (s.boss || s.regulars === undefined) return null;
  if (s.atBoss) return 'wheel';
  if (ROOM_V2.station !== null) return Math.max(0, Math.min(FLOOR_STATIONS - 1, ROOM_V2.station));
  return floorStation(s.fightIndex ?? 0, s.regulars);
}
/** Act 3 in the v2 high-roller room (roomHighRoller.ts): a station down the aisle, or 'table' (THE DEALER's own, his
 * fight and the screens just before it), or null when the scene isn't act 3's room. */
export function hrPlace(s: Scene): number | 'table' | null {
  if (!ROOM_V2.on || s.room !== 'vip' || s.loop > 0) return null;
  if (s.boss === 'dealer' || (!s.boss && s.atBoss)) return 'table';
  if (s.boss) return null;
  if (ROOM_V2.station !== null) return Math.min(ROOM_V2.station, HR_STATIONS - 1);
  return hrStation(s.fightIndex ?? 0, s.regulars ?? 4);
}
/** ENDLESS on the v2 journey (roomEndless.ts): each loop replays the strip toward its boss later in the night. THE
 * DOORMAN's loop walks back through the floor to the casino's doors ('lobby' his room, seen from inside), THE WHEEL's
 * down the floor to her table, THE DEALER's through the high-roller room to his, THE OWNER's down the emptied floor to
 * him ('owner'). Null outside ENDLESS (or with rooms v2 off). */
export type EndlessPlace = { kind: 'floor'; station: number; exit: boolean } | { kind: 'hr'; station: number } | { kind: 'lobby' | 'wheel' | 'table' | 'owner' };
export function endlessPlace(s: Scene): EndlessPlace | null {
  if (!ROOM_V2.on || s.loop <= 0) return null;
  const lb = s.boss ?? s.loopBoss ?? null;
  if (!lb) return null;
  if (s.boss || s.atBoss) return { kind: lb === 'house' ? 'lobby' : lb === 'wheel' ? 'wheel' : lb === 'dealer' ? 'table' : 'owner' };
  const n = s.regulars ?? 4;
  const i = s.fightIndex ?? 0;
  if (lb === 'dealer') return { kind: 'hr', station: ROOM_V2.station ?? hrStation(i, n) };
  return { kind: 'floor', station: ROOM_V2.station ?? floorStation(i, n), exit: lb === 'house' };
}

/** Where a v2 journey scene is: act 1's street (0-3, 'door'), act 2's floor (0-3, 'wheel') or act 3's high-roller room
 * (0-3, 'table'); null for the old rooms. */
export const roomPlace = (s: Scene) => streetPlace(s) ?? floorPlace(s) ?? hrPlace(s);
/** The room draws its own air (rain), so the drifting motes stay off (they're another pixel size). */
export const roomV2Air = (s: Scene) => (ROOM_V2.on && (s.boss === 'house' || !!s.menu)) || roomPlace(s) !== null || endlessPlace(s) !== null;

export { LH, LW } from './roomKit';

export type RoomId = 'alley' | 'floor' | 'vip';
export type BossSet = 'house' | 'wheel' | 'dealer' | 'owner' | null;

export interface Scene {
  room: RoomId;
  boss: BossSet;
  /** ENDLESS loop (0 outside it): each loop darker and more gold. */
  loop: number;
  /** Your HP share in a fight (1 outside one): under 30% the room pulses red. */
  hp: number;
  /** The enemy's HP share (1 outside a fight): the House's vault gives way as it falls. */
  foeHp: number;
  /** Who's spinning (the cameras and the portraits watch them). */
  turn: 'player' | 'enemy' | null;
  /** In a fight (the crowd only shows there; between fights the room is a backdrop under the screens). */
  fight: boolean;
  /** The draft is up: THE DOORMAN steps out of view at his doors (the route track's boss stop sat on his head). */
  draft?: boolean;
  /** ENDLESS loop 5: THE TURBO is in the room (red beacons, the crowd backs off). */
  turbo?: boolean;
  /** THE HOUSE's pot (rooms v2: the entrance's lights grow with it). */
  pot?: number;
  /** The journey (rooms v2): this fight's index among the act's regular fights, how many there are, and whether the
   * act's boss is the next stop (the street's end: the casino's door). */
  fightIndex?: number;
  regulars?: number;
  atBoss?: boolean;
  /** This fight's enemy archetype (a station's small per-enemy touch). */
  enemy?: string | null;
  /** THE WHEEL's table (rooms v2: her room reads it): chips on your reels, turns to NO MORE BETS, SPINS FASTER, and the
   * gutter wheel's angle (the table's wheel turns with it). */
  wheel?: { bets: number; left: number; fast: boolean; angle: number };
  /** THE DEALER's fight (rooms v2's high-roller room): his hand, ALL IN armed, his trick's charge. */
  dealer?: DealerState;
  /** ENDLESS: this loop's boss (its strip leads to them; rooms v2). */
  loopBoss?: BossSet;
  /** THE OWNER's fight: rungs of his ladder climbed (0-4). */
  owner?: { rungs: number };
  /** The player's juice settings the boss rooms honour: LIGHTNING SOFT, and flashes off. */
  soft?: boolean;
  flash?: boolean;
  /** Outside a run (rooms v2, roomMenu.ts): the menus stand on the street ('street'), CHOOSE YOUR MACHINE at the pawn
   * shop ('pawn'). */
  menu?: MenuPlace;
}

// ---- the still layers --------------------------------------------------------------------------------------------

const built = new Map<RoomId, RoomArt>();
function room(id: RoomId): RoomArt {
  let r = built.get(id);
  if (!r) {
    r = id === 'alley' ? buildAlley() : id === 'floor' ? buildFloor() : buildVip();
    built.set(id, r);
  }
  return r;
}

// ---- the crowd ---------------------------------------------------------------------------------------------------

type Look = 'hood' | 'beanie' | 'umbrella' | 'visor' | 'loud' | 'cup' | 'tux' | 'gown' | 'monocle';
interface Fan {
  x: number;
  h: number;
  phase: number;
  skin: string;
}
/** Three at each bottom corner, clear of the buttons (playtest). Their clothes come from the room. */
const FANS: Fan[] = (() => {
  const rnd = seeded(5);
  const skins = ['#e8b48a', '#a8704a', '#6a4028', '#f0c8a0', '#c8946a', '#8a5a3a'];
  return [5, 16, 27, 293, 304, 315].map((x, i) => ({ x, h: 20 + Math.floor(rnd() * 6), phase: rnd() * Math.PI * 2, skin: skins[i % skins.length] }));
})();
/** ENDLESS's back row: between and behind the front six, filled in two a loop. */
const BACK_ROW: Fan[] = (() => {
  const rnd = seeded(9);
  return [10, 310, 22, 298, 33, 287, 0, 320].map((x) => ({ x, h: 18 + Math.floor(rnd() * 6), phase: rnd() * Math.PI * 2, skin: '#3a2a2a' }));
})();
const DRESS: Record<RoomId, { look: Look; coat: string; hair: string }[]> = {
  alley: [
    { look: 'hood', coat: '#2a2a3a', hair: '#1a1008' },
    { look: 'umbrella', coat: '#3a2a1a', hair: '#1a1008' },
    { look: 'beanie', coat: '#3a1a1a', hair: '#8a2a2a' },
    { look: 'beanie', coat: '#1a2a2a', hair: '#2a5a5a' },
    { look: 'hood', coat: '#4a3a1a', hair: '#1a1008' },
    { look: 'umbrella', coat: '#2a1a3a', hair: '#5a3a1a' },
  ],
  floor: [
    { look: 'visor', coat: '#ff6a8a', hair: '#ffffff' },
    { look: 'loud', coat: '#2a8a8a', hair: '#5a3a1a' },
    { look: 'cup', coat: '#8a6a2a', hair: '#c9a227' },
    { look: 'loud', coat: '#8a2a8a', hair: '#1a1008' },
    { look: 'visor', coat: '#3a6aaa', hair: '#ffd23f' },
    { look: 'cup', coat: '#5a8a3a', hair: '#3a3a3a' },
  ],
  vip: [
    { look: 'tux', coat: '#0e0a10', hair: '#1a1008' },
    { look: 'gown', coat: '#8a0c2a', hair: '#c9a227' },
    { look: 'monocle', coat: '#141018', hair: '#c8c8c8' },
    { look: 'gown', coat: '#2a1a5a', hair: '#1a1008' },
    { look: 'tux', coat: '#0e0a10', hair: '#5a3a1a' },
    { look: 'tux', coat: '#1a0e0a', hair: '#3a3a3a' },
  ],
};

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  life: number;
  /** Balloons fall slowly and are bigger; coins bounce; birds flap. */
  kind?: 'balloon' | 'coin' | 'bird' | 'bill';
}

/** The live layer: lights, people, weather, the boss's set piece, the reactions. */
export class Rooms {
  private live: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  /** Your jackpot's reaction: 1 when it lands, fading to 0. */
  private cheerT = 0;
  /** Theirs: the crowd's hands go to their heads, the waitress drops her tray, a pigeon has its say. */
  groanT = 0;
  bits: Bit[] = [];
  private lastRoom: RoomId | null = null;
  /** The pigeons on the line flew off (they come back after a while). */
  flown = 0;
  time = 0;
  /** The loop being drawn (update spawns ENDLESS's falling bills from it). */
  private loopNow = 0;

  constructor() {
    [this.live, this.g] = canvas();
  }

  /** A jackpot landed: yours cheers the room, theirs makes it wince. */
  cheer(ours: boolean): void {
    entranceCheer(ours);
    if (!ours) {
      this.groanT = 1;
      return;
    }
    this.cheerT = 1;
    const cols = ['#ffd23f', '#ff4fa3', '#4fe3ff', '#5aff7a', '#ffffff'];
    const room = this.lastRoom;
    for (let i = 0; i < 60; i++) {
      const x = [MID + (Math.random() - 0.5) * 70, Math.random() * 40, LW - Math.random() * 40][i % 3];
      this.bits.push({ x, y: -Math.random() * 30, vx: (Math.random() - 0.5) * 14, vy: 18 + Math.random() * 22, c: cols[i % cols.length], life: 3 + Math.random() * 2 });
    }
    // The floor's balloon drop, down the side strips.
    if (room === 'floor')
      for (let i = 0; i < 14; i++)
        this.bits.push({ x: i % 2 ? Math.random() * 36 + 2 : LW - 38 + Math.random() * 36, y: -10 - Math.random() * 40, vx: (Math.random() - 0.5) * 3, vy: 8 + Math.random() * 5, c: NEON[i % NEON.length], life: 14, kind: 'balloon' });
    // The alley's pigeons take off.
    if (room === 'alley' && this.time > this.flown) {
      this.flown = this.time + 14;
      for (let i = 0; i < 5; i++) this.bits.push({ x: 128 + i * 15, y: 22, vx: (i - 2) * 14, vy: -22 - Math.random() * 10, c: '#8a8a98', life: 3, kind: 'bird' });
    }
  }

  update(dt: number): void {
    this.time += dt;
    entranceUpdate(dt);
    wheelRoomUpdate(dt);
    lobbyUpdate(dt);
    ownerUpdate(dt);
    // ENDLESS: loose bills drift down the side strips, more each loop.
    if (this.loopNow >= 2 && Math.random() < dt * Math.min(3, 0.4 * this.loopNow)) {
      const left = Math.random() < 0.5;
      this.bits.push({ x: left ? 2 + Math.random() * 34 : LW - 36 + Math.random() * 34, y: -4, vx: (Math.random() - 0.5) * 4, vy: 7 + Math.random() * 5, c: '#4a8a3a', life: 30, kind: 'bill' });
    }
    this.cheerT = Math.max(0, this.cheerT - dt / 1.6);
    this.groanT = Math.max(0, this.groanT - dt / 2.2);
    for (const b of this.bits) {
      if (b.kind === 'balloon' || b.kind === 'bill') b.x += Math.sin(b.y * 0.1 + b.life) * 4 * dt;
      else if (!b.kind) b.x += Math.sin(b.y * 0.2) * 6 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.kind === 'coin') {
        b.vy += 120 * dt;
        if (b.y > FLOOR_Y + 2) {
          b.y = FLOOR_Y + 2;
          b.vy *= -0.4;
          b.vx *= 0.7;
        }
      }
      b.life -= dt;
    }
    this.bits = this.bits.filter((b) => b.life > 0 && b.y < LH + 4 && b.y > -80);
  }

  draw(ctx: CanvasRenderingContext2D, s: Scene, time: number): void {
    if (ROOM_V2.on && s.menu) {
      if (s.menu === 'pawn') drawPawnShop(ctx, time);
      else drawMenuStreet(ctx, time);
      return;
    }
    const ep = endlessPlace(s);
    if (ep) {
      this.drawEndless(ctx, s, ep, time);
      this.overlays(ctx, s, time, this.cheerT, true);
      return;
    }
    const place = streetPlace(s);
    if ((ROOM_V2.on && s.boss === 'house') || place === 'door') {
      drawEntrance(ctx, { pot: s.pot ?? 0, foeHp: s.boss === 'house' ? s.foeHp : 1, turn: s.turn, time, away: !!s.draft });
      this.overlays(ctx, s, time, this.cheerT);
      return;
    }
    if (place !== null) {
      drawStreet(ctx, { station: place, time, enemy: s.enemy });
      this.overlays(ctx, s, time, this.cheerT);
      return;
    }
    const fp = floorPlace(s);
    if (fp === 'wheel') {
      const w = s.wheel ?? { bets: 0, left: 3, fast: false, angle: time * 0.6 };
      drawWheelRoom(ctx, { time, foeHp: s.boss === 'wheel' ? s.foeHp : 1, ...w });
      this.overlays(ctx, s, time, this.cheerT);
      return;
    }
    if (fp !== null) {
      drawFloorStation(ctx, { station: fp, time });
      this.overlays(ctx, s, time, this.cheerT);
      return;
    }
    const hr = hrPlace(s);
    if (hr !== null) {
      drawHighRoller(ctx, { place: hr, time, foeHp: s.boss === 'dealer' ? s.foeHp : 1, turn: s.turn, dealer: s.dealer, fight: s.fight && s.boss === 'dealer' });
      this.overlays(ctx, s, time, this.cheerT);
      return;
    }
    const art = room(s.room);
    this.loopNow = s.loop;
    if (this.lastRoom !== s.room) {
      this.lastRoom = s.room;
      this.bits = [];
    }
    const g = this.g;
    g.clearRect(0, 0, LW, LH);
    const cheer = this.cheerT;
    // (A boss's set piece takes the open column: the room's own centrepiece steps aside.)
    const mid = !s.boss;
    if (s.room === 'alley') alley(this, g, time, cheer, mid);
    else if (s.room === 'floor') floor(this, g, art, s, time, cheer, mid);
    else vip(this, g, art, s, time, cheer, mid);
    if (s.boss === 'house') vault(g, time, cheer, s.foeHp);
    else if (s.boss === 'wheel') wheel(g, time);
    else if (s.boss === 'dealer') dealer(g, time, s.room);
    else if (s.boss === 'owner') owner(g, time, cheer, s.foeHp);
    if (s.loop >= 3) this.spotlights(g, time, s.loop);
    if (s.turbo) this.beacons(g, time);
    if (s.fight && s.loop > 0) this.backRow(g, s, time, cheer);
    if (s.fight) this.crowd(g, s, time, cheer);
    for (const b of this.bits) {
      g.globalAlpha = Math.min(1, b.life);
      if (b.kind === 'balloon') {
        g.fillStyle = b.c;
        g.beginPath();
        g.ellipse(b.x, b.y, 2, 2.6, 0, 0, Math.PI * 2);
        g.fill();
        rect(g, b.x, b.y + 3, 1, 4, '#c8c0d0');
      } else if (b.kind === 'bird') {
        const up = Math.floor(time * 12 + b.x) % 2;
        rect(g, b.x - 1, b.y, 3, 1, b.c);
        rect(g, b.x - 2, b.y - (up ? 1 : -1), 1, 1, b.c);
        rect(g, b.x + 2, b.y - (up ? 1 : -1), 1, 1, b.c);
      } else if (b.kind === 'bill') {
        const flip = Math.sin(time * 5 + b.x) > 0;
        rect(g, b.x, b.y, flip ? 3 : 2, 2, '#4a8a3a');
        rect(g, b.x + 1, b.y, 1, flip ? 2 : 1, '#8ad06a');
      } else rect(g, b.x, b.y, b.kind === 'coin' || Math.sin(time * 9 + b.x) > 0 ? 2 : 1, 1, b.c);
    }
    g.globalAlpha = 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.still, 0, 0, LW * 4, LH * 4);
    ctx.drawImage(this.live, 0, 0, LW * 4, LH * 4);
    ctx.restore();
    this.overlays(ctx, s, time, cheer);
  }

  /** ENDLESS on the v2 journey: the loop's strip later in the night, the closing shift, the boss rooms. */
  private drawEndless(ctx: CanvasRenderingContext2D, s: Scene, ep: EndlessPlace, time: number): void {
    const late = endlessLate(s.loop);
    if (ep.kind === 'floor') {
      drawFloorStation(ctx, { station: ep.station, time, late, exit: ep.exit });
      drawNightCrew(ctx, 'floor', late, time, ep.station);
    } else if (ep.kind === 'hr') {
      drawHighRoller(ctx, { place: ep.station, time, late });
      drawNightCrew(ctx, 'hr', late, time);
    } else if (ep.kind === 'lobby') {
      drawLobby(ctx, { pot: s.pot ?? 0, foeHp: s.boss === 'house' ? s.foeHp : 1, turn: s.turn, time });
    } else if (ep.kind === 'wheel') {
      const w = s.wheel ?? { bets: 0, left: 3, fast: false, angle: time * 0.6 };
      drawWheelRoom(ctx, { time, foeHp: s.boss === 'wheel' ? s.foeHp : 1, ...w, late });
    } else if (ep.kind === 'table') {
      drawHighRoller(ctx, { place: 'table', time, late, foeHp: s.boss === 'dealer' ? s.foeHp : 1, turn: s.turn, dealer: s.dealer, fight: s.fight && s.boss === 'dealer' });
    } else {
      // THE OWNER: the floor emptied (act 2's last station, closing time), then him under the spotlight.
      drawFloorStation(ctx, { station: FLOOR_STATIONS - 1, time, late: 1, bare: true });
      drawOwnerRoom(ctx, { time, foeHp: s.boss === 'owner' ? s.foeHp : 1, rungs: s.owner?.rungs ?? 0, turn: s.turn, fight: s.fight && s.boss === 'owner', soft: !!s.soft, flash: s.flash !== false });
    }
  }

  /** The tints over the room: ENDLESS's darkening, THE TURBO's red, a jackpot's glow, the low-HP pulse. (`v2`: the
   * journey's rooms darken themselves by the loop, so the loop's own tint stays off.) */
  private overlays(ctx: CanvasRenderingContext2D, s: Scene, time: number, cheer: number, v2 = false): void {
    const full = (c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    };
    if (s.loop > 0 && !v2) {
      full(`rgba(4,2,8,${Math.min(0.4, 0.08 * s.loop)})`);
      full(`rgba(201,162,39,${Math.min(0.08, 0.02 * s.loop)})`);
    }
    if (s.turbo && !v2) full(`rgba(255,30,30,${0.04 + 0.02 * Math.sin(time * 5)})`);
    if (cheer > 0) full(hexA('#ffd23f', 0.05 * cheer));
    if (this.groanT > 0) full(hexA('#ff4a3a', 0.07 * this.groanT));
    if (s.fight && s.hp < 0.3) {
      const k = (0.3 - s.hp) / 0.3;
      const a = (0.1 + 0.06 * Math.sin(time * 2.5)) * (0.5 + 0.5 * k);
      const rg = ctx.createRadialGradient(LW * 2, LH * 2, LH * 1.3, LW * 2, LH * 2, LW * 2.4);
      rg.addColorStop(0, 'rgba(255,40,40,0)');
      rg.addColorStop(1, `rgba(255,40,40,${a})`);
      ctx.fillStyle = rg;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    }
  }

  // ---- ENDLESS escalation (user, 2026-10-14) ----------------------------------------------------------------------

  /** Loop 3 on: two spotlights sweep down the side strips, like a headliner's walk-on. */
  private spotlights(g: CanvasRenderingContext2D, t: number, loop: number): void {
    const a = Math.min(0.1, 0.03 * (loop - 1));
    for (const [x0, ph] of [[20, 0], [LW - 20, 2.1]] as const) {
      const sway = Math.sin(t * 0.7 + ph) * 14;
      g.fillStyle = `rgba(255,240,200,${a})`;
      g.beginPath();
      g.moveTo(x0 - 2, 0);
      g.lineTo(x0 + 2, 0);
      g.lineTo(x0 + sway + 12, LH);
      g.lineTo(x0 + sway - 12, LH);
      g.closePath();
      g.fill();
      rect(g, x0 - 3, 0, 6, 3, '#2a2a34');
    }
  }

  /** THE TURBO: red beacons spin at the top of both strips. */
  private beacons(g: CanvasRenderingContext2D, t: number): void {
    for (const x of [8, LW - 8]) {
      const ang = t * 5 + (x > MID ? Math.PI : 0);
      const dx = Math.cos(ang);
      g.fillStyle = `rgba(255,40,30,${0.3 * Math.max(0, Math.sin(ang)) + 0.06})`;
      g.beginPath();
      g.moveTo(x, 8);
      g.lineTo(x + dx * 50 - 12, 90);
      g.lineTo(x + dx * 50 + 12, 90);
      g.closePath();
      g.fill();
      rect(g, x - 4, 2, 8, 7, Math.sin(ang) > 0.3 ? '#ff5a4a' : '#9a1a1a');
      rect(g, x - 2, 3, 2, 2, '#ffd0c8');
      rect(g, x - 5, 9, 10, 2, '#3a3a44');
    }
  }

  /** ENDLESS: a back row of fans fills in behind the front six, 2 more a loop (up to 8). */
  private backRow(g: CanvasRenderingContext2D, s: Scene, t: number, cheer: number): void {
    const n = Math.min(BACK_ROW.length, s.loop * 2);
    const shade = ['#2a2238', '#34284a', '#262034', '#30263e'];
    for (let i = 0; i < n; i++) {
      const f = BACK_ROW[i];
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 8 + f.phase)) * 4 * cheer : 0;
      const top = LH - f.h - 9 - Math.sin(t * 1.1 + f.phase) * 0.6 - jump + (s.turbo ? 2 : 0);
      const c = shade[i % shade.length];
      rect(g, f.x - 4, top + 7, 8, f.h, c);
      rect(g, f.x - 3, top, 6, 7, '#5a4038');
      if (jump > 1 || (s.turbo && Math.sin(t * 3 + f.phase) > 0.7)) {
        rect(g, f.x - 6, top - 3, 2, 9, c);
        rect(g, f.x + 4, top - 3, 2, 9, c);
      }
    }
  }

  // ---- the crowd -------------------------------------------------------------------------------------------------

  /** Three at each bottom corner, dressed for the room. Your jackpot: they jump, arms up. Theirs: hands on heads,
   * mouths open. Under 30% HP one of them covers their eyes. */
  private crowd(g: CanvasRenderingContext2D, s: Scene, t: number, cheer: number): void {
    const dress = DRESS[s.room];
    const groan = this.groanT;
    FANS.forEach((f, i) => {
      const d = dress[i];
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 9 + f.phase)) * 5 * cheer : 0;
      const top = LH - f.h - Math.sin(t * 1.3 + f.phase) * 0.6 - jump + 2 * groan;
      const hw = 10;
      const look = f.x < MID ? 1 : -1;
      rect(g, f.x - hw / 2, top + 8, hw, f.h, d.coat);
      rect(g, f.x - hw / 2, top + 8, 1, f.h, 'rgba(0,0,0,0.33)');
      if (d.look === 'tux') {
        rect(g, f.x - 1, top + 8, 3, 7, '#f0ece6');
        rect(g, f.x - 1, top + 8, 3, 1, '#141018');
      } else if (d.look === 'gown') {
        rect(g, f.x - hw / 2 - 1, top + 14, hw + 2, f.h, d.coat);
        rect(g, f.x - 3, top + 7, 6, 1, '#f0ece6');
      } else if (d.look === 'loud') {
        for (let k = 0; k < 4; k++) rect(g, f.x - 3 + (k % 2) * 4, top + 10 + k * 3, 2, 2, '#ffd23f');
      } else if (d.look === 'cup') rect(g, f.x + hw / 2 - 1, top + 13, 3, 4, '#c0c0c8');
      rect(g, f.x - 3, top, 6, 7, f.skin);
      rect(g, f.x - 1 + look, top + 3, 1, 1, '#140c1c');
      rect(g, f.x + 1 + look, top + 3, 1, 1, '#140c1c');
      if (d.look === 'monocle') rect(g, f.x + 1 + look, top + 2, 2, 2, '#e8c84a');
      if (cheer > 0.2) rect(g, f.x, top + 5, 2, 1, '#5a1a1a');
      if (groan > 0.2) rect(g, f.x - 1 + look, top + 5, 2, 2, '#3a1010');
      if (d.look === 'hood') {
        rect(g, f.x - 4, top - 1, 8, 4, d.coat);
        rect(g, f.x - 4, top + 3, 1, 5, d.coat);
      } else if (d.look === 'beanie') rect(g, f.x - 3, top - 2, 6, 3, d.hair);
      else if (d.look === 'visor') rect(g, f.x - 3, top, 8, 1, d.hair);
      else if (d.look === 'gown') rect(g, f.x - 4, top - 2, 8, 4, d.hair);
      else rect(g, f.x - 3, top - 1, 6, 2, d.hair);
      if (d.look === 'umbrella') {
        g.fillStyle = '#1a1a2a';
        g.beginPath();
        g.arc(f.x, top - 2, 9, Math.PI, 0);
        g.fill();
        rect(g, f.x, top - 2, 1, 8, '#0a0a0a');
        if (Math.floor(t * 2 + f.phase) % 3 === 0) rect(g, f.x - 9, top - 1 + ((t * 20) % 6), 1, 1, 'rgba(170,180,230,0.8)');
      }
      const cantLook = s.hp < 0.3 && i === 1;
      if (jump > 1) {
        rect(g, f.x - hw / 2 - 2, top - 2, 2, 10, d.coat);
        rect(g, f.x + hw / 2, top - 2, 2, 10, d.coat);
        rect(g, f.x - hw / 2 - 2, top - 4, 2, 2, f.skin);
        rect(g, f.x + hw / 2, top - 4, 2, 2, f.skin);
      } else if (groan > 0.2) {
        rect(g, f.x - hw / 2 - 1, top + 1, 2, 8, d.coat);
        rect(g, f.x + hw / 2 - 1, top + 1, 2, 8, d.coat);
        rect(g, f.x - 3, top - 1, 2, 2, f.skin);
        rect(g, f.x + 1, top - 1, 2, 2, f.skin);
      } else if (cantLook) rect(g, f.x - 3, top + 2, 6, 2, f.skin);
    });
  }
}

/** The room for an act (ENDLESS goes round all three, starting from the floor). */
export const roomFor = (act: number, loop: number): RoomId => (loop > 0 ? (['floor', 'vip', 'alley'] as const)[(loop - 1) % 3] : act <= 1 ? 'alley' : act === 2 ? 'floor' : 'vip');
