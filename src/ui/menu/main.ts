import { desktop, DESKTOP } from '../../build';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../../core/cabinets';
import { levelOf } from '../../core/meta';
import { shownTitle } from '../../core/profile';
import { COLORS, H, W } from '../../present/layout';
import { artId, drawPortrait, drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import type { Button } from '../button';
import { drawChip, drawPanel, drawWell, KIT, T } from '../kit';
import type { MenuScreen, Menus } from '../menus';
import { heroSprite } from './data';
import { drawLogo } from './title';

/**
 * THE MAIN MENU as the game's box art: your Slot Machine and its hero staged big on a podium under a spotlight, the
 * marquee above, and the menu in one panel at the right: one red button (CONTINUE when a run is saved, else NEW RUN),
 * TUTORIAL, PROFILE and HISCORES. SETTINGS is a quiet gear in the corner.
 */

/** The menu panel (right). */
const PX = 1000;
const PW = 380;
/** The stage (left): the podium's centre. */
const SX = 400;
const SY = 600;

/** A 12x12 gear, drawn in the frame's gold (SETTINGS). */
const GEAR = [
  '.....XX.....',
  '..X.XXXX.X..',
  '.XXXXXXXXXX.',
  '..XXX..XXX..',
  '.XXX....XXX.',
  'XXX......XXX',
  'XXX......XXX',
  '.XXX....XXX.',
  '..XXX..XXX..',
  '.XXXXXXXXXX.',
  '..X.XXXX.X..',
  '.....XX.....',
];

export function drawGear(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string): void {
  const x0 = Math.round(cx - 6 * s);
  const y0 = Math.round(cy - 6 * s);
  const ink = (dx: number, dy: number, c: string) => {
    ctx.fillStyle = c;
    GEAR.forEach((row, y) => [...row].forEach((ch, x) => ch === 'X' && ctx.fillRect(x0 + x * s + dx, y0 + y * s + dy, s, s)));
  };
  for (const [dx, dy] of [[-s, 0], [s, 0], [0, -s], [0, s]]) ink(dx, dy, COLORS.outline);
  ink(0, 0, color);
}

export class MainScreen implements MenuScreen {
  private hero: CabinetId;
  private gear: Button;

  constructor(private m: Menus) {
    this.hero = this.featured();
    const cb = m.cb;
    const first = !cb.tutorialDone();
    const saved = cb.savedRun();
    let y = 300;
    if (saved) {
      // The poster already shows the saved run's machine, so the button only names the act (the long label overflowed).
      const act = /ACT \d+/.exec(saved)?.[0];
      const cont = m.btn(act ? `CONTINUE ${act}` : 'CONTINUE', PX, y, 330, 66, () => cb.onContinue(), T.head, { primary: true, idlePulse: true });
      void cont;
      y += 76;
      let armed = 0;
      const nr = m.btn('NEW RUN', PX, y, 330, 54, () => {
        if (armed && performance.now() - armed > 400) return cb.onNewRun();
        if (armed) return;
        armed = performance.now();
        nr.label = 'THE SAVED RUN ENDS. SURE?';
        nr.opts.textScale = T.body;
        m.sounds.fizzle();
        setTimeout(() => {
          armed = 0;
          nr.label = 'NEW RUN';
          nr.opts.textScale = T.head;
        }, 2500);
      }, T.head);
      m.icons.set(nr, 'iconNewRun');
      y += 64;
    } else {
      const nr = m.btn('NEW RUN', PX, y, 330, 66, () => cb.onNewRun(), T.head, { primary: true, idlePulse: !first });
      m.icons.set(nr, 'iconNewRun');
      y += 80;
    }
    // TUTORIAL breathes the first time here, and asks before it replaces a saved run.
    const tut = m.btn('TUTORIAL', PX, y, 330, 54, () => cb.onTutorial(), T.head, { idlePulse: first && !saved });
    m.icons.set(tut, 'iconTutorial');
    m.guardSaved(tut);
    m.icons.set(m.btn('PROFILE', PX, y + 64, 330, 54, () => m.showProgress(), T.head), 'iconCollection');
    m.icons.set(m.btn('HISCORES', PX, y + 128, 330, 54, () => m.showHiscores(), T.head), 'iconHiscores');
    // SETTINGS: a quiet gear in the corner (bottom right: the pad's first press lands on the red button, not here).
    this.gear = m.btn('', W - 44, H - 40, 52, 52, () => m.showSettings(), T.body, { quiet: true });
    // COPY LAST RUN: the finished run's text, for a balance check in a chat (it survives a refresh).
    const last = cb.lastRun();
    if (last) {
      const copy = m.btn('COPY LAST RUN', W - 200, H - 40, 220, 44, () => {
        void navigator.clipboard?.writeText(last).then(
          () => (copy.label = 'COPIED!'),
          () => (copy.label = 'COPY FAILED'),
        );
      }, T.small, { quiet: true });
    }
    // Desktop: a way out (STEAM_READINESS S5). Browsers close the tab.
    if (DESKTOP) m.btn('QUIT', 84, H - 40, 120, 44, () => desktop()?.quit(), T.small, { quiet: true });
    m.slideIn(m.buttons.filter((b) => b !== this.gear));
  }

  /** The machine on the poster: the saved run's, else your last run's, else the first one you have. */
  private featured(): CabinetId {
    const open = this.m.unlocked();
    const saved = this.m.cb.savedCabinet?.();
    if (saved && CABINETS[saved]) return saved;
    const last = [...this.m.profile().runs].sort((a, b) => b.at - a.at)[0]?.cabinet;
    if (last && CABINETS[last] && open.has(last)) return last;
    return CABINET_ORDER.find((id) => open.has(id)) ?? 'knight';
  }

  /** A menu button's icon, at its left (over it, scaled with its press). */
  static buttonIcon(ctx: CanvasRenderingContext2D, b: Button, icon: string): void {
    if (!hasSprite(icon)) return;
    // A long label (a SURE? confirm) needs the whole button: the icon steps aside.
    if (textWidth(b.label, b.opts.textScale ?? T.body) > b.w - 110) return;
    drawSprite(ctx, artId(icon), b.x - (b.w / 2 - 36) * b.scale, b.y, 2 * b.scale);
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const still = this.m.reduced();
    // The floor shows through, darkened so the poster reads.
    ctx.fillStyle = 'rgba(6,2,12,0.6)';
    ctx.fillRect(0, 0, W, H);
    this.drawStage(ctx, still ? 0 : t);
    drawLogo(ctx, SX, 98, 3, { chase: still ? 0 : Math.floor(t * 7) });
    drawText(ctx, 'A SLOT MACHINE ROGUELIKE', SX, 188, T.body, COLORS.textDim);
    this.drawPanelCard(ctx, t);
  }

  drawOver(ctx: CanvasRenderingContext2D): void {
    const g = this.gear;
    drawGear(ctx, g.x, g.y, 2 * g.scale, g.hover ? COLORS.goldLight : COLORS.gold);
  }

  /** The menu's home: one panel with your badge on top (name, level, title, the XP bar). */
  private drawPanelCard(ctx: CanvasRenderingContext2D, t: number): void {
    const top = 168;
    const bottom = this.m.buttons.reduce((b, x) => (x !== this.gear && x.x === PX ? Math.max(b, x.y + x.h / 2) : b), 0) + 28;
    drawPanel(ctx, PX - PW / 2, top, PW, bottom - top);
    const p = this.m.profile();
    const lv = levelOf(p.xp);
    drawText(ctx, p.name || 'PLAYER', PX - PW / 2 + 24, top + 30, T.body, KIT.title, { align: 'left' });
    drawChip(ctx, `LV ${lv.level}`, PX + PW / 2 - 52, top + 30, { scale: T.small });
    drawText(ctx, shownTitle(p), PX - PW / 2 + 24, top + 56, T.small, COLORS.textDim, { align: 'left' });
    // XP bar: a well with a gold fill.
    const bw = PW - 48;
    const bx = PX - bw / 2;
    drawWell(ctx, bx, top + 72, bw, 14);
    const fill = Math.round(((bw - 4) * lv.into) / Math.max(1, lv.need));
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(bx + 2, top + 74, fill, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx + 2, top + 74, fill, 3);
    if (!this.m.cb.tutorialDone()) drawText(ctx, 'NEW HERE? TRY THE TUTORIAL', PX, bottom + 30, T.small, KIT.title, { alpha: 0.65 + 0.35 * Math.sin(t * 4) });
  }

  /** The poster: a spotlight on a podium, the Slot Machine on it and its hero in front, the nameplate under them. */
  private drawStage(ctx: CanvasRenderingContext2D, t: number): void {
    const id = this.hero;
    const cab = CABINETS[id];
    // The spotlight: a cone of 4px bands from above, widening (stepped, no smooth gradient).
    for (let y = 0; y < SY + 10; y += 4) {
      const k = y / (SY + 10);
      const hw = Math.round((70 + 240 * k) / 4) * 4;
      ctx.fillStyle = `rgba(255,230,170,${(0.04 + 0.07 * k).toFixed(3)})`;
      ctx.fillRect(SX - hw, y, hw * 2, 4);
    }
    this.drawPodium(ctx);
    // The machine on the podium, slightly right; the hero in front, left.
    const mx = SX + 70;
    const msprite = (hasSprite(cab.sprite) ? cab.sprite : 'cabinetKnight') as SpriteId;
    drawSprite(ctx, msprite, mx, SY - 6 - 160, 5);
    const bob = Math.round(Math.sin(t * 1.7) * 3);
    drawPortrait(ctx, heroSprite(id), SX - 112, SY - 92 + bob, 28 / 3);
    // The nameplate: a panel across the podium's front.
    const nw = 340;
    drawPanel(ctx, SX - nw / 2, SY + 14, nw, 74);
    drawText(ctx, cab.hero, SX, SY + 40, T.head, KIT.title);
    drawText(ctx, `THE ${cab.name} SLOT MACHINE`, SX, SY + 68, T.small, COLORS.textDim);
  }

  /** A round display podium in 4px steps: a lit top face with a gold rim, a dark front. */
  private drawPodium(ctx: CanvasRenderingContext2D): void {
    const rx = 236;
    const ry = 30;
    const px = 4;
    const band = (cy: number, rr: number, color: string) => {
      for (let y = -ry; y < ry; y += px) {
        const w = Math.round((rr * Math.sqrt(1 - Math.pow((y + px / 2) / ry, 2))) / px) * px;
        ctx.fillStyle = color;
        ctx.fillRect(SX - w, cy + y, w * 2, px);
      }
    };
    // A short drum: its shadow, the front (outline, maroon, a gold trim line), then the top (gold rim, plum face).
    const top = SY - 4;
    const foot = SY + 20;
    band(foot + 12, rx + 12, 'rgba(0,0,0,0.4)');
    band(foot, rx + 3, COLORS.outline);
    ctx.fillRect(SX - rx - 3, top, (rx + 3) * 2, foot - top);
    band(foot, rx, '#3a1428');
    ctx.fillStyle = '#3a1428';
    ctx.fillRect(SX - rx, top, rx * 2, foot - top);
    ctx.fillStyle = '#5a1e34';
    ctx.fillRect(SX - rx, top + 8, rx * 2, 4);
    band(top, rx + 3, COLORS.outline);
    band(top, rx, KIT.frame);
    band(top - 2, rx - 6, '#2c2140');
    band(top - 4, rx - 20, '#352850');
  }
}
