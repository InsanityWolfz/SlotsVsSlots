/**
 * THE SIM BOT (2026-10-07 rewrite, step 1): how the headless player drafts, shops, picks fights and big choices.
 * It reads each slot machine's ATTACK symbol (cabinets.ts `attack`) instead of assuming swords, so it keeps working
 * when machines fight with their own signature symbols. Step 2 (with the content wave) adds archetype-aware bots.
 */
import type { Enh, RelicId, SymbolId } from '../core/config';
import { CABINETS } from '../core/cabinets';
import { DANGER, type Stop } from '../core/enemies';
import { bjState, bjTotal } from '../core/encounters';
import type { Rng } from '../core/rng';
import {
  buy,
  chooseRoute,
  CHIPS,
  encounterChoices,
  isBossNext,
  isEncounterNow,
  isShopNow,
  needsRoute,
  playEncounter,
  type BigChoice,
  type BigChoiceId,
  type DraftOption,
  leaveShop,
  type RunState,
  shopOffers,
} from '../core/run';

export type DraftPolicy = 'greedy' | 'random' | 'relic';

/** Balance probes (tools/balance/builds.ts): start with a relic, draft only one charm, or force a big choice. */
export const SIM_BIAS: { /** A forced build: rush (the attack build, the default) or turtle (the shield build). */ style?: 'rush' | 'turtle'; ride?: boolean; onEnd?: (run: RunState) => void; startRelic?: RelicId; noStart?: boolean; enh?: Enh; choice?: BigChoiceId; onFight?: (run: RunState) => void } = {};

export const RELIC_VALUE: Record<RelicId, number> = {
  dryspell: 6,
  punchcard: 6,
  goldenspin: 7,
  insurance: 6,
  housetax: 4,
  regular: 3,
  hitmaker: 7,
  houseofcards: 7,
  parachute: 6,
  turntable: 8,
  mixtape: 7,
  subwoofer: 7,
  armoredcar: 4,
  greatsword: 8,
  safedeposit: 4,
  hotstreak: 6,
  belt: 6,
  bracelet: 6,
  metronome: 6,
  snakeeyes: 7,
  pitboss: 8,
  rainmaker: 7,
  slushfund: 6.5,
  tipjar: 6,
  coil: 6.5,
  mirror: 10,
  battery: 9,
  fang: 9,
  clover: 7.5,
  bandage: 6,
  // Build relics are worth a lot more once you own the gild they amplify.
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
  tower: 7,
  headsman: 8,
  capacitor: 8,
  livewire: 8.5,
  encore: 8,
  downpour: 7.5,
  coup: 7.5,
  compound: 7,
  meltdown: 7.5,
  pulse: 7,
  deckdrum: 8,
  wildcard: 7.5,
  loadedreel: 7.5,
  faraday: 7,
  static: 8.5,
  capbells: 8.5,
  horseshoe: 8,
  underdog: 8,
  firstblood: 7.5,
  piggy: 5,
  // The official sim doesn't bet: the bet relics are dead picks for it.
  trophy: 6,
  holywater: 6,
  bash: 5.5,
};
const BUILD: Partial<Record<RelicId, (run: RunState) => boolean>> = {
  chalice: (r) => r.player.gilded.some((g) => g.enh === 'vamp'),
  prism: (r) => r.player.strips.some((s) => (s.wild ?? 0) > 0),
};


/** The machine's attack symbol, and whether a symbol is its plain attack (not its signature). */
export const attackOf = (run: RunState): SymbolId => CABINETS[run.cabinet].attack;
const plainAttack = (run: RunState, x: string) => x === attackOf(run) && x !== CABINETS[run.cabinet].meter?.symbol;

/** A reasonable human-ish drafter, tuned against rollout values from playtest ITERATION_1. */
export function greedyValue(run: RunState, o: DraftOption): number {
  const styled = SIM_BIAS.style === 'turtle' ? styleValue(run, o) : undefined;
  return styled ?? baseValue(run, o);
}

/** The forced builds: what a TURTLE drafter (a shield build) values differently (undefined: as usual). */
function styleValue(run: RunState, o: DraftOption): number | undefined {
  const p = run.player;
  switch (o.kind) {
    case 'swap':
      if (o.to === 'shield') return (p.strips[o.reel].shield ?? 0) < SIM_BIAS_TURTLE.cap ? 8.5 : 2;
      if (o.from === 'shield') return 0;
      return undefined;
    case 'symLevel':
      return o.symbol === 'shield' ? 9 : 6;
    case 'gild':
      return o.symbol === 'shield' ? 9 : undefined;
    case 'remove':
      return o.symbol === 'shield' ? 0 : undefined;
    case 'relic':
      return SHIELD_RELICS.has(o.relic) ? 9.5 : undefined;
  }
  return undefined;
}
/** The shield build swaps toward this many shields a reel (beyond it, it keeps its strip and invests in shields). */
export const SIM_BIAS_TURTLE = { cap: 9 };
/** Relics a shield build wants. */
const SHIELD_RELICS: ReadonlySet<string> = new Set(['armoredcar', 'safedeposit', 'tower', 'chainmail', 'bash', 'faraday', 'capacitor', 'belt']);

function baseValue(run: RunState, o: DraftOption): number {
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
    case 'swap': {
      if (o.to === 'wild') return (run.cabinet === 'joker' ? 8 : 6) - (o.from === attackOf(run) ? 3 : 0);
      // Shields are the weakest symbol, your signature symbol the strongest.
      const worth = (x: string) => (x === 'rock' ? -2 : x === 'shield' ? 0 : plainAttack(run, x) ? 2 : 3);
      return worth(o.to) - worth(o.from) + (o.count >= 3 ? 6 : 4);
    }
    case 'gild':
      if (SIM_BIAS.enh) return o.enh === SIM_BIAS.enh ? 9.5 : 0;
      return { gold: 9, glass: 8.5, charged: 8.5, spiked: 6.5, keen: 6.5, vamp: 7, lucky: run.cabinet === 'joker' ? 8.5 : 7, blaze: 8, lucre: 6.5, trick: 8, echo: 8 }[o.enh] + (p.gilded.some((g) => g.enh === o.enh) ? 0.5 : 0);
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

/** BIG CHOICES: each card's win rate on each machine when the bot took it (table.ts N1000, 2026-10-08). The bot
 * prefers what wins on its machine, the way a player learns to; cards under 20 picks keep their default value. */
export const BIG_PICK_WIN: Record<string, Record<string, number>> = {
  knight: { luckyBreak: 53, excalibur: 31, sweepUp: 42, gildLot: 42, shieldWall: 47, crusade: 39, armsRace: 40, cursedIdol: 31, shieldSlam: 30, masterwork: 39, meltDown: 50, bloodPact: 42, pawnShop: 43, devilsDue: 60, doubleOrNothing: 36, squire: 48, cleanCut: 29, glassCannon: 39, bloodMoon: 42, whetted: 33, cashIn: 8, allIn: 27, treasure: 50 },
  tesla: { luckyBreak: 24, chainLightning: 28, sweepUp: 18, madScience: 22, gildLot: 33, meltDown: 42, cursedIdol: 15, supercell: 20, fourLeaf: 8, groundWire: 27, pawnShop: 13, doubleOrNothing: 26, overclock: 12, masterwork: 23, devilsDue: 45, cashIn: 3, cleanCut: 28, bloodPact: 41, stormFront: 19, glassCannon: 35, allIn: 33, quickening: 13, treasure: 16, armsRace: 15 },
  joker: { luckyBreak: 43, jokersReel: 45, highCard: 43, sweepUp: 29, cardShark: 46, doubleFeature: 41, meltDown: 33, gildLot: 38, cashIn: 9, trumpCard: 32, cursedIdol: 28, fourLeaf: 34, markedCards: 37, pawnShop: 35, bloodMoon: 29, devilsDue: 47, whetted: 26, glassCannon: 41, masterwork: 34, cleanCut: 14, doubleOrNothing: 14, bloodPact: 55 },
  midas: { luckyBreak: 45, noLimit: 38, sweepUp: 40, gildLot: 35, heist: 81, monsoon: 13, armsRace: 42, meltDown: 38, openBar: 42, cursedIdol: 30, devilsDue: 44, masterwork: 29, glassCannon: 42, pawnShop: 43, doubleOrNothing: 18, trustFund: 50, bloodPact: 54, cleanCut: 29, cashIn: 39 },
};

/** Big choices: strong picks are worth more, but the costs bite when you're low or already built. */
export function choiceValue(run: RunState, c: BigChoice): number {
  const learned = BIG_PICK_WIN[run.cabinet]?.[c.id];
  if (learned !== undefined) return learned / 5;
  return choiceValueBase(run, c);
}

function choiceValueBase(run: RunState, c: BigChoice): number {
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
    case 'secondLine':
      return 6.5;
    case 'longGame':
      // Worth more the more fights are left.
      return run.endless ? 7 : run.act <= 1 ? 6.5 : 4;
    case 'bloodPact':
      return 6.5;
    case 'secondWind':
      return 4 + (1 - hp) * 6;
    // BIG CHOICES (2026-10-08): rough values; the forced-pick probe measures them properly.
    case 'temper':
      return 5.5;
    case 'luckyBreak':
      return 5 + Math.min(3, charms / 3);
    case 'treasure':
      return 6;
    case 'houseMoney':
      return 5;
    case 'devilsDue':
      return 7.5;
    case 'allIn':
      return 6;
    case 'doubleOrNothing':
      return 6.5;
    case 'cursedIdol':
      return 7;
    case 'quickening':
      return 6;
    case 'warded':
      return 4.5;
    case 'pawnShop':
      return 6.5;
    case 'whetted':
    case 'bloodMoon':
    case 'cashIn':
    case 'fourLeaf':
    case 'overclock':
    case 'markedCards':
      return 4 + (charms - gold) * 0.3;
    case 'excalibur':
    case 'chainLightning':
    case 'highCard':
    case 'noLimit':
    case 'jokersReel':
      return 7.5;
    case 'shieldWall':
    case 'crusade':
    case 'madScience':
    case 'doubleFeature':
    case 'cardShark':
    case 'monsoon':
    case 'heist':
    case 'openBar':
      return 6.5;
    case 'shieldSlam':
    case 'squire':
    case 'supercell':
    case 'stormFront':
    case 'groundWire':
    case 'trumpCard':
    case 'trustFund':
      return 6;
    case 'headliner':
    case 'encoreDrop':
      return 7;
    case 'hypeMan':
    case 'backupDancers':
      return 6;
  }
}
export const CHOICE_LOG: Record<string, [number, number]> = {};

/** Route policy: random picks any route; greedy weighs elites by how healthy you are, then danger, Cashiers, gambles. */
export function pickRoute(run: RunState, policy: DraftPolicy, rng: Rng): number {
  const routes = run.map.routes;
  if (policy === 'random') return rng.int(routes.length);
  const healthy = run.player.hp / run.player.maxHp > 0.7;
  const score = (route: Stop[]) =>
    route.reduce((a, st) => {
      if (st.kind === 'elite') return a + (healthy ? 3 : -4) - (DANGER[st.enemy!.archetype] ?? 8) * 0.1;
      if (st.kind === 'fight') return a + 1 - (DANGER[st.enemy!.archetype] ?? 8) * 0.05;
      if (st.kind === 'shop') return a + (run.player.chips >= 10 ? 2 : 0.5);
      return a + 0.5;
    }, 0);
  return routes.map((_, i) => i).reduce((best, i) => (score(routes[i]) > score(routes[best]) ? i : best), 0);
}

/** Encounter policy: random plays any open choice; greedy gambles when healthy and walks away when hurt. */
export function pickEncounter(run: RunState, policy: DraftPolicy, rng: Rng): number {
  const choices = encounterChoices(run);
  // TWENTY-ONE: hit below 17, as the dealer does.
  const bj = bjState(run);
  if (policy !== 'random' && bj) return bjTotal(bj.p) < 17 ? 0 : 1;
  const open = choices.map((c, i) => (c.disabled ? -1 : i)).filter((i) => i >= 0);
  if (policy === 'random') return open.length ? rng.pick(open) : choices.length - 1;
  return !choices[0]?.disabled && run.player.hp / run.player.maxHp > 0.5 ? 0 : choices.length - 1;
}

/** Walk the map up to the next fight: pick a route, visit Cashiers, play encounters. */
export function walkStops(run: RunState, policy: DraftPolicy, rng: Rng): void {
  for (let guard = 0; guard < 20 && !run.over; guard++) {
    if (needsRoute(run)) chooseRoute(run, pickRoute(run, policy, rng));
    else if (isShopNow(run)) shop(run, policy, rng);
    // (A chip bet, for the games that take one: a quarter of what you hold.)
    else if (isEncounterNow(run)) playEncounter(run, pickEncounter(run, policy, rng), Math.max(1, Math.floor(run.player.chips / 4)));
    else return;
  }
}

/** Cashier policy: greedy buys the best value-per-chip items, keeping a reserve before the boss. */
export function shop(run: RunState, policy: DraftPolicy, rng: Rng): void {
  const items = shopOffers(run);
  if (policy === 'random') {
    for (const it of items) if (rng.next() < 0.5) buy(run, it);
  } else {
    const reserve = isBossNext(run) ? CHIPS.stackPer * 2 : 0;
    const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
    for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
  }
  leaveShop(run);
}

