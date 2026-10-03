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
import { STAKES } from '../core/stakes';
import type { Clock } from '../present/clock';
import { sineOut } from '../present/ease';
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
export type MenuMode = 'none' | 'loading' | 'name' | 'main' | 'collection' | 'hiscores' | 'challenges' | 'trophies';
/** HISCORES tabs: your own runs, or the online boards. */
export type ScoreTab = 'mine' | 'daily' | 'weekly' | 'all';

export const CHARM_INFO: Record<Enh, { name: string; text: string }> = {
  gold: { name: 'GOLD', text: `SWORDS, SHIELDS OR BOLTS. ${charmRuleText('gold', 1)}. LEVELS: X3, X4.` },
  keen: { name: 'KEEN', text: `SWORDS. ${charmRuleText('keen', 1)}.` },
  charged: { name: 'CHARGED', text: `TESLA'S BOLTS. ${charmRuleText('charged', 1)}.` },
  spiked: { name: 'BULWARK', text: `KNIGHT. SHIELDS. ${charmRuleText('spiked', 1)}.` },
  vamp: { name: 'VAMP', text: `SWORDS. ${charmRuleText('vamp', 1)}.` },
  lucky: { name: 'LUCKY', text: `ACT 2. ${charmRuleText('lucky', 1)}.` },
  blaze: { name: 'BLAZE', text: `ACT 2. TESLA'S BOLTS. ${charmRuleText('blaze', 1)}.` },
};
/** Charms in the COLLECTION (SPIKED retired). */
const CHARM_ORDER: Enh[] = ['gold', 'keen', 'vamp', 'spiked', 'charged', 'lucky', 'blaze'];

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
  /** The main menu's big-row icons (the rows change once you've played a run). */
  private mainIcons: string[] = [];
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
    },
  ) {}

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
    this.buttons = [];
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
    this.btn('NEW RUN', x, 318, 380, 54, () => this.cb.onNewRun(), 3).opts.idlePulse = !first;
    // THE DAILY RUN: today's slot machine, one try a day (then its score).
    const today = dailyKey();
    const run = this.profile().runs.find((e) => e.daily === today);
    const done = dailySpent(today, this.profile().lastDaily);
    const label = run ? `DAILY: ${runScore(run)}` : done ? 'DAILY: SPENT' : `DAILY: ${CABINETS[dailyCabinet(today)].name} + ${EDGE_TEXT[dailyEdge(today)].title}`;
    const daily = this.btn(label, x, 380, 380, 54, () => !done && this.cb.onDaily(), label.length > 20 ? 1.5 : label.length > 14 ? 2 : 3);
    daily.toggled = done;
    // THE WEEKLY CHALLENGE gets its own row once you've played a run (the TUTORIAL moves to the small row).
    const veteran = !first && this.profile().stats.runs > 0;
    this.mainIcons = ['iconNewRun', 'chip'];
    if (veteran) {
      const key = weekKey();
      const wk = weekly(key);
      const best = this.profile().challenges[`weekly:${key}`];
      // Short: the machine (or your best); the week's edges are on the CHALLENGES screen and the run's first card.
      const wl = best ? `WEEKLY: BEST ${best.best}` : `WEEKLY: ${CABINETS[wk.cabinet].name}`;
      this.btn(wl, x, 442, 380, 54, () => this.cb.onWeekly(), wl.length > 18 ? 2 : 3);
      this.btn('CHALLENGES', x, 504, 380, 54, () => this.showChallenges(), 3);
      this.mainIcons.push('trophySmall', 'trophySmall');
      const w = 89;
      this.btn('TUTORIAL', x - 1.5 * (w + 8), 566, w, 54, () => this.cb.onTutorial(), 1.25);
      this.btn('COLLECTION', x - 0.5 * (w + 8), 566, w, 54, () => this.showCollection(), 1.25);
      this.btn('TROPHIES', x + 0.5 * (w + 8), 566, w, 54, () => this.showTrophies(), 1.25);
      this.btn('HISCORES', x + 1.5 * (w + 8), 566, w, 54, () => this.showHiscores(), 1.25);
    } else {
      this.btn('CHALLENGES', x, 442, 380, 54, () => this.showChallenges(), 3);
      this.btn('TUTORIAL', x, 504, 380, 54, () => this.cb.onTutorial(), 3).opts.idlePulse = first;
      this.mainIcons.push('trophySmall', 'iconTutorial');
      this.btn('COLLECTION', x - 128, 566, 124, 54, () => this.showCollection(), 1.5);
      this.btn('TROPHIES', x, 566, 124, 54, () => this.showTrophies(), 1.5);
      this.btn('HISCORES', x + 128, 566, 124, 54, () => this.showHiscores(), 1.5);
    }
    const light = this.btn(this.cb.softLightning() ? 'LIGHTNING: SOFT' : 'LIGHTNING: FULL', 150, 36, 260, 40, () => {
      this.cb.setSoftLightning(!this.cb.softLightning());
      light.label = this.cb.softLightning() ? 'LIGHTNING: SOFT' : 'LIGHTNING: FULL';
      light.toggled = this.cb.softLightning();
    });
    light.toggled = this.cb.softLightning();
    this.resetArmed = 0;
    const reset = this.btn('RESET SAVE', W - 110, 36, 190, 40, () => {
      if (performance.now() - this.resetArmed < 400) return;
      if (!this.resetArmed) {
        this.resetArmed = performance.now();
        reset.label = 'SURE? CLICK AGAIN';
        reset.w = 250;
        reset.x = W - 140;
        this.sounds.fizzle();
        setTimeout(() => {
          if (this.mode !== 'main') return;
          this.resetArmed = 0;
          reset.label = 'RESET SAVE';
          reset.w = 190;
          reset.x = W - 110;
        }, 2500);
        return;
      }
      this.cb.onReset();
      this.showMain();
    });
  }

  showCollection(): void {
    this.open('collection');
    this.btn('BACK', 100, 44, 140, 48, () => this.showMain());
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
    this.btn('BACK', 100, 44, 140, 48, () => this.showMain());
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
    drawText(ctx, online() ? 'IT GOES ON THE LEADERBOARDS: THE DAILY, THE WEEKLY AND ALL TIME' : 'YOUR NAME FOR THE HISCORES (ONLINE BOARDS OPENING SOON)', W / 2, NAME_Y - 66, 1.5, COLORS.textDim);
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
    this.btn('BACK', 100, 44, 140, 48, () => this.showMain());
    this.btn('PLAY', W - 170, 150, 180, 54, () => this.cb.onWeekly(), 3);
    const rec = this.profile().challenges;
    CHALLENGES.forEach((c, i) => {
      const b = this.btn(rec[c.id]?.won ? 'AGAIN' : 'PLAY', W - 130, CH_Y + i * CH_ROW, 140, 40, () => this.cb.onChallenge(c.id));
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
    this.btn('BACK', 100, 44, 140, 48, () => this.showMain());
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
      this.titleTips.push({ x: x + w / 2, y, w, text: have ? `${t.title}: CLICK TO WEAR IT` : `${t.title}: ${t.how}` });
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
      this.titleTips.push({ x: tx, y: TRIM_Y, w: 52, text: have ? `${t.name} TRIM: CLICK TO PUT IT ON YOUR SLOT MACHINE` : `${t.name} TRIM: REACH LEVEL ${t.level}` });
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
      return true;
    }
    if (this.mode === 'loading') {
      if ((k === ' ' || k === 'enter') && this.ready) this.pointerDown(0, 0);
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
    else if (this.mode === 'collection') this.drawCollection(ctx);
    else if (this.mode === 'hiscores') this.drawHiscores(ctx, t);
    else if (this.mode === 'name') this.drawName(ctx, t);
    else if (this.mode === 'challenges') this.drawChallenges(ctx, t);
    else if (this.mode === 'trophies') this.drawTrophies(ctx);
    for (const b of this.buttons) b.draw(ctx, t);
    if (this.mode === 'trophies') this.drawTrimRow(ctx);
    if (this.mode === 'main') {
      // Icons on the menu buttons (over them, scaled with their press).
      const icons = this.mainIcons;
      this.buttons.slice(0, 4).forEach((b, i) => {
        if (hasSprite(icons[i])) drawSprite(ctx, artId(icons[i]), b.x - (b.w / 2 - 38) * b.scale, b.y, 2.5 * b.scale);
      });
    }
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
    if (this.ready) drawText(ctx, TOUCH ? 'TAP TO PLAY' : 'CLICK TO PLAY', W / 2, 560, 3, COLORS.goldLight, { alpha: 0.55 + 0.45 * Math.sin(t * 5) });
    else drawText(ctx, `SHUFFLING THE REELS... ${Math.round(p * 100)}%`, W / 2, 530, 2, COLORS.textDim);
    drawText(ctx, 'PLAYTEST BUILD. PROGRESS SAVES IN THIS BROWSER.', W / 2, H - 30, 1.5, COLORS.textDim);
  }

  private drawMain(ctx: CanvasRenderingContext2D, t: number): void {
    // The casino backdrop shows through; darken it so the menu reads.
    ctx.fillStyle = 'rgba(6,2,12,0.72)';
    ctx.fillRect(0, 0, W, H);
    this.logo(ctx, 130, t);
    drawText(ctx, 'A SLOT MACHINE ROGUELIKE', W / 2, 238, 2, COLORS.textDim);
    // Your unlocked heroes on the left, their machines on the right.
    const open = this.unlocked();
    CABINET_ORDER.forEach((id, i) => {
      const on = open.has(id);
      const y = 300 + i * 70;
      const bob = on ? Math.sin(t * 2 + i) * 2 : 0;
      drawSprite(ctx, on ? heroSprite(id) : 'playerPortrait', 190, y + bob, 2.5, on ? {} : { variant: 'black', alpha: 0.5 });
      drawText(ctx, on ? CABINETS[id].hero : '???', 240, y, 2, on ? COLORS.goldLight : COLORS.textDim, { align: 'left' });
      drawText(ctx, on ? CABINETS[id].name : 'LOCKED', 240, y + 20, 1.25, COLORS.textDim, { align: 'left' });
    });
    drawSprite(ctx, 'cabinetKnight', W - 250, 440, 4.5, { rot: Math.sin(t * 1.3) * 0.02 });
    if (hasSprite('menuBackdrop')) drawSprite(ctx, artId('menuBackdrop'), W / 2, 646, 3);
    const p = this.profile();
    const found = p.found.relics.length + p.found.charms.length;
    const total = RELIC_ORDER.length + CHARM_ORDER.length;
    const best = p.runs.reduce((m, e) => Math.max(m, runScore(e)), 0);
    drawText(ctx, `COLLECTION ${found}/${total}   RUNS ${p.stats.runs}   BEST ${best}`, W / 2, 604, 1.5, COLORS.textDim);
    this.badge(ctx, W / 2, 20);
    if (!this.cb.tutorialDone()) drawText(ctx, 'NEW HERE? TRY THE TUTORIAL', W / 2, 268, 2, COLORS.goldLight, { alpha: 0.6 + 0.4 * Math.sin(t * 4) });
    drawText(ctx, 'PLAYTEST BUILD', 20, H - 20, 1.5, COLORS.textDim, { align: 'left' });
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
      const x = W / 2 + (i - 2.5) * 150;
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
    const cols = 14;
    const pitch = 80;
    RELIC_ORDER.forEach((r, i) => {
      const x = W / 2 + ((i % cols) - (cols - 1) / 2) * pitch;
      const y = 330 + Math.floor(i / cols) * 76;
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
    const py = 610;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(W / 2 - 424, py - 44, 848, 92);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(W / 2 - 420, py - 40, 840, 84);
    const shown = tip as { title: string; text: string; color: string } | null;
    if (shown) {
      drawText(ctx, shown.title, W / 2, py - 20, 2.5, shown.color);
      wrap(shown.text, 64).slice(0, 2).forEach((l, k) => drawText(ctx, l, W / 2, py + 10 + k * 20, 2, COLORS.text));
    } else drawText(ctx, 'HOVER OR TAP A TILE TO READ IT', W / 2, py, 2, COLORS.textDim);
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
      e.relics.slice(0, 14).forEach((r, k) => drawSprite(ctx, RELICS[r].sprite as SpriteId, bx + (k % 7) * 26, y - 12 + Math.floor(k / 7) * 26, 1.4));
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
      drawText(ctx, 'THE ONLINE BOARDS ARE NOT OPEN YET', W / 2, H / 2 - 16, 3, COLORS.textDim);
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
