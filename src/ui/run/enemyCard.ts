import { type SymbolId } from '../../core/config';
import { ELITE_DMG_MUL, ELITE_HP_MUL, ELITE_HP_MUL_2, type EnemyDef } from '../../core/enemies';
import { CHIPS, nightId, enemyHp, needsRoute, currentEnemy, isBossNext, runActs, type RunState } from '../../core/run';
import { effectiveAbility, STAKE } from '../../core/stakes';
import { backOut, sineOut } from '../../present/ease';
import { ABILITY_UI, abilityName } from '../../present/hud';
import { COLORS } from '../../present/layout';
import { drawSprite, spriteSize, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { bossRules } from '../bossRules';
import { drawRich } from '../keywords';
import { drawChip, drawMarquee, drawPanel, drawTitle, drawWell, KIT, T } from '../kit';
import { wrap, CX, KILL_RATE, abilityWhat, abilityText, STAGE_TINT, spotlight, bigPortrait, type Btn } from './shared';
import { RouteScreen } from './routes';

/** The enemy card's box: a fight's, and a boss's (bigger, behind the bulb marquee). */
const CARD = { w: 640, h: 236, y: 206 };
const BOSS_CARD = { w: 720, h: 290, y: 196 };

export abstract class NextScreen extends RouteScreen {
  /** The enemy card's flip (0 front, 1 back): the "?" button turns it. */
  protected flipT = 0;
  protected flipBtn: Btn | null = null;

  showNext(run: RunState): void {
    this.run = run;
    this.open('next');
    if (needsRoute(run)) return this.showRoutes(run);
    this.enemyEntrance(run);
    const e = currentEnemy(run);
    const box = e.isBoss ? BOSS_CARD : CARD;
    const bossId = e?.boss;
    const label = isBossNext(run) ? (bossId === 'dealer' ? 'FACE THE DEALER' : bossId === 'wheel' ? 'FACE THE WHEEL' : bossId === 'owner' ? 'FACE THE OWNER' : 'FACE THE HOUSE') : 'FIGHT!';
    const y = box.y + box.h + 76;
    this.flipT = 0;
    this.pinned = -1;
    // The "?" turns the card to its back (the exact rules, their reels); it's a button, so focus reaches it.
    this.flipBtn = this.minorBtn('?', CX + box.w / 2 - 34, box.y + box.h - 30, 40, 36, () => {
      this.pinned = this.pinned < 0 ? 1 : -1;
      this.flipBtn!.label = this.pinned > 0 ? 'X' : '?';
      void this.ui.tween({ from: this.flipT, to: this.pinned > 0 ? 1 : 0, dur: this.reduceMotion ? 0.01 : 0.25, ease: sineOut, onUpdate: (v) => (this.flipT = v) });
    });
    this.buttons = [this.btn(label, CX, y, label === 'FIGHT!' ? 290 : 380, 60, () => this.cb.onFight()), this.flipBtn];
  }

  /** The card arrives: it rises in, the portrait lands, the cadence pips fill one by one, the last one punches. */
  protected enemyEntrance(run: RunState): void {
    this.panelIn = 0;
    this.portraitPop = 1.2;
    this.pipFill = 0;
    this.lastPip = 1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (this.panelIn = v) });
    void this.ui.wait(0.12).then(() => this.ui.tween({ from: 1.2, to: 1, dur: 0.18, ease: backOut(2), onUpdate: (v) => (this.portraitPop = v) }));
    const e = currentEnemy(run);
    if (e.isBoss) void this.ui.wait(0.2).then(() => this.sounds.stingerMedium());
    void this.ui.wait(0.4).then(() =>
      this.ui.tween({ from: 0, to: 8, dur: 0.4, onUpdate: (v) => (this.pipFill = v) }).then(() => {
        this.pipFill = 99;
        this.sounds.click();
        return this.ui.tween({ from: 1.4, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (this.lastPip = v) });
      }),
    );
  }

  /** How many danger skulls (1-3) a fight shows (the card's back). */
  protected dangerOf(e: EnemyDef): number {
    if (e.isBoss) return 3;
    // From how often each enemy really wins its fights (the sim), an elite x1.6.
    const d = (KILL_RATE[e.archetype] ?? 4) * (e.elite ? 1.6 : 1);
    return d >= 5 ? 3 : d >= 2.5 ? 2 : 1;
  }

  /** How often its ability fires in this run (stakes, the hourglass, FAST NIGHT). */
  protected everyOf(e: EnemyDef): number {
    const run = this.run!;
    if (!e.ability) return 0;
    return effectiveAbility(nightId(run) === 'fast' ? { ...e.ability, every: Math.max(2, e.ability.every - 1) } : e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
  }

  protected drawNext(ctx: CanvasRenderingContext2D, time: number): void {
    this.frameDt = this.lastDraw ? Math.min(0.1, Math.max(0, time - this.lastDraw)) : 0;
    this.lastDraw = time;
    const run = this.run!;
    if (needsRoute(run)) return this.drawRoutes(ctx, time);
    const e = currentEnemy(run);
    const act = run.endless ? `LOOP ${run.endless.loop}` : `ACT ${run.act}`;
    const title = e.isBoss ? (run.act >= runActs(run) && !run.endless ? 'FINAL FIGHT' : `${act}: BOSS FIGHT`) : run.route === null && run.map.routes.length > 1 ? `${act}: FIGHT ${run.depth + 1}` : `${act}: FIGHT ${run.depth + 1} OF ${run.enemies.length}`;
    drawText(ctx, title, CX, 28, T.head, e.isBoss ? '#ff8a7a' : KIT.title);
    this.drawMap(ctx, 116, time);
    this.drawEnemyCard(ctx, e, time);
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    if (this.mapTip) this.drawNodeTip(ctx, this.mapTip);
  }

  /**
   * The enemy card (user: "the enemy cards are too busy"): the portrait big, the name, the HP, the ability as one
   * chip with its timing as pips, one line of what it does. Bosses and elites get the bulb marquee, a boss a bigger
   * card. The "?" turns it over to the exact rules.
   */
  protected drawEnemyCard(ctx: CanvasRenderingContext2D, e: EnemyDef, time: number): void {
    const box = e.isBoss ? BOSS_CARD : CARD;
    const x = Math.round(CX - box.w / 2);
    const y = box.y;
    const w = box.w;
    const f = this.flipT;
    const back = f > 0.5;
    const h = back ? Math.max(box.h, this.backHeight(e, w)) : box.h;
    ctx.save();
    ctx.globalAlpha *= this.panelIn;
    const rise = this.reduceMotion ? 0 : Math.round((1 - this.panelIn) * 24);
    ctx.translate(x + w / 2, y + h / 2 + rise);
    ctx.scale(Math.max(0.03, Math.abs(1 - 2 * f)), 1);
    ctx.translate(-w / 2, -h / 2);
    const tier = e.isBoss ? 2 : e.elite ? 1 : 0;
    if (tier) drawMarquee(ctx, 0, 0, w, h, this.reduceMotion ? 0 : time, { frame: tier === 2 ? '#a8202a' : '#c86a1a', pitch: 18 });
    else drawPanel(ctx, 0, 0, w, h);
    if (back) this.drawCardBack(ctx, e, w, h);
    else this.drawCardFront(ctx, e, w, h, time);
    ctx.restore();
  }

  protected drawCardFront(ctx: CanvasRenderingContext2D, e: EnemyDef, w: number, h: number, time: number): void {
    const run = this.run!;
    const boss = !!e.isBoss;
    // The portrait, big, on a lit well (the 32x32 art at an integer scale: 5x, a boss 6x).
    const k = boss ? 6 : 5;
    const ws = 32 * k + 16;
    const wx = 22;
    const wy = Math.round((h - ws) / 2) - (boss ? 18 : 0);
    const tint = STAGE_TINT[e.boss ?? e.archetype] ?? COLORS.gold;
    drawWell(ctx, wx, wy, ws, ws, '#1c1530');
    spotlight(ctx, wx + ws / 2, wy + ws - 18, ws - 20, tint, 0.16);
    const bob = this.reduceMotion ? 0 : Math.round(Math.sin(time * 2) * 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx + 2, wy + 2, ws - 4, ws - 4);
    ctx.clip();
    const pop = this.portraitPop;
    ctx.translate(wx + ws / 2, wy + ws / 2 + 4 + bob);
    ctx.scale(pop, pop);
    bigPortrait(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, 0, 0, k);
    ctx.restore();
    if (e.elite) {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(wx, wy + ws - 22, ws, 22);
      ctx.fillStyle = '#8a3a10';
      ctx.fillRect(wx + 2, wy + ws - 20, ws - 4, 18);
      drawText(ctx, 'ELITE: RELIC PICK', wx + ws / 2, wy + ws - 11, T.small, KIT.title);
    }
    // The right column: name, HP, the ability chip with its pips, one line of what it does.
    const tx = wx + ws + 26;
    const room = w - tx - 24;
    const name = e.name ?? 'ENEMY';
    const color = boss ? '#ff8a7a' : e.elite ? '#ffb060' : COLORS.slime;
    const nameY = wy + 26;
    if (textWidth(name, T.title) <= room) drawTitle(ctx, name, tx, nameY, color, { align: 'left' });
    else drawText(ctx, name, tx, nameY, T.head, color, { align: 'left' });
    // HP.
    const hp = enemyHp(run, e);
    const hy = nameY + 46;
    drawSprite(ctx, 'heart', tx + 8, hy, 2);
    const bx = tx + 26;
    const bw = room - 26;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 2, hy - 13, bw + 4, 26);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(bx, hy - 11, bw, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(bx, hy - 11, bw, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx, hy + 8, bw, 3);
    drawText(ctx, fmtNum(hp), bx + bw / 2, hy + 1, T.body, KIT.text);
    if (e.ability) {
      const every = this.everyOf(e);
      const ui = ABILITY_UI[e.ability.kind];
      const label = abilityName(e.ability.kind);
      const ay = hy + 50;
      const cw = drawChip(ctx, label, tx + (textWidth(label, T.body) + 40) / 2, ay, { icon: (ix, iy) => drawSprite(ctx, ui.icon, ix, iy, 2), iconW: 22, color: '#ffb060' });
      // The timing: pips only (the last one is the hit).
      const shown = Math.min(every, 8);
      let px = tx + cw + 22;
      for (let i = 0; i < shown; i++) {
        const last = i === shown - 1;
        const on = this.pipFill > i;
        const s = last && on ? this.lastPip : 1;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(Math.round(px - 8 * s), Math.round(ay - 8 * s), Math.round(16 * s), Math.round(16 * s));
        ctx.fillStyle = last && on ? '#ff5a4a' : on ? '#4a3e62' : '#241c30';
        ctx.fillRect(Math.round(px - 6 * s), Math.round(ay - 6 * s), Math.round(12 * s), Math.round(12 * s));
        if (last && on) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(Math.round(px - 6 * s), Math.round(ay - 6 * s), Math.round(12 * s), 3);
        }
        px += 20;
      }
      // One line of what it does (two, rarely, when it can't be said shorter).
      const what = abilityWhat(e, run);
      const lines = wrap(what, Math.floor(room / (6 * T.body)));
      lines.slice(0, 2).forEach((l, i) => drawText(ctx, l, tx, ay + 40 + i * 24, T.body, KIT.text, { align: 'left' }));
    }
    // A boss's one rule: how to beat it, along the foot.
    if (boss) {
      const win = bossRules(e.boss ?? 'house', this.bossCtx()).win;
      ctx.fillStyle = '#2a2140';
      ctx.fillRect(18, h - 52, w - 36, 2);
      const lines = wrap(win, Math.floor((w - 120) / (6 * T.body)));
      lines.slice(0, 2).forEach((l, i) => drawText(ctx, l, 24, h - 30 + i * 22 - (lines.length > 1 ? 10 : 0), T.body, '#7dff7a', { align: 'left' }));
      if (e.boss === 'wheel' && run.stake >= STAKE.wheelFast) drawChip(ctx, 'STARTS FAST', w - 160, wy + 14, { scale: T.small, color: '#ff8a7a' });
    }
  }

  /** The back's content, laid out (the card grows to fit it). */
  protected backLines(e: EnemyDef, w: number): { text: string; color: string; size: number; icon?: SpriteId; rich?: boolean }[] {
    const run = this.run!;
    const out: { text: string; color: string; size: number; icon?: SpriteId; rich?: boolean }[] = [];
    const cols = (k: number, inset = 0) => Math.floor((w - 48 - inset) / (6 * k));
    for (const l of wrap(e.blurb, cols(T.small))) out.push({ text: l, color: KIT.dim, size: T.small });
    if (e.ability && !e.isBoss) for (const l of wrap(abilityText(e, this.everyOf(e), run), cols(T.body))) out.push({ text: l, color: '#ffb060', size: T.body });
    if (e.elite)
      for (const l of wrap(`ELITE: +${(e.act ?? 1) > 1 ? Math.round((ELITE_HP_MUL_2 - 1) * 100) : e.archetype === 'thief' ? 15 : Math.round((ELITE_HP_MUL - 1) * 100)}% HP, HITS ${Math.round((ELITE_DMG_MUL - 1) * 100)}% HARDER. RELIC PICK, +${CHIPS.eliteBonus} CHIPS`, cols(T.small)))
        out.push({ text: l, color: '#ffb060', size: T.small });
    if (e.isBoss) {
      const br = bossRules(e.boss ?? 'house', this.bossCtx());
      for (const r of br.rules) wrap(r.text, cols(T.small, 30)).forEach((l, i) => out.push({ text: l, color: KIT.text, size: T.small, icon: i === 0 ? r.icon : undefined, rich: true }));
      for (const l of wrap(`HOW TO WIN: ${br.win}`, cols(T.small))) out.push({ text: l, color: '#7dff7a', size: T.small });
    }
    return out;
  }

  protected backHeight(e: EnemyDef, w: number): number {
    return 34 + this.backLines(e, w).reduce((a, l) => a + l.size * 10 + 2, 0) + 92;
  }

  /** The back: the exact rules, then their reels with counts and the danger. */
  protected drawCardBack(ctx: CanvasRenderingContext2D, e: EnemyDef, w: number, h: number): void {
    const run = this.run!;
    drawText(ctx, e.name ?? 'ENEMY', 24, 30, T.head, KIT.title, { align: 'left' });
    let y = 62;
    for (const l of this.backLines(e, w)) {
      if (l.icon) {
        const isz = spriteSize(l.icon);
        drawSprite(ctx, l.icon, 34, y, 14 / Math.max(isz.w, isz.h));
      }
      const x = l.icon || (l.rich && e.isBoss) ? 54 : 24;
      if (l.rich) drawRich(ctx, l.text, x, y, l.size, l.color, { align: 'left' });
      else drawText(ctx, l.text, x, y, l.size, l.color, { align: 'left' });
      y += l.size * 10 + 2;
    }
    // THEIR REELS with counts, along the foot.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(18, h - 76, w - 36, 2);
    drawText(ctx, 'THEIR REELS', 24, h - 58, T.small, KIT.dim, { align: 'left' });
    const dirty = e.boss === 'house' && run.stake >= STAKE.houseDirty;
    const shown = dirty ? { ...e.strips[0], bomb: STAKE.houseBombsPerReel } : e.strips[0];
    let cx = 38;
    for (const [sym, n] of Object.entries(shown) as [SymbolId, number][]) {
      if (n <= 0) continue;
      drawSprite(ctx, sym as SpriteId, cx, h - 30, 2);
      drawText(ctx, `${n}`, cx + 20, h - 30, T.body, KIT.text, { align: 'left' });
      cx += 60;
    }
    const danger = this.dangerOf(e);
    for (let k = 0; k < 3; k++) drawSprite(ctx, 'dangerPip', w - 150 + k * 26, h - 58, 2.5, { alpha: k < danger ? 1 : 0.25 });
    drawText(ctx, 'DANGER', w - 164, h - 58, T.small, KIT.dim, { align: 'right' });
  }
}
