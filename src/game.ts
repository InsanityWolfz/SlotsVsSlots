import { OWNER_TRICKS } from './core/enemies';
import { Sounds } from './audio/sounds';
import type { CombatEvent } from './core/events';
import { Synth } from './audio/synth';
import { mergeConfig, UNIT, type GameConfig, type SideId, type SymbolId } from './core/config';
import { TUNE } from './core/enemies';
import { MAX_STAKE, STAKES, stakeUnlock } from './core/stakes';
import { DEALER_HANDS, Fight, highRollerMul } from './core/fight';
import { roomFor, type Scene } from './render/rooms';
import { turnRow, type TurnRow } from './core/log';
import { RELICS } from './core/relics';
import {
  applyOption,
  buy,
  chooseRoute,
  createRun,
  draftOffers,
  fightConfig,
  fightLabel,
  migrateRun,
  finishFight,
  isShopNow,
  takeLegend,
  letItRide,
  currentEnemy,
  leaveShop,
  isEncounterNow,
  playEncounter,
  reroll,
  shopOffers,
  takeSpoils,
  takeStart,
  type DraftOption,
  type FightRecord,
  type RunState,
  type ShopItem,
} from './core/run';
import type { RelicId } from './core/config';
import { ALL_CABINETS, CABINETS, CABINET_ORDER, type CabinetId } from './core/cabinets';
import { StatsTracker } from './core/stats';
import { Camera } from './present/camera';
import { FightView } from './ui/fightView';
import { Transition } from './ui/transition';
import { Clock } from './present/clock';
import { Director } from './present/director';
import { FxLayer } from './present/fx';
import { HUD_W, HudView, type HudMeter } from './present/hud';
import { BEZEL, COLORS, H, MACHINE_CX, MACHINE_W, HUD_TOP, CELL, reelWindow, W } from './present/layout';
import { T } from './ui/kit';
import { MachineView } from './present/machine';
import { Particles } from './present/particles';
import { defaultJuice, type JuiceToggles, type Stage } from './present/stage';
import { Background } from './render/background';
import { type SpriteId, artId } from './render/sprites';
import { runSummary } from './core/runLog';
import { Button } from './ui/button';
import { Recap } from './ui/recap';
import { BUILD, RunScreens } from './ui/runScreens';
import { Pause } from './ui/pause';
import { MusicPlayer, SONG_HOME, type SongId } from './audio/music';
import { CHARM_VALUE } from './core/charms';
import { Focus, type NavDir, type NavRect } from './ui/focus';
import { desktop, steamUnlock, VERSION } from './build';

import { Coach, TUTORIAL } from './ui/coach';
import { collectionTotal, heroSprite, Menus } from './ui/menus';
import { shownTrim, discover, emptyProfile, MAX_ENTRIES, recordMeta, runEntry, runScore, sanitizeProfile, type MetaGain, type Profile, type RunEntry } from './core/profile';

const CFG_KEY = 'slotvslot.config.v3';
const PREFS_KEY = 'slotvslot.prefs.v2';
const PROFILE_KEY = 'slotvslot.profile.v1';
const AUTO_DELAY = 0.35;
/** HOLD (experiment): HOLDs a fight. */

/** Speed buttons (keys 1-4). The new 1X is half of the old 1X, so the clock runs at speed / 2. */
const SPEEDS = [1, 2, 4, 8];
/** The quiet tool row (LOG, SOUND, PAUSE): its buttons' width, and the i-th one's centre (the row's right edge lines up
 * with the enemy machine's frame). */
const QUIET_W = 84;
const toolX = (i: number) => Math.round(MACHINE_CX.enemy + MACHINE_W / 2 + BEZEL - QUIET_W / 2 - (2 - i) * (QUIET_W + 10));
const clockSpeed = (s: number) => s / 2;
const IN_PLAY = { none: new Set<SymbolId>(), drop: new Set<SymbolId>(['note', 'wild']), allIn: new Set<SymbolId>(['sword', 'seven']) };

interface Prefs {
  speed: number;
  /** 2 = speeds are on the 1/2/4/8 scale (older saves stored 1/2/4 on the old scale). */
  speedV: number;
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
  /** Slot machines that have beaten the Dealer (TRUE ENDING). */
  dealerBeaten: CabinetId[];
  /** The TUTORIAL has been started once (the menu stops nudging toward it). */
  tutorialDone: boolean;
  /** SETTINGS volumes, 0..10 each (10 = the designed mix). */
  vol: { master: number; music: number; sfx: number };
}

const clampVol = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : 10);
const clampStake = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(MAX_STAKE, Math.floor(n))) : 0);
const machineIds = (v: unknown): CabinetId[] => (Array.isArray(v) ? (v.filter((x) => (ALL_CABINETS as string[]).includes(x)) as CabinetId[]) : []);

/** Saved prefs are player-editable: validate everything so a bad save can't lock the game (QA_1 B6). */
/** The player's signature meter on the HUD (TESLA's special, MIDAS's gold, JAX's jackpots). */
function hudMeter(f: Fight): HudMeter | null {
  if (f.special) return { kind: 'special', pips: Math.round(f.cfg.specialCost / UNIT), label: 'LIGHTNING', color: COLORS.energy, icon: 'boltIcon' };
  const m = f.meter;
  if (!m) return null;
  if (m.kind === 'touch') return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'GOLD', color: '#ffd23f', icon: 'goldbar' as SpriteId };
  if (m.kind === 'vault') return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'HIGH ROLLER', color: '#7dff7a', icon: 'goldbar' as SpriteId, note: (chips) => `${chips} CHIPS X${highRollerMul(chips)}` };
  if (m.kind === 'volume') return { kind: m.kind, pips: Math.round(f.meterCost / UNIT), label: 'VOLUME', color: '#5ad8e8', icon: artId('volumeIcon') as SpriteId };
  return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'JACKPOTS', color: '#ff6ad5', icon: 'wild' };
}

function sanitizePrefs(raw: unknown, publicBuild: boolean): Prefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const unlocked = machineIds(p.unlocked);
  // BRIAR ('thorn') was retired for THE JUKEBOX (2026-10-08): her unlock and her stakes carry over to it.
  const briar = Array.isArray(p.unlocked) && p.unlocked.includes('thorn');
  if (briar && !unlocked.includes('jukebox')) unlocked.push('jukebox');
  if (!unlocked.includes('knight')) unlocked.unshift('knight');
  const stakes: Partial<Record<CabinetId, number>> = {};
  if (p.stakes && typeof p.stakes === 'object') for (const id of ALL_CABINETS) if (id in (p.stakes as object)) stakes[id] = clampStake((p.stakes as Record<string, unknown>)[id]);
  const briarStake = p.stakes && typeof p.stakes === 'object' ? (p.stakes as Record<string, unknown>).thorn : undefined;
  if (briarStake !== undefined && stakes.jukebox === undefined) stakes.jukebox = clampStake(briarStake);
  const juice = p.juice && typeof p.juice === 'object' ? (p.juice as Partial<JuiceToggles>) : {};
  const vol = p.vol && typeof p.vol === 'object' ? (p.vol as Partial<Prefs['vol']>) : {};
  return {
    // Old saves: 1/2/4 on the old scale become 2/4/8 (the same real speed).
    speed: p.speedV === 2 ? (SPEEDS.includes(p.speed as number) ? (p.speed as number) : 2) : [1, 2, 4].includes(p.speed as number) ? (p.speed as number) * 2 : 2,
    speedV: 2,
    auto: typeof p.auto === 'boolean' ? p.auto : false,
    juice: { ...defaultJuice(), ...juice },
    muted: p.muted === true,
    unlocked,
    unlockAll: publicBuild ? false : p.unlockAll === true,
    stakes,
    stakeSel: clampStake(p.stakeSel),
    act3: p.act3 === true,
    dealerBeaten: machineIds(p.dealerBeaten),
    tutorialDone: p.tutorialDone === true,
    vol: { master: clampVol(vol.master), music: clampVol(vol.music), sfx: clampVol(vol.sfx) },
  };
}

/** Saves are crash-safe (STEAM_READINESS S11): every write first copies the last good value to `<key>.bak` (the live keys
 * never change names), and a save that fails to parse is set aside under `<key>.corrupt` and the backup loads instead. */
const BAK = '.bak';
const NAV_KEYS: Record<string, NavDir> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
/** HOLD from the keyboard (Q / W / E) or, in a fight while a HOLD can be made, a pad's d-pad (left / up / right). */
const HOLD_KEYS: Record<string, number> = { q: 0, w: 1, e: 2, arrowleft: 0, arrowup: 1, arrowright: 2 };
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

/** The saved run (S1). */
export const RUN_KEY = 'slotvslot.run.v1';
export function clearRunSave(): void {
  try {
    // The backups too: a cleared run must never come back through CONTINUE (STEAM_QA_1 Q1).
    for (const k of [RUN_KEY, RUN_KEY + BAK, RUN_KEY + '.corrupt']) localStorage.removeItem(k);
    desktop()?.saveRemove(RUN_KEY);
  } catch {
    /* no storage */
  }
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function load<T>(key: string): T | null {
  try {
    // Desktop: a save missing from localStorage (a reinstall, a new PC via Steam Cloud) comes back from its file.
    if (localStorage.getItem(key) === null) {
      const file = desktop()?.saveRead(key);
      if (file) localStorage.setItem(key, file);
    }
    const raw = localStorage.getItem(key);
    const v = parse<T>(raw);
    // Missing is missing (a cleared save stays cleared); only a save that fails to parse falls back to its backup.
    if (v !== null || !raw) return v;
    // Corrupt: keep the bytes for a manual rescue, then fall back to the backup.
    localStorage.setItem(key + '.corrupt', raw);
    return parse<T>(localStorage.getItem(key + BAK));
  } catch {
    return null;
  }
}

/** The last finished run's COPY RUN text (a new key; the save keys are never renamed). */
const LASTRUN_KEY = 'slotvslot.lastrun.v1';

function save(key: string, v: unknown): void {
  try {
    const prev = localStorage.getItem(key);
    if (prev && parse(prev) !== null) localStorage.setItem(key + BAK, prev);
    const json = JSON.stringify(v);
    localStorage.setItem(key, json);
    desktop()?.saveWrite(key, json);
  } catch {
    /* storage unavailable or full: prefs just won't persist */
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
  private tut: { fight?: boolean; spin?: boolean; hold?: boolean; ability?: boolean; draft?: boolean; shop?: boolean } | null = null;

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
  toolNote: { text: string; at: number } | null = null;
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
  mouse = { x: -1, y: -1 };
  buttons: Button[] = [];
  private spinBtn!: Button;
  private autoBtn!: Button;
  private startBtn!: Button;
  private speedBtns: Button[] = [];
  /** The BUILD drawer: pulled out (or not) in fights, and how far out it is (0..1, eased). */
  private buildOpen = false;
  drawerT = 0;
  /** The drawer's spring (it overshoots a little opening, and shuts clean). */
  private drawerV = 0;
  /** Until the player first pulls the drawer, the handle nudges out every few seconds. */
  private drawerUsed = false;
  private handleHover = 0;
  private recapBtns: Button[] = [];
  private muteBtn!: Button;
  toolButtons: { tune: Button; log: Button } | null = null;

  /** publicBuild: no TUNE panel, no saved tuning overrides, no dev unlocks (the hosted playtest). */
  constructor(readonly publicBuild = false) {
    this.cfg = mergeConfig(publicBuild ? undefined : load(CFG_KEY));
    this.prefs = sanitizePrefs(load<Partial<Prefs>>(PREFS_KEY), publicBuild);
    this.profile = sanitizeProfile(load(PROFILE_KEY));
    // Steam: re-grant everything already earned (players who started before the Steam build get credit).
    for (const id of Object.keys(this.profile.achievements)) steamUnlock(id);
    this.menus = new Menus(this.ui, this.sounds, () => this.profile, () => this.unlockedCabinets(), {
      onNewRun: () => this.chooseCabinet(),

      onTutorial: () => this.startTutorial(),
      setTitle: (title) => {
        this.profile.title = title;
        this.saveProfile();
      },
      setTrim: (id) => {
        this.profile.trim = id;
        this.saveProfile();
      },
      onReset: () => this.resetSave(),
      tutorialDone: () => this.prefs.tutorialDone,
      softLightning: () => this.prefs.juice.softLightning,
      setSoftLightning: (on) => {
        this.prefs.juice.softLightning = on;
        this.applyJuice();
      },
      muted: () => this.prefs.muted,
      setMuted: (on) => this.setMuted(on),
      savedRun: () => this.savedRunLabel(),
      savedCabinet: () => this.loadRunSave()?.run.cabinet ?? null,
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
      onPick: (o) => this.pickReward(o),
      onSpoils: (r) => this.pickSpoils(r),
      onLegend: (r) => this.pickLegend(r),
      onFight: () => this.beginRunFight(),
      onRoute: (i) => this.pickRoute(i),
      onEncounter: (i, bet) => {
        if (!this.run) return null;
        const res = playEncounter(this.run, i, bet);
        // Saved after every play: a quit can't replay a spin you've seen (a game with plays left resumes at its table).
        this.checkpoint('next');
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
    this.startBtn = this.btn('START RUN', W / 2 + 10, by, 196, 56, () => this.newRunPressed(), { idlePulse: true, textScale: 3 });
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

  private syncButtons(): void {
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
  private noteDiscoveries(): void {
    if (this.run && discover(this.profile, this.run)) this.saveProfile();
  }

  /** HISCORES: log the finished run (keeps the newest entries, but never drops a top-10 score). */
  private recordRun(run: RunState): void {
    // COPY LAST RUN (main menu): the finished run's text survives a refresh.
    try {
      localStorage.setItem(LASTRUN_KEY, runSummary(run, VERSION));
    } catch {
      /* private mode / full storage: the run-over screen's COPY RUN still works */
    }
    // The entry lives on the run (rideAt), not in memory: a refresh mid-ENDLESS used to record the run twice (playtest C).
    const ride = run.endless && run.rideAt !== undefined ? this.profile.runs.find((e) => e.at === run.rideAt) : undefined;
    if (ride) {
      const prev = runScore(ride);
      Object.assign(ride, runEntry(run, ride.at, !!run.tutorial), { won: true });
      this.afterRecord(ride, recordMeta(this.profile, ride, collectionTotal(), prev));
      return;
    }
    const entry = runEntry(run, Date.now(), !!run.tutorial);
    if (run.won && !run.endless) run.rideAt = entry.at;
    this.profile.runs.push(entry);
    while (this.profile.runs.length > MAX_ENTRIES) {
      const top = new Set([...this.profile.runs].sort((a, b) => runScore(b) - runScore(a)).slice(0, 10));
      const i = this.profile.runs.findIndex((e) => !top.has(e));
      this.profile.runs.splice(i < 0 ? 0 : i, 1);
    }
    this.afterRecord(entry, recordMeta(this.profile, entry, collectionTotal()));
  }

  /** META: save and show what the run earned. (Online boards went to after launch, 2026-10-29: Steam's come first.) */
  private afterRecord(_entry: RunEntry, gain: MetaGain): void {
    for (const a of gain.achievements) steamUnlock(a.id);
    this.saveProfile();
    this.screens.setMeta(gain);
  }

  /** RESET SAVE (main menu): unlocks, stakes, collection and hiscores. Settings stay. */
  private resetSave(): void {
    const { speed, auto, juice, muted, vol } = this.prefs;
    this.prefs = { ...sanitizePrefs({}, this.publicBuild), speed, auto, juice, muted, vol };
    // Your name and player id are who you are, not progress: they survive a reset (the server still holds the name).
    const { name, pid } = this.profile;
    this.profile = { ...emptyProfile(), ...(name ? { name } : {}), ...(pid ? { pid } : {}) };
    this.savePrefs();
    this.saveProfile();
  }

  /** Back to the main menu (abandons nothing: only reachable between runs). */
  showMenu(): void {
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    this.screens.hide();
    this.coach.skipAll();
    this.tut = null;
    this.run = null;
    this.newFight(false);
    this.phase = 'title';
    this.menus.showMain();
    this.syncButtons();
  }

  // ---- tutorial ----------------------------------------------------------------------

  /** A guided first fight on the KNIGHT: callouts explain each part, then the run carries on. */
  private startTutorial(): void {
    this.prefs.tutorialDone = true;
    this.savePrefs();
    this.startRun(undefined, 'knight', 0);
    if (!this.run) return;
    this.run.tutorial = true;
    // The guided fight isn't saved; the run is, once the callouts are done.
    clearRunSave();
    // The guided first fight skips the starting relic pick (callouts first, choices later).
    this.run.pendingStart = null;
    this.screens.showNext(this.run);
    this.tut = {};
    this.coach.show(TUTORIAL.preview);
  }

  private tip(key: 'fight' | 'spin' | 'hold' | 'ability' | 'draft' | 'shop', tips: keyof typeof TUTORIAL, done?: () => void): void {
    if (!this.tut || this.tut[key]) return;
    this.tut[key] = true;
    this.coach.show(TUTORIAL[tips], done);
  }

  private skipTutorial(): void {
    this.coach.skipAll();
    this.tut = null;
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

  /** NEW RUN mid-run throws the run away: it needs a second press within 2 s (QA_1 B1). */
  private newRunPressed(): void {
    // In a run it's PAUSE (playtest C: a phone had no Escape, so no GLOSSARY; ABANDON RUN lives in the pause menu).
    if (this.run && !this.run.over && this.phase !== 'title') {
      if (this.pausable()) this.setPaused(true);
      return;
    }
    this.chooseCabinet();
  }

  /** START RUN: pick a starting machine first. */
  chooseCabinet(): void {
    this.menus.hide();
    this.skipTutorial();
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    this.phase = 'between';
    this.screens.showCabinets(this.unlockedCabinets(), this.stakesNow(), this.prefs.stakeSel, this.prefs.act3 || this.prefs.unlockAll, this.prefs.dealerBeaten);
    this.syncButtons();
  }

  /** Meta progression: check the finished run against each cabinet's unlock condition. */
  private checkUnlocks(run: RunState): CabinetId[] {
    const got: CabinetId[] = [];
    const reachedBoss = run.records.some((r) => r.archetype === 'house') || run.act > 1 || run.won;
    const beatHouse = run.act > 1 || run.won;
    // MIDAS is shelved (no unlock) while he's reworked; TESLA is the second machine.
    const cond: Record<CabinetId, boolean> = {
      knight: true,
      midas: run.won,
      tesla: reachedBoss,
      jukebox: beatHouse,
      joker: beatHouse && run.player.strips.some((s) => (s.wild ?? 0) > 0),
    };
    for (const id of CABINET_ORDER) {
      if (cond[id] && !this.prefs.unlocked.includes(id)) {
        this.prefs.unlocked.push(id);
        got.push(id);
      }
    }
    // Winning at GREEN or higher opens THE DEALER (act 3) for GREEN+ runs.
    // TRUE ENDING: this slot machine beat the Dealer.
    if (run.won && run.act >= 3 && !this.prefs.dealerBeaten.includes(run.cabinet)) {
      this.prefs.dealerBeaten.push(run.cabinet);
      this.savePrefs();
    }
    // HIGH STAKES: winning at your best stake unlocks the next one for this cabinet.
    let stakeText = '';
    const best = this.prefs.stakes[run.cabinet] ?? 0;
    const unlock = stakeUnlock(best, run);
    if (unlock !== null) {
      this.prefs.stakes[run.cabinet] = unlock;
      const next = STAKES[run.stake + 1];
      // (Its rule shows on CHOOSE YOUR MACHINE: on RUN OVER the whole rule made a chip the width of the screen.)
      stakeText = `${next.name} STAKE UNLOCKED FOR ${CABINETS[run.cabinet].name}`;
    }
    this.screens.setStakeUnlockedNow(stakeText);
    if (got.length || stakeText) this.savePrefs();
    return got;
  }

  startRun(seed?: number, cabinet: CabinetId = 'knight', stake = 0): void {
    this.menus.hide();
    this.run = createRun(this.cfg, seed, cabinet, stake, this.prefs.act3 || this.prefs.unlockAll);
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    // Show the first opponent on the machines behind the preview.
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
    this.phase = 'between';
    this.showRunStart();
    this.checkpoint('next');
    this.syncButtons();
  }

  private showRunStart(): void {
    if (!this.run) return;
    if (this.run.pendingStart?.length) this.screens.showDraft(this.run, this.run.pendingStart.map((relic) => ({ kind: 'relic', relic }) as DraftOption), null, 'start');
    else this.advance();
  }

  // ---- saved runs (STEAM_READINESS S1) ------------------------------------------------
  // The run is plain data and every draft, shop and fight is seeded from it, so a snapshot taken at a between-fight
  // screen plays on exactly as it would have. Taken at the next-fight preview ('next') and after a fight's payouts
  // ('after': spoils, legend or draft). Quitting anywhere else resumes at the last snapshot.

  private checkpoint(at: 'next' | 'after' | 'fight'): void {
    const run = this.run;
    if (!run || run.over || this.tut) return;
    save(RUN_KEY, { v: 1, at, version: VERSION, run });
  }

  private loadRunSave(): { at: 'next' | 'after' | 'fight' | 'ride'; run: RunState } | null {
    const s = load<{ v?: number; at?: string; run?: RunState }>(RUN_KEY);
    const run = s?.run;
    if (!s || s.v !== 1 || !run || typeof run.seed !== 'number' || !run.player || !run.map || !Array.isArray(run.map.routes) || !Array.isArray(run.records)) return null;
    if (!(ALL_CABINETS as string[]).includes(run.cabinet) || (run.over && s.at !== 'ride')) return null;
    // A SCORE RACE or DAILY RUN run (both left the game in phase 2, 2026-10-29) can't play on: it's dropped.
    if ((run as { race?: boolean }).race || (run as { daily?: string }).daily) return null;
    // A game update may have removed a relic or Charm the save still holds (STEAM_QA_1 Q5): drop what no longer exists.
    if (Array.isArray(run.player.relics)) run.player.relics = run.player.relics.filter((r) => r in RELICS);
    if (Array.isArray(run.player.gilded)) run.player.gilded = run.player.gilded.filter((g) => g && g.enh in CHARM_VALUE);
    // SIDE BETS are gone (2026-10-12): a save with a bet on the table gets its stake back.
    const old = run as RunState & { bet?: { stake?: number } | null; bets?: unknown };
    if (old.bet && typeof old.bet.stake === 'number' && Number.isFinite(old.bet.stake)) run.player.chips += Math.max(0, Math.floor(old.bet.stake));
    delete old.bet;
    delete old.bets;
    // THE WHEEL replaced THE MIRROR (2026-10-09): a save holding the old act 2 boss meets the new one.
    migrateRun(run);
    return { at: s.at === 'after' ? 'after' : s.at === 'fight' ? 'fight' : s.at === 'ride' ? 'ride' : 'next', run };
  }

  private savedRunLabel(): string | null {
    const s = this.loadRunSave();
    if (!s) return null;
    // Beat the Dealer: the RIDE / CASH OUT choice is what's waiting (playtest C: it read ACT 3, like a run mid-act).
    if (s.at === 'ride') return 'ENDLESS';
    return `${s.run.endless ? `LOOP ${s.run.endless.loop}` : `ACT ${s.run.act}`} ${CABINETS[s.run.cabinet].hero}`;
  }

  /** CONTINUE: the saved run, at the screen it was saved on. */
  continueRun(): void {
    try {
      this.resumeRun();
    } catch (err) {
      // A save this build can't play: drop it rather than crash on every CONTINUE.
      console.error(err);
      clearRunSave();
      this.showMenu();
    }
  }

  private resumeRun(): void {
    const s = this.loadRunSave();
    if (!s) return this.menus.showMain();
    this.menus.hide();
    this.skipTutorial();
    this.run = s.run;
    this.token++;
    this.synth.stopLoops();
    this.recap.hide();
    // Back at the Dealer's LET IT RIDE / CASH OUT (the run was already recorded when it was won).
    if (s.at === 'ride') {
      this.phase = 'over';
      this.screens.showOver(this.run);
      this.syncButtons();
      return;
    }
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
    this.phase = 'between';
    const last = this.run.records[this.run.records.length - 1];
    if (s.at === 'fight') this.startRunFight();
    else if (s.at === 'after' && last) {
      this.lastRecord = last;
      this.afterBonus(last);
    } else this.showRunStart();
    this.syncButtons();
  }

  /** Tuning panel "apply": restart with the new base config. */
  restart(): void {
    this.startRun();
  }

  private beginRunFight(): void {
    if (!this.run) return;
    // Snapshot with the opponent locked in: a quit mid-fight resumes into this same fight (STEAM_QA_1 Q3).
    this.checkpoint('fight');
    this.startRunFight();
  }

  private startRunFight(): void {
    if (!this.run) return;
    this.screens.hide();
    // The focus belongs to the screens: in the fight, Enter on a stale ring would change the speed.
    this.focus.hide();
    this.newFight(true, null, fightConfig(this.run, this.cfg), true);
    if (this.run.depth === 0 && this.run.act === 1) this.tip('fight', 'fight');
  }

  private lastRecord: FightRecord | null = null;
  /** DEATH RECAP: HP damage the player took this fight, by source. */
  private hurt = new Map<string, number>();
  private spins = [0, 0];
  private noteHurt(events: CombatEvent[]): void {
    const add = (k: string, n: number) => n > 0 && this.hurt.set(k, (this.hurt.get(k) ?? 0) + n);
    for (const e of events) {
      if (e.type === 'spin' && e.side === 'player') {
        this.spins[1]++;
        if (e.frozen.some(Boolean) || e.locked.some(Boolean)) this.spins[0]++;
      }
      if (e.type === 'potWin' && e.to === 'player') add('THE POT', e.hpDamage);
      if (e.type === 'allInHit' && e.to === 'player') add('ALL IN', e.hpDamage);
      if (e.type === 'noMoreBets' && e.to === 'player') add('NO MORE BETS', e.hpDamage);
      if (e.type === 'closingTime') add('CLOSING TIME', e.hp);
      if (e.type === 'attack' && e.to === 'player')
        add(e.note === 'drain' ? 'DRAIN' : e.note === 'mimic' ? 'COPYCAT' : e.reels.length ? 'SPIN HITS' : this.fight.isBoss ? 'THE POT' : 'ABILITY', e.hpDamage);
      else if (e.type === 'specialFire' && e.to === 'player') add('SPECIAL', e.hpDamage);
      else if (e.type === 'markedHit' && e.side === 'player') add(this.fight.isDealer ? "THE DEALER'S MARK" : this.run && currentEnemy(this.run).archetype === 'sharp' ? "THE SHARP'S MARK" : 'MARKED DECK', e.hpDamage);
      else if (e.type === 'blast' && e.side === 'player') add('IOUS', e.hpDamage);
    }
  }
  private shelf: ShopItem[] = [];

  private afterRunFight(): void {
    const run = this.run!;
    const record = finishFight(run, this.fight);
    record.best = Math.round(this.tracker.stats.sides.player.biggestHit);
    if (!record.won) {
      // The HP damage each source did (never past 0: no overkill). It isn't scaled to the HP you started with: heals in
      // between made that read low (THE OWNER's one-spin kill from full HP showed as 199: playtest).
      record.hurt = [...this.hurt].map(([s, n]) => [s, Math.round(n)] as [string, number]).filter(([, n]) => n >= UNIT).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (this.spins[0] >= 2) record.stuck = [this.spins[0], this.spins[1]];
    }
    this.hurt.clear();
    this.spins = [0, 0];
    this.lastRecord = record;
    this.phase = run.over ? 'over' : 'between';
    if (run.over) {
      clearRunSave();
      // Beat the Dealer: the LET IT RIDE / CASH OUT choice is saved, so a refresh there comes back to it (playtest).
      this.noteDiscoveries();
      this.recordRun(run);
      if (run.won && run.act >= 3 && !run.endless) save(RUN_KEY, { v: 1, at: 'ride', version: VERSION, run });
      this.skipTutorial();
      if (run.endless) this.screens.setStakeUnlockedNow('');
      this.screens.setUnlockedNow(run.endless ? [] : this.checkUnlocks(run));
      this.screens.showOver(run);
    }
    else this.afterBonus(record);
    if (this.screens.mode === 'draft') this.tip('draft', 'draft');
    this.syncButtons();
  }

  /** LET IT RIDE: after beating the Dealer, keep playing endless loops (the win is already recorded). */
  private letItRide(): void {
    const run = this.run;
    if (!run || !run.won || run.endless) return;
    letItRide(run);
    this.newFight(false, null, fightConfig(run, this.cfg), true);
    this.phase = 'between';
    this.afterBonus(run.records[run.records.length - 1]);
  }

  /** After the bonus payouts: the legendary pick, elite spoils or the draft, as usual. */
  private afterBonus(record: FightRecord): void {
    const run = this.run;
    if (!run) return;
    this.checkpoint('after');
    if (run.pendingLegend) {
      // A boss is gone: set up the idle machines for the next act so its HUD doesn't linger behind.
      this.newFight(false, null, fightConfig(run, this.cfg), true);
      this.phase = 'between';
    }
    if (run.pendingLegend) this.screens.showLegend(run, run.pendingLegend, record);
    else if (run.pendingSpoils) this.screens.showSpoils(run, run.pendingSpoils, record);
    else this.screens.showDraft(run, draftOffers(run), record);
    if (this.screens.mode === 'draft') this.tip('draft', 'draft');
    this.syncButtons();
  }

  /** An act's boss fell: take the legendary, then the new act's Cashier opens. */
  private pickLegend(relic: RelicId): void {
    if (!this.run) return;
    takeLegend(this.run, relic);
    this.advance();
  }

  private pickSpoils(relic: RelicId): void {
    if (!this.run) return;
    if (this.run.pendingStart) {
      takeStart(this.run, relic);
      this.advance();
      return;
    }
    takeSpoils(this.run, relic);
    this.screens.showDraft(this.run, draftOffers(this.run), this.lastRecord);
  }

  private buyItem(i: number): void {
    const item = this.shelf[i];
    if (!this.run || !item) return;
    const levelUp = item.option.kind === 'symLevel' || item.option.kind === 'charmLevel';
    if (buy(this.run, item)) {
      if (levelUp) this.sounds.lucky();
      this.sounds.coin(4);
      this.sounds.coin(9);
      this.screens.bought(i, item);
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
    this.advance();
  }

  private showNextFight(): void {
    if (!this.run) return;
    // Rebuild the (idle) machines for the next opponent so the preview is accurate.
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
    this.phase = 'between';
    this.screens.showNext(this.run);
    this.checkpoint('next');
    // The tutorial's last word, then the run is all yours.
    if (this.tut && this.run.depth >= 1) {
      this.coach.show(TUTORIAL.next);
      this.tut = null;
    }
    this.syncButtons();
  }

  private pickReward(o: DraftOption): void {
    if (!this.run) return;
    applyOption(this.run, o);
    this.advance();
  }

  /** Walk the map to the next screen: a Cashier, an encounter, the route pick or the next fight. */
  private advance(): void {
    const run = this.run;
    if (!run) return;
    if (isShopNow(run)) {
      this.shelf = shopOffers(run);
      this.screens.showShop(run, this.shelf);
      this.tip('shop', 'shop');
      this.checkpoint('next');
      this.syncButtons();
      return;
    }
    if (isEncounterNow(run)) {
      this.screens.showEncounter(run);
      this.checkpoint('next');
      this.syncButtons();
      return;
    }
    // The route pick and the next fight share the preview screen (it draws the act's map).
    this.showNextFight();
  }

  /** The opener is done: take one of the act's routes. */
  private pickRoute(i: number): void {
    if (!this.run) return;
    chooseRoute(this.run, i);
    this.advance();
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
    this.lastPair = false;
    this.fight = new Fight(cfg, seed ?? cfg.seed ?? undefined);
    this.hurt.clear();
    this.spins = [0, 0];
    this.lastSeed = this.fight.seed;
    this.tracker = new StatsTracker(this.fight);
    const clock = new Clock();
    clock.speed = clockSpeed(this.prefs.speed);
    const sides: SideId[] = ['player', 'enemy'];
    const machines = Object.fromEntries(sides.map((s) => [s, new MachineView(s, this.fight.sides[s], this.sounds)])) as Stage['machines'];
    // SECOND PAYLINE: the row above pays too, so it isn't dimmed.
    if (this.fight.sides.player.relics.has('secondline')) machines.player.payRows = [0, 1];
    // The player's TRIM (cosmetic; CLASSIC draws the stock gold).
    const trim = shownTrim(this.profile);
    machines.player.trim = trim.id === 'classic' ? null : trim;
    const huds = Object.fromEntries(
      sides.map((s) => {
        const c = this.fight.sides[s];
        const sc = s === 'player' ? cfg.player : cfg.enemy;
        const hero = s === 'player' && this.run && inRun ? this.run.cabinet : null;
        const meter = s === 'player' ? hudMeter(this.fight) : null;
        const hud = new HudView(s, c.maxHp, meter, {
          name: s === 'player' ? (hero ? CABINETS[hero].hero : 'HERO') : sc.name,
          portrait: hero ? heroSprite(hero) : sc.portrait,
          // THE OWNER's HUD names his next trick from the start (EVERY TRICK said nothing).
          ability: c.ability?.kind === 'owner' ? { ...c.ability, kind: OWNER_TRICKS[0].kind } : c.ability,
          energy: c.energy / UNIT,
        });
        // The enemy's name in its card's colour: a boss red, an elite orange (it was always green).
        if (s === 'enemy') hud.nameColor = cfg.enemy.boss ? '#ff8a7a' : this.run && inRun && currentEnemy(this.run)?.elite ? '#ffb060' : COLORS.slime;
        hud.hp = hud.ghost = c.hp;
        if (s === 'player') hud.chips = hud.chipsHeld = cfg.player.chipsHeld ?? 0;
        if (c.ability) hud.charge = c.charge;
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
      cheer: (ours) => this.background.rooms.cheer(ours),
      relics: [...cfg.relics],
      relicPops: {},
      relicFeed: [],
      levels: { player: cfg.player.levels },
      ticket: cfg.relics.includes('ticket'),
      enemyShield: TUNE.enemyShield,
      gutter: {
        turn: 0,
        side: null,
        pulse: 0,
        pot: this.fight.pot,
        potPunch: 1,
        fightLabel: this.run && inRun ? fightLabel(this.run) : 'SANDBOX',
        allIn: false,
        ...(this.fight.isWheel ? { bets: [...this.fight.bets], betsLeft: (this.fight.sides.enemy.ability?.every ?? 3) - this.fight.sides.enemy.charge, betPer: this.fight.betPer(), betPunch: 1, wheelFast: this.fight.fast, wheelAngle: 0, wheelSpeed: 0.6 } : {}),
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
      // Without AUTO every spin of yours waits on SPIN. HOLD never waits: its taps are taken while the enemy's turn plays
      // or while you wait to spin.
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
      for (const e of result.events) {
        if (e.type === 'spin' && e.side === 'player') this.lastPair = e.score.tier === 'pair';
        // A freeze moves and locks your reels: the pair it broke can't be held (the HOLD call went stale: playtest).
        else if (e.type === 'freeze' && e.to === 'player') this.lastPair = false;
      }
      this.noteHurt(result.events);
      this.tracker.record(result.events);
      this.rows.push(turnRow(this.fight, result, this.fightNo));
      this.onRows.forEach((f) => f());
      this.presenting = true;
      await this.director.playTurn(result);
      if (token !== this.token) return;
      if (this.tut && this.run?.depth === 0) {
        if (result.events.some((e) => e.type === 'ability' && e.side === 'enemy')) this.tip('ability', 'ability');
        else if (result.events.some((e) => e.type === 'spin' && e.side === 'player')) this.tip('spin', 'firstSpin');
      }
      // HOLD: the tutorial's first PAIR (after the first-spin callout) says what a HOLD can do with it.
      if (this.tut?.spin && this.lastPair && result.side === 'player' && this.fight.holdsLeft > 0 && !this.coach.active) this.tip('hold', 'hold');
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
    const own = this.buttons.filter((b) => b.visible && b.enabled && !this.recapBtns.includes(b));
    // Run screens draw over the fight's buttons: only their own targets count.
    if (this.screens.active) return this.screens.navTargets();
    return [...own, ...this.recapBtns.filter((b) => b.visible && b.enabled)];
  }

  private music: MusicPlayer | null = null;

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
  private playMusic(): void {
    const id = this.musicMood();
    this.music?.play(id);
    this.synth.tune = 2 ** (SONG_HOME[id] / 12);
  }

  private startAudio(): void {
    this.synth.resume();
    if (!this.audioStarted) {
      this.audioStarted = true;
      this.music = new MusicPlayer(this.synth.ctx, this.synth.music);
      this.playMusic();
    }
  }

  private active: Button | null = null;

  pointerDown(x: number, y: number): void {
    this.startAudio();
    if (this.coach.active) return this.coach.hitsSkip(x, y) ? this.skipTutorial() : this.coach.advance();
    // PAUSE first: opened over the boss card, its first tap went to the card (playtest C).
    if (this.pause.open && !this.menus.isOpen) return this.pause.pointerDown(x, y);
    // The boss card is open: any tap closes it (the fight was paused under it).
    if (this.bossCard) {
      this.bossCard = false;
      this.sounds.click();
      return;
    }
    if (this.menus.isOpen) {
      // The SOUND toggle stays live on the main menu.
      if (this.muteBtn.visible && this.muteBtn.contains(x, y)) {
        this.active = this.muteBtn;
        this.muteBtn.down();
        return;
      }
      const was = this.menus.mode;
      this.menus.pointerDown(x, y);
      if (was !== this.menus.mode) this.syncButtons();
      return;
    }
    // Run screens get first pick: the tool buttons (TUNE/LOG/SOUND) sit under them (ITERATION_8 G3).
    if (this.screens.active && this.screens.pointerDown(x, y)) return;
    // HOLD (user, 2026-10-29): tap one of your reels before your spin, or while the enemy spins (the engine is on your
    // turn by then), to keep it for your next spin; tap again to let go. Nothing ever waits for it, AUTO included.
    if (this.canHold()) {
      const win = reelWindow('player');
      if (x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h) {
        this.tapHold(Math.floor((x - win.x) / CELL));
        return;
      }
    }
    // The BUILD drawer's handle: pull it out, push it back in.
    if (this.drawerLive() && this.onHandle(x, y)) {
      this.buildOpen = !this.buildOpen;
      this.drawerUsed = true;
      this.sounds.click();
      this.syncButtons();
      return;
    }
    const b = this.buttons.find((b) => b.visible && b.contains(x, y));
    if (b) {
      this.active = b;
      b.down();
      return;
    }
    if (this.screens.active && this.screens.pointerDown(x, y)) return;
    // Tap a boss's HUD: its rules card (BOSS CLARITY, user 2026-10-12). Reading, not playing: the fight pauses under it.
    if (this.onBossHud(x, y)) {
      this.bossCard = true;
      this.sounds.click();
      return;
    }
    // A click no longer skips the fight's playback: spam-clicking skipped every turn and ended rounds in seconds.
    // The speed buttons (1X-8X) are the way to watch faster.
  }

  pointerUp(x: number, y: number): void {
    const b = this.active;
    this.active = null;
    b?.up(b.contains(x, y));
    if (this.pause.open && !this.menus.isOpen) return this.pause.pointerUp(x, y);
    if (this.menus.isOpen) {
      const was = this.menus.mode;
      this.menus.pointerUp(x, y);
      if (was !== this.menus.mode) this.syncButtons();
      return;
    }
    if (this.screens.active) this.screens.pointerUp(x, y);
  }

  /** Touch or mouse: run screens drop hover-only behaviour for fingers. */
  setTouch(touch: boolean): void {
    this.screens.touch = touch;
  }

  pointerMove(x: number, y: number): boolean {
    this.mouse = { x, y };
    if (this.pause.open && !this.menus.isOpen) return this.pause.pointerMove(x, y);
    let any = false;
    for (const b of this.buttons) {
      b.hover = b.visible && b.contains(x, y);
      any ||= b.hover && b.enabled;
    }
    if (this.menus.isOpen) any = this.menus.pointerMove(x, y) || any;
    else if (this.screens.active) any = this.screens.pointerMove(x, y) || any;
    return any;
  }

  key(k: string): boolean {
    this.startAudio();
    if (this.coach.active) {
      // Any key moves the tutorial on (a pad's A included); S skips it.
      if (k === 's') this.skipTutorial();
      else this.coach.advance();
      return true;
    }
    // HOLD: Q / W / E, or the arrows / d-pad while a HOLD can be made (the fight's buttons all have their own keys).
    if (HOLD_KEYS[k] !== undefined && this.canHold() && !this.menus.isOpen) {
      this.tapHold(HOLD_KEYS[k]);
      return true;
    }
    // Keyboard / gamepad focus (STEAM_READINESS S3): arrows move it, Enter presses it.
    const dir = NAV_KEYS[k];
    if (dir) {
      const t = this.focus.move(dir, this.navTargets());
      if (t) this.pointerMove(t.x, t.y);
      return !!t;
    }
    // The RESULTS card takes Enter / A / Space itself (PRESS TO CONTINUE).
    if ((k === 'enter' || k === ' ') && this.screens.active && !this.menus.isOpen && this.screens.pressResults()) return true;
    // Enter / A with no focus yet: show it (on the screen's first target) instead of doing nothing.
    if (k === 'enter' && !this.focus.visible && !(this.menus.isOpen && this.menus.mode === 'loading')) {
      const t = this.focus.move('down', this.navTargets());
      if (t) {
        this.pointerMove(t.x, t.y);
        return true;
      }
    }
    // The boss card: Escape, Space or Enter closes it (keyboard and pad had no way out but a click).
    if (this.bossCard && !this.pause.open && (k === 'escape' || k === ' ' || k === 'enter')) {
      this.bossCard = false;
      this.sounds.click();
      return true;
    }
    // Space presses the focused button too (outside a fight, where Space spins).
    if (k === ' ' && this.focus.visible && this.phase !== 'fighting') k = 'enter';
    if (k === 'enter' && this.focus.visible) {
      const t = this.focus.current(this.navTargets());
      if (t) {
        this.pointerDown(t.x, t.y);
        this.pointerUp(t.x, t.y);
        // The screen may have changed under the press: re-hover what's under the focus now.
        const n = this.focus.current(this.navTargets());
        if (n) this.pointerMove(n.x, n.y);
        return true;
      }
    }
    if (this.menus.isOpen && k !== 'm') {
      const was = this.menus.mode;
      const used = this.menus.key(k);
      if (was !== this.menus.mode) this.syncButtons();
      return used;
    }
    // CHOOSE YOUR MACHINE: Escape goes back to the menu (a saved run stays saved).
    if (k === 'escape' && this.screens.active && this.screens.mode === 'cabinet') {
      this.sounds.click();
      this.showMenu();
      return true;
    }
    // RUN OVER: Escape is the way back to the menu.
    if (k === 'escape' && this.phase === 'over' && !this.menus.isOpen) {
      this.sounds.click();
      this.showMenu();
      return true;
    }
    // The GLOSSARY: Escape, Enter or Space goes back to the pause menu (a pad had no way back but closing the pause).
    if (this.pause.open && this.pause.glossary && (k === 'escape' || k === 'enter' || k === ' ')) {
      this.pause.glossary = false;
      this.sounds.click();
      return true;
    }
    // PAUSE: Escape anywhere in a run (STEAM_READINESS S2).
    if (k === 'escape' && this.pausable()) {
      this.setPaused(!this.pause.open);
      return true;
    }
    if (this.pause.open) return k !== 'm' ? true : (this.setMuted(!this.prefs.muted), true);
    switch (k) {
      case ' ':
        // Spins only (no skipping the playback, like a click).
        if (this.awaitingSpin) this.requestSpin();
        return true;
      case '1':
      case '2':
      case '3':
      case '4':
        this.setSpeed(SPEEDS[Number(k) - 1]);
        return true;
      case 'a':
        this.setAuto(!this.prefs.auto);
        return true;
      case 'r':
        // Not on a between-fight screen mid-run: there's no NEW RUN button there to show the warning (QA_2 B19).
        if (this.screens.active && this.run && !this.run.over) return true;
        this.newRunPressed();
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
    if (this.buildOpen) {
      // A stiff spring, a touch under-damped: the drawer slides out and settles with a small overshoot.
      this.drawerV += (300 * (1 - this.drawerT) - 26 * this.drawerV) * dt;
      this.drawerT += this.drawerV * dt;
    } else {
      this.drawerV = 0;
      this.drawerT += (0 - this.drawerT) * Math.min(1, dt * 18);
      if (this.drawerT < 0.002) this.drawerT = 0;
    }
    this.handleHover += ((this.onHandle(this.mouse.x, this.mouse.y) ? 1 : 0) - this.handleHover) * Math.min(1, dt * 16);
    this.menus.update(dt);
    // A tutorial callout freezes the fight where it is.
    this.pause.update(dt);
    // The soundtrack follows the screen (MUSIC): menus, the lounge between fights, each act, the bosses.
    if (this.music) this.playMusic();
    const frozen = this.coach.active || this.pause.open || this.bossCard;
    this.synth.holdLoops(frozen);
    const gdt = frozen ? 0 : this.stage.clock.tick(dt);
    this.camera.update(dt);
    this.particles.update(gdt);
    // THE WHEEL's topper turns (it races when the ball drops, then settles back to its idle turn).
    const gw = this.stage.gutter;
    if (this.fight.isWheel && gw.wheelSpeed !== undefined) {
      const idle = gw.wheelFast ? 1.2 : 0.6;
      gw.wheelSpeed += (idle - gw.wheelSpeed) * Math.min(1, gdt * 1.2);
      gw.wheelAngle = ((gw.wheelAngle ?? 0) + gw.wheelSpeed * gdt) % (Math.PI * 2);
    }
    this.background.update(dt);
    this.syncInPlay();
    for (const b of this.buttons) b.update(dt);
    const by = this.recap.buttonY - 30;
    for (const b of this.recapBtns) b.y = by;
  }

  /** What counts off the payline right now stays lit (the payline look dims the rest): THE JUKEBOX's armed DROP hits
   * with every visible note; THE DEALER's ALL IN (hand 3) counts every sword and seven in its 3x3. */
  private syncInPlay(): void {
    const { player, enemy } = this.stage.machines;
    const drop = this.fight.meter?.kind === 'volume' && this.stage.huds.player.armed;
    player.offLine = drop ? IN_PLAY.drop : IN_PLAY.none;
    enemy.offLine = this.fight.isDealer && this.fight.dealerHand >= DEALER_HANDS.length ? IN_PLAY.allIn : IN_PLAY.none;
  }

  /** The screen on show (a menu page, a run screen, a fight): a change of it plays the screen transition. */
  private screenKey(): string {
    const fight = (this.phase === 'fighting' || this.phase === 'quick') && !this.screens.active;
    return `${this.menus.isOpen ? this.menus.mode : '-'}|${this.screens.mode}|${fight ? 'fight' : this.phase}`;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // SCREEN TRANSITIONS: one place for every switch (transition.ts).
    this.transition.check(ctx, this.screenKey(), this.reducedMotion());
    this.drawFrame(ctx);
    const now = performance.now();
    this.transition.draw(ctx, this.lastDraw ? (now - this.lastDraw) / 1000 : 0);
    this.lastDraw = now;
  }
  private readonly transition = new Transition();
  private lastDraw = 0;

  private drawFrame(ctx: CanvasRenderingContext2D): void {
    const t = this.time;
    const s = this.stage;
    this.syncOoze();
    ctx.save();
    this.camera.apply(ctx);
    this.background.scene = this.sceneNow();
    this.background.draw(ctx, t);
    this.screens.roomBackdrop ??= (c, time) => this.background.draw(c, time);
    if (this.camera.dim > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${this.camera.dim})`;
      ctx.fillRect(-40, -40, W + 80, H + 80);
    }
    if (this.menus.isOpen) {
      ctx.restore();
      this.menus.draw(ctx, t);
      if (this.muteBtn.visible) this.muteBtn.draw(ctx, t);
      // The kit's focus: gold corner brackets around what the pad or keyboard is on.
      if (this.focus.visible) this.focus.draw(ctx, this.navTargets(), t);
      return;
    }
    this.view.drawChips(ctx);
    s.huds.player.draw(ctx, t);
    s.huds.enemy.draw(ctx, t);
    s.machines.player.draw(ctx, s.clock.time);
    if (this.fight.isDealer) this.view.drawDealerTable(ctx, t);
    if (this.fight.isWheel) this.view.drawWheelCabinet(ctx);
    s.machines.enemy.draw(ctx, s.clock.time);
    if (this.fight.isWheel) this.view.drawWheelTopper(ctx);
    s.fx.draw(ctx, s.clock.time, -Infinity, 20);
    this.view.drawGutter(ctx, t);
    this.particles.draw(ctx);
    s.fx.draw(ctx, s.clock.time, 20, Infinity);
    this.view.drawHoldBar(ctx, t);
    if (this.drawerT < 0.5) this.view.drawRelicFeed(ctx);
    if (this.fight.cfg.enemy.boss && !this.screens.active) this.view.drawBossHint(ctx);
    // The BUILD drawer: your whole build slides out over the left side (relics fire inside it), chips stay put on top.
    if (this.drawerLive()) {
      if (this.drawerT > 0.005) {
        // The fight dims behind the open drawer, so the drawer reads as a layer on top.
        const edge = BUILD.x + BUILD.w + 8;
        ctx.fillStyle = `rgba(6,2,12,${(0.45 * Math.min(1, this.drawerT)).toFixed(3)})`;
        ctx.fillRect(edge, 0, W - edge, H);
        ctx.save();
        ctx.translate(-(1 - this.drawerT) * (BUILD.x + BUILD.w + 8), 0);
        this.screens.drawBuildFor(ctx, this.run!);
        if (this.drawerT >= 0.5) this.view.drawRelics(ctx);
        ctx.restore();
        this.view.drawChips(ctx);
      }
      this.view.drawHandle(ctx);
    }
    ctx.restore();
    if ((this.phase === 'fighting' || this.phase === 'quick') && !this.screens.active) this.view.drawDanger(ctx, t);

    if (this.camera.flash > 0) {
      ctx.globalAlpha = Math.min(1, this.camera.flash);
      ctx.fillStyle = this.camera.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    for (const b of this.buttons) if (!this.recapBtns.includes(b)) b.draw(ctx, t);
    // The boss card covers the whole screen, the bottom bar too (it pauses the fight).
    if (this.bossCard) this.view.drawBossCard(ctx);
    this.view.drawRelicTooltip(ctx);
    this.screens.draw(ctx, t);
    this.recap.draw(ctx);
    for (const b of this.recapBtns) b.draw(ctx, t);
    this.coach.draw(ctx, t);
    this.pause.draw(ctx, t);
    if (this.focus.visible) this.focus.draw(ctx, this.navTargets(), t);
  }

  relicList() {
    return this.fight.cfg.relics;
  }

  /** HOLD (experiment): a HELD tag on each held reel, your HOLDs left under your machine, and the HOLD CHANCE call. */
  /** HOLD: hold reel r, or let it go (a tap, Q / W / E, or the d-pad). */
  private tapHold(r: number): void {
    const was = this.fight.held[r];
    const now = this.fight.hold(r);
    if (now !== was) this.sounds.reelStop(r, now ? 1.4 : 0.8);
    else {
      this.sounds.fizzle();
      this.toolNote = { text: this.fight.sides.player.frozen[r] > 0 ? "A FROZEN REEL CAN'T BE HELD" : 'NO HOLDS LEFT THIS FIGHT', at: performance.now() };
    }
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


  /** Mirror the slime on the player's displayed strips into the HUD counter. */
  private syncOoze(): void {
    const hud = this.stage.huds.player;
    let n = 0;
    let total = 0;
    for (const reel of this.stage.machines.player.reels) {
      // The chase cells aren't really on your strip (QA_1 B13).
      for (const c of reel.cells) {
        if (c.symbol === 'bonusSym' || c.symbol === 'relicSym') continue;
        total++;
        if (c.slimed) n++;
      }
    }
    if (n !== hud.ooze) hud.oozePunch = 1.5;
    hud.oozePunch += (1 - hud.oozePunch) * 0.15;
    hud.ooze = n;
    hud.oozeTotal = total;
  }


  /** The Dealer's table: green felt behind its machine, and the ALL IN warning over it. */
  /** The boss card is open (it pauses the fight). */
  bossCard = false;

  private onBossHud(x: number, y: number): boolean {
    if (!this.fight.cfg.enemy.boss || this.screens.active || this.fight.over) return false;
    const hx = this.stage.huds.enemy.x;
    return x >= hx && x <= hx + HUD_W && y >= HUD_TOP - 8 && y <= HUD_TOP + 140;
  }


  /** THE ROOMS: where the fight is (the act's room, the boss's set piece, the loop, your HP). Menus: the casino floor. */
  private sceneNow(): Scene {
    const run = this.run;
    const inRun = !!run && !this.menus.isOpen && this.phase !== 'title';
    // (A sandbox fight has no run: it's still a fight, on the casino floor.)
    const fight = !this.menus.isOpen && (this.phase === 'fighting' || this.phase === 'recap');
    const boss = this.fight.cfg.enemy.boss;
    const p = this.fight.sides.player;
    const e = this.fight.sides.enemy;
    return {
      room: inRun ? roomFor(run!.act, run!.endless?.loop ?? 0) : 'floor',
      boss: fight && (boss === 'house' || boss === 'wheel' || boss === 'dealer' || boss === 'owner') ? boss : null,
      loop: inRun ? (run!.endless?.loop ?? 0) : 0,
      hp: fight && p.maxHp > 0 ? Math.max(0, p.hp) / p.maxHp : 1,
      foeHp: fight && e.maxHp > 0 ? Math.max(0, e.hp) / e.maxHp : 1,
      turn: fight ? this.stage.gutter.side : null,
      fight,
      turbo: fight && !!this.fight.cfg.enemy.owner,
    };
  }
}
