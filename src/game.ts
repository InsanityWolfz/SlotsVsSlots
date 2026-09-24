import { Sounds } from './audio/sounds';
import { Synth } from './audio/synth';
import { mergeConfig, type GameConfig, type SideId } from './core/config';
import { actLength, RUN_FIGHTS } from './core/enemies';
import { MAX_STAKE, STAKE, STAKES } from './core/stakes';
import { Fight } from './core/fight';
import { turnRow, type TurnRow } from './core/log';
import { REFLECT_MIN, RELICS } from './core/relics';
import {
  applyOption,
  buy,
  chooseEnemy,
  createRun,
  draftOffers,
  fightConfig,
  finishFight,
  isShopNow,
  completesSet,
  takeLegend,
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
import { drawSprite, type SpriteId, artId } from './render/sprites';
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
  /** HIGH STAKES: best unlocked stake per cabinet, and the stake picked on the cabinet screen. */
  stakes: Partial<Record<CabinetId, number>>;
  stakeSel: number;
  /** THE DEALER unlocked: a run was won at GREEN or higher. */
  act3: boolean;
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

const RELIC_X = 30;
const RELIC_Y = 118;
/** 4 wide so act 2's 10-12 relics never slide under the strip map. */
const RELIC_COLS = 4;
const RELIC_PITCH = 34;

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
      stakes: p.stakes ?? {},
      stakeSel: p.stakeSel ?? 0,
      act3: p.act3 ?? false,
    };
    this.recap = new Recap(this.ui, (prog) => this.sounds.tick(prog));
    this.screens = new RunScreens(this.ui, this.sounds, () => this.cfg, {
      onPick: (o) => this.pickReward(o),
      onSpoils: (r) => this.pickSpoils(r),
      onLegend: (r) => this.pickLegend(r),
      onFight: (i) => this.beginRunFight(i),
      onNewRun: () => this.chooseCabinet(),
      onBuy: (i) => this.buyItem(i),
      onReroll: () => this.rerollShop(),
      onLeave: () => this.leaveCashier(),
      onCabinet: (id) => this.startRun(undefined, id, Math.min(this.prefs.stakeSel, this.stakesNow()[id] ?? 0)),
      onStake: (level) => {
        this.prefs.stakeSel = level;
        this.savePrefs();
      },
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
    for (const b of this.buttons) if (b.label === 'TUNE' || b.label === 'LOG') b.visible = this.screens.mode !== 'cabinet';
    this.muteBtn.visible = this.screens.mode !== 'cabinet';
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

  /** Best stake per cabinet (dev "unlock all" opens every stake). */
  stakesNow(): Partial<Record<CabinetId, number>> {
    return this.prefs.unlockAll ? Object.fromEntries(CABINET_ORDER.map((c) => [c, MAX_STAKE])) : this.prefs.stakes;
  }

  unlockedCabinets(): Set<CabinetId> {
    return new Set(this.prefs.unlockAll ? CABINET_ORDER : this.prefs.unlocked);
  }

  /** START RUN: pick a starting machine first. */
  chooseCabinet(): void {
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    this.phase = 'between';
    this.screens.showCabinets(this.unlockedCabinets(), this.stakesNow(), this.prefs.stakeSel);
    this.syncButtons();
  }

  /** Meta progression: check the finished run against each cabinet's unlock condition. */
  private checkUnlocks(run: RunState): CabinetId[] {
    const got: CabinetId[] = [];
    const reachedBoss = run.records.length >= RUN_FIGHTS + 1 || run.won;
    const beatHouse = run.act > 1 || run.won;
    const beatElite = run.records.some((r) => r.won && run.enemies[r.depth]?.elite);
    const cond: Record<CabinetId, boolean> = {
      knight: true,
      midas: reachedBoss,
      thorn: beatElite,
      tesla: beatHouse,
      joker: beatHouse && run.player.strips.some((s) => (s.wild ?? 0) > 0),
    };
    for (const id of CABINET_ORDER) {
      if (cond[id] && !this.prefs.unlocked.includes(id)) {
        this.prefs.unlocked.push(id);
        got.push(id);
      }
    }
    // Winning at GREEN or higher opens THE DEALER (act 3) for GREEN+ runs.
    const dealerNow = run.won && run.stake >= STAKE.act3 && !this.prefs.act3;
    if (dealerNow) {
      this.prefs.act3 = true;
      this.savePrefs();
    }
    // HIGH STAKES: winning at your best stake unlocks the next one for this cabinet.
    let stakeText = '';
    const best = this.prefs.stakes[run.cabinet] ?? 0;
    if (run.won && run.stake >= best && run.stake < MAX_STAKE) {
      this.prefs.stakes[run.cabinet] = run.stake + 1;
      const next = STAKES[run.stake + 1];
      stakeText = `STAKE ${next.level} ${next.name} UNLOCKED FOR ${CABINETS[run.cabinet].name}: ${next.rule}`;
    }
    if (dealerNow) stakeText = (stakeText ? `${stakeText}. ` : '') + 'ACT 3 UNLOCKED: FROM NOW ON, GREEN+ RUNS FACE THE DEALER';
    this.screens.setStakeUnlockedNow(stakeText);
    if (got.length || stakeText) this.savePrefs();
    return got;
  }

  startRun(seed?: number, cabinet: CabinetId = 'knight', stake = 0): void {
    this.run = createRun(this.cfg, seed, cabinet, stake, this.prefs.act3 || this.prefs.unlockAll);
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
    else if (run.pendingLegend) {
      // The House is gone: set up the idle machines for act 2 so its HUD doesn't linger behind.
      this.newFight(false, null, fightConfig(run, this.cfg), true);
      this.phase = 'between';
      this.screens.showLegend(run, run.pendingLegend, record);
    }
    else if (run.pendingSpoils) this.screens.showSpoils(run, run.pendingSpoils, record);
    else this.screens.showDraft(run, draftOffers(run), record);
    this.syncButtons();
  }

  /** An act's boss fell: take the legendary, then the new act's Cashier opens. */
  private pickLegend(relic: RelicId): void {
    if (!this.run) return;
    takeLegend(this.run, relic);
    if (isShopNow(this.run)) {
      this.shelf = shopOffers(this.run);
      this.screens.showShop(this.run, this.shelf);
      return;
    }
    this.showNextFight();
  }

  private pickSpoils(relic: RelicId): void {
    if (!this.run) return;
    takeSpoils(this.run, relic);
    this.screens.showDraft(this.run, draftOffers(this.run), this.lastRecord);
  }

  private buyItem(i: number): void {
    const item = this.shelf[i];
    if (!this.run || !item) return;
    const finishesSet = completesSet(this.run, item.option);
    if (buy(this.run, item)) {
      if (finishesSet) {
        this.sounds.lucky();
        this.sounds.fanfareJackpot();
      }
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
        fightLabel: this.run && inRun ? (this.run.depth >= actLength(this.run.act) ? 'BOSS' : `ACT ${this.run.act} FIGHT ${this.run.depth + 1}/${actLength(this.run.act)}`) : 'SANDBOX',
        allIn: false,
        reflect: 0,
        turnDamage: 0,
        cracked: false,
        chipsEaten: 0,
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
    // Run screens get first pick: the tool buttons (TUNE/LOG/SOUND) sit under them (ITERATION_8 G3).
    if (this.screens.active && this.screens.pointerDown(x, y)) return;
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
      drawSprite(ctx, 'chip', 38, 30, 2);
      const eaten = this.phase === 'fighting' ? (this.stage.gutter.chipsEaten ?? 0) : 0;
      drawText(ctx, `${Math.max(0, this.run.player.chips - eaten)}`, 56, 30, 3, eaten ? '#ff9a3a' : COLORS.energy, { align: 'left' });
      drawText(ctx, CABINETS[this.run.cabinet].name, 30, 58, 1, COLORS.textDim, { align: 'left' });
      if (this.run.stake > 0) drawText(ctx, `STAKE ${this.run.stake} ${STAKES[this.run.stake].name}`, 30, 78, 2, STAKES[this.run.stake].color, { align: 'left' });
      if (this.fight.isBoss || this.fight.isMirror) {
        drawSprite(ctx, 'chipShield', 120, 30, 2);
        drawText(ctx, `+${this.fight.cfg.player.stackShield ?? 0} SH/TURN`, 138, 30, 2, '#9fd0ff', { align: 'left' });
      }
    }
    const relics = this.relicList();
    if (!relics.length) return;
    drawText(ctx, 'RELICS', RELIC_X + 60, RELIC_Y - 22, 2, COLORS.textDim);
    relics.forEach((r, i) => {
      const x = RELIC_X + 16 + (i % RELIC_COLS) * RELIC_PITCH;
      const y = RELIC_Y + Math.floor(i / RELIC_COLS) * RELIC_PITCH;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - 16, y - 16, 32, 32);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(x - 14, y - 14, 28, 28);
      drawSprite(ctx, RELICS[r].sprite as SpriteId, x, y, 1.6);
    });
  }

  private drawRelicTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.screens.active) return;
    const relics = this.relicList();
    const i = relics.findIndex((_, i) => {
      const x = RELIC_X + 16 + (i % RELIC_COLS) * RELIC_PITCH;
      const y = RELIC_Y + Math.floor(i / RELIC_COLS) * RELIC_PITCH;
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
    else if (this.fight.isDealer) this.drawDeal(ctx, cx, cy + 118, t);
    else if (this.fight.isMirror) {
      this.drawReflection(ctx, cx, cy + 118, t);
      // GREEN stake: the relic it copied from you.
      const copied = [...this.fight.sides.enemy.relics][0];
      if (copied) {
        drawSprite(ctx, RELICS[copied].sprite as SpriteId, cx - 70, cy + 196, 2);
        drawText(ctx, `COPIED ${RELICS[copied].name}`, cx - 50, cy + 196, 1.5, '#c8f0ff', { align: 'left' });
      }
    }
    else drawText(ctx, 'VS', cx, cy + 70, 6, '#ff6a5a', { alpha: 0.35 + 0.1 * Math.sin(t * 2) });
    if (this.prefs.speed > 1) drawText(ctx, `${this.prefs.speed}X SPEED`, cx, this.fight.isBoss || this.fight.isMirror || this.fight.isDealer ? cy - 136 : cy + 172, 2, COLORS.textDim);
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

  /** The Dealer's face-up next card and when it lands (HOUSE RULES / RAISE shown too). */
  private drawDeal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const e = this.fight.sides.enemy;
    const ab = e.ability;
    const g = this.stage.gutter;
    if (!ab || this.stage.huds.enemy.hp <= 0) return;
    const left = Math.max(1, ab.every - this.stage.huds.enemy.charge);
    const soon = left <= 1;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 110, y - 56, 220, 112);
    ctx.fillStyle = soon ? '#ff6a5a' : '#2a6a3a';
    ctx.fillRect(x - 106, y - 52, 212, 104);
    ctx.fillStyle = '#0e2a18';
    ctx.fillRect(x - 101, y - 47, 202, 94);
    drawText(ctx, soon ? 'DEALS NEXT TURN!' : `NEXT DEAL IN ${left}`, x, y - 32, 2, soon ? '#ff6a5a' : '#c8f0c8', { punch: soon ? 1 + 0.08 * Math.sin(t * 12) : 1 });
    const card = g.nextDeal ?? 'shuffle';
    const sprite = card === 'shuffle' ? 'dealShuffle' : card === 'cut' ? 'dealCut' : 'dealRaise';
    drawSprite(ctx, artId(sprite), x - 58, y + 12, 2.5);
    drawText(ctx, card.toUpperCase(), x + 20, y + 2, 3, '#ffffff');
    const what = card === 'shuffle' ? 'SWAPS 3 CELLS' : card === 'cut' ? 'CUTS A CELL/REEL' : 'X2 HIT, X2 JACKPOT';
    drawText(ctx, what, x + 20, y + 26, 1.5, COLORS.textDim);
    if (g.raised) drawText(ctx, 'RAISED: ITS NEXT HIT X2', x, y + 72, 2, '#ffd23f');
    else if (g.houseRules) drawText(ctx, 'HOUSE RULES', x, y + 72, 2, '#ff6a5a');
  }

  /** The Mirror's next Reflection: what your last spin would bounce back, and when. */
  private drawReflection(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const e = this.fight.sides.enemy;
    const ab = e.ability;
    // Hide once the Mirror's presented HP hits 0 (not when the engine resolves the last turn).
    if (!ab || this.stage.huds.enemy.hp <= 0) return;
    const hud = this.stage.huds.enemy;
    const g = this.stage.gutter;
    const dmg = Math.max(REFLECT_MIN, Math.min(ab.power, Math.max(g.reflect ?? 0, g.turnDamage ?? 0)));
    const left = Math.max(1, ab.every - hud.charge);
    const soon = left <= 1;
    const glow = soon ? 0.4 + 0.3 * Math.sin(t * 10) : 0.15;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.shadowColor = '#c8f0ff';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#c8f0ff';
    ctx.fillRect(x - 110, y - 56, 220, 112);
    ctx.restore();
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 110, y - 56, 220, 112);
    ctx.fillStyle = '#7aa8c8';
    ctx.fillRect(x - 106, y - 52, 212, 104);
    ctx.fillStyle = '#10202e';
    ctx.fillRect(x - 101, y - 47, 202, 94);
    drawText(ctx, soon ? 'REFLECTS NEXT!' : `REFLECTION IN ${left}`, x, y - 32, 2, soon ? '#ff6a5a' : '#c8f0ff');
    drawText(ctx, 'AT LEAST', x - 48, y + 10, 1.5, COLORS.textDim);
    drawText(ctx, String(dmg), x + 38, y + 10, 6, soon ? '#ff6a5a' : '#c8f0ff');
    drawText(ctx, 'BEST HIT SINCE ITS LAST', x, y + 36, 1.5, COLORS.textDim);
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
    drawText(ctx, `${this.unlockedCabinets().size}/${CABINET_ORDER.length} SLOT MACHINES`, W / 2, MACHINE_TOP + MACHINE_H / 2 + 100, 2, COLORS.goldLight);
    drawText(ctx, '5 FIGHTS + A BOSS', W / 2, MACHINE_TOP + MACHINE_H / 2 + 30, 2, COLORS.textDim);
    drawText(ctx, 'PICK A REWARD', W / 2, MACHINE_TOP + MACHINE_H / 2 + 56, 2, COLORS.textDim);
    drawText(ctx, 'AFTER EACH WIN', W / 2, MACHINE_TOP + MACHINE_H / 2 + 76, 2, COLORS.textDim);
    drawText(ctx, 'SPACE: SPIN/SKIP  A: AUTO  1-3: SPEED  R: NEW RUN', W / 2, H - 14, 2, COLORS.textDim);
  }
}
