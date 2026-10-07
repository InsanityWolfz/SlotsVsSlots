/**
 * THE SIM BOT (2026-10-07 rewrite, step 1): how the headless player drafts, shops, picks fights and big choices.
 * It reads each slot machine's ATTACK symbol (cabinets.ts `attack`) instead of assuming swords, so it keeps working
 * when machines fight with their own signature symbols. Step 2 (with the content wave) adds archetype-aware bots.
 */
import type { Enh, RelicId, SymbolId } from '../core/config';
import { CABINETS } from '../core/cabinets';
import { actLength, DANGER } from '../core/enemies';
import type { Rng } from '../core/rng';
import {
  buy,
  CHIPS,
  type BigChoice,
  type BigChoiceId,
  type DraftOption,
  leaveShop,
  nextPot,
  bustPot,
  type RunState,
  shopOffers,
} from '../core/run';

export type DraftPolicy = 'greedy' | 'random' | 'relic';

/** Balance probes (tools/balance/builds.ts): start with a relic, draft only one charm, or force a big choice. */
export const SIM_BIAS: { ride?: boolean; /** ENDLESS report: never cash out (measure the real wall). */ noCashOut?: boolean; onEnd?: (run: RunState) => void; startRelic?: RelicId; noStart?: boolean; enh?: Enh; choice?: BigChoiceId; onFight?: (run: RunState) => void } = {};

export const RELIC_VALUE: Record<RelicId, number> = {
  hotstreak: 6,
  belt: 6,
  toll: 3,
  bracelet: 6,
  metronome: 6,
  snakeeyes: 7,
  pitboss: 8,
  loadedchips: 6,
  rainmaker: 7,
  slushfund: 6.5,
  tipjar: 6,
  loosechange: 7,
  coil: 6.5,
  taxman: 6,
  mirror: 10,
  battery: 9,
  fang: 9,
  crown: 8,
  clover: 7.5,
  bandage: 6,
  // Build relics are worth a lot more once you own the gild they amplify.
  midas: 4,
  rod: 4,
  cactus: 3,
  prism: 3,
  hone: 3,
  // Legendaries.
  ticket: 8,
  bell: 8,
  phoenix: 9,
  overcharge: 9.5,
  key: 9,
  sandglass: 8.5,
  chalice: 3,
  // Slot machine relics (only offered on their machine).
  drum: 8,
  chainmail: 8,
  vault: 8,
  decree: 8.5,
  rosehip: 9,
  graft: 5,
  faraday: 7,
  static: 8.5,
  capbells: 8.5,
  stacked: 8.5,
  kiss: 7.5,
  horseshoe: 8,
  underdog: 8,
  firstblood: 7.5,
  piggy: 5,
  // The official sim doesn't bet: the bet relics are dead picks for it.
  loaded: 0.5,
  marker: 0.5,
  highlimit: 0.5,
  trophy: 6,
  holywater: 6,
  bash: 5.5,
};
const BUILD: Partial<Record<RelicId, (run: RunState) => boolean>> = {
  rod: (r) => r.player.gilded.some((g) => g.enh === 'charged'),
  cactus: (r) => r.cabinet === 'thorn',
  chalice: (r) => r.player.gilded.some((g) => g.enh === 'vamp'),
  prism: (r) => r.player.strips.some((s) => (s.wild ?? 0) > 0),
};


/** The machine's attack symbol, and whether a symbol is its plain attack (not its signature). */
export const attackOf = (run: RunState): SymbolId => CABINETS[run.cabinet].attack;
const plainAttack = (run: RunState, x: string) => x === attackOf(run) && x !== CABINETS[run.cabinet].meter?.symbol;

/** A reasonable human-ish drafter, tuned against rollout values from playtest ITERATION_1. */
export function greedyValue(run: RunState, o: DraftOption): number {
  const p = run.player;
  switch (o.kind) {
    case 'relic': {
      if (BUILD[o.relic]?.(run)) return 10;
      return RELIC_VALUE[o.relic];
    }
    case 'heal':
      return (1 - p.hp / p.maxHp) * 14;
    case 'maxHp':
      return 3.5;
    case 'payLien':
      return 6;
    case 'swap': {
      if (o.to === 'wild') return run.cabinet === 'joker' ? 8 : 6;
      // Shields are the weakest symbol, your signature symbol the strongest.
      const worth = (x: string) => (x === 'rock' ? -2 : x === 'shield' ? 0 : plainAttack(run, x) ? 2 : 3);
      return worth(o.to) - worth(o.from) + (o.count >= 3 ? 6 : 4);
    }
    case 'gild':
      if (SIM_BIAS.enh) return o.enh === SIM_BIAS.enh ? 9.5 : 0;
      return { gold: 9, charged: 8.5, spiked: 6.5, keen: 6.5, vamp: 7, lucky: run.cabinet === 'joker' ? 8.5 : 7, blaze: 8, thorny: 8, lucre: 6.5, trick: 8 }[o.enh] + (p.gilded.some((g) => g.enh === o.enh) ? 0.5 : 0);
    case 'symLevel':
      return o.symbol === attackOf(run) ? 8 : o.symbol === 'shield' ? 5 : 7.5;
    case 'charmLevel':
      if (SIM_BIAS.enh) return o.enh === SIM_BIAS.enh ? 9.5 : 0;
      return Math.min(9.5, 6.5 + p.gilded.reduce((a, g) => a + (g.enh === o.enh ? g.n : 0), 0) / 2);
    case 'clear':
      return 3 + (p.strips[o.reel].rock ?? 0) * 2;
    case 'add':
      return plainAttack(run, o.symbol) ? 3 : 4;
    case 'remove':
      return o.symbol === 'rock' ? 5 : o.symbol === 'shield' ? 3 : 0;
  }
}

/** Big choices: strong picks are worth more, but the costs bite when you're low or already built. */
export function choiceValue(run: RunState, c: BigChoice): number {
  const p = run.player;
  const hp = p.hp / p.maxHp;
  const charms = p.gilded.reduce((a, g) => a + g.n, 0);
  const gold = p.gilded.reduce((a, g) => a + (g.enh === 'gold' ? g.n : 0), 0);
  switch (c.id) {
    case 'armsRace':
      return 8 - (p.maxHp < 300 ? 2 : 0);
    case 'masterwork':
      return c.symbol === 'shield' ? 4 : 7;
    case 'whetstone':
      return c.symbol === 'shield' ? 4 : 6;
    case 'meltDown':
      return 4 + (charms - gold) * 0.5;
    case 'gildLot':
      return 8;
    case 'polish':
      return 5 + Math.min(3, charms / 3);
    case 'cleanCut':
      return 6.5;
    case 'twinReel':
      return 5;
    case 'sweepUp':
      // Forced in THE SURGERY it won 28.6% vs CLEAN CUT 24.8 (EXPERT_PLAYTEST_12 D3): 3 made the bot skip it (0.6% of picks).
      return 6.5 + (1 - hp) * 4 + p.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
    case 'glassCannon':
      return 7;
    case 'bloodPact':
      return 6.5;
    case 'secondWind':
      return 4 + (1 - hp) * 6;
    case 'cashOut': {
      if (SIM_BIAS.noCashOut) return -99;
      // Cash out when riding is worth less than the pot in hand: p(clear) x the grown pot + p(bust) x a third
      // (HP proxies p(clear); later loops are harder).
      const L = run.endless?.loop ?? 1;
      const pot = run.endless?.pot ?? 0;
      const pClear = (run.player.hp / run.player.maxHp) * Math.pow(0.8, L - 1);
      return pClear * nextPot(pot) + (1 - pClear) * bustPot(pot) < pot ? 2 : -1;
    }
    case 'ride':
      return 1;
    case 'edge':
      // Endless house edges: legendaries beat chips; the harsh edges cost more.
      return (c.reward === 'legend' ? 6 : 3) - (c.edge === 'frail' || c.edge === 'heal' ? 2 : c.edge === 'fast' ? 1 : 0);
  }
}
export const CHOICE_LOG: Record<string, [number, number]> = {};

export function pickEnemy(run: RunState, policy: DraftPolicy, rng: Rng): number {
  const opts = run.paths[run.depth];
  if (policy === 'random') return rng.int(opts.length);
  const score = (i: number) => {
    const a = opts[i].archetype;
    // Elites are tougher but pay a relic: take them when healthy.
    const eliteBonus = opts[i].elite ? (run.player.hp / run.player.maxHp > 0.7 ? -4 : 3) : 0;
    return (DANGER[a] ?? 8) * (opts[i].elite ? 1.25 : 1) + eliteBonus;
  };
  return opts.map((_, i) => i).reduce((best, i) => (score(i) < score(best) ? i : best), 0);
}

/** Cashier policy: greedy buys the best value-per-chip items, keeping a reserve before the boss. */
export function shop(run: RunState, policy: DraftPolicy, rng: Rng): void {
  const items = shopOffers(run);
  if (policy === 'random') {
    for (const it of items) if (rng.next() < 0.5) buy(run, it);
  } else {
    const reserve = run.depth >= actLength(run.act) ? CHIPS.stackPer * 2 : 0;
    const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
    for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
  }
  leaveShop(run);
}

