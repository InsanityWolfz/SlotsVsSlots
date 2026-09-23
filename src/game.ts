import { Sounds } from './audio/sounds';
import { Synth } from './audio/synth';
import { mergeConfig, type GameConfig, type SideId } from './core/config';
import { Fight } from './core/fight';
import { turnRow, type TurnRow } from './core/log';
import { StatsTracker } from './core/stats';
import { Camera } from './present/camera';
import { Clock } from './present/clock';
import { Director } from './present/director';
import { FxLayer } from './present/fx';
import { HudView } from './present/hud';
import { COLORS, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, W } from './present/layout';
import { MachineView } from './present/machine';
import { Particles } from './present/particles';
import { defaultJuice, type JuiceToggles, type Stage } from './present/stage';
import { Background } from './render/background';
import { drawText } from './render/text';
import { Button } from './ui/button';
import { Recap } from './ui/recap';

const CFG_KEY = 'slotvslot.config.v2';
const PREFS_KEY = 'slotvslot.prefs.v2';
const AUTO_DELAY = 0.35;

interface Prefs {
  speed: number;
  auto: boolean;
  juice: JuiceToggles;
  muted: boolean;
}

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable — prefs just won't persist */
  }
}

export type Phase = 'ready' | 'fighting' | 'recap';

export class Game {
  cfg: GameConfig;
  prefs: Prefs;
  readonly synth = new Synth();
  readonly sounds = new Sounds(this.synth);
  readonly camera = new Camera();
  readonly particles = new Particles();
  readonly background = new Background();
  readonly ui = new Clock();
  readonly recap: Recap;

  stage!: Stage;
  director!: Director;
  fight!: Fight;
  tracker!: StatsTracker;
  phase: Phase = 'ready';
  presenting = false;
  awaitingSpin = false;
  rows: TurnRow[] = [];
  fightNo = 0;
  /** Seed to replay on Rematch. */
  lastSeed: number | null = null;
  time = 0;
  /** Listeners for the DOM tooling (combat log / tuning panel). */
  onRows: (() => void)[] = [];
  onFightChange: (() => void)[] = [];

  private token = 0;
  private spinResolve: (() => void) | null = null;
  private audioStarted = false;
  buttons: Button[] = [];
  private spinBtn!: Button;
  private autoBtn!: Button;
  private startBtn!: Button;
  private speedBtns: Button[] = [];
  private recapBtns: Button[] = [];
  private muteBtn!: Button;
  toolButtons: { tune: Button; log: Button } | null = null;

  constructor() {
    this.cfg = mergeConfig(load(CFG_KEY));
    const p = load<Partial<Prefs>>(PREFS_KEY) ?? {};
    this.prefs = { speed: p.speed ?? 1, auto: p.auto ?? true, juice: { ...defaultJuice(), ...(p.juice ?? {}) }, muted: p.muted ?? false };
    this.recap = new Recap(this.ui, (prog) => this.sounds.tick(prog));
    this.buildButtons();
    this.applyJuice();
    this.newFight(false);
  }

  // ---- setup -------------------------------------------------------------------------

  private btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void, opts = {}): Button {
    const b = new Button(label, x, y, w, h, onClick, this.ui, () => this.sounds.click(), opts);
    this.buttons.push(b);
    return b;
  }

  private buildButtons(): void {
    const px = MACHINE_CX.player;
    const by = 648;
    this.spinBtn = this.btn('SPIN', px, by, 96, 96, () => this.requestSpin(), {
      circle: true,
      idlePulse: true,
      textScale: 3,
      ring: () => this.prefs.auto,
    });
    this.autoBtn = this.btn('AUTO', px - 116, by, 84, 44, () => this.setAuto(!this.prefs.auto));
    [1, 2, 4].forEach((s, i) => this.speedBtns.push(this.btn(`${s}X`, px + 90 + i * 48, by, 42, 44, () => this.setSpeed(s))));
    this.startBtn = this.btn('START FIGHT', W / 2 + 10, by, 196, 56, () => this.startOrRestart(), { idlePulse: true, textScale: 3 });
    const ex = MACHINE_CX.enemy;
    const tune = this.btn('TUNE', ex - 110, by, 90, 44, () => {});
    const log = this.btn('LOG', ex, by, 90, 44, () => {});
    this.muteBtn = this.btn('SOUND', ex + 110, by, 90, 44, () => this.setMuted(!this.prefs.muted));
    this.toolButtons = { tune, log };
    this.recapBtns = [
      this.btn('REMATCH', W / 2 - 230, 0, 190, 50, () => this.newFight(true, this.lastSeed)),
      this.btn('NEW FIGHT', W / 2, 0, 190, 50, () => this.newFight(true)),
      this.btn('COPY LOG', W / 2 + 230, 0, 190, 50, () => void this.copyLog()),
    ];
    this.syncButtons();
  }

  private syncButtons(): void {
    this.autoBtn.toggled = this.prefs.auto;
    this.speedBtns.forEach((b, i) => (b.toggled = [1, 2, 4][i] === this.prefs.speed));
    this.spinBtn.enabled = this.awaitingSpin;
    this.startBtn.label = this.phase === 'ready' ? 'START FIGHT' : 'RESTART';
    this.startBtn.opts.idlePulse = this.phase === 'ready';
    this.muteBtn.label = this.prefs.muted ? 'MUTED' : 'SOUND';
    this.muteBtn.toggled = this.prefs.muted;
    for (const b of this.recapBtns) b.visible = this.phase === 'recap';
  }

  applyJuice(): void {
    const j = this.prefs.juice;
    Object.assign(this.camera.enabled, { shake: j.shake, zoom: j.zoom, chroma: j.chroma, flash: j.flash });
    this.particles.enabled = j.particles;
    this.synth.setMuted(this.prefs.muted || !j.audio);
    this.savePrefs();
  }

  savePrefs(): void {
    save(PREFS_KEY, this.prefs);
  }

  saveConfig(): void {
    save(CFG_KEY, this.cfg);
  }

  // ---- fight flow --------------------------------------------------------------------

  newFight(start: boolean, seed: number | null = null): void {
    this.token++;
    this.recap.hide();
    this.presenting = false;
    this.awaitingSpin = false;
    this.spinResolve = null;
    // The previous fight's clock is abandoned here, so any reel mid-spin never lands to
    // stop its own loop — cut them explicitly.
    this.synth.stopLoops();
    this.synth.enabled = true;
    this.camera.dimTarget = 0;
    this.fight = new Fight(this.cfg, seed ?? this.cfg.seed ?? undefined);
    this.lastSeed = this.fight.seed;
    this.tracker = new StatsTracker(this.fight);
    const clock = new Clock();
    clock.speed = this.prefs.speed;
    const sides: SideId[] = ['player', 'enemy'];
    const machines = Object.fromEntries(sides.map((s) => [s, new MachineView(s, this.fight.sides[s], this.sounds)])) as Stage['machines'];
    const huds = Object.fromEntries(
      sides.map((s) => {
        const c = this.fight.sides[s];
        return [s, new HudView(s, c.maxHp, s === 'player', this.cfg.specialCost)];
      }),
    ) as Stage['huds'];
    this.stage = {
      clock,
      camera: this.camera,
      particles: this.particles,
      fx: new FxLayer(),
      synth: this.synth,
      sounds: this.sounds,
      machines,
      huds,
      juice: this.prefs.juice,
      gutter: { turn: 0, side: null, pulse: 0 },
    };
    this.director = new Director(this.stage);
    this.phase = start ? 'fighting' : 'ready';
    this.syncButtons();
    this.onFightChange.forEach((f) => f());
    if (start) {
      this.fightNo++;
      void this.run(this.token);
    }
  }

  private startOrRestart(): void {
    this.newFight(true);
  }

  private async run(token: number): Promise<void> {
    const clock = this.stage.clock;
    await clock.wait(0.3);
    while (!this.fight.over) {
      if (token !== this.token) return;
      if (this.fight.next === 'player' && !this.prefs.auto) {
        this.awaitingSpin = true;
        this.syncButtons();
        await new Promise<void>((r) => (this.spinResolve = r));
        this.awaitingSpin = false;
        this.syncButtons();
      } else {
        await clock.wait(AUTO_DELAY);
      }
      if (token !== this.token) return;
      const result = this.fight.step();
      this.tracker.record(result.events);
      this.rows.push(turnRow(this.fight, result, this.fightNo));
      this.onRows.forEach((f) => f());
      this.presenting = true;
      await this.director.playTurn(result);
      if (token !== this.token) return;
      this.presenting = false;
      if (clock.skipping) {
        clock.endSkip();
        this.synth.enabled = true;
      }
    }
    this.synth.stopLoops();
    this.phase = 'recap';
    this.syncButtons();
    await this.recap.show(this.tracker.stats);
  }

  requestSpin(): void {
    if (!this.awaitingSpin || !this.spinResolve) return;
    const r = this.spinResolve;
    this.spinResolve = null;
    r();
  }

  skip(): void {
    if (!this.presenting || this.stage.clock.skipping) return;
    this.synth.enabled = false;
    this.stage.clock.skip();
  }

  setAuto(on: boolean): void {
    this.prefs.auto = on;
    this.savePrefs();
    if (on) this.requestSpin();
    this.syncButtons();
  }

  setSpeed(s: number): void {
    this.prefs.speed = s;
    this.stage.clock.speed = s;
    this.savePrefs();
    this.syncButtons();
  }

  setMuted(m: boolean): void {
    this.prefs.muted = m;
    this.applyJuice();
    this.syncButtons();
  }

  async copyLog(): Promise<void> {
    const text = JSON.stringify({ config: this.cfg, rows: this.rows.filter((r) => r.fight === this.fightNo) }, null, 1);
    try {
      await navigator.clipboard.writeText(text);
      this.recapBtns[2].label = 'COPIED!';
    } catch {
      this.recapBtns[2].label = 'COPY FAILED';
    }
    setTimeout(() => (this.recapBtns[2].label = 'COPY LOG'), 1500);
  }

  // ---- input -------------------------------------------------------------------------

  /** Rendering (and so the game clock) pauses in a hidden tab; pause audio with it. */
  setHidden(hidden: boolean): void {
    if (!this.audioStarted) return;
    if (hidden) void this.synth.ctx.suspend();
    else this.synth.resume();
  }

  private startAudio(): void {
    this.synth.resume();
    if (!this.audioStarted) {
      this.audioStarted = true;
      this.synth.startAmbient();
    }
  }

  private active: Button | null = null;

  pointerDown(x: number, y: number): void {
    this.startAudio();
    const b = this.buttons.find((b) => b.visible && b.contains(x, y));
    if (b) {
      this.active = b;
      b.down();
      return;
    }
    this.skip();
  }

  pointerUp(x: number, y: number): void {
    const b = this.active;
    this.active = null;
    b?.up(b.contains(x, y));
  }

  pointerMove(x: number, y: number): boolean {
    let any = false;
    for (const b of this.buttons) {
      b.hover = b.visible && b.contains(x, y);
      any ||= b.hover && b.enabled;
    }
    return any;
  }

  key(k: string): boolean {
    this.startAudio();
    switch (k) {
      case ' ':
        if (this.phase === 'ready') this.newFight(true);
        else if (this.awaitingSpin) this.requestSpin();
        else this.skip();
        return true;
      case '1':
        this.setSpeed(1);
        return true;
      case '2':
        this.setSpeed(2);
        return true;
      case '3':
        this.setSpeed(4);
        return true;
      case 'a':
        this.setAuto(!this.prefs.auto);
        return true;
      case 'r':
        this.newFight(true);
        return true;
      case 'm':
        this.setMuted(!this.prefs.muted);
        return true;
    }
    return false;
  }

  // ---- frame -------------------------------------------------------------------------

  update(realDt: number): void {
    const dt = Math.min(realDt, 1 / 20);
    this.time += dt;
    this.ui.tick(dt);
    const gdt = this.stage.clock.tick(dt);
    this.camera.update(dt);
    this.particles.update(gdt);
    this.background.update(dt);
    for (const b of this.buttons) b.update(dt);
    const by = this.recap.buttonY - 30;
    for (const b of this.recapBtns) b.y = by;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    const s = this.stage;
    this.syncOoze();
    ctx.save();
    this.camera.apply(ctx);
    this.background.draw(ctx, t);
    if (this.camera.dim > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${this.camera.dim})`;
      ctx.fillRect(-40, -40, W + 80, H + 80);
    }
    this.background.drawMarquee(ctx, t);
    s.huds.player.draw(ctx, t);
    s.huds.enemy.draw(ctx, t);
    s.machines.player.draw(ctx, s.clock.time);
    s.machines.enemy.draw(ctx, s.clock.time);
    s.fx.draw(ctx, s.clock.time, -Infinity, 20);
    this.drawGutter(ctx, t);
    this.particles.draw(ctx);
    s.fx.draw(ctx, s.clock.time, 20, Infinity);
    ctx.restore();

    if (this.camera.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.camera.flash);
      ctx.fillStyle = this.camera.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    for (const b of this.buttons) if (!this.recapBtns.includes(b)) b.draw(ctx, t);
    this.recap.draw(ctx);
    for (const b of this.recapBtns) b.draw(ctx, t);
    if (this.phase === 'ready') this.drawHint(ctx, t);
  }

  /** Mirror the slime on the player's displayed strips into the HUD counter. */
  private syncOoze(): void {
    const hud = this.stage.huds.player;
    let n = 0;
    let total = 0;
    for (const reel of this.stage.machines.player.reels) {
      total += reel.cells.length;
      for (const c of reel.cells) if (c.slimed) n++;
    }
    if (n !== hud.ooze) hud.oozePunch = 1.5;
    hud.oozePunch += (1 - hud.oozePunch) * 0.15;
    hud.ooze = n;
    hud.oozeTotal = total;
  }

  private drawGutter(ctx: CanvasRenderingContext2D, t: number): void {
    const g = this.stage.gutter;
    const cx = W / 2;
    const cy = MACHINE_TOP + MACHINE_H / 2;
    if (g.turn > 0) {
      drawText(ctx, `ROUND ${Math.ceil(g.turn / 2)}`, cx, cy - 78, 3, COLORS.textDim, { punch: 1 + g.pulse * 0.3 });
      if (g.side)
        drawText(ctx, g.side === 'player' ? "HERO'S TURN" : "SLIME'S TURN", cx, cy - 46, 2, g.side === 'player' ? COLORS.goldLight : COLORS.slime, { punch: 1 + g.pulse * 0.5 });
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
    drawText(ctx, 'VS', cx, cy + 70, 6, '#ff6a5a', { alpha: 0.35 + 0.1 * Math.sin(t * 2) });
    if (this.prefs.speed > 1) drawText(ctx, `${this.prefs.speed}X SPEED`, cx, cy + 120, 2, COLORS.textDim);
  }

  private arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, s: number): void {
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

  private drawHint(ctx: CanvasRenderingContext2D, t: number): void {
    drawText(ctx, 'PRESS START FIGHT', W / 2, MACHINE_TOP + MACHINE_H / 2 - 20, 2, COLORS.text, { alpha: 0.5 + 0.5 * Math.sin(t * 4) });
    drawText(ctx, 'SPACE: SPIN/SKIP  A: AUTO  1-3: SPEED  R: RESTART', W / 2, H - 14, 2, COLORS.textDim);
  }
}
