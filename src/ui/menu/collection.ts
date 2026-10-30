import type { Enh, RelicId } from '../../core/config';
import { RELICS } from '../../core/relics';
import { COLORS } from '../../present/layout';
import { drawPortrait, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import type { Button } from '../button';
import { drawCard, drawChip, drawMarquee, drawPanel, drawWell, KIT, T } from '../kit';
import type { Menus } from '../menus';
import { wrap } from '../runScreens';
import { CAST, CHARM_INFO, CHARM_ORDER, charmArt, charmWhere, RELIC_ORDER, relicTier, relicWhere, type Tier } from './data';
import { Lifts } from './lift';
import { drawPageArrow } from './widgets';
import type { TabBody } from './profile';

/**
 * PROFILE > COLLECTION: shelves of Charms, Relics and the casino town's cast. Tiles are kit cards (rarity frame, lift
 * and a one-time shine on hover); a locked one shows the item's dark silhouette, a tease of what's left. Pointing at
 * (or focusing) a tile shows it big in the detail panel on the right: icon, name, rule, where it turns up.
 */
type Shelf = 'charms' | 'relics' | 'enemies';

/** The grid (left) and the detail panel (right). */
const GX = 60;
const GY = 236;
/** Each shelf's grid: tile size, pitch, columns, rows a page, the art's pixel scale. */
const GRID: Record<Shelf, { tile: number; pitch: number; cols: number; rows: number; s: number }> = {
  charms: { tile: 120, pitch: 136, cols: 5, rows: 2, s: 6 },
  relics: { tile: 96, pitch: 108, cols: 7, rows: 4, s: 4 },
  enemies: { tile: 112, pitch: 126, cols: 6, rows: 3, s: 3 },
};
const DX = 868;
const DY = 162;
const DW = 352;
const DH = 536;
const SHELF_Y = 178;

/** One line under each shelf. */
const CAPTION: Record<Shelf, string> = {
  charms: 'A CHARM SITS ON ONE CELL OF YOUR REELS',
  relics: 'YOU KEEP A RELIC FOR THE WHOLE RUN',
  enemies: "THE CASINO TOWN'S CAST, AND HOW EACH ONE CHEATS",
};

interface Item {
  got: boolean;
  /** Draw the art centred at x/y at this pixel scale (black: the silhouette). */
  art: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, black: boolean) => void;
  name: string;
  text: string;
  where: string;
  tier?: Tier;
  boss?: boolean;
  tag: string;
}

/** The shelf the player last looked at (it survives a tab switch). */
let lastShelf: Shelf = 'charms';
const lastSel: Record<Shelf, number> = { charms: 0, relics: 0, enemies: 0 };
const lastPage: Record<Shelf, number> = { charms: 0, relics: 0, enemies: 0 };

export class CollectionTab implements TabBody {
  private shelf: Shelf = lastShelf;
  private tiles: Button[] = [];
  private items: Item[] = [];
  private keep: Button[] = [];
  private lifts = new Lifts();
  private arrows: Button[] = [];

  constructor(private m: Menus) {
    this.keep = [...m.buttons];
    this.build();
  }

  private get g() {
    return GRID[this.shelf];
  }

  private get sel(): number {
    return lastSel[this.shelf];
  }

  private set sel(i: number) {
    lastSel[this.shelf] = i;
  }

  private itemsOf(shelf: Shelf): Item[] {
    const p = this.m.profile();
    if (shelf === 'charms')
      return CHARM_ORDER.map((e: Enh) => {
        const [sym, enh] = charmArt(e);
        return {
          got: p.found.charms.includes(e),
          art: (ctx, x, y, s, black) => {
            // Locked: the symbol in shadow, the Charm's own shape solid over it.
            drawSprite(ctx, sym, x, y, s, black ? { variant: 'black', alpha: 0.45 } : {});
            drawSprite(ctx, enh, x, y, s, black ? { variant: 'black' } : {});
          },
          name: `${CHARM_INFO[e].name} CHARM`,
          text: CHARM_INFO[e].text,
          where: charmWhere(e),
          tag: 'CHARM',
        };
      });
    if (shelf === 'relics')
      return RELIC_ORDER.map((r: RelicId) => ({
        got: p.found.relics.includes(r),
        art: (ctx, x, y, s, black) => drawSprite(ctx, RELICS[r].sprite as SpriteId, x, y, s, black ? { variant: 'black' } : {}),
        name: RELICS[r].name,
        text: RELICS[r].text,
        where: relicWhere(r),
        tier: relicTier(r),
        tag: relicTier(r).toUpperCase(),
      }));
    // The cast: the profile doesn't record who you've met, so the whole town is on show.
    return CAST.map((c) => ({
      got: true,
      art: (ctx, x, y, s, black) => drawPortrait(ctx, c.portrait, x, y, (s * 32) / 24, black ? { variant: 'black' } : {}),
      name: c.name,
      text: c.trick,
      where: c.where,
      boss: c.boss,
      tag: c.boss ? 'BOSS' : 'REGULAR',
    }));
  }

  private pages(): number {
    return Math.max(1, Math.ceil(this.items.length / (this.g.cols * this.g.rows)));
  }

  private build(): void {
    const m = this.m;
    m.clearButtons(this.keep);
    lastShelf = this.shelf;
    this.items = this.itemsOf(this.shelf);
    const p = m.profile();
    // The shelves: a button each, with its count.
    const nc = p.found.charms.filter((c) => CHARM_ORDER.includes(c)).length;
    const nr = p.found.relics.filter((r) => RELIC_ORDER.includes(r)).length;
    const shelves: [Shelf, string][] = [
      ['charms', `CHARMS ${nc}/${CHARM_ORDER.length}`],
      ['relics', `RELICS ${nr}/${RELIC_ORDER.length}`],
      ['enemies', `ENEMIES ${CAST.length}`],
    ];
    let x = GX;
    shelves.forEach(([id, label]) => {
      const w = label.length * 12 + 36;
      const b = m.btn(label, x + w / 2, SHELF_Y, w, 40, () => this.pick(id), T.body);
      b.toggled = id === this.shelf;
      x += w + 12;
    });
    // Pages (the relics need two).
    const pages = this.pages();
    const page = Math.min(lastPage[this.shelf], pages - 1);
    lastPage[this.shelf] = page;
    if (pages > 1) {
      const right = GX + this.g.cols * this.g.pitch - (this.g.pitch - this.g.tile);
      const prev = m.btn('', right - 150, SHELF_Y, 44, 40, () => this.turn(-1), T.body);
      const next = m.btn('', right - 22, SHELF_Y, 44, 40, () => this.turn(1), T.body);
      prev.enabled = page > 0;
      next.enabled = page < pages - 1;
      this.arrows = [prev, next];
    } else this.arrows = [];
    const per = this.g.cols * this.g.rows;
    this.tiles = this.items.slice(page * per, (page + 1) * per).map((_, k) => {
      const i = page * per + k;
      const { x, y } = this.tileAt(k);
      return m.hit(x, y, this.g.tile, this.g.tile, () => {
        this.sel = i;
        m.sounds.click();
      });
    });
    if (this.sel < page * per || this.sel >= (page + 1) * per) this.sel = page * per;
    this.lifts.clear();
    m.pointerMove(m.mouse.x, m.mouse.y);
  }

  private tileAt(k: number): { x: number; y: number } {
    return { x: GX + (k % this.g.cols) * this.g.pitch + this.g.tile / 2, y: GY + Math.floor(k / this.g.cols) * this.g.pitch + this.g.tile / 2 };
  }

  private pick(s: Shelf): void {
    if (s === this.shelf) return;
    this.shelf = s;
    this.build();
  }

  private turn(d: number): void {
    lastPage[this.shelf] = Math.max(0, Math.min(this.pages() - 1, lastPage[this.shelf] + d));
    this.sel = lastPage[this.shelf] * this.g.cols * this.g.rows;
    this.build();
  }

  update(dt: number): void {
    this.lifts.update(dt, this.tiles);
    // Pointing at (or focusing) a tile reads it.
    const per = this.g.cols * this.g.rows;
    const k = this.tiles.findIndex((b) => b.hover);
    if (k >= 0) this.sel = lastPage[this.shelf] * per + k;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const page = lastPage[this.shelf];
    const pages = this.pages();
    if (pages > 1) {
      const right = GX + this.g.cols * this.g.pitch - (this.g.pitch - this.g.tile);
      drawText(ctx, `${page + 1}/${pages}`, right - 86, SHELF_Y + 1, T.body, COLORS.textDim);
    }
    const per = this.g.cols * this.g.rows;
    this.tiles.forEach((b, k) => this.drawTile(ctx, b, this.items[page * per + k], page * per + k === this.sel));
    this.drawDetail(ctx, t);
    drawText(ctx, CAPTION[this.shelf], GX, 680, T.small, COLORS.textDim, { align: 'left' });
  }

  drawOver(ctx: CanvasRenderingContext2D): void {
    this.arrows.forEach((b, i) => drawPageArrow(ctx, b, i === 0));
  }

  private drawTile(ctx: CanvasRenderingContext2D, b: Button, it: Item, selected: boolean): void {
    const x = b.x - this.g.tile / 2;
    const y = b.y - this.g.tile / 2;
    const lift = this.lifts.lift(b);
    const big = this.shelf === 'enemies';
    if (!it.got) {
      // Locked: a dim frame over a lighter well, the item's silhouette in it.
      const yy = Math.round(y - 4 * lift);
      drawPanel(ctx, x, yy, this.g.tile, this.g.tile, { frame: lift > 0.5 || selected ? KIT.frame : KIT.frameDim, fill: COLORS.panelLight });
      it.art(ctx, b.x, yy + this.g.tile / 2, this.g.s, true);
      return;
    }
    const frame = it.boss ? 'legendary' : (it.tier ?? 'common');
    const yy = drawCard(ctx, x, y, this.g.tile, this.g.tile, { rarity: frame, lift: Math.max(lift, selected ? 0.6 : 0), shineT: this.lifts.shine(b) });
    if (big) {
      // Portraits fill their frame (a bust, cut by the card's bottom edge).
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 3, yy + 3, this.g.tile - 6, this.g.tile - 6);
      ctx.clip();
      ctx.fillStyle = it.boss ? '#3a1428' : COLORS.panelLight;
      ctx.fillRect(x + 3, yy + 3, this.g.tile - 6, this.g.tile - 6);
      it.art(ctx, b.x, yy + this.g.tile / 2 + 6, this.g.s, false);
      ctx.restore();
    } else it.art(ctx, b.x, yy + this.g.tile / 2, this.g.s, false);
  }

  private drawDetail(ctx: CanvasRenderingContext2D, t: number): void {
    const it = this.items[this.sel];
    if (!it) return;
    const cx = DX + DW / 2;
    if (it.boss) drawMarquee(ctx, DX, DY, DW, DH, this.m.reduced() ? 0 : t, { fill: KIT.fill, frame: '#a8202a' });
    else drawPanel(ctx, DX, DY, DW, DH);
    // The big icon in a well.
    const ws = 176;
    drawWell(ctx, cx - ws / 2, DY + 24, ws, ws, it.got ? COLORS.panelLight : '#2c2140');
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - ws / 2 + 2, DY + 26, ws - 4, ws - 4);
    ctx.clip();
    const cast = this.shelf === 'enemies';
    it.art(ctx, cx, DY + 24 + ws / 2 + (cast ? 10 : 0), cast ? 5 : it.got ? 10 : 8, !it.got);
    ctx.restore();
    const tagColor = it.boss ? '#ff6a5a' : it.tier ? KIT.rarity[it.tier] : KIT.title;
    drawChip(ctx, it.tag, cx, DY + 232, { scale: T.small, color: tagColor });
    let y = DY + 280;
    if (!it.got) drawText(ctx, 'NOT FOUND YET', cx, y, T.head, COLORS.textDim);
    else {
      const nameLines = wrap(it.name, 18).slice(0, 2);
      nameLines.forEach((l, k) => drawText(ctx, l, cx, y + k * 30, T.head, KIT.title));
      y += (nameLines.length - 1) * 30 + 46;
      wrap(it.text, 26)
        .slice(0, 5)
        .forEach((l, k) => drawText(ctx, l, cx, y + k * 24, T.body, COLORS.text));
    }
    // Where it turns up, pinned to the panel's foot.
    const where = wrap(it.where, 30).slice(0, 2);
    const fy = DY + DH - 30 - where.length * 22;
    ctx.fillStyle = KIT.frameDim;
    ctx.fillRect(DX + 24, fy - 26, DW - 48, 2);
    drawText(ctx, cast ? 'FOUND IN' : 'TURNS UP IN', cx, fy - 4, T.small, COLORS.textDim);
    where.forEach((l, k) => drawText(ctx, l, cx, fy + 20 + k * 22, T.small, COLORS.text));
  }
}
