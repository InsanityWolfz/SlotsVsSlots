import { UNIT, unitsRound } from '../../core/config';
import { wheelChipShare, type EnemyDef } from '../../core/enemies';
import { scaledAbility, type RunState } from '../../core/run';
import { ABILITY_UI, abilityName } from '../../present/hud';
import { COLORS, H, W } from '../../present/layout';
import { artId, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';


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
/** Pixel suits (5x5): hearts, diamonds, clubs, spades. */
export const SUITS = [
  ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
  ['..X..', '.XXX.', 'XX.XX', '..X..', '.XXX.'],
  ['..X..', '.XXX.', 'XXXXX', '..X..', '.XXX.'],
];
export const RANK = (n: number) => (n === 14 ? 'A' : n === 13 ? 'K' : n === 12 ? 'Q' : n === 11 ? 'J' : `${n}`);
export function drawSuit(ctx: CanvasRenderingContext2D, suit: number, x: number, y: number, px: number): void {
  ctx.fillStyle = suit < 2 ? '#e8374b' : '#1a1426';
  SUITS[suit].forEach((row, r) => [...row].forEach((ch, c) => ch === 'X' && ctx.fillRect(Math.round(x + (c - 2.5) * px), Math.round(y + (r - 2.5) * px), px, px)));
}
/** A playing card (rank 2-14; 0 = its back), `sx` its width scale (for the flip). The suit is cosmetic: `slot` (the card's
 * place on the table) shifts it, so two cards of one rank never look identical (playtest: a tie read as a rigged deck). */
export function drawPlayingCard(ctx: CanvasRenderingContext2D, x: number, y: number, rank: number, sx: number, k = 1, slot = 0): void {
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
/** RED OR BLACK: the wheel's centre, its offscreen size (drawn at half size, scaled x2), and the bet column's x. */
export const RL = { wheelX: CX - 170, wheelY: 300, px: 112, betX: CX + 220 };
/** CLAW MACHINE: the first prize's x, the step between prizes, the pit's y, the claw's resting x. */
export const CW = { x0: CX - 300, gap: 130, pitY: 450, home: CX - 170 };
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
  const per = run ? Math.max(UNIT, unitsRound(run.player.maxHp * wheelChipShare(run.cabinet))) : 0;
  const what: Record<string, string> = {
    flood: `SPILLS ON ${p} OF YOUR SYMBOLS`,
    smash: `SWINGS FOR ${p}`,
    fortify: `GAINS ${p} SHIELD`,
    blizzard: `FREEZES ${p} REEL${p === 1 ? '' : 'S'} FOR 2 TURNS`,
    pilfer: `STEALS ${p} SYMBOL${p > 1 ? 'S' : ''}`,
    quake: `ADDS ${p} ROCKS TO YOUR STRIPS`,
    jam: `JAMS A REEL FOR ${p} TURN${p === 1 ? '' : 'S'}`,
    jackpot: 'SKIMS HALF THE POT AT YOU',
    carpet: `STICKS ${p} IOUS ON YOUR CELLS`,
    curse: `JINXES ${p} REEL${p > 1 ? 'S' : ''} FOR 3 TURNS`,
    bloodmoon: `HEALS ${p} HP`,
    gulp: `EATS ${p} OF YOUR CHIPS`,
    bets: per ? `EACH CHIP LEFT ON YOUR REELS HITS ${per}` : 'EACH CHIP LEFT ON YOUR REELS HITS 5% OF YOUR HP',
    launder: `TAKES ${p} CHIPS, HEALS ${p * 3 * UNIT}`,
    mark: `MARKS ${p} OF YOUR CELLS`,
    penalty: `HITS FOR ${p}`,
    repo: 'TAKES A CHARM',
    houseTake: `RAKES YOUR GROUPS FOR ${p} TURN${p === 1 ? '' : 'S'}`,
    deal: 'DEALS A BUST',
    owner: 'CHEATS A NEW WAY EACH TIME',
    hammer: 'HITS 40% OF YOUR MAX HP THROUGH SHIELDS',
  };
  return what[e.ability.kind] ?? '';
}

export function abilityText(e: EnemyDef, every: number, run?: RunState): string {
  if (!e.ability) return '';
  const ui = { ...ABILITY_UI[e.ability.kind], label: abilityName(e.ability.kind) };
  // THE REPO MAN takes on his first turn, then every few.
  if (e.ability.kind === 'repo') return `${ui.label} FROM TURN 1, THEN EVERY ${every}: TAKES ONE OF YOUR CHARMS. YOU GET IT BACK AFTER THE FIGHT`;
  if (e.ability.kind === 'deal') return `EVERY ${every} TURNS: BUST. THREE HANDS, EACH HARDER`;
  return `${ui.label} EVERY ${every} TURNS: ${abilityWhat(e, run)}`;
}

/** The stage light behind each enemy's portrait (the panel's front). */
export const STAGE_TINT: Record<string, string> = {
  slime: '#5ed15a', frost: '#5ad8e8', thief: '#c9a0ff', hexer: '#c9a0ff', golem: '#c9bba8',
  brute: '#ff9a3a', gremlin: '#ff9a3a', bomber: '#ff9a3a', vampire: '#ff6a5a', house: '#ff6a5a', pitboss: '#ff6a5a',
  dealer: '#ff6a5a', owner: '#ffd23f', wheel: '#ff3a2e', croupier: '#ffd23f', sharp: '#ffd23f', counterfeiter: '#ffd23f', mimic: '#ffd23f',
};
/** A shorter line for the front when a boss's blurb won't fit on one line (the full blurb is on the back). */
export const FRONT_BLURB: Record<string, string> = { dealer: 'THE HOUSE HAS A PARTNER' };
