// Iteration-4 playtest helpers: full run loop with elite spoils + the Cashier, shopping policies.
import type { Enh, RelicId } from '../../src/core/config';
import { RUN_FIGHTS } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import { COUNTERS } from '../../src/core/relics';
import {
  applyOption, buy, CHIPS, chooseEnemy, createRun, draftOffers, finishFight, fightConfig, isShopNow, leaveShop, needsChoice, reroll, rerollCost,
  shopOffers, takeSpoils, type DraftOption, type RunState, type ShopItem,
} from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';
import { BASE, FORKS, playFight, POLICIES, type FightFeel, type ForkPicker, type Picker } from './it3_lib';

export { BASE, FORKS, POLICIES, Rng, CHIPS, RUN_FIGHTS };

// ---- builds ---------------------------------------------------------------------------
const BUILD_RELIC: Record<Enh, RelicId> = { gold: 'midas', charged: 'rod', spiked: 'cactus', keen: 'hone' };
/** The enhancement you own most of (your "build"), or null. */
export function buildOf(run: RunState): Enh | null {
  const n: Partial<Record<Enh, number>> = {};
  for (const g of run.player.gilded) n[g.enh] = (n[g.enh] ?? 0) + 1;
  const e = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return e ? (e[0] as Enh) : null;
}
const fitsBuild = (run: RunState, o: DraftOption, b: Enh | null) =>
  (o.kind === 'gild' && (!b || o.enh === b)) || (o.kind === 'relic' && !!b && BUILD_RELIC[b] === o.relic);
const newEnh = (run: RunState, o: DraftOption) => o.kind === 'gild' && !run.player.gilded.some((g) => g.enh === o.enh);

/** Draft pickers added for builds. */
export const DRAFTS: Record<string, Picker> = {
  ...POLICIES,
};
DRAFTS.commit = (run, offers) => {
  const b = buildOf(run);
  const s = (o: DraftOption) => (fitsBuild(run, o, b) ? 100 : 0) + greedyValue(run, o);
  return offers.reduce((x, y) => (s(y) > s(x) ? y : x));
};
DRAFTS.spread = (run, offers) => {
  const s = (o: DraftOption) => (newEnh(run, o) ? 100 : o.kind === 'gild' ? -50 : 0) + greedyValue(run, o);
  return offers.reduce((x, y) => (s(y) > s(x) ? y : x));
};

// ---- shopping -------------------------------------------------------------------------
export type Shopper = (run: RunState, rng: Rng) => void;
const lastShop = (run: RunState) => run.depth >= RUN_FIGHTS;
function buyWhile(run: RunState, score: (it: ShopItem) => number, reserve: number, minScore = -Infinity) {
  let items = shopOffers(run);
  for (;;) {
    const c = items.filter((i) => !i.sold && run.player.chips - i.price >= reserve && score(i) > minScore).sort((a, b) => score(b) - score(a));
    if (!c.length) return items;
    buy(run, c[0]);
  }
}
export const SHOPS: Record<string, Shopper> = {
  never: () => {},
  /** The shipped sim heuristic. */
  simGreedy: (run) => {
    const items = shopOffers(run);
    const reserve = lastShop(run) ? CHIPS.stackPer * 2 : 0;
    const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
    for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
  },
  /** Buy anything with value >= 5, best value first, spend everything (no boss reserve). */
  spendAll: (run) => { buyWhile(run, (i) => greedyValue(run, i.option), 0, 4.99); },
  /** Buy by value/chip but only at the final shop keep nothing... i.e. spend early, keep 0. */
  cheapFirst: (run) => { buyWhile(run, (i) => greedyValue(run, i.option) / i.price, 0, 0.3); },
  /** Only buy relics. */
  relicsOnly: (run) => { buyWhile(run, (i) => (i.option.kind === 'relic' ? 1 : -1), 0, 0); },
  /** Only buy gilds. */
  gildsOnly: (run) => { buyWhile(run, (i) => (i.option.kind === 'gild' ? greedyValue(run, i.option) : -1), 0, 0); },
  /** Save for the boss shield: buy only at shops 1-2, never at the last. */
  hoardLast: (run) => { if (!lastShop(run)) buyWhile(run, (i) => greedyValue(run, i.option), 0, 4.99); },
  /** Pure hoard: interest + boss shield. */
  hoard: () => {},
  /** Spend at shops 1-2 but keep interest thresholds (5/10/15). */
  interest: (run) => { buyWhile(run, (i) => greedyValue(run, i.option), lastShop(run) ? 10 : 5, 4.99); },
  /** Commit: only gilds that fit your build (or any gild if none), and your build relic; reroll up to 2 to find them. */
  commit: (run) => {
    for (let r = 0; r < 3; r++) {
      const b = buildOf(run);
      const items = buyWhile(run, (i) => (fitsBuild(run, i.option, b) ? 10 + greedyValue(run, i.option) : -1), 0, 0);
      const cheapest = Math.min(CHIPS.prices.gild, CHIPS.prices.relic);
      if (r < 2 && run.player.chips >= rerollCost(run) + cheapest && !items.some((i) => !i.sold && fitsBuild(run, i.option, buildOf(run)))) reroll(run); else break;
    }
  },
  /** Commit without rerolling. */
  commitNoReroll: (run) => { const b = buildOf(run); buyWhile(run, (i) => (fitsBuild(run, i.option, b) ? 10 + greedyValue(run, i.option) : -1), 0, 0); },
  /** Spread: prefer gilds of a new enhancement. */
  spread: (run) => { buyWhile(run, (i) => (newEnh(run, i.option) ? 20 : i.option.kind === 'gild' ? -1 : greedyValue(run, i.option)), 0, 4.99); },
  /** Random: each item 50%. */
  random: (run, rng) => { for (const it of shopOffers(run)) if (rng.next() < 0.5) buy(run, it); },
  /** Hoard, but heal when hurt. */
  healOnly: (run) => { buyWhile(run, (i) => (i.option.kind === 'heal' && run.player.hp < run.player.maxHp * 0.7 ? 1 : -1), 0, 0); },
  /** Tuned from rollouts: heal when hurt anywhere; shop 1 WILDs; shop 2 best value; shop 3 heal only. */
  smart: (run) => {
    const hurt = run.player.hp < run.player.maxHp * 0.7;
    const s = (i: ShopItem) => i.option.kind === 'heal' ? (hurt ? 50 : -1) : lastShop(run) ? -1 : greedyValue(run, i.option) + (i.option.kind === 'relic' && i.option.relic === 'fang' ? 5 : 0);
    buyWhile(run, s, 0, 4.99);
  },
  commitSmart: (run) => {
    const hurt = run.player.hp < run.player.maxHp * 0.7; const b = buildOf(run);
    const s = (i: ShopItem) => i.option.kind === 'heal' ? (hurt ? 50 : -1) : lastShop(run) ? -1 : fitsBuild(run, i.option, b) ? 20 + greedyValue(run, i.option) : i.option.kind === 'gild' ? -1 : greedyValue(run, i.option);
    buyWhile(run, s, 0, 4.99);
  },
  spreadSmart: (run) => {
    const hurt = run.player.hp < run.player.maxHp * 0.7;
    const s = (i: ShopItem) => i.option.kind === 'heal' ? (hurt ? 50 : -1) : lastShop(run) ? -1 : newEnh(run, i.option) ? 20 + greedyValue(run, i.option) : i.option.kind === 'gild' ? -1 : greedyValue(run, i.option);
    buyWhile(run, s, 0, 4.99);
  },
  /** Greedy + reroll once when nothing worth >= 7 on the shelf. */
  rerollGreedy: (run) => {
    for (let r = 0; r < 3; r++) {
      const items = buyWhile(run, (i) => greedyValue(run, i.option), 0, 4.99);
      if (r < 2 && run.player.chips >= rerollCost(run) + 10 && !items.some((i) => !i.sold)) reroll(run); else break;
    }
  },
};

// ---- run loop -------------------------------------------------------------------------
export interface Run4 {
  won: boolean; deathDepth: number; fights: FightFeel[]; relics: RelicId[]; picks: DraftOption[]; bought: DraftOption[]; forks: { arch: string; elite: boolean }[];
  hpIntoBoss: number; chipsEarned: number; chipsIntoBoss: number; stackIntoBoss: number; rerolls: number; gildsEnd: Enh[]; spoils: RelicId[];
  shopChips: number[]; // chips on arrival at each shop
}
export const TUNE4 = { startChips: 0 };
export type SpoilPicker = (run: RunState, sp: RelicId[], rng: Rng) => RelicId;
export const SPOILS: Record<string, SpoilPicker> = {
  greedy: (run, sp) => sp.reduce((a, b) => (greedyValue(run, { kind: 'relic', relic: b }) > greedyValue(run, { kind: 'relic', relic: a }) ? b : a)),
  random: (_r, sp, rng) => rng.pick(sp),
  first: (_r, sp) => sp[0],
};

export function playRun4(seed: number, draft: Picker, fork: ForkPicker, shop: Shopper, pickRng: Rng, fightRng: Rng, start?: RunState, spoil: SpoilPicker = SPOILS.greedy): Run4 {
  const run = start ?? createRun(BASE, seed);
  if (!start) run.player.chips = TUNE4.startChips;
  const out: Run4 = { won: false, deathDepth: -1, fights: [], relics: [], picks: [], bought: [], forks: [], hpIntoBoss: -1, chipsEarned: 0, chipsIntoBoss: -1, stackIntoBoss: 0, rerolls: 0, gildsEnd: [], spoils: [], shopChips: [] };
  while (!run.over) {
    if (needsChoice(run)) { chooseEnemy(run, fork(run, pickRng)); const e = run.enemies[run.depth]; out.forks.push({ arch: e.archetype, elite: !!e.elite }); }
    if (run.depth === RUN_FIGHTS) { out.hpIntoBoss = run.player.hp / run.player.maxHp; out.chipsIntoBoss = run.player.chips; out.stackIntoBoss = Math.floor(run.player.chips / CHIPS.stackPer); }
    const e = run.enemies[run.depth];
    const fight = new Fight(fightConfig(run, BASE), fightRng.int(0xffffffff));
    const depth = run.depth;
    out.fights.push(playFight(fight, e.archetype, depth, !!e.elite));
    const rec = finishFight(run, fight);
    out.chipsEarned += rec.chips ?? 0;
    if (run.over && !run.won) out.deathDepth = depth;
    if (!run.over && run.pendingSpoils) { const r = spoil(run, run.pendingSpoils, pickRng); out.spoils.push(r); takeSpoils(run, r); }
    if (!run.over) {
      const offers = draftOffers(run); const o = draft(run, offers, pickRng); out.picks.push(o); applyOption(run, o);
      if (isShopNow(run)) {
        out.shopChips.push(run.player.chips);
        const before = run.records.at(-1)?.bought?.length ?? 0;
        shop(run, pickRng);
        out.rerolls += run.shopRerolls;
        out.bought.push(...(run.records.at(-1)?.bought ?? []).slice(before));
        leaveShop(run);
      }
    }
  }
  out.won = run.won; out.relics = [...run.player.relics]; out.gildsEnd = run.player.gilded.map((g) => g.enh);
  return out;
}

export const cloneRun = (r: RunState): RunState => JSON.parse(JSON.stringify(r));
export function rollout4(run: RunState, draft: Picker, fork: ForkPicker, shop: Shopper, n: number, rng: Rng): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (playRun4(0, draft, fork, shop, rng, rng, cloneRun(run)).won) w++;
  return w / n;
}
export { createRun, draftOffers, applyOption, finishFight, fightConfig, needsChoice, chooseEnemy, shopOffers, buy, reroll, leaveShop, isShopNow, takeSpoils, Fight, COUNTERS };
