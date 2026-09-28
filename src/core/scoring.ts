import type { GameConfig, RelicId, SymbolId } from './config';

export type Tier = 'none' | 'pair' | 'triple';

/**
 * One scoring unit on the payline: either a matched run or a single loose symbol.
 * It pays BASE x MULT (= amount before any cut): BASE is the sum of its symbols' values (plus keen /
 * charged), MULT the double/jackpot multiplier x its gold x relic multipliers.
 */
export interface ScoreGroup {
  /** The symbol this group pays as (a WILD takes the symbol it completes). */
  symbol: SymbolId;
  reels: number[];
  /** What it finally pays (after cuts: rake, hex). */
  amount: number;
  matched: boolean;
  /** BASE and MULT (amount = base x mult - cut). */
  base: number;
  mult: number;
  /** Paid as a jackpot even with one cell (JAX's payoff, the 3-WILD bonus reel). */
  jackpot?: boolean;
  /** Taken off by an enemy (the Croupier's rake, a hex): shown as a red -N. */
  cut?: number;
  /** Why it paid what it did (X2 GOLD, RAISE X2, HALF...). */
  notes?: string[];
  /** Keen: this group pierces shields. */
  pierce?: boolean;
}

export interface LineScore {
  line: SymbolId[];
  tier: Tier;
  /** The symbol that made the pair/triple, if any. */
  tierSymbol: SymbolId | null;
  /** Ordered left to right by first reel — resolution order. */
  groups: ScoreGroup[];
  totals: Partial<Record<SymbolId, number>>;
  /** Relics that changed this line's pay (the HUD pops their icons). */
  relics?: RelicId[];
  /** 3 WILDS: the bonus reel picked this symbol, and the line paid its jackpot. */
  wildPick?: SymbolId;
  /** JAX's payoff: all three payline cells paid as jackpots of themselves. */
  jackpots?: boolean;
  /** MIDAS TOUCH fired this spin (the meter pays off). */
  raised?: boolean;
  /** MIDAS TOUCH: cells touched this spin and their touch count after it. */
  touched?: { reel: number; index: number; n: number }[];
}

/** What a WILD pays as when it completes nothing (or the whole line is wild), by default. */
export const WILD_ALONE: SymbolId = 'bolt';

export function multFor(count: number, cfg: Pick<GameConfig, 'pairMult' | 'tripleMult'>): number {
  if (count === 2) return cfg.pairMult;
  if (count === 3) return cfg.tripleMult;
  return 1;
}

const isWild = (s: SymbolId) => s === 'wild';

export interface ScoreOpts {
  /** Value of one symbol (levels); default the config base. */
  value?: (s: SymbolId) => number;
  /** What a lone WILD (or an all-WILD line) pays as. */
  wildAlone?: SymbolId;
}

/** The matched set and the symbol it pays as, or null. WILDs join whatever they complete. */
function matchedRun(line: SymbolId[], cfg: GameConfig, alone: SymbolId): { symbol: SymbolId; reels: number[] } | null {
  if (cfg.pairRule === 'inOrder') {
    const head = line.find((s) => !isWild(s)) ?? alone;
    let k = 0;
    while (k < line.length && (line[k] === head || isWild(line[k]))) k++;
    return k >= 2 ? { symbol: head, reels: Array.from({ length: k }, (_, i) => i) } : null;
  }
  let best: { symbol: SymbolId; reels: number[] } | null = null;
  const candidates: SymbolId[] = [...new Set(line.filter((s) => !isWild(s)))];
  if (!candidates.length) candidates.push(alone);
  for (const sym of candidates) {
    const reels = line.flatMap((s, i) => (s === sym || isWild(s) ? [i] : []));
    if (!best || reels.length > best.reels.length) best = { symbol: sym, reels };
  }
  return best && best.reels.length >= 2 ? best : null;
}

export function scoreLine(line: SymbolId[], cfg: GameConfig, opts: ScoreOpts = {}): LineScore {
  const alone = opts.wildAlone ?? WILD_ALONE;
  const value = opts.value ?? ((s: SymbolId) => cfg.base[s]);
  const run = matchedRun(line, cfg, alone);
  const matched = run?.reels ?? [];
  const groups: ScoreGroup[] = [];
  if (run) {
    const n = matched.length;
    const base = n * value(run.symbol);
    const mult = multFor(n, cfg);
    groups.push({ symbol: run.symbol, reels: matched, amount: base * mult, base, mult, matched: true });
  }
  line.forEach((raw, reel) => {
    if (matched.includes(reel)) return;
    const symbol = isWild(raw) ? alone : raw;
    const base = value(symbol);
    groups.push({ symbol, reels: [reel], amount: base, base, mult: 1, matched: false });
  });
  groups.sort((a, b) => a.reels[0] - b.reels[0]);

  const totals: Partial<Record<SymbolId, number>> = {};
  for (const g of groups) totals[g.symbol] = (totals[g.symbol] ?? 0) + g.amount;

  const tier: Tier = matched.length >= 3 ? 'triple' : matched.length === 2 ? 'pair' : 'none';
  return { line, tier, tierSymbol: run?.symbol ?? null, groups, totals };
}

/** First two reels match (a WILD matches anything): the last reel gets the slow near-miss stop. */
export function isNearMiss(line: SymbolId[]): boolean {
  return line.length >= 3 && (line[0] === line[1] || isWild(line[0]) || isWild(line[1]));
}
