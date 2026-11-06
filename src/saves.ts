/** Saves and prefs: the save keys, the Prefs type and its sanitising, crash-safe load / save with the desktop file sync, the saved run (split from game.ts, 2026-11-05). */
import { desktop } from './build';
import { ALL_CABINETS, type CabinetId } from './core/cabinets';
import { CHARM_VALUE } from './core/charms';
import { RELICS } from './core/relics';
import { type RunState } from './core/run';
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
  /** SETTINGS volumes, 0..10 each (10 = the designed mix). */
  vol: { master: number; music: number; sfx: number };
}

/** The payline hint (PAIRS START ON REEL 1) shows this many times, ever. */
export const PAYLINE_HINTS = 3;

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
    paylineHints: typeof p.paylineHints === 'number' && Number.isFinite(p.paylineHints) ? Math.max(0, Math.min(PAYLINE_HINTS, Math.floor(p.paylineHints))) : 0,
    vol: { master: clampVol(vol.master), music: clampVol(vol.music), sfx: clampVol(vol.sfx) },
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
  return { at: s.at === 'after' ? 'after' : s.at === 'fight' ? 'fight' : s.at === 'ride' ? 'ride' : 'next', run };
}
