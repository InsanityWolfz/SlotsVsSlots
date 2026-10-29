import { canvas, px, span, paint, prop, propOver, out } from './jinx_r4.mjs';
// THE JINX, 32x32 bust (round 4). Outline added by outline().
// the dyed rabbit's foot: gold cap, furry shank, crooked paw with its toes
const FOOT = [' GYg ', ' Mxs ', ' Mxs ', ' Mxs ', ' Mxxs', 'MMxxs', 'Mxsxs', ' s s '];
export function jinx32() {
  const g = canvas(32);
  // --- jacket: loud, shabby mustard check, shoulders off the bottom, right shoulder sloping like the left
  const spans = { 20: [13, 26], 21: [11, 28], 22: [9, 29], 23: [8, 30] };
  for (let y = 20; y < 32; y++) { const [a, b] = spans[y] ?? [7, 30]; span(g, y, a, b, 'G'); }
  for (let y = 20; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (g[y][x] !== 'G') continue;
    const line = x % 4 === 0 || y % 4 === 0;
    const top = g[y - 1][x] === '.';
    g[y][x] = top ? 'Y' : x >= 30 ? 'g' : line ? (x >= 26 ? 'g' : 'w') : 'G'; // faded check, darker on the shadow side
  }
  // open shirt collar and lapels
  paint(g, 15, 20, [
    'YTT     TTg',
    ' YTIfffITg ',
    ' gYTIIITgg ',
    '  gYTITgg  ',
    '   gYTgg   ',
    '    gYg    ',
  ]);
  // --- head (porkpie hat, old stubbly face, one bulging eye)
  paint(g, 11, 1, [
    '    wwwwBBBBBb     ',
    '   wBBBBBBBBBBb    ',
    '   wBBBBBBBBBbb    ',
    '   kkkkkkkkkkkk    ',
    ' wwwwwwwwwwwwwwwwB ',
    'bbbbbbbbbbbbbbbbbbb',
    ' Iffffffffffffffh  ',
    ' IFFhhhFFFFFFFFfH  ',
    ' FFhWWWfFFFhhhhfff ',
    ' fFfWKWfFfFWKWfFff ',
    ' FFFWWWFFfFfffFfff ',
    '  FFfffFFFffFFFff  ',
    '  FFFFfFFFffFFFff  ',
    '  FfFFfKffKfFFfff  ',
    '  FFfFFFffffKTKff  ',
    '  IIKTTTKTTTTTKHH  ',
    '  IIIKKKKKKKKKIHH  ',
    '   IIIIIIIIIIIHH   ',
    '     IIIIIIIHH     ',
  ]);
  paint(g, 17, 20, ['ffffff']);
  // a wilted four-leaf clover tucked in the hatband
  prop(g, 22, 1, [' E ', 'EQe', ' eq', '  q']);
  // --- raised forearm out of his right shoulder (elbow below the frame), seam against the chest
  for (let y = 16; y < 32; y++) {
    for (let x = 1; x <= 6; x++) g[y][x] = x === 1 ? 'Y' : x === 6 ? 'g' : x % 4 === 0 || y % 4 === 0 ? 'w' : 'G';
    if (y > 16) px(g, 7, y, 'K');
  }
  paint(g, 1, 16, ['TTTIII']);
  // hand: back of the fist, index finger crooked out to the right with the key ring on it
  paint(g, 1, 10, [
    ' FFFF     ',
    'FFFFFFFFFf',
    'FFFFfff   ',
    'FFFFFf    ',
    'FFFff     ',
    'fFFFf     ',
  ]);
  propOver(g, [[9, 12, [' G ', 'g g', ' g ']], [10, 15, ['L', 'S']], [8, 17, FOOT]], 'YGgwTI');
  return out(g);
}
