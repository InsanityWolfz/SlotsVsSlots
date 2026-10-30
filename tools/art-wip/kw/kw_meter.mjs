import { M } from './lib.mjs';
// A tall segmented gauge, most of the way full.
export const rows = () => M([
  '............',
  '..11111111..',
  '..1pppppp1..',
  '..1pppppp1..',
  '..1KKKKKK1..',
  '..12222221..',
  '..12222221..',
  '..1KKKKKK1..',
  '..13333331..',
  '..13333331..',
  '..11111111..',
  '............',
], { 1: ['L', 'S', 'D'], 2: ['Y', 'Y', 'G'], 3: ['Y', 'Y', 'G'] });
