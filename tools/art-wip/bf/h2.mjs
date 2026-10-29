// Barfly-only helpers: draw a cell set with a colour fn, capsule (thick line) cell sets, span sets.
import { put } from '../helpers.mjs';
export const cellsFromSpans = (y0, spans) => { const s = new Set(); spans.forEach((sp, i) => { if (sp) for (let x = sp[0]; x <= sp[1]; x++) s.add(`${x},${y0 + i}`); }); return s; };
export function capsule(ax, ay, bx, by, r) {
  const s = new Set(); const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  for (let y = Math.floor(Math.min(ay, by) - r - 1); y <= Math.ceil(Math.max(ay, by) + r + 1); y++)
    for (let x = Math.floor(Math.min(ax, bx) - r - 1); x <= Math.ceil(Math.max(ax, bx) + r + 1); x++) {
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const px = ax + t * dx - x, py = ay + t * dy - y;
      if (px * px + py * py <= r * r) s.add(`${x},${y}`);
    }
  return s;
}
export function draw(g, cells, fn) { const has = (x, y) => cells.has(`${x},${y}`); for (const k of cells) { const [x, y] = k.split(',').map(Number); if (y >= 0 && y < g.length) put(g, x, y, fn(x, y, has)); } }
