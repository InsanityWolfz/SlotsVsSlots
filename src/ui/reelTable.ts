import { charmLevel, charmTag, CHARM_COLOR, symLevel } from '../core/charms';
import type { Enh, Levels, SymbolId } from '../core/config';
import type { RunPlayer } from '../core/run';
import { ENH_SPRITE, type CellView } from '../present/reel';
import { COLORS } from '../present/layout';
import { artId, drawSprite, hasSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';

/**
 * ONE reel table everywhere (the fight's left panel, draft, shop, run over): columns 1 2 3 like the
 * machine, one row per symbol + charm with a count. Fight rows also count what enemies did to the
 * strips (slimed, stolen, marked cells, bombs).
 */
export interface TableRow {
  symbol: SymbolId | 'stolen' | 'bombs';
  enh?: Enh;
  n: number;
}

const ORDER: string[] = ['sword', 'shield', 'bolt', 'goldbar', 'thorn', 'wild', 'rock', 'slime', 'card', 'stolen', 'bombs'];
const rank = (r: TableRow) => {
  const i = ORDER.indexOf(r.symbol);
  return (i < 0 ? 50 : i) * 10 + (r.enh ? 1 + ['gold', 'keen', 'vamp', 'charged', 'lucky', 'blaze', 'spiked'].indexOf(r.enh) : 0);
};

/** Rows for the run's machine: plain cells, then charmed cells, per symbol. */
export function runTable(p: RunPlayer): TableRow[][] {
  return p.strips.map((s, reel) => {
    const rows: TableRow[] = [];
    for (const [sym, n] of Object.entries(s) as [SymbolId, number][]) {
      if (!n) continue;
      const charms = p.gilded.filter((g) => g.reel === reel && g.symbol === sym);
      const charmed = charms.reduce((a, g) => a + g.n, 0);
      if (n - charmed > 0) rows.push({ symbol: sym, n: n - charmed });
      for (const g of charms) rows.push({ symbol: sym, enh: g.enh, n: g.n });
    }
    return rows.sort((a, b) => rank(a) - rank(b));
  });
}

/** Rows for a live machine in a fight (display cells), including enemy damage. */
export function liveTable(reels: { cells: CellView[] }[], hide: ReadonlySet<SymbolId>): TableRow[][] {
  return reels.map((reel) => {
    const map = new Map<string, TableRow>();
    const add = (r: TableRow, k = 1) => {
      const key = `${r.symbol}:${r.enh ?? ''}`;
      const cur = map.get(key);
      if (cur) cur.n += k;
      else map.set(key, { ...r, n: k });
    };
    for (const c of reel.cells) {
      if (hide.has(c.symbol)) continue;
      if ((c.stolen ?? 0) >= 1) add({ symbol: 'stolen', n: 1 });
      else if (c.carded) add({ symbol: 'card', n: 1 });
      else if (c.slimed) add({ symbol: 'slime', n: 1 });
      else add({ symbol: c.symbol, ...(c.enh ? { enh: c.enh } : {}), n: 1 });
      if (c.bomb && c.bomb > 0) add({ symbol: 'bombs', n: 1 });
    }
    return [...map.values()].sort((a, b) => rank(a) - rank(b));
  });
}

export interface TableOpts {
  colW: number;
  rowH: number;
  /** Sprite scale (16px art). */
  scale: number;
  /** Count text scale. */
  text?: number;
  /** Rows shown per column before it summarises the rest. */
  maxRows?: number;
  /** Charm tags shown at these levels (X2, +5...), and symbol levels as a small LV badge. */
  levels?: Levels;
  ticket?: boolean;
  header?: boolean;
}

/** Draw the table with its top-left at (x, y). Returns the height used. */
export function drawReelTable(ctx: CanvasRenderingContext2D, x: number, y: number, cols: TableRow[][], o: TableOpts): number {
  const ts = o.text ?? 2;
  let top = y;
  if (o.header !== false) {
    cols.forEach((_, r) => drawText(ctx, `${r + 1}`, x + r * o.colW + o.colW / 2, y + 8, ts, COLORS.goldLight));
    top += 22;
  }
  let maxH = 0;
  cols.forEach((rows, r) => {
    const cx = x + r * o.colW;
    const shown = o.maxRows && rows.length > o.maxRows ? rows.slice(0, o.maxRows - 1) : rows;
    shown.forEach((row, k) => {
      const ry = top + k * o.rowH + o.rowH / 2;
      const ix = cx + 8 * o.scale + 2;
      if (row.symbol === 'stolen') {
        ctx.strokeStyle = 'rgba(180,160,220,0.6)';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(ix - 6 * o.scale, ry - 6 * o.scale, 12 * o.scale, 12 * o.scale);
        ctx.setLineDash([]);
      } else if (row.symbol === 'bombs') drawSprite(ctx, artId('bombOverlay'), ix, ry, o.scale);
      else {
        drawSprite(ctx, row.symbol as SpriteId, ix, ry, o.scale);
        if (row.enh) drawSprite(ctx, ENH_SPRITE[row.enh], ix, ry, o.scale);
        if (row.symbol === 'card' && hasSprite('card')) drawSprite(ctx, artId('card'), ix, ry, o.scale * 0.9);
      }
      const bad = row.symbol === 'slime' || row.symbol === 'stolen' || row.symbol === 'card' || row.symbol === 'bombs' || row.symbol === 'rock';
      const color = bad ? '#ff8a7a' : row.enh ? CHARM_COLOR[row.enh] : COLORS.text;
      drawText(ctx, `${row.n}`, ix + 8 * o.scale + 3, ry, ts, color, { align: 'left' });
      // Charm tag at its level (X2, +5...) for wide tables.
      if (row.enh && o.levels && o.colW >= 90) drawText(ctx, charmTag(row.enh, charmLevel(o.levels, row.enh, o.ticket)), ix + 8 * o.scale + 3 + ts * 6 * `${row.n}`.length + 8, ry, Math.max(1, ts - 0.5), color, { align: 'left' });
    });
    if (shown.length < rows.length) {
      const rest = rows.slice(shown.length).reduce((a, x) => a + x.n, 0);
      drawText(ctx, `+${rest}`, cx + o.colW / 2, top + shown.length * o.rowH + o.rowH / 2, ts, COLORS.textDim);
    }
    maxH = Math.max(maxH, (shown.length + (shown.length < rows.length ? 1 : 0)) * o.rowH);
  });
  // Symbol levels (only the ones above 1).
  if (o.levels) {
    const lv = (Object.keys(o.levels.sym) as SymbolId[]).filter((s) => symLevel(o.levels, s) > 1);
    let lx = x;
    const ly = top + maxH + 12;
    for (const s of lv) {
      drawSprite(ctx, s as SpriteId, lx + 6, ly, 0.75);
      drawText(ctx, `LV${symLevel(o.levels, s)}`, lx + 14, ly, 1, COLORS.goldLight, { align: 'left' });
      lx += 44;
    }
    if (lv.length) maxH += 20;
  }
  return top - y + maxH;
}
