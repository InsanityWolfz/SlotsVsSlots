import { UNIT, type Enh, type SymbolId } from '../../core/config';
import { RELICS } from '../../core/relics';
import { CHARM_COLOR, charmLevel, charmTag, playerSymValue, symLevel } from '../../core/charms';
import { drawReelTable, runTable } from '../reelTable';
import { ACT1_GILDS, nightOf, type RunState } from '../../core/run';
import { CABINETS } from '../../core/cabinets';
import { stakeOf } from '../../core/stakes';
import { ENH_SPRITE } from '../../present/reel';
import { COLORS } from '../../present/layout';
import { drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { drawPanel, drawWell, KIT, T } from '../kit';
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
    drawPanel(ctx, x, y, w, h);
    const rule = (yy: number) => {
      ctx.fillStyle = '#2a2140';
      ctx.fillRect(x + 12, yy, w - 24, 2);
    };
    const head = (label: string, yy: number) => drawText(ctx, label, x + 14, yy, T.body, KIT.dim, { align: 'left' });
    // CHIPS: big, always in the same spot (the fights show them there too).
    if (!inFight) {
      drawSprite(ctx, 'chip', CHIP_SPOT.x, CHIP_SPOT.y, 3);
      drawText(ctx, `${this.shown().chips}`, CHIP_SPOT.x + 24, CHIP_SPOT.y, 4, COLORS.energy, { align: 'left', punch: this.chipPulse });
      drawText(ctx, 'CHIPS', x + w - 14, CHIP_SPOT.y + 4, T.small, KIT.dim, { align: 'right' });
    }
    rule(y + 60);
    // Who you are and how you're doing: the hero in a well, the act, the HP bar.
    const cab = CABINETS[run.cabinet];
    drawWell(ctx, x + 12, y + 68, 68, 68, '#2a2040');
    if (hasSprite(cab.heroSprite)) drawSprite(ctx, cab.heroSprite as SpriteId, x + 46, y + 102, 2);
    drawText(ctx, cab.hero, x + 92, y + 88, T.body, KIT.title, { align: 'left' });
    drawText(ctx, run.endless ? `LOOP ${run.endless.loop}${nightOf(run) ? ` - ${nightOf(run)!.title}` : ''}` : `ACT ${run.act}${run.stake ? `  -  ${stakeOf(run.stake).name}` : ''}`, x + 92, y + 112, T.small, KIT.dim, { align: 'left' });
    this.drawHp(ctx, x + 6, y + 154, w - 44);
    rule(y + 176);
    // Your reels: columns 1 2 3, a row per symbol (and Charm).
    head('YOUR REELS', y + 192);
    const table = runTable(p);
    drawReelTable(ctx, x + 10, y + 204, table, { colW: 88, rowH: 26, scale: 1.5, text: 2, maxRows: 9, levels: p.levels, ticket: p.relics.includes('ticket'), maxH: 168, badges: false });
    rule(y + 380);
    // SYMBOLS (user, 2026-10-08): every type you own, its level and what one is worth right now.
    const ticket = p.relics.includes('ticket');
    const syms = CABINETS[run.cabinet].symbols.filter((sym) => p.strips.some((st) => (st[sym] ?? 0) > 0));
    const charms = [...new Map(table.flat().filter((r) => r.enh).map((r) => [r.enh!, r.symbol as SymbolId])).entries()];
    if (this.lvRun !== run) {
      this.lvRun = run;
      this.lvSeen.clear();
      this.lvPunch.clear();
    }
    const now = performance.now() / 1000;
    const punchOf = (key: string, level: number) => {
      const seen = this.lvSeen.get(key);
      if (seen !== undefined && level > seen) this.lvPunch.set(key, now);
      this.lvSeen.set(key, level);
      return (now - (this.lvPunch.get(key) ?? -9)) / 0.3;
    };
    head('SYMBOLS', y + 396);
    syms.slice(0, 4).forEach((sym, i) => {
      const ex = x + 28 + (i % 2) * 134;
      const ey = y + 420 + Math.floor(i / 2) * 22;
      const level = symLevel(p.levels, sym);
      const pt = punchOf(sym, level);
      const punch = pt < 1 ? 1 + 0.6 * (1 - pt) * (1 - pt) : 1;
      if (pt < 1) this.sparkle(ctx, ex + 40, ey, pt);
      // LV 1 sits dim, so what you've upgraded stands out.
      const base = level <= 1;
      drawSprite(ctx, sym as SpriteId, ex, ey, 1.5, { dim: base ? 0.4 : 0 });
      drawText(ctx, `LV${level}`, ex + 18, ey, T.body, base ? KIT.dim : KIT.title, { align: 'left', punch });
      drawText(ctx, String(playerSymValue(p.levels, sym, CFG_BASE[sym] ?? UNIT)), ex + 112, ey, T.small, KIT.text, { align: 'right' });
    });
    // CHARMS and RELICS: slots, filled or empty, so the column reads as a loadout.
    const cy = y + (syms.length > 2 ? 470 : 448);
    head('CHARMS', cy);
    charms.sort((a, b) => ACT1_GILDS.indexOf(a[0]) - ACT1_GILDS.indexOf(b[0]));
    const SW = 42;
    const gap = (w - 24 - 6 * SW) / 5;
    for (let i = 0; i < 6; i++) {
      const wx = Math.round(x + 12 + i * (SW + gap));
      const wy = cy + 14;
      drawWell(ctx, wx, wy, SW, 46, '#1e1830');
      const c = charms[i];
      if (!c) continue;
      if (i === 5 && charms.length > 6) {
        drawText(ctx, `+${charms.length - 5}`, wx + SW / 2, wy + 24, T.body, KIT.title);
        continue;
      }
      const enh = c[0] as Enh;
      const lv = charmLevel(p.levels, enh, ticket);
      const pt = punchOf(enh, lv);
      if (pt < 1) this.sparkle(ctx, wx + SW / 2, wy + 10, pt);
      drawSprite(ctx, ENH_SPRITE[enh], wx + SW / 2, wy + 17, 1.5);
      drawText(ctx, charmTag(enh, lv), wx + SW / 2, wy + 37, T.small, CHARM_COLOR[enh] ?? KIT.text);
    }
    const ry = cy + 80;
    const relics = p.relics;
    head(relics.length ? `RELICS ${relics.length}` : 'RELICS', ry);
    const cols = 6;
    const slots = cols * Math.max(2, Math.min(3, Math.floor((y + h - 8 - (ry + 14)) / 44)));
    const shownR = relics.length > slots ? relics.slice(0, slots - 1) : relics;
    for (let i = 0; i < slots; i++) {
      const wx = Math.round(x + 12 + (i % cols) * (SW + gap));
      const wy = ry + 14 + Math.floor(i / cols) * 44;
      drawWell(ctx, wx, wy, SW, 40, '#1e1830');
      if (inFight) continue;
      const r = shownR[i];
      if (r) {
        const rx = wx + SW / 2;
        const rcy = wy + 20;
        drawSprite(ctx, RELICS[r].sprite as SpriteId, rx, rcy, 2);
        this.tips.add(r, rx, rcy, 18);
        this.relicRects.push({ x: rx, y: rcy, w: SW, h: 40 });
      } else if (i === slots - 1 && relics.length > slots) drawText(ctx, `+${relics.length - shownR.length}`, wx + SW / 2, wy + 21, T.body, KIT.title);
    }
  }

  /** A level-up sparkle: three cyan specks thrown up and fading (t 0..1). */
  protected sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    for (let k = 0; k < 3; k++) {
      const a = -Math.PI / 2 + (k - 1) * 0.7;
      ctx.fillStyle = '#5ad8e8';
      ctx.globalAlpha = 1 - t;
      ctx.fillRect(Math.round(x + Math.cos(a) * 20 * t - 2), Math.round(y + Math.sin(a) * 20 * t - 2), 4, 4);
      ctx.globalAlpha = 1;
    }
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
    drawText(ctx, `${p.hp}/${p.maxHp}`, x + 24 + w / 2, y + 1, T.body, COLORS.text);
  }
}
