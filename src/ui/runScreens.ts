import type { Sounds } from '../audio/sounds';
import type { Enh, GameConfig, StripCounts, SymbolId } from '../core/config';
import { actLength, ELITE_HP_MUL, ELITE_HP_MUL_2, type EnemyDef } from '../core/enemies';
import { LEGENDARY, REFLECT_CAP, REFLECT_MIN, RELICS, RUSH } from '../core/relics';
import {
  chipShield,
  CHIPS,
  completesSet,
  MIRROR_CHIP_SHIELD_CAP,
  describeOption,
  enemyHp,
  mirrorCopy,
  isRelicDraft,
  needsChoice,
  rerollCost,
  setProgress,
  runActs,
  totalFights,
  type BonusPayout,
  type DraftOption,
  type FightRecord,
  type RunState,
  type ShopItem,
} from '../core/run';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../core/cabinets';
import { effectiveAbility, mirrorCanUse, STAKE, STAKES, stakeOf } from '../core/stakes';
import type { RelicId } from '../core/config';
import { COUNTER_RELICS } from '../core/relics';
import { DANGER } from '../core/enemies';
import type { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { ABILITY_UI } from '../present/hud';
import { ENH_SPRITE } from '../present/reel';
import { COLORS, H, W } from '../present/layout';
import { artId, drawSprite, hasSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';
import { heroSprite } from './menus';

export type ScreenMode = 'none' | 'draft' | 'next' | 'over' | 'shop' | 'cabinet' | 'bonus';

/** Greedy word wrap for the pixel font. */
export function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  hover: boolean;
  pressed: boolean;
  scale: number;
  lift: number;
  onClick: () => void;
  enabled: boolean;
}

type Btn = Hit & { label: string };

const SYMBOLS: SymbolId[] = ['sword', 'shield', 'bolt', 'wild', 'rock'];

/** What each enemy writes on your machine, as a map badge. */
export const BADGE: Record<string, SpriteId> = {
  slime: 'mapBadgeSlime',
  frost: 'mapBadgeIce',
  thief: 'mapBadgeClaw',
  golem: 'mapBadgeRock',
  gremlin: 'mapBadgeLock',
  brute: 'mapBadgeFist',
  house: 'mapBadgeCoin',
  bomber: artId('mapBadgeBomb'),
  hexer: artId('mapBadgeHex'),
  vampire: artId('mapBadgeFang'),
  mimic: artId('mapBadgeMimic'),
  mirror: artId('mapBadgeMirror'),
  grounder: artId('mapBadgeGround'),
  counterfeiter: artId('mapBadgeFake'),
  sharp: artId('mapBadgeCard'),
  pitboss: artId('mapBadgeGavel'),
  croupier: artId('mapBadgeRake'),
  dealer: artId('mapBadgeDealer'),
};

const INPUT_GUARD_MS = 250;

const rounds = (turns: number) => { const n = Math.ceil(turns / 2); return `${n} ROUND${n === 1 ? '' : 'S'}`; };

function abilityText(e: EnemyDef, every: number, run?: RunState): string {
  if (!e.ability) return '';
  const ui = ABILITY_UI[e.ability.kind];
  const cap = run ? Math.max(REFLECT_MIN, Math.round(run.player.maxHp * REFLECT_CAP)) : e.ability.power;
  const what: Record<string, string> = {
    flood: `SLIMES ${e.ability.power} OF YOUR SYMBOLS`,
    smash: `HITS FOR ${e.ability.power}`,
    fortify: `GAINS ${e.ability.power} SHIELD`,
    blizzard: `FREEZES ${e.ability.power} REELS FOR 2 TURNS`,
    pilfer: `STEALS ${e.ability.power} SYMBOL${e.ability.power > 1 ? 'S' : ''}`,
    quake: `ADDS ${e.ability.power} ROCKS TO YOUR STRIPS`,
    jam: `JAMS A REEL FOR ${e.ability.power} TURNS`,
    jackpot: 'SKIMS HALF THE POT AT YOU',
    carpet: `STICKS ${e.ability.power} BOMBS ON YOUR CELLS`,
    curse: `HEXES ${e.ability.power} REEL${e.ability.power > 1 ? 'S' : ''} FOR 3 TURNS`,
    bloodmoon: `HEALS ${e.ability.power} HP`,
    gulp: `EATS ${e.ability.power} OF YOUR CHIPS`,
    reflect: `THROWS YOUR BEST HIT SINCE THE LAST ONE BACK (${REFLECT_MIN} TO ${cap})`,
    earth: `DRAINS ${e.ability.power} OF YOUR ENERGY`,
    launder: `TAKES ${e.ability.power} CHIPS AND HEALS ${e.ability.power * 3}`,
    mark: `MARKS ${e.ability.power} OF YOUR CELLS`,
    penalty: `HITS FOR ${e.ability.power}`,
    houseTake: `RAKES YOUR GROUPS FOR ${e.ability.power} TURNS`,
    deal: 'DEALS A FACE-UP CARD: SHUFFLE, CUT OR RAISE',
  };
  return `${ui.label} EVERY ${every} TURNS: ${what[e.ability.kind]}`;
}

/**
 * Canvas overlays between fights: the draft (pick 1 of 3), the next-fight preview (or a fork:
 * pick 1 of 2 enemies) and the end-of-run summary. The only place the player makes choices.
 */
export class RunScreens {
  mode: ScreenMode = 'none';
  private run: RunState | null = null;
  private offers: DraftOption[] = [];
  private cards: Hit[] = [];
  private buttons: Btn[] = [];
  private fade = 0;
  private picked = -1;
  private lastRecord: FightRecord | null = null;
  /** 'spoils' = an elite's relic choice (1 of 2) shown with the draft layout. */
  private draftKind: 'draft' | 'spoils' | 'legend' = 'draft';
  private shopItems: ShopItem[] = [];
  private shopHits: Hit[] = [];
  private chipPulse = 1;
  private openedAt = 0;
  private cabinetUnlocked: Set<CabinetId> = new Set(['knight']);
  private unlockedNow: CabinetId[] = [];
  /** HIGH STAKES: best unlocked stake per cabinet, the chosen stake, and what the last run unlocked. */
  private stakes: Partial<Record<CabinetId, number>> = {};
  private stakeSel = 0;
  private stakeUnlockedNow = '';
  /** The slot machines that have beaten the Dealer (TRUE ENDING). */
  private dealerBeaten: CabinetId[] = [];

  constructor(
    private ui: Clock,
    private sounds: Sounds,
    _base: () => GameConfig,
    private cb: {
      onPick: (o: DraftOption) => void;
      onSpoils: (relic: RelicId) => void;
      onLegend: (relic: RelicId) => void;
      onFight: (option: number) => void;
      onNewRun: () => void;
      onMenu: () => void;
      onBuy: (index: number) => void;
      onReroll: () => void;
      onLeave: () => void;
      onCabinet: (id: CabinetId) => void;
      /** The chosen HIGH STAKES level changed (persisted by the game). */
      onStake: (level: number) => void;
    },
  ) {}

  /** Pick your starting machine (pre-run). Locked cabinets show how to unlock them. */
  showCabinets(unlocked: Set<CabinetId>, stakes: Partial<Record<CabinetId, number>> = {}, stakeSel = 0, _act3 = false, dealerBeaten: CabinetId[] = []): void {
    this.cabinetUnlocked = unlocked;
    this.dealerBeaten = dealerBeaten;
    this.stakes = stakes;
    this.run = null;
    this.open('cabinet');
    this.stakeSel = Math.min(stakeSel, this.maxStake());
    // HIGH STAKES picker (only once some cabinet has a stake unlocked).
    if (this.maxStake() > 0) {
      const step = (d: number) => {
        this.stakeSel = Math.max(0, Math.min(this.maxStake(), this.stakeSel + d));
        this.sounds.click();
        CABINET_ORDER.forEach((id, i) => {
          if (this.cards[i]) this.cards[i].enabled = this.cabinetUnlocked.has(id) && this.stakeFor(id) >= this.stakeSel;
        });
        this.cb.onStake(this.stakeSel);
      };
      this.buttons = [this.btn('LOWER', W / 2 - 430, 640, 110, 40, () => step(-1)), this.btn('HIGHER', W / 2 + 430, 640, 110, 40, () => step(1))];
    }
    this.buttons.push(this.btn('MENU', 90, 40, 130, 44, () => this.cb.onMenu()));
    this.cards = CABINET_ORDER.map((id, i) => {
      const h = this.hit(W / 2 + (i - 2) * 240, 380, 220, 420, () => {
        if (!this.cabinetUnlocked.has(id) || this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        void this.ui
          .tween({ from: 1.05, to: 1.12, dur: 0.15, ease: backOut(2), onUpdate: (v) => (h.scale = v) })
          .then(() => this.ui.wait(0.3))
          .then(() => this.cb.onCabinet(id));
      });
      h.enabled = unlocked.has(id) && this.stakeFor(id) >= this.stakeSel;
      void this.ui.wait(0.1 + i * 0.08).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (h.scale = v) }));
      return h;
    });
  }

  /** The House's skim cadence for this run (BLACK makes it 3). */
  private houseEvery(): number {
    const run = this.run;
    return run ? effectiveAbility({ kind: 'jackpot', every: 4, power: 1 }, { stake: run.stake, act: 1, sandglass: run.player.relics.includes('sandglass') }).every : 4;
  }

  private maxStake(): number {
    return Math.max(0, ...Object.values(this.stakes).map((n) => n ?? 0));
  }

  private stakeFor(id: CabinetId): number {
    return this.stakes[id] ?? 0;
  }

  /** "STAKE 2 UNLOCKED FOR KNIGHT" (shown on the run-over screen). */
  setStakeUnlockedNow(text: string): void {
    this.stakeUnlockedNow = text;
  }

  // ---- BONUS WHEEL & RELIC RUSH payouts ------------------------------------------------

  private bonusList: BonusPayout[] = [];
  private bonusIdx = 0;
  private bonusDone: () => void = () => {};
  /** Wheel: current angle (radians) and whether it has landed. Rush: stuck cells (pop 0..1), respins left, revealed. */
  private wheelAngle = 0;
  private bonusLanded = false;
  private rushCells: number[] = [];
  private rushFlicker: number[] = [];
  private rushRespins = 0;

  /** Cash the vouchers from the fight you just won: each plays out, then `done`. */
  showBonus(run: RunState, list: BonusPayout[], done: () => void): void {
    this.run = run;
    this.bonusList = list;
    this.bonusIdx = 0;
    this.bonusDone = done;
    this.open('bonus');
    this.playBonus();
  }

  private playBonus(): void {
    const b = this.bonusList[this.bonusIdx];
    this.buttons = [];
    this.bonusLanded = false;
    if (!b) return this.bonusDone();
    if (b.kind === 'wheel') {
      // Spin several turns and land the picked slice under the pointer (top).
      const n = b.options.length;
      const slice = (Math.PI * 2) / n;
      const target = Math.PI * 2 * 5 - (b.pick + 0.5) * slice;
      this.wheelAngle = 0;
      let lastTick = 0;
      void this.ui
        .tween({
          from: 0,
          to: target,
          dur: 4.2,
          ease: (t) => 1 - Math.pow(1 - t, 3),
          onUpdate: (v) => {
            this.wheelAngle = v;
            const tick = Math.floor(v / slice);
            if (tick !== lastTick) {
              lastTick = tick;
              this.sounds.click();
            }
          },
        })
        .then(() => this.bonusReveal());
    } else {
      this.rushCells = Array(15).fill(0);
      this.rushFlicker = Array(15).fill(0);
      this.rushRespins = 3;
      void this.playRushFrames(b);
    }
  }

  private async playRushFrames(b: Extract<BonusPayout, { kind: 'rush' }>): Promise<void> {
    for (const [k, frame] of b.frames.entries()) {
      if (k > 0) {
        // Every empty cell flickers, then the new relics slam in.
        const flick = { v: 0 };
        await this.ui.tween({
          from: 0,
          to: 1,
          dur: 0.4,
          onUpdate: (v) => {
            flick.v = v;
            this.rushFlicker = this.rushCells.map((c) => (c ? 0 : Math.random() < 0.5 ? 1 : 0));
          },
        });
        this.rushFlicker = Array(15).fill(0);
      }
      for (const i of frame) {
        this.rushCells[i] = 1;
        this.sounds.coin(4 + (i % 8));
      }
      if (k > 0) this.rushRespins = frame.length ? 3 : this.rushRespins - 1;
      await this.ui.wait(frame.length ? 0.28 : 0.12);
    }
    this.bonusReveal();
  }

  private bonusReveal(): void {
    this.bonusLanded = true;
    this.sounds.fanfareJackpot();
    const last = this.bonusIdx >= this.bonusList.length - 1;
    this.buttons = [
      this.btn(last ? 'COLLECT' : 'NEXT VOUCHER', W / 2, 650, 280, 56, () => {
        this.bonusIdx++;
        if (this.bonusIdx >= this.bonusList.length) this.bonusDone();
        else this.playBonus();
      }),
    ];
  }

  private drawBonus(ctx: CanvasRenderingContext2D, time: number): void {
    const b = this.bonusList[this.bonusIdx];
    if (!b) return;
    const wheel = b.kind === 'wheel';
    drawText(ctx, wheel ? 'BONUS WHEEL' : 'RELIC RUSH', W / 2, 50, 6, wheel ? '#ffd23f' : '#c080ff');
    drawText(ctx, `VOUCHER ${this.bonusIdx + 1} OF ${this.bonusList.length}`, W - 40, 60, 2, COLORS.textDim, { align: 'right' });
    if (b.kind === 'wheel') this.drawWheel(ctx, b, time);
    else this.drawRush(ctx, b, time);
    for (const btn of this.buttons) this.drawButton(ctx, btn, time);
  }

  private optionIcon(o: DraftOption): SpriteId {
    if (o.kind === 'gild') return ENH_SPRITE[o.enh];
    if (o.kind === 'swap') return (o.to === 'wild' ? 'wild' : o.to) as SpriteId;
    if (o.kind === 'clear') return 'cardClear';
    if (o.kind === 'add') return o.symbol as SpriteId;
    if (o.kind === 'heal') return 'shopHeal';
    if (o.kind === 'maxHp') return 'heart';
    return 'cardSwap';
  }

  private drawWheel(ctx: CanvasRenderingContext2D, b: Extract<BonusPayout, { kind: 'wheel' }>, time: number): void {
    const cx = W / 2;
    const cy = 320;
    const R = 190;
    const n = b.options.length;
    const slice = (Math.PI * 2) / n;
    ctx.save();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < n; i++) {
      // Slice i spans [a0, a1] measured from the top, clockwise.
      const a0 = -Math.PI / 2 + this.wheelAngle + i * slice;
      const won = this.bonusLanded && i === b.pick;
      ctx.fillStyle = won ? '#ffd23f' : i % 2 ? '#3a2458' : '#5a2a3a';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a0 + slice);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = COLORS.outline;
      ctx.lineWidth = 2;
      ctx.stroke();
      const mid = a0 + slice / 2;
      const ix = cx + Math.cos(mid) * R * 0.72;
      const iy = cy + Math.sin(mid) * R * 0.72;
      const o = b.options[i];
      // A charm shows its symbol wearing the charm.
      if (o.kind === 'gild') drawSprite(ctx, o.symbol as SpriteId, ix, iy, 2.2);
      drawSprite(ctx, this.optionIcon(o), ix, iy, 2.2);
    }
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Pointer at the top.
    if (hasSprite('wheelPointer')) drawSprite(ctx, artId('wheelPointer'), cx, cy - R - 14, 4);
    else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - R - 26);
      ctx.lineTo(cx + 14, cy - R - 26);
      ctx.lineTo(cx, cy - R + 4);
      ctx.fill();
    }
    if (this.bonusLanded) {
      const { title, text } = describeOption(b.options[b.pick], this.run ?? undefined);
      this.panel(ctx, W / 2 - 320, 540, 640, 64);
      drawText(ctx, `YOU WIN: ${title}`, W / 2, 560, 3, COLORS.goldLight, { punch: 1 + 0.05 * Math.sin(time * 6) });
      drawText(ctx, text, W / 2, 588, 1.5, COLORS.text);
    }
  }

  private drawRush(ctx: CanvasRenderingContext2D, b: Extract<BonusPayout, { kind: 'rush' }>, time: number): void {
    const cols = 5;
    const size = 96;
    const x0 = W / 2 - (cols * size) / 2 + size / 2;
    const y0 = 190;
    this.panel(ctx, W / 2 - (cols * size) / 2 - 10, y0 - size / 2 - 10, cols * size + 20, 3 * size + 20, '#c080ff');
    for (let i = 0; i < 15; i++) {
      const x = x0 + (i % cols) * size;
      const y = y0 + Math.floor(i / cols) * size;
      ctx.fillStyle = '#140a22';
      ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size - 8, size - 8);
      if (this.rushCells[i]) drawSprite(ctx, artId('relicSym'), x, y, 4.5, { flash: 0.15 + 0.15 * Math.sin(time * 5 + i) });
      else if (this.rushFlicker[i]) drawSprite(ctx, artId('relicSym'), x, y, 4, { alpha: 0.35 });
      else drawSprite(ctx, artId(hasSprite('rushJunk') ? 'rushJunk' : 'rushEmpty'), x, y, 3.5, { alpha: 0.6 });
    }
    const count = this.rushCells.filter(Boolean).length;
    drawText(ctx, `RELICS ${count} / 15`, W / 2 - 120, 500, 3, '#c080ff');
    drawText(ctx, this.bonusLanded ? 'DONE' : `RESPINS ${this.rushRespins}`, W / 2 + 140, 500, 3, this.rushRespins <= 1 && !this.bonusLanded ? '#ff6a5a' : COLORS.text);
    drawText(ctx, `UP TO ${RUSH.commonMax} COMMON  -  ${RUSH.commonMax + 1}-${RUSH.uncommonMax} UNCOMMON  -  ${RUSH.uncommonMax + 1}+ LEGENDARY`, W / 2, 530, 1.5, COLORS.textDim);
    if (this.bonusLanded) {
      const tierColor = b.tier === 'legendary' ? '#ffd23f' : b.tier === 'uncommon' ? '#5ad8e8' : '#c9c9d9';
      const badge = b.tier === 'legendary' ? 'tierLegendary' : b.tier === 'uncommon' ? 'tierUncommon' : 'tierCommon';
      if (hasSprite(badge)) drawSprite(ctx, artId(badge), W / 2 - 250, 580, 3);
      if (b.relic) {
        drawSprite(ctx, RELICS[b.relic].sprite as SpriteId, W / 2 - 200, 580, 3);
        drawText(ctx, `${b.tier.toUpperCase()}: ${RELICS[b.relic].name}${b.count >= 15 ? `  +  GRAND! +${b.chips} CHIPS` : ''}`, W / 2 - 170, 568, 2.5, tierColor, { align: 'left' });
        drawText(ctx, RELICS[b.relic].text, W / 2 - 170, 596, 1.5, COLORS.text, { align: 'left' });
      } else drawText(ctx, `NO RELIC LEFT FOR YOU: +${b.chips} CHIPS`, W / 2, 580, 2.5, tierColor);
    }
  }

  /** Cabinets unlocked by the run that just ended (shown on the run-over screen). */
  setUnlockedNow(ids: CabinetId[]): void {
    this.unlockedNow = ids;
  }

  /** Unaffordable purchase: shake the item. */
  deny(i: number): void {
    const h = this.shopHits[i];
    if (!h) return;
    void this.ui.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (h.lift = Math.sin(v * 30) * 6 * v) });
  }

  get active(): boolean {
    return this.mode !== 'none';
  }

  private open(mode: ScreenMode): void {
    this.mode = mode;
    this.openedAt = performance.now();
    this.cards = [];
    this.buttons = [];
    this.shopHits = [];
    this.picked = -1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.fade = v) });
  }

  private hit(x: number, y: number, w: number, h: number, onClick: () => void): Hit {
    return { x, y, w, h, hover: false, pressed: false, scale: 0, lift: 0, onClick, enabled: true };
  }

  private btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Btn {
    return { ...this.hit(x, y, w, h, onClick), label, scale: 1 };
  }

  showSpoils(run: RunState, relics: RelicId[], last: FightRecord | null): void {
    this.showDraft(run, relics.map((relic) => ({ kind: 'relic', relic }) as DraftOption), last, 'spoils');
  }

  /** An act's boss fell: pick 1 of 3 legendary relics. */
  showLegend(run: RunState, relics: RelicId[], last: FightRecord | null): void {
    this.showDraft(run, relics.map((relic) => ({ kind: 'relic', relic }) as DraftOption), last, 'legend');
    this.sounds.fanfareJackpot();
  }

  showDraft(run: RunState, offers: DraftOption[], last: FightRecord | null, kind: 'draft' | 'spoils' | 'legend' = 'draft'): void {
    this.draftKind = kind;
    this.run = run;
    this.offers = offers;
    this.lastRecord = last;
    this.open('draft');
    const n = offers.length;
    this.cards = offers.map((o, i) =>
      this.hit(W / 2 + (i - (n - 1) / 2) * 300, 384, 270, 222, () => {
        if (this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        const card = this.cards[i];
        void this.ui
          .tween({ from: 1.08, to: 1.18, dur: 0.15, ease: backOut(2), onUpdate: (v) => (card.scale = v) })
          .then(() => this.ui.wait(0.35))
          .then(() =>
            kind === 'legend' && o.kind === 'relic' ? this.cb.onLegend(o.relic) : kind === 'spoils' && o.kind === 'relic' ? this.cb.onSpoils(o.relic) : this.cb.onPick(o),
          );
      }),
    );
    // Deal the cards in.
    this.cards.forEach(
      (c, i) =>
        void this.ui.wait(0.12 + i * 0.09).then(() => {
          this.sounds.click();
          return this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (c.scale = v) });
        }),
    );
  }

  showNext(run: RunState): void {
    this.run = run;
    this.open('next');
    if (needsChoice(run)) {
      this.buttons = run.paths[run.depth].map((_, i) => this.btn('FIGHT THIS ONE', W / 2 + (i === 0 ? -310 : 310), 580, 260, 56, () => this.cb.onFight(i)));
    } else {
      const boss = run.depth >= actLength(run.act) ? (run.act > 2 ? 'FACE THE DEALER' : run.act > 1 ? 'FACE THE MIRROR' : 'FACE THE HOUSE') : 'FIGHT!';
      this.buttons = [this.btn(boss, W / 2, 640, 290, 64, () => this.cb.onFight(0))];
    }
  }

  /** The Cashier: four priced slots, a reroll and a way out. */
  showShop(run: RunState, items: ShopItem[], reopen = false): void {
    this.run = run;
    this.shopItems = items;
    if (!reopen) this.open('shop');
    this.buttons = [
      this.btn(`REROLL - ${rerollCost(run)}`, W / 2 - 170, 654, 250, 56, () => this.cb.onReroll()),
      this.btn('LEAVE', W / 2 + 170, 654, 250, 56, () => this.cb.onLeave()),
    ];
    const gap = items.length > 4 ? 234 : 250;
    this.shopHits = items.map((_, i) => {
      const h = this.hit(W / 2 + (i - (items.length - 1) / 2) * gap, 380, gap - 22, 296, () => this.cb.onBuy(i));
      h.scale = reopen ? 1 : 0;
      return h;
    });
    if (!reopen)
      this.shopHits.forEach(
        (c, i) =>
          void this.ui.wait(0.1 + i * 0.07).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.28, ease: backOut(2), onUpdate: (v) => (c.scale = v) })),
      );
  }

  /** Called after a purchase: bounce the chip counter and refresh the shelf. */
  bought(): void {
    void this.ui.tween({ from: 1.6, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.chipPulse = v) });
    if (this.run) this.showShop(this.run, this.shopItems, true);
  }

  showOver(run: RunState): void {
    this.run = run;
    this.open('over');
    this.buttons = [this.btn('MENU', W / 2 - 140, 650, 240, 60, () => this.cb.onMenu()), this.btn('NEW RUN', W / 2 + 140, 650, 240, 60, () => this.cb.onNewRun())];
  }

  hide(): void {
    this.mode = 'none';
  }

  // ---- input -------------------------------------------------------------------------

  private all(): Hit[] {
    return [...this.cards.filter((c) => c.enabled), ...this.buttons, ...this.shopHits.filter((_, i) => !this.shopItems[i]?.sold)];
  }

  private inside(h: Hit, x: number, y: number): boolean {
    return h.enabled && x >= h.x - h.w / 2 && x <= h.x + h.w / 2 && y >= h.y - h.h / 2 && y <= h.y + h.h / 2;
  }

  pointerMove(x: number, y: number): boolean {
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
    // A fresh screen ignores clicks for a moment, so a double-click can't buy on arrival (ITERATION_9 H8).
    if (performance.now() - this.openedAt < INPUT_GUARD_MS) return this.active;
    const h = this.all().find((h) => this.inside(h, x, y));
    if (!h) return this.active;
    h.pressed = true;
    h.scale = Math.min(h.scale, 0.95);
    return true;
  }

  pointerUp(x: number, y: number): void {
    for (const h of this.all()) {
      if (!h.pressed) continue;
      h.pressed = false;
      if (!this.inside(h, x, y)) {
        void this.ui.to(h, 'scale', 1, 0.1);
        continue;
      }
      this.sounds.click();
      void this.ui.to(h, 'scale', 1.08, 0.08, sineOut).then(() => (this.picked < 0 || !this.cards.includes(h) ? this.ui.to(h, 'scale', 1, 0.1, backOut()) : undefined));
      h.onClick();
    }
  }

  // ---- drawing -----------------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.active || (!this.run && this.mode !== 'cabinet')) return;
    ctx.fillStyle = `rgba(6,2,12,${0.95 * this.fade})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.mode === 'draft') this.drawDraft(ctx, time);
    else if (this.mode === 'next') this.drawNext(ctx, time);
    else if (this.mode === 'shop') this.drawShop(ctx, time);
    else if (this.mode === 'cabinet') this.drawCabinets(ctx, time);
    else if (this.mode === 'bonus') this.drawBonus(ctx, time);
    else this.drawOver(ctx);
    if (this.mode !== 'over' && this.mode !== 'cabinet') this.drawChips(ctx, W - 40, 28);
    ctx.restore();
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border = COLORS.gold): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    ctx.fillStyle = border;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
  }

  /** The run as a path of nodes (forks stacked) with portraits and writer badges. */
  private drawMap(ctx: CanvasRenderingContext2D, y: number, time: number): void {
    const run = this.run!;
    const n = run.paths.length;
    const gap = 150;
    const x0 = W / 2 - ((n - 1) * gap) / 2;
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(x0, y - 2, (n - 1) * gap, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y - 2, Math.min(run.depth, n - 1) * gap, 4);
    run.paths.forEach((opts, i) => {
      const x = x0 + i * gap;
      const done = i < run.depth;
      const here = i === run.depth;
      const fork = opts.length > 1;
      if (fork) drawSprite(ctx, 'mapFork', x - 44, y, 2);
      opts.forEach((e, k) => {
        const ny = fork ? y + (k === 0 ? -30 : 30) : y;
        const chosen = run.chosen[i] && run.enemies[i] === e;
        const faded = fork && run.chosen[i] && !chosen;
        const s = fork ? 22 : 28;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(x - s, ny - s, s * 2, s * 2);
        ctx.fillStyle = e.isBoss ? '#5a1a10' : here && !faded ? '#3a2a14' : COLORS.panelLight;
        ctx.fillRect(x - s + 3, ny - s + 3, s * 2 - 6, s * 2 - 6);
        drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x, ny, fork ? 1.5 : 2, { dim: done || faded ? 0.65 : 0 });
        const badge = BADGE[e.archetype];
        if (badge) drawSprite(ctx, badge, x + s - 2, ny + s - 4, 2, { alpha: faded ? 0.4 : 1 });
        if (e.elite) drawSprite(ctx, 'mapBadgeElite', x - s + 4, ny - s + 4, 2, { alpha: faded ? 0.4 : 1 });
        if (done && chosen) drawSprite(ctx, 'nodeDone', x - s + 6, ny + s - 6, 2);
      });
      if (here) drawSprite(ctx, 'nodeHere', x, y - (fork ? 70 : 44) + Math.sin(time * 6) * 4, 2);
      if (opts[0].isBoss) drawSprite(ctx, 'nodeBoss', x, y - 38, 2);
      drawText(ctx, opts[0].isBoss ? 'BOSS' : `${i + 1}`, x, y + (fork ? 64 : 42), 2, here ? COLORS.goldLight : done ? '#6a6078' : COLORS.textDim);
    });
  }

  private drawStrips(ctx: CanvasRenderingContext2D, x: number, y: number, strips: StripCounts[]): void {
    drawText(ctx, 'YOUR REELS', x, y, 2, COLORS.textDim, { align: 'left' });
    // Laid out like the machine: reels 1 2 3 left to right, each reel's symbols down its column.
    const rows = SYMBOLS.filter((sym) => !(sym === 'rock' || sym === 'wild') || strips.some((s) => (s[sym] ?? 0) > 0));
    const colW = 76;
    strips.forEach((s, r) => {
      const cx = x + 20 + r * colW;
      drawText(ctx, `${r + 1}`, cx + 10, y + 20, 2, COLORS.goldLight);
      rows.forEach((sym, k) => {
        const n = s[sym] ?? 0;
        const ry = y + 40 + k * 19;
        drawSprite(ctx, sym as SpriteId, cx, ry, 1.2, { alpha: n ? 1 : 0.3 });
        const gild = this.run?.player.gilded.find((g) => g.reel === r && g.symbol === sym);
        if (gild && n) drawSprite(ctx, ENH_SPRITE[gild.enh], cx, ry, 1.2);
        drawText(ctx, `${n}`, cx + 16, ry, 2, gild ? '#ffd23f' : n ? COLORS.text : '#4a4058', { align: 'left' });
      });
    });
  }

  private drawRelics(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const relics = this.run!.player.relics;
    drawText(ctx, 'RELICS', x, y, 2, COLORS.textDim, { align: 'left' });
    if (!relics.length) drawText(ctx, 'NONE YET', x, y + 26, 2, '#4a4058', { align: 'left' });
    relics.forEach((r, i) => drawSprite(ctx, RELICS[r].sprite as SpriteId, x + 16 + (i % 10) * 32, y + 30 + Math.floor(i / 10) * 32, 1.75));
  }

  private drawHp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const p = this.run!.player;
    drawSprite(ctx, 'heart', x + 8, y, 2);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x + 22, y - 11, w + 4, 22);
    ctx.fillStyle = '#0b0712';
    ctx.fillRect(x + 24, y - 9, w, 18);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(x + 24, y - 9, (w * p.hp) / p.maxHp, 18);
    drawText(ctx, `${p.hp}/${p.maxHp}`, x + 24 + w / 2, y + 1, 2, COLORS.text);
  }

  private drawDraft(ctx: CanvasRenderingContext2D, time: number): void {
    const last = this.lastRecord;
    drawText(ctx, last ? `${last.enemy} DEFEATED!` : 'CHOOSE A REWARD', W / 2, 30, 4, COLORS.goldLight);
    if (last) {
      const rocks = last.rocksCrumbled ? `  -  ${last.rocksCrumbled} ROCKS CRUMBLED` : '';
      const chips = last.chips ? `  -  +${last.chips} CHIPS` : '';
      drawText(ctx, `${rounds(last.turns)}  -  HP ${last.hpBefore} TO ${last.hpAfter}  -  PATCHED UP TO ${this.run!.player.hp}${chips}${rocks}`, W / 2, 60, 2, COLORS.textDim);
    }
    this.drawMap(ctx, 158, time);
    const spoils = this.draftKind === 'spoils';
    const legend = this.draftKind === 'legend';
    const relicDraft = !spoils && !legend && isRelicDraft(this.run!);
    const act3Arrival = !legend && !spoils && this.run!.act >= 3 && this.run!.depth === 0 && this.run!.actIntro;
    const heading = act3Arrival
      ? 'ACT 3 - THE HOUSE HAS A PARTNER - FULLY HEALED - CHOOSE ONE'
      : legend
        ? 'ACT 2 BEGINS - FULLY HEALED - CHOOSE A LEGENDARY RELIC'
        : spoils
          ? 'ELITE SPOILS - CHOOSE A RELIC'
          : relicDraft
            ? 'RELIC DRAFT - CHOOSE ONE'
            : 'CHOOSE ONE';
    if (act3Arrival && hasSprite('actPlaque3')) drawSprite(ctx, artId('actPlaque3'), W / 2, 208, 3);
    drawText(ctx, heading, W / 2, legend ? 236 : 244, 3, legend ? COLORS.goldLight : spoils ? '#ff9a3a' : relicDraft ? '#c9a0ff' : COLORS.text);
    const sig = CABINETS[this.run!.cabinet].act2;
    if (legend && sig) drawText(ctx, `${CABINETS[this.run!.cabinet].name} ACT 2 SIGNATURE: ${sig.text}`, W / 2, 262, 2, '#c8f0ff');
    this.cards.forEach((c, i) => this.drawCard(ctx, c, this.offers[i], i, time));
    this.panel(ctx, 110, 530, 1060, 134);
    this.drawStrips(ctx, 130, 546, this.run!.player.strips);
    this.drawRelics(ctx, 560, 546);
    drawText(ctx, 'HP', 900, 546, 2, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, 900, 586, 220);
  }

  private drawCard(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption, i: number, time: number): void {
    if (c.scale <= 0.01) return;
    const dimmed = this.picked >= 0 && this.picked !== i;
    const { title, text } = describeOption(o, this.run ?? undefined);
    const prep = o.kind === 'relic' && COUNTER_RELICS.has(o.relic);
    const accent = prep ? '#ff9a3a' : o.kind === 'gild' ? '#ffd23f' : o.kind === 'relic' ? '#c9a0ff' : o.kind === 'clear' ? '#c9bba8' : o.kind === 'swap' || o.kind === 'add' ? '#7dff7a' : '#ff9ab0';
    ctx.save();
    ctx.globalAlpha *= dimmed ? 0.3 : 1;
    ctx.translate(c.x, c.y + c.lift);
    ctx.scale(c.scale, c.scale);
    const w = c.w;
    const h = c.h;
    if (c.hover && this.picked < 0) {
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 24;
      ctx.fillStyle = accent;
      ctx.globalAlpha *= 0.5 + 0.2 * Math.sin(time * 6);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    this.panel(ctx, -w / 2, -h / 2, w, h, c.hover || this.picked === i ? accent : COLORS.gold);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-w / 2, -h / 2, w, 70);
    // Icon.
    const iy = -h / 2 + 42;
    const reelMarker = (reel: number) => {
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = r === reel ? accent : '#3a2e52';
        ctx.fillRect(-w / 2 + 12 + r * 11, iy - 20, 8, 36);
      }
      drawText(ctx, `REEL ${reel + 1}`, -w / 2 + 27, iy + 30, 1, COLORS.textDim);
    };
    if (o.kind === 'relic') {
      drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
      if (prep) drawSprite(ctx, 'cardPrep', w / 2 - 28, iy - 18, 2);
    }
    else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, -44, iy, 3);
      drawSprite(ctx, 'arrowRight', 0, iy, 3);
      drawSprite(ctx, o.to as SpriteId, 44, iy, 3);
      reelMarker(o.reel);
    } else if (o.kind === 'clear') {
      drawSprite(ctx, 'cardClear', -18, iy, 3.5);
      drawSprite(ctx, 'rock', 30, iy + 10, 2);
      reelMarker(o.reel);
    } else if (o.kind === 'add') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, 'plusBadge', 32, iy + 24, 3);
      reelMarker(o.reel);
    } else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, ENH_SPRITE[o.enh], 0, iy, 4);
      drawSprite(ctx, 'cardGild', 40, iy + 20, 2);
      reelMarker(o.reel);
    } else if (o.kind === 'heal') drawSprite(ctx, 'heart', 0, iy, 5);
    else {
      drawSprite(ctx, 'heart', 0, iy, 5);
      drawSprite(ctx, 'plusBadge', 30, iy + 22, 3);
    }
    drawText(ctx, title, 0, 2, title.length > 13 ? 2 : 3, accent);
    wrap(text, 20).forEach((line, k) => drawText(ctx, line, 0, 32 + k * 20, 2, COLORS.text));
    if (this.run && completesSet(this.run, o)) this.setTag(ctx, -w / 2 + 8, -h / 2 + 6, time);
    if (this.run && o.kind === 'gild') this.setPips(ctx, w / 2 - 12, -h / 2 + 14, o.enh);
    if (o.kind === 'relic' && LEGENDARY.has(o.relic)) this.legendTag(ctx, 0, -h / 2 + 14, time);
    if (o.kind === 'relic' && this.run && this.run.stake >= STAKE.mirrorRelic && this.draftKind === 'legend')
      drawText(ctx, mirrorCanUse(o.relic) ? 'THE MIRROR WILL COPY THIS' : 'THE MIRROR CAN\'T USE THIS', 0, h / 2 - 14, 1.5, mirrorCanUse(o.relic) ? '#ff8a7a' : '#7dff7a');

    ctx.restore();
  }

  /** Gold "COMPLETES SET" ribbon (playtest ITERATION_5: finishing a set is the best buy in the game). */
  private setTag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const glow = 0.75 + 0.25 * Math.sin(time * 6);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x, y, 134, 18);
    ctx.fillStyle = COLORS.gold;
    ctx.globalAlpha = glow;
    ctx.fillRect(x + 2, y + 2, 130, 14);
    ctx.globalAlpha = 1;
    if (hasSprite('setRibbon')) {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x, y, 134, 18);
      drawSprite(ctx, artId('setRibbon'), x + 67, y + 9, 2);
      return;
    }
    ctx.fillStyle = '#5a3a0a';
    ctx.fillRect(x + 2, y + 2, 130, 14);
    drawText(ctx, 'SET READY', x + 67, y + 9, 1.5, '#fff6c8');
  }

  /** Violet/gold LEGENDARY ribbon inside the top of a card. */
  private legendTag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 58, y - 9, 116, 18);
    ctx.fillStyle = '#6a2aa0';
    ctx.fillRect(x - 56, y - 7, 112, 14);
    drawText(ctx, 'LEGENDARY', x, y, 1.5, COLORS.goldLight, { alpha: 0.8 + 0.2 * Math.sin(time * 5) });
  }

  /** Set progress pips: one per reel that already carries this gild. */
  private setPips(ctx: CanvasRenderingContext2D, x: number, y: number, enh: Enh): void {
    const run = this.run!;
    const need = run.player.relics.includes('ticket') ? 2 : 3;
    const have = setProgress(run, enh);
    for (let k = 0; k < need; k++) {
      const px = x - (need - 1 - k) * 12;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(px - 5, y - 5, 10, 10);
      ctx.fillStyle = k < have ? COLORS.goldLight : k === have ? '#8a6a2a' : '#2a2238';
      ctx.fillRect(px - 3, y - 3, 6, 6);
    }
  }

  /** One enemy's scouting report. */
  private drawEnemyPanel(ctx: CanvasRenderingContext2D, e: EnemyDef, x: number, y: number, w: number, time: number): void {
    this.panel(ctx, x, y, w, 300, e.isBoss || e.elite ? '#ff6a5a' : COLORS.gold);
    // Danger rating: 1-3 skulls from the archetype's single-fight danger (x1.25 for elites).
    const danger = (DANGER[e.archetype] ?? 8) * (e.elite ? 1.25 : 1);
    const pips = e.isBoss ? 3 : danger >= 20 ? 3 : danger >= 9 ? 2 : 1;
    for (let k = 0; k < pips; k++) drawSprite(ctx, 'dangerPip', x + w - 20 - k * 20, y + 18, 2);
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(x + 16, y + 16, 104, 104);
    drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x + 68, y + 68 + Math.sin(time * 2) * 2, 4);
    const badge = BADGE[e.archetype];
    if (badge) drawSprite(ctx, badge, x + 112, y + 112, 3);
    const tx = x + 136;
    drawText(ctx, e.name ?? 'ENEMY', tx, y + 30, e.name && e.name.length > 18 ? 2 : 3, e.isBoss ? '#ff6a5a' : COLORS.slime, { align: 'left' });
    {
      const big = wrap(e.blurb, Math.floor((w - 150) / 12));
      const small = big.length > 2;
      const lines = small ? wrap(e.blurb, Math.floor((w - 150) / 9)) : big;
      lines.slice(0, 3).forEach((l, k) => drawText(ctx, l, tx, y + 58 + k * (small ? 13 : 18), small ? 1.5 : 2, COLORS.text, { align: 'left' }));
    }
    const hp = enemyHp(this.run!, e);
    drawText(ctx, `HP ${hp}`, tx, y + 104, 2, COLORS.hp, { align: 'left' });
    if (e.boss === 'house') {
      const sh = chipShield(this.run!.player.chips);
      drawSprite(ctx, 'chipShield', tx + 110, y + 104, 2);
      drawText(ctx, `YOUR ${this.run!.player.chips} CHIPS: +${sh} SHIELD EACH HOUSE TURN`, tx + 128, y + 104, 1, '#9fd0ff', { align: 'left' });
    }
    if (e.elite)
      drawText(
        ctx,
        (e.act ?? 1) > 1 ? `ELITE: +${Math.round((ELITE_HP_MUL_2 - 1) * 100)}% HP. PAYS ${CHIPS.act2EliteChips + CHIPS.eliteBonus} CHIPS` : `ELITE: +${e.archetype === 'thief' ? 15 : Math.round((ELITE_HP_MUL - 1) * 100)}% HP, 1 OF 2 RELICS, +${CHIPS.eliteBonus} CHIPS`,
        tx + 90,
        y + 104,
        1.5,
        '#ff9a3a',
        { align: 'left' },
      );
    if (e.counter) {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x + w - 170, y + 36, 156, 20);
      ctx.fillStyle = '#3b8ef0';
      ctx.fillRect(x + w - 168, y + 38, 152, 16);
      drawText(ctx, 'YOUR COUNTER', x + w - 92, y + 46, 1.5, '#ffffff');
    }
    if (e.ability) {
      // The real cadence: Hourglass and HIGH STAKES (the same helper the Fight uses).
      const run = this.run!;
      const every = effectiveAbility(e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
      drawSprite(ctx, ABILITY_UI[e.ability.kind].icon, x + 24, y + 146, 2);
      wrap(abilityText(e, every, this.run ?? undefined), Math.floor((w - 60) / 12)).forEach((l, k) => drawText(ctx, l, x + 40, y + 146 + k * 18, 2, '#ff9a3a', { align: 'left' }));
    }
    const mirror = e.boss === 'mirror';
    drawText(ctx, mirror ? 'THEIR REELS: A COPY OF YOURS (REEL 1)' : 'THEIR REELS', x + 16, y + 200, 2, mirror ? '#c8f0ff' : COLORS.textDim, { align: 'left' });
    let cx = x + 36;
    const dirty = e.boss === 'house' && this.run!.stake >= STAKE.houseDirty;
    const shown = mirror ? this.run!.player.strips[0] : dirty ? { ...e.strips[0], bomb: STAKE.houseBombsPerReel } : e.strips[0];
    for (const [sym, n] of (Object.entries(shown) as [SymbolId, number][]).filter(([, n]) => n > 0)) {
      drawSprite(ctx, sym as SpriteId, cx, y + 232, 2);
      drawText(ctx, `${n}`, cx + 24, y + 232, 2, COLORS.text, { align: 'left' });
      cx += 72;
    }
    const bossText =
      e.boss === 'dealer'
        ? 'FACE-UP DEALS: SHUFFLE (SWAPS 5 CELLS), CUT (A CHARMED CELL), RAISE (ITS HIT + YOUR WIN X2). NO KILL BEFORE ITS FIRST DEAL.'
        : e.boss === 'mirror'
        ? `YOUR MACHINE WITH PLAIN CHARMS (NO RELICS, SPECIALS, SPIKES OR KEEN). REFLECTS UP TO ${Math.round(REFLECT_CAP * 100)}% OF YOUR MAX HP. CRACKS AT HALF HP AND SNAPS BACK AT ONCE. CHIPS SHIELD YOU (1 PER ${CHIPS.stackPer}, MAX ${MIRROR_CHIP_SHIELD_CAP}).`
        : `COINS + A CUT EACH TURN FILL THE POT. EVERY ${this.houseEvery()} TURNS THE HOUSE SKIMS HALF OF IT AT YOU (SHIELD BLOCKS). ANY JACKPOT YOU HIT STEALS THE WHOLE POT! AT HALF HP IT GOES ALL IN. EVERY ${CHIPS.stackPer} CHIPS YOU KEEP GIVES +1 SHIELD EACH HOUSE TURN.${dirty ? ' BLACK: IT BOMBS YOUR CELLS, EVEN THE PAYLINE.' : ''}`;
    // GREEN: say which relic the Mirror will copy.
    const copy = mirror && this.run ? mirrorCopy(this.run) : null;
    if (copy) {
      drawSprite(ctx, RELICS[copy].sprite as SpriteId, x + w - 40, y + 100, 2);
      drawText(ctx, `COPIES YOUR ${RELICS[copy].name}`, x + w - 62, y + 100, 1.5, '#c8f0ff', { align: 'right' });
    }
    if (e.isBoss)
      {
        const sc = e.boss === 'mirror' || e.boss === 'dealer' ? 1.5 : 1;
        wrap(bossText, Math.floor((w - 32) / (6 * sc))).forEach((l, k) =>
          drawText(ctx, l, x + 16, y + 254 + k * 12 * sc, sc, e.boss === 'mirror' ? '#c8f0ff' : COLORS.goldLight, { align: 'left' }),
        );
      }
  }

  private drawNext(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const opts = run.paths[run.depth];
    const fork = needsChoice(run);
    const e = run.enemies[run.depth];
    const act = `ACT ${run.act} - `;
    const len = actLength(run.act);
    const title = e.isBoss ? (run.act >= runActs(run) ? 'FINAL FIGHT' : `${act}BOSS FIGHT`) : fork ? `${act}FIGHT ${run.depth + 1} OF ${len} - CHOOSE YOUR PATH` : `${act}FIGHT ${run.depth + 1} OF ${len}`;
    drawText(ctx, title, W / 2, 26, 3, fork ? COLORS.goldLight : run.act > 1 ? '#c8f0ff' : COLORS.textDim);
    this.drawMap(ctx, 128, time);
    if (fork) {
      opts.forEach((o, i) => this.drawEnemyPanel(ctx, o, i === 0 ? 40 : W / 2 + 20, 222, W / 2 - 60, time));
      drawText(ctx, 'OR', W / 2, 372, 4, COLORS.goldLight);
      this.drawHp(ctx, W / 2 - 130, 640, 220);
      this.drawRelicsRow(ctx, W / 2 + 140, 640);
    } else {
      this.drawEnemyPanel(ctx, e, W / 2 - 330, 206, 660, time);
      drawText(ctx, 'YOUR HP', W / 2 - 330, 540, 2, COLORS.textDim, { align: 'left' });
      this.drawHp(ctx, W / 2 - 330, 568, 220);
      this.drawRelics(ctx, W / 2 + 40, 540);
    }
    for (const b of this.buttons) this.drawButton(ctx, b, time);
  }

  private drawCabinets(ctx: CanvasRenderingContext2D, time: number): void {
    drawText(ctx, 'CHOOSE YOUR MACHINE', W / 2, 60, 5, COLORS.goldLight);
    drawText(ctx, 'EVERY RUN STARTS ON A SLOT MACHINE. WIN AND UNLOCK MORE.', W / 2, 104, 2, COLORS.textDim);
    this.drawStakePicker(ctx, time);
    CABINET_ORDER.forEach((id, i) => {
      const h = this.cards[i];
      if (!h || h.scale <= 0.01) return;
      const cab = CABINETS[id];
      const open = this.cabinetUnlocked.has(id);
      const dim = this.picked >= 0 && this.picked !== i;
      ctx.save();
      ctx.globalAlpha *= dim ? 0.3 : 1;
      ctx.translate(h.x, h.y + h.lift);
      ctx.scale(h.scale, h.scale);
      const hover = h.hover && open && this.picked < 0;
      if (hover) {
        ctx.save();
        ctx.shadowColor = COLORS.goldLight;
        ctx.shadowBlur = 24;
        ctx.globalAlpha *= 0.4 + 0.2 * Math.sin(time * 6);
        ctx.fillStyle = COLORS.goldLight;
        ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h);
        ctx.restore();
      }
      this.panel(ctx, -h.w / 2, -h.h / 2, h.w, h.h, hover ? COLORS.goldLight : open ? COLORS.gold : '#4a4058');
      drawSprite(ctx, (open ? cab.sprite : 'cabinetLocked') as SpriteId, 0, -h.h / 2 + 100 + (hover ? Math.sin(time * 4) * 3 : 0), 2.6);
      drawText(ctx, open ? cab.name : '???', 0, 8, cab.name.length > 10 ? 2 : 3, open ? COLORS.goldLight : COLORS.textDim);
      if (open && this.maxStake() > 0) {
        const best = this.stakeFor(id);
        this.stakeChip(ctx, h.w / 2 - 26, -h.h / 2 + 26, best, time, 14);
        if (best < this.stakeSel) drawText(ctx, `NEEDS STAKE ${this.stakeSel}`, 0, h.h / 2 - 22, 2, '#ff8a7a');
      }
      if (open && this.dealerBeaten.includes(id)) {
        ctx.strokeStyle = COLORS.goldLight;
        ctx.lineWidth = 4;
        ctx.strokeRect(-h.w / 2 + 6, -h.h / 2 + 6, h.w - 12, h.h - 12);
        drawText(ctx, 'TRUE ENDING', 0, -h.h / 2 + 22, 1.5, COLORS.goldLight);
      }
      if (open) {
        // The hero you play as on this machine.
        drawSprite(ctx, heroSprite(id), -h.w / 2 + 30, -h.h / 2 + 30, 1.5);
        drawText(ctx, `PLAY AS ${cab.hero}`, 0, 28, 1.25, '#c9a0ff');
        drawText(ctx, cab.blurb, 0, 42, 1, COLORS.textDim);
        const lines = wrap(cab.rule, 17).slice(0, 5);
        lines.forEach((l, k) => drawText(ctx, l, 0, 64 + k * 18, 2, COLORS.text));
        if (cab.act2) wrap(`ACT 2: ${cab.act2.text}`, 22).forEach((l, k) => drawText(ctx, l, 0, 74 + lines.length * 18 + k * 14, 1.5, '#c8f0ff'));
      } else {
        drawText(ctx, 'LOCKED', 0, 40, 2, '#ff8a7a');
        wrap(`UNLOCK: ${cab.unlock}`, 17).forEach((l, k) => drawText(ctx, l, 0, 70 + k * 18, 2, COLORS.textDim));
      }
      ctx.restore();
    });
  }

  /** HIGH STAKES picker under the cabinets: the chosen stake and every rule it stacks. */
  private drawStakePicker(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.maxStake() <= 0) {
      // New players see the ladder exists.
      STAKES.slice(1).forEach((s, k) => this.stakeChip(ctx, W / 2 - 150 + k * 44, 626, s.level, time, 14, true));
      drawText(ctx, 'HIGH STAKES: WIN A RUN TO RAISE THE STAKES', W / 2, 666, 2, COLORS.textDim);
      for (const b of this.buttons) this.drawButton(ctx, b, time);
      return;
    }
    const s = stakeOf(this.stakeSel);
    this.stakeChip(ctx, W / 2 - 250, 622, s.level, time);
    drawText(ctx, `STAKE ${s.level}: ${s.name}`, W / 2 - 226, 614, 2.5, s.color, { align: 'left' });
    const rules = STAKES.slice(1, s.level + 1);
    if (!rules.length) drawText(ctx, 'THE BASE GAME.', W / 2 - 226, 636, 1.5, COLORS.text, { align: 'left' });
    // Its own row, below the rules (QA_1 B4).
    const act3Y = 634 + Math.max(1, rules.length) * 13 + 4;
    if (s.level >= STAKE.act3) drawText(ctx, '+ ACT 3: THE DEALER (16 FIGHTS)', W / 2 - 226, act3Y, 1.25, '#7dff7a', { align: 'left' });
    rules.forEach((r, k) => {
      const yy = 634 + k * 13;
      ctx.fillStyle = r.color;
      ctx.fillRect(W / 2 - 226, yy - 4, 8, 8);
      drawText(ctx, r.rule, W / 2 - 212, yy, 1.25, COLORS.text, { align: 'left' });
    });
    for (const b of this.buttons) this.drawButton(ctx, b, time);
  }

  /** A casino chip in the stake's colour, with its number. */
  private stakeChip(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, time: number, r = 16, locked = false): void {
    const s = stakeOf(level);
    ctx.save();
    ctx.globalAlpha *= locked ? 0.35 : 1;
    ctx.fillStyle = '#f0e8ff';
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = time * 6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, String(level), x, y, r >= 14 ? 2 : 1.5, '#ffffff');
  }

  private drawChips(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const chips = this.run?.player.chips ?? 0;
    drawText(ctx, `${chips}`, x, y, 3, COLORS.energy, { align: 'right', punch: this.chipPulse });
    drawSprite(ctx, 'chip', x - 14 - String(chips).length * 18 - 8, y, 2.5);
  }

  private drawShop(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(40, 20, 96, 96);
    drawSprite(ctx, 'cashierPortrait', 88, 68 + Math.sin(time * 2) * 2, 3.5);
    drawText(ctx, 'THE CASHIER', 160, 44, 4, COLORS.goldLight, { align: 'left' });
    const quips = ['PLACE YOUR BETS.', 'EVERYTHING HAS A PRICE, FRIEND.', 'THE HOUSE WILL HEAR ABOUT THIS.', 'CHIPS ARE FOR SPENDING... OR ARE THEY?'];
    drawText(ctx, quips[(run.depth + run.shopRerolls) % quips.length], 160, 80, 2, COLORS.textDim, { align: 'left' });
    const sh = chipShield(run.player.chips);
    if (run.act === 1) {
      drawSprite(ctx, 'chipShield', W / 2 - 330, 150, 2);
      drawText(ctx, `KEEP CHIPS FOR THE HOUSE: RIGHT NOW +${sh} SHIELD EACH HOUSE TURN (1 PER ${CHIPS.stackPer})`, W / 2 - 312, 150, 2, '#9fd0ff', { align: 'left' });
    } else {
      const boss = run.act >= 3 ? 'DEALER' : 'MIRROR';
      drawText(ctx, run.act >= 3 ? "ACT 3: THE HOUSE DOESN'T COMP. NO HEALING AFTER FIGHTS." : 'ACT 2: A LEGENDARY ON THE SHELF. TIER II UPGRADES A WHOLE CHARM.', W / 2, 118, 2, run.act >= 3 ? '#ff8a7a' : COLORS.goldLight);
      drawSprite(ctx, 'chipShield', W / 2 - 330, 150, 2);
      drawText(ctx, `KEEP CHIPS FOR THE ${boss}: +${Math.min(MIRROR_CHIP_SHIELD_CAP, sh)} SHIELD EACH ${boss} TURN (1 PER ${CHIPS.stackPer}, MAX ${MIRROR_CHIP_SHIELD_CAP})`, W / 2 - 312, 150, 2, '#9fd0ff', { align: 'left' });
    }
    drawText(ctx, 'HP', W - 360, 80, 2, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, W - 330, 80, 190);
    this.shopItems.forEach((item, i) => this.drawShopItem(ctx, this.shopHits[i], item, time));
    this.panel(ctx, 110, 556, 1060, 44);
    this.drawStripsRow(ctx, 130, 578);
    for (const b of this.buttons) this.drawButton(ctx, b, time);
  }

  private drawStripsRow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const run = this.run!;
    run.player.strips.forEach((s, r) => {
      let cx = x + r * 340;
      drawText(ctx, `REEL ${r + 1}`, cx, y, 2, COLORS.textDim, { align: 'left' });
      cx += 90;
      for (const sym of SYMBOLS) {
        const n = s[sym] ?? 0;
        if (!n) continue;
        drawSprite(ctx, sym as SpriteId, cx, y, 1.3);
        const gild = run.player.gilded.find((g) => g.reel === r && g.symbol === sym);
        if (gild) drawSprite(ctx, ENH_SPRITE[gild.enh], cx, y, 1.3);
        drawText(ctx, `${n}`, cx + 16, y, 2, gild ? '#ffd23f' : COLORS.text, { align: 'left' });
        cx += 48;
      }
    });
  }

  private drawShopItem(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem, time: number): void {
    if (!h || h.scale <= 0.01) return;
    const o = item.option;
    const { title, text } = describeOption(o, this.run ?? undefined);
    const afford = (this.run?.player.chips ?? 0) >= item.price;
    ctx.save();
    ctx.globalAlpha *= item.sold ? 0.35 : 1;
    ctx.translate(h.x, h.y + h.lift);
    ctx.scale(h.scale, h.scale);
    const hover = h.hover && !item.sold && afford;
    if (hover) {
      ctx.save();
      ctx.shadowColor = COLORS.energy;
      ctx.shadowBlur = 22;
      ctx.globalAlpha *= 0.4 + 0.2 * Math.sin(time * 6);
      ctx.fillStyle = COLORS.energy;
      ctx.fillRect(-h.w / 2, -h.h / 2, h.w, h.h);
      ctx.restore();
    }
    this.panel(ctx, -h.w / 2, -h.h / 2, h.w, h.h, hover ? COLORS.energy : COLORS.gold);
    drawSprite(ctx, 'shopSlot', 0, -h.h / 2 + 64, 4);
    const iy = -h.h / 2 + 50;
    if (o.kind === 'relic') drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 3.5);
    else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 3.5);
      drawSprite(ctx, ENH_SPRITE[o.enh], 0, iy, 3.5);
    } else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, -34, iy, 2.5);
      drawSprite(ctx, 'arrowRight', 0, iy, 2.5);
      drawSprite(ctx, o.to as SpriteId, 34, iy, 2.5);
    } else if (o.kind === 'remove') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 3.5);
      drawSprite(ctx, 'minusBadge', 28, iy + 20, 3);
    } else drawSprite(ctx, 'heart', 0, iy, 4.5);
    drawText(ctx, title, 0, 22, title.length > 10 ? 2 : 3, o.kind === 'gild' ? '#ffd23f' : o.kind === 'relic' ? '#c9a0ff' : COLORS.text);
    const long = wrap(text, 16).length > 3;
    const lines = long ? wrap(text, 21).slice(0, 5) : wrap(text, 16);
    lines.forEach((line, k) => drawText(ctx, line, 0, 44 + k * (long ? 13 : 17), long ? 1.5 : 2, COLORS.text));
    if (this.run && completesSet(this.run, o)) this.setTag(ctx, -h.w / 2 + 6, -h.h / 2 + 6, time);
    if (this.run && o.kind === 'gild') this.setPips(ctx, h.w / 2 - 12, -h.h / 2 + 14, o.enh);
    if (o.kind === 'relic' && LEGENDARY.has(o.relic)) this.legendTag(ctx, 0, -h.h / 2 + 14, time);
    if (o.kind === 'relic' && LEGENDARY.has(o.relic) && this.run && this.run.stake >= STAKE.mirrorRelic && this.run.act === 2)
      drawText(ctx, mirrorCanUse(o.relic) ? 'MIRROR WILL COPY' : "MIRROR CAN'T USE", 0, -h.h / 2 + 32, 1.25, mirrorCanUse(o.relic) ? '#ff8a7a' : '#7dff7a');
    // Price tag.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-52, h.h / 2 - 34, 104, 28);
    ctx.fillStyle = item.sold ? '#3a2e52' : afford ? '#3a2a14' : '#3a1414';
    ctx.fillRect(-50, h.h / 2 - 32, 100, 24);
    if (item.sold) drawText(ctx, 'SOLD', 0, h.h / 2 - 20, 2, COLORS.textDim);
    else {
      drawSprite(ctx, 'chip', -22, h.h / 2 - 20, 1.6);
      drawText(ctx, String(item.price), 12, h.h / 2 - 20, 2, afford ? COLORS.energy : '#ff8a7a');
    }
    ctx.restore();
  }

  private drawRelicsRow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.run!.player.relics.forEach((r, i) => drawSprite(ctx, RELICS[r].sprite as SpriteId, x + i * 36, y, 2));
  }

  private drawButton(ctx: CanvasRenderingContext2D, b: Btn, time: number): void {
    const pulse = 1 + 0.02 + 0.02 * Math.sin((time * Math.PI * 2) / 1.6);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.scale * pulse, b.scale * pulse);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-b.w / 2 - 3, -b.h / 2 - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = b.pressed ? '#2a0806' : b.hover ? '#e04a2f' : '#c8321f';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, (b.h - 8) / 2);
    drawText(ctx, b.label, 0, 1, b.label.length > 10 ? 2 : 3, '#fff6c8');
    ctx.restore();
  }

  private actPlaque(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 40, y - 8, 44, 16);
    ctx.fillStyle = '#1a1428';
    ctx.fillRect(x - 38, y - 6, 40, 12);
    drawText(ctx, label, x - 18, y, 1, color);
  }

  private drawOver(ctx: CanvasRenderingContext2D): void {
    const run = this.run!;
    const trueEnding = run.won && run.act >= 3;
    drawText(ctx, trueEnding ? 'THE DEALER FOLDS!' : run.won ? 'THE MIRROR SHATTERS!' : 'RUN OVER', W / 2, 44, 6, run.won ? COLORS.goldLight : COLORS.danger);
    const reached = `${CABINETS[run.cabinet].name}  -  ${run.won ? `BEAT ALL ${totalFights(run)} FIGHTS${trueEnding ? ' - TRUE ENDING' : ''}` : `FELL AT FIGHT ${run.records.length} OF ${totalFights(run)} (ACT ${run.act})`}`;
    if (this.unlockedNow.length)
      drawText(ctx, `NEW SLOT MACHINE UNLOCKED: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}!`, W / 2, 466, 2, COLORS.goldLight);
    drawText(ctx, run.stake > 0 ? `${reached}  -  STAKE ${run.stake} ${stakeOf(run.stake).name}` : reached, W / 2, 88, 2, COLORS.textDim);
    const unlockRow = !!this.stakeUnlockedNow;
    if (unlockRow) {
      this.stakeChip(ctx, 140, 116, run.stake + 1, performance.now() / 1000, 14);
      wrap(this.stakeUnlockedNow, 110).slice(0, 3).forEach((l, k) => drawText(ctx, l, 164, 104 + k * 13, 1.25, stakeOf(run.stake + 1).color, { align: 'left' }));
    }
    // The table moves down under an unlock message (QA_1 B5).
    const top = unlockRow ? 22 : 0;
    this.panel(ctx, 110, 120 + top, 1060, 330 - top);
    drawText(ctx, 'FIGHT', 150, 142 + top, 2, COLORS.textDim, { align: 'left' });
    drawText(ctx, 'ROUNDS', 560, 142 + top, 2, COLORS.textDim);
    drawText(ctx, 'HP', 680, 142 + top, 2, COLORS.textDim);
    drawText(ctx, 'THEN PICKED', 790, 142 + top, 2, COLORS.textDim, { align: 'left' });
    // Up to 16 fights: rows shrink (and drop the detail line) once they stop fitting.
    const rowH = Math.min(42, Math.floor((290 - top) / Math.max(1, run.records.length)));
    const compact = rowH < 40;
    run.records.forEach((r, i) => {
      const y = 170 + top + i * rowH + (compact ? 0 : 6);
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(122, y - rowH / 2, 1036, rowH - 2);
      }
      if (compact && r.act && r.act > 1 && run.records[i - 1]?.act === 1) {
        ctx.fillStyle = '#c8f0ff';
        ctx.fillRect(122, y - rowH / 2 - 1, 1036, 2);
        this.actPlaque(ctx, 1150, y - rowH / 2, 'ACT 2', '#c8f0ff');
      }
      if (compact && r.act && r.act > 2 && run.records[i - 1]?.act === 2) {
        ctx.fillStyle = '#7dff7a';
        ctx.fillRect(122, y - rowH / 2 - 1, 1036, 2);
        this.actPlaque(ctx, 1150, y - rowH / 2, 'ACT 3', '#7dff7a');
      }
      if (compact && i === 0) this.actPlaque(ctx, 1150, y - rowH / 2, 'ACT 1', COLORS.goldLight);
      drawSprite(ctx, (r.portrait ?? 'enemyPortrait') as SpriteId, 150, y, compact ? 0.9 : 1.4);
      drawText(ctx, r.enemy, 176, y, 2, r.won ? COLORS.text : COLORS.danger, { align: 'left' });
      drawText(ctx, `${Math.ceil(r.turns / 2)}`, 560, y, 2, COLORS.text);
      drawText(ctx, `${r.hpBefore}-${r.hpAfter}`, 680, y, 2, r.hpAfter > 0 ? COLORS.text : COLORS.danger);
      if (compact) {
        const parts = [...(r.bonuses ?? []), r.eliteRelic ? RELICS[r.eliteRelic].name : '', r.eliteChips ? `ELITE +${r.eliteChips} CHIPS` : '', r.pick ? describeOption(r.pick).title : '', ...(r.bought ?? []).map((b) => describeOption(b).title)].filter(Boolean);
        const what = parts.length ? parts.join(', ') : r.won ? '' : 'DEFEATED';
        drawText(ctx, what.length > 34 ? `${what.slice(0, 33)}...` : what, 790, y, 1.5, r.won ? '#c9a0ff' : COLORS.danger, { align: 'left' });
        return;
      }
      if (r.pick) drawText(ctx, describeOption(r.pick).title, 790, y - 6, 2, '#c9a0ff', { align: 'left' });
      const extra = [
        ...(r.bonuses ?? []),
        r.eliteRelic ? `SPOILS: ${RELICS[r.eliteRelic].name}` : '',
        ...(r.bought ?? []).map((b) => `BUY: ${describeOption(b).title}`),
        r.chips ? `+${r.chips} CHIPS` : '',
      ].filter(Boolean).join('  ');
      if (extra) drawText(ctx, extra, 790, y + 12, 1, COLORS.textDim, { align: 'left' });
      else if (!r.won) drawText(ctx, 'DEFEATED', 790, y, 2, COLORS.danger, { align: 'left' });
      if (r.rocksAdded) drawText(ctx, `+${r.rocksAdded} ROCKS`, 640, y + 12, 1, '#c9bba8');
    });
    this.panel(ctx, 110, 480, 1060, 134);
    this.drawStrips(ctx, 130, 496, run.player.strips);
    this.drawRelics(ctx, 620, 496);
    for (const b of this.buttons) this.drawButton(ctx, b, 0);
  }
}
