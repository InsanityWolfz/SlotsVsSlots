import { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { COLORS } from '../present/layout';
import { drawText } from '../render/text';

export interface ButtonOpts {
  circle?: boolean;
  /** Idle-pulse 1.0↔1.04 on a 1.6s sine loop while enabled (Spin / Start). */
  idlePulse?: boolean;
  textScale?: number;
  /** Draw an inset rotating dashed ring (autoplay indicator). */
  ring?: () => boolean;
}

/** Canvas button with the full juice §6 treatment. Animates on a real-time UI clock. */
export class Button {
  scale = 1;
  enabled = true;
  toggled = false;
  visible = true;
  hover = false;
  private pressed = false;
  private disabledT = 0;
  private ringAngle = 0;

  constructor(
    public label: string,
    public x: number,
    public y: number,
    public w: number,
    public h: number,
    public onClick: () => void,
    private ui: Clock,
    private click: () => void,
    public opts: ButtonOpts = {},
  ) {}

  contains(px: number, py: number): boolean {
    if (!this.visible) return false;
    if (this.opts.circle) return Math.hypot(px - this.x, py - this.y) <= this.w / 2;
    return px >= this.x - this.w / 2 && px <= this.x + this.w / 2 && py >= this.y - this.h / 2 && py <= this.y + this.h / 2;
  }

  down(): void {
    if (!this.enabled) return;
    this.pressed = true;
    this.scale = 0.95;
  }

  up(inside: boolean): void {
    if (!this.pressed) return;
    this.pressed = false;
    if (!inside || !this.enabled) {
      void this.ui.to(this, 'scale', 1, 0.1);
      return;
    }
    this.click();
    void this.ui.to(this, 'scale', 1.08, 0.08, sineOut).then(() => this.ui.to(this, 'scale', 1, 0.1, backOut()));
    this.onClick();
  }

  cancel(): void {
    this.pressed = false;
    this.scale = 1;
  }

  update(dt: number): void {
    const target = this.enabled ? 0 : 1;
    this.disabledT += Math.sign(target - this.disabledT) * Math.min(Math.abs(target - this.disabledT), dt / 0.15);
    this.ringAngle += dt * 2;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.visible) return;
    const idle = this.opts.idlePulse && this.enabled && !this.pressed ? 1 + 0.02 + 0.02 * Math.sin((time * Math.PI * 2) / 1.6) : 1;
    const s = this.scale * idle;
    const d = this.disabledT;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(s, s);
    ctx.globalAlpha = 1 - 0.45 * d;
    const bg = this.pressed ? '#0c0a12' : this.toggled ? '#8a5a1c' : this.hover ? '#2a2238' : '#1a1426';
    const border = d > 0.5 ? '#6d6660' : COLORS.gold;
    const text = d > 0.5 ? '#8f8a96' : this.toggled ? '#fff6c8' : COLORS.goldLight;
    const hw = this.w / 2;
    const hh = this.h / 2;

    if (this.opts.circle) {
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(0, 0, hw + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = border;
      ctx.beginPath();
      ctx.arc(0, 0, hw, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(-hw * 0.3, -hw * 0.4, 4, 0, 0, hw);
      g.addColorStop(0, d > 0.5 ? '#3a3440' : this.pressed ? '#5a1a10' : '#c8321f');
      g.addColorStop(1, d > 0.5 ? '#1c1a22' : this.pressed ? '#2a0806' : '#6a120a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, hw - 4, 0, Math.PI * 2);
      ctx.fill();
      // Glossy highlight.
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.ellipse(0, -hw * 0.45, hw * 0.55, hw * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      if (this.opts.ring?.()) {
        // Inset dashed ring, dimmed in sync with the disabled state.
        ctx.save();
        ctx.rotate(this.ringAngle);
        ctx.globalAlpha = 0.9 - 0.55 * d;
        ctx.strokeStyle = COLORS.goldLight;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.arc(0, 0, hw - 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(-hw - 3, -hh - 3, this.w + 6, this.h + 6);
      ctx.fillStyle = border;
      ctx.fillRect(-hw, -hh, this.w, this.h);
      ctx.fillStyle = bg;
      ctx.fillRect(-hw + 3, -hh + 3, this.w - 6, this.h - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(-hw + 3, -hh + 3, this.w - 6, (this.h - 6) / 2);
    }
    if (this.pressed) {
      // Press tint toward (0.72, 0.72, 0.72).
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#000000';
      if (this.opts.circle) {
        ctx.beginPath();
        ctx.arc(0, 0, hw, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-hw, -hh, this.w, this.h);
      ctx.globalAlpha = 1 - 0.45 * d;
    }
    drawText(ctx, this.label, 0, 1, this.opts.textScale ?? 2, text);
    ctx.restore();
  }
}
