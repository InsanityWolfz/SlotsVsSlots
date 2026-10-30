// Contact sheet of today's enemy symbols, overlays and icons, straight from spriteData.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { png } from './render.mjs';
const src = readFileSync('/home/user/SlotsVsSlots/src/render/spriteData.ts', 'utf8');
const get = (id) => { const m = src.match(new RegExp(`\\n  ${id}: \\[\\n([\\s\\S]*?)\\n  \\],`)); if (!m) throw new Error(id); return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]); };
const ids = process.argv[3].split(',');
const sz = +process.argv[4];
const rs = ids.map((id) => { const r = get(id); const pad = (sz - r.length) >> 1, padx = (sz - r[0].length) >> 1; const g = Array.from({ length: sz }, () => '.'.repeat(sz).split('')); r.forEach((row, y) => [...row].forEach((c, x) => (g[y + pad][x + padx] = c))); return g.map((x) => x.join('')); });
const rows = Array.from({ length: sz }, (_, y) => rs.map((r) => r[y]).join('..'));
writeFileSync(process.argv[2], png(rows, +process.argv[5] || 6, '#1a2a20'));
