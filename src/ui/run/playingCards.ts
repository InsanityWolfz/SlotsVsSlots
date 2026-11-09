import { COLORS } from '../../present/layout';
import { artId, drawSprite } from '../../render/sprites';
import { drawText } from '../../render/text';

/** A rank's face letter: 2-10, J, Q, K, A (14). */
export const RANK = (n: number) => (n === 14 ? 'A' : n === 13 ? 'K' : n === 12 ? 'Q' : n === 11 ? 'J' : `${n}`);
/** The suits' art (tools/cards.mjs): hearts, diamonds, clubs, spades. */
const SUIT = ['Heart', 'Diamond', 'Club', 'Spade'];
const COURT: Record<number, string> = { 11: 'faceJack', 12: 'faceQueen', 13: 'faceKing' };
const CARD = '#f4eee0';
const RED = '#e8374b';
const BLACK = '#1a1426';
/** The court's panel: a warm tint inside a gold frame, like a real court card's box. */
const PANEL = '#e8dcc0';
const FRAME = '#d9a640';

/** A card's size at k = 1 (TWENTY-ONE deals at 0.75, so they overlap 64 apart). */
export const CARD_W = 112;
export const CARD_H = 156;

/** Art pixels on screen: whole pixels at any card scale, so the pips stay crisp on the smaller TWENTY-ONE cards. */
const px = (base: number, k: number) => Math.max(1, Math.round(base * k));

/**
 * A playing card (rank 2-14; 0 = its back), `sx` its width scale (for the flip). The suit is cosmetic: `slot` (the card's
 * place on the table) shifts it, so two cards of one rank never look identical (playtest: a tie read as a rigged deck).
 * The index (rank and a small pip) sits top-left, the part an overlapped hand still shows; then a big pip, the ace's
 * bigger, or a court figure in a framed panel (QA UI-09: the diamond read as a plus, the club as a plane, a Jack was a
 * letter and a pip).
 */
export function drawPlayingCard(ctx: CanvasRenderingContext2D, x: number, y: number, rank: number, sx: number, k = 1, slot = 0): void {
  const w = CARD_W * k * Math.max(0.04, sx);
  const h = CARD_H * k;
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
  if (!rank) {
    // The back: the house's red, a gold frame, a lattice round a chip (its edge colour fills any rounding margin).
    ctx.fillStyle = '#8e1f3a';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    const s = Math.max(1, Math.floor(Math.min((CARD_W * k) / 37, h / 52)));
    if (sx > 0.04) drawSprite(ctx, artId('cardBackDeck'), x, y, s, { sx: Math.max(0.04, sx) });
    return;
  }
  ctx.fillStyle = CARD;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  if (sx < 0.35) return;
  const suit = (rank * 7 + slot) % 4;
  const col = suit < 2 ? RED : BLACK;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  // The index. (Outlined in the card's own colour: the usual dark outline swallowed the black ranks. A two-digit 10 at
  // full size ran off the card's edge.)
  const r = RANK(rank);
  ctx.save();
  ctx.scale(k, k);
  drawText(ctx, r, r.length > 1 ? -34 : -38, -56, r.length > 1 ? 2.5 : 3, col, { outline: CARD });
  ctx.restore();
  drawSprite(ctx, artId(`pip${SUIT[suit]}S`), -38 * k, -29 * k, px(3, k));
  const court = COURT[rank];
  if (court) {
    // The court: a gold-framed panel, the figure in it (cut off at the chest, as on a real card).
    const fx = 16 * k;
    const fy = 22 * k;
    const p = px(3, k);
    const bw = 22 * p;
    const bh = 30 * p;
    ctx.fillStyle = FRAME;
    ctx.fillRect(fx - bw / 2 - p, fy - bh / 2 - p, bw + 2 * p, bh + 2 * p);
    ctx.fillStyle = PANEL;
    ctx.fillRect(fx - bw / 2, fy - bh / 2, bw, bh);
    drawSprite(ctx, artId(court), fx, fy, p);
  } else if (rank === 14) drawSprite(ctx, artId(`pip${SUIT[suit]}L`), 8 * k, 16 * k, px(5, k));
  else drawSprite(ctx, artId(`pip${SUIT[suit]}L`), 12 * k, 20 * k, px(4, k));
  ctx.restore();
}
