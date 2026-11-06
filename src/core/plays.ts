/**
 * SPIN CHOICES (experiment, user 2026-11-06; branch build only): after your reels land, three PLAYS are dealt. Tap one
 * and it resolves before the spin pays; press SPIN (or AUTO) and the line pays as it landed. Nothing waits on a play.
 * The fight's side of it (landing, then paying) is in fight.ts (`land`, `landed`, `play`); this file is the plays.
 */
import type { Fight } from './fight';
import type { Rng } from './rng';

/** The experiment's switch: on in the spin-choices build only. */
export const PLAYS = { on: true, perSpin: 3, double: 2, ride: 2.5 };

export type Play =
  | { id: 'respin'; reel: number }
  | { id: 'nudge'; reel: number; dir: -1 | 1 }
  | { id: 'row'; dir: -1 | 1 }
  | { id: 'double' }
  | { id: 'ride' }
  | { id: 'shieldUp' }
  | { id: 'clean' };

/** What a play does this spin (the fight reads it while it scores, and clears it when your turn ends). */
export interface PlayNow {
  mul: number;
  ride: boolean;
  shieldUp: boolean;
}

/** A play's card: a title and a line. */
export function playCard(p: Play): { title: string; text: string } {
  switch (p.id) {
    case 'respin':
      return { title: `RESPIN REEL ${p.reel + 1}`, text: 'THE OTHER TWO STAY' };
    case 'nudge':
      return { title: `NUDGE REEL ${p.reel + 1} ${p.dir < 0 ? 'DOWN' : 'UP'}`, text: p.dir < 0 ? 'THE CELL ABOVE DROPS IN' : 'THE CELL BELOW COMES UP' };
    case 'row':
      return { title: p.dir < 0 ? 'TOP ROW PAYS' : 'BOTTOM ROW PAYS', text: 'INSTEAD OF THE MIDDLE' };
    case 'double':
      return { title: 'DOUBLE DOWN', text: `YOUR HITS X${PLAYS.double}, THEIR NEXT HITS X${PLAYS.double}` };
    case 'ride':
      return { title: 'LET IT RIDE', text: `NOTHING NOW, NEXT HITS X${PLAYS.ride}` };
    case 'shieldUp':
      return { title: 'SHIELD UP', text: 'ATTACK SYMBOLS PAY AS SHIELDS' };
    case 'clean':
      return { title: 'CLEAN UP', text: 'THAW REELS, WIPE SLIME AND THEFT' };
  }
}

/** Something to clean: an iced, locked or hexed reel, or slime or a stolen cell on the line as it landed. */
function dirty(f: Fight, stops: number[]): boolean {
  const me = f.sides.player;
  if ([...me.frozen, ...me.locked, ...me.hexed].some((t) => t > 0)) return true;
  return me.reels.some((reel, r) => {
    const c = reel.cells[stops[r]];
    return !!c && (c.slimed || c.stolen);
  });
}

/** Deal the plays for the line that just landed: `PLAYS.perSpin` different kinds, each one that can do something. */
export function dealPlays(f: Fight, rng: Rng): Play[] {
  const landed = f.landed;
  if (!landed) return [];
  const me = f.sides.player;
  const free = [0, 1, 2].filter((r) => !(me.frozen[r] > 0) && !(me.locked[r] > 0));
  const attack = f.cabinet?.attack ?? 'sword';
  const onLine = me.reels.some((reel, r) => reel.cells[landed.stops[r]]?.symbol === attack);
  const kinds: (() => Play)[] = [];
  if (free.length) {
    kinds.push(() => ({ id: 'respin', reel: rng.pick(free) }));
    kinds.push(() => ({ id: 'nudge', reel: rng.pick(free), dir: rng.next() < 0.5 ? -1 : 1 }));
  }
  if (free.length === 3) kinds.push(() => ({ id: 'row', dir: rng.next() < 0.5 ? -1 : 1 }));
  kinds.push(() => ({ id: 'double' }), () => ({ id: 'ride' }));
  if (onLine) kinds.push(() => ({ id: 'shieldUp' }));
  if (dirty(f, landed.stops)) kinds.push(() => ({ id: 'clean' }));
  return rng.shuffle(kinds).slice(0, PLAYS.perSpin).map((k) => k());
}

/** Resolve a play on the landed line (before it pays). Returns the reels whose stop it moved. */
export function applyPlay(f: Fight, p: Play): number[] {
  const landed = f.landed;
  if (!landed) return [];
  const me = f.sides.player;
  const len = (r: number) => me.reels[r].cells.length;
  const move = (r: number, d: number) => (landed.stops[r] = (((landed.stops[r] + d) % len(r)) + len(r)) % len(r));
  f.playNow = { mul: 1, ride: false, shieldUp: false };
  switch (p.id) {
    case 'respin':
      landed.stops[p.reel] = f.rng.int(len(p.reel));
      return [p.reel];
    case 'nudge':
      move(p.reel, p.dir);
      return [p.reel];
    case 'row':
      [0, 1, 2].forEach((r) => move(r, p.dir));
      return [0, 1, 2];
    case 'double':
      f.playNow.mul = PLAYS.double;
      return [];
    case 'ride':
      f.playNow.ride = true;
      return [];
    case 'shieldUp':
      f.playNow.shieldUp = true;
      return [];
    case 'clean':
      for (const k of ['frozen', 'locked', 'hexed'] as const) me[k] = me[k].map(() => 0);
      me.reels.forEach((reel, r) => {
        const c = reel.cells[landed.stops[r]];
        if (c) {
          c.slimed = false;
          delete c.stolen;
        }
      });
      return [];
  }
}
