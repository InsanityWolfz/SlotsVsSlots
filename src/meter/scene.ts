import type { Sounds } from '../audio/sounds';
import type { SymbolId, SideId } from '../core/config';
import type { Camera } from '../present/camera';
import { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { Banner, FloatText, FxLayer, Projectile } from '../present/fx';
import { COLORS, MACHINE_CX, MACHINE_H, MACHINE_TOP, MACHINE_W, PITCH, reelWindow, W } from '../present/layout';
import { MachineView } from '../present/machine';
import { Particles } from '../present/particles';
import { drawSprite, type SpriteId } from '../render/sprites';
import { drawText, fmtNum } from '../render/text';
import { Button } from '../ui/button';
import { addSeg, attackOf, Duel, isQuality, METER, total, worth, type Action, type Fighter, type Machine, type MSym, type Seg, type Side, type TurnLog } from './duel';

const CX = W / 2;
type Tone = { hi: string; mid: string; lo: string; glow: string };
/** Each meter's colour: SWORD shiny orange, SHIELD blue, HEART pink, COIN silver, SLIME green. */
const TONE: Record<MSym, Tone> = {
  sword: { hi: '#ffd08a', mid: '#ff8a1c', lo: '#b34a0c', glow: '#ffb347' },
  shield: { hi: '#a8dcff', mid: '#3b8ef0', lo: '#1d3a8c', glow: '#7cc4ff' },
  heart: { hi: '#ffc4e8', mid: '#ff5aa8', lo: '#9c1f5c', glow: '#ff8ac8' },
  coin: { hi: '#f4f6fa', mid: '#b8c2d0', lo: '#5a6474', glow: '#dfe6f0' },
  slime: { hi: '#c8ff9a', mid: '#5ed15a', lo: '#2a6e2a', glow: '#8aff7a' },
  bolt: { hi: '#fffbd0', mid: '#ffe34a', lo: '#a8820c', glow: '#fff3a0' },
};
/** A QUALITY meter's better segments: gold (a line pair), red-hot (a line jackpot). */
const GOLD: Tone = { hi: '#fff3a8', mid: '#ffd23f', lo: '#a8741a', glow: '#ffe08a' };
const HOT: Tone = { hi: '#ffb0a0', mid: '#ff3a2e', lo: '#8e1f1a', glow: '#ff6a4a' };
const segTone = (m: MSym, s: Seg): Tone => (!isQuality(m) || s === 1 ? TONE[m] : s === 3 ? HOT : GOLD);
const sideId = (s: Side): SideId => (s === 'you' ? 'player' : 'enemy');
/** A symbol's art ('heart' is the slot heart). */
const art = (s: MSym): SpriteId => (s === 'heart' ? 'slotHeart' : s) as SpriteId;

/** Each side's meters, left of the machine then right (innermost first). */
const LAYOUT: Record<Side, { left: MSym[]; right: MSym[] }> = {
  you: { left: ['sword'], right: ['shield'] },
  enemy: { left: ['sword'], right: ['shield'] },
};
const MW = 36;

function meterRect(side: Side, m: MSym) {
  const win = reelWindow(sideId(side));
  const { left, right } = LAYOUT[side];
  // (TESLA's CHARGE sits where KNIGHT's SWORD does: the attack meter is always on the left.)
  const i = left.indexOf(m === 'bolt' ? 'sword' : m);
  const x = i >= 0 ? win.x - 26 - MW - i * (MW + 14) : win.x + MACHINE_W + 26 + right.indexOf(m) * (MW + 14);
  return { x, y: win.y, w: MW, h: MACHINE_H };
}

function viewOf(f: Fighter) {
  return {
    reels: f.reels.map((strip, r) => ({ cells: strip.map((s) => ({ symbol: art(s) as SymbolId, slimed: false })), stop: f.stops[r] })),
    frozen: [0, 0, 0],
    locked: [0, 0, 0],
    hexed: [0, 0, 0],
  };
}

/**
 * THE METERS PROTOTYPE (user, 2026-10-17): KNIGHT vs SLIME. Spin; every symbol in sight fills its meter, three
 * paylines set the fill's worth; then use ONE full meter (FIRE, BLOCK, HEAL) or end the turn. COIN cashes out on its
 * own; the slime's SLIME meter gunks your cells.
 */
export class MeterScene {
  duel!: Duel;
  private clock = new Clock();
  private fx = new FxLayer();
  private particles = new Particles();
  private machines!: Record<SideId, MachineView>;
  /** Meters, HP and coins on screen (they tick toward the real ones as the presentation plays). */
  private shown!: Record<Side, { meters: Record<MSym, Seg[]>; hp: number; coins: number; chain: number }>;
  private punch: Record<Side, Partial<Record<MSym, number>>> = { you: {}, enemy: {} };
  /** A winning line being drawn across a machine (rows 0-2). */
  private lineFx: { side: Side; row: number; color: string; progress: number; alpha: number } | null = null;
  /** 0..1: goo over each side's gunked SWORD meter (it washes off when that sword fires). */
  private gunkFx: Record<Side, number> = { you: 0, enemy: 0 };
  private busy = false;
  private buttons: Button[] = [];
  private actBtns: Record<Action, Button>;
  private spinBtn: Button;
  private againBtn: Button;
  private switchBtn: Button;
  private menuBtn: Button;
  /** The machine-pick screen (before a fight), its buttons, and the machine picked. */
  private picking = true;
  private pickBtns: Record<'knight' | 'tesla', Button>;
  private machine: Machine = 'knight';
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
    this.actBtns = {
      sword: btn('FIRE', 150, 640, 150, 60, () => void this.act('sword')),
      shield: btn('BLOCK', 330, 640, 160, 60, () => void this.act('shield')),
    };
    this.spinBtn = btn('SPIN', 640, 650, 220, 72, () => this.pressSpin(), true);
    this.againBtn = btn('REMATCH', CX - 250, 650, 220, 64, () => this.start(), true);
    this.switchBtn = btn('MACHINES', CX - 10, 650, 230, 64, () => (this.picking = true));
    this.menuBtn = btn('MENU', CX + 210, 650, 160, 64, () => this.onExit());
    this.pickBtns = {
      knight: btn('KNIGHT', CX - 220, 560, 300, 80, () => this.pick('knight'), true),
      tesla: btn('TESLA', CX + 220, 560, 300, 80, () => this.pick('tesla'), true),
    };
    this.start();
  }

  private pick(m: Machine): void {
    this.machine = m;
    this.picking = false;
    this.start();
  }

  start(): void {
    this.token++;
    this.clock.skip();
    this.clock.endSkip();
    this.fx.clear();
    this.lineFx = null;
    this.duel = new Duel(undefined, this.machine);
    this.machines = {
      player: new MachineView('player', viewOf(this.duel.you), this.sounds),
      enemy: new MachineView('enemy', viewOf(this.duel.enemy), this.sounds),
    };
    const s = (f: Fighter) => ({ meters: { sword: [], shield: [], heart: [], coin: [], slime: [], bolt: [] } as Record<MSym, Seg[]>, hp: f.hp, coins: 0, chain: 1 });
    this.shown = { you: s(this.duel.you), enemy: s(this.duel.enemy) };
    this.gunkFx = { you: 0, enemy: 0 };
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

  private async act(a: Action): Promise<void> {
    if (this.busy || this.duel.phase !== 'act') return;
    if (!this.duel.canAct('you', a)) return void this.sounds.fizzle();
    const tok = this.token;
    this.busy = true;
    const log = this.duel.act(a)!;
    await this.playAction(log);
    if (tok !== this.token) return;
    if (this.duel.winner) return this.finish();
    await this.enemyTurn();
  }

  private async enemyTurn(): Promise<void> {
    const tok = this.token;
    this.busy = true;
    // TESLA: a turn without a FIRE broke the CHAIN.
    if (this.shown.you.chain > 1 && this.duel.you.chain === 1) {
      this.shown.you.chain = 1;
      this.sounds.fizzle();
      await this.callout('CHAIN BROKEN', MACHINE_CX.player, TONE.bolt.hi, 0.45);
    }
    this.setActive('enemy');
    await this.clock.wait(0.35);
    if (tok !== this.token) return;
    const youGuarded = this.duel.you.guard;
    const logs = this.duel.enemyTurn();
    await this.playSpin('enemy', logs[0]);
    if (tok !== this.token) return;
    if (logs[1]) await this.playAction(logs[1]);
    if (tok !== this.token) return;
    if (youGuarded) await this.callout('SHIELD DOWN', MACHINE_CX.player, TONE.shield.hi, 0.3);
    if (this.duel.winner) return this.finish();
    this.setActive('you');
    this.busy = false;
    this.clock.endSkip();
  }

  private finish(): void {
    this.setActive(null);
    const won = this.duel.winner === 'you';
    const b = this.fx.add(new Banner(won ? 'SLIME DEFEATED!' : 'KNIGHT FALLS', won ? COLORS.goldLight : COLORS.danger, CX, 360, 6));
    b.sub = `IN ${this.duel.turn} TURN${this.duel.turn === 1 ? '' : 'S'}${won ? `, ${fmtNum(this.duel.you.coins)} COINS` : ''}`;
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

  /**
   * The reels land; each winning line is drawn and called (it sets its fill's worth), then every symbol in sight
   * lights up and pops into its meter, one by one, in its colour; then the automatic meters (COIN, SLIME) go off.
   */
  private async playSpin(side: Side, log: TurnLog): Promise<void> {
    const m = this.machines[sideId(side)];
    m.clearRowFx();
    await m.spin(this.duel[side].stops, false, this.clock);
    const win = reelWindow(sideId(side));
    const cx = win.x + MACHINE_W / 2;
    for (const l of log.lines) {
      const jackpot = l.tier === 'jackpot';
      const col = isQuality(l.sym) ? (jackpot ? HOT : GOLD) : TONE[l.sym];
      const fx = { side, row: l.row, color: col.mid, progress: 0, alpha: 1 };
      this.lineFx = fx;
      await this.clock.tween({ from: 0, to: 1, dur: 0.16, onUpdate: (v) => (fx.progress = v) });
      const name = l.sym.toUpperCase();
      const what =
        l.sym === 'sword' ? (jackpot ? 'RED HOT' : 'GOLD') : l.sym === 'shield' ? (jackpot ? 'FULL' : `+${METER.pairFill}`) : l.sym === 'slime' ? 'GUNK' : jackpot ? 'X3' : 'X2';
      if (jackpot) {
        this.sounds.fanfareJackpot();
        this.camera.shake(8, 0.3);
      } else this.sounds.stingerSmall();
      await this.callout(`${name} ${jackpot ? 'JACKPOT' : 'PAIR'}! ${what}`, cx, col.hi, jackpot ? 0.55 : 0.35, win.y - 30);
      this.lineFx = null;
    }
    const sh = this.shown[side];
    for (const f of log.fills) {
      const fx = m.reels[f.reel].rows[f.row];
      const col = segTone(f.meter, f.seg);
      fx.glowColor = col.glow;
      fx.glow = 0.85;
      void this.clock.tween({ from: 1.2, to: 1, dur: 0.14, ease: sineOut, onUpdate: (v) => (fx.punch = v) });
      // HEART and COIN pay at once: a little number pops off the cell and the HP or COINS ticks up.
      if (f.meter === 'heart' || f.meter === 'coin') {
        const heart = f.meter === 'heart';
        if (heart) sh.hp = Math.min(this.duel[side].maxHp, sh.hp + f.amount);
        else sh.coins += f.amount;
        const t = this.fx.add(new FloatText(`+${fmtNum(f.amount)}`, win.x + PITCH * (f.reel + 0.5), win.y + PITCH * (f.row + 0.5) - 20, 2.5, col.hi));
        t.plate = true;
        void this.clock.tween({ from: 0, to: 1, dur: 0.5, onUpdate: (v) => ((t.y = win.y + PITCH * (f.row + 0.5) - 20 - v * 30), (t.alpha = 1 - v * v)) }).then(() => this.fx.remove(t));
        if (heart) this.sounds.heal();
        else this.sounds.coin(Math.min(3, f.seg));
        this.particles.burst({ x: win.x + PITCH * (f.reel + 0.5), y: win.y + PITCH * (f.row + 0.5), count: 6, colors: [col.hi, col.mid], speed: [60, 160], gravity: -80, life: [0.25, 0.45] });
        await this.clock.wait(0.06);
        continue;
      }
      const meter = sh.meters[f.meter];
      if (isQuality(f.meter)) addSeg(meter, f.seg, this.duel.cap(side, f.meter));
      else for (let i = 0; i < f.amount && meter.length < this.duel.cap(side, f.meter); i++) meter.push(1);
      const p = this.punch[side];
      void this.clock.tween({ from: 1.25, to: 1, dur: 0.16, ease: sineOut, onUpdate: (v) => (p[f.meter] = v) });
      const r = meterRect(side, f.meter);
      this.particles.burst({ x: win.x + PITCH * (f.reel + 0.5), y: win.y + PITCH * (f.row + 0.5), count: 5, colors: [col.hi, col.mid], speed: [60, 160], gravity: 200, life: [0.2, 0.4] });
      this.particles.burst({ x: r.x + r.w / 2, y: r.y + r.h - (meter.length - 0.5) * (r.h / this.segCount(f.meter)), count: 5 + f.seg * 3, colors: [col.hi, '#ffffff'], speed: [40, 140], gravity: -60, life: [0.25, 0.5] });
      this.sounds.ding(Math.min(6, meter.length));
      await this.clock.wait(0.06);
    }
    for (const reel of m.reels) for (const r of reel.rows) r.glow = 0;
    sh.hp = this.duel[side].hp;
    sh.coins = this.duel[side].coins;
    // SLIME: a line win gunks the other side's SWORD meter.
    if (log.gunked) await this.playGunk(side);
    await this.clock.wait(0.12);
  }

  /** SLIME: goo pours over the other side's SWORD meter; only its bottom METER.gunkCap bars are left. */
  private async playGunk(side: Side): Promise<void> {
    const other: Side = side === 'you' ? 'enemy' : 'you';
    this.sounds.slimeLaunch();
    await this.clock.wait(0.2);
    this.sounds.slimeSplat();
    this.camera.shake(6, 0.25);
    // TESLA: the gunk shorts the coil; the CHAIN drops to x1.
    if (this.duel[other].machine === 'tesla') {
      const r = meterRect(other, 'bolt');
      this.particles.burst({ x: r.x + r.w / 2, y: r.y + r.h / 2, count: 30, colors: [TONE.slime.hi, TONE.slime.mid, TONE.bolt.hi], speed: [100, 300], gravity: 600 });
      this.shown[other].chain = 1;
      this.sounds.fizzle();
      await this.callout('COIL SHORTED: CHAIN X1', MACHINE_CX[sideId(other)], TONE.slime.hi, 0.7);
      return;
    }
    const r = meterRect(other, 'sword');
    this.particles.burst({ x: r.x + r.w / 2, y: r.y + r.h / 4, count: 30, colors: [TONE.slime.hi, TONE.slime.mid], speed: [100, 300], gravity: 600 });
    this.shown[other].meters.sword = this.shown[other].meters.sword.slice(0, METER.gunkCap);
    await this.clock.tween({ from: 0, to: 1, dur: 0.35, ease: sineOut, onUpdate: (v) => (this.gunkFx[other] = v) });
    await this.callout(`SWORD GUNKED: ${METER.gunkCap} BARS UNTIL YOU FIRE`, MACHINE_CX[sideId(other)], TONE.slime.hi, 0.7);
  }

  /** FIRE: the sword flies and hits (or bounces off a raised shield). BLOCK: the shield goes up. HEAL: HP back. */
  private async playAction(log: TurnLog): Promise<void> {
    const side = log.side;
    const other: Side = side === 'you' ? 'enemy' : 'you';
    const from = reelWindow(sideId(side));
    const to = reelWindow(sideId(other));
    this.shown[side].meters[log.action === 'sword' ? attackOf(this.duel[side]) : 'shield'] = [];
    if (log.action === 'sword' && this.gunkFx[side] > 0) void this.clock.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (this.gunkFx[side] = v) });
    if (log.action === 'shield') {
      this.sounds.shieldGain(2);
      await this.callout('SHIELD UP', from.x + MACHINE_W / 2, TONE.shield.hi, 0.45);
      return;
    }
    const sx = from.x + MACHINE_W / 2;
    const tx = to.x + MACHINE_W / 2;
    const y = from.y + MACHINE_H / 2;
    const tesla = this.duel[side].machine === 'tesla';
    const p = this.fx.add(new Projectile(tesla ? 'bolt' : 'swordProjectile', sx, y, tesla ? 3.5 : 5, side === 'enemy', tesla ? TONE.bolt.glow : TONE.sword.glow));
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
      this.particles.burst({ x: tx, y, count: 24, colors: [TONE.shield.hi, TONE.shield.mid, '#ffffff'], speed: [150, 400], gravity: 300 });
      await this.callout(tesla ? 'BLOCKED! CHAIN HOLDS' : 'BLOCKED!', tx, TONE.shield.hi, 0.5);
      return;
    }
    if (tesla) this.sounds.thunder();
    const target = this.machines[sideId(other)];
    this.sounds.hit(log.damage / 12);
    this.camera.shake(Math.min(18, 6 + log.damage / 20), 0.3);
    this.clock.hitstop(5);
    target.flash = 0.6;
    void this.clock.tween({ from: 0.6, to: 0, dur: 0.25, onUpdate: (v) => (target.flash = v) });
    void this.clock.tween({ from: side === 'you' ? 18 : -18, to: 0, dur: 0.3, ease: sineOut, onUpdate: (v) => (target.kx = v) });
    this.particles.burst({ x: tx, y, count: 30, colors: [TONE.sword.hi, TONE.sword.mid, '#ffffff'], speed: [180, 480], gravity: 500 });
    const dmg = this.fx.add(new FloatText(`-${fmtNum(log.damage)}`, tx, to.y - 30, 5, COLORS.danger));
    dmg.plate = true;
    const hp0 = this.shown[other].hp;
    await this.clock.tween({ from: hp0, to: this.duel[other].hp, dur: 0.45, onUpdate: (v) => (this.shown[other].hp = Math.round(v)) });
    await this.clock.wait(0.25);
    this.fx.remove(dmg);
    // TESLA: a FIRE that lands steps the CHAIN.
    if (tesla && this.duel[side].chain > this.shown[side].chain) {
      this.shown[side].chain = this.duel[side].chain;
      this.sounds.energyPip(this.shown[side].chain);
      await this.callout(`CHAIN X${this.shown[side].chain}!`, from.x + MACHINE_W / 2, TONE.bolt.hi, 0.4);
    }
  }

  /** Segments a meter is drawn with (TESLA's CHARGE is small). */
  private segCount(m: MSym): number {
    return m === 'bolt' ? METER.charge : METER.size;
  }

  private async callout(text: string, x: number, color: string, hold: number, y = MACHINE_TOP + MACHINE_H + 30): Promise<void> {
    const t = this.fx.add(new FloatText(text, x, y, text.length > 22 ? 2.5 : 3, color));
    t.plate = true;
    void this.clock.tween({ from: 0.4, to: 1, dur: 0.2, ease: backOut(2), onUpdate: (v) => (t.punch = v) });
    await this.clock.wait(hold);
    this.fx.remove(t);
  }

  // ---- input --------------------------------------------------------------------------

  private visibleButtons(): Button[] {
    const d = this.duel;
    for (const b of Object.values(this.pickBtns)) b.visible = this.picking;
    if (this.picking) {
      for (const b of [this.spinBtn, this.againBtn, this.switchBtn, this.menuBtn, ...Object.values(this.actBtns)]) b.visible = false;
      return this.buttons.filter((b) => b.visible);
    }
    const over = d.phase === 'over' && !this.busy;
    const acting = d.phase === 'act' && !this.busy;
    this.spinBtn.visible = !over;
    // FIRE shows what it hits for (TESLA: charge x hit x CHAIN).
    this.actBtns.sword.label = acting && d.canAct('you', 'sword') ? `FIRE ${fmtNum(worth(d.you, attackOf(d.you)))}` : 'FIRE';
    this.spinBtn.enabled = !this.busy && (d.phase === 'spin' || d.phase === 'act');
    this.spinBtn.label = d.phase === 'act' ? 'END TURN' : 'SPIN';
    for (const a of ['sword', 'shield'] as const) {
      const b = this.actBtns[a];
      b.visible = !over;
      b.enabled = acting && d.canAct('you', a);
    }
    this.againBtn.visible = this.switchBtn.visible = this.menuBtn.visible = over;
    return this.buttons.filter((b) => b.visible);
  }

  /** Tapping a usable meter uses it (the same as its button). */
  private meterAt(x: number, y: number): Action | null {
    for (const m of ['sword', 'shield'] as const) {
      const r = meterRect('you', m === 'sword' ? attackOf(this.duel.you) : m);
      if (x >= r.x - 6 && x < r.x + r.w + 6 && y >= r.y && y < r.y + r.h) return m;
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
    if (this.picking) return;
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
    if (this.picking) return any;
    const m = this.meterAt(x, y);
    return any || (!!m && this.duel.phase === 'act' && this.duel.canAct('you', m));
  }

  key(k: string): boolean {
    if (k === 'escape') {
      this.onExit();
      return true;
    }
    if (this.picking) {
      if (k === '1') this.pick('knight');
      else if (k === '2') this.pick('tesla');
      return true;
    }
    if (k === ' ' || k === 'enter') {
      if (this.busy) this.clock.skip();
      else if (this.duel.phase === 'over') this.start();
      else this.pressSpin();
      return true;
    }
    const a: Action | null = k === '1' || k === 'f' ? 'sword' : k === '2' || k === 'b' ? 'shield' : null;
    if (a) {
      void this.act(a);
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

  drawWorld(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    if (this.picking) return this.drawPick(ctx, t);
    for (const s of ['you', 'enemy'] as const) {
      this.drawHud(ctx, s);
      this.drawMeter(ctx, s, attackOf(this.duel[s]), t);
      this.drawMeter(ctx, s, 'shield', t);
    }
    this.drawChain(ctx, t);
    this.machines.player.draw(ctx, this.clock.time);
    this.machines.enemy.draw(ctx, this.clock.time);
    this.drawLine(ctx);
    for (const s of ['you', 'enemy'] as const) if (this.duel[s].guard) this.drawGuard(ctx, s, t);
    this.drawStatus(ctx);
    this.fx.draw(ctx, this.clock.time, -Infinity, Infinity);
    this.particles.draw(ctx);
  }

  drawUi(ctx: CanvasRenderingContext2D): void {
    for (const b of this.visibleButtons()) b.draw(ctx, this.time);
  }

  /** Name, HP bar (and your coins) over a machine. */
  private drawHud(ctx: CanvasRenderingContext2D, side: Side): void {
    const x = MACHINE_CX[sideId(side)];
    const f = this.duel[side];
    const hp = this.shown[side].hp;
    drawText(ctx, side === 'you' ? this.duel.you.machine.toUpperCase() : 'SLIME', x, 112, 4, side === 'you' ? COLORS.goldLight : '#9dff6a');
    const w = 300;
    const y = 150;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - w / 2 - 3, y - 3, w + 6, 30);
    ctx.fillStyle = '#3a1620';
    ctx.fillRect(x - w / 2, y, w, 24);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(x - w / 2, y, (w * Math.max(0, hp)) / f.maxHp, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - w / 2, y, (w * Math.max(0, hp)) / f.maxHp, 6);
    drawText(ctx, `${fmtNum(Math.max(0, hp))} / ${fmtNum(f.maxHp)}`, x, y + 12, 2, COLORS.text);
    if (side === 'you') drawText(ctx, `COINS ${fmtNum(this.shown.you.coins)}`, x, 196, 2, GOLD.hi);
  }

  /** A meter: 10 bubbly segments that fill bottom-up (QUALITY meters wear each segment's worth); full, it glows. */
  private drawMeter(ctx: CanvasRenderingContext2D, side: Side, m: MSym, t: number): void {
    const r = meterRect(side, m);
    const base = TONE[m];
    const segs = this.shown[side].meters[m];
    const n = segs.length;
    const cap = this.duel.cap(side, m);
    const full = n >= cap;
    const k = this.punch[side][m] ?? 1;
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(k, k);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    if (full) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6);
      ctx.shadowColor = base.glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = base.glow;
      ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
      ctx.restore();
    }
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.fillStyle = '#120a1c';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    const seg = r.h / this.segCount(m);
    for (let i = 0; i < this.segCount(m); i++) {
      const y = r.y + r.h - (i + 1) * seg;
      if (i < n) {
        const c = segTone(m, segs[i]);
        ctx.fillStyle = c.lo;
        ctx.fillRect(r.x + 2, y + 2, r.w - 4, seg - 4);
        ctx.fillStyle = c.mid;
        ctx.fillRect(r.x + 4, y + 4, r.w - 8, seg - 8);
        ctx.fillStyle = c.hi;
        ctx.fillRect(r.x + 5, y + 5, 4, seg - 10);
        const by = y + seg - 9 - (((t * 30 + i * 13 + m.length * 7) % Math.max(1, seg - 13)) | 0);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(r.x + r.w / 2 + ((i % 2) * 4 - 1), by, 3, 3);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(r.x + 4, y + 4, r.w - 8, seg - 8);
      }
    }
    // A gunked SWORD meter: green goo over the bars above the cap, dripping down.
    const g = m === 'sword' ? this.gunkFx[side] : 0;
    if (g > 0) {
      const top = r.y;
      const h = (r.h - METER.gunkCap * seg) * g;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = TONE.slime.lo;
      ctx.fillRect(r.x, top, r.w, h);
      ctx.fillStyle = TONE.slime.mid;
      ctx.fillRect(r.x + 2, top, r.w - 4, h - 4);
      ctx.fillStyle = TONE.slime.hi;
      ctx.fillRect(r.x + 4, top + 2, 4, Math.max(0, h - 10));
      for (let d = 0; d < 3; d++) ctx.fillRect(r.x + 4 + d * 9, top + h - 2, 5, 4 + ((t * 8 + d * 5) % 7));
      ctx.restore();
    }
    ctx.restore();
    drawSprite(ctx, art(m), r.x + r.w / 2, r.y - 20, 2);
    // Under it: what a full one does (FIRE 160, HEAL 80...), else its count.
    const f = this.duel[side];
    const amount = total(segs) * (m === 'sword' ? f.stats.hit : m === 'heart' ? f.stats.heal : m === 'coin' ? f.stats.coin : 0);
    const label = m === 'bolt' ? `${n}/${cap}` : full ? (m === 'sword' ? `${fmtNum(amount)}` : m === 'heart' ? `+${fmtNum(amount)}` : m === 'shield' ? 'UP' : 'GO') : `${n}${cap < METER.size ? `/${cap}` : ''}`;
    drawText(ctx, label, r.x + r.w / 2, r.y + r.h + 14, 1.5, full ? base.hi : COLORS.textDim, { alpha: full ? 0.75 + 0.25 * Math.sin(t * 6) : 1 });
  }

  /** TESLA: the CHAIN badge over the FIRE button (x1 dim; x2+ crackles). */
  private drawChain(ctx: CanvasRenderingContext2D, t: number): void {
    const d = this.duel;
    if (d.you.machine !== 'tesla') return;
    const c = this.shown.you.chain;
    const live = c > 1;
    const x = 150;
    const y = 596;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 70, y - 14, 140, 28);
    ctx.fillStyle = live ? TONE.bolt.mid : COLORS.panelLight;
    ctx.fillRect(x - 70, y - 14, 140, 3);
    drawText(ctx, `CHAIN X${c}`, x, y + 1, 2.5, live ? TONE.bolt.hi : COLORS.textDim, { alpha: live ? 0.8 + 0.2 * Math.sin(t * 9) : 1 });
  }

  /** The pick: KNIGHT (patience) or TESLA (tempo), each in a line. */
  private drawPick(ctx: CanvasRenderingContext2D, t: number): void {
    drawText(ctx, 'CHOOSE YOUR SLOT MACHINE', CX, 120, 4, COLORS.goldLight);
    const card = (x: number, name: string, sprite: SpriteId, lines: string[], tone: Tone) => {
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - 156, 190, 312, 310);
      ctx.fillStyle = tone.mid;
      ctx.fillRect(x - 153, 193, 306, 304);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(x - 149, 197, 298, 296);
      drawSprite(ctx, sprite, x, 262 + Math.sin(t * 2) * 3, 5);
      drawText(ctx, name, x, 336, 3, tone.hi);
      lines.forEach((l, i) => drawText(ctx, l, x, 376 + i * 26, 1.5, COLORS.text));
    };
    card(CX - 220, 'SWORD: PATIENCE', 'sword', ['A FULL SWORD KEEPS UPGRADING:', 'GOLD, THEN RED HOT.', 'SAVE IT, THEN STRIKE BIG.'], TONE.sword);
    card(CX + 220, 'CHARGE: TEMPO', 'bolt', ['FIRE WITH ANY CHARGE.', 'FIRE TURN AFTER TURN FOR A', 'CHAIN: X2, X3, X4.', 'A TURN WITHOUT A FIRE BREAKS IT.'], TONE.bolt);
  }

  /** A winning line drawn across its row. */
  private drawLine(ctx: CanvasRenderingContext2D): void {
    const l = this.lineFx;
    if (!l) return;
    const win = reelWindow(sideId(l.side));
    const y = win.y + PITCH * (l.row + 0.5);
    ctx.save();
    ctx.globalAlpha = l.alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.color;
    ctx.shadowBlur = 16;
    ctx.fillRect(win.x, y - 3, MACHINE_W * l.progress, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(win.x, y - 1, MACHINE_W * l.progress, 2);
    ctx.restore();
  }

  /** A raised shield: a blue frame over the machine and its icon. */
  private drawGuard(ctx: CanvasRenderingContext2D, side: Side, t: number): void {
    const win = reelWindow(sideId(side));
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 4);
    ctx.strokeStyle = TONE.shield.glow;
    ctx.lineWidth = 6;
    ctx.strokeRect(win.x - 18, win.y - 18, MACHINE_W + 36, MACHINE_H + 36);
    ctx.restore();
    drawSprite(ctx, 'shield', win.x + MACHINE_W / 2, win.y + MACHINE_H + 24, 2.5);
  }

  /** Bottom right: the turn, what to do, and the slime's sword as a warning. */
  private drawStatus(ctx: CanvasRenderingContext2D): void {
    const d = this.duel;
    if (d.phase === 'over') return;
    const x = 1010;
    drawText(ctx, `TURN ${d.turn}`, x, 616, 2, COLORS.textDim);
    let text = "SLIME'S TURN";
    if (!this.busy && d.phase === 'spin') text = 'SPIN';
    if (!this.busy && d.phase === 'act') text = (['sword', 'shield'] as const).some((a) => d.canAct('you', a)) ? 'USE A METER' : 'END TURN';
    if (!this.busy && d.phase === 'act' && d.you.machine === 'tesla' && d.you.chain > 1) text = 'NO FIRE BREAKS THE CHAIN';
    if (this.busy && (d.phase === 'act' || d.phase === 'spin')) text = '';
    if (text) drawText(ctx, text, x, 646, 2.5, COLORS.text);
    if (!this.busy && d.phase === 'act') {
      const e = d.enemy.meters.sword.length;
      if (d.enemy.guard) drawText(ctx, 'SLIME SHIELD UP', x, 680, 2, TONE.shield.hi);
      else if (e >= METER.size - 4) drawText(ctx, `SLIME SWORD ${e}/${METER.size}`, x, 680, 2, COLORS.danger);
    }
  }
}
