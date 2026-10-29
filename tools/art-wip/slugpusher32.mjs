import { canvas, px, span, paint, out } from './sp_tools.mjs';
// THE SLUG PUSHER, 32x32 bust. outline() adds the outer K.
// A heavyset small-time cheat in a too-big tan trench coat and a flat cap, five-o'clock shadow,
// beady eyes sliding sideways, holding up a dull lead slug between finger and thumb. More slugs bulge from his pocket.
export function slugpusher32() {
  const g = canvas(32);
  // --- trench coat: heavy shoulders off the bottom (tan: w lit, B mid, b shadow)
  [[10, 26], [6, 28], [3, 30], [1, 31], [0, 31]].forEach(([a, b], i) => span(g, 19 + i, a, b, 'B'));
  for (let y = 24; y < 32; y++) span(g, y, 0, 31, 'B');
  for (let y = 20; y < 32; y++) { px(g, 31, y, 'b'); if (y > 21) px(g, 30, y, 'b'); }
  // popped collar: near flap (lit) and far flap (shadow) around the jowls
  paint(g, 9, 13, [' wB', 'wBb', 'wBb', 'wBBb', 'wBBb', 'wBBb']);
  paint(g, 26, 12, ['b', 'Bb', 'BBb', 'BBbb', 'BBbb', 'bBBbb', 'bBBb', 'bBb']);
  // epaulette on the far shoulder
  paint(g, 26, 20, ['wwww', ' bbwww', '    bb']);
  // wide lapels framing a grubby shirt and a loose tie
  paint(g, 12, 19, [
    'wwBTTTTTTTBbb',
    ' wBBTTrRTBBb',
    ' wwBBtRrBBbb',
    '  wwBbRrbBb',
    '  wwBbRbBBb',
    '   wBbRrbBb',
    '   wBBbRbBb',
    '    wBbbBb',
    '    wBBBBb',
  ]);
  px(g, 24, 24, 'b'); px(g, 24, 27, 'b');
  // bulging pocket on his left (viewer right), slugs spilling over the flap
  paint(g, 21, 25, ['  IH', ' IHhIH', 'bhhbHhbb', 'wwwwwwwb', 'wBBBBBBb', 'BBBBBBbb', 'bbbbbbb']);
  // --- head: wide, jowly; stubble = H dither on the lit side, h dither in shadow
  paint(g, 11, 6, [
    ' fffffffffffffff ',
    'fkkkfFFFFFFFFFFff',
    'FFFFFFFFFFkkkkFff',
    'FFKWfFFFFFFKWfFff',
    'FFffFFFFFFFfffFff',
    ' FFFFFFFFfFFFFff ',
    ' FFFfFFFFFffFfff ',
    ' FFFkFFfffffffff ',
    ' FHFFkTTkkkkkfhf ',
    ' FFHFHkkFHfhfhfh ',
    ' FHFHFHFHfhfhfhf ',
    '  FHFHFHfhfhfhf  ',
    '   hhhhhhhhhhh   ',
  ]);
  paint(g, 28, 8, ['f', 'f', 'b']); // far ear
  // --- flat cap (charcoal), crown pulled forward over a short brim
  paint(g, 11, 1, [
    '   tllllkkkkkk',
    ' tlllllllkkkkkkk',
    'tllllllllllkkkkkk',
    'kkkkkkkkkkkkkkkkkk',
    ' tlllllllllkkkkkk',
  ]);
  // --- raised right hand (viewer left): the sleeve climbs from the elbow below the frame, cuff, hand pinching a slug
  for (let y = 17; y < 32; y++) paint(g, 1 - Math.floor((y - 16) / 2), y, ['wwwwBBBBbk']);
  paint(g, 0, 14, [' bbbbbbbb', 'wwwwwwwwB', 'BBBBBBBBb']);
  paint(g, 1, 2, [
    '  IIIIH  ',
    ' IIHHHHh ',
    'IIHhhhHHh',
    'IHhHHHhHh',
    'IHhHHHhHh',
    'IFFhhhHFf',
    ' FFFHHFFf',
    ' FFfhhFFf',
    'FFFFFFFFf',
    'FfFfFfFff',
    ' FFFFFff ',
    '  FFFff  ',
  ]);
  return out(g);
}
