import { UNIT, unitsRound } from '../../core/config';
import { GATEKEEPER, OWNER_RULES, wheelChipShare, type EnemyDef } from '../../core/enemies';
import { startCharge } from '../../core/fight';
import { type RunState } from '../../core/run';
import { scaledAbility } from '../../core/fightSetup';
import { COLORS, H, W } from '../../present/layout';
import { artId, drawPortrait, type SpriteId } from '../../render/sprites';


export type ScreenMode = 'none' | 'draft' | 'next' | 'over' | 'shop' | 'cabinet' | 'encounter';

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
  // No lone last word ("HEALS / 60", "THE HOUSE ALWAYS WINS... / IT"): the line above hands its last word down when
  // it keeps two and the pair still fits.
  const n = lines.length;
  if (n >= 2 && !lines[n - 1].includes(' ')) {
    const prev = lines[n - 2].split(' ');
    const moved = `${prev[prev.length - 1]} ${lines[n - 1]}`;
    if (prev.length >= 3 && moved.length <= maxChars) {
      lines[n - 2] = prev.slice(0, -1).join(' ');
      lines[n - 1] = moved;
    }
  }
  return lines;
}

export interface Hit {
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

export type Btn = Hit & {
  label: string;
  /** Secondary: a quiet button that never breathes (only the screen's next step does). */
  minor?: boolean;
  /** Primary, but not breathing right now (a fork's other path). */
  quiet?: boolean;
  /** A primary button's face colour (RED OR BLACK's BLACK); the default is red. */
  tint?: string;
  /** Only a hit area (the screen draws what's under it: SCRATCH-OFF's panels). */
  ghost?: boolean;
  /** The kit's quiet style: grey until hovered (chrome like MENU). */
  quietStyle?: boolean;
  /** A casino chip you tap (the card tables' bets): its colour; the button is drawn as the chip, its label on its face. */
  chip?: string;
  /** Draws the face's content instead of the label (centred at 0, 0). */
  icon?: (ctx: CanvasRenderingContext2D) => void;
  /** The label's size (default: the heading size when it fits, else body). */
  textScale?: number;
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

export const INPUT_GUARD_MS = 250;
/** CHOOSE YOUR MACHINE: the HIGH STAKES chip track (chip 0's centre, spacing, row). */
export const TRACK = { x0: W / 2 - 165, dx: 66, y: 640 };
/** YOUR BUILD: a fixed column on the left of every run screen (screens lay out to its right, around CX). */
export const BUILD = { x: 16, y: 16, w: 284, h: H - 32 };
/** CHOOSE YOUR PATH: the opener, the lanes (their stops' x, each lane's centre y and height), the Cashier, the boss. */
export const ROUTES = { opener: 370, x0: 500, gap: 104, y: [170, 320, 470], lane: 120, shop: 1080, boss: 1196 };
export const ROUTE_STOPS = 5;
/** A lane's row: three paths fill the rows, two (ENDLESS) take the outer ones. */
export const laneY = (i: number, n: number) => (n === 2 ? ROUTES.y[i * 2] : ROUTES.y[i]);
/** ENCOUNTER buy-in cards: their row, size and spacing. */
export const ENC = { cardY: 546, cardW: 210, cardH: 108, cardGap: 236 };
/** An offer's choice buttons: their row, width and spacing (three fit beside the build panel). */
export const OFFER = { y: 480, w: 270, gap: 296 };
/** A map node's tip: an enemy's mini card, or a stop's name and line. */
export type MapTip = { e?: EnemyDef; title?: string; sub?: string; x: number; y: number };
/** The middle of the space right of YOUR BUILD: run screens center on it. */
export const CX = (BUILD.x + BUILD.w + 12 + W) / 2;
/** RED OR BLACK: the wheel's centre, its offscreen size (drawn at half size, scaled x2), and the bet column's x. */
export const RL = { wheelX: CX - 170, wheelY: 300, px: 112, betX: CX + 220 };
/** CLAW MACHINE (in the table's place): the first prize's x, the step between prizes, the pit's y, the claw's resting x. */
export const CW = { x0: 536, gap: 130, pitY: 426, home: 500 };
/** Your chips: the same spot in the fights (game.ts draws them there too). */
export const CHIP_SPOT = { x: 44, y: 46 };
/** The Cashier's shelves: item centers per row (the counter, then the relics behind the glass). */
export const SHELF = { y: [262, 440], gap: 164 };
/** The shop's price tags (they buy): size and offset under the item's centre. */
export const TAG = { w: 108, h: 40, y: 70 };
/** The enemy card's flip tab (bottom-right): big enough for a thumb. */
export const FLIP_TAB = { w: 40, h: 32 };

/** The casino floor behind every run screen: a dark carpet with a faint diamond weave (cached). */
let carpet: HTMLCanvasElement | null = null;
/** % of fights each enemy wins (the sim's kill rate), for the danger skulls on its card. */
export const KILL_RATE: Record<string, number> = { slime: 1.9, frost: 1.8, golem: 1.8, gremlin: 2.4, thief: 2.7, brute: 3.1, bomber: 4.8, hexer: 4.2, vampire: 4.0, mimic: 11.1, counterfeiter: 3.8, repo: 7.7, sharp: 8.7, pitboss: 6.3, croupier: 1.9 };

export function drawBackdrop(ctx: CanvasRenderingContext2D): void {
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
export const rounds = (turns: number) => `${turns} SPIN${turns === 1 ? '' : 'S'}`;

/** The ability's effect in a few words (the panel's front shows this under the cadence pips). */
export function abilityWhat(e: EnemyDef, run?: RunState): string {
  if (!e.ability) return '';
  // (ENDLESS grows the flat numbers with the loop: the card says what the fight will do.)
  const p = (run ? scaledAbility(run, e.ability, true) : e.ability)?.power ?? e.ability.power;
  // THE WHEEL: what one chip left on your reels hits for at NO MORE BETS (as the fight does it).
  const per = run ? Math.max(UNIT, unitsRound(run.player.maxHp * wheelChipShare(run.cabinet, !!run.endless))) : 0;
  const what: Record<string, string> = {
    flood: `SPILLS ON ${p} OF YOUR SYMBOLS`,
    smash: `SWINGS FOR ${p}`,
    fortify: `GAINS ${p} SHIELD`,
    blizzard: `FREEZES ${p} REEL${p === 1 ? '' : 'S'} FOR 2 SPINS`,
    pilfer: `STEALS ${p} SYMBOL${p > 1 ? 'S' : ''}`,
    quake: `ADDS ${p} ROCKS TO YOUR REELS`,
    jam: `JAMS 1 REEL FOR ${p} SPIN${p === 1 ? '' : 'S'}`,
    jackpot: 'SKIMS HALF THE POT AND HITS YOU WITH IT',
    carpet: `STICKS ${p} IOUS ON YOUR SYMBOLS`,
    curse: `JINXES ${p} REEL${p > 1 ? 'S' : ''} FOR 3 SPINS`,
    bloodmoon: `HEALS ${p} HP`,
    gulp: `EATS ${p} OF YOUR CHIPS`,
    bets: per ? `EACH BET LEFT ON YOUR REELS HITS FOR ${per}` : `EACH BET LEFT ON YOUR REELS HITS FOR ${Math.round(wheelChipShare(undefined) * 100)}% OF YOUR MAX HP`,
    launder: `TAKES ${p} OF YOUR CHIPS AND HEALS ${p * 3 * UNIT}`,
    mark: `MARKS ${p} OF YOUR SYMBOLS`,
    penalty: `TAKES 2 OF YOUR CHARMS FOR THE FIGHT AND HITS FOR ${p}`,
    repo: 'TAKES A CHARM FOR THE FIGHT',
    houseTake: `RAKES YOUR PAYS FOR ${p} SPIN${p === 1 ? '' : 'S'}`,
    deal: 'DEALS A BUST',
    owner: 'SWAPS BETWEEN A NEW SABOTAGE AND THE HAMMER',
    hammer: `HITS FOR ${Math.round(OWNER_RULES.hammer * 100)}% OF YOUR MAX HP AND PIERCES SHIELDS`,
  };
  return what[e.ability.kind] ?? '';
}

/** FIRST, SECOND... (the term sheet: a count is digits, an order is a word). */
const ORDINAL = ['', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH'];
const nth = (n: number) => ORDINAL[n] ?? `${n}TH`;

export function abilityText(e: EnemyDef, every: number, run?: RunState): string {
  if (!e.ability) return '';
  // One shape for every enemy (playtest 2026-11-03: "STEAL EVERY 3 TURNS: STEALS 1 SYMBOL" said it twice): what, then
  // when, in two short sentences. On an enemy's own card the clock is theirs, so EVERY 3 SPINS needs no owner (the term
  // sheet's rule 1, user 2026-11-12: "EVERY 3 OF THEIR SPINS" read as a template). The first spin keeps THEIR: the
  // fight's own SPIN n counter counts both machines, so a bare SPIN 2 would point at the wrong spin.
  if (e.ability.kind === 'deal') return `DEALS A BUST EVERY ${every} SPINS. HE PLAYS 3 HANDS AND EACH IS HARDER`;
  // The first spin it fires on, from the fight's own head start (QA RULES-15: regulars fire on their first spin, the card said EVERY 3).
  const first = every - startCharge({ ...e.ability, every }, { regular: !e.isBoss, act: e.act ?? run?.act ?? 1, endless: !!run?.endless });
  // THE REPO MAN takes on his first spin and once more, then he's done (QA RULES-03).
  if (e.ability.kind === 'repo') {
    const spins = Array.from({ length: GATEKEEPER.maxTakes }, (_, i) => nth(first + i * every));
    if (spins.length < 2) return `TAKES A CHARM FOR THE FIGHT ON HIS ${spins[0]} SPIN`;
    return `TAKES A CHARM FOR THE FIGHT ON HIS ${spins.slice(0, -1).join(', ')} AND ${spins[spins.length - 1]} SPINS`;
  }
  const what = abilityWhat(e, run);
  if (first < every) return `${what}. STARTS ON THEIR ${nth(first)} SPIN AND REPEATS EVERY ${every}`;
  // (FREEZES 1 REEL FOR 2 SPINS EVERY 3 SPINS would say SPINS twice.)
  return / SPINS?$/.test(what) ? `${what}. REPEATS EVERY ${every} SPINS` : `${what} EVERY ${every} SPINS`;
}

/** The stage light behind each enemy's portrait (the panel's front). */
export const STAGE_TINT: Record<string, string> = {
  slime: '#5ed15a', frost: '#5ad8e8', thief: '#c9a0ff', hexer: '#c9a0ff', golem: '#c9bba8',
  brute: '#ff9a3a', gremlin: '#ff9a3a', bomber: '#ff9a3a', vampire: '#ff6a5a', house: '#ff6a5a', pitboss: '#ff6a5a',
  dealer: '#ff6a5a', owner: '#ffd23f', wheel: '#ff3a2e', croupier: '#ffd23f', sharp: '#ffd23f', counterfeiter: '#ffd23f', mimic: '#ffd23f',
};
/** A shorter line for the front when a boss's blurb won't fit on one line (the full blurb is on the back). */
export const FRONT_BLURB: Record<string, string> = { dealer: 'THE HOUSE HAS A PARTNER' };

/** A filled pixel disc (rows of rects, no anti-aliasing), centred on x, y. */
export function pixelDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, px = 2): void {
  ctx.fillStyle = color;
  const cx = Math.round(x);
  const cy = Math.round(y);
  for (let dy = -r; dy < r; dy += px) {
    const yy = dy + px / 2;
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - yy * yy)) / px) * px;
    if (half > 0) ctx.fillRect(cx - half, cy + dy, half * 2, px);
  }
}

/** A stake's casino chip in pixels: outline, its colour, white edge notches and a dark centre (r = outer radius). */
export function stakeDisc(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, r = 10, lit = true): void {
  pixelDisc(ctx, x, y, r + 2, COLORS.outline);
  pixelDisc(ctx, x, y, r, lit ? color : '#2a2238');
  if (!lit) return;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const n = Math.max(2, Math.round(r / 4));
  ctx.fillRect(Math.round(x) - 1 - n / 2 + 1, Math.round(y) - r, n, 3);
  ctx.fillRect(Math.round(x) - 1 - n / 2 + 1, Math.round(y) + r - 3, n, 3);
  ctx.fillRect(Math.round(x) - r, Math.round(y) - 1 - n / 2 + 1, 3, n);
  ctx.fillRect(Math.round(x) + r - 3, Math.round(y) - 1 - n / 2 + 1, 3, n);
  pixelDisc(ctx, x, y, Math.round(r * 0.45), 'rgba(0,0,0,0.35)');
}

/** A soft pixel spotlight pool (stepped bands, no gradient): the stage under a machine or a portrait. */
export function spotlight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, alpha = 0.18, clip?: [number, number, number, number]): void {
  ctx.save();
  // In a well, the pool stays inside it (it spilled past the well's bottom edge).
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip[0], clip[1], clip[2], clip[3]);
    ctx.clip();
  }
  for (let k = 0; k < 3; k++) {
    ctx.globalAlpha *= k === 0 ? alpha : 1.6;
    const ww = Math.round(w * (1 - k * 0.28));
    const hh = Math.round(ww * 0.22);
    ctx.fillStyle = color;
    for (let dy = -hh; dy < hh; dy += 2) {
      const half = Math.floor((Math.sqrt(Math.max(0, 1 - (dy / hh) ** 2)) * ww) / 4) * 2;
      ctx.fillRect(Math.round(x) - half, Math.round(y) + dy, half * 2, 2);
    }
  }
  ctx.restore();
}

/** Draws a 32×32 character portrait at an integer scale `k` of its own pixels (24px art scales to the same box). */
export function bigPortrait(ctx: CanvasRenderingContext2D, id: SpriteId, x: number, y: number, k: number, o: { dim?: number; variant?: 'black'; alpha?: number } = {}): void {
  drawPortrait(ctx, id, x, y, (k * 32) / 24, o);
}
