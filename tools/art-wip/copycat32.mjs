import { blank, paint, span, px, done } from './cc_tools.mjs';
// THE COPYCAT, 32x32 bust. A Vegas impersonator: pompadour, mirrored aviators, smirk, loud open-collar shirt,
// right hand raised beside his face pinching a chip he copied off you.
export function copycat32() {
  const SHIRT = { 1: 'M', 2: 'm', 3: 'd' };   // rose shirt: lit, mid, shadow
  const g = blank();
  // torso (1 lit, 2 mid, 3 shadow; remapped at the end)
  for (let y = 23; y < 32; y++) { const x0 = y === 23 ? 10 : y < 30 ? 6 : 9; span(g, y, x0, 31, '2'); }
  for (let y = 23; y < 32; y++) { px(g, 31, y, '3'); if (y > 24) px(g, 30, y, '3'); }
  span(g, 23, 10, 11, '1');
  // pompadour: a tall front roll that overhangs the forehead, slicked tight at the sides, long sideburns
  paint(g, 10, 1, [
    '    kkkkkkkkk     ',
    '  kklllllllllkk   ',
    ' kllkkkkkkkkkllkk ',
    'kllkkkkkkkkkkkkkk ',
    'klkllllllllkkkkkkk',
    ' kkkkkkkkkkllllkkk',
    '  kkkkkkkkkkkkkkkk',
    '   kkkkkkkkkkkkkk ',
  ]);
  paint(g, 12, 9, [
    ' kkFFFkFFFFFFkk ',
    ' kFFkkkFFFFFFkk ',
    ' kFFFFFFFkkkFfk ',
    ' kFKWWFFFFKWWfk ',
    ' kkkkkkkkkkkkkk ',
    'FkWWCCCCkWWCCCCf',
    'fFCCAAAcFCCAAAcf',
    ' FUUUNNfFUUUNNf ',
    ' FFNNNFfffNNNff ',
    ' FFFFFFFFFFFkfF ',
    ' fFFFFkkkkkKFf  ',
    '  fFFFFFFFFff   ',
    '   fFFFFFFff    ',
    '     fFFff      ',
  ]);
  // neck, big collar wings, open V
  paint(g, 13, 22, [
    '   FFFFff   ',
    '111FFFFff122',
    '1111FFFff112',
    '1222FFFf1223',
    ' 2221FFf122 ',
    '  2221Ff22  ',
    '     23     ',
  ]);
  // red chip, face on, pinched between thumb and finger
  paint(g, 3, 4, [
    ' RWWr ',
    'RRRRRr',
    'WRrrRt',
    'WRrrRt',
    'RRRRrr',
    ' rttr ',
  ]);
  paint(g, 2, 10, [
    ' FF  Ff ',
    ' FFf Ff ',
    'FFFFfFFf',
    'FFFFFFff',
    'FFFFFFff',
    ' fffff  ',
  ]);
  // bare forearm down to the elbow, short sleeve back up to the shoulder; the chest's side shows under the arm
  paint(g, 0, 16, [
    '    FFFFf    ',
    '    FFFFf    ',
    '   FFFFf     ',
    '   FFFFf     ',
    '  FFFFf      ',
    '  FFFFf      ',
    '  FFFFf      ',
    ' FFFFf    11 ',
    ' FFFFf 11122 ',
    ' FFFF1112222 ',
    ' fFF12222222 ',
    '  f122222222 ',
    '  3122222222 ',
    '  33222222   ',
    '    333333   ',
    '          33 ',
  ]);
  for (let y = 23; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] === '2' && (x + (y % 6 < 3 ? 0 : 2)) % 4 === 0 && y % 3 === 1) g[y][x] = '1';
  // the tiny reflection: your red chip, caught in both lenses
  px(g, 16, 15, 'W'); px(g, 23, 15, 'W');   // mirror glint
  px(g, 17, 16, 'R'); px(g, 24, 16, 'R');   // and your red chip, caught on the horizon of each lens
  [[10, 26], [10, 27], [10, 28], [9, 29]].forEach(([x, y]) => px(g, x, y, '3'));
  return done(g).map((r) => r.replace(/[1-4]/g, (d) => SHIRT[d]));
}
