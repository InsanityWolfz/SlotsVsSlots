/** ENDLESS: LET IT RIDE, its loops, TONIGHT'S RULE and the pot (split from run.ts, 2026-11-05). */
import type { GameConfig } from './config';
import { ENDLESS, generateActMap, ROUTES_PER_LOOP } from './enemies';
import { Rng } from './rng';
import { setMap, type RunState } from './run';

/** LET IT RIDE: after beating the Dealer, keep going (the win is already recorded). */
export function letItRide(run: RunState): void {
  if (!run.won || run.endless) return;
  run.over = false;
  run.endless = { loop: 1, pot: 0 };
  startEndlessLoop(run);
}

/** A new endless loop: an act-style map and a boss (cycling House, THE WHEEL, Dealer). */
export function startEndlessLoop(run: RunState): void {
  const loop = run.endless!.loop;
  run.act = 4;
  const rng = new Rng((run.seed ^ Math.imul(loop + 40, 0x3c6ef372)) >>> 0);
  // TONIGHT'S RULE: one per path (user, 2026-10-14: the night is part of the route choice), never last loop's; it
  // starts when you pick your path (the loop's opener plays without one).
  const nrng = rng.fork();
  run.endless!.nights = nrng.shuffle(NIGHT_IDS.filter((n) => n !== run.endless!.night)).slice(0, ROUTES_PER_LOOP);
  run.endless!.night = undefined;
  setMap(run, generateActMap(rng, 4, loop, run.cabinet));
  run.player.hp = run.player.maxHp;
  run.actIntro = false;
}

// ---- ENDLESS: TONIGHT'S RULE ------------------------------------------------------------

/**
 * TONIGHT'S RULE (user, 2026-10-14): each ENDLESS loop plays under one rule, the same for both machines, never the
 * same two loops running.
 */
export type NightId = NonNullable<GameConfig['night']>;
/** TONIGHT'S RULE numbers (fight.ts reads happy / showdown / iron). */
export const NIGHT = { limitHp: 1.15, luckyWilds: 2, fastMeter: 1.5 };
export const NIGHTS: Record<NightId, { title: string; text: string }> = {
  happy: { title: 'HAPPY HOUR', text: 'JACKPOTS PAY X2' },
  limit: { title: 'HIGH LIMIT', text: 'WINS PAY X2 CHIPS. ENEMIES HAVE +15% HP' },
  lucky: { title: 'LUCKY NIGHT', text: 'EVERY REEL HAS 2 MORE WILDS' },
  showdown: { title: 'SHOWDOWN', text: 'EVERY HIT PAYS X1.5' },
  iron: { title: 'IRON NIGHT', text: 'SHIELDS BLOCK X2' },
  fast: { title: 'FAST NIGHT', text: 'ABILITIES CHARGE 1 TURN FASTER. METERS FILL X1.5' },
};
export const NIGHT_IDS = Object.keys(NIGHTS) as NightId[];
/** TONIGHT'S RULE: what the loop plays under, for both machines. */
/** TONIGHT'S RULE in play: the ENDLESS path's. */
export const nightId = (run: RunState): NightId | undefined => run.endless?.night;
export const nightOf = (run: RunState) => { const n = nightId(run); return n ? NIGHTS[n] : null; };
/** Each loop cleared grows the pot (the ENDLESS score) by this, on top of x1.5. */
export const POT_PER_LOOP = 1500;
/** A cleared loop: the pot grows x1.5, plus POT_PER_LOOP. */
export const nextPot = (pot: number) => Math.round(pot * ENDLESS.potGrowth) + POT_PER_LOOP;
