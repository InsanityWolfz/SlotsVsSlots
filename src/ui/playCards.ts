/**
 * SPIN CHOICES (experiment): the dealt plays, as three small cards between the machines, while your reels wait to
 * pay. Tap a card (or Q / W / E) to play it; SPIN takes the line as it landed.
 */
import type { Game } from '../game';
import { playCard } from '../core/plays';
import { BEZEL, MACHINE_CX, MACHINE_TOP, MACHINE_W, reelWindow } from '../present/layout';
import { drawText } from '../render/text';
import { by } from './input';
import { drawChip, drawPanel, KIT, T } from './kit';
import { wrap } from './runScreens';

const GAP_L = MACHINE_CX.player + MACHINE_W / 2 + 24;
const GAP_R = MACHINE_CX.enemy - MACHINE_W / 2 - 24;
const CARD_W = GAP_R - GAP_L;
const CARD_H = 70;
const CARD_STEP = 80;
const CARD_TOP = MACHINE_TOP + 22;

/** Card i's box: x, y, w, h. */
export const playRect = (i: number): [number, number, number, number] => [GAP_L, CARD_TOP + i * CARD_STEP, CARD_W, CARD_H];

/** The card under a tap, or -1. */
export function playAt(g: Game, x: number, y: number): number {
  const offers = g.playOffers;
  if (!offers) return -1;
  return offers.findIndex((_p, i) => {
    const [cx, cy, w, h] = playRect(i);
    return x >= cx && x < cx + w && y >= cy && y < cy + h;
  });
}

export function drawPlays(ctx: CanvasRenderingContext2D, g: Game, t: number): void {
  // The play just made (and the payline hint): this build has no HOLD chip to say it on.
  const note = g.toolNote;
  if (g.phase === 'fighting' && note && performance.now() - note.at < (note.ms ?? 1500)) {
    const win = reelWindow('player');
    drawChip(ctx, note.text, win.x + win.w / 2, win.y + win.h + BEZEL - 1, { scale: T.body, color: '#ffe28a', frame: KIT.frame, fill: KIT.fill });
  }
  const offers = g.playOffers;
  if (!offers || g.phase !== 'fighting') return;
  const keys = ['Q', 'W', 'E'];
  offers.forEach((p, i) => {
    const [x, y, w, h] = playRect(i);
    const { title, text } = playCard(p);
    const lit = g.playHover === i;
    drawPanel(ctx, x, y, w, h, { lit });
    drawText(ctx, title, x + w / 2, y + 16, T.small, KIT.title);
    wrap(text, Math.floor((w - 12) / (6 * T.small)))
      .slice(0, 2)
      .forEach((l, k) => drawText(ctx, l, x + w / 2, y + 36 + k * 16, T.small, KIT.text));
    const key = by({ touch: '', mouse: '', keys: keys[i], pad: keys[i] });
    if (key) drawText(ctx, key, x + 10, y + 16, T.small, KIT.dim, { align: 'left' });
  });
  const [, y0] = playRect(offers.length);
  const call = by({ touch: 'TAP A PLAY, OR SPIN TO TAKE IT', mouse: 'CLICK A PLAY, OR SPIN TO TAKE IT', keys: 'Q W E: A PLAY. SPACE: TAKE IT', pad: 'Q W E: A PLAY. [X]: TAKE IT' });
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  wrap(call, Math.floor(CARD_W / (6 * T.small))).forEach((l, k) =>
    drawText(ctx, l, GAP_L + CARD_W / 2, y0 + 4 + k * 16, T.small, pulse > 0.5 ? '#fff6c8' : '#ffe28a'),
  );
}
