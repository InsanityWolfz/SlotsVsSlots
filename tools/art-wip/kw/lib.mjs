// Region-shaded masks: digits/symbols in a mask are regions; map[region] = [lit, mid, dark] (light from top-left) or one colour.
// Any other char is a literal palette colour; '.' is transparent.
export function M(mask, map = {}) {
  const h = mask.length, w = mask[0].length;
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? mask[y][x] : '.');
  return mask.map((r, y) => [...r].map((c, x) => {
    const m = map[c];
    if (m === undefined) return c;
    if (typeof m === 'string') return m;
    const [lit, mid, dark] = m;
    const same = (dx, dy) => at(x + dx, y + dy) === c;
    if (!same(-1, 0) || !same(0, -1)) return lit;
    if (!same(1, 0) || !same(0, 1)) return dark;
    return mid;
  }).join(''));
}
/** Apply [x, y, colour] fixes. */
export function fix(rows, fixes) {
  const g = rows.map((r) => r.split(''));
  for (const [x, y, c] of fixes) g[y][x] = c;
  return g.map((r) => r.join(''));
}
