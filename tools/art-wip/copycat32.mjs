import { blank, paint, span, px, done } from './copycat_r4.mjs';
// THE COPYCAT, 32x32 bust (round 4). Pompadour, mirrored aviators, smirk, loud open-collar shirt;
// his right hand raised beside his face, pinching the chip he copied off you (a mirror-blue chip, tied to his shades).
// Shirt digits: 1 lit, 2 mid, 3 shadow, 4 line, 5 print dot (purple lounge shirt, pink dots).
const SHIRT = 'JVvKM';
export function copycat32() {
  const g = blank();
  // torso: centred under the head (x 17.5); shoulders slope like the approved four and run off the frame at rows 23-24
  const T = [[19, 15, 20], [20, 11, 24], [21, 8, 27], [22, 5, 30], [23, 2, 31]];
  for (const [y, a, b] of T) { span(g, y, a, b, '2'); for (let x = a; x <= b; x++) if (g[y - 1][x] === '.') px(g, x, y, '1'); }
  for (let y = 24; y < 32; y++) span(g, y, 0, 31, '2');
  // right side turns away from the light
  for (let y = 21; y < 32; y++) for (let x = 28; x < 32; x++) if (g[y][x] !== '.' && x >= 30 - (y > 25 ? 1 : 0) && (g[y][x] === '2' || x === 31)) px(g, x, y, '3');
  // placket below the open V
  for (let y = 25; y < 32; y++) px(g, 18, y, '4');
  // pompadour + face (block at x=9)
  paint(g, 9, 1, [
    '   kkkkkkkk       ',
    ' kkllllllllkkk    ',
    'klllkkkkkkllllkk  ',
    'kllkkkkkkkkkkkllkk',
    'klkkklllllkkkkkkkk',
    ' kkkllkkkkllkkkkk ',
    ' kkklkFFFFFFFFkkk ',
    ' kkkFFFFFFFkkkkFk ',
    ' kFkkkkFFFFFFFFfk ',
    ' kkkkkkkkkkkkkkkk ',
    ' FWCCCCCFfWCCCCCf ',
    ' FCAAAAAFfCAAAAAf ',
    ' fFUUUUcFfFUUUUcf ',
    '  FFFFFFFffFFFFf  ',
    '  FFFFFFFFFkkkFf  ',
    '  fFFFFFkkkWWkff  ',
    '   fFkkkFFFkkFf   ',
    '     fFFFFFff     ',
  ]);
  // neck + open V
  paint(g, 15, 19, ['ffffff', 'FFFFff', 'FFFFff', ' FFFf ', ' FFff ', '  Ff  ']);
  // collar wings
  paint(g, 10, 20, [' 1111', '11111', ' 21114', '   14', '    4']);
  paint(g, 21, 20, ['2224 ', '22224', '42224 ', ' 42  ', ' 4   ']);
  // sleeve: forearm straight under the wrist, easing 1px out at the bottom (elbow off frame)
  for (let y = 20; y < 32; y++) { const a = y < 24 ? 1 : 0; const b = a + 5; span(g, y, a, b, '2'); px(g, a, y, '1'); px(g, b - 1, y, '3'); px(g, b, y, '4'); }
  // chip pinched at its bottom rim between index (left) and thumb (right); thumb pad, curled fingers, a narrow wrist, white cuff
  paint(g, 1, 6, [
    '  AWWA  ',
    ' AAAAAU ',
    ' WAUUAW ',
    ' AAUUAU ',
    '  UAAU  ',
    '  FfFF  ',
    ' FFfFFf ',
    'FFFfFFf ',
    'FfFffFf ',
    'FfFFFf  ',
    ' fFFff  ',
    '  FFf   ',
    ' TTTTt  ',
    ' TTTtt  ',
  ]);
  // the tiny reflection: a diagonal glint across each mirrored lens
  for (const x of [11, 19]) { px(g, x, 11, 'C'); px(g, x + 2, 11, 'W'); px(g, x + 1, 12, 'W'); }
  // print: a sparse dot over shirt and sleeve
  for (let y = 23; y < 32; y++) for (let x = 0; x < 31; x++) if (y % 3 === 0 && (x + (y % 6 === 0 ? 0 : 3)) % 6 === 2 && g[y][x] === '2' && g[y - 1][x] === '2') px(g, x, y, '5');
  return done(g).map((r) => r.replace(/[1-5]/g, (c) => SHIRT[c - 1]));
}
