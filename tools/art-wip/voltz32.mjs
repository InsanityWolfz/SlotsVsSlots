import { canvas, px, paint, fill, out } from './voltz_r4.mjs';
// DOC VOLTZ (hero of the TESLA slot machine), 32x32 bust facing right, no arm. outline() adds the outer K.
export function voltz32() {
  const g = canvas(32);
  // --- lab coat: shoulders sloping from the neck to both edges, centred under the face (x 15-16)
  fill(g, 22, [[10, 21], [6, 25], [3, 28], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (!has(x, y - 1) ? (x < 20 ? 'W' : 'L') : x > 28 ? 'S' : x > 23 && y < 26 ? 'S' : 'L'));
  // sleeve seams: both upper arms hang from their own shoulders
  for (let y = 26; y < 32; y++) { px(g, 3, y, 'S'); px(g, 28, y, 'D'); }
  // lapels converging on the top button; the left lapel catches the light
  for (const [x, y] of [[9, 23], [9, 24], [10, 25], [11, 26], [12, 27], [13, 28]]) { px(g, x, y, 'S'); px(g, 31 - x, y, 'S'); }
  for (const [x, y] of [[10, 23], [11, 23], [10, 24], [11, 24], [11, 25], [12, 25], [12, 26], [13, 26], [13, 27]]) px(g, x, y, 'W');
  // coat closes below the V; breast pocket with two pens on the lit side
  for (let y = 28; y < 32; y++) px(g, 15, y, 'S');
  px(g, 14, 29, 'S'); px(g, 16, 29, 'D');
  paint(g, 5, 27, [' c O', ' c O', 'SSSSS']);
  // neck, shirt in the V, navy tie, orange collar
  paint(g, 11, 20, [
    '  fFFFFf  ',
    ' OOFFFfoo ',
    'OOOTUNToOo',
    'SOoTUNToOS',
    ' SOoUNoOS ',
    '  SOUNoS  ',
    '   SUNS   ',
    '    SS    ',
  ]);
  // --- hair: a tall wild white mane, tufts bursting up and back (lit top-left, shadow under each tuft)
  paint(g, 0, 1, [
    '      W    W    W      ',
    '  W  WLS  WLS  WLS     ',
    '  WL WLLSWLLLSWLLLS    ',
    '   WLLLLSLLLLSLLLLLS   ',
    ' WWLLLLSLLLLSLLLLLLS   ',
    '  WLLSLLLLSLLLLLLLLLS  ',
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
  // --- face, turned right: ear, bushy brows, big nose, manic grin
  paint(g, 7, 9, [
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
  paint(g, 6, 11, [' FF', 'FffF', 'FfF', ' ff']);
  // brass goggles down over his eyes: big cyan near lens, smaller far lens, eyes showing through; strap back to the ear
  paint(g, 8, 10, [
    '    GGGG  GG ',
    '   GWCCcgGWCg',
    'gggGCWKcgGWKg',
    '   GCccc Gccg',
    '    gggg  gg ',
  ]);
  // yellow sparks crackling in the hair
  const bolt = ['  Y', ' YY', 'YYWY', '  YY', '  Y'];
  for (const [bx, by] of [[3, 3], [15, 2]]) {
    // a shadow halo where the bolt crosses the hair, so the zig-zag reads against the white
    bolt.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === ' ') return;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = bx + dx + ox, y = by + dy + oy, h = g[y]?.[x];
        if ((h === 'W' || h === 'L') && (bolt[dy + oy]?.[dx + ox] ?? ' ') === ' ') px(g, x, y, 'S');
      } }));
    paint(g, bx, by, bolt);
  }
  return out(g);
}
