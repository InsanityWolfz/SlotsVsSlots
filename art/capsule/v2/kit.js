// Capsule v2 kit (2026-11-09): one pixel scale for everything (P screen px per art px), one light source.
// Shared by the three direction thumbnails (vs.js, poster.js, payline.js); make2.mjs prepends bg.js and this.
const P = typeof PP === 'number' ? PP : 5;
const off = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };
// a sprite at 1 art px per px, on its own canvas
const spr = (id) => {
  const d = m.sprites.spriteSize(id);
  const c = off(d.w, d.h);
  m.sprites.drawSprite(c.getContext('2d'), id, d.w / 2, d.h / 2, 1);
  return c;
};
// colour helpers
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// THE HOUSE as a full 48x64 Slot Machine at the same density as yours (the game only has it as a 24x24 icon):
// BANKROLL's cabinet re-dressed: its greens go casino red, its chip topper becomes a gold crown. A stand-in for
// the thumbnails; the polished capsule needs THE HOUSE's own 48x64 cabinet drawn.
const house = () => {
  const c = spr('cabinetMidas');
  const x = c.getContext('2d');
  const im = x.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (d[i + 3] && g > r + 12 && g > b + 8) { const l = (r + g + b) / 3; d[i] = Math.min(255, l * 1.9 + 30); d[i + 1] = l * 0.35; d[i + 2] = l * 0.45; }
  }
  x.putImageData(im, 0, 0);
  x.clearRect(0, 0, c.width, 13);
  const crown = [
    '....#.........#.........#....',
    '...###.......###.......###...',
    '...#r#.......#r#.......#r#...',
    '..##.##.....##.##.....##.##..',
    '.##...##...##...##...##...##.',
    '##.....#####.....#####.....##',
    '#yyyyyyyyyyyyyyyyyyyyyyyyyyy#',
    '#ypypypypypypypypypypypypypy#',
    '#############################',
  ];
  const col = { '#': '#b8862b', y: '#ffd23f', r: '#e0455d', p: '#fff6c0' };
  crown.forEach((row, j) => [...row].forEach((ch, i) => { if (col[ch]) { x.fillStyle = col[ch]; x.fillRect(10 + i, 3 + j, 1, 1); } }));
  return c;
};
// rim light and core shade from one light: (lx, ly) in the sprite's own px, colour, strength. Stepped in 4 bands.
const lit = (src, lx, ly, color, a = 0.5, shade = 0.35) => {
  const c = off(src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  const R = Math.hypot(src.width, src.height);
  for (let yy = 0; yy < src.height; yy++) for (let xx = 0; xx < src.width; xx++) {
    const k = 1 - Math.hypot(xx - lx, yy - ly) / R;
    const band = Math.floor(k * 4) / 4;
    if (band > 0.5) { x.globalAlpha = a * (band - 0.5) * 2; x.fillStyle = color; x.fillRect(xx, yy, 1, 1); }
    else if (band < 0.5) { x.globalAlpha = shade * (0.5 - band) * 2; x.fillStyle = '#0a0414'; x.fillRect(xx, yy, 1, 1); }
  }
  return c;
};
// draw a 1:1 canvas at the one scale, centred on cx, feet on by
const put = (c, cx, by, flip = false) => {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(cx), Math.round(by - c.height * P));
  if (flip) { ctx.translate(c.width * P, 0); ctx.scale(-P, P); } else ctx.scale(P, P);
  ctx.drawImage(c, flip ? 0 : -c.width / 2, 0);
  ctx.restore();
};
const putC = (c, cx, cy, flip = false) => put(c, flip ? cx - c.width * P / 2 : cx, cy + c.height * P / 2, flip);
// a stepped shadow on the floor (art px rows), stretched away from the light
const shadow = (cx, by, w, dx = 0, a = 0.55) => {
  ctx.fillStyle = '#05020a';
  for (let k = 0; k < 4; k++) { ctx.globalAlpha = a * (1 - k / 4); const ww = w * (1 - k * 0.18); ctx.fillRect(Math.round(cx - ww / 2 + dx * k), by - P + k * P, Math.round(ww), P); }
  ctx.globalAlpha = 1;
};
// a stepped light pool / burst (screen px), rings at the one scale
const pool = (cx, cy, rx, ry, color, a = 0.08, rings = 5) => {
  ctx.fillStyle = color;
  for (let k = 1; k <= rings; k++) {
    const kx = (rx * k) / rings, ky = (ry * k) / rings;
    ctx.globalAlpha = a;
    for (let y = -ky; y <= ky; y += P) { const w = Math.round(kx * Math.sqrt(Math.max(0, 1 - (y * y) / (ky * ky))) / P) * P; ctx.fillRect(Math.round(cx - w), Math.round((cy + y) / P) * P, w * 2, P); }
  }
  ctx.globalAlpha = 1;
};
const px = (x, y, w, h, c, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, Math.round(w / P) * P, Math.round(h / P) * P); ctx.globalAlpha = 1; };
// an 8-ray stepped burst at the one scale
const burst = (x, y, r, inner = '#fff6c0', outer = '#ffd23f') => {
  const ray = (dx, dy, len, col) => { ctx.fillStyle = col; for (let k = 0; k < len; k += P) ctx.fillRect(Math.round((x + dx * k) / P) * P, Math.round((y + dy * k) / P) * P, P * 2, P * 2); };
  for (const [dx, dy, k] of [[1, 0, 1], [-1, 0, 1], [0, 1, 0.8], [0, -1, 0.8], [0.7, 0.7, 0.6], [-0.7, 0.7, 0.6], [0.7, -0.7, 0.6], [-0.7, -0.7, 0.6]]) { ray(dx, dy, r * k, outer); ray(dx, dy, r * k * 0.5, inner); }
};
const txt = (t, x, y, sc, col, align = 'center') => m.text.drawText(ctx, t, x, y, sc, col, { align });
