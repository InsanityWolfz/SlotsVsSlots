import type { Sounds } from '../audio/sounds';
import type { CabinetId } from '../core/cabinets';
import type { Profile } from '../core/profile';
import type { SettingKey } from '../game';
import type { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { H, W } from '../present/layout';
import { Button, type ButtonOpts } from './button';
import { drawTitle, T } from './kit';
import { HiscoresScreen } from './menu/hiscores';
import { MainScreen } from './menu/main';
import { ProfileScreen, type ProfileTab } from './menu/profile';
import { SettingsScreen } from './menu/settings';
import { TitleScreen } from './menu/title';

export { CHARM_INFO, collectionTotal, heroSprite, RELIC_ORDER } from './menu/data';

/**
 * Out-of-run screens: the TITLE (warms the sprite cache while the logo's bulbs light, then asks for a key so audio can
 * start), the MAIN MENU, PROFILE (Collection, Trophies, Stats as tabs), SETTINGS and HISCORES. This class is the host:
 * the mode, the buttons, input and the frame; each screen lives in `menu/` and draws itself.
 */
export type MenuMode = 'none' | 'loading' | 'main' | 'progress' | 'settings' | 'collection' | 'hiscores' | 'trophies';

export interface MenuCallbacks {
  onNewRun: () => void;
  onTutorial: () => void;
  setTitle: (title: string) => void;
  setTrim: (id: string) => void;
  onReset: () => void;
  tutorialDone: () => boolean;
  /** SOFT LIGHTNING option. */
  softLightning: () => boolean;
  setSoftLightning: (on: boolean) => void;
  muted: () => boolean;
  setMuted: (on: boolean) => void;
  /** A run saved mid-way (its short label), or null. */
  savedRun: () => string | null;
  /** The saved run's Slot Machine (the main menu stages it), or null. */
  savedCabinet?: () => CabinetId | null;
  /** The last finished run's COPY RUN text, if any. */
  lastRun: () => string | null;
  onContinue: () => void;
  setting: (k: SettingKey) => number | boolean;
  setSetting: (k: SettingKey, v: number | boolean) => void;
}

/** One out-of-run screen: it builds its buttons through the host when made, and draws under and over them. */
export interface MenuScreen {
  draw(ctx: CanvasRenderingContext2D, t: number): void;
  drawOver?(ctx: CanvasRenderingContext2D, t: number): void;
  update?(dt: number): void;
  key?(k: string): boolean;
  pointerDown?(x: number, y: number): boolean;
}

export class Menus {
  mode: MenuMode = 'none';
  buttons: Button[] = [];
  private active: Button | null = null;
  private fade = 0;
  mouse = { x: -1, y: -1 };
  /** Where BACK (and Escape) goes from this screen. */
  back: (() => void) | null = null;
  private screen: MenuScreen | null = null;
  /** Hit areas a screen draws itself (tiles, chips, bulbs): the loop skips them; focus and clicks still find them. */
  private custom = new Set<Button>();
  /** Icons drawn on menu buttons (scaled with their press). */
  icons = new Map<Button, string>();
  /** The last PROFILE tab, so BACK from a sub-screen and a second visit land where you were. */
  private profileTab: ProfileTab = 'collection';

  constructor(
    readonly ui: Clock,
    readonly sounds: Sounds,
    readonly profile: () => Profile,
    readonly unlocked: () => Set<CabinetId>,
    readonly cb: MenuCallbacks,
  ) {}

  /** Keyboard / gamepad focus targets. */
  navTargets(): Button[] {
    if (this.mode === 'loading') return [];
    return this.buttons.filter((b) => b.visible && b.enabled);
  }

  get isOpen(): boolean {
    return this.mode !== 'none';
  }

  /** MOTION: REDUCED (the settings toggle): idle bobs, chases and drifts hold still. */
  reduced(): boolean {
    return this.cb.setting('motion') === true;
  }

  btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void, textScale: number = T.body, opts: ButtonOpts = {}): Button {
    const b = new Button(label, x, y, w, h, onClick, this.ui, () => this.sounds.click(), { textScale, ...opts });
    this.buttons.push(b);
    return b;
  }

  /** A hit area the screen draws itself (centre x/y). It still clicks, lifts on hover and takes the focus. */
  hit(x: number, y: number, w: number, h: number, onClick: () => void): Button {
    const b = this.btn('', x, y, w, h, onClick);
    this.custom.add(b);
    return b;
  }

  /** Drop every button but the ones kept (a tab switch rebuilds its own part of the screen). */
  clearButtons(keep: Button[] = []): void {
    const k = new Set(keep);
    for (const b of this.buttons) if (!k.has(b)) (this.custom.delete(b), this.icons.delete(b));
    this.buttons = this.buttons.filter((b) => k.has(b));
    if (this.active && !k.has(this.active)) this.active = null;
  }

  private open(mode: MenuMode, screen: (m: Menus) => MenuScreen | null): void {
    this.mode = mode;
    this.back = null;
    this.icons.clear();
    this.custom.clear();
    this.buttons = [];
    this.active = null;
    this.fade = 0;
    void this.ui.tween({ from: 0, to: 1, dur: 0.25, ease: sineOut, onUpdate: (v) => (this.fade = v) });
    this.screen = null;
    this.screen = screen(this);
    // A new screen under a still pointer: light what it's over.
    this.pointerMove(this.mouse.x, this.mouse.y);
  }

  hide(): void {
    this.mode = 'none';
    this.buttons = [];
    this.screen = null;
  }

  showLoading(): void {
    this.open('loading', (m) => new TitleScreen(m));
  }

  showMain(): void {
    this.open('main', (m) => new MainScreen(m));
  }

  /** PROFILE: one screen with tabs (Collection, Trophies, Stats). */
  showProgress(tab: ProfileTab = this.profileTab): void {
    this.profileTab = tab;
    this.open(tab === 'collection' ? 'collection' : tab === 'trophies' ? 'trophies' : 'progress', (m) => new ProfileScreen(m, tab, (t) => (this.profileTab = t)));
  }

  showCollection(): void {
    this.showProgress('collection');
  }

  showTrophies(): void {
    this.showProgress('trophies');
  }

  /** SETTINGS (midRun: opened from PAUSE, no RESET SAVE there). */
  showSettings(back: () => void = () => this.showMain(), midRun = false): void {
    this.open('settings', (m) => new SettingsScreen(m, midRun, back));
  }

  showHiscores(): void {
    this.open('hiscores', (m) => new HiscoresScreen(m));
  }

  /** A sub-screen's header: BACK (top left, and Escape) and the title. */
  header(back: () => void): Button {
    this.back = back;
    return this.btn('BACK', 100, 44, 140, 48, back);
  }

  drawHeader(ctx: CanvasRenderingContext2D, title: string): void {
    drawTitle(ctx, title, W / 2, 46);
  }

  /** Anything that starts a run asks first while a saved run exists (it would replace it: STEAM_QA_1 Q6). */
  guardSaved(b: Button): void {
    if (!this.cb.savedRun()) return;
    const go = b.onClick;
    const label = b.label;
    const scale = b.opts.textScale;
    let armed = 0;
    b.onClick = () => {
      if (armed && performance.now() - armed > 400) return go();
      if (armed) return;
      armed = performance.now();
      b.label = b.w >= 300 ? 'ENDS YOUR SAVED RUN. AGAIN?' : 'SURE?';
      b.opts.textScale = Math.min(scale ?? T.body, T.body);
      this.sounds.fizzle();
      setTimeout(() => {
        armed = 0;
        b.label = label;
        b.opts.textScale = scale;
      }, 2500);
    };
  }

  /** These buttons drop into place, 40ms apart. */
  slideIn(list: Button[] = this.buttons.filter((b) => b.label !== 'BACK')): void {
    list.forEach((b, i) => {
      const y = b.y;
      b.y = y + 24;
      b.scale = 0.9;
      void this.ui.wait(0.05 + i * 0.04).then(() => {
        void this.ui.to(b, 'y', y, 0.22, backOut(2));
        return this.ui.to(b, 'scale', 1, 0.22, backOut(2));
      });
    });
  }

  // ---- input -------------------------------------------------------------------------

  pointerDown(x: number, y: number): boolean {
    if (!this.isOpen) return false;
    if (this.screen?.pointerDown?.(x, y)) return true;
    const b = this.buttons.find((b) => b.visible && b.contains(x, y));
    if (b) {
      this.active = b;
      b.down();
    }
    return true;
  }

  pointerUp(x: number, y: number): void {
    const b = this.active;
    this.active = null;
    b?.up(b.contains(x, y));
  }

  pointerMove(x: number, y: number): boolean {
    this.mouse = { x, y };
    let any = false;
    for (const b of this.buttons) {
      b.hover = b.visible && b.contains(x, y);
      any ||= b.hover && b.enabled;
    }
    return any;
  }

  /** Keys: the title takes any key; Escape is one screen back; a screen may take its own (tab switching). */
  key(k: string): boolean {
    if (this.screen?.key?.(k)) return true;
    // Escape: one screen back (a sub-screen -> the main menu).
    if (k === 'escape' && this.back) {
      this.sounds.click();
      this.back();
      return true;
    }
    return this.isOpen;
  }

  // ---- frame -------------------------------------------------------------------------

  update(dt: number): void {
    for (const b of this.buttons) b.update(dt);
    this.screen?.update?.(dt);
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.isOpen) return;
    // Everything but the main menu and the title sits on the dimmed floor.
    if (this.mode !== 'main' && this.mode !== 'loading') {
      ctx.fillStyle = 'rgba(6,2,12,0.86)';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.save();
    ctx.globalAlpha = this.fade;
    this.screen?.draw(ctx, t);
    for (const b of this.buttons) if (!this.custom.has(b)) b.draw(ctx, t);
    for (const [b, icon] of this.icons) if (b.visible) MainScreen.buttonIcon(ctx, b, icon);
    this.screen?.drawOver?.(ctx, t);
    ctx.restore();
  }
}
