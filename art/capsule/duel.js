// THE DUEL (call 9, 2026-11-09): concept B's street and cast, with two Slot Machines facing off and a hit in the air
// between them, so the capsule reads "slot machines fight" before the logo. Laid out from L (screen px):
// L: { hz, f, logo: {x,y,sc}, A: {id,x,y,s}, B: {id,x,y,s,flip}, shots: [[id,x,y,s,rot]], trail, hit: {x,y,r},
//      pop: {t,x,y,sc} | null, crowd: [[id,x,y,s,dim]], neon, chips }
const f = L.f;
sky(L.hz - 4);
for (const [xb, xt, col, a] of [[70 / 230, 40 / 230, '#ffe6aa', 0.06], [160 / 230, 195 / 230, '#ffe6aa', 0.06], [0.5, 100 / 230, '#ffb0c0', 0.04]]) searchlight(Math.round(gw * xb), L.hz, Math.round(gw * xt), 0, col, a);
skyline(L.hz, { seed: 9 });
for (const [mask, x, y, k, col] of L.neon ?? []) neonMask(mask, x, y, col, col, k);
street(L.hz + 6);
// the crowd behind the ring: concept B's gang, dimmed, so the two machines carry the picture
const fade = () => { if (!L.fade) return; for (let y = L.fade[0]; y < H; y += G) { ctx.globalAlpha = Math.min(1, (y - L.fade[0]) / (L.fade[1] - L.fade[0])); ctx.fillStyle = '#120c1a'; ctx.fillRect(0, y, W, G); } ctx.globalAlpha = 1; };
// back rank (dim 0.3+) first, then the fade, then the ringside front row in full colour, as in gang.js
const crowd = L.crowd ?? [];
for (const [id, x, y, s, dim] of crowd) if ((dim ?? 0) >= 0.3) S(id, x, y, s, { dim });
fade();
const ringside = () => { for (const [id, x, y, s, dim] of crowd) if ((dim ?? 0) < 0.3) S(id, x, y, s, dim ? { dim } : undefined); };
// a spotlight pool under each machine, warm on yours, red on theirs
glow(Math.round(L.A.x / G), Math.round((L.A.y + L.A.pool) / G), Math.round(L.A.glow / G), '#ffe6aa');
glow(Math.round(L.B.x / G), Math.round((L.B.y + L.B.pool) / G), Math.round(L.B.glow / G), '#ff6a5a');
S(L.A.id, L.A.x, L.A.y, L.A.s);
// theirs takes the hit: a pale flash on the sprite only (no screen flash), then the burst over it
S(L.B.id, L.B.x, L.B.y, L.B.s, { flipX: !!L.B.flip, flash: 0.18 });
// the volley's trail: stepped gold dashes behind each shot, fading back toward your machine
for (const [, x, y, s] of L.shots) {
  const len = L.trail;
  for (let i = 1; i <= 6; i++) {
    ctx.globalAlpha = 0.5 - i * 0.07;
    ctx.fillStyle = i < 3 ? '#fff6c0' : '#ffd23f';
    const w = Math.round((len / 6) * f), hh = Math.max(G, Math.round(s * 1.5));
    ctx.fillRect(Math.round(x - i * (len / 6) * f - w / 2), Math.round(y - hh / 2), w, hh);
  }
  ctx.globalAlpha = 1;
}
for (const [id, x, y, s, rot] of L.shots) S(id, x, y, s, rot ? { rot } : undefined);
// the impact: a stepped star burst (8 rays) and chips knocked loose
{
  const { x, y, r } = L.hit;
  const ray = (dx, dy, len, col, th) => { ctx.fillStyle = col; for (let k = 0; k < len; k += th) ctx.fillRect(Math.round(x + dx * k - th / 2), Math.round(y + dy * k - th / 2), th, th); };
  const th = Math.max(4, Math.round(r / 7));
  for (const [dx, dy, k] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [0.7, 0.7, 0.7], [-0.7, 0.7, 0.7], [0.7, -0.7, 0.7], [-0.7, -0.7, 0.7]]) {
    ray(dx, dy, r * k, '#ffd23f', th);
    ray(dx, dy, r * k * 0.55, '#fff6c0', th);
  }
  for (const [id, dx, dy, s] of L.debris ?? []) S(id, Math.round(x + dx), Math.round(y + dy), s);
}
if (L.pop) m.text.drawText(ctx, L.pop.t, L.pop.x, L.pop.y, L.pop.sc, '#ff6a5a', { align: 'center' });
ringside();
if (L.chips !== false) {
  const k = f;
  for (const [id, x, y, s] of [['chip', 40, -25, 4], ['chip', 78, -12, 4], ['coinSpin0', 22, -58, 3]]) S(id, Math.round(x * k), Math.round(H + y * k), Math.max(1, Math.round(s * k)));
  for (const [id, x, y, s] of [['chip', -40, -20, 4], ['coinSpin2', -74, -10, 3], ['coinSpin1', -20, -60, 3]]) S(id, Math.round(W + x * k), Math.round(H + y * k), Math.max(1, Math.round(s * k)));
}
vignette();
if (L.logo) { glow(Math.round(L.logo.x / G), Math.round(L.logo.y / G), Math.round(36 * L.logo.sc / 3 * 4 / G), '#ff6a4a'); m.title.drawLogo(ctx, L.logo.x, L.logo.y, L.logo.sc, { chase: 1 }); }
