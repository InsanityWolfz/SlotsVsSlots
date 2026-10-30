// DJ DECIBEL artist's own helpers + views (helpers.mjs and others' tools stay untouched).
export const canvas = (n) => Array.from({ length: n }, () => Array(n).fill('.'));
export const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < g[0].length && c && c !== ' ') g[y][x] = c; };
export const get = (g, x, y) => (g[y] && x >= 0 && x < g[0].length ? g[y][x] : '.');
export const span = (g, y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
export const paint = (g, x0, y0, rs) => rs.forEach((r, dy) => [...r].forEach((c, dx) => px(g, x0 + dx, y0 + dy, c)));
export function fill(g, y0, spans, fn) {
  const cells = new Set();
  spans.forEach((s, i) => { if (s) for (let x = s[0]; x <= s[1]; x++) cells.add(`${x},${y0 + i}`); });
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) { const [x, y] = k.split(',').map(Number); px(g, x, y, fn(x, y, has)); }
  return has;
}
export const out = (g) => g.map((r) => r.join(''));
