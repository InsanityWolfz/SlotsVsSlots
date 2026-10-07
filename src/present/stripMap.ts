import { cellCenter } from './layout';

/** Where things that land on your reels (rocks, steals, marks) fly to: that reel on your machine (the side table is
 * gone from fights; the left column shows your relics). */
export function stripMapColumn(r: number): { x: number; y: number } {
  return cellCenter('player', r, 1);
}
