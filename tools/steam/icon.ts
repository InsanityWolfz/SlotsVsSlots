// Writes public/favicon.svg from a hand-authored sprite (the wild symbol): crisp at any size, no image tooling.
// Run: npx tsx tools/steam/icon.ts [spriteId]
import { writeFileSync } from 'node:fs';
import { PALETTE, SPRITES } from '../../src/render/spriteData';

const id = (process.argv[2] ?? 'wild') as keyof typeof SPRITES;
const grid = SPRITES[id];
const h = grid.length;
const w = Math.max(...grid.map((r) => r.length));
const size = Math.max(w, h);
const ox = Math.floor((size - w) / 2);
const oy = Math.floor((size - h) / 2);
const rects: string[] = [];
grid.forEach((row, y) =>
  [...row].forEach((ch, x) => {
    const c = PALETTE[ch];
    if (c) rects.push(`<rect x="${x + ox}" y="${y + oy}" width="1" height="1" fill="${c}"/>`);
  }),
);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${rects.join('')}</svg>\n`;
writeFileSync('public/favicon.svg', svg);
console.log(`public/favicon.svg from ${String(id)} (${w}x${h})`);
