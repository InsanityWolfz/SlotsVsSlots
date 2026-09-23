import type { SideId } from '../core/config';
import type { Combatant } from '../core/fight';
import type { Sounds } from '../audio/sounds';
import type { Clock } from './clock';
import { sineInOut } from './ease';
import { COLORS, MACHINE_H, MACHINE_W, PITCH, REELS, reelWindow } from './layout';
import { ReelView, SPIN, type CellView } from './reel';
import { drawSprite, artId, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';

export interface SpinCallbacks {
  onReelStop?: (reel: number) => void;
  onNearMiss?: () => void;
}

export class MachineView {
  reels: ReelView[];
  /** Knockback offset in px (springs back). */
  kx = 0;
  ky = 0;
  /** 0..1 how "active" (whose turn) — brightens the bezel. */
  active = 0;
  /** Whole-machine white hit flash. */
  flash = 0;
  /** Darken the whole machine (idle side / death). */
  dim = 0;
  /** Death tilt. */
  tilt = 0;
  drop = 0;
  desat = 0;
  payline = { progress: 0, alpha: 0, color: COLORS.goldLight };
  /** Big green wash for slime floods / gold wipe for cleanse: -1 = off, else 0..1 sweep. */
  wash = { t: -1, color: COLORS.slime };
  /** Display-side reel statuses: turns left, and 0..1 overlay strength. */
  frozen: number[];
  locked: number[];
  frozenFx: number[];
  lockedFx: number[];
  hexed: number[];
  hexedFx: number[];
  /** The Mirror cracked at half HP. */
  cracked = false;
  private spun = false;

  constructor(
    readonly side: SideId,
    combatant: Combatant,
    private sounds: Sounds,
  ) {
    this.reels = combatant.reels.map(
      (r) =>
        new ReelView(
          r.cells.map((c): CellView => ({ symbol: c.symbol, slimed: c.slimed, goo: c.slimed ? 1 : 0, flash: 0, stolen: c.stolen ? 1 : 0, enh: c.enh, tier: c.tier, bomb: c.bomb, grounded: c.grounded, faked: c.faked })),
          r.stop,
        ),
    );
    this.frozen = combatant.frozen.slice();
    this.locked = combatant.locked.slice();
    this.frozenFx = this.frozen.map((t) => (t > 0 ? 1 : 0));
    this.lockedFx = this.locked.map((t) => (t > 0 ? 1 : 0));
    this.hexed = combatant.hexed.slice();
    this.hexedFx = this.hexed.map((t) => (t > 0 ? 1 : 0));
  }

  /** Mirror an engine insert (same index + stop rule as core/strip insertOffscreen). */
  insertCell(reel: number, index: number, cell: CellView): void {
    const r = this.reels[reel];
    r.cells.splice(index, 0, cell);
    if (r.stop >= index) r.stop++;
  }

  get pitchMul(): number {
    return this.side === 'enemy' ? 0.85 : 1;
  }

  /**
   * Spin all reels to predetermined stops. Resolves when the last reel lands.
   * Near-miss: first two reels match → the last reel keeps blurring past the others,
   * then does the slow 0.7s decel (juice §2, 3-reel version).
   */
  async spin(stops: number[], nearMiss: boolean, clock: Clock, cb: SpinCallbacks = {}, frozen: boolean[] = []): Promise<void> {
    this.payline.alpha = 0;
    this.payline.progress = 0;
    const windup = this.spun;
    this.spun = true;
    const tw = windup ? SPIN.windup : 0;
    const base = tw + SPIN.accel + SPIN.minSpin;
    const plans = stops.map((target, i) => ({ target, windup, decelAt: base + i * SPIN.stagger, decelDur: SPIN.decel, frozen: !!frozen[i] }));
    const last = REELS - 1;
    if (nearMiss && !plans[last].frozen) {
      const prevLand = plans[last - 1].decelAt + SPIN.decel;
      plans[last].decelAt = prevLand + 0.35;
      plans[last].decelDur = SPIN.nearMissDecel;
    }

    const allFrozen = plans.every((p) => p.frozen);
    const stopLoop = clock.skipping || allFrozen ? () => {} : this.sounds.spinLoop(this.pitchMul);
    await Promise.all(
      this.reels.map((reel, i) =>
        reel.spin(plans[i], clock, () => {
          if (plans[i].frozen) this.sounds.iceClink();
          else this.sounds.reelStop(i, this.pitchMul);
          if (i === last) stopLoop();
          if (nearMiss && i === last - 1) {
            for (const r of [0, 1]) {
              const fx = this.reels[r].rows[1];
              fx.glowColor = COLORS.goldLight;
              void clock.tween({ from: 0, to: 0.7, dur: 0.25, ease: sineInOut, onUpdate: (v) => (fx.glow = v) });
            }
            cb.onNearMiss?.();
          }
          cb.onReelStop?.(i);
        }),
      ),
    );
    stopLoop();
  }

  /** Dim every row except the payline (juice §3 step 1). */
  focusPayline(clock: Clock, on: boolean): Promise<void> {
    const to = on ? 0.4 : 0;
    return Promise.all(
      this.reels.flatMap((reel) =>
        [0, 2].map((row) => clock.to(reel.rows[row], 'dim', to, 0.15)),
      ),
    ).then(() => {});
  }

  clearRowFx(): void {
    for (const reel of this.reels) for (const r of reel.rows) Object.assign(r, { glow: 0, dim: 0, flash: 0, lift: 0, wobble: 0, alpha: 1, punch: 1 });
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const win = reelWindow(this.side);
    ctx.save();
    ctx.translate(win.x + MACHINE_W / 2 + this.kx, win.y + MACHINE_H / 2 + this.ky + this.drop);
    ctx.rotate(this.tilt);
    ctx.translate(-MACHINE_W / 2, -MACHINE_H / 2);

    this.drawBezel(ctx, time);

    // Reel window background: rich gradient, no tiles.
    const g = ctx.createLinearGradient(0, 0, 0, MACHINE_H);
    g.addColorStop(0, '#2a1240');
    g.addColorStop(0.5, '#1c0b2e');
    g.addColorStop(1, '#0c0418');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, MACHINE_W, MACHINE_H);
    // Payline band.
    ctx.fillStyle = 'rgba(255,224,138,0.06)';
    ctx.fillRect(0, PITCH, MACHINE_W, PITCH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, MACHINE_W, MACHINE_H);
    ctx.clip();
    this.reels.forEach((reel, i) => reel.draw(ctx, PITCH * (i + 0.5), PITCH * 1.5, time));

    // Top/bottom shading so symbols scroll in/out of darkness.
    const shade = ctx.createLinearGradient(0, 0, 0, MACHINE_H);
    shade.addColorStop(0, 'rgba(8,2,16,0.75)');
    shade.addColorStop(0.18, 'rgba(8,2,16,0)');
    shade.addColorStop(0.82, 'rgba(8,2,16,0)');
    shade.addColorStop(1, 'rgba(8,2,16,0.75)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, MACHINE_W, MACHINE_H);

    if (this.wash.t >= 0) this.drawWash(ctx);
    ctx.restore();

    // Thin gold dividers between reels.
    ctx.fillStyle = COLORS.gold;
    for (let i = 1; i < REELS; i++) ctx.fillRect(PITCH * i - 1, 4, 2, MACHINE_H - 8);

    this.drawStatuses(ctx, time);
    this.drawPayline(ctx);

    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.flash);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -6, MACHINE_W + 12, MACHINE_H + 12);
      ctx.globalAlpha = 1;
    }
    const d = Math.max(this.dim, this.desat * 0.55);
    if (d > 0) {
      ctx.globalAlpha = d;
      ctx.fillStyle = this.desat > 0 ? '#1a1a22' : '#000000';
      ctx.fillRect(-18, -18, MACHINE_W + 36, MACHINE_H + 36);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawBezel(ctx: CanvasRenderingContext2D, time: number): void {
    const pad = 14;
    // Pulsing rim glow — stronger on the active machine (juice §9).
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + (this.side === 'enemy' ? 1.3 : 0));
    const glow = 0.15 + 0.2 * pulse + 0.45 * this.active;
    ctx.save();
    ctx.shadowColor = this.side === 'player' ? '#ffcf5a' : '#9dff6a';
    ctx.shadowBlur = 18 + 22 * this.active;
    ctx.globalAlpha = glow;
    ctx.fillStyle = ctx.shadowColor;
    ctx.fillRect(-pad, -pad, MACHINE_W + pad * 2, MACHINE_H + pad * 2);
    ctx.restore();

    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-pad - 4, -pad - 4, MACHINE_W + pad * 2 + 8, MACHINE_H + pad * 2 + 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-pad, -pad, MACHINE_W + pad * 2, MACHINE_H + pad * 2);
    ctx.fillStyle = '#8a5a1c';
    ctx.fillRect(-pad + 4, -pad + 4, MACHINE_W + pad * 2 - 8, MACHINE_H + pad * 2 - 8);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(-pad + 8, -pad + 8, MACHINE_W + pad * 2 - 16, MACHINE_H + pad * 2 - 16);
    // Bezel highlight (top-left light).
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillRect(-pad, -pad, MACHINE_W + pad * 2, 2);
    ctx.fillRect(-pad, -pad, 2, MACHINE_H + pad * 2);
    // Payline arrow markers.
    const my = PITCH * 1.5;
    const a = 0.6 + 0.4 * this.active;
    ctx.fillStyle = `rgba(255,224,138,${a})`;
    ctx.beginPath();
    ctx.moveTo(-pad + 2, my - 8);
    ctx.lineTo(-pad + 10, my);
    ctx.lineTo(-pad + 2, my + 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(MACHINE_W + pad - 2, my - 8);
    ctx.lineTo(MACHINE_W + pad - 10, my);
    ctx.lineTo(MACHINE_W + pad - 2, my + 8);
    ctx.fill();
    // Corner rivets.
    ctx.fillStyle = COLORS.goldLight;
    for (const [x, y] of [
      [-pad + 3, -pad + 3],
      [MACHINE_W + pad - 7, -pad + 3],
      [-pad + 3, MACHINE_H + pad - 7],
      [MACHINE_W + pad - 7, MACHINE_H + pad - 7],
    ])
      ctx.fillRect(x, y, 4, 4);
  }

  /** Jagged cracks across the glass once the Mirror is at half HP. */
  private drawCracks(ctx: CanvasRenderingContext2D): void {
    if (!this.cracked) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(220,245,255,0.75)';
    ctx.lineWidth = 3;
    const paths = [
      [[0.52, 0.0], [0.47, 0.18], [0.56, 0.3], [0.44, 0.52], [0.58, 0.7], [0.5, 1.0]],
      [[0.44, 0.52], [0.25, 0.46], [0.12, 0.6], [0.0, 0.57]],
      [[0.56, 0.3], [0.76, 0.24], [0.88, 0.36], [1.0, 0.31]],
      [[0.58, 0.7], [0.74, 0.82], [0.7, 1.0]],
    ];
    for (const path of paths) {
      ctx.beginPath();
      path.forEach(([x, y], i) => (i ? ctx.lineTo(x * MACHINE_W, y * MACHINE_H) : ctx.moveTo(x * MACHINE_W, y * MACHINE_H)));
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStatuses(ctx: CanvasRenderingContext2D, time: number): void {
    this.drawCracks(ctx);
    for (let r = 0; r < REELS; r++) {
      const fz = this.frozenFx[r];
      const lk = this.lockedFx[r];
      const cx = PITCH * (r + 0.5);
      if (fz > 0) {
        ctx.save();
        ctx.globalAlpha = 0.28 * fz;
        ctx.fillStyle = '#9fe8ff';
        ctx.fillRect(PITCH * r + 2, 0, PITCH - 4, MACHINE_H);
        ctx.restore();
        for (let row = 0; row < 3; row++) drawSprite(ctx, 'frozenOverlay', cx, PITCH * (row + 0.5), 5.6, { alpha: fz * (0.85 + 0.15 * Math.sin(time * 3 + row)) });
      }
      if (lk > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35 * lk;
        ctx.fillStyle = '#1a0f08';
        ctx.fillRect(PITCH * r + 2, 0, PITCH - 4, MACHINE_H);
        ctx.restore();
        drawSprite(ctx, 'lockOverlay', cx, PITCH * 1.5, 5.6, { alpha: lk });
      }
      const hx = this.hexedFx[r];
      if (hx > 0) {
        ctx.save();
        ctx.globalAlpha = (0.22 + 0.06 * Math.sin(time * 2.5 + r)) * hx;
        ctx.fillStyle = '#b04ae8';
        ctx.fillRect(PITCH * r + 2, 0, PITCH - 4, MACHINE_H);
        ctx.restore();
        drawSprite(ctx, artId('hexOverlay'), cx, PITCH * 1.5, 5.6, { alpha: hx * (0.8 + 0.2 * Math.sin(time * 4 + r)) });
      }
      const badge =
        this.frozen[r] > 0
          ? { n: this.frozen[r], c: '#9fe8ff', icon: 'icoFreeze' as SpriteId }
          : this.locked[r] > 0
            ? { n: this.locked[r], c: '#ffb070', icon: 'icoLock' as SpriteId }
            : this.hexed[r] > 0
              ? { n: this.hexed[r], c: '#e0a0ff', icon: artId('icoHex') }
              : null;
      if (badge && Math.max(fz, lk, hx) > 0.5) {
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(cx - 22, -12, 44, 22);
        drawSprite(ctx, badge.icon, cx - 10, -1, 2);
        drawText(ctx, String(badge.n), cx + 10, -1, 2, badge.c);
      }
    }
  }

  private drawPayline(ctx: CanvasRenderingContext2D): void {
    if (this.payline.alpha <= 0 || this.payline.progress <= 0) return;
    const y = PITCH * 1.5;
    const x1 = MACHINE_W * this.payline.progress;
    ctx.save();
    ctx.globalAlpha = this.payline.alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = this.payline.color;
    ctx.shadowColor = this.payline.color;
    ctx.shadowBlur = 16;
    ctx.fillRect(0, y - 3, x1, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, y - 1, x1, 2);
    // Bright head while drawing on.
    if (this.payline.progress < 1) ctx.fillRect(x1 - 6, y - 5, 8, 10);
    ctx.restore();
  }

  private drawWash(ctx: CanvasRenderingContext2D): void {
    const t = this.wash.t;
    const edge = MACHINE_H * 1.3 * t - MACHINE_H * 0.15;
    ctx.save();
    ctx.globalAlpha = Math.min(0.75, 1.5 * (1 - Math.abs(t - 0.5) * 2) + 0.2);
    ctx.fillStyle = this.wash.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(MACHINE_W, 0);
    for (let x = MACHINE_W; x >= 0; x -= 12) ctx.lineTo(x, edge + Math.sin(x * 0.12 + t * 20) * 10);
    ctx.closePath();
    ctx.globalAlpha *= 1 - Math.max(0, t - 0.6) / 0.4;
    ctx.fill();
    ctx.restore();
  }
}
