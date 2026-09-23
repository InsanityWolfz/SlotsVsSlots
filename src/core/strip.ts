import type { StripCounts, SymbolId } from './config';
import type { Rng } from './rng';

export interface StripCell {
  symbol: SymbolId;
  /** Covered by enemy slime: scores as 'slime' until cleansed. */
  slimed: boolean;
  /** Snatched by a thief: an empty hole for the rest of the fight. */
  stolen?: boolean;
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
  return cell.stolen ? 'empty' : cell.slimed ? 'slime' : cell.symbol;
}

/** Symbols that do nothing on the player's own payline. */
export const DEAD: ReadonlySet<SymbolId> = new Set(['slime', 'rock', 'empty', 'lock', 'ice', 'claw']);

/** How much the player would miss losing this symbol (enemy targeting). */
export function symbolValue(s: SymbolId): number {
  // Bolts are worth ~2 shield-piercing damage, swords 1 blockable (playtest ITERATION_1).
  return s === 'bolt' ? 3 : s === 'sword' ? 2 : s === 'shield' ? 1 : 0;
}

export function stripCounts(reel: Reel): StripCounts {
  const out: StripCounts = {};
  for (const c of reel.cells) out[c.symbol] = (out[c.symbol] ?? 0) + 1;
  return out;
}

/**
 * Insert a cell without changing what's visible (junk lands off-screen and scrolls in later).
 * Returns the index it was inserted at.
 */
export function insertOffscreen(reel: Reel, cell: StripCell, rng: Rng): number {
  const len = reel.cells.length;
  // Positions strictly after the bottom visible row and before the top one keep the window
  // intact: inserting at p shifts indices >= p up by one, and stop follows.
  const candidates: number[] = [];
  for (let k = 2; k <= len - 1; k++) candidates.push(wrap(reel.stop + k, len));
  const p = candidates.length ? rng.pick(candidates) : len;
  const pos = p === 0 ? len : p;
  reel.cells.splice(pos, 0, cell);
  if (reel.stop >= pos) reel.stop++;
  return pos;
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
