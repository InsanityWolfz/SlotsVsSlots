// Iteration-7 playtest helpers: extends it6_lib with tier-aware policies (gild TIER II upgrades),
// act-2-only fork policies, and machine-power helpers for the rebuilt Mirror. Reviewer scratch.
import type { Enh } from '../../src/core/config';
import { completesSet, machinePower, tierUps, type DraftOption, type RunState } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';
import { buildOf, DRAFTS, FORKS, LEGENDARY, reelsWith, SHOPS } from './it6_lib';

export * from './it6_lib';
export { machinePower, tierUps };

const BUILD_RELIC: Partial<Record<Enh, string>> = { gold: 'midas', charged: 'rod', spiked: 'cactus', keen: 'hone' };
const best = <T>(xs: T[], s: (x: T) => number) => xs.reduce((a, b) => (s(b) > s(a) ? b : a));
const growsSet = (run: RunState, o: DraftOption, b: Enh | null) => o.kind === 'gild' && !o.tier && !!b && o.enh === b && !reelsWith(run, b).has(o.reel);
const isTier = (o: DraftOption) => o.kind === 'gild' && !!o.tier;
const tierOfBuild = (run: RunState, o: DraftOption) => o.kind === 'gild' && !!o.tier && o.enh === buildOf(run);

function commitScore(run: RunState, o: DraftOption, tierW: number, tierOther: number): number {
  const b = buildOf(run);
  return (
    (completesSet(run, o) ? 200 : 0) +
    (growsSet(run, o, b) ? 120 : 0) +
    (tierOfBuild(run, o) ? tierW : isTier(o) ? tierOther : 0) +
    (o.kind === 'gild' && !o.tier && !b ? 100 : 0) +
    (o.kind === 'relic' && b && BUILD_RELIC[b] === o.relic ? 100 : 0) +
    (o.kind === 'relic' && LEGENDARY.has(o.relic) ? 60 : 0) +
    greedyValue(run, o)
  );
}

// commit: tier-aware (a tier II of your build gild ~ as good as growing the set).
DRAFTS.commit = (run, offers) => best(offers, (o) => commitScore(run, o, 115, 40));
// tierfirst: any tier II beats everything but a set completion.
DRAFTS.tierfirst = (run, offers) => best(offers, (o) => commitScore(run, o, 180, 150));
// notier: commit, but never take a tier II (to value the tier system).
DRAFTS.notier = (run, offers) => best(offers, (o) => (isTier(o) ? -999 : commitScore(run, o, 0, 0)));

const hurt = (run: RunState, t = 0.7) => run.player.hp < run.player.maxHp * t;
import { buy, shopOffers, type ShopItem } from '../../src/core/run';
function buyWhile(run: RunState, score: (it: ShopItem) => number, min = 4.99) {
  const items = shopOffers(run);
  for (;;) {
    const c = items.filter((i) => !i.sold && run.player.chips - i.price >= 0 && score(i) > min).sort((a, b) => score(b) - score(a));
    if (!c.length) return;
    buy(run, c[0]);
  }
}
function commitShop(tierW: number, tierOther: number) {
  return (run: RunState) => {
    const b = buildOf(run);
    buyWhile(run, (i) => {
      const o = i.option;
      if (o.kind === 'heal') return hurt(run) ? 50 : -1;
      if (completesSet(run, o)) return 60;
      if (o.kind === 'relic' && LEGENDARY.has(o.relic)) return 40;
      if (tierOfBuild(run, o)) return tierW;
      if (isTier(o)) return tierOther;
      if (growsSet(run, o, b)) return 30;
      if (o.kind === 'relic' && b && BUILD_RELIC[b] === o.relic) return 30;
      return o.kind === 'gild' ? -1 : greedyValue(run, o);
    });
  };
}
SHOPS.commit = commitShop(35, 12);
SHOPS.tierfirst = commitShop(55, 45);
SHOPS.notier = commitShop(-1, -1);

// Act-2-only fork policies (act 1 uses the sim's greedy fork rule).
FORKS.elite2 = (run, rng) => (run.act > 1 ? FORKS.elite(run, rng) : FORKS.greedy(run, rng));
FORKS.safe2 = (run, rng) => (run.act > 1 ? FORKS.safe(run, rng) : FORKS.greedy(run, rng));
