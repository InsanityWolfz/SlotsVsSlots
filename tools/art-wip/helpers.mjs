// Drawing helpers for preview sprites (same idea as build-art.mjs: fills, shaded shapes, literal stamps).
export const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
export const put = (g, x, y, c) => { if (g[y] && x >= 0 && x < g[0].length && c && c !== ' ') g[y][x] = c; };
export function stamp(g, x0, y0, rows) { rows.forEach((r, dy) => [...r].forEach((c, dx) => { if (c !== ' ') put(g, x0 + dx, y0 + dy, c); })); }
/** Fill per-row spans from y0; fn(x, y, has) picks the colour (has = inside the shape). */
export function shape(g, y0, spans, fn) {
  const cells = new Set();
  spans.forEach((s, i) => { if (s) for (let x = s[0]; x <= s[1]; x++) cells.add(`${x},${y0 + i}`); });
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) { const [x, y] = k.split(',').map(Number); put(g, x, y, fn(x, y, has)); }
}
/** Light from the top-left: lit edge, mid body, shadow on the right/bottom edge. */
export const shade = (lit, mid, dark) => (x, y, has) => (!has(x - 1, y) || !has(x, y - 1) ? lit : !has(x + 1, y) || !has(x, y + 1) ? dark : mid);
export function ellipseSpans(cx, cy, rx, ry) {
  const spans = [];
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const t = 1 - ((y - cy) / ry) ** 2;
    const half = rx * Math.sqrt(Math.max(0, t));
    spans.push([Math.round(cx - half), Math.round(cx + half)]);
  }
  return { y0: Math.ceil(cy - ry), spans };
}
export const rows = (g) => g.map((r) => r.join(''));
