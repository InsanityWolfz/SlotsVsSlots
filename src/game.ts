import { Sounds } from './audio/sounds';
import { Synth } from './audio/synth';
import { mergeConfig, type GameConfig, type SideId } from './core/config';
import { RUN_FIGHTS } from './core/enemies';
import { Fight } from './core/fight';
import { turnRow, type TurnRow } from './core/log';
import { RELICS } from './core/relics';
import {
  applyOption,
  buy,
  chooseEnemy,
  CHIPS,
  createRun,
  draftOffers,
  fightConfig,
  finishFight,
  isShopNow,
  leaveShop,
  needsChoice,
  reroll,
  shopOffers,
  takeSpoils,
  type DraftOption,
  type FightRecord,
  type RunState,
  type ShopItem,
} from './core/run';
import type { RelicId } from './core/config';
import { CABINETS, CABINET_ORDER, type CabinetId } from './core/cabinets';
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
import { drawStripMap } from './present/stripMap';
import { Background } from './render/background';
import { drawSprite, type SpriteId } from './render/sprites';
import { drawText } from './render/text';
import { Button } from './ui/button';
import { Recap } from './ui/recap';
import { RunScreens, wrap } from './ui/runScreens';

const CFG_KEY = 'slotvslot.config.v3';
const PREFS_KEY = 'slotvslot.prefs.v2';
const AUTO_DELAY = 0.35;

interface Prefs {
  speed: number;
  auto: boolean;
  juice: JuiceToggles;
  muted: boolean;
  /** Meta progression: cabinets unlocked across runs. */
  unlocked: CabinetId[];
  /** Dev: every cabinet available regardless of unlocks. */
  unlockAll: boolean;
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

/**
 * title → between (next-enemy preview) → fighting → between (draft → preview) → … → over.
 * 'quick' is a standalone sandbox fight (tuning panel / debug), outside any run.
 */
export type Phase = 'title' | 'fighting' | 'between' | 'over' | 'quick' | 'recap';

const RELIC_X = 22;
const RELIC_Y = 118;

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
  readonly screens: RunScreens;

  stage!: Stage;
  director!: Director;
  fight!: Fight;
  tracker!: StatsTracker;
  run: RunState | null = null;
  phase: Phase = 'title';
  presenting = false;
  awaitingSpin = false;
  rows: TurnRow[] = [];
  fightNo = 0;
  /** Seed to replay on Rematch (quick fights). */
  lastSeed: number | null = null;
  time = 0;
  /** Listeners for the DOM tooling (combat log / tuning panel). */
  onRows: (() => void)[] = [];
  onFightChange: (() => void)[] = [];

  private token = 0;
  private spinResolve: (() => void) | null = null;
  private audioStarted = false;
  private mouse = { x: -1, y: -1 };
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
    this.prefs = {
      speed: p.speed ?? 1,
      auto: p.auto ?? true,
      juice: { ...defaultJuice(), ...(p.juice ?? {}) },
      muted: p.muted ?? false,
      unlocked: p.unlocked ?? ['knight'],
      unlockAll: p.unlockAll ?? false,
    };
    this.recap = new Recap(this.ui, (prog) => this.sounds.tick(prog));
    this.screens = new RunScreens(this.ui, this.sounds, () => this.cfg, {
      onPick: (o) => this.pickReward(o),
      onSpoils: (r) => this.pickSpoils(r),
      onFight: (i) => this.beginRunFight(i),
      onNewRun: () => this.chooseCabinet(),
      onBuy: (i) => this.buyItem(i),
      onReroll: () => this.rerollShop(),
      onLeave: () => this.leaveCashier(),
      onCabinet: (id) => this.startRun(undefined, id),
    });
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
    this.startBtn = this.btn('START RUN', W / 2 + 10, by, 196, 56, () => this.chooseCabinet(), { idlePulse: true, textScale: 3 });
    const ex = MACHINE_CX.enemy;
    const tune = this.btn('TUNE', ex - 110, by, 90, 44, () => {});
    const log = this.btn('LOG', ex, by, 90, 44, () => {});
    this.muteBtn = this.btn('SOUND', ex + 110, by, 90, 44, () => this.setMuted(!this.prefs.muted));
    this.toolButtons = { tune, log };
    this.recapBtns = [
      this.btn('REMATCH', W / 2 - 230, 0, 190, 50, () => this.newFight(true, this.lastSeed)),
      this.btn('NEW RUN', W / 2, 0, 190, 50, () => this.chooseCabinet()),
      this.btn('COPY LOG', W / 2 + 230, 0, 190, 50, () => void this.copyLog()),
    ];
    this.syncButtons();
  }

  private syncButtons(): void {
    this.autoBtn.toggled = this.prefs.auto;
    this.speedBtns.forEach((b, i) => (b.toggled = [1, 2, 4][i] === this.prefs.speed));
    this.spinBtn.enabled = this.awaitingSpin;
    this.startBtn.label = this.phase === 'title' ? 'START RUN' : 'NEW RUN';
    this.startBtn.opts.idlePulse = this.phase === 'title';
    this.muteBtn.label = this.prefs.muted ? 'MUTED' : 'SOUND';
    this.muteBtn.toggled = this.prefs.muted;
    const overlay = this.screens.active || this.phase === 'recap';
    for (const b of [this.spinBtn, this.autoBtn, this.startBtn, ...this.speedBtns]) b.visible = !overlay;
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

  // ---- run flow ----------------------------------------------------------------------

  unlockedCabinets(): Set<CabinetId> {
    return new Set(this.prefs.unlockAll ? CABINET_ORDER : this.prefs.unlocked);
  }

  /** START RUN: pick a starting machine first. */
  chooseCabinet(): void {
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    this.phase = 'between';
    this.screens.showCabinets(this.unlockedCabinets());
    this.syncButtons();
  }

  /** Meta progression: check the finished run against each cabinet's unlock condition. */
  private checkUnlocks(run: RunState): CabinetId[] {
    const got: CabinetId[] = [];
    const reachedBoss = run.records.length >= RUN_FIGHTS + 1 || run.won;
    const beatElite = run.records.some((r) => r.won && run.enemies[r.depth]?.elite);
    const cond: Record<CabinetId, boolean> = {
      knight: true,
      midas: reachedBoss,
      thorn: beatElite,
      tesla: run.won,
      joker: run.won && run.player.strips.some((s) => (s.wild ?? 0) > 0),
    };
    for (const id of CABINET_ORDER) {
      if (cond[id] && !this.prefs.unlocked.includes(id)) {
        this.prefs.unlocked.push(id);
        got.push(id);
      }
    }
    if (got.length) this.savePrefs();
    return got;
  }

  startRun(seed?: number, cabinet: CabinetId = 'knight'): void {
    this.run = createRun(this.cfg, seed, cabinet);
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    // Show the first opponent on the machines behind the preview.
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
    this.phase = 'between';
    this.screens.showNext(this.run);
    this.syncButtons();
  }

  /** Tuning panel "apply": restart with the new base config. */
  restart(): void {
    this.startRun();
  }

  private beginRunFight(option = 0): void {
    if (!this.run) return;
    if (needsChoice(this.run)) chooseEnemy(this.run, option);
    this.screens.hide();
    this.newFight(true, null, fightConfig(this.run, this.cfg), true);
  }

  private lastRecord: FightRecord | null = null;
  private shelf: ShopItem[] = [];

  private afterRunFight(): void {
    const run = this.run!;
    const record = finishFight(run, this.fight);
    this.lastRecord = record;
    this.phase = run.over ? 'over' : 'between';
    if (run.over) {
      this.screens.setUnlockedNow(this.checkUnlocks(run));
      this.screens.showOver(run);
    }
    else if (run.pendingSpoils) this.screens.showSpoils(run, run.pendingSpoils, record);
    else this.screens.showDraft(run, draftOffers(run), record);
    this.syncButtons();
  }

  private pickSpoils(relic: RelicId): void {
    if (!this.run) return;
    takeSpoils(this.run, relic);
    this.screens.showDraft(this.run, draftOffers(this.run), this.lastRecord);
  }

  private buyItem(i: number): void {
    const item = this.shelf[i];
    if (!this.run || !item) return;
    if (buy(this.run, item)) {
      this.sounds.coin(4);
      this.sounds.coin(9);
      this.screens.bought();
    } else {
      this.sounds.fizzle();
      this.screens.deny(i);
    }
  }

  private rerollShop(): void {
    if (!this.run) return;
    const next = reroll(this.run);
    if (!next) return this.sounds.fizzle();
    this.sounds.coin(2);
    this.shelf = next;
    this.screens.showShop(this.run, this.shelf, true);
  }

  private leaveCashier(): void {
    if (!this.run) return;
    leaveShop(this.run);
    this.showNextFight();
  }

  private showNextFight(): void {
    if (!this.run) return;
    // Rebuild the (idle) machines for the next opponent so the preview is accurate.
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
    this.phase = 'between';
    this.screens.showNext(this.run);
    this.syncButtons();
  }

  private pickReward(o: DraftOption): void {
    if (!this.run) return;
    applyOption(this.run, o);
    if (isShopNow(this.run)) {
      this.shelf = shopOffers(this.run);
      this.screens.showShop(this.run, this.shelf);
      return;
    }
    this.showNextFight();
  }

  // ---- fight flow --------------------------------------------------------------------

  newFight(start: boolean, seed: number | null = null, cfg: GameConfig = this.cfg, inRun = false): void {
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
    this.fight = new Fight(cfg, seed ?? cfg.seed ?? undefined);
    this.lastSeed = this.fight.seed;
    this.tracker = new StatsTracker(this.fight);
    const clock = new Clock();
    clock.speed = this.prefs.speed;
    const sides: SideId[] = ['player', 'enemy'];
    const machines = Object.fromEntries(sides.map((s) => [s, new MachineView(s, this.fight.sides[s], this.sounds)])) as Stage['machines'];
    const huds = Object.fromEntries(
      sides.map((s) => {
        const c = this.fight.sides[s];
        const sc = s === 'player' ? cfg.player : cfg.enemy;
        const hud = new HudView(s, c.maxHp, s === 'player', this.fight.cfg.specialCost, {
          name: s === 'player' ? 'HERO' : sc.name,
          portrait: sc.portrait,
          ability: c.ability,
          energy: c.energy,
        });
        hud.hp = hud.ghost = c.hp;
        return [s, hud];
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
      gutter: {
        turn: 0,
        side: null,
        pulse: 0,
        pot: this.fight.pot,
        potPunch: 1,
        fightLabel: this.run && inRun ? (this.run.depth >= RUN_FIGHTS ? 'BOSS' : `FIGHT ${this.run.depth + 1}/${RUN_FIGHTS}`) : 'SANDBOX',
        allIn: false,
      },
    };
    this.director = new Director(this.stage);
    if (start) {
      this.phase = inRun ? 'fighting' : 'quick';
      if (!inRun) {
        this.run = null;
        this.screens.hide();
      }
    }
    this.syncButtons();
    this.onFightChange.forEach((f) => f());
    if (start) {
      this.fightNo++;
      void this.runFight(this.token);
    }
  }

  private async runFight(token: number): Promise<void> {
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
    if (this.phase === 'fighting' && this.run) {
      this.afterRunFight();
      return;
    }
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
    if (this.screens.active && this.screens.pointerDown(x, y)) return;
    this.skip();
  }

  pointerUp(x: number, y: number): void {
    const b = this.active;
    this.active = null;
    b?.up(b.contains(x, y));
    if (this.screens.active) this.screens.pointerUp(x, y);
  }

  pointerMove(x: number, y: number): boolean {
    this.mouse = { x, y };
    let any = false;
    for (const b of this.buttons) {
      b.hover = b.visible && b.contains(x, y);
      any ||= b.hover && b.enabled;
    }
    if (this.screens.active) any = this.screens.pointerMove(x, y) || any;
    return any;
  }

  key(k: string): boolean {
    this.startAudio();
    switch (k) {
      case ' ':
        if (this.phase === 'title') this.chooseCabinet();
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
        this.chooseCabinet();
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
    this.drawRelics(ctx);
    drawStripMap(ctx, s.machines.player, t);
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
    this.drawRelicTooltip(ctx);
    this.screens.draw(ctx, t);
    this.recap.draw(ctx);
    for (const b of this.recapBtns) b.draw(ctx, t);
    if (this.phase === 'title') this.drawHint(ctx, t);
  }

  private relicList() {
    return this.fight.cfg.relics;
  }

  private drawRelics(ctx: CanvasRenderingContext2D): void {
    if (this.run && this.phase !== 'title') {
      drawSprite(ctx, 'chip', 30, 30, 2);
      drawText(ctx, `${this.run.player.chips}`, 48, 30, 3, COLORS.energy, { align: 'left' });
      drawText(ctx, CABINETS[this.run.cabinet].name, 30, 58, 1, COLORS.textDim, { align: 'left' });
      if (this.fight.isBoss) {
        drawSprite(ctx, 'chipShield', 120, 30, 2);
        drawText(ctx, `+${Math.floor(this.run.player.chips / CHIPS.stackPer)} SH/TURN`, 138, 30, 2, '#9fd0ff', { align: 'left' });
      }
    }
    const relics = this.relicList();
    if (!relics.length) return;
    drawText(ctx, 'RELICS', RELIC_X + 60, RELIC_Y - 22, 2, COLORS.textDim);
    relics.forEach((r, i) => {
      const x = RELIC_X + 20 + (i % 3) * 42;
      const y = RELIC_Y + Math.floor(i / 3) * 42;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - 19, y - 19, 38, 38);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(x - 17, y - 17, 34, 34);
      drawSprite(ctx, RELICS[r].sprite as SpriteId, x, y, 2);
    });
  }

  private drawRelicTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.screens.active) return;
    const relics = this.relicList();
    const i = relics.findIndex((_, i) => {
      const x = RELIC_X + 20 + (i % 3) * 42;
      const y = RELIC_Y + Math.floor(i / 3) * 42;
      return Math.abs(this.mouse.x - x) < 19 && Math.abs(this.mouse.y - y) < 19;
    });
    if (i < 0) return;
    const def = RELICS[relics[i]];
    const lines = wrap(def.text, 24);
    const x = RELIC_X + 150;
    const y = RELIC_Y - 10;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 4, y - 4, 320, 40 + lines.length * 20);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, 312, 32 + lines.length * 20);
    drawText(ctx, def.name, x + 10, y + 14, 2, '#c9a0ff', { align: 'left' });
    lines.forEach((l, k) => drawText(ctx, l, x + 10, y + 38 + k * 20, 2, COLORS.text, { align: 'left' }));
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
    if (this.phase === 'title') return;
    drawText(ctx, g.fightLabel, cx, cy - 112, 2, g.fightLabel === 'BOSS' ? '#ff6a5a' : COLORS.textDim);
    if (g.turn > 0) {
      drawText(ctx, `ROUND ${Math.ceil(g.turn / 2)}`, cx, cy - 78, 3, COLORS.textDim, { punch: 1 + g.pulse * 0.3 });
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
    if (this.fight.isBoss) this.drawPot(ctx, cx, cy + 118, t);
    else drawText(ctx, 'VS', cx, cy + 70, 6, '#ff6a5a', { alpha: 0.35 + 0.1 * Math.sin(t * 2) });
    if (this.prefs.speed > 1) drawText(ctx, `${this.prefs.speed}X SPEED`, cx, this.fight.isBoss ? cy - 136 : cy + 172, 2, COLORS.textDim);
  }

  /** The House's progressive pot, front and centre: grows (and glows) with the stakes. */
  private drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    // (x is shifted by the LETHAL shake below.)
    const g = this.stage.gutter;
    const pot = Math.round(g.pot);
    const hud = this.stage.huds.player;
    const cashOut = Math.ceil(pot / 2);
    const stack = this.fight.cfg.player.stackShield ?? 0;
    const lethal = pot > 0 && cashOut >= hud.hp + hud.shield + stack;
    this.stage.huds.enemy.alarm = lethal;
    const tier = lethal ? 4 : pot >= 12 ? 3 : pot >= 6 ? 2 : 1;
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
    const label = lethal ? 'LETHAL!' : g.allIn ? 'ALL IN POT' : 'THE POT';
    drawText(ctx, label, x, y - 32, 2, lethal || g.allIn ? '#ff6a5a' : COLORS.goldLight, { punch: lethal ? 1 + 0.1 * Math.sin(t * 14) : 1 });
    const sprite = tier === 4 ? 'potTier4' : tier === 3 ? 'potTier3' : tier === 2 ? 'potTier2' : 'potTier1';
    drawSprite(ctx, sprite, x - 52, y + 12, tier === 1 ? 3 : 2.5, { flash: glow * 0.5 });
    drawText(ctx, String(pot), x + 34, y + 12, 6, tier >= 3 ? '#ff6a5a' : COLORS.energy, { punch: g.potPunch });
    if (pot > 0) {
      drawSprite(ctx, 'potSkim', x - 70, y + 64, 2);
      drawText(ctx, `NEXT SKIM ${cashOut}`, x - 52, y + 64, 2, lethal ? '#ff6a5a' : COLORS.textDim, { align: 'left' });
    }
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
    drawText(ctx, 'PRESS START RUN', W / 2, MACHINE_TOP + MACHINE_H / 2 - 20, 2, COLORS.text, { alpha: 0.5 + 0.5 * Math.sin(t * 4) });
    drawText(ctx, `${this.unlockedCabinets().size}/${CABINET_ORDER.length} CABINETS`, W / 2, MACHINE_TOP + MACHINE_H / 2 + 100, 2, COLORS.goldLight);
    drawText(ctx, '5 FIGHTS + A BOSS', W / 2, MACHINE_TOP + MACHINE_H / 2 + 30, 2, COLORS.textDim);
    drawText(ctx, 'PICK A REWARD', W / 2, MACHINE_TOP + MACHINE_H / 2 + 56, 2, COLORS.textDim);
    drawText(ctx, 'AFTER EACH WIN', W / 2, MACHINE_TOP + MACHINE_H / 2 + 76, 2, COLORS.textDim);
    drawText(ctx, 'SPACE: SPIN/SKIP  A: AUTO  1-3: SPEED  R: NEW RUN', W / 2, H - 14, 2, COLORS.textDim);
  }
}
