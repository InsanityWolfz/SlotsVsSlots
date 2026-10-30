import { canvas, px, paint, fill, out } from './voltz_r4.mjs';
// DOC VOLTZ (hero of the TESLA slot machine), 32x32 three-quarter bust facing right, no arm. outline() adds the outer K.
export function voltz32() {
  const g = canvas(32);
  // --- lab coat: the near (left) shoulder slightly fuller; chest centre turned toward the right (x 16-17)
  fill(g, 22, [[10, 22], [5, 25], [2, 28], [0, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (!has(x, y - 1) ? (x < 20 ? 'W' : 'L') : x > 28 ? 'S' : x > 23 && y < 26 ? 'S' : 'L'));
  // sleeve seams: both upper arms hang from their own shoulders
  for (let y = 26; y < 32; y++) { px(g, 3, y, 'S'); px(g, 28, y, 'D'); }
  // lapels converging on the top button; the near lapel is wider and catches the light
  for (const [x, y] of [[9, 23], [9, 24], [10, 25], [11, 26], [12, 27], [13, 28], [14, 28]]) px(g, x, y, 'S');
  for (const [x, y] of [[23, 23], [22, 24], [21, 25], [20, 26], [19, 27], [18, 28]]) px(g, x, y, 'S');
  for (const [x, y] of [[10, 23], [11, 23], [10, 24], [11, 24], [11, 25], [12, 25], [12, 26], [13, 26], [13, 27], [14, 27]]) px(g, x, y, 'W');
  // coat closes below the V; breast pocket with two pens on the near side
  for (let y = 28; y < 32; y++) px(g, 16, y, 'S');
  px(g, 17, 29, 'D');
  paint(g, 4, 27, [' c O', ' c O', 'SSSSS']);
  // neck, shirt in the V, navy tie, orange collar (all turned with the body)
  paint(g, 12, 20, [
    '  fFFFFf  ',
    ' OOFFFfoo ',
    'OOOTUNToOo',
    'SOoTUNToOS',
    ' SOoUNoOS ',
    '  SOUNoS  ',
    '   SUNS   ',
    '    SS    ',
  ]);
  // --- hair: a tall wild white mane bursting up and back to the left (lit top-left, shadow under each tuft)
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
    '   SSLLLSLLL           ',
    ' WWSWLLLSL             ',
    '  WLLLLLS              ',
    '  WLLLLSS              ',
    '   SSLLS               ',
    '  WWSLSS               ',
    '   WLSS                ',
    '    SS                 ',
  ]);
  // --- face, three-quarter right: wide near cheek, nose breaking the right profile, grin shifted toward it
  paint(g, 7, 9, [
    '    FFFFFFFFFf      ',
    '   FFFFFFFFFFFf     ',
    '  FFFFFFFFFFFFf     ',
    '  FFFFFFFFFFFFf     ',
    '  FFFFFFFFFFFFFFf   ',
    '  FFFFFFFFFFFfff    ',
    '  FFFFKFFFFFFKf     ',
    '   FFFFKWWWWWKf     ',
    '   FFFFFKrrrKf      ',
    '    fFFFFKKKff      ',
    '     fFFFFFfff      ',
    '       ffFff        ',
  ]);
  // ear, set back on the near side
  paint(g, 7, 12, ['FFf', 'Fff', 'FFf', ' ff']);
  // brass goggles over his eyes, turned with the head: big near lens of solid tinted glass, a narrow far sliver by the profile
  paint(g, 7, 10, [
    '    GGGG   GG',
    'gggGWCCcgggGCg',
    '   GCCCcg  Gcg',
    '   GCCccg   g ',
    '    gggg      ',
  ]);
  // round nose tip breaking the profile; nape hair filling in behind the jaw
  px(g, 22, 12, 'F'); px(g, 23, 12, 'f'); px(g, 22, 13, 'F'); px(g, 23, 13, 'f');
  paint(g, 7, 16, ['SSf']);
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
