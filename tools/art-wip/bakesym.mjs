// Bakes the approved casino-town enemy symbols, cell marks and icons into tools/symbols.mjs (unoutlined: build-art adds it).
import { writeFileSync } from 'node:fs';
const MAP = [
  ['sym_spill', 'slime', "THE BARFLY's SPILL: a tipped cocktail glass"],
  ['sym_spillover', 'goo', 'a spilled cell: amber drips and a puddle'],
  ['sym_iou', 'bomb', "THE LOAN SHARK's IOU"],
  ['sym_iouover', 'bombOverlay', 'an IOU pinned to your cell (the countdown is drawn at its left)'],
  ['sym_jinx', 'hex', "THE JINX's black cat"],
  ['sym_jinxover', 'hexOverlay', 'a jinxed reel: cat-ear corners'],
  ['sym_drain', 'fangs', "THE LEECH's DRAIN: a half-drunk heart with a straw"],
  ['sym_steal', 'claw', "THE PICKPOCKET's STEAL: a gloved hand reaching down"],
  ['sym_icospill', 'icoFlood', 'SPILL icon'],
  ['sym_icoswing', 'icoSmash', 'THE SWING icon: a bat'],
  ['sym_icosteal', 'icoSteal', 'STEAL icon'],
  ['sym_icoiou', 'icoBomb', 'IOU icon'],
  ['sym_icojinx', 'icoHex', 'JINX icon'],
].filter(([, id]) => !(process.env.SKIP ?? '').split(',').includes(id));
let out = `// The casino-town enemy symbols, cell marks and ability icons (approved by the user, 2026-10-30), as literal fill rows.
// build-art.mjs adds the 1px outline. Baked from the art-wip branch (tools/art-wip/sym_*.mjs); hand edits go here now.
export const SYMBOLS = {\n`;
for (const [file, id, what] of MAP) {
  const rows = (await import(`./${file}.mjs?${Date.now()}`)).rows();
  out += `  // ${what}\n  ${id}: [\n${rows.map((r) => `    '${r}',`).join('\n')}\n  ],\n`;
}
writeFileSync(process.argv[2], out + '};\n');
console.log('baked', MAP.length);
