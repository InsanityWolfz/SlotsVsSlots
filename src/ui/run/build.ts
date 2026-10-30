import { UNIT, type Enh, type SymbolId } from '../../core/config';
import { RELICS } from '../../core/relics';
import { charmLevel, charmTag, playerSymValue, symLevel } from '../../core/charms';
import { drawReelTable, runTable } from '../reelTable';
import { ACT1_GILDS, nightOf, type RunState } from '../../core/run';
import { CABINETS } from '../../core/cabinets';
import { stakeOf } from '../../core/stakes';
import { ENH_SPRITE } from '../../present/reel';
import { COLORS } from '../../present/layout';
import { drawPortrait, drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { defaultConfig } from '../../core/config';
import { BUILD, CHIP_SPOT } from './shared';
import { RunScreensBase } from './base';

/** Base symbol values (a symbol's number in the build panel). */
const CFG_BASE = defaultConfig().base;

export abstract class BuildPanel extends RunScreensBase {
  /** YOUR BUILD: a fixed column on the left of every run screen. Chips (top-left, where the fights show them too), you,
   * your reels as a tall table (a row per symbol and charm), your relics. */
  /** The BUILD pane popped out over a fight: chips and relic icons are drawn live by the fight itself. */
  drawBuildFor(ctx: CanvasRenderingContext2D, run: RunState): void {
    const keep = this.run;
    this.run = run;
    this.drawBuild(ctx, true);
    this.run = keep;
  }

  protected drawBuild(ctx: CanvasRenderingContext2D, inFight = false): void {
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
    if (hasSprite(cab.heroSprite)) drawPortrait(ctx, cab.heroSprite as SpriteId, x + 30, y + 94, 2);
    drawText(ctx, cab.hero, x + 60, y + 86, 2, COLORS.goldLight, { align: 'left' });
    drawText(ctx, run.endless ? `LOOP ${run.endless.loop}${nightOf(run) ? ` - ${nightOf(run)!.title}` : ''}` : `ACT ${run.act}${run.stake ? `  -  ${stakeOf(run.stake).name}` : ''}`, x + 60, y + 106, 1.5, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, x + 2, y + 138, w - 44);
    rule(y + 160);
    // Your reels: columns 1 2 3, a row per symbol (and charm).
    drawText(ctx, 'YOUR REELS', x + 12, y + 178, 2, COLORS.textDim, { align: 'left' });
    const table = runTable(p);
    drawReelTable(ctx, x + 8, y + 190, table, { colW: 90, rowH: 28, scale: 1.5, text: 2, maxRows: 9, levels: p.levels, ticket: p.relics.includes('ticket'), maxH: 190, badges: false });
    rule(y + 386);
    // SYMBOLS and CHARMS (user, 2026-10-08): every type you own, its level and what one is worth right now.
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
      // LV 1 sits dim, so what you've upgraded stands out (levels have no cap; Charms have none at all).
      const base = !e.enh && e.level <= 1;
      // A Charm is drawn alone on an empty cell (it can sit on several symbols: the symbol isn't part of it).
      if (e.enh) {
        ctx.fillStyle = '#4a3a66';
        ctx.fillRect(ex - 12, ey - 12, 24, 24);
        drawSprite(ctx, ENH_SPRITE[e.enh], ex, ey, 1.5, { dim: base ? 0.4 : 0 });
      } else drawSprite(ctx, e.sprite as SpriteId, ex, ey, 1.5, { dim: base ? 0.4 : 0 });
      if (!e.enh) drawText(ctx, `LV${e.level}`, ex + 18, ey, 2, base ? COLORS.textDim : COLORS.goldLight, { align: 'left', punch });
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
   * Chips and HP as the panel shows them: the run's, less a game's win that hasn't landed yet (the run is paid at the
   * call so a quit can't re-roll it; the screen pays it when the cards or the claw land).
   */
  protected shown(): { chips: number; hp: number; maxHp: number } {
    const p = this.run!.player;
    const landing = this.mode === 'encounter' ? this.chipsLanding : 0;
    return landing ? { chips: p.chips - landing, hp: p.hp, maxHp: p.maxHp } : p;
  }

  protected drawHp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
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
}
