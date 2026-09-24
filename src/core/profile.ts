import { CABINET_ORDER, type CabinetId } from './cabinets';
import type { Enh, RelicId } from './config';
import { RELICS } from './relics';
import { MAX_STAKE } from './stakes';
import { fightNumber, fullSets, runActs, totalFights, type RunState } from './run';

/**
 * The player's profile (saved locally): what they've discovered for the COLLECTION log, and a
 * history of finished runs for HISCORES. Pure data + helpers; the game owns persistence.
 */

export const ALL_CHARMS: Enh[] = ['gold', 'keen', 'charged', 'spiked', 'vamp', 'lucky', 'blaze'];
export const MAX_ENTRIES = 60;

export interface CharmEntry {
  enh: Enh;
  /** Tier II bought for this charm. */
  tier: boolean;
  /** A full set (the same charm on all 3 reels). */
  set: boolean;
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
}

export interface Profile {
  found: { relics: RelicId[]; charms: Enh[] };
  runs: RunEntry[];
}

export const emptyProfile = (): Profile => ({ found: { relics: [], charms: [] }, runs: [] });

/** Charms on the player's machine, one entry per charm type. */
export function charmsOf(run: RunState): CharmEntry[] {
  const sets = fullSets(run.player.gilded, run.player.relics);
  const out: CharmEntry[] = [];
  for (const enh of ALL_CHARMS) {
    const gs = run.player.gilded.filter((g) => g.enh === enh);
    if (gs.length) out.push({ enh, tier: gs.some((g) => !!g.tier), set: sets.has(enh) });
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
  };
}

/** HISCORE: 100 per fight won, +1000 for clearing the run, +1000 more for beating the Dealer; x1.5 per stake level. */
export function runScore(e: RunEntry): number {
  const base = e.fights * 100 + (e.won ? 1000 : 0) + (e.won && e.acts >= 3 ? 1000 : 0);
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
      if (!(CABINET_ORDER as unknown[]).includes(e.cabinet)) continue;
      const charms: CharmEntry[] = Array.isArray(e.charms)
        ? (e.charms as unknown[])
            .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object' && (ALL_CHARMS as unknown[]).includes((c as Record<string, unknown>).enh))
            .map((c) => ({ enh: c.enh as Enh, tier: c.tier === true, set: c.set === true }))
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
        maxHp: num(e.maxHp, 0, 999),
        chips: num(e.chips, 0, 9999),
        ...(e.tutorial === true ? { tutorial: true } : {}),
      });
    }
  return { found: { relics: [...new Set(relicIds(f.relics))], charms: [...new Set(charmIds(f.charms))] }, runs };
}
