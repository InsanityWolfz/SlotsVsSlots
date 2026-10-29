// Slug Pusher / Bent Mechanic artist's helpers (helpers.mjs, render.mjs stay untouched).
import { writeFileSync } from 'node:fs';
import { outline, png, check } from './render.mjs';
export const canvas = (n = 32) => Array.from({ length: n }, () => Array(n).fill('.'));
export const px = (g, x, y, c) => { if (g[y] && x >= 0 && x < g[0].length && c && c !== ' ') g[y][x] = c; };
export const span = (g, y, x0, x1, c) => { for (let x = x0; x <= x1; x++) px(g, x, y, c); };
export const paint = (g, x0, y0, rs) => rs.forEach((r, dy) => [...r].forEach((c, dx) => px(g, x0 + dx, y0 + dy, c)));
export const out = (g) => g.map((r) => r.join(''));
/** Composite preview: x12 big + x3 game size, one PNG. */
export function view(rowsIn, path) {
  const r = outline(rowsIn); check('view', r, r.length);
  const n = r.length, big = 4, pad = 2;
  const H = n * big, W = n * big + pad + n;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < n * big; x++) g[y][x] = r[Math.floor(y / big)][Math.floor(x / big)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) g[y + 4][n * big + pad + x] = r[y][x];
  writeFileSync(path, png(g.map((a) => a.join('')), 3, '#1a2a20'));
}
