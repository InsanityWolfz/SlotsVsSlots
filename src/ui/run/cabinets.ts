import { CABINETS, CABINET_ORDER, type CabinetId } from '../../core/cabinets';
import { STAKE, STAKES, stakeOf } from '../../core/stakes';
import { backOut } from '../../present/ease';
import { COLORS, W } from '../../present/layout';
import { drawPortrait, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import { heroSprite } from '../menus';
import { wrap, TRACK } from './shared';
import { BuildPanel } from './build';

export abstract class CabinetScreen extends BuildPanel {
  /** Pick your starting machine (pre-run). Locked cabinets show how to unlock them. */
  showCabinets(unlocked: Set<CabinetId>, stakes: Partial<Record<CabinetId, number>> = {}, stakeSel = 0, _act3 = false, _dealerBeaten: CabinetId[] = []): void {
    this.cabinetUnlocked = unlocked;
    this.stakes = stakes;
    this.run = null;
    this.open('cabinet');
    this.stakeSel = Math.min(stakeSel, this.maxStake());
    // HIGH STAKES: one track of 6 chips, always shown (new players see the whole ladder, locked).
    // Every chip is a target: hovering or focusing one previews its rule, clicking an earned one selects it.
    const pick = (level: number) => {
      if (level > this.maxStake()) {
        this.sounds.fizzle();
        this.stakeDeny = { level, at: performance.now() };
        return;
      }
      if (level === this.stakeSel) return;
      this.stakeSel = level;
      CABINET_ORDER.forEach((id, i) => {
        if (this.cards[i]) this.cards[i].enabled = this.cabinetUnlocked.has(id) && this.stakeFor(id) >= this.stakeSel;
      });
      this.stakePop = 0;
      void this.ui.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(3), onUpdate: (v) => (this.stakePop = v) });
      this.cb.onStake(this.stakeSel);
    };
    this.stakeHits = STAKES.map((s) => this.minorBtn('', TRACK.x0 + s.level * TRACK.dx, TRACK.y, 50, 44, () => pick(s.level)));
    this.stakePop = 1;
    this.buttons = [...this.stakeHits, this.minorBtn('MENU', 90, 40, 130, 44, () => this.cb.onMenu())];
    this.cards = CABINET_ORDER.map((id, i) => {
      const h = this.hit(W / 2 + (i - (CABINET_ORDER.length - 1) / 2) * 240, 380, 220, 420, () => {
        if (!this.cabinetUnlocked.has(id) || this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        void this.ui
          .tween({ from: 1.05, to: 1.12, dur: 0.15, ease: backOut(2), onUpdate: (v) => (h.scale = v) })
          .then(() => this.ui.wait(0.3))
          .then(() => this.cb.onCabinet(id));
      });
      h.enabled = unlocked.has(id) && this.stakeFor(id) >= this.stakeSel;
      void this.ui.wait(0.1 + i * 0.08).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (h.scale = v) }));
      return h;
    });
  }

  protected maxStake(): number {
    return Math.max(0, ...Object.values(this.stakes).map((n) => n ?? 0));
  }

  protected stakeFor(id: CabinetId): number {
    return this.stakes[id] ?? 0;
  }

  protected drawCabinets(ctx: CanvasRenderingContext2D, time: number): void {
    drawText(ctx, 'CHOOSE YOUR MACHINE', W / 2, 60, 5, COLORS.goldLight);
    drawText(ctx, 'WIN RUNS TO UNLOCK MORE.', W / 2, 104, 2, COLORS.textDim);
    this.drawStakePicker(ctx, time);
    const sel = stakeOf(this.stakeSel);
    CABINET_ORDER.forEach((id, i) => {
      const h = this.cards[i];
      if (!h || h.scale <= 0.01) return;
      const cab = CABINETS[id];
      const open = this.cabinetUnlocked.has(id);
      const best = this.stakeFor(id);
      // Unlocked, but not up to the chosen stake yet: dimmed, behind a padlock in that stake's colour.
      const barred = open && best < this.stakeSel;
      const dim = this.picked >= 0 && this.picked !== i;
      ctx.save();
      ctx.globalAlpha *= dim ? 0.3 : 1;
      ctx.translate(h.x, h.y + h.lift);
      ctx.scale(h.scale, h.scale);
      const hover = h.hover && open && this.picked < 0;
      if (hover) {
        ctx.save();
        ctx.shadowColor = COLORS.goldLight;
        ctx.shadowBlur = 24;
        ctx.globalAlpha *= 0.4 + 0.2 * Math.sin(time * 6);
        ctx.fillStyle = COLORS.goldLight;
        ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h);
        ctx.restore();
      }
      this.panel(ctx, -h.w / 2, -h.h / 2, h.w, h.h, hover ? COLORS.goldLight : open && !barred ? COLORS.gold : '#4a4058');
      ctx.save();
      if (barred) ctx.globalAlpha *= 0.4;
      drawSprite(ctx, (open ? cab.sprite : 'cabinetLocked') as SpriteId, 0, -h.h / 2 + 100 + (hover ? Math.sin(time * 4) * 3 : 0), 2.6);
      // "???" at one size: its size used to give away the hidden name's length.
      drawText(ctx, open ? cab.name : '???', 0, 8, open && cab.name.length > 10 ? 2 : 3, open ? COLORS.goldLight : COLORS.textDim);
      if (open) {
        // The hero you play as on this machine.
        drawPortrait(ctx, heroSprite(id), -h.w / 2 + 30, -h.h / 2 + 30, 1.5);
        drawText(ctx, `PLAY AS ${cab.hero}`, 0, 28, 1.25, '#c9a0ff');
        drawText(ctx, cab.blurb, 0, 42, 1, COLORS.textDim);
        // The rule at the big size if it fits 5 lines, else smaller (MIDAS's was cut off: EXPERT_PLAYTEST_10 D2).
        const rule = cab.rule;
        const big = wrap(rule, 17);
        const fits = big.length <= 5;
        const lines = fits ? big : wrap(rule, 23).slice(0, 8);
        const lh = fits ? 18 : 14;
        lines.forEach((l, k) => drawText(ctx, l, 0, 64 + k * lh, fits ? 2 : 1.5, COLORS.text));
      } else {
        drawText(ctx, 'LOCKED', 0, 40, 2, '#ff8a7a');
        wrap(`UNLOCK: ${cab.unlock}`, 17).forEach((l, k) => drawText(ctx, l, 0, 70 + k * 18, 2, COLORS.textDim));
      }
      ctx.restore();
      if (open) this.cardLadder(ctx, id, h.h / 2 - 20, time);
      if (barred) this.ladderChip(ctx, 0, -h.h / 2 + 100, sel.level, 'locked', time, 22, sel.color);
      ctx.restore();
    });
  }

  /** A machine's own HIGH STAKES progress along its card's foot: the same 6 chips in miniature. */
  protected cardLadder(ctx: CanvasRenderingContext2D, id: CabinetId, y: number, time: number): void {
    const best = this.stakeFor(id);
    const dx = 22;
    const x0 = -((STAKES.length - 1) * dx) / 2;
    // The rail: lit up to this machine's best stake.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - 2, y - 3, (STAKES.length - 1) * dx + 4, 6);
    for (const s of STAKES) {
      const x = x0 + s.level * dx;
      if (s.level > 0 && s.level <= best) {
        ctx.fillStyle = s.color;
        ctx.fillRect(x - dx, y - 1, dx, 2);
      }
    }
    for (const s of STAKES) {
      const x = x0 + s.level * dx;
      const on = s.level <= best;
      const here = s.level === this.stakeSel;
      if (here) {
        // The chosen stake's socket: a ring, so every card answers "can I play this one?".
        ctx.fillStyle = on ? '#ffffff' : '#ff8a7a';
        ctx.beginPath();
        ctx.arc(x, y, 10 + (on ? Math.sin(time * 5) * 0.8 : 0), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? s.color : '#2a2238';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x - 3, y - 3, 2, 2);
      }
    }
  }

  /** HIGH STAKES: one track of 6 chips. The chosen one is raised and glowing; earned ones are lit; the rest are padlocked. */
  protected drawStakePicker(ctx: CanvasRenderingContext2D, time: number): void {
    const max = this.maxStake();
    const y = TRACK.y;
    const xOf = (k: number) => TRACK.x0 + k * TRACK.dx;
    const hov = this.stakeHits.findIndex((b) => b.hover);
    drawText(ctx, 'HIGH STAKES', xOf(0) - 40, y, 2, COLORS.textDim, { align: 'right' });
    // The rail: each stake stacks on the ones below it, so the chosen stake's colour fills back to WHITE.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(xOf(0), y - 5, xOf(5) - xOf(0), 10);
    for (let k = 1; k < STAKES.length; k++) {
      ctx.fillStyle = k <= this.stakeSel ? STAKES[k].color : k <= max ? '#4a4058' : '#241c30';
      ctx.fillRect(xOf(k - 1), y - 3, TRACK.dx, 6);
    }
    // ACT 3 (the Dealer) comes with GREEN and every stake above it: a bracket under those chips.
    const ay = y + 32;
    const act3On = this.stakeSel >= STAKE.act3;
    const ac = act3On ? '#7dff7a' : '#4a4058';
    const ax0 = xOf(STAKE.act3) - 14;
    const ax1 = xOf(5) + 14;
    const label = '+ ACT 3';
    const lw = 84;
    const mid = (ax0 + ax1) / 2;
    ctx.fillStyle = ac;
    ctx.fillRect(ax0, ay - 4, 2, 4);
    ctx.fillRect(ax1 - 2, ay - 4, 2, 4);
    ctx.fillRect(ax0, ay, mid - lw / 2 - ax0, 2);
    ctx.fillRect(mid + lw / 2, ay, ax1 - mid - lw / 2, 2);
    drawText(ctx, label, mid, ay + 1, 1.5, ac);
    // The chips (the chosen one last, so its glow sits on top).
    const order = STAKES.map((s) => s.level).sort((a, b) => (a === this.stakeSel ? 1 : b === this.stakeSel ? -1 : a - b));
    for (const k of order) {
      const b = this.stakeHits[k];
      const chosen = k === this.stakeSel;
      const state = k > max ? 'locked' : chosen ? 'chosen' : k < this.stakeSel ? 'stacked' : 'earned';
      const deny = this.stakeDeny.level === k ? (performance.now() - this.stakeDeny.at) / 1000 : 9;
      const shake = deny < 0.3 ? Math.sin(deny * 60) * 4 * (1 - deny / 0.3) : 0;
      const sc = b ? b.scale : 1;
      const r = chosen ? 15 + 6 * this.stakePop : 15;
      const yy = y - (chosen ? 7 * this.stakePop : 0) - (b?.hover && !chosen ? 3 : 0);
      ctx.save();
      ctx.translate(xOf(k) + shake, yy);
      ctx.scale(sc, sc);
      this.ladderChip(ctx, 0, 0, k, state, time, r);
      if (b?.hover && !chosen) {
        ctx.strokeStyle = COLORS.goldLight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // One line: what the hovered (or chosen) stake adds, after pips for the stakes stacked under it.
    const show = hov >= 0 ? hov : this.stakeSel;
    const s = STAKES[show];
    const locked = show > max;
    const ly = 697;
    const pip = 16;
    const pips = STAKES.slice(1, show);
    const nameW = textWidth(s.name, 2) + 12;
    let ruleScale = 2;
    if (textWidth(s.rule, 2) + nameW > 980) ruleScale = 1.5;
    const ruleW = textWidth(s.rule, ruleScale);
    const lockW = locked ? 26 : 0;
    const pipsW = pips.length ? pips.length * pip + 20 : 0;
    const total = lockW + pipsW + nameW + 14 + ruleW;
    let x = W / 2 - total / 2;
    ctx.save();
    if (locked) {
      ctx.globalAlpha *= 0.75;
      drawSprite(ctx, 'icoLock', x + 9, ly, 2);
      x += lockW;
    }
    for (const p of pips) {
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(x + 6, ly, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x + 6, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      x += pip;
    }
    if (pips.length) {
      drawText(ctx, '+', x + 4, ly, 2, COLORS.textDim);
      x += 20;
    }
    // The stake's name as a tag in its own colour.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 2, ly - 12, nameW + 4, 24);
    ctx.fillStyle = s.color;
    ctx.fillRect(x, ly - 10, nameW, 20);
    drawText(ctx, s.name, x + nameW / 2, ly + 1, 2, COLORS.outline, { outline: null });
    x += nameW + 14;
    drawText(ctx, s.rule, x, ly, ruleScale, locked ? COLORS.textDim : COLORS.text, { align: 'left' });
    ctx.restore();
    for (const b of this.buttons) if (!this.stakeHits.includes(b)) this.drawButton(ctx, b, time);
  }

  /**
   * A HIGH STAKES chip on the track. chosen: glowing; stacked: below the chosen one (in play);
   * earned: unlocked but above the chosen one; locked: dark, with a padlock (`tint` colours its rim).
   */
  protected ladderChip(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, state: 'chosen' | 'stacked' | 'earned' | 'locked', time: number, r: number, tint?: string): void {
    const s = stakeOf(level);
    ctx.save();
    if (state === 'chosen') {
      ctx.save();
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16 + 6 * Math.sin(time * 4);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (state === 'locked') {
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tint ?? '#3a2e52';
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1428';
      ctx.beginPath();
      ctx.arc(x, y, r - (tint ? 3 : 1), 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, r >= 20 ? 'lock' : 'icoLock', x, y, 2, { alpha: tint ? 1 : 0.7 });
      ctx.restore();
      return;
    }
    ctx.globalAlpha *= state === 'earned' ? 0.55 : 1;
    this.stakeChip(ctx, x, y, level, state === 'chosen' ? time : 0, r);
    ctx.restore();
  }

  /** A casino chip in the stake's colour, with its number. */
  protected stakeChip(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, time: number, r = 16, locked = false): void {
    const s = stakeOf(level);
    ctx.save();
    ctx.globalAlpha *= locked ? 0.35 : 1;
    ctx.fillStyle = '#f0e8ff';
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = time * 6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, String(level), x, y, r >= 14 ? 2 : 1.5, '#ffffff');
  }
}
