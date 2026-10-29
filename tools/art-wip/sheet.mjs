import { writeFileSync } from 'node:fs';
import { outline, png, check } from './render.mjs';
const [file, fn, size, scale] = process.argv.slice(2);
const mod = await import(`./${file}`);
const r = outline(mod[fn]());
check(fn, r, Number(size));
writeFileSync(`${fn}.png`, png(r, Number(scale), '#1a2a20'));
console.log(r.join('\n'));
