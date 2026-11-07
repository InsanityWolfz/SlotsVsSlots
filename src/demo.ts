import type { CabinetId } from './core/cabinets';

/**
 * THE DEMO (ROADMAP phase 4: "an act 1 demo build"). One codebase: `vite build --mode demo` (web) or
 * `--mode steam-demo` (desktop) sets VITE_DEMO. Off, every rule here is a no-op and the full game is unchanged.
 * The demo is act 1 only, ending at THE HOUSE, on KNIGHT and TESLA at WHITE.
 * (This file imports nothing at runtime: build.ts and the save wrapper load it before anything else.)
 */
export const DEMO: boolean = !!(import.meta as { env?: Record<string, string | undefined> }).env?.VITE_DEMO;

/** The full game's store page (the WISHLIST button). Set the real app id once Steamworks gives one. */
export const STORE_URL = 'https://store.steampowered.com/app/APPID';

/** Locked content in the demo says this instead of its unlock condition. */
export const IN_FULL_GAME = 'IN THE FULL GAME';

export interface DemoRules {
  on: boolean;
  /** The playable Slot Machines (null: whatever the save has unlocked). */
  machines: readonly CabinetId[] | null;
  /** The highest stake (WHITE is 0). */
  maxStake: number;
  /** Acts in a run: the run ends, won, when this act's boss falls. */
  acts: number;
}

/** The demo's rules, or the full game's (no limits) when off. Pure, so tests pass the flag in. */
export function demoRules(on: boolean): DemoRules {
  return on ? { on, machines: ['knight', 'tesla'], maxStake: 0, acts: 1 } : { on, machines: null, maxStake: Infinity, acts: Infinity };
}

let current = demoRules(DEMO);
/** The rules this build plays by. */
export const demo = (): DemoRules => current;
/** Tests only: play by the demo's rules (or the full game's). */
export function setDemo(on: boolean): void {
  current = demoRules(on);
}

/** The Slot Machines you can pick: the demo's own, else what the save unlocked. */
export function demoMachines(unlocked: Iterable<CabinetId>, r: DemoRules = current): Set<CabinetId> {
  return new Set(r.machines ?? unlocked);
}

/** Best stake per machine, capped at the demo's top stake (the full game's are untouched). */
export function demoStakes(stakes: Partial<Record<CabinetId, number>>, r: DemoRules = current): Partial<Record<CabinetId, number>> {
  if (!r.on) return stakes;
  const out: Partial<Record<CabinetId, number>> = {};
  for (const id of r.machines ?? []) out[id] = Math.min(stakes[id] ?? 0, r.maxStake);
  return out;
}

/** The demo keeps its own saves: on the web it shares the site's storage with the full game. */
export function demoKey(key: string, on: boolean = DEMO): string {
  return on && key.startsWith('slotvslot.') ? `demo.${key}` : key;
}

/** WISHLIST ON STEAM. In a browser a new tab; in the desktop wrapper its window-open handler hands it to the system
 * browser (desktop/main.cjs). */
export function openStore(): void {
  try {
    window.open(STORE_URL, '_blank', 'noopener');
  } catch {
    /* blocked: nothing to do */
  }
}
