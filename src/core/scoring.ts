import type { GameConfig, SymbolId } from './config';

export type Tier = 'none' | 'pair' | 'triple';

/** One scoring unit on the payline: either a matched run or a single loose symbol. */
export interface ScoreGroup {
  /** The symbol this group pays as (a WILD takes the symbol it completes). */
  symbol: SymbolId;
  reels: number[];
  amount: number;
  matched: boolean;
  /** Amount before gilds/relics touched it, and the notes that explain the difference. */
  base?: number;
  notes?: string[];
  /** A FULL SET gild (same enhancement on all 3 reels) boosted this group. */
  fullSet?: boolean;
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

/** What a WILD pays as when it completes nothing (or the whole line is wild). */
export const WILD_ALONE: SymbolId = 'bolt';

function multFor(count: number, cfg: GameConfig): number {
  if (count === 2) return cfg.pairMult;
  if (count === 3) return cfg.tripleMult;
  return count;
}

const isWild = (s: SymbolId) => s === 'wild';

/** The matched set and the symbol it pays as, or null. WILDs join whatever they complete. */
function matchedRun(line: SymbolId[], cfg: GameConfig): { symbol: SymbolId; reels: number[] } | null {
  if (cfg.pairRule === 'inOrder') {
    const head = line.find((s) => !isWild(s)) ?? WILD_ALONE;
    let k = 0;
    while (k < line.length && (line[k] === head || isWild(line[k]))) k++;
    return k >= 2 ? { symbol: head, reels: Array.from({ length: k }, (_, i) => i) } : null;
  }
  let best: { symbol: SymbolId; reels: number[] } | null = null;
  const candidates: SymbolId[] = [...new Set(line.filter((s) => !isWild(s)))];
  if (!candidates.length) candidates.push(WILD_ALONE);
  for (const sym of candidates) {
    const reels = line.flatMap((s, i) => (s === sym || isWild(s) ? [i] : []));
    if (!best || reels.length > best.reels.length) best = { symbol: sym, reels };
  }
  return best && best.reels.length >= 2 ? best : null;
}

export function scoreLine(line: SymbolId[], cfg: GameConfig): LineScore {
  const run = matchedRun(line, cfg);
  const matched = run?.reels ?? [];
  const groups: ScoreGroup[] = [];
  if (run) {
    const n = matched.length;
    groups.push({ symbol: run.symbol, reels: matched, amount: n * cfg.base[run.symbol] * multFor(n, cfg), matched: true });
  }
  line.forEach((raw, reel) => {
    if (matched.includes(reel)) return;
    const symbol = isWild(raw) ? WILD_ALONE : raw;
    groups.push({ symbol, reels: [reel], amount: cfg.base[symbol], matched: false });
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
