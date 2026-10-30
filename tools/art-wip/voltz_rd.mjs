// DOC VOLTZ redesign helpers (own copies; helpers.mjs, render.mjs and other artists' files stay untouched).
export const canvas = (n) => Array.from({ length: n }, () => Array(n).fill('.'));
export const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < g[0].length && c && c !== ' ') g[y][x] = c; };
export const get = (g, x, y) => (g[y] && x >= 0 && x < g[0].length ? g[y][x] : '.');
export const span = (g, y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
/** Paint literal rows at (x0,y0); space = skip. */
export const paint = (g, x0, y0, rs) => rs.forEach((r, dy) => [...r].forEach((c, dx) => px(g, x0 + dx, y0 + dy, c)));
/** Fill per-row spans from y0 with fn(x, y, has). */
export function fill(g, y0, spans, fn) {
  const cells = new Set();
  spans.forEach((s, i) => { if (s) for (let x = s[0]; x <= s[1]; x++) cells.add(`${x},${y0 + i}`); });
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) { const [x, y] = k.split(',').map(Number); px(g, x, y, fn(x, y, has)); }
  return has;
}
export const out = (g) => g.map((r) => r.join(''));
/** A tapered spike from base (bx,by) to tip (tx,ty), w0 px wide at the base, ~1 at the tip:
 *  the side facing the top-left light is lit, the far side shadowed, the core mid. */
export function spike(g, bx, by, tx, ty, w0, lit = 'W', mid = 'L', dark = 'S') {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy);
  let nx = -dy / L, ny = dx / L;
  if (nx * -1 + ny * -1 < 0) { nx = -nx; ny = -ny; }
  for (let y = Math.floor(Math.min(by, ty) - w0); y <= Math.ceil(Math.max(by, ty) + w0); y++)
    for (let x = Math.floor(Math.min(bx, tx) - w0); x <= Math.ceil(Math.max(bx, tx) + w0); x++) {
      const t = ((x - bx) * dx + (y - by) * dy) / (L * L);
      if (t < 0 || t > 1.02) continue;
      const d = (x - bx) * nx + (y - by) * ny, w = (w0 * (1 - t) + 0.9 * t) / 2;
      if (Math.abs(d) > w) continue;
      px(g, x, y, d > w - 1 ? lit : d < -w + 1 ? dark : mid);
    }
}
/** Shift the whole figure down by dy rows (blank rows on top). */
export const lower = (g, dy) => [...Array.from({ length: dy }, () => Array(g[0].length).fill('.')), ...g.slice(0, g.length - dy)];
