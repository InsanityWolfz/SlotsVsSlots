import { CABINETS, type CabinetId } from '../../core/cabinets';
import { ACHIEVEMENTS, allTitles, levelOf, TRIMS, titlesOwned } from '../../core/meta';
import { foundCount, runScore, shownTitle, shownTrim } from '../../core/profile';
import { STAKES } from '../../core/stakes';
import { COLORS } from '../../present/layout';
import { artId, drawPortrait, drawSprite, hasSprite } from '../../render/sprites';
import { drawText, fmtNum } from '../../render/text';
import type { Button } from '../button';
import { CountUp, drawChip, drawPanel, drawWell, KIT, T } from '../kit';
import type { Menus } from '../menus';
import { collectionTotal, heroSprite } from './data';
import { Lifts } from './lift';
import type { TabBody } from './profile';

/**
 * PROFILE > STATS: you (name, level, title, the XP bar; the title you wear and your Slot Machine's trim, both
 * cosmetic) on the left, and your numbers in stat wells on the right, counting up as the tab opens.
 */
const LX = 60;
const LW = 560;
const RX = 660;
const RW = 560;
const TOP = 176;
const BOTTOM = 696;
const TITLE_Y = 394;
const TRIM_Y = 590;

interface Stat {
  label: string;
  value: number | null;
  /** A word instead of a number (a machine, a stake). */
  word?: string;
  color?: string;
  total?: number;
  hero?: CabinetId;
  count: CountUp;
}

export class StatsTab implements TabBody {
  private stats: Stat[];
  private titles: { b: Button; title: string; have: boolean; level: number }[] = [];
  private trims: { b: Button; i: number }[] = [];
  private lifts = new Lifts();

  constructor(private m: Menus) {
    const p = m.profile();
    const won = p.runs.filter((r) => r.won && !r.tutorial);
    const best = p.runs.reduce((a, e) => Math.max(a, runScore(e)), 0);
    const plays: Partial<Record<CabinetId, number>> = {};
    for (const r of p.runs) if (!r.tutorial && CABINETS[r.cabinet]) plays[r.cabinet] = (plays[r.cabinet] ?? 0) + 1;
    const fav = (Object.entries(plays) as [CabinetId, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topStake = won.reduce((a, r) => Math.max(a, r.stake), -1);
    const mk = (s: Omit<Stat, 'count'>): Stat => ({ ...s, count: new CountUp(0, 0.7) });
    this.stats = [
      mk({ label: 'RUNS PLAYED', value: p.stats.runs }),
      mk({ label: 'RUNS WON', value: p.stats.wins }),
      mk({ label: 'BEST SCORE', value: best }),
      mk({ label: 'LEVEL', value: levelOf(p.xp).level }),
      mk({ label: 'COLLECTION', value: foundCount(p), total: collectionTotal() }),
      mk({ label: 'TROPHIES', value: ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length, total: ACHIEVEMENTS.length }),
      mk({ label: 'FAVOURITE', value: null, word: fav ? CABINETS[fav].name : 'NONE YET', hero: fav }),
      mk({ label: 'TOP STAKE WON', value: null, word: topStake >= 0 ? STAKES[topStake].name : 'NONE YET', color: topStake >= 0 ? STAKES[topStake].color : COLORS.textDim }),
    ];
    this.stats.forEach((s, i) => void m.ui.wait(0.05 * i).then(() => s.count.set(s.value ?? 0)));
    this.buildPickers();
  }

  /** The TITLE and TRIM pickers: worn ones lit, locked ones quiet (a press says what unlocks them). */
  private buildPickers(): void {
    const m = this.m;
    const p = m.profile();
    const lvl = levelOf(p.xp).level;
    const owned = new Set(titlesOwned(lvl));
    const shown = shownTitle(p);
    const cw = 164;
    this.titles = allTitles().map((t, i) => {
      const have = owned.has(t.title);
      const x = LX + 24 + cw / 2 + (i % 3) * (cw + 8);
      const y = TITLE_Y + Math.floor(i / 3) * 46;
      const b = m.btn(t.title, x, y, cw, 38, () => {
        if (!have) return m.sounds.fizzle();
        m.cb.setTitle(t.title);
        this.refresh();
      }, T.small, { quiet: !have });
      b.toggled = t.title === shown;
      return { b, title: t.title, have, level: t.level ?? 1 };
    });
    const worn = shownTrim(p).id;
    this.trims = TRIMS.map((t, i) => {
      const x = LX + 24 + 24 + i * 56;
      const b = m.hit(x, TRIM_Y, 48, 48, () => {
        if (lvl < t.level) return m.sounds.fizzle();
        m.cb.setTrim(t.id);
      });
      void worn;
      return { b, i };
    });
  }

  private refresh(): void {
    const shown = shownTitle(this.m.profile());
    for (const t of this.titles) t.b.toggled = t.title === shown;
  }

  update(dt: number): void {
    for (const s of this.stats) s.count.update(dt);
    this.lifts.update(dt, this.trims.map((t) => t.b));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawYou(ctx);
    this.drawNumbers(ctx);
  }

  private drawYou(ctx: CanvasRenderingContext2D): void {
    const p = this.m.profile();
    const lv = levelOf(p.xp);
    drawPanel(ctx, LX, TOP, LW, BOTTOM - TOP, { title: 'YOU' });
    const x0 = LX + 24;
    drawText(ctx, p.name || 'PLAYER', x0, TOP + 40, T.head, KIT.title, { align: 'left' });
    drawChip(ctx, `LV ${lv.level}`, LX + LW - 64, TOP + 40, { scale: T.body });
    drawText(ctx, shownTitle(p), x0, TOP + 74, T.body, COLORS.text, { align: 'left' });
    const bw = LW - 48;
    drawWell(ctx, x0, TOP + 96, bw, 18);
    const fill = Math.round(((bw - 4) * lv.into) / Math.max(1, lv.need));
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(x0 + 2, TOP + 98, fill, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0 + 2, TOP + 98, fill, 4);
    drawText(ctx, `${lv.into}/${lv.need} XP TO LEVEL ${lv.level + 1}`, LX + LW - 24, TOP + 130, T.small, COLORS.textDim, { align: 'right' });
    // The pickers' headings and the line under them (what the pointer or focus is on).
    drawText(ctx, 'YOUR TITLE', x0, TITLE_Y - 40, T.body, COLORS.text, { align: 'left' });
    drawText(ctx, 'YOUR TRIM', x0, TRIM_Y - 52, T.body, COLORS.text, { align: 'left' });
    drawText(ctx, "YOUR SLOT MACHINE'S FRAME", LX + LW - 24, TRIM_Y - 52, T.small, COLORS.textDim, { align: 'right' });
    this.drawTrims(ctx);
    const tip = this.tip();
    if (tip) drawText(ctx, tip, LX + LW / 2, BOTTOM - 26, T.small, KIT.title);
  }

  private tip(): string {
    const lvl = levelOf(this.m.profile().xp).level;
    const t = this.titles.find((x) => x.b.hover);
    if (t) return t.have ? (t.b.toggled ? 'WORN' : 'PICK IT TO WEAR IT') : `REACH LEVEL ${t.level}`;
    const r = this.trims.find((x) => x.b.hover);
    if (r) {
      const tr = TRIMS[r.i];
      return lvl >= tr.level ? `${tr.name}${shownTrim(this.m.profile()).id === tr.id ? ': WORN' : ': PICK IT'}` : `${tr.name}: REACH LEVEL ${tr.level}`;
    }
    return '';
  }

  private drawTrims(ctx: CanvasRenderingContext2D): void {
    const p = this.m.profile();
    const worn = shownTrim(p).id;
    const lvl = levelOf(p.xp).level;
    for (const { b, i } of this.trims) {
      const t = TRIMS[i];
      const have = lvl >= t.level;
      const y = Math.round(b.y - 3 * this.lifts.lift(b));
      // The swatch: the trim's rim around its dark band, its crest on top (dark until earned).
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(b.x - 24, y - 24, 48, 48);
      ctx.fillStyle = t.id === worn ? COLORS.goldLight : have ? t.rim : '#2a2238';
      ctx.fillRect(b.x - 22, y - 22, 44, 44);
      ctx.fillStyle = have ? t.dark : '#1a1426';
      ctx.fillRect(b.x - 17, y - 17, 34, 34);
      if (have) {
        ctx.fillStyle = t.rim;
        ctx.fillRect(b.x - 19, y - 19, 38, 3);
      }
      if (hasSprite(t.crest)) drawSprite(ctx, artId(t.crest), b.x, y, 2, have ? {} : { variant: 'black' });
      if (!have) drawText(ctx, `LV ${t.level}`, b.x, y + 40, T.small, COLORS.textDim);
    }
  }

  private drawNumbers(ctx: CanvasRenderingContext2D): void {
    drawPanel(ctx, RX, TOP, RW, BOTTOM - TOP, { title: 'STATS' });
    const cols = 2;
    const ww = (RW - 24 * 2 - 16) / cols;
    const wh = 104;
    this.stats.forEach((s, i) => {
      const x = RX + 24 + (i % cols) * (ww + 16);
      const y = TOP + 32 + Math.floor(i / cols) * (wh + 16);
      drawWell(ctx, x, y, ww, wh);
      drawText(ctx, s.label, x + ww / 2, y + 26, T.small, COLORS.textDim);
      const cy = y + 66;
      if (s.value === null) {
        if (s.hero) {
          drawPortrait(ctx, heroSprite(s.hero), x + 46, y + 66, 8 / 3);
          drawText(ctx, s.word ?? "", x + ww / 2 + 36, cy, T.head, KIT.title);
        } else drawText(ctx, s.word ?? '', x + ww / 2, cy, T.head, s.color ?? KIT.title);
        return;
      }
      const n = fmtNum(s.count.shown);
      drawText(ctx, s.total ? `${n}/${s.total}` : n, x + ww / 2, cy, T.head, KIT.title);
    });
  }
}
