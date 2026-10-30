import { M } from './lib.mjs';
// A red heart (HP) with a green plus in front of it.
const HEART = [
  '............',
  '..11...11...',
  '.1111.1111..',
  '.111111111..',
  '.111111111..',
  '.111111111..',
  '..1111111...',
  '...11111....',
  '....111.....',
  '.....1......',
  '............',
  '............',
];
const PLUS = [
  '............',
  '............',
  '............',
  '............',
  '............',
  '.......22...',
  '.......22...',
  '.....222222.',
  '.....222222.',
  '.......22...',
  '.......22...',
  '............',
];
export const rows = () => {
  const g = HEART.map((r, y) => [...r].map((c, x) => (PLUS[y][x] === '2' ? '2' : c)));
  // a dark seam where the plus sits on the heart
  const seam = [];
  g.forEach((r, y) => r.forEach((c, x) => { if (c === '1' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] === '2')) seam.push([x, y]); }));
  for (const [x, y] of seam) g[y][x] = 'K';
  return M(g.map((r) => r.join('')), { 1: ['M', 'R', 'r'], 2: ['E', 'e', 'Q'] });
};
