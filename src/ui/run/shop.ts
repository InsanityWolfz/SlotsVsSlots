import { RELICS } from '../../core/relics';
import { rerollCost, type RunState, type ShopItem } from '../../core/run';
import { backOut, sineOut } from '../../present/ease';
import { ENH_SPRITE } from '../../present/reel';
import { COLORS, W } from '../../present/layout';
import { drawPortrait, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import { drawRich } from '../keywords';
import { drawCard, drawChip, drawPanel, drawTitle, drawWell, KIT, T } from '../kit';
import { wrap, Hit, BUILD, CX, spotlight } from './shared';
import { cardFace, rarityOf } from './cardText';
import { EncounterScreen } from './encounter';

/** THE CASHIER: the shelves' rows (the counter goods, then the relics behind the glass), the spacing, an item card. */
const SHELF = { y: [232, 446], gap: 168 };
const ITEM = { w: 124, h: 100 };
/** The wall behind the shelves (wood, scenery). */
const WALL = { x: 330, w: 932, y: 150, h: 418 };

export abstract class ShopScreen extends EncounterScreen {
  /** Unaffordable purchase: shake its price tag. */
  deny(i: number): void {
    const h = this.shopTags[i];
    if (!h) return;
    void this.ui.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (h.lift = Math.sin(v * 30) * 6 * v) });
  }

  /** The Cashier: the goods on two shelves, a reroll and a way out. */
  showShop(run: RunState, items: ShopItem[], reopen = false): void {
    this.run = run;
    this.shopItems = items;
    if (!reopen) this.open('shop');
    this.buttons = [
      this.minorBtn(`REROLL - ${rerollCost(run)}`, CX - 170, 640, 280, 52, () => this.cb.onReroll()),
      this.btn('LEAVE', CX + 170, 640, 280, 56, () => this.cb.onLeave()),
    ];
    // Two shelves: the counter (levels, max HP, the heal) and, behind the glass, the relics and THE BIG ONE.
    const premium = (it: ShopItem) => it.option.kind === 'relic';
    const rows = [items.filter((it) => !premium(it)), items.filter(premium)];
    this.shopHits = items.map((it, i) => {
      const row = premium(it) ? 1 : 0;
      const k = rows[row].indexOf(it);
      const n = rows[row].length;
      // The item: a click or tap pins its card open (hover shows it too); a second click buys, like its price tag.
      const x = CX + (k - (n - 1) / 2) * SHELF.gap;
      const h = this.hit(x, SHELF.y[row] - 20, ITEM.w, ITEM.h, () => {
        if (this.shopSel === i) {
          if (this.mode === 'shop') this.cb.onBuy(i);
        } else this.shopSel = i;
      });
      h.scale = reopen ? 1 : 0;
      return h;
    });
    this.shopTags = items.map((_, i) => {
      const it = this.shopHits[i];
      return { ...this.hit(it.x, it.y + ITEM.h / 2 + 24, 108, 38, () => this.mode === 'shop' && this.cb.onBuy(i)), scale: 1 };
    });
    if (!reopen) this.shopSel = -1;
    else if (this.shopItems[this.shopSel]?.sold) this.shopSel = -1;
    if (!reopen)
      this.shopHits.forEach(
        (c, i) =>
          void this.ui.wait(0.12 + i * 0.07).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.26, ease: backOut(2), onUpdate: (v) => (c.scale = v) })),
      );
  }

  /** Called after a purchase: bounce the chip counter and refresh the shelf. */
  bought(i?: number, item?: ShopItem): void {
    void this.ui.tween({ from: 1.6, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.chipPulse = v) });
    // What you bought hops in an arc into its slot on YOUR BUILD (relics to their wells, Charms and levels to theirs).
    const h = i !== undefined ? this.shopHits[i] : undefined;
    if (h && item && this.run) {
      const o = item.option;
      const sprite = (o.kind === 'relic' ? RELICS[o.relic].sprite : o.kind === 'gild' ? ENH_SPRITE[o.enh] : o.kind === 'charmLevel' ? ENH_SPRITE[o.enh] : o.kind === 'symLevel' ? o.symbol : o.kind === 'swap' ? o.to : o.kind === 'remove' ? o.symbol : 'heart') as SpriteId;
      const n = Math.max(0, this.run.player.relics.length - 1);
      const to =
        o.kind === 'relic'
          ? { x: BUILD.x + 33 + (n % 6) * 46, y: BUILD.y + 562 + Math.floor(Math.min(n, 17) / 6) * 44 }
          : o.kind === 'symLevel'
            ? { x: BUILD.x + 60, y: BUILD.y + 420 }
            : o.kind === 'gild' || o.kind === 'charmLevel'
              ? { x: BUILD.x + 60, y: BUILD.y + 480 }
              : o.kind === 'swap' || o.kind === 'remove'
                ? { x: BUILD.x + 140, y: BUILD.y + 260 }
                : { x: BUILD.x + 140, y: BUILD.y + 154 };
      const f = { sprite, x0: h.x, y0: h.y, x1: to.x, y1: to.y, t: 0 };
      this.flyers.push(f);
      void this.ui.tween({ from: 0, to: 1, dur: 0.35, ease: sineOut, onUpdate: (v) => (f.t = v) }).then(() => {
        this.flyers = this.flyers.filter((x) => x !== f);
      });
    }
    if (this.run) this.showShop(this.run, this.shopItems, true);
  }

  protected drawShop(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    // The Cashier himself, in a lit well (drawPortrait: his 32x32 art and the old 24x24 fill the same box).
    drawWell(ctx, 334, 18, 116, 116, '#1c1530');
    spotlight(ctx, 392, 118, 96, '#5ad8e8', 0.12, [336, 20, 112, 112]);
    drawPortrait(ctx, 'cashierPortrait', 392, 76 + (this.reduceMotion ? 0 : Math.round(Math.sin(time * 2) * 2)), 4);
    drawTitle(ctx, 'THE CASHIER', 474, 46, KIT.title, { align: 'left' });
    // What he says, in a speech panel.
    const quips = ['PLACE YOUR BETS.', 'EVERYTHING HAS A PRICE, FRIEND.', 'THE HOUSE WILL HEAR ABOUT THIS.', 'CHIPS ARE FOR SPENDING... OR ARE THEY?'];
    // THE BIG ONE (one legendary a visit, in the case): he says so.
    const quip = this.shopItems.some((it) => !it.sold && it.showcase) ? 'THE BIG ONE IS IN THE CASE.' : quips[(run.depth + run.shopRerolls) % quips.length];
    const qw = textWidth(quip, T.body) + 32;
    drawPanel(ctx, 474, 76, qw, 40, { frame: KIT.frameDim });
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(464, 90, 10, 12);
    ctx.fillStyle = KIT.frameDim;
    ctx.fillRect(466, 92, 10, 8);
    drawText(ctx, quip, 474 + 16, 97, T.body, KIT.text, { align: 'left' });
    this.drawShelves(ctx, time);
    this.shopItems.forEach((item, i) => this.drawShopItem(ctx, this.shopHits[i], item, time));
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    // What the item under the pointer (or pinned) is: name, rule and price, beside it.
    const live = (k: number) => this.shopHits[k]?.scale > 0.9 && !this.shopItems[k]?.sold;
    const hov = this.shopHits.findIndex((h, k) => (h.hover || this.shopTags[k]?.hover) && live(k));
    const i = hov >= 0 ? hov : live(this.shopSel) ? this.shopSel : -1;
    if (i >= 0) this.drawShopTip(ctx, this.shopHits[i], this.shopItems[i]);
  }

  /** Scenery: the wood back wall, two shelves, the glass case on the lower one (its sheen sweeps slowly). */
  protected drawShelves(ctx: CanvasRenderingContext2D, time: number): void {
    const { x, w, y, h } = WALL;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    for (let k = 0, by = y; by < y + h; k++, by += 24) {
      ctx.fillStyle = k % 2 ? '#5a3418' : '#64391b';
      ctx.fillRect(x, by, w, Math.min(24, y + h - by));
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(x, by + 22, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let g = 0; g < 6; g++) ctx.fillRect(x + ((k * 131 + g * 197) % (w - 60)), by + 6 + (g % 3) * 5, 30 + ((g * 23) % 50), 2);
    }
    // The glass case behind the relic shelf: a frame, a cool tint and slow pixel sheen bands.
    const gy = SHELF.y[1] - 96;
    const gh = 168;
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(x + 12, gy - 4, w - 24, gh + 8);
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(x + 16, gy, w - 32, gh);
    ctx.fillStyle = 'rgba(160,200,255,0.06)';
    ctx.fillRect(x + 16, gy, w - 32, gh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 16, gy, w - 32, gh);
    ctx.clip();
    ctx.fillStyle = 'rgba(220,240,255,0.07)';
    const sweep = this.reduceMotion ? 0 : (time * 26) % 220;
    for (let k = -1; k < 6; k++)
      for (let r = 0; r < gh; r += 2) ctx.fillRect(Math.round(x + 40 + k * 220 + sweep + r * 0.4), gy + r, 16, 2);
    ctx.restore();
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + 12, gy - 4, w - 24, 2);
    // The planks.
    for (const sy of SHELF.y) {
      const py = sy + 34;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x + 4, py - 2, w - 8, 18);
      ctx.fillStyle = '#8a5a2e';
      ctx.fillRect(x + 6, py, w - 12, 12);
      ctx.fillStyle = '#b07a42';
      ctx.fillRect(x + 6, py, w - 12, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 6, py + 14, w - 12, 6);
    }
  }

  /** The pinned or hovered item: its name, its full rule and the price, in a kit panel beside it. */
  protected drawShopTip(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem): void {
    const o = item.option;
    const face = cardFace(o, this.run ?? undefined);
    const w = 340;
    const lines = wrap(face.full, Math.floor((w - 28) / (6 * T.body)));
    const pinned = this.shopSel === this.shopHits.indexOf(h);
    const tall = 58 + lines.length * 24 + (pinned ? 26 : 0);
    const right = h.x + h.w / 2 + 18 + w <= W - 8;
    const x = Math.round(right ? h.x + h.w / 2 + 18 : h.x - h.w / 2 - 18 - w);
    const y = Math.round(Math.max(8, Math.min(600 - tall, h.y - tall / 2)));
    drawPanel(ctx, x, y, w, tall, { frame: rarityOf(o) === 'common' ? KIT.frame : KIT.rarity[rarityOf(o)] });
    drawText(ctx, face.title, x + 14, y + 22, textWidth(face.title, T.head) <= w - 28 ? T.head : T.body, this.optionColor(o), { align: 'left' });
    lines.forEach((l, k) => drawRich(ctx, l, x + 14, y + 54 + k * 24, T.body, KIT.text, { align: 'left' }));
    if (pinned) drawText(ctx, (this.run?.player.chips ?? 0) >= item.price ? 'TAP AGAIN TO BUY' : 'NOT ENOUGH CHIPS', x + 14, y + 54 + lines.length * 24 + 4, T.small, KIT.dim, { align: 'left' });
  }

  /** One item on a shelf: a kit card with its picture, its price tag (a chip: clicking it buys) and its name. */
  protected drawShopItem(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem, time: number): void {
    if (!h || h.scale <= 0.01) return;
    const o = item.option;
    const afford = (this.run?.player.chips ?? 0) >= item.price;
    const tag = this.shopTags[this.shopHits.indexOf(h)];
    const sel = this.shopSel === this.shopHits.indexOf(h);
    const big = !!item.showcase;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);
    ctx.translate(-h.x, -h.y);
    if (big && !item.sold) spotlight(ctx, h.x, h.y + ITEM.h / 2 + 4, 200, '#ffe08a', 0.18);
    ctx.save();
    if (item.sold) ctx.globalAlpha *= 0.35;
    const lift = item.sold ? 0 : h.hover || sel ? 1 : 0;
    const w = big ? ITEM.w + 16 : ITEM.w;
    const hh = big ? ITEM.h + 12 : ITEM.h;
    const y0 = drawCard(ctx, h.x - w / 2, h.y - hh / 2, w, hh, { rarity: rarityOf(o), lift, shineT: big ? (time % 3) - 1 : undefined });
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(h.x - w / 2 + 3, y0 + 3, w - 6, hh - 6);
    this.optionIcon(ctx, o, h.x, y0 + hh / 2, o.kind === 'swap' ? 2.6 : o.kind === 'symLevel' || o.kind === 'charmLevel' ? 3 : 4);
    ctx.restore();
    // The price tag: a kit chip (the chip coin, the price; red when you can't pay; SOLD once bought).
    if (tag) {
      const ty = tag.y - (tag.hover && afford && !item.sold ? 2 : 0);
      drawChip(ctx, item.sold ? 'SOLD' : String(item.price), tag.x + tag.lift, ty, {
        scale: T.head,
        color: item.sold ? KIT.dim : afford ? KIT.title : '#ff8a7a',
        fill: tag.hover && !item.sold ? '#3a2a14' : KIT.fillLight,
        icon: item.sold ? undefined : (ix, iy) => drawSprite(ctx, 'chip', ix, iy, 2),
        iconW: 24,
      });
      // Its name under the tag, always (R13: the shelf was icons only until you hovered), two lines at most.
      if (!item.sold) {
        const title = cardFace(o, this.run ?? undefined).title;
        wrap(title, Math.floor((SHELF.gap - 12) / (6 * T.small)))
          .slice(0, 2)
          .forEach((l, k) => drawText(ctx, l, tag.x, tag.y + 32 + k * 16, T.small, this.optionColor(o)));
      }
    }
    ctx.restore();
  }
}
