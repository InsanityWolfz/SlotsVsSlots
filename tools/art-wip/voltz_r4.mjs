// DOC VOLTZ artist's own helpers (helpers.mjs stays untouched).
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
/** Cells inside triangle (a, b, c). */
export function tri(a, b, c) {
  const cells = new Set();
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  for (let y = Math.floor(Math.min(a[1], b[1], c[1])); y <= Math.ceil(Math.max(a[1], b[1], c[1])); y++)
    for (let x = Math.floor(Math.min(a[0], b[0], c[0])); x <= Math.ceil(Math.max(a[0], b[0], c[0])); x++) {
      const p = [x, y], d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) cells.add(`${x},${y}`);
    }
  return cells;
}
/** Paint a cell set: top/left edge lit, bottom/right edge dark, body mid. */
export function blob(g, cells, lit, mid, dark) {
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number);
    px(g, x, y, !has(x, y - 1) || !has(x - 1, y) ? lit : !has(x, y + 1) || !has(x + 1, y) ? dark : mid);
  }
}
