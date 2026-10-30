// THE WHEEL round-4 helpers (copied from sharp_r4.mjs, which stays untouched).
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
