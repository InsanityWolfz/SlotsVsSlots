import type { Sounds } from '../audio/sounds';
import type { Camera } from '../present/camera';
import { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { Banner, FloatText, FxLayer, Projectile } from '../present/fx';
import { COLORS, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, PITCH, reelWindow, W } from '../present/layout';
import { MachineView } from '../present/machine';
import { Particles } from '../present/particles';
import { drawSprite } from '../render/sprites';
import { drawText, fmtNum } from '../render/text';
import { Button } from '../ui/button';
import type { SideId } from '../core/config';
import { Duel, METER, type Fighter, type MSym, type Side, type TurnLog } from './duel';

const CX = W / 2;
/** The SWORD meter: shiny orange. The SHIELD meter: blue. */
const ORANGE = { hi: '#ffd08a', mid: '#ff8a1c', lo: '#b34a0c', glow: '#ffb347' };
const BLUE = { hi: '#a8dcff', mid: '#3b8ef0', lo: '#1d3a8c', glow: '#7cc4ff' };
const tone = (m: MSym) => (m === 'sword' ? ORANGE : BLUE);
const sideId = (s: Side): SideId => (s === 'you' ? 'player' : 'enemy');

/** A meter's spot: beside its machine (SWORD on the left, SHIELD on the right). */
function meterRect(side: Side, m: MSym) {
  const win = reelWindow(sideId(side));
  const w = side === 'you' ? 40 : 30;
  const x = m === 'sword' ? win.x - 24 - w - 12 : win.x + MACHINE_W + 24 + 12;
  return { x, y: win.y, w, h: MACHINE_H };
}

function viewOf(f: Fighter) {
  return {
    reels: f.reels.map((strip, r) => ({ cells: strip.map((symbol) => ({ symbol, slimed: false })), stop: f.stops[r] })),
    frozen: [0, 0, 0],
    locked: [0, 0, 0],
    hexed: [0, 0, 0],
  };
}

/**
 * THE METERS PROTOTYPE (user, 2026-10-17): KNIGHT vs SLIME. Spin; every sword and shield in sight fills its meter
 * (5 to fill); then use one full meter (FIRE the sword, or raise the SHIELD for the slime's next turn) or end the turn.
 */
export class MeterScene {
  duel!: Duel;
  private clock = new Clock();
  private fx = new FxLayer();
  private particles = new Particles();
  private machines!: Record<SideId, MachineView>;
  /** Meters and HP on screen (they tick toward the real ones as the presentation plays). */
  private shown!: Record<Side, { sword: number; shield: number; hp: number }>;
  private punch: Record<Side, Record<MSym, number>> = { you: { sword: 1, shield: 1 }, enemy: { sword: 1, shield: 1 } };
  private busy = false;
  private buttons: Button[] = [];
  private spinBtn: Button;
  private fireBtn: Button;
  private blockBtn: Button;
  private againBtn: Button;
  private menuBtn: Button;
  private pressed: Button | null = null;
  private token = 0;
  private time = 0;

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
    const sw = meterRect('you', 'sword');
    const sh = meterRect('you', 'shield');
    this.fireBtn = btn('FIRE', sw.x + sw.w / 2, 620, 120, 56, () => void this.act('sword'));
    this.blockBtn = btn('BLOCK', sh.x + sh.w / 2, 620, 130, 56, () => void this.act('shield'));
    this.spinBtn = btn('SPIN', CX + 80, 650, 220, 72, () => this.pressSpin(), true);
    this.againBtn = btn('REMATCH', CX - 130, 650, 240, 64, () => this.start(), true);
    this.menuBtn = btn('MENU', CX + 140, 650, 160, 64, () => this.onExit());
    this.start();
  }

  start(): void {
    this.token++;
    this.clock.skip();
    this.clock.endSkip();
    this.fx.clear();
    this.duel = new Duel();
    this.machines = {
      player: new MachineView('player', viewOf(this.duel.you), this.sounds),
      enemy: new MachineView('enemy', viewOf(this.duel.enemy), this.sounds),
    };
    const s = (f: Fighter) => ({ sword: 0, shield: 0, hp: f.hp });
    this.shown = { you: s(this.duel.you), enemy: s(this.duel.enemy) };
    this.busy = false;
    this.machines.player.active = 1;
  }

  // ---- turns --------------------------------------------------------------------------

  private pressSpin(): void {
    if (this.busy) return;
    if (this.duel.phase === 'spin') void this.yourSpin();
    else if (this.duel.phase === 'act') {
      this.duel.pass();
      void this.enemyTurn();
    }
  }

  private async yourSpin(): Promise<void> {
    const tok = this.token;
    this.busy = true;
    const log = this.duel.spin();
    await this.playSpin('you', log);
    if (tok !== this.token) return;
    this.busy = false;
    this.clock.endSkip();
  }

  private async act(m: MSym): Promise<void> {
    if (this.busy || this.duel.phase !== 'act') return;
    if (!this.duel.full('you', m)) return void this.sounds.fizzle();
    const tok = this.token;
    this.busy = true;
    const log = this.duel.act(m)!;
    await this.playAction(log);
    if (tok !== this.token) return;
    if (this.duel.winner) return this.finish();
    await this.enemyTurn();
  }

  private async enemyTurn(): Promise<void> {
    const tok = this.token;
    this.busy = true;
    this.setActive('enemy');
    await this.clock.wait(0.35);
    if (tok !== this.token) return;
    const youGuarded = this.duel.you.guard;
    const logs = this.duel.enemyTurn();
    await this.playSpin('enemy', logs[0]);
    if (tok !== this.token) return;
    if (logs[1]) await this.playAction(logs[1]);
    if (tok !== this.token) return;
    if (youGuarded) await this.callout('SHIELD DOWN', MACHINE_CX.player, BLUE.hi, 0.3);
    if (this.duel.phase === 'over') return this.finish();
    this.setActive('you');
    this.busy = false;
    this.clock.endSkip();
  }

  private finish(): void {
    this.setActive(null);
    const won = this.duel.winner === 'you';
    const b = this.fx.add(new Banner(won ? 'SLIME DEFEATED!' : 'KNIGHT FALLS', won ? COLORS.goldLight : COLORS.danger, CX, 360, 6));
    b.sub = `IN ${this.duel.turn} TURN${this.duel.turn === 1 ? '' : 'S'}`;
    b.z = 40;
    void this.clock.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(1.8), onUpdate: (v) => (b.scale = v) });
    if (won) {
      this.sounds.victory();
      this.particles.burst({ x: CX, y: 360, count: 70, colors: ['#ffe08a', '#ffd23f', '#ffffff'], speed: [200, 600], gravity: 500 });
    } else this.sounds.defeat();
    this.busy = false;
    this.clock.endSkip();
  }

  // ---- presentation -------------------------------------------------------------------

  private setActive(side: Side | null): void {
    for (const s of ['you', 'enemy'] as const) void this.clock.to(this.machines[sideId(s)], 'active', side === s ? 1 : 0, 0.25);
  }

  /** The reels land, then every sword and shield in sight lights up and pops into its meter, one by one. */
  private async playSpin(side: Side, log: TurnLog): Promise<void> {
    const m = this.machines[sideId(side)];
    m.clearRowFx();
    await m.spin(this.duel[side].stops, false, this.clock);
    const win = reelWindow(sideId(side));
    for (const c of log.counted) {
      const fx = m.reels[c.reel].rows[c.row];
      const sh = this.shown[side];
      const fills = sh[c.sym] < METER.size;
      fx.glowColor = tone(c.sym).glow;
      fx.glow = fills ? 0.85 : 0.3;
      void this.clock.tween({ from: 1.2, to: 1, dur: 0.14, ease: sineOut, onUpdate: (v) => (fx.punch = v) });
      if (fills) {
        sh[c.sym]++;
        const p = this.punch[side];
        void this.clock.tween({ from: 1.25, to: 1, dur: 0.16, ease: sineOut, onUpdate: (v) => (p[c.sym] = v) });
        const r = meterRect(side, c.sym);
        this.particles.burst({ x: win.x + PITCH * (c.reel + 0.5), y: win.y + PITCH * (c.row + 0.5), count: 5, colors: [tone(c.sym).hi, tone(c.sym).mid], speed: [60, 160], gravity: 200, life: [0.2, 0.4] });
        this.particles.burst({ x: r.x + r.w / 2, y: r.y + r.h - (sh[c.sym] - 0.5) * (r.h / METER.size), count: 6, colors: [tone(c.sym).hi, '#ffffff'], speed: [40, 140], gravity: -60, life: [0.25, 0.5] });
        this.sounds.ding(Math.min(6, sh[c.sym]));
        if (sh[c.sym] === METER.size) this.sounds.stingerSmall();
      }
      await this.clock.wait(fills ? 0.07 : 0.02);
    }
    await this.clock.wait(0.2);
    for (const reel of m.reels) for (const r of reel.rows) r.glow = 0;
  }

  /** FIRE: the sword flies and hits (or bounces off a raised shield). SHIELD: it goes up. */
  private async playAction(log: TurnLog): Promise<void> {
    const side = log.side;
    const other: Side = side === 'you' ? 'enemy' : 'you';
    const from = reelWindow(sideId(side));
    const to = reelWindow(sideId(other));
    this.shown[side][log.action === 'fire' ? 'sword' : 'shield'] = 0;
    if (log.action === 'shield') {
      this.sounds.shieldGain(2);
      await this.callout('SHIELD UP', from.x + MACHINE_W / 2, BLUE.hi, 0.45);
      return;
    }
    // The sword flies across.
    const sx = from.x + MACHINE_W / 2;
    const tx = to.x + MACHINE_W / 2;
    const y = from.y + MACHINE_H / 2;
    const p = this.fx.add(new Projectile('swordProjectile', sx, y, 5, side === 'enemy', ORANGE.glow));
    this.sounds.whoosh();
    await this.clock.tween({
      from: 0,
      to: 1,
      dur: 0.35,
      onUpdate: (k) => {
        p.x = sx + (tx - sx) * k;
        p.y = y - Math.sin(k * Math.PI) * 60;
        p.mark();
      },
    });
    this.fx.remove(p);
    if (log.blocked) {
      this.sounds.block();
      this.particles.burst({ x: tx, y, count: 24, colors: [BLUE.hi, BLUE.mid, '#ffffff'], speed: [150, 400], gravity: 300 });
      await this.callout('BLOCKED!', tx, BLUE.hi, 0.5);
      return;
    }
    const target = this.machines[sideId(other)];
    this.sounds.hit(log.damage / 12);
    this.camera.shake(10, 0.3);
    this.clock.hitstop(5);
    target.flash = 0.6;
    void this.clock.tween({ from: 0.6, to: 0, dur: 0.25, onUpdate: (v) => (target.flash = v) });
    void this.clock.tween({ from: side === 'you' ? 18 : -18, to: 0, dur: 0.3, ease: sineOut, onUpdate: (v) => (target.kx = v) });
    this.particles.burst({ x: tx, y, count: 30, colors: [ORANGE.hi, ORANGE.mid, '#ffffff'], speed: [180, 480], gravity: 500 });
    const dmg = this.fx.add(new FloatText(`-${fmtNum(log.damage)}`, tx, to.y - 30, 5, COLORS.danger));
    dmg.plate = true;
    const hp0 = this.shown[other].hp;
    const hp1 = this.duel[other].hp;
    await this.clock.tween({ from: hp0, to: hp1, dur: 0.45, onUpdate: (v) => (this.shown[other].hp = Math.round(v)) });
    await this.clock.wait(0.25);
    this.fx.remove(dmg);
  }

  private async callout(text: string, x: number, color: string, hold: number): Promise<void> {
    const t = this.fx.add(new FloatText(text, x, MACHINE_TOP + MACHINE_H + 30, 3, color));
    t.plate = true;
    void this.clock.tween({ from: 0.4, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (t.punch = v) });
    await this.clock.wait(hold);
    this.fx.remove(t);
  }

  // ---- input --------------------------------------------------------------------------

  private visibleButtons(): Button[] {
    const d = this.duel;
    const over = d.phase === 'over' && !this.busy;
    const acting = d.phase === 'act' && !this.busy;
    this.spinBtn.visible = this.fireBtn.visible = this.blockBtn.visible = !over;
    this.spinBtn.enabled = !this.busy && (d.phase === 'spin' || d.phase === 'act');
    this.spinBtn.label = d.phase === 'act' ? 'END TURN' : 'SPIN';
    this.fireBtn.enabled = acting && d.full('you', 'sword');
    this.blockBtn.enabled = acting && d.full('you', 'shield');
    this.againBtn.visible = this.menuBtn.visible = over;
    return this.buttons.filter((b) => b.visible);
  }

  /** Tapping a meter uses it (the same as its button). */
  private meterAt(x: number, y: number): MSym | null {
    for (const m of ['sword', 'shield'] as const) {
      const r = meterRect('you', m);
      if (x >= r.x - 8 && x < r.x + r.w + 8 && y >= r.y && y < r.y + r.h) return m;
    }
    return null;
  }

  pointerDown(x: number, y: number): void {
    const b = this.visibleButtons().find((b) => b.contains(x, y));
    if (b) {
      this.pressed = b;
      b.down();
      return;
    }
    if (this.busy) return void this.clock.skip();
    const m = this.meterAt(x, y);
    if (m) void this.act(m);
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
    const m = this.meterAt(x, y);
    return any || (!!m && this.duel.phase === 'act' && this.duel.full('you', m));
  }

  key(k: string): boolean {
    if (k === 'escape') {
      this.onExit();
      return true;
    }
    if (k === ' ' || k === 'enter') {
      if (this.busy) this.clock.skip();
      else if (this.duel.phase === 'over') this.start();
      else this.pressSpin();
      return true;
    }
    if (k === '1' || k === 'f') return void this.act('sword'), true;
    if (k === '2' || k === 'b') return void this.act('shield'), true;
    return false;
  }

  // ---- frame --------------------------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    const gdt = this.clock.tick(dt);
    this.particles.update(gdt);
    for (const b of this.visibleButtons()) b.update(dt);
  }

  drawWorld(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    for (const s of ['you', 'enemy'] as const) {
      this.drawHud(ctx, s);
      this.drawMeter(ctx, s, 'sword', t);
      this.drawMeter(ctx, s, 'shield', t);
    }
    this.machines.player.draw(ctx, this.clock.time);
    this.machines.enemy.draw(ctx, this.clock.time);
    for (const s of ['you', 'enemy'] as const) if (this.duel[s].guard) this.drawGuard(ctx, s, t);
    this.drawStatus(ctx);
    this.fx.draw(ctx, this.clock.time, -Infinity, Infinity);
    this.particles.draw(ctx);
  }

  drawUi(ctx: CanvasRenderingContext2D): void {
    for (const b of this.visibleButtons()) b.draw(ctx, this.time);
  }

  /** Name and HP bar over a machine. */
  private drawHud(ctx: CanvasRenderingContext2D, side: Side): void {
    const x = MACHINE_CX[sideId(side)];
    const f = this.duel[side];
    const hp = this.shown[side].hp;
    drawText(ctx, side === 'you' ? 'KNIGHT' : 'SLIME', x, 120, 4, side === 'you' ? COLORS.goldLight : '#9dff6a');
    const w = 300;
    const y = 166;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - w / 2 - 3, y - 3, w + 6, 30);
    ctx.fillStyle = '#3a1620';
    ctx.fillRect(x - w / 2, y, w, 24);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(x - w / 2, y, (w * Math.max(0, hp)) / f.maxHp, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - w / 2, y, (w * Math.max(0, hp)) / f.maxHp, 6);
    drawText(ctx, `${fmtNum(Math.max(0, hp))} / ${fmtNum(f.maxHp)}`, x, y + 12, 2, COLORS.text);
    drawText(ctx, `HITS FOR ${fmtNum(f.hit)}`, x, 222, 1.5, COLORS.textDim);
  }

  /** A meter: 5 bubbly segments that fill bottom-up; full, it glows and says what it does. */
  private drawMeter(ctx: CanvasRenderingContext2D, side: Side, m: MSym, t: number): void {
    const r = meterRect(side, m);
    const c = tone(m);
    const n = this.shown[side][m];
    const full = n >= METER.size;
    const k = this.punch[side][m];
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(k, k);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    if (full) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6);
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = c.glow;
      ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
      ctx.restore();
    }
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.fillStyle = '#120a1c';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const seg = r.h / METER.size;
    for (let i = 0; i < METER.size; i++) {
      const y = r.y + r.h - (i + 1) * seg;
      if (i < n) {
        // A shiny segment: dark edge, bright body, a highlight stripe, and a bubble that drifts up inside.
        ctx.fillStyle = c.lo;
        ctx.fillRect(r.x + 2, y + 2, r.w - 4, seg - 4);
        ctx.fillStyle = c.mid;
        ctx.fillRect(r.x + 4, y + 4, r.w - 8, seg - 8);
        ctx.fillStyle = c.hi;
        ctx.fillRect(r.x + 6, y + 6, 6, seg - 12);
        const by = y + seg - 10 - (((t * 30 + i * 13 + (m === 'sword' ? 0 : 7)) % (seg - 14)) | 0);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(r.x + r.w / 2 + ((i % 2) * 6 - 2), by, 4, 4);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(r.x + 4, y + 4, r.w - 8, seg - 8);
      }
    }
    ctx.restore();
    // Its symbol over it, and what a full one does under it.
    const iconScale = side === 'you' ? 2.5 : 2;
    drawSprite(ctx, m, r.x + r.w / 2, r.y - 26, iconScale);
    const label = full ? (m === 'sword' ? 'FIRE!' : 'BLOCK!') : `${n}/${METER.size}`;
    drawText(ctx, label, r.x + r.w / 2, r.y + r.h + 18, side === 'you' ? 2 : 1.5, full ? c.hi : COLORS.textDim, { alpha: full ? 0.75 + 0.25 * Math.sin(t * 6) : 1 });
  }

  /** A raised shield: a blue frame over the machine and a SHIELD UP tag. */
  private drawGuard(ctx: CanvasRenderingContext2D, side: Side, t: number): void {
    const win = reelWindow(sideId(side));
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 4);
    ctx.strokeStyle = BLUE.glow;
    ctx.lineWidth = 6;
    ctx.strokeRect(win.x - 26, win.y - 26, MACHINE_W + 52, MACHINE_H + 52);
    ctx.restore();
    drawSprite(ctx, 'shield', win.x + MACHINE_W / 2, win.y - 34, 3);
  }

  /** The middle: whose turn it is and what to do. */
  private drawStatus(ctx: CanvasRenderingContext2D): void {
    const d = this.duel;
    if (d.phase === 'over') return;
    drawText(ctx, `TURN ${d.turn}`, CX, 280, 2.5, COLORS.textDim);
    let text = '';
    if (d.phase === 'enemy' || (this.busy && d.phase !== 'act')) text = this.busy && d.phase === 'spin' ? '' : "SLIME'S TURN";
    if (!this.busy && d.phase === 'spin') text = 'SPIN';
    if (!this.busy && d.phase === 'act') text = d.full('you', 'sword') || d.full('you', 'shield') ? 'USE A METER' : 'END TURN';
    if (text) drawText(ctx, text, CX, 320, 2.5, COLORS.text);
    if (!this.busy && d.phase === 'act' && d.enemy.guard) drawText(ctx, 'SLIME SHIELD UP', CX, 360, 2, BLUE.hi);
    if (!this.busy && d.phase === 'act') {
      const e = d.enemy.meter.sword;
      if (e >= METER.size - 2) drawText(ctx, `SLIME SWORD ${e}/${METER.size}`, CX, 400, 2, COLORS.danger);
    }
  }
}
