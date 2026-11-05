/** Act 1, THE ALLEY: its still layer and its live one (the windows, the laundry and pigeons, the bulb, the DEN door, the cat, the rat, the steam, the rain) (split from rooms.ts, 2026-11-05). */
import { canvas, disc, FLOOR_Y, glow, LH, LW, MID, neon, quietZone, rect, seeded, type RoomArt } from './roomKit';
import type { Rooms } from './rooms';

const PUDDLES: [number, number, number][] = [
  [22, 142, 14],
  [300, 150, 13],
  [150, 172, 18],
  [236, 132, 10],
];
/** The alley's windows: in the side strips (playtest: the HUDs hid the old ones). */
const WINDOWS: [number, number][] = [
  [6, 20],
  [22, 20],
  [286, 22],
  [302, 22],
];

export function buildAlley(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(11);
  const sky = g.createLinearGradient(0, 0, 0, 40);
  sky.addColorStop(0, '#05040e');
  sky.addColorStop(1, '#141030');
  g.fillStyle = sky;
  g.fillRect(0, 0, LW, 40);
  rect(g, 0, 14, LW, FLOOR_Y - 14, '#1a0c16');
  for (let y = 14, row = 0; y < FLOOR_Y; y += 6, row++)
    for (let x = (row % 2) * -6; x < LW; x += 12) {
      const k = rnd();
      rect(g, x + 1, y + 1, 10, 4, k < 0.15 ? '#24121c' : k > 0.9 ? '#331922' : '#2a151d');
    }
  // The gap between the buildings: a strip of sky down the middle.
  rect(g, 118, 0, 84, 26, '#0b0a1c');
  for (let y = 26; y > 14; y -= 4) rect(g, 118, y, 84, 1, '#120e26');
  rect(g, 0, 13, 118, 2, '#0a0610');
  rect(g, 202, 13, 118, 2, '#0a0610');
  // A water tower on the right roof.
  rect(g, 288, 2, 16, 10, '#120a10');
  rect(g, 290, 0, 12, 2, '#160c14');
  for (const lx of [290, 301]) rect(g, lx, 12, 1, 2, '#120a10');
  for (const [wx, wy] of WINDOWS) {
    rect(g, wx, wy, 10, 12, '#0a0608');
    rect(g, wx + 1, wy + 1, 8, 10, '#1a1420');
  }
  // Fire escape down the left wall.
  for (let y = 52; y < 100; y += 22) {
    rect(g, 2, y, 34, 1, '#0c0608');
    for (let x = 2; x < 36; x += 4) rect(g, x, y - 5, 1, 5, '#0c0608');
    rect(g, 2, y - 6, 34, 1, '#0c0608');
  }
  // The den: a door in the right wall, a step, the knob.
  rect(g, 290, 66, 26, 52, '#0e060c');
  rect(g, 292, 68, 22, 50, '#1c0e14');
  rect(g, 310, 92, 2, 3, '#6a5a30');
  rect(g, 286, 116, 34, 2, '#24161a');
  // A dumpster on the left, the drainpipe beside it.
  rect(g, 2, 100, 32, 18, '#1a2a22');
  rect(g, 2, 100, 32, 2, '#22382c');
  rect(g, 1, 98, 34, 3, '#142019');
  for (let x = 6; x < 32; x += 8) rect(g, x, 104, 1, 12, '#142019');
  rect(g, 36, 14, 3, FLOOR_Y - 22, '#140a10');
  rect(g, 35, FLOOR_Y - 9, 6, 3, '#140a10');
  // Wet asphalt with puddles, a manhole grate in the middle.
  rect(g, 0, FLOOR_Y, LW, LH - FLOOR_Y, '#0e0a12');
  for (let i = 0; i < 40; i++) rect(g, rnd() * LW, FLOOR_Y + 4 + rnd() * 58, 2 + rnd() * 10, 1, '#16121c');
  for (const [px, py, pw] of PUDDLES) {
    g.fillStyle = '#141428';
    g.beginPath();
    g.ellipse(px, py, pw, 3, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#1a1620';
  g.beginPath();
  g.ellipse(MID, 156, 14, 4, 0, 0, Math.PI * 2);
  g.fill();
  for (let x = MID - 10; x <= MID + 10; x += 4) rect(g, x, 154, 1, 4, '#0a080e');
  quietZone(g);
  return { still: c, machines: [] };
}

// ---- act 1: the alley ------------------------------------------------------------------------------------------

export function alley(r: Rooms, g: CanvasRenderingContext2D, t: number, cheer: number, mid: boolean): void {
  // Stars in the open corners and the gap; the moon top right.
  const rnd = seeded(99);
  for (let i = 0; i < 30; i++) {
    const r = rnd();
    const x = r < 0.35 ? rnd() * 40 : r < 0.7 ? 280 + rnd() * 40 : 120 + rnd() * 80;
    const y = rnd() * 12;
    if (Math.sin(t * (0.5 + rnd()) + i) > -0.3) rect(g, x, y, 1, 1, i % 5 ? '#8a86b0' : '#ffffff');
  }
  disc(g, 310, 30, 5, '#e8e4c8');
  disc(g, 312, 29, 4, '#141030');
  // Car headlights sweep past every ~25s: pale beams across the brick, a shine on the wet ground.
  const car = (t % 25) / 2.2;
  if (car < 1) {
    const x = -60 + car * (LW + 120);
    g.fillStyle = 'rgba(255,250,220,0.07)';
    g.beginPath();
    g.moveTo(x, 70);
    g.lineTo(x + 60, 60);
    g.lineTo(x + 60, 110);
    g.lineTo(x, 100);
    g.closePath();
    g.fill();
    rect(g, x + 10, FLOOR_Y + 6, 40, 1, 'rgba(255,250,220,0.2)');
  }
  // The windows' tenants: a TV glowing blue (it goes dark when they win), a lamp, Mrs. Curlers.
  const tv = r.groanT > 0 ? 0 : 0.35 + 0.3 * Math.max(0, Math.sin(t * 5.1) * Math.sin(t * 1.7));
  g.globalAlpha = tv;
  rect(g, 7, 21, 8, 10, '#6a6aff');
  g.globalAlpha = 1;
  rect(g, 23, 21, 8, 10, '#5a3a14');
  glow(g, 27, 26, 6, '255,190,90', 0.3);
  rect(g, 287, 23, 8, 10, '#3a2a14');
  rect(g, 303, 23, 8, 10, '#2a1a24');
  // Mrs. Curlers leans out on a loud win and shakes her fist; now and then just to look.
  const loud = cheer > 0.2;
  if (loud || Math.sin(t * 0.13) > 0.97) {
    rect(g, 288, 26, 6, 7, '#c8946a');
    for (let k = 0; k < 3; k++) rect(g, 288 + k * 2, 24, 2, 2, '#e88ab0');
    rect(g, 287, 33, 8, 3, '#5a8a6a');
    if (loud) rect(g, 284 + (Math.floor(t * 8) % 2), 27, 3, 3, '#c8946a');
  }
  // A man on the fire escape, bottle in hand, legs dangling.
  const legs = Math.sin(t * 1.8);
  rect(g, 12, 39, 6, 7, '#2a2a3a');
  rect(g, 13, 34, 4, 5, '#a8704a');
  rect(g, 12, 33, 6, 2, '#3a2a1a');
  rect(g, 13, 46, 2, 4 + Math.round(legs), '#1a1a2a');
  rect(g, 16, 46, 2, 4 - Math.round(legs), '#1a1a2a');
  rect(g, 19, 38 + (Math.sin(t * 0.4) > 0.8 ? -2 : 0), 1, 4, '#2a5a2a');
  if (mid) {
    laundry(r, g, t);
    bulb(g, t, cheer);
  }
  den(g, t, cheer);
  alleyFloor(r, g, t, cheer);
}

/** Laundry on a line across the gap, swaying, pigeons perched on it (they scatter on your jackpot). */
function laundry(r: Rooms, g: CanvasRenderingContext2D, t: number): void {
  const sag = (x: number) => 20 + Math.sin(((x - 118) / 84) * Math.PI) * 5;
  for (let x = 118; x < 202; x += 2) rect(g, x, sag(x), 2, 1, '#2a2430');
  for (const [lx, col, kind] of [[132, '#8a2a3a', 0], [150, '#2a5a8a', 1], [170, '#c9c0a0', 0], [188, '#5a8a3a', 1]] as const) {
    const sw = Math.sin(t * 1.6 + lx) * 1.2;
    const y = sag(lx) + 1;
    if (kind === 0) {
      rect(g, lx - 4 + sw, y, 9, 3, col);
      rect(g, lx - 3 + sw, y + 3, 7, 6, col);
    } else {
      rect(g, lx - 3 + sw, y, 7, 4, col);
      rect(g, lx - 3 + sw, y + 4, 3, 6, col);
      rect(g, lx + 1 + sw, y + 4, 3, 6, col);
    }
  }
  if (r.time > r.flown)
    for (let i = 0; i < 5; i++) {
      const x = 124 + i * 15 + (i % 2) * 4;
      const y = sag(x) - 2;
      const bob = Math.sin(t * 3 + i * 2) > 0.7 ? 1 : 0;
      rect(g, x, y, 3, 2, '#7a7a88');
      rect(g, x + (i % 2 ? -1 : 3), y - 1 + bob, 1, 1, '#9a9aaa');
      // Theirs: one pigeon has its say.
      if (r.groanT > 0.6 && i === 2) rect(g, x + 1, y + 2 + (1 - r.groanT) * 30, 1, 1, '#f0f0f0');
    }
}

/** The bare bulb, hung low in the column so its warm pool lands on the brick (playtest), swaying. */
function bulb(g: CanvasRenderingContext2D, t: number, cheer: number): void {
  const sway = Math.sin(t * 0.7) * 3;
  const bx = MID + sway;
  for (let y = 26; y < 44; y++) rect(g, MID + (sway * (y - 26)) / 18, y, 1, 1, '#0a0608');
  glow(g, bx, 46, 56, '255,210,122', 0.2 + cheer * 0.1);
  rect(g, bx - 2, 44, 4, 4, '#ffe9b0');
  rect(g, bx - 1, 43, 2, 1, '#3a3a3a');
}

/** The DEN's door: its neon (and that in the puddle), the peephole, the doorman; it swings open on your jackpot. */
function den(g: CanvasRenderingContext2D, t: number, cheer: number): void {
  const buzz = Math.sin(t * 7.3) * Math.sin(t * 2.1) > 0.8;
  neon(g, 'DEN', 301, 58, '#ff8a5a', !buzz || cheer > 0);
  if (!buzz) for (let k = 0; k < 4; k++) rect(g, 296 + Math.sin(t * 3 + k) * 2, 148 + k, 12 - k * 2, 1, `rgba(255,138,90,${0.35 - k * 0.07})`);
  if (cheer > 0.15) {
    // Open: warm light spills onto the asphalt, and arms go up inside.
    rect(g, 292, 68, 18, 50, '#ffb070');
    g.fillStyle = 'rgba(255,176,112,0.18)';
    g.beginPath();
    g.moveTo(292, 118);
    g.lineTo(310, 118);
    g.lineTo(316, 140);
    g.lineTo(276, 140);
    g.closePath();
    g.fill();
    for (const [px, h] of [[296, 22], [303, 26]] as const) {
      const j = Math.abs(Math.sin(t * 9 + px)) * 2;
      rect(g, px, 118 - h - j, 4, h, '#3a1a10');
      rect(g, px - 1, 118 - h - 4 - j, 1, 5, '#3a1a10');
      rect(g, px + 4, 118 - h - 4 - j, 1, 5, '#3a1a10');
    }
  } else {
    // The peephole slides open every ~12s and two eyes look round.
    if (t % 12 < 1.4) {
      rect(g, 299, 75, 8, 3, '#ffb070');
      const look = Math.floor((t % 12) * 2) % 2;
      rect(g, 300 + look * 2, 76, 1, 1, '#140c1c');
      rect(g, 303 + look * 2, 76, 1, 1, '#140c1c');
    } else rect(g, 300, 76, 6, 2, '#05030a');
    g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
    rect(g, 292, 117, 22, 1, '#ffb070');
    g.globalAlpha = 1;
  }
  // The doorman beside the door: his cigarette brightens as he draws on it; smoke curls up.
  const dx = 286;
  rect(g, dx - 3, 88, 7, 30, '#0a0608');
  rect(g, dx - 2, 82, 5, 6, '#0c080a');
  rect(g, dx - 3, 81, 7, 2, '#060406');
  rect(g, dx - 5, 86, 2, 1, Math.sin(t * 0.9) > 0.8 ? '#ffb040' : '#a04020');
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.4 + k * 0.25) % 1;
    g.globalAlpha = 0.25 * (1 - p);
    rect(g, dx - 6 + Math.sin(p * 6 + k) * 2, 85 - p * 20, 2, 2, '#8a8a9a');
  }
  g.globalAlpha = 1;
}

/** The cat, the gutter, the rat, a newspaper, the bookie, the steam, the rain. */
function alleyFloor(r: Rooms, g: CanvasRenderingContext2D, t: number, cheer: number): void {
  // The cat on the dumpster: eyes catch the light, it blinks, its tail flicks; your jackpot sends it up the fire escape.
  const up = cheer > 0.3;
  const cx = up ? 20 : 22;
  const cy = up ? 70 : 92;
  rect(g, cx, cy, 9, 6, '#060408');
  rect(g, cx + 6, cy - 4, 5, 5, '#060408');
  rect(g, cx + 6, cy - 5, 1, 1, '#060408');
  rect(g, cx + 10, cy - 5, 1, 1, '#060408');
  if (Math.sin(t * 0.6) < 0.95) {
    rect(g, cx + 7, cy - 2, 1, 1, '#c8ff4a');
    rect(g, cx + 9, cy - 2, 1, 1, '#c8ff4a');
  }
  const tail = Math.sin(t * 2.2);
  rect(g, cx - 2, cy + 1 + Math.round(tail), 3, 1, '#060408');
  rect(g, cx - 3, cy - 1 + Math.round(tail * 2), 1, 3, '#060408');
  // The gutter pours from the drainpipe.
  for (let k = 0; k < 6; k++) rect(g, 40, FLOOR_Y - 6 + ((t * 40 + k * 4) % 24), 1, 2, 'rgba(170,180,230,0.6)');
  // A rat runs out from the dumpster for a crumb, then back; any jackpot sends it home.
  const rp = t % 18;
  const scared = cheer > 0 || r.groanT > 0;
  const rx = scared ? 34 : rp < 3 ? 34 + rp * 18 : rp < 9 ? 88 : rp < 12 ? 88 - (rp - 9) * 18 : 34;
  if (rx > 36) {
    rect(g, rx, 150, 4, 2, '#3a3238');
    rect(g, rx + 4, 150, 1, 1, '#3a3238');
    rect(g, rx - 2, 151, 2, 1, '#5a4a50');
  }
  // A newspaper tumbles across now and then.
  const np = (t % 40) / 6;
  if (np < 1) rect(g, LW + 10 - np * (LW + 30), 160 - Math.abs(Math.sin(np * 12)) * 4, 4, 3, '#a8a49a');
  // The bookie's chalkboard by the dumpster: a tally for each side.
  rect(g, 4, 124, 13, 9, '#1a2a1a');
  rect(g, 4, 124, 13, 1, '#5a4a2a');
  for (let k = 0; k < 3; k++) rect(g, 6 + k * 2, 127, 1, 3, '#d8d8c8');
  rect(g, 12, 128, 3, 1, '#d8d8c8');
  // Steam from the grate, fading before it reaches the turn text.
  for (let k = 0; k < 6; k++) {
    const p = (t * 0.25 + k / 6) % 1;
    const y = 154 - p * 30;
    if (y <= 128) continue;
    g.globalAlpha = 0.16 * Math.sin(p * Math.PI) * Math.min(1, (y - 128) / 10);
    rect(g, MID - (4 + p * 14) / 2 + Math.sin(p * 5 + k) * 3, y, 4 + p * 14, 3, '#9a96aa');
  }
  g.globalAlpha = 1;
  // Rain: streaks at a slant, rings in the puddles, drips off the marquee onto the HUDs.
  g.fillStyle = 'rgba(170,180,230,0.45)';
  for (let i = 0; i < 90; i++) {
    const x = ((i * 37.3 + t * 40) % (LW + 40)) - 20;
    const y = (i * 53.7 + t * 170) % (LH + 10);
    g.fillRect(Math.round(x - y * 0.18), Math.round(y), 1, 4);
  }
  for (const [px, py, pw] of PUDDLES) {
    for (let k = 0; k < 2; k++) {
      const p = (t * 0.7 + k * 0.5 + px * 0.01) % 1;
      g.strokeStyle = `rgba(150,160,210,${0.35 * (1 - p)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(px + ((px * 7 + k * 13) % pw) - pw / 2, py, 1 + p * 6, 0.5 + p * 1.5, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
  for (let k = 0; k < 3; k++) {
    const p = (t * 1.3 + k * 0.37) % 1;
    const x = 100 + ((k * 97 + Math.floor(t * 1.3 + k * 0.37) * 53) % 120);
    rect(g, x, 18 + p * 6, 1, 1, 'rgba(170,180,230,0.7)');
  }
}
