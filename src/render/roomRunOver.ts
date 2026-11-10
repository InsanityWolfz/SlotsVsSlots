/**
 * RUN OVER: you get thrown out (user, 2026-11-10: "I like the run over art plan, let's build it"). No death.
 * - KNOCKED OUT (act 1): the street station where you fell. (Fallen at the casino's door, to THE DOORMAN himself: his
 *   entrance, him dusting off his gloves.)
 * - THROWN OUT! (acts 2-3): THE DOORMAN's entrance, him dusting off his gloves.
 * - CLOSING TIME (ENDLESS): the same doors at dawn, the sky greying, the marquee's bulbs switching off one by one.
 * (Your wrecked Slot Machine landing on the curb was cut: user, 2026-11-10, "just remove it".) The banner punches in at
 * `RUNOVER_LAND`.
 */
import { drawEntrance } from './roomEntrance';
import { drawStreet } from './roomStreet';

export type RunOverKind = 'ko' | 'thrown' | 'closing';
/** Off: RUN OVER as it was (the dark veil, RUN OVER / BUSTED ON LOOP n), for before/after shots (dbg.runOver). */
export const RUNOVER = { on: true };
/** When the banner punches in (seconds into the reveal). */
export const RUNOVER_LAND = 0.62;

export interface RunOverScene {
  kind: RunOverKind;
  /** The run's Slot Machine sprite (unused since the wreck was cut; kept for the caller). */
  sprite: string;
  /** KNOCKED OUT: the street station where you fell, or 'door' (you fell to THE DOORMAN). */
  station: number | 'door';
  /** Seconds into the reveal (99 once it's over or skipped). */
  t: number;
  /** The clock (the rooms' rain, the bulbs). */
  time: number;
  reduceMotion: boolean;
}

/** RUN OVER's scene, full screen, behind the screen's panels (over.ts draws it first, then its own veil). */
export function drawRunOver(ctx: CanvasRenderingContext2D, o: RunOverScene): void {
  const door = o.kind !== 'ko' || o.station === 'door';
  const t = o.t;
  if (door) drawEntrance(ctx, { pot: 0, foeHp: 1, turn: null, time: o.time, dust: t >= RUNOVER_LAND, dawn: o.kind === 'closing' ? Math.min(1, Math.max(0, (t - 0.2) / 3.2)) : 0 });
  else drawStreet(ctx, { station: o.station as number, time: o.time });
}
