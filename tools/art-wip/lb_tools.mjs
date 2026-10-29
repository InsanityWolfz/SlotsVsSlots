// Leg Breaker / Pickpocket artist's own helpers (helpers.mjs stays untouched).
export const canvas = (n) => Array.from({ length: n }, () => Array(n).fill('.'));
export const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < g[0].length && c && c !== ' ') g[y][x] = c; };
export const get = (g, x, y) => (g[y] && x >= 0 && x < g[0].length ? g[y][x] : '.');
export const span = (g, y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
/** Paint literal rows at (x0,y0); space = skip. */
export const paint = (g, x0, y0, rs) => rs.forEach((r, dy) => [...r].forEach((c, dx) => px(g, x0 + dx, y0 + dy, c)));
/** Fill spans {y: [x0,x1]} with a shader fn(x,y,has). */
export function fill(g, y0, spans, fn) {
  const cells = new Set();
  spans.forEach((s, i) => { if (s) for (let x = s[0]; x <= s[1]; x++) cells.add(`${x},${y0 + i}`); });
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) { const [x, y] = k.split(',').map(Number); px(g, x, y, fn(x, y, has)); }
  return has;
}
export const shade3 = (lit, mid, dark) => (x, y, has) => (!has(x - 1, y) || !has(x, y - 1) ? lit : !has(x + 1, y) ? dark : mid);
/** Thick line: for t in 0..1 stamp a cross-section painter. */
export function sweep(g, x0, y0, x1, y1, fn) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; fn(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), t); }
}
export function line(g, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (;;) { px(g, x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
export const out = (g) => g.map((r) => r.join(''));
