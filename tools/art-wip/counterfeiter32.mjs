import { blank, paint, span, px, done } from './counterfeiter_r4.mjs';
// THE COUNTERFEITER, 32x32 bust (round 4). Grey slicked hair under a green dealer's eyeshade, black jeweller's loupe
// in his left eye, pencil moustache, sly smirk; olive coat over a grey vest. Right hand raised to his jaw in front of his
// shoulder, holding up a gold chip whose gilt has flaked off one edge to show grey lead (the fake).
export function counterfeiter32() {
  const g = blank();
  // torso
  const T = { 20: [9, 18], 21: [6, 21], 22: [3, 24], 23: [1, 28], 24: [0, 31] };
  for (let y = 20; y < 32; y++) { const [a, b] = T[y] ?? [0, 31]; span(g, y, a, b, 'Z'); }
  for (let y = 20; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'Z') {
    if (g[y - 1][x] === '.' || x === 0) px(g, x, y, 'X'); else if (x >= 30) px(g, x, y, 'z');
  }
  // head
  paint(g, 5, 1, [
    '    IIIIHHHhh    ',
    '   IIHHHHHHHHhh  ',
    '  IHHHhHHHHHHHhh ',
    '  qqqqqqqqqqqqqq ',
    ' EEEEeeeeeeeeeeQ ',
    'QeeeeeeeeeeeeeeQq',
    '  hQQQQQQQQQQQQh ',
    '  hFhhhFFFkkkkkh ',
    '  hFWWKFFkLCWWSk ',
    ' FhFfffFFkSWKKSkF',
    ' FfFFFFFfkSWKKSkf',
    '  FFFFFFffkSSSkf ',
    '  FFFFFfFfFkkkFf ',
    '  FFFFFFFFFFFFff ',
    '  FFFkkkFkkkFFff ',
    '   FFFFFFFFFFkf  ',
    '   FFKWWWWKkFff  ',
    '    FFfffffFff   ',
    '     ffffffff    ',
  ]);
  // neck + shirt + vest + tie, coat lapels either side of the opening
  paint(g, 7, 19, [
    '    FFFFff    ',
    '   XTFFFfTz   ',
    '  XXzTTkkTTzZ ',
    ' XXzITTlkThzZ ',
    '  XzIHTlkhhzZ ',
    '  XzIHHlkhhhz ',
    '  XXzIHlkhhz  ',
    '  XXzIHHkhhz  ',
    '   XzIHHhhz   ',
    '   XzIHkhhz   ',
    '   XzIHHhhz   ',
    '   XXzIHhz    ',
    '   XXzIkhz    ',
  ]);
  // the raised arm shades the chest beside it
  for (let y = 22; y < 32; y++) for (let x = 19; x <= 21; x++) if (g[y][x] === 'Z' && x >= 21 - (y > 26 ? 1 : 0)) px(g, x, y, 'z');
  // breast pocket welt
  span(g, 27, 6, 9, 'z');
  // his left arm hangs at his side: a seam line from the shoulder down
  for (let y = 24; y < 32; y++) px(g, 4, y, 'z');
  // arm: forearm rising straight from the bottom edge, cuff, hand, chip
  for (let y = 25; y < 32; y++) { const o = y >= 29 ? 1 : 0; px(g, 22, y, 'q'); px(g, 23, y, 'X'); span(g, y, 24, 26 + o, 'Z'); px(g, 27 + o, y, 'z'); px(g, 28 + o, y, 'q'); }
  px(g, 22, 24, 'q'); // cuff against the coat
  px(g, 26, 27, 'z'); px(g, 25, 28, 'z'); // sleeve crease
  paint(g, 23, 11, [
    '  GTTG  ',
    ' GGGGgH ',
    'GGGYYGgh',
    'TGYYYYgT',
    'TGYYYYgT',
    'GgGYYggg',
    ' gggggg ',
    '  gTTg  ',
  ]);
  paint(g, 22, 19, [
    '  F FFf ',
    ' FFfFFf ',
    ' FfFfFf ',
    ' FfFfFf ',
    '  fffff ',
    ' TTTTTt ',
  ]);
  // dark line where the hand and cuff sit in front of the coat
  for (let y = 21; y <= 24; y++) px(g, 22, y, 'q');
  px(g, 23, 23, 'q'); px(g, 28, 24, 'q');
  return done(g);
}
