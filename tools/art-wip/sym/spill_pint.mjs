import { writeFileSync } from 'node:fs';
import { png, outline } from '../../render.mjs';
import { SYMBOLS } from '/home/user/SlotsVsSlots/tools/symbols.mjs';
export const slime = [
  '................',
  '..W.............',
  '..SW......W.....',
  '..SCW....WCW....',
  '..SCCW..WCCCW...',
  '..SCCCWWCCCCL...',
  '..STTTTTTTTTL...',
  '..SYYYYYYYYYL...',
  '..SGYGGGGGGGL...',
  '..SGGGGGGGGGL...',
  '...SGGGGGGGL....',
  '...SGGGGGGOL....',
  '...SGGGGGOOL.W..',
  '..OSSSSSSSSLOWL.',
  '.OOOOGGGOOOOOOO.',
  '................',
];
export const icoFlood = [
  '........',
  '.W..W...',
  '.LCWCW..',
  '.LTTTW..',
  '.LYGGW..',
  '.OSSSO..',
  '.OOOOOO.',
  '........',
];
const save = (k, r, s) => writeFileSync(`${k}.png`, png(outline(r), s, '#1a1426'));
save('sym_new_8', slime, 8); save('sym_new_2', slime, 2); save('sym_old_8', SYMBOLS.slime, 8);
save('ico_new_16', icoFlood, 16); save('ico_new_2', icoFlood, 2); save('ico_old_16', SYMBOLS.icoFlood, 16);
