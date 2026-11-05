/** Act 3, THE VIP ROOM: its still layer and its live one (the haze, the portraits, the chandelier, the champagne tower, the pianist, the velvet ropes) (split from rooms.ts, 2026-11-05). */
import { canvas, carpet, disc, drawMachineBody, FLOOR_Y, glow, LW, machineLights, machineRow, MID, quietZone, rect, seeded, type RoomArt } from './roomKit';
import type { Rooms, Scene } from './rooms';

const PORTRAITS = [126, 174];

export function buildVip(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(37);
  rect(g, 0, 0, LW, FLOOR_Y, '#1c0a0c');
  rect(g, 0, 0, LW, 8, '#120606');
  for (let x = 2; x < LW; x += 20) {
    rect(g, x, 1, 16, 5, '#2a1208');
    rect(g, x, 1, 16, 1, '#5a3a14');
  }
  rect(g, 0, 8, LW, 2, '#c9a227');
  for (let x = 0; x < LW; x += 32) {
    rect(g, x + 3, 30, 26, 80, '#26100e');
    rect(g, x + 3, 30, 26, 1, '#5a3a14');
    rect(g, x + 3, 109, 26, 1, '#3a2410');
  }
  rect(g, 0, 26, LW, 2, '#c9a227');
  rect(g, 0, 112, LW, 2, '#8a6a18');
  for (const px of [40, 270]) {
    rect(g, px, 10, 10, FLOOR_Y - 10, '#d8d0c8');
    rect(g, px + 1, 10, 2, FLOOR_Y - 10, '#f0ece6');
    rect(g, px + 7, 10, 3, FLOOR_Y - 10, '#a8a098');
    for (let k = 0; k < 6; k++) rect(g, px + 4 + (k % 2), 20 + k * 16, 1, 6, '#bdb4aa');
    rect(g, px - 2, 10, 14, 4, '#c9a227');
    rect(g, px - 2, FLOOR_Y - 4, 14, 4, '#8a6a18');
  }
  // Portrait frames either side of the chandelier (the faces are drawn live: their eyes follow the play).
  for (const fx of PORTRAITS) {
    rect(g, fx - 1, 33, 22, 26, '#8a6a18');
    rect(g, fx, 34, 20, 24, '#c9a227');
    rect(g, fx + 2, 36, 16, 20, '#1a0e0a');
  }
  // Slot Machines under glass: display cases, not a casino floor (playtest: act 3 read as the Floor in red).
  const machines = machineRow(rnd, 9, ['#c9a227', '#ffe9a0'], 0).filter((m) => m.x > 52 && m.x + m.w < LW - 52);
  for (const m of machines) {
    rect(g, m.x - 3, FLOOR_Y - 4, m.w + 6, 4, '#3a2410');
    rect(g, m.x - 3, FLOOR_Y - 4, m.w + 6, 1, '#c9a227');
    m.y -= 4;
    drawMachineBody(g, m, '#120608', '#3a2410');
    g.strokeStyle = 'rgba(200,220,255,0.25)';
    g.lineWidth = 1;
    g.strokeRect(m.x - 2.5, m.y - 3.5, m.w + 5, m.h + 3);
    rect(g, m.x - 1, m.y - 2, 1, 8, 'rgba(255,255,255,0.35)');
  }
  carpet(g, '#3a0812', '#8a6a18', '#c9a227');
  for (const side of [0, 1]) {
    const x0 = side ? LW - 36 : 0;
    for (let k = 0; k < 36; k += 4) {
      rect(g, x0 + k, 10, 4, FLOOR_Y + 40, k % 8 ? '#5a0c18' : '#3a0610');
      rect(g, x0 + k + 1, 10, 1, FLOOR_Y + 40, '#6e1420');
    }
    rect(g, x0, 10, 36, 4, '#c9a227');
  }
  quietZone(g);
  return { still: c, machines };
}

// ---- act 3: the VIP room ---------------------------------------------------------------------------------------

export function vip(r: Rooms, g: CanvasRenderingContext2D, art: RoomArt, s: Scene, t: number, cheer: number, mid: boolean): void {
  // Cigar haze drifting across the wall: depth, and it pushes the wall back behind the reels.
  for (const [y, sp] of [[66, 3], [84, -2]] as const) {
    const x = (((t * sp) % LW) + LW) % LW;
    g.fillStyle = 'rgba(220,200,190,0.05)';
    g.fillRect(x - LW, y, LW, 6);
    g.fillRect(x, y, LW, 6);
  }
  machineLights(g, art.machines, t, cheer, '#fff0be');
  portraits(g, s, t);
  if (mid) chandelier(g, t, cheer);
  champagne(r, g, t, cheer);
  pianist(g, t, cheer);
  // Velvet ropes in the strips, leading off the screen (playtest: in the middle they hid behind the machines).
  for (const [a, b2, post] of [[0, 34, 34], [286, 320, 286]] as const) {
    rect(g, post, 128, 2, 14, '#c9a227');
    disc(g, post + 1, 128, 2, '#e8c84a');
    for (let x = a; x < b2; x += 1) {
      const d = Math.sin(((x - a) / (b2 - a)) * Math.PI) * (4 + Math.sin(t * 0.8) * 0.6);
      rect(g, x, 131 + d, 1, 2, '#8a0c1c');
    }
  }
}

/** Past bosses in oil, gold-framed: the House and THE WHEEL. Their eyes follow the spinning machine; in a boss fight
 * that boss's own frame is empty (they're out on the floor). */
function portraits(g: CanvasRenderingContext2D, s: Scene, t: number): void {
  const look = s.turn === 'player' ? -1 : s.turn === 'enemy' ? 1 : Math.round(Math.sin(t * 0.4));
  PORTRAITS.forEach((fx, i) => {
    const who = i === 0 ? 'house' : 'wheel';
    if (s.boss === who) return;
    const x = fx + 2;
    const y = 36;
    if (who === 'house') {
      rect(g, x + 2, y + 9, 12, 11, '#3a2a14');
      rect(g, x + 4, y + 4, 8, 7, '#c8946a');
      rect(g, x + 3, y + 1, 10, 3, '#c9a227');
      rect(g, x + 5, y, 2, 1, '#ff4a4a');
      rect(g, x + 9, y, 2, 1, '#ff4a4a');
    } else {
      rect(g, x + 2, y + 9, 12, 11, '#1f4a2a');
      rect(g, x + 4, y + 4, 8, 7, '#e8b48a');
      rect(g, x + 3, y + 3, 10, 2, '#1f8a3a');
    }
    rect(g, x + 5 + (look > 0 ? 1 : 0), y + 6, 1, 1, '#140c1c');
    rect(g, x + 9 + (look > 0 ? 1 : 0), y + 6, 1, 1, '#140c1c');
    rect(g, x + 6, y + 9, 4, 1, '#5a2a1a');
  });
}

/** The grand chandelier: three tiers, candle flames flickering, prism strings; your jackpot sets it swinging. */
function chandelier(g: CanvasRenderingContext2D, t: number, cheer: number): void {
  const swing = Math.sin(t * 0.6) * 0.6 + (cheer > 0 ? Math.sin(t * 5) * 2 * cheer : 0);
  const cx = MID + swing;
  const y0 = 18;
  rect(g, MID, 10, 1, 8, '#5a4214');
  glow(g, cx, y0 + 14, 50, '255,233,160', 0.14 + cheer * 0.1);
  // Its pool of light on the carpet below.
  g.fillStyle = 'rgba(255,233,160,0.05)';
  g.beginPath();
  g.ellipse(MID, 150, 40, 8, 0, 0, Math.PI * 2);
  g.fill();
  for (const [w, y, col] of [[48, y0 + 4, '#c9a227'], [36, y0 + 10, '#a8861e'], [22, y0 + 16, '#8a6a18']] as const) {
    rect(g, cx - w / 2, y, w, 2, col);
    for (let k = -w / 2 + 2; k <= w / 2 - 2; k += 6) {
      const flick = Math.sin(t * 13 + k * 3 + y) > 0 ? 1 : 0;
      rect(g, cx + k, y - 2, 1, 2, '#fff0be');
      rect(g, cx + k, y - 3 - flick, 1, 1, '#ffb040');
      rect(g, cx + k + 2, y + 2, 1, 4, Math.sin(t * 3 + k * 1.7 + y) > 0.55 - cheer ? '#fff6c8' : '#c9b06a');
      rect(g, cx + k + 2, y + 6, 1, 1, '#8ab0ff');
    }
  }
  rect(g, cx - 1, y0 + 18, 3, 4, '#c9a227');
  rect(g, cx, y0 + 22, 1, 3, '#fff6c8');
  // Gold dust, only in its light.
  const rnd = seeded(7);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 40;
    const speed = 3 + rnd() * 3;
    const x = MID + Math.cos(a) * r + Math.sin(t * 0.3 + i) * 3;
    const y = 30 + ((Math.abs(Math.sin(a) * r * 0.6) + t * speed) % 40);
    g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
    rect(g, x, y, 1, 1, '#ffe9a0');
  }
  g.globalAlpha = 1;
}

/** The champagne tower: bubbles rising; on your jackpot a bottle pours and it fills row by row; theirs tips the top. */
function champagne(r: Rooms, g: CanvasRenderingContext2D, t: number, cheer: number): void {
  const tx = 300;
  const ty = 108;
  rect(g, tx - 13, ty + 10, 26, 2, '#3a2410');
  rect(g, tx - 1, ty + 12, 3, 6, '#3a2410');
  const fill = cheer > 0 ? Math.min(4, (1 - cheer) * 7) : 4;
  for (const [row, n] of [[0, 4], [1, 3], [2, 2], [3, 1]] as const) {
    for (let k = 0; k < n; k++) {
      const tip = row === 3 && r.groanT > 0.3 ? 1 : 0;
      const gx = tx - (n - 1) * 3 + k * 6 + tip;
      const gy = ty + 6 - row * 6;
      rect(g, gx - 2, gy, 5, 1, '#e8e0c8');
      rect(g, gx - 1, gy + 1, 3, 2, 3 - row < fill ? '#e8c84a' : '#5a4a30');
      rect(g, gx, gy + 3, 1, 2, '#e8e0c8');
    }
  }
  if (cheer > 0.2) {
    rect(g, tx + 3, ty - 20, 2, 7, '#1a3a1a');
    rect(g, tx + 3, ty - 21, 2, 1, '#c9a227');
    rect(g, tx + 2, ty - 13, 1, 3, '#e8c84a');
  }
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.6 + i / 6) % 1;
    rect(g, tx - 8 + ((i * 5) % 17), ty + 8 - p * 30, 1, 1, `rgba(255,246,200,${0.6 * (1 - p)})`);
  }
}

/** The pianist at the grand piano (lid up), swaying in time; a hands-up flourish on your jackpot. */
function pianist(g: CanvasRenderingContext2D, t: number, cheer: number): void {
  const px = 22;
  const py = 112;
  rect(g, px - 14, py, 28, 5, '#0a0606');
  g.fillStyle = '#0a0606';
  g.beginPath();
  g.moveTo(px - 13, py - 12);
  g.lineTo(px + 12, py - 2);
  g.lineTo(px - 13, py);
  g.closePath();
  g.fill();
  rect(g, px - 12, py + 5, 2, 8, '#0a0606');
  rect(g, px + 11, py + 5, 2, 8, '#0a0606');
  for (let k = 0; k < 8; k++) rect(g, px - 10 + k * 3, py + 1, 2, 2, Math.sin(t * 8 + k * 2) > 0.7 ? '#c8c0b0' : '#f0ece6');
  const sw = Math.round(Math.sin(t * 2.4));
  const x = px + 14 + sw;
  rect(g, x, py - 8, 6, 12, '#0e0a10');
  rect(g, x + 2, py - 8, 2, 5, '#f0ece6');
  rect(g, x + 1, py - 14, 5, 6, '#e8b48a');
  rect(g, x + 1, py - 15, 5, 2, '#1a1008');
  rect(g, x - 3, cheer > 0.4 ? py - 16 : py - 1, 3, 1, '#e8b48a');
}
