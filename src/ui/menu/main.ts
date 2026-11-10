import { desktop, DESKTOP } from '../../build';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../../core/cabinets';
import { levelOf } from '../../core/meta';
import { demo, openStore, STORE_URL, wishlistLabel } from '../../demo';
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
    // The demo: WISHLIST between runs, where the urge rises too, not only on the run-over screens (QA DEMO-04). Greyed,
    // COMING SOON TO STEAM, until the store page exists.
    if (demo().on) {
      const wish = m.btn(wishlistLabel(), PX, y + 190, 330, 46, openStore, T.body);
      wish.enabled = STORE_URL !== null;
    }
    // SETTINGS: a quiet gear in the corner (bottom right: the pad's first press lands on the red button, not here).
    this.gear = m.btn('', W - 44, H - 40, 52, 52, () => m.showSettings(), T.body, { quiet: true });
    // COPY LAST RUN: the finished run's text, for a balance check in a chat (it survives a refresh).
    const last = cb.lastRun();
    if (last) {
      // (Bottom, between the nameplate and the menu panel: by the gear it covered NEW HERE? TRY THE TUTORIAL, QA
      // 2026-11-06; bottom left it covered THE KNIGHT SLOT MACHINE on the nameplate, demo playtest 2026-11-07.)
      const copy = m.btn('COPY LAST RUN', 730, H - 40, 200, 44, () => {
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
    // The street shows through (rooms v2: the menus stand on act 1's street, roomMenu.ts), darkened so the poster reads.
    ctx.fillStyle = 'rgba(6,2,12,0.42)';
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

  /** The poster: your Slot Machine and its hero on the sidewalk under a streetlamp, the nameplate under them. */
  private drawStage(ctx: CanvasRenderingContext2D, t: number): void {
    const id = this.hero;
    const cab = CABINETS[id];
    this.drawLamp(ctx, t);
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

  /** The streetlamp at the stage's left (rooms v2: on the street, no podium): its post on the sidewalk, the lantern
   * over the stage, its light falling in 4px stepped bands (no gradient) to a stepped pool where the machine stands,
   * and the rain caught in it. Drawn on the 2px grid with the portraits' outline. */
  private drawLamp(ctx: CanvasRenderingContext2D, t: number): void {
    const p = 2;
    const r = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    const lx = 92;
    const ly = 236;
    const foot = SY + 18;
    // the light: a cone from the lantern down to the pool, widening in 4px bands
    const top = ly + 24;
    for (let y = top; y < SY + 4; y += 4) {
      const k = (y - top) / (SY + 4 - top);
      const cx = Math.round((lx + 120 + (SX - lx - 120) * k) / 2) * 2;
      const hw = Math.round((30 + 230 * k) / 4) * 4;
      r(cx - hw, y, hw * 2, 4, `rgba(255,224,150,${(0.03 + 0.06 * k).toFixed(3)})`);
    }
    // the pool on the sidewalk: three stepped ellipses, then the stage's contact shadow
    for (const [rx, a] of [[300, 0.07], [230, 0.07], [150, 0.08]] as const) {
      for (let y = -32; y < 32; y += 4) {
        const ry = 32;
        const w = Math.round((rx * Math.sqrt(Math.max(0, 1 - Math.pow((y + 2) / ry, 2)))) / 4) * 4;
        r(SX - w, SY + y, w * 2, 4, `rgba(255,224,150,${a})`);
      }
    }
    r(SX - 200, SY + 2, 400, 4, 'rgba(0,0,0,0.25)');
    // rain in the light: a few streaks inside the cone (still with MOTION: REDUCED)
    ctx.fillStyle = 'rgba(200,210,240,0.28)';
    for (let i = 0; i < 18; i++) {
      const fy = (i * 97 + t * 260) % (SY - top);
      const k = fy / (SY - top);
      const cx = lx + 120 + (SX - lx - 120) * k;
      const x = Math.round((cx + ((i * 61) % 200) - 100 - fy * 0.1) / 2) * 2;
      ctx.fillRect(x, Math.round((top + fy) / 2) * 2, p, 8);
    }
    // the post: an outlined iron pole with a base, an arm out to the lantern
    r(lx - 8, ly, 16, foot - ly, COLORS.outline);
    r(lx - 4, ly + 2, 8, foot - ly - 2, '#3b3347');
    r(lx - 4, ly + 2, 2, foot - ly - 2, '#5a5068');
    r(lx - 14, foot - 26, 28, 26, COLORS.outline);
    r(lx - 12, foot - 24, 24, 24, '#2a2436');
    r(lx - 12, foot - 24, 24, 4, '#4a4058');
    // the arm and the lantern over the stage
    r(lx - 4, ly - 4, 124, 10, COLORS.outline);
    r(lx, ly - 2, 118, 6, '#3b3347');
    r(lx, ly - 2, 118, 2, '#5a5068');
    r(lx + 96, ly + 4, 48, 24, COLORS.outline);
    r(lx + 100, ly + 6, 40, 8, '#3b3347');
    r(lx + 102, ly + 14, 36, 8, '#ffe08a');
    r(lx + 106, ly + 14, 28, 4, '#fff6c8');
  }
}
