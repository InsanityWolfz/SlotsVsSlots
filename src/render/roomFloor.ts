/** Act 2, THE FLOOR: its still layer and its live one (the neon walls, the cameras, the cherries sign, the gamblers, the waitress) (split from rooms.ts, 2026-11-05). */
import { canvas, carpet, disc, drawMachineBody, FLOOR_Y, glow, line, LW, machineLights, machineRow, MID, neon, NEON, quietZone, rect, seeded, type Machine, type RoomArt } from './roomKit';
import type { Rooms, Scene } from './rooms';

export function buildFloor(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(23);
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  wall.addColorStop(0, '#0e061c');
  wall.addColorStop(1, '#22103a');
  g.fillStyle = wall;
  g.fillRect(0, 0, LW, FLOOR_Y);
  rect(g, 0, 0, LW, 6, '#08040e');
  for (let x = 4; x < LW; x += 16) rect(g, x, 2, 10, 2, '#1e1430');
  for (let x = 0; x < LW; x += 40) {
    rect(g, x, 6, 1, FLOOR_Y, '#2c1648');
    rect(g, x + 1, 6, 1, FLOOR_Y, '#0e0618');
  }
  for (const x of [4, 298]) {
    rect(g, x - 1, 23, 20, 86, '#0a0414');
    rect(g, x, 24, 18, 84, '#160a28');
  }
  rect(g, 0, 78, LW, 1, '#5a4214');
  const machines = machineRow(rnd, 14, ['#c9a227', '#ff4fa3', '#4fe3ff'], 0.95);
  for (const m of machines) drawMachineBody(g, m, '#0c0616', '#241438');
  carpet(g, '#2a0c24', '#1f6a6a', '#c9a227');
  quietZone(g);
  return { still: c, machines };
}

// ---- act 2: the casino floor -----------------------------------------------------------------------------------

export function floor(r: Rooms, g: CanvasRenderingContext2D, art: RoomArt, s: Scene, t: number, cheer: number, mid: boolean): void {
  for (let x = 4, k = 0; x < LW; x += 16, k++) rect(g, x + 2, 2, 6, 2, Math.sin(t * 2 + k) > 0.2 || cheer > 0 ? '#5a4a8a' : '#2a2040');
  // Searchlights, kept inside the side strips.
  for (const [x0, ph] of [[24, 0], [296, 2]] as const) {
    const a = Math.sin(t * 0.4 + ph) * 0.25;
    g.fillStyle = `rgba(200,190,255,${0.1 + cheer * 0.06})`;
    g.beginPath();
    g.moveTo(x0, FLOOR_Y);
    g.lineTo(x0 + Math.sin(a - 0.08) * 120, FLOOR_Y - 110);
    g.lineTo(x0 + Math.sin(a + 0.08) * 120, FLOOR_Y - 110);
    g.closePath();
    g.fill();
  }
  // CASINO down the left wall, lit letter by letter; LUCKY 7 down the right, its 7 blinking. Unlit tubes still read.
  const word = 'CASINO';
  const lit = Math.floor(t * 3) % (word.length + 3);
  [...word].forEach((ch, i) => neon(g, ch, 13, 32 + i * 14, '#ff4fa3', cheer > 0 || i < lit, 2));
  [...'LUCKY'].forEach((ch, i) => neon(g, ch, 307, 32 + i * 14, '#4fe3ff', true, 2));
  neon(g, '7', 307, 102, '#ffd23f', Math.sin(t * 4) > 0 || cheer > 0, 2);
  // The eye in the sky: camera domes that turn to whoever's spinning (a watch-only fight, being watched).
  for (const cx of [26, 294]) {
    g.fillStyle = '#0a0614';
    g.beginPath();
    g.arc(cx, 8, 4, 0, Math.PI);
    g.fill();
    const aim = s.turn === 'player' ? -2 : s.turn === 'enemy' ? 2 : Math.round(Math.sin(t * 0.3) * 2);
    rect(g, cx + aim, 10, 1, 1, '#4a4a6a');
    if (Math.floor(t * 1.5) % 2) rect(g, cx - 3, 8, 1, 1, '#ff2a2a');
  }
  if (mid) cherries(g, t, cheer);
  machineLights(g, art.machines, t, cheer, '#ffe9a0');
  gamblers(r, g, art.machines, t);
  waitress(r, g, t);
}

/** The gamblers at the side machines, each with a story: the lucky one's bucket overflows; the sore one bonks his. */
function gamblers(r: Rooms, g: CanvasRenderingContext2D, machines: Machine[], t: number): void {
  for (const m of machines) {
    if (!m.player) continue;
    const p = m.player;
    const cyc = (t * 0.5 + p.phase) % 4;
    const pull = cyc < 0.3 ? cyc / 0.3 : cyc < 0.6 ? 1 - (cyc - 0.3) / 0.3 : 0;
    const sx = m.x + m.w - 2;
    const slump = p.mood === 'sore' && (t + p.phase) % 8 < 1.5;
    rect(g, sx - 1, FLOOR_Y - 8, 6, 2, '#2a1a10');
    rect(g, sx + 1, FLOOR_Y - 6, 1, 6, '#2a1a10');
    rect(g, sx - 1, FLOOR_Y - 20, 7, 12, p.hue);
    const hx = sx - (slump ? 2 : 0);
    const hy = FLOOR_Y - 26 + (slump ? 3 : 0);
    rect(g, hx, hy, 5, 6, '#c8946a');
    if (p.hat) rect(g, hx - 1, hy - 2, 7, 2, '#1a1008');
    if (!slump) {
      rect(g, sx + 6, FLOOR_Y - 19 + pull * 6, 3, 1, p.hue);
      rect(g, sx + 8, FLOOR_Y - 22 + pull * 7, 1, 4, '#8a8a9a');
      disc(g, sx + 8, FLOOR_Y - 23 + pull * 7, 1.2, '#ff4a4a');
    }
    if (p.mood === 'lucky') {
      rect(g, sx - 5, FLOOR_Y - 4, 4, 4, '#8a8a9a');
      rect(g, sx - 5, FLOOR_Y - 5, 4, 1, '#ffd23f');
      // Every so often a win: coins spill from the bucket onto the carpet.
      if ((t + p.phase) % 9 < 0.04 && r.bits.length < 200)
        for (let k = 0; k < 6; k++) r.bits.push({ x: sx - 3, y: FLOOR_Y - 6, vx: (Math.random() - 0.3) * 30, vy: -20 - Math.random() * 20, c: '#ffd23f', life: 2.5, kind: 'coin' });
    }
  }
}

/** The cocktail waitress crosses the floor with her tray; on THEIR jackpot she drops it. */
function waitress(r: Rooms, g: CanvasRenderingContext2D, t: number): void {
  const span = LW + 60;
  const pos = (t * 9) % (span * 2);
  const right = pos < span;
  const wx = (right ? pos : span * 2 - pos) - 30;
  const step = Math.floor(t * 6) % 2;
  const y0 = FLOOR_Y + 6;
  rect(g, wx - 2, y0 - 6, 5, 7, '#1a1a1a');
  rect(g, wx - 2, y0 + 1, 2, 5 + step, '#e8b48a');
  rect(g, wx + 1, y0 + 1, 2, 6 - step, '#e8b48a');
  rect(g, wx - 2, y0 - 13, 5, 7, '#8a1a2a');
  rect(g, wx - 1, y0 - 18, 4, 5, '#e8b48a');
  rect(g, wx - 2, y0 - 19, 6, 2, '#5a3a1a');
  const tray = right ? wx + 5 : wx - 6;
  if (r.groanT > 0.5) {
    const f = 1 - r.groanT;
    rect(g, tray, y0 - 14 + f * 40, 5, 1, '#c0c0c8');
    rect(g, tray + 2 + f * 10, y0 - 12 + f * 34, 1, 1, '#5aff7a');
  } else {
    rect(g, tray, y0 - 14, 5, 1, '#c0c0c8');
    rect(g, tray + 1, y0 - 17, 1, 3, '#5aff7a');
    rect(g, tray + 3, y0 - 16, 1, 2, '#ff4fa3');
  }
}

/** The floor's big sign: neon cherries on a bulb-lit board. No words (playtest: a 777 JACKPOT sign read as the game
 * telling you something). Your jackpot runs its colors. */
function cherries(g: CanvasRenderingContext2D, t: number, cheer: number): void {
  const x = MID;
  const y = 18;
  const c = cheer > 0 ? NEON[Math.floor(t * 8) % NEON.length] : '#ffd23f';
  const c2 = cheer > 0 ? NEON[(Math.floor(t * 8) + 2) % NEON.length] : '#ff4fa3';
  // A real sign, not a doodle (feel playtest: the bare tubes read as placeholder art): a dark backboard on two
  // brackets, a chase of bulbs round its edge, and every tube lit over its own soft glow.
  const bx = x - 22;
  const by = y - 7;
  const bw = 44;
  const bh = 54;
  rect(g, x - 15, by - 4, 1, 4, '#2a1f30');
  rect(g, x + 14, by - 4, 1, 4, '#2a1f30');
  rect(g, bx, by, bw, bh, '#120a18');
  rect(g, bx + 1, by + 1, bw - 2, bh - 2, '#1c1026');
  const bulbs = [] as [number, number][];
  for (let k = 0; k <= bw - 2; k += 4) bulbs.push([bx + 1 + k, by + 1], [bx + bw - 2 - k, by + bh - 2]);
  for (let k = 4; k <= bh - 6; k += 4) bulbs.push([bx + 1, by + bh - 2 - k], [bx + bw - 2, by + 1 + k]);
  bulbs.forEach(([px, py], k) => rect(g, px, py, 1, 1, (Math.floor(t * (cheer > 0 ? 14 : 5)) + k) % 3 === 0 ? '#fff2b0' : '#5a4020'));
  glow(g, x, y + 20, 34, '255,210,63', 0.14 + cheer * 0.12);
  const tube = (pts: [number, number][], col: string) => {
    g.globalAlpha = 0.28;
    line(g, pts, col, 3);
    g.globalAlpha = 1;
    line(g, pts, col);
  };
  // The neon itself: a pair of cherries (the oldest slot symbol there is), the stems swaying, one cherry then the
  // other bobbing. (Was a waving cowboy in bare outline: it read as a stick figure.)
  const ring = (cx: number, cy: number, r: number): [number, number][] =>
    Array.from({ length: 17 }, (_, k) => [Math.round(cx + r * Math.cos((k / 16) * Math.PI * 2)), Math.round(cy + r * Math.sin((k / 16) * Math.PI * 2))] as [number, number]);
  const beat = Math.floor(t * 1.5) % 2;
  const sway = Math.round(Math.sin(t * 1.2));
  const red = cheer > 0 ? c : '#ff4a5a';
  const green = cheer > 0 ? c2 : '#5aff7a';
  const top: [number, number] = [x + 3 + sway, y + 4];
  tube([top, [x - 2, y + 14], [x - 7, y + 27 - beat]], green);
  tube([top, [x + 6, y + 15], [x + 8, y + 26 - (1 - beat)]], green);
  tube([top, [x + 9, y + 1], [x + 14, y + 3], [x + 9, y + 6], top], green);
  tube(ring(x - 7, y + 32 - beat, 6), red);
  tube(ring(x + 8, y + 31 - (1 - beat), 6), red);
  // A glint on each cherry.
  rect(g, x - 10, y + 29 - beat, 1, 1, '#fff2f2');
  rect(g, x + 5, y + 28 - (1 - beat), 1, 1, '#fff2f2');
}
