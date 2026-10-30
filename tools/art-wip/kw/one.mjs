import { writeFileSync } from 'node:fs';
import { png, outline } from '../render.mjs';
const ORDER = ['payline', 'pair', 'jackpot', 'wild', 'shield', 'pierce', 'heal', 'charm', 'level', 'meter', 'bust', 'allin', 'hold', 'overtime', 'sabotage', 'mark', 'spill', 'rock', 'iou', 'frozen', 'jinx', 'steal'];
for (const n of ORDER) {
  const mod = await import(`./kw_${n}.mjs`);
  const o = outline(mod.rows()).map((r) => r.split(''));
  for (const [x, y] of mod.unoutline ?? []) o[y][x] = '.';
  for (let i = 0; i < o.length; i++) o[i] = o[i].join('');
  writeFileSync(`one/${n}_10.png`, png(o, 10));
  writeFileSync(`one/${n}_2.png`, png(o, 2));
}
console.log(ORDER.length);
