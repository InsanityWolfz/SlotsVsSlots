import type { Game } from '../game';
import { UNIT } from '../core/config';
import { OVERTIME, overtimeMul, overtimeRound } from '../core/enemies';
import { STAKES } from '../core/stakes';
import { allInRange, DEALER_HANDS, DEALER_RULES } from '../core/fight';
import { RELICS } from '../core/relics';
import type { RelicId } from '../core/config';
import { FLASH_CAP } from '../present/camera';
import { HUD_W } from '../present/hud';
import { cellCenter, COLORS, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, HUD_TOP, PITCH, reelWindow, RELIC_FEED, RELIC_SHOWN, RELIC_X, RELIC_Y, relicSlot, W } from '../present/layout';
import { drawSprite, spriteSize, type SpriteId, artId } from '../render/sprites';
import { bossRules } from './bossRules';
import { drawRich } from './keywords';
import { drawText, fmtNum } from '../render/text';
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

  /**
   * HOLD (user, 2026-10-29: make it legible): a gold HELD frame on each held reel, the count under your machine (lit
   * while a tap would hold), and a call above it after a PAIR. Nothing here pauses the fight.
   */
  drawHoldBar(ctx: CanvasRenderingContext2D, t: number): void {
    const f = this.g.fight;
    if (this.g.phase !== 'fighting' || !f.cfg.player.holds || f.over) return;
    for (let r = 0; r < 3; r++) {
      if (!f.held[r]) continue;
      const c = cellCenter('player', r, 1);
      ctx.strokeStyle = '#ffe28a';
      ctx.lineWidth = 4;
      ctx.strokeRect(c.x - PITCH / 2 + 4, MACHINE_TOP + 4, PITCH - 8, MACHINE_H - 8);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(c.x - 40, c.y + PITCH / 2 + 4, 80, 26);
      drawText(ctx, 'HELD', c.x, c.y + PITCH / 2 + 17, 2, '#ffe28a');
    }
    const win = reelWindow('player');
    const left = f.holdsLeft - f.held.filter(Boolean).length;
    const live = this.g.canHold();
    const label = left <= 0 ? 'NO HOLDS LEFT' : live ? `HOLD ${left}: TAP A REEL` : `HOLD ${left}`;
    drawText(ctx, label, win.x + win.w / 2, win.y + win.h + 20, 2, live && left > 0 ? '#ffe28a' : COLORS.textDim);
    const pulse = 0.75 + 0.25 * Math.sin(t * 6);
    let call = '';
    if (this.g.toolNote && performance.now() - this.g.toolNote.at < 1500) call = this.g.toolNote.text;
    else if (live && f.held.some(Boolean)) call = 'HELD FOR YOUR NEXT SPIN';
    else if (live && left > 0 && this.g.lastPair) call = 'PAIR! HOLD IT FOR A JACKPOT?';
    if (call) drawText(ctx, call, win.x + win.w / 2, win.y - 28, 2, '#ffe28a', { alpha: pulse });
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
      drawText(ctx, `${shown}`, CHIP_SPOT.x + 24, CHIP_SPOT.y, 4, eaten ? '#ff9a3a' : COLORS.energy, { align: 'left' });
      if (this.g.run.stake > 0 && !(this.g.drawerLive() && this.g.drawerT > 0.05)) drawText(ctx, `STAKE ${this.g.run.stake} ${STAKES[this.g.run.stake].name}`, 30, 80, 1.5, STAKES[this.g.run.stake].color, { align: 'left' });
      if ((this.g.fight.isBoss || this.g.fight.isWheel || this.g.fight.isDealer) && (this.g.fight.cfg.player.stackShield ?? 0) > 0) {
        // Sits after the chip count, however many digits it has (QA_1 B10).
        const cx = CHIP_SPOT.x + 24 + String(shown).length * 24 + 22;
        drawSprite(ctx, 'chipShield', cx, CHIP_SPOT.y, 2);
        drawText(ctx, `+${this.g.fight.cfg.player.stackShield ?? 0} SH/TURN`, cx + 18, CHIP_SPOT.y, 2, '#9fd0ff', { align: 'left' });
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
      ctx.fillStyle = 'rgba(20,12,28,0.88)';
      ctx.fillRect(F.x - 22, row.y - 22, 124, 44);
      this.relicBox(ctx, row.relic, F.x, row.y, 1 + 0.3 * pop, pop);
      const words = (RELICS[row.relic as RelicId]?.name ?? '').split(' ');
      const lines = [''];
      for (const w of words) {
        const cur = lines[lines.length - 1];
        if (cur && (cur + ' ' + w).length > 9) lines.push(w);
        else lines[lines.length - 1] = cur ? `${cur} ${w}` : w;
      }
      const top = row.y - (lines.length - 1) * 6;
      lines.slice(0, 2).forEach((l, j) => drawText(ctx, l, F.x + 24, top + j * 12, 1.25, '#e0c0ff', { align: 'left' }));
      // Fired again while shown: a count badge on the icon.
      if (row.count > 1) drawText(ctx, `X${row.count}`, F.x + 18, row.y + 14, 1.5, COLORS.goldLight, { align: 'right', outline: COLORS.outline });
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
  drawGutter(ctx: CanvasRenderingContext2D, t: number): void {
    const g = this.g.stage.gutter;
    const cx = W / 2;
    const cy = MACHINE_TOP + MACHINE_H / 2;
    if (this.g.phase === 'title') return;
    // Only a boss gets a label here (the map already said FIGHT n OF 5): ROUND and whose turn tell the story.
    if (g.fightLabel.includes('BOSS') || g.fightLabel.startsWith('LOOP') || g.fightLabel === 'SANDBOX') drawText(ctx, g.fightLabel, cx, cy - 112, 2, g.fightLabel === 'SANDBOX' ? COLORS.textDim : g.fightLabel.includes('BOSS') ? '#ff6a5a' : COLORS.goldLight);
    // OVERTIME: its countdown, then its multiplier, from the turn on screen (the engine runs ahead of it).
    if (this.g.fight.cfg.overtime && g.turn > 0) {
      const left = OVERTIME.from - overtimeRound(g.turn);
      const mul = overtimeMul(g.turn);
      if (left <= 0) drawText(ctx, `OVERTIME X${mul}`, cx, cy - 140, 2, '#ff9a3a', { alpha: 0.8 + 0.2 * Math.sin(t * 5) });
      else if (left <= OVERTIME.warn) drawText(ctx, `OVERTIME IN ${left}`, cx, cy - 140, 1.5, '#c9824a');
    }
    if (g.turn > 0) {
      drawText(ctx, `SPIN ${g.turn}`, cx, cy - 78, 3, COLORS.textDim, { punch: 1 + g.pulse * 0.3 });
      if (g.side)
        drawText(ctx, g.side === 'player' ? "HERO'S TURN" : 'ENEMY TURN', cx, cy - 46, 2, g.side === 'player' ? COLORS.goldLight : COLORS.slime, { punch: 1 + g.pulse * 0.5 });
      if (g.side) {
        const dir = g.side === 'player' ? -1 : 1;
        const bob = Math.sin(t * 6) * 6;
        const col = g.side === 'player' ? COLORS.goldLight : COLORS.slime;
        ctx.fillStyle = COLORS.outline;
        this.arrow(ctx, cx + dir * (bob + 4), cy + 2, dir, 30);
        ctx.fillStyle = col;
        this.arrow(ctx, cx + dir * bob, cy, dir, 26);
      }
    }
    if (this.g.fight.isBoss) this.drawPot(ctx, cx, cy + 118, t);
    else if (this.g.fight.isDealer) {
      this.drawDeal(ctx, cx, cy + 118, t);
    }
    else if (this.g.fight.isWheel) this.drawTable(ctx, cx, cy + 118, t);
    else {
      drawText(ctx, 'VS', cx, cy + 70, 6, '#ff6a5a', { alpha: 0.35 + 0.1 * Math.sin(t * 2) });
    }
    if (this.g.prefs.speed !== 2) drawText(ctx, `${this.g.prefs.speed}X SPEED`, cx, this.g.fight.isBoss || this.g.fight.isWheel || this.g.fight.isDealer ? cy - 136 : cy + 172, 2, COLORS.textDim);
  }

  /** The House's progressive pot, front and centre: grows (and glows) with the stakes. */
  drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    // (x is shifted by the LETHAL shake below.)
    const g = this.g.stage.gutter;
    const pot = Math.round(g.pot);
    const hud = this.g.stage.huds.player;
    const cashOut = Math.ceil(pot / 2);
    const stack = this.g.fight.cfg.player.stackShield ?? 0;
    const lethal = pot > 0 && cashOut >= hud.hp + hud.shield + stack;
    this.g.stage.huds.enemy.alarm = lethal;
    const tier = lethal ? 4 : pot >= 12 * UNIT ? 3 : pot >= 6 * UNIT ? 2 : 1;
    const glow = tier >= 3 ? 0.5 + 0.3 * Math.sin(t * (lethal ? 14 : 8)) : tier === 2 ? 0.25 + 0.1 * Math.sin(t * 4) : 0;
    const shake = lethal ? Math.sin(t * 40) * 2 : 0;
    x += shake;
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.shadowColor = tier >= 3 ? '#ff6a5a' : COLORS.energy;
      ctx.shadowBlur = 30;
      ctx.fillStyle = ctx.shadowColor;
      ctx.fillRect(x - 110, y - 56, 220, 112);
      ctx.restore();
    }
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 110, y - 56, 220, 112);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x - 106, y - 52, 212, 104);
    ctx.fillStyle = '#3a0f1a';
    ctx.fillRect(x - 101, y - 47, 202, 94);
    const label = lethal ? 'LETHAL!' : g.allIn ? 'DOUBLED POT' : 'THE POT';
    drawText(ctx, label, x, y - 32, 2, lethal || g.allIn ? '#ff6a5a' : COLORS.goldLight, { punch: lethal ? 1 + 0.1 * Math.sin(t * 14) : 1 });
    const sprite = tier === 4 ? 'potTier4' : tier === 3 ? 'potTier3' : tier === 2 ? 'potTier2' : 'potTier1';
    drawSprite(ctx, sprite, x - 52, y + 12, tier === 1 ? 3 : 2.5, { flash: glow * 0.5 });
    drawText(ctx, String(pot), x + 34, y + 12, 6, tier >= 3 ? '#ff6a5a' : COLORS.energy, { punch: g.potPunch });
    if (pot > 0) {
      drawSprite(ctx, 'potSkim', x - 70, y + 64, 2);
      drawText(ctx, `NEXT SKIM ${cashOut}`, x - 52, y + 64, 2, lethal ? '#ff6a5a' : COLORS.textDim, { align: 'left' });
      // The House's key rule, where players look (EXPERT_PLAYTEST_2 E): your jackpot takes the pot.
      drawText(ctx, 'YOUR JACKPOT TAKES IT', x, y - 70, 1.5, COLORS.goldLight);
    }
  }

  /** The Dealer's face-up next card and the hand it's playing over it. */
  drawDeal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const e = this.g.fight.sides.enemy;
    const ab = e.ability;
    const g = this.g.stage.gutter;
    // Gone once either side's presented HP is 0 (the fight is decided).
    if (!ab || g.wheelUp || this.g.stage.huds.enemy.hp <= 0 || this.g.stage.huds.player.hp <= 0) return;
    // Count like the Dealer's panel does (the presented pace, not the engine's, which runs ahead).
    const left = Math.max(1, (this.g.stage.huds.enemy.ability?.every ?? ab.every) - this.g.stage.huds.enemy.charge);
    const soon = left <= 1;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 110, y - 56, 220, 112);
    ctx.fillStyle = soon ? '#ff6a5a' : '#2a6a3a';
    ctx.fillRect(x - 106, y - 52, 212, 104);
    ctx.fillStyle = '#0e2a18';
    ctx.fillRect(x - 101, y - 47, 202, 94);
    drawText(ctx, soon ? 'NEXT TURN!' : `NEXT CARD IN ${left}`, x, y - 32, 2, soon ? '#ff6a5a' : '#c8f0c8', { punch: soon ? 1 + 0.08 * Math.sin(t * 12) : 1 });
    // Three cards, one rule each (BOSS_REDESIGN 3): the art in a column on the left, the text right of it.
    const card = g.nextDeal ?? 'card';
    drawSprite(ctx, artId(card === 'allin' ? 'dealShuffle' : 'dealCut'), x - 76, y + 14, 2.5);
    const hp = this.g.fight.sides.player.maxHp;
    const loop = this.g.fight.cfg.enemy.loop ?? 0;
    const lo = allInRange(hp, 0, loop);
    const hi = allInRange(hp, Infinity, loop);
    const range = lo === hi ? fmtNum(hi) : `${fmtNum(lo)} TO ${fmtNum(hi)}`;
    const [name, ...rule] = card === 'allin' ? ['ALL IN', range, 'PIERCES'] : ['BUST', 'BEST REEL', 'PAYS NONE'];
    drawText(ctx, name, x - 46, y - 6, 3, card === 'allin' ? '#ff6a5a' : '#ffffff', { align: 'left' });
    rule.forEach((l, k) => drawText(ctx, l, x - 46, y + 18 + k * 18, l.length > 10 ? 1.5 : 2, COLORS.text, { align: 'left' }));
    // Which hand it's playing (1-3), over the box.
    const hand = g.dealerHand ?? 1;
    drawText(ctx, `HAND ${hand}/3: ${DEALER_HANDS[hand - 1]}`, x, y - 44 - 14, 2, hand >= 2 ? '#ff6a5a' : '#7dff7a');
  }
  /** A small "?" on a boss's HUD: tap it for the rules. */
  drawBossHint(ctx: CanvasRenderingContext2D): void {
    const hx = this.g.stage.huds.enemy.x + HUD_W - 18;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(hx - 12, HUD_TOP + 2, 24, 22);
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(hx - 10, HUD_TOP + 4, 20, 18);
    drawText(ctx, '?', hx, HUD_TOP + 13, 2, COLORS.goldLight);
  }
  /** The boss's rules (bossRules.ts), over the paused fight. */
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
    const h = 120 + lines.reduce((a, l) => a + l.rows.length * 24 + 12, 0) + 40;
    const x = W / 2 - w / 2;
    const y = H / 2 - h / 2;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#ff6a5a';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    drawText(ctx, e.name ?? 'THE BOSS', W / 2, y + 30, 3.5, '#ff6a5a');
    let ry = y + 74;
    for (const l of lines) {
      const sz = spriteSize(l.icon);
      drawSprite(ctx, l.icon, x + 40, ry + 4, 24 / Math.max(sz.w, sz.h));
      l.rows.forEach((row, k) => drawRich(ctx, row, x + 68, ry + k * 24, 2, COLORS.text, { align: 'left' }));
      ry += l.rows.length * 24 + 12;
    }
    drawText(ctx, `HOW TO WIN: ${br.win}`, W / 2, ry + 10, 2, '#7dff7a');
    drawText(ctx, 'TAP TO CLOSE', W / 2, y + h - 16, 1.5, COLORS.textDim);
  }

  drawDealerTable(ctx: CanvasRenderingContext2D, t: number): void {
    const cx = MACHINE_CX.enemy;
    ctx.fillStyle = '#0a2416';
    ctx.fillRect(cx - 186, MACHINE_TOP - 26, 372, MACHINE_H + 52);
    ctx.fillStyle = '#0f3a22';
    ctx.fillRect(cx - 180, MACHINE_TOP - 20, 360, MACHINE_H + 40);
    ctx.strokeStyle = '#c9a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 174, MACHINE_TOP - 14, 348, MACHINE_H + 28);
    // (ALL IN's range lives in the table panel and its banner: a third copy under the reels was noise. Playtest.)
    void t;
  }

  /**
   * THE WHEEL's table, front and centre (built like the House's pot panel): the chips on you, what NO MORE BETS
   * would hit for right now, and when it comes. The turn before, the panel pulses red.
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
    const hw = 132;
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.shadowColor = '#ff3a2e';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ff3a2e';
      ctx.fillRect(x - hw, y - 56, hw * 2, 112);
      ctx.restore();
    }
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - hw, y - 56, hw * 2, 112);
    ctx.fillStyle = soon ? '#ff6a5a' : COLORS.gold;
    ctx.fillRect(x - hw + 4, y - 52, hw * 2 - 8, 104);
    // Green felt.
    ctx.fillStyle = '#0f3a22';
    ctx.fillRect(x - hw + 9, y - 47, hw * 2 - 18, 94);
    ctx.fillStyle = '#14502e';
    for (let k = 0; k < 6; k++) ctx.fillRect(x - hw + 9 + k * 42, y - 47, 2, 94);
    drawText(ctx, `THE TABLE: ${chips} ON YOU`, x, y - 32, 2, chips ? '#ffe08a' : '#c8f0c8', { punch: g.betPunch ?? 1 });
    // What the wheel would take right now: the chips, then their hit.
    drawSprite(ctx, artId(chips >= 3 ? 'betStack3' : chips === 2 ? 'betStack2' : 'betStack1'), x - 74, y + 4, 2.5, { alpha: chips ? 1 : 0.35 });
    drawText(ctx, `X${chips}`, x - 40, y + 6, 3, chips ? '#ffffff' : COLORS.textDim, { align: 'left' });
    drawText(ctx, hit ? `-${hit}` : '0', x + 80, y + 4, 4, lethal ? '#ff3a2e' : hit ? '#ff8a7a' : COLORS.textDim, { punch: g.betPunch ?? 1 });
    if (soon) drawText(ctx, chips ? `NO MORE BETS NEXT TURN! -${hit}` : 'NO MORE BETS NEXT TURN!', x, y + 36, 1.5, Math.sin(t * 10) > 0 ? '#ffffff' : '#ff6a5a');
    else drawText(ctx, `NO MORE BETS IN ${left}`, x, y + 36, 2, '#c8f0c8');
    // Its one rule, where players look (like the House's YOUR JACKPOT TAKES IT), and the phase.
    drawText(ctx, g.wheelFast ? 'THE WHEEL SPINS FASTER: 3 CHIPS A TURN' : 'YOUR PAIRS CLEAR THE BETS', x, y - 70, 1.5, g.wheelFast ? '#ff8a7a' : COLORS.goldLight);
    drawText(ctx, per ? `EACH CHIP HITS ${per}. A JACKPOT CLEARS ALL` : '', x, y + 70, 1.5, COLORS.textDim);
  }

  /** THE WHEEL's slot machine: a red-and-black cabinet behind its reels, with a green felt apron. */
  drawWheelCabinet(ctx: CanvasRenderingContext2D): void {
    const cx = MACHINE_CX.enemy;
    const x0 = cx - 186;
    const y0 = MACHINE_TOP - 26;
    const w = 372;
    const h = MACHINE_H + 52;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0, y0, w, h);
    // Red and black pockets around the frame.
    const n = 12;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? '#1a1018' : '#b0202e';
      ctx.fillRect(x0 + 4 + (i * (w - 8)) / n, y0 + 4, (w - 8) / n, h - 8);
    }
    ctx.fillStyle = '#0f3a22';
    ctx.fillRect(x0 + 12, y0 + 12, w - 24, h - 24);
    ctx.strokeStyle = '#c9a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 + 16, y0 + 16, w - 32, h - 32);
  }

  /** The roulette wheel on top of THE WHEEL's machine: it turns slowly, and races when the ball drops. */
  drawWheelTopper(ctx: CanvasRenderingContext2D): void {
    const g = this.g.stage.gutter;
    const x = MACHINE_CX.enemy;
    const y = MACHINE_TOP - 22;
    drawSprite(ctx, artId('wheelTopper'), x, y, 2.5, { rot: g.wheelAngle ?? 0 });
    drawSprite(ctx, artId('ball'), x + Math.cos((g.wheelAngle ?? 0) * -1.7) * 16, y + Math.sin((g.wheelAngle ?? 0) * -1.7) * 16, 0.6);
  }

  arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, s: number): void {
    ctx.beginPath();
    ctx.moveTo(x + dir * s, y);
    ctx.lineTo(x - dir * s * 0.2, y - s * 0.8);
    ctx.lineTo(x - dir * s * 0.2, y - s * 0.35);
    ctx.lineTo(x - dir * s, y - s * 0.35);
    ctx.lineTo(x - dir * s, y + s * 0.35);
    ctx.lineTo(x - dir * s * 0.2, y + s * 0.35);
    ctx.lineTo(x - dir * s * 0.2, y + s * 0.8);
    ctx.closePath();
    ctx.fill();
  }
}
