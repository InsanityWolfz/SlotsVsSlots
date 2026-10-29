// Export every preview (outlined, 1px per pixel) as a data URL, plus today's sprites, for the art-direction page.
import { readFileSync, writeFileSync } from 'node:fs';
import { outline, png, PALETTE } from './render.mjs';
import { barfly24 } from './barfly24.mjs';
import { cooler24 } from './cooler24.mjs';
import { shark24 } from './shark24.mjs';
import { barfly32 } from './barfly32.mjs';
import { cooler32 } from './cooler32.mjs';
import { shark32 } from './shark32.mjs';
const url = (rows) => 'data:image/png;base64,' + png(outline(rows), 1).toString('base64');
const old = JSON.parse(readFileSync(new URL('../out/roster-sprites.json', import.meta.url), 'utf8'));
const used = new Set();
for (const f of [barfly24, cooler24, shark24, barfly32, cooler32, shark32]) for (const r of outline(f())) for (const c of r) if (c !== '.') used.add(c);
const out = {
  chars: [
    { id: 'barfly', name: 'THE BARFLY', was: 'SLIME', old: old.enemyPortrait.url, s24: url(barfly24()), s32: url(barfly32()), accent: 'Amber drink: his SPILL', palette: [] },
    { id: 'cooler', name: 'THE COOLER', was: 'FROST IMP', old: old.enemyFrost.url, s24: url(cooler24()), s32: url(cooler32()), accent: 'Ice cyan: the FREEZE', palette: [] },
    { id: 'shark', name: 'THE LOAN SHARK', was: 'BOMBER', old: old.enemyBomber.url, s24: url(shark24()), s32: url(shark32()), accent: 'Gold: his MARKERS (IOUs)', palette: [] },
  ],
  palette: [...used].sort().map((c) => PALETTE[c]),
  allPalette: Object.values(PALETTE),
};
writeFileSync('art.json', JSON.stringify(out));
console.log('colours used', out.palette.length, 'of', out.allPalette.length);
