import { emptyLevels, UNIT, unitsRound, type Enh, type GameConfig, type Gild, type Levels, type RelicId, type StripCounts, type SymbolId } from './config';
import { demo } from '../demo';
import { ACTS, ARCHETYPES, GATEKEEPER, generateActMap, ladderFrac, makeEnemy, OWNER_LADDER, REPO_MAN, TURBO, type ActMap, type EnemyDef, type Stop } from './enemies';
import { MAX_STAKE, STAKE } from './stakes';
import type { Fight } from './fight';
import {
  BANDAGE_HEAL,
  ELITE_ONLY,
  NEW_RELIC,
  LEGEND_RELIC,
  WAVE1,
  LEGENDARY,
  RELIC_TIER,
  RELICS,
} from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { encounterOf, encounterRng, extraPlays, type EncounterChoice, type EncounterResult } from './encounters';
import { symLevel } from './charms';
import { Rng } from './rng';
import { BONUS_SYMBOLS, stripCounts } from './strip';
import { applyOption, charmOptions, charmSymbols, describeOption, levelOptions, levelStep, levelsGained, normalizeCharms } from './draft';
import { isIdentityRelic, pickRelics, relicFits } from './shop';
import { noHealing } from './fightSetup';
import { nextPot, nightId, nightOf, startEndlessLoop, type NightId } from './endless';
/** Run-level tunables. */
export const RUN = {
  startHp: 32 * UNIT,
  /** The Cashier's HEAL: up to this much (it's the one heal between bosses since the draft split, 2026-10-15). */
  healCard: 12 * UNIT,
  maxHpCard: 4 * UNIT,
  /** A strip can't be thinned below this many cells. */
  minStrip: 6,
  draftSize: 3,
  /** Drafts: chance a charm card is MORE of a charm you own (the rest lean to new charm types). */
  extendChance: 0.3,
  /** Drafts: chance a charm card is a charm type you DON'T own yet (a pivot), when you own some. */
  pivotChance: 0.5,
  /** Each Cashier heal bought this run costs this much more than the last. */
  healStep: 3,
  /** +MAX HP costs this much more each time you buy it (it was the best buy at every visit: playtest 2026-10-31). */
  maxHpStep: 4,
  /** Rocks an ELITE adds during one fight that stay for the rest of the run (user, 2026-10-30: none; they confused). */
  permanentRocksPerFight: 0,
  swapCount: 3,
  addCount: 2,
  wildCount: 2,
  /** Any-direction swap cards move this many cells. */
  anySwapCount: 2,
  /** Charm cards: cells charmed by a draft card. */
  charmCells: 2,
  /** Levels an act boss (and a loop boss) pays your attack symbol. */
  bossLevels: 1,
  /** The Cashier opens after these fights (1-based), after the draft. */
  shopAfter: [1, 3, 5],
  /** Legendary relics offered when an act's boss falls. */
  legendPick: 3,
};

/** Charms by act (act 2 unlocks LUCKY and BLAZE). CHARGED and BLAZE feed the lightning: TESLA only. */
// BULWARK (id 'spiked') retired 2026-10-07: SHIELD BASH (KNIGHT-only) is the shield-damage piece. The id stays for saves.
export const ACT1_GILDS: Enh[] = ['gold', 'keen', 'vamp', 'charged', 'lucre', 'trick', 'lucky', 'blaze', 'echo', 'glass'];
/** Empty since 2026-10-08 (user: LUCKY and BLAZE from Act 1). */
export const ACT2_GILDS: Enh[] = [];
const TESLA_ONLY: ReadonlySet<Enh> = new Set(['charged', 'blaze']);
/** BULWARK (id 'spiked') is KNIGHT's own charm. */
const KNIGHT_ONLY: ReadonlySet<Enh> = new Set(['spiked']);
/** TRICK is JOKER's (CONTENT_13). */
const JOKER_ONLY: ReadonlySet<Enh> = new Set(['trick']);
/** ECHO is THE JUKEBOX's. */
const JUKEBOX_ONLY: ReadonlySet<Enh> = new Set(['echo']);
/** LUCKY is a later-machine charm (a wild barely changes KNIGHT's or MIDAS's two-symbol line). */
export const LUCKY_MACHINES: ReadonlySet<CabinetId> = new Set(['tesla', 'joker', 'jukebox']);
export const gildsFor = (run: RunState): Enh[] =>
  [...ACT1_GILDS, ...(run.act > 1 ? ACT2_GILDS : [])].filter(
    (e) =>
      (run.cabinet === 'tesla' || !TESLA_ONLY.has(e)) &&
      (run.cabinet === 'knight' || !KNIGHT_ONLY.has(e)) &&
      (run.cabinet === 'joker' || !JOKER_ONLY.has(e)) &&
      (run.cabinet === 'jukebox' || !JUKEBOX_ONLY.has(e)) &&
      (e !== 'lucky' || LUCKY_MACHINES.has(run.cabinet)) &&
      // A charm with nothing on your reels to go on is never offered (KEEN on a machine with no swords).
      charmSymbols(run, e).some((sym) => run.player.strips.some((st) => (st[sym] ?? 0) > 0)),
  );
/** Symbols this machine's swap cards move between. */
export const swappable = (run: RunState): SymbolId[] => CABINETS[run.cabinet].symbols;
/** What a WILD card can turn into wilds: shields and your attack symbol. */
export const wildFrom = (run: RunState): SymbolId[] => [...new Set<SymbolId>(['shield', CABINETS[run.cabinet].attack])];
/** The symbol +2 / rock-swap cards give (the signature symbol, or swords for KNIGHT and JAX). */
export const sigSymbol = (run: RunState): SymbolId => {
  const m = CABINETS[run.cabinet].meter;
  return m && m.symbol !== 'wild' ? m.symbol : CABINETS[run.cabinet].attack;
};

/** Chip economy (earning is passive, spending happens only at the Cashier). */
export const CHIPS = {
  /** Was 2 + up to 3 overkill chips; overkill removed 2026-10-08 (unexplained), +1 a fight folded in here (+2 overshot: chips/fight above the old economy). */
  // 3 -> 6 with the draft/Cashier split (2026-10-15): relics, levels and heals left the free draft for the Cashier.
  win: 6,
  eliteBonus: 2,
  /** Act 2 elites pay these chips instead of a relic. */
  act2EliteChips: 6,
  perJackpot: 1,
  /** +1 interest per this many banked chips, capped. */
  interestPer: 5,
  interestCap: 3,
  /** Boss fight: every this many unspent chips = +10 shield at the start of each House turn. */
  stackPer: 8,
  /** Every run starts with a little float so shop 1 is a real visit. */
  start: 8,
  // heal 5 -> 12, once a visit (2026-10-12: no heal after fights now, so HP is worth more; user).
  prices: { relic: 10, heal: 6, maxHp: 5, legend: 20, showcase: 24, level: 10 },
  /** Each level gained this run adds this to the Cashier's level price. */
  levelStep: 4,
  /** First reroll per visit costs 1, then +1 each time. */
  rerollBase: 1,
};

export type DraftOption =
  | { kind: 'add'; symbol: SymbolId; reel: number; count?: number }
  | { kind: 'swap'; from: SymbolId; to: SymbolId; count: number; reel: number }
  | { kind: 'clear'; symbol: 'rock'; reel: number }
  | { kind: 'relic'; relic: RelicId }
  | { kind: 'heal'; amount: number }
  | { kind: 'maxHp'; amount: number }
  /** CHARM card: `n` <enh> charms onto plain <symbol> cells of one reel. */
  | { kind: 'gild'; enh: Enh; symbol: SymbolId; reel: number; n: number }
  /** LEVEL cards: +1 level to a symbol type, or to a charm type. */
  | { kind: 'symLevel'; symbol: SymbolId }
  | { kind: 'charmLevel'; enh: Enh }
  | { kind: 'remove'; symbol: SymbolId; reel: number };

export interface ShopItem {
  option: DraftOption;
  price: number;
  sold: boolean;
  /** THE BIG ONE: the visit's one big buy (a legendary relic), centre stage behind the glass. */
  showcase?: boolean;
}

export interface RunPlayer {
  hp: number;
  maxHp: number;
  strips: StripCounts[];
  relics: RelicId[];
  /** Charmed cells per reel (n cells of a symbol carry a charm): persist for the run. */
  gilded: Gild[];
  /** Symbol and charm levels (on the type: later cells get them too). */
  levels: Levels;
  /** Casino chips: earned by winning, spent at the Cashier, and a shield stack vs the House. */
  chips: number;
}

export interface FightRecord {
  /** An act's boss fight. */
  boss?: boolean;
  /** An elite (the run score counts them).*/
  elite?: boolean;
  /** A boss paid this symbol a level (shown on the next screen). */
  bossLevel?: SymbolId;
  /** Your biggest spin this fight (all its hits) (the run-over screen's BEST HIT; a stat, not a rule). */
  best?: number;
  /** DEATH RECAP (lost fights): the top sources of HP damage you took, e.g. [['SPIN HITS', 180], ['BOMBS', 60]]. */
  hurt?: [string, number][];
  /** Your spins this fight that had a frozen or jammed reel, of all your spins. */
  stuck?: [number, number];
  depth: number;
  enemy: string;
  archetype: string;
  won: boolean;
  turns: number;
  hpBefore: number;
  hpAfter: number;
  portrait?: string;
  /** Which act this fight was in. */
  act?: number;
  /** ENDLESS: which loop it was in. */
  loop?: number;
  /** Chips the Mimic ate. */
  chipsEaten?: number;
  /** Chips an act 2 elite paid. */
  eliteChips?: number;
  /** SCARS (RED stake): the reel that took a permanent rock. */
  scar?: number;
  /** Bonus prizes won in this fight. */
  bonuses?: string[];
  rocksAdded: number;
  rocksCrumbled: number;
  /** Relic taken from an elite's spoils. */
  eliteRelic?: RelicId;
  /** Chips earned from this fight (including interest). */
  chips?: number;
  pick?: DraftOption;
  /** What was bought at the Cashier after this fight. */
  bought?: DraftOption[];
  /** Old saves only: the BIG CHOICES taken after this fight (big choices are gone; COPY RUN still shows them). */
  choice?: string;
}

export interface RunState {
  seed: number;
  /** A Dealer win you LET RIDE: its hiscore entry's `at`, so ENDLESS updates that entry (even after a refresh). */
  rideAt?: number;
  /** The seed the fights' spins come from (the run seed, unless set): THE WEEKLY rolls a fresh one each try, so its
   * map and offers are fixed but its spins are not. */
  spinSeed?: number;
  /** Index of the next fight in `enemies` (this act's fights, the boss last). */
  depth: number;
  /** This act's map: the opener, the routes to pick from, the boss. */
  map: ActMap;
  /** The route picked (null until you pick, right after the opener). */
  route: number | null;
  /** Index of the current stop in `actStops(run)` (0 = the opener). */
  stop: number;
  /** This act's fights in order: the opener, then (once a route is picked) its fights, then the boss. */
  enemies: EnemyDef[];
  player: RunPlayer;
  records: FightRecord[];
  over: boolean;
  won: boolean;
  /** An elite was beaten: choose 1 of these relics before the draft. */
  pendingSpoils: RelicId[] | null;
  /** Cards and relics turned down this act (draft cards by kind, `relic:<id>`): not offered again this act. */
  passed?: { act: number; keys: string[] };
  /** A new run: pick 1 of 3 starting relics (your machine's two, plus a general one). */
  pendingStart?: RelicId[] | null;
  /** Rerolls used at the current Cashier visit. */
  shopRerolls: number;
  /** The Cashier's current shelf (a reroll deals none of these again). */
  shelfKeys?: string[];
  /** The starting machine. */
  cabinet: CabinetId;
  /** Current act (1 = the House, 2 = THE WHEEL, 3 = the Dealer, 4+ endless). */
  act: number;
  /** An act's boss fell: choose 1 of these legendary relics. */
  pendingLegend: RelicId[] | null;
  /** The legendaries the act's legendary pick showed (`key` = act and endless loop): later offers that act skip them. */
  legendSeen?: { key: string; relics: RelicId[] };
  /** A new act just began: the Cashier opens before its first fight. */
  actIntro: boolean;
  /** HIGH STAKES level (0 = base game). */
  stake: number;
  /** THE DEALER is unlocked (old saves; act 3 now follows the stake: RED and up). */
  act3: boolean;
  /** THE DECK REMEMBERS: marked cards the Card Sharp placed this act (they follow you to the Dealer). */
  deckMarks?: number;
  /** The TUTORIAL run: its first fight is a little softer. */
  tutorial?: boolean;
  /** ENDLESS (LET IT RIDE after the Dealer): the loop you're on and its score pot. */
  endless?: { loop: number; pot: number; /** THE OWNER: how far up his ladder you climbed (0-1, a quarter a rung). */ ownerTaken?: number; night?: NightId; /** TONIGHT'S RULE per path (user, 2026-10-14): picking a path picks its rule. */ nights?: NightId[]; /** Beat THE TURBO: the run's true end. */ turbo?: boolean };
  /** The Cashier's heal was bought this visit (it's once a visit). */
  healBought?: boolean;
  /** Cashier heals bought this run (each costs more). */
  healsBought?: number;
  /** Cashier MAX HP bought this run (each costs more). */
  maxHpBought?: number;
  /** Relic picks waiting behind the current one (PUNCH CARD's can land on the act's legendary pick). */
  legendQueue?: RelicId[][];
  /** THE LONG GAME (legendary relic): fights won since you got it. */
  longGame?: number;
  /** CRUSADE (legendary relic, KNIGHT): fights won since you got it (+5 sword damage each). */
  crusadeWins?: number;
  /** THE RUN SCORE: every chip the run paid you (fights, encounters), spent or not. */
  chipsEarned?: number;
  /** PUNCH CARD: fights won since the last legendary it paid. */
  punches?: number;
  /** Plays already made at the current encounter stop (TWENTY-ONE's deals and hits, the CLAW's goes, each call). */
  encounterPlays?: number;
  /** A game in progress at this stop (HIGHER OR LOWER's showing card, bet and right calls). */
  encounterState?: Record<string, number | number[]>;
  /** Encounters played this run (what was chosen, how it went): for the run log and the sim. */
  encounters?: { act: number; id: string; choice: number; good: boolean | null; what?: string; more?: boolean }[];
  /** The relic picked at the start (COPY RUN). */
  startRelic?: RelicId;
}

export function createRun(_base: GameConfig, seed = Rng.randomSeed(), cabinet: CabinetId = 'knight', stake = 0, act3 = false): RunState {
  const rng = new Rng(seed);
  const map = generateActMap(rng, 1, 1, cabinet);
  const cab = CABINETS[cabinet];
  const run: RunState = {
    seed,
    depth: 0,
    map,
    route: null,
    stop: 0,
    enemies: [map.opener],
    player: {
      hp: cab.hp,
      maxHp: cab.hp,
      strips: cab.strips.map((s) => ({ ...s })),
      relics: [],
      gilded: cab.gilded.map((g) => ({ ...g })),
      levels: cloneLevels(cab.levels ?? emptyLevels()),
      chips: cab.startChips ?? CHIPS.start,
    },
    records: [],
    over: false,
    won: false,
    pendingSpoils: null,
    shopRerolls: 0,
    cabinet,
    act: 1,
    pendingLegend: null,
    actIntro: false,
    stake: Math.max(0, Math.min(MAX_STAKE, stake)),
    act3,
  };
  run.pendingStart = startRelics(run);
  return run;
}

/** The starting pick: up to 2 of your machine's relics that fit now, then a general common one. */
export function startRelics(run: RunState): RelicId[] {
  const rng = new Rng((run.seed ^ 0x51a27) >>> 0);
  const fits = (r: RelicId) => relicFits(run, r) && !LEGENDARY.has(r) && !ELITE_ONLY.has(r) && !WAVE1.has(r);
  const mine = rng.shuffle((Object.keys(RELICS) as RelicId[]).filter((r) => RELICS[r].machine === run.cabinet && !RELICS[r].addon && fits(r))).slice(0, 2);
  const general = RELIC_TIER.common.filter((r) => !isIdentityRelic(r) && fits(r));
  return [...mine, ...rng.shuffle(general)].slice(0, 3);
}

/** What's been turned down this act (a new act starts a clean list). */
export function passedThisAct(run: RunState): Set<string> {
  return new Set(run.passed?.act === run.act ? run.passed.keys : []);
}
/** Note offers turned down this act. */
export function passOn(run: RunState, keys: string[]): void {
  const keep = run.passed?.act === run.act ? run.passed.keys : [];
  run.passed = { act: run.act, keys: [...new Set([...keep, ...keys])] };
}

export function takeStart(run: RunState, relic: RelicId): void {
  if (!run.pendingStart?.includes(relic)) return;
  if (!run.player.relics.includes(relic)) run.player.relics.push(relic);
  run.startRelic = relic;
  run.pendingStart = null;
}

export const cloneLevels = (l: Levels): Levels => ({ sym: { ...l.sym }, charm: { ...l.charm } });


export type RelicTier = 'common' | 'uncommon' | 'legendary';

/** The deck can't remember more marks than this. */
const DECK_MARKS_CAP = 6;

/** Acts in this run: RED stake and up adds act 3 (THE DEALER). The demo ends at act 1's boss (src/demo.ts). */
export const runActs = (run: RunState) => Math.min(demo().acts, run.stake >= STAKE.act3 ? 3 : ACTS);
/** A run fight's seed, from the run and the fight: a run resumed after a quit replays the same fight. */
export const fightSeed = (runSeed: number, act: number, depth: number, loop = 0) =>
  (runSeed ^ Math.imul(act * 131 + depth * 17 + loop * 7919 + 1, 0x9e3779b1)) >>> 0;
/** Fights an act holds on a typical route (the opener, 3 on the route, the boss): routes vary, so this is a guide. */
export const TYPICAL_ACT_FIGHTS = 5;
/** Fights in this run, bosses included: the acts behind you as fought, this act's as mapped, the rest typical. */
export function totalFights(run: RunState): number {
  const before = run.records.filter((r) => r.won && (r.act ?? 1) < run.act).length;
  const here = run.route === null && run.map.routes.length > 1 ? TYPICAL_ACT_FIGHTS : run.enemies.length;
  const after = Math.max(0, Math.min(runActs(run), 3) - Math.min(run.act, 3)) * TYPICAL_ACT_FIGHTS;
  return run.endless ? before + here : before + here + after;
}
/** The HUD's fight label: ACT 2 FIGHT 3/6 (the act's fights on your route), BOSS, or the endless loop's. */
export function fightLabel(run: RunState): string {
  // Before the path is picked the act's length isn't known yet: just FIGHT 1 (it read FIGHT 1/?: feel playtest).
  const n = run.route === null && run.map.routes.length > 1 ? `FIGHT ${run.depth + 1}` : `FIGHT ${run.depth + 1}/${run.enemies.length}`;
  // ENDLESS: TONIGHT'S RULE rides along, so it's on screen in every fight.
  const night = nightOf(run);
  // (Short: the long form ran across both reel frames. Playtest.)
  if (run.endless) return `LOOP ${run.endless.loop}${isBossNext(run) ? ' BOSS' : ''}${night ? `: ${night.title}` : ''}`;
  if (isBossNext(run)) return 'BOSS';
  return `ACT ${run.act} ${n}`;
}
/** 1-based fight number across the whole run (the fight you're on, or the one you fell at). */
export const fightNumber = (run: RunState) => run.records.filter((r) => r.won).length + 1;

/** The act's boss fell: a new map, a full heal, and a legendary pick. */
function startNextAct(run: RunState): void {
  run.act++;
  const rng = new Rng((run.seed ^ Math.imul(run.act, 0x3c6ef372)) >>> 0);
  setMap(run, generateActMap(rng, run.act, 1, run.cabinet));
  // BLUE stake: your counter waits on every act 2 route (marked on its card).
  if (run.stake >= STAKE.counterForks) offerCounter(run, rng);
  run.player.hp = run.player.maxHp;
  run.actIntro = true;
  // Act 3 (THE DEALER): a full heal and the Cashier — the legendary pick stays act 2's decision.
  if (run.act > 2) return;
  const pool = [...LEGENDARY].filter((r) => !run.player.relics.includes(r) && relicFits(run, r));
  queueLegendPick(run, legendPick(run, rng, pool));
}

const legendsFor = (run: RunState) => [...LEGENDARY].filter((r) => !run.player.relics.includes(r) && relicFits(run, r));
const relicsFor = (run: RunState) => (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && !LEGENDARY.has(r) && !ELITE_ONLY.has(r) && relicFits(run, r));

/** A relic pick to show: now, or after the one already waiting (PUNCH CARD's can land on the same win). */
function queueLegendPick(run: RunState, picks: RelicId[]): void {
  if (!picks.length) return;
  if (run.pendingLegend?.length) (run.legendQueue ??= []).push(picks);
  else {
    run.pendingLegend = picks;
    markLegends(run, picks);
  }
}

/** A legendary pick: 3 legendaries, topped up with normal relics when fewer are left (user, 2026-10-12: deep ENDLESS
 * picks showed one card). */
function legendPick(run: RunState, rng: Rng, legends: RelicId[]): RelicId[] {
  const out = rng.shuffle(legends).slice(0, RUN.legendPick);
  if (out.length < RUN.legendPick) out.push(...rng.shuffle(relicsFor(run).filter((r) => !out.includes(r))).slice(0, RUN.legendPick - out.length));
  return out;
}
const legendKey = (run: RunState) => `${run.act}:${run.endless?.loop ?? 0}`;
/** A legendary the act's legendary pick already showed (playtest: it came back at the Cashier the same act). */
/** Remember the legendaries a pick showed this act / loop (the act's, PUNCH CARD's). */
const markLegends = (run: RunState, relics: RelicId[] | null | undefined) => {
  if (!relics?.length) return;
  const key = legendKey(run);
  if (run.legendSeen?.key !== key) run.legendSeen = { key, relics: [] };
  for (const r of relics) if (LEGENDARY.has(r) && !run.legendSeen.relics.includes(r)) run.legendSeen.relics.push(r);
};
export const legendShown = (run: RunState, r: RelicId) => run.legendSeen?.key === legendKey(run) && run.legendSeen.relics.includes(r);

/** What answers your build: a charm build or any meter → the Counterfeiter. (The Grounder is retired, 2026-10-12.) */
export function counterFor(run: RunState): string | null {
  const charms = run.player.gilded.reduce((a, g) => a + g.n, 0);
  if (charms >= 4) return 'counterfeiter';
  return CABINETS[run.cabinet].meter ? 'counterfeiter' : null;
}


/** BLUE stake: your counter takes a regular fight on every act 2 route (after its first stop), marked YOUR COUNTER. */
function offerCounter(run: RunState, rng: Rng): void {
  const id = counterFor(run);
  const arch = id ? ARCHETYPES.find((a) => a.id === id) : undefined;
  if (!arch || run.act !== 2) return;
  for (const route of run.map.routes) {
    const had = route.findIndex((st) => st.kind === 'fight' && st.enemy?.archetype === id);
    const i = had >= 0 ? had : route.findIndex((st, k) => k > 0 && st.kind === 'fight');
    if (i < 0) continue;
    if (had < 0) route[i] = { kind: 'fight', enemy: makeEnemy(arch, route[i].enemy!.depth, rng, false, run.act) };
    route[i].enemy!.counter = true;
  }
}

/** A new act's (or loop's) map: back to its opener. A single-route map (endless) is picked for you. */
export function setMap(run: RunState, map: ActMap): void {
  run.map = map;
  run.depth = 0;
  run.stop = 0;
  run.route = null;
  run.enemies = [map.opener];
  if (map.routes.length === 1) chooseRoute(run, 0);
}

/** Every stop of this act in order: the opener, the picked route (if any), the Cashier, the boss. */
export function actStops(run: RunState): Stop[] {
  const m = run.map;
  const route = run.route === null ? [] : (m.routes[run.route] ?? []);
  return [{ kind: 'fight', enemy: m.opener }, ...route, ...(m.shopBeforeBoss ? [{ kind: 'shop' as const }] : []), { kind: 'fight', enemy: m.boss }];
}
/** The stop you're at (null while a route waits to be picked). */
export const currentStop = (run: RunState): Stop | null => (needsRoute(run) ? null : (actStops(run)[run.stop] ?? null));
/** The opener is done and the act has routes to pick from. */
export const needsRoute = (run: RunState) => !run.over && run.route === null && run.stop >= 1;
/** Pick route `i`: its fights join the act's fight list (the opener first, the boss last). */
export function chooseRoute(run: RunState, i: number): void {
  run.route = Math.max(0, Math.min(run.map.routes.length - 1, i));
  run.enemies = actStops(run).filter((st) => st.enemy).map((st) => st.enemy!);
  // ENDLESS: the path's rule is tonight's.
  if (run.endless?.nights?.[run.route]) run.endless.night = run.endless.nights[run.route];
}
/** Jump to this act's boss (tests and the dev console): the first route if none is picked yet. */
export function skipToBoss(run: RunState): void {
  if (run.route === null) chooseRoute(run, 0);
  run.depth = run.enemies.length - 1;
  run.stop = actStops(run).length - 1;
  run.actIntro = false;
}
/** The stop is a gamble waiting to be played. */
export const isEncounterNow = (run: RunState) => !run.over && !run.actIntro && currentStop(run)?.kind === 'encounter';
/**
 * Play the encounter at this stop (choice `i`; the last is WALK AWAY; `bet` for games that take a chip bet). A game
 * with plays left keeps you at the stop (`more`); otherwise you move on. Deterministic per stop and play.
 */
export function playEncounter(run: RunState, i: number, bet?: number): EncounterResult | null {
  const st = currentStop(run);
  if (!isEncounterNow(run) || !st) return null;
  const relics = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && relicFits(run, r) && !LEGENDARY.has(r) && !ELITE_ONLY.has(r));
  // An upgrade: a level for a symbol or Charm you own (the same cards the drafts deal), picked from the stop's stream.
  const upRng = encounterRng(run).fork().fork();
  const upgrade = (): string | null => {
    const opts = levelOptions(run);
    if (!opts.length) return null;
    const o = upRng.pick(opts);
    // Named BEFORE it's applied: a level card names the level it gives (after, it named the one after that: a
    // GOLD CHARM LV2 win read LV3. Playtest).
    const title = describeOption(o, run).title;
    applyOption(run, o, false);
    return title;
  };
  // A pair of Charms (CLAW MACHINE): a CHARM card the drafts could deal, from the same stream.
  const charm = (): string | null => {
    const opts = charmOptions(run, 2);
    if (!opts.length) return null;
    const o = upRng.pick(opts);
    const title = describeOption(o, run).title;
    applyOption(run, o, false);
    return title;
  };
  const def = encounterOf(st.encounter);
  const chipsBefore = run.player.chips;
  const result = def.play(run, i, encounterRng(run), { relics, upgrade, charm }, bet);
  // THE RUN SCORE counts chips an encounter paid out (net of its stake).
  if (run.player.chips > chipsBefore) run.chipsEarned = (run.chipsEarned ?? 0) + run.player.chips - chipsBefore;
  (run.encounters ??= []).push({ act: run.act, id: st.encounter ?? '?', choice: i, good: result.good, what: [result.title, result.text].filter(Boolean).join(' '), ...(result.more ? { more: true } : {}) });
  // A game with plays left (and something to play with) keeps you here; walking away, or the last play, moves on.
  const played = (run.encounterPlays ?? 0) + 1;
  // (A game that says for itself whether it goes on, like HIGHER OR LOWER, decides; others go by their play count.)
  const open = result.more ?? (!!def.plays && result.good !== null && played < def.plays + extraPlays(run) && encounterChoices(run).some((c, k, all) => k < all.length - 1 && !c.disabled));
  if (open) {
    run.encounterPlays = played;
    result.more = true;
  } else {
    run.encounterPlays = 0;
    run.encounterState = undefined;
    passStop(run);
  }
  return result;
}
/** The encounter at this stop's choices (its buy-in cards), as the screen and the bot see them. */
export const encounterChoices = (run: RunState): EncounterChoice[] => {
  const st = currentStop(run);
  return st?.kind === 'encounter' ? encounterOf(st.encounter).choices(run, encounterRng(run)) : [];
};
/** Leave a non-fight stop (a Cashier on the route, or an encounter): on to the next stop. */
export function passStop(run: RunState): void {
  const st = currentStop(run);
  if (st && !st.enemy) run.stop++;
}

/** RED stake (SCARS): scar rocks land reel 3, then 2, then 1 (reel 1 carries every pair, so it's hit last). */
export function scarReel(run: RunState): number {
  const scars = run.records.filter((r) => r.scar !== undefined).length;
  return 2 - (scars % 3);
}

export function takeLegend(run: RunState, relic: RelicId): void {
  if (!run.pendingLegend?.includes(relic)) return;
  if (!run.player.relics.includes(relic)) run.player.relics.push(relic);
  const last = run.records.at(-1);
  if (last) last.eliteRelic = relic;
  // PUNCH CARD: a relic pick waiting behind this one (owned relics dropped from it).
  const next = run.legendQueue?.shift()?.filter((r) => !run.player.relics.includes(r));
  run.pendingLegend = next?.length ? next : null;
  markLegends(run, run.pendingLegend);
}

export const currentEnemy = (run: RunState): EnemyDef => run.enemies[Math.min(run.depth, run.enemies.length - 1)];
export const isBossNext = (run: RunState) => !needsRoute(run) && !!currentEnemy(run)?.isBoss;

/** Enemy symbols that write on your machine (for the WRITER house edge). */



/** Interest paid after a win on the chips you hold then (chips on the table don't count). */
export const interestOn = (chips: number) => Math.min(CHIPS.interestCap, Math.floor(chips / CHIPS.interestPer));

/**
 * THE RUN SCORE (user, 2026-10-14: a score from everything a run did, not chips held): fights won, elites and bosses
 * beaten, chips EARNED (spending never costs score), levels gained, relics and Charms held, THE OWNER's HP taken and
 * beating him, clearing the run; all x(1 + 0.5 a stake). The same formula for every run, ENDLESS or not.
 */
export const SCORE = { fight: 100, elite: 300, boss: 1000, chip: 2, level: 100, relic: 100, legendary: 250, charm: 25, ownerRung: 2500, ownerBeat: 10000, clear: 2000, stakeStep: 0.5 };
/** The score's parts (label, points before the stake), in the order the run-over screen lists them. */
export function scoreParts(run: RunState): [string, number][] {
  const won = run.records.filter((r) => r.won);
  const bosses = won.filter((r) => r.boss).length;
  const elites = won.filter((r) => r.elite).length;
  const relics = run.player.relics.length;
  const legends = run.player.relics.filter((r) => LEGENDARY.has(r)).length;
  const charms = run.player.gilded.reduce((a, g) => a + g.n, 0);
  const owner = run.endless?.ownerTaken ?? 0;
  const parts: [string, number][] = [
    ['FIGHTS', (won.length - bosses - elites) * SCORE.fight],
    ['ELITES', elites * SCORE.elite],
    ['BOSSES', bosses * SCORE.boss],
    ['CHIPS EARNED', (run.chipsEarned ?? 0) * SCORE.chip],
    ['LEVELS', levelsGained(run) * SCORE.level],
    ['RELICS', (relics - legends) * SCORE.relic + legends * SCORE.legendary],
    ['CHARMS', charms * SCORE.charm],
    // THE OWNER's ladder: each rung climbed scores (ownerTaken is how far up it, 0-1).
    ['THE OWNER', Math.floor(owner * OWNER_LADDER.rungs + 1e-9) * SCORE.ownerRung + (run.endless?.turbo ? SCORE.ownerBeat : 0)],
    ['CLEARED', run.won || run.endless ? SCORE.clear : 0],
  ];
  return parts.filter(([, n]) => n > 0);
}
/** The run's score: its parts x the stake. */
export const runScoreOf = (run: RunState) => Math.round(scoreParts(run).reduce((a, [, n]) => a + n, 0) * (1 + SCORE.stakeStep * run.stake));
/** (Kept for the ENDLESS screens: the same score.) */
export const endlessScore = runScoreOf;

const rocksIn = (s: StripCounts[]) => s.reduce((a, x) => a + (x.rock ?? 0), 0);

/** Fold a finished fight back into the run: HP carry-over, capped permanent rocks, healing. */
export function finishFight(run: RunState, fight: Fight): FightRecord {
  const p = fight.sides.player;
  const won = fight.winner === 'player';
  const before = run.player.hp;
  const old = run.player.strips;
  const next = p.reels.map((r) => stripCounts(r));
  // The chase symbols only ride along for the fight.
  for (const s of next) for (const sym of BONUS_SYMBOLS) delete s[sym];
  // WILDS a fight adds are for that fight only: HOUSE OF CARDS' and LUCKY NIGHT's (TONIGHT'S RULE) were kept for good
  // (feel playtest #2: HOUSE OF CARDS took JOKER from 2 WILDS a reel to 9-13 in one act).
  next.forEach((s, i) => {
    const had = old[i]?.wild ?? 0;
    if ((s.wild ?? 0) > had) s.wild = had || undefined;
    if (!s.wild) delete s.wild;
  });
  // Rocks are real cells for the fight. Afterwards they crumble, except an elite's: a couple of those stay for good
  // (user, 2026-10-12: permanent rocks cost far too much for a normal enemy).
  let extra = rocksIn(next) - rocksIn(old) - (currentEnemy(run).elite ? RUN.permanentRocksPerFight : 0);
  let crumbled = 0;
  while (extra > 0) {
    const r = next.map((s, i) => ({ i, gained: (s.rock ?? 0) - (old[i]?.rock ?? 0) })).sort((a, b) => b.gained - a.gained)[0];
    if (r.gained <= 0) break;
    next[r.i].rock = (next[r.i].rock ?? 0) - 1;
    extra--;
    crumbled++;
  }
  run.player.strips = next;
  normalizeCharms(run.player);
  // RED stake (SCARS): every 2nd win leaves a permanent rock on your best reel.
  const wins = run.records.filter((r) => r.won).length + (fight.winner === 'player' ? 1 : 0);
  let scar: number | undefined;
  if (fight.winner === 'player' && run.stake >= STAKE.scars && wins % STAKE.scarEvery === 0) {
    scar = scarReel(run);
    next[scar].rock = (next[scar].rock ?? 0) + 1;
  }
  const record: FightRecord = {
    depth: run.depth,
    enemy: currentEnemy(run).name ?? '?',
    archetype: currentEnemy(run).archetype,
    won,
    turns: fight.turn,
    hpBefore: before,
    hpAfter: p.hp,
    portrait: currentEnemy(run).portrait,
    act: run.act,
    ...(run.endless ? { loop: run.endless.loop } : {}),
    ...(currentEnemy(run).isBoss ? { boss: true } : {}),
    ...(currentEnemy(run).elite ? { elite: true } : {}),
    ...(scar !== undefined ? { scar } : {}),
    rocksAdded: Math.max(0, rocksIn(next) - rocksIn(old)),
    rocksCrumbled: crumbled,
  };
  run.records.push(record);
  // THE OWNER: how far up his ladder you climbed (the score counts each rung).
  if (run.endless && currentEnemy(run).turbo) {
    const e = fight.sides.enemy;
    run.endless.ownerTaken = Math.max(run.endless.ownerTaken ?? 0, ladderFrac(e.maxHp - Math.max(0, e.hp)));
  }
  if (!won) {
    run.player.hp = 0;
    run.over = true;
    return record;
  }
  // The Mimic's gulps come out first (so the "+N chips" line is honest).
  if (fight.chipsEaten) {
    const eaten = Math.min(run.player.chips, fight.chipsEaten);
    run.player.chips -= eaten;
    record.chipsEaten = eaten;
  }
  // MIDAS: the chips his gold bars paid this fight.
  if (fight.midasChips) run.player.chips = Math.max(0, run.player.chips + fight.midasChips);
  // LUCRE: the chips its groups paid this fight (a win only: a lost fight ends the run).
  if (fight.lucreChips) run.player.chips += fight.lucreChips;
  // GLASS: the Charms that shattered are gone for good.
  for (const b of fight.shattered) {
    const g = run.player.gilded.find((x) => x.enh === 'glass' && x.reel === b.reel && x.symbol === b.symbol && x.n > 0);
    if (g) g.n--;
  }
  run.player.gilded = run.player.gilded.filter((g) => g.n > 0);
  // HOUSE TAX: the enemy's jackpots paid you. GOLDEN PARACHUTE: its price.
  if (fight.taxChips) run.player.chips += fight.taxChips;
  // THE LONG GAME / CRUSADE: every win since you got it adds to its pay.
  if (run.player.relics.includes('longgame')) run.longGame = (run.longGame ?? 0) + 1;
  if (run.player.relics.includes('crusade')) run.crusadeWins = (run.crusadeWins ?? 0) + 1;
  // PUNCH CARD: every 10th fight you win, a legendary pick.
  if (run.player.relics.includes('punchcard')) {
    run.punches = (run.punches ?? 0) + 1;
    if (run.punches >= NEW_RELIC.punchEvery) {
      run.punches = 0;
      // (Once every legendary is yours, it tops up with normal relics like the act's pick does.)
      queueLegendPick(run, legendPick(run, new Rng((run.seed ^ Math.imul(run.records.length + 7, 0x9e3779b9)) >>> 0), legendsFor(run)));
    }
  }
  // Chips: interest on what you banked, then the win, elite bonus and jackpots (overkill chips removed 2026-10-08: nothing explained them).
  const beaten = currentEnemy(run);
  const interest = interestOn(run.player.chips);
  // OPEN BAR (legendary relic): wins pay no chips (interest still does).
  const winChips = (run.player.relics.includes('openbar') ? 0 : CHIPS.win + (CABINETS[run.cabinet].chipsPerWin ?? 0) + (beaten.elite ? CHIPS.eliteBonus : 0) + fight.playerJackpots * CHIPS.perJackpot) * (nightId(run) === 'limit' ? 2 : 1);
  const earned = interest + winChips;
  run.player.chips += earned;
  // (THE WHEEL: the chips your sweeps won came in with the fight's mid-fight chips; the line counts them.)
  record.chips = earned + fight.lucreChips + fight.betChips + fight.taxChips - fight.parachuteChips;
  // (THE WHEEL's sweeps and GOLDEN PARACHUTE's price are already in the fight's mid-fight chips: count them once.
  // Stress test 2026-11-02: sweeps counted twice, the parachute's price taken twice.)
  run.chipsEarned = (run.chipsEarned ?? 0) + Math.max(0, record.chips - fight.betChips + fight.parachuteChips) + Math.max(0, fight.midasChips);
  // THE REPO MAN fell: his bounty.
  if (beaten.archetype === REPO_MAN.id) {
    // His bounty (the fork he replaced could have paid an elite's spoils).
    run.player.chips += GATEKEEPER.bounty;
    record.chips = (record.chips ?? 0) + GATEKEEPER.bounty;
  }
  // Elites offer their spoils in every act: choose 1 of 2 relics (map rework 2026-10-12; act 2 elites paid chips).
  if (beaten.elite) {
    const fits = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && relicFits(run, r) && !LEGENDARY.has(r));
    // A relic turned down this act isn't offered again this act (TOWER SHIELD came up 3 times: expert playtest 2026-11-06).
    const passed = passedThisAct(run);
    const fresh = fits.filter((r) => !passed.has(`relic:${r}`));
    const pool = fresh.length >= 2 ? fresh : fits;
    const rng = new Rng((run.seed ^ Math.imul(run.depth + 7 + run.act * 100, 0x85ebca6b)) >>> 0);
    const spoils = pickRelics(pool, 2, rng);
    if (spoils.length) run.pendingSpoils = spoils;
  }
  // No heal after a fight (user, 2026-10-12): HP carries from fight to fight; the act's boss heals you fully.
  // GLASS CANNON: no healing between fights at all (heal cards, the Cashier, BANDAGE).
  let hp = p.hp;
  // THE DECK REMEMBERS: the Card Sharp's marks carry into the Dealer fight.
  // The Dealer's own marks don't carry on; the deck resets once it falls.
  run.deckMarks = beaten.boss === 'dealer' ? 0 : Math.min(DECK_MARKS_CAP, (run.deckMarks ?? 0) + fight.marksPlaced);
  if (run.player.relics.includes('bandage') && !noHealing(run)) hp += BANDAGE_HEAL;
  // (BANK VAULT is gone, user 2026-10-12: a GOLD Charm every win made BANKROLL's late fights one spin.)
  // DEVIL'S DUE (legendary relic): every win takes its toll.
  if (run.player.relics.includes('devilsdue')) {
    run.player.maxHp = Math.max(UNIT, run.player.maxHp - unitsRound(run.player.maxHp * LEGEND_RELIC.devilDecay));
  }
  // (A win never leaves you at 0 HP: a backstop for any double knock-out.)
  run.player.hp = Math.max(1, Math.min(run.player.maxHp, hp));
  run.depth++;
  run.stop++;
  if (beaten.isBoss) {
    // A BOSS PAYS A PLANET (2026-10-15): your attack symbol goes up a level (two with STAR CHART). Uncapped levels are
    // the run's long scaling now, and every act's boss is a step up it.
    const bossLevels = CABINETS[run.cabinet].bossLevels ?? RUN.bossLevels;
    if (!beaten.turbo && bossLevels > 0) {
      const atk = CABINETS[run.cabinet].attack;
      run.player.levels.sym[atk] = symLevel(run.player.levels, atk) + bossLevels * levelStep(run);
      record.bossLevel = atk;
    }
    if (run.endless && beaten.turbo) {
      // THE OWNER falls: the run is over, and won (the pot pays TURBO.potMul times).
      run.endless.pot = nextPot(run.endless.pot) * TURBO.potMul;
      run.endless.loop++;
      run.endless.turbo = true;
      run.over = true;
      run.won = true;
    } else if (run.endless) {
      run.endless.pot = nextPot(run.endless.pot);
      run.endless.loop++;
      startEndlessLoop(run);
    } else if (run.act < runActs(run)) startNextAct(run);
    else {
      run.over = true;
      run.won = true;
    }
  }
  return record;
}
