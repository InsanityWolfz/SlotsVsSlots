import { ACHIEVEMENTS, ACHIEVEMENT_XP, type AchievementDef } from '../../core/meta';
import { foundCount } from '../../core/profile';
import { STAKES } from '../../core/stakes';
import { COLORS, W } from '../../present/layout';
import { artId, drawSprite, hasSprite, spriteSize } from '../../render/sprites';
import { drawText } from '../../render/text';
import type { Button } from '../button';
import { drawChip, drawPanel, drawWell, KIT, T } from '../kit';
import type { Menus } from '../menus';
import { wrap } from '../runScreens';
import { collectionTotal, plaqueIcon } from './data';
import { Lifts } from './lift';
import { TAB_Y, type TabBody } from './profile';

/**
 * PROFILE > TROPHIES: every achievement as a plaque (they double as the Steam achievement icons): its icon in a well,
 * its name, a progress bar where it counts up, lit gold when earned and a dark silhouette until then. Its line shows on
 * hover or focus, in a card by the plaque, never as a wall of text.
 */
const COLS = 7;
const PW = 156;
const PH = 124;
const GAP_X = 10;
const GAP_Y = 10;
const GX = W / 2 - (COLS * PW + (COLS - 1) * GAP_X) / 2;
const GY = 162;
const WELL = 68;

/** A poker chip in a stake's colour (the stake trophies' icon), 14 art pixels across at scale s. */
const CHIP = ['....XXXXXX....', '..XXWXXXXWXX..', '.XXXXXXXXXXXX.', '.XWXXOOOOXXWX.', 'XXXXOXXXXOXXXX', 'XXXOXXXXXXOXXX', 'XWXOXXXXXXOXWX', 'XWXOXXXXXXOXWX', 'XXXOXXXXXXOXXX', 'XXXXOXXXXOXXXX', '.XWXXOOOOXXWX.', '.XXXXXXXXXXXX.', '..XXWXXXXWXX..', '....XXXXXX....'];
export function drawStakeChip(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string): void {
  const n = CHIP.length;
  const x0 = Math.round(cx - (n * s) / 2);
  const y0 = Math.round(cy - (n * s) / 2);
  const paint = (dx: number, dy: number, pick: (ch: string) => string | null) =>
    CHIP.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = pick(ch);
        if (!c) return;
        ctx.fillStyle = c;
        ctx.fillRect(x0 + x * s + dx, y0 + y * s + dy, s, s);
      }),
    );
  paint(-s, 0, (ch) => (ch === '.' ? null : COLORS.outline));
  paint(s, 0, (ch) => (ch === '.' ? null : COLORS.outline));
  paint(0, -s, (ch) => (ch === '.' ? null : COLORS.outline));
  paint(0, s, (ch) => (ch === '.' ? null : COLORS.outline));
  paint(0, 0, (ch) => (ch === '.' ? null : ch === 'W' ? '#f4eee0' : ch === 'O' ? 'rgba(0,0,0,0.3)' : color));
}

export class TrophiesTab implements TabBody {
  private plaques: Button[] = [];
  private lifts = new Lifts();

  constructor(private m: Menus) {
    this.plaques = ACHIEVEMENTS.map((_, i) => {
      const x = GX + (i % COLS) * (PW + GAP_X) + PW / 2;
      const y = GY + Math.floor(i / COLS) * (PH + GAP_Y) + PH / 2;
      return m.hit(x, y, PW, PH, () => m.sounds.click());
    });
  }

  private progress(a: AchievementDef): [number, number] | null {
    const p = this.m.profile();
    if (!a.progress) return null;
    return a.progress({ stats: p.stats, have: p.achievements, found: foundCount(p), collection: collectionTotal() });
  }

  update(dt: number): void {
    this.lifts.update(dt, this.plaques);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const p = this.m.profile();
    const got = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
    drawChip(ctx, `${got}/${ACHIEVEMENTS.length}`, W - 104, TAB_Y, { scale: T.body, icon: (x, y) => hasSprite('trophySmall') && drawSprite(ctx, artId('trophySmall'), x, y, 2), iconW: 26 });
    ACHIEVEMENTS.forEach((a, i) => this.drawPlaque(ctx, a, this.plaques[i]));
  }

  private drawPlaque(ctx: CanvasRenderingContext2D, a: AchievementDef, b: Button): void {
    const have = !!this.m.profile().achievements[a.id];
    const secret = a.secret && !have;
    const lift = this.lifts.lift(b);
    const x = b.x - PW / 2;
    const y = Math.round(b.y - PH / 2 - 4 * lift);
    drawPanel(ctx, x, y, PW, PH, { frame: have ? KIT.frame : KIT.frameDim, lit: have && lift > 0.5, fill: have ? KIT.fill : '#141020' });
    if (!have && lift > 0.5) {
      // A locked plaque still answers the pointer: its frame warms.
      ctx.fillStyle = KIT.frame;
      ctx.fillRect(x, y, PW, 3);
    }
    // The icon well.
    const wx = b.x - WELL / 2;
    const wy = y + 10;
    drawWell(ctx, wx, wy, WELL, WELL, have ? '#3a2d52' : '#241b34');
    const icon = plaqueIcon(a.id);
    const ix = b.x;
    const iy = wy + WELL / 2 + 1;
    if (secret) drawSprite(ctx, artId('mysterySlot'), ix, iy, 3, { alpha: 0.7 });
    else if ('stake' in icon) {
      drawStakeChip(ctx, ix, iy, 3, STAKES[icon.stake].color);
      if (!have) {
        // Not earned: the chip in shadow, like a dark sign.
        ctx.fillStyle = 'rgba(20,12,28,0.72)';
        ctx.fillRect(wx + 2, wy + 2, WELL - 4, WELL - 4);
      }
    }
    else {
      const sz = spriteSize(icon.sprite);
      const s = icon.portrait ? 2 : Math.max(1, Math.floor(48 / Math.max(sz.w, sz.h)));
      ctx.save();
      ctx.beginPath();
      ctx.rect(wx + 2, wy + 2, WELL - 4, WELL - 4);
      ctx.clip();
      drawSprite(ctx, icon.sprite, ix, iy + (icon.portrait ? 2 : 0), s, have ? {} : { dim: 0.72 });
      ctx.restore();
    }
    // Earned: a little trophy pinned to the corner.
    if (have && hasSprite('trophySmall')) drawSprite(ctx, artId('trophySmall'), x + PW - 18, y + 18, 2);
    // The name, two lines at most.
    const lines = wrap(secret ? '???' : a.name, 15).slice(0, 2);
    const prog = !have ? this.progress(a) : null;
    const ny = prog ? y + 92 : y + 98;
    lines.forEach((l, k) => drawText(ctx, l, b.x, ny + (k - (lines.length - 1) / 2) * 15 - (prog && lines.length > 1 ? 4 : 0), T.small, have ? KIT.title : COLORS.textDim));
    if (prog) {
      const bw = PW - 28;
      const by = y + PH - 16;
      drawWell(ctx, b.x - bw / 2, by, bw, 10, '#141020');
      ctx.fillStyle = COLORS.energy;
      ctx.fillRect(b.x - bw / 2 + 2, by + 2, Math.round(((bw - 4) * Math.min(prog[0], prog[1])) / Math.max(1, prog[1])), 6);
    }
  }

  /** The focused plaque's card: its name, what it asks, its progress and its XP. */
  drawOver(ctx: CanvasRenderingContext2D): void {
    const i = this.plaques.findIndex((b) => b.hover);
    if (i < 0) return;
    const a = ACHIEVEMENTS[i];
    const b = this.plaques[i];
    const have = !!this.m.profile().achievements[a.id];
    const secret = a.secret && !have;
    const prog = !have ? this.progress(a) : null;
    const lines = wrap(secret ? 'A SECRET. KEEP PLAYING.' : a.text, 30);
    const w = 400;
    const h = 64 + lines.length * 24 + (prog ? 28 : 0) + 28;
    // Beside the plaque, on whichever side has room; above it on the bottom row.
    let x = b.x + PW / 2 + 14;
    if (x + w > W - 20) x = b.x - PW / 2 - 14 - w;
    let y = b.y - PH / 2;
    if (y + h > 708) y = 708 - h;
    drawPanel(ctx, x, y, w, h);
    drawText(ctx, secret ? '???' : a.name, x + w / 2, y + 26, T.body, have ? KIT.title : COLORS.text);
    lines.forEach((l, k) => drawText(ctx, l, x + w / 2, y + 56 + k * 24, T.body, COLORS.text));
    let yy = y + 56 + lines.length * 24;
    if (prog) {
      drawText(ctx, `${Math.min(prog[0], prog[1])} OF ${prog[1]}`, x + w / 2, yy + 6, T.body, COLORS.energy);
      yy += 28;
    }
    drawText(ctx, have ? `EARNED. +${ACHIEVEMENT_XP} XP` : `WORTH ${ACHIEVEMENT_XP} XP`, x + w / 2, yy + 8, T.small, have ? KIT.title : COLORS.textDim);
  }
}
