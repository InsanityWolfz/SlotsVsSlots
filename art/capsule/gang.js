// THE GANG (approved pass 2), laid out from L for any Steam size. Cast offsets are the header's, in px at f=1.
// L: { hz (skyline base, grid), f, sx, sy, cx, by (knight centre y, px), logo: {x,y,sc} | null, neon: [[mask,x,y,k]], chips }
const f = L.f, sx = L.sx ?? 1, sy = L.sy ?? 1, cx = L.cx ?? W / 2, by = L.by;
const sc = (s) => Math.max(1, Math.round(s * f));
sky(L.hz - 4);
for (const [xb, xt, col, a] of L.lights ?? [[70 / 230, 40 / 230, '#ffe6aa', 0.06], [160 / 230, 195 / 230, '#ffe6aa', 0.06], [0.5, 100 / 230, '#ffb0c0', 0.04]]) searchlight(Math.round(gw * xb), L.hz, Math.round(gw * xt), 0, col, a);
skyline(L.hz, { seed: 9 });
for (const [mask, x, y, k, col] of L.neon ?? []) neonMask(mask, x, y, col, col, k);
street(L.hz + 6);
glow(Math.round(cx / G), Math.round((by + 62 * f) / G), Math.round(52 * f * 4 / G), '#ffe6aa');
const P = (id, dx, dy, s, dim) => S(id, Math.round(cx + dx * f * sx), Math.round(by + dy * f * sy), sc(s), dim ? { dim } : undefined);
const back = [['enemyRepoMan', -386, -80, 4], ['enemyCroupier', -228, -84, 3], ['enemyWheel', 230, -84, 3], ['enemyBoss', 386, -84, 4]];
const mid = [['enemyGremlin', -310, -12, 5], ['enemyMimic', 310, -12, 5]];
const front = [['heroJoker', -160, 12, 6], ['heroTesla', 160, 12, 6]];
// tall formats place the cast by hand: [id, x, y, scale, dim] in px
// L.fade [y0, y1]: once the back row is down, its bust edges sink into the dark crowd
const fade = () => { if (!L.fade) return; for (let y = L.fade[0]; y < H; y += G) { ctx.globalAlpha = Math.min(1, (y - L.fade[0]) / (L.fade[1] - L.fade[0])); ctx.fillStyle = '#120c1a'; ctx.fillRect(0, y, W, G); } ctx.globalAlpha = 1; };
if (L.cast) {
  let faded = false;
  for (const [id, x, y, s, dim] of L.cast) { if (dim !== 0.3 && !faded) { faded = true; fade(); } S(id, x, y, s, dim ? { dim } : undefined); }
}
else {
  for (const [id, x, y, s] of back) P(id, x, y, s, 0.3);
  fade();
  for (const [id, x, y, s] of mid) P(id, x, y, s, 0.12);
  for (const [id, x, y, s] of front) P(id, x, y, s);
  P('heroKnight', 0, 0, 7);
}
if (L.chips !== false) {
  const k = f;
  for (const [id, x, y, s] of [['chip', 40, -25, 4], ['chip', 78, -12, 4], ['coinSpin0', 22, -58, 3]]) S(id, Math.round(x * k), Math.round(H + y * k), sc(s));
  for (const [id, x, y, s] of [['chip', -40, -20, 4], ['coinSpin2', -74, -10, 3], ['coinSpin1', -20, -60, 3]]) S(id, Math.round(W + x * k), Math.round(H + y * k), sc(s));
}
vignette();
if (L.logo) { glow(Math.round(L.logo.x / G), Math.round(L.logo.y / G), Math.round(36 * L.logo.sc / 3 * 4 / G), '#ff6a4a'); m.title.drawLogo(ctx, L.logo.x, L.logo.y, L.logo.sc, { chase: 1 }); }
