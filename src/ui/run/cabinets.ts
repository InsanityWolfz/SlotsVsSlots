import { CABINETS, CABINET_ORDER, type CabinetId } from '../../core/cabinets';
import { STAKE, STAKES, stakeOf } from '../../core/stakes';
import { backOut, sineOut } from '../../present/ease';
import { COLORS, W } from '../../present/layout';
import { drawSprite, type SpriteId } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import { drawCard, drawChip, drawPanel, drawTitle, drawWell, KIT, T } from '../kit';
import { heroSprite } from '../menus';
import { wrap, stakeDisc, spotlight, bigPortrait, type Btn } from './shared';
import { BuildPanel } from './build';
import { demo, IN_FULL_GAME, openStore, STORE_URL } from '../../demo';

/** CHOOSE YOUR MACHINE: the stage (the selected machine big), the row of machines, the stake chips. */
const STAGE = { x: 150, y: 88, w: 980, h: 316 };
const THUMB = { y: 476, w: 104, h: 96, gap: 128 };
const STAKE_ROW = { y: 604, gap: 14 };

export abstract class CabinetScreen extends BuildPanel {
  /** The machine on the stage, the direction it slid in from, and how far it is in (0..1). */
  protected cabSel = 0;
  protected cabDir = 1;
  protected cabIn = 1;
  protected playBtn: Btn | null = null;

  /** Pick your starting machine (pre-run). Locked machines show as silhouettes with how to unlock them. */
  showCabinets(unlocked: Set<CabinetId>, stakes: Partial<Record<CabinetId, number>> = {}, stakeSel = 0, _act3 = false, _dealerBeaten: CabinetId[] = []): void {
    this.cabinetUnlocked = unlocked;
    this.stakes = stakes;
    this.run = null;
    this.open('cabinet');
    this.stakeSel = Math.min(stakeSel, this.maxStake());
    if (!this.cabinetUnlocked.has(CABINET_ORDER[this.cabSel])) this.cabSel = 0;
    // HIGH STAKES: a row of 6 chips, always shown (new players see the whole ladder, locked). Hovering or focusing one
    // previews its rule; clicking an earned one selects it.
    const pick = (level: number) => {
      if (level > this.ladderMax()) {
        this.sounds.fizzle();
        this.stakeDeny = { level, at: performance.now() };
        return;
      }
      if (level === this.stakeSel) return;
      this.stakeSel = level;
      this.stakePop = 0;
      void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.stakePop = v) });
      this.cb.onStake(this.stakeSel);
      this.syncPlay();
    };
    const widths = STAKES.map((s) => this.stakeChipW(s.name));
    const total = widths.reduce((a, b) => a + b, 0) + STAKE_ROW.gap * (STAKES.length - 1);
    let sx = W / 2 - total / 2;
    this.stakeHits = STAKES.map((s, i) => {
      const b = this.minorBtn('', sx + widths[i] / 2, STAKE_ROW.y, widths[i], 40, () => pick(s.level));
      b.ghost = true;
      sx += widths[i] + STAKE_ROW.gap;
      return b;
    });
    this.stakePop = 1;
    // MENU sits where the menus' BACK sits, in the same size and style.
    const menu = this.minorBtn('MENU', 100, 44, 140, 48, () => this.cb.onMenu());
    menu.textScale = T.body;
    const prev = this.minorBtn('', STAGE.x - 44, STAGE.y + STAGE.h / 2, 52, 96, () => this.stepCabinet(-1));
    const next = this.minorBtn('', STAGE.x + STAGE.w + 44, STAGE.y + STAGE.h / 2, 52, 96, () => this.stepCabinet(1));
    prev.icon = (c) => drawSprite(c, 'arrowRight', 0, 0, 3, { flipX: true });
    next.icon = (c) => drawSprite(c, 'arrowRight', 0, 0, 3);
    // (In the demo, on a full-game machine, the same button is WISHLIST: QA DEMO-04.)
    this.playBtn = this.btn('PLAY', STAGE.x + STAGE.w - 132, STAGE.y + STAGE.h - 46, 220, 56, () => (this.cabPreview() ? openStore() : this.startCabinet()));
    this.buttons = [...this.stakeHits, menu, prev, next, this.playBtn];
    // The row of machines: a click shows one on the stage; a click on the one already there plays it.
    const n = CABINET_ORDER.length;
    this.cards = CABINET_ORDER.map((_, i) => {
      const h = this.hit(W / 2 + (i - (n - 1) / 2) * THUMB.gap, THUMB.y, THUMB.w, THUMB.h, () => {
        if (this.picked >= 0) return;
        if (i === this.cabSel) return this.startCabinet();
        this.selectCabinet(i, i > this.cabSel ? 1 : -1);
      });
      void this.ui.wait(0.08 + i * 0.05).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.25, ease: backOut(2), onUpdate: (v) => (h.scale = v) }));
      return h;
    });
    this.cabIn = 0;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.cabIn = v) });
    this.syncPlay();
  }

  /** The selected machine can be played at the chosen stake. */
  protected cabPlayable(i = this.cabSel): boolean {
    const id = CABINET_ORDER[i];
    return this.cabinetUnlocked.has(id) && this.stakeFor(id) >= this.stakeSel;
  }

  /** The demo shows the full game's other machines for real (dimmed), not as "???": they can't be played here. */
  protected cabPreview(i = this.cabSel): boolean {
    return demo().on && !this.cabinetUnlocked.has(CABINET_ORDER[i]);
  }

  protected syncPlay(): void {
    if (!this.playBtn) return;
    // In the demo the full game's machines say so on a quiet button, not a greyed PLAY. With a store page it's
    // WISHLIST and opens it (the stage's IN THE FULL GAME tag already says why it can't be played: QA DEMO-04).
    const preview = this.cabPreview();
    const wish = preview && STORE_URL !== null;
    this.playBtn.enabled = this.cabPlayable() || wish;
    this.playBtn.label = wish ? 'WISHLIST' : preview ? IN_FULL_GAME : 'PLAY';
    this.playBtn.quietStyle = preview;
  }

  protected selectCabinet(i: number, dir: number): void {
    if (i === this.cabSel) return;
    this.cabSel = i;
    this.cabDir = dir;
    this.sounds.click();
    this.cabIn = 0;
    void this.ui.tween({ from: 0, to: 1, dur: 0.22, ease: sineOut, onUpdate: (v) => (this.cabIn = v) });
    this.syncPlay();
  }

  protected stepCabinet(d: number): void {
    if (this.picked >= 0) return;
    const n = CABINET_ORDER.length;
    this.selectCabinet((this.cabSel + d + n) % n, d);
  }

  protected startCabinet(): void {
    if (this.picked >= 0) return;
    if (!this.cabPlayable()) {
      this.sounds.fizzle();
      return;
    }
    this.picked = this.cabSel;
    const id = CABINET_ORDER[this.cabSel];
    this.sounds.stingerMedium();
    // (Only if the machine screen is still up: MENU or Escape in that 0.3 s still started the run, UI QA 2026-11-02.)
    void this.ui.wait(0.3).then(() => {
      if (this.mode === 'cabinet' && this.picked >= 0) this.cb.onCabinet(id);
    });
  }

  /** Swipe the stage to page through the machines. */
  protected onSwipe(dx: number, _x: number, y: number): boolean {
    if (this.mode !== 'cabinet' || y < STAGE.y || y > THUMB.y + THUMB.h / 2) return false;
    this.stepCabinet(dx < 0 ? 1 : -1);
    return true;
  }

  protected maxStake(): number {
    return Math.max(0, ...Object.values(this.stakes).map((n) => n ?? 0));
  }

  /** The stakes the chosen Slot Machine has earned (the padlocks follow it: a stake won on KNIGHT showed open on a
   * TESLA that hadn't won WHITE, QA PLAY-U1). */
  protected ladderMax(): number {
    return this.stakeFor(CABINET_ORDER[this.cabSel]);
  }

  protected stakeFor(id: CabinetId): number {
    return this.stakes[id] ?? 0;
  }

  protected stakeChipW(name: string): number {
    return Math.round(name.length * 6 * T.body + 22 + 18);
  }

  protected drawCabinets(ctx: CanvasRenderingContext2D, time: number): void {
    drawTitle(ctx, 'CHOOSE YOUR MACHINE', W / 2, 40);
    this.drawStage(ctx, time);
    this.drawThumbs(ctx, time);
    this.drawStakePicker(ctx, time);
    for (const b of this.buttons) if (!this.stakeHits.includes(b)) this.drawButton(ctx, b, time);
  }

  /** The selected machine, big: its cabinet on a spotlight, its hero, its name and its three-line pitch. */
  protected drawStage(ctx: CanvasRenderingContext2D, time: number): void {
    const { x, y, w, h } = STAGE;
    const id = CABINET_ORDER[this.cabSel];
    const cab = CABINETS[id];
    const open = this.cabinetUnlocked.has(id);
    // The demo: the full game's machines shown for real, dimmed (the full game keeps its silhouettes).
    const preview = this.cabPreview();
    const shown = open || preview;
    const barred = open && this.stakeFor(id) < this.stakeSel;
    drawPanel(ctx, x, y, w, h, { frame: open ? KIT.frame : KIT.frameDim });
    // The stage: a darker floor with a spotlight pool under the machine.
    const fx = x + 170;
    spotlight(ctx, fx, y + h - 58, 260, shown ? '#ffe08a' : '#8a7aa8', open ? 0.12 : 0.06);
    // The machine slides in from the side it was paged from (a fade only with MOTION: REDUCED).
    const k = this.cabIn;
    const slide = this.reduceMotion ? 0 : Math.round((1 - k) * 40 * this.cabDir);
    const bob = open && !this.reduceMotion && this.picked < 0 ? Math.round(Math.sin(time * 2) * 2) : 0;
    ctx.save();
    ctx.globalAlpha *= k;
    const sprite = (shown ? cab.sprite : 'cabinetLocked') as SpriteId;
    drawSprite(ctx, sprite, fx + slide, y + h / 2 - 8 + bob, 4, open ? { dim: barred ? 0.55 : 0 } : preview ? { dim: 0.45 } : { variant: 'black', alpha: 0.9 });
    // The hero you play as on this machine, in a well (a silhouette while it's locked).
    const hx = x + 360;
    const hy = y + 22;
    drawWell(ctx, hx, hy, 140, 140, shown ? '#2a2040' : '#140e1e');
    spotlight(ctx, hx + 70, hy + 118, 120, shown ? '#c9a0ff' : '#4a4058', preview ? 0.08 : 0.14, [hx + 2, hy + 2, 136, 136]);
    bigPortrait(ctx, heroSprite(id) as SpriteId, hx + 70 + slide / 2, hy + 72, 4, open ? {} : preview ? { dim: 0.45 } : { variant: 'black', alpha: 0.85 });
    // Name, who you play as, the blurb.
    const tx = hx + 164;
    drawText(ctx, shown ? cab.name : '???', tx, hy + 30, T.title, shown ? KIT.title : KIT.dim, { align: 'left' });
    if (shown) {
      drawText(ctx, `PLAY AS ${cab.hero}`, tx, hy + 74, T.body, '#c9a0ff', { align: 'left' });
      drawText(ctx, cab.blurb, tx, hy + 102, T.small, KIT.dim, { align: 'left' });
      // The pitch: three lines at body size.
      // (Three lines close up a little: JUKEBOX's third sat 3px over its stake line.)
      const pitch = wrap(cab.rule, Math.floor((x + w - 36 - hx) / (6 * T.body))).slice(0, 3);
      pitch.forEach((l, i) => drawText(ctx, l, hx, hy + 170 + i * (pitch.length > 2 ? 23 : 26), T.body, KIT.text, { align: 'left' }));
      // (The demo's preview has no stake: its button says IN THE FULL GAME.)
      if (preview) {
        ctx.restore();
        return;
      }
      // The highest stake it plays, as its chip ("BEST STAKE: WHITE" read as a record on a profile with no runs: QA PLAY-U2).
      const best = stakeOf(this.stakeFor(id));
      drawText(ctx, 'PLAYS UP TO', hx, y + h - 46, T.small, KIT.dim, { align: 'left' });
      drawChip(ctx, best.name, hx + 128 + this.stakeChipW(best.name) / 2, y + h - 46, { icon: (ix, iy) => stakeDisc(ctx, ix, iy, best.color, 7), iconW: 18 });
      if (barred) drawText(ctx, `${stakeOf(this.stakeSel).name} LOCKED: WIN AT ${stakeOf(this.stakeFor(id)).name} WITH IT`, hx, y + h - 16, T.small, '#ff8a7a', { align: 'left' });
    } else {
      drawChip(ctx, 'LOCKED', tx + 60, hy + 76, { color: '#ff8a7a', icon: (ix, iy) => drawSprite(ctx, 'icoLock', ix, iy, 2), iconW: 18 });
      wrap(`${cab.unlock} TO UNLOCK`, Math.floor((x + w - 36 - hx) / (6 * T.body))).slice(0, 2).forEach((l, i) => drawText(ctx, l, hx, hy + 172 + i * 26, T.body, KIT.text, { align: 'left' }));
    }
    ctx.restore();
  }

  /** The row of machines: the one on the stage is lifted and lit; locked ones are silhouettes (in the demo, the full
   * game's machines dimmed, under one IN THE FULL GAME tag). */
  protected drawThumbs(ctx: CanvasRenderingContext2D, _time: number): void {
    CABINET_ORDER.forEach((id, i) => {
      const h = this.cards[i];
      if (!h || h.scale <= 0.01) return;
      const open = this.cabinetUnlocked.has(id);
      const shown = open || this.cabPreview(i);
      const sel = i === this.cabSel;
      const lift = sel ? 1 : h.hover ? 0.6 : 0;
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.scale(h.scale, h.scale);
      ctx.translate(-h.x, -h.y);
      const yy = open || sel ? drawCard(ctx, h.x - h.w / 2, h.y - h.h / 2, h.w, h.h, { lift }) : (drawPanel(ctx, h.x - h.w / 2, h.y - h.h / 2 - Math.round(6 * lift), h.w, h.h, { frame: KIT.frameDim, fill: '#140e1e' }), h.y - h.h / 2 - Math.round(6 * lift));
      const sprite = (shown ? CABINETS[id].sprite : 'cabinetLocked') as SpriteId;
      drawSprite(ctx, sprite, h.x, yy + h.h / 2, 1.125, open ? { dim: this.cabPlayable(i) ? 0 : 0.5 } : shown ? { dim: 0.5 } : { variant: 'black', alpha: 0.9 });
      drawText(ctx, shown ? CABINETS[id].name : '???', h.x, h.y + h.h / 2 + 18, T.small, sel ? KIT.title : KIT.dim);
      ctx.restore();
    });
    this.drawPreviewTag(ctx);
  }

  /** The demo: one IN THE FULL GAME tag under the machines it doesn't have, a bracket spanning them (one tag per
   * machine didn't fit: it's wider than a thumb). */
  protected drawPreviewTag(ctx: CanvasRenderingContext2D): void {
    const row = CABINET_ORDER.map((_, i) => i).filter((i) => this.cabPreview(i) && this.cards[i]);
    if (!row.length) return;
    const first = this.cards[row[0]];
    const last = this.cards[row[row.length - 1]];
    const k = Math.min(...row.map((i) => this.cards[i].scale));
    if (k <= 0.01) return;
    const x0 = Math.round(first.x - first.w / 2);
    const x1 = Math.round(last.x + last.w / 2);
    const y = Math.round(first.y + first.h / 2 + 40);
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k);
    // The bracket: a rule with its ends turned up, in the dim frame colour, behind the tag.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - 1, y - 1, x1 - x0 + 2, 4);
    ctx.fillRect(x0 - 1, y - 9, 4, 10);
    ctx.fillRect(x1 - 3, y - 9, 4, 10);
    ctx.fillStyle = KIT.frameDim;
    ctx.fillRect(x0, y, x1 - x0, 2);
    ctx.fillRect(x0, y - 8, 2, 8);
    ctx.fillRect(x1 - 2, y - 8, 2, 8);
    drawChip(ctx, IN_FULL_GAME, (x0 + x1) / 2, y + 1, { scale: T.small, color: KIT.title, frame: KIT.frameDim, fill: KIT.fill });
    ctx.restore();
  }

  /** HIGH STAKES: a row of chips (name and colour; locked ones padlocked), and the hovered or chosen stake's rule. */
  protected drawStakePicker(ctx: CanvasRenderingContext2D, _time: number): void {
    const max = this.ladderMax();
    const y = STAKE_ROW.y;
    const first = this.stakeHits[0];
    if (first) drawText(ctx, 'HIGH STAKES', first.x - first.w / 2 - 16, y, T.small, KIT.dim, { align: 'right' });
    const hov = this.stakeHits.findIndex((b) => b.hover);
    STAKES.forEach((s, k) => {
      const b = this.stakeHits[k];
      if (!b) return;
      const chosen = k === this.stakeSel;
      const locked = k > max;
      const deny = this.stakeDeny.level === k ? (performance.now() - this.stakeDeny.at) / 1000 : 9;
      const shake = deny < 0.3 ? Math.round(Math.sin(deny * 60) * 4 * (1 - deny / 0.3)) : 0;
      const raise = chosen ? Math.round(4 * this.stakePop) : b.hover ? 2 : 0;
      ctx.save();
      if (locked) ctx.globalAlpha *= 0.55;
      drawChip(ctx, s.name, b.x + shake, y - raise, {
        fill: chosen ? '#3a2a14' : KIT.fillLight,
        color: chosen ? '#fff6c8' : locked ? KIT.dim : KIT.title,
        icon: (ix, iy) => (locked ? drawSprite(ctx, 'icoLock', ix, iy, 2) : stakeDisc(ctx, ix, iy, s.color, 7)),
        iconW: 18,
      });
      ctx.restore();
      // The chosen stake: an underline in its colour.
      if (chosen) {
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(Math.round(b.x - b.w / 2 + 6), y + 22, b.w - 12, 6);
        ctx.fillStyle = s.color;
        ctx.fillRect(Math.round(b.x - b.w / 2 + 8), y + 23, b.w - 16, 4);
      }
    });
    // One line: what the hovered (or chosen) stake adds. (Stakes stack: each one plays with every stake below it.)
    const show = hov >= 0 ? hov : this.stakeSel;
    const s = STAKES[show];
    const locked = show > max;
    const rule = locked ? `${demo().on ? IN_FULL_GAME : 'LOCKED'}: ${s.rule}` : s.rule;
    const lines = textWidth(rule, T.body) <= W - 80 ? [rule] : wrap(rule, Math.floor((W - 80) / (6 * T.body)));
    lines.slice(0, 2).forEach((l, i) => drawText(ctx, l, W / 2, y + 46 + i * 24, T.body, locked ? KIT.dim : KIT.text));
    // (Under a two-line rule too: BLUE's dropped its ACT 3 line once its rule grew a COUNTERFEITER.)
    const ey = y + 74 + (Math.min(2, lines.length) - 1) * 24;
    if (show >= STAKE.act3) drawText(ctx, show > STAKE.act3 ? '+ ACT 3, AND EVERY STAKE BELOW IT' : '+ ACT 3: THE DEALER', W / 2, ey, T.small, locked ? KIT.dim : '#7dff7a');
    else if (show > 0) drawText(ctx, 'ON TOP OF THE BASE GAME', W / 2, ey, T.small, KIT.dim);
  }
}
