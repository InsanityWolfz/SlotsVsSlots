/**
 * THE SIM BOT (2026-10-07 rewrite, step 1): how the headless player drafts, shops and picks fights.
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
  type DraftOption,
  leaveShop,
  type RunState,
  shopOffers,
} from '../core/run';

export type DraftPolicy = 'greedy' | 'random' | 'relic';

/** Balance probes (tools/balance/builds.ts): start with a relic, or draft only one charm. */
export const SIM_BIAS: { /** A forced build: rush (the attack build, the default) or turtle (the shield build). */ style?: 'rush' | 'turtle'; ride?: boolean; onEnd?: (run: RunState) => void; startRelic?: RelicId; noStart?: boolean; enh?: Enh; onFight?: (run: RunState) => void } = {};

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
  // The legendaries that were BIG CHOICES (2026-10-15).
  secondline: 7,
  devilsdue: 8,
  longgame: 7,
  quickening: 7,
  glasscannon: 7.5,
  crusade: 8,
  chainlightning: 8.5,
  highcard: 8,
  hypeman: 7.5,
  openbar: 7,
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

