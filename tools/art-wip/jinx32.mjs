import { canvas, px, span, paint, prop, out } from './jx_tools.mjs';
// THE JINX, 32x32 bust. Outline added by outline().
export function jinx32() {
  const g = canvas(32);
  const H = 2; // head x-shift
  // --- jacket: loud sickly-green check, shoulders off the bottom
  for (let y = 21; y < 32; y++) span(g, y, y < 22 ? 9 : y < 23 ? 6 : y < 24 ? 4 : 2, 31, 'Z');
  for (let y = 21; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'Z' && ((x % 3 === 0) || (y % 3 === 0))) g[y][x] = (x % 6 === 0 && y % 6 === 0) ? 'q' : 'z';
  // light from the top-left: lit shoulder line, shadowed right flank
  for (let x = 9; x < 32; x++) for (let y = 21; y < 32; y++) if (g[y][x] !== '.') { if (g[y - 1][x] === '.') g[y][x] = 'X'; break; }
  for (let y = 22; y < 32; y++) { g[y][31] = 'z'; if (y % 3) g[y][30] = g[y][30] === 'Z' ? 'z' : g[y][30]; }
  // shirt (dingy), lapels
  paint(g, 13 + H, 20, [
    ' TTTTTTTTT',
    'XTTIIIIITTz',
    'XXTTIIITTzz',
    'XzXTIIITzzz',
    ' XzXTITzzz',
    '  XzXIzzz',
    '   Xzzz',
  ]);
  // upside-down rusty horseshoe on a string at the open collar
  paint(g, 16 + H, 21, ['  h', ' BoB', 'B   o', 'o   o', 'b   b']);
  // wilted clover pinned on his left lapel
  paint(g, 23 + H, 23, ['eQ', 'QeQ', ' Qq', '  q']);
  // --- head
  paint(g, 12 + H, 2, ['bwwwBBBBBBBb']);
  paint(g, 11 + H, 3, ['wBBBBBBBBbBBBb']);
  paint(g, 10 + H, 4, ['wBBBBbBBBBBBBBb']);
  paint(g, 10 + H, 5, ['BBBBBBBBBBBBbBbb']);
  paint(g, 9 + H, 6, ['wwwwwwwwwwwwwBBbb']);
  paint(g, 10 + H, 7, ['bbbbbbbbbbbbbbb']);
  paint(g, 11 + H, 8, [
    'Ffffffffffffff',
    'FFIIIIFFFFFFFf',
    'FIfWWWfFFIIIIf',
    'FFWWKWWFFfKKKf',
    'FFfWWWfFaFffFf',
    'FFFfffFFaFfFFf',
    'FFFFFFFaaFfFFf',
    'FKFFFFFffffFFf',
    'FFKTKTGTKKKfFf',
    'FIFfKKKKfFFKFf',
    ' FFIFIFIFIFIf',
    '  fffHfffff',
  ]);
  paint(g, 10 + H, 10, ['F', 'f', 'F']); paint(g, 25 + H, 10, ['f', 'f', 'f']);
  paint(g, 16 + H, 20, ['ffff']);
  // --- pointing arm (his right, viewer's left): forearm rises, hand points left with a bony finger
  const arm = [[15, 4], [16, 4], [17, 4], [18, 4], [19, 4], [20, 4], [21, 3], [22, 3], [23, 3], [24, 3], [25, 2], [26, 2], [27, 2], [28, 2], [29, 1], [30, 1], [31, 1]];
  for (const [y, x] of arm) paint(g, x + 1, y, [y % 3 === 1 ? 'XzzzzzK' : 'XZzZZzK']);
  paint(g, 5, 14, ['TTTIII']);
  paint(g, 1, 8, [
    '      FF',
    '     FfFF',
    ' FFFFFFFf',
    'FfffffFFf',
    '    fFfFf',
    '    FfFff',
    '     fff',
  ]);
  // chain from the fist + dyed-magenta rabbit's foot (gold cap, crooked toes)
  paint(g, 4, 13, ['L']);
  prop(g, 1, 14, ['  GYg', '  Mxs', ' Mxxs', 'MMxxs', 'Mxxs', 'xxs', 'T T']);
  // the jinx itself: a magenta spark off the fingertip
  paint(g, 1, 5, [' x', 'xMx', ' x']);
  return out(g);
}
