import { stamp, rows } from './helpers.mjs';
// THE FENCE (file/export keep the old slugpusher32 name), 32x32 bust. Literal pixels; outline() adds the outer K.
// Heavyset shady dealer in fake jewellery: porkpie hat, too-big tan trench coat, beady eyes, a paste 'rock'.
// His right forearm rises straight from the bottom edge (elbow off-frame), shoulder cap where it leaves the body,
// hand at cheek height holding up a fake diamond.
export function slugpusher32() {
  const base = [
    '................................', // 0
    '................tlllllllkk......', // 1
    '...............tllllllllllkk....', // 2
    '...............tlllllllllllk....', // 3
    '...............kkkkkkkkkkkkk....', // 4
    '............tlllllllllllllllkk..', // 5
    '.............kkffffffffkkffkk...', // 6
    '.............kFFkkkFFFkFFFFkf...', // 7
    '.............kFFFKWFFFKWFFFkFf..', // 8
    '.............FFFFFFFfFFFFFFfFf..', // 9
    '.............FFFFFFFFfFFFFfff...', // 10
    '.............FFFFFFffffFFFFff...', // 11
    '.............FFFFFFFFFFFFFfff...', // 12
    '.............FFFFFFFFFFFKffff...', // 13
    '..............fFFFFKKKKKFffff...', // 14
    '...............ffffFFFFfff......', // 15
    '...............fffffffffff......', // 16
    '..............fFFFFFFFFFfff.....', // 17
    '...............ffffffffffff.....', // 18
    '.........wwBB.TTffffffffTT.wBb..', // 19
    '.....awwwwwBBTTTfffffffTTTbwwBb.', // 20
    '...aawwwwwwwBBTTTTrRrTTTbbwwwBb.', // 21
    '.aawwwwwwwwwwBBtTTrRrTTbbwwwwBBb', // 22
    'awwwwwwwwwwwwwBBtTTrRTbbwwwwwBBb', // 23
    'wwwwwwwwwwwwwwwBBtTrRbbwwwwwwBBb', // 24
    'wwwwwwwwwwwwwwwwBBtRrbwwwwwwwBBb', // 25
    'wwwwwwwwwwwwwwwwwBbrRbwwwwwwwBBb', // 26
    'wwwwwwwwwwwwwwwwwwBbbwwwwwwwwBBb', // 27
    'wwwwwwwwwwwwwwwwwwBwbwwwwwwwwBBb', // 28
    'wwwwwwwwwwwwwwwwwwBwbwwwwwwwwBBb', // 29
    'wwwwwwwwwwwwwwwwwwBwbwwwwwwwwBBb', // 30
    'wwwwwwwwwwwwwwwwwwBwbwwwwwwwwBBb', // 31
  ];
  base.forEach((r, i) => { if (r.length !== 32) throw new Error(`row ${i}: ${r.length}`); });
  const g = base.map((r) => r.split(''));
  // arm (as the Pickpocket's): the forearm rises straight from the bottom edge (elbow off-frame), the shoulder cap
  // shows where it leaves the body; K seam against the chest. '.' clears the old coat pixels.
  stamp(g, 0, 18, [
    '..awwwwB.....',
    '..awwwwB....B',
    '..awwwwBKaawB',
    '..awwwwBKwwwB',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
    '..awwwwBKwww',
  ]);
  // double-breasted buttons; a flap pocket
  stamp(g, 25, 23, ['b', ' ', ' ', 'b']);
  stamp(g, 22, 28, ['bbbbbbb', 'Bwwwwwb', ' BBBBb']);
  // hand pinching up a big paste diamond by its point: pale cyan crown with a white glint, dark girdle line,
  // pavilion narrowing into thumb and finger; a cheap gold ring on one knuckle; shirt cuff and sleeve edge
  stamp(g, 0, 9, [
    '   ACCCA  ',
    '  ACWCCAc ',
    ' ACWCCCAcc',
    ' cccccccnn',
    '  cCCCAcn ',
    ' FFcCCAnFF',
    ' FFFcAnFFf',
    '  fFFFFFf',
    '  FfGfFff',
    '  fffffff',
    '  TTTTTTt',
    '  bbbbbbK',
  ]);
  return rows(g);
}
