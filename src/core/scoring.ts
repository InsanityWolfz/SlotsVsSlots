import type { GameConfig, SymbolId } from './config';

export type Tier = 'none' | 'pair' | 'triple';

/** One scoring unit on the payline: either a matched run or a single loose symbol. */
export interface ScoreGroup {
  symbol: SymbolId;
  reels: number[];
  amount: number;
  matched: boolean;
}

export interface LineScore {
  line: SymbolId[];
  tier: Tier;
  /** The symbol that made the pair/triple, if any. */
  tierSymbol: SymbolId | null;
  /** Ordered left to right by first reel — resolution order. */
  groups: ScoreGroup[];
  totals: Partial<Record<SymbolId, number>>;
}

function multFor(count: number, cfg: GameConfig): number {
  if (count === 2) return cfg.pairMult;
  if (count === 3) return cfg.tripleMult;
  return count;
}

/** Reels that form the matched set, or [] if none. */
function matchedReels(line: SymbolId[], cfg: GameConfig): number[] {
  if (cfg.pairRule === 'inOrder') {
    let k = 1;
    while (k < line.length && line[k] === line[0]) k++;
    return k >= 2 ? Array.from({ length: k }, (_, i) => i) : [];
  }
  let best: number[] = [];
  for (const sym of new Set(line)) {
    const reels = line.flatMap((s, i) => (s === sym ? [i] : []));
    if (reels.length > best.length) best = reels;
  }
  return best.length >= 2 ? best : [];
}

export function scoreLine(line: SymbolId[], cfg: GameConfig): LineScore {
  const matched = matchedReels(line, cfg);
  const groups: ScoreGroup[] = [];
  if (matched.length > 0) {
    const symbol = line[matched[0]];
    const n = matched.length;
    groups.push({ symbol, reels: matched, amount: n * cfg.base[symbol] * multFor(n, cfg), matched: true });
  }
  line.forEach((symbol, reel) => {
    if (matched.includes(reel)) return;
    groups.push({ symbol, reels: [reel], amount: cfg.base[symbol], matched: false });
  });
  groups.sort((a, b) => a.reels[0] - b.reels[0]);

  const totals: Partial<Record<SymbolId, number>> = {};
  for (const g of groups) totals[g.symbol] = (totals[g.symbol] ?? 0) + g.amount;

  const tier: Tier = matched.length >= 3 ? 'triple' : matched.length === 2 ? 'pair' : 'none';
  return { line, tier, tierSymbol: matched.length ? line[matched[0]] : null, groups, totals };
}

/** First two reels match: the last reel gets the slow near-miss stop. */
export function isNearMiss(line: SymbolId[]): boolean {
  return line.length >= 3 && line[0] === line[1];
}
