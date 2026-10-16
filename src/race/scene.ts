import type { Sounds } from '../audio/sounds';
import type { Camera } from '../present/camera';
import { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { Banner, FloatText, FxLayer } from '../present/fx';
import { COLORS, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, PITCH, reelWindow, W } from '../present/layout';
import { MachineView } from '../present/machine';
import { Particles } from '../present/particles';
import { drawSprite, type SpriteId } from '../render/sprites';
import { drawText, fmtNum } from '../render/text';
import { Button } from '../ui/button';
import type { SideId } from '../core/config';
import { GUNK, PAYER_NAME, PAYERS, PAYTABLE, payline, Race, RACE, type Gunk, type LinePay, type SlotMachine, type Sym } from './race';
import { PICKS, Run, RUN } from './run';

/** A pick card's and the build's name for a symbol. */
const SYM_NAME = (s: Sym): string => (s === 'sword' ? 'SWORD' : PAYER_NAME[s]);

const CX = W / 2;
const LEAD = '#7dff7a';
const BEHIND = '#ff6a5a';
/** KNIGHT's SWORD and its EDGE (steel blue). */
const STEEL = '#a8e8ff';
/** The rival's GUNK (slime green). */
const GUNK_GREEN = '#7dd85a';

/** The machine view's shape, built from a race machine (no slime, ice or locks in the new game). */
function viewOf(m: SlotMachine) {
  return {
    reels: m.reels.map((strip, r) => ({ cells: strip.map((symbol) => ({ symbol, slimed: false })), stop: m.stops[r] })),
    frozen: [0, 0, 0],
    locked: [0, 0, 0],
    hexed: [0, 0, 0],
  };
}

/** Where the scene is: a race, a race's result, the run screen between races (and the PRIZE pick), the run's end. */
type Mode = 'race' | 'result' | 'between' | 'end';

/**
 * THE NEW GAME: a run of races (run.ts), one race on screen at a time. KNIGHT (you) against a plain rival; the race engine (race.ts) decides
 * every outcome before a reel moves, this plays it (juice: outcome first, then animate toward it).
 */
export class RaceScene {
  run!: Run;
  race!: Race;
  mode: Mode = 'between';
  /** The PRIZE cards' tap targets on the run screen. */
  private cards: { sym: Sym; x: number; y: number; w: number; h: number }[] = [];
  private hoverCard = -1;
  private clock = new Clock();
  private fx = new FxLayer();
  private particles = new Particles();
  private machines!: Record<SideId, MachineView>;
  /** The scores on screen (they count up to the real ones). */
  private shown = { you: 0, rival: 0 };
  /** KNIGHT's EDGE on screen (it doubles as each fresh sword strikes), and its punch. */
  private shownEdge = RACE.edge;
  private edgePunch = 1;
  /** Your spin's pay is on screen (the race has already moved on to the rival's turn). */
  private payingYou = false;
  /** The gunked cell on your Slot Machine's view (it washes off after your spin pays). */
  private gunkView: Gunk | null = null;
  /** 0..1: how much gunk is on that cell (it splats in and washes off). */
  private gunkFx = 0;
  /** A presentation is running: input waits (a tap skips it). */
  private busy = false;
  private buttons: Button[] = [];
  private spinBtn: Button;
  private continueBtn: Button;
  private raceBtn: Button;
  private newRunBtn: Button;
  private menuBtn: Button;
  private pressed: Button | null = null;
  private token = 0;
  private time = 0;
  /** The reel the pointer is over (hover cue). */
  private hoverReel = -1;

  constructor(
    private sounds: Sounds,
    private camera: Camera,
    private ui: Clock,
    private onExit: () => void,
  ) {
    const click = () => this.sounds.click();
    const btn = (label: string, x: number, y: number, w: number, h: number, go: () => void, primary = false) => {
      const b = new Button(label, x, y, w, h, go, this.ui, click, { primary, idlePulse: primary, textScale: 3 });
      this.buttons.push(b);
      return b;
    };
    this.spinBtn = btn('SPIN', CX, 640, 220, 72, () => this.pressSpin(), true);
    this.continueBtn = btn('CONTINUE', CX, 640, 260, 72, () => this.afterResult(), true);
    this.raceBtn = btn('RACE', CX, 650, 260, 72, () => this.startRace(), true);
    this.newRunBtn = btn('NEW RUN', CX - 130, 650, 240, 64, () => this.start(), true);
    this.menuBtn = btn('MENU', CX + 140, 650, 160, 64, () => this.onExit());
    this.start();
  }

  /** A new run: the run screen first (race 1's BET, the boss's, your build). */
  start(): void {
    this.run = new Run();
    this.race = this.run.newRace();
    this.mode = 'between';
  }

  /** The run screen's RACE: the next race (a lost boss: the same race again, fresh roll). */
  private startRace(): void {
    if (this.run.offer) return void this.sounds.fizzle();
    this.mode = 'race';
    this.token++;
    this.clock.skip();
    this.clock.endSkip();
    this.fx.clear();
    this.race = this.run.newRace();
    this.machines = {
      player: new MachineView('player', viewOf(this.race.you), this.sounds),
      enemy: new MachineView('enemy', viewOf(this.race.rival), this.sounds),
    };
    this.shown = { you: 0, rival: 0 };
    this.shownEdge = this.race.edge;
    this.payingYou = false;
    this.gunkView = null;
    this.busy = false;
    void this.rivalTurn();
  }

  // ---- the turns ----------------------------------------------------------------------

  private async rivalTurn(): Promise<void> {
    const tok = this.token;
    this.busy = true;
    this.setActive('enemy');
    await this.clock.wait(0.45);
    if (tok !== this.token) return;
    const pay = this.race.rivalSpin();
    const line = payline(this.race.rival);
    this.machines.enemy.clearRowFx();
    await this.machines.enemy.spin(this.race.rival.stops, line[0] === line[1], this.clock);
    if (tok !== this.token) return;
    await this.showPay('enemy', pay);
    if (tok !== this.token) return;
    if (this.race.gunk) await this.gunkIt(this.race.gunk);
    else if (GUNK.on.includes(this.race.round + 1)) await this.callout('GUNK MISSED', MACHINE_CX.player, GUNK_GREEN);
    if (tok !== this.token) return;
    this.setActive('player');
    this.idle();
  }

  /** The race waits on you (hold, spin, nudge or pay). */
  private idle(): void {
    this.busy = false;
    this.clock.endSkip();
  }

  private pressSpin(): void {
    if (this.busy) return;
    if (this.race.phase === 'hold') void this.playerSpin();
    else if (this.race.phase === 'landed') void this.payout();
  }

  private async playerSpin(): Promise<void> {
    const tok = this.token;
    this.busy = true;
    const held = this.race.held.slice();
    this.race.spin();
    const line = payline(this.race.you);
    const m = this.machines.player;
    m.clearRowFx();
    await m.spin(this.race.you.stops, line[0] === line[1] && !held[2], this.clock, {}, [], held);
    if (tok !== this.token) return;
    // A NUDGE in hand: the spin waits on you (tap a reel, or PAY). Otherwise it pays on its own.
    if (this.race.canStillNudge) this.idle();
    else await this.payout();
  }

  private async nudge(reel: number): Promise<void> {
    if (!this.race.canNudge(reel)) return void this.sounds.fizzle();
    const tok = this.token;
    this.busy = true;
    this.race.nudge(reel);
    await this.machines.player.nudgeReel(reel, this.clock);
    if (tok !== this.token) return;
    await this.payout();
  }

  private async payout(): Promise<void> {
    const tok = this.token;
    this.busy = true;
    const pay = this.race.pay();
    this.payingYou = true;
    await this.showPay('player', pay);
    this.payingYou = false;
    if (tok !== this.token) return;
    await this.washGunk();
    if (tok !== this.token) return;
    if (this.race.phase === 'over') this.finish();
    else void this.rivalTurn();
  }

  private finish(): void {
    const won = this.race.won;
    const run = this.run;
    run.finish(this.race);
    this.setActive(null);
    this.mode = 'result';
    const title = run.won ? 'RUN WON!' : won ? 'RACE WON!' : run.over ? 'GAME OVER' : 'RACE LOST';
    const b = this.fx.add(new Banner(title, won ? COLORS.goldLight : BEHIND, CX, 360, 7));
    const score = `${fmtNum(this.race.score.you)} TO ${fmtNum(this.race.score.rival)}`;
    b.sub = won || run.over ? score : `${score}: -1 CREDIT${run.replay ? ', REPLAY THE BOSS' : ''}`;
    b.z = 40;
    void this.clock.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(1.8), onUpdate: (v) => (b.scale = v) });
    if (won) {
      this.sounds.victory();
      this.particles.burst({ x: CX, y: 360, count: 70, colors: ['#ffe08a', '#ffd23f', '#ffffff', '#ff6ad5'], speed: [200, 600], gravity: 500 });
    } else this.sounds.defeat();
    this.idle();
  }

  /** CONTINUE after a race: the run's end, or the run screen (with the PRIZE pick after a win). */
  private afterResult(): void {
    this.fx.clear();
    this.mode = this.run.over ? 'end' : 'between';
  }

  /** Take a PRIZE card. */
  private pick(sym: Sym): void {
    this.run.pick(sym);
    this.sounds.coin(2);
    this.sounds.stingerSmall();
    this.particles.burst({ x: CX, y: 330, count: 30, colors: ['#ffe08a', '#ffd23f', '#ffffff'], speed: [150, 420], gravity: 500 });
  }

  // ---- presentation -------------------------------------------------------------------

  private setActive(side: SideId | null): void {
    for (const s of ['player', 'enemy'] as const) void this.clock.to(this.machines[s], 'active', side === s ? 1 : 0, 0.25);
  }

  /**
   * Dim the losers, draw the payline, punch each winning symbol with climbing dings, then each SWORD strikes for its
   * EDGE (a fresh one sharpens it), then count the score up.
   */
  private async showPay(side: SideId, pay: LinePay): Promise<void> {
    const m = this.machines[side];
    const win = reelWindow(side);
    const key = side === 'player' ? 'you' : 'rival';
    if (pay.pay <= 0) {
      const t = this.fx.add(new FloatText('NO PAY', win.x + MACHINE_W / 2, win.y + MACHINE_H + 34, 2.5, COLORS.textDim));
      t.plate = true;
      await this.clock.wait(0.45);
      this.fx.remove(t);
      return;
    }
    const triple = pay.tier === 'triple';
    const swordJackpot = pay.symbol === 'sword';
    await m.focusPayline(this.clock, true);
    m.payline.color = triple ? COLORS.triple : pay.tier === 'pair' ? COLORS.pair : STEEL;
    m.payline.alpha = 1;
    await this.clock.tween({ from: 0, to: 1, dur: 0.2, onUpdate: (v) => (m.payline.progress = v) });
    for (const [i, r] of pay.reels.entries()) {
      const fx = m.reels[r].rows[1];
      fx.glowColor = swordJackpot ? STEEL : triple ? '#ff9a5a' : COLORS.goldLight;
      fx.glow = 0.9;
      void this.clock.tween({ from: 1.25, to: 1, dur: 0.18, ease: sineOut, onUpdate: (v) => (fx.punch = v) });
      this.sounds.ding(i);
      await this.clock.wait(0.09);
    }
    // Each SWORD strikes for its EDGE, left to right; a fresh one (spun or nudged in) then doubles the EDGE.
    const stamps: FloatText[] = [];
    for (const st of pay.strikes) {
      const fx = m.reels[st.reel].rows[1];
      fx.glowColor = STEEL;
      fx.glow = 0.9;
      void this.clock.tween({ from: 1.35, to: 1, dur: 0.2, ease: sineOut, onUpdate: (v) => (fx.punch = v) });
      const t = this.fx.add(new FloatText(`+${fmtNum(st.pay)}`, win.x + PITCH * (st.reel + 0.5), win.y + PITCH * 0.5, 3, STEEL));
      t.plate = true;
      stamps.push(t);
      void this.clock.tween({ from: 0.4, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (t.punch = v) });
      this.sounds.block();
      this.camera.shake(3 + Math.min(8, st.pay / 20), 0.2);
      await this.clock.wait(0.25);
      if (st.sharpened) {
        this.shownEdge *= 2;
        this.sounds.shieldGain(Math.min(6, Math.log2(this.shownEdge / (RACE.edge * this.race.mult('sword')))));
        void this.clock.tween({ from: 1.4, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.edgePunch = v) });
        await this.clock.wait(0.15);
      }
    }
    const x = win.x + MACHINE_W / 2;
    // The call shows a pay's parts, so the sword's share is seen (and wanted).
    const base = pay.pay - pay.edge;
    const strikes = pay.strikes.map((s) => fmtNum(s.pay)).join(' + ');
    // GUNK's cut shows as the full pay going to half (SEVEN PAIR 80 -> 40).
    const payPart = pay.cut ? `${fmtNum(base + pay.cut)} -> ${fmtNum(base)}` : fmtNum(base);
    let text: string;
    if (pay.cut && triple) text = `JACKPOT! ${payPart}`;
    else if (pay.cut && pay.edge) text = `PAIR ${payPart} + EDGE ${strikes}`;
    else if (pay.cut) text = `${PAYER_NAME[pay.symbol as keyof typeof PAYER_NAME]} PAIR ${payPart}`;
    else if (swordJackpot) text = `THREE SWORDS! +${fmtNum(pay.pay)}`;
    else if (triple) text = `${pay.symbol === 'seven' ? '777 JACKPOT!' : 'JACKPOT!'} +${fmtNum(pay.pay)}`;
    else if (pay.tier === 'pair' && pay.edge) text = `PAIR ${fmtNum(base)} + EDGE ${strikes} = ${fmtNum(pay.pay)}`;
    else if (pay.tier === 'pair') text = `PAIR! +${fmtNum(pay.pay)}`;
    else text = pay.strikes.length > 1 ? `EDGE ${strikes} = ${fmtNum(pay.pay)}` : `SWORD STRIKE! +${fmtNum(pay.pay)}`;
    const color = swordJackpot ? STEEL : triple ? COLORS.triple : pay.tier === 'pair' ? COLORS.pair : STEEL;
    if (triple) {
      this.sounds.fanfareJackpot();
      this.camera.shake(pay.symbol === 'seven' || swordJackpot ? 16 : 9, 0.4);
      this.camera.punchZoom(0.04);
      this.clock.hitstop(6);
      this.particles.burst({ x, y: win.y + PITCH * 1.5, count: 50, colors: swordJackpot ? [STEEL, '#ffffff', '#5ad8e8'] : ['#ff3a2e', '#ffd23f', '#ffffff'], speed: [180, 520], gravity: 500 });
      if (swordJackpot) {
        this.shownEdge *= 2;
        void this.clock.tween({ from: 1.4, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.edgePunch = v) });
      }
    } else if (pay.tier === 'pair') this.sounds.stingerSmall();
    const call = this.fx.add(new FloatText(text, x, win.y + MACHINE_H + 34, text.length > 22 ? 2.5 : triple ? 3.5 : 3, color));
    call.plate = true;
    void this.clock.tween({ from: 0.4, to: 1, dur: 0.22, ease: backOut(2), onUpdate: (v) => (call.punch = v) });
    // Count up (never snap a number).
    const from = this.shown[key];
    const to = this.race.score[key];
    let tick = 0;
    await this.clock.tween({
      from,
      to,
      dur: triple ? 0.9 : 0.45,
      onUpdate: (v) => {
        this.shown[key] = Math.round(v);
        if (++tick % 3 === 0) this.sounds.tick((v - from) / Math.max(1, to - from));
      },
    });
    await this.clock.wait(triple ? 0.6 : 0.3);
    this.fx.remove(call);
    for (const t of stamps) this.fx.remove(t);
    m.payline.alpha = 0;
    await m.focusPayline(this.clock, false);
    for (const r of [...pay.reels, ...pay.swords]) m.reels[r].rows[1].glow = 0;
  }

  // ---- input --------------------------------------------------------------------------

  private reelAt(x: number, y: number): number {
    const win = reelWindow('player');
    if (x < win.x || x >= win.x + win.w || y < win.y || y >= win.y + win.h) return -1;
    return Math.floor((x - win.x) / PITCH);
  }

  private visibleButtons(): Button[] {
    const m = this.mode;
    this.spinBtn.visible = m === 'race';
    this.spinBtn.enabled = !this.busy && (this.race.phase === 'hold' || this.race.phase === 'landed');
    this.spinBtn.label = this.race.phase === 'landed' ? 'PAY' : 'SPIN';
    this.continueBtn.visible = m === 'result';
    this.continueBtn.enabled = !this.busy;
    this.raceBtn.visible = m === 'between';
    this.raceBtn.enabled = !this.run.offer;
    this.raceBtn.label = this.run.replay ? 'REPLAY' : this.run.isBoss ? 'BOSS RACE' : 'RACE';
    this.newRunBtn.visible = this.menuBtn.visible = m === 'end';
    return this.buttons.filter((b) => b.visible);
  }

  private cardAt(x: number, y: number): number {
    if (this.mode !== 'between' || !this.run.offer) return -1;
    return this.cards.findIndex((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h);
  }

  private tapReel(r: number): void {
    if (this.busy || this.mode !== 'race') return;
    if (this.race.phase === 'hold') {
      if (!this.race.canHold(r)) return void this.sounds.fizzle();
      const now = this.race.toggleHold(r);
      this.sounds.reelStop(r, now ? 1.4 : 0.8);
    } else if (this.race.phase === 'landed') void this.nudge(r);
  }

  pointerDown(x: number, y: number): void {
    const b = this.visibleButtons().find((b) => b.contains(x, y));
    if (b) {
      this.pressed = b;
      b.down();
      return;
    }
    const c = this.cardAt(x, y);
    if (c >= 0) return this.pick(this.cards[c].sym);
    // A tap during a presentation skips to where the race waits on you again.
    if (this.busy) return void this.clock.skip();
    const r = this.reelAt(x, y);
    if (r >= 0) this.tapReel(r);
  }

  pointerUp(x: number, y: number): void {
    const b = this.pressed;
    this.pressed = null;
    b?.up(b.contains(x, y));
  }

  pointerMove(x: number, y: number): boolean {
    let any = false;
    for (const b of this.visibleButtons()) {
      b.hover = b.contains(x, y);
      any ||= b.hover && b.enabled;
    }
    this.hoverReel = this.mode === 'race' ? this.reelAt(x, y) : -1;
    this.hoverCard = this.cardAt(x, y);
    return any || this.hoverCard >= 0 || (this.hoverReel >= 0 && !this.busy && (this.race.phase === 'hold' || this.race.canStillNudge));
  }

  key(k: string): boolean {
    if (k === 'escape') {
      this.onExit();
      return true;
    }
    if (k === ' ' || k === 'enter') {
      if (this.busy) this.clock.skip();
      else if (this.mode === 'result') this.afterResult();
      else if (this.mode === 'between') this.startRace();
      else if (this.mode === 'end') this.start();
      else this.pressSpin();
      return true;
    }
    if (k === '1' || k === '2' || k === '3') {
      const i = Number(k) - 1;
      if (this.mode === 'between' && this.run.offer?.[i]) this.pick(this.run.offer[i]);
      else this.tapReel(i);
      return true;
    }
    return false;
  }

  // ---- frame --------------------------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    const gdt = this.clock.tick(dt);
    this.particles.update(gdt);
    for (const b of this.visibleButtons()) b.update(dt);
  }

  /** The table (inside the camera's shake). */
  drawWorld(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    if (this.mode === 'between' || this.mode === 'end') {
      if (this.mode === 'between') this.drawBetween(ctx, t);
      else this.drawEnd(ctx);
      this.particles.draw(ctx);
      return;
    }
    this.drawRunLine(ctx);
    this.drawSide(ctx, 'player');
    this.drawSide(ctx, 'enemy');
    this.machines.player.draw(ctx, this.clock.time);
    this.machines.enemy.draw(ctx, this.clock.time);
    this.drawEdges(ctx);
    this.drawHolds(ctx, t);
    this.drawScoreboard(ctx);
    this.drawPaytable(ctx);
    this.drawTray(ctx, t);
    this.fx.draw(ctx, this.clock.time, -Infinity, Infinity);
    this.particles.draw(ctx);
  }

  /** Buttons (steady: outside the shake). */
  drawUi(ctx: CanvasRenderingContext2D): void {
    for (const b of this.visibleButtons()) b.draw(ctx, this.time);
  }

  /** Over the race: which race of the run, and your credits. */
  private drawRunLine(ctx: CanvasRenderingContext2D): void {
    const r = this.run;
    const tag = r.replay ? '  BOSS REPLAY' : r.isBoss ? '  BOSS' : '';
    drawText(ctx, `RACE ${r.index + 1} OF ${Run.races}${tag}   CREDITS ${r.credits}`, CX, 64, 2, r.isBoss ? BEHIND : COLORS.textDim);
  }

  /** A titled panel (the run screens). */
  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, title: string, color = COLORS.gold): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    ctx.fillStyle = color;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
    if (title) drawText(ctx, title, x + w / 2, y + 26, 2.5, COLORS.goldLight);
  }

  /** The run screen between races: where you are, what's next, your build, and the PRIZE pick after a win. */
  private drawBetween(ctx: CanvasRenderingContext2D, t: number): void {
    const r = this.run;
    const boss = r.isBoss;
    drawText(ctx, r.replay ? 'REPLAY THE BOSS' : `RACE ${r.index + 1} OF ${Run.races}${boss ? ': BOSS' : ''}`, CX, 70, 5, boss ? BEHIND : COLORS.goldLight);
    // Credits, as coins.
    drawText(ctx, 'CREDITS', CX - 70, 122, 2.5, COLORS.text);
    for (let i = 0; i < RUN.credits; i++) drawSprite(ctx, 'coin' as SpriteId, CX + 30 + i * 40, 122, 2.2, { alpha: i < r.credits ? 1 : 0.2 });
    // The road: every race's BET, bosses marked, yours lit.
    const bets = RUN.bets.flat();
    bets.forEach((b, i) => {
      const x = CX + (i - (bets.length - 1) / 2) * 104;
      const isBoss = i % 3 === 2;
      const here = i === r.index;
      ctx.fillStyle = here ? (isBoss ? BEHIND : COLORS.goldLight) : i < r.index ? COLORS.panelLight : COLORS.outline;
      ctx.fillRect(x - 44, 160, 88, 52);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(x - 41, 163, 82, 46);
      drawText(ctx, isBoss ? 'BOSS' : `RACE ${i + 1}`, x, 177, 1.5, isBoss ? BEHIND : COLORS.textDim);
      drawText(ctx, `BET X${b}`, x, 197, 2, i < r.index ? COLORS.textDim : '#9dff6a');
    });
    // Your build: each symbol's MULT.
    const bx = 120;
    this.panel(ctx, bx, 250, 330, 330, 'YOUR KNIGHT');
    PICKS.slice().reverse().forEach((s, i) => {
      const y = 310 + i * 52;
      drawSprite(ctx, s as SpriteId, bx + 46, y, 2.6);
      drawText(ctx, SYM_NAME(s), bx + 80, y, 2.5, s === 'sword' ? STEEL : COLORS.text, { align: 'left' });
      const m = r.mult(s);
      drawText(ctx, `X${m}`, bx + 290, y, 3, m > 1 ? COLORS.goldLight : COLORS.textDim, { align: 'right' });
    });
    // The PRIZE: pick one card (or what's next).
    const px = 500;
    this.cards = [];
    if (r.offer) {
      this.panel(ctx, px, 250, 660, 330, 'PRIZE: PICK ONE');
      r.offer.forEach((s, i) => {
        const w = 190;
        const h = 240;
        const x = px + 22 + i * (w + 18);
        const y = 300;
        this.cards.push({ sym: s, x, y, w, h });
        const hover = this.hoverCard === i;
        const lift = hover ? -6 : 0;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(x - 3, y - 3 + lift, w + 6, h + 6);
        ctx.fillStyle = hover ? COLORS.goldLight : COLORS.gold;
        ctx.fillRect(x, y + lift, w, h);
        ctx.fillStyle = COLORS.panelLight;
        ctx.fillRect(x + 5, y + 5 + lift, w - 10, h - 10);
        drawSprite(ctx, s as SpriteId, x + w / 2, y + 90 + lift + Math.sin(t * 3 + i) * 3, 5);
        drawText(ctx, SYM_NAME(s), x + w / 2, y + 170 + lift, 2.5, s === 'sword' ? STEEL : COLORS.text);
        drawText(ctx, 'X2', x + w / 2, y + 208 + lift, 4, COLORS.goldLight);
      });
    } else {
      this.panel(ctx, px, 250, 660, 330, boss ? 'NEXT: THE BOSS' : 'NEXT');
      drawText(ctx, `RIVAL BET X${r.bet}`, px + 330, 340, 4, boss ? BEHIND : '#9dff6a');
      drawText(ctx, `CHEAT: GUNK ON SPIN ${GUNK.on.join(', ')}`, px + 330, 400, 2, GUNK_GREEN);
      if (!boss) drawText(ctx, `THIS STOP'S BOSS: BET X${r.bossBet}`, px + 330, 450, 2, COLORS.textDim);
      drawText(ctx, r.replay ? 'A LOST BOSS IS PLAYED AGAIN' : 'WIN TO PICK A PRIZE. LOSE: -1 CREDIT', px + 330, 520, 1.5, COLORS.textDim);
    }
  }

  /** The run's end: won or GAME OVER, and every race. */
  private drawEnd(ctx: CanvasRenderingContext2D): void {
    const r = this.run;
    drawText(ctx, r.won ? 'RUN WON!' : 'GAME OVER', CX, 80, 7, r.won ? COLORS.goldLight : BEHIND);
    this.panel(ctx, CX - 330, 140, 660, 450, '');
    r.history.forEach((h, i) => {
      const y = 170 + i * 36;
      const c = h.won ? LEAD : BEHIND;
      drawText(ctx, `RACE ${h.race + 1}${h.boss ? ' BOSS' : ''}`, CX - 300, y, 2, COLORS.text, { align: 'left' });
      drawText(ctx, `BET X${h.bet}`, CX - 60, y, 2, '#9dff6a', { align: 'left' });
      drawText(ctx, `${fmtNum(h.you)} TO ${fmtNum(h.rival)}`, CX + 160, y, 2, COLORS.text);
      drawText(ctx, h.won ? 'WON' : 'LOST', CX + 300, y, 2, c, { align: 'right' });
    });
  }

  /** A machine's name, its score and a pip per spin, over it. */
  private drawSide(ctx: CanvasRenderingContext2D, side: SideId): void {
    const x = MACHINE_CX[side];
    const you = side === 'player';
    const spun = you ? this.race.log.you.length : this.race.log.rival.length;
    drawText(ctx, you ? 'KNIGHT (YOU)' : `RIVAL  BET X${this.race.bet}`, x, 112, 3, you ? COLORS.goldLight : '#9dff6a');
    drawText(ctx, fmtNum(you ? this.shown.you : this.shown.rival), x, 168, 6, COLORS.text);
    const n = this.race.spins;
    for (let i = 0; i < n; i++) {
      const px = x + (i - (n - 1) / 2) * 26;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(px - 9, 214, 18, 18);
      ctx.fillStyle = i < spun ? (you ? COLORS.goldLight : '#9dff6a') : COLORS.panelLight;
      ctx.fillRect(px - 6, 217, 12, 12);
    }
    // KNIGHT's EDGE: what the next sword strike pays.
    if (you) drawText(ctx, `SWORD EDGE ${fmtNum(this.shownEdge)}`, x, 247, 2 * this.edgePunch, STEEL);
    // The rival's cheat, and when it comes.
    else drawText(ctx, `CHEAT: GUNK ON SPIN ${GUNK.on.join(', ')}`, x, 247, 1.5, GUNK_GREEN);
  }

  /** The middle: whose spin it is, and the gap (NEED on your last spin). */
  private drawScoreboard(ctx: CanvasRenderingContext2D): void {
    const r = this.race;
    const round = Math.min(r.round + 1, r.spins);
    drawText(ctx, r.phase === 'over' ? 'FINAL' : `SPIN ${round} OF ${r.spins}`, CX, 112, 2.5, COLORS.textDim);
    if (r.phase === 'over') return;
    const gap = this.shown.you - this.shown.rival;
    const yourTurn = (r.phase === 'hold' || r.phase === 'landed') && !this.busy;
    let text: string;
    let color: string;
    if (yourTurn && r.lastSpin && gap < 0) [text, color] = [`NEED ${fmtNum(-gap)}`, BEHIND];
    else if (gap > 0) [text, color] = [`YOU LEAD BY ${fmtNum(gap)}`, LEAD];
    else if (gap < 0) [text, color] = [`BEHIND BY ${fmtNum(-gap)}`, BEHIND];
    else [text, color] = ['TIED', COLORS.text];
    const pw = Math.max(250, text.length * 15 + 30);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(CX - pw / 2, 146, pw, 44);
    ctx.fillStyle = color;
    ctx.fillRect(CX - pw / 2, 146, pw, 3);
    drawText(ctx, text, CX, 169, text.length > 16 ? 2.5 : 3, color);
    drawText(ctx, (r.phase === 'rival' && !this.payingYou) || (this.busy && r.phase === 'hold') ? "RIVAL'S SPIN" : 'YOUR SPIN', CX, 216, 2, COLORS.textDim);
  }

  /** What each payer pays: a pair and three of a kind (the rival's pays are times its BET). */
  private drawPaytable(ctx: CanvasRenderingContext2D): void {
    const top = MACHINE_TOP;
    const pw = 270;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(CX - pw / 2 - 3, top - 3, pw + 6, 288 + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(CX - pw / 2, top, pw, 288);
    drawText(ctx, 'PAYS', CX - 20, top + 22, 2, COLORS.goldLight);
    drawText(ctx, 'X2', CX + 40, top + 22, 2, COLORS.pair);
    drawText(ctx, 'X3', CX + 100, top + 22, 2, COLORS.triple);
    [...PAYERS].reverse().forEach((p, i) => {
      const y = top + 62 + i * 44;
      drawSprite(ctx, p as SpriteId, CX - 100, y, 2.6);
      // Your pays, times your MULT (gold when a pick doubled them).
      const m = this.race.mult(p);
      const c = m > 1 ? COLORS.goldLight : COLORS.text;
      drawText(ctx, PAYER_NAME[p], CX - 74, y, 2, c, { align: 'left' });
      drawText(ctx, fmtNum(PAYTABLE[p].pair * m), CX + 40, y, 2, c);
      drawText(ctx, fmtNum(PAYTABLE[p].triple * m), CX + 100, y, 2, c);
    });
    // KNIGHT's SWORD: it pays its EDGE (and a fresh one doubles it).
    const sy = top + 62 + 4 * 44;
    drawSprite(ctx, 'sword', CX - 100, sy, 2.6);
    drawText(ctx, 'SWORD', CX - 74, sy, 2, STEEL, { align: 'left' });
    drawText(ctx, 'EDGE X2', CX + 70, sy, 2, STEEL);
    drawText(ctx, `RIVAL PAYS X${this.race.bet}`, CX, top + 272, 1.5, '#9dff6a');
  }

  /** The rival reaches over: GUNK lands on one of your cells (it pays half while it's there). */
  private async gunkIt(g: Gunk): Promise<void> {
    const win = reelWindow('player');
    const x = win.x + PITCH * (g.reel + 0.5);
    const y = win.y + PITCH * 1.5;
    this.sounds.slimeLaunch();
    await this.callout('GUNK!', MACHINE_CX.enemy, GUNK_GREEN, 0.35);
    this.sounds.slimeSplat();
    this.camera.shake(5, 0.25);
    this.particles.burst({ x, y, count: 26, colors: [GUNK_GREEN, '#4cc234', '#b8f25a'], speed: [120, 360], gravity: 700 });
    this.gunkView = g;
    await this.clock.tween({ from: 0, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.gunkFx = v) });
    await this.callout('HALF PAY', x, GUNK_GREEN, 0.5, y - 60);
  }

  /** The gunk washes off after your spin pays (held or not). */
  private async washGunk(): Promise<void> {
    if (!this.gunkView) return;
    await this.clock.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (this.gunkFx = v) });
    this.gunkView = null;
  }

  /** A short plated callout (it pops, holds, and goes). */
  private async callout(text: string, x: number, color: string, hold = 0.45, y = MACHINE_TOP + MACHINE_H + 34): Promise<void> {
    const t = this.fx.add(new FloatText(text, x, y, 3, color));
    t.plate = true;
    void this.clock.tween({ from: 0.4, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (t.punch = v) });
    await this.clock.wait(hold);
    this.fx.remove(t);
  }

  /** Every SWORD in sight wears what it would pay now (off the line too, so a NUDGE onto it reads). */
  private drawEdges(ctx: CanvasRenderingContext2D): void {
    const win = reelWindow('player');
    // The gunked cell: green goo over it (the symbol still shows through: you see what got gunked) and a 1/2 badge.
    const g = this.gunkView;
    if (g) {
      const reel = this.machines.player.reels[g.reel];
      for (let row = 0; row < 3 && !reel.spinning; row++) {
        if (reel.indexAtRow(row) !== g.cell) continue;
        const bx = win.x + PITCH * g.reel + 6;
        const by = win.y + PITCH * row + 6 + reel.bounce;
        const k = this.gunkFx;
        ctx.save();
        ctx.globalAlpha = 0.38 * k;
        ctx.fillStyle = GUNK_GREEN;
        ctx.fillRect(bx, by, PITCH - 12, (PITCH - 12) * k);
        // Drips off the bottom edge.
        ctx.globalAlpha = 0.6 * k;
        for (let d = 0; d < 4; d++) ctx.fillRect(bx + 8 + d * 20, by + (PITCH - 12) * k - 2, 8, 6 + ((d * 7) % 11));
        ctx.globalAlpha = k;
        ctx.strokeStyle = GUNK_GREEN;
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, PITCH - 12, PITCH - 12);
        ctx.restore();
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(bx, by, 44, 22);
        drawText(ctx, '1/2', bx + 22, by + 11, 2, GUNK_GREEN);
      }
    }
    const text = fmtNum(this.shownEdge);
    const w = text.length * 12 + 8;
    this.machines.player.reels.forEach((reel, i) => {
      if (reel.spinning) return;
      for (let row = 0; row < 3; row++) {
        if (reel.cellAtRow(row).symbol !== 'sword') continue;
        const x = win.x + PITCH * (i + 1) - 6 - w;
        const y = win.y + PITCH * row + PITCH - 24 + reel.bounce;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(x, y, w, 20);
        drawText(ctx, text, x + w / 2, y + 10, 2, STEEL);
      }
    });
  }

  /** HELD frames on held reels; while a NUDGE is live, an arrow on each reel (the symbol above drops). */
  private drawHolds(ctx: CanvasRenderingContext2D, t: number): void {
    const win = reelWindow('player');
    const r = this.race;
    const yourMove = !this.busy && r.phase !== 'over';
    for (let i = 0; i < 3; i++) {
      const x = win.x + PITCH * i;
      if (r.held[i]) {
        ctx.strokeStyle = COLORS.goldLight;
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 4, win.y + 4, PITCH - 8, MACHINE_H - 8);
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(x + PITCH / 2 - 30, win.y + MACHINE_H - 14, 60, 22);
        drawText(ctx, 'HELD', x + PITCH / 2, win.y + MACHINE_H - 3, 2, COLORS.goldLight);
      } else if (yourMove && r.phase === 'hold' && this.hoverReel === i && r.canHold(i)) {
        ctx.strokeStyle = 'rgba(255,224,138,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 6, win.y + 6, PITCH - 12, MACHINE_H - 12);
      }
      if (yourMove && r.canStillNudge) {
        const a = 0.55 + 0.45 * Math.sin(t * 5 + i);
        const ax = x + PITCH / 2;
        const ay = win.y + PITCH - 4;
        ctx.save();
        ctx.globalAlpha = this.hoverReel === i ? 1 : a;
        ctx.fillStyle = COLORS.outline;
        ctx.beginPath();
        ctx.moveTo(ax - 14, ay - 9);
        ctx.lineTo(ax + 14, ay - 9);
        ctx.lineTo(ax, ay + 9);
        ctx.fill();
        ctx.fillStyle = '#5ad8e8';
        ctx.beginPath();
        ctx.moveTo(ax - 10, ay - 7);
        ctx.lineTo(ax + 10, ay - 7);
        ctx.lineTo(ax, ay + 6);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /** Under your machine: HOLDs and NUDGEs left, and what a tap on a reel does right now. */
  private drawTray(ctx: CanvasRenderingContext2D, t: number): void {
    const r = this.race;
    if (r.phase === 'over') return;
    const x = MACHINE_CX.player;
    const y = MACHINE_TOP + MACHINE_H + 74;
    const chip = (label: string, n: number, cx: number, color: string, live: boolean) => {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(cx - 74, y - 20, 148, 40);
      ctx.fillStyle = live ? color : COLORS.panelLight;
      ctx.fillRect(cx - 74, y - 20, 148, 3);
      drawText(ctx, `${label} ${n}`, cx, y + 1, 2.5, n > 0 ? color : COLORS.textDim);
    };
    const yourMove = !this.busy;
    chip('HOLD', r.phase === 'hold' ? r.holdsLeft - r.heldCount : r.holdsLeft, x - 80, COLORS.goldLight, yourMove && r.phase === 'hold');
    chip('NUDGE', r.nudgesLeft, x + 80, '#5ad8e8', yourMove && r.canStillNudge);
    let hint = '';
    if (yourMove && r.phase === 'hold') hint = r.holdsLeft - r.heldCount > 0 && r.heldCount < 2 ? 'TAP A REEL TO HOLD IT' : r.heldCount ? 'HELD REELS KEEP THEIR SYMBOL' : 'NO HOLDS LEFT';
    else if (yourMove && r.canStillNudge) hint = 'TAP A REEL TO NUDGE IT DOWN, OR PAY';
    if (yourMove && r.phase === 'hold' && r.gunkOnLine) hint = 'GUNKED: IT STILL MATCHES, BUT PAYS HALF';
    if (hint) drawText(ctx, hint, x, y + 42, 1.5, COLORS.text, { alpha: 0.75 + 0.25 * Math.sin(t * 3) });
  }
}
