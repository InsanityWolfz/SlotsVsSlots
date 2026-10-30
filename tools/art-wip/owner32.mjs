import { grid, put, stamp, shape, rows } from './helpers.mjs';
// THE OWNER, 32x32 bust: the man who owns the town. Old tycoon, slicked silver hair, gold-rimmed tinted glasses,
// a cigar with a lit tip and a wisp of smoke, black pinstripe suit, red tie, gold tie bar. outline() adds the outer K.
export function owner32() {
  const g = grid(32, 32);
  // --- broad shoulders (symmetric about x=15.5), pinstripe suit
  const T0 = 20; // top of the shoulders, under a heavy neck
  const body = [[7, 24], [4, 27], [2, 29], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]];
  shape(g, T0, body, (x, y, has) => (!has(x, y - 1) || !has(x - 1, y) ? 'l' : !has(x + 1, y) ? 'P' : (x % 4 === 2 && y > T0 + 1) ? 'h' : 'k'));
  const half = (y) => [3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0][y - T0] ?? 0;
  for (let y = T0; y < 32; y++) {
    const h = half(y);
    for (let x = 15 - h; x <= 16 + h; x++) put(g, x, y, x < 16 ? 'T' : 't');
    put(g, 15, y, 'R'); put(g, 16, y, 'r');
    if (y < T0 + 1) continue;
    // lapels: 4px wide, silk edge on the V, seam outside; a peak at row 22
    const w = y === T0 + 3 ? 5 : y > T0 + 7 ? 3 : 4;
    for (let i = 1; i <= w; i++) {
      put(g, 15 - h - i, y, i === 1 ? 'l' : i === w ? 'P' : 'k');
      put(g, 16 + h + i, y, i === 1 ? 'k' : i === w ? 'P' : 'k');
    }
  }
  put(g, 12, T0 + 1, 'T'); put(g, 19, T0 + 1, 't'); // collar wings
  stamp(g, 14, T0 + 6, ['YGGg']); // gold tie bar
  stamp(g, 22, T0 + 4, ['kTk', 'TTt', 'PPP']); // pocket square
  // --- head
  stamp(g, 8, 1, [
    '    LLWWWLLS    ',
    '  LWWWSLLLSLSS  ',
    ' LLWLSLLLSLLLSD ',
    ' LSLSLLLSLLLSSD ',
    ' LLFFFFFFFFFFDD ',
    ' FSSSSFFFFSSSSf ',
    ' GGGGGGFFGGGGGG ',
    'FGJVVVGggGJVVVGf',
    'FGVTKTGFFGTKTVGf',
    'ffggggFFfFggggff',
    ' FFFFFFFFfFFFff ',
    ' FFFfFFfffFFFff ',
    ' FFFKFFFFFFFFff ',
    ' fFFFKKKKKBBGBBB',
    ' fFFFFfffFbbgbbb',
    '  ffFFFFFFFfff  ',
    '   ffFFFFFFff   ',
    '    ffffffff    ',
    '    FFFfffff    ',
  ]);
  stamp(g, 24, 13, ['BBIO', 'bbHR']); // ash and ember
  stamp(g, 27, 5, ['S', ' L', ' L', '  L', '  L', ' L', ' S', ' S']); // smoke
  return rows(g);
}
