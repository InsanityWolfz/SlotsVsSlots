import { HUD_W } from '../present/hud';
import { COLORS, H, HUD_TOP, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, W } from '../present/layout';
import { artId, drawSprite, hasSprite } from '../render/sprites';
import { drawText } from '../render/text';
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
}

const machine = (side: 'player' | 'enemy'): [number, number, number, number] => [MACHINE_CX[side] - MACHINE_W / 2 - 8, MACHINE_TOP - 8, MACHINE_W + 16, MACHINE_H + 16];
const hud = (side: 'player' | 'enemy'): [number, number, number, number] => [MACHINE_CX[side] - HUD_W / 2 - 12, HUD_TOP - 12, HUD_W + 24, 156];

/** The tutorial script, by moment. */
export const TUTORIAL: Record<'preview' | 'fight' | 'firstSpin' | 'ability' | 'draft' | 'shop' | 'next', Tip[]> = {
  preview: [
    { title: 'WELCOME TO SLOTS VS. SLOTS', text: 'TWO SLOT MACHINES FIGHT. YOU DON\'T AIM OR HOLD ANYTHING: THE REELS DECIDE THE FIGHT. YOUR CHOICES COME BETWEEN FIGHTS.' },
    { title: 'A RUN', text: 'EACH ACT IS 5 FIGHTS AND A BOSS. BEAT THE HOUSE (ACT 1) AND THE MIRROR (ACT 2) TO CLEAR THE RUN. LOSE ONCE AND THE RUN IS OVER.' },
    { title: 'YOUR NEXT OPPONENT', text: 'THIS CARD SHOWS WHO YOU FIGHT NEXT: ITS HP, ITS REELS AND WHAT ITS ABILITY DOES TO YOUR MACHINE. PRESS FIGHT! WHEN READY.' },
  ],
  fight: [
    { title: 'YOUR SLOT MACHINE', text: 'THIS IS YOU. THE MIDDLE ROW IS THE PAYLINE: EVERY SYMBOL ON IT PAYS. MATCHES PAY MORE: 2 OF A KIND IS A PAIR, 3 IS A JACKPOT.', rect: machine('player') },
    { title: 'THE SYMBOLS', text: 'SWORDS HIT THE ENEMY. SHIELDS BLOCK THE NEXT HIT. BOLTS CHARGE YOUR SPECIAL. WILDS MATCH ANYTHING. ROCKS AND JUNK PAY NOTHING.', rect: [MACHINE_CX.player - MACHINE_W / 2 - 8, MACHINE_TOP + MACHINE_H / 3 - 8, MACHINE_W + 16, MACHINE_H / 3 + 16] },
    { title: 'YOUR HP AND SPECIAL', text: 'RED IS HP, BLUE IS SHIELD. FILL THE ENERGY PIPS WITH BOLTS AND YOUR SPECIAL FIRES ON ITS OWN FOR BIG DAMAGE.', rect: hud('player') },
    { title: 'THE ENEMY', text: 'ENEMIES SPIN TOO. THEIR ABILITY ICON CHARGES EACH TURN. WHEN IT FIRES THEY WRITE ON YOUR MACHINE: SLIME, FREEZE, ROCKS AND WORSE.', rect: hud('enemy') },
    { title: 'SPIN, AUTO AND SPEED', text: 'PRESS SPIN (OR SPACE) EACH TURN, OR TURN ON AUTO AND WATCH. 1X 2X 4X SETS THE SPEED. CLICK ANYWHERE TO SKIP AN ANIMATION.', rect: [MACHINE_CX.player - 175, 610, 390, 80] },
  ],
  firstSpin: [{ title: 'THAT\'S A TURN', text: 'EVERY GROUP ON THE PAYLINE PAID OUT. THEN THE ENEMY SPINS. TRADE BLOWS UNTIL ONE MACHINE HITS 0 HP.' }],
  ability: [{ title: 'ENEMY ABILITY!', text: 'THAT WAS ITS ABILITY. EVERY ENEMY HAS ITS OWN. THE CARD BEFORE EACH FIGHT TELLS YOU WHAT IT DOES, SO YOU CAN BUILD AGAINST IT.', rect: hud('enemy') }],
  draft: [
    { title: 'YOU WON! PICK A REWARD', text: 'AFTER EVERY WIN, PICK 1 CARD. CARDS ADD, SWAP OR REMOVE SYMBOLS ON A REEL, HEAL YOU, OR GIVE A RELIC.' },
    { title: 'CHARMS AND RELICS', text: 'A CHARM UPGRADES ONE SYMBOL ON ONE REEL (GOLD PAYS X2). THE SAME CHARM ON ALL 3 REELS IS A FULL SET: IT LEVELS UP. RELICS ARE PASSIVE RULES THAT LAST THE WHOLE RUN.' },
  ],
  shop: [{ title: 'THE CASHIER', text: 'WINS EARN CHIPS. SPEND THEM HERE, OR BANK THEM: BANKED CHIPS EARN INTEREST AND SHIELD YOU AGAINST THE BOSSES.' }],
  next: [
    { title: 'FORKS AND ELITES', text: 'SOMETIMES YOU CHOOSE BETWEEN TWO OPPONENTS. ELITES ARE TOUGHER BUT PAY BETTER. BONUS WHEEL AND RELIC RUSH VOUCHERS CAN DROP MID-FIGHT: WIN TO CASH THEM.' },
    { title: 'YOU\'RE ON YOUR OWN', text: 'THAT\'S EVERYTHING. THIS RUN KEEPS GOING. WIN RUNS TO UNLOCK NEW SLOT MACHINES AND HIGHER STAKES. GOOD LUCK!' },
  ],
};

export class Coach {
  private queue: Tip[] = [];
  private idx = 0;
  private shownAt = 0;
  private done: (() => void) | null = null;
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

  show(tips: Tip[], done?: () => void): void {
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
    const lines = wrap(tip.text, 56);
    const bh = 82 + lines.length * 22;
    const bw = 700;
    const cy = r ? (r[1] + r[3] / 2 > H / 2 ? 150 : H - 60 - bh / 2) : H / 2;
    const bx = r && r[0] + r[2] / 2 < W / 2 && cy === H / 2 ? W - bw - 40 : W / 2 - bw / 2;
    const by = cy - bh / 2;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 6, by - 6, bw + 12, bh + 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(bx, by, bw, bh);
    drawText(ctx, tip.title, bx + bw / 2, by + 22, 3, COLORS.goldLight);
    lines.forEach((l, k) => drawText(ctx, l, bx + bw / 2, by + 52 + k * 22, 2, COLORS.text));
    drawText(ctx, `TAP OR CLICK: NEXT (${this.idx + 1}/${this.queue.length})`, bx + 20, by + bh - 14, 1.5, COLORS.textDim, { align: 'left', alpha: 0.7 + 0.3 * Math.sin(t * 4) });
    // SKIP: a real button, so touch players can bail out too (S on a keyboard).
    const sw = 150;
    const sx = bx + bw - sw - 12;
    const sy = by + bh - 30;
    this.skipBox = [sx - 4, sy - 6, sw + 8, 36];
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(sx, sy, sw, 24);
    ctx.fillStyle = '#3a2d52';
    ctx.fillRect(sx + 2, sy + 2, sw - 4, 20);
    drawText(ctx, 'SKIP TUTORIAL', sx + sw / 2, sy + 12, 1.5, COLORS.text);
  }
}
