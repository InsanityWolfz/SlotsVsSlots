import { Sounds } from './audio/sounds';
import { Synth } from './audio/synth';
import { mergeConfig, type GameConfig } from './core/config';
import { MAX_STAKE } from './core/stakes';
import { Fight } from './core/fight';
import { type TurnRow } from './core/log';
import { playEncounter, type FightRecord, type RunState, type ShopItem } from './core/run';
import { fightConfig } from './core/fightSetup';
import { letItRide } from './core/endless';
import { CABINET_ORDER, type CabinetId } from './core/cabinets';
import { demoMachines, demoStakes } from './demo';
import { StatsTracker } from './core/stats';
import { Camera } from './present/camera';
import { FightView } from './ui/fightView';
import { Transition } from './ui/transition';
import { Clock } from './present/clock';
import { Director } from './present/director';
import { BEZEL, H, MACHINE_CX, MACHINE_W, W } from './present/layout';
import { T } from './ui/kit';
import { Particles } from './present/particles';
import { type Stage } from './present/stage';
import { Background } from './render/background';
import { Button } from './ui/button';
import { Recap } from './ui/recap';
import { BUILD, RunScreens } from './ui/runScreens';
import { Pause } from './ui/pause';
import { MusicPlayer, SONG_HOME, type SongId } from './audio/music';
import { Focus, type NavRect } from './ui/focus';
import { desktop, steamUnlock } from './build';

import { Coach } from './ui/coach';
import { Menus } from './ui/menus';
import { discover, sanitizeProfile, type Profile } from './core/profile';
import { CFG_KEY, clampVol, clearRunSave, LASTRUN_KEY, load, loadRunSave, PREFS_KEY, PROFILE_KEY, sanitizePrefs, save, SPEEDS, type Prefs } from './saves';
import * as flow from './gameFlow';
import { clockSpeed } from './gameFlow';
import * as input from './gameInput';
import * as frame from './gameDraw';

// (Moved out with the code that uses them; still exported from here, as before the split.)
export { SPEEDS, RUN_KEY, clearRunSave } from './saves';

/** HOLD (experiment): HOLDs a fight. */

/** The quiet tool row (LOG, SOUND, PAUSE): its buttons' width, and the i-th one's centre (the row's right edge lines up
 * with the enemy machine's frame). */
const QUIET_W = 84;
const toolX = (i: number) => Math.round(MACHINE_CX.enemy + MACHINE_W / 2 + BEZEL - QUIET_W / 2 - (2 - i) * (QUIET_W + 10));

export type SettingKey = 'master' | 'music' | 'sfx' | 'shake' | 'motion' | 'fullscreen';
/** Fullscreen through the browser API (the desktop wrapper's window follows it). */
export function toggleFullscreen(on?: boolean): void {
  const d = desktop();
  if (d) return d.setFullscreen(on ?? !d.isFullscreen());
  on ??= !document.fullscreenElement;
  try {
    if (on && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
    else if (!on && document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
  } catch {
    /* not allowed here */
  }
}

/**
 * title → between (next-enemy preview) → fighting → between (draft → preview) → … → over.
 * 'quick' is a standalone sandbox fight (tuning panel / debug), outside any run.
 */
export type Phase = 'title' | 'fighting' | 'between' | 'over' | 'quick' | 'recap';

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
  readonly menus: Menus;
  readonly coach = new Coach();
  readonly focus = new Focus();
  readonly view = new FightView(this);
  readonly pause: Pause = new Pause(this.ui, () => this.sounds.click(), {
    onResume: () => this.setPaused(false),
    onSettings: () => {
      this.menus.showSettings(() => {
        this.menus.hide();
        this.syncButtons();
      }, true);
      this.syncButtons();
    },
    onQuitToMenu: () => {
      this.setPaused(false);
      this.showMenu();
    },
    onAbandon: () => {
      this.setPaused(false);
      this.abandonRun();
      this.showMenu();
    },
    onQuitToDesktop: () => (globalThis as { desktop?: { quit?: () => void } }).desktop?.quit?.(),
  });
  profile: Profile;
  /** TUTORIAL progress: which callouts have been shown (null = not in the tutorial). */
  tut: { fight?: boolean; spin?: boolean; hold?: boolean; buildUp?: boolean; ability?: boolean; draft?: boolean; shop?: boolean } | null = null;

  stage!: Stage;
  director!: Director;
  fight!: Fight;
  tracker!: StatsTracker;
  run: RunState | null = null;
  phase: Phase = 'title';
  presenting = false;
  awaitingSpin = false;
  /** HOLD: your last spin paid a PAIR (the call over your machine offers a HOLD). */
  lastPair = false;
  /** A short note over your machine (a HOLD on a frozen reel). */
  toolNote: { text: string; at: number; ms?: number } | null = null;
  rows: TurnRow[] = [];
  fightNo = 0;
  /** Seed to replay on Rematch (quick fights). */
  lastSeed: number | null = null;
  time = 0;
  /** Listeners for the DOM tooling (combat log / tuning panel). */
  onRows: (() => void)[] = [];
  onFightChange: (() => void)[] = [];

  token = 0;
  spinResolve: (() => void) | null = null;
  private audioStarted = false;
  mouse = { x: -1, y: -1 };
  buttons: Button[] = [];
  private spinBtn!: Button;
  private autoBtn!: Button;
  private startBtn!: Button;
  private speedBtns: Button[] = [];
  /** The BUILD drawer: pulled out (or not) in fights, and how far out it is (0..1, eased). */
  buildOpen = false;
  drawerT = 0;
  /** The drawer's spring (it overshoots a little opening, and shuts clean). */
  drawerV = 0;
  /** Until the player first pulls the drawer, the handle nudges out every few seconds. */
  drawerUsed = false;
  handleHover = 0;
  recapBtns: Button[] = [];
  muteBtn!: Button;
  toolButtons: { tune: Button; log: Button } | null = null;

  lastRecord: FightRecord | null = null;
  /** DEATH RECAP: HP damage the player took this fight, by source. */
  hurt = new Map<string, number>();
  spins = [0, 0];
  shelf: ShopItem[] = [];
  music: MusicPlayer | null = null;
  active: Button | null = null;
  readonly transition = new Transition();
  lastDraw = 0;
  /** The Dealer's table: green felt behind its machine, and the ALL IN warning over it. */
  /** The boss card is open (it pauses the fight). */
  bossCard = false;

  /** publicBuild: no TUNE panel, no saved tuning overrides, no dev unlocks (the hosted playtest). */
  constructor(readonly publicBuild = false) {
    this.cfg = mergeConfig(publicBuild ? undefined : load(CFG_KEY));
    this.prefs = sanitizePrefs(load<Partial<Prefs>>(PREFS_KEY), publicBuild);
    this.profile = sanitizeProfile(load(PROFILE_KEY));
    // Steam: re-grant everything already earned (players who started before the Steam build get credit).
    for (const id of Object.keys(this.profile.achievements)) steamUnlock(id);
    this.menus = new Menus(this.ui, this.sounds, () => this.profile, () => this.unlockedCabinets(), {
      onNewRun: () => this.chooseCabinet(),

      onTutorial: () => flow.startTutorial(this),
      setTitle: (title) => {
        this.profile.title = title;
        this.saveProfile();
      },
      setTrim: (id) => {
        this.profile.trim = id;
        this.saveProfile();
      },
      onReset: () => flow.resetSave(this),
      tutorialDone: () => this.prefs.tutorialDone,
      softLightning: () => this.prefs.juice.softLightning,
      setSoftLightning: (on) => {
        this.prefs.juice.softLightning = on;
        this.applyJuice();
      },
      muted: () => this.prefs.muted,
      setMuted: (on) => this.setMuted(on),
      savedRun: () => flow.savedRunLabel(),
      savedCabinet: () => loadRunSave()?.run.cabinet ?? null,
      lastRun: () => {
        try {
          return localStorage.getItem(LASTRUN_KEY);
        } catch {
          return null;
        }
      },
      onContinue: () => this.continueRun(),
      setting: (k) => this.setting(k),
      setSetting: (k, v) => this.setSetting(k, v),
    });
    this.recap = new Recap(this.ui, (prog) => this.sounds.tick(prog));
    this.screens = new RunScreens(this.ui, this.sounds, {
      onPick: (o) => flow.pickReward(this, o),
      onSpoils: (r) => flow.pickSpoils(this, r),
      onLegend: (r) => flow.pickLegend(this, r),
      onFight: () => this.beginRunFight(),
      onRoute: (i) => this.pickRoute(i),
      onEncounter: (i, bet) => {
        if (!this.run) return null;
        const res = playEncounter(this.run, i, bet);
        // Saved after every play: a quit can't replay a spin you've seen (a game with plays left resumes at its table).
        flow.checkpoint(this, 'next');
        return res;
      },
      onEncounterDone: () => this.advance(),
      // (CASH OUT / NEW RUN from the run-over screen: the Dealer's saved LET IT RIDE choice is spent.)
      onNewRun: () => {
        if (this.phase === 'over') clearRunSave();
        this.chooseCabinet();
      },
      onMenu: () => this.showMenu(),
      onLetItRide: () => this.letItRide(),
      onBuy: (i) => flow.buyItem(this, i),
      onReroll: () => flow.rerollShop(this),
      onLeave: () => flow.leaveCashier(this),
      onCabinet: (id) => this.startRun(undefined, id, Math.min(this.prefs.stakeSel, this.stakesNow()[id] ?? 0)),
      onStake: (level) => {
        this.prefs.stakeSel = level;
        this.savePrefs();
      },
    });
    this.buildButtons();
    this.applyJuice();
    this.newFight(false);
    this.menus.showLoading();
    this.syncButtons();
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
    // THE BOTTOM BAR (UI kit): SPIN's round button is the signature; AUTO and SPEED are secondary, the same size, either
    // side of it; LOG, SOUND and PAUSE are quiet, right-aligned under the enemy's machine. One centre line for all.
    this.autoBtn = this.btn('AUTO', px - 132, by, 120, 44, () => this.setAuto(!this.prefs.auto));
    // One SPEED button cycles 1X -> 2X -> 4X -> 8X (the keys 1-4 still pick one).
    this.speedBtns.push(this.btn('2X', px + 132, by, 120, 44, () => this.setSpeed(SPEEDS[(SPEEDS.indexOf(this.prefs.speed) + 1) % SPEEDS.length])));
    this.startBtn = this.btn('START RUN', W / 2 + 10, by, 196, 56, () => flow.newRunPressed(this), { idlePulse: true, textScale: 3 });
    // (TUNE and LOG are dev tools, the tuning panel and the combat log: never in the public build, see syncButtons.
    // User, 2026-10-31: LOG out of the public and Steam builds.)
    const tune = this.btn('TUNE', W / 2, by, QUIET_W, 36, () => {}, { quiet: true, textScale: T.small });
    // The tool row: small and dim (it's a watch-only game; the chrome shouldn't compete with the reels).
    const log = this.btn('LOG', toolX(0), by, QUIET_W, 36, () => {}, { quiet: true, textScale: T.small });
    this.muteBtn = this.btn('SOUND', toolX(1), by, QUIET_W, 36, () => this.setMuted(!this.prefs.muted), { quiet: true, textScale: T.small });

    this.toolButtons = { tune, log };
    this.recapBtns = [
      this.btn('REMATCH', W / 2 - 230, 0, 190, 50, () => this.newFight(true, this.lastSeed)),
      this.btn('NEW RUN', W / 2, 0, 190, 50, () => this.chooseCabinet()),
      this.btn('COPY LOG', W / 2 + 230, 0, 190, 50, () => void this.copyLog()),
    ];
    this.syncButtons();
  }

  syncButtons(): void {
    this.autoBtn.toggled = this.prefs.auto;
    this.speedBtns.forEach((b) => (b.label = `SPEED ${this.prefs.speed}X`));
    this.spinBtn.enabled = this.awaitingSpin;
    // START RUN on the title; in a run it's a small PAUSE on the right (RESUME, GLOSSARY, SETTINGS, QUIT, ABANDON).
    const title = this.phase === 'title';
    this.startBtn.label = title ? 'START RUN' : 'PAUSE';
    this.startBtn.opts.idlePulse = title;
    this.startBtn.opts.textScale = title ? 3 : T.small;
    Object.assign(this.startBtn, title ? { x: W / 2 + 10, w: 196, h: 56 } : { x: toolX(2), w: QUIET_W, h: 36 });
    this.startBtn.opts.quiet = !title;
    this.muteBtn.label = this.prefs.muted ? 'MUTED' : 'SOUND';
    this.muteBtn.toggled = this.prefs.muted;
    const overlay = this.screens.active || this.phase === 'recap' || this.menus.isOpen;
    for (const b of [this.spinBtn, this.autoBtn, this.startBtn, ...this.speedBtns]) b.visible = !overlay;
    // The pulled-out drawer covers AUTO and SPIN: they come back when the drawer closes.
    if (this.buildOpen && this.drawerLive()) this.autoBtn.visible = this.spinBtn.visible = false;
    for (const b of this.recapBtns) b.visible = this.phase === 'recap';
    for (const b of this.buttons) if (b.label === 'TUNE' || b.label === 'LOG') b.visible = this.screens.mode !== 'cabinet' && !this.publicBuild;
    // On the menus SOUND lives in SETTINGS (the main menu stays clear); M still toggles it everywhere.
    this.muteBtn.visible = this.screens.mode !== 'cabinet' && !this.menus.isOpen;
    Object.assign(this.muteBtn, this.menus.isOpen ? { x: W - 70, y: H - 30 } : { x: toolX(1), y: 648 });
    if (this.menus.isOpen) this.toolButtons!.tune.visible = this.toolButtons!.log.visible = false;
    this.noteDiscoveries();
  }

  applyJuice(): void {
    const j = this.prefs.juice;
    Object.assign(this.camera.enabled, { shake: j.shake, zoom: j.zoom, chroma: j.chroma, flash: j.flash });
    this.particles.enabled = j.particles;
    if (this.screens) this.screens.reduceMotion = !j.zoom;
    this.synth.setMuted(this.prefs.muted || !j.audio);
    const v = this.prefs.vol;
    this.synth.setVolumes(v.master / 10, v.music / 10, v.sfx / 10);
    this.savePrefs();
  }

  savePrefs(): void {
    save(PREFS_KEY, this.prefs);
  }

  saveProfile(): void {
    save(PROFILE_KEY, this.profile);
  }

  /** COLLECTION: whatever relics / charms are on the machine now count as discovered. */
  noteDiscoveries(): void {
    if (this.run && discover(this.profile, this.run)) this.saveProfile();
  }

  /** Back to the main menu (abandons nothing: only reachable between runs). */
  showMenu(): void {
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    this.screens.hide();
    this.coach.skipAll();
    this.tut = null;
    // (A boss's rules card left open under PAUSE ate the menu's first tap: UI QA 2026-11-02.)
    this.bossCard = false;
    this.run = null;
    this.newFight(false);
    this.phase = 'title';
    this.menus.showMain();
    this.syncButtons();
  }

  saveConfig(): void {
    save(CFG_KEY, this.cfg);
  }

  // ---- run flow ----------------------------------------------------------------------

  /** Best stake per cabinet (dev "unlock all" opens every stake). */
  stakesNow(): Partial<Record<CabinetId, number>> {
    return demoStakes(this.prefs.unlockAll ? Object.fromEntries(CABINET_ORDER.map((c) => [c, MAX_STAKE])) : this.prefs.stakes);
  }

  /** (The demo's machines are its own: src/demo.ts.) */
  unlockedCabinets(): Set<CabinetId> {
    return demoMachines(this.prefs.unlockAll ? CABINET_ORDER : this.prefs.unlocked);
  }

  /** START RUN: pick a starting machine first. */
  chooseCabinet(): void {
    flow.chooseCabinet(this);
  }

  startRun(seed?: number, cabinet: CabinetId = 'knight', stake = 0): void {
    flow.startRun(this, seed, cabinet, stake);
  }

  /** CONTINUE: the saved run, at the screen it was saved on. */
  continueRun(): void {
    flow.continueRun(this);
  }

  /** Tuning panel "apply": restart with the new base config. */
  restart(): void {
    this.startRun();
  }

  private beginRunFight(): void {
    flow.beginRunFight(this);
  }

  /** LET IT RIDE: after beating the Dealer, keep playing endless loops (the win is already recorded). */
  private letItRide(): void {
    const run = this.run;
    if (!run || !run.won || run.endless) return;
    letItRide(run);
    this.newFight(false, null, fightConfig(run, this.cfg), true);
    this.phase = 'between';
    flow.afterBonus(this, run.records[run.records.length - 1]);
  }

  /** Walk the map to the next screen: a Cashier, an encounter, the route pick or the next fight. */
  private advance(): void {
    flow.advance(this);
  }

  /** The opener is done: take one of the act's routes. */
  private pickRoute(i: number): void {
    flow.pickRoute(this, i);
  }

  // ---- fight flow --------------------------------------------------------------------

  newFight(start: boolean, seed: number | null = null, cfg: GameConfig = this.cfg, inRun = false): void {
    flow.newFight(this, start, seed, cfg, inRun);
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
    this.stage.clock.speed = clockSpeed(s);
    this.savePrefs();
    this.syncButtons();
  }

  /** SETTINGS rows (volumes 0..10, toggles as booleans). */
  /** MOTION (settings) is on: the screen's own movement (pops, wipes) stays still. */
  reducedMotion(): boolean {
    return this.setting('motion') === true;
  }

  setting(k: SettingKey): number | boolean {
    const j = this.prefs.juice;
    if (k === 'master' || k === 'music' || k === 'sfx') return this.prefs.vol[k];
    if (k === 'shake') return j.shake;
    if (k === 'motion') return !j.zoom && !j.chroma && !j.hitstop;
    return desktop()?.isFullscreen() ?? !!document.fullscreenElement;
  }

  setSetting(k: SettingKey, v: number | boolean): void {
    const j = this.prefs.juice;
    if (k === 'master' || k === 'music' || k === 'sfx') this.prefs.vol[k] = clampVol(v);
    else if (k === 'shake') j.shake = !!v;
    else if (k === 'motion') j.zoom = j.chroma = j.hitstop = !v;
    else if (k === 'fullscreen') {
      toggleFullscreen(!!v);
      return;
    }
    this.applyJuice();
  }

  /** Everything the keyboard / gamepad focus can land on right now. */
  navTargets(): NavRect[] {
    if (this.coach.active) return [];
    if (this.pause.open && !this.menus.isOpen) return this.pause.navTargets();
    if (this.menus.isOpen) return [...this.menus.navTargets(), ...(this.muteBtn.visible ? [this.muteBtn] : [])];
    // (SPIN stays a target while it waits on the enemy's spin: the focus slid onto AUTO, and the next A turned it on.)
    const own = this.buttons.filter((b) => b.visible && (b.enabled || b === this.spinBtn) && !this.recapBtns.includes(b));
    // Run screens draw over the fight's buttons: only their own targets count.
    if (this.screens.active) return this.screens.navTargets();
    return [...own, ...this.recapBtns.filter((b) => b.visible && b.enabled)];
  }

  private musicMood(): SongId {
    if (this.menus.isOpen || this.phase === 'title') return 'menu';
    if (this.phase !== 'fighting' && this.phase !== 'quick') return 'lounge';
    // Each boss has its own theme (endless cycles them too): THE HOUSE, THE WHEEL, THE DEALER.
    const boss = this.fight.cfg.enemy?.boss;
    // (THE OWNER plays under the Dealer's theme.)
    if (boss) return boss === 'owner' ? 'dealer' : boss;
    const act = this.run?.act ?? 1;
    return act >= 3 || this.run?.endless ? 'act3' : act === 2 ? 'act2' : 'act1';
  }

  /** PAUSE is open to any run in progress (fights and between-fight screens), never on the title or menus. */
  pausable(): boolean {
    return !this.menus.isOpen && (this.phase === 'fighting' || this.phase === 'between' || this.phase === 'recap') && !!this.run && !this.run.over;
  }

  setPaused(on: boolean): void {
    if (on === this.pause.open) return;
    if (on) this.pause.show();
    else this.pause.hide();
    this.sounds.click();
    this.syncButtons();
  }

  /** ABANDON RUN: the run is thrown away. */
  private abandonRun(): void {
    clearRunSave();
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
    if (hidden) this.synth.suspend();
    else this.synth.resume();
  }

  /** The song for this moment; the tuned sound effects follow it into its key. */
  playMusic(): void {
    const id = this.musicMood();
    this.music?.play(id);
    this.synth.tune = 2 ** (SONG_HOME[id] / 12);
  }

  startAudio(): void {
    this.synth.resume();
    if (!this.audioStarted) {
      this.audioStarted = true;
      this.music = new MusicPlayer(this.synth.ctx, this.synth.music);
      this.playMusic();
    }
  }

  pointerDown(x: number, y: number): void {
    input.pointerDown(this, x, y);
  }

  pointerUp(x: number, y: number): void {
    input.pointerUp(this, x, y);
  }

  /** Touch or mouse: run screens drop hover-only behaviour for fingers. */
  setTouch(touch: boolean): void {
    this.screens.touch = touch;
  }

  pointerMove(x: number, y: number): boolean {
    return input.pointerMove(this, x, y);
  }

  /** A key, or a pad button. `repeat`: a held arrow or d-pad direction repeating (it moves the focus, never a HOLD). */
  key(k: string, repeat = false): boolean {
    return input.key(this, k, repeat);
  }

  // ---- frame -------------------------------------------------------------------------

  update(realDt: number): void {
    frame.update(this, realDt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    frame.draw(this, ctx);
  }

  relicList() {
    return this.fight.cfg.relics;
  }

  /** HOLD: your reels take a tap now (before your spin, or while the enemy's turn plays). */
  canHold(): boolean {
    const f = this.fight;
    return this.phase === 'fighting' && !f.over && f.next === 'player' && f.holdsLeft > 0 && !this.screens.active && !this.pause.open && !this.coach.active && !this.bossCard;
  }

  /** The drawer exists in a run, between no run screens (they always show the build). */
  drawerLive(): boolean {
    return !!this.run && this.phase !== 'title' && !this.screens.active && !this.menus.isOpen && this.phase !== 'recap';
  }

  /** The handle: a tab on the drawer's right edge (the screen's left edge when it's shut). */
  handleRect(): { x: number; y: number; w: number; h: number } {
    // Shut and never used: every 8s the handle slides out 4px and back, so players find it.
    const k = (this.time % 8) / 0.25;
    const nudge = !this.drawerUsed && !this.buildOpen && k < 1 ? Math.sin(k * Math.PI) * 4 : 0;
    const edge = this.drawerT * (BUILD.x + BUILD.w + 4) + nudge;
    return { x: edge, y: H / 2 - 52, w: 26 + 4 * this.handleHover, h: 104 };
  }

  onHandle(x: number, y: number): boolean {
    const r = this.handleRect();
    return x >= r.x - 4 && x <= r.x + r.w + 6 && y >= r.y && y <= r.y + r.h;
  }

  /** A boss fight is on screen (its rules card can open). */
  bossInfo(): boolean {
    return !!this.fight.cfg.enemy.boss && !this.screens.active && !this.fight.over && !this.menus.isOpen && (this.phase === 'fighting' || this.phase === 'quick');
  }

}
