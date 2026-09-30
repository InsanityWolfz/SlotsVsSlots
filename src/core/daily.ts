/**
 * THE DAILY RUN: one seed and one slot machine per calendar day, the same for everyone. One try a day (it's spent
 * when the run starts), its fights are seeded from the day, and it lands in the hiscores tagged DAILY.
 */
import { CABINET_ORDER, type CabinetId } from './cabinets';

/** Today's key, e.g. "2026-09-30" (the player's local date). */
export function dailyKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
