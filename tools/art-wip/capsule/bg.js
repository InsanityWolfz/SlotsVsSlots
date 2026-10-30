// Shared capsule scenery, drawn on a 4px grid (stepped, no smooth gradients). G = grid size in screen px.
const G = 4;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * G, y * G, w * G, h * G); };
const gw = Math.ceil(W / G), gh = Math.ceil(H / G);
function sky(horizon) {
  const bands = ['#0a0716', '#0e0a1e', '#130d26', '#19102e', '#211336', '#2b163c', '#371940'];
  const step = Math.ceil(horizon / bands.length);
  R(0, 0, gw, gh, bands[bands.length - 1]);
  bands.forEach((c, i) => R(0, i * step, gw, step, c));
  seed = 11;
  for (let i = 0; i < 70; i++) { const x = Math.floor(rnd() * gw), y = Math.floor(rnd() * horizon * 0.7); R(x, y, 1, 1, rnd() < 0.2 ? '#fff6c0' : '#6d6482'); }
}
function skyline(base, o = {}) {
  seed = o.seed ?? 3;
  // far row then near row of casino blocks, lit windows in warm and teal
  for (const [col, wcol, hmin, hmax, wmin] of [['#1b1230', '#3b3347', 18, 40, 10], ['#130c22', null, 10, 30, 12]]) {
    let x = -2;
    while (x < gw) {
      const w = wmin + Math.floor(rnd() * 14), h = hmin + Math.floor(rnd() * (hmax - hmin));
      R(x, base - h, w, h, col);
      rnd();
      for (let yy = base - h + 3; yy < base - 3; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) {
        const r = rnd();
        if (r < 0.32) R(xx, yy, 1, 2, wcol ?? (r < 0.07 ? '#4fe0bf' : r < 0.2 ? '#ffe45c' : '#d9a640'));
      }
      x += w + Math.floor(rnd() * 3);
    }
  }
}
// a neon tube shape from a list of [x,y,w,h] rects, glow (a 1-cell darker halo) then tube
function neon(rects, tube, glow) {
  for (const [x, y, w, h] of rects) R(x - 1, y - 1, w + 2, h + 2, glow);
  for (const [x, y, w, h] of rects) R(x, y, w, h, tube);
}
function street(top) {
  R(0, top, gw, gh - top, '#120c1a');
  R(0, top, gw, 1, '#2c2140');
  // wet-street neon reflections: short dashes
  seed = 5;
  for (let i = 0; i < 40; i++) { const x = Math.floor(rnd() * gw), y = top + 2 + Math.floor(rnd() * (gh - top - 2)); R(x, y, 3 + Math.floor(rnd() * 6), 1, ['#3a1440', '#13304a', '#3a2a14'][i % 3]); }
}
// stepped spotlight cone from (x0 at bottom) up to (x1 at top), alpha bands
function beam(xb, xt, yt, yb, color) {
  for (let y = yt; y < yb; y++) {
    const k = (y - yt) / (yb - yt);
    const cx = xt + (xb - xt) * k, hw = 3 + 14 * k;
    ctx.fillStyle = color; ctx.globalAlpha = 0.06 + 0.06 * (1 - k);
    ctx.fillRect(Math.round(cx - hw) * G, y * G, Math.round(hw * 2) * G, G);
  }
  ctx.globalAlpha = 1;
}
function vignette() {
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(6,2,12,${0.12})`;
    ctx.fillRect(0, 0, (6 - i) * G * 2, H); ctx.fillRect(W - (6 - i) * G * 2, 0, (6 - i) * G * 2, H);
  }
}
// sprite at a grid position (centre), integer scale in screen px per art px
const S = (id, cx, cy, sc, o) => m.sprites.drawSprite(ctx, id, cx, cy, sc, o);
// a stepped round glow behind a figure (grid units), five rings of low alpha
function glow(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let k = 1; k <= 5; k++) {
    const rr = (r * k) / 5;
    ctx.globalAlpha = 0.07;
    for (let y = -rr; y <= rr; y++) { const w = Math.round(Math.sqrt(Math.max(0, rr * rr - y * y))); ctx.fillRect((cx - w) * G, Math.round(cy + y) * G, w * 2 * G, G); }
  }
  ctx.globalAlpha = 1;
}
// searchlights from behind the skyline: narrow at the source, wide in the sky (a premiere)
function searchlight(xb, yb, xt, yt, color, a = 0.07) {
  ctx.fillStyle = color; ctx.globalAlpha = a;
  for (let y = yt; y < yb; y++) {
    const k = (yb - y) / (yb - yt);
    const cx = xb + (xt - xb) * k, hw = 1 + 7 * k;
    ctx.fillRect(Math.round(cx - hw) * G, y * G, Math.round(hw * 2) * G, G);
  }
  ctx.globalAlpha = 1;
}
// a neon sign from a mask ('#' tube), grid units, with a one-cell halo
function neonMask(mask, x, y, tube, halo, k = 2) {
  ctx.globalAlpha = 0.18;
  mask.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') R(x + i * k - 1, y + j * k - 1, k + 2, k + 2, halo); }));
  ctx.globalAlpha = 1;
  mask.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') R(x + i * k, y + j * k, k, k, tube); }));
  // the tube's hot core: the top-left cell of each segment, white
  mask.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') R(x + i * k, y + j * k, 1, 1, '#ffffff'); }));
}
const CHERRY = ['.....###.', '....##...', '...#..#..', '..#...#..', '.##...##.', '#..#.#..#', '#..#.#..#', '.##...##.'];
const DIAMOND = ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'];
const SPADE = ['..#..', '.###.', '#####', '#####', '..#..', '.###.'];
const SEVEN = ['#####', '....#', '...#.', '..#..', '..#..'];
