// The three side by side at ×10 (32) and the 24s below, to judge the set.
import { writeFileSync } from 'node:fs';
import { outline, png } from './render.mjs';
import { barfly32 } from './barfly32.mjs'; import { cooler32 } from './cooler32.mjs'; import { shark32 } from './shark32.mjs';
import { barfly24 } from './barfly24.mjs'; import { cooler24 } from './cooler24.mjs'; import { shark24 } from './shark24.mjs';
const join = (sprites, gap) => { const h = sprites[0].length; return Array.from({ length: h }, (_, y) => sprites.map((s) => s[y]).join('.'.repeat(gap))); };
writeFileSync('review32.png', png(join([barfly32(), cooler32(), shark32()].map((f) => outline(f)), 2), 8, '#1a2a20'));
writeFileSync('review24.png', png(join([barfly24(), cooler24(), shark24()].map((f) => outline(f)), 2), 8, '#1a2a20'));
