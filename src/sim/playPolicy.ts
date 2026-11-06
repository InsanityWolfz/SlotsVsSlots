/**
 * SPIN CHOICES (experiment): how the sim bot picks a play. `none` always takes the line as it landed (AUTO),
 * `random` picks any dealt play, `smart` reads the landed line like a decent player would.
 */
import { effectiveSymbol } from '../core/strip';
import { applyPlay, dealPlays, PLAYS, type Play } from '../core/plays';
import type { Fight } from '../core/fight';
import type { Rng } from '../core/rng';
import type { SymbolId } from '../core/config';

export type PlayPolicy = 'none' | 'random' | 'smart';

/** A rough worth of a payline: attack hits count fully, shields by how much you need them (the bot's eye, not the engine). */
function lineWorth(f: Fight, line: SymbolId[]): number {
  const me = f.sides.player;
  const attack = f.cabinet?.attack ?? 'sword';
  const low = me.hp < me.maxHp * 0.35;
  const w = (s: SymbolId) => (s === attack ? 1 : s === 'shield' ? (low ? 0.9 : 0.35) : s === 'wild' ? 1 : 0);
  const same = (a: SymbolId, b: SymbolId) => a === b || a === 'wild' || b === 'wild';
  const [a, b, c] = line;
  const sym = (x: SymbolId, y: SymbolId) => (x === 'wild' ? y : x);
  if (same(a, b) && same(b, c) && same(a, c)) return 9 * w(sym(sym(a, b), c));
  if (same(a, b)) return 4 * w(sym(a, b)) + w(c);
  return w(a) + w(b) + w(c);
}

const lineAt = (f: Fight, stops: number[]): SymbolId[] => f.sides.player.reels.map((reel, r) => effectiveSymbol(reel.cells[stops[r]]));

/** What a play is worth to the bot, against taking the line as it is (worth 1). */
function playWorth(f: Fight, p: Play): number {
  const landed = f.landed!;
  const me = f.sides.player;
  const foe = f.sides.enemy;
  const now = lineWorth(f, lineAt(f, landed.stops));
  const len = (r: number) => me.reels[r].cells.length;
  const at = (moves: [number, number][]) => {
    const s = [...landed.stops];
    for (const [r, d] of moves) s[r] = (((s[r] + d) % len(r)) + len(r)) % len(r);
    return lineWorth(f, lineAt(f, s));
  };
  const rel = (v: number) => v / Math.max(0.5, now);
  switch (p.id) {
    case 'respin': {
      let sum = 0;
      for (let i = 0; i < len(p.reel); i++) {
        const s = [...landed.stops];
        s[p.reel] = i;
        sum += lineWorth(f, lineAt(f, s));
      }
      return rel(sum / len(p.reel));
    }
    case 'nudge':
      return rel(at([[p.reel, p.dir]]));
    case 'row':
      return rel(at([[0, p.dir], [1, p.dir], [2, p.dir]]));
    case 'double': {
      // Worth it when you're healthy, or when doubling finishes them.
      const healthy = me.hp > me.maxHp * 0.6;
      const finisher = now >= 4 && foe.hp < foe.maxHp * 0.35;
      return finisher ? 2 : healthy && now >= 4 ? 1.6 : 0.5;
    }
    case 'ride':
      // A dead line costs nothing to let ride.
      return now <= 1 && me.hp > me.maxHp * 0.5 ? 1.5 : 0.3;
    case 'shieldUp':
      return me.hp < me.maxHp * 0.35 && now >= 4 ? 1.3 : 0.2;
    case 'clean':
      return [...me.frozen, ...me.locked, ...me.hexed].some((t) => t > 0) ? 1.25 : 1.05;
  }
}

/** Land your reels, deal the plays and pick one (or none). Returns the play picked. */
export function botPlay(f: Fight, policy: PlayPolicy, rng: Rng): Play | null {
  if (!PLAYS.on || !f.land()) return null;
  const offers = dealPlays(f, rng);
  if (policy === 'none' || !offers.length) return null;
  let pick: Play | null = null;
  if (policy === 'random') pick = rng.pick(offers);
  else {
    let best = 1.1;
    for (const p of offers) {
      const v = playWorth(f, p);
      if (v > best) {
        best = v;
        pick = p;
      }
    }
  }
  if (pick) applyPlay(f, pick);
  return pick;
}
