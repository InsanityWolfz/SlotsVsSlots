import { canvas, px, span, paint, fill, out } from './knight_r4.mjs';
// SIR REGINALD (the KNIGHT machine's hero), 32x32 bust facing right. outline() adds the outer K.
export function knight32() {
  const g = canvas(32);
  // --- body: gorget, pauldrons, blue tabard; symmetric shoulders off both sides
  const body = [[10, 21], [5, 26], [3, 28], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]];
  fill(g, 19, body, (x, y, has) => (!has(x, y - 1) || !has(x - 1, y) ? 'L' : !has(x + 1, y) ? 'D' : 'S'));
  // tabard
  const tb = [[12, 19], [11, 20], [11, 20], [11, 20], [11, 20], [10, 21], [10, 21], [10, 21], [9, 22], [9, 22], [9, 22], [9, 22]];
  fill(g, 20, tb, (x, y, has) => (!has(x - 1, y) || !has(x + 1, y) ? 'G' : y === 20 ? 'G' : !has(x - 2, y) ? 'A' : !has(x + 2, y) || !has(x + 3, y) ? 'N' : 'U'));
  span(g, 20, 13, 18, 'g');
  paint(g, 13, 24, ['Y Y Y', 'YGYGY', 'GGGGg', ' ggg ']);
  // a soft fold in the cloth below the emblem
  paint(g, 15, 28, ['AN', 'AN']);
  // pauldrons: domes rising toward the neck, two lames each
  paint(g, 0, 19, [
    '     LLLLL',
    '   LWWWLLLS',
    ' LWWLLLLLSSS',
    'LWLLLLLSSSSD',
    'LLLLLSSSSSDD',
    'DDDDDDDDDDD',
    'LLLLSSSSSSD',
    'DDDDDDDDDD',
    'LLSSSSSSD',
  ]);
  paint(g, 20, 19, [
    ' LLLLLL',
    'LLLLLLSSS',
    'LLLSSSSSSSD',
    'LSSSSSSSSDDD',
    'SSSSSSSSDDDD',
    ' DDDDDDDDDDD',
    ' LLSSSSSSDDD',
    '  DDDDDDDDDD',
    '   LSSSSSDDD',
  ]);
  // gorget
  fill(g, 17, [[12, 20], [12, 20]], (x, y) => (y === 17 ? 'D' : x < 13 ? 'L' : x > 16 ? 'D' : 'S'));
  paint(g, 10, 19, ['LLLLLLSSSSDD']);
  // --- plume streaming back from the crest socket
  paint(g, 1, 1, [
    '      AAAAAAAU',
    '   AAAAUUUUUUN',
    '  AAUUUUUUNNN',
    ' AAUUUNNNNN',
    'AAUUNNN',
    'AUUN',
    'AUN ',
    'UN',
    'N',
  ]);
  // --- great helm: crest socket, lit left plane, keel ridge, darker right plane, a thin dark eye slit, breaths
  paint(g, 15, 1, ['gGg']);
  paint(g, 9, 2, [
    '    WWLLLSS    ',
    '  WWLLLLLLLSS  ',
    ' WLLLLLLLLLSSD ',
    ' WLLLLLLLLWSSD ',
    'LWLLSLLLLLWSSSD',
    'LWLLSLLLLLWSSDD',
    'LLLLSLLLLLWSSDD',
    'SSSSSSSSSSSSSDD',
    'LSKKKKKKKKKKKKK',
    'LLLLSLLLLWSSSDD',
    'LLLLSLLLLWSSSDD',
    'LLLLSLLLLWSKSDD',
    'LLLLSLLLLWSSSDD',
    'SLLLSLLLLWSKSDD',
    'SSLLSLLLLWSSSDD',
    ' SSSSSSSSDDDDD ',
  ]);
  // shift the whole bust down 2px: more room above the plume, shoulders fill the bottom
  g.splice(30, 2); g.unshift(Array(32).fill('.'), Array(32).fill('.'));
  return out(g);
}
