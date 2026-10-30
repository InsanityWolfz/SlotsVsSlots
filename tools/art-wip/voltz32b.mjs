import { canvas, px, paint, fill, spike, lower, out } from './voltz_rd.mjs';
// DOC VOLTZ (hero of the TESLA slot machine), design B: the static-charged mane. Every white hair stands straight up
// and fans out as if he just grabbed the coil, with yellow sparks jumping between the tips; brass goggles over his
// eyes; a cackling open grin; white lab coat with a tall popped orange collar. Three-quarter bust turned right, no arm.
export function voltz32b() {
  const g = canvas(32);
  // --- lab coat: symmetric shoulders sloping off both edges
  fill(g, 22, [[10, 22], [7, 25], [5, 26], [3, 28], [2, 29], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (!has(x - 1, y) || (!has(x, y - 1) && x < 16) ? 'W' : x >= 28 || (!has(x, y - 1) && x >= 16) ? 'S' : 'L'));
  for (let y = 25; y < 32; y++) { px(g, 5, y, 'S'); px(g, 26, y, 'S'); }
  // closed front: a seam down past the buttons
  for (let y = 25; y < 32; y++) px(g, 16, y, 'S');
  paint(g, 17, 27, ['D', '', '', 'D']);
  // tall popped orange collar standing up behind the neck, opening in a V over the shirt and cyan tie
  paint(g, 10, 19, [
    ' Oo       Oo',
    'aOo       OOo',
    'aOOo     oOOo',
    ' aOOTTcTTOOo',
    '  aOTTcTTOo',
    '   SoTcToS',
    '    SScSS',
  ]);
  // neck
  paint(g, 13, 20, [' fffff', 'FFFFFf', 'FFFFf']);
  // --- mane: every hair stands on end, fanning up and out from the scalp in separate spikes
  for (const [bx, by, tx, ty, w] of [
    [22, 10, 28, 8, 3], [21, 8, 27, 3, 4.4], [19, 8, 21, 2, 4.6], [16, 8, 16, 2, 4.6], [13, 8, 11, 2, 4.6],
    [11, 9, 5, 3, 4.6], [10, 12, 3, 9, 4.2],
  ]) spike(g, bx, by, tx, ty, w);
  // the roots of the mane across the scalp, hairline at the top of the brow
  paint(g, 10, 7, [
    ' WLLLLLLLLLLS',
    'LLLSLLSLLSLS',
  ]);
  // the mane over the back of the head, down to the nape
  paint(g, 7, 9, [
    '  WLL',
    ' WLLL',
    'WLLLL',
    'LLLLS',
    'SLLLS',
    ' SLSS',
    '  SS',
  ]);
  // --- head: face turned right, features right of centre, the profile is the right edge
  paint(g, 10, 8, [
    'L FFFFFFFFFFf',
    'LFFFFFFFFFFFf',
    'LFFFFFFFFFFFf',
    'LFFFFFFFFFFFf',
    'FFFFFFFFFFFFf',
    'FFFFFFFFFFFFFf',
    'FFFFFFFFFFFFf',
    ' FFFFFFFFFFFf',
    ' FFFFFFFFFFFf',
    '  FFFFFFFFFFf',
    '  FFFFFFFFFf',
    '   fFFFFFFf',
    '     ffff',
  ]);
  // near ear
  paint(g, 9, 12, ['FFf', 'fFf', ' ff']);
  // bushy white brows shoved up by the grin
  paint(g, 13, 9, [' WWWL  WL']);
  // round brass goggles over both eyes, strap back into the mane
  paint(g, 10, 10, [
    '    GGG  GG',
    'bbbGCccgGccg',
    '   Gcccggccg',
    '    ggg  gg',
  ]);
  // nose under the far lens, tip one pixel past the profile
  paint(g, 21, 13, [' F', 'FFF', 'fff']);
  // cackling open grin: upper and lower teeth round a dark open mouth, corners pulled up
  paint(g, 14, 15, [
    'f     f',
    'KWWWWWK',
    'KrrrrrK',
    ' KTTTK',
  ]);
  // yellow sparks jumping between the tips of the mane
  paint(g, 8, 2, ['Y', ' Y', 'YY', ' Y']);
  paint(g, 24, 2, [' Y', 'YY', ' Y']);
  return out(lower(g, 1));
}
