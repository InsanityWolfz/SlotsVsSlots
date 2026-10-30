import { M } from './lib.mjs';
// Three reels' cells: dim top and bottom rows; the middle row lit, joined by the gold payline.
export const rows = () => M([
  '............',
  '.11..11..11.',
  '.11..11..11.',
  '............',
  '.33..33..33.',
  '.2222222222.',
  '.2222222222.',
  '.33..33..33.',
  '............',
  '.11..11..11.',
  '.11..11..11.',
  '............',
], { 1: ['t', 'p', 'p'], 2: ['Y', 'Y', 'G'], 3: 'T' });
