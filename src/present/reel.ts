import { drawText } from '../render/text';
import type { Enh, SymbolId } from '../core/config';
import { wrap } from '../core/strip';
import { drawSprite, type SpriteId, artId, hasSprite } from '../render/sprites';
import type { Clock } from './clock';
import { backOut, linear, sineIn, sineOut } from './ease';
import { ART_SCALE, COLORS, PITCH } from './layout';

/** Display-side copy of a strip cell. Diverges from game state until the animation catches up. */
export interface CellView {
  symbol: SymbolId;
  slimed: boolean;
  /** 0..1 visual goo coverage (drips in on splat, evaporates on cleanse). */
  goo: number;
  /** Per-cell white flash (cleanse reveal). */
  flash: number;
  /** Stolen by a thief: 0..1 fade from symbol to an empty hole. */
  stolen?: number;
  /** Freshly inserted (rock): punch-in 0..1. */
  pop?: number;
  /** Gilded for the run. */
  enh?: Enh;
  /** Tier II gild. */
  tier?: 2;
  /** A Bomber's bomb: turns left on the fuse (0/undefined = none). */
  bomb?: number;
  /** 0..1 bomb pop-in. */
  bombPop?: number;
}

export const ENH_SPRITE: Record<Enh, SpriteId> = {
  gold: 'enhGold',
  keen: 'enhKeen',
  charged: 'enhCharged',
  spiked: 'enhSpiked',
  vamp: artId('enhVamp'),
  lucky: artId('enhLucky'),
  blaze: artId('enhBlaze'),
};

/** Per visible-row cosmetic state (row 0 = top). */
export interface RowFx {
  punch: number;
  glow: number;
  glowColor: string;
  dim: number;
  flash: number;
  /** Vertical offset in px (lift before launching as a projectile). */
  lift: number;
  wobble: number;
  alpha: number;
}

export const newRowFx = (): RowFx => ({ punch: 1, glow: 0, glowColor: '#ffe08a', dim: 0, flash: 0, lift: 0, wobble: 0, alpha: 1 });

export interface SpinPlan {
  target: number;
  windup: boolean;
  /** Seconds after spin start when deceleration begins. */
  decelAt: number;
  decelDur: number;
  frozen?: boolean;
}

export const SPIN = {
  windup: 0.08,
  accel: 0.18,
  decel: 0.3,
  nearMissDecel: 0.7,
  minSpin: 0.45,
  stagger: 0.18,
  /** Cells per second at full speed (1150 px/s at a 96px pitch ≈ juice doc 2400px/s @ 200px). */
  maxSpeed: 1150 / PITCH,
  overshoot: 6,
};

export class ReelView {
  stop: number;
  /** Scroll position in cells; content moves down as q grows. */
  q = 0;
  spinning = false;
  blur = 0;
  squash = 1;
  bounce = 0;
  rows: RowFx[] = [newRowFx(), newRowFx(), newRowFx()];
  private tape: (k: number) => CellView;

  constructor(
    readonly cells: CellView[],
    stop: number,
  ) {
    this.stop = stop;
    this.tape = this.staticTape();
  }

  private staticTape(): (k: number) => CellView {
    return (k) => this.cells[wrap(this.stop - k, this.cells.length)];
  }

  /** The display cell on a visible row while idle. */
  cellAtRow(row: number): CellView {
    return this.cells[wrap(this.stop + row - 1, this.cells.length)];
  }

  indexAtRow(row: number): number {
    return wrap(this.stop + row - 1, this.cells.length);
  }

  /** Runs the 6-phase spin. Resolves the instant the reel reaches rest (before the bounce). */
  spin(plan: SpinPlan, clock: Clock, onStop: () => void): Promise<void> {
    if (plan.frozen) {
      // Frozen solid: the reel doesn't move. It 'lands' when its turn in the stagger comes.
      return clock.wait(plan.decelAt + plan.decelDur).then(() => {
        this.stop = plan.target;
        onStop();
      });
    }
    const len = this.cells.length;
    const start = this.stop;
    const tw = plan.windup ? SPIN.windup : 0;
    const Ta = SPIN.accel;
    const Td = plan.decelDur;
    const Tc = Math.max(0.05, plan.decelAt - tw - Ta);
    // Distance is derived from timing, then rounded to a whole number of cells so the
    // reveal lands exactly on a pitch boundary; speed is nudged to fit (juice §1).
    const n = Math.max(6, Math.round(SPIN.maxSpeed * (Ta / 3 + Tc + Td / 3)));
    const v = n / (Ta / 3 + Tc + Td / 3);
    const Da = (v * Ta) / 3;
    const Dc = v * Tc;
    const Dd = (v * Td) / 3;
    const fillers = Array.from({ length: n + 4 }, () => this.cells[Math.floor(Math.random() * len)]);
    this.tape = (k) => {
      if (k <= 1) return this.cells[wrap(start - k, len)];
      if (k >= n - 1) return this.cells[wrap(plan.target - (k - n), len)];
      return fillers[k];
    };
    this.spinning = true;
    this.q = 0;
    for (const r of this.rows) Object.assign(r, newRowFx());

    const total = tw + Ta + Tc + Td;
    let t = 0;
    return new Promise((resolve) => {
      const land = () => {
        this.q = 0;
        this.blur = 0;
        this.squash = 1;
        this.stop = plan.target;
        this.tape = this.staticTape();
        this.spinning = false;
        onStop();
        this.landingJuice(clock);
        resolve();
      };
      clock.add({
        update: (dt) => {
          t += dt;
          if (t < tw) {
            const u = t / tw;
            this.squash = u < 0.5 ? 1 - 0.04 * sineOut(u * 2) : 0.96 + 0.04 * sineIn((u - 0.5) * 2);
            return false;
          }
          this.squash = 1;
          const ta = t - tw;
          if (ta < Ta) {
            const u = ta / Ta;
            this.q = Da * u * u * u;
            this.blur = u;
          } else if (ta < Ta + Tc) {
            this.q = Da + v * (ta - Ta);
            this.blur = 1;
          } else if (t < total) {
            const u = (ta - Ta - Tc) / Td;
            this.q = Da + Dc + Dd * (1 - (1 - u) ** 3);
            this.blur = Math.max(0, 1 - u * 2.5);
          } else {
            land();
            return true;
          }
          return false;
        },
        finish: land,
      });
    });
  }

  /** Cosmetic tail: 6px overshoot + back-out settle, and a per-symbol punch (never the strip). */
  private landingJuice(clock: Clock): void {
    void clock
      .tween({ from: 0, to: SPIN.overshoot, dur: 0.03, ease: linear, onUpdate: (v) => (this.bounce = v) })
      .then(() => clock.tween({ from: SPIN.overshoot, to: 0, dur: 0.15, ease: backOut(2.2), onUpdate: (v) => (this.bounce = v) }));
    for (const r of this.rows) {
      void clock
        .tween({ from: 1, to: 1.04, dur: 0.05, ease: sineOut, onUpdate: (v) => (r.punch = v) })
        .then(() => clock.tween({ from: 1.04, to: 1, dur: 0.06, ease: sineIn, onUpdate: (v) => (r.punch = v) }));
    }
  }

  /** Draw into a clip rect already set by the machine; x = reel center, midY = middle-row center. */
  draw(ctx: CanvasRenderingContext2D, x: number, midY: number, time: number): void {
    const q = this.q;
    const k0 = Math.floor(q) - 2;
    const k1 = Math.ceil(q) + 2;
    for (let k = k0; k <= k1; k++) {
      const y = midY + (q - k) * PITCH + this.bounce;
      if (y < midY - PITCH * 2 || y > midY + PITCH * 2) continue;
      const cell = this.tape(k);
      const row = this.spinning ? -1 : 1 - k;
      const fx = row >= 0 && row < 3 ? this.rows[row] : null;
      drawCell(ctx, cell, x, y + (fx?.lift ?? 0), fx, this.blur, this.squash, time);
    }
  }
}

export function drawCell(
  ctx: CanvasRenderingContext2D,
  cell: CellView,
  x: number,
  y: number,
  fx: RowFx | null,
  blur: number,
  squash: number,
  time: number,
): void {
  const punch = fx?.punch ?? 1;
  const alpha = (fx?.alpha ?? 1) * (1 - 0.3 * blur);
  const sy = squash * (1 + 0.35 * blur) * punch;
  const sx = punch * (1 + (fx?.wobble ?? 0) * Math.sin(time * 40) * 0.08);

  // Soft drop shadow: symbols float on the background, no tiles (juice §7).
  if (blur < 0.5 && alpha > 0.05) {
    ctx.globalAlpha = 0.35 * alpha;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + 36 * punch, 30 * punch, 7 * punch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (fx && fx.glow > 0) {
    ctx.save();
    ctx.globalAlpha = fx.glow;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 8, x, y, 52 * punch);
    g.addColorStop(0, fx.glowColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, y - 60, 120, 120);
    ctx.restore();
  }

  const stolen = cell.stolen ?? 0;
  if (stolen > 0) {
    // An empty hole where a symbol used to be.
    ctx.save();
    ctx.globalAlpha = stolen * alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 30, y - 30, 60, 60);
    ctx.strokeStyle = 'rgba(180,160,220,0.35)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 30, y - 30, 60, 60);
    ctx.restore();
    if (stolen >= 1) return;
  }
  const slimed = cell.slimed || cell.goo > 0;
  const dim = Math.min(1, (fx?.dim ?? 0) + (cell.goo > 0 ? 0.45 * cell.goo : 0));
  const flash = Math.max(fx?.flash ?? 0, cell.flash);
  const pop = cell.pop ?? 1;
  drawSprite(ctx, cell.symbol as SpriteId, x, y, ART_SCALE, { sx: sx * pop, sy: sy * pop, alpha: alpha * (1 - stolen), dim, flash });
  // Gilded cells wear their enhancement (shimmering gently).
  if (cell.enh && !cell.slimed) {
    const shimmer = 0.85 + 0.15 * Math.sin(time * 4 + x * 0.05 + y * 0.03);
    drawSprite(ctx, ENH_SPRITE[cell.enh], x, y, ART_SCALE, { sx: sx * pop, sy: sy * pop, alpha: alpha * (1 - stolen) * shimmer, dim });
    if (cell.tier === 2 && hasSprite('tier2Frame')) drawSprite(ctx, artId('tier2Frame'), x, y, ART_SCALE, { sx: sx * pop, sy: sy * pop, alpha: alpha * (1 - stolen), dim });
    if (cell.tier === 2) {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x + 12, y - 34, 22, 16);
      drawText(ctx, 'II', x + 23, y - 26, 1.5, COLORS.goldLight, { alpha });
    }
  }

  // Bombs sit on top of the symbol with their fuse count ticking in the corner.
  if (cell.bomb && cell.bomb > 0) {
    const bp = cell.bombPop ?? 1;
    const urgent = cell.bomb <= 1;
    const pulse = urgent ? 1 + 0.12 * Math.sin(time * 18) : 1;
    drawSprite(ctx, artId('bombOverlay'), x, y, ART_SCALE, { sx: sx * bp * pulse, sy: sy * bp * pulse, alpha });
    if (urgent) {
      ctx.save();
      ctx.globalAlpha = (0.25 + 0.15 * Math.sin(time * 18)) * alpha;
      ctx.fillStyle = '#ff3a2e';
      ctx.fillRect(x - 32, y - 32, 64, 64);
      ctx.restore();
    }
    if (bp >= 1) {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - 34, y - 34, 22, 22);
      drawText(ctx, String(cell.bomb), x - 23, y - 23, 2, urgent ? '#ff5a4a' : '#ffd23f');
    }
  }

  if (slimed && cell.goo > 0) {
    // Goo drips in from the top: clip its height by coverage.
    const h = 16 * ART_SCALE * sy;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 50, y - h / 2 - 4, 100, (h + 8) * cell.goo);
    ctx.clip();
    drawSprite(ctx, 'goo', x, y, ART_SCALE, { sx, sy, alpha, dim: fx?.dim ?? 0, flash });
    ctx.restore();
  }
}
