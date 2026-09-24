import { W, H } from './layout';

/**
 * One shared screen-juice system (juice §5): trauma shake + punch-zoom + white flash +
 * chroma pulse + background dim. Runs on real time so it keeps shaking through hitstop.
 */
/** Max opacity of a full-screen flash (photosensitivity safety). */
export const FLASH_CAP = 0.2;

export class Camera {
  trauma = 0;
  private decay = 2;
  readonly maxOffset = 24;
  readonly maxRoll = 0.05;
  zoom = 1;
  private zoomT = 0;
  private zoomDur = 0;
  private zoomAmt = 0;
  flash = 0;
  flashColor = '#ffffff';
  chroma = 0;
  dim = 0;
  dimTarget = 0;
  ox = 0;
  oy = 0;
  roll = 0;
  enabled = { shake: true, zoom: true, chroma: true, flash: true };

  /** Shake so the peak offset is ~`amp` px, fading over `dur` seconds. */
  shake(amp: number, dur: number): void {
    if (!this.enabled.shake || amp <= 0) return;
    const t = Math.min(1, Math.sqrt(amp / this.maxOffset));
    if (t >= this.trauma) {
      this.trauma = t;
      this.decay = t / Math.max(0.05, dur);
    }
  }

  punchZoom(amount: number, dur = 0.35): void {
    if (!this.enabled.zoom || amount <= 0) return;
    this.zoomAmt = amount;
    this.zoomDur = dur;
    this.zoomT = 0;
  }

  flashScreen(alpha: number, color = '#ffffff'): void {
    if (!this.enabled.flash) return;
    // Photosensitivity: a full-screen flash is only ever a soft tint.
    this.flash = Math.max(this.flash, Math.min(FLASH_CAP, alpha));
    this.flashColor = color;
  }

  chromaPulse(amount: number): void {
    if (!this.enabled.chroma) return;
    this.chroma = Math.max(this.chroma, amount);
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - this.decay * dt);
    const t2 = this.trauma * this.trauma;
    this.ox = (Math.random() * 2 - 1) * this.maxOffset * t2;
    this.oy = (Math.random() * 2 - 1) * this.maxOffset * t2;
    this.roll = (Math.random() * 2 - 1) * this.maxRoll * t2;

    if (this.zoomDur > 0) {
      this.zoomT += dt;
      const k = this.zoomT / this.zoomDur;
      if (k >= 1) {
        this.zoom = 1;
        this.zoomDur = 0;
      } else if (k < 0.4) this.zoom = 1 + this.zoomAmt * Math.sin(((k / 0.4) * Math.PI) / 2);
      else this.zoom = 1 + this.zoomAmt * Math.cos((((k - 0.4) / 0.6) * Math.PI) / 2);
    }
    this.flash = Math.max(0, this.flash - dt * 4);
    this.chroma = Math.max(0, this.chroma - dt * 2.2);
    const dimSpeed = this.dimTarget > this.dim ? 1 / 0.2 : 1 / 0.4;
    this.dim += Math.sign(this.dimTarget - this.dim) * Math.min(Math.abs(this.dimTarget - this.dim), dt * dimSpeed * 0.35);
  }

  apply(ctx: CanvasRenderingContext2D): void {
    ctx.translate(W / 2 + this.ox, H / 2 + this.oy);
    ctx.rotate(this.roll);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-W / 2, -H / 2);
  }
}
