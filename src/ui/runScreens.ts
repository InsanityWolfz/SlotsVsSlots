import type { Sounds } from '../audio/sounds';
import type { MetaGain } from '../core/profile';
import { challengeById, levelOf } from '../core/meta';
import { defaultConfig, UNIT, type Enh, type GameConfig, type SymbolId } from '../core/config';
/** Base symbol values (a symbol's number in the build panel). */
const CFG_BASE = defaultConfig().base;
import { actLength, ELITE_HP_MUL, ELITE_HP_MUL_2, type EnemyDef } from '../core/enemies';
import { LEGENDARY, REFLECT_CAP, REFLECT_MIN, RELICS, relicText, RUSH, POT } from '../core/relics';
import { CHARM_COLOR, CHARM_SYMBOLS, charmLevel, charmTag, playerSymValue, symLevel } from '../core/charms';
import { drawReelTable, runTable } from './reelTable';
import {
  CHIPS,
  describeChoice,
  type BigChoice,
  BIG,
  describeOption,
  enemyHp,
  mirrorCopy,
  isRelicDraft,
  needsChoice,
  offerBets,
  EDGE_TEXT,
  maxStake,
  markerRefund,
  stakeCap,
  stepStake,
  rerollCost,
  runActs,
  totalFights,
  rushTier,
  type BonusPayout,
  type DraftOption,
  type FightRecord,
  type RunState,
  type ShopItem,
  levelCap,
} from '../core/run';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../core/cabinets';
import { effectiveAbility, mirrorCanUse, STAKE, STAKES, stakeOf } from '../core/stakes';
import type { RelicId } from '../core/config';
import { DANGER } from '../core/enemies';
import type { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { ABILITY_UI } from '../present/hud';
import { ENH_SPRITE } from '../present/reel';
import { COLORS, H, W } from '../present/layout';
import { artId, drawSprite, hasSprite, type SpriteId } from '../render/sprites';
import { drawText, fmtNum } from '../render/text';
import { heroSprite } from './menus';
import { CHIP_SCORE, runEntry, runScore } from '../core/profile';
import { dailyShare } from '../core/daily';
import { BET_STEPS, betProfit, describeBet, type SideBet } from '../core/bets';
import { RelicTips } from './relicTip';


export type ScreenMode = 'none' | 'draft' | 'next' | 'over' | 'shop' | 'cabinet' | 'bonus' | 'choice';

/** A lien in a few words ("GOLD SWORD R1"). */

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

type Btn = Hit & {
  label: string;
  /** A SIDE BET stepper button: its stake change. */
  bet?: number;
  /** Secondary: a quiet button that never breathes (only the screen's next step does). */
  minor?: boolean;
  /** Primary, but not breathing right now (a fork's other path). */
  quiet?: boolean;
};


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
/** YOUR BUILD: a fixed column on the left of every run screen (screens lay out to its right, around CX). */
export const BUILD = { x: 16, y: 16, w: 284, h: H - 32 };
/** The middle of the space right of YOUR BUILD: run screens center on it. */
const CX = (BUILD.x + BUILD.w + 12 + W) / 2;
/** Your chips: the same spot in the fights (game.ts draws them there too). */
export const CHIP_SPOT = { x: 44, y: 46 };
/** The Cashier's shelves: item centers per row (the counter, then the relics behind the glass). */
const SHELF = { y: [262, 440], gap: 164 };
/** The side bet card: under the enemy card, left of FIGHT. */
const BET_X = CX - 200;
/** The shop's price tags (they buy): size and offset under the item's centre. */
const TAG = { w: 108, h: 40, y: 70 };
/** The enemy card's flip tab (bottom-right): big enough for a thumb. */
const FLIP_TAB = { w: 40, h: 32 };
const BET_Y = 540;

/** The casino floor behind every run screen: a dark carpet with a faint diamond weave (cached). */
let carpet: HTMLCanvasElement | null = null;
function drawBackdrop(ctx: CanvasRenderingContext2D): void {
  if (!carpet && typeof document !== 'undefined') {
    carpet = document.createElement('canvas');
    carpet.width = W;
    carpet.height = H;
    const c = carpet.getContext('2d')!;
    const g = c.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, '#1a1030');
    g.addColorStop(1, '#07040e');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,210,63,0.035)';
    for (let yy = 0; yy < H; yy += 32)
      for (let xx = (yy / 32) % 2 ? 16 : 0; xx < W; xx += 32) {
        c.beginPath();
        c.moveTo(xx, yy - 6);
        c.lineTo(xx + 6, yy);
        c.lineTo(xx, yy + 6);
        c.lineTo(xx - 6, yy);
        c.fill();
      }
  }
  if (carpet) ctx.drawImage(carpet, 0, 0);
  else {
    ctx.fillStyle = '#07040e';
    ctx.fillRect(0, 0, W, H);
  }
}

const rounds = (turns: number) => { const n = Math.ceil(turns / 2); return `${n} ROUND${n === 1 ? '' : 'S'}`; };

/** The ability's effect in a few words (the panel's front shows this under the cadence pips). */
function abilityWhat(e: EnemyDef, run?: RunState): string {
  if (!e.ability) return '';
  const p = e.ability.power;
  const cap = run ? Math.max(REFLECT_MIN, Math.round(run.player.maxHp * REFLECT_CAP)) : p;
  const what: Record<string, string> = {
    flood: `SLIMES ${p} OF YOUR SYMBOLS`,
    smash: `HITS FOR ${p}`,
    fortify: `GAINS ${p} SHIELD`,
    blizzard: `FREEZES ${p} REEL${p === 1 ? '' : 'S'} FOR 2 TURNS`,
    pilfer: `STEALS ${p} SYMBOL${p > 1 ? 'S' : ''}`,
    quake: `ADDS ${p} ROCKS TO YOUR STRIPS`,
    jam: `JAMS A REEL FOR ${p} TURNS`,
    jackpot: 'SKIMS HALF THE POT AT YOU',
    carpet: `STICKS ${p} BOMBS ON YOUR CELLS`,
    curse: `HEXES ${p} REEL${p > 1 ? 'S' : ''} FOR 3 TURNS`,
    bloodmoon: `HEALS ${p} HP`,
    gulp: `EATS ${p} OF YOUR CHIPS`,
    reflect: `THROWS YOUR BEST HIT BACK (${REFLECT_MIN} TO ${cap})`,
    earth: `DRAINS ${p} FROM YOUR METER`,
    launder: `TAKES ${p} CHIPS, HEALS ${p * 3 * UNIT}`,
    mark: `MARKS ${p} OF YOUR CELLS`,
    penalty: `HITS FOR ${p}`,
    repo: 'TAKES A CHARM FOR THE FIGHT',
    houseTake: `RAKES YOUR GROUPS FOR ${p} TURNS`,
    deal: 'DEALS A CARD ON YOUR PAYLINE',
  };
  return what[e.ability.kind] ?? '';
}

function abilityText(e: EnemyDef, every: number, run?: RunState): string {
  if (!e.ability) return '';
  const ui = ABILITY_UI[e.ability.kind];
  // THE REPO MAN takes on his first turn, then every few.
  if (e.ability.kind === 'repo') return `${ui.label} FROM TURN 1, THEN EVERY ${every}: TAKES ONE OF YOUR CHARMS. YOU GET IT BACK AFTER THE FIGHT`;
  if (e.ability.kind === 'deal') return `${ui.label} EVERY ${every} TURNS: A CARD ON YOUR PAYLINE, ALL IN, OR RAISE`;
  return `${ui.label} EVERY ${every} TURNS: ${abilityWhat(e, run)}`;
}

/** The stage light behind each enemy's portrait (the panel's front). */
const STAGE_TINT: Record<string, string> = {
  slime: '#5ed15a', frost: '#5ad8e8', thief: '#c9a0ff', hexer: '#c9a0ff', golem: '#c9bba8', grounder: '#c9bba8',
  brute: '#ff9a3a', gremlin: '#ff9a3a', bomber: '#ff9a3a', vampire: '#ff6a5a', house: '#ff6a5a', pitboss: '#ff6a5a',
  dealer: '#ff6a5a', mirror: '#c8f0ff', croupier: '#ffd23f', sharp: '#ffd23f', counterfeiter: '#ffd23f', mimic: '#ffd23f',
};
/** A shorter line for the front when a boss's blurb won't fit on one line (the full blurb is on the back). */
const FRONT_BLURB: Record<string, string> = { dealer: 'THE HOUSE HAS A PARTNER' };
/** A boss's one rule on the front of its card (the full paragraph is on the back). */
const BOSS_HEADLINE: Record<string, string> = {
  house: 'JACKPOTS STEAL ITS POT',
  mirror: 'CRACKED AT HALF HP: IT THROWS HALF',
  dealer: 'IT CAN NOT KILL YOU BEFORE ITS FIRST DEAL',
};

/** Every BIG CHOICE card looks the same: no tier, no hint which pick is strong or safe. The player decides. */

/**
 * The short lines a BIG CHOICE card shows: one effect line and one cost line (empty when it costs nothing). The full
 * rule (describeChoice) is in the hover tip. Display only: what a choice does lives in run.ts.
 */
function choiceShort(run: RunState, c: BigChoice): { effect: string; cost: string } {
  const full = describeChoice(run, c);
  switch (c.id) {
    case 'edge':
      return { effect: full.rule, cost: EDGE_TEXT[c.edge!].text };
    case 'cashOut':
      return { effect: `BANK ${/: (\d+) POINTS/.exec(full.rule)?.[1] ?? ''} POINTS. THE RUN ENDS`, cost: '' };
    case 'ride':
      return { effect: `THE POT GROWS TO ${/GROWS TO (\d+)/.exec(full.rule)?.[1] ?? ''}`, cost: `BUST: BANK ${/POT: (\d+)/.exec(full.cost)?.[1] ?? ''}` };
    default:
      // The card says exactly what the rule says (the user's wording, 2026-10-08).
      return { effect: full.rule, cost: full.cost };
  }
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
  /** SIDE BETS on the next fight (the table on the preview screen). */
  private betOffer: SideBet[] = [];
  private fade = 0;
  private mouse = { x: -1, y: -1 };
  private tips = new RelicTips();
  /** The enemy cards: flip (0 front, 1 back) and hover start, keyed by the card's x. */
  private flips = new Map<number, number>();
  /** The last pointer was a finger: no hover-to-flip (a tap left a stuck "hover" that flipped the card). */
  touch = false;
  /** A tap flips a card for touch players (the card's x, or -1). */
  private pinned = -1;
  private frameDt = 0;
  private lastDraw = 0;
  /** The card's entrance: rise-in, portrait landing, skulls popping, cadence pips filling. */
  private panelIn = 1;
  private portraitPop = 1;
  private skullPop = [1, 1, 1];
  private pipFill = 99;
  private lastPip = 1;
  /** LEVELS pane: the last level seen per row, and when a row last went up (it punches and sparkles). */
  private lvSeen = new Map<string, number>();
  private lvPunch = new Map<string, number>();
  private lvRun: RunState | null = null;
  /** The side bet's chip stack: the stake punches on each change; the top chip drops on (or lifts off). */
  private betPunch = 1;
  private betFall = 0;
  private betDrop = 1;
  /** The map node under the pointer (its tip is drawn over everything on the screen). */
  private mapTip: { e: EnemyDef; x: number; y: number } | null = null;
  /** Shop purchases in flight to YOUR BUILD. */
  private flyers: { sprite: SpriteId; x0: number; y0: number; x1: number; y1: number; t: number }[] = [];
  private picked = -1;
  private lastRecord: FightRecord | null = null;
  /** 'spoils' = an elite's relic choice (1 of 2) shown with the draft layout. */
  private draftKind: 'draft' | 'spoils' | 'legend' | 'start' = 'draft';
  private shopItems: ShopItem[] = [];
  /** The price tags: clicking a tag buys (clicking the item only shows what it is). */
  private shopTags: Hit[] = [];
  /** The item whose card a click or tap pinned open (-1: none). */
  private shopSel = -1;
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
    private base: () => GameConfig,
    private cb: {
      onPick: (o: DraftOption) => void;
      onSpoils: (relic: RelicId) => void;
      onLegend: (relic: RelicId) => void;
      /** A BIG CHOICE was taken after a boss. */
      onChoice: (c: BigChoice) => void;
      onFight: (option: number) => void;
      onNewRun: () => void;
      onMenu: () => void;
      /** ENDLESS: keep going after the Dealer. */
      onLetItRide: () => void;
      /** BONUS WHEEL: the player took the prize (PASS just moves on). */
      onWheelCollect: (o: DraftOption) => void;
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
      this.buttons = [this.minorBtn('LOWER', W / 2 - 430, 640, 110, 40, () => step(-1)), this.minorBtn('HIGHER', W / 2 + 430, 640, 110, 40, () => step(1))];
    }
    this.buttons.push(this.minorBtn('MENU', 90, 40, 130, 44, () => this.cb.onMenu()));
    this.cards = CABINET_ORDER.map((id, i) => {
      const h = this.hit(W / 2 + (i - (CABINET_ORDER.length - 1) / 2) * 240, 380, 220, 420, () => {
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
    return run ? effectiveAbility({ kind: 'jackpot', every: POT.cashEvery, power: 1 }, { stake: run.stake, act: 1, sandglass: run.player.relics.includes('sandglass') }).every : 4;
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
  /** RELIC RUSH juice: per-cell landing pop, screen shake, respin counter pulse (+ gold / - red), tier banner. */
  private rushPop: number[] = [];
  private rushShake = 0;
  private rushPulse = 0;
  private rushPulseGood = true;
  private rushBanner: { text: string; color: string; t: number } | null = null;

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
      this.rushPop = Array(15).fill(0);
      this.rushBanner = null;
      this.rushRespins = 3;
      void this.playRushFrames(b);
    }
  }

  /**
   * RELIC RUSH, short: the engine plays the full hold-and-respin (same odds), and the screen shows it as three spins:
   * the opening cells, then everything later respins landed, split over two more spins.
   */
  private async playRushFrames(b: Extract<BonusPayout, { kind: 'rush' }>): Promise<void> {
    const later = b.frames.slice(1).flat();
    const half = Math.ceil(later.length / 2);
    const spins = [b.frames[0] ?? [], later.slice(0, half), later.slice(half)];
    await this.ui.wait(0.3);
    for (const [k, cells] of spins.entries()) {
      this.rushRespins = spins.length - k;
      if (k === spins.length - 1) this.flashRushBanner('LAST SPIN!', '#ff6a5a');
      // The empty cells spin: they tick fast, then slow down as the spin settles.
      let next = 0;
      const dur = 0.7;
      await this.ui.tween({
        from: 0,
        to: 1,
        dur,
        onUpdate: (v) => {
          if (v * dur < next) return;
          next = v * dur + 0.04 + 0.16 * v * v;
          this.rushFlicker = this.rushCells.map((c) => (c ? 0 : Math.random() < 0.45 ? 1 : 0));
          this.sounds.click();
        },
      });
      this.rushFlicker = Array(15).fill(0);
      // New relics slam in, quickly.
      for (const i of cells) {
        const before = rushTier(this.rushCells.filter(Boolean).length);
        this.rushCells[i] = 1;
        const count = this.rushCells.filter(Boolean).length;
        void this.ui.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (this.rushPop[i] = v) });
        void this.ui.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (this.rushShake = v) });
        this.sounds.coin(Math.min(14, 2 + count));
        const now = rushTier(count);
        if (now !== before) {
          this.sounds.fanfareJackpot();
          this.flashRushBanner(now === 'legendary' ? 'LEGENDARY!' : 'UNCOMMON!', now === 'legendary' ? '#ffd23f' : '#5ad8e8');
        } else if (count === RUSH.cells) this.flashRushBanner('GRAND!', '#ffd23f');
        await this.ui.wait(0.12);
      }
      this.rushPulseGood = cells.length > 0;
      if (k > 0) {
        if (cells.length) this.sounds.stingerMedium();
        else this.sounds.fizzle();
      }
      void this.ui.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (this.rushPulse = v) });
      await this.ui.wait(0.3);
    }
    this.rushRespins = 0;
    await this.ui.wait(0.3);
    this.bonusReveal();
  }

  private flashRushBanner(text: string, color: string): void {
    const banner = { text, color, t: 1 };
    this.rushBanner = banner;
    void this.ui.tween({ from: 1, to: 0, dur: 1.1, onUpdate: (v) => (banner.t = v) });
  }

  private bonusReveal(): void {
    this.bonusLanded = true;
    this.sounds.fanfareJackpot();
    const last = this.bonusIdx >= this.bonusList.length - 1;
    const advance = () => {
      this.bonusIdx++;
      if (this.bonusIdx >= this.bonusList.length) this.bonusDone();
      else this.playBonus();
    };
    const b = this.bonusList[this.bonusIdx];
    if (b?.kind === 'wheel') {
      // The wheel's prize is yours to take or leave.
      this.buttons = [
        this.minorBtn('PASS', W / 2 - 160, 660, 260, 56, () => {
          this.sounds.fizzle();
          advance();
        }),
        this.btn('COLLECT', W / 2 + 160, 660, 260, 56, () => {
          this.cb.onWheelCollect(b.options[b.pick]);
          this.sounds.coin(9);
          advance();
        }),
      ];
      return;
    }
    this.buttons = [this.btn(last ? 'COLLECT' : 'NEXT VOUCHER', W / 2, 650, 280, 56, advance)];
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
    ctx.save();
    if (this.rushShake > 0) ctx.translate((Math.random() * 2 - 1) * 6 * this.rushShake, (Math.random() * 2 - 1) * 6 * this.rushShake);
    this.panel(ctx, W / 2 - (cols * size) / 2 - 10, y0 - size / 2 - 10, cols * size + 20, 3 * size + 20, '#c080ff');
    for (let i = 0; i < 15; i++) {
      const x = x0 + (i % cols) * size;
      const y = y0 + Math.floor(i / cols) * size;
      ctx.fillStyle = '#140a22';
      ctx.fillRect(x - size / 2 + 4, y - size / 2 + 4, size - 8, size - 8);
      const pop = this.rushPop[i] ?? 0;
      if (pop > 0) {
        // Landing burst behind the cell.
        ctx.fillStyle = `rgba(255,210,63,${0.55 * pop})`;
        ctx.fillRect(x - size / 2 - 6 * pop, y - size / 2 - 6 * pop, size + 12 * pop, size + 12 * pop);
      }
      if (this.rushCells[i]) drawSprite(ctx, artId('relicSym'), x, y, 4.5 * (1 + 0.5 * pop), { flash: Math.max(0.15 + 0.15 * Math.sin(time * 5 + i), pop) });
      else if (this.rushFlicker[i]) drawSprite(ctx, artId('relicSym'), x, y, 4, { alpha: 0.35 });
      else drawSprite(ctx, artId(hasSprite('rushJunk') ? 'rushJunk' : 'rushEmpty'), x, y, 3.5, { alpha: 0.6 });
    }
    const count = this.rushCells.filter(Boolean).length;
    drawText(ctx, `RELICS ${count} / 15`, W / 2 - 120, 500, 3, '#c080ff');
    ctx.restore();
    const pulseCol = this.rushPulse > 0.05 ? (this.rushPulseGood ? '#ffd23f' : '#ff6a5a') : this.rushRespins <= 1 && !this.bonusLanded ? '#ff6a5a' : COLORS.text;
    drawText(ctx, this.bonusLanded ? 'DONE' : `SPINS LEFT ${this.rushRespins}`, W / 2 + 140, 500, 3, pulseCol, { punch: 1 + 0.35 * this.rushPulse });
    if (this.rushBanner && this.rushBanner.t > 0) {
      const t = this.rushBanner.t;
      // On its own plate, clear of the grid's frame.
      const bw = this.rushBanner.text.length * 30 + 24;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, t * 2.5);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(W / 2 - bw / 2, 100 - 28, bw, 56);
      ctx.restore();
      drawText(ctx, this.rushBanner.text, W / 2, 100, 5, this.rushBanner.color, { punch: 1 + 0.4 * Math.max(0, t - 0.7) * 3, alpha: Math.min(1, t * 2.5) });
    }
    drawText(ctx, `UP TO ${RUSH.commonMax} COMMON  -  ${RUSH.commonMax + 1}-${RUSH.uncommonMax} UNCOMMON  -  ${RUSH.uncommonMax + 1}+ LEGENDARY`, W / 2, 530, 1.5, COLORS.textDim);
    if (this.bonusLanded) {
      const tierColor = b.tier === 'legendary' ? '#ffd23f' : b.tier === 'uncommon' ? '#5ad8e8' : '#c9c9d9';
      const badge = b.tier === 'legendary' ? 'tierLegendary' : b.tier === 'uncommon' ? 'tierUncommon' : 'tierCommon';
      if (hasSprite(badge)) drawSprite(ctx, artId(badge), W / 2 - 250, 580, 3);
      if (b.relic) {
        drawSprite(ctx, RELICS[b.relic].sprite as SpriteId, W / 2 - 200, 580, 3);
        drawText(ctx, `${b.tier.toUpperCase()}: ${RELICS[b.relic].name}${b.count >= 15 ? `  +  GRAND! +${b.chips} CHIPS` : ''}`, W / 2 - 170, 568, 2.5, tierColor, { align: 'left' });
        drawText(ctx, relicText(b.relic, this.run?.cabinet), W / 2 - 170, 596, 1.5, COLORS.text, { align: 'left' });
      } else drawText(ctx, `NO RELIC LEFT FOR YOU: +${b.chips} CHIPS`, W / 2, 580, 2.5, tierColor);
    }
  }

  /** Cabinets unlocked by the run that just ended (shown on the run-over screen). */
  setUnlockedNow(ids: CabinetId[]): void {
    this.unlockedNow = ids;
  }

  /** Unaffordable purchase: shake its price tag. */
  deny(i: number): void {
    const h = this.shopTags[i];
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
    // The price tags too: they used to stay live (and buy from the old shelf) after leaving the shop (STEAM_QA_1 Q2).
    this.shopTags = [];
    this.picked = -1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.fade = v) });
  }

  private hit(x: number, y: number, w: number, h: number, onClick: () => void): Hit {
    return { x, y, w, h, hover: false, pressed: false, scale: 0, lift: 0, onClick, enabled: true };
  }

  private btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Btn {
    return { ...this.hit(x, y, w, h, onClick), label, scale: 1 };
  }
  /** A secondary button: quiet purple, no breathing. */
  private minorBtn(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Btn {
    return { ...this.btn(label, x, y, w, h, onClick), minor: true };
  }

  showSpoils(run: RunState, relics: RelicId[], last: FightRecord | null): void {
    this.showDraft(run, relics.map((relic) => ({ kind: 'relic', relic }) as DraftOption), last, 'spoils');
  }

  /** An act's boss fell: pick 1 of 3 legendary relics. */
  showLegend(run: RunState, relics: RelicId[], last: FightRecord | null): void {
    this.showDraft(run, relics.map((relic) => ({ kind: 'relic', relic }) as DraftOption), last, 'legend');
    this.sounds.fanfareJackpot();
  }

  /** A boss fell: pick 1 of 3 BIG CHOICES (strong ones cost something; one is safe). */
  private choices: BigChoice[] = [];
  /** The pick's stamp landing (0..1). */
  private stamp = 0;
  /** When the pointer settled on each card (for the full-rule tip). */
  private choiceHoverAt: number[] = [];
  showChoice(run: RunState, choices: BigChoice[]): void {
    this.run = run;
    this.choices = choices;
    this.open('choice');
    this.stamp = 0;
    this.choiceHoverAt = [];
    const n = choices.length;
    const w = n > 3 ? 214 : 282;
    const pitch = w + 16;
    this.cards = choices.map((c, i) =>
      this.hit(CX + (i - (n - 1) / 2) * pitch, 398, w, 352, () => {
        if (this.picked >= 0) return;
        this.picked = i;
        this.sounds.fanfareJackpot();
        const card = this.cards[i];
        // The card swells, a TAKEN stamp slams onto it, the others sink away.
        void this.ui.tween({ from: 1.06, to: 1.1, dur: 0.15, ease: backOut(2), onUpdate: (v) => (card.scale = v) });
        void this.ui
          .wait(0.08)
          .then(() => this.ui.tween({ from: 0, to: 1, dur: 0.24, ease: backOut(2.4), onUpdate: (v) => (this.stamp = v) }))
          .then(() => {
            this.sounds.click();
            return this.ui.wait(0.5);
          })
          .then(() => this.cb.onChoice(c));
      }),
    );
    // Deal the cards in from below, one by one.
    this.cards.forEach((c, i) => {
      c.lift = 40;
      void this.ui.wait(0.15 + i * 0.11).then(() => {
        this.sounds.click();
        void this.ui.to(c, 'lift', 0, 0.35, backOut(1.8));
        return this.ui.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(2), onUpdate: (v) => (c.scale = v) });
      });
    });
    this.sounds.stingerMedium();
  }

  private drawChoice(ctx: CanvasRenderingContext2D, time: number): void {
    const edge = this.choices[0]?.id === 'edge';
    const rideQ = this.choices[0]?.id === 'cashOut';
    drawText(ctx, rideQ ? `LOOP ${(this.run?.endless?.loop ?? 2) - 1} CLEARED! POT ${this.run?.endless?.pot ?? 0}` : edge ? `HOUSE EDGE: LOOP ${this.run?.endless?.loop ?? 1}` : 'BONUS ROUND', CX, 60, edge ? 5 : 6, edge ? '#ff8a7a' : COLORS.goldLight);
    drawText(ctx, rideQ ? 'RIDE AGAIN OR CASH OUT. YOUR WIN IS SAFE EITHER WAY.' : edge ? 'PICK A NEW HOUSE RULE. EACH ONE PAYS.' : '', CX, 110, 2, COLORS.textDim);
    let tip = -1;
    this.cards.forEach((c, i) => {
      const ch = this.choices[i];
      if (!ch || c.scale <= 0.01) return;
      if (c.hover && this.picked < 0) {
        this.choiceHoverAt[i] ??= time;
        if (time - this.choiceHoverAt[i] > 0.35) tip = i;
      } else delete this.choiceHoverAt[i];
      this.drawChoiceCard(ctx, c, ch, i, time);
    });
    if (tip >= 0) this.drawChoiceTip(ctx, this.cards[tip], this.choices[tip]);
  }

  /** One BIG CHOICE card: the name on top, a big symbol composition, one effect line, and a red cost strip. */
  private drawChoiceCard(ctx: CanvasRenderingContext2D, c: Hit, ch: BigChoice, i: number, time: number): void {
    const run = this.run!;
    const { title } = describeChoice(run, ch);
    const { effect, cost } = choiceShort(run, ch);
    const picked = this.picked === i;
    const dimmed = this.picked >= 0 && !picked;
    const w = c.w;
    const h = c.h;
    const hover = c.hover && this.picked < 0;
    ctx.save();
    ctx.translate(c.x, c.y + c.lift + (dimmed ? 16 * this.stamp : 0));
    ctx.scale(c.scale, c.scale);
    // Under the pointer a card lights up (a local glow, never full-screen).
    if (hover) {
      ctx.save();
      ctx.shadowColor = COLORS.goldLight;
      ctx.shadowBlur = 24;
      ctx.globalAlpha *= 0.3 + 0.1 * Math.sin(time * 6);
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    this.panel(ctx, -w / 2, -h / 2, w, h, hover || picked ? COLORS.goldLight : COLORS.gold);
    // Name band.
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(-w / 2, -h / 2, w, 44);
    drawText(ctx, title, 0, -h / 2 + 23, title.length * 18 <= w - 20 ? 3 : 2.5, '#ff9a3a');
    // The stage: a lit box the art stands in.
    const sy = -h / 2 + 52;
    const sh = 150;
    const g = ctx.createRadialGradient(0, sy + sh / 2, 6, 0, sy + sh / 2, w * 0.6);
    g.addColorStop(0, '#4a3418');
    g.addColorStop(1, COLORS.panel);
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2 + 8, sy, w - 16, sh);
    const big = w > 250 ? 5 : 4.2;
    const bob = hover ? Math.sin(time * 5) * 3 : Math.sin(time * 2 + i) * 1.5;
    this.drawChoiceArt(ctx, ch, 0, sy + sh / 2 + bob, big, time);
    // The effect: one line at the readable size (two if it must).
    const ey = sy + sh + 30;
    const big2 = wrap(effect, Math.floor((w - 24) / 12));
    const lines = big2.length <= 2 ? big2 : wrap(effect, Math.floor((w - 24) / 9)).slice(0, 3);
    const es = big2.length <= 2 ? 2 : 1.5;
    lines.forEach((l, k) => drawText(ctx, l, 0, ey + (k - (lines.length - 1) / 2) * (es * 11), es, COLORS.text));
    // The cost strip (only when it costs something): it states the rule, the same look on every card.
    const top = h / 2 - 80;
    if (cost) {
      ctx.fillStyle = '#2a0e14';
      ctx.fillRect(-w / 2 + 8, top, w - 16, 72);
      ctx.fillStyle = '#ff6a5a';
      ctx.fillRect(-w / 2 + 8, top, w - 16, 2);
      drawText(ctx, 'COST', 0, top + 13, 1.5, '#ff6a5a');
      const cl = wrap(cost, Math.floor((w - 28) / 12));
      const cs = cl.length <= 2 ? 2 : 1.5;
      const cls = cs === 2 ? cl : wrap(cost, Math.floor((w - 28) / 9)).slice(0, 3);
      cls.forEach((l, k) => drawText(ctx, l, 0, top + 45 + (k - (cls.length - 1) / 2) * (cs * 10), cs, '#ff8a7a'));
    } else drawText(ctx, 'NO COST', 0, top + 40, 1.5, COLORS.textDim);
    // The cards not taken sink into shadow (a shade, not alpha: a faded frame tints the card brown).
    if (dimmed) {
      ctx.fillStyle = 'rgba(7,4,14,0.7)';
      ctx.fillRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12);
    }
    // The pick: a TAKEN stamp slams on, tilted.
    if (picked && this.stamp > 0) {
      const k = this.stamp;
      ctx.save();
      ctx.translate(0, sy + sh / 2);
      ctx.rotate(-0.2);
      ctx.scale(2.2 - 1.2 * k, 2.2 - 1.2 * k);
      ctx.globalAlpha *= Math.min(1, k * 1.5);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(-84, -26, 168, 52);
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillRect(-80, -22, 160, 44);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(-74, -16, 148, 32);
      drawText(ctx, 'TAKEN', 0, 1, 3, COLORS.goldLight);
      ctx.restore();
    }
    ctx.restore();
  }

  /** A choice's symbols, composed: what it touches, big, with its change on a tag. */
  private drawChoiceArt(ctx: CanvasRenderingContext2D, ch: BigChoice, x: number, y: number, s: number, time: number): void {
    const run = this.run!;
    const p = run.player;
    const cab = CABINETS[run.cabinet];
    const atk = cab.attack as SpriteId;
    const syms = cab.symbols.filter((sym) => p.strips.some((st) => (st[sym] ?? 0) > 0)).slice(0, 3);
    const tag = (text: string, tx: number, ty: number, color: string, sc = 2.5) => {
      const tw = text.length * 6 * sc + 12;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(tx - tw / 2, ty - 6 * sc, tw, 12 * sc);
      drawText(ctx, text, tx, ty, sc, color);
    };
    const charmOn = (enh: Enh, sx: number, sy: number, sc: number) => {
      // The Charm on one of THIS machine's symbols (attack first): never a sword on a machine without swords.
      const on = [cab.attack, ...cab.symbols].find((sym) => CHARM_SYMBOLS[enh].includes(sym)) ?? CHARM_SYMBOLS[enh][0];
      drawSprite(ctx, on as SpriteId, sx, sy, sc);
      drawSprite(ctx, ENH_SPRITE[enh], sx, sy, sc);
    };
    const LV = '#5ad8e8';
    switch (ch.id) {
      case 'armsRace':
        syms.forEach((sym, k) => {
          const sx = x + (k - (syms.length - 1) / 2) * (s * 15);
          drawSprite(ctx, sym as SpriteId, sx, y - 8, s * 0.65);
          tag('+1', sx, y + 34, LV, 2);
        });
        break;
      case 'masterwork': {
        const others = syms.filter((sym) => sym !== ch.symbol);
        others.forEach((sym, k) => drawSprite(ctx, sym as SpriteId, x + (k ? 1 : -1) * s * 17, y + 10, s * 0.45, { alpha: 0.3 }));
        drawSprite(ctx, ch.symbol as SpriteId, x, y - 6, s * 1.05);
        tag('+2', x + s * 10, y + 30, LV, 3);
        break;
      }
      case 'whetstone':
        drawSprite(ctx, ch.symbol as SpriteId, x, y - 6, s);
        tag('+1', x + s * 10, y + 30, LV, 3);
        break;
      case 'polish':
        charmOn(ch.enh!, x, y - 6, s);
        tag('+1', x + s * 10, y + 30, LV, 3);
        break;
      case 'meltDown': {
        const owned = [...new Set(p.gilded.map((gc) => gc.enh))].filter((e) => e !== 'gold').slice(0, 3);
        const list = owned.length ? owned : (['keen'] as Enh[]);
        list.forEach((e, k) => charmOn(e, x - s * 13, y - (list.length - 1) * s * 4 + k * s * 8, s * 0.42));
        drawSprite(ctx, 'arrowRight', x - s * 2, y, 2.5);
        charmOn('gold', x + s * 10, y - 4, s * 0.9);
        break;
      }
      case 'gildLot':
        [-1, 1, 0].forEach((k) => {
          drawSprite(ctx, atk, x + k * s * 11, y - 4 + Math.abs(k) * 6, s * 0.7, { rot: k * 0.18 });
          drawSprite(ctx, ENH_SPRITE.gold, x + k * s * 11, y - 4 + Math.abs(k) * 6, s * 0.7, { rot: k * 0.18 });
        });
        tag('X3', x, y + 40, COLORS.goldLight, 2);
        break;
      case 'cleanCut':
        drawText(ctx, `REEL ${ch.reel! + 1}`, x, y - 56, 1.5, COLORS.textDim);
        drawSprite(ctx, 'shield', x - s * 11, y, s * 0.7, { alpha: 0.6 });
        drawSprite(ctx, 'minusBadge', x - s * 11 + 20, y + 18, 3);
        drawSprite(ctx, 'arrowRight', x, y, 2.5);
        drawSprite(ctx, atk, x + s * 11, y, s * 0.7);
        tag('+1', x + s * 11 + 14, y + 30, LV, 2);
        break;
      case 'twinReel': {
        const top = (Object.entries(p.strips[0]) as [SymbolId, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([sym]) => sym);
        for (const [cx, label, alpha] of [[x - s * 12, 'R1', 1], [x + s * 12, 'R3', 1]] as [number, string, number][]) {
          ctx.fillStyle = COLORS.outline;
          ctx.fillRect(cx - s * 5, y - s * 12, s * 10, s * 24);
          ctx.fillStyle = '#0d0818';
          ctx.fillRect(cx - s * 5 + 3, y - s * 12 + 3, s * 10 - 6, s * 24 - 6);
          top.forEach((sym, k) => drawSprite(ctx, sym as SpriteId, cx, y - s * 7.5 + k * s * 7.5, s * 0.42, { alpha }));
          drawText(ctx, label, cx, y + s * 12 + 10, 1.5, COLORS.textDim);
        }
        drawSprite(ctx, 'arrowRight', x, y, 3, { sx: 1 + 0.15 * Math.sin(time * 6) });
        break;
      }
      case 'sweepUp':
        drawSprite(ctx, 'rock', x - s * 9, y, s * 0.7);
        drawSprite(ctx, 'minusBadge', x - s * 9 + 18, y + 18, 3);
        drawSprite(ctx, 'heart', x + s * 9, y, s * 0.8);
        drawSprite(ctx, 'plusBadge', x + s * 9 + 18, y + 18, 3);
        break;
      case 'glassCannon':
        drawSprite(ctx, atk, x, y - 6, s);
        tag(`X${BIG.glassPay}`, x + s * 9, y + 30, COLORS.goldLight, 3);
        break;
      case 'bloodPact': {
        const m = cab.meter?.symbol as SpriteId | undefined;
        if (m) {
          drawSprite(ctx, m, x, y - 6, s);
          tag('2X', x + s * 10, y + 30, LV, 3);
        } else {
          drawSprite(ctx, 'sword', x - s * 8, y - 4, s * 0.75);
          drawSprite(ctx, 'shield', x + s * 8, y - 4, s * 0.75);
          tag('+1', x, y + 34, LV, 2.5);
        }
        break;
      }
      case 'secondWind':
        drawSprite(ctx, 'heart', x - s * 4, y - 4, s * 1.1);
        drawSprite(ctx, 'plusBadge', x - s * 4 + 24, y + 20, 3);
        drawSprite(ctx, 'shield', x + s * 12, y + 4, s * 0.5);
        tag('+1', x + s * 12, y + 34, LV, 2);
        break;
      case 'temper':
        if (ch.enh) charmOn(ch.enh, x, y - 6, s);
        else drawSprite(ctx, (ch.symbol ?? atk) as SpriteId, x, y - 6, s);
        tag('+1', x + s * 10, y + 30, LV, 3);
        break;
      case 'luckyBreak':
        charmOn(ch.enh ?? 'gold', x, y - 6, s);
        tag('+2', x + s * 10, y + 30, LV, 3);
        break;
      case 'devilsDue':
        drawSprite(ctx, atk, x, y - 6, s);
        tag(`X${BIG.devilPay}`, x + s * 9, y + 30, '#ff6a5a', 3);
        break;
      case 'allIn':
        drawSprite(ctx, 'shield', x - s * 11, y, s * 0.7);
        drawSprite(ctx, 'arrowRight', x, y, 2.5);
        drawSprite(ctx, atk, x + s * 11, y, s * 0.7);
        break;
      case 'doubleOrNothing':
        syms.forEach((sym, k) => drawSprite(ctx, sym as SpriteId, x + (k - (syms.length - 1) / 2) * (s * 15), y - 8, s * 0.65));
        tag('+1 ALL', x, y + 36, LV, 2);
        break;
      case 'cursedIdol':
        drawSprite(ctx, artId('tierLegendary') as SpriteId, x - s * 6, y - 4, s * 0.9);
        drawSprite(ctx, 'rock', x + s * 11, y + 14, s * 0.5);
        break;
      case 'quickening':
        drawSprite(ctx, (cab.meter?.symbol ?? atk) as SpriteId, x, y - 6, s);
        tag('FULL', x + s * 8, y + 30, LV, 2.5);
        break;
      case 'warded':
        drawSprite(ctx, RELICS.holywater.sprite as SpriteId, x, y - 6, s);
        tag(`X${BIG.wards}`, x + s * 9, y + 30, LV, 3);
        break;
      case 'pawnShop':
        // Both relics on the card: what goes, and what comes.
        if (ch.relic) drawSprite(ctx, RELICS[ch.relic].sprite as SpriteId, x - s * 12, y, s * 0.8, { alpha: 0.7 });
        if (ch.relic) drawSprite(ctx, 'minusBadge', x - s * 12 + 20, y + 20, 3);
        drawSprite(ctx, 'arrowRight', x, y, 2.5);
        if (ch.relic2) drawSprite(ctx, RELICS[ch.relic2].sprite as SpriteId, x + s * 12, y, s * 0.8);
        if (ch.relic2) drawSprite(ctx, 'plusBadge', x + s * 12 + 20, y + 20, 3);
        break;
      case 'treasure':
        drawSprite(ctx, artId('voucherRelic') as SpriteId, x, y, s);
        break;
      case 'houseMoney':
      case 'heist':
        [2, 1, 0].forEach((k) => drawSprite(ctx, 'chip', x - k * 8, y + 10 - k * 14, s * 0.8));
        tag(`+${ch.id === 'heist' ? BIG.heist : BIG.houseMoney}`, x + s * 9, y + 30, COLORS.goldLight, 2.5);
        break;
      case 'whetted':
      case 'bloodMoon':
      case 'cashIn':
      case 'fourLeaf':
      case 'overclock':
      case 'markedCards': {
        const to = ({ whetted: 'keen', bloodMoon: 'vamp', cashIn: 'lucre', fourLeaf: 'lucky', overclock: 'charged', markedCards: 'trick' } as Record<string, Enh>)[ch.id];
        const owned = [...new Set(p.gilded.map((gc) => gc.enh))].filter((e) => e !== to).slice(0, 3);
        owned.forEach((e, k) => charmOn(e, x - s * 13, y - (owned.length - 1) * s * 4 + k * s * 8, s * 0.42));
        drawSprite(ctx, 'arrowRight', x - s * 2, y, 2.5);
        charmOn(to, x + s * 10, y - 4, s * 0.9);
        break;
      }
      case 'excalibur':
        drawSprite(ctx, 'sword', x - s * 5, y - 6, s * 0.75, { rot: -0.2 });
        drawSprite(ctx, 'sword', x + s * 5, y - 6, s * 0.75, { rot: 0.2 });
        tag('JACKPOT', x, y + 36, COLORS.goldLight, 2);
        break;
      case 'shieldWall':
        drawSprite(ctx, 'shield', x, y - 6, s);
        tag('KEEP', x + s * 8, y + 30, LV, 2.5);
        break;
      case 'shieldSlam':
        drawSprite(ctx, 'shield', x - s * 8, y, s * 0.75);
        drawSprite(ctx, 'arrowRight', x + s * 2, y, 2.5);
        drawSprite(ctx, 'skull', x + s * 12, y, s * 0.6);
        break;
      case 'crusade':
        drawSprite(ctx, 'sword', x, y - 6, s);
        tag(`+${BIG.crusadeStep}`, x + s * 9, y + 30, LV, 3);
        break;
      case 'squire':
        charmOn('keen', x, y - 6, s);
        tag(`X${BIG.squireCells}`, x + s * 9, y + 30, LV, 3);
        break;
      case 'chainLightning':
      case 'madScience':
      case 'stormFront':
      case 'groundWire':
        drawSprite(ctx, 'bolt', x - (ch.id === 'chainLightning' ? s * 6 : 0), y - 6, s * (ch.id === 'chainLightning' ? 0.75 : 1));
        if (ch.id === 'chainLightning') drawSprite(ctx, 'bolt', x + s * 6, y - 6, s * 0.75);
        if (ch.id === 'madScience') tag(`X${BIG.madMul}`, x + s * 9, y + 30, '#ff6a5a', 3);
        if (ch.id === 'stormFront') tag('START', x + s * 8, y + 30, LV, 2.5);
        if (ch.id === 'groundWire') drawSprite(ctx, 'heart', x + s * 10, y + 20, s * 0.45);
        break;
      case 'supercell':
        charmOn('charged', x - s * 11, y, s * 0.7);
        drawSprite(ctx, 'arrowRight', x, y, 2.5);
        charmOn('blaze', x + s * 11, y, s * 0.7);
        break;
      case 'jokersReel':
      case 'doubleFeature':
      case 'cardShark':
        drawSprite(ctx, 'wild', x, y - 6, s);
        tag(ch.id === 'jokersReel' ? 'REEL 2' : ch.id === 'cardShark' ? `+${BIG.sharkWilds}` : '2 SPINS', x + s * 8, y + 30, LV, 2.5);
        break;
      case 'highCard':
      case 'trumpCard':
        drawSprite(ctx, 'ace', x, y - 6, s);
        tag(ch.id === 'highCard' ? 'X2' : 'PIERCE', x + s * 8, y + 30, ch.id === 'highCard' ? COLORS.goldLight : LV, 2.5);
        break;
      case 'headliner':
      case 'feedback':
      case 'hypeMan':
      case 'encoreDrop':
      case 'backupDancers':
        drawSprite(ctx, 'note' as SpriteId, x, y - 6, s);
        tag(ch.id === 'headliner' ? 'X2' : ch.id === 'feedback' ? 'HOLD' : ch.id === 'hypeMan' ? '+1' : ch.id === 'encoreDrop' ? 'AGAIN' : `+${BIG.dancers}`, x + s * 8, y + 30, '#5ad8e8', 2.5);
        break;
      case 'noLimit':
      case 'openBar':
      case 'monsoon':
      case 'trustFund':
        drawSprite(ctx, (ch.id === 'monsoon' ? 'goldbar' : 'chip') as SpriteId, x, y - 6, s);
        tag(ch.id === 'noLimit' ? 'NO MAX' : ch.id === 'openBar' ? 'FREE' : ch.id === 'monsoon' ? 'RAIN' : `+${BIG.trustChips}`, x + s * 8, y + 30, COLORS.goldLight, 2.5);
        break;
      case 'edge':
        drawSprite(ctx, (ch.reward === 'legend' ? artId('tierLegendary') : ch.reward === 'relic' ? artId('voucherRelic') : 'chip') as SpriteId, x, y, ch.reward === 'chips' ? s * 1.5 : s);
        break;
      case 'cashOut':
        [2, 1, 0].forEach((k) => drawSprite(ctx, 'chip', x - k * 8, y + 10 - k * 14, s * 0.8));
        break;
      case 'ride':
        drawSprite(ctx, 'relicDrum', x, y, s);
        break;
    }
  }

  /** Hovered for a moment: the card's full rule and cost, under it (above when there's no room). */
  private drawChoiceTip(ctx: CanvasRenderingContext2D, c: Hit, ch: BigChoice): void {
    const { title, rule, cost } = describeChoice(this.run!, ch);
    const w = 380;
    const rl = wrap(rule, 38);
    const cl = cost ? wrap(`COST: ${cost}`, 38) : [];
    const h = 40 + (rl.length + cl.length) * 15 + (cl.length ? 6 : 0);
    const x = Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, c.x - w / 2));
    const below = c.y + c.h / 2 + 10;
    const y = below + h <= H - 6 ? below : c.y - c.h / 2 - h - 10;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    drawText(ctx, title, x + 12, y + 16, 2, COLORS.goldLight, { align: 'left' });
    rl.forEach((l, k) => drawText(ctx, l, x + 12, y + 38 + k * 15, 1.5, COLORS.text, { align: 'left' }));
    cl.forEach((l, k) => drawText(ctx, l, x + 12, y + 44 + (rl.length + k) * 15, 1.5, '#ff8a7a', { align: 'left' }));
  }

  showDraft(run: RunState, offers: DraftOption[], last: FightRecord | null, kind: 'draft' | 'spoils' | 'legend' | 'start' = 'draft'): void {
    this.draftKind = kind;
    this.run = run;
    this.offers = offers;
    this.lastRecord = last;
    this.open('draft');
    const n = offers.length;
    const gap = n > 3 ? 232 : 300;
    this.cards = offers.map((o, i) =>
      this.hit(CX + (i - (n - 1) / 2) * gap, 384, gap - 30, 222, () => {
        if (this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        const card = this.cards[i];
        void this.ui
          .tween({ from: 1.08, to: 1.18, dur: 0.15, ease: backOut(2), onUpdate: (v) => (card.scale = v) })
          .then(() => this.ui.wait(0.35))
          .then(() =>
            kind === 'legend' && o.kind === 'relic' ? this.cb.onLegend(o.relic) : (kind === 'spoils' || kind === 'start') && o.kind === 'relic' ? this.cb.onSpoils(o.relic) : this.cb.onPick(o),
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
    this.enemyEntrance(run);
    if (needsChoice(run)) {
      this.buttons = run.paths[run.depth].map((_, i) => this.btn('FIGHT THIS ONE', CX + (i === 0 ? -238 : 238), 560, 260, 48, () => this.cb.onFight(i)));
    } else {
      const bossId = run.enemies[run.depth]?.boss;
      const boss = run.depth >= actLength(run.act) ? (bossId === 'dealer' ? 'FACE THE DEALER' : bossId === 'mirror' ? 'FACE THE MIRROR' : 'FACE THE HOUSE') : 'FIGHT!';
      this.buttons = [this.btn(boss, CX, 560, boss === 'FIGHT!' ? 290 : 360, 56, () => this.cb.onFight(0))];
      this.addBetButtons(run);
      // With a side bet on the table, FIGHT steps right of its card.
      if (this.betOffer.length) this.buttons[0].x = CX + 170;
    }
  }

  /** The headliner card arrives: it rises in, the portrait lands, the skulls pop one by one, the pips fill. */
  private enemyEntrance(run: RunState): void {
    this.flips.clear();
    this.pinned = -1;
    this.panelIn = 0;
    this.portraitPop = 1.25;
    this.skullPop = [0, 0, 0];
    this.pipFill = 0;
    this.lastPip = 1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (this.panelIn = v) });
    void this.ui.wait(0.12).then(() => this.ui.tween({ from: 1.25, to: 1, dur: 0.18, ease: backOut(2), onUpdate: (v) => (this.portraitPop = v) }));
    const e = run.enemies[run.depth];
    const pips = needsChoice(run) ? 3 : this.dangerOf(e);
    for (let k = 0; k < 3; k++)
      void this.ui.wait(0.2 + k * 0.08).then(() => {
        if (k < pips) {
          if (k === 2 && e.isBoss && !needsChoice(run)) this.sounds.stingerMedium();
          else this.sounds.click();
        }
        return this.ui.tween({ from: 0, to: 1, dur: 0.22, ease: backOut(3), onUpdate: (v) => (this.skullPop[k] = v) });
      });
    void this.ui.wait(0.5).then(() =>
      this.ui.tween({ from: 0, to: 8, dur: 0.4, onUpdate: (v) => (this.pipFill = v) }).then(() => {
        this.pipFill = 99;
        return this.ui.tween({ from: 1.3, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (this.lastPip = v) });
      }),
    );
  }

  /** SIDE BET: the fight's one bet, staked with a -5 / -1 / +1 / +5 stepper (0 takes it off the table). */
  private addBetButtons(run: RunState): void {
    this.betOffer = offerBets(run, this.base());
    if (!this.betOffer.length) return;
    BET_STEPS.forEach((d) => {
      const x = BET_X + (d < 0 ? -1 : 1) * (Math.abs(d) === 1 ? 54 : 102);
      const b = this.btn(d > 0 ? `+${d}` : `${d}`, x, BET_Y + 102, Math.abs(d) === 1 ? 40 : 46, 30, () => this.stepBet(d));
      b.bet = d;
      this.buttons.push(b);
    });
  }

  private stepBet(d: number): void {
    const run = this.run!;
    const before = run.bet?.stake ?? 0;
    const after = stepStake(run, d);
    if (after === before) this.sounds.fizzle();
    else if (after > before) {
      this.sounds.coin(4);
      this.sounds.coin(8);
    } else this.sounds.click();
    if (after !== before) {
      this.betDrop = after > before ? 1 : -1;
      void this.ui.tween({ from: 1.3, to: 1, dur: 0.22, ease: backOut(2), onUpdate: (v) => (this.betPunch = v) });
      void this.ui.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (this.betFall = v) });
    }
  }

  /** The bet card: its name, its line, what it pays, and the stake stepper. */
  private drawBets(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const b = this.betOffer[0];
    const stake = run.bet?.stake ?? 0;
    const cx = BET_X;
    this.panel(ctx, cx - 130, BET_Y, 260, 128, stake ? COLORS.goldLight : '#2a6a3a');
    const d = describeBet(b);
    drawText(ctx, 'SIDE BET', cx, BET_Y + 14, 1.5, COLORS.textDim);
    drawText(ctx, d.name, cx, BET_Y + 34, 2, stake ? COLORS.goldLight : '#c8f0c8');
    drawText(ctx, d.rule, cx, BET_Y + 56, 1.5, COLORS.text);
    const hot = !!b.hot;
    drawText(ctx, `${hot ? 'HOT HAND! ' : ''}PAYS X${b.pay}  -  MAX ${stakeCap(run)}`, cx, BET_Y + 76, 1.5, hot ? '#ff8a3a' : COLORS.goldLight, { punch: hot ? 1 + 0.05 * Math.sin(time * 8) : 1 });
    drawText(ctx, `${stake}`, cx, BET_Y + 103, stake ? 2.5 : 2, stake ? '#fff6c8' : COLORS.textDim, { punch: this.betPunch });
    const top = maxStake(run);
    // The stake as a chip stack beside the card: a chip drops on with each raise, lifts off with each cut.
    const chips = Math.min(10, Math.ceil(stake / 2));
    const sx = cx - 168;
    const wob = stake >= top && stake > 0 && this.betFall > 0 ? Math.sin(this.betFall * Math.PI * 4) * 2 : 0;
    for (let k = 0; k < chips; k++) {
      const topChip = k === chips - 1 && this.betDrop > 0;
      drawSprite(ctx, 'chip', sx + wob, BET_Y + 110 - k * 5 - (topChip ? this.betFall * 24 : 0), 1.5);
    }
    if (this.betDrop < 0 && this.betFall > 0) drawSprite(ctx, 'chip', sx, BET_Y + 110 - chips * 5 - (1 - this.betFall) * 18, 1.5, { alpha: this.betFall });
    if (stake >= top && stake > 0) drawText(ctx, 'MAX', sx, BET_Y + 92 - chips * 5, 1.5, COLORS.goldLight, { punch: this.betPunch });
    for (const btn of this.buttons) {
      if (btn.bet === undefined) continue;
      const ok = btn.bet > 0 ? stake < top : stake > 0;
      ctx.save();
      ctx.globalAlpha *= ok ? 1 : 0.35;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(btn.x - btn.w / 2 - 2, btn.y - btn.h / 2 - 2, btn.w + 4, btn.h + 4);
      ctx.fillStyle = btn.hover && ok ? '#3a8a4a' : '#1e4a2a';
      ctx.fillRect(btn.x - btn.w / 2, btn.y - btn.h / 2, btn.w, btn.h);
      drawText(ctx, btn.label, btn.x, btn.y + 1, 2, '#fff6c8');
      ctx.restore();
    }
  }

  /** The Cashier: four priced slots, a reroll and a way out. */
  showShop(run: RunState, items: ShopItem[], reopen = false): void {
    this.run = run;
    this.shopItems = items;
    if (!reopen) this.open('shop');
    this.buttons = [
      this.minorBtn(`REROLL - ${rerollCost(run)}`, CX - 160, 574, 260, 50, () => this.cb.onReroll()),
      this.btn('LEAVE', CX + 160, 574, 260, 50, () => this.cb.onLeave()),
    ];
    // Two shelves: the counter (charms, swaps, levels, heals) and, behind the glass, the relics.
    const premium = (it: ShopItem) => it.option.kind === 'relic';
    const rows = [items.filter((it) => !premium(it)), items.filter(premium)];
    this.shopHits = items.map((it, i) => {
      const row = premium(it) ? 1 : 0;
      const k = rows[row].indexOf(it);
      const n = rows[row].length;
      // The item itself: a click or tap pins its card open (hover shows it too). The tag under it buys.
      const x = CX + (k - (n - 1) / 2) * SHELF.gap;
      const h = this.hit(x, SHELF.y[row] - 8, 128, 100, () => {
        this.shopSel = this.shopSel === i ? -1 : i;
      });
      h.scale = reopen ? 1 : 0;
      return h;
    });
    this.shopTags = items.map((_, i) => {
      const it = this.shopHits[i];
      // (Its size follows the item's entrance; its own scale is only the press bounce.)
      return { ...this.hit(it.x, it.y + 8 + TAG.y, TAG.w, TAG.h, () => this.mode === 'shop' && this.cb.onBuy(i)), scale: 1 };
    });
    if (!reopen) this.shopSel = -1;
    else if (this.shopItems[this.shopSel]?.sold) this.shopSel = -1;
    if (!reopen)
      this.shopHits.forEach(
        (c, i) =>
          void this.ui.wait(0.1 + i * 0.07).then(() => this.ui.tween({ from: 0, to: 1, dur: 0.28, ease: backOut(2), onUpdate: (v) => (c.scale = v) })),
      );
  }

  /** Called after a purchase: bounce the chip counter and refresh the shelf. */
  bought(i?: number, item?: ShopItem): void {
    void this.ui.tween({ from: 1.6, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.chipPulse = v) });
    // What you bought hops in an arc into its spot on YOUR BUILD (relics to the grid, levels to LEVELS, the rest to your reels).
    const h = i !== undefined ? this.shopHits[i] : undefined;
    if (h && item) {
      const o = item.option;
      const sprite = (o.kind === 'relic' ? RELICS[o.relic].sprite : o.kind === 'gild' ? ENH_SPRITE[o.enh] : o.kind === 'charmLevel' ? ENH_SPRITE[o.enh] : o.kind === 'symLevel' ? o.symbol : o.kind === 'swap' ? o.to : o.kind === 'remove' ? o.symbol : 'heart') as SpriteId;
      const to =
        o.kind === 'relic' ? { x: BUILD.x + 40, y: BUILD.y + 600 } : o.kind === 'symLevel' || o.kind === 'charmLevel' ? { x: BUILD.x + 60, y: BUILD.y + 432 } : o.kind === 'gild' || o.kind === 'swap' || o.kind === 'remove' ? { x: BUILD.x + 140, y: BUILD.y + 240 } : { x: BUILD.x + 140, y: BUILD.y + 140 };
      const f = { sprite, x0: h.x, y0: h.y, x1: to.x, y1: to.y, t: 0 };
      this.flyers.push(f);
      void this.ui.tween({ from: 0, to: 1, dur: 0.35, ease: sineOut, onUpdate: (v) => (f.t = v) }).then(() => {
        this.flyers = this.flyers.filter((x) => x !== f);
      });
    }
    if (this.run) this.showShop(this.run, this.shopItems, true);
  }

  /** The run-over screen is offering LET IT RIDE (shows the "win is banked" line). */
  private rideOffer = false;
  showOver(run: RunState): void {
    this.rideOffer = false;
    this.run = run;
    this.open('over');
    this.buttons = [this.minorBtn('MENU', CX - 140, 528, 240, 52, () => this.cb.onMenu()), this.btn('NEW RUN', CX + 140, 528, 240, 52, () => this.cb.onNewRun())];
    // Beat the Dealer: CASH OUT (the two buttons above) or LET IT RIDE into endless loops.
    if (run.won && run.act >= 3 && !run.endless) {
      this.buttons = [
        this.minorBtn('MENU', CX - 300, 528, 200, 52, () => this.cb.onMenu()),
        this.btn('CASH OUT', CX - 60, 528, 220, 52, () => this.cb.onNewRun()),
        this.btn('LET IT RIDE', CX + 220, 528, 280, 52, () => this.cb.onLetItRide()),
      ];
      this.rideOffer = true;
    }
    // THE DAILY RUN: a line to share, and a button that copies it.
    this.shareLine = run.daily ? dailyShare(run.daily, CABINETS[run.cabinet].hero, run.dailyEdge ? EDGE_TEXT[run.dailyEdge].title : '-', runScore(runEntry(run, 0)), run.records, actLength) : '';
    this.openResults();
  }
  /** THE DAILY RUN: the finished run's share line. */
  private shareLine = '';
  /** META: what the finished run earned (XP, level, achievements, titles), and its leaderboard post. */
  private meta: MetaGain | null = null;
  private onlineLine = '';
  setMeta(g: MetaGain): void {
    this.meta = g;
    this.onlineLine = '';
  }
  /** THE RESULTS card over the run-over table: XP filling, a level up, achievements, titles, unlocks, the share line. */
  private results: { xp: number; fill: Promise<void> | null; done: boolean; level: number; pop: number } | null = null;
  private resultsHit: Hit | null = null;
  /** THE DAILY RUN: COPY RESULT, on the RESULTS card under the share line. */
  private resultsCopy: Btn | null = null;
  private openResults(): void {
    const g = this.meta;
    const worth = g && (g.xp > 0 || g.achievements.length || g.titles.length || g.trims.length || this.unlockedNow.length || this.shareLine);
    if (!g || !worth) {
      this.results = null;
      return;
    }
    const r = { xp: g.xpBefore, fill: null as Promise<void> | null, done: false, level: g.levelBefore, pop: 0 };
    this.results = r;
    this.resultsHit = this.hit(W / 2, H / 2, W, H, () => {
      if (!r.done) return this.finishResults(r);
      this.results = null;
      this.resultsHit = null;
      this.resultsCopy = null;
    });
    const copy = this.shareLine
      ? this.minorBtn('COPY RESULT', W / 2, 584, 240, 40, () => {
          void navigator.clipboard?.writeText(this.shareLine).then(
            () => (copy!.label = 'COPIED!'),
            () => (copy!.label = 'COPY FAILED'),
          );
        })
      : null;
    this.resultsCopy = copy;
    // The bar fills over ~1.6 s (a click skips it); each level crossed pops a banner.
    r.fill = this.ui
      .tween({
        from: g.xpBefore,
        to: g.xpAfter,
        dur: Math.min(2.2, 0.6 + g.xp / 4000),
        ease: sineOut,
        onUpdate: (v) => {
          if (r.done) return;
          r.xp = v;
          const lvl = levelOf(v).level;
          if (lvl > r.level) {
            r.level = lvl;
            this.levelPop(r);
          }
        },
      })
      .then(() => this.finishResults(r));
  }
  private finishResults(r: NonNullable<typeof this.results>): void {
    if (r.done || !this.meta) return;
    r.done = true;
    r.xp = this.meta.xpAfter;
    if (this.meta.levelAfter > r.level) {
      r.level = this.meta.levelAfter;
      this.levelPop(r);
    }
  }
  private levelPop(r: NonNullable<typeof this.results>): void {
    this.sounds.fanfareJackpot();
    void this.ui.tween({ from: 1, to: 0, dur: 0.9, onUpdate: (v) => (r.pop = v) });
  }
  setOnline(text: string): void {
    this.onlineLine = text;
  }

  hide(): void {
    this.mode = 'none';
  }

  // ---- input -------------------------------------------------------------------------

  /** Keyboard / gamepad focus targets (STEAM_READINESS S3): everything clickable, plus the cards' "?" flip tabs. */
  navTargets(): { x: number; y: number; w: number; h: number }[] {
    if (!this.active || performance.now() - this.openedAt < INPUT_GUARD_MS) return [];
    const out: { x: number; y: number; w: number; h: number }[] = [...this.all().filter((h) => h.enabled), ...(this.mode !== 'cabinet' && this.mode !== 'bonus' ? this.relicRects : [])];
    if (this.mode === 'next' && this.run) {
      const fork = needsChoice(this.run);
      const xs = fork ? [CX - 464, CX + 12] : [CX - 330];
      const y0 = fork ? 222 : 214;
      const cw = fork ? 452 : 660;
      for (const px of xs) out.push({ x: px + cw - FLIP_TAB.w / 2 - 8, y: y0 + 260 - FLIP_TAB.h / 2 - 8, w: FLIP_TAB.w + 16, h: FLIP_TAB.h + 16 });
    }
    return out;
  }

  /** The build panel's relic icons (drawn each frame): focus targets, so keyboard and pad players can read them (Q7). */
  private relicRects: { x: number; y: number; w: number; h: number }[] = [];

  private all(): Hit[] {
    if (this.mode === 'over' && this.results && this.resultsHit) return this.resultsCopy ? [this.resultsCopy, this.resultsHit] : [this.resultsHit];
    return [...this.cards.filter((c) => c.enabled), ...this.buttons, ...this.shopHits.filter((_, i) => !this.shopItems[i]?.sold), ...this.shopTags.filter((_, i) => !this.shopItems[i]?.sold)];
  }

  private inside(h: Hit, x: number, y: number): boolean {
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
    // A fresh screen ignores clicks for a moment, so a double-click can't buy on arrival (ITERATION_9 H8).
    if (performance.now() - this.openedAt < INPUT_GUARD_MS) return this.active;
    const h = this.all().find((h) => this.inside(h, x, y));
    // Only the card's "?" tab flips it (picking is the FIGHT button): one spot per action, so taps never mix them up.
    if (!h && this.mode === 'next' && this.run) {
      const fork = needsChoice(this.run);
      const xs = fork ? [CX - 464, CX + 12] : [CX - 330];
      const y0 = fork ? 222 : 214;
      const cw = fork ? 452 : 660;
      const hitX = xs.find((px) => x >= px + cw - FLIP_TAB.w - 16 && x <= px + cw && y >= y0 + 260 - FLIP_TAB.h - 16 && y <= y0 + 260);
      if (hitX !== undefined) {
        this.pinned = this.pinned === hitX ? -1 : hitX;
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
    this.tips.begin();
    // A solid casino-floor backdrop: the fight scene never shows through a menu.
    ctx.save();
    ctx.globalAlpha = this.fade;
    drawBackdrop(ctx);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.mode === 'draft') this.drawDraft(ctx, time);
    else if (this.mode === 'next') this.drawNext(ctx, time);
    else if (this.mode === 'shop') this.drawShop(ctx, time);
    else if (this.mode === 'cabinet') this.drawCabinets(ctx, time);
    else if (this.mode === 'bonus') this.drawBonus(ctx, time);
    else if (this.mode === 'choice') this.drawChoice(ctx, time);
    else this.drawOver(ctx);
    // YOUR BUILD: one fixed panel at the bottom of every between-fights screen.
    if (this.run && this.mode !== 'cabinet' && this.mode !== 'bonus') this.drawBuild(ctx);
    for (const f of this.flyers) {
      const x = f.x0 + (f.x1 - f.x0) * f.t;
      const y = f.y0 + (f.y1 - f.y0) * f.t - Math.sin(f.t * Math.PI) * 90;
      drawSprite(ctx, f.sprite, x, y, 4 - 2.5 * f.t, { rot: f.t * Math.PI * 2 * 0.5 });
    }
    // Over everything: what the relic under the pointer does (cards that already say it don't add spots).
    if (!this.results) this.tips.draw(ctx, this.mouse.x, this.mouse.y, this.run?.cabinet);
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
    const gap = Math.min(150, 880 / Math.max(1, n - 1));
    const x0 = CX - ((n - 1) * gap) / 2;
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(x0, y - 2, (n - 1) * gap, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y - 2, Math.min(run.depth, n - 1) * gap, 4);
    // Hovering a node shows who it is (deep planners can read the whole act; nobody has to).
    let tip: { e: EnemyDef; x: number; y: number } | null = null;
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
        if (Math.abs(this.mouse.x - x) <= s && Math.abs(this.mouse.y - ny) <= s) tip = { e, x, y: ny + s };
      });
      if (here) drawSprite(ctx, 'nodeHere', x, y - (fork ? 70 : 44) + Math.sin(time * 6) * 4, 2);
      if (opts[0].isBoss) drawSprite(ctx, 'nodeBoss', x, y - 38, 2);
      drawText(ctx, opts[0].isBoss ? 'BOSS' : `${i + 1}`, x, y + (fork ? 64 : 42), 2, here ? COLORS.goldLight : done ? '#6a6078' : COLORS.textDim);
    });
    // Drawn last by drawNext (over the enemy card).
    this.mapTip = tip;
  }

  /** A map node's mini card: name, then its ability icon and name. */
  private drawNodeTip(ctx: CanvasRenderingContext2D, t: { e: EnemyDef; x: number; y: number }): void {
    const name = t.e.name ?? 'ENEMY';
    const ab = t.e.ability ? ABILITY_UI[t.e.ability.kind] : null;
    const w = Math.max(name.length * 12, ab ? ab.label.length * 9 + 30 : 0) + 24;
    const h = ab ? 52 : 32;
    const x = Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, t.x - w / 2));
    const y = t.y + 10;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = t.e.isBoss ? '#ff6a5a' : t.e.elite ? '#ff9a3a' : COLORS.gold;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    drawText(ctx, name, x + 12, y + 16, 2, t.e.isBoss ? '#ff6a5a' : COLORS.slime, { align: 'left' });
    if (ab) {
      drawSprite(ctx, ab.icon, x + 20, y + 38, 1.5);
      drawText(ctx, ab.label, x + 34, y + 38, 1.5, '#ff9a3a', { align: 'left' });
    }
  }

  /** YOUR BUILD: a fixed column on the left of every run screen. Chips (top-left, where the fights show them too), you,
   * your reels as a tall table (a row per symbol and charm), your relics. */
  /** The BUILD pane popped out over a fight: chips and relic icons are drawn live by the fight itself. */
  drawBuildFor(ctx: CanvasRenderingContext2D, run: RunState): void {
    const keep = this.run;
    this.run = run;
    this.drawBuild(ctx, true);
    this.run = keep;
  }

  private drawBuild(ctx: CanvasRenderingContext2D, inFight = false): void {
    const run = this.run!;
    const p = run.player;
    const { x, y, w, h } = BUILD;
    this.relicRects = [];
    this.panel(ctx, x, y, w, h);
    const rule = (yy: number) => {
      ctx.fillStyle = '#2a2140';
      ctx.fillRect(x + 10, yy, w - 20, 2);
    };
    // CHIPS: big, always in the same spot.
    if (!inFight) {
      drawSprite(ctx, 'chip', CHIP_SPOT.x, CHIP_SPOT.y, 3);
      drawText(ctx, `${p.chips}`, CHIP_SPOT.x + 24, CHIP_SPOT.y, 4, COLORS.energy, { align: 'left', punch: this.chipPulse });
    }
    if (!inFight) drawText(ctx, 'CHIPS', x + w - 12, CHIP_SPOT.y + 4, 1.5, COLORS.textDim, { align: 'right' });
    rule(y + 58);
    // Who you are and how you're doing.
    const cab = CABINETS[run.cabinet];
    if (hasSprite(cab.heroSprite)) drawSprite(ctx, cab.heroSprite as SpriteId, x + 30, y + 94, 2);
    drawText(ctx, cab.hero, x + 60, y + 86, 2, COLORS.goldLight, { align: 'left' });
    drawText(ctx, run.endless ? `LOOP ${run.endless.loop}` : `ACT ${run.act}${run.stake ? `  -  ${stakeOf(run.stake).name}` : ''}`, x + 60, y + 106, 1.5, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, x + 2, y + 138, w - 44);
    rule(y + 160);
    // Your reels: columns 1 2 3, a row per symbol (and charm).
    drawText(ctx, 'YOUR REELS', x + 12, y + 178, 2, COLORS.textDim, { align: 'left' });
    const table = runTable(p);
    drawReelTable(ctx, x + 8, y + 190, table, { colW: 90, rowH: 28, scale: 1.5, text: 2, maxRows: 6, levels: p.levels, ticket: p.relics.includes('ticket'), cap: levelCap(run), maxH: 190, badges: false });
    rule(y + 386);
    // SYMBOLS and CHARMS (user, 2026-10-08): every type you own, its level and what one is worth right now.
    const cap = levelCap(run);
    const ticket = p.relics.includes('ticket');
    const syms = CABINETS[run.cabinet].symbols.filter((sym) => p.strips.some((st) => (st[sym] ?? 0) > 0));
    const charms = [...new Map(table.flat().filter((r) => r.enh).map((r) => [r.enh!, r.symbol as SymbolId])).entries()];
    const entries: { sprite: SymbolId; enh?: Enh; level: number; value: string }[] = [
      ...syms.map((sym) => ({ sprite: sym, level: symLevel(p.levels, sym), value: String(playerSymValue(p.levels, sym, CFG_BASE[sym] ?? UNIT)) })),
      ...charms.map(([enh, sym]) => ({ sprite: sym, enh, level: charmLevel(p.levels, enh, ticket), value: charmTag(enh, charmLevel(p.levels, enh, ticket)) })),
    ];
    if (this.lvRun !== run) {
      this.lvRun = run;
      this.lvSeen.clear();
      this.lvPunch.clear();
    }
    const now = performance.now() / 1000;
    const drawEntry = (e: (typeof entries)[number], ex: number, ey: number) => {
      const key = e.enh ?? e.sprite;
      const seen = this.lvSeen.get(key);
      if (seen !== undefined && e.level > seen) this.lvPunch.set(key, now);
      this.lvSeen.set(key, e.level);
      const pt = (now - (this.lvPunch.get(key) ?? -9)) / 0.3;
      const punch = pt < 1 ? 1 + 0.6 * (1 - pt) * (1 - pt) : 1;
      if (pt < 1)
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + (k - 1) * 0.7;
          ctx.fillStyle = '#5ad8e8';
          ctx.globalAlpha = 1 - pt;
          ctx.fillRect(ex + 40 + Math.cos(a) * 20 * pt - 2, ey + Math.sin(a) * 20 * pt - 2, 4, 4);
          ctx.globalAlpha = 1;
        }
      // LV 1 sits dim, so what you've upgraded stands out; at the draft cap (or past it) the level turns orange.
      const top = e.level >= cap;
      const base = e.level <= 1;
      // A Charm is drawn alone on an empty cell (it can sit on several symbols: the symbol isn't part of it).
      if (e.enh) {
        ctx.fillStyle = '#4a3a66';
        ctx.fillRect(ex - 12, ey - 12, 24, 24);
        drawSprite(ctx, ENH_SPRITE[e.enh], ex, ey, 1.5, { dim: base ? 0.4 : 0 });
      } else drawSprite(ctx, e.sprite as SpriteId, ex, ey, 1.5, { dim: base ? 0.4 : 0 });
      drawText(ctx, `LV${e.level}`, ex + 18, ey, 2, top ? '#ff9a3a' : base ? COLORS.textDim : e.enh ? CHARM_COLOR[e.enh] : COLORS.goldLight, { align: 'left', punch });
      // What one pays right now (a symbol's number, a Charm's tag).
      drawText(ctx, e.value, ex + 108, ey, 1.5, COLORS.text, { align: 'right' });
    };
    drawText(ctx, 'SYMBOLS', x + 12, y + 400, 2, COLORS.textDim, { align: 'left' });
    entries.filter((e) => !e.enh).slice(0, 4).forEach((e, i) => drawEntry(e, x + 26 + (i % 2) * 134, y + 424 + Math.floor(i / 2) * 24));
    const cy0 = y + 424 + Math.ceil(Math.min(4, syms.length) / 2) * 24 + 4;
    drawText(ctx, 'CHARMS', x + 12, cy0, 2, COLORS.textDim, { align: 'left' });
    const charmEntries = entries.filter((e) => e.enh);
    if (!charmEntries.length) drawText(ctx, 'NONE YET', x + 26, cy0 + 24, 1.5, '#4a4058', { align: 'left' });
    charmEntries.slice(0, 4).forEach((e, i) => drawEntry(e, x + 26 + (i % 2) * 134, cy0 + 24 + Math.floor(i / 2) * 24));
    rule(y + 546);
    // Your relics: a fixed grid; past its size the last cell says how many more.
    const relics = p.relics;
    drawText(ctx, relics.length ? `RELICS ${relics.length}` : 'RELICS', x + 12, y + 562, 2, COLORS.textDim, { align: 'left' });
    if (!relics.length) drawText(ctx, 'NONE YET', x + 12, y + 590, 2, '#4a4058', { align: 'left' });
    const cols = 8;
    const slots = cols * 4;
    const shown = relics.length > slots ? relics.slice(0, slots - 1) : relics;
    if (inFight) return;
    shown.forEach((r, i) => {
      const cx = x + 24 + (i % cols) * 34;
      const cy = y + 590 + Math.floor(i / cols) * 30;
      drawSprite(ctx, RELICS[r].sprite as SpriteId, cx, cy, 1.6);
      this.tips.add(r, cx, cy, 15);
      this.relicRects.push({ x: cx, y: cy, w: 30, h: 28 });
    });
    if (relics.length > slots) drawText(ctx, `+${relics.length - shown.length}`, x + 24 + ((slots - 1) % cols) * 34, y + 590 + 3 * 30, 1.5, COLORS.goldLight);
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
    const start = this.draftKind === 'start';
    drawText(ctx, last ? `${last.enemy} DEFEATED!` : start ? (this.run?.daily ? `DAILY ${this.run.daily.slice(5)}${this.run.dailyEdge ? `: ${EDGE_TEXT[this.run.dailyEdge].title}` : ''}` : this.run?.weekly ? `WEEKLY: ${(this.run.mods ?? []).map((e) => EDGE_TEXT[e].title).join(' + ')}` : this.run?.challenge ? `CHALLENGE: ${challengeById(this.run.challenge)?.name ?? ''}` : 'A NEW RUN') : 'CHOOSE A REWARD', CX, 30, 4, COLORS.goldLight, { alpha: Math.max(0, (this.fade - 0.6) / 0.4) });
    if (last) {
      const rocks = last.rocksCrumbled ? `  -  ${last.rocksCrumbled} ROCKS CRUMBLED` : '';
      const chips = last.chips ? `  -  +${last.chips} CHIPS` : '';
      drawText(ctx, `${rounds(last.turns)}${chips}${rocks}`, CX, 60, 2, COLORS.textDim);
      if (last.bet) drawText(ctx, last.bet.won ? `SIDE BET WON: +${betProfit(last.bet)} CHIPS` : last.bet.refunded ? `SIDE BET BUSTED: YOUR MARKER COVERS ${Math.min(last.bet.stake, markerRefund(this.run!))}` : `SIDE BET BUSTED: -${last.bet.stake} CHIPS`, CX, 80, 2, last.bet.won ? COLORS.goldLight : '#ff8a7a');
    }
    this.drawMap(ctx, 158, time);
    const spoils = this.draftKind === 'spoils';
    const legend = this.draftKind === 'legend';
    const relicDraft = !spoils && !legend && isRelicDraft(this.run!);
    const act3Arrival = !legend && !spoils && this.run!.act >= 3 && this.run!.depth === 0 && this.run!.actIntro;
    const heading = act3Arrival
      ? 'ACT 3: THE HOUSE HAS A PARTNER. FULLY HEALED.'
      : legend
        ? this.run!.endless ? `LOOP ${this.run!.endless.loop}: A LEGENDARY RELIC` : 'ACT 2: FULLY HEALED. A LEGENDARY RELIC.'
        : start
          ? 'PICK A STARTING RELIC'
          : spoils
          ? 'ELITE SPOILS'
          : relicDraft
            ? 'RELIC DRAFT'
            : '';
    if (act3Arrival && hasSprite('actPlaque3')) drawSprite(ctx, artId('actPlaque3'), CX, 208, 3);
    drawText(ctx, heading, CX, legend ? 236 : 244, 3, legend ? COLORS.goldLight : spoils ? '#ff9a3a' : relicDraft ? '#c9a0ff' : COLORS.text);
    this.cards.forEach((c, i) => this.drawCard(ctx, c, this.offers[i], i, time));
  }

  private drawCard(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption, i: number, time: number): void {
    if (c.scale <= 0.01) return;
    const dimmed = this.picked >= 0 && this.picked !== i;
    const { title, text } = describeOption(o, this.run ?? undefined);
    const accent = o.kind === 'gild' ? CHARM_COLOR[o.enh] : o.kind === 'symLevel' || o.kind === 'charmLevel' ? '#5ad8e8' : o.kind === 'relic' ? '#c9a0ff' : o.kind === 'clear' ? '#c9bba8' : o.kind === 'swap' || o.kind === 'add' ? '#7dff7a' : '#ff9ab0';
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
      drawText(ctx, `REEL ${reel + 1}`, -w / 2 + 30, iy + 32, 1.5, COLORS.textDim);
    };
    if (o.kind === 'relic') {
      drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
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
      drawText(ctx, `X${o.n}`, 46, iy + 18, 3, CHARM_COLOR[o.enh]);
      reelMarker(o.reel);
    } else if (o.kind === 'symLevel' || o.kind === 'charmLevel') this.levelIcon(ctx, o, 0, iy, 4);
    else if (o.kind === 'heal') drawSprite(ctx, 'heart', 0, iy, 5);
    else {
      drawSprite(ctx, 'heart', 0, iy, 5);
      drawSprite(ctx, 'plusBadge', 30, iy + 22, 3);
    }
    drawText(ctx, title, 0, 2, title.length > 13 ? 2 : 3, accent);
    const long = wrap(text, 20).length > 4;
    (long ? wrap(text, 27) : wrap(text, 20)).slice(0, 6).forEach((line, k) => drawText(ctx, line, 0, 30 + k * (long ? 15 : 20), long ? 1.5 : 2, COLORS.text));
    if (o.kind === 'relic' && LEGENDARY.has(o.relic)) this.legendTag(ctx, 0, -h / 2 + 14, time);
    if (o.kind === 'relic' && this.run && this.run.stake >= STAKE.mirrorRelic && this.draftKind === 'legend')
      drawText(ctx, mirrorCanUse(o.relic) ? 'THE MIRROR WILL COPY THIS' : 'THE MIRROR CAN\'T USE THIS', 0, h / 2 - 14, 1.5, mirrorCanUse(o.relic) ? '#ff8a7a' : '#7dff7a');

    ctx.restore();
  }

  /** A LEVEL card's icon: the symbol (or the charm on its symbol) with its new level. */
  private levelIcon(ctx: CanvasRenderingContext2D, o: Extract<DraftOption, { kind: 'symLevel' | 'charmLevel' }>, x: number, y: number, scale: number): void {
    const lv = this.run?.player.levels;
    if (o.kind === 'symLevel') drawSprite(ctx, o.symbol as SpriteId, x, y, scale);
    else {
      // The Charm alone on an empty cell, as in the build panel: on a symbol it read as that symbol's upgrade (user
      // playtest), but a Charm level is for every Charm of the type, whatever it sits on.
      const half = 8 * scale;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - half - 2, y - half - 2, half * 2 + 4, half * 2 + 4);
      ctx.fillStyle = '#4a3a66';
      ctx.fillRect(x - half, y - half, half * 2, half * 2);
      drawSprite(ctx, ENH_SPRITE[o.enh], x, y, scale);
    }
    const cap = this.run ? levelCap(this.run) : 3;
    const next = Math.min(cap, (o.kind === 'symLevel' ? symLevel(lv, o.symbol) : charmLevel(lv, o.enh)) + 1);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x + 22, y + 8, 50, 24);
    // The last level a type can take says MAX (no card is offered past it).
    drawText(ctx, next >= cap ? 'MAX' : `LV${next}`, x + 47, y + 20, 2, next >= cap ? '#ff9a3a' : '#5ad8e8');
  }

  /** Violet/gold LEGENDARY ribbon inside the top of a card. */
  private legendTag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 58, y - 9, 116, 18);
    ctx.fillStyle = '#6a2aa0';
    ctx.fillRect(x - 56, y - 7, 112, 14);
    drawText(ctx, 'LEGENDARY', x, y, 1.5, COLORS.goldLight, { alpha: 0.8 + 0.2 * Math.sin(time * 5) });
  }

  /** How many danger skulls (1-3) a fight shows. */
  private dangerOf(e: EnemyDef): number {
    if (e.isBoss) return 3;
    const d = (DANGER[e.archetype] ?? 8) * (e.elite ? 1.25 : 1);
    return d >= 20 ? 3 : d >= 9 ? 2 : 1;
  }

  /**
   * One enemy's scouting report: a casino "headliner card". The front is what you need at a glance (danger, HP,
   * ability + cadence, one rule); its "?" tab turns it to the back (exact text, reels with counts). Only the tab flips
   * it: hover-to-flip fought the tab and flipped cards under a resting mouse (user playtest, 2026-10-09).
   */
  private drawEnemyPanel(ctx: CanvasRenderingContext2D, e: EnemyDef, x: number, y: number, w: number, time: number, other = false): void {
    const h = 260;
    const m = this.mouse;
    // A finger leaves its last spot behind: hover looks are for a mouse only (a tap lit the "?" at random).
    const inside = !this.touch && m.x >= x - 6 && m.x <= x + w + 6 && m.y >= y - 6 && m.y <= y + h + 6;
    const onTab = inside && m.x >= x + w - FLIP_TAB.w - 16 && m.y >= y + h - FLIP_TAB.h - 16;
    const want = this.pinned === x ? 1 : 0;
    let f = this.flips.get(x) ?? 0;
    f += (want - f) * Math.min(1, this.frameDt * 12);
    this.flips.set(x, f);
    const fork = w < 600;
    const tier = e.isBoss ? 2 : e.elite ? 1 : 0;
    const bossFrame = `rgb(255,${Math.round(106 + 48 * (0.5 + 0.5 * Math.sin(time * 3)))},${Math.round(90 + 48 * (0.5 + 0.5 * Math.sin(time * 3)))})`;
    const frame = inside ? COLORS.goldLight : tier === 2 ? bossFrame : tier === 1 ? '#ff9a3a' : COLORS.gold;
    const back = f > 0.5;
    ctx.save();
    ctx.globalAlpha *= this.panelIn;
    ctx.translate(x + w / 2, y + h / 2 + (1 - this.panelIn) * 24 - (inside ? 4 : 0));
    const grow = fork && inside ? 1.02 : 1;
    ctx.scale(Math.max(0.03, Math.abs(1 - 2 * f)) * grow, grow);
    ctx.translate(-w / 2, -h / 2);
    this.panel(ctx, 0, 0, w, h, frame);
    // Header band: a marquee of bulbs with the name, and 3 skulls (the unearned ones dim).
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(0, 0, w, 40);
    const phase = tier === 2 ? Math.floor(time * 8) : tier === 1 ? Math.floor(time * 4) : 0;
    for (let i = 0; 10 + i * 20 < w; i++)
      for (const by of [3, 33]) {
        ctx.fillStyle = (i + phase + (by > 20 ? 1 : 0)) % 2 ? '#3a2e52' : frame;
        ctx.fillRect(8 + i * 20, by, 4, 4);
      }
    const name = e.name ?? 'ENEMY';
    const tx = fork ? 124 : 148;
    drawText(ctx, name, tx, 20, fork ? (name.length > 12 ? 2 : 2.5) : name.length > 16 ? 2.5 : 3, tier === 2 ? '#ff6a5a' : tier === 1 ? '#ff9a3a' : COLORS.slime, { align: 'left' });
    const pips = this.dangerOf(e);
    for (let k = 0; k < 3; k++) {
      const lit = 2 - k < pips;
      const pop = this.skullPop[2 - k] ?? 1;
      drawSprite(ctx, 'dangerPip', w - 24 - k * 30, 20, (fork ? 2.5 : 3) * (lit ? pop : 1), { alpha: lit ? 1 : 0.25 });
    }
    if (back) this.drawPanelBack(ctx, e, w, pips);
    else this.drawPanelFront(ctx, e, w, h, time, inside, fork);
    // The "?" tab (both sides): tap or click it to turn the card over.
    {
      const tx0 = w - FLIP_TAB.w - 8;
      const ty0 = h - FLIP_TAB.h - 8;
      const lit = onTab;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(tx0 - 2, ty0 - 2, FLIP_TAB.w + 4, FLIP_TAB.h + 4);
      // Lit: a gold rim and white glyph (dark text on gold blurred into a blob).
      if (lit) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(tx0 - 2, ty0 - 2, FLIP_TAB.w + 4, FLIP_TAB.h + 4);
      }
      ctx.fillStyle = lit ? '#4a3a66' : COLORS.panelLight;
      ctx.fillRect(tx0, ty0, FLIP_TAB.w, FLIP_TAB.h);
      drawText(ctx, back ? 'X' : '?', tx0 + FLIP_TAB.w / 2, ty0 + FLIP_TAB.h / 2 + 1, back ? 2 : 2.5, lit ? '#ffffff' : COLORS.goldLight);
    }
    // At a fork, the card you're not looking at sinks back under a shade (alpha turned it muddy).
    if (other) {
      ctx.fillStyle = 'rgba(7,4,14,0.35)';
      ctx.fillRect(-6, -6, w + 12, h + 12);
    }
    ctx.restore();
    // The relic tip for the Mirror's copy uses screen coordinates (front only).
    const copy = e.boss === 'mirror' && this.run ? mirrorCopy(this.run) : null;
    if (copy && f < 0.1) this.tips.add(copy, x + w - 86, y + 228);
  }

  private drawPanelFront(ctx: CanvasRenderingContext2D, e: EnemyDef, w: number, _h: number, time: number, hover: boolean, fork: boolean): void {
    const run = this.run!;
    // The stage: a spotlit box with the portrait standing on it.
    const st = fork ? 92 : 116;
    const sx = 16;
    const sy = 52;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(sx - 3, sy - 3, st + 6, st + 6);
    const g = ctx.createRadialGradient(sx + st / 2, sy + st / 2, 4, sx + st / 2, sy + st / 2, st * 0.7);
    const tint = STAGE_TINT[e.boss ?? e.archetype] ?? COLORS.gold;
    g.addColorStop(0, tint);
    g.addColorStop(1, COLORS.panel);
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, st, st);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + st / 2 - st * 0.3, sy + st - 18, st * 0.6, 8);
    const bob = hover ? Math.sin(time * 5) * 4 : Math.sin(time * 2) * 2;
    drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, sx + st / 2, sy + st / 2 + bob, (fork ? 3 : 4) * this.portraitPop);
    const badge = BADGE[e.archetype];
    if (badge) drawSprite(ctx, badge, sx + st - 8, sy + st - 8, fork ? 2.5 : 3);
    if (e.elite) {
      // The ribbon sits along the stage floor (on top it covered the portrait's head); the relic reward sits in the
      // stage's top corner (in the header it ran into long names: ELITE RAT THIEF).
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(sx, sy + st - 18, st, 18);
      ctx.fillStyle = '#8a3a10';
      ctx.fillRect(sx + 2, sy + st - 16, st - 4, 14);
      drawText(ctx, 'ELITE', sx + st / 2, sy + st - 9, 1.5, COLORS.goldLight);
      drawSprite(ctx, artId('voucherRelic'), sx + st - 16, sy + 12, 1.5);
    }
    // Right column: one-line blurb, the HP bar, then the ability with its cadence.
    const tx = fork ? 124 : 148;
    const room = w - tx - 16;
    const blurb = FRONT_BLURB[e.boss ?? ''] ?? e.blurb;
    const blurbScale = blurb.length * 12 <= room ? 2 : blurb.length * 9 <= room ? 1.5 : 0;
    if (blurbScale) drawText(ctx, blurb, tx, 62, blurbScale, COLORS.textDim, { align: 'left' });
    const hp = enemyHp(run, e);
    const bw = fork ? Math.min(200, room - 24) : 280;
    drawSprite(ctx, 'heart', tx + 8, 96, 2);
    const bx = tx + 24;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 2, 84, bw + 4, 24);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(bx, 86, bw, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(bx, 86, bw, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx, 103, bw, 3);
    drawText(ctx, fmtNum(hp), bx + bw / 2, 96, 2, COLORS.text);
    if (e.ability) {
      const every = effectiveAbility(e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
      const ui = ABILITY_UI[e.ability.kind];
      drawSprite(ctx, ui.icon, tx + 12, 138, fork ? 2.5 : 3);
      drawText(ctx, ui.label, tx + 34, 138, fork ? 2 : 2.5, '#ff9a3a', { align: 'left' });
      let px = tx + 34 + ui.label.length * (fork ? 12 : 15) + 16;
      const shownPips = Math.min(every, 8);
      for (let i = 0; i < shownPips; i++) {
        const last = i === shownPips - 1;
        const on = this.pipFill > i;
        const s = last && on ? this.lastPip : 1;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(px - 6 * s, 138 - 6 * s, 12 * s, 12 * s);
        ctx.fillStyle = last && on ? '#ff5a4a' : '#2a2038';
        ctx.fillRect(px - 4 * s, 138 - 4 * s, 8 * s, 8 * s);
        px += 14;
      }
      drawText(ctx, fork ? `EVERY ${every}` : `EVERY ${every} TURNS`, px + 4, 138, fork ? 1.25 : 1.5, COLORS.textDim, { align: 'left' });
      const what = abilityWhat(e, run);
      drawText(ctx, what, tx, 166, what.length * 12 <= room ? 2 : 1.5, COLORS.text, { align: 'left' });
    } else if (e.boss === 'mirror') {
      // The Mirror has no timed ability: its shards are the threat, so they take the ability slot.
      drawSprite(ctx, artId('icoReflect'), tx + 12, 138, 3);
      drawText(ctx, 'REFLECTION', tx + 34, 138, 2.5, '#ff9a3a', { align: 'left' });
      drawText(ctx, 'A THIRD OF YOUR LAST HIT, PER SHARD', tx, 166, 2, COLORS.text, { align: 'left' });
    }
    // Footer: which symbols it runs (icons only), or a boss's one rule.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(8, 197, w - 16, 2);
    if (e.isBoss) {
      drawText(ctx, BOSS_HEADLINE[e.boss ?? ''] ?? '', 16, 228, 2, e.boss === 'mirror' ? '#c8f0ff' : COLORS.goldLight, { align: 'left' });
      const copy = e.boss === 'mirror' ? mirrorCopy(run) : null;
      if (copy) {
        drawText(ctx, 'COPIES', w - 110, 228, 1.5, '#c8f0ff', { align: 'right' });
        drawSprite(ctx, RELICS[copy].sprite as SpriteId, w - 86, 228, 2);
      }
    } else {
      let cx = 36;
      for (const [sym, n] of Object.entries(e.strips[0]) as [SymbolId, number][]) {
        if (n <= 0) continue;
        drawSprite(ctx, sym as SpriteId, cx, 228, 2);
        cx += 40;
      }
    }
  }

  private drawPanelBack(ctx: CanvasRenderingContext2D, e: EnemyDef, w: number, danger: number): void {
    const run = this.run!;
    const sc = w < 600 ? 1.5 : 2;
    const big = w < 600 ? 1.5 : 2.5;
    const cols = Math.floor((w - 32) / (6 * sc));
    let y = 60;
    const line = (text: string, color: string) => {
      wrap(text, cols).forEach((l) => {
        drawText(ctx, l, 16, y, sc, color, { align: 'left' });
        y += 10 * sc;
      });
      y += 4;
    };
    const blurbFits = !FRONT_BLURB[e.boss ?? ''] && e.blurb.length * 9 <= w - (w < 600 ? 140 : 164);
    if (!blurbFits) line(e.blurb, COLORS.textDim);
    if (e.ability && !e.isBoss) {
      // The ability sentence leads, big (a boss's rules paragraph below already says it): it's what the back is for.
      const every = effectiveAbility(e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
      wrap(abilityText(e, every, run), Math.floor((w - 32) / (6 * big))).forEach((l) => {
        drawText(ctx, l, 16, y + 2, big, '#ff9a3a', { align: 'left' });
        y += 10 * big + 2;
      });
      y += 4;
    }
    if (e.elite)
      line(
        (e.act ?? 1) > 1
          ? `ELITE: +${Math.round((ELITE_HP_MUL_2 - 1) * 100)}% HP. PAYS ${CHIPS.act2EliteChips + CHIPS.eliteBonus} CHIPS`
          : `ELITE: +${e.archetype === 'thief' ? 15 : Math.round((ELITE_HP_MUL - 1) * 100)}% HP, RELIC PICK, +${CHIPS.eliteBonus} CHIPS`,
        '#ff9a3a',
      );
    const dirty = e.boss === 'house' && run.stake >= STAKE.houseDirty;
    if (e.isBoss) {
      y += 2;
      line(
        e.boss === 'dealer'
          ? 'DEALS: A CARD ON YOUR PAYLINE (ACE X2, JOKER WILD, DEUCE 0), ALL IN (ITS WHOLE HAND), RAISE (BOTH X2). NO KILL BEFORE ITS FIRST DEAL.'
          : e.boss === 'mirror'
          ? `EACH SHARD ON ITS PAYLINE THROWS A THIRD OF YOUR LAST HIT BACK. CRACKED AT HALF HP, A HALF. A TURN NEVER DEALS MORE THAN ${Math.round(REFLECT_CAP * 100)}% OF YOUR MAX HP.`
          : `COINS FILL THE POT. EVERY ${this.houseEvery()} TURNS IT SKIMS HALF AT YOU. ANY JACKPOT YOU HIT STEALS THE POT! AT HALF HP IT GOES ALL IN.${dirty ? ' BLACK: IT BOMBS YOUR PAYLINE.' : ''}`,
        e.boss === 'mirror' ? '#c8f0ff' : COLORS.goldLight,
      );
      const copy = e.boss === 'mirror' ? mirrorCopy(run) : null;
      if (copy) line(`COPIES YOUR ${RELICS[copy].name}`, '#c8f0ff');
    }
    // THEIR REELS with counts, along the bottom.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(8, 197, w - 16, 2);
    drawText(ctx, 'THEIR REELS', 16, 214, 1.5, COLORS.textDim, { align: 'left' });
    const shown = dirty ? { ...e.strips[0], bomb: STAKE.houseBombsPerReel } : e.strips[0];
    let cx = 30;
    for (const [sym, n] of Object.entries(shown) as [SymbolId, number][]) {
      if (n <= 0) continue;
      drawSprite(ctx, sym as SpriteId, cx, 240, 2);
      drawText(ctx, `${n}`, cx + 20, 240, 2, COLORS.text, { align: 'left' });
      cx += 56;
    }
    drawText(ctx, `DANGER ${danger} OF 3`, w - FLIP_TAB.w - 20, 240, 1.5, COLORS.textDim, { align: 'right' });
  }

  private drawNext(ctx: CanvasRenderingContext2D, time: number): void {
    this.frameDt = this.lastDraw ? Math.min(0.1, Math.max(0, time - this.lastDraw)) : 0;
    this.lastDraw = time;
    const run = this.run!;
    const opts = run.paths[run.depth];
    const fork = needsChoice(run);
    const e = run.enemies[run.depth];
    const act = run.endless ? `LOOP ${run.endless.loop} - ` : `ACT ${run.act} - `;
    const len = actLength(run.act);
    const title = e.isBoss ? (run.act >= runActs(run) && !run.endless ? 'FINAL FIGHT' : `${act}BOSS FIGHT`) : fork ? `${act}FIGHT ${run.depth + 1} OF ${len} - CHOOSE YOUR PATH` : `${act}FIGHT ${run.depth + 1} OF ${len}`;
    drawText(ctx, title, CX, 26, 3, e.isBoss && !fork ? '#ff6a5a' : fork ? COLORS.goldLight : run.act > 1 ? '#c8f0ff' : COLORS.textDim);
    this.drawMap(ctx, 128, time);
    if (fork) {
      const xs = [CX - 464, CX + 12];
      const over = xs.map((px) => !this.touch && this.mouse.x >= px && this.mouse.x <= px + 452 && this.mouse.y >= 222 && this.mouse.y <= 482);
      opts.forEach((o, i) => this.drawEnemyPanel(ctx, o, xs[i], 222, 452, time, over[1 - i]));
      this.buttons.forEach((b, i) => (b.quiet = !over[i] && !b.hover));
      // "OR": a gold coin in the gap between the two cards.
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(CX, 352, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(CX, 352, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(CX, 352, 19, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, 'OR', CX, 353, 2.5, COLORS.goldLight);
    } else {
      this.drawEnemyPanel(ctx, e, CX - 330, 214, 660, time);
      if (this.betOffer.length) this.drawBets(ctx, time);
    }
    for (const b of this.buttons) if (!b.bet) this.drawButton(ctx, b, time);
    if (this.mapTip) this.drawNodeTip(ctx, this.mapTip);
  }

  private drawCabinets(ctx: CanvasRenderingContext2D, time: number): void {
    drawText(ctx, 'CHOOSE YOUR MACHINE', W / 2, 60, 5, COLORS.goldLight);
    drawText(ctx, 'WIN RUNS TO UNLOCK MORE.', W / 2, 104, 2, COLORS.textDim);
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
      }
      if (open) {
        // The hero you play as on this machine.
        drawSprite(ctx, heroSprite(id), -h.w / 2 + 30, -h.h / 2 + 30, 1.5);
        drawText(ctx, `PLAY AS ${cab.hero}`, 0, 28, 1.25, '#c9a0ff');
        drawText(ctx, cab.blurb, 0, 42, 1, COLORS.textDim);
        // The rule at the big size if it fits 5 lines, else smaller (MIDAS's was cut off: EXPERT_PLAYTEST_10 D2).
        const big = wrap(cab.rule, 17);
        const fits = big.length <= 5;
        const lines = fits ? big : wrap(cab.rule, 23).slice(0, 8);
        const lh = fits ? 18 : 14;
        lines.forEach((l, k) => drawText(ctx, l, 0, 64 + k * lh, fits ? 2 : 1.5, COLORS.text));
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

  private drawShop(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(CX - 450, 20, 96, 96);
    drawSprite(ctx, 'cashierPortrait', CX - 402, 68 + Math.sin(time * 2) * 2, 3.5);
    drawText(ctx, 'THE CASHIER', CX - 330, 44, 4, COLORS.goldLight, { align: 'left' });
    const quips = ['PLACE YOUR BETS.', 'EVERYTHING HAS A PRICE, FRIEND.', 'THE HOUSE WILL HEAR ABOUT THIS.', 'CHIPS ARE FOR SPENDING... OR ARE THEY?'];
    drawText(ctx, quips[(run.depth + run.shopRerolls) % quips.length], CX - 330, 80, 2, COLORS.textDim, { align: 'left' });
    if (run.act === 2) drawText(ctx, 'ACT 2: A LEGENDARY ON THE SHELF.', CX, 140, 2, COLORS.goldLight);
    else if (run.act >= 3) drawText(ctx, 'ACT 3: NO HEALING AFTER FIGHTS.', CX, 140, 2, '#ff8a7a');
    this.drawShelves(ctx, time);
    this.shopItems.forEach((item, i) => this.drawShopItem(ctx, this.shopHits[i], item, time));
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    // What the item under the pointer is: name, rule and price, beside it.
    const live = (k: number) => this.shopHits[k]?.scale > 0.9 && !this.shopItems[k]?.sold;
    const hov = this.shopHits.findIndex((h, k) => (h.hover || this.shopTags[k]?.hover) && live(k));
    const i = hov >= 0 ? hov : live(this.shopSel) ? this.shopSel : -1;
    if (i >= 0) this.drawShopTip(ctx, this.shopHits[i], this.shopItems[i]);
  }

  /** Two wooden shelves; the lower one sits behind glass under a spotlight (the premium shelf). */
  private drawShelves(ctx: CanvasRenderingContext2D, time: number): void {
    const x0 = CX - 440;
    const w = 880;
    // The shop's back wall: light wood boards behind both shelves.
    const wy = SHELF.y[0] - 84;
    const wh = SHELF.y[1] + 88 - wy;
    ctx.fillStyle = '#2a170c';
    ctx.fillRect(x0 - 16, wy - 4, w + 32, wh + 8);
    for (let k = 0, by = wy; by < wy + wh; k++, by += 28) {
      ctx.fillStyle = k % 2 ? '#b98a5a' : '#c49464';
      ctx.fillRect(x0 - 12, by, w + 24, Math.min(28, wy + wh - by));
      ctx.fillStyle = 'rgba(90,50,20,0.25)';
      ctx.fillRect(x0 - 12, by + 26, w + 24, 2);
      ctx.fillStyle = 'rgba(90,50,20,0.12)';
      for (let g = 0; g < 5; g++) ctx.fillRect(x0 + ((k * 131 + g * 197) % (w - 60)), by + 8 + (g % 3) * 6, 40 + (g * 23) % 50, 1);
    }
    // The glass case behind the relic shelf.
    const gy = SHELF.y[1] - 76;
    const g = ctx.createLinearGradient(0, gy, 0, gy + 150);
    g.addColorStop(0, 'rgba(255,224,138,0.10)');
    g.addColorStop(1, 'rgba(120,70,200,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, gy, w, 150);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let k = 0; k < 6; k++) {
      const sx = x0 + 40 + k * 160 + ((time * 30) % 160);
      ctx.beginPath();
      ctx.moveTo(sx, gy);
      ctx.lineTo(sx + 24, gy);
      ctx.lineTo(sx - 36, gy + 150);
      ctx.lineTo(sx - 60, gy + 150);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,224,138,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 1, gy + 1, w - 2, 148);

    // The planks.
    for (const y of SHELF.y) {
      const py = y + 58;
      ctx.fillStyle = '#2a170c';
      ctx.fillRect(x0 - 4, py - 2, w + 8, 18);
      ctx.fillStyle = '#7a4a26';
      ctx.fillRect(x0, py, w, 12);
      ctx.fillStyle = '#a06636';
      ctx.fillRect(x0, py, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x0, py + 14, w, 6);
    }
  }

  /** The hovered item's card: its name, what it does, and the price. */
  private drawShopTip(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem): void {
    const o = item.option;
    const { title, text } = describeOption(o, this.run ?? undefined);
    const lines = wrap(text, 26);
    const legend = o.kind === 'relic' && LEGENDARY.has(o.relic);
    const relicId = o.kind === 'relic' ? o.relic : null;
    const mirrorNote = legend && relicId && this.run && this.run.stake >= STAKE.mirrorRelic && this.run.act === 2 ? (mirrorCanUse(relicId) ? 'THE MIRROR WILL COPY IT' : "THE MIRROR CAN'T USE IT") : '';
    const w = 340;
    const tall = 46 + lines.length * 20 + (mirrorNote ? 18 : 0);
    // The top shelf opens its card above the item (a side card covered the neighbours' prices); the relic shelf, to the side.
    const top = h.y < (SHELF.y[0] + SHELF.y[1]) / 2;
    const right = h.x + h.w / 2 + 14 + w <= W - 8;
    const x = top ? Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, h.x - w / 2)) : right ? h.x + h.w / 2 + 14 : h.x - h.w / 2 - 14 - w;
    const y = top ? Math.max(8, h.y - h.h / 2 - tall - 14) : Math.max(8, Math.min(H - tall - 8, h.y - tall / 2));
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 4, y - 4, w + 8, tall + 8);
    ctx.fillStyle = legend ? '#ffd23f' : COLORS.gold;
    ctx.fillRect(x - 2, y - 2, w + 4, tall + 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, tall);
    const color = o.kind === 'gild' ? CHARM_COLOR[o.enh] : o.kind === 'relic' ? (legend ? '#ffd23f' : '#c9a0ff') : o.kind === 'symLevel' || o.kind === 'charmLevel' ? '#5ad8e8' : COLORS.goldLight;
    drawText(ctx, title, x + 12, y + 18, 2.5, color, { align: 'left' });
    lines.forEach((l, k) => drawText(ctx, l, x + 12, y + 46 + k * 20, 2, COLORS.text, { align: 'left' }));
    if (mirrorNote && relicId) drawText(ctx, mirrorNote, x + 12, y + 46 + lines.length * 20, 1.5, mirrorCanUse(relicId) ? '#ff8a7a' : '#7dff7a', { align: 'left' });
  }

  /** One item on a shelf: just its picture and its chip price (hover it to read it). Relics sit on velvet. */
  private drawShopItem(ctx: CanvasRenderingContext2D, h: Hit, item: ShopItem, time: number): void {
    if (!h || h.scale <= 0.01) return;
    const o = item.option;
    const afford = (this.run?.player.chips ?? 0) >= item.price;
    const relic = o.kind === 'relic';
    const legend = relic && LEGENDARY.has(o.relic);
    ctx.save();
    ctx.globalAlpha *= item.sold ? 0.3 : 1;
    ctx.translate(h.x, h.y + h.lift - (h.hover && !item.sold ? 6 : 0));
    ctx.scale(h.scale, h.scale);
    if (relic) {
      // Velvet cushion in a gold frame, under a spotlight; a legendary shimmers.
      const glow = ctx.createRadialGradient(0, -20, 4, 0, -20, 90);
      glow.addColorStop(0, legend ? 'rgba(255,210,63,0.45)' : 'rgba(201,160,255,0.30)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-90, -110, 180, 180);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(-52, -50, 104, 96);
      ctx.fillStyle = legend ? '#ffd23f' : COLORS.gold;
      ctx.fillRect(-49, -47, 98, 90);
      ctx.fillStyle = legend ? '#5a1838' : '#3a1530';
      ctx.fillRect(-45, -43, 90, 82);
      if (legend) {
        // One diagonal sheen sweeps the velvet every 2.5s (a pulse read as flicker).
        const k = (time % 2.5) / 0.6;
        if (k < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(-45, -43, 90, 82);
          ctx.clip();
          ctx.translate(-80 + k * 160, 0);
          ctx.rotate(0.5);
          ctx.fillStyle = 'rgba(255,236,150,0.2)';
          ctx.fillRect(-6, -90, 12, 180);
          ctx.restore();
        }
      }
    } else {
      // A soft shadow where it sits on the counter.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-36, 40, 72, 8);
    }
    if (h.hover && !item.sold && afford) {
      ctx.save();
      ctx.shadowColor = COLORS.energy;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = COLORS.energy;
      ctx.lineWidth = 3;
      ctx.strokeRect(-56, -54, 112, 104);
      ctx.restore();
    }
    const iy = -4;
    if (o.kind === 'relic') drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
    else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, ENH_SPRITE[o.enh], 0, iy, 4);
      drawText(ctx, `X${o.n}`, 40, iy + 24, 2.5, CHARM_COLOR[o.enh]);
    } else if (o.kind === 'symLevel' || o.kind === 'charmLevel') this.levelIcon(ctx, o, -10, iy, 3.6);
    else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, -34, iy, 2.6);
      drawSprite(ctx, 'arrowRight', 0, iy, 2.5);
      drawSprite(ctx, o.to as SpriteId, 34, iy, 2.6);
    } else if (o.kind === 'remove') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, 'minusBadge', 30, iy + 22, 3);
    } else drawSprite(ctx, 'heart', 0, iy, 5);
    if (legend) this.legendTag(ctx, 0, -62, time);
    ctx.restore();
    this.drawPriceTag(ctx, h, this.shopTags[this.shopHits.indexOf(h)], item, afford, time);
  }

  /** The price tag hanging off the shelf edge: a real tag (string, hole, notched end). Clicking it buys. */
  private drawPriceTag(ctx: CanvasRenderingContext2D, item: Hit, tag: Hit | undefined, it: ShopItem, afford: boolean, time: number): void {
    if (!tag) return;
    const sold = it.sold;
    const hover = tag.hover && !sold;
    ctx.save();
    ctx.translate(tag.x + tag.lift, tag.y - (hover && afford ? 3 : 0));
    ctx.scale(item.scale * tag.scale, item.scale * tag.scale);
    // A tiny sway on its string.
    ctx.rotate(sold ? 0.12 : Math.sin(time * 1.6 + tag.x * 0.05) * 0.03);
    const w = TAG.w;
    const h = TAG.h;
    // The string up to the shelf.
    ctx.fillStyle = '#c9bba8';
    ctx.fillRect(-1, -h / 2 - 12, 2, 12);
    // Body: a dark rim, gold edge, green felt, with a notched left end.
    const shape = (inset: number) => {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 12 + inset, -h / 2 + inset);
      ctx.lineTo(w / 2 - inset, -h / 2 + inset);
      ctx.lineTo(w / 2 - inset, h / 2 - inset);
      ctx.lineTo(-w / 2 + 12 + inset, h / 2 - inset);
      ctx.lineTo(-w / 2 + inset, 0);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#3a2010';
    shape(-3);
    ctx.fillStyle = sold ? '#8a7e76' : hover ? COLORS.goldLight : COLORS.gold;
    shape(0);
    ctx.fillStyle = sold ? '#554a4c' : hover && afford ? '#2a7a4a' : '#1f5a3a';
    shape(3);
    // The punched hole the string goes through.
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(-w / 2 + 12, -3, 6, 6);
    if (sold) drawText(ctx, 'SOLD', 6, 1, 2.5, COLORS.text);
    else {
      drawSprite(ctx, 'chip', -10, 1, 2);
      drawText(ctx, String(it.price), 24, 1, 3, afford ? COLORS.goldLight : '#ff8a7a');
    }
    ctx.restore();
  }


  private drawButton(ctx: CanvasRenderingContext2D, b: Btn, time: number): void {
    // Only the screen's next step breathes; secondary buttons sit still.
    const pulse = b.minor || b.quiet ? 1 : 1 + 0.02 + 0.02 * Math.sin((time * Math.PI * 2) / 1.6);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.scale * pulse, b.scale * pulse);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-b.w / 2 - 3, -b.h / 2 - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = b.minor ? (b.pressed ? '#1a1428' : b.hover ? '#3a2e52' : COLORS.panelLight) : b.pressed ? '#2a0806' : b.hover ? '#e04a2f' : '#c8321f';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = b.minor ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, (b.h - 8) / 2);
    // The big size whenever the label fits the button (the boss buttons used to drop a size).
    drawText(ctx, b.label, 0, 1, b.label.length <= 11 || b.label.length * 18 <= b.w - 30 ? 3 : 2, b.minor ? COLORS.goldLight : '#fff6c8');
    ctx.restore();
  }

  private actPlaque(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 40, y - 8, 44, 16);
    ctx.fillStyle = '#1a1428';
    ctx.fillRect(x - 38, y - 6, 40, 12);
    drawText(ctx, label, x - 18, y, 1, color);
  }

  /**
   * Rows for the run-over table. A normal run lists every fight. An endless run (dozens of fights) shows one
   * summary row per act, one per loop (its boss), then the last 3 fights in full (EXPERT_PLAYTEST_4 B1).
   */
  private overRows(run: RunState): FightRecord[] {
    if (!run.endless || run.records.length <= 18) return run.records;
    const last = run.records.slice(-3);
    const rest = run.records.slice(0, -3);
    const out: FightRecord[] = [];
    const sum = (list: FightRecord[], label: string, act: number): FightRecord => ({
      ...list[list.length - 1],
      enemy: label,
      act,
      turns: list.reduce((a, r) => a + r.turns, 0),
      hpBefore: list[0].hpBefore,
      won: list.every((r) => r.won),
      pick: undefined,
      bought: undefined,
      bonuses: undefined,
      eliteRelic: undefined,
      chips: undefined,
      rocksAdded: 0,
    });
    for (const act of [1, 2, 3]) {
      const list = rest.filter((r) => (r.act ?? 1) === act);
      if (list.length) out.push(sum(list, `ACT ${act}: ${list.length} FIGHT${list.length > 1 ? 'S' : ''}`, act));
    }
    // Loops: group act 4 fights into loops of 4 (3 regulars + the boss).
    const loops = rest.filter((r) => (r.act ?? 1) >= 4);
    for (let i = 0; i < loops.length; i += 4) {
      const chunk = loops.slice(i, i + 4);
      const boss = chunk[chunk.length - 1];
      out.push(sum(chunk, `LOOP ${i / 4 + 1}: ${chunk.length === 4 ? boss.enemy : `${chunk.length} FIGHTS`}`, 4));
    }
    return [...out, ...last];
  }

  private drawOver(ctx: CanvasRenderingContext2D): void {
    const run = this.run!;
    // The leaderboard post's result (the rest of the meta is on the RESULTS card).
    if (this.onlineLine) drawText(ctx, this.onlineLine, CX, 563, 1.5, COLORS.goldLight);
    const trueEnding = run.won && run.act >= 3;
    const busted = !!run.endless;
    drawText(ctx, busted ? (run.endless!.cashed ? `CASHED OUT: ${run.endless!.pot} POINTS` : `BUSTED ON LOOP ${run.endless!.loop}`) : trueEnding ? 'THE DEALER FOLDS!' : run.won ? 'THE MIRROR SHATTERS!' : 'RUN OVER', CX, 44, busted ? 5 : 6, run.won && !busted ? COLORS.goldLight : busted ? '#ffd23f' : COLORS.danger);
    const reached = `${CABINETS[run.cabinet].name}  -  ${run.won ? `BEAT ALL ${totalFights(run)} FIGHTS${trueEnding ? ' - TRUE ENDING' : ''}` : `FELL AT FIGHT ${run.records.length} OF ${totalFights(run)} (ACT ${run.act})`}`;
    // DEATH RECAP: its own full-width line under the table (the most important line on a loss).
    const lastRec = run.records[run.records.length - 1];
    const loss = lastRec && !lastRec.won ? lastRec : undefined;
    const recap = loss?.hurt?.length ? `KILLED BY ${loss.enemy}: ${loss.hurt.map(([k, n]) => `${k} ${n}`).join(' - ')}${loss.stuck ? `  (FROZEN ${loss.stuck[0]} OF ${loss.stuck[1]} SPINS)` : ''}` : '';
    // The lines between the table and the reels panel: stacked so they never overlap it or each other.
    const lines: [string, string][] = [];
    if (recap) lines.push([recap, COLORS.danger]);
    if (this.unlockedNow.length) lines.push([`NEW SLOT MACHINE UNLOCKED: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}!`, COLORS.goldLight]);
    if (this.rideOffer) lines.push(['YOUR WIN IS BANKED. LET IT RIDE FOR ENDLESS LOOPS, OR CASH OUT.', COLORS.goldLight]);
    const shown = lines.slice(0, 2);
    shown.forEach(([text, color], k) => {
      const ly = shown.length > 1 ? 462 + k * 18 : 472;
      if (text === recap) {
        // The death recap is the lesson on a loss: it gets a red-framed strip.
        const sh = shown.length > 1 ? 16 : 30;
        ctx.fillStyle = COLORS.danger;
        ctx.fillRect(316, ly - sh / 2 - 3, 940, sh + 6);
        ctx.fillStyle = '#1a0a10';
        ctx.fillRect(319, ly - sh / 2, 934, sh);
      }
      drawText(ctx, text, CX, ly, shown.length > 1 || text.length > 90 ? 1.5 : 2, color);
    });
    // Chips left (a won run scores them) and the side bets' record.
    const bets = run.records.filter((r) => r.bet);
    const betLine = bets.length ? `  -  SIDE BETS ${bets.filter((r) => r.bet!.won).length} OF ${bets.length}` : '';
    const chipLine = `  -  ${run.player.chips} CHIPS${run.won && !run.endless ? ` (+${run.player.chips * CHIP_SCORE * (1 + 0.5 * run.stake)} SCORE)` : ''}`;
    drawText(ctx, (run.stake > 0 ? `${reached}  -  STAKE ${run.stake} ${stakeOf(run.stake).name}` : reached) + chipLine + betLine, CX, 88, run.stake > 0 ? 1.5 : 2, COLORS.textDim);
    const unlockRow = !!this.stakeUnlockedNow;
    if (unlockRow) {
      this.stakeChip(ctx, 340, 116, run.stake + 1, performance.now() / 1000, 14);
      wrap(this.stakeUnlockedNow, 96).slice(0, 3).forEach((l, k) => drawText(ctx, l, 364, 104 + k * 13, 1.25, stakeOf(run.stake + 1).color, { align: 'left' }));
    }
    // The table moves down under an unlock message (QA_1 B5), and ends higher when two lines sit under it.
    const top = unlockRow ? 22 : 0;
    const twoLines = [recap, this.unlockedNow.length, this.rideOffer].filter(Boolean).length > 1;
    const cut = twoLines ? 18 : 0;
    this.panel(ctx, 316, 120 + top, 940, 320 - top - cut);
    drawText(ctx, 'FIGHT', 350, 142 + top, 2, COLORS.textDim, { align: 'left' });
    drawText(ctx, 'ROUNDS', 715, 142 + top, 2, COLORS.textDim);
    drawText(ctx, 'HP', 821, 142 + top, 2, COLORS.textDim);
    drawText(ctx, 'THEN PICKED', 919, 142 + top, 2, COLORS.textDim, { align: 'left' });
    // Up to 16 fights: rows shrink (and drop the detail line) once they stop fitting.
    const rows = this.overRows(run);
    const rowH = Math.min(42, Math.floor((280 - top - cut) / Math.max(1, rows.length)));
    const compact = rowH < 40;
    rows.forEach((r, i) => {
      const y = 170 + top + i * rowH + (compact ? 0 : 6);
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(328, y - rowH / 2, 916, rowH - 2);
      }
      if (compact && r.act && r.act > 1 && rows[i - 1]?.act === 1) {
        ctx.fillStyle = '#c8f0ff';
        ctx.fillRect(328, y - rowH / 2 - 1, 916, 2);
        this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 2', '#c8f0ff');
      }
      if (compact && r.act && r.act > 2 && run.records[i - 1]?.act === 2) {
        ctx.fillStyle = '#7dff7a';
        ctx.fillRect(328, y - rowH / 2 - 1, 916, 2);
        this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 3', '#7dff7a');
      }
      if (compact && i === 0) this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 1', COLORS.goldLight);
      // Tight rows (a GREEN run has 18) get smaller text, so the act dividers run between rows, not through them.
      const ts = rowH < 18 ? 1.25 : rowH < 22 ? 1.5 : 2;
      drawSprite(ctx, (r.portrait ?? 'enemyPortrait') as SpriteId, 350, y, compact ? (rowH < 22 ? 0.65 : 0.9) : 1.4);
      drawText(ctx, r.enemy, 376, y, ts, r.won ? COLORS.text : COLORS.danger, { align: 'left' });
      drawText(ctx, `${Math.ceil(r.turns / 2)}`, 715, y, ts, COLORS.text);
      drawText(ctx, `${r.hpBefore}-${r.hpAfter}`, 821, y, ts, r.hpAfter > 0 ? COLORS.text : COLORS.danger);
      if (compact) {
        const parts = [...(r.bonuses ?? []), r.eliteRelic ? RELICS[r.eliteRelic].name : '', r.eliteChips ? `ELITE +${r.eliteChips} CHIPS` : '', r.pick ? describeOption(r.pick).title : '', ...(r.bought ?? []).map((b) => describeOption(b).title)].filter(Boolean);
        const what = parts.length ? parts.join(', ') : r.won ? '' : 'DEFEATED';
        drawText(ctx, what.length > 30 ? `${what.slice(0, 29)}...` : what, 919, y, rowH < 22 ? 1.25 : 1.5, r.won ? '#c9a0ff' : COLORS.danger, { align: 'left' });
        return;
      }
      if (r.pick) drawText(ctx, describeOption(r.pick).title, 919, y - 6, 2, '#c9a0ff', { align: 'left' });
      const extra = [
        ...(r.bonuses ?? []),
        r.eliteRelic ? `SPOILS: ${RELICS[r.eliteRelic].name}` : '',
        ...(r.bought ?? []).map((b) => `BUY: ${describeOption(b).title}`),
        r.chips ? `+${r.chips} CHIPS` : '',
      ].filter(Boolean).join('  ');
      if (extra) drawText(ctx, extra, 919, y + 13, 1.25, COLORS.textDim, { align: 'left' });
      else if (!r.won) drawText(ctx, 'DEFEATED', 919, y, 2, COLORS.danger, { align: 'left' });
      if (r.rocksAdded) drawText(ctx, `+${r.rocksAdded} ROCK${r.rocksAdded > 1 ? 'S' : ''}`, 786, y + 13, 1.25, '#c9bba8');
    });
    for (const b of this.buttons) this.drawButton(ctx, b, 0);
    if (this.results) this.drawResults(ctx, run);
  }

  /** THE RESULTS card: what the run earned outside the run. */
  private drawResults(ctx: CanvasRenderingContext2D, run: RunState): void {
    const g = this.meta!;
    const r = this.results!;
    ctx.fillStyle = 'rgba(6,2,12,0.75)';
    ctx.fillRect(0, 0, W, H);
    const x0 = 200;
    const w = W - 400;
    this.panel(ctx, x0, 96, w, 540, COLORS.gold);
    drawText(ctx, 'RESULTS', W / 2, 132, 4, COLORS.goldLight);
    // XP bar.
    const lv = levelOf(r.xp);
    drawText(ctx, `+${Math.round(r.xp - g.xpBefore)} XP`, x0 + 40, 190, 2.5, COLORS.text, { align: 'left' });
    drawText(ctx, `LEVEL ${lv.level}`, x0 + w - 40, 190, 2.5, COLORS.goldLight, { align: 'right', punch: 1 + 0.5 * r.pop });
    const bx = x0 + 40;
    const bw = w - 80;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 3, 210, bw + 6, 22);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(bx, 213, bw, 16);
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(bx, 213, Math.round((bw * lv.into) / Math.max(1, lv.need)), 16);
    drawText(ctx, `${Math.round(lv.into)}/${lv.need} XP TO LEVEL ${lv.level + 1}`, W / 2, 246, 1.25, COLORS.textDim);
    if (r.pop > 0.01) drawText(ctx, `LEVEL ${r.level}!`, W / 2, 170, 4 + 2 * r.pop, '#ffd23f', { alpha: Math.min(1, r.pop * 2) });
    let y = 280;
    // Unlocks, new titles, a new best.
    const notes: [string, string][] = [];
    if (this.unlockedNow.length) notes.push([`NEW SLOT MACHINE: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}`, '#7dff7a']);
    for (const t of g.titles) notes.push([`NEW TITLE: ${t}`, '#ffd23f']);
    for (const t of g.trims) notes.push([`NEW TRIM: ${t} (WEAR IT FROM TROPHIES)`, '#ff9ec8']);
    if (g.newBest) notes.push([run.weekly ? 'NEW WEEKLY BEST!' : 'NEW CHALLENGE BEST!', COLORS.goldLight]);
    for (const [text, color] of notes.slice(0, 3)) {
      drawText(ctx, text, W / 2, y, 2.5, color);
      y += 34;
    }
    // Achievements: up to 4 cards, then "+N MORE".
    if (g.achievements.length) {
      drawText(ctx, g.achievements.length > 1 ? `${g.achievements.length} ACHIEVEMENTS` : 'ACHIEVEMENT', W / 2, y + 4, 2, COLORS.text);
      const shown = g.achievements.slice(0, 4);
      const cw = 196;
      const gap = 12;
      const left = W / 2 - (shown.length * cw + (shown.length - 1) * gap) / 2;
      shown.forEach((a, i) => {
        const cx = left + i * (cw + gap);
        const cy = y + 24;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(cx, cy, cw, 116);
        ctx.fillStyle = '#8a6a1c';
        ctx.fillRect(cx + 3, cy + 3, cw - 6, 110);
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(cx + 6, cy + 6, cw - 12, 104);
        if (hasSprite('trophySmall')) drawSprite(ctx, artId('trophySmall'), cx + cw / 2, cy + 26, 2);
        wrap(a.name, 18).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 52 + k * 15, 1.5, COLORS.goldLight));
        wrap(a.text, 26).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 86 + k * 11, 1, COLORS.textDim));
      });
      if (g.achievements.length > 4) drawText(ctx, `+${g.achievements.length - 4} MORE ON THE TROPHIES SCREEN`, W / 2, y + 156, 1.5, COLORS.textDim);
      y += 172;
    }
    if (this.shareLine) drawText(ctx, this.shareLine, W / 2, 548, 1.5, '#7dff7a');
    if (this.resultsCopy) this.drawButton(ctx, this.resultsCopy, 0);
    drawText(ctx, r.done ? 'PRESS TO CONTINUE' : 'PRESS TO SKIP', W / 2, 620, 1.5, COLORS.textDim, { alpha: 0.6 + 0.4 * Math.sin(performance.now() / 200) });
  }
}
