import { type SymbolId } from '../../core/config';
import { ELITE_DMG_MUL, ELITE_HP_MUL, ELITE_HP_MUL_2, type EnemyDef } from '../../core/enemies';
import { CHIPS, nightId, enemyHp, needsRoute, currentEnemy, isBossNext, runActs, type RunState } from '../../core/run';
import { effectiveAbility, STAKE } from '../../core/stakes';
import { backOut } from '../../present/ease';
import { ABILITY_UI, abilityName } from '../../present/hud';
import { COLORS } from '../../present/layout';
import { artId, drawPortrait, drawSprite, spriteSize, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum } from '../../render/text';
import { bossRules } from '../bossRules';
import { drawRich } from '../keywords';
import { wrap, BADGE, CX, FLIP_TAB, KILL_RATE, abilityWhat, abilityText, STAGE_TINT, FRONT_BLURB } from './shared';
import { RouteScreen } from './routes';

export abstract class NextScreen extends RouteScreen {
  showNext(run: RunState): void {
    this.run = run;
    this.open('next');
    if (needsRoute(run)) return this.showRoutes(run);
    this.enemyEntrance(run);
    const bossId = currentEnemy(run)?.boss;
    const boss = isBossNext(run) ? (bossId === 'dealer' ? 'FACE THE DEALER' : bossId === 'wheel' ? 'FACE THE WHEEL' : bossId === 'owner' ? 'FACE THE OWNER' : 'FACE THE HOUSE') : 'FIGHT!';
    this.buttons = [this.btn(boss, CX, 560, boss === 'FIGHT!' ? 290 : 360, 56, () => this.cb.onFight())];
  }

  /** The headliner card arrives: it rises in, the portrait lands, the skulls pop one by one, the pips fill. */
  protected enemyEntrance(run: RunState): void {
    this.flips.clear();
    this.pinned = -1;
    this.panelIn = 0;
    this.portraitPop = 1.25;
    this.skullPop = [0, 0, 0];
    this.pipFill = 0;
    this.lastPip = 1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (this.panelIn = v) });
    void this.ui.wait(0.12).then(() => this.ui.tween({ from: 1.25, to: 1, dur: 0.18, ease: backOut(2), onUpdate: (v) => (this.portraitPop = v) }));
    const e = currentEnemy(run);
    const pips = this.dangerOf(e);
    for (let k = 0; k < 3; k++)
      void this.ui.wait(0.2 + k * 0.08).then(() => {
        if (k < pips) {
          if (k === 2 && e.isBoss) this.sounds.stingerMedium();
          else this.sounds.click();
        }
        return this.ui.tween({ from: 0, to: 1, dur: 0.22, ease: backOut(3), onUpdate: (v) => (this.skullPop[k] = v) });
      });
    void this.ui.wait(0.5).then(() =>
      this.ui.tween({ from: 0, to: 8, dur: 0.4, onUpdate: (v) => (this.pipFill = v) }).then(() => {
        this.pipFill = 99;
        return this.ui.tween({ from: 1.3, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (this.lastPip = v) });
      }),
    );
  }

  /** How many danger skulls (1-3) a fight shows. */
  protected dangerOf(e: EnemyDef): number {
    if (e.isBoss) return 3;
    // Skulls from how often each enemy really wins its fights (sim, 1000 runs a machine, WHITE + GREEN, 2026-10-15),
    // an elite x1.6 (it hits 25% harder with ~1.3x HP). The old hand-set table rated a 230 HP brute above a 280 HP
    // elite thief (feel playtest).
    const d = (KILL_RATE[e.archetype] ?? 4) * (e.elite ? 1.6 : 1);
    return d >= 5 ? 3 : d >= 2.5 ? 2 : 1;
  }

  /**
   * One enemy's scouting report: a casino "headliner card". The front is what you need at a glance (danger, HP,
   * ability + cadence, one rule); its "?" tab turns it to the back (exact text, reels with counts). Only the tab flips
   * it: hover-to-flip fought the tab and flipped cards under a resting mouse (user playtest, 2026-10-09).
   */
  protected drawEnemyPanel(ctx: CanvasRenderingContext2D, e: EnemyDef, x: number, y: number, w: number, time: number, other = false): void {
    const h = 260;
    const m = this.mouse;
    // A finger leaves its last spot behind: hover looks are for a mouse only (a tap lit the "?" at random).
    const inside = !this.touch && m.x >= x - 6 && m.x <= x + w + 6 && m.y >= y - 6 && m.y <= y + h + 6;
    const onTab = inside && m.x >= x + w - FLIP_TAB.w - 16 && m.y >= y + h - FLIP_TAB.h - 16;
    const want = this.pinned === x ? 1 : 0;
    let f = this.flips.get(x) ?? 0;
    f += (want - f) * Math.min(1, this.frameDt * 12);
    this.flips.set(x, f);
    const fork = w < 600;
    const tier = e.isBoss ? 2 : e.elite ? 1 : 0;
    const bossFrame = `rgb(255,${Math.round(106 + 48 * (0.5 + 0.5 * Math.sin(time * 3)))},${Math.round(90 + 48 * (0.5 + 0.5 * Math.sin(time * 3)))})`;
    const frame = inside ? COLORS.goldLight : tier === 2 ? bossFrame : tier === 1 ? '#ff9a3a' : COLORS.gold;
    const back = f > 0.5;
    ctx.save();
    ctx.globalAlpha *= this.panelIn;
    ctx.translate(x + w / 2, y + h / 2 + (1 - this.panelIn) * 24 - (inside ? 4 : 0));
    const grow = fork && inside ? 1.02 : 1;
    ctx.scale(Math.max(0.03, Math.abs(1 - 2 * f)) * grow, grow);
    ctx.translate(-w / 2, -h / 2);
    this.panel(ctx, 0, 0, w, h, frame);
    // Header band: a marquee of bulbs with the name, and 3 skulls (the unearned ones dim).
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(0, 0, w, 40);
    const phase = tier === 2 ? Math.floor(time * 8) : tier === 1 ? Math.floor(time * 4) : 0;
    for (let i = 0; 10 + i * 20 < w; i++)
      for (const by of [3, 33]) {
        ctx.fillStyle = (i + phase + (by > 20 ? 1 : 0)) % 2 ? '#3a2e52' : frame;
        ctx.fillRect(8 + i * 20, by, 4, 4);
      }
    const name = e.name ?? 'ENEMY';
    const tx = fork ? 124 : 148;
    drawText(ctx, name, tx, 20, fork ? (name.length > 12 ? 2 : 2.5) : name.length > 16 ? 2.5 : 3, tier === 2 ? '#ff6a5a' : tier === 1 ? '#ff9a3a' : COLORS.slime, { align: 'left' });
    const pips = this.dangerOf(e);
    for (let k = 0; k < 3; k++) {
      const lit = 2 - k < pips;
      const pop = this.skullPop[2 - k] ?? 1;
      drawSprite(ctx, 'dangerPip', w - 24 - k * 30, 20, (fork ? 2.5 : 3) * (lit ? pop : 1), { alpha: lit ? 1 : 0.25 });
    }
    if (back) this.drawPanelBack(ctx, e, w, pips);
    else this.drawPanelFront(ctx, e, w, h, time, inside, fork);
    // The "?" tab (both sides): tap or click it to turn the card over.
    {
      const tx0 = w - FLIP_TAB.w - 8;
      const ty0 = h - FLIP_TAB.h - 8;
      const lit = onTab;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(tx0 - 2, ty0 - 2, FLIP_TAB.w + 4, FLIP_TAB.h + 4);
      // Lit: a gold rim and white glyph (dark text on gold blurred into a blob).
      if (lit) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(tx0 - 2, ty0 - 2, FLIP_TAB.w + 4, FLIP_TAB.h + 4);
      }
      ctx.fillStyle = lit ? '#4a3a66' : COLORS.panelLight;
      ctx.fillRect(tx0, ty0, FLIP_TAB.w, FLIP_TAB.h);
      drawText(ctx, back ? 'X' : '?', tx0 + FLIP_TAB.w / 2, ty0 + FLIP_TAB.h / 2 + 1, back ? 2 : 2.5, lit ? '#ffffff' : COLORS.goldLight);
    }
    // At a fork, the card you're not looking at sinks back under a shade (alpha turned it muddy).
    if (other) {
      ctx.fillStyle = 'rgba(7,4,14,0.35)';
      ctx.fillRect(-6, -6, w + 12, h + 12);
    }
    ctx.restore();
  }

  protected drawPanelFront(ctx: CanvasRenderingContext2D, e: EnemyDef, w: number, _h: number, time: number, hover: boolean, fork: boolean): void {
    const run = this.run!;
    // The stage: a spotlit box with the portrait standing on it.
    const st = fork ? 92 : 116;
    const sx = 16;
    const sy = 52;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(sx - 3, sy - 3, st + 6, st + 6);
    const g = ctx.createRadialGradient(sx + st / 2, sy + st / 2, 4, sx + st / 2, sy + st / 2, st * 0.7);
    const tint = STAGE_TINT[e.boss ?? e.archetype] ?? COLORS.gold;
    g.addColorStop(0, tint);
    g.addColorStop(1, COLORS.panel);
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, st, st);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(sx + st / 2 - st * 0.3, sy + st - 18, st * 0.6, 8);
    const bob = hover ? Math.sin(time * 5) * 4 : Math.sin(time * 2) * 2;
    drawPortrait(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, sx + st / 2, sy + st / 2 + bob, (fork ? 3 : 4) * this.portraitPop);
    const badge = BADGE[e.archetype];
    if (badge) drawSprite(ctx, badge, sx + st - 8, sy + st - 8, fork ? 2.5 : 3);
    if (e.elite) {
      // The ribbon sits along the stage floor (on top it covered the portrait's head); the relic reward sits in the
      // stage's top corner (in the header it ran into long names: ELITE RAT THIEF).
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(sx, sy + st - 18, st, 18);
      ctx.fillStyle = '#8a3a10';
      ctx.fillRect(sx + 2, sy + st - 16, st - 4, 14);
      drawText(ctx, 'ELITE', sx + st / 2, sy + st - 9, 1.5, COLORS.goldLight);
      drawSprite(ctx, artId('voucherRelic'), sx + st - 16, sy + 12, 1.5);
    }
    // Right column: one-line blurb, the HP bar, then the ability with its cadence.
    const tx = fork ? 124 : 148;
    const room = w - tx - 16;
    const blurb = FRONT_BLURB[e.boss ?? ''] ?? e.blurb;
    const blurbScale = blurb.length * 12 <= room ? 2 : blurb.length * 9 <= room ? 1.5 : 0;
    if (blurbScale) drawText(ctx, blurb, tx, 62, blurbScale, COLORS.textDim, { align: 'left' });
    const hp = enemyHp(run, e);
    const bw = fork ? Math.min(200, room - 24) : 280;
    drawSprite(ctx, 'heart', tx + 8, 96, 2);
    const bx = tx + 24;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 2, 84, bw + 4, 24);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(bx, 86, bw, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(bx, 86, bw, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx, 103, bw, 3);
    drawText(ctx, fmtNum(hp), bx + bw / 2, 96, 2, COLORS.text);
    if (e.ability) {
      const every = effectiveAbility(nightId(run) === 'fast' ? { ...e.ability, every: Math.max(2, e.ability.every - 1) } : e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
      const ui = { ...ABILITY_UI[e.ability.kind], label: abilityName(e.ability.kind) };
      drawSprite(ctx, ui.icon, tx + 12, 138, fork ? 2.5 : 3);
      drawText(ctx, ui.label, tx + 34, 138, fork ? 2 : 2.5, '#ff9a3a', { align: 'left' });
      let px = tx + 34 + ui.label.length * (fork ? 12 : 15) + 16;
      const shownPips = Math.min(every, 8);
      for (let i = 0; i < shownPips; i++) {
        const last = i === shownPips - 1;
        const on = this.pipFill > i;
        const s = last && on ? this.lastPip : 1;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(px - 6 * s, 138 - 6 * s, 12 * s, 12 * s);
        ctx.fillStyle = last && on ? '#ff5a4a' : '#2a2038';
        ctx.fillRect(px - 4 * s, 138 - 4 * s, 8 * s, 8 * s);
        px += 14;
      }
      drawText(ctx, fork ? `EVERY ${every}` : `EVERY ${every} TURNS`, px + 4, 138, fork ? 1.25 : 1.5, COLORS.textDim, { align: 'left' });
      const what = abilityWhat(e, run);
      drawText(ctx, what, tx, 166, what.length * 12 <= room ? 2 : 1.5, COLORS.text, { align: 'left' });
    }
    // Footer: which symbols it runs (icons only), or a boss's one rule.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(8, 197, w - 16, 2);
    if (e.isBoss) {
      const win = bossRules(e.boss ?? 'house', this.bossCtx()).win;
      drawText(ctx, win, 16, 228, win.length * 12 <= w - 120 ? 2 : 1.5, '#7dff7a', { align: 'left' });
      // GREEN: THE WHEEL STARTS FAST (its rule, on the card that meets it).
      if (e.boss === 'wheel' && run.stake >= STAKE.wheelFast) drawText(ctx, 'STARTS FAST', w - 24, 228, 1.5, '#ff8a7a', { align: 'right' });
    } else {
      let cx = 36;
      for (const [sym, n] of Object.entries(e.strips[0]) as [SymbolId, number][]) {
        if (n <= 0) continue;
        drawSprite(ctx, sym as SpriteId, cx, 228, 2);
        cx += 40;
      }
    }
  }

  protected drawPanelBack(ctx: CanvasRenderingContext2D, e: EnemyDef, w: number, danger: number): void {
    const run = this.run!;
    const sc = w < 600 ? 1.5 : 2;
    const big = w < 600 ? 1.5 : 2.5;
    const cols = Math.floor((w - 32) / (6 * sc));
    let y = 60;
    const line = (text: string, color: string) => {
      wrap(text, cols).forEach((l) => {
        drawText(ctx, l, 16, y, sc, color, { align: 'left' });
        y += 10 * sc;
      });
      y += 4;
    };
    const blurbFits = !FRONT_BLURB[e.boss ?? ''] && e.blurb.length * 9 <= w - (w < 600 ? 140 : 164);
    // (Not the Dealer's: its rules below say the same, and they need the room.)
    if (!blurbFits && e.boss !== 'dealer') line(e.blurb, COLORS.textDim);
    if (e.ability && !e.isBoss) {
      // The ability sentence leads, big (a boss's rules paragraph below already says it): it's what the back is for.
      const every = effectiveAbility(nightId(run) === 'fast' ? { ...e.ability, every: Math.max(2, e.ability.every - 1) } : e.ability, { stake: run.stake, act: run.act, sandglass: run.player.relics.includes('sandglass') }).every;
      wrap(abilityText(e, every, run), Math.floor((w - 32) / (6 * big))).forEach((l) => {
        drawText(ctx, l, 16, y + 2, big, '#ff9a3a', { align: 'left' });
        y += 10 * big + 2;
      });
      y += 4;
    }
    if (e.elite)
      line(
        `ELITE: +${(e.act ?? 1) > 1 ? Math.round((ELITE_HP_MUL_2 - 1) * 100) : e.archetype === 'thief' ? 15 : Math.round((ELITE_HP_MUL - 1) * 100)}% HP, HITS ${Math.round((ELITE_DMG_MUL - 1) * 100)}% HARDER. RELIC PICK, +${CHIPS.eliteBonus} CHIPS`,
        '#ff9a3a',
      );
    // A boss's rules, one row each with the icon the fight uses for it, then HOW TO WIN (bossRules.ts).
    if (e.isBoss) {
      const br = bossRules(e.boss ?? 'house', this.bossCtx());
      // Everything above the THEIR REELS line (y 197): a step down a size when the rules don't fit (the Dealer's ran
      // over it: playtest C).
      const fit = (k: number) => {
        const rows = br.rules.reduce((a, r) => a + wrap(r.text, Math.floor((w - 64) / (6 * k))).length * 10 * k + 6, 0);
        return y + rows + wrap(`HOW TO WIN: ${br.win}`, Math.floor((w - 32) / (6 * k))).length * 10 * k <= 192;
      };
      const k = fit(sc) ? sc : fit(1.5) ? 1.5 : 1.25;
      const rcols = Math.floor((w - 64) / (6 * k));
      for (const r of br.rules) {
        // Icons come in 8-24 px: each fits one box, so a big pot doesn't cover the row under it.
        const isz = spriteSize(r.icon);
        drawSprite(ctx, r.icon, 28, y + 4 * k, (11 * k) / Math.max(isz.w, isz.h));
        wrap(r.text, rcols).forEach((l) => {
          drawRich(ctx, l, 50, y, k, COLORS.text, { align: 'left' });
          y += 10 * k;
        });
        y += 6;
      }
      wrap(`HOW TO WIN: ${br.win}`, Math.floor((w - 32) / (6 * k))).forEach((l) => {
        drawText(ctx, l, 16, y + 2, k, '#7dff7a', { align: 'left' });
        y += 10 * k;
      });
    }
    // THEIR REELS with counts, along the bottom.
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(8, 197, w - 16, 2);
    drawText(ctx, 'THEIR REELS', 16, 214, 1.5, COLORS.textDim, { align: 'left' });
    const dirty = e.boss === 'house' && run.stake >= STAKE.houseDirty;
    const shown = dirty ? { ...e.strips[0], bomb: STAKE.houseBombsPerReel } : e.strips[0];
    let cx = 30;
    for (const [sym, n] of Object.entries(shown) as [SymbolId, number][]) {
      if (n <= 0) continue;
      drawSprite(ctx, sym as SpriteId, cx, 240, 2);
      drawText(ctx, `${n}`, cx + 20, 240, 2, COLORS.text, { align: 'left' });
      cx += 56;
    }
    drawText(ctx, `DANGER ${danger} OF 3`, w - FLIP_TAB.w - 20, 240, 1.5, COLORS.textDim, { align: 'right' });
  }

  protected drawNext(ctx: CanvasRenderingContext2D, time: number): void {
    this.frameDt = this.lastDraw ? Math.min(0.1, Math.max(0, time - this.lastDraw)) : 0;
    this.lastDraw = time;
    const run = this.run!;
    if (needsRoute(run)) return this.drawRoutes(ctx, time);
    const e = currentEnemy(run);
    const act = run.endless ? `LOOP ${run.endless.loop} - ` : `ACT ${run.act} - `;
    const title = e.isBoss ? (run.act >= runActs(run) && !run.endless ? 'FINAL FIGHT' : `${act}BOSS FIGHT`) : run.route === null && run.map.routes.length > 1 ? `${act}FIGHT ${run.depth + 1}` : `${act}FIGHT ${run.depth + 1} OF ${run.enemies.length}`;
    drawText(ctx, title, CX, 26, 3, e.isBoss ? '#ff6a5a' : run.act > 1 ? '#c8f0ff' : COLORS.textDim);
    this.drawMap(ctx, 128, time);
    this.drawEnemyPanel(ctx, e, CX - 330, 214, 660, time);
    for (const b of this.buttons) this.drawButton(ctx, b, time);
    if (this.mapTip) this.drawNodeTip(ctx, this.mapTip);
  }
}
