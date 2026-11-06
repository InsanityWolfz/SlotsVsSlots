/** Elite spoils and the Cashier: its shelf, buying, rerolls and which relics fit (split from run.ts, 2026-11-05). */
import { UNIT, type RelicId } from './config';
import { actLength } from './enemies';
import { BUILD_ENABLER, ELITE_ONLY, LEGENDARY, MACHINE_EXCLUDE, RELICS, type Enabler } from './relics';
import { CABINETS } from './cabinets';
import { Rng } from './rng';
import { CHIPS, currentStop, legendShown, passOn, passStop, RUN, runActs, type DraftOption, type RunState, type ShopItem } from './run';
import { applyOption, charmCount, levelOptions, levelsGained } from './draft';
import { noHealing } from './fightSetup';

// ---- elite spoils & the Cashier --------------------------------------------------------

export function takeSpoils(run: RunState, relic: RelicId): void {
  if (!run.pendingSpoils?.includes(relic)) return;
  passOn(run, run.pendingSpoils.filter((r) => r !== relic).map((r) => `relic:${r}`));
  if (!run.player.relics.includes(relic)) run.player.relics.push(relic);
  const last = run.records.at(-1);
  if (last) last.eliteRelic = relic;
  run.pendingSpoils = null;
}

/** The Cashier is open: a new act's intro visit, or a Cashier stop on the map. */
export const isShopNow = (run: RunState) => !run.over && (run.actIntro || currentStop(run)?.kind === 'shop');
export const rerollCost = (run: RunState) => CHIPS.rerollBase + run.shopRerolls;
/** Shield per House turn your current chips would give in the final fight. */
export const chipShield = (chips: number) => Math.floor(chips / CHIPS.stackPer) * UNIT;

/**
 * The Cashier (2026-10-15 split, user): what you save chips for. The counter: two symbol LEVELS (the price climbs with
 * every level this run) and MAX HP, plus the HEAL service. Behind the glass: two relics (the first one of yours) and THE
 * BIG ONE, a legendary at a high-roller price. Charms and reel edits are the draft's. Deterministic per run seed +
 * depth + rerolls.
 */
export function shopOffers(run: RunState): ShopItem[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 31 + run.act * 64, 0x27d4eb2f) ^ Math.imul(run.shopRerolls + 1, 0x165667b1)) >>> 0);
  const p = run.player;
  const items: ShopItem[] = [];
  const P = CHIPS.prices;
  // A reroll never deals what was just on the shelf (while there's anything else to deal).
  const prev = new Set(run.shopRerolls > 0 ? (run.shelfKeys ?? []) : []);
  const fresh = <T extends DraftOption>(os: T[]) => {
    const f = os.filter((o) => !prev.has(JSON.stringify(o)));
    return f.length ? f : os;
  };
  const add = (option: DraftOption | null, price: number, showcase = false) => {
    // MIDAS: the Cashier gives him 20% off.
    if (option && !items.some((i) => JSON.stringify(i.option) === JSON.stringify(option)))
      items.push({ option, price: run.cabinet === 'midas' ? Math.max(1, Math.ceil(price * 0.8)) : price, sold: false, ...(showcase ? { showcase } : {}) });
  };
  // THE COUNTER. Levels cost more the more you've gained (user, 2026-10-15: planets with no cap, hard to stack unless
  // you build for it). Your attack symbol is one of the two most visits.
  const levelPrice = P.level + CHIPS.levelStep * levelsGained(run);
  const levels = fresh(levelOptions(run));
  const atk = levels.find((o) => o.kind === 'symLevel' && o.symbol === CABINETS[run.cabinet].attack);
  if (atk && rng.next() < 0.6) add(atk, levelPrice);
  for (const o of rng.shuffle(levels)) {
    if (items.length >= 2) break;
    add(o, levelPrice);
  }
  add({ kind: 'maxHp', amount: RUN.maxHpCard }, P.maxHp + RUN.maxHpStep * (run.maxHpBought ?? 0));
  // BEHIND THE GLASS: two relics, then THE BIG ONE in the middle.
  const lastShop = run.act === runActs(run) && run.depth >= Math.min(actLength(run.act), RUN.shopAfter[RUN.shopAfter.length - 1]);
  const relics = (Object.keys(RELICS) as RelicId[]).filter(
    (r) => !p.relics.includes(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && !(lastShop && r === 'bandage') && !LEGENDARY.has(r),
  );
  const two = pickRelics(fresh(relics.map((relic) => ({ kind: 'relic' as const, relic }))).map((o) => o.relic), 2, rng);
  const legends = [...LEGENDARY].filter((r) => !p.relics.includes(r) && relicFits(run, r) && !legendShown(run, r));
  const big = fresh(legends.map((relic) => ({ kind: 'relic' as const, relic })));
  if (two[0]) add({ kind: 'relic', relic: two[0] }, P.relic);
  // Act 1's big one costs more: a legendary before the first boss is a saved-up buy.
  if (big.length) add(rng.pick(big), run.act === 1 ? P.showcase : P.legend, true);
  if (two[1]) add({ kind: 'relic', relic: two[1] }, P.relic);
  run.shelfKeys = items.map((i) => JSON.stringify(i.option));
  // HEAL is a permanent service slot, sized to what you're missing (hidden when nearly full).
  const missing = p.maxHp - p.hp;
  // Once a visit: a reroll doesn't bring it back after you bought it.
  if (missing >= 3 * UNIT && !noHealing(run) && !run.healBought) items.push({ option: { kind: 'heal', amount: Math.min(RUN.healCard, missing) }, price: P.heal + RUN.healStep * (run.healsBought ?? 0), sold: false });
  return items;
}

/** Your identity relics: your machine's and your charms' (one relic card per draft comes from here). */
export const isIdentityRelic = (r: RelicId) => !!((RELICS[r].machine && !RELICS[r].addon) || RELICS[r].charm);

/** Pick `n` relics from a pool, the first from your identity relics when any fit. */
export function pickRelics(pool: RelicId[], n: number, rng: Rng): RelicId[] {
  const ident = pool.filter(isIdentityRelic);
  const first = ident.length ? rng.pick(ident) : null;
  const rest = rng.shuffle(pool.filter((r) => r !== first));
  return [...(first ? [first] : []), ...rest].slice(0, n);
}

/** Build relics are only offered once you own what they amplify (and meter relics only to machines with a meter). */

export function relicFits(run: RunState, r: RelicId): boolean {
  const def = RELICS[r];
  // Slot machine relics only on their machine; charm relics once you own the charm (or your machine favours it).
  if (MACHINE_EXCLUDE[r]?.includes(run.cabinet)) return false;
  if (def.machine && def.machine !== run.cabinet) return false;
  if (def.charm && charmCount(run.player, def.charm) === 0) return false;
  const need = BUILD_ENABLER[r];
  if (!need) return true;
  const has = (n: Enabler): boolean => {
    if (n === 'wild') return run.player.strips.some((s) => (s.wild ?? 0) > 0);
    if (n === 'charm') return run.player.gilded.length > 0;
    if (n === 'meter') return !!CABINETS[run.cabinet].meter;
    return charmCount(run.player, n) > 0;
  };
  return (Array.isArray(need) ? need : [need]).every(has);
}

export function buy(run: RunState, item: ShopItem): boolean {
  if (item.sold || run.player.chips < item.price) return false;
  run.player.chips -= item.price;
  applyOption(run, item.option, false);
  item.sold = true;
  if (item.option.kind === 'heal') {
    run.healBought = true;
    run.healsBought = (run.healsBought ?? 0) + 1;
  }
  if (item.option.kind === 'maxHp') run.maxHpBought = (run.maxHpBought ?? 0) + 1;
  const last = run.records.at(-1);
  if (last) (last.bought ??= []).push(item.option);
  return true;
}

/** Spend chips to reroll the Cashier's shelf. Returns the new offers, or null if too poor. */
export function reroll(run: RunState): ShopItem[] | null {
  const cost = rerollCost(run);
  if (run.player.chips < cost) return null;
  run.player.chips -= cost;
  run.shopRerolls++;
  return shopOffers(run);
}

export function leaveShop(run: RunState): void {
  run.shopRerolls = 0;
  run.healBought = false;
  // The act's intro visit isn't a stop on the map; a Cashier stop is.
  if (run.actIntro) run.actIntro = false;
  else passStop(run);
}
