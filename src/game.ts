import { Sounds } from './audio/sounds';
import type { CombatEvent } from './core/events';
import { Synth } from './audio/synth';
import { mergeConfig, UNIT, type GameConfig, type SideId } from './core/config';
import { actLength, RUN_FIGHTS, TUNE } from './core/enemies';
import { MAX_STAKE, STAKES, stakeUnlock } from './core/stakes';
import { Fight } from './core/fight';
import { betProfit, betProgress, describeBet, newTrack } from './core/bets';
import { dailyCabinet, dailyKey, dailySeed, dailySpent } from './core/daily';
import { turnRow, type TurnRow } from './core/log';
import { REFLECT_MIN, RELICS } from './core/relics';
import {
  applyOption,
  buy,
  chooseEnemy,
  createRun,
  draftOffers,
  applyDaily,
  offerBets,
  fightConfig,
  finishFight,
  isShopNow,
  takeLegend,
  takeChoice,
  letItRide,
  currentEnemy,
  type BigChoice,
  leaveShop,
  needsChoice,
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
import { Clock } from './present/clock';
import { Director, VOUCHER_GAP, VOUCHER_X, VOUCHER_Y } from './present/director';
import { FxLayer } from './present/fx';
import { HudView, type HudMeter } from './present/hud';
import { COLORS, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, RELIC_X, RELIC_Y, relicSlot, W } from './present/layout';
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
import { Coach, TUTORIAL } from './ui/coach';
import { collectionTotal, heroSprite, Menus } from './ui/menus';
import { cleanName, nameBlocked, shownTrim, discover, emptyProfile, MAX_ENTRIES, recordMeta, runEntry, runScore, sanitizeProfile, shownTitle, type MetaGain, type Profile, type RunEntry } from './core/profile';
import { applyChallenge, applyWeekly, challengeById, challengeOpen, CHALLENGES, levelOf, weekKey, weekly } from './core/meta';
import { needsName, playerId, playerName } from './net/identity';
import { claimName, submitScore } from './net/leaderboard';
import { online } from './net/config';

const CFG_KEY = 'slotvslot.config.v3';
const PREFS_KEY = 'slotvslot.prefs.v2';
const PROFILE_KEY = 'slotvslot.profile.v1';
const AUTO_DELAY = 0.35;

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
}

const clampStake = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(MAX_STAKE, Math.floor(n))) : 0);
const machineIds = (v: unknown): CabinetId[] => (Array.isArray(v) ? (v.filter((x) => (ALL_CABINETS as string[]).includes(x)) as CabinetId[]) : []);

/** Saved prefs are player-editable: validate everything so a bad save can't lock the game (QA_1 B6). */
/** The player's signature meter on the HUD (TESLA's special, MIDAS's gold, BRIAR's thorns, JAX's jackpots). */
function hudMeter(f: Fight): HudMeter | null {
  if (f.special) return { kind: 'special', pips: Math.round(f.cfg.specialCost / UNIT), label: 'LIGHTNING', color: COLORS.energy, icon: 'boltIcon' };
  const m = f.meter;
  if (!m) return null;
  if (m.kind === 'touch') return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'GOLD', color: '#ffd23f', icon: 'goldbar' as SpriteId };
  if (m.kind === 'vault') return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'VAULT', color: '#ffd23f', icon: 'goldbar' as SpriteId };
  if (m.kind === 'thorns') return { kind: m.kind, pips: 0, label: 'THORNS', color: '#9dff6a', icon: 'thorn' as SpriteId };
  return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'JACKPOTS', color: '#ff6ad5', icon: 'wild' };
}

function sanitizePrefs(raw: unknown, publicBuild: boolean): Prefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const unlocked = machineIds(p.unlocked);
  if (!unlocked.includes('knight')) unlocked.unshift('knight');
  const stakes: Partial<Record<CabinetId, number>> = {};
  if (p.stakes && typeof p.stakes === 'object') for (const id of ALL_CABINETS) if (id in (p.stakes as object)) stakes[id] = clampStake((p.stakes as Record<string, unknown>)[id]);
  const juice = p.juice && typeof p.juice === 'object' ? (p.juice as Partial<JuiceToggles>) : {};
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
  };
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

  /** publicBuild: no TUNE panel, no saved tuning overrides, no dev unlocks (the hosted playtest). */
  constructor(readonly publicBuild = false) {
    this.cfg = mergeConfig(publicBuild ? undefined : load(CFG_KEY));
    this.prefs = sanitizePrefs(load<Partial<Prefs>>(PREFS_KEY), publicBuild);
    this.profile = sanitizeProfile(load(PROFILE_KEY));
    this.menus = new Menus(this.ui, this.sounds, () => this.profile, () => this.unlockedCabinets(), {
      onNewRun: () => this.chooseCabinet(),
      onTutorial: () => this.startTutorial(),
      onDaily: () => this.startDaily(),
      onChallenge: (id) => this.startChallenge(id),
      onWeekly: () => this.startWeekly(),
      needsName: () => needsName(this.profile),
      onName: (name) => this.pickName(name),
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
    });
    this.recap = new Recap(this.ui, (prog) => this.sounds.tick(prog));
    this.screens = new RunScreens(this.ui, this.sounds, () => this.cfg, {
      onPick: (o) => this.pickReward(o),
      onSpoils: (r) => this.pickSpoils(r),
      onLegend: (r) => this.pickLegend(r),
      onChoice: (c) => this.pickChoice(c),
      onFight: (i) => this.beginRunFight(i),
      onNewRun: () => this.chooseCabinet(),
      onMenu: () => this.showMenu(),
      onLetItRide: () => this.letItRide(),
      onWheelCollect: (o) => {
        if (!this.run) return;
        applyOption(this.run, o, false);
        this.noteDiscoveries();
      },
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
    this.autoBtn = this.btn('AUTO', px - 116, by, 84, 44, () => this.setAuto(!this.prefs.auto));
    SPEEDS.forEach((s, i) => this.speedBtns.push(this.btn(`${s}X`, px + 80 + i * 39, by, 36, 44, () => this.setSpeed(s))));
    this.startBtn = this.btn('START RUN', W / 2 + 10, by, 196, 56, () => this.newRunPressed(), { idlePulse: true, textScale: 3 });
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
    this.speedBtns.forEach((b, i) => (b.toggled = SPEEDS[i] === this.prefs.speed));
    this.spinBtn.enabled = this.awaitingSpin;
    this.startBtn.label = this.phase === 'title' ? 'START RUN' : this.abandonArmed ? 'SURE?' : 'NEW RUN';
    this.startBtn.opts.idlePulse = this.phase === 'title';
    this.muteBtn.label = this.prefs.muted ? 'MUTED' : 'SOUND';
    this.muteBtn.toggled = this.prefs.muted;
    const overlay = this.screens.active || this.phase === 'recap' || this.menus.isOpen;
    for (const b of [this.spinBtn, this.autoBtn, this.startBtn, ...this.speedBtns]) b.visible = !overlay;
    for (const b of this.recapBtns) b.visible = this.phase === 'recap';
    for (const b of this.buttons) if (b.label === 'TUNE' || b.label === 'LOG') b.visible = this.screens.mode !== 'cabinet' && !(b.label === 'TUNE' && this.publicBuild);
    this.muteBtn.visible = this.screens.mode !== 'cabinet' && this.menus.mode !== 'loading' && this.menus.mode !== 'collection' && this.menus.mode !== 'hiscores';
    if (this.menus.isOpen) this.toolButtons!.tune.visible = this.toolButtons!.log.visible = false;
    this.noteDiscoveries();
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

  saveProfile(): void {
    save(PROFILE_KEY, this.profile);
  }

  /** COLLECTION: whatever relics / charms are on the machine now count as discovered. */
  private noteDiscoveries(): void {
    if (this.run && discover(this.profile, this.run)) this.saveProfile();
  }

  /** HISCORES: log the finished run (keeps the newest entries, but never drops a top-10 score). */
  /** The hiscore entry of a Dealer win you LET RIDE (endless updates it instead of adding a second one). */
  private rideEntry: ReturnType<typeof runEntry> | null = null;
  private recordRun(run: RunState): void {
    if (run.endless && this.rideEntry) {
      const prev = runScore(this.rideEntry);
      Object.assign(this.rideEntry, runEntry(run, this.rideEntry.at, !!run.tutorial), { won: true });
      this.afterRecord(this.rideEntry, recordMeta(this.profile, this.rideEntry, collectionTotal(), prev), true);
      return;
    }
    const entry = runEntry(run, Date.now(), !!run.tutorial);
    this.rideEntry = run.won ? entry : null;
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
    this.saveProfile();
    this.screens.setMeta(gain);
    if (entry.tutorial || !online() || !playerName(this.profile)) return;
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
      const where = main === 'all' ? 'ALL TIME' : main.startsWith('daily') ? 'TODAY' : 'THIS WEEK';
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
    return r;
  }

  /** RESET SAVE (main menu): unlocks, stakes, collection and hiscores. Settings stay. */
  private resetSave(): void {
    const { speed, auto, juice, muted } = this.prefs;
    this.prefs = { ...sanitizePrefs({}, this.publicBuild), speed, auto, juice, muted };
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
  private abandonArmed = false;
  private abandonArmedAt = 0;
  private abandonTimer: ReturnType<typeof setTimeout> | null = null;
  private newRunPressed(): void {
    const midRun = !!this.run && !this.run.over && this.phase !== 'title';
    // A spam-clicked FIGHT! button can't confirm: the confirming press must come 0.4 s after arming (QA_2 B17).
    if (midRun && this.abandonArmed && performance.now() - this.abandonArmedAt < 400) return;
    if (midRun && !this.abandonArmed) {
      this.abandonArmed = true;
      this.abandonArmedAt = performance.now();
      this.sounds.fizzle();
      if (this.abandonTimer) clearTimeout(this.abandonTimer);
      this.abandonTimer = setTimeout(() => {
        this.abandonArmed = false;
        this.syncButtons();
      }, 2000);
      this.syncButtons();
      return;
    }
    this.abandonArmed = false;
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
    const reachedBoss = run.records.length >= RUN_FIGHTS + 1 || run.won;
    const beatHouse = run.act > 1 || run.won;
    // MIDAS is shelved (no unlock) while he's reworked; TESLA is the second machine.
    const cond: Record<CabinetId, boolean> = {
      knight: true,
      midas: run.won,
      tesla: reachedBoss,
      thorn: beatHouse,
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
    if (this.run.pendingStart?.length) this.screens.showDraft(this.run, this.run.pendingStart.map((relic) => ({ kind: 'relic', relic }) as DraftOption), null, 'start');
    else this.screens.showNext(this.run);
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
  }

  /** A CHALLENGE: its machine and stake, its edges (open ones only). */
  startChallenge(id: string): void {
    const c = challengeById(id);
    const i = CHALLENGES.findIndex((x) => x.id === id);
    if (!c || !challengeOpen(this.profile.challenges, i)) return;
    this.startRun(undefined, c.cabinet, c.stake);
    if (!this.run) return;
    applyChallenge(this.run, c);
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
  }

  /** THE WEEKLY CHALLENGE: the week's seed, machine and edges, fights fixed by the week. As many tries as you like. */
  startWeekly(): void {
    const key = weekKey();
    const w = weekly(key);
    this.startRun(w.seed, w.cabinet, 0);
    if (!this.run) return;
    applyWeekly(this.run, key);
    // The first fight was set up before the run knew it was the weekly: rebuild it on the week's seed.
    this.newFight(false, null, fightConfig(this.run, this.cfg), true);
  }

  /** Tuning panel "apply": restart with the new base config. */
  restart(): void {
    this.startRun();
  }

  private beginRunFight(option = 0): void {
    if (!this.run) return;
    if (needsChoice(this.run)) {
      chooseEnemy(this.run, option);
      // SIDE BETS: the table opens once you've picked who you face.
      if (offerBets(this.run, this.cfg).length) return this.showNextFight();
    }
    this.screens.hide();
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
      if (e.type === 'spin' && e.side === 'player' && !e.bonus) {
        this.spins[1]++;
        if (e.frozen.some(Boolean) || e.locked.some(Boolean)) this.spins[0]++;
      }
      if (e.type === 'potWin' && e.to === 'player') add('THE POT', e.hpDamage);
      if (e.type === 'allInHit' && e.to === 'player') add('ALL IN', e.hpDamage);
      if (e.type === 'closingTime') add('CLOSING TIME', e.hp);
      if (e.type === 'attack' && e.to === 'player')
        add(e.note === 'reflect' ? 'REFLECTION' : e.note === 'drain' ? 'DRAIN' : e.note === 'mimic' ? 'COPYCAT' : e.reels.length ? 'SPIN HITS' : this.fight.isBoss ? 'THE POT' : 'ABILITY', e.hpDamage);
      else if (e.type === 'specialFire' && e.to === 'player') add('SPECIAL', e.hpDamage);
      else if (e.type === 'markedHit' && e.side === 'player') add(this.fight.isDealer ? "THE DEALER'S MARK" : this.run && currentEnemy(this.run).archetype === 'sharp' ? "THE SHARP'S MARK" : 'MARKED DECK', e.hpDamage);
      else if (e.type === 'blast' && e.side === 'player') add('BOMBS', e.hpDamage);
    }
  }
  private shelf: ShopItem[] = [];

  private afterRunFight(): void {
    const run = this.run!;
    const record = finishFight(run, this.fight, true);
    if (!record.won) {
      // Clamp to the HP you actually lost (overkill past 0 isn't damage you felt).
      const total = [...this.hurt.values()].reduce((a, b) => a + b, 0);
      const k = total > record.hpBefore && total > 0 ? record.hpBefore / total : 1;
      record.hurt = [...this.hurt].map(([s, n]) => [s, Math.round(n * k)] as [string, number]).filter(([, n]) => n >= UNIT).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (this.spins[0] >= 2) record.stuck = [this.spins[0], this.spins[1]];
    }
    this.hurt.clear();
    this.spins = [0, 0];
    this.lastRecord = record;
    this.phase = run.over ? 'over' : 'between';
    if (run.over) {
      this.noteDiscoveries();
      this.recordRun(run);
      this.skipTutorial();
      if (run.endless) this.screens.setStakeUnlockedNow('');
      // The daily, the weekly and challenges are side roads: no unlocks from them.
      if (run.daily || run.challenge) this.screens.setStakeUnlockedNow('');
      this.screens.setUnlockedNow(run.endless || run.daily || run.challenge ? [] : this.checkUnlocks(run));
      this.screens.showOver(run);
    }
    else if (run.bonusLog?.length) {
      // Cash the vouchers first: the wheel / the rush play out, then the usual screens.
      const log = run.bonusLog;
      run.bonusLog = [];
      this.screens.showBonus(run, log, () => this.afterBonus(record));
    } else this.afterBonus(record);
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
    if (run.pendingChoice?.length || run.pendingLegend) {
      // A boss is gone: set up the idle machines for the next act so its HUD doesn't linger behind.
      this.newFight(false, null, fightConfig(run, this.cfg), true);
      this.phase = 'between';
    }
    if (run.pendingChoice?.length) this.screens.showChoice(run, run.pendingChoice);
    else if (run.pendingLegend) this.screens.showLegend(run, run.pendingLegend, record);
    else if (run.pendingSpoils) this.screens.showSpoils(run, run.pendingSpoils, record);
    else this.screens.showDraft(run, draftOffers(run), record);
    if (this.screens.mode === 'draft') this.tip('draft', 'draft');
    this.syncButtons();
  }

  /** A boss fell: take the BIG CHOICE, then the legendary pick (act 2) or the act's draft. */
  private pickChoice(c: BigChoice): void {
    const run = this.run;
    if (!run) return;
    takeChoice(run, c);
    // CASH OUT ends an endless run: bank the pot and show the run-over screen.
    if (run.over) {
      this.phase = 'over';
      this.recordRun(run);
      this.screens.setStakeUnlockedNow('');
      this.screens.setUnlockedNow([]);
      this.screens.showOver(run);
      this.syncButtons();
      return;
    }
    this.afterBonus(this.lastRecord ?? run.records[run.records.length - 1]);
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
    if (this.run.pendingStart) {
      takeStart(this.run, relic);
      this.showNextFight();
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
    if (isShopNow(this.run)) {
      this.shelf = shopOffers(this.run);
      this.screens.showShop(this.run, this.shelf);
      this.tip('shop', 'shop');
      this.syncButtons();
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
          ability: c.ability,
          energy: meter?.kind === 'thorns' ? c.energy : c.energy / UNIT,
        });
        hud.hp = hud.ghost = c.hp;
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
      relics: [...cfg.relics],
      relicPops: {},
      levels: { player: cfg.player.levels, ...(cfg.enemy.boss === 'mirror' ? { enemy: cfg.enemy.levels } : {}) },
      ticket: cfg.relics.includes('ticket'),
      enemyShield: TUNE.enemyShield,
      gutter: {
        turn: 0,
        side: null,
        pulse: 0,
        pot: this.fight.pot,
        potPunch: 1,
        fightLabel: this.run && inRun ? (this.run.depth >= actLength(this.run.act) ? (this.run.endless ? `LOOP ${this.run.endless.loop} BOSS` : 'BOSS') : this.run.endless ? `LOOP ${this.run.endless.loop} FIGHT ${this.run.depth + 1}/${actLength(this.run.act)}` : `${this.run.daily ? 'DAILY - ' : this.run.weekly ? 'WEEKLY - ' : this.run.challenge ? 'CHALLENGE - ' : ''}ACT ${this.run.act} FIGHT ${this.run.depth + 1}/${actLength(this.run.act)}`) : 'SANDBOX',
        allIn: false,
        reflect: 0,
        turnDamage: 0,
        cracked: false,
        chipsEaten: 0,
        vouchers: [],
        ...(inRun && start && this.run?.bet ? { bet: this.run.bet, betTrack: newTrack() } : {}),
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
    if (this.coach.active) return this.coach.hitsSkip(x, y) ? this.skipTutorial() : this.coach.advance();
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
    if (this.menus.isOpen) {
      const was = this.menus.mode;
      this.menus.pointerUp(x, y);
      if (was !== this.menus.mode) this.syncButtons();
      return;
    }
    if (this.screens.active) this.screens.pointerUp(x, y);
  }

  pointerMove(x: number, y: number): boolean {
    this.mouse = { x, y };
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
      if (k === ' ' || k === 'enter') this.coach.advance();
      else if (k === 's') this.skipTutorial();
      return true;
    }
    if (this.menus.isOpen && k !== 'm') {
      const was = this.menus.mode;
      const used = this.menus.key(k);
      if (was !== this.menus.mode) this.syncButtons();
      return used;
    }
    switch (k) {
      case ' ':
        if (this.awaitingSpin) this.requestSpin();
        else this.skip();
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
    this.menus.update(dt);
    // A tutorial callout freezes the fight where it is.
    const gdt = this.coach.active ? 0 : this.stage.clock.tick(dt);
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
    if (this.menus.isOpen) {
      ctx.restore();
      this.menus.draw(ctx, t);
      if (this.muteBtn.visible) this.muteBtn.draw(ctx, t);
      return;
    }
    this.background.drawMarquee(ctx, t);
    this.drawRelics(ctx);
    if (this.phase === 'fighting') this.drawVouchers(ctx, this.time);
    drawStripMap(ctx, s.machines.player, t, s.levels.player);
    s.huds.player.draw(ctx, t);
    s.huds.enemy.draw(ctx, t);
    s.machines.player.draw(ctx, s.clock.time);
    if (this.fight.isDealer) this.drawDealerTable(ctx, t);
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
    this.coach.draw(ctx, t);
  }

  private relicList() {
    return this.fight.cfg.relics;
  }

  /** Banked bonus vouchers (bottom-left): they pay out if you win this fight. */
  private drawVouchers(ctx: CanvasRenderingContext2D, t: number): void {
    const list = this.stage.gutter.vouchers ?? [];
    list.forEach((k, i) => {
      const bob = Math.sin(t * 3 + i) * 2;
      drawSprite(ctx, artId(k === 'wheel' ? 'voucherBonus' : 'voucherRelic'), VOUCHER_X + i * VOUCHER_GAP, VOUCHER_Y + bob, 2.5);
    });
    if (list.length) drawText(ctx, 'VOUCHERS: WIN TO CASH', 14, VOUCHER_Y - 30, 1.25, '#ffd23f', { align: 'left' });
  }

  private drawRelics(ctx: CanvasRenderingContext2D): void {
    if (this.run && this.phase !== 'title') {
      drawSprite(ctx, 'chip', 38, 30, 2);
      const eaten = this.phase === 'fighting' ? (this.stage.gutter.chipsEaten ?? 0) : 0;
      drawText(ctx, `${Math.max(0, this.run.player.chips - eaten)}`, 56, 30, 3, eaten ? '#ff9a3a' : COLORS.energy, { align: 'left' });
      drawText(ctx, CABINETS[this.run.cabinet].name, 30, 58, 1, COLORS.textDim, { align: 'left' });
      if (this.run.stake > 0) drawText(ctx, `STAKE ${this.run.stake} ${STAKES[this.run.stake].name}`, 30, 74, 1.5, STAKES[this.run.stake].color, { align: 'left' });
      if (this.fight.isBoss || this.fight.isMirror || this.fight.isDealer) {
        // Sits after the chip count, however many digits it has (QA_1 B10).
        const cx = 56 + String(this.run.player.chips).length * 18 + 22;
        drawSprite(ctx, 'chipShield', cx, 30, 2);
        drawText(ctx, `+${this.fight.cfg.player.stackShield ?? 0} SH/TURN`, cx + 18, 30, 2, '#9fd0ff', { align: 'left' });
      }
    }
    const relics = this.relicList();
    if (!relics.length) return;
    // The header steps aside while a relic's name pops up in its place.
    const popping = Object.values(this.stage.relicPops).some((v) => v > 0.02);
    if (!popping) drawText(ctx, 'RELICS', RELIC_X + 60, RELIC_Y - 22, 2, COLORS.textDim);
    relics.forEach((r, i) => {
      const { x, y: y0 } = relicSlot(i);
      // A relic that just fired pops: it grows, hops up, wiggles and flashes gold.
      const pop = this.stage.relicPops[r] ?? 0;
      const y = y0 - Math.sin(pop * Math.PI) * 8;
      const k = 1 + 0.55 * pop;
      const half = 16 * k;
      if (pop > 0) {
        ctx.save();
        ctx.globalAlpha = pop * 0.8;
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
      drawSprite(ctx, RELICS[r].sprite as SpriteId, x, y, 1.6 * k, { rot: Math.sin(pop * Math.PI * 3) * 0.25 * pop, flash: pop * 0.6 });
    });
  }

  private drawRelicTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.screens.active) return;
    const relics = this.relicList();
    const i = relics.findIndex((_, i) => {
      const { x, y } = relicSlot(i);
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
    else if (this.fight.isDealer) {
      this.drawDeal(ctx, cx, cy + 118, t);
      this.drawBet(ctx, cx, cy + 40, t, true);
    }
    else if (this.fight.isMirror) {
      this.drawReflection(ctx, cx, cy + 118, t);
      // GREEN stake: the relic it copied from you.
      const copied = [...this.fight.sides.enemy.relics][0];
      if (copied) {
        drawSprite(ctx, RELICS[copied].sprite as SpriteId, cx - 70, cy + 196, 2);
        drawText(ctx, `COPIED ${RELICS[copied].name}`, cx - 50, cy + 196, 1.5, '#c8f0ff', { align: 'left' });
      }
    }
    else {
      drawText(ctx, 'VS', cx, cy + 70, 6, '#ff6a5a', { alpha: 0.35 + 0.1 * Math.sin(t * 2) });
      this.drawBet(ctx, cx, cy + 130, t);
    }
    if (this.prefs.speed !== 2) drawText(ctx, `${this.prefs.speed}X SPEED`, cx, this.fight.isBoss || this.fight.isMirror || this.fight.isDealer ? cy - 136 : this.stage.gutter.bet ? cy + 196 : cy + 172, 2, COLORS.textDim);
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
    const label = lethal ? 'LETHAL!' : g.allIn ? 'ALL IN POT' : 'THE POT';
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

  /** The Dealer's face-up next card and when it lands (HOUSE RULES / RAISE shown too). */
  private drawDeal(ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    const e = this.fight.sides.enemy;
    const ab = e.ability;
    const g = this.stage.gutter;
    // Gone once either side's presented HP is 0 (the fight is decided).
    if (!ab || this.stage.huds.enemy.hp <= 0 || this.stage.huds.player.hp <= 0) return;
    // Count like the Dealer's panel does (the presented pace, not the engine's, which runs ahead).
    const left = Math.max(1, (this.stage.huds.enemy.ability?.every ?? ab.every) - this.stage.huds.enemy.charge);
    const soon = left <= 1;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 110, y - 56, 220, 112);
    ctx.fillStyle = soon ? '#ff6a5a' : '#2a6a3a';
    ctx.fillRect(x - 106, y - 52, 212, 104);
    ctx.fillStyle = '#0e2a18';
    ctx.fillRect(x - 101, y - 47, 202, 94);
    drawText(ctx, soon ? 'DEALS NEXT TURN!' : `NEXT DEAL IN ${left}`, x, y - 32, 2, soon ? '#ff6a5a' : '#c8f0c8', { punch: soon ? 1 + 0.08 * Math.sin(t * 12) : 1 });
    const card = g.nextDeal ?? 'card';
    const sprite = card === 'shuffle' ? 'dealShuffle' : card === 'cut' || card === 'card' ? 'dealCut' : card === 'allin' ? 'dealShuffle' : 'dealRaise';
    drawSprite(ctx, artId(sprite), x - 58, y + 12, 2.5);
    // In FINAL HAND each ALL IN after the first is weaker: say so on the card.
    const fade = this.fight.allInFade;
    const name = card === 'card' ? 'A CARD' : card === 'allin' ? (fade < 1 ? `ALL IN X${+fade.toFixed(2)}` : 'ALL IN') : card.toUpperCase();
    drawText(ctx, name, x + 26, y + 2, 3, card === 'allin' ? '#ff6a5a' : '#ffffff');
    const what =
      card === 'card' ? ['ON YOUR PAYLINE:', 'ACE, JOKER, DEUCE']
      : card === 'allin' ? ['ITS NEXT ATTACK', 'IS ITS WHOLE HAND']
      : card === 'shuffle' ? ['SWAPS 5 CELLS', 'BETWEEN 2 REELS']
      : card === 'cut' ? ['CUTS A CHARMED', 'CELL PER REEL']
      : ['ITS NEXT HIT X2', 'YOUR NEXT WIN X2'];
    what.forEach((l, k) => drawText(ctx, l, x + 20, y + 22 + k * 14, 1.5, COLORS.text));
    if (g.raised) drawText(ctx, 'RAISED!', x, y - 44 - 14, 2, '#ffd23f');
    else if (g.finalHand) drawText(ctx, g.then?.length ? `FINAL HAND, THEN: ${g.then.map((c) => (c === 'allin' ? 'ALL IN' : c.toUpperCase())).join(', ')}` : 'FINAL HAND', x, y - 44 - 14, 2, '#ff6a5a');
    else if (g.houseRules) drawText(ctx, 'HOUSE RULES', x, y - 44 - 14, 2, '#ff6a5a');
    // Its marked cards are most of its damage: count them on YOUR reels.
    const marks = this.stage.machines.player.reels.reduce((a, r) => a + r.cells.filter((c) => c.carded).length, 0);
    if (marks) drawText(ctx, `MARKS ON YOU: ${marks}`, x, y + 72, 2, '#ff8aa0');
  }

  /** SIDE BET tracker under the VS: the bet, then how it stands (information only: fights stay watch-only). */
  private drawBet(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, compact = false): void {
    const g = this.stage.gutter;
    if (!g.bet || !g.betTrack) return;
    const d = describeBet(g.bet);
    const done = g.betDone;
    const col = done === 'won' ? '#ffd23f' : done === 'lost' ? '#ff8a7a' : '#c8f0c8';
    const status = done === 'won' ? `WON +${betProfit(g.bet)}` : done === 'lost' ? `BUSTED -${g.bet.stake}` : betProgress(g.bet, g.betTrack);
    // The Dealer's gutter holds its deal box: one line above it.
    if (compact) {
      ctx.fillStyle = 'rgba(10,6,18,0.85)';
      ctx.fillRect(x - 130, y - 16, 260, 34);
      drawText(ctx, `BET ${g.bet.stake}: ${d.name}`, x, y - 6, 1.5, COLORS.goldLight);
      drawText(ctx, status, x, y + 8, 1.5, col);
      return;
    }
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 112, y - 22, 224, 66);
    ctx.fillStyle = done ? col : '#2a6a3a';
    ctx.fillRect(x - 109, y - 19, 218, 60);
    ctx.fillStyle = '#0e2a18';
    ctx.fillRect(x - 105, y - 15, 210, 52);
    drawText(ctx, `BET ${g.bet.stake}: ${d.name}`, x, y - 4, 1.75, COLORS.goldLight);
    drawText(ctx, d.rule, x, y + 10, 1.25, COLORS.text);
    const line = status;
    drawText(ctx, line, x, y + 27, 2, col, { punch: done ? 1 : 1 + 0.04 * Math.sin(t * 6) });
  }

  /** The Dealer's table: green felt behind its machine, and the ALL IN warning over it. */
  private drawDealerTable(ctx: CanvasRenderingContext2D, t: number): void {
    const cx = MACHINE_CX.enemy;
    ctx.fillStyle = '#0a2416';
    ctx.fillRect(cx - 186, MACHINE_TOP - 26, 372, MACHINE_H + 52);
    ctx.fillStyle = '#0f3a22';
    ctx.fillRect(cx - 180, MACHINE_TOP - 20, 360, MACHINE_H + 40);
    ctx.strokeStyle = '#c9a040';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 174, MACHINE_TOP - 14, 348, MACHINE_H + 28);
    if (this.stage.gutter.allInArmed) drawText(ctx, `ALL IN! UP TO ${this.stage.gutter.allInCap ?? ''}`, cx, MACHINE_TOP + MACHINE_H + 46, 3, '#ff6a5a', { punch: 1 + 0.08 * Math.sin(t * 10) });
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
    drawText(ctx, 'UP TO', x - 48, y + 10, 1.5, COLORS.textDim);
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

}
