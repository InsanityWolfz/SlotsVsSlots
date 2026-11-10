import { CABINET_ORDER, type CabinetId } from '../core/cabinets';
import { OVERTIME } from '../core/enemies';
import { demo } from '../demo';
import { HOLD } from '../core/fightSetup';
import { HUD_W } from '../present/hud';
import { COLORS, H, HUD_TOP, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, W } from '../present/layout';
import { artId, drawSprite, hasSprite } from '../render/sprites';
import { drawText, textWidth } from '../render/text';
import { by as forInput, drawPrompt } from './input';
import { drawPanel, KIT, T } from './kit';
import { wrap } from './runScreens';

/**
 * TUTORIAL callouts: a dimmed screen with one area lit up, a pointer and a text box. The game
 * pauses the fight clock while one is open; click (or space) moves on. The fight itself is
 * never touched: the tutorial only explains.
 */
export interface Tip {
  title: string;
  text: string;
  /** Area to light up: x, y, w, h. */
  rect?: [number, number, number, number];
  /** The words for a mouse, a keyboard or a pad, where they differ from the touch words (`text`). */
  mouse?: string;
  keys?: string;
  pad?: string;
}

/** A tip's words for the device in hand. */
export const tipText = (tip: Tip): string => forInput({ touch: tip.text, mouse: tip.mouse, keys: tip.keys, pad: tip.pad ?? tip.keys ?? tip.mouse ?? tip.text });

// (The tutorial's words: short plain sentences, no semicolons or colons, a comma only in a list. User, 2026-11-10: "this is a video
// game not a memo".)
const PAIR_TAIL = 'YOUR NEXT SPIN KEEPS THEM AND ROLLS THE LAST REEL FOR A JACKPOT. HOLD WHILE THE ENEMY SPINS.';

const machine = (side: 'player' | 'enemy'): [number, number, number, number] => [MACHINE_CX[side] - MACHINE_W / 2 - 8, MACHINE_TOP - 8, MACHINE_W + 16, MACHINE_H + 16];
const hud = (side: 'player' | 'enemy'): [number, number, number, number] => [MACHINE_CX[side] - HUD_W / 2 - 12, HUD_TOP - 12, HUD_W + 24, 142];

/** The tutorial script, by moment. */
export const TUTORIAL: Record<'preview' | 'fight' | 'firstSpin' | 'hold' | 'buildUp' | 'ability' | 'draft' | 'shop' | 'next', Tip[]> = {
  // Three callouts before the first SPIN, then each rule the first time it happens (11 before the first SPIN was a
  // wall of text, and its first line sold the weak point: expert playtest 2026-11-06).
  preview: [
    {
      title: 'WELCOME TO REEL BRAWL',
      text: 'TWO SLOT MACHINES FIGHT. THIS CARD SHOWS WHO YOU FIGHT NEXT. TAP ? FOR ITS RULES. PRESS FIGHT! TO START.',
      mouse: 'TWO SLOT MACHINES FIGHT. THIS CARD SHOWS WHO YOU FIGHT NEXT. CLICK ? FOR ITS RULES. PRESS FIGHT! TO START.',
      keys: 'TWO SLOT MACHINES FIGHT. THIS CARD SHOWS WHO YOU FIGHT NEXT. PRESS ? FOR ITS RULES. PRESS FIGHT! TO START.',
    },
  ],
  fight: [
    { title: 'YOUR SLOT MACHINE', text: 'THE MIDDLE ROW IS THE PAYLINE. SWORDS HIT. SHIELDS BLOCK. MATCHING SYMBOLS FROM THE LEFT IS A PAIR. THREE IS A JACKPOT.', rect: machine('player') },
    {
      title: 'SPIN AND AUTO',
      text: 'PRESS SPIN TO SPIN. AUTO SPINS FOR YOU. SPEED GOES UP TO 8X.',
      mouse: 'PRESS SPIN OR SPACE TO SPIN. AUTO SPINS FOR YOU. SPEED GOES UP TO 8X.',
      keys: 'SPACE SPINS. A TURNS ON AUTO. KEYS 1 TO 4 SET THE SPEED.',
      pad: '[X] SPINS. [Y] TURNS ON AUTO. [LB] AND [RB] CHANGE THE SPEED.',
      rect: [MACHINE_CX.player - 200, 610, 400, 80],
    },
  ],
  firstSpin: [
    { title: 'THAT\'S A SPIN', text: 'EACH SYMBOL ON THE PAYLINE PAID ITS NUMBER. A PAIR PAYS X2. A JACKPOT PAYS X3. NOW THE ENEMY SPINS. FIRST TO 0 HP LOSES.' },
    { title: 'YOUR HP', text: 'RED IS HP. BLUE IS SHIELD AND BLOCKS THE NEXT HIT.', rect: hud('player') },
  ],
  hold: [
    {
      title: 'A PAIR! HOLD IT?',
      text: `${HOLD.perFight} HOLDS A FIGHT. TAP BOTH REELS OF YOUR PAIR TO HOLD THEM. ${PAIR_TAIL}`,
      mouse: `${HOLD.perFight} HOLDS A FIGHT. CLICK BOTH REELS OF YOUR PAIR TO HOLD THEM. ${PAIR_TAIL}`,
      keys: `${HOLD.perFight} HOLDS A FIGHT. PRESS Q AND W TO HOLD YOUR PAIR. ${PAIR_TAIL}`,
      pad: `${HOLD.perFight} HOLDS A FIGHT. HOLD YOUR PAIR WITH [DPAD] LEFT THEN UP. ${PAIR_TAIL}`,
      rect: machine('player'),
    },
  ],
  buildUp: [{ title: 'BUILD-UP', text: 'A SPIN WITH NO SWORD PAIR ADDS +25% TO YOUR NEXT ONE. IT GROWS UP TO X2. THE GOLD PLATE BETWEEN THE MACHINES SHOWS IT.' }],
  ability: [{ title: 'ENEMY ABILITY!', text: 'THAT WAS ITS ABILITY. THE ICON ON ITS HUD CHARGES EVERY SPIN. THE CARD BEFORE EACH FIGHT SAYS WHAT IT DOES.', rect: hud('enemy') }],
  draft: [
    { title: 'YOU WON! PICK A REWARD', text: 'PICK 1 CARD AFTER EVERY WIN. CARDS CHANGE THE SYMBOLS ON A REEL OR ADD A CHARM.' },
    { title: 'CHARMS', text: 'A CHARM SITS ON ONE SYMBOL AND WORKS WHEN IT PAYS. GOLD MULTIPLIES THE PAY. KEEN PIERCES SHIELDS. VAMP HEALS YOU.' },
  ],
  shop: [
    { title: 'THE CASHIER', text: 'WINS EARN CHIPS. SPEND THEM HERE ON LEVELS, RELICS AND HEALS.' },
    { title: 'THE BIG ONE', text: 'THE CASE ALWAYS HOLDS ONE LEGENDARY RELIC AT A HIGH PRICE. SAVED CHIPS EARN INTEREST AFTER EACH WIN.' },
  ],
  next: [
    { title: 'A RUN', text: 'EACH ACT IS A MAP WITH A BOSS AT THE END. PICK 1 OF 3 PATHS. ELITES ARE TOUGHER BUT PAY A RELIC. LOSE ONCE AND THE RUN IS OVER.' },
    { title: 'OVERTIME', text: `FIGHTS CAN'T DRAG ON. FROM SPIN ${2 * OVERTIME.from - 1} EVERY HIT GROWS WITH EACH OF YOUR SPINS. THE BOTTOM BAR SHOWS IT.` },
    {
      title: 'YOU\'RE ON YOUR OWN',
      // The demo unlocks nothing: it says what the full game has (demo playtest 2026-11-07).
      get text() {
        const d = demo();
        return d.on
          ? `THAT'S EVERYTHING. THE FULL GAME UNLOCKS ${CABINET_ORDER.length - (d.machines?.length ?? 0)} MORE SLOT MACHINES AND HIGHER STAKES. GOOD LUCK!`
          : 'THAT\'S EVERYTHING. WIN RUNS TO UNLOCK NEW SLOT MACHINES AND HIGHER STAKES. GOOD LUCK!';
      },
    },
  ],
};

/**
 * A machine's meter, explained once, ever: the first fight a player starts on that Slot Machine (TESLA is half the
 * demo and the tutorial is KNIGHT only: demo playtest 2026-11-07). From each meter's real rules (core/cabinets.ts),
 * in a few plain words (user, 2026-11-10: the long ones were "too wordy and descriptive").
 */
export const METER_TIPS: Partial<Record<CabinetId, Tip>> = {
  tesla: { title: 'LIGHTNING', text: 'BOLTS CHARGE IT. WHEN IT FILLS A STORM HITS THROUGH SHIELDS AND HEALS 15.', rect: hud('player') },
  jukebox: { title: 'VOLUME', text: 'NOTES TURN IT UP. A SPIN WITH NO NOTE TURNS IT DOWN. AT 6 THE DROP HITS WITH EVERY NOTE AND HEALS 15.', rect: hud('player') },
  joker: { title: 'JACKPOTS', text: 'WILDS FILL IT. WHEN IT FILLS ALL 3 PAYLINE SYMBOLS PAY JACKPOTS AND YOU HEAL 15.', rect: hud('player') },
  midas: { title: 'HIGH ROLLER', text: 'CHIPS FILL IT. WHEN IT FILLS YOUR NEXT HIT IS MULTIPLIED UP TO X2.5 AND YOU HEAL 15.', rect: hud('player') },
};

export class Coach {
  private queue: Tip[] = [];
  private idx = 0;
  private shownAt = 0;
  private done: (() => void) | null = null;
  /** The skip button's word: SKIP TUTORIAL, or SKIP for a callout outside the tutorial. */
  private skipWord = 'SKIP TUTORIAL';
  /** Where the SKIP TUTORIAL link was drawn (tap target). */
  private skipBox: [number, number, number, number] | null = null;

  /** A tap on SKIP TUTORIAL. */
  hitsSkip(x: number, y: number): boolean {
    const b = this.skipBox;
    return !!b && x >= b[0] && x <= b[0] + b[2] && y >= b[1] && y <= b[1] + b[3];
  }

  get active(): boolean {
    return this.idx < this.queue.length;
  }

  show(tips: Tip[], done?: () => void, skipWord = 'SKIP TUTORIAL'): void {
    this.skipWord = skipWord;
    this.queue = tips;
    this.idx = 0;
    this.shownAt = performance.now();
    this.done = done ?? null;
  }

  /** Next tip (ignores clicks for a moment so a double-click can't skip one unread). */
  advance(): void {
    if (!this.active || performance.now() - this.shownAt < 250) return;
    this.idx++;
    this.shownAt = performance.now();
    if (!this.active) this.finish();
  }

  skipAll(): void {
    if (!this.active) return;
    this.idx = this.queue.length;
    this.finish();
  }

  private finish(): void {
    const d = this.done;
    this.done = null;
    d?.();
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    const tip = this.queue[this.idx];
    if (!tip) return;
    const dim = 'rgba(4,2,10,0.62)';
    ctx.fillStyle = dim;
    const r = tip.rect;
    if (r) {
      const [x, y, w, h] = r;
      ctx.fillRect(0, 0, W, y);
      ctx.fillRect(0, y + h, W, H - y - h);
      ctx.fillRect(0, y, x, h);
      ctx.fillRect(x + w, y, W - x - w, h);
      const glow = 0.6 + 0.4 * Math.sin(t * 6);
      ctx.strokeStyle = `rgba(255,210,63,${glow})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      const bob = Math.sin(t * 6) * 5;
      if (hasSprite('tutorialPointer')) drawSprite(ctx, artId('tutorialPointer'), x + w / 2, y - 20 + bob, 3);
      else drawText(ctx, 'V', x + w / 2, y - 20 + bob, 3, COLORS.goldLight);
    } else ctx.fillRect(0, 0, W, H);
    // Text box: away from the lit area.
    // The kit's panel: the title at heading size, the words at body size, the hint and SKIP on a foot row.
    // A whole machine lit: the box goes beside it, over the other machine (above it, it covered the machine's top row).
    const beside = !!r && r[3] > 260;
    const lines = wrap(tipText(tip), beside ? 42 : 56);
    const bh = 116 + lines.length * 24;
    const bw = beside ? 560 : 744;
    let cy = r ? (r[1] + r[3] / 2 > H / 2 ? 150 : H - 60 - bh / 2) : H / 2;
    let bx = Math.round(r && r[0] + r[2] / 2 < W / 2 && cy === H / 2 ? W - bw - 40 : W / 2 - bw / 2);
    if (r && beside) {
      bx = r[0] + r[2] / 2 < W / 2 ? W - bw - 40 : 40;
      cy = Math.min(H - bh / 2 - 20, Math.max(bh / 2 + 20, r[1] + r[3] / 2));
    }
    const by = Math.round(cy - bh / 2);
    drawPanel(ctx, bx, by, bw, bh);
    drawText(ctx, tip.title, bx + bw / 2, by + 32, T.head, KIT.title);
    lines.forEach((l, k) => drawPrompt(ctx, l, bx + bw / 2, by + 68 + k * 24, T.body, KIT.text));
    const fy = by + bh - 28;
    const next = forInput({ touch: 'NEXT: TAP', mouse: 'NEXT: CLICK OR ANY KEY', keys: 'NEXT: ANY KEY', pad: 'NEXT: [A]' });
    drawPrompt(ctx, `${next} (${this.idx + 1}/${this.queue.length})`, bx + 24, fy, T.small, KIT.dim, { align: 'left', alpha: 0.7 + 0.3 * Math.sin(t * 4) });
    // SKIP: a real button (the kit's quiet style), so touch players can bail out too (S on a keyboard, START on a pad).
    const w = this.skipWord;
    const skip = forInput({ touch: w, keys: `S: ${w}`, pad: `[START] ${w}` });
    const sw = Math.max(176, textWidth(skip, T.small) + 28);
    const sh = 32;
    const sx = bx + bw - sw - 20;
    const sy = fy - sh / 2;
    this.skipBox = [sx - 4, sy - 4, sw + 8, sh + 8];
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(sx - 2, sy - 2, sw + 4, sh + 4);
    ctx.fillStyle = KIT.frameDim;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = '#1a1426';
    ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
    drawPrompt(ctx, skip, sx + sw / 2, fy + 1, T.small, KIT.text);
  }
}
