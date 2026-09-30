/**
 * THE DAILY RUN: one seed and one slot machine per calendar day, the same for everyone. One try a day (it's spent
 * when the run starts), its fights are seeded from the day, and it lands in the hiscores tagged DAILY.
 */
import { CABINET_ORDER, type CabinetId } from './cabinets';

/** Today's key, e.g. "2026-09-30" (UTC, so everyone shares the same day). */
export function dailyKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/** The try is spent for this day, or for any day before the newest one played (winding the clock back doesn't help). */
export const dailySpent = (key: string, lastPlayed?: string) => !!lastPlayed && key <= lastPlayed;

/** The share line for a finished daily: day, hero, score and each act's fights (W won, B boss won, L the loss). */
export function dailyShare(key: string, hero: string, score: number, records: { act?: number; won: boolean; depth: number }[], actLen: (act: number) => number): string {
  const acts = new Map<number, string>();
  for (const r of records) {
    const a = r.act ?? 1;
    acts.set(a, (acts.get(a) ?? '') + (!r.won ? 'L' : r.depth >= actLen(a) ? 'B' : 'W'));
  }
  return `SLOTS VS. SLOTS DAILY ${key.slice(5)} | ${hero} | ${score} | ${[...acts.values()].join(' ')}`;
}

/** The day's run seed (FNV-1a of the key). */
export function dailySeed(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** The day's slot machine (any of them: the daily is a taste of one you may not have unlocked). */
export const dailyCabinet = (key: string): CabinetId => CABINET_ORDER[dailySeed(`${key}:machine`) % CABINET_ORDER.length];

/** A daily run's fight seed: fixed by the day and the fight, so everyone meets the same fights. */
export const dailyFightSeed = (runSeed: number, act: number, depth: number, loop = 0) =>
  (runSeed ^ Math.imul(act * 131 + depth * 17 + loop * 7919 + 1, 0x9e3779b1)) >>> 0;
