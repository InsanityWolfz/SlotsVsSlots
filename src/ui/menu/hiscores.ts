import { CABINETS } from '../../core/cabinets';
import { runScore, type RunEntry } from '../../core/profile';
import { RELICS } from '../../core/relics';
import { STAKES } from '../../core/stakes';
import { COLORS, H, W } from '../../present/layout';
import { drawPortrait, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum } from '../../render/text';
import { CountUp, drawChip, drawPanel, drawWell, KIT, T } from '../kit';
import type { MenuScreen, Menus } from '../menus';
import { RelicTips } from '../relicTip';
import { heroSprite } from './data';
import { drawPageArrow } from './widgets';
import type { Button } from '../button';

/**
 * HISCORES: your best runs as a scoreboard. Each row: the rank, the hero's portrait, the Slot Machine, the stake as a
 * chip in its colour, how far the run got (and who ended it), its relics and the score, counting up as the page opens.
 * No runs yet: a ghost of the table and one red button, PLAY A RUN.
 */
const PER_PAGE = 6;
const ROW_Y = 176;
const ROW_PITCH = 80;
const ROW_H = 70;
const X0 = 40;
const XW = W - 80;
/** Column x's. */
const C = { rank: 80, hero: 148, name: 196, stake: 520, reached: 608, relics: 850, score: W - 64 };

let sort: 'best' | 'recent' = 'best';

export class HiscoresScreen implements MenuScreen {
  private page = 0;
  private tips = new RelicTips();
  private counts: CountUp[] = [];
  private arrows: Button[] = [];

  constructor(private m: Menus) {
    this.build();
  }

  private entries(): RunEntry[] {
    const runs = [...this.m.profile().runs];
    if (sort === 'recent') return runs.sort((a, b) => b.at - a.at);
    return runs.sort((a, b) => runScore(b) - runScore(a) || b.at - a.at);
  }

  private build(): void {
    const m = this.m;
    m.clearButtons();
    this.arrows = [];
    m.header(() => m.showMain());
    const list = this.entries();
    if (!list.length) {
      const play = m.btn('PLAY A RUN', W / 2, 470, 320, 64, () => m.cb.onNewRun(), T.head, { primary: true, idlePulse: true });
      m.guardSaved(play);
      return;
    }
    const best = m.btn('BEST', W - 250, 44, 130, 44, () => this.sortBy('best'));
    const recent = m.btn('RECENT', W - 110, 44, 130, 44, () => this.sortBy('recent'));
    best.toggled = sort === 'best';
    recent.toggled = sort === 'recent';
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (pages > 1) {
      const prev = m.btn('', W / 2 - 110, H - 34, 56, 40, () => this.turn(-1));
      const next = m.btn('', W / 2 + 110, H - 34, 56, 40, () => this.turn(1));
      prev.enabled = this.page > 0;
      next.enabled = this.page < pages - 1;
      this.arrows = [prev, next];
    }
    this.counts = list.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).map((e, i) => {
      const c = new CountUp(0, 0.7);
      void m.ui.wait(0.06 * i).then(() => c.set(runScore(e)));
      return c;
    });
  }

  private sortBy(s: 'best' | 'recent'): void {
    if (sort === s) return;
    sort = s;
    this.page = 0;
    this.build();
  }

  private turn(d: number): void {
    this.page = Math.max(0, this.page + d);
    this.build();
  }

  update(dt: number): void {
    for (const c of this.counts) c.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    this.m.drawHeader(ctx, 'HISCORES');
    const list = this.entries();
    if (!list.length) return this.drawEmpty(ctx);
    this.tips.begin();
    this.drawColumns(ctx, 1);
    const rows = list.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
    const top = Math.max(...list.map(runScore));
    rows.forEach((e, i) => this.drawRow(ctx, e, this.page * PER_PAGE + i + 1, ROW_Y + i * ROW_PITCH, this.counts[i]?.shown ?? runScore(e), runScore(e) === top, t));
    const pages = Math.ceil(list.length / PER_PAGE);
    if (pages > 1) drawText(ctx, `${this.page + 1}/${pages}`, W / 2, H - 34, T.body, COLORS.textDim);
  }

  drawOver(ctx: CanvasRenderingContext2D): void {
    this.arrows.forEach((b, i) => drawPageArrow(ctx, b, i === 0));
    this.tips.draw(ctx, this.m.mouse.x, this.m.mouse.y);
  }

  private drawColumns(ctx: CanvasRenderingContext2D, alpha: number): void {
    const y = 120;
    const o = { align: 'left' as const, alpha };
    drawText(ctx, 'HERO', C.hero - 26, y, T.small, COLORS.textDim, o);
    drawText(ctx, 'STAKE', C.stake, y, T.small, COLORS.textDim, { alpha });
    drawText(ctx, 'REACHED', C.reached, y, T.small, COLORS.textDim, o);
    drawText(ctx, 'RELICS', C.relics, y, T.small, COLORS.textDim, o);
    drawText(ctx, 'SCORE', C.score, y, T.small, COLORS.textDim, { align: 'right', alpha });
  }

  private reached(e: RunEntry): { text: string; color: string; sub: string } {
    if (e.won) {
      const text = e.acts >= 3 ? (e.loops ? `ENDLESS LOOP ${e.loops}` : 'BEAT THE DEALER') : 'CLEARED';
      return { text, color: COLORS.energy, sub: e.acts >= 3 ? 'TRUE ENDING' : 'THE WHEEL STOPPED' };
    }
    // A long name drops its first words (the adjective), as the fight HUD does: SPITEFUL COUNTERFEITER was cut mid-word.
    const words = (e.killer ?? '').split(' ');
    while (words.length > 1 && words.join(' ').length > 19) words.shift();
    return { text: `ACT ${e.act}, FIGHT ${e.killerFight ?? e.fights + 1}`, color: COLORS.text, sub: e.killer ? `BY ${words.join(' ')}` : 'RUN OVER' };
  }

  private drawRow(ctx: CanvasRenderingContext2D, e: RunEntry, rank: number, y: number, score: number, top: boolean, t: number): void {
    const cab = CABINETS[e.cabinet];
    const stake = STAKES[e.stake] ?? STAKES[0];
    drawPanel(ctx, X0, y - ROW_H / 2, XW, ROW_H, { frame: rank === 1 && sort === 'best' ? KIT.frame : e.won ? '#8a6a1c' : KIT.frameDim });
    // The stake's colour down the row's left edge.
    ctx.fillStyle = stake.color;
    ctx.fillRect(X0 + 3, y - ROW_H / 2 + 3, 6, ROW_H - 6);
    drawText(ctx, String(rank), C.rank, y, T.head, rank === 1 && sort === 'best' ? COLORS.energy : COLORS.textDim);
    // The hero, in a well.
    drawWell(ctx, C.hero - 30, y - 30, 60, 60, '#3a2d52');
    ctx.save();
    ctx.beginPath();
    ctx.rect(C.hero - 28, y - 28, 56, 56);
    ctx.clip();
    drawPortrait(ctx, heroSprite(e.cabinet), C.hero, y + 4, 8 / 3);
    ctx.restore();
    drawText(ctx, cab?.hero ?? '???', C.name, y - 12, T.body, KIT.title, { align: 'left' });
    const d = new Date(e.at);
    const tag = e.tutorial ? '  TUTORIAL' : '';
    drawText(ctx, `${cab?.name ?? ''}  ${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}${tag}`, C.name, y + 14, T.small, COLORS.textDim, { align: 'left' });
    drawChip(ctx, stake.name, C.stake, y, { scale: T.small, color: stake.color });
    const r = this.reached(e);
    drawText(ctx, r.text, C.reached, y - 12, T.body, r.color, { align: 'left' });
    drawText(ctx, r.sub.length > 22 ? `${r.sub.slice(0, 21)}.` : r.sub, C.reached, y + 14, T.small, COLORS.textDim, { align: 'left' });
    if (!e.won && e.killerPortrait) {
      drawWell(ctx, C.relics - 62, y - 22, 44, 44, '#3a1428');
      ctx.save();
      ctx.beginPath();
      ctx.rect(C.relics - 60, y - 20, 40, 40);
      ctx.clip();
      drawPortrait(ctx, e.killerPortrait as SpriteId, C.relics - 40, y + 3, 4 / 3);
      ctx.restore();
    }
    // The build: up to 6 relics (they answer the pointer).
    e.relics.slice(0, 6).forEach((rl, k) => {
      if (!RELICS[rl]) return;
      const rx = C.relics + 14 + k * 34;
      drawSprite(ctx, RELICS[rl].sprite as SpriteId, rx, y, 2);
      this.tips.add(rl, rx, y, 16, e.cabinet);
    });
    if (e.relics.length > 6) drawText(ctx, `+${e.relics.length - 6}`, C.relics + 14 + 6 * 34 - 8, y + 2, T.small, COLORS.textDim, { align: 'left' });
    if (!e.relics.length) drawText(ctx, 'NO RELICS', C.relics, y, T.small, COLORS.textDim, { align: 'left' });
    drawText(ctx, score < 1e7 ? score.toLocaleString('en-US') : fmtNum(score), C.score, y, T.head, top ? COLORS.energy : COLORS.text, { align: 'right', punch: top && !this.m.reduced() ? 1 + 0.03 * Math.sin(t * 4) : 1 });
  }

  /** No runs yet: the table's ghost, and one way to fill it. */
  private drawEmpty(ctx: CanvasRenderingContext2D): void {
    this.drawColumns(ctx, 0.35);
    ctx.save();
    ctx.globalAlpha *= 0.28;
    for (let i = 0; i < PER_PAGE; i++) {
      const y = ROW_Y + i * ROW_PITCH;
      drawPanel(ctx, X0, y - ROW_H / 2, XW, ROW_H, { frame: KIT.frameDim });
      drawText(ctx, String(i + 1), C.rank, y, T.head, COLORS.textDim);
      drawWell(ctx, C.hero - 30, y - 30, 60, 60);
      drawWell(ctx, C.name, y - 20, 200 - i * 14, 14);
      drawWell(ctx, C.name, y + 8, 120, 10);
      drawWell(ctx, C.stake - 34, y - 12, 68, 24);
      drawWell(ctx, C.reached, y - 20, 160, 14);
      drawWell(ctx, C.relics, y - 12, 34 * (5 - (i % 4)), 24);
      drawWell(ctx, C.score - 110 + i * 10, y - 12, 110 - i * 10, 24);
    }
    ctx.restore();
    // The call, in a panel over the ghost rows.
    const pw = 560;
    const ph = 210;
    drawPanel(ctx, W / 2 - pw / 2, 320, pw, ph);
    drawText(ctx, 'NO RUNS YET', W / 2, 362, T.head, KIT.title);
    drawText(ctx, 'EVERY RUN YOU FINISH LANDS HERE', W / 2, 402, T.body, COLORS.textDim);
  }
}
