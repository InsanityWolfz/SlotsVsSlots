import type { StripCounts, SymbolId } from './config';
import type { Rng } from './rng';

export interface StripCell {
  symbol: SymbolId;
  /** Covered by enemy slime: scores as 'slime' until cleansed. */
  slimed: boolean;
}

export interface Reel {
  cells: StripCell[];
  /** Strip index currently sitting on the middle (payline) row. */
  stop: number;
}

export interface CellRef {
  reel: number;
  index: number;
}

export const VISIBLE_ROWS = 3;
export const MIDDLE_ROW = 1;

export function buildReel(counts: StripCounts, rng: Rng): Reel {
  const cells: StripCell[] = [];
  for (const [symbol, n] of Object.entries(counts) as [SymbolId, number][]) {
    for (let i = 0; i < n; i++) cells.push({ symbol, slimed: false });
  }
  if (cells.length === 0) throw new Error('Reel strip is empty');
  rng.shuffle(cells);
  return { cells, stop: rng.int(cells.length) };
}

export function wrap(i: number, len: number): number {
  return ((i % len) + len) % len;
}

export function effectiveSymbol(cell: StripCell): SymbolId {
  return cell.slimed ? 'slime' : cell.symbol;
}

/** Strip index shown at a visible row (0 = top, 1 = middle, 2 = bottom) for a given stop. */
export function indexAtRow(reel: Reel, row: number, stop = reel.stop): number {
  return wrap(stop + row - MIDDLE_ROW, reel.cells.length);
}

export function visibleCells(reels: Reel[]): CellRef[] {
  const out: CellRef[] = [];
  reels.forEach((reel, r) => {
    for (let row = 0; row < VISIBLE_ROWS; row++) out.push({ reel: r, index: indexAtRow(reel, row) });
  });
  return out;
}

export function paylineSymbols(reels: Reel[]): SymbolId[] {
  return reels.map((reel) => effectiveSymbol(reel.cells[reel.stop]));
}

export function slimeFraction(reels: Reel[]): number {
  let total = 0;
  let slimed = 0;
  for (const reel of reels) {
    total += reel.cells.length;
    for (const c of reel.cells) if (c.slimed) slimed++;
  }
  return total === 0 ? 0 : slimed / total;
}
