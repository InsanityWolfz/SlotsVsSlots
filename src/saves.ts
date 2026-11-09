/** Saves and prefs: the save keys, the Prefs type and its sanitising, crash-safe load / save with the desktop file sync, the saved run (split from game.ts, 2026-11-05). */
import { desktop } from './build';
import { ALL_CABINETS, type CabinetId } from './core/cabinets';
import { CHARM_VALUE } from './core/charms';
import { RELICS } from './core/relics';
import { actStops, runActs, type RunState } from './core/run';
import { migrateRun } from './core/runMigrate';
import { MAX_STAKE } from './core/stakes';
import { defaultJuice, type JuiceToggles } from './present/stage';

export const CFG_KEY = 'slotvslot.config.v3';
export const PREFS_KEY = 'slotvslot.prefs.v2';
export const PROFILE_KEY = 'slotvslot.profile.v1';

/** Speed buttons (keys 1-4). The new 1X is half of the old 1X, so the clock runs at speed / 2. */
export const SPEEDS = [1, 2, 4, 8];

export interface Prefs {
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
  /** THE DEALER unlocked (old saves: act 3 now follows the stake, RED and up). */
  act3: boolean;
  /** Slot machines that have beaten the Dealer (TRUE ENDING). */
  dealerBeaten: CabinetId[];
  /** The TUTORIAL has been started once (the menu stops nudging toward it). */
  tutorialDone: boolean;
  /** PAIRS START ON REEL 1: how many times the payline hint has shown (it shows the first 3 times). */
  paylineHints: number;
  /** The Slot Machines whose meter has had its one-time callout (the first fight on each). */
  metersExplained: CabinetId[];
  /** SETTINGS volumes, 0..10 each (10 = the designed mix). */
  vol: { master: number; music: number; sfx: number };
}

/** The payline hint (PAIRS START ON REEL 1) shows this many times, ever. */
export const PAYLINE_HINTS = 3;

/** New saves' speed and master volume: 1X and 5 of 10 (user, 2026-11-08; the full game was 2X and 10). */
const DEFAULT_SPEED = 1;
const DEFAULT_MASTER = 5;

export const clampVol = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n))) : 10);
const clampStake = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(MAX_STAKE, Math.floor(n))) : 0);
const machineIds = (v: unknown): CabinetId[] => (Array.isArray(v) ? (v.filter((x) => (ALL_CABINETS as string[]).includes(x)) as CabinetId[]) : []);

/** Saved prefs are player-editable: validate everything so a bad save can't lock the game (QA_1 B6). */
export function sanitizePrefs(raw: unknown, publicBuild: boolean): Prefs {
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
    speed: p.speedV === 2 ? (SPEEDS.includes(p.speed as number) ? (p.speed as number) : DEFAULT_SPEED) : [1, 2, 4].includes(p.speed as number) ? (p.speed as number) * 2 : DEFAULT_SPEED,
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
    paylineHints: typeof p.paylineHints === 'number' && Number.isFinite(p.paylineHints) ? Math.max(0, Math.min(PAYLINE_HINTS, Math.floor(p.paylineHints))) : 0,
    metersExplained: machineIds(p.metersExplained),
    vol: { master: vol.master === undefined ? DEFAULT_MASTER : clampVol(vol.master), music: clampVol(vol.music), sfx: clampVol(vol.sfx) },
  };
}

/** Saves are crash-safe (STEAM_READINESS S11): every write first copies the last good value to `<key>.bak` (the live keys
 * never change names), and a save that fails to parse is set aside under `<key>.corrupt` and the backup loads instead. */
const BAK = '.bak';

/** The saved run (S1). */
export const RUN_KEY = 'slotvslot.run.v1';
export function clearRunSave(): void {
  try {
    // The backups too: a cleared run must never come back through CONTINUE (STEAM_QA_1 Q1).
    for (const k of [RUN_KEY, RUN_KEY + BAK, RUN_KEY + '.corrupt']) {
      localStorage.removeItem(k);
      desktop()?.saveRemove(k);
    }
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

export function load<T>(key: string): T | null {
  try {
    // Desktop: the save files are the record (Steam Cloud syncs them); localStorage is only their cache. Every save
    // writes both, so on one PC the file is never older; on a second PC it's the newer one (save QA 2026-11-02: an old
    // local save on PC A beat the newer cloud file, then overwrote it). The backup comes from its file too.
    const d = desktop();
    if (d)
      for (const k of [key, key + BAK]) {
        const file = d.saveRead(k);
        if (file === null) localStorage.removeItem(k);
        else localStorage.setItem(k, file);
      }
    const raw = localStorage.getItem(key);
    const v = parse<T>(raw);
    // Missing is missing (a cleared save stays cleared); only a save that fails to parse falls back to its backup.
    if (v !== null || !raw) return v;
    // Corrupt: keep the bytes for a manual rescue, then fall back to the backup.
    localStorage.setItem(key + '.corrupt', raw);
    desktop()?.saveWrite(key + '.corrupt', raw);
    return parse<T>(localStorage.getItem(key + BAK));
  } catch {
    return null;
  }
}

/** The last finished run's COPY RUN text (a new key; the save keys are never renamed). */
export const LASTRUN_KEY = 'slotvslot.lastrun.v1';

export function save(key: string, v: unknown): void {
  const json = JSON.stringify(v);
  // Desktop: the files first, in their own try (a full or blocked localStorage wrote no files at all: save QA).
  const d = desktop();
  if (d)
    try {
      const prev = d.saveRead(key);
      if (prev && parse(prev) !== null) d.saveWrite(key + BAK, prev);
      d.saveWrite(key, json);
    } catch {
      /* the cache below still tries */
    }
  try {
    const prev = localStorage.getItem(key);
    if (prev && parse(prev) !== null) localStorage.setItem(key + BAK, prev);
    localStorage.setItem(key, json);
  } catch {
    /* storage unavailable or full: prefs just won't persist */
  }
}


const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const knownRelics = (ids: unknown) => (Array.isArray(ids) ? ids.filter((r): r is RunState['player']['relics'][number] => typeof r === 'string' && r in RELICS) : []);

/**
 * The saved run's numbers, cleaned (QA FUNC-07; CLAUDE.md: "Saves are cleaned on load"). Values a player could live
 * with are clamped (stake, HP, chips); a run whose place on its map makes no sense (act, depth, stop, route) is dropped,
 * since playing on from a made-up place is worse than starting over. A game in play at an encounter whose state is
 * garbage starts that game over. Returns false to drop the save.
 */
function cleanRun(run: RunState, at: string | undefined): boolean {
  const p = run.player;
  if (!Array.isArray(p.strips) || !p.strips.length || !p.strips.every((x) => x && typeof x === 'object')) return false;
  if (!Array.isArray(run.enemies) || !run.enemies.length || !run.enemies.every((e) => e && typeof e === 'object')) return false;
  if (at === 'ride' && !(run.over && run.won)) return false;
  run.stake = finite(run.stake) ? Math.max(0, Math.min(MAX_STAKE, Math.floor(run.stake))) : 0;
  if (!isInt(run.act) || (run.endless ? run.act !== 4 : run.act < 1 || run.act > runActs(run))) return false;
  if (run.route !== null && (!isInt(run.route) || run.route < 0 || run.route >= run.map.routes.length)) return false;
  // (The fights behind you and the stop you're at never run past the act's stops; between fights they can sit one past
  // the last enemy dealt so far, before a route is picked.)
  const stops = actStops(run).length;
  if (!isInt(run.depth) || run.depth < 0 || run.depth > stops) return false;
  if (!isInt(run.stop) || run.stop < 0 || run.stop > stops) return false;
  p.maxHp = finite(p.maxHp) && p.maxHp > 0 ? Math.round(p.maxHp) : 0;
  if (!p.maxHp) return false;
  // HP at or under 0 between fights can't be (a lost run is never saved): 1 HP plays on, a missing number is full.
  p.hp = finite(p.hp) ? Math.max(1, Math.min(p.maxHp, Math.round(p.hp))) : p.maxHp;
  p.chips = finite(p.chips) ? Math.max(0, Math.floor(p.chips)) : 0;
  run.shopRerolls = isInt(run.shopRerolls) && run.shopRerolls >= 0 ? run.shopRerolls : 0;
  if (run.pendingSpoils) run.pendingSpoils = knownRelics(run.pendingSpoils).length ? knownRelics(run.pendingSpoils) : null;
  if (run.pendingLegend) run.pendingLegend = knownRelics(run.pendingLegend).length ? knownRelics(run.pendingLegend) : null;
  if (run.pendingStart) run.pendingStart = knownRelics(run.pendingStart).length ? knownRelics(run.pendingStart) : null;
  if (run.encounterState !== undefined && !cleanEncounter(run.encounterState)) run.encounterState = undefined;
  // The Cashier's saved shelf (FUNC-05): a broken one is dealt again.
  if (run.shelf !== undefined && !(Array.isArray(run.shelf) && run.shelf.every((i) => i && typeof i === 'object' && i.option && typeof i.option === 'object' && finite(i.price) && i.price >= 0 && typeof i.sold === 'boolean'))) delete run.shelf;
  return true;
}

/** An encounter's game in play: plain counts and card lists only, and each game's state whole (TWENTY-ONE, HIGHER OR
 * LOWER, the CLAW), or it starts over. */
function cleanEncounter(st: unknown): boolean {
  if (!st || typeof st !== 'object' || Array.isArray(st)) return false;
  const o = st as Record<string, unknown>;
  const count = (v: unknown) => isInt(v) && v >= 0;
  for (const v of Object.values(o)) if (!(count(v) || (Array.isArray(v) && v.every(count)))) return false;
  if ('p' in o || 'd' in o) return Array.isArray(o.p) && Array.isArray(o.d) && count(o.bet) && count(o.dealt);
  if ('card' in o) return ['bet', 'pot', 'card', 'right', 'game'].every((k) => count(o[k]));
  if ('won' in o || 'misses' in o) return Array.isArray(o.won) && Array.isArray(o.misses);
  return true;
}

export function loadRunSave(): { at: 'next' | 'after' | 'fight' | 'ride'; run: RunState } | null {
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
  if (!cleanRun(run, s.at)) return null;
  return { at: s.at === 'after' ? 'after' : s.at === 'fight' ? 'fight' : s.at === 'ride' ? 'ride' : 'next', run };
}
