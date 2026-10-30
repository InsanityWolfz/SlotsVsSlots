// Big view: node view.mjs out.png name,name,... [scale]
import { writeFileSync } from 'node:fs';
import { png, outline } from '../render.mjs';
const dir = new URL('.', import.meta.url).pathname;
const [out, names, s = '10'] = process.argv.slice(2);
const rs = [];
for (const n of names.split(',')) rs.push(outline((await import(`${dir}kw_${n}.mjs?${Date.now()}`)).rows()));
const row = Array.from({ length: 12 }, (_, y) => rs.map((r) => r[y]).join('..'));
const b = '.'.repeat(row[0].length);
writeFileSync(out, png([b, ...row, b], +s, '#1a1426'));
