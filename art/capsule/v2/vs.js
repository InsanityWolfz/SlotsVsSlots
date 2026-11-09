// Direction A, THE VS SCREEN: a fighting game's versus screen. Your Slot Machine (left, blue) against THE HOUSE (right,
// red), both at the one scale, on one stage floor, lit by one light: the clash in the middle. Logo on top.
const cx = W / 2, floorY = Math.round(H * 0.86 / P) * P;
// the split: blue left, red right, a diagonal seam through the clash, stepped
for (let y = 0; y < H; y += P) {
  const seam = Math.round((cx + 70 - (y / H) * 140) / P) * P;
  px(0, y, seam, P, y < H * 0.5 ? '#0c1838' : '#0a1430');
  px(seam, y, W - seam, P, y < H * 0.5 ? '#3a0c1c' : '#300a18');
}
// speed lines out of the clash, at the one scale
seed = 21;
for (let i = 0; i < 44; i++) {
  const ang = rnd() * Math.PI * 2, r0 = 120 + rnd() * 80, len = 80 + rnd() * 260;
  const col = Math.cos(ang) < 0 ? '#2a4a9a' : '#9a2a3a';
  ctx.globalAlpha = 0.45; ctx.fillStyle = col;
  for (let k = 0; k < len; k += P) ctx.fillRect(Math.round((cx + Math.cos(ang) * (r0 + k)) / P) * P, Math.round((H * 0.56 + Math.sin(ang) * (r0 + k) * 0.6) / P) * P, P, P);
}
ctx.globalAlpha = 1;
// the stage floor: one plane both machines stand on, lit from the clash
px(0, floorY, W, H - floorY, '#140a1e');
px(0, floorY, W, P, '#3a2a50');
for (let i = 1; i < 6; i++) { const y = floorY + i * 3 * P; px(0, y, W, P, '#1c1028', 0.8); }
for (let i = -8; i <= 8; i++) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#24163a'; for (let y = floorY; y < H; y += P) ctx.fillRect(Math.round((cx + i * 40 + (i * (y - floorY)) * 1.6) / P) * P, y, P, P); }
ctx.globalAlpha = 1;
pool(cx, floorY + 4 * P, 360, 50, '#ffd9a0', 0.10);
// one light: the clash, between the machines at reel height
const LX = cx, LY = Math.round(H * 0.56);
const mine = lit(spr('cabinetKnight'), 48, 26, '#ffe6aa', 0.55);
const theirs = lit(house(), 0, 26, '#ffe6aa', 0.55);
shadow(380 - 30, floorY + P, 260, -6);
shadow(W - 380 + 30, floorY + P, 260, 6);
put(mine, 380, floorY);
put(theirs, W - 380, floorY, true);
// the clash: one burst, its glow on both machines' inner edges
pool(LX, LY, 150, 110, '#ffb070', 0.06, 3);
burst(LX, LY, 150);
// VS at the clash
txt('VS', LX, LY + 150, 9, '#fff6c0');
// the logo: a sign over the stage
m.title.drawLogo(ctx, cx, 118, 4, { chase: 1 });
vignette();
