import { ALL_CABINETS, type CabinetId } from './cabinets';
import type { Enh, RelicId } from './config';
import { RELICS } from './relics';
import { MAX_STAKE } from './stakes';
import { charmCount, fightNumber, runActs, totalFights, type RunState, bustPot } from './run';
import { charmLevel } from './charms';
import { ACHIEVEMENT_XP, CHALLENGES, levelOf, newAchievements, titlesOwned, WEEK_KEY, type AchievementDef, type ChallengeRecord, type MetaStats } from './meta';

/**
 * The player's profile (saved locally): what they've discovered for the COLLECTION log, and a
 * history of finished runs for HISCORES. Pure data + helpers; the game owns persistence.
 */

export const ALL_CHARMS: Enh[] = ['gold', 'keen', 'charged', 'spiked', 'vamp', 'lucky', 'blaze'];
export const MAX_ENTRIES = 60;

export interface CharmEntry {
  enh: Enh;
  /** Charmed cells at the end of the run (0 on old saves). */
  n: number;
  /** The charm's level (old saves: tier II reads as level 2). */
  lvl: number;
}

export interface RunEntry {
  /** When the run ended (ms since epoch). */
  at: number;
  cabinet: CabinetId;
  stake: number;
  won: boolean;
  /** The act the run ended in, and how many acts it had. */
  act: number;
  acts: number;
  /** Fights won, and the fights in a full run. */
  fights: number;
  total: number;
  /** Who ended the run (lost runs only). */
  killer?: string;
  killerPortrait?: string;
  /** Overall fight number of the loss (1-based). */
  killerFight?: number;
  relics: RelicId[];
  charms: CharmEntry[];
  maxHp: number;
  chips: number;
  tutorial?: boolean;
  /** THE DAILY RUN: its day, and the HP it finished with (a won daily scores it). */
  daily?: string;
  hpLeft?: number;
  /** ENDLESS: loops cleared after LET IT RIDE, and the points banked (all of it on CASH OUT, half on a bust). */
  loops?: number;
  pot?: number;
  /** A CHALLENGE run (its id, or "weekly"), THE WEEKLY CHALLENGE's week, and liens paid off. */
  challenge?: string;
  weekly?: string;
  liensPaid?: number;
}

/** A daily key: YYYY-MM-DD. */
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface Profile {
  found: { relics: RelicId[]; charms: Enh[] };
  runs: RunEntry[];
  /** THE DAILY RUN: the last day whose try was spent (it's spent when the run starts). */
  lastDaily?: string;
  /** META: lifetime XP, achievements (id -> when), challenge bests (by id, and "weekly:<week>"), lifetime counters. */
  xp: number;
  achievements: Record<string, number>;
  challenges: Record<string, ChallengeRecord>;
  stats: MetaStats;
  /** The player's name on the leaderboards (later: the Steam name), and the title they show. */
  name?: string;
  title?: string;
  /** A random id for this player's scores (src/net/identity.ts). */
  pid?: string;
}

export const emptyProfile = (): Profile => ({ found: { relics: [], charms: [] }, runs: [], xp: 0, achievements: {}, challenges: {}, stats: { runs: 0, wins: 0, dailies: 0 } });

/** Charms on the player's machine, one entry per charm type. */
export function charmsOf(run: RunState): CharmEntry[] {
  const out: CharmEntry[] = [];
  for (const enh of ALL_CHARMS) {
    const n = charmCount(run.player, enh);
    if (n) out.push({ enh, n, lvl: charmLevel(run.player.levels, enh) });
  }
  return out;
}

/** Record a finished run. */
export function runEntry(run: RunState, at = Date.now(), tutorial = false): RunEntry {
  const loss = run.won ? undefined : run.records[run.records.length - 1];
  return {
    at,
    cabinet: run.cabinet,
    stake: run.stake,
    won: run.won,
    act: run.act,
    acts: runActs(run),
    fights: run.records.filter((r) => r.won).length,
    total: totalFights(run),
    ...(loss ? { killer: loss.enemy, killerPortrait: loss.portrait, killerFight: fightNumber(run) } : {}),
    relics: [...run.player.relics],
    charms: charmsOf(run),
    maxHp: run.player.maxHp,
    chips: run.player.chips,
    ...(tutorial ? { tutorial: true } : {}),
    ...(run.daily ? { daily: run.daily, hpLeft: Math.max(0, run.player.hp) } : {}),
    ...(run.endless ? { loops: run.endless.loop - 1, pot: run.endless.cashed ? run.endless.pot : bustPot(run.endless.pot) + run.player.chips * 10 } : {}),
    ...(run.challenge ? { challenge: run.challenge } : {}),
    ...(run.weekly ? { weekly: run.weekly } : {}),
    ...(run.liensPaid ? { liensPaid: run.liensPaid } : {}),
  };
}

/** HISCORE: 100 per fight won, +1000 for clearing the run, +1000 more for beating the Dealer, +5 per chip left on a
 * won run (endless banks chips x10 in its pot instead); x1.5 per stake level. */
export const CHIP_SCORE = 5;
export function runScore(e: RunEntry): number {
  const chips = e.won && e.pot == null ? (e.chips ?? 0) * CHIP_SCORE : 0;
  // THE DAILY RUN: +1 per HP left on a win (winners aren't ranked only by chips they hoarded).
  const hp = e.won && e.daily ? (e.hpLeft ?? 0) : 0;
  const base = e.fights * 100 + (e.won ? 1000 : 0) + (e.won && e.acts >= 3 ? 1000 : 0) + (e.pot ?? 0) + chips + hp;
  return Math.round(base * (1 + 0.5 * e.stake));
}

/** Newly discovered relics / charms on this run (mutates the profile, returns true if anything was new). */
export function discover(p: Profile, run: RunState): boolean {
  let got = false;
  for (const r of run.player.relics)
    if (!p.found.relics.includes(r)) {
      p.found.relics.push(r);
      got = true;
    }
  for (const g of run.player.gilded)
    if (!p.found.charms.includes(g.enh)) {
      p.found.charms.push(g.enh);
      got = true;
    }
  return got;
}

const num = (v: unknown, lo: number, hi: number, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
const str = (v: unknown, max = 40) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const relicIds = (v: unknown): RelicId[] => (Array.isArray(v) ? (v.filter((r) => typeof r === 'string' && r in RELICS) as RelicId[]) : []);
const charmIds = (v: unknown): Enh[] => (Array.isArray(v) ? (v.filter((c) => (ALL_CHARMS as unknown[]).includes(c)) as Enh[]) : []);

/** Saves are player-editable: keep only well-formed data. */
export function sanitizeProfile(raw: unknown): Profile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const f = (p.found && typeof p.found === 'object' ? p.found : {}) as Record<string, unknown>;
  const runs: RunEntry[] = [];
  if (Array.isArray(p.runs))
    for (const r of p.runs.slice(-MAX_ENTRIES)) {
      if (!r || typeof r !== 'object') continue;
      const e = r as Record<string, unknown>;
      if (!(ALL_CABINETS as unknown[]).includes(e.cabinet)) continue;
      const charms: CharmEntry[] = Array.isArray(e.charms)
        ? (e.charms as unknown[])
            .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && (ALL_CHARMS as unknown[]).includes((c as Record<string, unknown>).enh))
            .map((c) => ({ enh: c.enh as Enh, n: num(c.n, 0, 99), lvl: typeof c.lvl === 'number' ? num(c.lvl, 1, 4, 1) : c.tier === true ? 2 : 1 }))
        : [];
      runs.push({
        at: num(e.at, 0, 8.64e15),
        cabinet: e.cabinet as CabinetId,
        stake: num(e.stake, 0, MAX_STAKE),
        won: e.won === true,
        act: num(e.act, 1, 3, 1),
        acts: num(e.acts, 2, 3, 2),
        fights: num(e.fights, 0, 99),
        total: num(e.total, 1, 99, 12),
        ...(str(e.killer) ? { killer: str(e.killer) } : {}),
        ...(str(e.killerPortrait) ? { killerPortrait: str(e.killerPortrait) } : {}),
        ...(typeof e.killerFight === 'number' ? { killerFight: num(e.killerFight, 1, 99, 1) } : {}),
        relics: relicIds(e.relics),
        charms,
        maxHp: num(e.maxHp, 0, 99999),
        chips: num(e.chips, 0, 9999),
        ...(e.tutorial === true ? { tutorial: true } : {}),
        ...(typeof e.daily === 'string' && DATE_KEY.test(e.daily) ? { daily: e.daily, hpLeft: num(e.hpLeft, 0, 99999) } : {}),
        ...(typeof e.loops === 'number' ? { loops: num(e.loops, 0, 999) } : {}),
        ...(typeof e.pot === 'number' ? { pot: num(e.pot, 0, 1e9) } : {}),
        ...(typeof e.challenge === 'string' && (e.challenge === 'weekly' || CHALLENGES.some((c) => c.id === e.challenge)) ? { challenge: e.challenge } : {}),
        ...(typeof e.weekly === 'string' && WEEK_KEY.test(e.weekly) ? { weekly: e.weekly } : {}),
        ...(typeof e.liensPaid === 'number' ? { liensPaid: num(e.liensPaid, 0, 99) } : {}),
      });
    }
  const lastDaily = typeof p.lastDaily === 'string' && DATE_KEY.test(p.lastDaily) ? p.lastDaily : undefined;
  const achievements: Record<string, number> = {};
  if (p.achievements && typeof p.achievements === 'object')
    for (const [k, v] of Object.entries(p.achievements as Record<string, unknown>)) if (/^[a-z0-9_]{1,24}$/.test(k)) achievements[k] = num(v, 0, 8.64e15);
  const challenges: Record<string, ChallengeRecord> = {};
  if (p.challenges && typeof p.challenges === 'object')
    for (const [k, v] of Object.entries(p.challenges as Record<string, unknown>)) {
      if (!(CHALLENGES.some((c) => c.id === k) || /^weekly:\d{4}-W\d{2}$/.test(k)) || !v || typeof v !== 'object') continue;
      const r = v as Record<string, unknown>;
      challenges[k] = { best: num(r.best, 0, 1e9), won: r.won === true, tries: num(r.tries, 0, 1e6) };
    }
  const st = (p.stats && typeof p.stats === 'object' ? p.stats : {}) as Record<string, unknown>;
  // Old saves: their runs count towards XP and the counters once.
  const stats: MetaStats = p.stats ? { runs: num(st.runs, 0, 1e7), wins: num(st.wins, 0, 1e7), dailies: num(st.dailies, 0, 1e7) } : { runs: runs.filter((r) => !r.tutorial).length, wins: runs.filter((r) => r.won && !r.tutorial).length, dailies: runs.filter((r) => r.daily).length };
  const xp = typeof p.xp === 'number' ? num(p.xp, 0, 1e12) : runs.filter((r) => !r.tutorial).reduce((a, r) => a + runScore(r), 0);
  const name = typeof p.name === 'string' ? cleanName(p.name) : '';
  const title = str(p.title, 24);
  const pid = typeof p.pid === 'string' && /^[A-Za-z0-9:-]{8,64}$/.test(p.pid) ? p.pid : undefined;
  return {
    found: { relics: [...new Set(relicIds(f.relics))], charms: [...new Set(charmIds(f.charms))] },
    runs,
    ...(lastDaily ? { lastDaily } : {}),
    xp,
    achievements,
    challenges,
    stats,
    ...(name ? { name } : {}),
    ...(title ? { title } : {}),
    ...(pid ? { pid } : {}),
  };
}

/** A leaderboard name: 3-12 of A-Z, 0-9, _ and - (upper-cased; the pixel font has no lower case). '' if not valid. */
export function cleanName(raw: string): string {
  const n = raw.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12);
  return n.length >= 3 ? n : '';
}

/** What a finished run earned on the meta layers (for the run-over screen). */
export interface MetaGain {
  xp: number;
  levelBefore: number;
  levelAfter: number;
  achievements: AchievementDef[];
  titles: string[];
  /** A challenge or weekly: this run beat its best. */
  newBest: boolean;
}

/** Log a finished run on the meta layers: counters, challenge bests, achievements, XP (mutates the profile). */
export function recordMeta(p: Profile, e: RunEntry, collectionTotal: number): MetaGain {
  const before = levelOf(p.xp).level;
  const titlesBefore = new Set(titlesOwned(before, p.challenges));
  const score = runScore(e);
  let newBest = false;
  if (!e.tutorial) {
    p.stats.runs++;
    if (e.won) p.stats.wins++;
    if (e.daily) p.stats.dailies++;
    const key = e.weekly ? `weekly:${e.weekly}` : e.challenge;
    if (key) {
      const r = (p.challenges[key] ??= { best: 0, won: false, tries: 0 });
      r.tries++;
      newBest = score > r.best;
      r.best = Math.max(r.best, score);
      r.won ||= e.won;
    }
  }
  const got = newAchievements({
    won: e.won,
    acts: e.acts,
    act: e.act,
    cabinet: e.cabinet,
    stake: e.stake,
    score,
    chips: e.chips,
    relics: e.relics.length,
    loops: e.loops ?? 0,
    killer: e.killer,
    daily: !!e.daily,
    weekly: !!e.weekly,
    challenge: e.challenge,
    liensPaid: e.liensPaid ?? 0,
    tutorial: !!e.tutorial,
    stats: p.stats,
    have: p.achievements,
    found: p.found.relics.length + p.found.charms.length,
    collection: collectionTotal,
    challengesWon: CHALLENGES.filter((c) => p.challenges[c.id]?.won).length,
  });
  for (const a of got) p.achievements[a.id] = e.at || Date.now();
  const xp = e.tutorial ? 0 : score + got.length * ACHIEVEMENT_XP;
  p.xp += xp;
  const after = levelOf(p.xp).level;
  const titles = titlesOwned(after, p.challenges).filter((t) => !titlesBefore.has(t));
  return { xp, levelBefore: before, levelAfter: after, achievements: got, titles, newBest };
}

/** The title the player shows: their pick if they still hold it, else their best level title. */
export function shownTitle(p: Profile): string {
  const owned = titlesOwned(levelOf(p.xp).level, p.challenges);
  return p.title && owned.includes(p.title) ? p.title : owned.filter((t) => !CHALLENGES.some((c) => c.title === t)).pop() ?? 'ROOKIE';
}
