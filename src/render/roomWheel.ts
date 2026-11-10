/**
 * THE WHEEL's ROOM (act 2's boss room, at the end of the casino floor's aisle: roomCasinoFloor.ts, whose palette, live
 * layer and wheel it shares).
 *
 * THE WHEEL's room is a straight-on view of her table, like the casino's door: the wheel at the table's head in the open
 * column above the gutter, her full figure behind it, the felt layout running toward us; the floor beyond in the top
 * band. Alive in her fight: the wheel turns with the gutter's wheel, PLACE YOUR BETS lands chips on the layout (they
 * glow), NO MORE BETS drops the ball into a pocket and rakes the layout, a hit swings the lamps, and at half HP the
 * limit sign reads NO LIMIT and the rim's bulbs chase. Nothing flashes: the strongest change is a small pool under 0.2.
 */
import { bulb, mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawText } from './text';
import { BODIES, CARPET, CARPET_L, CEIL_C, CX, d, ellipse, F, f, FELT_D, G, g8, K, k, lg, liveC, R, T, TOPS, wheelPockets, WOOD, WOOD_D, Y, Yl } from './roomCasinoFloor';

/** The table's head and the floor's line (the felt runs toward us from here): the wheel, the room's star, sits big and
 * central on it in the open column between the gutter's BOSS chip and THE TABLE panel, THE WHEEL behind it. */
const TABLE = 70;
/** The felt's vanishing line (it widens toward us from the table's head, staying inside the reels' span). */
const HORIZON = 14;

/** THE WHEEL's full figure, 22x60 at the room's 2px scale (the portraits' palette, outlined like them): red hair under
 * a green eyeshade, a green jacket with a white collar and gold buttons (as her portrait). Row 25+ is under the table. */
const WHEEL_FIG = [
  '.......hhhhhhhh.......',
  '.....hhHHHHHHHHhh.....',
  '....hHHHHHHHHHHHHh....',
  '...hHHHHHHHHHHHHHHh...',
  '..vVVVVVVVVVVVVVVVVv..',
  '..vvvvvvvvvvvvvvvvvv..',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFWKFFFFFFKWFHh...',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFFFFFffFFFFFHh...',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFFFFLLLLFFFFHh...',
  '...hHHFFFFFFFFFFHHh...',
  '..hHHH.ffFFFFff.HHHh..',
  '..hHHH...ffff...HHHh..',
  '..hHH..CCCCCCCC..HHh..',
  '.JJJJJJCcCCCCcCJJJJJJ.',
  'JJJJJJJJCCCCCCJJJJJJJj',
  'JJJJJJJJJCCCCJJJJJJJjj',
  'JJJ.JJJJJGCCJJJJJJ.jjj',
  'JJJ.JJJJJJCCJJJJJJ.jjj',
  'JJJ.JJJJJGCCJJJJJJ.jjj',
  'JJJ.JJJJJJCCJJJJJJ.jjj',
  'JJJ.JJJJJGCCJJJJJJ.jjj',
  'FFF.JJJJJJCCJJJJJJ.FFf',
  'FFf.JJJJJJJJJJJJJj.Fff',
  '....JJJJJJJJJJJJJj....',
  '....kkkkkkkkkkkkkk....',
  '....kkkkkkkkkkkkkk....',
];
/** Her arm out over the wheel (PLACE YOUR BETS): rows 17-26's right side swapped. */
const WHEEL_DEAL: Record<number, string> = {
  17: '.JJJJJJCcCCCCcCJJJJJJJjj',
  18: 'JJJJJJJJCCCCCCJJJJJjjjjj',
  19: 'JJJJJJJJJCCCCJJJJJJ.FFFf',
  20: 'JJJ.JJJJJGCCJJJJJJ...Fff',
  21: 'JJJ.JJJJJJCCJJJJJJ......',
  22: 'JJJ.JJJJJGCCJJJJJJ......',
  23: 'JJJ.JJJJJJCCJJJJJJ......',
  24: 'JJJ.JJJJJGCCJJJJJJ......',
  25: 'FFF.JJJJJJCCJJJJJJ......',
  26: 'FFf.JJJJJJJJJJJJJj......',
};
const WHEEL_INK: Record<string, string> = {
  h: '#8a3418', H: '#c0502a', V: '#5ad65a', v: '#2a8a3a', F, f, W: '#ffffff', K, L: '#c03a4a',
  C: T, c: '#c8c0d0', J: '#2a7a3a', j: '#1a5a2a', G, k: '#1a1426',
};

let figs: { idle: HTMLCanvasElement; deal: HTMLCanvasElement; sign: HTMLCanvasElement } | null = null;
function makeFigs() {
  const W = 24;
  const fig = (deal: boolean) =>
    outlined(W, WHEEL_FIG.length, (c) =>
      WHEEL_FIG.forEach((row0, y) => {
        const row = (deal && WHEEL_DEAL[y] ? WHEEL_DEAL[y] : row0).padEnd(W, '.').slice(0, W);
        [...row].forEach((ch, x) => ch !== '.' && WHEEL_INK[ch] && px(c, x, y, 1, 1, WHEEL_INK[ch]));
      }),
    );
  // The table-limit placard on its brass stand (its words are live: the limits, then NO LIMIT at half HP).
  const sign = outlined(64, 120, (c) => {
    px(c, 30, 52, 4, 64, g8);
    px(c, 30, 52, 1, 64, G);
    px(c, 22, 114, 20, 6, g8);
    px(c, 0, 0, 64, 52, g8);
    px(c, 1, 1, 62, 50, '#1a0e24');
  });
  figs = { idle: fig(false), deal: fig(true), sign };
}

interface WheelState {
  t: number;
  bets: number;
  left: number;
  fast: boolean;
  foeHp: number;
  dealT: number;
  hitT: number;
  dropT: number;
  /** Where the ball settled at the last NO MORE BETS (the pocket index), and the chips on the layout (each glows as it
   * lands). */
  pocket: number;
  /** Each chip's rake (0 on the layout; from 1 down to 0 while NO MORE BETS sweeps it to the wheel, then gone). */
  chips: { x: number; y: number; glow: number; c: string; out?: number }[];
}
const ws: WheelState = { t: 0, bets: 0, left: 3, fast: false, foeHp: 1, dealT: 0, hitT: 0, dropT: 0, pocket: 5, chips: [] };

/** The layout's felt: from the table's head (y TABLE) toward us, in the street's perspective (half width at y). */
const feltHalf = (y: number) => Math.round((44 * (y - HORIZON)) / (TABLE - HORIZON));

export function wheelRoomUpdate(dt: number): void {
  ws.t += dt;
  ws.dealT = Math.max(0, ws.dealT - dt / 0.7);
  ws.hitT = Math.max(0, ws.hitT - dt / 1.2);
  ws.dropT = Math.max(0, ws.dropT - dt / 2.2);
  for (const c of ws.chips) {
    c.glow = Math.max(0, c.glow - dt / 1.2);
    if (c.out !== undefined) c.out -= dt / 0.8;
  }
  ws.chips = ws.chips.filter((c) => c.out === undefined || c.out > 0);
}

export function wheelRoomReset(): void {
  Object.assign(ws, { bets: 0, left: 3, fast: false, foeHp: 1, dealT: 0, hitT: 0, dropT: 0, chips: [] });
}

/** Read her fight: chips placed (she deals, chips land on the layout), NO MORE BETS (the ball drops, the layout's raked),
 * a hit (the lamps swing), half HP (NO LIMIT). */
function read(o: WheelRoomScene): void {
  if (o.foeHp > ws.foeHp + 0.3) wheelRoomReset();
  if (o.foeHp < ws.foeHp - 0.002) ws.hitT = 1;
  ws.foeHp = o.foeHp;
  ws.fast = o.fast;
  if (o.bets > ws.bets) {
    ws.dealT = 1;
    // (Chips still being raked don't count toward the layout's 14.)
    const cols = [R, '#3474e0', G, '#f4eee0', '#2a9a4a'];
    for (let j = ws.bets; j < o.bets && ws.chips.filter((c) => c.out === undefined).length < 14; j++) {
      // A chip lands on a number square of the layout (fixed per chip, in the felt's perspective).
      const y = TABLE + 44 + ((j * 37) % 96);
      const hw = feltHalf(y) - 10;
      ws.chips.push({ x: CX - hw + ((j * 53) % Math.max(1, hw * 2)), y, glow: 1, c: cols[j % cols.length] });
    }
  }
  // NO MORE BETS: the turn counter wraps back up (and the chips come off the reels): the ball drops, the layout's raked.
  const rake = () => ws.chips.forEach((c) => (c.out ??= 1));
  if (o.left > ws.left && ws.left <= 1) {
    ws.dropT = 1;
    ws.pocket = Math.floor(ws.t * 7) % 18;
    rake();
  }
  // Your pairs took the bets back (or the table cleared): the layout's chips go too.
  if (o.bets < ws.bets && o.bets === 0) rake();
  ws.bets = o.bets;
  ws.left = o.left;
}

let wheelStill: HTMLCanvasElement | null = null;
function buildWheelStill(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // The floor beyond, in the top band: a dark back wall, a ceiling trim, a row of slot machines along the far aisle.
  px(g, 0, 0, RW, TABLE, '#140c20');
  px(g, 0, 0, RW, 10, CEIL_C);
  px(g, 0, 10, RW, 2, g8);
  px(g, 0, 12, RW, 1, K);
  for (let x = 0; x < RW; x += 64) px(g, x, 13, 2, TABLE - 13, '#100a1a');
  // The far machines (elevation, small): cabinets, dim screens, toppers (their bulbs are live).
  for (let i = 0, x = 6; x < RW; i++, x += 26) {
    if (x > 236 && x < 380) continue;
    const top = TABLE - 52;
    px(g, x, top, 22, TABLE - top, BODIES[i % BODIES.length]);
    px(g, x, top, 22, 8, TOPS[(i * 3) % TOPS.length]);
    px(g, x, top, 22, 1, g8);
    px(g, x + 3, top + 14, 16, 12, '#0e0a18');
    px(g, x + 4, top + 16, 14, 8, '#2a2438');
    px(g, x + 2, top + 30, 18, 2, '#4a3d62');
    px(g, x, top, 1, TABLE - top, K);
    px(g, x + 21, top, 1, TABLE - top, K);
  }
  // ROULETTE over her, a gold-framed sign (the letters are live).
  px(g, 251, 1, 138, 26, K);
  px(g, 252, 2, 136, 24, d);
  px(g, 252, 2, 136, 1, G);
  px(g, 252, 25, 136, 1, G);
  px(g, 252, 2, 1, 24, G);
  px(g, 387, 2, 1, 24, G);
  // The pit's floor (carpet, in perspective toward us), around the table.
  px(g, 0, TABLE, RW, RH - TABLE, CARPET);
  for (const y of [TABLE + 4, TABLE + 10, TABLE + 18, TABLE + 30, TABLE + 46, TABLE + 68, TABLE + 98, TABLE + 140, TABLE + 196]) if (y < RH) px(g, 0, y, RW, 1, CARPET_L);
  for (let x0 = CX - 30 * 14; x0 <= CX + 30 * 14; x0 += 30)
    for (let y = TABLE + 1; y < RH; y += 2) px(g, CX + ((x0 - CX) * (y - HORIZON)) / (TABLE - HORIZON), y, 1, 1, '#4a2a1a');
  px(g, 0, TABLE, RW, 1, K);
  // The roulette table: its padded rail, then the felt and the betting layout, toward us (dark: it lies behind the
  // reels; its number boxes a dim grid, a red or black mark in each).
  let rowPrev = -1;
  for (let y = TABLE; y < RH; y++) {
    const hw = feltHalf(y);
    const rail = Math.max(2, Math.round(hw / 9));
    px(g, CX - hw - rail, y, hw * 2 + rail * 2, 1, WOOD_D);
    px(g, CX - hw - rail, y, 1, 1, K);
    px(g, CX + hw + rail - 1, y, 1, 1, K);
    px(g, CX - hw - rail + 1, y, 1, 1, WOOD);
    px(g, CX - hw, y, hw * 2, 1, FELT_D);
    // Rows of boxes, evenly spaced on the table (so closer together far off): a line between rows.
    const row = Math.floor((1 - (TABLE - HORIZON) / (y - HORIZON)) * 14);
    if (row !== rowPrev && y > TABLE) px(g, CX - hw + 1, y, hw * 2 - 2, 1, '#2e5a40');
    for (let col = 1; col < 3; col++) px(g, CX - hw + Math.round((hw * 2 * col) / 3), y, 1, 1, '#2e5a40');
    rowPrev = row;
  }
  // A mark in each box (red and black alternating), sized by its distance.
  for (let row = 0; row < 14; row++) {
    const y = Math.round(HORIZON + (TABLE - HORIZON) / (1 - (row + 0.5) / 14));
    if (y >= 280) break;
    const hw = feltHalf(y);
    const s2 = Math.max(1, Math.round(hw / 26));
    for (let col = 0; col < 3; col++) {
      const x = CX - hw + Math.round((hw * 2 * (col + 0.5)) / 3);
      px(g, x - s2, y - Math.max(1, Math.round(s2 / 2)), s2 * 2, Math.max(1, s2), (row + col) % 2 ? '#5a1424' : '#0e0a12');
    }
  }
  return c;
}

export interface WheelRoomScene {
  time: number;
  /** Her HP share (1 outside her fight: the room before it). */
  foeHp: number;
  /** Chips on your reels (all three), turns to NO MORE BETS, SPINS FASTER (half HP), the gutter wheel's angle. */
  bets: number;
  left: number;
  fast: boolean;
  angle: number;
  /** ENDLESS: how late the night is (her room darker, the floor behind her emptier). */
  late?: number;
}

/** THE WHEEL's room: her table straight on, the wheel at its head, her behind it; alive in her fight. */
export function drawWheelRoom(ctx: CanvasRenderingContext2D, o: WheelRoomScene): void {
  if (!figs) makeFigs();
  if (!wheelStill) wheelStill = buildWheelStill();
  read(o);
  const t = o.time;
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  const F2 = figs!;
  // The far machines' toppers: a bulb each, blinking out of step.
  for (let i = 0, x = 6; x < RW; i++, x += 26) {
    if (x > 236 && x < 380) continue;
    const on = Math.sin(t * 1.2 + i * 1.9) > 0.5;
    px(g, x + 10, TABLE - 50, 2, 2, on ? Y : g8);
  }
  drawText(g, 'ROULETTE', CX, 14, 1, Math.floor(t * 1.5) % 5 === 0 ? Yl : G, { outline: K });
  for (let j = 0; j <= 16; j++) {
    bulb(g, 252 + j * 8.3 - 1, 1, (j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0);
    bulb(g, 252 + j * 8.3 - 1, 24, (16 - j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0);
  }
  // The two lamps over the table (they swing when she's hit), their stepped light on the felt.
  const swing = ws.hitT > 0 ? Math.sin(t * 9) * 4 * ws.hitT : Math.sin(t * 0.8) * 0.6;
  for (const lx of [214, 426]) {
    const x = Math.round(lx + swing);
    px(g, lx, 0, 1, 30, k);
    px(g, x - 14, 30, 28, 8, K);
    px(g, x - 13, 31, 26, 6, g8);
    px(g, x - 13, 31, 26, 1, G);
    px(g, x - 9, 37, 18, 2, Yl);
    pool(g, x + (CX - x) * 0.4, TABLE + 6, 40, 8, Yl, 0.12);
  }
  // THE WHEEL behind her wheel (her arm out over it while she places bets; a flinch when she's hit): her waist at the
  // table's top, the apron in front of her, the wheel in front of that.
  const fig = ws.dealT > 0 ? F2.deal : F2.idle;
  g.drawImage(fig, CX - 13 + (ws.hitT > 0.6 ? 1 : 0), TABLE - 28);
  px(g, CX - 64, TABLE - 4, 128, 10, WOOD_D);
  px(g, CX - 64, TABLE - 4, 128, 1, G);
  px(g, CX - 64, TABLE + 5, 128, 1, K);
  // The wheel's bowl on the table's head, big and central: the wooden housing, the ring of pockets turning with the
  // gutter's wheel, the cone, the ball (counter to the wheel; dropped in its pocket after NO MORE BETS).
  const wx = CX;
  const wy = TABLE + 6;
  ellipse(g, wx, wy, 48, 15, K);
  ellipse(g, wx, wy, 47, 14, WOOD_D);
  ellipse(g, wx, wy - 1, 43, 12, WOOD);
  ellipse(g, wx, wy - 1, 38, 10, '#2a1a10');
  const dropped = ws.dropT > 0;
  const ballA = dropped ? o.angle + (ws.pocket / 18) * Math.PI * 2 : -o.angle * 1.7;
  wheelPockets(g, wx, wy - 1, 38, 10, o.angle, null);
  const bx = wx + Math.cos(ballA) * 38 * (dropped ? 0.82 : 0.98);
  const by = wy - 1 + Math.sin(ballA) * 10 * (dropped ? 0.82 : 0.98);
  px(g, bx - 1, by - 1, 4, 4, K);
  px(g, bx, by, 2, 2, T);
  if (dropped) pool(g, bx, by, 8, 4, Yl, 0.18 * ws.dropT);
  // The rim's bulbs: they chase at half HP (SPINS FASTER), a slow twinkle before.
  for (let j = 0; j < 16; j++) {
    const a = (j / 16) * Math.PI * 2;
    const step = Math.floor(t * (ws.fast ? 8 : 1.5));
    bulb(g, wx + Math.cos(a) * 52 - 1, wy + Math.sin(a) * 17 - 1, (j + step) % (ws.fast ? 3 : 5) === 0 ? 1 : 0);
  }
  // The chips on the layout (each glows as it lands; raked off after NO MORE BETS).
  for (const c of ws.chips) {
    const k2 = c.out === undefined ? 0 : 1 - Math.max(0, c.out);
    const dy = (TABLE + 6 - c.y) * k2;
    const x = c.x + (CX - c.x) * k2;
    const s = Math.max(2, Math.round(feltHalf(c.y) / 12));
    if (c.glow > 0) pool(g, x, c.y + dy, s + 4, s / 2 + 2, Yl, 0.18 * c.glow);
    px(g, x - s / 2 - 1, c.y + dy - 1, s + 2, Math.max(2, s / 2) + 2, K);
    px(g, x - s / 2, c.y + dy, s, Math.max(1, s / 2), c.c);
    px(g, x - s / 2, c.y + dy, s, 1, T);
  }
  // The table-limit placard, left: MIN 5 / MAX 500, then NO LIMIT (red) at half HP.
  const sx = 12;
  const sy = 128;
  g.drawImage(F2.sign, sx, sy);
  if (ws.fast) {
    drawText(g, 'NO', sx + 33, sy + 15, 1, R, { outline: K });
    drawText(g, 'LIMIT', sx + 33, sy + 33, 1, Math.floor(t * 3) % 2 ? R : '#ff8a7a', { outline: K });
  } else {
    drawText(g, 'MIN 5', sx + 33, sy + 15, 1, T, { outline: K });
    drawText(g, 'MAX 500', sx + 33, sy + 33, 1, T, { outline: K });
  }
  // A high stool and a player at the table's side, right (a regular watching her table).
  px(g, 586, TABLE + 60, 26, 6, d);
  px(g, 597, TABLE + 66, 4, 90, k);
  px(g, 588, TABLE + 154, 22, 4, k);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wheelStill!, 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  // ENDLESS: later in the night, a flat darker step over the room (not over her: she's still at work).
  if ((o.late ?? 0) > 0) {
    ctx.fillStyle = `rgba(4,2,8,${0.3 * (o.late ?? 0)})`;
    ctx.fillRect(0, 0, RW * 2, Math.round((TABLE - 50) * 2));
    ctx.fillRect(0, Math.round((TABLE - 50) * 2), Math.round(236 * 2), RH * 2);
    ctx.fillRect(Math.round(404 * 2), Math.round((TABLE - 50) * 2), RW * 2, RH * 2);
  }
  ctx.restore();
}

/** Drop the cached art (after a style toggle). */
export function wheelRoomRebuild(): void {
  wheelStill = null;
  figs = null;
}
