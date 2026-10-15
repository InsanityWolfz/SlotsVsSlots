import { OWNER_TRICKS } from './core/enemies';
import { Sounds } from './audio/sounds';
import type { CombatEvent } from './core/events';
import { Synth } from './audio/synth';
import { mergeConfig, UNIT, type GameConfig, type SideId } from './core/config';
import { TUNE } from './core/enemies';
import { MAX_STAKE, STAKES, stakeUnlock } from './core/stakes';
import { allInRange, DEALER_HANDS, DEALER_RULES, Fight, highRollerMul } from './core/fight';
import { roomFor, type Scene } from './render/rooms';
import { dailyCabinet, dailyKey, dailySeed, dailySpent } from './core/daily';
import { turnRow, type TurnRow } from './core/log';
import { RELICS } from './core/relics';
import {
  applyOption,
  buy,
  chooseRoute,
  createRun,
  draftOffers,
  applyDaily,
  nightOf,
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
import { Camera, FLASH_CAP } from './present/camera';
/** Under this share of your max HP the screen's edges breathe red and a heartbeat opens the enemy's turns. */
const DANGER_HP = 0.3;
import { Clock } from './present/clock';
import { Director } from './present/director';
import { FxLayer } from './present/fx';
import { HUD_W, HudView, type HudMeter } from './present/hud';
import { cellCenter, COLORS, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, HUD_TOP, PITCH, reelWindow, RELIC_FEED, RELIC_SHOWN, RELIC_X, RELIC_Y, relicSlot, W } from './present/layout';
import { MachineView } from './present/machine';
import { Particles } from './present/particles';
import { defaultJuice, type JuiceToggles, type Stage } from './present/stage';
import { Background } from './render/background';
import { drawSprite, spriteSize, type SpriteId, artId } from './render/sprites';
import { bossRules } from './ui/bossRules';
import { runSummary } from './core/runLog';
import { drawRich } from './ui/keywords';
import { drawText, fmtNum } from './render/text';
import { Button } from './ui/button';
import { Recap } from './ui/recap';
import { BUILD, CHIP_SPOT, RunScreens, wrap } from './ui/runScreens';
import { drawRelicTip } from './ui/relicTip';
import { Pause } from './ui/pause';
import { MusicPlayer, SONG_HOME, type SongId } from './audio/music';
import { CHARM_VALUE } from './core/charms';
import { Focus, type NavDir, type NavRect } from './ui/focus';
import { desktop, steamUnlock, VERSION } from './build';

/** The fight HUD's relic tooltip starts under the player panel (EXPERT_PLAYTEST_12). */
const RELIC_TIP_TOP = 232;
import { Coach, TUTORIAL } from './ui/coach';
import { collectionTotal, heroSprite, Menus } from './ui/menus';
import { cleanName, nameBlocked, shownTrim, discover, emptyProfile, MAX_ENTRIES, recordMeta, runEntry, runScore, sanitizeProfile, shownTitle, type MetaGain, type Profile, type RunEntry } from './core/profile';
import { levelOf } from './core/meta';
import { needsName, playerId, playerName } from './net/identity';
import { claimName, submitScore } from './net/leaderboard';
import { online } from './net/config';

const CFG_KEY = 'slotvslot.config.v3';
const PREFS_KEY = 'slotvslot.prefs.v2';
const PROFILE_KEY = 'slotvslot.profile.v1';
const AUTO_DELAY = 0.35;
/** HOLD (experiment): HOLDs a fight. */

/** Speed buttons (keys 1-4). The new 1X is half of the old 1X, so the clock runs at speed / 2. */
const SPEEDS = [1, 2, 4, 8];
const clockSpeed = (s: number) => s / 2;

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
    auto: typeof p.auto === 'boolean' ? p.auto : true,
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
  private tut: { fight?: boolean; spin?: boolean; ability?: boolean; draft?: boolean; shop?: boolean } | null = null;

  stage!: Stage;
  director!: Director;
  fight!: Fight;
  tracker!: StatsTracker;
  run: RunState | null = null;
  phase: Phase = 'title';
  presenting = false;
  awaitingSpin = false;
  /** HOLD (experiment): your last spin paid a PAIR; the fight is waiting on a HOLD CHANCE. */
  private lastPair = false;
  /** THE SCORE RACE (sandbox): this fight is a race; the next run picked on the machine screen will be one. */
  private race = false;
  /** THE SCORE RACE: where your turn is (before the spin, or landed and waiting on PAY), the tool a reel tap uses, the
   * tray's tap targets, and a tool animating (PAY waits for it). */
  private racePhase: 'pre' | 'post' | null = null;
  private armed: 'nudge' | 'respin' | null = null;
  private toolRects: { id: 'nudge' | 'respin'; x: number; y: number; w: number; h: number }[] = [];
  private toolBusy = false;
  /** A short note over your machine (a NUDGE on a frozen reel). */
  private toolNote: { text: string; at: number } | null = null;
  private raceNext = false;
  private holdPrompt = false;
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
  /** The BUILD drawer: pulled out (or not) in fights, and how far out it is (0..1, eased). */
  private buildOpen = false;
  private drawerT = 0;
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
      onNewRun: () => {
        this.raceNext = false;
        this.chooseCabinet();
      },
      onRace: () => {
        this.raceNext = true;
        this.chooseCabinet();
      },
      onTutorial: () => this.startTutorial(),
      onDaily: () => this.startDaily(),
      needsName: () => needsName(this.profile),
      onName: (name) => this.pickName(name),
      onNameSkip: () => {
        this.profile.nameAsked = true;
        this.pendingPost = null;
        this.saveProfile();
      },
      playerName: () => playerName(this.profile),
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
      // After the first run: offer the (optional) leaderboard name on the way out of the run-over screen.
      // (CASH OUT / NEW RUN from the run-over screen: the Dealer's saved LET IT RIDE choice is spent.)
      onNewRun: () => {
        if (this.phase === 'over') clearRunSave();
        this.afterNamePrompt(() => this.chooseCabinet());
      },
      onMenu: () => this.afterNamePrompt(() => this.showMenu()),
      onLetItRide: () => this.letItRide(),
      onBuy: (i) => this.buyItem(i),
      onReroll: () => this.rerollShop(),
      onLeave: () => this.leaveCashier(),
      onCabinet: (id) => {
        // (THE SCORE RACE slice plays at WHITE.)
        this.startRun(undefined, id, this.raceNext ? 0 : Math.min(this.prefs.stakeSel, this.stakesNow()[id] ?? 0));
        if (this.raceNext && this.run) {
          // THE SCORE RACE (sandbox): the run is a race run; rebuild its first fight as one.
          this.raceNext = false;
          this.run.race = true;
          this.newFight(false, null, fightConfig(this.run, this.cfg), true);
          this.checkpoint('next');
        }
      },
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
    this.autoBtn = this.btn('AUTO', px - 116, by, 84, 44, () => this.setAuto(!this.prefs.auto));
    // One SPEED button cycles 1X -> 2X -> 4X -> 8X (the keys 1-4 still pick one).
    this.speedBtns.push(this.btn('2X', px + 130, by, 120, 44, () => this.setSpeed(SPEEDS[(SPEEDS.indexOf(this.prefs.speed) + 1) % SPEEDS.length])));
    this.startBtn = this.btn('START RUN', W / 2 + 10, by, 196, 56, () => this.newRunPressed(), { idlePulse: true, textScale: 3 });
    const ex = MACHINE_CX.enemy;
    const tune = this.btn('TUNE', W / 2, by, 90, 44, () => {}, { quiet: true });
    // The tool row: small and dim (it's a watch-only game; the chrome shouldn't compete with the reels).
    const log = this.btn('LOG', ex + 60, by, 70, 36, () => {}, { quiet: true });
    this.muteBtn = this.btn('SOUND', ex + 140, by, 70, 36, () => this.setMuted(!this.prefs.muted), { quiet: true });

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
    // THE SCORE RACE: once your spin has landed, the button pays it out.
    this.spinBtn.label = this.racePhase === 'post' ? 'PAY' : 'SPIN';
    // START RUN on the title; in a run it's a small PAUSE on the right (RESUME, GLOSSARY, SETTINGS, QUIT, ABANDON).
    const title = this.phase === 'title';
    this.startBtn.label = title ? 'START RUN' : 'PAUSE';
    this.startBtn.opts.idlePulse = title;
    this.startBtn.opts.textScale = title ? 3 : undefined;
    Object.assign(this.startBtn, title ? { x: W / 2 + 10, w: 196, h: 56 } : { x: MACHINE_CX.enemy + 220, w: 70, h: 36 });
    this.startBtn.opts.quiet = !title;
    this.muteBtn.label = this.prefs.muted ? 'MUTED' : 'SOUND';
    this.muteBtn.toggled = this.prefs.muted;
    const overlay = this.screens.active || this.phase === 'recap' || this.menus.isOpen;
    for (const b of [this.spinBtn, this.autoBtn, this.startBtn, ...this.speedBtns]) b.visible = !overlay;
    // The pulled-out drawer covers AUTO and SPIN: they come back when the drawer closes.
    if (this.buildOpen && this.drawerLive()) this.autoBtn.visible = this.spinBtn.visible = false;
    for (const b of this.recapBtns) b.visible = this.phase === 'recap';
    for (const b of this.buttons) if (b.label === 'TUNE' || b.label === 'LOG') b.visible = this.screens.mode !== 'cabinet' && !(b.label === 'TUNE' && this.publicBuild);
    // On the menus SOUND lives in SETTINGS (the main menu stays clear); M still toggles it everywhere.
    this.muteBtn.visible = this.screens.mode !== 'cabinet' && !this.menus.isOpen;
    Object.assign(this.muteBtn, this.menus.isOpen ? { x: W - 70, y: H - 30 } : { x: MACHINE_CX.enemy + 140, y: 648 });
    if (this.menus.isOpen) this.toolButtons!.tune.visible = this.toolButtons!.log.visible = false;
    this.noteDiscoveries();
  }

  applyJuice(): void {
    const j = this.prefs.juice;
    Object.assign(this.camera.enabled, { shake: j.shake, zoom: j.zoom, chroma: j.chroma, flash: j.flash });
    this.particles.enabled = j.particles;
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
      this.afterRecord(ride, recordMeta(this.profile, ride, collectionTotal(), prev), true);
      return;
    }
    // THE SCORE RACE slice is filed like the tutorial: no stats, XP, achievements or boards.
    const entry = runEntry(run, Date.now(), !!run.tutorial || !!run.race);
    if (run.won && !run.endless) run.rideAt = entry.at;
    this.profile.runs.push(entry);
    while (this.profile.runs.length > MAX_ENTRIES) {
      const top = new Set([...this.profile.runs].sort((a, b) => runScore(b) - runScore(a)).slice(0, 10));
      const i = this.profile.runs.findIndex((e) => !top.has(e));
      this.profile.runs.splice(i < 0 ? 0 : i, 1);
    }
    this.afterRecord(entry, recordMeta(this.profile, entry, collectionTotal()));
  }

  /** META: save, show what the run earned, and post it to the leaderboards. */
  private afterRecord(entry: RunEntry, gain: MetaGain, ride = false): void {
    for (const a of gain.achievements) steamUnlock(a.id);
    this.saveProfile();
    this.screens.setMeta(gain);
    if (entry.tutorial || !online()) return;
    // No name yet: the score waits for one (the name is offered as you leave this screen; SKIP drops it).
    if (!playerName(this.profile)) {
      this.pendingPost = { entry, ride };
      return;
    }
    this.postScores(entry, ride);
  }

  /** A finished run's score, waiting for the player to pick a name (null: none). */
  private pendingPost: { entry: RunEntry; ride: boolean } | null = null;

  /** The run-over screen's way out: the name screen first if it's due (once, after the first run), then `go`. */
  private afterNamePrompt(go: () => void): void {
    if (online() && needsName(this.profile)) {
      this.showMenu();
      this.menus.showName(go);
      return;
    }
    go();
  }

  /** Post a finished run to its boards (ALL TIME, the DAILY or the WEEKLY). */
  private postScores(entry: RunEntry, ride: boolean): void {
    // ALL TIME takes standard runs (not the daily, weekly or challenges: EXPERT_PLAYTEST_9 D1). Scores post when the run
    // ends or at the Dealer win, never again from an endless ride (its pot would swamp every board). The daily keeps its one
    // score; the weekly takes every try (the board shows your best).
    const standard = !entry.daily && !entry.weekly && !entry.challenge;
    const boards = ride ? [] : [...(standard ? ['all'] : []), ...(entry.daily ? [`daily:${entry.daily}`] : []), ...(entry.weekly ? [`weekly:${entry.weekly}`] : [])];
    if (!boards.length) return this.screens.setOnline('');
    const main = boards[boards.length - 1];
    this.screens.setOnline('POSTING YOUR SCORE...');
    void this.claimed().then(async (ok) => {
      if (!ok) return this.screens.setOnline(this.profile.name ? '' : 'YOUR NAME WAS TAKEN: PICK A NEW ONE AT THE MENU');
      const ranks = await Promise.all(
        boards.map((board) =>
          submitScore({
            name: playerName(this.profile),
            title: shownTitle(this.profile),
            pid: playerId(this.profile),
            board,
            score: runScore(entry),
            cabinet: entry.cabinet,
            stake: entry.stake,
            won: entry.won,
            level: levelOf(this.profile.xp).level,
          }),
        ),
      );
      const r = ranks[boards.indexOf(main)];
      const where = main === 'all' ? 'ALL TIME' : main.startsWith('daily') ? 'DAILY' : 'WEEKLY';
      this.screens.setOnline(r ? `RANK ${r} ${where}` : r === 0 ? 'SCORE POSTED' : "COULDN'T POST YOUR SCORE");
    });
  }

  /** The name is claimed on the server (once a session; a name picked offline is claimed when the boards open). */
  private nameClaimed = false;
  private async claimed(): Promise<boolean> {
    if (this.nameClaimed) return true;
    const r = await claimName(playerName(this.profile), playerId(this.profile));
    this.saveProfile();
    if (r.startsWith('have:')) {
      const mine = cleanName(r.slice(5));
      if (mine) this.profile.name = mine;
      this.saveProfile();
    }
    this.nameClaimed = r === 'ok' || r.startsWith('have:');
    // Picked offline and someone got there first (or the boards refuse it): ask again at the menu.
    if (r === 'taken' || r === 'blocked') {
      delete this.profile.name;
      this.saveProfile();
    }
    return this.nameClaimed;
  }

  /** First launch: claim a name (offline keeps it locally and claims it later). */
  private async pickName(raw: string): Promise<string> {
    const name = cleanName(raw);
    if (!name) return 'taken';
    if (nameBlocked(name)) return 'blocked';
    const r = await claimName(name, playerId(this.profile));
    if (r === 'taken' || r === 'blocked') return r;
    this.profile.name = r.startsWith('have:') ? cleanName(r.slice(5)) || name : name;
    this.nameClaimed = r !== 'offline';
    this.saveProfile();
    // The run that just ended goes up now.
    if (this.pendingPost) {
      const { entry, ride } = this.pendingPost;
      this.pendingPost = null;
      this.postScores(entry, ride);
    }
    return r;
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

  private tip(key: 'fight' | 'spin' | 'ability' | 'draft' | 'shop', tips: keyof typeof TUTORIAL, done?: () => void): void {
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
      stakeText = `STAKE ${next.level} ${next.name} UNLOCKED FOR ${CABINETS[run.cabinet].name}: ${next.rule}`;
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

  /** THE DAILY RUN: today's seed and machine, base stake. The try is spent now (quitting doesn't give it back). */
  startDaily(): void {
    const key = dailyKey();
    if (dailySpent(key, this.profile.lastDaily)) return;
    this.profile.lastDaily = key;
    this.saveProfile();
    this.startRun(dailySeed(key), dailyCabinet(key), 0);
    if (this.run) applyDaily(this.run, key);
    // The first fight was set up before the run knew it was the daily: rebuild it on the day's seed.
    this.newFight(false, null, fightConfig(this.run!, this.cfg), true);
    this.checkpoint('next');
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
      else if (e.type === 'blast' && e.side === 'player') add('BOMBS', e.hpDamage);
    }
  }
  private shelf: ShopItem[] = [];

  private afterRunFight(): void {
    const run = this.run!;
    const record = finishFight(run, this.fight);
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
      // The daily is a side road: no unlocks from it.
      // (The daily and THE SCORE RACE slice are side roads: no unlocks from them.)
      if (run.daily || run.race) this.screens.setStakeUnlockedNow('');
      this.screens.setUnlockedNow(run.endless || run.daily || run.race ? [] : this.checkUnlocks(run));
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
    // THE SCORE RACE (sandbox): a race fight has HOLDs (fightConfig sets them) and waits on every spin of yours.
    this.race = !!cfg.race;
    this.lastPair = false;
    this.holdPrompt = false;
    this.fight = new Fight(cfg, seed ?? cfg.seed ?? undefined);
    this.hurt.clear();
    this.spins = [0, 0];
    this.lastSeed = this.fight.seed;
    this.tracker = new StatsTracker(this.fight);
    const clock = new Clock();
    clock.speed = clockSpeed(this.prefs.speed);
    const sides: SideId[] = ['player', 'enemy'];
    const machines = Object.fromEntries(sides.map((s) => [s, new MachineView(s, this.fight.sides[s], this.sounds)])) as Stage['machines'];
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
        hud.hp = hud.ghost = c.hp;
        if (s === 'player') hud.chips = hud.chipsHeld = cfg.player.chipsHeld ?? 0;
        if (c.ability) hud.charge = c.charge;
        // THE SCORE RACE: the HP bar is a score bar.
        if (cfg.race) hud.race = true;
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
        // THE DAILY RUN's TONIGHT'S RULE, shown all run (ENDLESS names its rule in the fight label).
        twist: this.run && inRun && this.run.daily ? (nightOf(this.run)?.title ?? '') : '',
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
      // HOLD CHANCE: your last spin paid a PAIR and you have HOLDs left: even on AUTO the fight waits for you (tap a
      // reel to hold it, then SPIN). Without AUTO every spin waits, and you can hold before any of them.
      const holdChance = this.race && this.fight.next === 'player' && this.fight.holdsLeft > 0 && this.lastPair;
      if (this.fight.next === 'player' && (!this.prefs.auto || holdChance || this.race)) {
        this.holdPrompt = holdChance;
        this.racePhase = this.race ? 'pre' : null;
        // (The arrow points at you while the race waits on you: it showed ENEMY TURN through your HOLD and NUDGE steps.)
        if (this.race) this.stage.gutter.side = 'player';
        this.awaitingSpin = true;
        this.syncButtons();
        await new Promise<void>((r) => (this.spinResolve = r));
        this.awaitingSpin = false;
        this.holdPrompt = false;
        this.syncButtons();
        // THE SCORE RACE: the spin lands first; with NUDGEs or RESPINs left, it waits on PAY before it scores.
        if (this.race && token === this.token) {
          const landed = this.fight.land();
          if (landed) {
            this.racePhase = null;
            await this.director.landSpin(landed.stops, landed.moved);
            if (token !== this.token) return;
            if (this.fight.nudgesLeft > 0 || this.fight.respinsLeft > 0) {
              this.racePhase = 'post';
              this.armed = this.fight.nudgesLeft > 0 ? 'nudge' : 'respin';
              this.awaitingSpin = true;
              this.syncButtons();
              await new Promise<void>((r) => (this.spinResolve = r));
              this.awaitingSpin = false;
              this.syncButtons();
            }
          }
          this.racePhase = null;
          this.syncButtons();
        }
      } else {
        await clock.wait(AUTO_DELAY);
      }
      if (token !== this.token) return;
      const result = this.fight.step();
      for (const e of result.events) if (e.type === 'spin' && e.side === 'player') this.lastPair = e.score.tier === 'pair';
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
    if (!this.awaitingSpin || !this.spinResolve || this.toolBusy) return;
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

  /** ABANDON RUN: the run is thrown away (the daily try stays spent). */
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
    // HOLD (experiment): while the fight waits on your spin, tap one of your reels to hold it (tap again to let go).
    if (this.awaitingSpin && this.race && !this.screens.active) {
      // The tray: pick NUDGE or RESPIN (after your spin lands).
      if (this.racePhase === 'post') {
        const chip = this.toolRects.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
        if (chip) {
          if ((chip.id === 'nudge' ? this.fight.nudgesLeft : this.fight.respinsLeft) > 0) {
            this.armed = chip.id;
            this.sounds.click();
          } else this.sounds.fizzle();
          return;
        }
      }
      const win = reelWindow('player');
      if (x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h) {
        const r = Math.floor((x - win.x) / PITCH);
        if (this.racePhase === 'post') {
          void this.useTool(r);
          return;
        }
        const was = this.fight.held[r];
        const now = this.fight.hold(r);
        if (now !== was) this.sounds.reelStop(r, now ? 1.4 : 0.8);
        else this.sounds.fizzle();
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
    if (k === 'enter' && !this.focus.visible && !(this.menus.isOpen && (this.menus.mode === 'loading' || this.menus.mode === 'name'))) {
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
      if (this.focus.visible) this.focus.draw(ctx, this.navTargets(), t);
      return;
    }
    this.background.drawMarquee(ctx, t);
    this.drawChips(ctx);
    s.huds.player.draw(ctx, t);
    s.huds.enemy.draw(ctx, t);
    s.machines.player.draw(ctx, s.clock.time);
    if (this.fight.isDealer) this.drawDealerTable(ctx, t);
    if (this.fight.isWheel) this.drawWheelCabinet(ctx);
    s.machines.enemy.draw(ctx, s.clock.time);
    if (this.fight.isWheel) this.drawWheelTopper(ctx);
    s.fx.draw(ctx, s.clock.time, -Infinity, 20);
    this.drawGutter(ctx, t);
    this.particles.draw(ctx);
    s.fx.draw(ctx, s.clock.time, 20, Infinity);
    if (this.race) this.drawHolds(ctx, t);
    if (this.drawerT < 0.5) this.drawRelicFeed(ctx);
    if (this.fight.cfg.enemy.boss && !this.screens.active) this.drawBossHint(ctx);
    if (this.bossCard) this.drawBossCard(ctx);
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
        if (this.drawerT >= 0.5) this.drawRelics(ctx);
        ctx.restore();
        this.drawChips(ctx);
      }
      this.drawHandle(ctx);
    }
    ctx.restore();
    if ((this.phase === 'fighting' || this.phase === 'quick') && !this.screens.active) this.drawDanger(ctx, t);

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
    this.coach.draw(ctx, t);
    this.pause.draw(ctx, t);
    if (this.focus.visible) this.focus.draw(ctx, this.navTargets(), t);
  }

  private relicList() {
    return this.fight.cfg.relics;
  }

  /** HOLD (experiment): a HELD tag on each held reel, your HOLDs left under your machine, and the HOLD CHANCE call. */
  /**
   * THE SCORE RACE's spin tools: HELD frames, the tool tray under your machine (HOLD / NUDGE / RESPIN and their counts;
   * tap NUDGE or RESPIN to pick it once your spin has landed) and the prompt over it.
   */
  private drawHolds(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.race || (this.phase !== 'fighting' && this.phase !== 'quick')) return;
    const f = this.fight;
    for (let r = 0; r < 3; r++) {
      if (!f.held[r]) continue;
      const c = cellCenter('player', r, 1);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.strokeRect(c.x - PITCH / 2 + 4, MACHINE_TOP + 4, PITCH - 8, MACHINE_H - 8);
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(c.x - 40, c.y + PITCH / 2 + 4, 80, 26);
      drawText(ctx, 'HELD', c.x, c.y + PITCH / 2 + 17, 2, '#ffd23f');
    }
    const win = reelWindow('player');
    const holds = f.holdsLeft - f.held.filter(Boolean).length;
    const pre = this.racePhase === 'pre' && this.awaitingSpin;
    const post = this.racePhase === 'post' && this.awaitingSpin;
    // The tray: three chips. HOLD is live before your spin, NUDGE and RESPIN after it lands.
    const chips: { id: 'hold' | 'nudge' | 'respin'; label: string; n: number; live: boolean }[] = [
      { id: 'hold', label: 'HOLD', n: holds, live: pre },
      { id: 'nudge', label: 'NUDGE', n: f.nudgesLeft, live: post },
      { id: 'respin', label: 'RESPIN', n: f.respinsLeft, live: post },
    ];
    const cw = 96;
    const y = win.y + win.h + 18;
    this.toolRects = [];
    chips.forEach((c, k) => {
      const x = win.x + win.w / 2 + (k - 1) * (cw + 6);
      const armed = post && this.armed === c.id;
      const on = c.live && c.n > 0;
      // HOLD isn't a button (you tap a reel to hold it): a plain counter, lit while you can hold.
      if (c.id === 'hold') {
        drawText(ctx, `${c.label} ${c.n}`, x, y, 1.5, on ? '#ffd23f' : COLORS.textDim);
        return;
      }
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - cw / 2 - 2, y - 13, cw + 4, 26);
      ctx.fillStyle = armed ? '#ffd23f' : on ? '#3a2d52' : '#1a1226';
      ctx.fillRect(x - cw / 2, y - 11, cw, 22);
      if (armed) {
        ctx.fillStyle = '#5a3d08';
        ctx.fillRect(x - cw / 2 + 2, y - 9, cw - 4, 18);
      }
      drawText(ctx, `${c.label} ${c.n}`, x, y, 1.5, armed ? '#fff6c0' : on ? '#ffd23f' : COLORS.textDim);
      this.toolRects.push({ id: c.id, x: x - cw / 2, y: y - 13, w: cw, h: 26 });
    });
    if (!this.awaitingSpin) return;
    const pulse = 0.75 + 0.25 * Math.sin(t * 6);
    const any = f.held.some(Boolean);
    let text = '';
    if (this.toolNote && performance.now() - this.toolNote.at < 1500) {
      drawText(ctx, this.toolNote.text, win.x + win.w / 2, win.y - 22, 2, '#9fd0ff');
      return;
    }
    if (pre) text = any ? 'NOW SPIN' : holds <= 0 ? '' : this.holdPrompt ? 'A PAIR! TAP A REEL TO HOLD IT, OR SPIN' : 'TAP A REEL TO HOLD IT, OR SPIN';
    else if (post) text = this.armed === 'nudge' ? 'TAP A REEL TO NUDGE IT, OR PAY' : this.armed === 'respin' ? 'TAP A REEL TO RESPIN IT, OR PAY' : 'PAY';
    if (text) drawText(ctx, text, win.x + win.w / 2, win.y - 22, 2, any || this.holdPrompt || post ? '#ffd23f' : COLORS.textDim, { alpha: pulse });
  }

  /**
   * THE SCORE RACE's scoreboard (between the machines): both scores, who leads and by how much, and a pip for every spin
   * each machine gets (lit once spun). Its rules sit under the VS (a boss's pot takes that spot).
   */
  private drawScoreboard(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
    const h = this.stage.huds;
    const you = Math.round(h.player.score);
    const it = Math.round(h.enemy.score);
    const x0 = cx - 120;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - 4, cy - 162, 248, 108);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0 - 2, cy - 160, 244, 104);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x0, cy - 158, 240, 100);
    drawText(ctx, fmtNum(you), cx - 58, cy - 128, 3.5, COLORS.goldLight, { punch: h.player.scorePunch });
    drawText(ctx, fmtNum(it), cx + 58, cy - 128, 3.5, '#ff8a7a', { punch: h.enemy.scorePunch });
    drawText(ctx, '-', cx, cy - 128, 3, COLORS.textDim);
    const d = you - it;
    const lead = this.fight.over ? (this.fight.winner === 'player' ? 'YOU WIN THE RACE' : 'YOU LOSE THE RACE') : d > 0 ? `YOU LEAD BY ${fmtNum(d)}` : d < 0 ? `BEHIND BY ${fmtNum(-d)}` : 'TIED';
    drawText(ctx, lead, cx, cy - 98, 1.5, d > 0 ? COLORS.goldLight : d < 0 ? '#ff8a7a' : COLORS.text);
    // The spin pips: yours on the left, theirs on the right.
    const spins = this.fight.cfg.race?.spins ?? 0;
    const used = spins - this.fight.raceLeft;
    const theirs = Math.max(0, this.fight.turn - used);
    for (const [side, n, x] of [['player', used, cx - 58], ['enemy', theirs, cx + 58]] as const) {
      for (let k = 0; k < spins; k++) {
        const px = x + (k - (spins - 1) / 2) * 14;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(px - 5, cy - 77, 10, 10);
        ctx.fillStyle = k < n ? (side === 'player' ? '#ffd23f' : '#ff6a5a') : '#2a2038';
        ctx.fillRect(px - 4, cy - 76, 8, 8);
      }
    }
    if (!this.fight.isBoss) {
      drawText(ctx, 'HIGHER SCORE WINS', cx, cy + 118, 1.5, COLORS.textDim);
      drawText(ctx, 'A SHIELD BLOCKS THEIR NEXT SABOTAGE', cx, cy + 136, 1.25, '#9fd0ff', { alpha: 0.8 + 0.2 * Math.sin(t * 2) });
    }
  }

  /** THE SCORE RACE: a NUDGE or RESPIN on a landed reel (animated; PAY waits for it). */
  private async useTool(r: number): Promise<void> {
    const f = this.fight;
    if (this.toolBusy || !f.landed) return;
    const tool = this.armed;
    const ok = tool === 'nudge' ? f.nudge(r) : tool === 'respin' ? f.respin(r) : false;
    if (!ok) {
      this.sounds.fizzle();
      // (A frozen reel can't be moved: say so, it only fizzled.)
      if (f.sides.player.frozen[r] > 0) this.toolNote = { text: 'A FROZEN REEL CAN\'T MOVE', at: performance.now() };
      return;
    }
    this.toolBusy = true;
    if (tool === 'nudge') await this.director.nudgeReel(r);
    else await this.director.respinReel(r, f.landed![r]);
    this.toolBusy = false;
    if (this.armed === 'nudge' && f.nudgesLeft <= 0) this.armed = f.respinsLeft > 0 ? 'respin' : null;
    else if (this.armed === 'respin' && f.respinsLeft <= 0) this.armed = f.nudgesLeft > 0 ? 'nudge' : null;
  }

  /** LOW HP (feel playtest: nothing said you were in trouble): under 30% HP the screen's edges breathe red, slowly,
   * stronger under 15%. An edge vignette, never a flash (it stays under FLASH_CAP at its strongest). */
  private drawDanger(ctx: CanvasRenderingContext2D, t: number): void {
    const h = this.stage.huds.player;
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

  /** The drawer exists in a run, between no run screens (they always show the build). */
  private drawerLive(): boolean {
    return !!this.run && this.phase !== 'title' && !this.screens.active && !this.menus.isOpen && this.phase !== 'recap';
  }

  /** The handle: a tab on the drawer's right edge (the screen's left edge when it's shut). */
  private handleRect(): { x: number; y: number; w: number; h: number } {
    // Shut and never used: every 8s the handle slides out 4px and back, so players find it.
    const k = (this.time % 8) / 0.25;
    const nudge = !this.drawerUsed && !this.buildOpen && k < 1 ? Math.sin(k * Math.PI) * 4 : 0;
    const edge = this.drawerT * (BUILD.x + BUILD.w + 4) + nudge;
    return { x: edge, y: H / 2 - 52, w: 26 + 4 * this.handleHover, h: 104 };
  }

  private onHandle(x: number, y: number): boolean {
    const r = this.handleRect();
    return x >= r.x - 4 && x <= r.x + r.w + 6 && y >= r.y && y <= r.y + r.h;
  }

  private drawHandle(ctx: CanvasRenderingContext2D): void {
    const r = this.handleRect();
    const hover = this.onHandle(this.mouse.x, this.mouse.y);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(r.x - 2, r.y - 3, r.w + 5, r.h + 6);
    ctx.fillStyle = hover ? COLORS.goldLight : COLORS.gold;
    ctx.fillRect(r.x, r.y - 1, r.w + 1, r.h + 2);
    ctx.fillStyle = hover ? '#3a2e52' : COLORS.panel;
    ctx.fillRect(r.x, r.y + 2, r.w - 2, r.h - 4);
    // Grip lines and an arrow: out when shut, back in when open.
    ctx.fillStyle = COLORS.goldLight;
    for (const gy of [-30, -24, 24, 30]) ctx.fillRect(r.x + 7, r.y + r.h / 2 + gy, r.w - 16, 2);
    const dir = this.drawerT >= 0.5 ? -1 : 1;
    const cx = r.x + r.w / 2 - 1 + (hover ? Math.sin(this.time * 8) * 2 * dir : 0);
    const cy = r.y + r.h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5 * dir, cy - 9);
    ctx.lineTo(cx + 6 * dir, cy);
    ctx.lineTo(cx - 5 * dir, cy + 9);
    ctx.closePath();
    ctx.fill();
  }

  /** Your chips (live in a fight), top-left: the same spot as on every run screen. */
  private drawChips(ctx: CanvasRenderingContext2D): void {
    if (this.run && this.phase !== 'title') {
      // Chips: big, in the same top-left spot as on every run screen (CHIP_SPOT).
      drawSprite(ctx, 'chip', CHIP_SPOT.x, CHIP_SPOT.y, 3);
      // In a fight, the count follows every chip as it plays out: chips paid or spent mid-fight (CASH CASSIDY's chips,
      // MAKE IT RAIN, the House's skim, a bet won mid-fight), CHIP charm chips and what the Mimic ate.
      const fighting = this.phase === 'fighting';
      const eaten = fighting ? (this.stage.gutter.chipsEaten ?? 0) : 0;
      const hud = fighting ? this.stage.huds.player : null;
      const shown = Math.max(0, this.run.player.chips - eaten + (hud ? hud.chips - hud.chipsHeld + hud.lucre : 0));
      drawText(ctx, `${shown}`, CHIP_SPOT.x + 24, CHIP_SPOT.y, 4, eaten ? '#ff9a3a' : COLORS.energy, { align: 'left' });
      if (this.run.stake > 0 && !(this.drawerLive() && this.drawerT > 0.05)) drawText(ctx, `STAKE ${this.run.stake} ${STAKES[this.run.stake].name}`, 30, 80, 1.5, STAKES[this.run.stake].color, { align: 'left' });
      if ((this.fight.isBoss || this.fight.isWheel || this.fight.isDealer) && (this.fight.cfg.player.stackShield ?? 0) > 0) {
        // Sits after the chip count, however many digits it has (QA_1 B10).
        const cx = CHIP_SPOT.x + 24 + String(shown).length * 24 + 22;
        drawSprite(ctx, 'chipShield', cx, CHIP_SPOT.y, 2);
        drawText(ctx, `+${this.fight.cfg.player.stackShield ?? 0} SH/TURN`, cx + 18, CHIP_SPOT.y, 2, '#9fd0ff', { align: 'left' });
      }
    }
  }

  /** Your relics in a fight, as the whole grid in the BUILD pane (a relic that fires hops there too). */
  private drawRelics(ctx: CanvasRenderingContext2D): void {
    const relics = this.relicList();
    relics.forEach((r, i) => {
      if (i >= RELIC_SHOWN) return;
      const { x, y: y0 } = relicSlot(i);
      // A relic that just fired pops: it grows, hops up, wiggles and flashes gold.
      const pop = this.stage.relicPops[r] ?? 0;
      const y = y0 - Math.sin(pop * Math.PI) * 8;
      const k = 1 + 0.55 * pop;
      this.relicBox(ctx, r, x, y, k, pop);
    });
  }

  /** A relic's icon in its frame (k: scale, pop: the gold flash of one that just fired). */
  private relicBox(ctx: CanvasRenderingContext2D, r: string, x: number, y: number, k: number, pop: number): void {
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
  private drawRelicFeed(ctx: CanvasRenderingContext2D): void {
    const F = RELIC_FEED;
    const now = this.stage.clock.time;
    const feed = this.stage.relicFeed;
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

  private drawRelicTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.screens.active || this.drawerT < 0.98) return;
    const relics = this.relicList();
    const i = relics.findIndex((_, i) => {
      const { x, y } = relicSlot(i);
      return Math.abs(this.mouse.x - x) < 19 && Math.abs(this.mouse.y - y) < 19;
    });
    if (i >= 0) {
      // Below your machine's panel, over the YOUR REELS box: beside the icon it covered your HP bar.
      drawRelicTip(ctx, relics[i], RELIC_X + 168, RELIC_Y - 19, Math.max(relicSlot(relics.length - 1).y + 19, RELIC_TIP_TOP), this.run?.cabinet, !!this.run?.race);
      return;
    }
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

  private drawGutter(ctx: CanvasRenderingContext2D, t: number): void {
    const g = this.stage.gutter;
    const cx = W / 2;
    const cy = MACHINE_TOP + MACHINE_H / 2;
    if (this.phase === 'title') return;
    // Only a boss gets a label here (the map already said FIGHT n OF 5): ROUND and whose turn tell the story.
    if (g.fightLabel.includes('BOSS') || g.fightLabel.startsWith('LOOP') || g.fightLabel === 'SANDBOX') drawText(ctx, g.fightLabel, cx, this.race ? cy - 180 : cy - 112, 2, g.fightLabel === 'SANDBOX' ? COLORS.textDim : g.fightLabel.includes('BOSS') ? '#ff6a5a' : COLORS.goldLight);
    if (g.twist) drawText(ctx, g.twist, cx, cy - 132, 1.25, '#ff9a3a');
    // THE SCORE RACE: the scoreboard is up from the first spin.
    if (this.race) this.drawScoreboard(ctx, cx, cy, t);
    if (g.turn > 0) {
      if (!this.race) drawText(ctx, `SPIN ${g.turn}`, cx, cy - 78, 3, COLORS.textDim, { punch: 1 + g.pulse * 0.3 });
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
    else if (this.fight.isDealer) {
      this.drawDeal(ctx, cx, cy + 118, t);
    }
    else if (this.fight.isWheel) this.drawTable(ctx, cx, cy + 118, t);
    else {
      drawText(ctx, 'VS', cx, cy + 70, 6, '#ff6a5a', { alpha: 0.35 + 0.1 * Math.sin(t * 2) });
    }
    if (this.prefs.speed !== 2) drawText(ctx, `${this.prefs.speed}X SPEED`, cx, this.fight.isBoss || this.fight.isWheel || this.fight.isDealer ? cy - 136 : cy + 172, 2, COLORS.textDim);
  }

  /** The House's progressive pot, front and centre: grows (and glows) with the stakes. */
  private drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    // (x is shifted by the LETHAL shake below.)
    const g = this.stage.gutter;
    const pot = Math.round(g.pot);
    const hud = this.stage.huds.player;
    // (THE SCORE RACE: its last spin cashes all of it.)
    const lastCash = this.race && this.fight.raceLeft <= 1;
    const cashOut = lastCash ? pot : Math.ceil(pot / 2);
    const stack = this.fight.cfg.player.stackShield ?? 0;
    // (THE SCORE RACE: nobody dies; the alarm is the next cash-out putting THE HOUSE ahead.)
    const lethal = this.race ? pot > 0 && hud.score > this.stage.huds.enemy.score && this.stage.huds.enemy.score + cashOut > hud.score : pot > 0 && cashOut >= hud.hp + hud.shield + stack;
    this.stage.huds.enemy.alarm = lethal;
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
    const label = lethal ? (this.race ? 'TAKES THE LEAD!' : 'LETHAL!') : g.allIn ? 'DOUBLED POT' : 'THE POT';
    drawText(ctx, label, x, y - 32, 2, lethal || g.allIn ? '#ff6a5a' : COLORS.goldLight, { punch: lethal ? 1 + 0.1 * Math.sin(t * 14) : 1 });
    const sprite = tier === 4 ? 'potTier4' : tier === 3 ? 'potTier3' : tier === 2 ? 'potTier2' : 'potTier1';
    drawSprite(ctx, sprite, x - 52, y + 12, tier === 1 ? 3 : 2.5, { flash: glow * 0.5 });
    drawText(ctx, String(pot), x + 34, y + 12, 6, tier >= 3 ? '#ff6a5a' : COLORS.energy, { punch: g.potPunch });
    if (pot > 0) {
      drawSprite(ctx, 'potSkim', x - 70, y + 64, 2);
      drawText(ctx, lastCash ? `LAST SPIN: ALL ${cashOut}` : `NEXT SKIM ${cashOut}`, x - 52, y + 64, 2, lethal ? '#ff6a5a' : COLORS.textDim, { align: 'left' });
      // The House's key rule, where players look (EXPERT_PLAYTEST_2 E): your jackpot takes the pot.
      drawText(ctx, this.race ? 'YOUR JACKPOT TAKES HALF' : 'YOUR JACKPOT TAKES IT', x, y - 70, 1.5, COLORS.goldLight);
    }
  }

  /** The Dealer's face-up next card and the hand it's playing over it. */
  private drawDeal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const e = this.fight.sides.enemy;
    const ab = e.ability;
    const g = this.stage.gutter;
    // Gone once either side's presented HP is 0 (the fight is decided).
    if (!ab || g.wheelUp || this.stage.huds.enemy.hp <= 0 || this.stage.huds.player.hp <= 0) return;
    // Count like the Dealer's panel does (the presented pace, not the engine's, which runs ahead).
    const left = Math.max(1, (this.stage.huds.enemy.ability?.every ?? ab.every) - this.stage.huds.enemy.charge);
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
    const hp = this.fight.sides.player.maxHp;
    const loop = this.fight.cfg.enemy.loop ?? 0;
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

  /** The Dealer's table: green felt behind its machine, and the ALL IN warning over it. */
  /** The boss card is open (it pauses the fight). */
  private bossCard = false;

  private onBossHud(x: number, y: number): boolean {
    if (!this.fight.cfg.enemy.boss || this.screens.active || this.fight.over) return false;
    const hx = this.stage.huds.enemy.x;
    return x >= hx && x <= hx + HUD_W && y >= HUD_TOP - 8 && y <= HUD_TOP + 140;
  }

  /** A small "?" on a boss's HUD: tap it for the rules. */
  private drawBossHint(ctx: CanvasRenderingContext2D): void {
    const hx = this.stage.huds.enemy.x + HUD_W - 18;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(hx - 12, HUD_TOP + 2, 24, 22);
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(hx - 10, HUD_TOP + 4, 20, 18);
    drawText(ctx, '?', hx, HUD_TOP + 13, 2, COLORS.goldLight);
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

  /** The boss's rules (bossRules.ts), over the paused fight. */
  private drawBossCard(ctx: CanvasRenderingContext2D): void {
    const e = this.fight.cfg.enemy;
    const br = bossRules(e.boss ?? 'house', {
      stake: this.run?.stake ?? 0,
      cabinet: this.run?.cabinet,
      houseEvery: this.fight.sides.enemy.ability?.every ?? 3,
      loop: e.loop,
      dealerEvery: DEALER_RULES.bustEvery - this.fight.dealerCut,
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

  private drawDealerTable(ctx: CanvasRenderingContext2D, t: number): void {
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
  private drawTable(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const g = this.stage.gutter;
    // Gone once either side's presented HP is 0 (the fight is decided).
    if (this.stage.huds.enemy.hp <= 0 || this.stage.huds.player.hp <= 0) return;
    const chips = (g.bets ?? []).reduce((a, b) => a + b, 0);
    const per = g.betPer ?? 0;
    const hit = chips * per;
    const hud = this.stage.huds.player;
    const left = Math.max(1, g.betsLeft ?? 3);
    const soon = left <= 1;
    const lethal = hit > 0 && hit >= hud.hp + hud.shield;
    this.stage.huds.enemy.alarm = soon && lethal;
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
  private drawWheelCabinet(ctx: CanvasRenderingContext2D): void {
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
  private drawWheelTopper(ctx: CanvasRenderingContext2D): void {
    const g = this.stage.gutter;
    const x = MACHINE_CX.enemy;
    const y = MACHINE_TOP - 22;
    drawSprite(ctx, artId('wheelTopper'), x, y, 2.5, { rot: g.wheelAngle ?? 0 });
    drawSprite(ctx, artId('ball'), x + Math.cos((g.wheelAngle ?? 0) * -1.7) * 16, y + Math.sin((g.wheelAngle ?? 0) * -1.7) * 16, 0.6);
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

}
