import { M } from './lib.mjs';
// A paper slip that says IOU, with a red seal.
export const rows = () => M([
  '............',
  '............',
  '.1111111111.',
  '.1K1KKK1K1K.',
  '.1K1K1K1K1K.',
  '.1K1KKK1KKK.',
  '.1111111111.',
  '.1kkk1k2222.',
  '.111111222222'.slice(0, 11) + '.',
  '.......2222.',
  '........22..',
  '............',
], { 1: ['W', 'T', 'I'], 2: ['M', 'R', 'r'] });
