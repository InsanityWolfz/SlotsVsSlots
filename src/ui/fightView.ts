import type { Game } from '../game';
import { UNIT } from '../core/config';
import { OVERTIME, overtimeMul, overtimeRound } from '../core/enemies';
import { STAKES } from '../core/stakes';
import { allInRange, DEALER_HANDS, DEALER_RULES } from '../core/fight';
import { RELICS } from '../core/relics';
import type { RelicId } from '../core/config';
import { FLASH_CAP } from '../present/camera';
import { HUD_W } from '../present/hud';
import { BEZEL, cellCenter, COLORS, CELL, GUTTER_PANEL_W, GUTTER_PANEL_Y, H, HUD_TOP, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, reelWindow, RELIC_FEED, RELIC_SHOWN, RELIC_X, RELIC_Y, relicSlot, W } from '../present/layout';
import { CountUp, drawBanner, drawChip, drawPanel, drawTitle, drawWell, KIT, T } from './kit';
import { drawSprite, spriteSize, type SpriteId, artId } from '../render/sprites';
import { bossRules } from './bossRules';
import { drawRich } from './keywords';
import { drawText, fmtNum, textWidth } from '../render/text';
import { CHIP_SPOT, wrap } from './runScreens';
import { drawRelicTip } from './relicTip';

/** Under this share of your max HP the screen's edges breathe red and a heartbeat opens the enemy's turns. */
const DANGER_HP = 0.3;
/** The fight HUD's relic tooltip starts under the player panel (EXPERT_PLAYTEST_12). */
const RELIC_TIP_TOP = 232;

/**
 * The fight screen's own drawing (moved out of game.ts): the gutter between the machines, the boss panels, the HOLD
 * bar, your chips, the relic feed and the BUILD drawer's handle. Game owns the state; this only draws it.
 */
export class FightView {
  constructor(private g: Game) {}

  /** THE count-ups on this screen: your chips and the House's pot. */
  private chipNum: CountUp | null = null;
  private chipT = 0;
  private potNum = new CountUp(0, 0.5);
  private potT = 0;

  /**
   * HOLD (user, 2026-10-29: make it legible): a gold HELD frame on each held reel, and one chip hanging from your
   * machine's bottom edge: the count (lit while a tap would hold), or the call of the moment (a PAIR to hold, a HOLD
   * that can't). Nothing here pauses the fight.
   */
  drawHoldBar(ctx: CanvasRenderingContext2D, t: number): void {
    const f = this.g.fight;
    if (this.g.phase !== 'fighting' || !f.cfg.player.holds || f.over) return;
    for (let r = 0; r < 3; r++) {
      if (!f.held[r]) continue;
      const c = cellCenter('player', r, 1);
      ctx.fillStyle = '#ffe28a';
      const x0 = Math.round(c.x - CELL / 2 + 4);
      const y0 = Math.round(MACHINE_TOP + 4);
      const w = Math.round(CELL - 8);
      const h = Math.round(MACHINE_H - 8);
      ctx.fillRect(x0, y0, w, 4);
      ctx.fillRect(x0, y0 + h - 4, w, 4);
      ctx.fillRect(x0, y0, 4, h);
      ctx.fillRect(x0 + w - 4, y0, 4, h);
      drawChip(ctx, 'HELD', c.x, MACHINE_TOP + MACHINE_H - 22, { scale: T.body, color: '#ffe28a', fill: COLORS.outline });
    }
    const win = reelWindow('player');
    const left = f.holdsLeft - f.held.filter(Boolean).length;
    const live = this.g.canHold();
    let call = '';
    if (this.g.toolNote && performance.now() - this.g.toolNote.at < 1500) call = this.g.toolNote.text;
    else if (live && f.held.some(Boolean)) call = 'HELD FOR YOUR NEXT SPIN';
    else if (live && left > 0 && this.g.lastPair) call = 'PAIR! HOLD IT FOR A JACKPOT?';
    const label = call || (left <= 0 ? 'NO HOLDS LEFT' : live ? `HOLD ${left}: TAP A REEL` : `HOLD ${left}`);
    const lit = !!call || (live && left > 0);
    const pulse = call ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
    drawChip(ctx, label, win.x + win.w / 2, win.y + win.h + BEZEL - 1, {
      scale: T.body,
      color: lit ? (pulse > 0.5 ? '#fff6c8' : '#ffe28a') : KIT.dim,
      frame: lit ? KIT.frame : KIT.frameDim,
      fill: KIT.fill,
    });
  }

  /** LOW HP (feel playtest: nothing said you were in trouble): under 30% HP the screen's edges breathe red, slowly,
   * stronger under 15%. An edge vignette, never a flash (it stays under FLASH_CAP at its strongest). */
  drawDanger(ctx: CanvasRenderingContext2D, t: number): void {
    const h = this.g.stage.huds.player;
    const share = h.maxHp > 0 ? Math.max(0, h.hp) / h.maxHp : 1;
    if (share >= DANGER_HP || h.hp <= 0) return;
    const pulse = (Math.sin(t * Math.PI * 1.8) + 1) / 2;
    const a = Math.min(FLASH_CAP, (share < DANGER_HP / 2 ? 0.14 : 0.09) + 0.06 * pulse);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.55);
    g.addColorStop(0, 'rgba(255,40,40,0)');
    g.addColorStop(1, `rgba(255,40,40,${a.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  drawHandle(ctx: CanvasRenderingContext2D): void {
    const r = this.g.handleRect();
    const hover = this.g.onHandle(this.g.mouse.x, this.g.mouse.y);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(r.x - 2, r.y - 3, r.w + 5, r.h + 6);
    ctx.fillStyle = hover ? COLORS.goldLight : COLORS.gold;
    ctx.fillRect(r.x, r.y - 1, r.w + 1, r.h + 2);
    ctx.fillStyle = hover ? '#3a2e52' : COLORS.panel;
    ctx.fillRect(r.x, r.y + 2, r.w - 2, r.h - 4);
    // Grip lines and an arrow: out when shut, back in when open.
    ctx.fillStyle = COLORS.goldLight;
    for (const gy of [-30, -24, 24, 30]) ctx.fillRect(r.x + 7, r.y + r.h / 2 + gy, r.w - 16, 2);
    const dir = this.g.drawerT >= 0.5 ? -1 : 1;
    const cx = r.x + r.w / 2 - 1 + (hover ? Math.sin(this.g.time * 8) * 2 * dir : 0);
    const cy = r.y + r.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5 * dir, cy - 9);
    ctx.lineTo(cx + 6 * dir, cy);
    ctx.lineTo(cx - 5 * dir, cy + 9);
    ctx.closePath();
    ctx.fill();
  }

  /** Your chips (live in a fight), top-left: the same spot as on every run screen. */
  drawChips(ctx: CanvasRenderingContext2D): void {
    if (this.g.run && this.g.phase !== 'title') {
      // Chips: big, in the same top-left spot as on every run screen (CHIP_SPOT).
      drawSprite(ctx, 'chip', CHIP_SPOT.x, CHIP_SPOT.y, 3);
      // In a fight, the count follows every chip as it plays out: chips paid or spent mid-fight (CASH CASSIDY's chips,
      // MAKE IT RAIN, the House's skim, a bet won mid-fight), CHIP charm chips and what the Mimic ate.
      const fighting = this.g.phase === 'fighting';
      const eaten = fighting ? (this.g.stage.gutter.chipsEaten ?? 0) : 0;
      const hud = fighting ? this.g.stage.huds.player : null;
      const shown = Math.max(0, this.g.run.player.chips - eaten + (hud ? hud.chips - hud.chipsHeld + hud.lucre : 0));
      // THE count-up: the number eases to every change.
      this.chipNum ??= new CountUp(shown, 0.5);
      const now = this.g.time;
      this.chipNum.set(shown);
      this.chipNum.update(Math.max(0, Math.min(0.1, now - this.chipT)));
      this.chipT = now;
      const n = this.chipNum.shown;
      // (Four digits step down to heading size so the count never runs under your HUD panel.)
      drawText(ctx, `${n}`, CHIP_SPOT.x + 24, CHIP_SPOT.y, n >= 1000 ? T.head : T.title, eaten ? '#ff9a3a' : COLORS.energy, { align: 'left' });
      // The column under your chips (left of your HUD): the stake, and the boss fights' stacked shield.
      let ly = CHIP_SPOT.y + 36;
      if (this.g.run.stake > 0 && !(this.g.drawerLive() && this.g.drawerT > 0.05)) {
        drawText(ctx, `STAKE ${this.g.run.stake}`, 24, ly, T.small, STAKES[this.g.run.stake].color, { align: 'left' });
        drawText(ctx, STAKES[this.g.run.stake].name, 24, ly + 16, T.small, STAKES[this.g.run.stake].color, { align: 'left' });
        ly += 40;
      }
      if ((this.g.fight.isBoss || this.g.fight.isWheel || this.g.fight.isDealer) && (this.g.fight.cfg.player.stackShield ?? 0) > 0) {
        drawSprite(ctx, 'chipShield', 34, ly, 2);
        drawText(ctx, `+${this.g.fight.cfg.player.stackShield ?? 0}/TURN`, 50, ly, T.small, '#9fd0ff', { align: 'left' });
      }
    }
  }

  /** Your relics in a fight, as the whole grid in the BUILD pane (a relic that fires hops there too). */
  drawRelics(ctx: CanvasRenderingContext2D): void {
    const relics = this.g.relicList();
    relics.forEach((r, i) => {
      if (i >= RELIC_SHOWN) return;
      const { x, y: y0 } = relicSlot(i);
      // A relic that just fired pops: it grows, hops up, wiggles and flashes gold.
      const pop = this.g.stage.relicPops[r] ?? 0;
      const y = y0 - Math.sin(pop * Math.PI) * 8;
      const k = 1 + 0.55 * pop;
      this.relicBox(ctx, r, x, y, k, pop);
    });
  }

  /** A relic's icon in its frame (k: scale, pop: the gold flash of one that just fired). */
  relicBox(ctx: CanvasRenderingContext2D, r: string, x: number, y: number, k: number, pop: number): void {
    const half = 16 * k;
    if (pop > 0) {
      ctx.save();
      ctx.globalAlpha *= pop * 0.8;
      ctx.shadowColor = COLORS.goldLight;
      ctx.shadowBlur = 18;
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillRect(x - half - 3, y - half - 3, half * 2 + 6, half * 2 + 6);
      ctx.restore();
    }
    ctx.fillStyle = pop > 0.3 ? COLORS.goldLight : COLORS.outline;
    ctx.fillRect(x - half, y - half, half * 2, half * 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x - half + 2 * k, y - half + 2 * k, half * 2 - 4 * k, half * 2 - 4 * k);
    drawSprite(ctx, RELICS[r as RelicId].sprite as SpriteId, x, y, 1.6 * k, { rot: Math.sin(pop * Math.PI * 3) * 0.25 * pop, flash: pop * 0.6 });
  }

  /**
   * THE RELIC FEED (BUILD closed): relics that just fired, as rows in the gutter left of your machine, newest on top.
   * Drawn over the machines and effects, so nothing hides it; rows slide into place, and a relic that fires again
   * counts up (X2) instead of adding a row.
   */
  drawRelicFeed(ctx: CanvasRenderingContext2D): void {
    const F = RELIC_FEED;
    const now = this.g.stage.clock.time;
    const feed = this.g.stage.relicFeed;
    for (let i = feed.length - 1; i >= 0; i--) if (now - feed[i].born > F.life || now < feed[i].born) feed.splice(i, 1);
    feed.forEach((row, i) => {
      const age = now - row.born;
      row.y += (F.y + i * F.row - row.y) * 0.25;
      const alpha = Math.min(1, age / 0.12, (F.life - age) / F.fade);
      const pop = Math.max(0, 1 - age / 0.5);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      const words = (RELICS[row.relic as RelicId]?.name ?? '').split(' ');
      const lines = [''];
      for (const w of words) {
        const cur = lines[lines.length - 1];
        if (cur && (cur + ' ' + w).length > 8) lines.push(w);
        else lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
      }
      const shown = lines.slice(0, 2);
      // A small kit panel per row, as wide as its words.
      const tw = Math.max(...shown.map((l) => textWidth(l, T.small)));
      drawPanel(ctx, F.x - 22, Math.round(row.y - 22), 48 + tw + 10, 44, { frame: KIT.frameDim });
      this.relicBox(ctx, row.relic, F.x, row.y, 1 + 0.3 * pop, pop);
      const top = row.y - (shown.length - 1) * 7;
      shown.forEach((l, j) => drawText(ctx, l, F.x + 24, top + j * 14, T.small, '#e0c0ff', { align: 'left' }));
      // Fired again while shown: a count badge on the icon.
      if (row.count > 1) drawText(ctx, `X${row.count}`, F.x + 18, row.y + 14, T.small, COLORS.goldLight, { align: 'right', outline: COLORS.outline });
      ctx.restore();
    });
  }

  drawRelicTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.g.screens.active || this.g.drawerT < 0.98) return;
    const relics = this.g.relicList();
    const i = relics.findIndex((_, i) => {
      const { x, y } = relicSlot(i);
      return Math.abs(this.g.mouse.x - x) < 19 && Math.abs(this.g.mouse.y - y) < 19;
    });
    if (i >= 0) {
      // Below your machine's panel, over the YOUR REELS box: beside the icon it covered your HP bar.
      drawRelicTip(ctx, relics[i], RELIC_X + 168, RELIC_Y - 19, Math.max(relicSlot(relics.length - 1).y + 19, RELIC_TIP_TOP), this.g.run?.cabinet);
      return;
    }
  }
  /**
   * The middle of the fight screen: the turn banner over the machine whose spin it is, the spin count between them,
   * the fight's label and OVERTIME at the top of the gutter, and the boss's panel (or VS) in it.
   */
  drawGutter(ctx: CanvasRenderingContext2D, t: number): void {
    const g = this.g.stage.gutter;
    const cx = W / 2;
    const cy = MACHINE_TOP + MACHINE_H / 2;
    if (this.g.phase === 'title') return;
    const huds = this.g.stage.huds;
    const decided = huds.enemy.hp <= 0 || huds.player.hp <= 0;
    // THE TURN BANNER (user, 2026-10-30: the floating SPIN n / HERO'S TURN was out of place): a kit ribbon on the top
    // edge of the machine whose spin it is. It drops in as the turn opens (a small pop; none with MOTION reduced).
    // (Before the first spin it's yours: the banner is up while SPIN waits.)
    const side = g.side ?? (this.g.awaitingSpin ? 'player' : null);
    if (side && !decided && (this.g.phase === 'fighting' || this.g.phase === 'quick')) {
      const k = this.g.reducedMotion() ? 0 : g.pulse;
      const mine = side === 'player';
      ctx.save();
      ctx.translate(Math.round(MACHINE_CX[side]), Math.round(MACHINE_TOP - BEZEL - 2 - 10 * k));
      ctx.scale(1 + 0.15 * k, 1 + 0.15 * k);
      drawBanner(ctx, mine ? 'YOUR SPIN' : 'THEIR SPIN', 0, 0, { scale: T.head, color: mine ? KIT.title : COLORS.slime, alpha: 1 - 0.5 * k });
      ctx.restore();
    }
    // The spin count, small, between the two banners' spots.
    if (g.turn > 0) drawChip(ctx, `SPIN ${g.turn}`, cx, MACHINE_TOP - BEZEL - 2, { scale: T.small, color: KIT.dim, frame: KIT.frameDim, fill: KIT.fill });
    // The fight's label (a boss, a loop, the sandbox: the map already said FIGHT n OF 5), top of the gutter.
    let gy = MACHINE_TOP + 16;
    const label = g.fightLabel;
    if (label.includes('BOSS') || label.startsWith('LOOP') || label === 'SANDBOX') {
      const boss = label.includes('BOSS');
      // A long loop label (TONIGHT'S RULE) wraps under its chip.
      const [head, rest] = label.includes(': ') ? label.split(': ') : [label, ''];
      drawChip(ctx, head, cx, gy, { scale: T.body, color: label === 'SANDBOX' ? KIT.dim : boss ? '#ff6a5a' : KIT.title, frame: boss ? '#c8321f' : label === 'SANDBOX' ? KIT.frameDim : KIT.frame, fill: KIT.fill });
      gy += 26;
      if (rest) {
        wrap(rest, 18).slice(0, 2).forEach((l) => {
          drawText(ctx, l, cx, gy, T.small, KIT.title);
          gy += 16;
        });
      }
      gy += 14;
    }
    // OVERTIME: its countdown, then its multiplier, from the turn on screen (the engine runs ahead of it).
    if (this.g.fight.cfg.overtime && g.turn > 0) {
      const left = OVERTIME.from - overtimeRound(g.turn);
      const mul = overtimeMul(g.turn);
      if (left <= 0) {
        const p = 0.5 + 0.5 * Math.sin(t * 5);
        drawChip(ctx, `OVERTIME X${mul}`, cx, gy, { scale: T.body, color: p > 0.5 ? '#ffd0a0' : '#ff9a3a', frame: '#ff9a3a', fill: '#3a1a0c' });
      } else if (left <= OVERTIME.warn) drawChip(ctx, `OVERTIME IN ${left}`, cx, gy, { scale: T.body, color: '#ff9a3a', frame: KIT.frameDim, fill: KIT.fill });
    }
    if (this.g.fight.isBoss) this.drawPot(ctx, cx, GUTTER_PANEL_Y, t);
    else if (this.g.fight.isDealer) this.drawDeal(ctx, cx, GUTTER_PANEL_Y, t);
    else if (this.g.fight.isWheel) this.drawTable(ctx, cx, GUTTER_PANEL_Y, t);
    else drawTitle(ctx, 'VS', cx, cy + 24, '#ff6a5a', { alpha: 0.4 + 0.1 * Math.sin(t * 2) });
  }

  /**
   * THE POT (the House's progressive pot): a meter panel in the gutter. Its number counts up; the bar under it is the
   * next skim against your HP and shield (full is LETHAL); one line under the panel says how to take it.
   * x is the panel's centre, y its top.
   */
  drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const g = this.g.stage.gutter;
    const pot = Math.round(g.pot);
    const hud = this.g.stage.huds.player;
    const cashOut = Math.ceil(pot / 2);
    const stack = this.g.fight.cfg.player.stackShield ?? 0;
    const guard = Math.max(1, hud.hp + hud.shield + stack);
    const lethal = pot > 0 && cashOut >= hud.hp + hud.shield + stack;
    this.g.stage.huds.enemy.alarm = lethal;
    const tier = lethal ? 4 : pot >= 12 * UNIT ? 3 : pot >= 6 * UNIT ? 2 : 1;
    const glow = tier >= 3 ? 0.5 + 0.3 * Math.sin(t * (lethal ? 14 : 8)) : tier === 2 ? 0.25 + 0.1 * Math.sin(t * 4) : 0;
    // (The panel shakes while LETHAL.)
    x = Math.round(x + (lethal ? Math.sin(t * 40) * 2 : 0));
    const w = GUTTER_PANEL_W;
    const h = 126;
    const x0 = x - w / 2;
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.shadowColor = tier >= 3 ? '#ff6a5a' : COLORS.energy;
      ctx.shadowBlur = 30;
      ctx.fillStyle = ctx.shadowColor;
      ctx.fillRect(x0, y, w, h);
      ctx.restore();
    }
    const red = lethal || g.allIn;
    drawPanel(ctx, x0, y, w, h, { title: lethal ? 'LETHAL!' : g.allIn ? 'DOUBLED' : 'THE POT', frame: red ? '#ff6a5a' : undefined });
    // The pot and its number (THE count-up).
    this.potNum.set(pot);
    this.potNum.update(Math.max(0, Math.min(0.1, this.g.time - this.potT)));
    this.potT = this.g.time;
    const sprite = tier === 4 ? 'potTier4' : tier === 3 ? 'potTier3' : tier === 2 ? 'potTier2' : 'potTier1';
    drawSprite(ctx, sprite, x0 + 44, y + 54, tier === 1 ? 3 : 2.5, { flash: glow * 0.5 });
    drawText(ctx, String(this.potNum.shown), x + 30, y + 54, T.title, tier >= 3 ? '#ff6a5a' : COLORS.energy, { punch: g.potPunch });
    // The meter: the next skim against what you can take.
    const bx = x0 + 14;
    const by = y + 90;
    const bw = w - 28;
    const bh = 20;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillStyle = '#0b0712';
    ctx.fillRect(bx, by, bw, bh);
    const fw = Math.round(bw * Math.min(1, cashOut / guard));
    if (fw > 0) {
      ctx.fillStyle = lethal ? (Math.sin(t * 14) > 0 ? '#ff3a2e' : '#c8321f') : tier >= 3 ? '#ff8a3a' : COLORS.gold;
      ctx.fillRect(bx, by, fw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(bx, by, fw, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bx, by + bh - 3, fw, 3);
    }
    drawText(ctx, pot > 0 ? `NEXT SKIM ${cashOut}` : 'EMPTY', x, by + bh / 2 + 1, T.small, '#ffffff');
    // The House's key rule, where players look (EXPERT_PLAYTEST_2 E): your jackpot takes the pot.
    drawText(ctx, 'JACKPOT WINS IT', x, y + h + 24, T.body, KIT.title);
  }

  /** The Dealer's table panel: the hand it's on, its face-up next card (and what it does), and when it comes. */
  drawDeal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const e = this.g.fight.sides.enemy;
    const ab = e.ability;
    const g = this.g.stage.gutter;
    // Gone once either side's presented HP is 0 (the fight is decided).
    if (!ab || g.wheelUp || this.g.stage.huds.enemy.hp <= 0 || this.g.stage.huds.player.hp <= 0) return;
    // Count like the Dealer's panel does (the presented pace, not the engine's, which runs ahead).
    const left = Math.max(1, (this.g.stage.huds.enemy.ability?.every ?? ab.every) - this.g.stage.huds.enemy.charge);
    const soon = left <= 1;
    const w = GUTTER_PANEL_W;
    const h = 126;
    const x0 = Math.round(x - w / 2);
    const hand = g.dealerHand ?? 1;
    // The card table's felt (scenery on a card table), in THE panel's frame.
    drawPanel(ctx, x0, y, w, h, { title: `HAND ${hand}/3`, frame: soon ? '#ff6a5a' : undefined, fill: '#0e2a18' });
    drawText(ctx, DEALER_HANDS[hand - 1], x, y + 30, T.body, hand >= 2 ? '#ff6a5a' : '#7dff7a');
    // Three cards, one rule each (BOSS_REDESIGN 3): the art in a column on the left, the text right of it.
    const card = g.nextDeal ?? 'card';
    drawSprite(ctx, artId(card === 'allin' ? 'dealShuffle' : 'dealCut'), x0 + 36, y + 82, 2.5);
    const hp = this.g.fight.sides.player.maxHp;
    const loop = this.g.fight.cfg.enemy.loop ?? 0;
    const lo = allInRange(hp, 0, loop);
    const hi = allInRange(hp, Infinity, loop);
    const range = lo === hi ? fmtNum(hi) : `${fmtNum(lo)}-${fmtNum(hi)}`;
    const [name, ...rule] = card === 'allin' ? ['ALL IN', range, 'PIERCES'] : ['BUST', 'BEST REEL', 'PAYS NONE'];
    drawText(ctx, name, x0 + 66, y + 62, T.head, card === 'allin' ? '#ff6a5a' : '#ffffff', { align: 'left' });
    rule.forEach((l, k) => drawText(ctx, l, x0 + 66, y + 88 + k * 18, T.small, COLORS.text, { align: 'left' }));
    // When it comes, one line under the panel.
    drawText(ctx, soon ? 'NEXT TURN!' : `NEXT CARD IN ${left}`, x, y + h + 24, T.body, soon ? (Math.sin(t * 12) > 0 ? '#ffffff' : '#ff6a5a') : '#c8f0c8');
  }

  /** A small "?" on a boss's HUD: tap it for the rules. */
  drawBossHint(ctx: CanvasRenderingContext2D): void {
    const hx = this.g.stage.huds.enemy.x + HUD_W - 26;
    drawWell(ctx, hx - 12, HUD_TOP + 10, 26, 26);
    drawText(ctx, '?', hx + 1, HUD_TOP + 24, T.body, KIT.title);
  }
  /** The boss's rules (bossRules.ts), over the paused fight: THE panel, red-framed, with the boss's name on its tab. */
  drawBossCard(ctx: CanvasRenderingContext2D): void {
    const e = this.g.fight.cfg.enemy;
    const br = bossRules(e.boss ?? 'house', {
      stake: this.g.run?.stake ?? 0,
      cabinet: this.g.run?.cabinet,
      houseEvery: this.g.fight.sides.enemy.ability?.every ?? 3,
      loop: e.loop,
      dealerEvery: DEALER_RULES.bustEvery - this.g.fight.dealerCut,
    });
    ctx.fillStyle = 'rgba(6,2,12,0.75)';
    ctx.fillRect(0, 0, W, H);
    const w = 720;
    const lines = br.rules.map((r) => ({ icon: r.icon, rows: wrap(r.text, 46) }));
    const h = 64 + lines.reduce((a, l) => a + l.rows.length * 24 + 14, 0) + 84;
    const x = Math.round(W / 2 - w / 2);
    const y = Math.round(H / 2 - h / 2);
    drawPanel(ctx, x, y, w, h, { frame: '#ff6a5a' });
    drawTitle(ctx, e.name ?? 'THE BOSS', W / 2, y + 34, '#ff6a5a');
    let ry = y + 78;
    for (const l of lines) {
      const sz = spriteSize(l.icon);
      drawWell(ctx, x + 24, ry - 12, 32, 32);
      drawSprite(ctx, l.icon, x + 40, ry + 4, 24 / Math.max(sz.w, sz.h));
      l.rows.forEach((row, k) => drawRich(ctx, row, x + 72, ry + k * 24, T.body, COLORS.text, { align: 'left' }));
      ry += l.rows.length * 24 + 14;
    }
    drawChip(ctx, `HOW TO WIN: ${br.win}`, W / 2, ry + 14, { scale: T.body, color: '#7dff7a', fill: KIT.fill });
    drawText(ctx, 'TAP TO CLOSE', W / 2, y + h - 18, T.small, KIT.dim);
  }

  /** The Dealer's table: green felt behind its machine (scenery: a card table). */
  drawDealerTable(ctx: CanvasRenderingContext2D, t: number): void {
    const cx = MACHINE_CX.enemy;
    const m = MACHINE_W / 2 + BEZEL + 24;
    const top = MACHINE_TOP - BEZEL - 12;
    const h = MACHINE_H + (BEZEL + 12) * 2;
    ctx.fillStyle = '#0a2416';
    ctx.fillRect(Math.round(cx - m), Math.round(top), Math.round(m * 2), Math.round(h));
    ctx.fillStyle = '#0f3a22';
    ctx.fillRect(Math.round(cx - m + 6), Math.round(top + 6), Math.round(m * 2 - 12), Math.round(h - 12));
    ctx.fillStyle = '#c9a040';
    const ix = Math.round(cx - m + 12);
    const iy = Math.round(top + 12);
    const iw = Math.round(m * 2 - 24);
    const ih = Math.round(h - 24);
    ctx.fillRect(ix, iy, iw, 2);
    ctx.fillRect(ix, iy + ih - 2, iw, 2);
    ctx.fillRect(ix, iy, 2, ih);
    ctx.fillRect(ix + iw - 2, iy, 2, ih);
    // (ALL IN's range lives in the table panel and its banner: a third copy under the reels was noise. Playtest.)
    void t;
  }

  /**
   * THE WHEEL's table, front and centre (built like the House's pot panel): the chips on you and what NO MORE BETS
   * would hit for right now. The turn before it comes, the panel pulses red.
   */
  drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const g = this.g.stage.gutter;
    // Gone once either side's presented HP is 0 (the fight is decided).
    if (this.g.stage.huds.enemy.hp <= 0 || this.g.stage.huds.player.hp <= 0) return;
    const chips = (g.bets ?? []).reduce((a, b) => a + b, 0);
    const per = g.betPer ?? 0;
    const hit = chips * per;
    const hud = this.g.stage.huds.player;
    const left = Math.max(1, g.betsLeft ?? 3);
    const soon = left <= 1;
    const lethal = hit > 0 && hit >= hud.hp + hud.shield;
    this.g.stage.huds.enemy.alarm = soon && lethal;
    const glow = soon && chips > 0 ? 0.45 + 0.3 * Math.sin(t * 10) : chips >= 4 ? 0.2 + 0.1 * Math.sin(t * 4) : 0;
    const w = GUTTER_PANEL_W;
    const h = 126;
    const x0 = Math.round(x - w / 2);
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.shadowColor = '#ff3a2e';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff3a2e';
      ctx.fillRect(x0, y, w, h);
      ctx.restore();
    }
    // Felt in THE panel's frame (a card table's scenery).
    drawPanel(ctx, x0, y, w, h, { title: 'THE TABLE', frame: soon ? '#ff6a5a' : undefined, fill: '#0f3a22' });
    drawText(ctx, `${chips} ON YOU`, x, y + 30, T.body, chips ? '#ffe08a' : '#c8f0c8', { punch: g.betPunch ?? 1 });
    // What the wheel would take right now: the chips, then their hit.
    drawSprite(ctx, artId(chips >= 3 ? 'betStack3' : chips === 2 ? 'betStack2' : 'betStack1'), x0 + 34, y + 66, 2.5, { alpha: chips ? 1 : 0.35 });
    drawText(ctx, `X${chips}`, x0 + 56, y + 68, T.head, chips ? '#ffffff' : COLORS.textDim, { align: 'left' });
    drawText(ctx, hit ? `-${hit}` : '0', x0 + w - 14, y + 68, T.head, lethal ? '#ff3a2e' : hit ? '#ff8a7a' : COLORS.textDim, { align: 'right', punch: g.betPunch ?? 1 });
    if (soon) drawText(ctx, 'NO MORE BETS NEXT!', x, y + 104, T.small, Math.sin(t * 10) > 0 ? '#ffffff' : '#ff6a5a');
    else if (per) drawText(ctx, `EACH CHIP HITS ${per}`, x, y + 104, T.small, '#c8f0c8');
    // Its one rule, where players look (like the House's pot), and the phase.
    drawText(ctx, g.wheelFast ? '3 CHIPS A TURN' : 'PAIRS CLEAR BETS', x, y + h + 24, T.body, g.wheelFast ? '#ff8a7a' : KIT.title);
  }

  /** THE WHEEL's slot machine: a red-and-black cabinet behind its reels, with a green felt apron. */
  drawWheelCabinet(ctx: CanvasRenderingContext2D): void {
    const cx = MACHINE_CX.enemy;
    const m = MACHINE_W / 2 + BEZEL + 24;
    const x0 = Math.round(cx - m);
    const y0 = Math.round(MACHINE_TOP - BEZEL - 12);
    const w = Math.round(m * 2);
    const h = Math.round(MACHINE_H + (BEZEL + 12) * 2);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0, y0, w, h);
    // Red and black pockets around the frame.
    const n = 12;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#1a1018' : '#b0202e';
      ctx.fillRect(Math.round(x0 + 4 + (i * (w - 8)) / n), y0 + 4, Math.ceil((w - 8) / n), h - 8);
    }
    ctx.fillStyle = '#0f3a22';
    ctx.fillRect(x0 + 12, y0 + 12, w - 24, h - 24);
  }

  /** The roulette wheel on top of THE WHEEL's machine: it turns slowly, and races when the ball drops. */
  drawWheelTopper(ctx: CanvasRenderingContext2D): void {
    const g = this.g.stage.gutter;
    const x = MACHINE_CX.enemy + MACHINE_W / 2 + BEZEL - 6;
    const y = MACHINE_TOP - BEZEL - 6;
    drawSprite(ctx, artId('wheelTopper'), x, y, 2.5, { rot: g.wheelAngle ?? 0 });
    drawSprite(ctx, artId('ball'), x + Math.cos((g.wheelAngle ?? 0) * -1.7) * 16, y + Math.sin((g.wheelAngle ?? 0) * -1.7) * 16, 0.6);
  }
}
