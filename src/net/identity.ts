/**
 * Who the player is on the leaderboards. Today: the name they pick on first launch (saved in the profile) and a random
 * device id. Later (the Steam build): the Steam persona name and id, from whatever bridge the wrapper exposes.
 */
import type { Profile } from '../core/profile';

interface SteamBridge {
  personaName(): string;
  steamId(): string;
}
const steam = (): SteamBridge | undefined => (globalThis as { steam?: SteamBridge }).steam;

/** The name scores go up under ('' = not picked yet). */
export function playerName(p: Profile): string {
  return steam()?.personaName() ?? p.name ?? '';
}
/** A stable id for this player (Steam id, or a random id made once per profile). */
export function playerId(p: Profile): string {
  const s = steam();
  if (s) return `steam:${s.steamId()}`;
  return (p.pid ??= crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`);
}
/**
 * Offer the name screen? Not at launch: after the first finished run, once, and it's optional (user, 2026-10-09).
 * Skipped = no name = nothing goes online. The Steam build names the player itself: no name screen.
 */
export const needsName = (p: Profile) => !steam() && !p.name && !p.nameAsked && p.stats.runs >= 1;
