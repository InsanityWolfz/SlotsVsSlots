// Dealer round-4 helpers (copied from sharp_r4.mjs, which stays untouched).
export const canvas = (n) => Array.from({ length: n }, () => Array(n).fill('.'));
export const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < g[0].length && c && c !== ' ') g[y][x] = c; };
export const span = (g, y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
/** Paint literal rows at (x0,y0); space = skip. */
export const paint = (g, x0, y0, rs) => rs.forEach((r, dy) => [...r].forEach((c, dx) => px(g, x0 + dx, y0 + dy, c)));
export const out = (g) => g.map((r) => r.join(''));
/** Collect stamps into one layer in front of what's there; ink a 1px edge (c) where it overlaps other pixels. */
export function layer(c = 'K') {
  const cells = new Map();
  const api = {
    add(x0, y0, rs) { rs.forEach((r, dy) => [...r].forEach((ch, dx) => { if (ch !== ' ') cells.set(`${x0 + dx},${y0 + dy}`, ch); })); return api; },
    done(g, sides = [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const [k, ch] of cells) { const [x, y] = k.split(',').map(Number); px(g, x, y, ch); }
      for (const k of cells.keys()) {
        const [x, y] = k.split(',').map(Number);
        for (const [dx, dy] of sides) {
          const nx = x + dx, ny = y + dy;
          if (!cells.has(`${nx},${ny}`) && g[ny]?.[nx] && g[ny][nx] !== '.' && g[ny][nx] !== 'K') g[ny][nx] = c;
        }
      }
    },
  };
  return api;
}
/** Cells of a w x h card rotated by deg (clockwise) about its bottom-centre pivot (px, py). Returns Set "x,y". */
export function cardCells(pxv, py, w, h, deg) {
  const a = (deg * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a), cells = new Set();
  for (let y = Math.floor(py - h - 4); y <= py + 2; y++) for (let x = Math.floor(pxv - w - 6); x <= pxv + w + 6; x++) {
    const dx = x + 0.5 - pxv, dy = y + 0.5 - py; // pixel centre relative to pivot
    const u = dx * cs + dy * sn, v = -dx * sn + dy * cs; // rotate back into card space
    if (u >= -w / 2 && u < w / 2 && v >= -h && v < 0) cells.add(`${x},${y}`);
  }
  return cells;
}
