/**
 * THE MENUS' PLACE (rooms v2; the user, 2026-11-10: "outside a run you're on the street before the night starts").
 *   'street': the title, the main menu, PROFILE, SETTINGS and HISCORES stand on act 1's first street station (the dive
 *     bar's stop: the street to the T-junction, the casino glowing across it, THE DOORMAN a speck at its doors). The
 *     street is drawn slid right, so its vanishing point (the casino) lands in the gap between the main menu's logo and
 *     its panel; the strip it leaves at the left edge carries the near wall's brick on. HISCORES pastes a WALL OF
 *     FAME poster up, low contrast, top left by BACK (hiscores.ts draws it, so the menus' dim doesn't swallow it).
 *   'pawn': CHOOSE YOUR MACHINE is the pawn shop on that street, seen front on: a brick front, its big window (the
 *     screen's stage draws the window's glass and what's in it: cabinets.ts), the pawnbroker's three gold balls and a
 *     PAWN blade sign, a sill, the sidewalk. Locked machines wait behind its shutter (cabinets.ts).
 * Drawn on the rooms' 640x360 grid (2 screen pixels an art pixel, the portraits' palette and 1px outline), stepped
 * light, no gradients. Rain is the only motion here, with the sign's buzz.
 */
import { mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawStreet } from './roomStreet';
import { drawText } from './text';

const K = '#140c1c';
const G = '#d9a640';
const g8 = '#8f5a1f';
const Y = '#ffe45c';
const T = '#f4eee0';

export type MenuPlace = 'street' | 'pawn';

/** How far the street slides right on the menus (screen pixels, even: whole art pixels), so the casino sits between the
 * main menu's logo (x up to 640) and its panel (from x 810). */
export const MENU_STREET_SHIFT = 84;

let streetC: HTMLCanvasElement | null = null;
let streetG: CanvasRenderingContext2D | null = null;

/** The menus' street: act 1's first station, slid right, the left edge's wall mirrored into the gap it leaves. */
export function drawMenuStreet(ctx: CanvasRenderingContext2D, time: number): void {
  if (!streetC) [streetC, streetG] = mk(RW * 2, RH * 2);
  const sg = streetG!;
  sg.clearRect(0, 0, RW * 2, RH * 2);
  // (The bar's sign hangs lower here, below the logo and the streetlamp's arm, so the whole word BAR reads.)
  drawStreet(sg, { station: 0, time, enemy: null, barDrop: 60 });
  const s = MENU_STREET_SHIFT;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(streetC, s, 0);
  // The gap at the left: the near wall's first column carried across (its brick rows run on; no sign repeats).
  ctx.drawImage(streetC, 0, 0, 2, RH * 2, 0, 0, s, RH * 2);
  ctx.restore();
}

// ---- HISCORES: the wall of fame ------------------------------------------------------------------------------------

let fame: HTMLCanvasElement | null = null;

/** HISCORES' WALL OF FAME: a paste-up poster on the street's wall, low contrast (the screen draws it by its BACK button, over the
 * dimmed street, beside its title): a red header band, three framed faces (shapes, not anyone's portrait), the gold one
 * on top, a torn corner, two strips of tape. 2px art pixels, outlined. */
export function drawWallOfFame(ctx: CanvasRenderingContext2D, x: number, y: number, alpha = 0.5): void {
  if (!fame) {
    fame = outlined(38, 46, (g) => {
      px(g, 0, 0, 38, 46, '#4a3a2e');
      px(g, 1, 1, 36, 44, '#5e4a36');
      px(g, 1, 1, 36, 12, '#6e2030');
      const frame = (fx: number, fy: number, gold: boolean) => {
        px(g, fx, fy, 12, 13, gold ? '#9a7a30' : '#6a5440');
        px(g, fx + 1, fy + 1, 10, 11, '#2a2230');
        px(g, fx + 4, fy + 3, 4, 4, '#8a6a58');
        px(g, fx + 2, fy + 8, 8, 4, '#3a3048');
      };
      frame(13, 15, true);
      frame(4, 30, false);
      frame(22, 30, false);
      g.clearRect(33, 41, 5, 5);
      g.clearRect(35, 39, 3, 2);
      px(g, 3, 0, 8, 2, '#c8c0a8');
      px(g, 27, 0, 8, 2, '#c8c0a8');
    });
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha *= alpha;
  ctx.drawImage(fame, x, y, fame.width * 2, fame.height * 2);
  const cx = x + fame.width;
  drawText(ctx, 'WALL OF', cx, y + 12, 1, '#e8d8b0');
  drawText(ctx, 'FAME', cx, y + 22, 1, '#ffe08a');
  ctx.restore();
}

// ---- CHOOSE YOUR MACHINE: the pawn shop ----------------------------------------------------------------------------

/** The shop window's opening on screen (it frames the machine select's stage: cabinets.ts STAGE, 150,88 980x316). */
export const PAWN_WINDOW = { x: 150, y: 88, w: 980, h: 316 };

let pawnStill: HTMLCanvasElement | null = null;
let pawnLive: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
const rain: { x: number; y: number; v: number }[] = [];
let tLast = 0;

/** The shop's front, still: night sky over the roofline, brick, the window's frame and sill, the sidewalk. */
function buildPawn(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // sky and the roofline
  px(g, 0, 0, RW, RH, '#0c0814');
  px(g, 0, 0, RW, 18, '#0a0612');
  for (let x = 0; x < RW; x += 37) px(g, x + 9, 2 + ((x * 7) % 5), 1, 1, '#3a3450');
  // the brick front (rows of 4, bond offset), dark plum-brown, mortar a step darker
  px(g, 0, 18, RW, 262, '#2a1c28');
  for (let y = 18; y < 280; y += 4) {
    px(g, 0, y, RW, 1, '#20141e');
    const off = ((y - 18) / 4) % 2 ? 6 : 0;
    for (let x = -off; x < RW; x += 12) px(g, x, y + 1, 1, 3, '#20141e');
  }
  // the cornice
  px(g, 0, 18, RW, 4, '#3a2a34');
  px(g, 0, 22, RW, 1, K);
  // a few bricks a shade lighter, at random but fixed
  for (let i = 0; i < 90; i++) {
    const bx = (i * 131) % RW;
    const by = 23 + (((i * 53) % 64) * 4);
    if (by < 278) px(g, bx - (bx % 12) + 1, by + 1, 11, 3, '#322230');
  }
  // the window: a dark metal frame round the opening, an outline, a sill under it
  const wx = PAWN_WINDOW.x / 2;
  const wy = PAWN_WINDOW.y / 2;
  const ww = PAWN_WINDOW.w / 2;
  const wh = PAWN_WINDOW.h / 2;
  px(g, wx - 7, wy - 7, ww + 14, wh + 14, K);
  px(g, wx - 6, wy - 6, ww + 12, wh + 12, '#3b3347');
  px(g, wx - 6, wy - 6, ww + 12, 2, '#5a5068');
  px(g, wx - 2, wy - 2, ww + 4, wh + 4, K);
  // the sill: a stone ledge, lit on top
  px(g, wx - 12, wy + wh + 6, ww + 24, 6, K);
  px(g, wx - 11, wy + wh + 7, ww + 22, 4, '#4a4058');
  px(g, wx - 11, wy + wh + 7, ww + 22, 1, '#6a6078');
  // the shop's base below the sill: a darker riser, then the sidewalk and its kerb
  px(g, 0, 270, RW, 10, '#1c1220');
  px(g, 0, 280, RW, 80, '#17121e');
  px(g, 0, 280, RW, 1, '#2a2436');
  for (let x = 0; x < RW; x += 40) px(g, x, 281, 1, 66, '#120e18');
  px(g, 0, 346, RW, 2, '#2a2436');
  px(g, 0, 348, RW, 12, '#0e0a14');
  // the pawnbroker's bracket at the top left (the balls hang live)
  px(g, 10, 50, 42, 3, K);
  px(g, 11, 51, 40, 1, g8);
  px(g, 12, 44, 3, 12, K);
  px(g, 13, 45, 1, 10, g8);
  // the blade sign's bracket at the top right
  px(g, 600, 52, 32, 3, K);
  px(g, 601, 53, 30, 1, '#5a5068');
  return c;
}

let balls: HTMLCanvasElement | null = null;
let blade: HTMLCanvasElement | null = null;

/** The pawn shop's front: the three gold balls swinging a little, the PAWN blade sign buzzing, rain, a lamp's pool. */
export function drawPawnShop(ctx: CanvasRenderingContext2D, time: number): void {
  if (!pawnStill) pawnStill = buildPawn();
  if (!pawnLive) pawnLive = mk(RW, RH);
  if (!balls)
    balls = outlined(26, 26, (g) => {
      // three gold balls on chains: two over one
      const ball = (x: number, y: number) => {
        px(g, x + 2, y, 6, 10, '#b8862a');
        px(g, x, y + 2, 10, 6, '#b8862a');
        px(g, x + 1, y + 1, 8, 8, '#b8862a');
        px(g, x + 2, y + 1, 4, 3, '#ffe08a');
        px(g, x + 6, y + 6, 3, 3, '#7a5418');
      };
      px(g, 5, 0, 1, 4, '#8a8098');
      px(g, 20, 0, 1, 4, '#8a8098');
      px(g, 12, 0, 1, 14, '#8a8098');
      ball(0, 4);
      ball(15, 4);
      ball(7, 14);
    });
  if (!blade)
    blade = outlined(22, 86, (g) => {
      px(g, 0, 0, 22, 86, '#3a1428');
      px(g, 1, 1, 20, 84, '#561530');
      px(g, 1, 1, 20, 1, '#8e1f3a');
    });
  const [lc, g] = pawnLive;
  g.clearRect(0, 0, RW, RH);
  const dt = Math.min(0.1, Math.max(0, time - tLast));
  tLast = time;
  // the balls: hung from the bracket, swaying a pixel
  const sway = Math.round(Math.sin(time * 1.1) * 1);
  g.drawImage(balls, 18 + sway, 53);
  // the blade sign: PAWN down it, the letters buzzing now and then
  g.drawImage(blade, 605, 56);
  ['P', 'A', 'W', 'N'].forEach((ch, j) => {
    const dead = j === 2 && Math.sin(time * 13 + Math.sin(time * 2.3) * 5) > 0.93;
    drawText(g, ch, 617, 70 + j * 19, 2, dead ? '#5a3a1a' : Y, { outline: K });
  });
  // the window's light spilling on the sill and the sidewalk, a streetlamp's pool off to the right
  pool(g, 320, 290, 240, 10, '#e8a860', 0.12);
  pool(g, 590, 330, 44, 10, '#e8c890', 0.14);
  pool(g, 618, 140, 12, 50, '#e8374b', 0.06);
  // rain
  if (!rain.length) for (let i = 0; i < 70; i++) rain.push({ x: Math.random() * (RW + 40), y: Math.random() * RH, v: 160 + Math.random() * 80 });
  g.fillStyle = '#7f8fc0';
  g.globalAlpha = 0.28;
  for (const rd of rain) {
    rd.y += rd.v * dt;
    rd.x -= rd.v * dt * 0.12;
    if (rd.y > RH) {
      rd.y = -6;
      rd.x = Math.random() * (RW + 40);
    }
    g.fillRect(Math.round(rd.x), Math.round(rd.y), 1, 4);
  }
  g.globalAlpha = 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pawnStill, 0, 0, RW * 2, RH * 2);
  ctx.drawImage(lc, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}

/** The glass of the shop window (cabinets.ts draws it as its stage, under the machine): the dim shop inside, two
 * stepped streaks of reflection, OPEN in a corner, and the shop's gold lettering low on the glass. */
export function drawShopGlass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lit: boolean, time: number): void {
  ctx.fillStyle = K;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = lit ? '#1a1220' : '#120c18';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  // the shop's back: shelves in silhouette, very dim
  ctx.fillStyle = lit ? '#211828' : '#160f1c';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 4, y + 44 + i * 74, w - 8, 4);
  // reflections: two stepped diagonal streaks (no gradient), very faint
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 4, y + 4, w - 8, h - 8);
  ctx.clip();
  ctx.fillStyle = '#b8b0d0';
  for (const [x0, wd, a] of [[x + w * 0.58, 26, 0.035], [x + w * 0.66, 10, 0.05]] as const) {
    ctx.globalAlpha = a;
    for (let yy = y; yy < y + h; yy += 4) ctx.fillRect(Math.round(x0 + (yy - y) * 0.5 - (yy - y)), yy, wd, 4);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // OPEN, in pink neon, top right inside the glass (it blinks off a beat now and then)
  const on = Math.floor(time * 1.3) % 9 !== 0;
  const ox = x + w - 74;
  const oy = y + 22;
  ctx.fillStyle = K;
  ctx.fillRect(ox - 34, oy - 14, 68, 28);
  ctx.fillStyle = on ? '#3a1428' : '#1a0c18';
  ctx.fillRect(ox - 32, oy - 12, 64, 24);
  drawText(ctx, 'OPEN', ox, oy, 2, on ? '#ff4fa3' : '#4a1a34', { outline: K });
  // the shop's name in gold leaf, low on the glass's left (under the machine's spotlight it reads as painted glass)
  drawText(ctx, 'LOANS  BUY  SELL', x + 170, y + h - 18, 1, T, { alpha: 0.22 });
  void G;
}
