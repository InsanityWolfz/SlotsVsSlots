/**
 * ACT 1'S GAMBLES (the user, 2026-11-10: inside a run every screen shows where you are). On the street the games aren't
 * on casino felt: TWENTY-ONE is dealt on an upturned crate in the alley, HIGHER OR LOWER at the dive bar's back table,
 * THE CLAW stands in an all-night laundromat. Acts 2-3 play on the casino's felt in front of the act's room (table.ts).
 *
 * The rooms v2 rules (roomEntrance.ts): the 640x360 grid at 2 screen pixels an art pixel, the portraits' palette and
 * 1px outline, stepped light (`pool`), no gradients. The table and its side panel cover the middle (art x 165-632,
 * y 46-282): each scene puts its character in the bands that show (the top band over the table, the floor under it,
 * the strips beside it); for THE CLAW the strips beside its cabinet show the laundromat's machines too.
 */
import { drawPatron, LOOKS } from './patrons';
import { mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawText } from './text';

export type EncounterRoom = 'bj' | 'hilo' | 'claw';

const K = '#140c1c';
const G = '#d9a640';
const Y = '#ffe45c';
const T = '#f4eee0';

/** The play surface's box on the grid (TABLE in table.ts, halved). */
const TB = { x: 165, y: 46, w: 336, h: 236 };
const TCX = TB.x + TB.w / 2;

// ---- the alley (TWENTY-ONE) --------------------------------------------------------------------------------------------

function alleyStill(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // The night between the walls, then the back wall's bricks (dark, low contrast), the wet ground.
  px(g, 0, 0, RW, RH, '#0d0816');
  px(g, 0, 0, RW, 12, '#120a20');
  for (let y = 12; y < 300; y += 6) {
    const off = (y / 6) % 2 ? 0 : 7;
    for (let x = -off; x < RW; x += 14) {
      px(g, x, y, 13, 5, (x * 7 + y * 3) % 5 === 0 ? '#251a2c' : '#1f1626');
      px(g, x, y, 13, 1, '#2a1f32');
    }
  }
  // The fire escape down the left wall: landings, a ladder, the railings.
  for (const ly of [26, 120, 214]) {
    px(g, 150, ly, 120, 3, '#3a3250');
    px(g, 150, ly + 3, 120, 1, K);
    for (let x = 152; x < 270; x += 8) px(g, x, ly - 12, 1, 12, '#2c2640');
    px(g, 150, ly - 13, 120, 1, '#3a3250');
  }
  for (let y = 26; y < 214; y += 6) px(g, 236, y, 14, 1, '#2c2640');
  px(g, 236, 26, 1, 188, '#3a3250');
  px(g, 249, 26, 1, 188, '#3a3250');
  // The ground: wet asphalt, a drain, puddles that catch the bulb.
  px(g, 0, 292, RW, RH - 292, '#120e1c');
  for (let y = 296; y < RH; y += 9) px(g, 0, y, RW, 1, '#17122a');
  px(g, 318, 330, 30, 6, '#0a0712');
  for (let x = 320; x < 346; x += 4) px(g, x, 331, 2, 4, '#1c1828');
  pool(g, 250, 322, 46, 6, '#3a3a5a', 0.6);
  pool(g, 452, 338, 38, 5, '#3a3a5a', 0.5);
  // Bottom left: stacked crates (the table's spares). Bottom right: the dumpster.
  const crate = outlined(44, 30, (cg) => {
    px(cg, 0, 0, 44, 30, '#5a3a20');
    for (let y = 2; y < 30; y += 7) px(cg, 0, y, 44, 1, '#3a2414');
    px(cg, 0, 0, 44, 2, '#7a5230');
    px(cg, 2, 2, 3, 26, '#4a2e18');
    px(cg, 39, 2, 3, 26, '#4a2e18');
  });
  g.drawImage(crate, 166, 318);
  g.drawImage(crate, 188, 290);
  g.drawImage(crate, 212, 318);
  const bin = outlined(84, 44, (bg) => {
    px(bg, 0, 6, 84, 38, '#1f4a3a');
    px(bg, 0, 6, 84, 3, '#2e6a52');
    px(bg, 0, 0, 84, 7, '#173a2e');
    for (let x = 8; x < 84; x += 16) px(bg, x, 12, 2, 28, '#173a2e');
    px(bg, 4, 40, 6, 4, K);
    px(bg, 74, 40, 6, 4, K);
  });
  g.drawImage(bin, 548, 306);
  // A trash bag beside it.
  const bag = outlined(22, 18, (bg) => {
    px(bg, 2, 4, 18, 14, '#1c1a26');
    px(bg, 4, 2, 14, 4, '#26222f');
    px(bg, 9, 0, 4, 3, '#26222f');
    px(bg, 5, 6, 3, 6, '#302a3c');
  });
  g.drawImage(bag, 524, 330);
  return c;
}

const LOOKOUT = { ...LOOKS[4], coat: '#3a3a30', legs: '#221e1a' };
function drawAlley(g: CanvasRenderingContext2D, t: number): void {
  g.drawImage(alley ??= alleyStill(), 0, 0);
  // The caged work light on its bracket, right of the title: it lights the wall and the crate's top (stepped, never a
  // flash; it hums a little).
  const lx = 470;
  const ly = 18;
  pool(g, lx, ly + 8, 64, 26, '#e8b060', 0.26 + 0.03 * Math.sin(t * 7));
  px(g, lx - 14, ly - 6, 15, 2, '#3a3250');
  px(g, lx - 1, ly - 6, 2, 6, '#3a3250');
  px(g, lx - 5, ly - 1, 11, 10, K);
  px(g, lx - 4, ly, 9, 8, Y);
  px(g, lx - 2, ly + 1, 3, 3, T);
  for (let k = -4; k <= 4; k += 3) px(g, lx + k, ly, 1, 8, '#4a4258');
  // A lookout by the dumpster, keeping an eye on the street (he stands still; a glance up the alley now and then).
  drawPatron(g, 610, 352, 46, LOOKOUT, t % 9 > 6.5 ? 'standL' : 'stand', false, 0.8);
  rain(g, t, 0.35);
}

// ---- the dive bar's back table (HIGHER OR LOWER) ------------------------------------------------------------------------

function barStill(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // Wood-panelled walls (vertical boards), a dado rail, the scuffed floor.
  px(g, 0, 0, RW, RH, '#1a110e');
  for (let x = 0; x < RW; x += 12) {
    px(g, x, 0, 11, 300, (x / 12) % 3 === 0 ? '#2a1a12' : '#24160f');
    px(g, x + 11, 0, 1, 300, '#140c0a');
  }
  px(g, 0, 150, RW, 4, '#3a2416');
  px(g, 0, 154, RW, 1, K);
  // The floor: dark boards.
  px(g, 0, 292, RW, RH - 292, '#1c120c');
  for (let y = 296; y < RH; y += 8) px(g, 0, y, RW, 1, '#140c08');
  for (let y = 296, k = 0; y < RH; y += 8, k++) for (let x = (k * 37) % 60; x < RW; x += 60) px(g, x, y, 1, 8, '#140c08');
  // Top right: the shelf of bottles behind the bar (amber, green, clear), lit from below.
  px(g, 512, 36, 128, 3, '#4a2e18');
  const glass = ['#c87a2a', '#3a8a4a', '#9ab8c8', '#8e1f3a', '#c87a2a', '#d9a640', '#3a8a4a', '#9ab8c8', '#c87a2a', '#6a3a8a'];
  glass.forEach((col, j) => {
    const x = 516 + j * 12;
    const h = 16 + ((j * 5) % 3) * 4;
    px(g, x - 1, 36 - h - 1, 8, h + 1, K);
    px(g, x, 36 - h, 6, h, col);
    px(g, x + 2, 36 - h - 6, 2, 6, col);
    px(g, x + 1, 36 - h + 2, 1, h - 4, T);
  });
  // A framed photo of a fight night on the left wall.
  const frame = outlined(46, 34, (fg) => {
    px(fg, 0, 0, 46, 34, G);
    px(fg, 3, 3, 40, 28, '#2a2030');
    px(fg, 12, 10, 8, 14, '#5a4a6a');
    px(fg, 26, 10, 8, 14, '#5a4a6a');
  });
  g.drawImage(frame, 196, 70);
  // Bottom left: a bar stool and a spittoon; bottom right: a coat on a hook-stand.
  const stool = outlined(26, 46, (sg) => {
    px(sg, 0, 0, 26, 7, '#8e1f3a');
    px(sg, 0, 0, 26, 2, '#b8304a');
    px(sg, 11, 7, 4, 34, '#4a4258');
    px(sg, 4, 40, 18, 4, '#4a4258');
  });
  g.drawImage(stool, 180, 300);
  g.drawImage(stool, 226, 300);
  // The lamp's cord over the table.
  px(g, TCX, 0, 1, 22, '#2a1a12');
  return c;
}

function drawBar(g: CanvasRenderingContext2D, t: number): void {
  g.drawImage(bar ??= barStill(), 0, 0);
  // The green-shaded lamp over the table.
  px(g, TCX - 14, 22, 29, 8, '#1f6a3a');
  px(g, TCX - 14, 22, 29, 2, '#3a9a5a');
  px(g, TCX - 15, 29, 31, 2, K);
  pool(g, TCX, 34, 80, 18, '#e8c070', 0.28);
  // The BEER neon on the wall, right of the title (one letter buzzes now and then).
  const nx = 444;
  const ny = 8;
  px(g, nx - 2, ny - 2, 60, 22, K);
  px(g, nx - 1, ny - 1, 58, 20, '#1a0e14');
  const dead = Math.sin(t * 13 + Math.sin(t * 2.3) * 5) > 0.93;
  ['B', 'E', 'E', 'R'].forEach((ch, j) => drawText(g, ch, nx + 9 + j * 13, ny + 9, 2, dead && j === 2 ? '#4a1a34' : '#e06aa8', { outline: K }));
  pool(g, nx + 28, ny + 9, 44, 16, '#ff4fa3', 0.12);
  // A regular nursing a drink at the next table, bottom right (seen from behind, still).
  drawPatron(g, 590, 340, 38, LOOKS[1], 'lean', true, 0.8);
}

// ---- the laundromat (THE CLAW) ------------------------------------------------------------------------------------------

function washer(x: number, y: number, g: CanvasRenderingContext2D, door: string): void {
  // A front-loader: a white box, its control strip, the round door (filled in live).
  px(g, x - 1, y - 1, 44, 50, K);
  px(g, x, y, 42, 48, '#c8c8d0');
  px(g, x, y, 42, 2, '#e8e8f0');
  px(g, x, y + 46, 42, 2, '#8a8a98');
  px(g, x + 2, y + 3, 38, 7, '#9a9aa8');
  px(g, x + 30, y + 5, 4, 3, '#3a8a4a');
  for (let k = 0; k < 3; k++) px(g, x + 5 + k * 6, y + 5, 3, 3, '#4a4a58');
  // The door's ring.
  const cx = x + 21;
  const cy = y + 29;
  for (let dy = -14; dy <= 14; dy++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, 196 - dy * dy)));
    px(g, cx - hw, cy + dy, hw * 2, 1, '#6a6a78');
  }
  for (let dy = -11; dy <= 11; dy++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, 121 - dy * dy)));
    px(g, cx - hw, cy + dy, hw * 2, 1, door);
  }
}

const WASHERS = [
  // the back row, along the wall (left strip, behind the cabinet, right of it)
  { x: 152, y: 206 }, { x: 196, y: 206 }, { x: 370, y: 206 }, { x: 414, y: 206 }, { x: 458, y: 206 }, { x: 552, y: 206 }, { x: 596, y: 206 },
];

function laundryStill(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // Cool tiled walls (small white tiles gone grey at night), the checkered floor.
  px(g, 0, 0, RW, RH, '#1a1e26');
  for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < RW; x += 8) px(g, x, y, 7, 7, (x + y) % 24 === 0 ? '#262c36' : '#222830');
  px(g, 0, 256, RW, 3, '#3a4250');
  for (let y = 262; y < RH; y += 12)
    for (let x = ((y - 262) / 12) % 2 ? 12 : 0; x < RW; x += 24) px(g, x, y, 12, 12, '#2a2e3a');
  px(g, 0, 259, RW, 3, '#141820');
  // Dryers stacked high on the wall (their doors dark).
  for (const x of [152, 196, 552, 596]) washer(x, 150, g, '#1a1c24');
  // The washers' row in front of the wall (doors drawn live, some spinning).
  for (const w of WASHERS) washer(w.x, w.y, g, '#20242e');
  // A folding table bottom left with a laundry basket; a vending machine edge on the far right.
  const basket = outlined(40, 24, (bg) => {
    px(bg, 0, 4, 40, 20, '#3a6ab0');
    for (let x = 3; x < 40; x += 6) px(bg, x, 8, 3, 12, '#28508a');
    px(bg, 4, 0, 32, 6, '#e8e0d0');
    px(bg, 10, 0, 8, 3, '#d86a6a');
  });
  g.drawImage(basket, 168, 318);
  px(g, 160, 342, 60, 3, '#6a6a78');
  px(g, 164, 345, 3, 12, '#4a4a58');
  px(g, 212, 345, 3, 12, '#4a4a58');
  // The fluorescent tubes' fittings across the top band.
  for (const x of [190, 300, 430, 560]) {
    px(g, x - 1, 7, 62, 7, K);
    px(g, x, 8, 60, 5, '#4a5060');
  }
  // OPEN 24 HRS on the glass, top right.
  return c;
}

function drawLaundry(g: CanvasRenderingContext2D, t: number): void {
  g.drawImage(laundry ??= laundryStill(), 0, 0);
  // The tubes: cool white, one of them ticking (a slow, small dip: no flash).
  [190, 300, 430, 560].forEach((x, j) => {
    const tick = j === 2 && Math.sin(t * 9 + Math.sin(t) * 3) > 0.96;
    px(g, x + 2, 9, 56, 3, tick ? '#8a94a4' : '#e8f0f8');
    pool(g, x + 30, 18, 44, 10, '#c8e0f0', tick ? 0.04 : 0.1);
  });
  // The running washers: their drums turn (a stepped tumble of colour behind the glass).
  WASHERS.forEach((w, j) => {
    if (j % 3 === 1) return;
    const cx = w.x + 21;
    const cy = w.y + 29;
    const a = t * (2 + (j % 2)) + j;
    for (let k = 0; k < 3; k++) {
      const ang = a + (k * Math.PI * 2) / 3;
      const col = ['#3a6ab0', '#d86a6a', '#e8e0d0'][(k + j) % 3];
      px(g, Math.round(cx + Math.cos(ang) * 5) - 3, Math.round(cy + Math.sin(ang) * 5) - 2, 6, 5, col);
    }
    px(g, cx - 3, cy - 7, 2, 4, '#5a6a80');
  });
  // OPEN 24 HRS in red neon on the window, top right.
  px(g, 590, 22, 48, 16, K);
  px(g, 591, 23, 46, 14, '#140a12');
  px(g, 594, 27, 40, 2, '#ff4a5a');
  px(g, 594, 32, 26, 2, '#ff4a5a');
  pool(g, 614, 30, 30, 10, '#ff4a5a', 0.1);
  // Someone waiting on the bench, bottom left (nobody crosses the floor: the user, 2026-11-10).
  drawPatron(g, 250, 352, 34, LOOKS[2], 'lean', false, 0.75);
}

// ---- shared ---------------------------------------------------------------------------------------------------------

let alley: HTMLCanvasElement | null = null;
let bar: HTMLCanvasElement | null = null;
let laundry: HTMLCanvasElement | null = null;
const rainDrops = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97) % RW, y: (i * 53) % RH, v: 160 + ((i * 31) % 80) }));
let rainT = 0;
function rain(g: CanvasRenderingContext2D, t: number, a: number): void {
  const dt = Math.min(0.1, Math.max(0, t - rainT));
  rainT = t;
  g.globalAlpha = a;
  g.fillStyle = '#6a6890';
  for (const d of rainDrops) {
    d.y += d.v * dt;
    if (d.y > RH) d.y -= RH + 10;
    g.fillRect(Math.round(d.x), Math.round(d.y), 1, 4);
  }
  g.globalAlpha = 1;
}

const [liveC, liveG] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

/** Draw act 1's gamble room for this game, full screen (W x H at 2x). */
export function drawEncounterRoom(ctx: CanvasRenderingContext2D, room: EncounterRoom, time: number): void {
  const g = liveG;
  g.clearRect(0, 0, RW, RH);
  if (room === 'bj') drawAlley(g, time);
  else if (room === 'hilo') drawBar(g, time);
  else drawLaundry(g, time);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}

/** Which act-1 room an encounter has (null: it plays in front of the act's own room). */
export const encounterRoomOf = (id: string | undefined): EncounterRoom | null => (id === 'bj' || id === 'hilo' || id === 'claw' ? id : null);
