import type { Sounds } from '../audio/sounds';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../core/cabinets';
import type { Enh, RelicId } from '../core/config';
import { runScore, shownTitle, shownTrim, type Profile, type RunEntry } from '../core/profile';
import { ACHIEVEMENTS, allTitles, TRIMS, CHALLENGES, challengeOpen, edgeLine, levelOf, titlesOwned, weekKey, weekly } from '../core/meta';
import { online } from '../net/config';
import { topScores, type ScoreRow } from '../net/leaderboard';
import { dailyCabinet, dailyEdge, dailyKey, dailySpent } from '../core/daily';
import { EDGE_TEXT } from '../core/run';
import { LEGENDARY, RELICS, RELIC_TIER } from '../core/relics';
import { CHARM_SYMBOLS, charmRuleText } from '../core/charms';
import { desktop, DESKTOP, STEAM, VERSION } from '../build';
import type { SettingKey } from '../game';
import { STAKES } from '../core/stakes';
import { RelicTips } from './relicTip';
import type { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { COLORS, H, W } from '../present/layout';
import { ENH_SPRITE } from '../present/reel';
import { SPRITES } from '../render/spriteData';
import { artId, drawSprite, hasSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';
import { Button } from './button';
import { wrap } from './runScreens';

/**
 * Out-of-run screens: LOADING (warms the sprite cache, then asks for a click so audio can start),
 * the MAIN MENU, the COLLECTION log and personal HISCORES.
 */
export type MenuMode = 'none' | 'loading' | 'name' | 'main' | 'modes' | 'progress' | 'settings' | 'collection' | 'hiscores' | 'challenges' | 'trophies';
/** HISCORES tabs: your own runs, or the online boards. */
export type ScoreTab = 'mine' | 'daily' | 'weekly' | 'all';

export const CHARM_INFO: Record<Enh, { name: string; text: string }> = {
  gold: { name: 'GOLD', text: 'YOUR ATTACK SYMBOLS AND SHIELDS. X2/X3/X4 PAY.' },
  keen: { name: 'KEEN', text: 'SWORDS AND CARDS. +40/+50/+60 DAMAGE AND PIERCES SHIELDS.' },
  charged: { name: 'CHARGED', text: "DOC VOLTZ'S BOLTS. +10/+20/+30 CHARGE ON BOLTS." },
  spiked: { name: 'BULWARK', text: `KNIGHT. SHIELDS. ${charmRuleText('spiked', 1)}.` },
  vamp: { name: 'VAMP', text: 'SWORDS AND CARDS. HEALS +20/+30/+40 HP.' },
  lucky: { name: 'LUCKY', text: '40%/55%/70% CHANCE TO BE A WILD.' },
  blaze: { name: 'BLAZE', text: "DOC VOLTZ'S BOLTS. +10/+20/+30 LIGHTNING DAMAGE." },
  thorny: { name: 'THORNY', text: "BRIAR'S THORNS. +50/+60/+70 DAMAGE ON THORNS." },
  lucre: { name: 'CHIP', text: 'YOUR ATTACK SYMBOLS AND SHIELDS. +3 CHIPS (MAX 6/9/12 PER ROUND).' },
  trick: { name: 'TRICK', text: "JAX'S CARDS AND SHIELDS. +30/+40/+55 TO YOUR JACKPOT METER." },
};
/** Charms in the COLLECTION (SPIKED retired). */
const CHARM_ORDER: Enh[] = ['gold', 'keen', 'vamp', 'charged', 'lucky', 'blaze', 'thorny', 'lucre', 'trick'];

const TIER_COLOR = { common: '#c9c9d9', uncommon: '#5ad8e8', legendary: '#ffd23f', other: '#9a8fb0' };

/** Every relic, grouped common → uncommon → legendary → the rest (counters and specials). */
export const RELIC_ORDER: RelicId[] = (() => {
  const seen = new Set<RelicId>();
  const out: RelicId[] = [];
  for (const t of ['common', 'uncommon', 'legendary'] as const)
    for (const r of RELIC_TIER[t])
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
  for (const r of Object.keys(RELICS) as RelicId[]) if (!seen.has(r)) out.push(r);
  return out.filter((r) => !RELICS[r].retired);
})();

/** Collection size (relics + charms), for the COLLECTOR achievements. */
export const collectionTotal = () => RELIC_ORDER.length + CHARM_ORDER.length;

const relicTier = (r: RelicId): keyof typeof TIER_COLOR =>
  LEGENDARY.has(r) ? 'legendary' : RELIC_TIER.uncommon.includes(r) ? 'uncommon' : RELIC_TIER.common.includes(r) ? 'common' : 'other';

export const heroSprite = (id: CabinetId): SpriteId => (hasSprite(CABINETS[id].heroSprite) ? artId(CABINETS[id].heroSprite) : 'playerPortrait');

const LOAD_MIN = 1.3;
const TOUCH = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
const ROWS_PER_PAGE = 7;
/** Name entry box centre; challenge rows; achievement grid top. */
const NAME_Y = 360;
const CH_Y = 272;
const CH_ROW = 54;
const TR_Y = 384;
/** TROPHIES: the trim picker row. */
const TRIM_Y = 302;
const TRIM_X = 90;
const TRIM_PITCH = 70;

/** Time until the next weekly (Monday 00:00 UTC), e.g. "3D 4H". */
function untilMonday(now = new Date()): string {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + ((8 - (now.getUTCDay() || 7)) % 7 || 7)));
  const h = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 3600000));
  return h >= 24 ? `${Math.floor(h / 24)}D ${h % 24}H` : `${h}H`;
}

export class Menus {
  mode: MenuMode = 'none';
  private buttons: Button[] = [];
  private active: Button | null = null;
  private fade = 0;
  private mouse = { x: -1, y: -1 };
  private relicTips = new RelicTips();
  // loading
  private loadT = 0;
  private warmed = 0;
  private readonly warmList = Object.keys(SPRITES) as SpriteId[];
  private readonly scratch = document.createElement('canvas').getContext('2d');
  private ready = false;
  // hiscores
  private sort: 'best' | 'recent' = 'best';
  private tab: ScoreTab = 'mine';
  /** Online board rows by board key (null while loading, 'error' if it failed). */
  private boards = new Map<string, ScoreRow[] | null | 'error'>();
  // name entry (a DOM input over the canvas: phones get their keyboard)
  private nameInput: HTMLInputElement | null = null;
  private nameStatus = '';
  private nameBusy = false;
  // trophies: the achievement under the pointer
  private trophyTip = '';
  /** TROPHIES: each title chip's hover line. */
  private titleTips: { x: number; y: number; w: number; text: string }[] = [];
  /** Icons drawn on menu buttons (main menu and sub-menus). */
  private icons = new Map<Button, string>();
  /** Where BACK (and Escape) goes from this screen. */
  private back: (() => void) | null = null;
  /** A sub-menu panel's entrance (0..1, overshoots). */
  private panelIn = 1;
  private page = 0;
  private resetArmed = 0;

  constructor(
    private ui: Clock,
    private sounds: Sounds,
    private profile: () => Profile,
    private unlocked: () => Set<CabinetId>,
    private cb: {
      onNewRun: () => void;
      onTutorial: () => void;
      /** THE DAILY RUN (one try a day). */
      onDaily: () => void;
      /** A CHALLENGE (by id), or THE WEEKLY CHALLENGE. */
      onChallenge: (id: string) => void;
      onWeekly: () => void;
      /** Name entry: claim the name; resolves to the claim result ('ok', 'taken', 'have:NAME', 'offline'). */
      needsName: () => boolean;
      onName: (name: string) => Promise<string>;
      playerName: () => string;
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
      onContinue: () => void;
      setting: (k: SettingKey) => number | boolean;
      setSetting: (k: SettingKey, v: number | boolean) => void;
    },
  ) {}

  /** Keyboard / gamepad focus targets (no focus while typing a name). */
  navTargets(): Button[] {
    if (this.mode === 'loading') return [];
    return this.buttons.filter((b) => b.visible && b.enabled);
  }

  get isOpen(): boolean {
    return this.mode !== 'none';
  }

  private btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void, textScale = 2): Button {
    const b = new Button(label, x, y, w, h, onClick, this.ui, () => this.sounds.click(), { textScale });
    this.buttons.push(b);
    return b;
  }

  private open(mode: MenuMode): void {
    if (mode !== 'name') this.dropInput();
    this.mode = mode;
    this.back = null;
    this.icons.clear();
    this.buttons = [];
    this.liveLabels = [];
    this.active = null;
    this.fade = 0;
    void this.ui.tween({ from: 0, to: 1, dur: 0.25, ease: sineOut, onUpdate: (v) => (this.fade = v) });
  }

  hide(): void {
    this.mode = 'none';
    this.buttons = [];
    this.dropInput();
  }

  private dropInput(): void {
    this.nameInput?.remove();
    this.nameInput = null;
  }

  showLoading(): void {
    this.open('loading');
    this.loadT = 0;
    this.warmed = 0;
    this.ready = false;
  }

  showMain(): void {
    // No name yet (first launch, or the one picked offline was taken): pick one first.
    if (this.cb.needsName()) return this.showName();
    this.open('main');
    const x = W / 2;
    const first = !this.cb.tutorialDone();
    // Three things on the main screen: NEW RUN (the one red button), the play modes, your progress.
    // A saved run (STEAM_READINESS S1): CONTINUE takes the red button; NEW RUN asks before throwing the save away.
    const saved = this.cb.savedRun();
    let y = 412;
    if (saved) {
      const cont = this.btn(`CONTINUE: ${saved}`, x, 336, 400, 62, () => this.cb.onContinue(), saved.length > 12 ? 2 : 3);
      cont.opts.primary = true;
      cont.opts.idlePulse = true;
      let armed = 0;
      const nr = this.btn('NEW RUN', x, y, 400, 54, () => {
        if (armed && performance.now() - armed > 400) return this.cb.onNewRun();
        if (armed) return;
        armed = performance.now();
        nr.label = 'NEW RUN? THE SAVED ONE ENDS';
        nr.opts.textScale = 2;
        this.sounds.fizzle();
        setTimeout(() => {
          armed = 0;
          nr.label = 'NEW RUN';
          nr.opts.textScale = 3;
        }, 2500);
      }, 3);
      y += 66;
    } else {
      const newRun = this.btn('NEW RUN', x, 336, 400, 62, () => this.cb.onNewRun(), 3);
      newRun.opts.idlePulse = !first;
      newRun.opts.primary = true;
      this.icons.set(newRun, 'iconNewRun');
    }
    // First time here: the TUTORIAL sits right under NEW RUN and breathes (not with a saved run: it's in PLAY MODES).
    if (first && !saved) {
      const tut = this.btn('TUTORIAL', x, y, 400, 54, () => this.cb.onTutorial(), 3);
      tut.opts.idlePulse = true;
      this.icons.set(tut, 'iconTutorial');
      y += 66;
    }
    this.icons.set(this.btn('PLAY MODES', x, y, 400, 54, () => this.showModes(), 3), 'chip');
    this.icons.set(this.btn('PROGRESS', x, y + 66, 400, 54, () => this.showProgress(), 3), 'trophySmall');
    const settings = this.btn('SETTINGS', W - 90, H - 30, 150, 34, () => this.showSettings(), 1.5);
    settings.opts.quiet = true;
    // Desktop: a way out (STEAM_READINESS S5). Browsers close the tab.
    if (DESKTOP) this.btn('QUIT', 70, H - 56, 100, 34, () => desktop()?.quit(), 1.5).opts.quiet = true;
    this.slideIn();
  }

  /** Anything that starts a run asks first while a saved run exists (it would replace it: STEAM_QA_1 Q6). */
  private guardSaved(b: Button): void {
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
      b.opts.textScale = Math.min(scale ?? 2, 2);
      this.sounds.fizzle();
      setTimeout(() => {
        armed = 0;
        b.label = label;
        b.opts.textScale = scale;
      }, 2500);
    };
  }

  /** A sub-menu: its title, a BACK button, and its rows dealt in one by one. */
  private openSub(mode: MenuMode, back: () => void): void {
    this.open(mode);
    this.back = back;
    this.btn('BACK', 100, 44, 140, 48, back);
    this.panelIn = 0;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(1.6), onUpdate: (v) => (this.panelIn = v) });
  }

  /** Every button but BACK drops into place, 40ms apart (BACK stays put). */
  private slideIn(): void {
    this.buttons
      .filter((b) => b.label !== 'BACK')
      .forEach((b, i) => {
        const y = b.y;
        b.y = y + 24;
        b.scale = 0.9;
        void this.ui.wait(0.05 + i * 0.04).then(() => {
          void this.ui.to(b, 'y', y, 0.22, backOut(2));
          return this.ui.to(b, 'scale', 1, 0.22, backOut(2));
        });
      });
  }

  /** The rows inside a sub-menu panel (first row's centre). */
  private static readonly SUB_Y = 284;
  private static readonly SUB_PITCH = 84;
  /** SETTINGS has more rows: a tighter grid in a taller panel. */
  private static readonly SET_Y = 276;
  private static readonly SET_PITCH = 46;
  /** Labels that follow live state (the M key mutes; fullscreen can change outside the menu). */
  private liveLabels: (() => void)[] = [];
  private settingsMidRun = false;

  /** PLAY MODES: the daily, the weekly, the challenges and the tutorial. */
  showModes(): void {
    this.openSub('modes', () => this.showMain());
    const x = W / 2;
    const row = (i: number) => Menus.SUB_Y + i * Menus.SUB_PITCH;
    // THE DAILY RUN: today's slot machine, one try a day (then its score).
    const today = dailyKey();
    const run = this.profile().runs.find((e) => e.daily === today);
    const done = dailySpent(today, this.profile().lastDaily);
    // The machine on the button, today's rule in the caption under it.
    const label = run ? `DAILY: ${runScore(run)}` : done ? 'DAILY: SPENT' : `DAILY: ${CABINETS[dailyCabinet(today)].name}`;
    const daily = this.btn(label, x, row(0), 440, 54, () => !done && this.cb.onDaily(), label.length > 17 ? 2 : 3);
    daily.toggled = done;
    this.icons.set(daily, 'chip');
    // THE WEEKLY CHALLENGE: the machine (or your best); its rules are on the CHALLENGES screen and the run's first card.
    const key = weekKey();
    const best = this.profile().challenges[`weekly:${key}`];
    const wl = best ? `WEEKLY: BEST ${best.best}` : `WEEKLY: ${CABINETS[weekly(key).cabinet].name}`;
    if (!done) this.guardSaved(daily);
    const wb = this.btn(wl, x, row(1), 440, 54, () => this.cb.onWeekly(), wl.length > 17 ? 2 : 3);
    this.icons.set(wb, 'voucherBonus');
    this.guardSaved(wb);
    this.icons.set(this.btn('CHALLENGES', x, row(2), 440, 54, () => this.showChallenges(), 3), 'trophySmall');
    const tb = this.btn('TUTORIAL', x, row(3), 440, 54, () => this.cb.onTutorial(), 3);
    this.icons.set(tb, 'iconTutorial');
    this.guardSaved(tb);
    this.slideIn();
  }

  /** PROGRESS: the collection, trophies and hiscores. */
  showProgress(): void {
    this.openSub('progress', () => this.showMain());
    const x = W / 2;
    const row = (i: number) => Menus.SUB_Y + 40 + i * Menus.SUB_PITCH;
    this.icons.set(this.btn('COLLECTION', x, row(0), 440, 54, () => this.showCollection(), 3), 'iconCollection');
    this.icons.set(this.btn('TROPHIES', x, row(1), 440, 54, () => this.showTrophies(), 3), 'trophySmall');
    this.icons.set(this.btn('HISCORES', x, row(2), 440, 54, () => this.showHiscores(), 3), 'iconHiscores');
    this.slideIn();
  }

  /** SETTINGS: sound, the lightning (photosensitivity) option, and RESET SAVE (two clicks). */
  /** midRun: opened from PAUSE (no RESET SAVE there). */
  showSettings(back: () => void = () => this.showMain(), midRun = false): void {
    this.openSub('settings', back);
    const x = W / 2;
    const row = (i: number) => Menus.SET_Y + i * Menus.SET_PITCH;
    // Volumes: a [-] VALUE [+] row each (STEAM_READINESS S7).
    const vols: [SettingKey, string][] = [['master', 'MASTER'], ['music', 'MUSIC'], ['sfx', 'SOUND FX']];
    vols.forEach(([k, name], i) => {
      const label = () => `${name}: ${this.cb.setting(k) as number}${k === 'master' && this.cb.muted() ? ' (MUTED)' : ''}`;
      const mid = this.btn(label(), x, row(i), 300, 40, () => this.cb.setMuted(!this.cb.muted()), 2);
      if (k === 'master') this.liveLabels.push(() => (mid.toggled = this.cb.muted()));
      const step = (d: number) => () => {
        this.cb.setSetting(k, Math.max(0, Math.min(10, (this.cb.setting(k) as number) + d)));
        if (k === 'master' && this.cb.muted()) this.cb.setMuted(false);
        this.sounds.coin(1);
      };
      this.btn('-', x - 190, row(i), 56, 40, step(-1), 3);
      this.btn('+', x + 190, row(i), 56, 40, step(1), 3);
      this.liveLabels.push(() => (mid.label = label()));
    });
    // A toggle lights up when it's off its default (like a muted sound).
    const toggle = (i: number, label: (on: boolean) => string, get: () => boolean, set: (on: boolean) => void, def = false) => {
      const b = this.btn(label(get()), x, row(i), 436, 40, () => {
        set(!get());
        b.label = label(get());
        b.toggled = get() !== def;
      }, 2);
      b.toggled = get() !== def;
      this.liveLabels.push(() => ((b.label = label(get())), (b.toggled = get() !== def)));
    };
    toggle(3, (on) => (on ? 'SCREEN SHAKE: ON' : 'SCREEN SHAKE: OFF'), () => this.cb.setting('shake') as boolean, (on) => this.cb.setSetting('shake', on), true);
    toggle(4, (on) => (on ? 'MOTION: REDUCED' : 'MOTION: FULL'), () => this.cb.setting('motion') as boolean, (on) => this.cb.setSetting('motion', on));
    toggle(5, (on) => (on ? 'LIGHTNING: SOFT' : 'LIGHTNING: FULL'), () => this.cb.softLightning(), (on) => this.cb.setSoftLightning(on));
    toggle(6, (on) => (on ? 'FULLSCREEN: ON' : 'FULLSCREEN: OFF'), () => this.cb.setting('fullscreen') as boolean, (on) => this.cb.setSetting('fullscreen', on));
    this.resetArmed = 0;
    this.settingsMidRun = midRun;
    if (midRun) return this.slideIn();
    const reset = this.btn('RESET SAVE', x, row(7) + 22, 300, 40, () => {
      if (performance.now() - this.resetArmed < 400) return;
      if (!this.resetArmed) {
        this.resetArmed = performance.now();
        // Armed: it turns into the red button for a moment, so the second click is a clear choice.
        reset.label = 'SURE? PRESS AGAIN';
        reset.opts.primary = true;
        reset.opts.quiet = false;
        this.sounds.fizzle();
        setTimeout(() => {
          if (this.mode !== 'settings') return;
          this.resetArmed = 0;
          reset.label = 'RESET SAVE';
          reset.opts.primary = false;
          reset.opts.quiet = true;
        }, 2500);
        return;
      }
      this.cb.onReset();
      this.showMain();
    }, 2);
    reset.opts.quiet = true;
    this.slideIn();
  }

  showCollection(): void {
    this.open('collection');
    this.back = () => this.showProgress();
    this.btn('BACK', 100, 44, 140, 48, () => this.showProgress());
  }

  showHiscores(): void {
    this.open('hiscores');
    this.page = 0;
    this.hiscoreButtons();
  }

  /** The online board a tab shows. */
  private boardKey(tab: ScoreTab): string {
    return tab === 'daily' ? `daily:${dailyKey()}` : tab === 'weekly' ? `weekly:${weekKey()}` : 'all';
  }

  private loadBoard(key: string): void {
    if (!online() || this.boards.get(key) === null) return;
    this.boards.set(key, null);
    void topScores(key, ROWS_PER_PAGE + 3).then((rows) => this.boards.set(key, rows ?? 'error'));
  }

  private hiscoreButtons(): void {
    this.buttons = [];
    this.back = () => this.showProgress();
    this.btn('BACK', 100, 44, 140, 48, () => this.showProgress());
    (['mine', 'daily', 'weekly', 'all'] as ScoreTab[]).forEach((tab, i) => {
      const b = this.btn({ mine: 'MY RUNS', daily: 'TODAY', weekly: 'THIS WEEK', all: 'ALL TIME' }[tab], W / 2 + (i - 1.5) * 168, 100, 160, 40, () => {
        this.tab = tab;
        this.page = 0;
        if (tab !== 'mine') this.boards.delete(this.boardKey(tab));
        this.hiscoreButtons();
      }, 1.5);
      b.toggled = this.tab === tab;
    });
    if (this.tab !== 'mine') {
      this.loadBoard(this.boardKey(this.tab));
      return;
    }
    const best = this.btn('BEST', W - 250, 44, 130, 44, () => {
      this.sort = 'best';
      this.page = 0;
      this.hiscoreButtons();
    });
    const recent = this.btn('RECENT', W - 110, 44, 130, 44, () => {
      this.sort = 'recent';
      this.page = 0;
      this.hiscoreButtons();
    });
    best.toggled = this.sort === 'best';
    recent.toggled = this.sort === 'recent';
    const pages = Math.max(1, Math.ceil(this.entries().length / ROWS_PER_PAGE));
    if (pages > 1) {
      const prev = this.btn('PREV', W / 2 - 160, H - 36, 130, 40, () => {
        this.page = Math.max(0, this.page - 1);
        this.hiscoreButtons();
      });
      const next = this.btn('NEXT', W / 2 + 160, H - 36, 130, 40, () => {
        this.page = Math.min(pages - 1, this.page + 1);
        this.hiscoreButtons();
      });
      prev.enabled = this.page > 0;
      next.enabled = this.page < pages - 1;
    }
  }

  private entries(): RunEntry[] {
    const runs = [...this.profile().runs];
    if (this.sort === 'recent') return runs.sort((a, b) => b.at - a.at);
    return runs.sort((a, b) => runScore(b) - runScore(a) || b.at - a.at);
  }

  // ---- player name (first launch) -----------------------------------------------------

  showName(): void {
    this.open('name');
    this.nameStatus = '';
    this.nameBusy = false;
    const stage = document.getElementById('stage');
    if (stage && !this.nameInput) {
      const el = document.createElement('input');
      el.maxLength = 12;
      el.autocomplete = 'off';
      el.spellcheck = false;
      el.setAttribute('autocapitalize', 'characters');
      el.setAttribute('aria-label', 'Leaderboard name');
      Object.assign(el.style, {
        position: 'absolute',
        left: `${((W / 2 - 200) / W) * 100}%`,
        top: `${((NAME_Y - 24) / H) * 100}%`,
        width: `${(400 / W) * 100}%`,
        height: `${(48 / H) * 100}%`,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'transparent',
        textAlign: 'center',
        textTransform: 'uppercase',
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontWeight: 'bold',
        letterSpacing: '0.15em',
        caretColor: 'transparent',
        userSelect: 'text',
        webkitUserSelect: 'text',
        touchAction: 'auto',
        zIndex: '5',
      } as Partial<CSSStyleDeclaration>);
      el.addEventListener('input', () => {
        el.value = el.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        this.nameStatus = '';
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') void this.submitName();
      });
      stage.appendChild(el);
      this.nameInput = el;
      setTimeout(() => el.focus(), 50);
    }
    this.btn('OK', W / 2, NAME_Y + 80, 200, 54, () => void this.submitName(), 3);
    // Not everyone wants to type a name first (STEAM_READINESS S16): a random PLAYER name, changeable later.
    this.btn('SKIP', W / 2, NAME_Y + 150, 140, 36, () => this.skipName(), 1.5).opts.quiet = true;
  }

  private skipName(): void {
    if (!this.nameInput) return;
    this.nameInput.value = `PLAYER${Math.floor(1000 + Math.random() * 9000)}`;
    void this.submitName();
  }

  private async submitName(): Promise<void> {
    if (this.nameBusy || !this.nameInput) return;
    const name = this.nameInput.value;
    if (name.length < 3) {
      this.nameStatus = 'AT LEAST 3 LETTERS OR NUMBERS';
      this.sounds.fizzle();
      return;
    }
    this.nameBusy = true;
    this.nameStatus = 'CHECKING...';
    const r = await this.cb.onName(name);
    this.nameBusy = false;
    if (this.mode !== 'name') return;
    if (r === 'taken' || r === 'blocked') {
      this.nameStatus = r === 'blocked' ? 'PICK ANOTHER NAME' : `${name} IS TAKEN. TRY ANOTHER`;
      this.sounds.fizzle();
      return;
    }
    this.sounds.fanfareJackpot();
    this.showMain();
  }

  private drawName(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    this.logo(ctx, 150, t, 3);
    drawText(ctx, 'PICK YOUR NAME', W / 2, NAME_Y - 110, 4, COLORS.goldLight);
    drawText(ctx, online() ? 'IT GOES ON THE LEADERBOARDS: THE DAILY, THE WEEKLY AND ALL TIME' : STEAM ? 'YOUR NAME FOR THE HISCORES' : 'YOUR NAME FOR THE HISCORES (ONLINE BOARDS OPENING SOON)', W / 2, NAME_Y - 66, 1.5, COLORS.textDim);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(W / 2 - 214, NAME_Y - 32, 428, 64);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(W / 2 - 210, NAME_Y - 28, 420, 56);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(W / 2 - 206, NAME_Y - 24, 412, 48);
    // The typed name in the pixel font (the DOM input underneath only takes the keys), with a blinking caret.
    const typed = this.nameInput?.value ?? '';
    if (!typed) drawText(ctx, 'TYPE A NAME', W / 2, NAME_Y, 2.5, COLORS.textDim, { alpha: 0.5 + 0.3 * Math.sin(t * 4) });
    else drawText(ctx, typed, W / 2, NAME_Y, 3.5, COLORS.text);
    if (Math.sin(t * 6) > 0 && (document.activeElement === this.nameInput || !typed)) {
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillRect(W / 2 + (typed.length * 21) / 2 + 4, NAME_Y - 14, 4, 28);
    }
    drawText(ctx, '3-12 LETTERS, NUMBERS OR DASHES', W / 2, NAME_Y + 42, 1.25, COLORS.textDim);
    if (this.nameStatus) drawText(ctx, this.nameStatus, W / 2, NAME_Y + 130, 2, this.nameBusy ? COLORS.textDim : COLORS.danger);
    // Keep the input's text in step with the stage size.
    const stage = this.nameInput?.parentElement;
    if (this.nameInput && stage) this.nameInput.style.fontSize = `${(stage.clientWidth / W) * 30}px`;
  }

  /** The player's badge: name, level, title and the XP bar. */
  private badge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const p = this.profile();
    const lv = levelOf(p.xp);
    const name = this.cb.playerName() || 'PLAYER';
    drawText(ctx, `${name}  -  LV ${lv.level} ${shownTitle(p)}`, x, y - 6, 2, COLORS.goldLight);
    const bw = 300;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - bw / 2 - 2, y + 10, bw + 4, 10);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x - bw / 2, y + 12, bw, 6);
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(x - bw / 2, y + 12, Math.round((bw * lv.into) / Math.max(1, lv.need)), 6);
    drawText(ctx, `${lv.into}/${lv.need} XP`, x + bw / 2 + 8, y + 15, 1, COLORS.textDim, { align: 'left' });
  }

  // ---- challenges -----------------------------------------------------------------------

  showChallenges(): void {
    this.open('challenges');
    this.back = () => this.showModes();
    this.btn('BACK', 100, 44, 140, 48, () => this.showModes());
    this.btn('PLAY', W - 170, 150, 180, 54, () => this.cb.onWeekly(), 3);
    const rec = this.profile().challenges;
    CHALLENGES.forEach((c, i) => {
      const b = this.btn(rec[c.id]?.won ? 'AGAIN' : 'PLAY', W - 130, CH_Y + i * CH_ROW, 140, 40, () => this.cb.onChallenge(c.id));
      this.guardSaved(b);
      b.enabled = challengeOpen(rec, i);
    });
  }

  private drawChallenges(ctx: CanvasRenderingContext2D, t: number): void {
    const p = this.profile();
    drawText(ctx, 'CHALLENGES', W / 2, 44, 5, COLORS.goldLight);
    // THE WEEKLY CHALLENGE.
    const key = weekKey();
    const wk = weekly(key);
    const best = p.challenges[`weekly:${key}`];
    this.panel(ctx, 60, 92, W - 120, 118, '#7dff7a');
    drawText(ctx, `THE WEEKLY CHALLENGE  ${key}`, 90, 112, 2.5, '#7dff7a', { align: 'left' });
    drawSprite(ctx, heroSprite(wk.cabinet), 120, 162, 2.5, { rot: Math.sin(t * 2) * 0.03 });
    drawText(ctx, `${CABINETS[wk.cabinet].hero} - ${CABINETS[wk.cabinet].name}. SAME FIGHTS FOR EVERYONE, THROUGH THE DEALER. AS MANY TRIES AS YOU LIKE.`, 160, 144, 1.25, COLORS.text, { align: 'left' });
    wrap([edgeLine(wk.edges), wk.chips === 0 ? 'START WITH 0 CHIPS' : ''].filter(Boolean).join('. '), 96).slice(0, 2).forEach((l, k) => drawText(ctx, l, 160, 164 + k * 16, 1.25, COLORS.goldLight, { align: 'left' }));
    drawText(ctx, best ? `YOUR BEST ${best.best}${best.won ? ' - CLEARED' : ''} - ${best.tries} TR${best.tries > 1 ? 'IES' : 'Y'}` : 'NOT PLAYED YET', 160, 198, 1.25, best?.won ? '#ffd23f' : COLORS.textDim, { align: 'left' });
    drawText(ctx, `NEW ONE IN ${untilMonday()}`, W - 170, 194, 1.25, COLORS.textDim);
    // The ladder.
    drawText(ctx, 'EACH CLEAR OPENS THE NEXT TWO AND EARNS A TITLE.', W / 2, CH_Y - 40, 1.5, COLORS.textDim);
    CHALLENGES.forEach((c, i) => {
      const y = CH_Y + i * CH_ROW;
      const open = challengeOpen(p.challenges, i);
      const r = p.challenges[c.id];
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(60, y - CH_ROW / 2 + 2, W - 120, CH_ROW - 4);
      drawText(ctx, String(i + 1), 84, y, 2.5, r?.won ? '#ffd23f' : COLORS.textDim);
      drawSprite(ctx, open ? heroSprite(c.cabinet) : 'playerPortrait', 130, y, 1.5, open ? {} : { variant: 'black', alpha: 0.5 });
      // Names always show (the next row's "CLEAR X TO OPEN" gave them away); a locked one hides only its setup.
      drawText(ctx, c.name, 160, y - 10, 2, open ? COLORS.goldLight : COLORS.textDim, { align: 'left' });
      const stake = c.stake ? ` - ${STAKES[c.stake].name} STAKE, THROUGH THE DEALER` : '';
      // One edge reads in full; several list their names (three didn't fit and ran through the title: EXPERT_PLAYTEST_10 D2).
      const rule = [c.edges.length > 1 ? c.edges.map((e) => EDGE_TEXT[e].title).join(' + ') : edgeLine(c.edges), c.chips === 0 ? 'START WITH 0 CHIPS' : ''].filter(Boolean).join('. ');
      drawText(ctx, open ? `${CABINETS[c.cabinet].name}${stake}. ${rule || c.text}` : `CLEAR ${CHALLENGES[i - 2].name} OR ${CHALLENGES[i - 1].name} TO OPEN`, 160, y + 10, 1.25, COLORS.textDim, { align: 'left' });
      drawText(ctx, r?.won ? `CLEARED - BEST ${r.best}` : r ? `BEST ${r.best}` : '', W - 220, y - 6, 1.5, r?.won ? '#ffd23f' : COLORS.text, { align: 'right' });
      drawText(ctx, `TITLE: ${c.title}`, W - 220, y + 12, 1.25, r?.won ? COLORS.goldLight : COLORS.textDim, { align: 'right' });
    });
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border: string): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  }

  // ---- trophies --------------------------------------------------------------------------

  showTrophies(): void {
    this.open('trophies');
    this.trophyButtons();
  }

  private trophyButtons(): void {
    this.buttons = [];
    this.back = () => this.showProgress();
    this.btn('BACK', 100, 44, 140, 48, () => this.showProgress());
    const p = this.profile();
    const owned = new Set(titlesOwned(levelOf(p.xp).level, p.challenges));
    const shown = shownTitle(p);
    this.titleTips = [];
    let x = 70;
    let y = 194;
    // Every title: the ones you hold are buttons (wear one); the rest are greyed, with how to earn them on hover.
    for (const t of allTitles()) {
      const w = t.title.length * 9 + 26;
      if (x + w > W - 60) {
        x = 70;
        y += 38;
      }
      const have = owned.has(t.title);
      const b = this.btn(t.title, x + w / 2, y, w, 30, () => {
        if (!have) return;
        this.cb.setTitle(t.title);
        this.trophyButtons();
      }, 1.25);
      b.toggled = t.title === shown;
      b.enabled = have;
      this.titleTips.push({ x: x + w / 2, y, w, text: have ? `${t.title}: PICK IT TO WEAR IT` : `${t.title}: ${t.how}` });
      x += w + 8;
    }
    // TRIMS: your slot machine's frame (cosmetic), one per level milestone.
    const lvl = levelOf(p.xp).level;
    const worn = shownTrim(p).id;
    TRIMS.forEach((t, i) => {
      const tx = TRIM_X + i * TRIM_PITCH;
      const have = lvl >= t.level;
      const b = this.btn('', tx, TRIM_Y, 52, 52, () => {
        if (!have) return;
        this.cb.setTrim(t.id);
        this.trophyButtons();
      });
      b.enabled = have;
      b.toggled = t.id === worn;
      this.titleTips.push({ x: tx, y: TRIM_Y, w: 52, text: have ? `${t.name} TRIM: PICK IT FOR YOUR SLOT MACHINE` : `${t.name} TRIM: REACH LEVEL ${t.level}` });
    });
  }

  /** TROPHIES: the trim swatches (drawn over their hit boxes), the worn one outlined. */
  private drawTrimRow(ctx: CanvasRenderingContext2D): void {
    const p = this.profile();
    const worn = shownTrim(p).id;
    const lvl = levelOf(p.xp).level;
    TRIMS.forEach((t, i) => {
      const tx = TRIM_X + i * TRIM_PITCH;
      const have = lvl >= t.level;
      // A swatch of the trim's rim under its crest (greyed until earned).
      if (t.id === worn) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tx - 24, TRIM_Y - 24, 48, 48);
      }
      ctx.fillStyle = have ? t.rim : '#2a2238';
      ctx.fillRect(tx - 20, TRIM_Y - 20, 40, 40);
      ctx.fillStyle = have ? t.dark : '#1a1426';
      ctx.fillRect(tx - 16, TRIM_Y - 16, 32, 32);
      if (hasSprite(t.crest)) drawSprite(ctx, artId(t.crest), tx, TRIM_Y, 2, have ? {} : { variant: 'black', alpha: 0.6 });
      if (!have) drawText(ctx, `LV ${t.level}`, tx, TRIM_Y + 32, 1, COLORS.textDim);
      else drawText(ctx, t.name, tx, TRIM_Y + 32, 1, COLORS.goldLight);
    });
  }

  private drawTrophies(ctx: CanvasRenderingContext2D): void {
    const p = this.profile();
    drawText(ctx, 'TROPHIES', W / 2, 44, 5, COLORS.goldLight);
    this.badge(ctx, W / 2, 108);
    drawText(ctx, 'TITLES', 60, 160, 1.5, COLORS.text, { align: 'left' });
    drawText(ctx, 'TRIMS', 60, TRIM_Y - 38, 1.5, COLORS.text, { align: 'left' });
    drawText(ctx, 'YOUR SLOT MACHINE\'S FRAME. ONE MORE EVERY FEW LEVELS', TRIM_X + TRIMS.length * TRIM_PITCH - 20, TRIM_Y - 38, 1.25, COLORS.textDim, { align: 'right' });
    this.trophyTip = '';
    for (const t of this.titleTips) if (Math.abs(this.mouse.x - t.x) < t.w / 2 && Math.abs(this.mouse.y - t.y) < 15) this.trophyTip = t.text;
    const got = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
    drawText(ctx, `ACHIEVEMENTS ${got}/${ACHIEVEMENTS.length}`, 60, TR_Y - 24, 2, COLORS.text, { align: 'left' });
    drawText(ctx, 'EACH ONE IS WORTH 250 XP', W - 60, TR_Y - 24, 1.25, COLORS.textDim, { align: 'right' });
    const ctxP = {
      stats: p.stats,
      have: p.achievements,
      found: p.found.relics.length + p.found.charms.length,
      collection: collectionTotal(),
      challengesWon: CHALLENGES.filter((c) => p.challenges[c.id]?.won).length,
    };
    // Two columns, every achievement with its text and (where it counts up) its progress.
    const cols = 2;
    const colW = (W - 120) / cols;
    const rows = Math.ceil(ACHIEVEMENTS.length / cols);
    const rowH = Math.min(26, Math.floor((H - 52 - TR_Y) / rows));
    ACHIEVEMENTS.forEach((a, i) => {
      const cx = 60 + Math.floor(i / rows) * colW;
      const y = TR_Y + (i % rows) * rowH;
      const have = !!p.achievements[a.id];
      const hidden = a.secret && !have;
      if (have && hasSprite('trophySmall')) drawSprite(ctx, artId('trophySmall'), cx + 8, y, 1);
      else drawText(ctx, '-', cx + 8, y, 1.25, COLORS.textDim);
      drawText(ctx, hidden ? '???' : a.name, cx + 22, y, 1.25, have ? COLORS.goldLight : COLORS.text, { align: 'left' });
      const nameW = (hidden ? 3 : a.name.length) * 7.5;
      drawText(ctx, hidden ? 'A SECRET. KEEP PLAYING.' : a.text, cx + 34 + nameW, y, 1, have ? '#b8a878' : COLORS.textDim, { align: 'left' });
      const prog = !have && a.progress ? a.progress(ctxP) : null;
      if (prog) drawText(ctx, `${Math.min(prog[0], prog[1])}/${prog[1]}`, cx + colW - 24, y, 1.25, COLORS.energy, { align: 'right' });
    });
    if (this.trophyTip) drawText(ctx, this.trophyTip, W / 2, H - 26, 1.5, COLORS.text);
  }

  // ---- input -------------------------------------------------------------------------

  pointerDown(x: number, y: number): boolean {
    if (!this.isOpen) return false;
    if (this.mode === 'loading') {
      if (this.ready) {
        this.sounds.fanfareJackpot();
        if (this.cb.needsName()) this.showName();
        else this.showMain();
      }
      return true;
    }
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

  /** Space / Enter on the loading screen. */
  key(k: string): boolean {
    if (this.mode === 'name') {
      if (k === 'enter') void this.submitName();
      // Gamepad B / Escape: no typing needed (STEAM_QA_1 Q4).
      else if (k === 'escape') this.skipName();
      return true;
    }
    if (this.mode === 'loading') {
      // Any key starts (STEAM_READINESS S23); the press also unlocks audio.
      if (this.ready) this.pointerDown(0, 0);
      return true;
    }
    // Escape: one screen back (sub-screen -> its sub-menu -> the main menu).
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
    if (this.mode !== 'loading') return;
    this.loadT += dt;
    // Build every sprite once now, so the first fight doesn't hitch.
    const ctx = this.scratch;
    for (let i = 0; i < 24 && this.warmed < this.warmList.length; i++, this.warmed++) if (ctx) drawSprite(ctx, this.warmList[this.warmed], -100, -100, 1);
    if (!this.ready && this.loadT >= LOAD_MIN && this.warmed >= this.warmList.length) this.ready = true;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.isOpen) return;
    ctx.fillStyle = 'rgba(6,2,12,0.9)';
    if (this.mode !== 'main') ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.mode === 'loading') this.drawLoading(ctx, t);
    else if (this.mode === 'main') this.drawMain(ctx, t);
    else if (this.mode === 'modes' || this.mode === 'progress' || this.mode === 'settings') this.drawSub(ctx, t);
    else if (this.mode === 'collection') this.drawCollection(ctx);
    else if (this.mode === 'hiscores') {
      this.relicTips.begin();
      this.drawHiscores(ctx, t);
    }
    else if (this.mode === 'name') this.drawName(ctx, t);
    else if (this.mode === 'challenges') this.drawChallenges(ctx, t);
    else if (this.mode === 'trophies') this.drawTrophies(ctx);
    for (const b of this.buttons) b.draw(ctx, t);
    if (this.mode === 'trophies') this.drawTrimRow(ctx);
    if (this.mode === 'hiscores') this.relicTips.draw(ctx, this.mouse.x, this.mouse.y);
    // Icons on the menu buttons (over them, scaled with their press).
    for (const [b, icon] of this.icons)
      if (b.visible && hasSprite(icon)) drawSprite(ctx, artId(icon), b.x - (b.w / 2 - 38) * b.scale, b.y, 2.5 * b.scale);
    ctx.restore();
  }

  private logo(ctx: CanvasRenderingContext2D, y: number, t: number, scale = 4): void {
    const bob = Math.sin(t * 2) * 3;
    if (hasSprite('logo')) drawSprite(ctx, artId('logo'), W / 2, y + bob, scale);
    else {
      drawText(ctx, 'SLOTS', W / 2 - 230, y + bob, 8, COLORS.goldLight);
      drawText(ctx, 'VS.', W / 2, y - bob, 6, '#ff6a5a');
      drawText(ctx, 'SLOTS', W / 2 + 230, y + bob, 8, COLORS.slime);
    }
  }

  private drawLoading(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    this.logo(ctx, 220, t);
    const frame = Math.floor(t * 8) % 4;
    const coin = `coinSpin${frame}`;
    if (hasSprite(coin)) drawSprite(ctx, artId(coin), W / 2, 400, 4);
    else drawSprite(ctx, 'chip', W / 2, 400, 4, { sx: Math.abs(Math.cos(t * 5)) + 0.1 });
    const p = Math.min(1, Math.min(this.loadT / LOAD_MIN, this.warmed / Math.max(1, this.warmList.length)));
    const bw = 420;
    const bx = W / 2 - bw / 2;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 6, 470, bw + 12, 30);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(bx - 3, 473, bw + 6, 24);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(bx, 476, bw, 18);
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(bx, 476, Math.round(bw * p), 18);
    if (this.ready) drawText(ctx, TOUCH ? 'TAP TO PLAY' : 'PRESS ANY KEY', W / 2, 560, 3, COLORS.goldLight, { alpha: 0.55 + 0.45 * Math.sin(t * 5) });
    else drawText(ctx, `SHUFFLING THE REELS... ${Math.round(p * 100)}%`, W / 2, 530, 2, COLORS.textDim);
    drawText(ctx, STEAM ? `V${VERSION.toUpperCase()}` : 'PLAYTEST BUILD. PROGRESS SAVES IN THIS BROWSER.', W / 2, H - 30, 1.5, COLORS.textDim);
  }

  private drawMain(ctx: CanvasRenderingContext2D, t: number): void {
    // The casino backdrop shows through; darken it so the menu reads.
    ctx.fillStyle = 'rgba(6,2,12,0.72)';
    ctx.fillRect(0, 0, W, H);
    this.logo(ctx, 130, t);
    drawText(ctx, 'A SLOT MACHINE ROGUELIKE', W / 2, 238, 2, COLORS.textDim);
    // The showcase: one unlocked hero (left) and their Slot Machine (right), taking turns every few seconds.
    const open = CABINET_ORDER.filter((id) => this.unlocked().has(id));
    if (open.length) {
      const period = 4;
      const id = open[Math.floor(t / period) % open.length];
      const local = t % period;
      // Each swap fades in softly (the squash-pop read as unnatural: user 2026-10-07); the idle bob and sway stay.
      const fade = open.length > 1 ? Math.min(1, local / 0.35) : 1;
      drawSprite(ctx, heroSprite(id), 210, 430 + Math.sin(t * 2) * 3, 5, { alpha: fade });
      drawText(ctx, CABINETS[id].hero, 210, 520, 2, COLORS.goldLight, { alpha: fade });
      drawText(ctx, CABINETS[id].name, 210, 542, 1.5, COLORS.textDim, { alpha: fade });
      const cab = (hasSprite(CABINETS[id].sprite) ? CABINETS[id].sprite : 'cabinetKnight') as SpriteId;
      drawSprite(ctx, cab, W - 220, 430, 4, { rot: Math.sin(t * 1.3) * 0.02, alpha: fade });
    }
    if (hasSprite('menuBackdrop')) drawSprite(ctx, artId('menuBackdrop'), W / 2, 666, 3);
    this.badge(ctx, W / 2, 20);
    if (!this.cb.tutorialDone()) drawText(ctx, 'NEW HERE? TRY THE TUTORIAL', W / 2, 270, 2, COLORS.goldLight, { alpha: 0.6 + 0.4 * Math.sin(t * 4) });
    drawText(ctx, STEAM ? `V${VERSION.toUpperCase()}` : `PLAYTEST BUILD V${VERSION.toUpperCase()}`, 20, H - 20, 1.5, COLORS.textDim, { align: 'left' });
  }

  /** A sub-menu (PLAY MODES, PROGRESS, SETTINGS): a small logo, the title, and a panel the rows sit in. */
  private drawSub(ctx: CanvasRenderingContext2D, t: number): void {
    const title = this.mode === 'modes' ? 'PLAY MODES' : this.mode === 'progress' ? 'PROGRESS' : 'SETTINGS';
    if (hasSprite('logo')) drawSprite(ctx, artId('logo'), W / 2, 66 + Math.sin(t * 2) * 2, 2);
    const k = this.panelIn;
    const top = Menus.SUB_Y - 96;
    const bottom = this.mode === 'progress' ? Menus.SUB_Y + 40 + 2 * Menus.SUB_PITCH + 52 : this.mode === 'settings' ? Menus.SET_Y + (this.settingsMidRun ? 6 * Menus.SET_PITCH + 48 : 7 * Menus.SET_PITCH + 70) : Menus.SUB_Y + 3 * Menus.SUB_PITCH + 58;
    const pw = 540;
    // The panel rises in (no alpha on the layered frame: a half-faded gold rim tints the panel brown).
    ctx.save();
    ctx.translate(0, (1 - k) * 24);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(W / 2 - pw / 2 - 6, top - 6, pw + 12, bottom - top + 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(W / 2 - pw / 2 - 3, top - 3, pw + 6, bottom - top + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(W / 2 - pw / 2, top, pw, bottom - top);
    drawText(ctx, title, W / 2, top + 32, 3, COLORS.goldLight);
    ctx.restore();
    const cap = (text: string, i: number, color: string = COLORS.textDim) => drawText(ctx, text, W / 2, Menus.SUB_Y + i * Menus.SUB_PITCH + 40, 1.25, color, { alpha: Math.max(0, Math.min(1, k)) });
    if (this.mode === 'modes') {
      cap(`TODAY: ${EDGE_TEXT[dailyEdge(dailyKey())].title}. ONE TRY, THE SAME RUN FOR EVERYONE`, 0);
      cap('THIS WEEK\'S RULES. AS MANY TRIES AS YOU LIKE', 1);
      cap('SET RUNS WITH A TWIST. EACH CLEAR EARNS A TITLE', 2);
      cap('LEARN THE BASICS IN ONE FIGHT', 3);
    } else if (this.mode === 'progress') {
      const p = this.profile();
      const found = p.found.relics.length + p.found.charms.length;
      const total = RELIC_ORDER.length + CHARM_ORDER.length;
      const best = p.runs.reduce((m, e) => Math.max(m, runScore(e)), 0);
      drawText(ctx, `COLLECTION ${found}/${total}   RUNS ${p.stats.runs}   BEST ${best}`, W / 2, Menus.SUB_Y - 4, 1.5, COLORS.textDim, { alpha: Math.max(0, Math.min(1, k)) });
    } else {
      // The M key and F11 change state outside the menu: keep the labels in step.
      for (const f of this.liveLabels) f();
      const scap = (text: string, y: number, color: string = COLORS.textDim) => drawText(ctx, text, W / 2, y, 1.25, color, { alpha: Math.max(0, Math.min(1, k)) });
      scap('CLICK MASTER (OR PRESS M) TO MUTE. F11: FULLSCREEN', Menus.SET_Y + 6 * Menus.SET_PITCH + 30);
      if (!this.settingsMidRun) scap('ERASES YOUR UNLOCKS, COLLECTION AND SCORES', Menus.SET_Y + 7 * Menus.SET_PITCH + 52, '#ff8a7a');
      // The keys (STEAM_READINESS S29), under the panel.
      drawText(ctx, 'SPACE SPIN   A AUTO   1-4 SPEED   M MUTE   ESC PAUSE   ARROWS + ENTER: MENUS', W / 2, H - 22, 1.5, COLORS.textDim, { alpha: Math.max(0, Math.min(1, k)) });
    }
  }

  private tile(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, border: string, hover: boolean): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - size / 2 - 3, y - size / 2 - 3, size + 6, size + 6);
    ctx.fillStyle = hover ? '#ffffff' : border;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size - 6);
  }

  private mystery(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
    if (hasSprite('mysterySlot')) drawSprite(ctx, artId('mysterySlot'), x, y, scale);
    else drawText(ctx, '?', x, y, scale * 1.5, COLORS.textDim);
  }

  private near(x: number, y: number, r: number): boolean {
    return Math.abs(this.mouse.x - x) < r && Math.abs(this.mouse.y - y) < r;
  }

  private drawCollection(ctx: CanvasRenderingContext2D): void {
    const p = this.profile();
    drawText(ctx, 'COLLECTION', W / 2, 44, 5, COLORS.goldLight);
    let tip: { title: string; text: string; color: string } | null = null;

    // Charms.
    const nc = p.found.charms.length;
    drawText(ctx, `CHARMS ${Math.min(nc, CHARM_ORDER.length)}/${CHARM_ORDER.length}`, 60, 110, 2.5, COLORS.text, { align: 'left' });
    drawText(ctx, 'A CHARM SITS ON ONE CELL. GOLD IN A GROUP ADDS UP', W - 60, 110, 1.5, COLORS.textDim, { align: 'right' });
    CHARM_ORDER.forEach((enh, i) => {
      // Every charm in one row, however many there are (11 since CONTENT_13).
      const pitch = Math.min(150, (W - 120) / CHARM_ORDER.length);
      const x = W / 2 + (i - (CHARM_ORDER.length - 1) / 2) * pitch;
      const y = 176;
      const got = p.found.charms.includes(enh);
      const hover = this.near(x, y, 36);
      this.tile(ctx, x, y, 72, got ? COLORS.gold : '#3a3448', hover);
      if (got) {
        drawSprite(ctx, CHARM_SYMBOLS[enh][0] as SpriteId, x, y, 3);
        drawSprite(ctx, ENH_SPRITE[enh], x, y, 3);
      } else this.mystery(ctx, x, y, 3);
      drawText(ctx, got ? CHARM_INFO[enh].name : '???', x, y + 52, 1.5, got ? COLORS.goldLight : COLORS.textDim);
      if (hover) tip = got ? { title: `${CHARM_INFO[enh].name} CHARM`, text: CHARM_INFO[enh].text, color: COLORS.goldLight } : { title: '???', text: 'NOT DISCOVERED YET. PUT THIS CHARM ON YOUR MACHINE IN A RUN.', color: COLORS.textDim };
    });

    // Relics.
    const nr = p.found.relics.length;
    drawText(ctx, `RELICS ${nr}/${RELIC_ORDER.length}`, 60, 270, 2.5, COLORS.text, { align: 'left' });
    (['common', 'uncommon', 'legendary'] as const).forEach((tier, i) =>
      drawText(ctx, tier.toUpperCase(), W - 360 + i * 120, 270, 1.5, TIER_COLOR[tier], { align: 'left' }),
    );
    // Three rows clear of the detail panel: 16 across fits 48 relics.
    const cols = 16;
    const pitch = 70;
    RELIC_ORDER.forEach((r, i) => {
      const x = W / 2 + ((i % cols) - (cols - 1) / 2) * pitch;
      const y = 330 + Math.floor(i / cols) * 72;
      const got = p.found.relics.includes(r);
      const hover = this.near(x, y, 30);
      const tier = relicTier(r);
      this.tile(ctx, x, y, 58, got ? TIER_COLOR[tier] : '#3a3448', hover);
      if (got) drawSprite(ctx, RELICS[r].sprite as SpriteId, x, y, 2.5);
      else this.mystery(ctx, x, y, 2.5);
      if (hover)
        tip = got
          ? { title: RELICS[r].name, text: RELICS[r].text, color: TIER_COLOR[tier] }
          : { title: '???', text: tier === 'other' ? 'NOT DISCOVERED YET. SOME RELICS ONLY TURN UP AGAINST CERTAIN ENEMIES.' : `NOT DISCOVERED YET. A ${tier.toUpperCase()} RELIC.`, color: COLORS.textDim };
    });

    // Detail panel.
    const py = 624;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(W / 2 - 424, py - 44, 848, 92);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(W / 2 - 420, py - 40, 840, 84);
    const shown = tip as { title: string; text: string; color: string } | null;
    if (shown) {
      drawText(ctx, shown.title, W / 2, py - 20, 2.5, shown.color);
      wrap(shown.text, 64).slice(0, 2).forEach((l, k) => drawText(ctx, l, W / 2, py + 10 + k * 20, 2, COLORS.text));
    } else drawText(ctx, 'POINT AT A TILE TO READ IT', W / 2, py, 2, COLORS.textDim);
  }

  private drawHiscores(ctx: CanvasRenderingContext2D, t: number): void {
    drawText(ctx, 'HISCORES', W / 2, 44, 5, COLORS.goldLight);
    if (this.tab !== 'mine') return this.drawBoard(ctx, t);
    const list = this.entries();
    if (!list.length) {
      drawText(ctx, 'NO RUNS YET. GO PLAY ONE!', W / 2, H / 2, 3, COLORS.textDim);
      return;
    }
    const rows = list.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE);
    const bestScore = runScore([...list].sort((a, b) => runScore(b) - runScore(a))[0]);
    drawText(ctx, 'SCORE: 100 PER FIGHT WON, +1000 FOR A CLEAR, +1000 FOR THE DEALER, +5 PER CHIP LEFT. X1.5 PER STAKE.', W / 2, 132, 1.25, COLORS.textDim);
    rows.forEach((e, i) => {
      // Rows stop above the global SOUND button (bottom right).
      const y = 176 + i * 66;
      const rank = this.page * ROWS_PER_PAGE + i + 1;
      const top = runScore(e) === bestScore && this.sort === 'best' && rank === 1;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(40, y - 30, W - 80, 62);
      ctx.fillStyle = e.won ? '#8a6a1c' : '#3a2d52';
      ctx.fillRect(43, y - 27, W - 86, 56);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(46, y - 24, W - 92, 50);
      drawText(ctx, String(rank), 76, y, 3, top ? '#ffd23f' : COLORS.textDim);
      drawSprite(ctx, heroSprite(e.cabinet), 130, y, 2);
      const stake = STAKES[e.stake];
      drawText(ctx, CABINETS[e.cabinet].hero, 164, y - 12, 2, COLORS.goldLight, { align: 'left' });
      const sub = `${CABINETS[e.cabinet].name}  ${e.stake ? `STAKE ${e.stake} ${stake.name}` : 'BASE GAME'}`;
      const subX = 164 + CABINETS[e.cabinet].hero.length * 12 + 14;
      drawText(ctx, sub, subX, y - 12, 1.25, e.stake ? stake.color : COLORS.textDim, { align: 'left' });
      // Result.
      const icon = e.won ? 'trophySmall' : 'hsSkull';
      if (hasSprite(icon)) drawSprite(ctx, artId(icon), 172, y + 13, 1.5);
      const tag = e.daily ? `DAILY ${e.daily.slice(5)}` : e.weekly ? `WEEKLY ${e.weekly}` : e.challenge ? `CHALLENGE: ${CHALLENGES.find((c) => c.id === e.challenge)?.name ?? ''}` : '';
      // On the hero's line, after the machine (it sat on the row's border).
      if (tag) drawText(ctx, tag, subX + sub.length * 7.5 + 16, y - 12, 1.25, '#7dff7a', { align: 'left' });
      const result = e.won
        ? e.acts >= 3
          ? e.loops ? `BEAT THE DEALER + ${e.loops} ENDLESS LOOP${e.loops > 1 ? 'S' : ''}` : 'BEAT THE DEALER! TRUE ENDING'
          : 'BEAT THE MIRROR! RUN CLEARED'
        : `KILLED BY ${e.killer ?? '???'}, FIGHT ${e.killerFight ?? e.fights + 1}/${e.total}`;
      drawText(ctx, result, 188, y + 13, 1.5, e.won ? '#ffd23f' : '#ff8a7a', { align: 'left' });
      if (!e.won && e.killerPortrait) drawSprite(ctx, e.killerPortrait as SpriteId, 188 + result.length * 9 + 22, y + 4, 1.5);
      // Build: relics then charms.
      const bx = 650;
      e.relics.slice(0, 14).forEach((r, k) => {
        drawSprite(ctx, RELICS[r].sprite as SpriteId, bx + (k % 7) * 26, y - 12 + Math.floor(k / 7) * 26, 1.4);
        this.relicTips.add(r, bx + (k % 7) * 26, y - 12 + Math.floor(k / 7) * 26, 13, e.cabinet);
      });
      if (e.relics.length > 14) drawText(ctx, `+${e.relics.length - 14}`, bx + 7 * 26, y + 14, 1.25, COLORS.textDim, { align: 'left' });
      if (!e.relics.length) drawText(ctx, 'NO RELICS', bx, y - 12, 1.25, COLORS.textDim, { align: 'left' });
      const cx = 860;
      e.charms.forEach((c, k) => {
        const x = cx + (k % 4) * 30;
        const yy = y - 12 + Math.floor(k / 4) * 26;
        drawSprite(ctx, (CHARM_SYMBOLS[c.enh][0] ?? 'shield') as SpriteId, x, yy, 1.4);
        drawSprite(ctx, ENH_SPRITE[c.enh], x, yy, 1.4);
        if (c.lvl > 1) drawText(ctx, `L${c.lvl}`, x + 10, yy + 9, 1, '#ffffff');
        if (c.n) drawText(ctx, `${c.n}`, x - 11, yy + 9, 1, '#ffd23f');
      });
      if (!e.charms.length) drawText(ctx, 'NO CHARMS', cx - 12, y - 12, 1.25, COLORS.textDim, { align: 'left' });
      // Score and date.
      drawText(ctx, String(runScore(e)), W - 64, y - 8, 3, top ? '#ffd23f' : COLORS.text, { align: 'right', punch: top ? 1 + 0.04 * Math.sin(t * 4) : 1 });
      const d = new Date(e.at);
      drawText(ctx, `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}  ${e.maxHp} MAX HP`, W - 64, y + 18, 1.25, COLORS.textDim, { align: 'right' });
    });
    const pages = Math.ceil(list.length / ROWS_PER_PAGE);
    if (pages > 1) drawText(ctx, `PAGE ${this.page + 1}/${pages}`, W / 2, H - 36, 2, COLORS.textDim);
    drawText(ctx, 'N: CHARMED CELLS   L2: CHARM LEVEL', 60, H - 30, 1.25, COLORS.textDim, { align: 'left' });
  }

  /** An online board: the top players (their best), you highlighted. */
  private drawBoard(ctx: CanvasRenderingContext2D, t: number): void {
    const key = this.boardKey(this.tab);
    const sub = this.tab === 'daily' ? `THE DAILY RUN ${dailyKey().slice(5)} - ONE TRY EACH` : this.tab === 'weekly' ? `THE WEEKLY CHALLENGE ${weekKey()} - YOUR BEST TRY` : 'REGULAR RUNS, ANY STAKE (NO ENDLESS) - YOUR BEST';
    drawText(ctx, sub, W / 2, 140, 1.5, COLORS.textDim);
    if (!online()) {
      drawText(ctx, STEAM ? 'THE ONLINE BOARDS ARE OFF' : 'THE ONLINE BOARDS ARE NOT OPEN YET', W / 2, H / 2 - 16, 3, COLORS.textDim);
      drawText(ctx, 'YOUR RUNS ARE STILL SAVED UNDER MY RUNS', W / 2, H / 2 + 24, 1.5, COLORS.textDim);
      return;
    }
    const rows = this.boards.get(key);
    if (rows === null || rows === undefined) {
      drawText(ctx, 'LOADING...', W / 2, H / 2, 3, COLORS.textDim, { alpha: 0.6 + 0.4 * Math.sin(t * 5) });
      return;
    }
    if (rows === 'error') {
      drawText(ctx, "COULDN'T REACH THE BOARDS. TRY AGAIN LATER", W / 2, H / 2, 2.5, COLORS.danger);
      return;
    }
    if (!rows.length) {
      drawText(ctx, 'NO SCORES YET. BE THE FIRST!', W / 2, H / 2, 3, COLORS.textDim);
      return;
    }
    const me = this.cb.playerName();
    rows.forEach((r, i) => {
      const y = 186 + i * 50;
      const mine = r.name === me;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(140, y - 23, W - 280, 46);
      ctx.fillStyle = mine ? '#8a6a1c' : i === 0 ? '#5a4a1c' : '#3a2d52';
      ctx.fillRect(143, y - 20, W - 286, 40);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(146, y - 17, W - 292, 34);
      drawText(ctx, String(i + 1), 180, y, 2.5, i === 0 ? '#ffd23f' : COLORS.textDim);
      if ((CABINET_ORDER as string[]).includes(r.cabinet)) drawSprite(ctx, heroSprite(r.cabinet), 226, y, 1.5);
      drawText(ctx, r.name, 256, y - 6, 2, mine ? '#ffd23f' : COLORS.goldLight, { align: 'left' });
      drawText(ctx, `LV ${r.level} ${r.title}`, 256, y + 11, 1.25, COLORS.textDim, { align: 'left' });
      const st = STAKES[r.stake];
      drawText(ctx, `${r.won ? 'CLEARED' : 'FELL'}${r.stake ? ` - ${st?.name ?? ''} STAKE` : ''}`, 760, y, 1.5, r.won ? '#ffd23f' : '#ff8a7a', { align: 'left' });
      drawText(ctx, String(r.score), W - 170, y, 2.5, i === 0 ? '#ffd23f' : COLORS.text, { align: 'right', punch: i === 0 ? 1 + 0.04 * Math.sin(t * 4) : 1 });
    });
  }
}
