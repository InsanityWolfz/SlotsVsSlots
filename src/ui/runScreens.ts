import type { Sounds } from '../audio/sounds';
import type { MetaGain } from '../core/profile';
import { challengeById, levelOf } from '../core/meta';
import { defaultConfig, UNIT, unitsRound, type Enh, type SymbolId } from '../core/config';
/** Base symbol values (a symbol's number in the build panel). */
const CFG_BASE = defaultConfig().base;
import { ELITE_DMG_MUL, ELITE_HP_MUL, ELITE_HP_MUL_2, wheelChipShare, type EnemyDef, type Stop } from '../core/enemies';
import { atStakes, bjMax, bjState, bjTotal, BJ, CLAW, CLAW_PRIZES, clawPrizeName, clawWon, DICE, diceMax, extraPlays, RACE, raceMax, RATS, SCRATCH, scratchState, ROULETTE, encounterOf, HILO, hiloMax, hiloPot, hiloState, pocketColor, rouletteMax, SLOT, SLOT_STRIPS, WHEEL_ORDER, type EncounterChoice, type EncounterResult, type SlotPull, type SlotSym } from '../core/encounters';
import { LEGENDARY, RELICS, POT } from '../core/relics';
import { CHARM_COLOR, CHARM_SYMBOLS, charmLevel, charmTag, playerSymValue, symLevel } from '../core/charms';
import { drawReelTable, runTable } from './reelTable';
import {
  CHIPS,
  describeChoice,
  type BigChoice,
  BIG,
  describeOption,
  takenLabel,
  ACT1_GILDS,
  edgeLevel,
  edgeText,
  endlessScore,
  scaledAbility,
  runScoreOf,
  scoreParts,
  SCORE,
  NIGHTS,
  nightOf,
  fastHands,
  runEdges,
  enemyHp,
  isRelicDraft,
  needsRoute,
  encounterChoices,
  currentEnemy,
  currentStop,
  isBossNext,
  actStops,
  EDGE_TEXT,
  rerollCost,
  runActs,
  totalFights,
  type DraftOption,
  type FightRecord,
  type RunState,
  type ShopItem,
  levelCap,
  dealerEvery,
} from '../core/run';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../core/cabinets';
import { effectiveAbility, STAKE, STAKES, stakeOf } from '../core/stakes';
import type { RelicId } from '../core/config';
import { DANGER, LOOP_GROWTH } from '../core/enemies';
import { VOLUME } from '../core/fight';
import { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { ABILITY_UI } from '../present/hud';
import { ENH_SPRITE, ReelView, SPIN, type CellView } from '../present/reel';
import { COLORS, H, PITCH, W } from '../present/layout';
import { artId, drawSprite, hasSprite, spriteSize, type SpriteId } from '../render/sprites';
import { drawText, fmtNum, textWidth } from '../render/text';
import { bossRules, type BossRuleContext } from './bossRules';
import { runSummary } from '../core/runLog';
import { VERSION } from '../build';
import { drawKeywordBoxes, drawRich, keywordsIn } from './keywords';
import { heroSprite } from './menus';
import { CHIP_SCORE, runEntry, runScore } from '../core/profile';
import { dailyShare } from '../core/daily';
import { RelicTips } from './relicTip';


export type ScreenMode = 'none' | 'draft' | 'next' | 'over' | 'shop' | 'cabinet' | 'choice' | 'encounter';

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
  /** Secondary: a quiet button that never breathes (only the screen's next step does). */
  minor?: boolean;
  /** Primary, but not breathing right now (a fork's other path). */
  quiet?: boolean;
  /** A primary button's face colour (RED OR BLACK's BLACK); the default is red. */
  tint?: string;
  /** Only a hit area (the screen draws what's under it: SCRATCH-OFF's panels). */
  ghost?: boolean;
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
  wheel: artId('mapBadgeWheel'),
  counterfeiter: artId('mapBadgeFake'),
  sharp: artId('mapBadgeCard'),
  pitboss: artId('mapBadgeGavel'),
  croupier: artId('mapBadgeRake'),
  dealer: artId('mapBadgeDealer'),
};

const INPUT_GUARD_MS = 250;
/** CHOOSE YOUR MACHINE: the HIGH STAKES chip track (chip 0's centre, spacing, row). */
const TRACK = { x0: W / 2 - 165, dx: 66, y: 640 };
/** YOUR BUILD: a fixed column on the left of every run screen (screens lay out to its right, around CX). */
export const BUILD = { x: 16, y: 16, w: 284, h: H - 32 };
/** CHOOSE YOUR PATH: the opener, the lanes (their stops' x, each lane's centre y and height), the Cashier, the boss. */
const ROUTES = { opener: 370, x0: 500, gap: 104, y: [170, 320, 470], lane: 120, shop: 1080, boss: 1196 };
const ROUTE_STOPS = 5;
/** A lane's row: three paths fill the rows, two (ENDLESS) take the outer ones. */
const laneY = (i: number, n: number) => (n === 2 ? ROUTES.y[i * 2] : ROUTES.y[i]);
/** ENCOUNTER buy-in cards: their row, size and spacing. */
const ENC = { cardY: 546, cardW: 210, cardH: 108, cardGap: 236 };
/** An offer's choice buttons: their row, width and spacing (three fit beside the build panel). */
const OFFER = { y: 480, w: 270, gap: 296 };
/** LUCKY SEVENS: the reel art per symbol (16px reel symbols, like the fight machines'), and where the machine sits. */
const SLOT_ART: Record<SlotSym, SpriteId> = { chip: 'goldbar', seven: 'seven', heart: 'slotHeart', star: 'slotUp', relic: 'relicSym', wild: 'wild' };
const SLOT_TOP = 132;
const slotCell = (sym: SlotSym): CellView => ({ symbol: SLOT_ART[sym] as SymbolId, slimed: false, goo: 0, flash: 0 });
/** The first two payline cells match (a WILD matches anything): the last reels slow down. */
const isWildOr = (a: SlotSym, b: SlotSym) => a === b || a === 'wild' || b === 'wild';
/** A map node's tip: an enemy's mini card, or a stop's name and line. */
type MapTip = { e?: EnemyDef; title?: string; sub?: string; x: number; y: number };
/** The middle of the space right of YOUR BUILD: run screens center on it. */
const CX = (BUILD.x + BUILD.w + 12 + W) / 2;
/** Pixel suits (5x5): hearts, diamonds, clubs, spades. */
const SUITS = [
  ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
  ['..X..', '.XXX.', 'XX.XX', '..X..', '.XXX.'],
  ['..X..', '.XXX.', 'XXXXX', '..X..', '.XXX.'],
];
const RANK = (n: number) => (n === 14 ? 'A' : n === 13 ? 'K' : n === 12 ? 'Q' : n === 11 ? 'J' : `${n}`);
function drawSuit(ctx: CanvasRenderingContext2D, suit: number, x: number, y: number, px: number): void {
  ctx.fillStyle = suit < 2 ? '#e8374b' : '#1a1426';
  SUITS[suit].forEach((row, r) => [...row].forEach((ch, c) => ch === 'X' && ctx.fillRect(Math.round(x + (c - 2.5) * px), Math.round(y + (r - 2.5) * px), px, px)));
}
/** A playing card (rank 2-14; 0 = its back), `sx` its width scale (for the flip). The suit is cosmetic: `slot` (the card's
 * place on the table) shifts it, so two cards of one rank never look identical (playtest: a tie read as a rigged deck). */
function drawPlayingCard(ctx: CanvasRenderingContext2D, x: number, y: number, rank: number, sx: number, k = 1, slot = 0): void {
  const w = 112 * k * Math.max(0.04, sx);
  const h = 156 * k;
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
  if (!rank) {
    // The back: the house's red with a gold lattice.
    ctx.fillStyle = '#8e1f3a';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x - w / 2 + 6, y - h / 2 + 6, Math.max(0, w - 12), 2);
    ctx.fillRect(x - w / 2 + 6, y + h / 2 - 8, Math.max(0, w - 12), 2);
    for (let j = -3; j <= 3 && sx > 0.3; j++) ctx.fillRect(x + j * 12 * k * sx - 1, y - h / 2 + 12, 2, h - 24);
    return;
  }
  ctx.fillStyle = '#f4eee0';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  if (sx < 0.35) return;
  const suit = (rank * 7 + slot) % 4;
  const col = suit < 2 ? '#e8374b' : '#1a1426';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx * k, k);
  // (Outlined in the card's own colour: the usual dark outline swallowed the black ranks.)
  // (A two-digit 10 at full size ran off the card's edge.)
  const r = RANK(rank);
  drawText(ctx, r, r.length > 1 ? -34 : -38, -56, r.length > 1 ? 2.5 : 3, col, { outline: '#f4eee0' });
  drawSuit(ctx, suit, -38, -30, 3);
  drawSuit(ctx, suit, 10, 16, 8);
  ctx.restore();
}
/** A die (face 1-6) at (x, y), tilted by `rot` radians while it tumbles. */
function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, rot: number): void {
  const s = 96;
  const pips: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-s / 2 + 6, -s / 2 + 8, s, s);
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(-s / 2 - 3, -s / 2 - 3, s + 6, s + 6);
  ctx.fillStyle = '#f4eee0';
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.fillStyle = '#d3c8b0';
  ctx.fillRect(-s / 2, s / 2 - 8, s, 8);
  ctx.fillRect(s / 2 - 8, -s / 2, 8, s);
  ctx.fillStyle = face === 1 ? '#e8374b' : '#1a1426';
  for (const [px, py] of pips[face] ?? []) ctx.fillRect(px * 26 - 8, py * 26 - 8, 16, 16);
  ctx.restore();
}
/** RED OR BLACK: the wheel's centre, its offscreen size (drawn at half size, scaled x2), and the bet column's x. */
const RL = { wheelX: CX - 170, wheelY: 300, px: 112, betX: CX + 220 };
/** SCRATCH-OFF's ticket: the first panel's centre, the panel step and size. */
const SC = { x: CX - 300, y: 250, gap: 104, cell: 92 };
/** CLAW MACHINE: the first prize's x, the step between prizes, the pit's y, the claw's resting x. */
const CW = { x0: CX - 300, gap: 130, pitY: 450, home: CX - 170 };
/** A roulette wheel at `angle` with its ball, drawn into a small canvas (pocket k sits at angle + k * step, 0 = up). */
function drawWheel(g: CanvasRenderingContext2D, angle: number, ball: { a: number; r: number }): void {
  const n = WHEEL_ORDER.length;
  const c = RL.px / 2;
  const step = (Math.PI * 2) / n;
  const disc = (r: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(c, c, r, 0, Math.PI * 2);
    g.fill();
  };
  g.clearRect(0, 0, RL.px, RL.px);
  disc(55, COLORS.outline);
  disc(53, COLORS.gold);
  disc(50, '#5a311c');
  // The pockets: red, black, and the one green zero.
  for (let k = 0; k < n; k++) {
    const a = angle + k * step - Math.PI / 2;
    const col = pocketColor(WHEEL_ORDER[k]);
    g.fillStyle = col === 'red' ? '#e8374b' : col === 'green' ? '#4cc234' : '#1a1426';
    g.beginPath();
    g.arc(c, c, 48, a - step / 2, a + step / 2);
    g.arc(c, c, 36, a + step / 2, a - step / 2, true);
    g.fill();
  }
  disc(36, '#8f5a1f');
  disc(33, '#5a311c');
  // Gold spokes and the hub.
  g.strokeStyle = COLORS.gold;
  g.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    const a = angle + (k * Math.PI) / 2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * 6, c + Math.sin(a) * 6);
    g.lineTo(c + Math.cos(a) * 30, c + Math.sin(a) * 30);
    g.stroke();
  }
  disc(7, COLORS.gold);
  disc(3, '#ffe45c');
  // The ball (its radius: 51 on the track, 42 in a pocket, on this scale).
  const bx = c + Math.cos(ball.a - Math.PI / 2) * (ball.r - 2);
  const by = c + Math.sin(ball.a - Math.PI / 2) * (ball.r - 2);
  g.fillStyle = COLORS.outline;
  g.beginPath();
  g.arc(bx, by, 3.5, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(bx - 0.5, by - 0.5, 2.5, 0, Math.PI * 2);
  g.fill();
}
/** Your chips: the same spot in the fights (game.ts draws them there too). */
export const CHIP_SPOT = { x: 44, y: 46 };
/** The Cashier's shelves: item centers per row (the counter, then the relics behind the glass). */
const SHELF = { y: [262, 440], gap: 164 };
/** The shop's price tags (they buy): size and offset under the item's centre. */
const TAG = { w: 108, h: 40, y: 70 };
/** The enemy card's flip tab (bottom-right): big enough for a thumb. */
const FLIP_TAB = { w: 40, h: 32 };

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

// A fight's length in SPINS, as the fight's own counter shows it (ROUND means a fight on every card: playtest).
const rounds = (turns: number) => `${turns} SPIN${turns === 1 ? '' : 'S'}`;

/** The ability's effect in a few words (the panel's front shows this under the cadence pips). */
function abilityWhat(e: EnemyDef, run?: RunState): string {
  if (!e.ability) return '';
  // (ENDLESS grows the flat numbers with the loop: the card says what the fight will do.)
  const p = (run ? scaledAbility(run, e.ability, true) : e.ability)?.power ?? e.ability.power;
  // THE WHEEL: what one chip left on your reels hits for at NO MORE BETS (as the fight does it).
  const per = run ? Math.max(UNIT, unitsRound(run.player.maxHp * wheelChipShare(run.cabinet))) : 0;
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
    bets: per ? `EACH CHIP LEFT ON YOUR REELS HITS ${per}` : 'EACH CHIP LEFT ON YOUR REELS HITS 5% OF YOUR HP',
    launder: `TAKES ${p} CHIPS, HEALS ${p * 3 * UNIT}`,
    mark: `MARKS ${p} OF YOUR CELLS`,
    penalty: `HITS FOR ${p}`,
    repo: 'TAKES A CHARM FOR THE FIGHT',
    houseTake: `RAKES YOUR GROUPS FOR ${p} TURNS`,
    deal: 'DEALS A BUST',
    owner: 'CHEATS A NEW WAY EACH TIME',
    hammer: 'HITS 40% OF YOUR MAX HP THROUGH SHIELDS',
  };
  return what[e.ability.kind] ?? '';
}

function abilityText(e: EnemyDef, every: number, run?: RunState): string {
  if (!e.ability) return '';
  const ui = ABILITY_UI[e.ability.kind];
  // THE REPO MAN takes on his first turn, then every few.
  if (e.ability.kind === 'repo') return `${ui.label} FROM TURN 1, THEN EVERY ${every}: TAKES ONE OF YOUR CHARMS. YOU GET IT BACK AFTER THE FIGHT`;
  if (e.ability.kind === 'deal') return `EVERY ${every} TURNS: BUST. THREE HANDS, EACH HARDER`;
  return `${ui.label} EVERY ${every} TURNS: ${abilityWhat(e, run)}`;
}

/** The stage light behind each enemy's portrait (the panel's front). */
const STAGE_TINT: Record<string, string> = {
  slime: '#5ed15a', frost: '#5ad8e8', thief: '#c9a0ff', hexer: '#c9a0ff', golem: '#c9bba8',
  brute: '#ff9a3a', gremlin: '#ff9a3a', bomber: '#ff9a3a', vampire: '#ff6a5a', house: '#ff6a5a', pitboss: '#ff6a5a',
  dealer: '#ff6a5a', owner: '#ffd23f', wheel: '#ff3a2e', croupier: '#ffd23f', sharp: '#ffd23f', counterfeiter: '#ffd23f', mimic: '#ffd23f',
};
/** A shorter line for the front when a boss's blurb won't fit on one line (the full blurb is on the back). */
const FRONT_BLURB: Record<string, string> = { dealer: 'THE HOUSE HAS A PARTNER' };

/** Every BIG CHOICE card looks the same: no tier, no hint which pick is strong or safe. The player decides. */

/**
 * The short lines a BIG CHOICE card shows: one effect line and one cost line (empty when it costs nothing). The full
 * rule (describeChoice) is in the hover tip. Display only: what a choice does lives in run.ts.
 */
function choiceShort(run: RunState, c: BigChoice): { effect: string; cost: string } {
  const full = describeChoice(run, c);
  switch (c.id) {
    case 'edge':
      return { effect: full.rule, cost: edgeText(c.edge!, edgeLevel(run, c.edge!) + 1).text };
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
  /** The map node under the pointer (its tip is drawn over everything on the screen). */
  private mapTip: MapTip | null = null;
  /** The route the player has tapped on the path pick (-1: none yet), and the one under the pointer. */
  private routeSel = -1;
  /** ENCOUNTER: how it went (null until a choice is played), and its reveal (0..1: the pull's reels land in turn). */
  private encResult: EncounterResult | null = null;
  private encT = 1;
  /** The encounter on show (the run has moved past its stop once it's played). */
  private encId: string | undefined;
  /** The encounter's choices as dealt (buy-in cards first), SKIP pressed, and the sounds already played this reveal. */
  private encChoices: EncounterChoice[] = [];
  private encSkip = false;
  private encFired = new Set<string>();
  /** LUCKY SEVENS: its five reels (the fight machines' own reel views), the clock they spin on (SKIP fast-forwards
   * only them), how many pulls have landed (the build panel counts their prizes up), the win on show, and done. */
  private slotReels: ReelView[] = [];
  private slotClock = new Clock();
  private encLanded = 0;
  private slotWin: { text: string; count: number; at: number } | null = null;
  private encDone = false;
  /** RED OR BLACK: the bet on the stepper, the wheel's and ball's angles, the ball's radius, which spin this is, and the
   * offscreen canvas the wheel is drawn on (small, then scaled up crisp so it reads as pixel art). */
  private rlBet = 5;
  /** RED OR BLACK / DICE: the bet's win or loss, paid at the call (a quit can't re-roll it) but shown when the ball or
   * dice land (it counted up while the wheel still spun, so the landing looked unpaid: user playtest). */
  private chipsLanding = 0;
  private rlWheel = 0;
  private rlBall = { a: -Math.PI / 2, r: 44 };
  private rlSpinNo = 1;
  private rlCanvas: HTMLCanvasElement | null = null;
  /** HIGHER OR LOWER: the card showing, the card being turned (and its flip 0..1), and the last call's word. */
  private hlCard = 0;
  private hlNext = 0;
  private hlFlip = 0;
  private hlMsg: EncounterResult | null = null;
  /** TWENTY-ONE: a finished hand on show (the dealer's cards turn one by one), how many of them are up, its word. */
  private bjShow: NonNullable<EncounterResult['hand']> | null = null;
  private bjDealerUp = 0;
  private bjMsg: EncounterResult | null = null;
  /** UNDER OR OVER: the dice showing, the roll's progress (0..1; 1 = landed), and the last roll's word. */
  private dcDice: [number, number] = [3, 4];
  private dcT = 1;
  private dcMsg: EncounterResult | null = null;
  /** RAT RACE: each rat's run (0 start .. 1 the line), the rat you backed, the last race. */
  private rrPos: number[] = [0, 0, 0, 0];
  private rrPick = -1;
  private rrMsg: EncounterResult | null = null;
  /** SCRATCH-OFF: panels you've scratched (panel -> prize), the whole printed grid once done, the pop on the last one. */
  private scReveal: Record<number, number> = {};
  private scGrid: number[] | null = null;
  private scMsg: EncounterResult | null = null;
  private scPop = -1;
  private scT = 1;
  /** CLAW MACHINE: where the claw is (x, and 0 up .. 1 down), shut or open, carrying its target, the last go. */
  private cwX = CW.home;
  private cwY = 0;
  private cwShut = false;
  private cwCarry = false;
  private cwTarget = -1;
  private cwMsg: EncounterResult | null = null;
  /** Prizes won at this stop, as the screen shows them (the run's list moves before the claw lands, and clears after the last go). */
  private cwWon: number[] = [];
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
  /** The stake track's chips (focus / click targets), the select pop (0..1) and a refused locked chip (shakes). */
  private stakeHits: Btn[] = [];
  private stakePop = 1;
  private stakeDeny = { level: -1, at: 0 };

  constructor(
    private ui: Clock,
    private sounds: Sounds,
    private cb: {
      onPick: (o: DraftOption) => void;
      onSpoils: (relic: RelicId) => void;
      onLegend: (relic: RelicId) => void;
      /** A BIG CHOICE was taken after a boss. */
      onChoice: (c: BigChoice) => void;
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

  /** Pick your starting machine (pre-run). Locked cabinets show how to unlock them. */
  showCabinets(unlocked: Set<CabinetId>, stakes: Partial<Record<CabinetId, number>> = {}, stakeSel = 0, _act3 = false, _dealerBeaten: CabinetId[] = []): void {
    this.cabinetUnlocked = unlocked;
    this.stakes = stakes;
    this.run = null;
    this.open('cabinet');
    this.stakeSel = Math.min(stakeSel, this.maxStake());
    // HIGH STAKES: one track of 6 chips, always shown (new players see the whole ladder, locked).
    // Every chip is a target: hovering or focusing one previews its rule, clicking an earned one selects it.
    const pick = (level: number) => {
      if (level > this.maxStake()) {
        this.sounds.fizzle();
        this.stakeDeny = { level, at: performance.now() };
        return;
      }
      if (level === this.stakeSel) return;
      this.stakeSel = level;
      CABINET_ORDER.forEach((id, i) => {
        if (this.cards[i]) this.cards[i].enabled = this.cabinetUnlocked.has(id) && this.stakeFor(id) >= this.stakeSel;
      });
      this.stakePop = 0;
      void this.ui.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(3), onUpdate: (v) => (this.stakePop = v) });
      this.cb.onStake(this.stakeSel);
    };
    this.stakeHits = STAKES.map((s) => this.minorBtn('', TRACK.x0 + s.level * TRACK.dx, TRACK.y, 50, 44, () => pick(s.level)));
    this.stakePop = 1;
    this.buttons = [...this.stakeHits, this.minorBtn('MENU', 90, 40, 130, 44, () => this.cb.onMenu())];
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
  /** What a boss's rules depend on (bossRules.ts). */
  private bossCtx(): BossRuleContext {
    const run = this.run;
    return { stake: run?.stake ?? 0, cabinet: run?.cabinet, houseEvery: this.houseEvery(), loop: run?.endless?.loop, dealerEvery: run ? dealerEvery(run) : undefined };
  }

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
    drawText(ctx, edge ? `HOUSE EDGE: LOOP ${this.run?.endless?.loop ?? 1}` : 'BONUS ROUND', CX, 60, edge ? 5 : 6, edge ? '#ff8a7a' : COLORS.goldLight);
    drawText(ctx, edge ? 'PICK A NEW HOUSE RULE. EACH ONE PAYS.' : '', CX, 110, 2, COLORS.textDim);
    // TONIGHT'S RULE: each path has its own; you pick one with your path (the loop's opener plays without one).
    const nights = this.run && edge ? (this.run.endless?.nights ?? []) : [];
    const night = this.run && edge && !nights.length ? nightOf(this.run) : null;
    if (nights.length) {
      drawText(ctx, `TONIGHT: ${nights.map((n) => NIGHTS[n].title).join(' OR ')}`, CX, 150, 2.5, '#ffd23f');
      drawText(ctx, 'EACH PATH HAS ITS OWN RULE FOR BOTH MACHINES: YOU PICK ONE WITH YOUR PATH.', CX, 182, 1.5, '#ffd23f');
    } else if (night) {
      drawText(ctx, `TONIGHT'S RULE: ${night.title}`, CX, 150, 2.5, '#ffd23f');
      drawText(ctx, `${night.text}, FOR BOTH MACHINES.`, CX, 182, 1.5, '#ffd23f');
    }
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
    lines.forEach((l, k) => drawRich(ctx, l, 0, ey + (k - (lines.length - 1) / 2) * (es * 11), es, COLORS.text));
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
      case 'secondLine':
        // Two rows of your symbol: the payline and the one above it.
        [-1, 0, 1].forEach((k) => {
          drawSprite(ctx, atk, x + k * s * 7, y - s * 5, s * 0.55);
          drawSprite(ctx, atk, x + k * s * 7, y + s * 3, s * 0.55);
        });
        tag('X2 LINES', x, y + 34, COLORS.goldLight, 2.5);
        break;
      case 'longGame':
        drawSprite(ctx, atk, x, y - 6, s);
        tag(`+${Math.round(BIG.longStep * 100)}% A WIN`, x, y + 34, COLORS.goldLight, 2.5);
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
        if (ch.id === 'madScience') tag(`+${Math.round((BIG.madMul - 1) * 100)}%`, x + s * 9, y + 30, '#ff6a5a', 2.5);
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
      case 'hypeMan':
      case 'encoreDrop':
      case 'backupDancers':
        drawSprite(ctx, 'note' as SpriteId, x, y - 6, s);
        tag(ch.id === 'headliner' ? 'X2' : ch.id === 'hypeMan' ? '+1' : ch.id === 'encoreDrop' ? 'AGAIN' : `+${BIG.dancers}`, x + s * 8, y + 30, '#5ad8e8', 2.5);
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
    // Four cards use the whole width beside the build panel, a little taller (they were cramped: user).
    const gap = n > 3 ? 238 : 300;
    this.cards = offers.map((o, i) =>
      this.hit(CX + (i - (n - 1) / 2) * gap, n > 3 ? 396 : 384, n > 3 ? gap - 16 : gap - 30, n > 3 ? 246 : 222, () => {
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
    if (needsRoute(run)) return this.showRoutes(run);
    this.enemyEntrance(run);
    const bossId = currentEnemy(run)?.boss;
    const boss = isBossNext(run) ? (bossId === 'dealer' ? 'FACE THE DEALER' : bossId === 'wheel' ? 'FACE THE WHEEL' : bossId === 'owner' ? 'FACE THE OWNER' : 'FACE THE HOUSE') : 'FIGHT!';
    this.buttons = [this.btn(boss, CX, 560, boss === 'FIGHT!' ? 290 : 360, 56, () => this.cb.onFight())];
  }

  /** CHOOSE YOUR PATH: the act's routes as lanes (every stop shown). Tap a lane, then take it. */
  private showRoutes(run: RunState): void {
    this.routeSel = -1;
    this.cards = run.map.routes.map((_, i) => {
      const h = this.hit(ROUTES.x0 + ((ROUTE_STOPS - 1) * ROUTES.gap) / 2, laneY(i, run.map.routes.length), ROUTE_STOPS * ROUTES.gap + 40, ROUTES.lane, () => {
        this.routeSel = i;
        take.enabled = true;
        take.label = `TAKE PATH ${i + 1}`;
      });
      h.scale = 1;
      return h;
    });
    const take = this.btn('PICK A PATH', CX, 588, 360, 52, () => this.routeSel >= 0 && this.cb.onRoute(this.routeSel));
    take.enabled = false;
    this.buttons = [take];
  }

  /** An ENCOUNTER stop: a game's buy-in cards (LOW / MEDIUM / HIGH, each its stake and what it buys) or an offer's
   * choices, then the plays, then how it went. */
  showEncounter(run: RunState): void {
    this.run = run;
    this.open('encounter');
    this.encResult = null;
    this.encT = 1;
    this.encSkip = false;
    this.encFired.clear();
    this.encId = currentStop(run)?.encounter;
    this.encChoices = encounterChoices(run);
    this.encLanded = 0;
    this.encDone = false;
    this.slotWin = null;
    {
      // The game's own clock follows the screens' (so it runs at their pace, and SKIP touches nothing else).
      this.slotClock = new Clock();
      this.ui.add({ update: (dt) => (this.slotClock.tick(dt), this.mode !== 'encounter'), finish: () => {} });
    }
    if (this.encId === 'slot') this.slotReels = SLOT_STRIPS.map((strip, r) => new ReelView(strip.map(slotCell), (r * 5) % strip.length));
    if (this.encId === 'roulette') return this.rouletteButtons();
    if (this.encId === 'dice') {
      this.dcMsg = null;
      this.dcT = 1;
      return this.diceButtons();
    }
    if (this.encId === 'rats') {
      this.rrPos = [0, 0, 0, 0];
      this.rrPick = -1;
      this.rrMsg = null;
      return this.ratButtons();
    }
    if (this.encId === 'scratch') {
      this.scReveal = {};
      this.scGrid = null;
      this.scMsg = null;
      const st = scratchState(run);
      if (st) st.picked.forEach((pk, k) => (this.scReveal[pk] = st.shown[k]));
      return this.scratchButtons();
    }
    if (this.encId === 'claw') {
      this.cwX = CW.home;
      this.cwY = 0;
      this.cwMsg = null;
      this.cwWon = [...clawWon(run)];
      return this.clawButtons();
    }
    if (this.encId === 'bj') {
      this.bjShow = null;
      this.bjMsg = null;
      return bjState(run) ? this.bjButtons() : this.bjDealButtons();
    }
    if (this.encId === 'hilo') {
      this.hlCard = hiloState(run)?.card ?? 0;
      this.hlNext = 0;
      this.hlFlip = 0;
      this.hlMsg = null;
      return this.hiloButtons();
    }
    const choices = this.encChoices;
    const cards = choices.filter((c) => c.stake);
    this.buttons = choices.map((c, i) => {
      // Buy-in cards in a row over the table's foot; WALK AWAY (and offers' choices) as buttons below.
      if (c.stake) {
        const x = CX + (i - (cards.length - 1) / 2) * ENC.cardGap;
        const b = this.btn(c.label, x, ENC.cardY, ENC.cardW, ENC.cardH, () => this.playEncounter(i));
        b.enabled = !c.disabled;
        return b;
      }
      const rest = choices.length - cards.length;
      const k = i - cards.length;
      const x = CX + (k - (rest - 1) / 2) * (cards.length ? 360 : OFFER.gap);
      const y = cards.length ? 652 : OFFER.y;
      const last = i === choices.length - 1;
      const b = last ? this.minorBtn(c.label, x, y, cards.length ? 260 : OFFER.w, cards.length ? 44 : 56, () => this.playEncounter(i)) : this.btn(c.label, x, y, OFFER.w, 56, () => this.playEncounter(i));
      b.enabled = !c.disabled;
      return b;
    });
  }

  private playEncounter(i: number): void {
    if (this.encId === 'roulette') return this.playRoulette(i);
    if (this.encId === 'hilo') return this.playHilo(i);
    if (this.encId === 'bj') return this.playBj(i);
    if (this.encId === 'dice') return this.playDice(i);
    if (this.encId === 'rats') return this.playRats(i);
    if (this.encId === 'scratch') return this.playScratch(i);
    if (this.encId === 'claw') return this.playClaw(i);
    const res = this.cb.onEncounter(i);
    if (!res) return;
    this.encResult = res;
    this.encT = 0;
    this.encSkip = false;
    if (res.pulls?.length) {
      // LUCKY SEVENS: the pulls spin one after another; SKIP fast-forwards the rest.
      this.buttons = [
        this.minorBtn('SKIP', CX, 650, 200, 44, () => {
          this.encSkip = true;
          this.slotClock.skip();
        }),
      ];
      void this.runPulls(res, res.pulls);
      return;
    }
    this.buttons = [this.btn('CONTINUE', CX, 588, 300, 52, () => this.cb.onEncounterDone())];
    const land = res.reels ? 3 : 0;
    void this.ui.tween({ from: 0, to: 1, dur: land ? 1.1 : 0.25, onUpdate: (v) => (this.encT = v) });
    for (let k = 0; k < land; k++) void this.ui.wait(0.35 + k * 0.3).then(() => this.sounds.reelStop(k));
    void this.ui.wait(land ? 1.1 : 0.15).then(() => this.encOutcomeSound(res));
  }

  /** Spin each bought pull on the real reels: they stop left to right (the last three slow down when the first two
   * match, the near-miss tease), a paying run glows along the line, then the next pull. */
  private async runPulls(res: EncounterResult, pulls: SlotPull[]): Promise<void> {
    const reels = this.slotReels;
    for (let k = 0; k < pulls.length; k++) {
      if (this.mode !== 'encounter' || this.encResult !== res) return;
      const pull = pulls[k];
      const tease = isWildOr(pull.line[0], pull.line[1]);
      for (const rv of reels) rv.rows.forEach((r) => (r.glow = 0));
      this.slotWin = null;
      await Promise.all(
        reels.map((rv, r) =>
          rv.spin(
            {
              target: pull.stops[r],
              windup: k === 0,
              decelAt: SPIN.minSpin + r * SPIN.stagger + (tease && r >= 2 ? (r - 1) * 0.2 : 0),
              decelDur: tease && r >= 2 ? SPIN.nearMissDecel : SPIN.decel,
            },
            this.slotClock,
            () => !this.encSkip && this.sounds.reelStop(r % 3),
          ),
        ),
      );
      this.encLanded = k + 1;
      if (pull.count) {
        for (let r = 0; r < pull.count; r++) {
          const row = reels[r].rows[1];
          row.glow = 1;
          row.glowColor = pull.count >= 4 ? '#ff8a3a' : '#ffe08a';
          void this.slotClock.tween({ from: 1.25, to: 1, dur: 0.25, ease: backOut(2), onUpdate: (v) => (row.punch = v) });
        }
        this.slotWin = { text: pull.wins.join('  '), count: pull.count, at: this.slotClock.time };
        if (!this.encSkip) {
          this.sounds.coin(4 + pull.count);
          if (pull.count >= 4) this.sounds.stingerMedium();
        }
      }
      await this.slotClock.wait(pull.count ? 0.9 : 0.3);
    }
    if (this.mode !== 'encounter' || this.encResult !== res) return;
    this.slotClock.skipping = false;
    this.encDone = true;
    for (const rv of this.slotReels) rv.rows.forEach((r) => (r.glow = 0));
    this.slotWin = null;
    if ((res.gains ?? []).some((g) => !g.endsWith('CHIPS') && !g.endsWith('HP'))) this.sounds.fanfareJackpot();
    else this.encOutcomeSound(res);
    this.buttons = [this.btn('CONTINUE', CX, 650, 300, 52, () => this.cb.onEncounterDone())];
  }

  /** RED OR BLACK's table: the bet stepper (-5 -1 +1 +5), RED and BLACK, and WALK AWAY. */
  private rouletteButtons(): void {
    const run = this.run!;
    const max = rouletteMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.rlSpinNo = (run.encounterPlays ?? 0) + 1;
    this.encChoices = encounterChoices(run);
    const steps = this.betStepper(() => rouletteMax(this.run!));
    const red = this.btn('RED', RL.betX, 342, 280, 56, () => this.playRoulette(0));
    const black = this.btn('BLACK', RL.betX, 410, 280, 56, () => this.playRoulette(1));
    black.tint = '#2a2234';
    const walk = this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playRoulette(2));
    for (const b of [...steps, red, black]) b.enabled = max >= 1;
    this.buttons = [...steps, red, black, walk];
  }

  /** The chip bet stepper (-5 -1 +1 +5) under YOUR BET, shared by the games that take a chip bet. */
  private betStepper(max: () => number): Btn[] {
    const step = (d: number) => {
      const next = Math.max(1, Math.min(max(), this.rlBet + d));
      if (next === this.rlBet) this.sounds.fizzle();
      else d > 0 ? this.sounds.coin(4) : this.sounds.click();
      this.rlBet = next;
    };
    return [-5, -1, 1, 5].map((d, k) => this.minorBtn(d > 0 ? `+${d}` : `${d}`, RL.betX + (k - 1.5) * 66, 262, 58, 42, () => step(d)));
  }

  /** UNDER OR OVER's table: the bet stepper, UNDER 7 / SEVEN / OVER 7, WALK AWAY. */
  private diceButtons(): void {
    const run = this.run!;
    const max = diceMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.rlSpinNo = (run.encounterPlays ?? 0) + 1;
    this.encChoices = encounterChoices(run);
    const steps = this.betStepper(() => diceMax(this.run!));
    const under = this.btn('UNDER 7', RL.betX, 330, 260, 52, () => this.playDice(0));
    const seven = this.btn('SEVEN', RL.betX, 392, 260, 52, () => this.playDice(1));
    const over = this.btn('OVER 7', RL.betX, 454, 260, 52, () => this.playDice(2));
    seven.tint = '#2a2234';
    const walk = this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playDice(3));
    for (const b of [...steps, under, seven, over]) b.enabled = max >= 1;
    this.buttons = [...steps, under, seven, over, walk];
  }

  /** One roll: the dice tumble (faces flicker, bounces settle) and land, then the call is paid. */
  private playDice(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    if (!res.dice) {
      this.dcMsg = res;
      this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      return;
    }
    const dice = res.dice;
    this.dcMsg = null;
    this.encSkip = false;
    this.buttons = [
      this.minorBtn('SKIP', CX, 636, 200, 44, () => {
        this.encSkip = true;
        this.slotClock.skip();
      }),
    ];
    let lastFace = 0;
    void this.slotClock
      .tween({
        from: 0,
        to: 1,
        dur: 1.1,
        onUpdate: (t) => {
          this.dcT = t;
          // The faces flicker while they tumble (a new face every few hundredths), then hold the real roll.
          if (t < 0.8 && t - lastFace > 0.06) {
            lastFace = t;
            this.dcDice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
            if (!this.encSkip) this.sounds.tick(t);
          } else if (t >= 0.8) this.dcDice = dice;
        },
      })
      .then(() => {
        this.slotClock.skipping = false;
        this.landChips();
        if (this.mode !== 'encounter') return;
        this.dcDice = dice;
        this.dcT = 1;
        this.dcMsg = res;
        this.sounds.reelStop(2);
        if (res.text.endsWith('BACK')) this.sounds.click();
        else this.encOutcomeSound(res);
        if (res.more) this.diceButtons();
        else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      });
  }

  /** TWENTY-ONE mid-hand: HIT and STAND. */
  private bjButtons(): void {
    this.encChoices = encounterChoices(this.run!);
    const hit = this.btn('HIT', RL.betX, 300, 260, 56, () => this.playBj(0));
    hit.enabled = !this.encChoices[0]?.disabled;
    const stand = this.btn('STAND', RL.betX, 368, 260, 56, () => this.playBj(1));
    stand.tint = '#2a2234';
    this.buttons = [hit, stand];
  }

  /** TWENTY-ONE between hands: the bet, DEAL, WALK AWAY (the chip table the other games use). */
  private bjDealButtons(): void {
    const run = this.run!;
    const max = bjMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.encChoices = encounterChoices(run);
    const steps = this.betStepper(() => bjMax(this.run!));
    const deal = this.btn('DEAL', RL.betX, 342, 280, 56, () => this.playBj(0));
    const walk = this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playBj(1));
    for (const b of [...steps, deal]) b.enabled = max >= 1;
    this.buttons = [...steps, deal, walk];
  }

  /** A TWENTY-ONE move: the deal, a hit, or a stand. A finished hand stays up while the dealer's cards turn one by one,
   * then its word and its chips; then the next hand's bet, or CONTINUE. */
  private playBj(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    const done = () => {
      if (this.mode !== 'encounter') return;
      if (res.more) {
        this.bjShow = null;
        if (bjState(this.run!)) {
          this.bjMsg = null;
          this.bjButtons();
        } else this.bjDealButtons();
      } else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
    };
    if (!res.hand) {
      if (res.more) {
        // Dealt: the bet goes down now.
        this.bjMsg = null;
        this.sounds.turnCard(true);
        this.bjButtons();
      } else {
        // Walked away.
        this.bjMsg = res;
        this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      }
      return;
    }
    // The hand's chips land with its word, after the dealer's cards turn.
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    const hand = res.hand;
    this.bjShow = hand;
    this.bjMsg = null;
    this.bjDealerUp = 1;
    this.buttons = [];
    let chain: Promise<void> = this.slotClock.wait(0.3);
    for (let k = 1; k < hand.d.length && hand.outcome !== 'bust' && hand.outcome !== 'natural'; k++)
      chain = chain.then(() => {
        this.bjDealerUp = k + 1;
        this.sounds.turnCard(false);
        return this.slotClock.wait(0.4);
      });
    void chain
      .then(() => {
        this.bjDealerUp = hand.d.length;
        this.bjMsg = res;
        this.landChips();
        if (res.good) {
          this.sounds.lucky();
          this.sounds.coin(8);
        } else if (res.good === false) this.sounds.fizzle();
        else this.sounds.coin(2);
        return this.slotClock.wait(res.more ? 1.2 : 0);
      })
      .then(done);
  }

  /** HIGHER OR LOWER's buttons: sitting down (the bet, DEAL, WALK AWAY), or mid-hand (HIGHER, LOWER, CASH OUT). */
  private hiloButtons(): void {
    const run = this.run!;
    this.encChoices = encounterChoices(run);
    const st = hiloState(run);
    if (!st) {
      const max = hiloMax(run);
      this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
      const steps = this.betStepper(() => hiloMax(this.run!));
      const deal = this.btn('DEAL', RL.betX, 376, 280, 56, () => this.playHilo(0));
      for (const b of [...steps, deal]) b.enabled = max >= 1;
      this.buttons = [...steps, deal, this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playHilo(1))];
      return;
    }
    const pot = hiloPot(st.bet, st.calls);
    const hi = this.btn('HIGHER', RL.betX, 300, 280, 56, () => this.playHilo(0));
    const lo = this.btn('LOWER', RL.betX, 368, 280, 56, () => this.playHilo(1));
    lo.tint = '#2a2234';
    hi.enabled = !this.encChoices[0]?.disabled;
    lo.enabled = !this.encChoices[1]?.disabled;
    const cash = this.minorBtn(st.calls ? `CASH OUT ${pot}` : 'CASH OUT', CX, 636, 300, 44, () => this.playHilo(2));
    cash.enabled = st.calls > 0;
    this.buttons = [hi, lo, cash];
  }

  /** A HIGHER OR LOWER move: deal (the card slides in), a call (the next card turns over), or cashing out. */
  private playHilo(i: number): void {
    const before = this.run && hiloState(this.run);
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    const done = () => {
      if (this.mode !== 'encounter') return;
      if (res.more) this.hiloButtons();
      else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
    };
    if (!before) {
      // Walked away, or sat down: the first card is dealt.
      this.hlMsg = res.good === null && !res.more ? res : null;
      this.hlCard = res.card ?? 0;
      this.hlFlip = 0;
      this.hlNext = 0;
      if (res.more) this.sounds.turnCard(true);
      return done();
    }
    if (res.next === undefined) {
      // Cashed out.
      this.hlMsg = res;
      this.encOutcomeSound(res);
      return done();
    }
    // A call: the next card turns over beside the one showing, then (if the hand goes on) takes its place.
    this.hlMsg = null;
    this.hlNext = res.next;
    this.buttons = [];
    this.sounds.turnCard(false);
    void this.slotClock
      .tween({ from: 0, to: 1, dur: 0.35, onUpdate: (v) => (this.hlFlip = v) })
      .then(() => {
        this.hlMsg = res;
        this.encOutcomeSound(res);
        return this.slotClock.wait(res.more ? 0.7 : 0);
      })
      .then(() => {
        if (res.more) {
          this.hlCard = res.next!;
          this.hlNext = 0;
          this.hlFlip = 0;
          this.hlMsg = null;
        }
        done();
      });
  }

  /** One spin: the wheel turns one way and the ball the other; the ball drops, rattles and rides into its pocket. */
  private playRoulette(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    if (res.pocket === undefined) {
      // Walked away.
      this.encResult = res;
      this.encT = 1;
      this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      return;
    }
    this.encResult = null;
    const pocket = res.pocket;
    const stepA = (Math.PI * 2) / WHEEL_ORDER.length;
    const idx = WHEEL_ORDER.indexOf(pocket);
    const w0 = this.rlWheel;
    const w1 = w0 + Math.PI * 2 * (2 + Math.random());
    const ease = (t: number) => 1 - (1 - t) ** 3;
    const wheelAt = (t: number) => w0 + (w1 - w0) * ease(t);
    const land = 0.72;
    const landA = wheelAt(land) + idx * stepA;
    const turn = Math.PI * 2;
    const k = (((this.rlBall.a - landA) % turn) + turn) % turn + turn * 3;
    let lastTick = 0;
    this.buttons = [
      this.minorBtn('SKIP', CX, 636, 200, 44, () => {
        this.encSkip = true;
        this.slotClock.skip();
      }),
    ];
    this.encSkip = false;
    void this.slotClock
      .tween({
        from: 0,
        to: 1,
        dur: 3.4,
        onUpdate: (t) => {
          this.rlWheel = wheelAt(t);
          if (t < land) {
            const u = t / land;
            this.rlBall.a = landA + (1 - ease(u)) * k;
            // On the track, then it falls in and rattles over the frets.
            this.rlBall.r = u < 0.8 ? 51 : 44 + 7 * (1 - (u - 0.8) / 0.2) * Math.abs(Math.cos((u - 0.8) * 40));
            if (u > 0.8 && t - lastTick > 0.03 && !this.encSkip) {
              lastTick = t;
              this.sounds.tick(u);
            }
          } else {
            this.rlBall.a = this.rlWheel + idx * stepA;
            this.rlBall.r = 44;
          }
        },
      })
      .then(() => {
        this.slotClock.skipping = false;
        this.landChips();
        if (this.mode !== 'encounter') return;
        this.encResult = res;
        this.encT = 1;
        this.sounds.reelStop(1);
        this.encOutcomeSound(res);
        if (res.more) this.rouletteButtons();
        else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      });
  }

  private encOutcomeSound(res: EncounterResult): void {
    if (res.good === true) {
      this.sounds.coin(6);
      this.sounds.coin(11);
      if (res.reels && new Set(res.reels).size === 1) this.sounds.fanfareJackpot();
    } else if (res.good === false) this.sounds.fizzle();
    else this.sounds.click();
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
    const e = currentEnemy(run);
    const pips = this.dangerOf(e);
    for (let k = 0; k < 3; k++)
      void this.ui.wait(0.2 + k * 0.08).then(() => {
        if (k < pips) {
          if (k === 2 && e.isBoss) this.sounds.stingerMedium();
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
      // The item itself: a click or tap pins its card open (hover shows it too); a second click on it buys, like the tag
      // under it (playtest: clicking the item never bought).
      const x = CX + (k - (n - 1) / 2) * SHELF.gap;
      const h = this.hit(x, SHELF.y[row] - 8, 128, 100, () => {
        if (this.shopSel === i) {
          if (this.mode === 'shop') this.cb.onBuy(i);
        } else this.shopSel = i;
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

  /** A bet's chips land: the counter changes now, with a bounce. */
  private landChips(): void {
    if (this.chipsLanding) void this.ui.tween({ from: 1.6, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.chipPulse = v) });
    this.chipsLanding = 0;
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
    // Beat the Dealer: the win is banked, and ENDLESS goes on until you bust (user, 2026-10-14: no cash out).
    if (run.won && run.act >= 3 && !run.endless) {
      this.buttons = [
        this.minorBtn('MENU', CX - 200, 528, 200, 52, () => this.cb.onMenu()),
        this.btn('KEEP PLAYING', CX + 120, 528, 320, 52, () => this.cb.onLetItRide()),
      ];
      this.rideOffer = true;
    }
    // THE DAILY RUN: a line to share, and a button that copies it.
    // COPY RUN: the whole run as text, to paste into a chat for balance checks (runLog.ts).
    const copyRun = this.minorBtn('COPY RUN', W - 130, H - 34, 210, 40, () => {
      void navigator.clipboard?.writeText(runSummary(run, VERSION)).then(
        () => (copyRun.label = 'COPIED!'),
        () => (copyRun.label = 'COPY FAILED'),
      );
    });
    this.buttons.push(copyRun);
    this.shareLine = run.daily ? dailyShare(run.daily, CABINETS[run.cabinet].hero, run.dailyEdge ? EDGE_TEXT[run.dailyEdge].title : '-', runScore(runEntry(run, 0)), run.records) : '';
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
  /** Enter / A on the RESULTS card: it says PRESS TO CONTINUE, so the first press continues (R13 B4). */
  pressResults(): boolean {
    if (this.mode !== 'over' || !this.results || !this.resultsHit) return false;
    this.resultsHit.onClick();
    return true;
  }
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
    const out: { x: number; y: number; w: number; h: number }[] = [...this.all().filter((h) => h.enabled), ...(this.mode !== 'cabinet' ? this.relicRects : [])];
    if (this.mode === 'next' && this.run && !needsRoute(this.run)) {
      const px = CX - 330;
      out.push({ x: px + 660 - FLIP_TAB.w / 2 - 8, y: 214 + 260 - FLIP_TAB.h / 2 - 8, w: FLIP_TAB.w + 16, h: FLIP_TAB.h + 16 });
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
    else if (this.mode === 'choice') this.drawChoice(ctx, time);
    else if (this.mode === 'encounter') this.drawEncounter(ctx, time);
    else this.drawOver(ctx);
    // YOUR BUILD: one fixed panel at the bottom of every between-fights screen.
    if (this.run && this.mode !== 'cabinet') this.drawBuild(ctx);
    // THE RESULTS card sits over everything, the build panel too (drawn under it, it hid the card's left side).
    if (this.mode === 'over' && this.results && this.run) this.drawResults(ctx, this.run);
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

  /** The act as a strip of stops (the opener, your route, the Cashier, the boss); a "?" holds the route until it's picked. */
  private drawMap(ctx: CanvasRenderingContext2D, y: number, time: number): void {
    const run = this.run!;
    const stops: (Stop | null)[] = actStops(run);
    if (needsRoute(run) || (run.route === null && run.map.routes.length > 1)) stops.splice(1, 0, null);
    const n = stops.length;
    const gap = Math.min(130, 880 / Math.max(1, n - 1));
    const x0 = CX - ((n - 1) * gap) / 2;
    const here = needsRoute(run) ? 1 : run.stop;
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(x0, y - 2, (n - 1) * gap, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y - 2, Math.min(here, n - 1) * gap, 4);
    let tip: MapTip | null = null;
    stops.forEach((st, i) => {
      const x = x0 + i * gap;
      const t = this.drawStop(ctx, st, x, y, 26, { done: i < here, here: i === here });
      tip ??= t;
      if (i === here) drawSprite(ctx, 'nodeHere', x, y - 44 + Math.sin(time * 6) * 4, 2);
      if (st?.enemy?.isBoss) drawSprite(ctx, 'nodeBoss', x, y - 38, 2);
    });
    // Drawn last by the screen (over its cards).
    this.mapTip = tip;
  }

  /** One stop's node: a portrait (fights), the Cashier, a "?" ticket (encounters), or the unpicked route. Returns its tip when hovered. */
  private drawStop(ctx: CanvasRenderingContext2D, st: Stop | null, x: number, y: number, s: number, o: { done?: boolean; here?: boolean; faded?: boolean } = {}): MapTip | null {
    const e = st?.enemy;
    const dim = o.done || o.faded ? 0.65 : 0;
    // Elites wear an orange frame (the crown badge alone was easy to miss).
    ctx.fillStyle = st?.kind === 'elite' && !o.faded ? '#ff9a3a' : COLORS.outline;
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
    // Encounters are gold boxes (the only "?" on the map); which one it is stays a secret until you get there.
    if (st?.kind === 'encounter') {
      ctx.fillStyle = o.faded || o.done ? '#7a6020' : COLORS.gold;
      ctx.fillRect(x - s + 2, y - s + 2, s * 2 - 4, s * 2 - 4);
    }
    ctx.fillStyle = e?.isBoss ? '#5a1a10' : st?.kind === 'elite' ? '#4a2410' : st?.kind === 'encounter' ? '#5a3a10' : st?.kind === 'shop' ? '#1e3a24' : o.here ? '#3a2a14' : COLORS.panelLight;
    ctx.fillRect(x - s + 3, y - s + 3, s * 2 - 6, s * 2 - 6);
    const k = s / 26;
    if (e) {
      drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x, y, 2 * k, { dim });
      const badge = BADGE[e.archetype];
      if (badge) drawSprite(ctx, badge, x + s - 2, y + s - 4, 2 * k, { alpha: o.faded ? 0.4 : 1 });
      if (e.elite) drawSprite(ctx, 'mapBadgeElite', x - s + 4, y - s + 4, 2 * k, { alpha: o.faded ? 0.4 : 1 });
    } else if (st?.kind === 'shop') drawSprite(ctx, 'cashierPortrait', x, y, 1.8 * k, { dim });
    else if (st) drawText(ctx, '?', x, y + 1, 3 * k, COLORS.goldLight, { alpha: o.done || o.faded ? 0.5 : 1 });
    else drawSprite(ctx, 'mapFork', x, y, 2.5 * k);
    if (o.done && st) drawSprite(ctx, 'nodeDone', x - s + 6, y + s - 6, 2 * k);
    if (Math.abs(this.mouse.x - x) > s || Math.abs(this.mouse.y - y) > s) return null;
    if (e) return { e, x, y: y + s };
    if (st?.kind === 'shop') return { title: 'THE CASHIER', sub: 'SPEND YOUR CHIPS', x, y: y + s };
    if (st?.kind === 'encounter') return { title: 'AN ENCOUNTER', sub: 'A GAMBLE. YOU FIND OUT WHICH WHEN YOU GET THERE', x, y: y + s };
    return { title: 'CHOOSE YOUR PATH', sub: 'AFTER THIS FIGHT', x, y: y + s };
  }

  /** A map node's mini card: name, then its ability icon and name (or a stop's name and line). */
  private drawNodeTip(ctx: CanvasRenderingContext2D, t: MapTip): void {
    const name = t.e ? (t.e.name ?? 'ENEMY') : (t.title ?? '');
    const ab = t.e?.ability ? ABILITY_UI[t.e.ability.kind] : null;
    const sub = t.e ? (ab?.label ?? '') : (t.sub ?? '');
    const w = Math.max(name.length * 12, sub ? sub.length * 9 + (ab ? 30 : 0) : 0) + 24;
    const h = sub ? 52 : 32;
    const x = Math.max(BUILD.x + BUILD.w + 12, Math.min(W - w - 8, t.x - w / 2));
    const y = t.y + 10;
    const edge = t.e?.isBoss ? '#ff6a5a' : t.e?.elite ? '#ff9a3a' : COLORS.gold;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = edge;
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    drawText(ctx, name, x + 12, y + 16, 2, t.e?.isBoss ? '#ff6a5a' : t.e ? COLORS.slime : COLORS.goldLight, { align: 'left' });
    if (ab) {
      drawSprite(ctx, ab.icon, x + 20, y + 38, 1.5);
      drawText(ctx, ab.label, x + 34, y + 38, 1.5, '#ff9a3a', { align: 'left' });
    } else if (sub) drawText(ctx, sub, x + 12, y + 38, 1.5, COLORS.textDim, { align: 'left' });
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
      drawText(ctx, `${this.shown().chips}`, CHIP_SPOT.x + 24, CHIP_SPOT.y, 4, COLORS.energy, { align: 'left', punch: this.chipPulse });
    }
    if (!inFight) drawText(ctx, 'CHIPS', x + w - 12, CHIP_SPOT.y + 4, 1.5, COLORS.textDim, { align: 'right' });
    rule(y + 58);
    // Who you are and how you're doing.
    const cab = CABINETS[run.cabinet];
    if (hasSprite(cab.heroSprite)) drawSprite(ctx, cab.heroSprite as SpriteId, x + 30, y + 94, 2);
    drawText(ctx, cab.hero, x + 60, y + 86, 2, COLORS.goldLight, { align: 'left' });
    drawText(ctx, run.endless ? `LOOP ${run.endless.loop}${nightOf(run) ? ` - ${nightOf(run)!.title}` : ''}` : `ACT ${run.act}${run.stake ? `  -  ${stakeOf(run.stake).name}` : ''}`, x + 60, y + 106, 1.5, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, x + 2, y + 138, w - 44);
    rule(y + 160);
    // Your reels: columns 1 2 3, a row per symbol (and charm).
    drawText(ctx, 'YOUR REELS', x + 12, y + 178, 2, COLORS.textDim, { align: 'left' });
    const table = runTable(p);
    drawReelTable(ctx, x + 8, y + 190, table, { colW: 90, rowH: 28, scale: 1.5, text: 2, maxRows: 9, levels: p.levels, ticket: p.relics.includes('ticket'), cap: levelCap(run), maxH: 190, badges: false });
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
    // Past 4 types the last slot says how many more (GLASS went missing: playtest), in a fixed order.
    charmEntries.sort((a, b) => ACT1_GILDS.indexOf(a.enh!) - ACT1_GILDS.indexOf(b.enh!));
    const showN = charmEntries.length > 4 ? 3 : 4;
    charmEntries.slice(0, showN).forEach((e, i) => drawEntry(e, x + 26 + (i % 2) * 134, cy0 + 24 + Math.floor(i / 2) * 24));
    if (charmEntries.length > 4) drawText(ctx, `+${charmEntries.length - 3} MORE`, x + 26 + 134, cy0 + 48, 1.5, COLORS.textDim, { align: 'left' });
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

  /**
   * Chips and HP as the panel shows them: the run's, less what a PRIZE SLOT reveal hasn't landed yet (the run is paid
   * at the buy-in so a quit can't re-roll it; the screen counts the prizes up pull by pull).
   */
  private shown(): { chips: number; hp: number; maxHp: number } {
    const p = this.run!.player;
    const pulls = this.mode === 'encounter' ? this.encResult?.pulls : undefined;
    const landing = this.mode === 'encounter' ? this.chipsLanding : 0;
    if (!pulls && !landing) return p;
    const out = { chips: p.chips - landing, hp: p.hp, maxHp: p.maxHp };
    if (!pulls) return out;
    pulls.forEach((pl, k) => {
      // A pull's prizes land when its reels do.
      if (k < this.encLanded) return;
      out.chips -= pl.gain.chips;
      out.hp -= pl.gain.hp;
      out.maxHp -= pl.gain.maxHp;
    });
    return out;
  }

  private drawHp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const p = this.shown();
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
    // ENDLESS: the pick after a loop's boss is the new loop's (its HOUSE EDGE reward): say the loop was cleared.
    const loopDone = !!last && !!this.run?.endless && last.loop !== undefined && last.loop < this.run.endless.loop;
    drawText(ctx, loopDone ? `LOOP ${last!.loop} CLEARED! SCORE ${fmtNum(endlessScore(this.run!))}` : last ? `${last.enemy} DEFEATED!` : start ? (this.run?.daily ? `DAILY ${this.run.daily.slice(5)}${this.run.dailyEdge ? `: ${EDGE_TEXT[this.run.dailyEdge].title}` : ''}` : this.run?.weekly ? `WEEKLY: ${(this.run.mods ?? []).map((e) => EDGE_TEXT[e].title).join(' + ')}` : this.run?.challenge ? `CHALLENGE: ${challengeById(this.run.challenge)?.name ?? ''}` : 'A NEW RUN') : 'CHOOSE A REWARD', CX, 30, 4, COLORS.goldLight, { alpha: Math.max(0, (this.fade - 0.6) / 0.4) });
    if (last) {
      const rocks = last.rocksCrumbled ? `  -  ${last.rocksCrumbled} ROCKS CRUMBLED` : '';
      const chips = last.chips ? `  -  +${last.chips} CHIPS` : '';
      // VETERAN (KNIGHT) and WARM-UP (JUKEBOX) grow with each loop cleared: say so where the loop ends.
      const L = this.run!.endless?.loop ?? 0;
      const grow = !loopDone ? '' : this.run!.cabinet === 'knight' ? `  -  VETERAN: SWORDS AND SHIELDS X${1 + LOOP_GROWTH.veteran * (L - 1)}` : this.run!.cabinet === 'jukebox' ? `  -  WARM-UP: FIGHTS START AT VOLUME ${Math.min(VOLUME.max - 1, LOOP_GROWTH.warmUp * L)}` : '';
      drawText(ctx, `${rounds(last.turns)}${chips}${rocks}${grow}`, CX, 60, 2, COLORS.textDim);
    }
    this.drawMap(ctx, 158, time);
    const spoils = this.draftKind === 'spoils';
    const legend = this.draftKind === 'legend';
    const relicDraft = !spoils && !legend && isRelicDraft(this.run!);
    const act3Arrival = !legend && !spoils && this.run!.act >= 3 && this.run!.depth === 0 && this.run!.actIntro;
    const heading = act3Arrival
      ? 'ACT 3: THE HOUSE HAS A PARTNER. FULLY HEALED.'
      : legend
        ? this.run!.endless ? `LOOP ${this.run!.endless.loop}: ${this.offers.every((o) => o.kind === 'relic' && LEGENDARY.has(o.relic)) ? 'A LEGENDARY RELIC' : 'PICK A RELIC'}` : `ACT 2: FULLY HEALED. ${this.offers.every((o) => o.kind === 'relic' && LEGENDARY.has(o.relic)) ? 'A LEGENDARY RELIC.' : 'PICK A RELIC.'}`
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
    // The hovered card's keywords, explained beside it (GLOSSARY: the same words on every card).
    const hov = this.picked < 0 ? this.cards.findIndex((c) => c.hover && c.scale > 0.9) : -1;
    if (hov >= 0) {
      const c = this.cards[hov];
      const keys = keywordsIn(describeOption(this.offers[hov], this.run ?? undefined).text).slice(0, 3);
      if (keys.length) {
        const bw = 230;
        // Under the card when there's room (beside it, the boxes covered the next card: playtest C), else beside it.
        const below = c.y + c.h / 2 + 12;
        if (below + keys.length * 74 <= H - 8) {
          drawKeywordBoxes(ctx, keys, Math.max(8, Math.min(W - bw - 8, c.x - bw / 2)), below, bw);
        } else {
          const right = c.x + c.w / 2 + 14;
          const bx = right + bw <= W - 8 ? right : c.x - c.w / 2 - 14 - bw;
          drawKeywordBoxes(ctx, keys, bx, c.y - c.h / 2, bw);
        }
      }
    }
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
    // The biggest size that fits the card (2 CHIP CHARMS ran off a 4-card draft's card).
    drawText(ctx, title, 0, 2, [3, 2.5, 2, 1.5].find((k) => textWidth(title, k) <= w - 6) ?? 1.5, accent);
    // Wrapped to the card's own width (a 4-card draft is narrower: UNDERDOG ran off it).
    const cols = Math.min(20, Math.floor((w - 20) / 12));
    const long = wrap(text, cols).length > 4;
    (long ? wrap(text, Math.floor((w - 20) / 9)) : wrap(text, cols)).slice(0, 6).forEach((line, k) => drawRich(ctx, line, 0, 30 + k * (long ? 15 : 20), long ? 1.5 : 2, COLORS.text));
    if (o.kind === 'relic' && LEGENDARY.has(o.relic)) this.legendTag(ctx, 0, -h / 2 + 14, time);

    ctx.restore();
  }

  /** A LEVEL card's icon: the symbol (or the charm on its symbol) with its new level. */
  private levelIcon(ctx: CanvasRenderingContext2D, o: Extract<DraftOption, { kind: 'symLevel' | 'charmLevel' }>, x: number, y: number, scale: number): void {
    const lv = this.run?.player.levels;
    if (o.kind === 'symLevel') drawSprite(ctx, o.symbol as SpriteId, x, y, scale);
    else {
      // The Charm alone on an empty cell, as in the build panel: on a symbol it read as that symbol's upgrade (user
      // playtest), but a Charm level is for every Charm of the type, whatever it sits on.
      // A tile in the Charm's own color (a plain dark cell read as a blob: R13).
      const half = 8 * scale;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - half - 3, y - half - 3, half * 2 + 6, half * 2 + 6);
      ctx.fillStyle = CHARM_COLOR[o.enh];
      ctx.fillRect(x - half - 1, y - half - 1, half * 2 + 2, half * 2 + 2);
      ctx.fillStyle = '#2a2040';
      ctx.fillRect(x - half + 2, y - half + 2, half * 2 - 4, half * 2 - 4);
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
      const every = effectiveAbility(runEdges(run).has('fast') ? fastHands(e.ability, edgeLevel(run, 'fast')) : e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
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
    }
    // Footer: which symbols it runs (icons only), or a boss's one rule.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(8, 197, w - 16, 2);
    if (e.isBoss) {
      const win = bossRules(e.boss ?? 'house', this.bossCtx()).win;
      drawText(ctx, win, 16, 228, win.length * 12 <= w - 120 ? 2 : 1.5, '#7dff7a', { align: 'left' });
      // GREEN: THE WHEEL STARTS FAST (its rule, on the card that meets it).
      if (e.boss === 'wheel' && run.stake >= STAKE.wheelFast) drawText(ctx, 'STARTS FAST', w - 24, 228, 1.5, '#ff8a7a', { align: 'right' });
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
    // (Not the Dealer's: its rules below say the same, and they need the room.)
    if (!blurbFits && e.boss !== 'dealer') line(e.blurb, COLORS.textDim);
    if (e.ability && !e.isBoss) {
      // The ability sentence leads, big (a boss's rules paragraph below already says it): it's what the back is for.
      const every = effectiveAbility(runEdges(run).has('fast') ? fastHands(e.ability, edgeLevel(run, 'fast')) : e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
      wrap(abilityText(e, every, run), Math.floor((w - 32) / (6 * big))).forEach((l) => {
        drawText(ctx, l, 16, y + 2, big, '#ff9a3a', { align: 'left' });
        y += 10 * big + 2;
      });
      y += 4;
    }
    if (e.elite)
      line(
        `ELITE: +${(e.act ?? 1) > 1 ? Math.round((ELITE_HP_MUL_2 - 1) * 100) : e.archetype === 'thief' ? 15 : Math.round((ELITE_HP_MUL - 1) * 100)}% HP, HITS ${Math.round((ELITE_DMG_MUL - 1) * 100)}% HARDER. RELIC PICK, +${CHIPS.eliteBonus} CHIPS`,
        '#ff9a3a',
      );
    // A boss's rules, one row each with the icon the fight uses for it, then HOW TO WIN (bossRules.ts).
    if (e.isBoss) {
      const br = bossRules(e.boss ?? 'house', this.bossCtx());
      // Everything above the THEIR REELS line (y 197): a step down a size when the rules don't fit (the Dealer's ran
      // over it: playtest C).
      const fit = (k: number) => {
        const rows = br.rules.reduce((a, r) => a + wrap(r.text, Math.floor((w - 64) / (6 * k))).length * 10 * k + 6, 0);
        return y + rows + wrap(`HOW TO WIN: ${br.win}`, Math.floor((w - 32) / (6 * k))).length * 10 * k <= 192;
      };
      const k = fit(sc) ? sc : fit(1.5) ? 1.5 : 1.25;
      const rcols = Math.floor((w - 64) / (6 * k));
      for (const r of br.rules) {
        // Icons come in 8-24 px: each fits one box, so a big pot doesn't cover the row under it.
        const isz = spriteSize(r.icon);
        drawSprite(ctx, r.icon, 28, y + 4 * k, (11 * k) / Math.max(isz.w, isz.h));
        wrap(r.text, rcols).forEach((l) => {
          drawRich(ctx, l, 50, y, k, COLORS.text, { align: 'left' });
          y += 10 * k;
        });
        y += 6;
      }
      wrap(`HOW TO WIN: ${br.win}`, Math.floor((w - 32) / (6 * k))).forEach((l) => {
        drawText(ctx, l, 16, y + 2, k, '#7dff7a', { align: 'left' });
        y += 10 * k;
      });
    }
    // THEIR REELS with counts, along the bottom.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(8, 197, w - 16, 2);
    drawText(ctx, 'THEIR REELS', 16, 214, 1.5, COLORS.textDim, { align: 'left' });
    const dirty = e.boss === 'house' && run.stake >= STAKE.houseDirty;
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
    if (needsRoute(run)) return this.drawRoutes(ctx, time);
    const e = currentEnemy(run);
    const act = run.endless ? `LOOP ${run.endless.loop} - ` : `ACT ${run.act} - `;
    const title = e.isBoss ? (run.act >= runActs(run) && !run.endless ? 'FINAL FIGHT' : `${act}BOSS FIGHT`) : `${act}FIGHT ${run.depth + 1} OF ${run.route === null && run.map.routes.length > 1 ? '?' : run.enemies.length}`;
    drawText(ctx, title, CX, 26, 3, e.isBoss ? '#ff6a5a' : run.act > 1 ? '#c8f0ff' : COLORS.textDim);
    this.drawMap(ctx, 128, time);
    this.drawEnemyPanel(ctx, e, CX - 330, 214, 660, time);
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    if (this.mapTip) this.drawNodeTip(ctx, this.mapTip);
  }

  /** CHOOSE YOUR PATH: the opener behind you, the routes as lanes, then the Cashier and the boss they share. */
  private drawRoutes(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const m = run.map;
    const act = run.endless ? `LOOP ${run.endless.loop}` : `ACT ${run.act}`;
    drawText(ctx, `${act} - CHOOSE YOUR PATH`, CX, 30, 3, COLORS.goldLight);
    const night = nightOf(run);
    if (run.endless?.nights?.length) drawText(ctx, "EACH PATH HAS ITS OWN RULE FOR BOTH MACHINES (TONIGHT'S RULE). TAP A PATH, THEN TAKE IT.", CX, 62, 1.5, '#ffd23f');
    else if (night) drawText(ctx, `TONIGHT'S RULE: ${night.title}. ${night.text}, FOR BOTH MACHINES.`, CX, 62, 1.5, '#ffd23f');
    else drawText(ctx, 'EVERY STOP IS SHOWN. TAP A PATH, THEN TAKE IT.', CX, 62, 1.5, COLORS.textDim);
    // ENDLESS: the score so far, on screen (playtest: it only showed on the bust screen).
    if (run.endless) drawText(ctx, `SCORE SO FAR ${fmtNum(endlessScore(run))}`, CX, 86, 1.5, COLORS.goldLight);
    const midY = ROUTES.y[1];
    const lastX = ROUTES.x0 + (ROUTE_STOPS - 1) * ROUTES.gap;
    let tip: MapTip | null = null;
    // The shared ends: the opener (done) on the left, the Cashier and the boss on the right.
    const ends = [
      { st: { kind: 'fight', enemy: m.opener } as Stop, x: ROUTES.opener, done: true },
      ...(m.shopBeforeBoss ? [{ st: { kind: 'shop' } as Stop, x: ROUTES.shop, done: false }] : []),
      { st: { kind: 'fight', enemy: m.boss } as Stop, x: ROUTES.boss, done: false },
    ];
    // Lanes: a panel per route (lit when hovered or picked), its line, its stops.
    m.routes.forEach((route, i) => {
      const y = laneY(i, m.routes.length);
      const card = this.cards[i];
      const sel = this.routeSel === i;
      const hot = sel || !!card?.hover;
      const faded = this.routeSel >= 0 && !sel;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(ROUTES.x0 - 52, y - ROUTES.lane / 2, lastX - ROUTES.x0 + 104, ROUTES.lane);
      ctx.fillStyle = sel ? COLORS.goldLight : hot ? COLORS.gold : '#3a2e52';
      ctx.fillRect(ROUTES.x0 - 49, y - ROUTES.lane / 2 + 3, lastX - ROUTES.x0 + 98, ROUTES.lane - 6);
      ctx.fillStyle = sel ? '#3a2a14' : COLORS.panel;
      ctx.fillRect(ROUTES.x0 - 46, y - ROUTES.lane / 2 + 6, lastX - ROUTES.x0 + 92, ROUTES.lane - 12);
      // Lines out of the opener and into the Cashier.
      ctx.fillStyle = sel ? COLORS.gold : faded ? '#2a2038' : '#4a3e62';
      this.link(ctx, ROUTES.opener + 30, midY, ROUTES.x0 - 52, y);
      this.link(ctx, lastX + 52, y, ROUTES.x0 + (ROUTE_STOPS - 1) * ROUTES.gap + 60 + (ROUTES.shop - lastX - 90), midY);
      ctx.fillRect(ROUTES.x0, y - 2, lastX - ROUTES.x0, 4);
      const pn = run.endless?.nights?.[i];
      if (pn) drawText(ctx, `PATH ${i + 1}: ${NIGHTS[pn].title} - ${NIGHTS[pn].text}`, ROUTES.x0 - 44, y - ROUTES.lane / 2 + 16, 1.25, sel ? COLORS.goldLight : '#ffd23f', { align: 'left' });
      else drawText(ctx, `PATH ${i + 1}`, ROUTES.x0 - 44, y - ROUTES.lane / 2 + 16, 1.5, sel ? COLORS.goldLight : COLORS.textDim, { align: 'left' });
      route.forEach((st, k) => {
        const x = ROUTES.x0 + k * ROUTES.gap;
        const lift = sel ? Math.sin(time * 4 + k) * 2 : 0;
        const t = this.drawStop(ctx, st, x, y + 6 + lift, 28, { faded });
        tip ??= t;
      });
    });
    for (const end of ends) {
      const t = this.drawStop(ctx, end.st, end.x, midY, 30, { done: end.done });
      tip ??= t;
      if (end.st.enemy?.isBoss) drawSprite(ctx, 'nodeBoss', end.x, midY - 46, 2);
    }
    drawText(ctx, 'DONE', ROUTES.opener, midY + 46, 1.5, '#6a6078');
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    this.mapTip = tip;
    if (tip) this.drawNodeTip(ctx, tip);
  }

  /** A straight connector between two points, drawn as a 4px pixel line. */
  private link(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
    for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(x1 + ((x2 - x1) * i) / steps) - 2, Math.round(y1 + ((y2 - y1) * i) / steps) - 2, 4, 4);
  }

  /** An ENCOUNTER: its name and line, its table (THE PRIZE SLOT: the machine; others a "?" ticket for now), then the
   * buy-in cards, the plays and how it went. */
  private drawEncounter(ctx: CanvasRenderingContext2D, time: number): void {
    const def = encounterOf(this.encId);
    drawText(ctx, def.name, CX, 34, 4, COLORS.goldLight, { punch: 1 + 0.02 * Math.sin(time * 3) });
    if (def.blurb) drawText(ctx, def.blurb, CX, 80, 2, COLORS.textDim);
    const res = this.encResult;
    if (def.id === 'slot') this.drawSlotMachine(ctx, time);
    else if (def.id === 'roulette') this.drawRoulette(ctx, time);
    else if (def.id === 'hilo') this.drawHilo(ctx, time);
    else if (def.id === 'bj') this.drawBj(ctx, time);
    else if (def.id === 'dice') this.drawDice(ctx, time);
    else if (def.id === 'rats') this.drawRats(ctx, time);
    else if (def.id === 'scratch') this.drawScratch(ctx, time);
    else if (def.id === 'claw') this.drawClaw(ctx, time);
    else {
      this.panel(ctx, CX - 330, 120, 660, 300, '#7a3aa8');
      if (!res) {
        // Each offer's terms under its own button (WALK AWAY needs none).
        // One size for every caption, the biggest that fits a button's width (they used to differ, and nearly touch).
        const caps = this.encChoices.filter((c, i, all) => !c.stake && i !== all.length - 1);
        const capScale = [2, 1.5, 1].find((k) => caps.every((c) => textWidth(c.text, k) <= OFFER.w)) ?? 1;
        this.encChoices.forEach((c, i, all) => {
          if (c.stake || i === all.length - 1) return;
          const x = CX + (i - (all.length - 1) / 2) * OFFER.gap;
          drawText(ctx, c.text, x, OFFER.y + 46, capScale, c.disabled ? '#6a6078' : COLORS.goldLight);
        });
        // The offer's character (a gentle bob), or a gold-edged "?" ticket until its art exists.
        const k = 1 + 0.03 * Math.sin(time * 2);
        if (def.art && hasSprite(def.art)) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(CX - 60, 316, 120, 10);
          drawSprite(ctx, def.art as SpriteId, CX, 240 + Math.sin(time * 2) * 3, 6);
        } else {
          ctx.fillStyle = COLORS.outline;
          ctx.fillRect(CX - 70 * k, 250 - 90 * k, 140 * k, 180 * k);
          ctx.fillStyle = COLORS.gold;
          ctx.fillRect(CX - 64 * k, 250 - 84 * k, 128 * k, 168 * k);
          ctx.fillStyle = '#3a1a4a';
          ctx.fillRect(CX - 56 * k, 250 - 76 * k, 112 * k, 152 * k);
          drawText(ctx, '?', CX, 250, 10 * k, '#e8b0ff');
        }
        // The relic an offer wants (THE PAWN SHOP): its icon, readable by tooltip.
        const wanted = this.encChoices.find((c) => c.relic)?.relic;
        if (wanted) {
          drawSprite(ctx, RELICS[wanted].sprite as SpriteId, CX + 110, 200, 2.5);
          this.tips.add(wanted, CX + 110, 200, 20);
        }
      } else if (this.encT >= 1) {
        const col = res.good === true ? COLORS.goldLight : res.good === false ? '#ff8a7a' : COLORS.text;
        drawText(ctx, res.title, CX, 240, 4, col, { punch: 1 + 0.03 * Math.sin(time * 6) });
        drawText(ctx, res.text, CX, 300, 2.5, col);
      }
    }
    if (!res) this.drawBuyIns(ctx, time);
    for (const b of this.buttons) if (!this.encChoices.some((c, i) => c.stake && b === this.buttons[i] && b.label === c.label) || res) this.drawButton(ctx, b, time);
  }

  /** The buy-in cards: the tier, what you put up, what it buys. A staked relic shows its icon (its tooltip works). */
  private drawBuyIns(ctx: CanvasRenderingContext2D, time: number): void {
    this.encChoices.forEach((c, i) => {
      if (!c.stake) return;
      const b = this.buttons[i];
      // (Only a buy-in button: after TWENTY-ONE's WALK AWAY the only button is CONTINUE, and it was drawn as card A.)
      if (!b || b.label !== c.label) return;
      const x = b.x - b.w / 2;
      const y = b.y - b.h / 2 - (b.hover && b.enabled ? 4 : 0);
      let y0 = y;
      // Every card looks alike: which one is the big bet is the player's call (no LOW / HIGH labels).
      ctx.save();
      if (!b.enabled) ctx.globalAlpha *= 0.4;
      this.panel(ctx, x, y, b.w, b.h, b.hover && b.enabled ? COLORS.goldLight : COLORS.gold);
      drawText(ctx, 'PAY', b.x, y + 20, 2, COLORS.textDim, { punch: b.hover && b.enabled ? 1 + 0.04 * Math.sin(time * 8) : 1 });
      y0 = y + 6;
      // The biggest size that fits the card (with the relic's icon beside it): PAY OVERCHARGE ran edge to edge.
      const icon = c.relic ? 30 : 0;
      const fit = (t: string, room: number) => [2.5, 2, 1.5, 1].find((k) => textWidth(t, k) <= room) ?? 1;
      const ss = fit(c.stake, b.w - 20 - icon);
      const sw = textWidth(c.stake, ss);
      if (c.relic) {
        drawSprite(ctx, RELICS[c.relic].sprite as SpriteId, b.x - (sw + icon) / 2 + 12, y0 + 40, 1.5);
        this.tips.add(c.relic, b.x - (sw + icon) / 2 + 12, y0 + 40, 14);
      }
      drawText(ctx, c.stake, b.x + icon / 2, y0 + 40, ss, COLORS.text);
      drawText(ctx, 'FOR', b.x, y0 + 64, 1.5, COLORS.textDim);
      drawText(ctx, c.prize ?? '', b.x, y0 + 86, fit(c.prize ?? '', b.w - 20), COLORS.goldLight);
      ctx.restore();
    });
  }

  /** The casino felt both card and wheel games sit on. */
  private felt(ctx: CanvasRenderingContext2D, h = 440): void {
    this.panel(ctx, CX - 430, 104, 860, h, COLORS.gold);
    ctx.fillStyle = '#0e3a20';
    ctx.fillRect(CX - 430, 104, 860, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 104; y < 104 + h; y += 8) ctx.fillRect(CX - 430, y, 860, 2);
  }

  // ---- RAT RACE, SCRATCH-OFF, CLAW MACHINE (user's picks, 2026-10-14) -----------------------------------------------

  /** RAT RACE: the bet stepper, a button per rat (its odds on it), WALK AWAY. */
  private ratButtons(): void {
    const run = this.run!;
    const max = raceMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.rlSpinNo = (run.encounterPlays ?? 0) + 1;
    const steps = this.betStepper(() => raceMax(this.run!));
    const rats = RATS.map((r, k) => this.btn(`${r.name} X${r.pays}`, RL.betX, 330 + k * 56, 300, 46, () => this.playRats(k)));
    const walk = this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playRats(RATS.length));
    for (const b of [...steps, ...rats]) b.enabled = max >= 1;
    this.buttons = [...steps, ...rats, walk];
  }

  /** One race: the rats run (the engine has already picked the winner; it crosses first), then the bet pays. */
  private playRats(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    if (!res.race) {
      this.rrMsg = res;
      this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      return;
    }
    const race = res.race;
    this.rrMsg = null;
    this.rrPick = race.pick;
    this.encSkip = false;
    this.buttons = [
      this.minorBtn('SKIP', CX, 636, 200, 44, () => {
        this.encSkip = true;
        this.slotClock.skip();
      }),
    ];
    // Each rat's pace: bursts and stalls; the winner's pace is scaled so it crosses first, at the end.
    const ends = RATS.map((_, k) => (k === race.winner ? 1 : 0.78 + Math.random() * 0.18));
    const wob = RATS.map(() => [Math.random() * 6, 2 + Math.random() * 3]);
    void this.slotClock
      .tween({
        from: 0,
        to: 1,
        dur: 3.2,
        onUpdate: (t) => {
          this.rrPos = ends.map((e, k) => Math.min(1, e * (t + 0.05 * Math.sin(t * wob[k][1] * 6 + wob[k][0]) * t * (1 - t) * 4)));
          if (!this.encSkip && Math.random() < 0.08) this.sounds.tick(t);
        },
      })
      .then(() => {
        this.slotClock.skipping = false;
        this.rrPos = ends;
        this.landChips();
        if (this.mode !== 'encounter') return;
        this.rrMsg = res;
        this.encOutcomeSound(res);
        if (res.more) this.ratButtons();
        else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      });
  }

  /** RAT RACE: four lanes on the felt, the rats, the finish line, your bet and the last result. */
  private drawRats(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    this.felt(ctx);
    drawText(ctx, `RACE ${Math.min(this.rlSpinNo, RACE.races + extraPlays(run))} OF ${RACE.races + extraPlays(run)}`, CX, 78, 2, COLORS.textDim);
    // Names in a column on the left, the track to their right (the names sat on the rats: playtest).
    const nx = CX - 404;
    const x0 = CX - 250;
    const x1 = CX - 50;
    const cloth = ['#ff4a3a', '#4fa3ff', '#ffd23f', '#5aff7a'];
    RATS.forEach((r, k) => {
      const y = 170 + k * 80;
      ctx.fillStyle = this.rrPick === k ? '#2a5a2a' : k % 2 ? '#0c3420' : '#10401f';
      ctx.fillRect(nx - 6, y - 30, x1 - nx + 46, 60);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(nx - 6, y + 29, x1 - nx + 46, 2);
      const p = this.rrPos[k] ?? 0;
      const x = x0 + p * (x1 - x0);
      const running = p > 0 && p < 1;
      const frame = running && Math.floor(time * 12 + k) % 2 ? 'ratRacer2' : 'ratRacer';
      drawSprite(ctx, artId(frame), x, y - 4, 3);
      ctx.fillStyle = cloth[k];
      ctx.fillRect(x - 9, y - 16, 15, 9);
      drawText(ctx, `${k + 1}`, x - 2, y - 12, 1.25, '#140c1c');
      drawText(ctx, r.name, nx, y - 8, 1.5, this.rrPick === k ? COLORS.goldLight : COLORS.text, { align: 'left' });
      drawText(ctx, `PAYS X${r.pays}`, nx, y + 12, 1.25, this.rrPick === k ? COLORS.goldLight : COLORS.textDim, { align: 'left' });
    });
    // The finish line: a checkered post.
    for (let y = 140; y < 500; y += 10) {
      ctx.fillStyle = Math.floor(y / 10) % 2 ? '#f0ece6' : '#141018';
      ctx.fillRect(x1 + 26, y, 6, 10);
    }
    drawText(ctx, `YOUR BET (MAX ${raceMax(run)})`, RL.betX, 150, 2, COLORS.textDim);
    drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
    drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
    drawText(ctx, 'YOUR RAT WINS: YOU GET YOUR BET TIMES ITS ODDS', RL.betX, 530, 1.25, COLORS.textDim);
    const m = this.rrMsg;
    if (m) {
      drawText(ctx, m.title, CX - 200, 478, 2.5, m.good ? COLORS.goldLight : COLORS.text, { punch: 1 + 0.03 * Math.sin(time * 6) });
      if (m.text) drawText(ctx, m.text, CX - 200, 516, 2, m.good ? COLORS.goldLight : '#ff8a7a');
    }
  }

  /** SCRATCH-OFF: BUY A TICKET, or the panels of the ticket in hand. */
  private scratchButtons(): void {
    const run = this.run!;
    const st = scratchState(run);
    this.encChoices = encounterChoices(run);
    if (!st) {
      const buy = this.btn(`BUY A TICKET: ${atStakes(run, SCRATCH.price)} CHIPS`, RL.betX, 420, 340, 56, () => this.playScratch(0));
      buy.enabled = run.player.chips >= atStakes(run, SCRATCH.price);
      this.buttons = [buy, this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playScratch(9))];
      return;
    }
    // The nine panels, laid over the ticket.
    this.buttons = Array.from({ length: 9 }, (_, k) => {
      const b = this.btn('', SC.x + (k % 3) * SC.gap, SC.y + Math.floor(k / 3) * SC.gap, SC.cell, SC.cell, () => this.playScratch(k));
      b.enabled = !st.picked.includes(k);
      b.ghost = true;
      return b;
    });
  }

  private playScratch(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    this.landChips();
    if (res.scratch) {
      this.scReveal[res.scratch.panel] = res.scratch.sym;
      this.scPop = res.scratch.panel;
      void this.ui.tween({ from: 0, to: 1, dur: 0.35, onUpdate: (v) => (this.scT = v) });
      this.sounds.tick(0.5);
      if (res.scratch.grid) {
        this.scGrid = res.scratch.grid;
        this.scMsg = res;
        this.encOutcomeSound(res);
        if (res.more) {
          const run = this.run!;
          const again = this.btn(`BUY ANOTHER: ${atStakes(run, SCRATCH.price)} CHIPS`, RL.betX, 420, 340, 56, () => {
            this.scReveal = {};
            this.scGrid = null;
            this.scMsg = null;
            this.playScratch(0);
          });
          again.enabled = run.player.chips >= atStakes(run, SCRATCH.price);
          this.buttons = [again, this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playScratch(9))];
        } else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
        return;
      }
      return this.scratchButtons();
    }
    if (res.more) {
      // A ticket bought: scratch it.
      this.scReveal = {};
      this.scGrid = null;
      this.scMsg = null;
      return this.scratchButtons();
    }
    this.scMsg = res;
    this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
  }

  /** SCRATCH-OFF: the ticket (silver panels; scratched ones show their prize), the prize list, the result. */
  private drawScratch(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    this.felt(ctx);
    const st = scratchState(run);
    const art: SpriteId[] = ['chip', 'goldbar', artId('slotHeart'), artId('slotUp'), artId('relicSym')];
    // The ticket.
    const tx = SC.x - SC.cell / 2 - 26;
    const ty = SC.y - SC.cell / 2 - 70;
    const tw = SC.gap * 2 + SC.cell + 52;
    const th = SC.gap * 2 + SC.cell + 100;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(tx - 6, ty - 6, tw + 12, th + 12);
    ctx.fillStyle = '#f4ead0';
    ctx.fillRect(tx, ty, tw, th);
    ctx.fillStyle = '#c81a2a';
    ctx.fillRect(tx, ty, tw, 46);
    drawText(ctx, 'LUCKY SCRATCH', tx + tw / 2, ty + 24, 2.5, COLORS.goldLight);
    for (let k = 0; k < 9; k++) {
      const x = SC.x + (k % 3) * SC.gap;
      const y = SC.y + Math.floor(k / 3) * SC.gap;
      const sym = this.scReveal[k] ?? (this.scGrid ? this.scGrid[k] : undefined);
      const scratched = this.scReveal[k] !== undefined;
      if (sym === undefined) {
        ctx.fillStyle = '#9a9aaa';
        ctx.fillRect(x - SC.cell / 2, y - SC.cell / 2, SC.cell, SC.cell);
        ctx.fillStyle = '#c8c8d4';
        for (let s = 0; s < 5; s++) ctx.fillRect(x - SC.cell / 2 + 6 + s * 16, y - SC.cell / 2 + 8, 8, SC.cell - 16);
        if (st) drawText(ctx, '?', x, y, 3, '#6a6a7a');
      } else {
        ctx.fillStyle = scratched ? '#fffaf0' : '#e8e0c8';
        ctx.fillRect(x - SC.cell / 2, y - SC.cell / 2, SC.cell, SC.cell);
        const pop = this.scPop === k ? 0.6 + 0.4 * this.scT : 1;
        ctx.globalAlpha = scratched ? 1 : 0.45;
        drawSprite(ctx, art[sym], x, y, 3 * pop);
        ctx.globalAlpha = 1;
      }
    }
    if (!st && !this.scGrid) drawSprite(ctx, artId('scratchCoin'), tx + tw - 20, ty + th - 20, 3);
    // The prizes, on the right.
    drawText(ctx, 'THREE OF A KIND WINS', RL.betX, 140, 2, COLORS.goldLight);
    const names = [`${atStakes(run, SCRATCH.smallChips)} CHIPS`, `${atStakes(run, SCRATCH.bigChips)} CHIPS`, 'A HEAL', 'AN UPGRADE', 'A RELIC'];
    names.forEach((n, k) => {
      drawSprite(ctx, art[k], RL.betX - 110, 186 + k * 38, 2);
      drawText(ctx, n, RL.betX - 80, 186 + k * 38, 1.75, COLORS.text, { align: 'left' });
    });
    if (st) drawText(ctx, `SCRATCH ${SCRATCH.scratches - st.picked.length} PANEL${SCRATCH.scratches - st.picked.length === 1 ? '' : 'S'}`, RL.betX, 400, 2.5, COLORS.goldLight, { punch: 1 + 0.03 * Math.sin(time * 6) });
    const m = this.scMsg;
    if (m) {
      drawText(ctx, m.title, RL.betX, 490, 3, m.good ? COLORS.goldLight : m.good === false ? '#ff8a7a' : COLORS.text);
      if (m.text) drawText(ctx, m.text, RL.betX, 530, 2, m.good ? COLORS.goldLight : COLORS.text);
    }
  }

  /** CLAW MACHINE: a button per prize still in the pit (its grip under it), WALK AWAY. */
  private clawButtons(): void {
    const run = this.run!;
    this.rlSpinNo = (run.encounterPlays ?? 0) + 1;
    this.encChoices = encounterChoices(run);
    const aims = CLAW_PRIZES.map((_p, k) => {
      const b = this.btn(`GO FOR ${clawPrizeName(run, k)}`, RL.betX, 300 + k * 74, 320, 50, () => this.playClaw(k));
      b.enabled = !this.encChoices[k]?.disabled;
      return b;
    });
    this.buttons = [...aims, this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playClaw(CLAW_PRIZES.length))];
  }

  /** One go: the claw slides over, drops, shuts and lifts; the prize rides up, and holds or slips. */
  private playClaw(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    if (!res.claw) {
      this.cwMsg = res;
      this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      return;
    }
    const claw = res.claw;
    this.cwMsg = null;
    this.cwTarget = claw.prize;
    this.encSkip = false;
    this.buttons = [
      this.minorBtn('SKIP', CX, 636, 200, 44, () => {
        this.encSkip = true;
        this.slotClock.skip();
      }),
    ];
    const targetX = CW.x0 + claw.prize * CW.gap;
    void this.slotClock
      .tween({
        from: 0,
        to: 1,
        dur: 3,
        onUpdate: (t) => {
          // 0-0.3 slide, 0.3-0.5 drop, 0.5-0.6 shut, 0.6-0.85 lift (it slips at 0.75 if it doesn't hold), 0.85-1 home.
          const home = CW.home;
          if (t < 0.3) {
            this.cwX = home + (targetX - home) * (t / 0.3);
            this.cwY = 0;
          } else if (t < 0.5) {
            this.cwX = targetX;
            this.cwY = (t - 0.3) / 0.2;
          } else if (t < 0.6) this.cwY = 1;
          else if (t < 0.85) this.cwY = 1 - (t - 0.6) / 0.25;
          else {
            this.cwY = 0;
            this.cwX = targetX + (home - targetX) * ((t - 0.85) / 0.15);
          }
          this.cwShut = t >= 0.5 && t < 0.97;
          this.cwCarry = t >= 0.55 && (claw.held ? t < 0.97 : t < 0.75);
        },
      })
      .then(() => {
        this.slotClock.skipping = false;
        this.cwX = CW.home;
        this.cwY = 0;
        this.cwShut = false;
        this.cwCarry = false;
        if (claw.held) this.cwWon.push(claw.prize);
        this.landChips();
        if (this.mode !== 'encounter') return;
        this.cwMsg = res;
        this.encOutcomeSound(res);
        if (res.more) this.clawButtons();
        else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      });
  }

  /** CLAW MACHINE: the glass cabinet, the prizes in the pit (won ones gone), the claw, the result. */
  private drawClaw(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    this.felt(ctx);
    drawText(ctx, `GO ${Math.min(this.rlSpinNo, CLAW.tries + extraPlays(run))} OF ${CLAW.tries + extraPlays(run)}  -  ${atStakes(run, CLAW.price)} CHIPS A GO`, CX, 78, 2, COLORS.textDim);
    // The cabinet.
    const cx0 = CW.x0 - 100;
    const cw = CW.gap * 2 + 200;
    ctx.fillStyle = '#c81a2a';
    ctx.fillRect(cx0 - 10, 120, cw + 20, 420);
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(cx0, 150, cw, 380);
    ctx.fillStyle = 'rgba(160,220,255,0.06)';
    ctx.fillRect(cx0, 150, cw, 380);
    drawText(ctx, 'GRAB-A-PRIZE', cx0 + cw / 2, 136, 2, COLORS.goldLight);
    // The rail and the claw.
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(cx0, 166, cw, 6);
    const clawY = 200 + this.cwY * 230;
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(this.cwX - 2, 170, 4, clawY - 186);
    const won = this.cwWon;
    const art: SpriteId[] = ['chip', artId('enhGold'), artId('relicSym')];
    CLAW_PRIZES.forEach((p, k) => {
      const x = CW.x0 + k * CW.gap;
      const carried = this.cwCarry && this.cwTarget === k;
      if (won.includes(k) && !carried) return;
      const y = carried ? clawY + 46 : CW.pitY;
      drawSprite(ctx, artId('prizeBall'), x, y, 5);
      drawSprite(ctx, art[k], x, y - 4, 2);
      if (!carried) {
        drawText(ctx, clawPrizeName(run, k), x, CW.pitY + 52, 1.5, COLORS.text);
        drawText(ctx, p.grip, x, CW.pitY + 72, 1.25, k === 0 ? '#7dff7a' : k === 1 ? '#ffd23f' : '#ff8a7a');
      }
    });
    drawSprite(ctx, artId(this.cwShut ? 'clawGrabberShut' : 'clawGrabber'), this.cwX, clawY, 4);
    const m = this.cwMsg;
    if (m) {
      drawText(ctx, m.title, RL.betX, 200, 3, m.good ? COLORS.goldLight : '#ff8a7a', { punch: 1 + 0.03 * Math.sin(time * 6) });
      if (m.text) drawText(ctx, m.text, RL.betX, 240, 2, m.good ? COLORS.goldLight : COLORS.textDim);
    } else if (this.cwY === 0 && this.cwX === CW.home) drawText(ctx, 'PICK A PRIZE TO GO FOR', RL.betX, 220, 2, COLORS.textDim);
  }

  /** UNDER OR OVER: two dice on the felt (tumbling, then landed), your bet, the payouts, the last roll. */
  private drawDice(ctx: CanvasRenderingContext2D, time: number): void {
    this.felt(ctx);
    drawText(ctx, `ROLL ${Math.min(this.rlSpinNo, DICE.rolls + extraPlays(this.run!))} OF ${DICE.rolls + extraPlays(this.run!)}`, CX, 78, 2, COLORS.textDim);
    const t = this.dcT;
    const rolling = t < 1;
    // While they tumble the dice hop (each bounce lower) and wobble; landed, they sit still.
    const hop = rolling ? Math.abs(Math.sin(t * Math.PI * 4)) * 60 * (1 - t) : 0;
    const total = this.dcDice[0] + this.dcDice[1];
    this.dcDice.forEach((face, k) => {
      const x = RL.wheelX - 70 + k * 140 + (rolling ? Math.sin(t * 30 + k) * 6 : 0);
      drawDie(ctx, x, 290 - hop * (k ? 0.8 : 1), face, rolling ? Math.sin(t * 20 + k * 2) * 0.3 : 0);
    });
    if (!rolling) drawText(ctx, `${total}`, RL.wheelX, 390, 3, total === 7 ? COLORS.goldLight : COLORS.text);
    // The table's limit, said up front (playtest: HIGHER OR LOWER's cap wasn't).
    drawText(ctx, `YOUR BET (MAX ${this.run ? diceMax(this.run) : DICE.maxBet})`, RL.betX, 150, 2, COLORS.textDim);
    drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
    drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
    drawText(ctx, `UNDER / OVER PAY 1 TO 1.  SEVEN PAYS ${DICE.sevenPays} TO 1`, RL.betX, 500, 1.5, COLORS.textDim);
    const m = this.dcMsg;
    if (m && !rolling && m.dice) drawText(ctx, m.text, RL.wheelX, 440, 2.5, m.text.startsWith('+') ? COLORS.goldLight : m.text.startsWith('-') ? '#ff8a7a' : COLORS.text, { punch: 1 + 0.03 * Math.sin(time * 6) });
  }

  /** TWENTY-ONE: the dealer's row and yours with their totals, which hand this is, what you've won. Before the buy-in:
   * the house rules and the pay cards. */
  private drawBj(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const st = bjState(run);
    const show = this.bjShow;
    const inPlay = !!st || !!show;
    const dealt = show ? show.no : st ? st.dealt : Number((run.encounterState as { dealt?: number } | undefined)?.dealt ?? 0) + 1;
    drawText(ctx, `HAND ${Math.min(dealt, BJ.hands + extraPlays(run))} OF ${BJ.hands + extraPlays(run)}`, CX, 78, 2, COLORS.textDim);
    this.felt(ctx);
    const m = this.bjMsg;
    if (!inPlay) {
      // Between hands: two face-down cards and the house rules on the left, your bet on the right.
      drawPlayingCard(ctx, RL.wheelX - 40, 260, 0, 1, 0.8);
      drawPlayingCard(ctx, RL.wheelX + 40, 260, 0, 1, 0.8);
      drawText(ctx, 'A WIN PAYS 1 TO 1. 21 OFF THE DEAL PAYS 2 TO 1.', RL.wheelX, 380, 1.5, COLORS.goldLight);
      drawText(ctx, `THE DEALER STANDS ON ${BJ.standOn}. A TIE IS A PUSH: DEAL AGAIN.`, RL.wheelX, 404, 1.5, COLORS.textDim);
      if (m) {
        drawText(ctx, m.title, RL.betX, 470, 3, m.good ? COLORS.goldLight : m.good === false ? '#ff8a7a' : COLORS.text);
        if (m.text) drawText(ctx, m.text, RL.betX, 506, 2, m.good ? COLORS.goldLight : m.good === false ? '#ff8a7a' : COLORS.text);
      }
      // Walked away: no more bets (a push keeps the table open).
      if (m && !m.hand) return;
      drawText(ctx, `YOUR BET (MAX ${bjMax(run)})`, RL.betX, 150, 2, COLORS.textDim);
      drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
      drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
      return;
    }
    const p = show ? show.p : st!.p;
    const d = show ? show.d.slice(0, this.bjDealerUp) : st!.d;
    const x0 = CX - 340;
    const row = (cards: number[], y: number, label: string, hidden: boolean) => {
      cards.forEach((c, k) => drawPlayingCard(ctx, x0 + 50 + k * 70, y, c, 1, 0.75, k));
      if (hidden) drawPlayingCard(ctx, x0 + 50 + cards.length * 70, y, 0, 1, 0.75);
      const t = bjTotal(cards);
      drawText(ctx, `${label} ${t}`, x0 + 10, y - 76, 2, t > 21 ? '#ff8a7a' : COLORS.text, { align: 'left' });
    };
    row(d, 220, 'DEALER', !show);
    row(p, 420, 'YOU', false);
    // Right column: the bet riding on this hand, then how it went.
    drawSprite(ctx, 'chip', RL.betX - 70, 190, 3);
    drawText(ctx, `${st?.bet ?? this.rlBet} ON THIS HAND`, RL.betX - 46, 190, 2, COLORS.energy, { align: 'left' });
    if (m && m.title) {
      drawText(ctx, m.title, RL.betX, 300, 2.5, m.good ? COLORS.goldLight : '#ff8a7a', { punch: 1 + 0.03 * Math.sin(time * 6) });
      if (m.text) drawText(ctx, m.text, RL.betX, 336, 2, m.good ? COLORS.goldLight : '#ff8a7a');
    }
  }

  /** HIGHER OR LOWER: the card showing, the next one (face down, then turning), the pot ladder, your bet or the pot. */
  private drawHilo(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const st = hiloState(run);
    this.felt(ctx);
    const cx = CX - 200;
    drawPlayingCard(ctx, cx - 80, 300, this.hlCard, this.hlCard ? 1 : 0);
    // The next card: its back, or turning over (it narrows on its back, widens on its face).
    const f = this.hlFlip;
    const face = f > 0.5 && this.hlNext > 0;
    drawPlayingCard(ctx, cx + 80, 300, face ? this.hlNext : 0, face ? (f - 0.5) * 2 : 1 - f * 2, 1, 1);
    // The pot ladder: what each right call makes the pot (the one you're on lit).
    const bet = st?.bet ?? this.rlBet;
    const calls = st?.calls ?? 0;
    for (let k = 1; k <= HILO.calls; k++) {
      const y = 470 - k * 60;
      const lit = k <= calls;
      const nextUp = k === calls + 1 && !!st;
      this.panel(ctx, cx + 200 - 40, y - 18, 80, 36, lit ? COLORS.goldLight : nextUp ? COLORS.gold : '#3a2e52');
      drawText(ctx, `${hiloPot(bet, k)}`, cx + 200, y, 2, lit ? COLORS.goldLight : nextUp ? COLORS.text : COLORS.textDim, { punch: nextUp ? 1 + 0.05 * Math.sin(time * 6) : 1 });
    }
    drawText(ctx, 'POT', cx + 200, 470, 1.5, COLORS.textDim);
    // The rules nobody guesses (playtest: is the ace high?).
    drawText(ctx, 'ACES ARE HIGH. A TIE LOSES.', cx, 196, 1.5, COLORS.textDim);
    // Right column: your bet before the deal; the pot during the hand.
    if (!st) {
      // The table's limit, said up front (playtest: HIGHER OR LOWER's cap wasn't).
      drawText(ctx, `YOUR BET (MAX ${this.run ? hiloMax(this.run) : HILO.maxBet})`, RL.betX, 150, 2, COLORS.textDim);
      drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
      drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
    } else {
      drawText(ctx, 'THE POT', RL.betX, 170, 2, COLORS.textDim);
      drawText(ctx, `${hiloPot(st.bet, st.calls)}`, RL.betX, 220, 5, COLORS.energy);
    }
    const m = this.hlMsg;
    if (m && m.title) {
      drawText(ctx, m.title, cx, 460, 3, m.good === false ? '#ff8a7a' : COLORS.goldLight, { punch: 1 + 0.03 * Math.sin(time * 6) });
      drawText(ctx, m.text, cx, 494, m.text.length > 18 ? 1.5 : 2, m.good === false ? '#ff8a7a' : COLORS.goldLight);
    }
  }

  /** RED OR BLACK: the felt, the wheel (drawn small and scaled up crisp), your bet, the last spin's result. */
  private drawRoulette(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const spinning = this.buttons.length === 1 && this.buttons[0].label === 'SKIP';
    drawText(ctx, `SPIN ${Math.min(this.rlSpinNo, (encounterOf('roulette').plays ?? 3) + extraPlays(this.run!))} OF ${(encounterOf('roulette').plays ?? 3) + extraPlays(this.run!)}`, CX, 78, 2, COLORS.textDim);
    this.felt(ctx);
    // The wheel.
    const c = (this.rlCanvas ??= Object.assign(document.createElement('canvas'), { width: RL.px, height: RL.px }));
    const g = c.getContext('2d')!;
    drawWheel(g, this.rlWheel, this.rlBall);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, RL.wheelX - RL.px, RL.wheelY - RL.px, RL.px * 2, RL.px * 2);
    ctx.restore();
    // Your bet, beside the wheel.
    // The table's limit, said up front (playtest: HIGHER OR LOWER's cap wasn't).
    drawText(ctx, `YOUR BET (MAX ${this.run ? rouletteMax(this.run) : ROULETTE.maxBet})`, RL.betX, 150, 2, COLORS.textDim);
    drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
    drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
    drawText(ctx, 'PAYS 1 TO 1', RL.betX, 470, 1.5, COLORS.textDim);
    // The result of the spin that just landed.
    const res = this.encResult;
    if (res && !spinning && res.pocket !== undefined) {
      const col = pocketColor(res.pocket);
      drawText(ctx, res.title, RL.wheelX, 456, 3, col === 'red' ? '#ff6a5a' : col === 'green' ? COLORS.slime : COLORS.text, { punch: 1 + 0.03 * Math.sin(time * 6) });
      drawText(ctx, res.text, RL.wheelX, 488, 2, res.good ? COLORS.goldLight : '#ff8a7a');
    }
    void run;
  }

  /** LUCKY SEVENS: a 5x3 machine in the fight machines' bezel, its paytable under it, then each pull's win and the
   * totals. */
  private drawSlotMachine(ctx: CanvasRenderingContext2D, time: number): void {
    const res = this.encResult;
    const mw = PITCH * 5;
    const mh = PITCH * 3;
    const x0 = CX - mw / 2;
    const y0 = SLOT_TOP;
    const pad = 14;
    // The bezel, as the fight machines wear it: outline, gold rim, dark gold, panel, a top-left highlight.
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
    ctx.save();
    ctx.shadowColor = '#ffcf5a';
    ctx.shadowBlur = 18 + (res && !this.encDone ? 14 : 0);
    ctx.globalAlpha = 0.2 + 0.2 * pulse;
    ctx.fillStyle = '#ffcf5a';
    ctx.fillRect(x0 - pad, y0 - pad, mw + pad * 2, mh + pad * 2);
    ctx.restore();
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - pad - 4, y0 - pad - 4, mw + pad * 2 + 8, mh + pad * 2 + 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0 - pad, y0 - pad, mw + pad * 2, mh + pad * 2);
    ctx.fillStyle = '#8a5a1c';
    ctx.fillRect(x0 - pad + 4, y0 - pad + 4, mw + pad * 2 - 8, mh + pad * 2 - 8);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x0 - pad + 8, y0 - pad + 8, mw + pad * 2 - 16, mh + pad * 2 - 16);
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillRect(x0 - pad, y0 - pad, mw + pad * 2, 2);
    ctx.fillRect(x0 - pad, y0 - pad, 2, mh + pad * 2);
    // Its marquee on top (the bulbs chase while it spins).
    drawSprite(ctx, 'slotTopper', CX, y0 - pad - 22, 2.5, { flash: res && !this.encDone ? 0.15 * (0.5 + 0.5 * Math.sin(time * 12)) : 0 });
    // The window: the same gradient and payline band, the reels clipped inside, shaded top and bottom.
    const g = ctx.createLinearGradient(0, y0, 0, y0 + mh);
    g.addColorStop(0, '#2a1240');
    g.addColorStop(0.5, '#1c0b2e');
    g.addColorStop(1, '#0c0418');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = 'rgba(255,224,138,0.06)';
    ctx.fillRect(x0, y0 + PITCH, mw, PITCH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, mw, mh);
    ctx.clip();
    this.slotReels.forEach((rv, r) => rv.draw(ctx, x0 + PITCH * (r + 0.5), y0 + PITCH * 1.5, time));
    const shade = ctx.createLinearGradient(0, y0, 0, y0 + mh);
    shade.addColorStop(0, 'rgba(8,2,16,0.75)');
    shade.addColorStop(0.18, 'rgba(8,2,16,0)');
    shade.addColorStop(0.82, 'rgba(8,2,16,0)');
    shade.addColorStop(1, 'rgba(8,2,16,0.75)');
    ctx.fillStyle = shade;
    ctx.fillRect(x0, y0, mw, mh);
    ctx.restore();
    ctx.fillStyle = COLORS.gold;
    for (let i = 1; i < 5; i++) ctx.fillRect(x0 + PITCH * i - 1, y0 + 4, 2, mh - 8);
    // Payline arrows, and the line itself lit along a paying run.
    const my = y0 + PITCH * 1.5;
    ctx.fillStyle = 'rgba(255,224,138,0.9)';
    for (const [ax, dir] of [[x0 - pad + 2, 1], [x0 + mw + pad - 2, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(ax, my - 8);
      ctx.lineTo(ax + dir * 8, my);
      ctx.lineTo(ax, my + 8);
      ctx.fill();
    }
    const win = this.slotWin;
    if (win) {
      const w = Math.min(1, (this.slotClock.time - win.at) / 0.2) * PITCH * win.count;
      ctx.fillStyle = win.count >= 4 ? '#ff8a3a' : COLORS.goldLight;
      ctx.fillRect(x0 + 8, my - 2, Math.max(0, w - 16), 4);
    }
    // Under the machine: the paytable (3 / 4 / 5 in a row); a pull's win; then the totals.
    const ty = y0 + mh + pad + 30;
    if (!res || !this.encDone) this.drawPaytable(ctx, ty);
    if (win) drawText(ctx, win.text, CX, ty + 46, 3, win.count >= 4 ? '#ff8a3a' : COLORS.goldLight, { punch: 1 + 0.1 * Math.max(0, 1 - (this.slotClock.time - win.at) * 3) });
    if (res?.pulls?.length && !this.encDone) drawText(ctx, `PULL ${Math.max(1, this.encLanded + (this.slotReels.some((rv) => rv.spinning) ? 1 : 0))} OF ${res.pulls?.length ?? 0}`, CX, ty + 92, 2, COLORS.textDim);
    // The session so far (playtest: only the last pull's pay showed).
    if (res && !this.encDone) {
      const so = (res.pulls ?? []).slice(0, this.encLanded).reduce((a, pl) => ({ chips: a.chips + pl.gain.chips, hp: a.hp + pl.gain.hp, maxHp: a.maxHp + pl.gain.maxHp }), { chips: 0, hp: 0, maxHp: 0 });
      const parts = [so.chips && `+${so.chips} CHIPS`, so.hp && `+${so.hp} HP`, so.maxHp && `+${so.maxHp} MAX HP`].filter(Boolean);
      if (parts.length) drawText(ctx, `SO FAR: ${parts.join('  ')}`, CX, ty + 120, 2, COLORS.goldLight);
    }
    if (res && this.encDone) {
      const gains = res.gains ?? [];
      drawText(ctx, res.title, CX, ty + 4, 4, gains.length ? COLORS.goldLight : '#ff8a7a', { punch: 1 + 0.03 * Math.sin(time * 6) });
      gains.forEach((gn, i) => drawText(ctx, gn, CX, ty + 50 + i * 28, 2.5, COLORS.goldLight));
    }
  }

  /** LUCKY SEVENS' paytable: each symbol and what 3 / 4 / 5 in a row pays (WILD stands in for any). */
  private drawPaytable(ctx: CanvasRenderingContext2D, y: number): void {
    const cols: [SlotSym, string][] = [
      ['seven', SLOT.chips.seven!.map((n) => (this.run ? atStakes(this.run, n) : n)).join(' / ')],
      ['chip', SLOT.chips.chip!.map((n) => (this.run ? atStakes(this.run, n) : n)).join(' / ')],
      ['heart', 'HP'],
      ['star', 'UPGRADE'],
      ['relic', 'RELIC'],
      ['wild', 'ANY'],
    ];
    // Laid out by width (the chip numbers are longer than the words), centred under the machine.
    const icon = 40;
    const gap = 30;
    const widths = cols.map(([, label]) => icon + textWidth(label, 1.75));
    let x = CX - (widths.reduce((a, b) => a + b, 0) + gap * (cols.length - 1)) / 2;
    cols.forEach(([sym, label], i) => {
      drawSprite(ctx, SLOT_ART[sym], x + 16, y, 2);
      drawText(ctx, label, x + icon, y, 1.75, sym === 'wild' ? COLORS.textDim : COLORS.goldLight, { align: 'left' });
      x += widths[i] + gap;
    });
  }

  private drawCabinets(ctx: CanvasRenderingContext2D, time: number): void {
    drawText(ctx, 'CHOOSE YOUR MACHINE', W / 2, 60, 5, COLORS.goldLight);
    drawText(ctx, 'WIN RUNS TO UNLOCK MORE.', W / 2, 104, 2, COLORS.textDim);
    this.drawStakePicker(ctx, time);
    const sel = stakeOf(this.stakeSel);
    CABINET_ORDER.forEach((id, i) => {
      const h = this.cards[i];
      if (!h || h.scale <= 0.01) return;
      const cab = CABINETS[id];
      const open = this.cabinetUnlocked.has(id);
      const best = this.stakeFor(id);
      // Unlocked, but not up to the chosen stake yet: dimmed, behind a padlock in that stake's colour.
      const barred = open && best < this.stakeSel;
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
      this.panel(ctx, -h.w / 2, -h.h / 2, h.w, h.h, hover ? COLORS.goldLight : open && !barred ? COLORS.gold : '#4a4058');
      ctx.save();
      if (barred) ctx.globalAlpha *= 0.4;
      drawSprite(ctx, (open ? cab.sprite : 'cabinetLocked') as SpriteId, 0, -h.h / 2 + 100 + (hover ? Math.sin(time * 4) * 3 : 0), 2.6);
      // "???" at one size: its size used to give away the hidden name's length.
      drawText(ctx, open ? cab.name : '???', 0, 8, open && cab.name.length > 10 ? 2 : 3, open ? COLORS.goldLight : COLORS.textDim);
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
      if (open) this.cardLadder(ctx, id, h.h / 2 - 20, time);
      if (barred) this.ladderChip(ctx, 0, -h.h / 2 + 100, sel.level, 'locked', time, 22, sel.color);
      ctx.restore();
    });
  }

  /** A machine's own HIGH STAKES progress along its card's foot: the same 6 chips in miniature. */
  private cardLadder(ctx: CanvasRenderingContext2D, id: CabinetId, y: number, time: number): void {
    const best = this.stakeFor(id);
    const dx = 22;
    const x0 = -((STAKES.length - 1) * dx) / 2;
    // The rail: lit up to this machine's best stake.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - 2, y - 3, (STAKES.length - 1) * dx + 4, 6);
    for (const s of STAKES) {
      const x = x0 + s.level * dx;
      if (s.level > 0 && s.level <= best) {
        ctx.fillStyle = s.color;
        ctx.fillRect(x - dx, y - 1, dx, 2);
      }
    }
    for (const s of STAKES) {
      const x = x0 + s.level * dx;
      const on = s.level <= best;
      const here = s.level === this.stakeSel;
      if (here) {
        // The chosen stake's socket: a ring, so every card answers "can I play this one?".
        ctx.fillStyle = on ? '#ffffff' : '#ff8a7a';
        ctx.beginPath();
        ctx.arc(x, y, 10 + (on ? Math.sin(time * 5) * 0.8 : 0), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? s.color : '#2a2238';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (on) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(x - 3, y - 3, 2, 2);
      }
    }
  }

  /** HIGH STAKES: one track of 6 chips. The chosen one is raised and glowing; earned ones are lit; the rest are padlocked. */
  private drawStakePicker(ctx: CanvasRenderingContext2D, time: number): void {
    const max = this.maxStake();
    const y = TRACK.y;
    const xOf = (k: number) => TRACK.x0 + k * TRACK.dx;
    const hov = this.stakeHits.findIndex((b) => b.hover);
    drawText(ctx, 'HIGH STAKES', xOf(0) - 40, y, 2, COLORS.textDim, { align: 'right' });
    // The rail: each stake stacks on the ones below it, so the chosen stake's colour fills back to WHITE.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(xOf(0), y - 5, xOf(5) - xOf(0), 10);
    for (let k = 1; k < STAKES.length; k++) {
      ctx.fillStyle = k <= this.stakeSel ? STAKES[k].color : k <= max ? '#4a4058' : '#241c30';
      ctx.fillRect(xOf(k - 1), y - 3, TRACK.dx, 6);
    }
    // ACT 3 (the Dealer) comes with GREEN and every stake above it: a bracket under those chips.
    const ay = y + 32;
    const act3On = this.stakeSel >= STAKE.act3;
    const ac = act3On ? '#7dff7a' : '#4a4058';
    const ax0 = xOf(STAKE.act3) - 14;
    const ax1 = xOf(5) + 14;
    const label = '+ ACT 3';
    const lw = 84;
    const mid = (ax0 + ax1) / 2;
    ctx.fillStyle = ac;
    ctx.fillRect(ax0, ay - 4, 2, 4);
    ctx.fillRect(ax1 - 2, ay - 4, 2, 4);
    ctx.fillRect(ax0, ay, mid - lw / 2 - ax0, 2);
    ctx.fillRect(mid + lw / 2, ay, ax1 - mid - lw / 2, 2);
    drawText(ctx, label, mid, ay + 1, 1.5, ac);
    // The chips (the chosen one last, so its glow sits on top).
    const order = STAKES.map((s) => s.level).sort((a, b) => (a === this.stakeSel ? 1 : b === this.stakeSel ? -1 : a - b));
    for (const k of order) {
      const b = this.stakeHits[k];
      const chosen = k === this.stakeSel;
      const state = k > max ? 'locked' : chosen ? 'chosen' : k < this.stakeSel ? 'stacked' : 'earned';
      const deny = this.stakeDeny.level === k ? (performance.now() - this.stakeDeny.at) / 1000 : 9;
      const shake = deny < 0.3 ? Math.sin(deny * 60) * 4 * (1 - deny / 0.3) : 0;
      const sc = b ? b.scale : 1;
      const r = chosen ? 15 + 6 * this.stakePop : 15;
      const yy = y - (chosen ? 7 * this.stakePop : 0) - (b?.hover && !chosen ? 3 : 0);
      ctx.save();
      ctx.translate(xOf(k) + shake, yy);
      ctx.scale(sc, sc);
      this.ladderChip(ctx, 0, 0, k, state, time, r);
      if (b?.hover && !chosen) {
        ctx.strokeStyle = COLORS.goldLight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    // One line: what the hovered (or chosen) stake adds, after pips for the stakes stacked under it.
    const show = hov >= 0 ? hov : this.stakeSel;
    const s = STAKES[show];
    const locked = show > max;
    const ly = 697;
    const pip = 16;
    const pips = STAKES.slice(1, show);
    const nameW = textWidth(s.name, 2) + 12;
    let ruleScale = 2;
    if (textWidth(s.rule, 2) + nameW > 980) ruleScale = 1.5;
    const ruleW = textWidth(s.rule, ruleScale);
    const lockW = locked ? 26 : 0;
    const pipsW = pips.length ? pips.length * pip + 20 : 0;
    const total = lockW + pipsW + nameW + 14 + ruleW;
    let x = W / 2 - total / 2;
    ctx.save();
    if (locked) {
      ctx.globalAlpha *= 0.75;
      drawSprite(ctx, 'icoLock', x + 9, ly, 2);
      x += lockW;
    }
    for (const p of pips) {
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(x + 6, ly, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x + 6, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      x += pip;
    }
    if (pips.length) {
      drawText(ctx, '+', x + 4, ly, 2, COLORS.textDim);
      x += 20;
    }
    // The stake's name as a tag in its own colour.
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 2, ly - 12, nameW + 4, 24);
    ctx.fillStyle = s.color;
    ctx.fillRect(x, ly - 10, nameW, 20);
    drawText(ctx, s.name, x + nameW / 2, ly + 1, 2, COLORS.outline, { outline: null });
    x += nameW + 14;
    drawText(ctx, s.rule, x, ly, ruleScale, locked ? COLORS.textDim : COLORS.text, { align: 'left' });
    ctx.restore();
    for (const b of this.buttons) if (!this.stakeHits.includes(b)) this.drawButton(ctx, b, time);
  }

  /**
   * A HIGH STAKES chip on the track. chosen: glowing; stacked: below the chosen one (in play);
   * earned: unlocked but above the chosen one; locked: dark, with a padlock (`tint` colours its rim).
   */
  private ladderChip(ctx: CanvasRenderingContext2D, x: number, y: number, level: number, state: 'chosen' | 'stacked' | 'earned' | 'locked', time: number, r: number, tint?: string): void {
    const s = stakeOf(level);
    ctx.save();
    if (state === 'chosen') {
      ctx.save();
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16 + 6 * Math.sin(time * 4);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (state === 'locked') {
      ctx.fillStyle = COLORS.outline;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tint ?? '#3a2e52';
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1428';
      ctx.beginPath();
      ctx.arc(x, y, r - (tint ? 3 : 1), 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, r >= 20 ? 'lock' : 'icoLock', x, y, 2, { alpha: tint ? 1 : 0.7 });
      ctx.restore();
      return;
    }
    ctx.globalAlpha *= state === 'earned' ? 0.55 : 1;
    this.stakeChip(ctx, x, y, level, state === 'chosen' ? time : 0, r);
    ctx.restore();
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
    // (Fights heal in no act now: the old ACT 3 warning is gone. Playtest.)
    if (this.shopItems.some((it) => !it.sold && it.option.kind === 'relic' && LEGENDARY.has(it.option.relic))) drawText(ctx, 'A LEGENDARY ON THE SHELF.', CX, 140, 2, COLORS.goldLight);
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
    const w = 340;
    const pinned = this.shopSel === this.shopHits.indexOf(h);
    const tall = 46 + lines.length * 20 + (pinned ? 22 : 0);
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
    lines.forEach((l, k) => drawRich(ctx, l, x + 12, y + 46 + k * 20, 2, COLORS.text, { align: 'left' }));
    if (pinned) drawText(ctx, (this.run?.player.chips ?? 0) >= item.price ? 'CLICK AGAIN TO BUY' : 'NOT ENOUGH CHIPS', x + 12, y + 46 + lines.length * 20 + 4, 1.5, COLORS.textDim, { align: 'left' });
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
    // The ribbon sits on the case's top edge (above it, it met the upper shelf's name plates).
    if (legend) this.legendTag(ctx, 0, -48, time);
    ctx.restore();
    const tag = this.shopTags[this.shopHits.indexOf(h)];
    this.drawPriceTag(ctx, h, tag, item, afford, time);
    // Its name under the tag, always, on a dark plate (R13: the shelf was icons only until you hovered).
    if (!item.sold && tag && h.scale > 0.5) {
      const title = describeOption(o, this.run ?? undefined).title;
      const color = o.kind === 'gild' || o.kind === 'charmLevel' ? CHARM_COLOR[o.enh] : o.kind === 'symLevel' ? '#5ad8e8' : relic ? (legend ? '#ffd23f' : '#e0c0ff') : COLORS.text;
      // One line that fits the shelf spacing (the shelf is SHELF.gap wide per item).
      const max = Math.floor((SHELF.gap - 16) / 7.5);
      const text = title.length > max ? title.slice(0, max - 1) + '.' : title;
      const tw = text.length * 7.5 + 10;
      const ty = tag.y + TAG.h / 2 + 8;
      ctx.fillStyle = 'rgba(16,10,26,0.88)';
      ctx.fillRect(tag.x - tw / 2, ty - 7, tw, 14);
      drawText(ctx, text, tag.x, ty, 1.25, color);
    }
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
    const plural = (n: number) => `${n} FIGHT${n === 1 ? '' : 'S'}`;
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
    // The acts, one row each; then each loop by the loop it was in (playtest: loops were guessed in fours and split),
    // the last loop fight by fight.
    const out: FightRecord[] = [];
    const looped = run.records.filter((r) => r.loop !== undefined);
    const acts = run.records.filter((r) => r.loop === undefined);
    for (const act of [1, 2, 3]) {
      const list = acts.filter((r) => (r.act ?? 1) === act);
      if (list.length) out.push(sum(list, `ACT ${act}: ${plural(list.length)}`, act));
    }
    const older = acts.filter((r) => (r.act ?? 1) > 3);
    if (older.length) out.push(sum(older, `ENDLESS: ${plural(older.length)}`, 4));
    const loops = [...new Set(looped.map((r) => r.loop!))];
    const lastLoop = loops[loops.length - 1];
    for (const n of loops) {
      const list = looped.filter((r) => r.loop === n);
      if (n === lastLoop) out.push(...list);
      else out.push(sum(list, `LOOP ${n}: ${plural(list.length)}`, 4));
    }
    return out;
  }

  private drawOver(ctx: CanvasRenderingContext2D): void {
    const run = this.run!;
    // The leaderboard post's result (the rest of the meta is on the RESULTS card).
    if (this.onlineLine) drawText(ctx, this.onlineLine, CX, 563, 1.5, COLORS.goldLight);
    const trueEnding = run.won && run.act >= 3;
    const busted = !!run.endless;
    drawText(ctx, busted ? (run.endless!.turbo ? `YOU BROKE THE BANK! ${fmtNum(endlessScore(run))}` : `BUSTED ON LOOP ${run.endless!.loop}: SCORE ${fmtNum(endlessScore(run))}`) : trueEnding ? 'THE DEALER FOLDS!' : run.won ? 'THE WHEEL STOPS!' : 'RUN OVER', CX, 44, busted ? 5 : 6, run.won && !busted ? COLORS.goldLight : busted ? '#ffd23f' : COLORS.danger);
    const reached = `${CABINETS[run.cabinet].name}  -  ${busted ? `BEAT THE DEALER, THEN ${run.records.filter((r) => r.loop !== undefined).length} ENDLESS FIGHTS` : run.won ? `BEAT ALL ${totalFights(run)} FIGHTS${trueEnding ? ' - TRUE ENDING' : ''}` : `FELL AT FIGHT ${run.records.length} OF ${totalFights(run)} (ACT ${run.act})`}`;
    // DEATH RECAP: its own full-width line under the table (the most important line on a loss).
    const lastRec = run.records[run.records.length - 1];
    const loss = lastRec && !lastRec.won ? lastRec : undefined;
    const recap = loss?.hurt?.length ? `KILLED BY ${loss.enemy}: ${loss.hurt.map(([k, n]) => `${k} ${n}`).join(' - ')}${loss.stuck ? `  (FROZEN ${loss.stuck[0]} OF ${loss.stuck[1]} SPINS)` : ''}` : '';
    // The lines between the table and the reels panel: stacked so they never overlap it or each other.
    const lines: [string, string][] = [];
    if (recap) lines.push([recap, COLORS.danger]);
    // THE RUN SCORE and its biggest parts (x the stake), right under the recap.
    const parts = scoreParts(run).sort((x, y) => y[1] - x[1]);
    lines.push([`SCORE ${fmtNum(runScoreOf(run))} = ${parts.slice(0, 4).map(([k, n]) => `${k} ${fmtNum(n)}`).join(' + ')}${parts.length > 4 ? ' + MORE' : ''}${run.stake ? `, X${1 + SCORE.stakeStep * run.stake}` : ''}`, COLORS.goldLight]);
    if (this.unlockedNow.length) lines.push([`NEW SLOT MACHINE UNLOCKED: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}!`, COLORS.goldLight]);
    if (this.rideOffer) lines.push(['YOUR WIN IS BANKED. ENDLESS GOES ON UNTIL YOU BUST.', COLORS.goldLight]);

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
    // Chips left (a won run scores them).
    const chipLine = `  -  ${run.player.chips} CHIPS${run.won && !run.endless ? ` (+${run.player.chips * CHIP_SCORE * (1 + 0.5 * run.stake)} SCORE)` : ''}`;
    drawText(ctx, (run.stake > 0 ? `${reached}  -  STAKE ${run.stake} ${stakeOf(run.stake).name}` : reached) + chipLine, CX, 88, run.stake > 0 ? 1.5 : 2, COLORS.textDim);
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
    drawText(ctx, 'SPINS', 715, 142 + top, 2, COLORS.textDim);
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
      if (compact && r.act && r.act > 2 && rows[i - 1]?.act === 2) {
        ctx.fillStyle = '#7dff7a';
        ctx.fillRect(328, y - rowH / 2 - 1, 916, 2);
        this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 3', '#7dff7a');
      }
      if (compact && i === 0) this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 1', COLORS.goldLight);
      // Tight rows (a GREEN run has 18) get smaller text, so the act dividers run between rows, not through them.
      const ts = rowH < 18 ? 1.25 : rowH < 22 ? 1.5 : 2;
      drawSprite(ctx, (r.portrait ?? 'enemyPortrait') as SpriteId, 350, y, compact ? (rowH < 22 ? 0.65 : 0.9) : 1.4);
      drawText(ctx, r.enemy, 376, y, ts, r.won ? COLORS.text : COLORS.danger, { align: 'left' });
      drawText(ctx, `${r.turns}`, 715, y, ts, COLORS.text);
      drawText(ctx, `${r.hpBefore}-${r.hpAfter}`, 821, y, ts, r.hpAfter > 0 ? COLORS.text : COLORS.danger);
      if (compact) {
        const parts = [...(r.bonuses ?? []), r.eliteRelic ? RELICS[r.eliteRelic].name : '', r.eliteChips ? `ELITE +${r.eliteChips} CHIPS` : '', r.pick ? takenLabel(r.pick) : '', ...(r.bought ?? []).map((b) => takenLabel(b))].filter(Boolean);
        const what = parts.length ? parts.join(', ') : r.won ? '' : 'DEFEATED';
        drawText(ctx, what.length > 30 ? `${what.slice(0, 29)}...` : what, 919, y, rowH < 22 ? 1.25 : 1.5, r.won ? '#c9a0ff' : COLORS.danger, { align: 'left' });
        return;
      }
      if (r.pick) drawText(ctx, takenLabel(r.pick), 919, y - 6, 2, '#c9a0ff', { align: 'left' });
      const extra = [
        ...(r.bonuses ?? []),
        r.eliteRelic ? `SPOILS: ${RELICS[r.eliteRelic].name}` : '',
        ...(r.bought ?? []).map((b) => `BUY: ${takenLabel(b)}`),
        r.chips ? `+${r.chips} CHIPS` : '',
      ].filter(Boolean).join('  ');
      if (extra) drawText(ctx, extra, 919, y + 13, 1.25, COLORS.textDim, { align: 'left' });
      else if (!r.won) drawText(ctx, 'DEFEATED', 919, y, 2, COLORS.danger, { align: 'left' });
      if (r.rocksAdded) drawText(ctx, `+${r.rocksAdded} ROCK${r.rocksAdded > 1 ? 'S' : ''}`, 786, y + 13, 1.25, '#c9bba8');
    });
    for (const b of this.buttons) this.drawButton(ctx, b, 0);
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
        wrap(a.name, Math.floor((cw - 16) / (textWidth('MM', 1.5) - textWidth('M', 1.5)))).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 52 + k * 15, 1.5, COLORS.goldLight));
        // Line spacing to fit the font (11 px lines touched: R13 B2).
        wrap(a.text, Math.floor((cw - 16) / (textWidth('MM', 1) - textWidth('M', 1)))).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 84 + k * 14, 1, COLORS.textDim));
      });
      if (g.achievements.length > 4) drawText(ctx, `+${g.achievements.length - 4} MORE ON THE TROPHIES SCREEN`, W / 2, y + 156, 1.5, COLORS.textDim);
      y += 172;
    }
    if (this.shareLine) drawText(ctx, this.shareLine, W / 2, 548, 1.5, '#7dff7a');
    if (this.resultsCopy) this.drawButton(ctx, this.resultsCopy, 0);
    drawText(ctx, r.done ? 'PRESS TO CONTINUE' : 'PRESS TO SKIP', W / 2, 620, 2, r.done ? COLORS.text : COLORS.textDim, { alpha: 0.8 + 0.2 * Math.sin(performance.now() / 200) });
  }
}
