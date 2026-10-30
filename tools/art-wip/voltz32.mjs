import { canvas, px, span, paint, fill, out, tri, blob } from './voltz_r4.mjs';
// DOC VOLTZ (hero of the TESLA slot machine), 32x32 bust facing right. outline() adds the outer K.
export function voltz32() {
  const g = canvas(32);
  // --- lab coat: shoulders sloping from the neck to both edges, centred under the face (x 15-16)
  fill(g, 20, [[10, 21], [6, 25], [3, 28], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (!has(x, y - 1) ? (x < 20 ? 'W' : 'L') : x > 25 ? (x > 29 ? 'D' : 'S') : x > 21 ? 'S' : 'L'));
  // sleeve seams: the upper arms hang from their own shoulders
  for (let y = 24; y < 32; y++) { px(g, 3, y, 'S'); px(g, 29, y, 'D'); }
  // lapels: edges running down from the collar, shadow under the right lapel
  for (const [x, y] of [[9, 21], [9, 22], [10, 23], [11, 24], [12, 25], [13, 26]]) { px(g, x, y, 'S'); px(g, 31 - x, y, 'S'); }
  for (const [x, y] of [[10, 21], [11, 21], [10, 22], [11, 22], [11, 23], [12, 23], [12, 24], [13, 24], [13, 25]]) px(g, x, y, 'W');
  px(g, 22, 21, 'L');
  // coat closes below the V; breast pocket with two pens on the lit side
  for (let y = 26; y < 32; y++) px(g, 15, y, 'S');
  px(g, 14, 27, 'S'); px(g, 16, 27, 'D');
  paint(g, 5, 25, [' c O', ' c O', 'SSSSS']);
  // shirt in the V, orange collar
  paint(g, 11, 18, [
    '  fFFFFf  ',
    ' OOFFFfoo ',
    'OOOTUNToOo',
    'SOoTUNToOS',
    ' SOoUNoOS ',
    '  SOUNoS  ',
    '   SUNS   ',
    '    SS    ',
  ]);
  // --- hair: a wild white mane, tufts bursting up and back (lit top-left, shadow under each tuft)
  paint(g, 0, 1, [
    '      W     W          ',
    '  W    WL   WL   WS    ',
    '  WL  WLLS WLLS WLLS   ',
    '   WLWLLLSWLLLSWLLLS   ',
    ' WWSLLLLLLLLLLLLLLLLS  ',
    '  WLLLSLLLLLLLLLLLLLS  ',
    '  WLLLLSLLLLLLLLLLLLS  ',
    '   SSLLLSLL            ',
    ' WWSWLLLSL             ',
    '  WLLLLLS              ',
    '  WLLLLSS              ',
    '   SSLLS               ',
    '  WWSLSS               ',
    '   WLSS                ',
    '    SS                 ',
  ]);
  // --- face, turned right: ear, bushy brows, wide eyes looking right, big nose, manic grin
  paint(g, 7, 7, [
    '    FFFFFFFFFFf   ',
    '  FFFSSSFFFSSFFf  ',
    ' FFFFFFFFFFFFFFf  ',
    'FFFFFFWWKFFWKFFFf ',
    'FFFFFFFFFFFFFFFFF ',
    ' FFFFFFFFFFFFfff  ',
    '  FFFKFFFFFFFFKf  ',
    '   FFFKWWWWWWKff  ',
    '   FFFFKrrrrKff   ',
    '    fFFFKKKKFff   ',
    '     fFFFFFFfff   ',
    '      ffFFFff     ',
  ]);
  paint(g, 6, 9, [' FF', 'FffF', 'FfF', ' ff']);
  // goggles pushed up on the forehead: big near lens, smaller far lens (strap hidden in the mane)
  paint(g, 6, 3, [
    '     GGGG  GG ',
    '    GCWCcgGCWg',
    '   SGCCccgGCcg',
    '    GCccc gccg',
    '     gggg  gg ',
  ]);
  // sparks crackling off the hair
  paint(g, 1, 1, [' c', 'cC', ' Cc', '  c']);
  paint(g, 20, 1, ['c', 'Cc', ' C']);
  // --- forearm rising from the bottom edge in front of the chest, fist, lightning bolt
  for (let y = 25; y < 32; y++) { span(g, y, 24, 28, 'L'); px(g, 24, y, 'W'); px(g, 28, y, 'S'); px(g, 23, y, 'D'); }
  span(g, 25, 24, 28, 'S');
  paint(g, 24, 13, [
    '   cCC',
    '  cWC ',
    ' cWC  ',
    'cWWWWC',
    '   WC ',
    '  WC  ',
    ' WC   ',
    ' C    ',
  ]);
  paint(g, 23, 21, [
    ' FFFf',
    'FFfFff',
    'FFfFff',
    ' ffff',
  ]);
  return out(g);
}
