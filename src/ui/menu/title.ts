import { DEMO, STEAM } from '../../build';
import { COLORS, H, W } from '../../present/layout';
import { SPRITES } from '../../render/spriteData';
import { artId, drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { drawBanner, drawChip, KIT, T } from '../kit';
import { by, promptWidth } from '../input';
import type { MenuScreen, Menus } from '../menus';

/**
 * THE TITLE: the logo's own marquee bulbs are the loading bar. They light one by one, clockwise from the top left,
 * while every sprite is built once (so the first fight doesn't hitch); then the sign comes on (a soft warm glow, well
 * under FLASH_CAP) and the bulbs start their chase. Behind it, the street before the night starts, dimmed.
 */

const LOAD_MIN = 1.6;
/** The logo sprite (160x44) and where its 2x2 bulbs sit, walked clockwise (the art's own loop: build-art.mjs). */
const LOGO_W = 160;
const LOGO_H = 44;
const BULBS: [number, number][] = (() => {
  const b: [number, number][] = [];
  for (let x = 3; x <= 155; x += 4) b.push([x, 3]);
  for (let y = 7; y <= 35; y += 4) b.push([155, y]);
  for (let x = 155; x >= 3; x -= 4) b.push([x, 39]);
  for (let y = 35; y >= 7; y -= 4) b.push([3, y]);
  return b;
})();
/** Bulb glass, from the art's palette: lit (white-hot centre), the art's resting off (amber), and dead (unpowered). */
const BULB_ON = ['#ffffff', '#ffe45c', '#ffe45c', '#d9a640'];
const BULB_OFF = ['#f07c1c', '#a8401a', '#a8401a', '#a8401a'];
const BULB_DEAD = ['#3b3347', '#140c1c', '#140c1c', '#140c1c'];

/**
 * Draw the REEL BRAWL marquee at an integer scale, centred on x/y. `lit` 0..1: how many bulbs are powered (the
 * loading bar); `on` 0..1: how far the sign itself has come on (dim to full); `chase`: the bulbs' chase step.
 */
export function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, o: { lit?: number; on?: number; chase?: number } = {}): void {
  if (!hasSprite('logo')) {
    drawText(ctx, 'REEL', x - 150, y, 8, COLORS.goldLight);
    drawText(ctx, 'BRAWL', x + 120, y, 8, '#ff6a5a');
    return;
  }
  const on = o.on ?? 1;
  drawSprite(ctx, artId('logo'), x, y, scale, { dim: 0.62 * (1 - on) });
  const x0 = Math.round(x - (LOGO_W * scale) / 2);
  const y0 = Math.round(y - (LOGO_H * scale) / 2);
  const lit = o.lit ?? 1;
  const n = BULBS.length;
  const chase = o.chase ?? 0;
  BULBS.forEach(([bx, by], i) => {
    // Loading: the first lit*n bulbs are powered (the art's on/off rhythm after, chasing).
    const powered = i < Math.floor(lit * n + 1e-6);
    const glass = !powered ? BULB_DEAD : lit < 1 ? BULB_ON : (i + chase) % 3 !== 2 ? BULB_ON : BULB_OFF;
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = glass[k];
      ctx.fillRect(x0 + (bx + (k % 2)) * scale, y0 + (by + (k >> 1)) * scale, scale, scale);
    }
  });
}

export class TitleScreen implements MenuScreen {
  private loadT = 0;
  private warmed = 0;
  private readonly warmList = Object.keys(SPRITES) as SpriteId[];
  private readonly scratch = document.createElement('canvas').getContext('2d');
  private ready = false;
  /** Seconds since the sign came on. */
  private onT = 0;

  constructor(private m: Menus) {}

  update(dt: number): void {
    this.loadT += dt;
    if (this.ready) this.onT += dt;
    // Build every sprite once now, so the first fight doesn't hitch.
    const ctx = this.scratch;
    for (let i = 0; i < 24 && this.warmed < this.warmList.length; i++, this.warmed++) if (ctx) drawSprite(ctx, this.warmList[this.warmed], -100, -100, 1);
    if (!this.ready && this.loadT >= LOAD_MIN && this.warmed >= this.warmList.length) this.ready = true;
  }

  private start(): void {
    if (!this.ready) return;
    this.m.sounds.fanfareJackpot();
    this.m.showMain();
  }

  pointerDown(): boolean {
    this.start();
    return true;
  }

  /** Any key starts (STEAM_READINESS S23); the press also unlocks audio. */
  key(): boolean {
    this.start();
    return true;
  }

  private progress(): number {
    return Math.min(1, Math.min(this.loadT / LOAD_MIN, this.warmed / Math.max(1, this.warmList.length)));
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const still = this.m.reduced();
    // The street before the night starts (rooms v2: the menus' street, roomMenu.ts), dimmer than the main menu's.
    ctx.fillStyle = 'rgba(8,4,14,0.62)';
    ctx.fillRect(0, 0, W, H);
    const cy = 268;
    const scale = 4;
    // The sign coming on: a warm halo in three stepped rings that fades (alpha 0.18 at most, under FLASH_CAP 0.2).
    const on = this.ready ? Math.min(1, this.onT / 0.35) : 0;
    const halo = this.ready ? Math.max(0, 0.18 * (1 - this.onT / 0.9)) : 0;
    if (halo > 0) {
      ctx.fillStyle = '#ffc94a';
      for (let r = 3; r >= 1; r--) {
        ctx.globalAlpha = halo / 3;
        ctx.fillRect(W / 2 - 320 - r * 16, cy - 88 - r * 16, 640 + r * 32, 176 + r * 32);
      }
      ctx.globalAlpha = 1;
    }
    const chase = still ? 0 : Math.floor(t * 7);
    drawLogo(ctx, W / 2, cy, scale, { lit: this.ready ? 1 : this.progress(), on, chase });
    // The tag line, then the call to start.
    drawText(ctx, 'A SLOT MACHINE ROGUELIKE', W / 2, cy + 120, T.body, COLORS.textDim, { alpha: 0.4 + 0.6 * on });
    // The demo build says so, under the logo, as it comes on.
    if (DEMO && on > 0) {
      ctx.save();
      ctx.globalAlpha *= on;
      drawChip(ctx, 'DEMO', W / 2, cy + 164, { scale: T.body, color: KIT.title });
      ctx.restore();
    }
    if (this.ready) {
      // The banner fades in with the sign, then its words breathe (2.4 s): a veil over the band, never see-through.
      const label = by({ touch: 'TAP TO PLAY', mouse: 'PRESS ANY KEY', pad: 'PRESS [A]' });
      drawBanner(ctx, label, W / 2, 520, { scale: T.head, alpha: on });
      const veil = still ? 0 : 0.42 * (0.5 - 0.5 * Math.cos(this.onT * 2.6));
      if (veil > 0.01) {
        const bw = Math.round((label.includes('[') ? promptWidth(label, T.head) : label.length * 6 * T.head) + 48);
        const bh = Math.round(7 * T.head + 18);
        ctx.fillStyle = `rgba(58,20,40,${(veil * on).toFixed(3)})`;
        ctx.fillRect(Math.round(W / 2 - bw / 2) + 3, Math.round(520 - bh / 2) + 3, bw - 6, bh - 6);
      }
    }
    if (!STEAM) drawText(ctx, DEMO ? 'DEMO. PROGRESS SAVES IN THIS BROWSER.' : 'PLAYTEST BUILD. PROGRESS SAVES IN THIS BROWSER.', W / 2, H - 30, T.small, COLORS.textDim);
  }
}
