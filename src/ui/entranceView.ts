/** A boss's entrance, drawn over the fight (present/directorEntrance.ts plays it): the name plate and the boss's prop. */
import { PLATE, plateWidth } from '../present/directorEntrance';
import { potPos } from '../present/directorBoss';
import type { EntranceView } from '../present/stage';
import { artId, drawPortrait, drawSprite, hasSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';
import { drawMarquee, drawWell, KIT, T } from './kit';

/** The boss's name in its card's red (the HUD's boss name colour). */
const BOSS_RED = '#ff8a7a';

export function drawEntrance(ctx: CanvasRenderingContext2D, en: EntranceView, time: number): void {
  // THE HOUSE: its pot glows (under the plate; the pot sits in the gutter).
  if (en.glow > 0.01) {
    const p = potPos();
    for (let r = 3; r >= 1; r--) {
      ctx.fillStyle = `rgba(255,201,74,${(0.1 * en.glow).toFixed(3)})`;
      ctx.fillRect(Math.round(p.x - 40 * r), Math.round(p.y - 26 * r), 80 * r, 52 * r);
    }
  }
  const k = Math.max(0, en.plate);
  const alpha = Math.min(1, k * 1.6) * (1 - en.out);
  if (alpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(PLATE.cx, PLATE.cy - 40 * en.out);
    const sc = 0.6 + 0.4 * k;
    ctx.scale(sc, sc);
    const w = plateWidth(en);
    const x = -w / 2;
    const y = -PLATE.h / 2;
    drawMarquee(ctx, x, y, w, PLATE.h, time, { frame: '#a8202a', pitch: 18 });
    // The portrait in its well.
    drawWell(ctx, x + 18, y + 14, 112, 112);
    drawPortrait(ctx, en.portrait as SpriteId, x + 74, y + 70, 104 / 24);
    drawText(ctx, en.eyebrow, x + 150, y + 34, T.small, KIT.dim, { align: 'left' });
    drawText(ctx, en.name, x + 150, y + 68, T.title, BOSS_RED, { align: 'left' });
    drawText(ctx, en.line, x + 150, y + 106, T.body, KIT.text, { align: 'left' });
    // THE WHEEL's wheel and THE DEALER's card land in a well at the plate's right end.
    if (en.boss === 'wheel' || en.boss === 'dealer') drawWell(ctx, x + w - 110, y + 24, 92, 92);
    // THE WHEEL's wheel, turning once, the ball going round the other way.
    if (en.wheel !== undefined) {
      const wx = x + w - 64;
      const a = en.wheel;
      drawSprite(ctx, artId('wheelTopper'), wx, y + 70, 4, { rot: a });
      drawSprite(ctx, artId('ball'), wx + Math.cos(-a * 1.7) * 26, y + 70 + Math.sin(-a * 1.7) * 26, 1);
    }
    ctx.restore();
  }
  // THE DEALER's card (on top of the plate once dealt).
  const c = en.card;
  if (c && en.out < 1) {
    const face = c.flip > 0.5;
    const sx = Math.max(0.08, Math.abs(Math.cos(c.flip * Math.PI)));
    const id = face ? artId('card') : artId(hasSprite('cardBack') ? 'cardBack' : 'card');
    drawSprite(ctx, id, c.x, c.y - 40 * en.out, 4.4, { rot: c.rot, sx, alpha: 1 - en.out });
  }
}
