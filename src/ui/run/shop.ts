import { LEGENDARY, RELICS } from '../../core/relics';
import { CHARM_COLOR } from '../../core/charms';
import { describeOption, rerollCost, type RunState, type ShopItem } from '../../core/run';
import { backOut, sineOut } from '../../present/ease';
import { ENH_SPRITE } from '../../present/reel';
import { COLORS, H, W } from '../../present/layout';
import { drawSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { drawRich } from '../keywords';
import { wrap, Hit, BUILD, CX, SHELF, TAG } from './shared';
import { EncounterScreen } from './encounter';

export abstract class ShopScreen extends EncounterScreen {
  /** Unaffordable purchase: shake its price tag. */
  deny(i: number): void {
    const h = this.shopTags[i];
    if (!h) return;
    void this.ui.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (h.lift = Math.sin(v * 30) * 6 * v) });
  }

  /** The Cashier: four priced slots, a reroll and a way out. */
  showShop(run: RunState, items: ShopItem[], reopen = false): void {
    this.run = run;
    this.shopItems = items;
    if (!reopen) this.open('shop');
    this.buttons = [
      this.minorBtn(`REROLL - ${rerollCost(run)}`, CX - 160, 574, 260, 50, () => this.cb.onReroll()),
      this.btn('LEAVE', CX + 160, 574, 260, 50, () => this.cb.onLeave()),
    ];
    // Two shelves: the counter (levels, max HP, the heal) and, behind the glass, the relics and THE BIG ONE.
    const premium = (it: ShopItem) => it.option.kind === 'relic';
    const rows = [items.filter((it) => !premium(it)), items.filter(premium)];
    this.shopHits = items.map((it, i) => {
      const row = premium(it) ? 1 : 0;
      const k = rows[row].indexOf(it);
      const n = rows[row].length;
      // The item itself: a click or tap pins its card open (hover shows it too); a second click on it buys, like the tag
      // under it (playtest: clicking the item never bought).
      const x = CX + (k - (n - 1) / 2) * SHELF.gap;
      const h = this.hit(x, SHELF.y[row] - 8, 128, 100, () => {
        if (this.shopSel === i) {
          if (this.mode === 'shop') this.cb.onBuy(i);
        } else this.shopSel = i;
      });
      h.scale = reopen ? 1 : 0;
      return h;
    });
    this.shopTags = items.map((_, i) => {
      const it = this.shopHits[i];
      // (Its size follows the item's entrance; its own scale is only the press bounce.)
      return { ...this.hit(it.x, it.y + 8 + TAG.y, TAG.w, TAG.h, () => this.mode === 'shop' && this.cb.onBuy(i)), scale: 1 };
    });
    if (!reopen) this.shopSel = -1;
    else if (this.shopItems[this.shopSel]?.sold) this.shopSel = -1;
    if (!reopen)
      this.shopHits.forEach(
        (c, i) =>
          void this.ui.wait(0.1 + i * 0.07).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.28, ease: backOut(2), onUpdate: (v) => (c.scale = v) })),
      );
  }

  /** Called after a purchase: bounce the chip counter and refresh the shelf. */
  bought(i?: number, item?: ShopItem): void {
    void this.ui.tween({ from: 1.6, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.chipPulse = v) });
    // What you bought hops in an arc into its spot on YOUR BUILD (relics to the grid, levels to LEVELS, the rest to your reels).
    const h = i !== undefined ? this.shopHits[i] : undefined;
    if (h && item) {
      const o = item.option;
      const sprite = (o.kind === 'relic' ? RELICS[o.relic].sprite : o.kind === 'gild' ? ENH_SPRITE[o.enh] : o.kind === 'charmLevel' ? ENH_SPRITE[o.enh] : o.kind === 'symLevel' ? o.symbol : o.kind === 'swap' ? o.to : o.kind === 'remove' ? o.symbol : 'heart') as SpriteId;
      const to =
        o.kind === 'relic' ? { x: BUILD.x + 40, y: BUILD.y + 600 } : o.kind === 'symLevel' || o.kind === 'charmLevel' ? { x: BUILD.x + 60, y: BUILD.y + 432 } : o.kind === 'gild' || o.kind === 'swap' || o.kind === 'remove' ? { x: BUILD.x + 140, y: BUILD.y + 240 } : { x: BUILD.x + 140, y: BUILD.y + 140 };
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
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(CX - 450, 20, 96, 96);
    drawSprite(ctx, 'cashierPortrait', CX - 402, 68 + Math.sin(time * 2) * 2, 3.5);
    drawText(ctx, 'THE CASHIER', CX - 330, 44, 4, COLORS.goldLight, { align: 'left' });
    const quips = ['PLACE YOUR BETS.', 'EVERYTHING HAS A PRICE, FRIEND.', 'THE HOUSE WILL HEAR ABOUT THIS.', 'CHIPS ARE FOR SPENDING... OR ARE THEY?'];
    drawText(ctx, quips[(run.depth + run.shopRerolls) % quips.length], CX - 330, 80, 2, COLORS.textDim, { align: 'left' });
    // (Fights heal in no act now: the old ACT 3 warning is gone. Playtest.)
    // THE BIG ONE (the draft/Cashier split, 2026-10-15): one legendary a visit, centre stage behind the glass.
    if (this.shopItems.some((it) => !it.sold && it.showcase)) drawText(ctx, 'THE BIG ONE IS IN THE CASE.', CX, 140, 2.5, COLORS.goldLight);
    this.drawShelves(ctx, time);
    this.shopItems.forEach((item, i) => this.drawShopItem(ctx, this.shopHits[i], item, time));
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    // What the item under the pointer is: name, rule and price, beside it.
    const live = (k: number) => this.shopHits[k]?.scale > 0.9 && !this.shopItems[k]?.sold;
    const hov = this.shopHits.findIndex((h, k) => (h.hover || this.shopTags[k]?.hover) && live(k));
    const i = hov >= 0 ? hov : live(this.shopSel) ? this.shopSel : -1;
    if (i >= 0) this.drawShopTip(ctx, this.shopHits[i], this.shopItems[i]);
  }

  /** Two wooden shelves; the lower one sits behind glass under a spotlight (the premium shelf). */
  protected drawShelves(ctx: CanvasRenderingContext2D, time: number): void {
    const x0 = CX - 440;
    const w = 880;
    // The shop's back wall: light wood boards behind both shelves.
    const wy = SHELF.y[0] - 84;
    const wh = SHELF.y[1] + 88 - wy;
    ctx.fillStyle = '#2a170c';
    ctx.fillRect(x0 - 16, wy - 4, w + 32, wh + 8);
    for (let k = 0, by = wy; by < wy + wh; k++, by += 28) {
      ctx.fillStyle = k % 2 ? '#b98a5a' : '#c49464';
      ctx.fillRect(x0 - 12, by, w + 24, Math.min(28, wy + wh - by));
      ctx.fillStyle = 'rgba(90,50,20,0.25)';
      ctx.fillRect(x0 - 12, by + 26, w + 24, 2);
      ctx.fillStyle = 'rgba(90,50,20,0.12)';
      for (let g = 0; g < 5; g++) ctx.fillRect(x0 + ((k * 131 + g * 197) % (w - 60)), by + 8 + (g % 3) * 6, 40 + (g * 23) % 50, 1);
    }
    // The glass case behind the relic shelf.
    const gy = SHELF.y[1] - 76;
    const g = ctx.createLinearGradient(0, gy, 0, gy + 150);
    g.addColorStop(0, 'rgba(255,224,138,0.10)');
    g.addColorStop(1, 'rgba(120,70,200,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, gy, w, 150);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let k = 0; k < 6; k++) {
      const sx = x0 + 40 + k * 160 + ((time * 30) % 160);
      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx + 24, gy);
      ctx.lineTo(sx - 36, gy + 150);
      ctx.lineTo(sx - 60, gy + 150);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,224,138,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 1, gy + 1, w - 2, 148);

    // The planks.
    for (const y of SHELF.y) {
      const py = y + 58;
      ctx.fillStyle = '#2a170c';
      ctx.fillRect(x0 - 4, py - 2, w + 8, 18);
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(x0, py, w, 12);
      ctx.fillStyle = '#a06636';
      ctx.fillRect(x0, py, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x0, py + 14, w, 6);
    }
  }

  /** The hovered item's card: its name, what it does, and the price. */
  protected drawShopTip(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem): void {
    const o = item.option;
    const { title, text } = describeOption(o, this.run ?? undefined);
    const lines = wrap(text, 26);
    const legend = o.kind === 'relic' && LEGENDARY.has(o.relic);
    const w = 340;
    const pinned = this.shopSel === this.shopHits.indexOf(h);
    const tall = 46 + lines.length * 20 + (pinned ? 22 : 0);
    // The top shelf opens its card above the item (a side card covered the neighbours' prices); the relic shelf, to the side.
    const top = h.y < (SHELF.y[0] + SHELF.y[1]) / 2;
    const right = h.x + h.w / 2 + 14 + w <= W - 8;
    const x = top ? Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, h.x - w / 2)) : right ? h.x + h.w / 2 + 14 : h.x - h.w / 2 - 14 - w;
    const y = top ? Math.max(8, h.y - h.h / 2 - tall - 14) : Math.max(8, Math.min(H - tall - 8, h.y - tall / 2));
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 4, y - 4, w + 8, tall + 8);
    ctx.fillStyle = legend ? '#ffd23f' : COLORS.gold;
    ctx.fillRect(x - 2, y - 2, w + 4, tall + 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, tall);
    const color = o.kind === 'gild' ? CHARM_COLOR[o.enh] : o.kind === 'relic' ? (legend ? '#ffd23f' : '#c9a0ff') : o.kind === 'symLevel' || o.kind === 'charmLevel' ? '#5ad8e8' : COLORS.goldLight;
    drawText(ctx, title, x + 12, y + 18, 2.5, color, { align: 'left' });
    lines.forEach((l, k) => drawRich(ctx, l, x + 12, y + 46 + k * 20, 2, COLORS.text, { align: 'left' }));
    if (pinned) drawText(ctx, (this.run?.player.chips ?? 0) >= item.price ? 'CLICK AGAIN TO BUY' : 'NOT ENOUGH CHIPS', x + 12, y + 46 + lines.length * 20 + 4, 1.5, COLORS.textDim, { align: 'left' });
  }

  /** One item on a shelf: just its picture and its chip price (hover it to read it). Relics sit on velvet. */
  protected drawShopItem(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem, time: number): void {
    if (!h || h.scale <= 0.01) return;
    const o = item.option;
    const afford = (this.run?.player.chips ?? 0) >= item.price;
    const relic = o.kind === 'relic';
    const legend = relic && LEGENDARY.has(o.relic);
    ctx.save();
    ctx.globalAlpha *= item.sold ? 0.3 : 1;
    ctx.translate(h.x, h.y + h.lift - (h.hover && !item.sold ? 6 : 0));
    ctx.scale(h.scale * (item.showcase ? 1.15 : 1), h.scale * (item.showcase ? 1.15 : 1));
    if (item.showcase && !item.sold) {
      // THE BIG ONE: a spotlight beam from the top of the case (soft, slow sway; no flash).
      const sway = Math.sin(time * 0.8) * 6;
      const beam = ctx.createLinearGradient(0, -62, 0, 44);
      beam.addColorStop(0, 'rgba(255,236,150,0.32)');
      beam.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-26 + sway, -62);
      ctx.lineTo(26 + sway, -62);
      ctx.lineTo(80, 40);
      ctx.lineTo(-80, 40);
      ctx.fill();
    }
    if (relic) {
      // Velvet cushion in a gold frame, under a spotlight; a legendary shimmers.
      const glow = ctx.createRadialGradient(0, -20, 4, 0, -20, 90);
      glow.addColorStop(0, legend ? 'rgba(255,210,63,0.45)' : 'rgba(201,160,255,0.30)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-90, -110, 180, 180);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(-52, -50, 104, 96);
      ctx.fillStyle = legend ? '#ffd23f' : COLORS.gold;
      ctx.fillRect(-49, -47, 98, 90);
      ctx.fillStyle = legend ? '#5a1838' : '#3a1530';
      ctx.fillRect(-45, -43, 90, 82);
      if (legend) {
        // One diagonal sheen sweeps the velvet every 2.5s (a pulse read as flicker).
        const k = (time % 2.5) / 0.6;
        if (k < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(-45, -43, 90, 82);
          ctx.clip();
          ctx.translate(-80 + k * 160, 0);
          ctx.rotate(0.5);
          ctx.fillStyle = 'rgba(255,236,150,0.2)';
          ctx.fillRect(-6, -90, 12, 180);
          ctx.restore();
        }
      }
    } else {
      // A soft shadow where it sits on the counter.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-36, 40, 72, 8);
    }
    if (h.hover && !item.sold && afford) {
      ctx.save();
      ctx.shadowColor = COLORS.energy;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = COLORS.energy;
      ctx.lineWidth = 3;
      ctx.strokeRect(-56, -54, 112, 104);
      ctx.restore();
    }
    const iy = -4;
    if (o.kind === 'relic') drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
    else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, ENH_SPRITE[o.enh], 0, iy, 4);
      drawText(ctx, `X${o.n}`, 40, iy + 24, 2.5, CHARM_COLOR[o.enh]);
    } else if (o.kind === 'symLevel' || o.kind === 'charmLevel') this.levelIcon(ctx, o, -10, iy, 3.6);
    else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, -34, iy, 2.6);
      drawSprite(ctx, 'arrowRight', 0, iy, 2.5);
      drawSprite(ctx, o.to as SpriteId, 34, iy, 2.6);
    } else if (o.kind === 'remove') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, 'minusBadge', 30, iy + 22, 3);
    } else drawSprite(ctx, 'heart', 0, iy, 5);
    // The ribbon sits on the case's top edge (above it, it met the upper shelf's name plates).
    if (legend) this.legendTag(ctx, 0, -48, time);
    ctx.restore();
    const tag = this.shopTags[this.shopHits.indexOf(h)];
    this.drawPriceTag(ctx, h, tag, item, afford, time);
    // Its name under the tag, always, on a dark plate (R13: the shelf was icons only until you hovered).
    if (!item.sold && tag && h.scale > 0.5) {
      const title = describeOption(o, this.run ?? undefined).title;
      const color = o.kind === 'gild' || o.kind === 'charmLevel' ? CHARM_COLOR[o.enh] : o.kind === 'symLevel' ? '#5ad8e8' : relic ? (legend ? '#ffd23f' : '#e0c0ff') : COLORS.text;
      // One line that fits the shelf spacing (the shelf is SHELF.gap wide per item).
      const max = Math.floor((SHELF.gap - 16) / 7.5);
      const text = title.length > max ? title.slice(0, max - 1) + '.' : title;
      const tw = text.length * 7.5 + 10;
      const ty = tag.y + TAG.h / 2 + 8;
      ctx.fillStyle = 'rgba(16,10,26,0.88)';
      ctx.fillRect(tag.x - tw / 2, ty - 7, tw, 14);
      drawText(ctx, text, tag.x, ty, 1.25, color);
    }
  }

  /** The price tag hanging off the shelf edge: a real tag (string, hole, notched end). Clicking it buys. */
  protected drawPriceTag(ctx: CanvasRenderingContext2D, item: Hit, tag: Hit | undefined, it: ShopItem, afford: boolean, time: number): void {
    if (!tag) return;
    const sold = it.sold;
    const hover = tag.hover && !sold;
    ctx.save();
    ctx.translate(tag.x + tag.lift, tag.y - (hover && afford ? 3 : 0));
    ctx.scale(item.scale * tag.scale, item.scale * tag.scale);
    // A tiny sway on its string.
    ctx.rotate(sold ? 0.12 : Math.sin(time * 1.6 + tag.x * 0.05) * 0.03);
    const w = TAG.w;
    const h = TAG.h;
    // The string up to the shelf.
    ctx.fillStyle = '#c9bba8';
    ctx.fillRect(-1, -h / 2 - 12, 2, 12);
    // Body: a dark rim, gold edge, green felt, with a notched left end.
    const shape = (inset: number) => {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 12 + inset, -h / 2 + inset);
      ctx.lineTo(w / 2 - inset, -h / 2 + inset);
      ctx.lineTo(w / 2 - inset, h / 2 - inset);
      ctx.lineTo(-w / 2 + 12 + inset, h / 2 - inset);
      ctx.lineTo(-w / 2 + inset, 0);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#3a2010';
    shape(-3);
    ctx.fillStyle = sold ? '#8a7e76' : hover ? COLORS.goldLight : COLORS.gold;
    shape(0);
    ctx.fillStyle = sold ? '#554a4c' : hover && afford ? '#2a7a4a' : '#1f5a3a';
    shape(3);
    // The punched hole the string goes through.
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(-w / 2 + 12, -3, 6, 6);
    if (sold) drawText(ctx, 'SOLD', 6, 1, 2.5, COLORS.text);
    else {
      drawSprite(ctx, 'chip', -10, 1, 2);
      drawText(ctx, String(it.price), 24, 1, 3, afford ? COLORS.goldLight : '#ff8a7a');
    }
    ctx.restore();
  }
}
