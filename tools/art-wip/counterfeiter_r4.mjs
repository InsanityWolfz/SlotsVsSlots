// Counterfeiter round-4 helpers (own copy; shared *_tools.mjs files stay untouched).
export const blank = () => Array.from({ length: 32 }, () => Array(32).fill('.'));
export const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < 32 && c && c !== ' ') g[y][x] = c; };
export const span = (g, y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
/** literal rows at (x0,y0); space = skip */
export const paint = (g, x0, y0, rs) => rs.forEach((r, dy) => [...r].forEach((c, dx) => px(g, x0 + dx, y0 + dy, c)));
export const done = (g) => g.map((r) => r.join(''));
