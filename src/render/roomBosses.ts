/** The bosses' set pieces in the open column: THE HOUSE's vault, THE WHEEL's table, THE DEALER, THE OWNER's office (split from rooms.ts, 2026-11-05). */
import { chipStack, disc, glow, MID, mix, rect } from './roomKit';
import type { RoomId } from './rooms';

// ---- the bosses ------------------------------------------------------------------------------------------------

/** THE HOUSE's vault door: light leaking round the seam, the handle turning, the dial ticking. It loses rivets as
 * the House loses HP and stands ajar near the end, gold light spilling out. Guards either side; gold on the floor. */
export function vault(g: CanvasRenderingContext2D, t: number, cheer: number, hp: number): void {
  const cx = MID;
  const cy = 40;
  const ajar = hp < 0.3 ? (0.3 - hp) / 0.3 : 0;
  const dx = cx + ajar * 5;
  glow(g, cx, cy, 40, '255,210,90', 0.12 + 0.05 * Math.sin(t * 1.5) + cheer * 0.15 + ajar * 0.15);
  disc(g, cx, cy, 27, '#14141c');
  if (ajar > 0) disc(g, cx, cy, 25, '#ffd27a');
  disc(g, dx, cy, 25, '#3a3a4a');
  disc(g, dx, cy, 21, '#2a2a36');
  disc(g, dx, cy, 19, '#34343f');
  g.strokeStyle = `rgba(255,220,120,${0.35 + 0.2 * Math.sin(t * 1.5) + ajar * 0.3})`;
  g.lineWidth = 1;
  g.beginPath();
  g.arc(dx, cy, 25.5, 0, Math.PI * 2);
  g.stroke();
  const rivets = Math.max(3, Math.round(12 * Math.max(0, Math.min(1, hp))));
  for (let k = 0; k < rivets; k++) {
    const a = (k / 12) * Math.PI * 2;
    rect(g, dx + Math.cos(a) * 23 - 1, cy + Math.sin(a) * 23 - 1, 2, 2, '#6a6a7a');
  }
  disc(g, dx + 12, cy - 8, 3, '#5a5a6a');
  const tick = Math.floor(t * 0.7) * 0.5;
  rect(g, dx + 12 + Math.round(Math.cos(tick) * 2), cy - 8 + Math.round(Math.sin(tick) * 2), 1, 1, '#c9a227');
  g.strokeStyle = '#9a9aaa';
  g.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    const a = t * 0.3 + (k / 3) * Math.PI * 2;
    g.beginPath();
    g.moveTo(dx, cy);
    g.lineTo(dx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
    g.stroke();
    disc(g, dx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 1.5, '#c9a227');
  }
  disc(g, dx, cy, 4, '#c9a227');
  for (const gx of [30, 290]) {
    rect(g, gx - 3, 88, 7, 30, '#1a2a4a');
    rect(g, gx - 2, 82, 5, 6, '#c8946a');
    rect(g, gx - 3, 80, 7, 2, '#0e1a2a');
    rect(g, gx - 1, 79, 3, 1, '#0e1a2a');
    rect(g, gx + 1, 92, 1, 1, '#c9a227');
  }
  for (const [x, y] of [[-14, 0], [-6, 0], [2, 0], [10, 0], [-10, -3], [-2, -3], [6, -3], [-6, -6], [2, -6]] as const) {
    rect(g, cx + x, 160 + y, 7, 3, '#c9a227');
    rect(g, cx + x, 160 + y, 7, 1, '#ffe08a');
  }
  const gl = Math.floor(t * 2) % 9;
  rect(g, cx - 14 + (gl % 4) * 8, 158 - Math.floor(gl / 4) * 3, 1, 1, '#ffffff');
}

/** THE WHEEL: its table seen at an angle (quieter than a flat spinning disc: playtest), the ball riding the rim, the
 * croupier behind it raising a hand for NO MORE BETS. */
export function wheel(g: CanvasRenderingContext2D, t: number): void {
  const cx = MID;
  const cy = 44;
  const r = 26;
  const n = 37;
  const a0 = t * 0.25;
  rect(g, cx - 6, 14, 12, 16, '#1f4a2a');
  rect(g, cx - 3, 8, 6, 6, '#e8b48a');
  rect(g, cx - 4, 7, 8, 2, '#1f8a3a');
  const hand = Math.floor(t / 4) % 3 === 0;
  rect(g, cx + (hand ? 7 : 6), hand ? 4 : 22, 2, hand ? 8 : 4, '#e8b48a');
  g.save();
  g.translate(cx, cy);
  g.scale(1, 0.45);
  disc(g, 0, 0, r + 5, '#2a1a0c');
  disc(g, 0, 0, r + 3, '#5a3a14');
  for (let k = 0; k < n; k++) {
    g.fillStyle = k === 0 ? '#1f6a3a' : k % 2 ? '#7a1a22' : '#1a1418';
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, r, a0 + (k / n) * Math.PI * 2, a0 + ((k + 1) / n) * Math.PI * 2);
    g.closePath();
    g.fill();
  }
  disc(g, 0, 0, r * 0.55, '#6a4418');
  disc(g, 0, 0, r * 0.45, '#8a5a20');
  const ba = -t * 0.9;
  disc(g, Math.cos(ba) * (r - 2), Math.sin(ba) * (r - 2), 2.2, '#f0ece6');
  g.restore();
  disc(g, cx, cy, 2.5, '#ffe08a');
  rect(g, cx - 1, cy - 6, 2, 6, '#c9a227');
  for (const [x, col] of [[-40, '#7a1a22'], [-34, '#2a4a8a'], [30, '#1f6a3a'], [36, '#a8861e']] as const) chipStack(g, cx + x, 58, 4, col);
}

/** THE DEALER in person behind his felt, under the lamp (green on the floor, brass in the VIP room): visor, arm
 * garters, a cigarette's smoke in the cone; a card slides off toward you every few seconds. */
export function dealer(g: CanvasRenderingContext2D, t: number, roomId: RoomId): void {
  const x = MID;
  const sway = Math.sin(t * 0.5);
  rect(g, x, 0, 1, 14, '#0a0608');
  g.fillStyle = 'rgba(255,240,190,0.14)';
  g.beginPath();
  g.moveTo(x - 10 + sway, 20);
  g.lineTo(x + 11 + sway, 20);
  g.lineTo(x + 34, 60);
  g.lineTo(x - 34, 60);
  g.closePath();
  g.fill();
  const shade = roomId === 'vip' ? '#a8861e' : '#1f6a3a';
  rect(g, x - 10 + sway, 14, 21, 6, shade);
  rect(g, x - 8 + sway, 13, 17, 1, mix(shade, '#ffffff', 0.25));
  rect(g, x - 3 + sway, 20, 7, 1, '#fff0be');
  rect(g, x - 7, 32, 14, 16, '#f0ece6');
  rect(g, x - 1, 32, 2, 10, '#1a1a1a');
  rect(g, x - 9, 34, 2, 10, '#f0ece6');
  rect(g, x + 7, 34, 2, 10, '#f0ece6');
  rect(g, x - 9, 37, 2, 1, '#c81a2a');
  rect(g, x + 7, 37, 2, 1, '#c81a2a');
  rect(g, x - 4, 24, 8, 8, '#e8b48a');
  rect(g, x - 5, 23, 10, 2, '#1f8a3a');
  rect(g, x - 2, 27, 1, 1, '#140c1c');
  rect(g, x + 2, 27, 1, 1, '#140c1c');
  rect(g, x + 4, 30, 3, 1, '#d8d8c8');
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.35 + k / 3) % 1;
    g.globalAlpha = 0.3 * (1 - p);
    rect(g, x + 7 + Math.sin(p * 6 + k) * 2, 29 - p * 10, 2, 2, '#c8c8d0');
  }
  g.globalAlpha = 1;
  rect(g, x - 32, 46, 64, 12, '#0f4a2a');
  rect(g, x - 32, 45, 64, 1, '#c9a227');
  rect(g, x - 32, 58, 64, 2, '#3a2410');
  const deal = (t % 3) / 0.6;
  if (deal < 1) {
    rect(g, x - 2 + deal * 30, 48 + deal * 6, 5, 7, '#f0ece6');
    rect(g, x - 1 + deal * 30, 49 + deal * 6, 3, 1, '#c8c0b0');
  }
  for (let k = 0; k < 4; k++) {
    const cxk = x - 22 + k * 4;
    rect(g, cxk, 47 - Math.abs(k - 1.5), 5, 7, '#f0ece6');
    rect(g, cxk + 1, 49 - Math.abs(k - 1.5), 2, 2, k % 2 ? '#141018' : '#c81a2a');
  }
  for (const [cx, col] of [[x + 14, '#7a1a22'], [x + 20, '#141018'], [x + 26, '#a8861e']] as const) chipStack(g, cx - 2, 54, 3, col);
}

/** THE OWNER: his office in the open column. A gold desk, a high-backed chair, the man himself with his cigar, a
 * wall safe behind him. As his HP falls he leans in, then stands. Your jackpot: the ember flares and the ash drops. */
export function owner(g: CanvasRenderingContext2D, t: number, cheer: number, hp: number): void {
  const x = MID;
  // The office wall: dark panelling and a gold-rimmed safe.
  rect(g, x - 34, 14, 68, 46, '#1a0e12');
  for (let k = 0; k < 5; k++) rect(g, x - 32 + k * 14, 16, 1, 42, '#24141a');
  rect(g, x + 14, 18, 16, 14, '#3a3a44');
  rect(g, x + 14, 18, 16, 1, '#c9a227');
  rect(g, x + 21, 23, 3, 3, '#c9a227');
  rect(g, x + 22, 24, 1, 1, '#1a1a1a');
  // The chair: oxblood leather, tall back.
  rect(g, x - 10, 18, 20, 26, '#5a1418');
  rect(g, x - 10, 18, 20, 1, '#8a2a2a');
  for (let k = 0; k < 3; k++) rect(g, x - 6 + k * 6, 22, 1, 1, '#c9a227');
  // The man: he sits back at full HP, leans in under 60%, stands under 25%.
  const lean = hp < 0.25 ? -6 : hp < 0.6 ? 2 : 0;
  const by = 30 + lean;
  rect(g, x - 9, by, 18, 14, '#141018');
  for (let k = 0; k < 4; k++) rect(g, x - 7 + k * 4, by + 1, 1, 13, '#2a2430');
  rect(g, x - 1, by, 2, 8, '#f0ece6');
  rect(g, x, by + 1, 1, 6, '#a8121a');
  rect(g, x, by + 3, 1, 1, '#ffd23f');
  rect(g, x - 5, by - 9, 10, 9, '#e0a880');
  rect(g, x - 5, by - 10, 10, 2, '#c8c8d0');
  rect(g, x - 4, by - 6, 3, 2, '#3a2a10');
  rect(g, x + 1, by - 6, 3, 2, '#3a2a10');
  rect(g, x - 4, by - 7, 8, 1, '#c9a227');
  rect(g, x - 2, by - 2, 4, 1, '#7a3a2a');
  // The cigar and its ember (it flares on your jackpot), the smoke curling up.
  rect(g, x + 3, by - 3, 5, 1, '#6a3a1a');
  const ember = cheer > 0.2 ? '#fff0a0' : Math.sin(t * 2) > 0 ? '#ff5a2a' : '#c83a1a';
  rect(g, x + 8, by - 3, 1, 1, ember);
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.3 + k / 4) % 1;
    g.globalAlpha = 0.28 * (1 - p);
    rect(g, x + 8 + Math.sin(p * 5 + k) * 3, by - 4 - p * 14, 2, 2, '#c8c8d0');
  }
  g.globalAlpha = 1;
  // The pinky ring on the desk hand.
  rect(g, x - 12, by + 10, 3, 2, '#e0a880');
  rect(g, x - 11, by + 10, 1, 1, '#bff6ff');
  // The desk: gold-trimmed mahogany, a stack of chips, a gold pen set.
  rect(g, x - 30, 44, 60, 14, '#4a1e10');
  rect(g, x - 30, 44, 60, 1, '#c9a227');
  rect(g, x - 30, 57, 60, 1, '#c9a227');
  for (let k = 0; k < 3; k++) rect(g, x - 24 + k * 18, 48, 12, 6, '#3a160c');
  chipStack(g, x + 18, 41, 4, '#c9a227');
  chipStack(g, x + 23, 41, 3, '#7a1a22');
  rect(g, x - 22, 41, 6, 3, '#c9a227');
  rect(g, x - 20, 38, 1, 3, '#141018');
}
