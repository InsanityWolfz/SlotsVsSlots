import { charmLevel, charmTag, CHARM_COLOR, LEVEL_CAP, symLevel } from '../core/charms';
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

const ORDER: string[] = ['sword', 'ace', 'shield', 'bolt', 'goldbar', 'thorn', 'wild', 'rock', 'slime', 'card', 'stolen', 'bombs'];
const rank = (r: TableRow) => {
  const i = ORDER.indexOf(r.symbol);
  return (i < 0 ? 50 : i) * 10 + (r.enh ? 1 + ['gold', 'keen', 'vamp', 'charged', 'lucky', 'blaze', 'spiked', 'thorny', 'lucre', 'trick'].indexOf(r.enh) : 0);
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
  /** The level cap (MAX shows at it); the base game's by default. */
  cap?: number;
  header?: boolean;
  /** false: no level badges under the table (YOUR BUILD has its own LEVELS pane). */
  badges?: boolean;
  /** Total height available (header + rows + LV line): rows shrink to fit instead of spilling (EXPERT_PLAYTEST_3 B2). */
  maxH?: number;
}

/** Draw the table with its top-left at (x, y). Returns the height used. */
export function drawReelTable(ctx: CanvasRenderingContext2D, x: number, y: number, cols: TableRow[][], opts: TableOpts): number {
  let o = opts;
  if (opts.maxH) {
    const head = opts.header !== false ? 22 : 0;
    const lvLine = opts.levels ? levelBadges(opts.levels, cols).length ? 20 * Math.ceil((levelBadges(opts.levels, cols).length * BADGE_W) / (opts.colW * cols.length)) : 0 : 0;
    const most = Math.max(1, ...cols.map((r) => Math.min(r.length, opts.maxRows ?? r.length)));
    const fit = Math.floor((opts.maxH - head - lvLine) / most);
    if (fit < opts.rowH) {
      const k = Math.max(0.55, fit / opts.rowH);
      o = { ...opts, rowH: Math.max(10, fit), scale: opts.scale * k, text: Math.max(1, (opts.text ?? 2) * Math.max(0.7, k)) };
    }
  }
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
  // Levels: symbols above 1, and every charm type you own (LV1 too), so a level card's effect shows; MAX at the cap.
  if (o.levels && o.badges !== false) {
    const badges = levelBadges(o.levels, cols);
    const cap = o.cap ?? LEVEL_CAP;
    const width = o.colW * cols.length;
    let lx = x;
    let ly = top + maxH + 12;
    for (const b of badges) {
      if (lx + BADGE_W > x + width + 4) {
        lx = x;
        ly += 20;
        maxH += 20;
      }
      drawSprite(ctx, b.symbol as SpriteId, lx + 6, ly, 0.75);
      if (b.enh) drawSprite(ctx, ENH_SPRITE[b.enh], lx + 6, ly, 0.75);
      const max = b.level >= cap;
      drawText(ctx, max ? 'MAX' : `LV${b.level}`, lx + 14, ly, 1.25, max ? '#ff9a3a' : b.enh ? CHARM_COLOR[b.enh] : COLORS.goldLight, { align: 'left' });
      lx += BADGE_W;
    }
    if (badges.length) maxH += 20;
  }
  return top - y + maxH;
}

const BADGE_W = 52;

/** The level badges under a table: symbols above level 1, then each charm type on the reels. */
function levelBadges(levels: Levels, cols: TableRow[][]): { symbol: SymbolId; enh?: Enh; level: number }[] {
  const out: { symbol: SymbolId; enh?: Enh; level: number }[] = [];
  for (const s of Object.keys(levels.sym) as SymbolId[]) if (symLevel(levels, s) > 1) out.push({ symbol: s, level: symLevel(levels, s) });
  const seen = new Set<Enh>();
  for (const row of cols.flat())
    if (row.enh && !seen.has(row.enh)) {
      seen.add(row.enh);
      out.push({ symbol: row.symbol as SymbolId, enh: row.enh, level: charmLevel(levels, row.enh) });
    }
  return out;
}
