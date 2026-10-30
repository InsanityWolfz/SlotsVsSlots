import { STEAM, VERSION } from '../../build';
import type { SettingKey } from '../../game';
import { COLORS } from '../../present/layout';
import { artId, drawSprite, hasSprite } from '../../render/sprites';
import { drawText } from '../../render/text';
import type { Button } from '../button';
import { drawChip, drawPanel, KIT, T } from '../kit';
import type { MenuScreen, Menus } from '../menus';
import { Lifts } from './lift';

/**
 * SETTINGS, grouped: SOUND (each volume a row of 10 casino chips you fill, and MUTE), DISPLAY, ACCESSIBILITY
 * (LIGHTNING, MOTION, SCREEN SHAKE) and the CONTROLS. A toggle is a bulb, lit or dark, with its value. The version
 * line and RESET SAVE (two presses) sit at the foot. Everything reads its state live (M mutes and F11 goes full
 * screen outside the menu).
 */
const LX = 60;
const LW = 560;
const RX = 660;
const RW = 560;
const ROW_H = 46;
const CHIP_PITCH = 30;
/** The panels' tops (two columns: SOUND, DISPLAY, SAVE | ACCESSIBILITY, CONTROLS; both end at FOOT). */
const SOUND_Y = 118;
const DISPLAY_Y = 394;
const SAVE_Y = 524;
const ACCESS_Y = 118;
const CONTROLS_Y = 348;
const FOOT = 640;

interface Toggle {
  b: Button;
  label: string;
  get: () => boolean;
  /** The value's word when on and off. */
  on: string;
  off: string;
}

/** A 7x9 bulb: glass over a socket. */
const BULB = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '..SSS..', '..SSS..'];
function drawBulb(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, lit: boolean): void {
  const x0 = Math.round(cx - 3.5 * s);
  const y0 = Math.round(cy - 4.5 * s);
  if (lit) {
    // A faint warm halo round the glass, in art pixels (a stepped disc, no gradient).
    ctx.fillStyle = 'rgba(255,201,74,0.16)';
    const gx = x0 + 3.5 * s;
    const gy = y0 + 3.5 * s;
    for (const [hw, hh] of [[6, 2], [5, 4], [4, 5], [2, 6]]) ctx.fillRect(gx - hw * s, gy - hh * s, hw * 2 * s, hh * 2 * s);
  }
  BULB.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x0 + x * s - s, y0 + y * s, s * 3, s);
      ctx.fillRect(x0 + x * s, y0 + y * s - s, s, s * 3);
    }),
  );
  BULB.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      let c: string;
      if (ch === 'S') c = (x + y) % 2 ? '#8b9bb4' : '#4f5b74';
      else if (!lit) c = x <= 2 && y <= 2 ? '#4a4058' : '#2a2238';
      else c = x >= 2 && x <= 3 && y >= 1 && y <= 3 ? '#ffffff' : y >= 5 || x >= 5 ? '#ffc94a' : '#ffe45c';
      ctx.fillStyle = c;
      ctx.fillRect(x0 + x * s, y0 + y * s, s, s);
    }),
  );
}

export class SettingsScreen implements MenuScreen {
  private toggles: Toggle[] = [];
  private vols: { k: SettingKey; label: string; chips: Button[]; y: number }[] = [];
  private lifts = new Lifts();
  private reset: Button | null = null;
  private resetArmed = 0;

  constructor(
    private m: Menus,
    midRun: boolean,
    back: () => void,
  ) {
    const cb = m.cb;
    m.header(back);
    const vols: [SettingKey, string][] = [
      ['master', 'MASTER'],
      ['music', 'MUSIC'],
      ['sfx', 'SOUND FX'],
    ];
    const sy = SOUND_Y + 50;
    this.vols = vols.map(([k, label], i) => {
      const y = sy + i * ROW_H;
      const chips = Array.from({ length: 10 }, (_, c) =>
        m.hit(LX + LW - 24 - (9 - c) * CHIP_PITCH - 14, y, 28, 40, () => {
          // Pressing the top lit chip again empties the row (to 0); any other sets the level.
          const cur = cb.setting(k) as number;
          cb.setSetting(k, cur === c + 1 && c === 0 ? 0 : c + 1);
          if (k === 'master' && cb.muted()) cb.setMuted(false);
          m.sounds.coin(1);
        }),
      );
      return { k, label, chips, y };
    });
    const row = (x: number, w: number, y: number, label: string, get: () => boolean, set: (on: boolean) => void, on: string, off: string) => {
      const b = m.hit(x + w / 2, y, w - 32, 40, () => set(!get()));
      this.toggles.push({ b, label, get, on, off });
    };
    row(LX, LW, sy + 3 * ROW_H, 'MUTE', () => cb.muted(), (v) => cb.setMuted(v), 'ON', 'OFF');
    row(LX, LW, DISPLAY_Y + 42, 'FULLSCREEN', () => cb.setting('fullscreen') as boolean, (v) => cb.setSetting('fullscreen', v), 'ON', 'OFF');
    // A lit bulb: the gold word is what's on (SOFT lightning, REDUCED motion, screen shake ON).
    row(RX, RW, sy, 'LIGHTNING', () => cb.softLightning(), (v) => cb.setSoftLightning(v), 'SOFT', 'FULL');
    row(RX, RW, sy + ROW_H, 'MOTION', () => cb.setting('motion') as boolean, (v) => cb.setSetting('motion', v), 'REDUCED', 'FULL');
    row(RX, RW, sy + 2 * ROW_H, 'SCREEN SHAKE', () => cb.setting('shake') as boolean, (v) => cb.setSetting('shake', v), 'ON', 'OFF');
    if (!midRun) {
      const reset = m.btn('RESET SAVE', LX + LW - 24 - 92, SAVE_Y + 46, 184, 40, () => this.pressReset(), T.body, { quiet: true });
      this.reset = reset;
    }
    m.slideIn(m.buttons.filter((b) => b.label !== 'BACK' && !this.vols.some((v) => v.chips.includes(b)) && !this.toggles.some((t) => t.b === b)));
  }

  private pressReset(): void {
    const reset = this.reset;
    if (!reset) return;
    if (performance.now() - this.resetArmed < 400) return;
    if (!this.resetArmed) {
      this.resetArmed = performance.now();
      // Armed: it turns into the red button for a moment, so the second press is a clear choice.
      reset.label = 'SURE? PRESS AGAIN';
      reset.opts.primary = true;
      reset.opts.quiet = false;
      this.m.sounds.fizzle();
      setTimeout(() => {
        if (this.m.mode !== 'settings') return;
        this.resetArmed = 0;
        reset.label = 'RESET SAVE';
        reset.opts.primary = false;
        reset.opts.quiet = true;
      }, 2500);
      return;
    }
    this.m.cb.onReset();
    this.m.showMain();
  }

  update(dt: number): void {
    this.lifts.update(dt, this.toggles.map((t) => t.b));
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    this.m.drawHeader(ctx, 'SETTINGS');
    drawPanel(ctx, LX, SOUND_Y, LW, 230, { title: 'SOUND' });
    drawPanel(ctx, LX, DISPLAY_Y, LW, 84, { title: 'DISPLAY' });
    drawPanel(ctx, LX, SAVE_Y, LW, FOOT - SAVE_Y, { title: 'YOUR SAVE' });
    drawPanel(ctx, RX, ACCESS_Y, RW, 184, { title: 'ACCESSIBILITY' });
    drawPanel(ctx, RX, CONTROLS_Y, RW, FOOT - CONTROLS_Y, { title: 'CONTROLS' });
    const muted = this.m.cb.muted();
    for (const v of this.vols) {
      drawText(ctx, v.label, LX + 28, v.y, T.body, COLORS.text, { align: 'left' });
      const level = this.m.cb.setting(v.k) as number;
      v.chips.forEach((b, c) => {
        const on = c < level;
        const lift = b.hover ? 3 : 0;
        if (b.hover) {
          ctx.fillStyle = 'rgba(255,224,138,0.18)';
          ctx.fillRect(b.x - 14, b.y - 20, 28, 40);
        }
        if (hasSprite('betChip')) drawSprite(ctx, artId('betChip'), b.x, b.y - lift, 2, on ? { dim: muted && v.k === 'master' ? 0.5 : 0 } : { variant: 'black', alpha: 0.55 });
      });
    }
    for (const tg of this.toggles) this.drawToggle(ctx, tg);
    this.drawControls(ctx);
    // The version line and RESET SAVE.
    drawText(ctx, STEAM ? `REEL BRAWL V${VERSION.toUpperCase()}` : `PLAYTEST BUILD V${VERSION.toUpperCase()}`, LX + 28, SAVE_Y + 46, T.small, COLORS.textDim, { align: 'left' });
    if (this.reset) drawText(ctx, 'RESET ERASES YOUR UNLOCKS, COLLECTION AND SCORES', LX + 28, SAVE_Y + 90, T.small, '#ff8a7a', { align: 'left', alpha: this.resetArmed ? 1 : 0.75 });
    else drawText(ctx, 'PROGRESS SAVES AS YOU PLAY', LX + 28, SAVE_Y + 90, T.small, COLORS.textDim, { align: 'left' });
    void t;
  }

  private drawToggle(ctx: CanvasRenderingContext2D, tg: Toggle): void {
    const b = tg.b;
    const lit = tg.get();
    const lift = this.lifts.lift(b);
    if (lift > 0.02) {
      ctx.fillStyle = `rgba(255,224,138,${(0.1 * lift).toFixed(3)})`;
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
    }
    drawText(ctx, tg.label, b.x - b.w / 2 + 12, b.y, T.body, COLORS.text, { align: 'left' });
    const right = b.x + b.w / 2 - 12;
    drawText(ctx, lit ? tg.on : tg.off, right - 40, b.y, T.body, lit ? KIT.title : COLORS.textDim, { align: 'right' });
    drawBulb(ctx, right - 12, b.y - 2, 3, lit);
  }

  /** The keys, as chips with what they do. */
  private drawControls(ctx: CanvasRenderingContext2D): void {
    const keys: [string, string][] = [
      ['SPACE', 'SPIN'],
      ['Q W E', 'HOLD A REEL'],
      ['A', 'AUTO'],
      ['1-4', 'SPEED'],
      ['M', 'MUTE'],
      ['ESC', 'PAUSE, BACK'],
      ['F11', 'FULLSCREEN'],
      ['ARROWS', 'MOVE, ENTER PICKS'],
    ];
    keys.forEach(([k, what], i) => {
      const col = i % 2;
      const x = RX + 28 + col * 268;
      const y = CONTROLS_Y + 56 + Math.floor(i / 2) * 64;
      const w = drawChip(ctx, k, x + (k.length * 6 * T.small + 18) / 2, y, { scale: T.small });
      drawText(ctx, what, x + w + 10, y, T.small, COLORS.text, { align: 'left' });
    });
  }
}
