import type { Sounds } from '../../audio/sounds';
import { type EncounterChoice, type EncounterResult } from '../../core/encounters';
import { POT } from '../../core/relics';
import { needsRoute, type DraftOption, type FightRecord, type RunState, type ShopItem, dealerEvery } from '../../core/run';
import { type CabinetId } from '../../core/cabinets';
import { effectiveAbility } from '../../core/stakes';
import type { RelicId } from '../../core/config';
import { Clock } from '../../present/clock';
import { backOut, sineOut } from '../../present/ease';
import { COLORS, H, W } from '../../present/layout';
import { drawSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { type BossRuleContext } from '../bossRules';
import { RelicTips } from '../relicTip';
import { ScreenMode, Hit, Btn, INPUT_GUARD_MS, MapTip, CX, CW, FLIP_TAB, drawBackdrop } from './shared';

/**
 * Canvas overlays between fights: the draft (pick 1 of 3), the next-fight preview (or a fork:
 * pick 1 of 2 enemies) and the end-of-run summary. The only place the player makes choices.
 */
export abstract class RunScreensBase {
  mode: ScreenMode = 'none';
  protected run: RunState | null = null;
  protected offers: DraftOption[] = [];
  protected cards: Hit[] = [];
  protected buttons: Btn[] = [];
  protected fade = 0;
  protected mouse = { x: -1, y: -1 };
  protected tips = new RelicTips();
  /** The enemy cards: flip (0 front, 1 back) and hover start, keyed by the card's x. */
  protected flips = new Map<number, number>();
  /** The last pointer was a finger: no hover-to-flip (a tap left a stuck "hover" that flipped the card). */
  touch = false;
  /** A tap flips a card for touch players (the card's x, or -1). */
  protected pinned = -1;
  protected frameDt = 0;
  protected lastDraw = 0;
  /** The card's entrance: rise-in, portrait landing, skulls popping, cadence pips filling. */
  protected panelIn = 1;
  protected portraitPop = 1;
  protected skullPop = [1, 1, 1];
  protected pipFill = 99;
  protected lastPip = 1;
  /** LEVELS pane: the last level seen per row, and when a row last went up (it punches and sparkles). */
  protected lvSeen = new Map<string, number>();
  protected lvPunch = new Map<string, number>();
  protected lvRun: RunState | null = null;
  /** The map node under the pointer (its tip is drawn over everything on the screen). */
  protected mapTip: MapTip | null = null;
  /** The route the player has tapped on the path pick (-1: none yet), and the one under the pointer. */
  protected routeSel = -1;
  /** ENCOUNTER: how it went (null until a choice is played), and its reveal (0..1). */
  protected encResult: EncounterResult | null = null;
  protected encT = 1;
  /** The encounter on show (the run has moved past its stop once it's played). */
  protected encId: string | undefined;
  /** The encounter's choices as dealt (buy-in cards first), and the sounds already played this reveal. */
  protected encChoices: EncounterChoice[] = [];
  protected encFired = new Set<string>();
  /** The games' own clock (the dealer's cards, the claw, a turning card): SKIP fast-forwards only it. */
  protected encClock = new Clock();
  /** RED OR BLACK: the bet on the stepper, the wheel's and ball's angles, the ball's radius, which spin this is, and the
   * offscreen canvas the wheel is drawn on (small, then scaled up crisp so it reads as pixel art). */
  protected rlBet = 5;
  /** RED OR BLACK / DICE: the bet's win or loss, paid at the call (a quit can't re-roll it) but shown when the ball or
   * dice land (it counted up while the wheel still spun, so the landing looked unpaid: user playtest). */
  protected chipsLanding = 0;
  /** TWENTY-ONE: a finished hand on show (the dealer's cards turn one by one), how many of them are up, its word. */
  protected bjShow: NonNullable<EncounterResult['hand']> | null = null;
  /** TWENTY-ONE: the hand the counter last showed. */
  protected bjNo = 1;
  protected bjDealerUp = 0;
  protected bjMsg: EncounterResult | null = null;
  /** HIGHER OR LOWER, as the screen shows it (it holds while a finished call is up; the run's state moves at the call):
   * the card showing, the next one (0: still face down) and how far it has turned and slid over (0..1), the cards turned
   * this game (each its own suit), the right calls, the bet, the pot and its punch, which game this is, and whether a
   * game is on the table. */
  protected hl = { card: 0, next: 0, flip: 0, slide: 0, turned: 0, right: 0, bet: 0, pot: 0, potPop: 1, game: 1 };
  protected hlLive = false;
  protected hlMsg: EncounterResult | null = null;
  /** CLAW MACHINE: where the claw is (x, and 0 up .. 1 down), shut or open, carrying its target, the last go. */
  protected cwX = CW.home;
  protected cwY = 0;
  protected cwShut = false;
  protected cwCarry = false;
  protected cwTarget = -1;
  protected cwMsg: EncounterResult | null = null;
  /** Prizes won at this stop, as the screen shows them (the run's list moves before the claw lands, and clears after the last go). */
  protected cwWon: number[] = [];
  /** Shop purchases in flight to YOUR BUILD. */
  protected flyers: { sprite: SpriteId; x0: number; y0: number; x1: number; y1: number; t: number }[] = [];
  protected picked = -1;
  protected lastRecord: FightRecord | null = null;
  /** 'spoils' = an elite's relic choice (1 of 2) shown with the draft layout. */
  protected draftKind: 'draft' | 'spoils' | 'legend' | 'start' = 'draft';
  protected shopItems: ShopItem[] = [];
  /** The price tags: clicking a tag buys (clicking the item only shows what it is). */
  protected shopTags: Hit[] = [];
  /** The item whose card a click or tap pinned open (-1: none). */
  protected shopSel = -1;
  protected shopHits: Hit[] = [];
  protected chipPulse = 1;
  protected openedAt = 0;
  protected cabinetUnlocked: Set<CabinetId> = new Set(['knight']);
  protected unlockedNow: CabinetId[] = [];
  /** HIGH STAKES: best unlocked stake per cabinet, the chosen stake, and what the last run unlocked. */
  protected stakes: Partial<Record<CabinetId, number>> = {};
  protected stakeSel = 0;
  protected stakeUnlockedNow = '';
  /** The stake track's chips (focus / click targets), the select pop (0..1) and a refused locked chip (shakes). */
  protected stakeHits: Btn[] = [];
  protected stakePop = 1;
  protected stakeDeny = { level: -1, at: 0 };
  /** THE RESULTS card over the run-over table: XP filling, a level up, achievements, titles, unlocks. */
  protected results: { xp: number; fill: Promise<void> | null; done: boolean; level: number; pop: number } | null = null;
  protected resultsHit: Hit | null = null;

  constructor(
    protected ui: Clock,
    protected sounds: Sounds,
    protected cb: {
      onPick: (o: DraftOption) => void;
      onSpoils: (relic: RelicId) => void;
      onLegend: (relic: RelicId) => void;
      onFight: () => void;
      /** The opener is done: take route `i` of the act's map. */
      onRoute: (i: number) => void;
      /** Play encounter choice `i` (the run applies it; the screen shows how it went). */
      onEncounter: (i: number, bet?: number) => EncounterResult | null;
      /** The encounter's result was seen: on along the map. */
      onEncounterDone: () => void;
      onNewRun: () => void;
      onMenu: () => void;
      /** ENDLESS: keep going after the Dealer. */
      onLetItRide: () => void;
      onBuy: (index: number) => void;
      onReroll: () => void;
      onLeave: () => void;
      onCabinet: (id: CabinetId) => void;
      /** The chosen HIGH STAKES level changed (persisted by the game). */
      onStake: (level: number) => void;
    },
  ) {}

  /** The House's skim cadence for this run (BLACK makes it 3). */
  /** What a boss's rules depend on (bossRules.ts). */
  protected bossCtx(): BossRuleContext {
    const run = this.run;
    return { stake: run?.stake ?? 0, cabinet: run?.cabinet, houseEvery: this.houseEvery(), loop: run?.endless?.loop, dealerEvery: run ? dealerEvery(run) : undefined };
  }

  protected houseEvery(): number {
    const run = this.run;
    return run ? effectiveAbility({ kind: 'jackpot', every: POT.cashEvery, power: 1 }, { stake: run.stake, act: 1, sandglass: run.player.relics.includes('sandglass') }).every : 4;
  }

  get active(): boolean {
    return this.mode !== 'none';
  }

  protected open(mode: ScreenMode): void {
    this.mode = mode;
    this.openedAt = performance.now();
    this.cards = [];
    this.buttons = [];
    this.shopHits = [];
    // The price tags too: they used to stay live (and buy from the old shelf) after leaving the shop (STEAM_QA_1 Q2).
    this.shopTags = [];
    this.picked = -1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.fade = v) });
  }

  protected hit(x: number, y: number, w: number, h: number, onClick: () => void): Hit {
    return { x, y, w, h, hover: false, pressed: false, scale: 0, lift: 0, onClick, enabled: true };
  }

  protected btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Btn {
    return { ...this.hit(x, y, w, h, onClick), label, scale: 1 };
  }
  /** A secondary button: quiet purple, no breathing. */
  protected minorBtn(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Btn {
    return { ...this.btn(label, x, y, w, h, onClick), minor: true };
  }

  hide(): void {
    this.mode = 'none';
  }

  // ---- input -------------------------------------------------------------------------

  /** Keyboard / gamepad focus targets (STEAM_READINESS S3): everything clickable, plus the cards' "?" flip tabs. */
  navTargets(): { x: number; y: number; w: number; h: number }[] {
    if (!this.active || performance.now() - this.openedAt < INPUT_GUARD_MS) return [];
    const out: { x: number; y: number; w: number; h: number }[] = [...this.all().filter((h) => h.enabled), ...(this.mode !== 'cabinet' ? this.relicRects : [])];
    if (this.mode === 'next' && this.run && !needsRoute(this.run)) {
      const px = CX - 330;
      out.push({ x: px + 660 - FLIP_TAB.w / 2 - 8, y: 214 + 260 - FLIP_TAB.h / 2 - 8, w: FLIP_TAB.w + 16, h: FLIP_TAB.h + 16 });
    }
    return out;
  }

  /** The build panel's relic icons (drawn each frame): focus targets, so keyboard and pad players can read them (Q7). */
  protected relicRects: { x: number; y: number; w: number; h: number }[] = [];

  protected all(): Hit[] {
    if (this.mode === 'over' && this.results && this.resultsHit) return [this.resultsHit];
    return [...this.cards.filter((c) => c.enabled), ...this.buttons, ...this.shopHits.filter((_, i) => !this.shopItems[i]?.sold), ...this.shopTags.filter((_, i) => !this.shopItems[i]?.sold)];
  }

  protected inside(h: Hit, x: number, y: number): boolean {
    return h.enabled && x >= h.x - h.w / 2 && x <= h.x + h.w / 2 && y >= h.y - h.h / 2 && y <= h.y + h.h / 2;
  }

  pointerMove(x: number, y: number): boolean {
    this.mouse = { x, y };
    let any = false;
    for (const h of this.all()) {
      const was = h.hover;
      h.hover = this.inside(h, x, y);
      if (h.hover && !was && this.cards.includes(h) && this.picked < 0) void this.ui.to(h, 'lift', -10, 0.12, backOut());
      if (!h.hover && was) void this.ui.to(h, 'lift', 0, 0.12);
      any ||= h.hover;
    }
    return any;
  }

  pointerDown(x: number, y: number): boolean {
    // A fresh screen ignores clicks for a moment, so a double-click can't buy on arrival (ITERATION_9 H8). A press that
    // starts in that moment still counts if it's released after it (playtest: draft clicks during the deal were dropped).
    // (A card still being dealt in, too small to see, can't be picked.)
    const h = this.all().find((h) => this.inside(h, x, y) && !(this.cards.includes(h) && h.scale < 0.3));
    if (performance.now() - this.openedAt < INPUT_GUARD_MS) {
      if (h) h.pressed = true;
      return this.active;
    }
    // Only the card's "?" tab flips it (picking is the FIGHT button): one spot per action, so taps never mix them up.
    if (!h && this.mode === 'next' && this.run && !needsRoute(this.run)) {
      const px = CX - 330;
      if (x >= px + 660 - FLIP_TAB.w - 16 && x <= px + 660 && y >= 214 + 260 - FLIP_TAB.h - 16 && y <= 214 + 260) {
        this.pinned = this.pinned === px ? -1 : px;
        this.sounds.click();
        return true;
      }
    }
    if (!h) return this.active;
    h.pressed = true;
    h.scale = Math.min(h.scale, 0.95);
    return true;
  }

  pointerUp(x: number, y: number): void {
    for (const h of this.all()) {
      if (!h.pressed) continue;
      h.pressed = false;
      if (!this.inside(h, x, y) || performance.now() - this.openedAt < INPUT_GUARD_MS) {
        void this.ui.to(h, 'scale', 1, 0.1);
        continue;
      }
      this.sounds.click();
      void this.ui.to(h, 'scale', 1.08, 0.08, sineOut).then(() => (this.picked < 0 || !this.cards.includes(h) ? this.ui.to(h, 'scale', 1, 0.1, backOut()) : undefined));
      h.onClick();
    }
  }

  // ---- drawing -----------------------------------------------------------------------

  /** THE ROOMS: draws the run's room (set by the game), behind the screens between fights. */
  roomBackdrop: ((ctx: CanvasRenderingContext2D, time: number) => void) | null = null;

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.active || (!this.run && this.mode !== 'cabinet')) return;
    this.tips.begin();
    // The act's room stays behind every screen of the run (playtesters: the Cashier and the encounters should be in the
    // same place as the fights), dimmed so the cards read; the machine select keeps the plain casino carpet. Either
    // way it's solid: the fight scene never shows through.
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.roomBackdrop && this.mode !== 'cabinet') {
      drawBackdrop(ctx);
      this.roomBackdrop(ctx, time);
      ctx.fillStyle = 'rgba(6,3,12,0.58)';
      ctx.fillRect(0, 0, W, H);
    } else drawBackdrop(ctx);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.mode === 'draft') this.drawDraft(ctx, time);
    else if (this.mode === 'next') this.drawNext(ctx, time);
    else if (this.mode === 'shop') this.drawShop(ctx, time);
    else if (this.mode === 'cabinet') this.drawCabinets(ctx, time);
    else if (this.mode === 'encounter') this.drawEncounter(ctx, time);
    else this.drawOver(ctx);
    // YOUR BUILD: one fixed panel at the bottom of every between-fights screen.
    if (this.run && this.mode !== 'cabinet') this.drawBuild(ctx);
    // THE RESULTS card sits over everything, the build panel too (drawn under it, it hid the card's left side).
    if (this.mode === 'over' && this.results && this.run) this.drawResults(ctx);
    for (const f of this.flyers) {
      const x = f.x0 + (f.x1 - f.x0) * f.t;
      const y = f.y0 + (f.y1 - f.y0) * f.t - Math.sin(f.t * Math.PI) * 90;
      drawSprite(ctx, f.sprite, x, y, 4 - 2.5 * f.t, { rot: f.t * Math.PI * 2 * 0.5 });
    }
    // Over everything: what the relic under the pointer does (cards that already say it don't add spots).
    if (!this.results) this.tips.draw(ctx, this.mouse.x, this.mouse.y, this.run?.cabinet);
    ctx.restore();
  }

  protected panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border = COLORS.gold): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    ctx.fillStyle = border;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
  }

  protected drawButton(ctx: CanvasRenderingContext2D, b: Btn, time: number): void {
    if (b.ghost) return;
    // Only the screen's next step breathes; secondary buttons sit still.
    const pulse = b.minor || b.quiet || !b.enabled ? 1 : 1 + 0.02 + 0.02 * Math.sin((time * Math.PI * 2) / 1.6);
    ctx.save();
    // A button you can't press looks it (juice: never inert-but-clickable-looking).
    if (!b.enabled) ctx.globalAlpha *= 0.4;
    ctx.translate(b.x, b.y);
    ctx.scale(b.scale * pulse, b.scale * pulse);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-b.w / 2 - 3, -b.h / 2 - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = b.minor ? (b.pressed ? '#1a1428' : b.hover ? '#3a2e52' : COLORS.panelLight) : b.pressed ? '#2a0806' : b.tint ? (b.hover ? '#4a3e5a' : b.tint) : b.hover ? '#e04a2f' : '#c8321f';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = b.minor ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, (b.h - 8) / 2);
    // The big size whenever the label fits the button (the boss buttons used to drop a size).
    drawText(ctx, b.label, 0, 1, b.label.length <= 11 || b.label.length * 18 <= b.w - 30 ? 3 : 2, b.minor ? COLORS.goldLight : '#fff6c8');
    ctx.restore();
  }

  protected abstract drawBuild(ctx: CanvasRenderingContext2D, inFight?: boolean): void;
  protected abstract drawDraft(ctx: CanvasRenderingContext2D, time: number): void;
  protected abstract drawNext(ctx: CanvasRenderingContext2D, time: number): void;
  protected abstract drawShop(ctx: CanvasRenderingContext2D, time: number): void;
  protected abstract drawCabinets(ctx: CanvasRenderingContext2D, time: number): void;
  protected abstract drawEncounter(ctx: CanvasRenderingContext2D, time: number): void;
  protected abstract drawOver(ctx: CanvasRenderingContext2D): void;
  protected abstract drawResults(ctx: CanvasRenderingContext2D): void;
}
