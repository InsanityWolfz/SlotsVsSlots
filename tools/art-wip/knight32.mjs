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
  paint(g, 15, 29, ['AN', 'AN', 'AN']);
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
  // --- great helm: crest socket, lit left plane, keel ridge, darker right plane, eye slit split by the keel, breaths
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
    'LSKKKKKKKLKKKKK',
    'LSSKKKKKKWKKKKK',
    'LLLLSLLLLWSSSDD',
    'LLLLSLLLLWSKSDD',
    'LLLLSLLLLWSSSDD',
    'SLLLSLLLLWSKSDD',
    'SSLLSLLLLWSSSDD',
    ' SSSSSSSSDDDDD ',
  ]);
  // eyes: two glints in the dark slit
  paint(g, 15, 10, ['WA', 'KK']); paint(g, 20, 10, ['WA', 'KK']);
  // --- sword held upright on his right side; forearm rises from the bottom edge (elbow off-frame)
    for (let y = 8; y <= 21; y++) paint(g, 26, y, ['WS']);
    paint(g, 26, 7, ['W']);
    // the pauldron behind the arm loses its lit edges (the arm shades it)
    for (let y = 22; y <= 31; y++) for (let x = 21; x <= 30; x++) if (g[y][x] === 'L') g[y][x] = 'S';
    // the blade crossing the pauldron gets its own dark edges
    for (let y = 19; y <= 21; y++) { px(g, 25, y, 'K'); px(g, 28, y, 'K'); }
    paint(g, 22, 22, [
      ' GYYYYYGg ',
      ' KWLLLSDK ',
      ' KSSSSDDK ',
      ' KLLLLSDK ',
      ' KSSSSDDK ',
      ' KLLLSSDK ',
      ' KLLSSDK  ',
      ' KLLSSDK  ',
      'KLLSSDK   ',
      'KLLSSDK   ',
    ]);
  return out(g);
}
