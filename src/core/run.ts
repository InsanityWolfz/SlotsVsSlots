import { BLADES, cloneConfig, symLabel, emptyLevels, UNIT, unitsRound, type AbilityDef, type Enh, type GameConfig, type Gild, type Levels, type RelicId, type StripCounts, type SymbolId } from './config';
import { ACTS, actLength, ARCHETYPES, ELITE_DMG_MUL, GATEKEEPER, generateActMap, makeEnemy, REPO_MAN, TUNE, TURBO, type ActMap, type EnemyDef, type Stop, ENDLESS, endlessMul, ROUTES_PER_LOOP, WHEEL, LOOP_GROWTH } from './enemies';
import { effectiveAbility, MAX_STAKE, STAKE, stakeDmg } from './stakes';
import type { Fight } from './fight';
import {
  BANDAGE_HEAL,
  BELL_MULT,
  KEY_MULT,
  BUILD_ENABLER,
  ELITE_ONLY,
  NEW_RELIC,
  LEGEND_RELIC,
  MACHINE_EXCLUDE,
  WAVE1,
  relicText,
  LEGENDARY,
  RELIC_TIER,
  RELICS,
  type Enabler,
} from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { ENCOUNTERS, encounterOf, encounterRng, extraPlays, type EncounterChoice, type EncounterResult } from './encounters';
import { CHARM_SYMBOLS, charmLevel, charmRuleText, charmShortText, charmTag, charmValue, playerSymValue, symLevel, symValue, charmName } from './charms';
import { Rng } from './rng';
import { scoreLine } from './scoring';
import { BONUS_SYMBOLS, stripCounts } from './strip';

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
const wildFrom = (run: RunState): SymbolId[] => [...new Set<SymbolId>(['shield', CABINETS[run.cabinet].attack])];
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
  /** THE DEALER is unlocked (someone has beaten GREEN): runs at GREEN+ continue into act 3. */
  act3: boolean;
  /** THE DECK REMEMBERS: marked cards the Card Sharp placed this act (they follow you to the Dealer). */
  deckMarks?: number;
  /** The TUTORIAL run: its first fight is a little softer. */
  tutorial?: boolean;
  /** ENDLESS (LET IT RIDE after the Dealer): the loop you're on and its score pot. */
  endless?: { loop: number; pot: number; /** THE OWNER: the most of his HP you've taken (0-1). */ ownerTaken?: number; night?: NightId; /** TONIGHT'S RULE per path (user, 2026-10-14): picking a path picks its rule. */ nights?: NightId[]; /** Beat THE TURBO: the run's true end. */ turbo?: boolean };
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

export function takeStart(run: RunState, relic: RelicId): void {
  if (!run.pendingStart?.includes(relic)) return;
  if (!run.player.relics.includes(relic)) run.player.relics.push(relic);
  run.startRelic = relic;
  run.pendingStart = null;
}

export const cloneLevels = (l: Levels): Levels => ({ sym: { ...l.sym }, charm: { ...l.charm } });

// ---- charms on cells -------------------------------------------------------------------

/** Charmed cells of `symbol` on `reel`. */
export const charmedCells = (p: RunPlayer, reel: number, symbol: SymbolId) => p.gilded.reduce((a, g) => a + (g.reel === reel && g.symbol === symbol ? g.n : 0), 0);
/** Plain (uncharmed) cells of `symbol` on `reel`: what a charm card can target. */
export const plainCells = (p: RunPlayer, reel: number, symbol: SymbolId) => Math.max(0, (p.strips[reel]?.[symbol] ?? 0) - charmedCells(p, reel, symbol));
/** Cells you own with this charm (any reel). */
export const charmCount = (p: RunPlayer, enh: Enh) => p.gilded.reduce((a, g) => a + (g.enh === enh ? g.n : 0), 0);

/** Add `n` charms of a kind to a (reel, symbol), merging with an entry you already have. */
function addCharms(p: RunPlayer, reel: number, symbol: SymbolId, enh: Enh, n: number): void {
  const k = Math.min(n, plainCells(p, reel, symbol));
  if (k <= 0) return;
  const own = p.gilded.find((g) => g.reel === reel && g.symbol === symbol && g.enh === enh);
  if (own) own.n += k;
  else p.gilded.push({ reel, symbol, enh, n: k });
}

/** A charm lives on a cell: when cells leave a reel (swaps, removals), plain cells go first, then charmed ones. */
export function normalizeCharms(p: RunPlayer): void {
  for (let reel = 0; reel < p.strips.length; reel++)
    for (const symbol of new Set(p.gilded.filter((g) => g.reel === reel).map((g) => g.symbol))) {
      let over = charmedCells(p, reel, symbol) - (p.strips[reel][symbol] ?? 0);
      for (let i = p.gilded.length - 1; i >= 0 && over > 0; i--) {
        const g = p.gilded[i];
        if (g.reel !== reel || g.symbol !== symbol) continue;
        const k = Math.min(g.n, over);
        g.n -= k;
        over -= k;
      }
    }
  p.gilded = p.gilded.filter((g) => g.n > 0);
}


export type RelicTier = 'common' | 'uncommon' | 'legendary';

/** The deck can't remember more marks than this. */
const DECK_MARKS_CAP = 6;

/** Acts in this run: GREEN stake and up adds act 3 (THE DEALER). */
export const runActs = (run: RunState) => (run.stake >= STAKE.act3 ? 3 : ACTS);
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
const legendShown = (run: RunState, r: RelicId) => run.legendSeen?.key === legendKey(run) && run.legendSeen.relics.includes(r);

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
function setMap(run: RunState, map: ActMap): void {
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

/**
 * Saved runs from before THE WHEEL replaced THE MIRROR (2026-10-09): a CONTINUE save mid-Act 2 holds `boss: 'mirror'`.
 * Its act 2 boss becomes THE WHEEL (its real HP is sized when the fight starts, so nothing else carries over).
 */
export function migrateRun(run: RunState): RunState {
  // OVERTIME (TEST) runs (2026-10-29) are normal runs now: the clock is in every fight. (A saved SCORE RACE run is
  // dropped by the loader: game.ts loadRunSave.)
  const gone = run as { overtime?: boolean; raceTools?: unknown; racePhoenix?: boolean };
  delete gone.overtime;
  delete gone.raceTools;
  delete gone.racePhoenix;
  const fix = (e: EnemyDef | undefined): EnemyDef | undefined => {
    if (!e || ((e.boss as string) !== 'mirror' && e.archetype !== 'mirror')) return e;
    return { ...e, archetype: WHEEL.id, boss: 'wheel', name: WHEEL.name, portrait: WHEEL.portrait, blurb: WHEEL.blurb, strips: [0, 1, 2].map(() => ({ ...WHEEL.strip })), ability: WHEEL.ability ? { ...WHEEL.ability } : null };
  };
  if (run.map?.boss) run.map.boss = fix(run.map.boss)!;
  if (Array.isArray(run.enemies)) run.enemies = run.enemies.map((e) => fix(e)!);
  // Encounters that are gone become HIGHER OR LOWER: LUCKY SEVENS (2026-10-29), RAT RACE and SCRATCH-OFF (after launch),
  // the offers (THE BLOOD BANK, PAWN SHOP, LOAN SHARK; 2026-10-14, a debt is forgiven) and the coin flips (RED OR BLACK,
  // UNDER OR OVER; 2026-10-15). A game in play starts over.
  for (const route of run.map?.routes ?? [])
    for (const st of route)
      if (st.encounter && !ENCOUNTERS[st.encounter]) {
        if (st === currentStop(run)) {
          run.encounterState = undefined;
          run.encounterPlays = 0;
        }
        st.encounter = 'hilo';
      }
  delete (run as { debt?: number }).debt;
  // HOUSE EDGES, THE WEEKLY and CHALLENGES are gone (user, 2026-10-15): a saved one plays on as a normal run.
  const old = run as { weekly?: string; challenge?: string; mods?: string[]; dailyEdge?: string; endless?: { edges?: string[] } };
  delete old.weekly;
  delete old.challenge;
  delete old.mods;
  delete old.dailyEdge;
  if (old.endless) delete old.endless.edges;
  migrateBigChoices(run);
  // 24 relics were cut (user, 2026-10-15): a save holding one drops it, from its relics and from any pick waiting.
  const real = (r: RelicId) => r in RELICS;
  if (Array.isArray(run.player?.relics)) run.player.relics = run.player.relics.filter(real);
  const pick = (list: RelicId[] | null | undefined) => (Array.isArray(list) ? list.filter(real) : list);
  run.pendingSpoils = pick(run.pendingSpoils) ?? null;
  if (run.pendingSpoils && !run.pendingSpoils.length) run.pendingSpoils = null;
  if (Array.isArray(run.legendQueue)) run.legendQueue = run.legendQueue.map((q) => q.filter(real)).filter((q) => q.length);
  run.pendingLegend = pick(run.pendingLegend) ?? null;
  if (run.pendingLegend && !run.pendingLegend.length) run.pendingLegend = run.legendQueue?.shift() ?? null;
  if (Array.isArray(run.pendingStart)) {
    run.pendingStart = run.pendingStart.filter(real);
    if (!run.pendingStart.length) run.pendingStart = startRelics(run);
  }
  if (run.startRelic && !real(run.startRelic)) delete run.startRelic;
  return run;
}

/** The pre-2026-10-15 big-choice fields of a saved run (read once on load, then dropped). */
interface OldBigRun {
  pendingChoice?: unknown;
  choiceQueue?: unknown;
  choiceSets?: unknown;
  choicesSeen?: unknown;
  choicesTaken?: unknown;
  choicesRecent?: unknown;
  big?: { secondLine?: boolean; startFull?: boolean; lightningMul?: number; strikeTwice?: boolean; jackpotMul?: number; hype?: boolean; swordBonus?: number };
  glass?: boolean;
  devil?: boolean;
  bloodPact?: boolean;
  levelLock?: unknown;
  bossHpMul?: unknown;
  abilityFaster?: boolean;
  noCharms?: unknown;
  crusade?: boolean;
  noWinChips?: boolean;
  trustFund?: unknown;
}

/**
 * BIG CHOICES are gone (user, 2026-10-15). A saved run's waiting offer is dropped; the ten that became legendary relics
 * turn into those relics (THE LONG GAME and CRUSADE keep their win counts); the rest of the old fields go.
 */
function migrateBigChoices(run: RunState): void {
  const old = run as RunState & OldBigRun;
  const big = old.big && typeof old.big === 'object' ? old.big : {};
  const gain = (r: RelicId, had: unknown) => {
    if (had && !run.player.relics.includes(r)) run.player.relics.push(r);
  };
  gain('glasscannon', old.glass);
  gain('devilsdue', old.devil);
  gain('secondline', big.secondLine);
  gain('longgame', typeof run.longGame === 'number');
  gain('crusade', old.crusade);
  if (old.crusade && run.crusadeWins === undefined) run.crusadeWins = Math.max(0, Math.round((big.swordBonus ?? 0) / LEGEND_RELIC.crusadeStep));
  gain('quickening', old.abilityFaster && big.startFull);
  // CHAIN LIGHTNING was strikeTwice; MAD SCIENCE (lightningMul) was its HP-costing cousin: both become CHAIN LIGHTNING.
  gain('chainlightning', big.strikeTwice || (big.lightningMul ?? 1) > 1);
  gain('highcard', big.jackpotMul);
  gain('hypeman', big.hype);
  gain('openbar', old.noWinChips);
  if (typeof run.longGame === 'number' && !run.player.relics.includes('longgame')) delete run.longGame;
  for (const k of ['pendingChoice', 'choiceQueue', 'choiceSets', 'choicesSeen', 'choicesTaken', 'choicesRecent', 'big', 'glass', 'devil', 'bloodPact', 'levelLock', 'bossHpMul', 'abilityFaster', 'noCharms', 'crusade', 'noWinChips', 'trustFund'] as const)
    delete old[k];
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

/** The GameConfig for the run's next fight. */
/** FAST HANDS: abilities come 2 turns sooner per level (never under every 2). */
export const fastHands = (ab: AbilityDef, level = 1): AbilityDef => ({ ...ab, every: Math.max(2, ab.every - 2 * level) });

/** HOLD (user, 2026-10-29): before your spin, or during the enemy's turn, tap one of your reels to keep it for your next
 * spin. Nothing waits for it (AUTO never stops). */
export const HOLD = { perFight: 2 };

export function fightConfig(run: RunState, base: GameConfig): GameConfig {
  const cfg = cloneConfig(base);
  const e = currentEnemy(run);
  cfg.player = {
    ...cfg.player,
    hp: run.player.maxHp,
    startHp: run.player.hp,
    strips: run.player.strips.map((s) => ({ ...s })),
    gilded: run.player.gilded.map((g) => ({ ...g })),
    levels: cloneLevels(run.player.levels),
    ...(legendPayMul(run) !== 1 ? { payMul: legendPayMul(run) } : {}),
    ...(run.player.relics.includes('crusade') && (run.crusadeWins ?? 0) > 0 ? { swordBonus: LEGEND_RELIC.crusadeStep * (run.crusadeWins ?? 0) } : {}),
    chipsHeld: run.player.chips,
    // Chips no longer shield you on bosses (2026-10-07, user: too noisy).
  };
  const hp = enemyHp(run, e);
  cfg.enemy = { hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  // Elites hit harder too (2026-10-12: they were a free relic for little risk).
  // Enemy hits: x TUNE.enemyDmg (honest, the same for every machine), elites x ELITE_DMG_MUL on top.
  cfg.enemy.dmgMul = TUNE.enemyDmg * (e.elite ? ELITE_DMG_MUL : 1);
  // (A chip shield, if one ever comes back, stays capped against the bosses.)
  if (e.boss === 'wheel') cfg.player.stackShield = Math.min(BOSS_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
  cfg.relics = [...run.player.relics];
  cfg.cabinet = run.cabinet;
  cfg.stake = run.stake;
  cfg.enemy.act = run.act;
  // BLACK stake: the House plants bombs (even on your payline).
  if (e.boss === 'house' && run.stake >= STAKE.houseDirty) cfg.enemy.strips = cfg.enemy.strips.map((s) => ({ ...s, bomb: (s.bomb ?? 0) + STAKE.houseBombsPerReel }));
  if (e.boss === 'dealer') {
    cfg.player.stackShield = Math.min(BOSS_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
  }
  // BLACK and up: enemies hit harder (stakes.ts stakeDmg).
  if (stakeDmg(run.stake) !== 1) cfg.enemy.stakeDmg = stakeDmg(run.stake);
  // SECOND PAYLINE (legendary relic): its price, on the enemy's hits (its own note on the banner).
  if (run.player.relics.includes('secondline')) cfg.enemy.lineDmg = LEGEND_RELIC.lineDmg;
  // (HIGH LIMIT is in enemyHp, so the cards show the HP the fight has.)
  // ENDLESS: damage grows per loop.
  if (run.endless) {
    // The loop House is a race: it cashes its pot every 2 turns.
    if (e.boss === 'house' && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: ENDLESS.houseEvery };
    cfg.enemy.endless = true;
    cfg.enemy.loop = run.endless.loop;
    cfg.enemy.dmgMul = (cfg.enemy.dmgMul ?? 1) * endlessMul(ENDLESS.dmg, run.endless.loop);
    cfg.enemy.ability = scaledAbility(run, cfg.enemy.ability);
    // THE OWNER (the TURBO boss): hits harder on top of the loop's growth; no turn takes more than turnCap of his HP.
    if (e.turbo) {
      cfg.enemy.dmgMul *= TURBO.dmg;
      cfg.enemy.owner = true;
    }
    // VETERAN (KNIGHT) and WARM-UP (JUKEBOX): machine growth for the machines with no late multiplier (honest HP: enemies don't change).
    const cleared = run.endless.loop - 1;
    if (run.cabinet === 'knight' && cleared > 0) cfg.player.veteranMul = 1 + LOOP_GROWTH.veteran * cleared;
    if (run.cabinet === 'jukebox') cfg.player.volumeStart = LOOP_GROWTH.warmUp * run.endless.loop;
  }
  // TONIGHT'S RULE (ENDLESS: the path's), for both machines.
  const night = nightId(run);
  cfg.night = night;
  if (night === 'lucky') for (const side of [cfg.player, cfg.enemy]) side.strips = side.strips.map((s) => ({ ...s, wild: (s.wild ?? 0) + NIGHT.luckyWilds }));
  if (night === 'fast') {
    if (cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: Math.max(2, cfg.enemy.ability.every - 1) };
    cfg.player.meterMul = (cfg.player.meterMul ?? 1) * NIGHT.fastMeter;
  }
  // Every run fight is seeded from the run. A run resumed after a quit replays the same fight, so quitting can't
  // re-roll a loss (STEAM_READINESS S1). The sim seeds its own fights.
  cfg.seed = fightSeed(run.spinSeed ?? run.seed, run.act, run.depth, run.endless?.loop ?? 0);
  // QUICKENING (legendary relic): enemy abilities charge one spin faster.
  if (quickening(run) && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: Math.max(2, cfg.enemy.ability.every - 1) };
  // OVERTIME (user, 2026-10-29): every fight has the clock but THE OWNER's (he escalates every turn already). HOLD:
  // two a fight.
  if (!cfg.enemy.owner) cfg.overtime = true;
  cfg.player.holds = HOLD.perFight;
  return cfg;
}

/** THE DEALER's BUST clock (turns) in this run, as fightConfig and the fight set it: QUICKENING, the stakes. */
export function dealerEvery(run: RunState): number {
  let ab: AbilityDef = { kind: 'deal', every: 3, power: 0 };
  if (quickening(run)) ab = { ...ab, every: Math.max(2, ab.every - 1) };
  return effectiveAbility(ab, { stake: run.stake, act: 3, sandglass: run.player.relics.includes('sandglass') }).every;
}

/** Enemy symbols that write on your machine (for the WRITER house edge). */



/** Interest paid after a win on the chips you hold then (chips on the table don't count). */
export const interestOn = (chips: number) => Math.min(CHIPS.interestCap, Math.floor(chips / CHIPS.interestPer));

/**
 * ENDLESS: an enemy ability's flat heal or shield grows with the loop's HP (playtest: a loop 4 "HEALS 80" on a 50K-HP
 * elite did nothing). Its hits already grow in the fight (the loop's damage); `shown` also scales those, for the card.
 */
export function scaledAbility(run: RunState, ab: AbilityDef | null | undefined, shown = false): AbilityDef | null {
  if (!ab) return null;
  if (!run.endless) return ab;
  const loop = run.endless.loop;
  const k = ab.kind === 'bloodmoon' || ab.kind === 'fortify' ? endlessMul(ENDLESS.hp, loop) : shown && (ab.kind === 'smash' || ab.kind === 'penalty') ? endlessMul(ENDLESS.dmg, loop) : 1;
  return k === 1 ? ab : { ...ab, power: unitsRound(ab.power * k) };
}
/** THE LONG GAME: what it multiplies your pay by now (-20%, +3% a win since you got it). */
export const longGameMul = (run: RunState) => (run.player.relics.includes('longgame') ? LEGEND_RELIC.longStart + LEGEND_RELIC.longStep * (run.longGame ?? 0) : 1);
/** The legendary relics that scale all your pay: GLASS CANNON, DEVIL'S DUE, THE LONG GAME. */
export const legendPayMul = (run: RunState) =>
  (run.player.relics.includes('glasscannon') ? LEGEND_RELIC.glassPay : 1) * (run.player.relics.includes('devilsdue') ? LEGEND_RELIC.devilPay : 1) * longGameMul(run);
/** QUICKENING: a machine with a meter (not KNIGHT) holding it. */
export const quickening = (run: RunState) => run.player.relics.includes('quickening') && !!CABINETS[run.cabinet].meter;
/** GLASS CANNON: no healing between fights. */
export const noHealing = (run: RunState) => run.player.relics.includes('glasscannon');
/**
 * THE RUN SCORE (user, 2026-10-14: a score from everything a run did, not chips held): fights won, elites and bosses
 * beaten, chips EARNED (spending never costs score), levels gained, relics and Charms held, THE OWNER's HP taken and
 * beating him, clearing the run; all x(1 + 0.5 a stake). The same formula for every run, ENDLESS or not.
 */
export const SCORE = { fight: 100, elite: 300, boss: 1000, chip: 2, level: 100, relic: 100, legendary: 250, charm: 25, ownerHit: 1000, ownerBeat: 10000, clear: 2000, stakeStep: 0.5 };
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
    ['THE OWNER', Math.round(owner * TURBO.hp) * SCORE.ownerHit + (run.endless?.turbo ? SCORE.ownerBeat : 0)],
    ['CLEARED', run.won || run.endless ? SCORE.clear : 0],
  ];
  return parts.filter(([, n]) => n > 0);
}
/** The run's score: its parts x the stake. */
export const runScoreOf = (run: RunState) => Math.round(scoreParts(run).reduce((a, [, n]) => a + n, 0) * (1 + SCORE.stakeStep * run.stake));
/** (Kept for the ENDLESS screens: the same score.) */
export const endlessScore = runScoreOf;

/** LET IT RIDE: after beating the Dealer, keep going (the win is already recorded). */
export function letItRide(run: RunState): void {
  if (!run.won || run.endless) return;
  run.over = false;
  run.endless = { loop: 1, pot: 0 };
  startEndlessLoop(run);
}

/** A new endless loop: an act-style map and a boss (cycling House, THE WHEEL, Dealer). */
function startEndlessLoop(run: RunState): void {
  const loop = run.endless!.loop;
  run.act = 4;
  const rng = new Rng((run.seed ^ Math.imul(loop + 40, 0x3c6ef372)) >>> 0);
  // TONIGHT'S RULE: one per path (user, 2026-10-14: the night is part of the route choice), never last loop's; it
  // starts when you pick your path (the loop's opener plays without one).
  const nrng = rng.fork();
  run.endless!.nights = nrng.shuffle(NIGHT_IDS.filter((n) => n !== run.endless!.night)).slice(0, ROUTES_PER_LOOP);
  run.endless!.night = undefined;
  setMap(run, generateActMap(rng, 4, loop, run.cabinet));
  run.player.hp = run.player.maxHp;
  run.actIntro = false;
}

/**
 * An enemy's real HP for this run. Honest HP (2026-10-12): the same enemy has the same HP at the same stop on every
 * slot machine and every build. Machines are balanced by tuning the machines, not the enemies.
 */
/** The tutorial's first opponent has this much of its HP (you're reading callouts, not building). */
export const TUTORIAL_OPENER_MUL = 0.75;

export function enemyHp(run: RunState, e: EnemyDef): number {
  // THE OWNER: 11 HP, a hit each (no growth, no edges).
  if (run.endless && e.turbo) return TURBO.hp;
  const gold = e.isBoss && run.stake >= STAKE.fasterAll ? STAKE.goldBossHp : 1;
  const tutorial = run.tutorial && run.act === 1 && e.depth === 0 ? TUTORIAL_OPENER_MUL : 1;
  const loop = run.endless ? endlessMul(ENDLESS.hp, run.endless.loop) : 1;
  // TONIGHT'S RULE HIGH LIMIT (playtest: the cards showed the HP without it).
  const limit = nightId(run) === 'limit' ? NIGHT.limitHp : 1;
  return Math.min(ENDLESS.clamp, unitsRound(baseEnemyHp(run, e) * gold * tutorial * loop * limit));
}

function baseEnemyHp(run: RunState, e: EnemyDef): number {
  // Regulars and elites: their act's curve (enemies.ts makeEnemy).
  if (!e.isBoss) return e.hp;
  // ENDLESS: the loop bosses are a multiple of an act 3 regular's HP (then x the loop's growth).
  if (run.endless) return unitsRound(TUNE.endlessBossBase * (e.boss === 'house' ? ENDLESS.houseHp : e.boss === 'dealer' ? ENDLESS.dealerHp : ENDLESS.wheelHp));
  // GREEN+: THE WHEEL STARTS FAST (3 chips a turn), so it gets less HP.
  if (e.boss === 'wheel') return unitsRound(TUNE.wheelHp * (run.stake >= STAKE.wheelFast ? TUNE.greenWheel : 1));
  if (e.boss === 'dealer') return TUNE.dealerHp;
  return e.hp;
}
/** Saved chips shield at most this much per boss turn (hoarding guard). */
export const BOSS_CHIP_SHIELD_CAP = 4 * UNIT;

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
  // THE OWNER: how much of him you took (the score counts each 10%).
  if (run.endless && currentEnemy(run).turbo) {
    const e = fight.sides.enemy;
    run.endless.ownerTaken = Math.max(run.endless.ownerTaken ?? 0, Math.min(1, 1 - Math.max(0, e.hp) / Math.max(1, e.maxHp)));
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
  if (fight.parachuteChips) run.player.chips = Math.max(0, run.player.chips - fight.parachuteChips);
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
  run.chipsEarned = (run.chipsEarned ?? 0) + Math.max(0, record.chips) + Math.max(0, fight.midasChips);
  // THE REPO MAN fell: his bounty.
  if (beaten.archetype === REPO_MAN.id) {
    // His bounty (the fork he replaced could have paid an elite's spoils).
    run.player.chips += GATEKEEPER.bounty;
    record.chips = (record.chips ?? 0) + GATEKEEPER.bounty;
  }
  // Elites offer their spoils in every act: choose 1 of 2 relics (map rework 2026-10-12; act 2 elites paid chips).
  if (beaten.elite) {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && relicFits(run, r) && !LEGENDARY.has(r));
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
  run.player.hp = Math.min(run.player.maxHp, hp);
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

// ---- strip math (boss HP sizing and the sims) ---------------------------------------------

export interface StripStats {
  /** Expected per spin, before shields. */
  damage: number;
  /** Expected meter fill per spin (TESLA energy, MIDAS gold, JAX wilds). */
  meter: number;
  /** TESLA energy per spin (= meter for TESLA). */
  energy: number;
  shield: number;
  pairPct: number;
  jackpotPct: number;
  /** Spins per special on average. */
  spinsPerSpecial: number;
  /** VAMP healing per spin. */
  heal: number;
  /** BLAZE: extra damage on each special. */
  specialBonus: number;
  /** One payline cell paid as a jackpot of itself, on average (JAX's payoff). */
  jackpotDamage: number;
}

export function stripStats(
  strips: StripCounts[],
  base: GameConfig,
  relics: RelicId[] = [],
  gilded: Gild[] = [],
  damageCap = Infinity,
  levels: Levels = emptyLevels(),
  cabinet: CabinetId | null = null,
): StripStats {
  const cab = cabinet ? CABINETS[cabinet] : null;
  const ticket = relics.includes('ticket');
  const cv = (e: Enh) => charmValue(e, charmLevel(levels, e, ticket));
  const value = (s: SymbolId) => playerSymValue(levels, s, base.base[s]);
  // Each reel: [shown symbol, probability, the cell's own charm].
  const probs = strips.map((s, reel) => {
    const total = Object.values(s).reduce((a, n) => a + (n ?? 0), 0) || 1;
    const out: [SymbolId, number, Enh | undefined][] = [];
    for (const [sym, n] of Object.entries(s) as [SymbolId, number][]) {
      if (!n) continue;
      let plain = n;
      for (const g of gilded) {
        if (g.reel !== reel || g.symbol !== sym) continue;
        const k = Math.min(plain, g.n);
        plain -= k;
        const p = k / total;
        if (g.enh === 'lucky') {
          const c = cv('lucky') / 100;
          out.push([sym, p * (1 - c), g.enh], ['wild', p * c, g.enh]);
        } else out.push([sym, p, g.enh]);
      }
      if (plain > 0) out.push([sym, plain / total, undefined]);
    }
    return out;
  });
  const special = !cab || cab.meter?.kind === 'special';
  const alone: SymbolId = special ? 'bolt' : (cab?.attack ?? 'sword');
  const cfg = { ...base, pairRule: relics.includes('mirror') || cab?.jokerWilds ? ('anyTwo' as const) : base.pairRule };
  const out = { damage: 0, meter: 0, energy: 0, shield: 0, pairPct: 0, jackpotPct: 0, spinsPerSpecial: 0, heal: 0, specialBonus: 0, jackpotDamage: 0 };
  // BLAZE: every blaze cell you own adds to the special.
  out.specialBonus = gilded.reduce((a, g) => a + (g.enh === 'blaze' ? g.n : 0), 0) * cv('blaze');
  const meterSym = cab?.meter?.symbol;
  for (const [a, pa, ea] of probs[0])
    for (const [b, pb, eb] of probs[1])
      for (const [c, pc, ec] of probs[2]) {
        const p = pa * pb * pc;
        const line = [a, b, c];
        const enh = [ea, eb, ec];
        // (A 3-WILD line pays a jackpot of one of your symbols: counted as a sword jackpot here.)
        const sc = scoreLine(line, cfg, { value, wildAlone: alone });
        let dmg = 0;
        for (const g of sc.groups) {
          let gold = 0;
          for (const r of g.reels) {
            const e = enh[r];
            if (e === 'keen' && BLADES.has(g.symbol)) g.base += cv('keen');
            if (e === 'charged' && g.symbol === 'bolt') g.base += cv('charged');
            if (e === 'gold') gold += cv('gold');
            if (e === 'vamp' && BLADES.has(g.symbol)) out.heal += p * cv('vamp');
          }
          let mult = g.mult * (gold || 1);
          if (relics.includes('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) mult *= 2;
          if (relics.includes('key') && g.matched && g.reels.length === 2) mult *= KEY_MULT;
          if (relics.includes('bell') && g.matched && g.reels.length === 3) mult *= BELL_MULT;
          const amt = g.base * mult;
          if (BLADES.has(g.symbol)) dmg += amt;
          else if (g.symbol === 'shield') out.shield += p * amt;
          else if (g.symbol === 'bolt' && special) {
            out.energy += p * amt;
            out.meter += p * amt;
          } else if (g.symbol === meterSym) out.meter += p * amt;
        }
        if (cab?.meter?.kind === 'jackpots') out.meter += p * line.filter((s) => s === 'wild').length * (cab.meter.perWild ?? 0);
        out.damage += p * Math.min(damageCap, dmg);
        if (sc.tier === 'pair') out.pairPct += p * 100;
        if (sc.tier === 'triple') out.jackpotPct += p * 100;
      }
  // One payline cell as a jackpot of itself (swords only count as damage), averaged over the three reels.
  for (const reel of probs) for (const [s, p, e] of reel) if (BLADES.has(s) || s === 'wild') out.jackpotDamage += (p / 3) * 3 * (value(BLADES.has(s) ? s : (cab?.attack ?? 'sword')) + (e === 'keen' ? cv('keen') : 0)) * 3 * (e === 'gold' ? 3 * cv('gold') : 1);
  out.spinsPerSpecial = out.energy > 0 ? base.specialCost / out.energy : Infinity;
  return out;
}

// ---- drafting --------------------------------------------------------------------------

function keyOf(o: DraftOption): string {
  return JSON.stringify(o);
}

/** Cards that differ only by reel read as the same choice (ITERATION_8 G7). */
function similarKey(o: DraftOption): string {
  if (o.kind === 'gild') return `gild:${o.enh}:${o.symbol}`;
  if (o.kind === 'swap') return `swap:${o.from}:${o.to}`;
  if (o.kind === 'add') return `add:${o.symbol}`;
  return keyOf(o);
}

/** Relic drafts follow the act's 2nd and 4th won fights (a route with fewer fights gets fewer of these). */
/** The drafts after an act's 2nd and 4th won fights offer relics, unless that fight was an elite: its spoils were
 * already a relic pick, and two relic picks back to back made each relic feel small (feel playtest, 2026-10-15). */

/** Every CHARM card you could be offered: `n` charms on plain cells of one symbol on one reel. */
/** Symbols a charm can go on for this run. */
export function charmSymbols(_run: RunState, enh: Enh): SymbolId[] {
  return [...CHARM_SYMBOLS[enh]];
}

export function charmOptions(run: RunState, n: number, enhs: Enh[] = gildsFor(run)): DraftOption[] {
  const p = run.player;
  const out: DraftOption[] = [];
  for (const enh of enhs)
    for (const symbol of charmSymbols(run, enh))
      for (let reel = 0; reel < p.strips.length; reel++) if (plainCells(p, reel, symbol) >= n) out.push({ kind: 'gild', enh, symbol, reel, n });
  return out;
}

/** LEVEL cards you could be offered: your machine's symbols on your reels (no cap; Charms have no levels). */
export function levelOptions(run: RunState): DraftOption[] {
  const p = run.player;
  const owned = new Set(p.strips.flatMap((s) => Object.keys(s).filter((k) => (s[k as SymbolId] ?? 0) > 0)));
  return CABINETS[run.cabinet].symbols.filter((symbol) => owned.has(symbol)).map((symbol): DraftOption => ({ kind: 'symLevel', symbol }));
}

/** Levels a symbol card gives: 1, or 2 with STAR CHART. */
export const levelStep = (run: RunState) => (run.player.relics.includes('starchart') ? 2 : 1);
/** Levels gained this run over the machine's starting levels (the Cashier's level price climbs with them). */
export function levelsGained(run: RunState): number {
  const start = CABINETS[run.cabinet].levels?.sym ?? {};
  return CABINETS[run.cabinet].symbols.reduce((a, s) => a + Math.max(0, symLevel(run.player.levels, s) - (start[s] ?? 1)), 0);
}

/**
 * Three reward cards after a won fight. Relic drafts (after fights 2 and 4) show 2 relics + 1
 * other, so relic-vs-relic is the choice; the rest are strip/HP decisions. Deterministic.
 */
export function draftOffers(run: RunState): DraftOption[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 1 + (run.act - 1) * 50, 0x9e3779b1)) >>> 0);
  const p = run.player;
  const out: DraftOption[] = [];
  const push = (o: DraftOption | null) => {
    if (o && out.length < size && !out.some((x) => keyOf(x) === keyOf(o) || similarKey(x) === similarKey(o))) out.push(o);
  };
  const size = RUN.draftSize;
  const sig = sigSymbol(run);

  const swapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const from of ['rock', 'shield'] as SymbolId[]) {
        const n = s[from] ?? 0;
        if (n <= 0 || (from === 'shield' && n < 2) || from === sig) continue;
        // Only plain cells convert: a swap never eats a charm you drafted (playtest 2026-10-31: 2 SHIELDS TO BOLTS
        // took a CHIP-charmed shield).
        const plain = plainCells(p, reel, from);
        if (plain <= 0) continue;
        options.push({ kind: 'swap', from, to: sig, count: Math.min(RUN.swapCount, plain), reel });
      }
    });
    // Rocks-to-something first when you're carrying junk.
    const rocky = options.filter((o) => o.kind === 'swap' && o.from === 'rock');
    return rocky.length && rng.next() < 0.6 ? rng.pick(rocky) : options.length ? rng.pick(options) : null;
  };
  const clearCard = (): DraftOption | null => {
    const rocky = p.strips.map((s, reel) => ({ reel, n: s.rock ?? 0 })).filter((x) => x.n > 0);
    if (!rocky.length) return null;
    rocky.sort((a, b) => b.n - a.n);
    return { kind: 'clear', symbol: 'rock', reel: rocky[0].reel };
  };
  const addCard = (): DraftOption => ({ kind: 'add', symbol: sig, reel: rng.int(3), count: RUN.addCount });
  /** CHARM: N charms on plain cells of one symbol on one reel. */
  const gildCard = (): DraftOption | null => {
    const n = RUN.charmCells;
    const taken = (o: DraftOption) => out.some((x) => x.kind === 'gild' && o.kind === 'gild' && x.enh === o.enh && x.symbol === o.symbol);
    // PIVOT: when you own charms, often a charm TYPE you don't own yet (offers were too "fitted": EXPERT_PLAYTEST_2 C).
    const owned = new Set(p.gilded.map((g) => g.enh));
    const unowned = gildsFor(run).filter((e) => !owned.has(e));
    if (owned.size && unowned.length && rng.next() < RUN.pivotChance) {
      const fresh = charmOptions(run, n, [rng.pick(unowned)]).filter((o) => !taken(o));
      if (fresh.length) return rng.pick(fresh);
    }
    // EXTEND: sometimes more of a charm you already own (builds!).
    if (p.gilded.length && rng.next() < RUN.extendChance) {
      const own = charmOptions(run, n, [rng.pick(p.gilded).enh]).filter((o) => !taken(o));
      if (own.length) return rng.pick(own);
    }
    // Every Charm your machine can take is equally likely (2026-10-12, user: no machine leans to one Charm).
    const pool = gildsFor(run);
    // Act 2: the new charms show up half the time.
    const act2 = pool.filter((e) => ACT2_GILDS.includes(e));
    const enh = act2.length && rng.next() < 0.5 ? rng.pick(act2) : rng.pick(pool.filter((e) => !ACT2_GILDS.includes(e)));
    const options = charmOptions(run, n, [enh]).filter((o) => !taken(o));
    return options.length ? rng.pick(options) : null;
  };
  /** WILD: turn a shield (or rock) on a reel into a WILD. */
  const wildCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      if ((s.rock ?? 0) > 0) options.push({ kind: 'swap', from: 'rock', to: 'wild', count: Math.min(RUN.wildCount, s.rock ?? 0), reel });
      // Shields or your attack symbol to WILDS (user, content audit 2026-10-08: both directions).
      else
        for (const from of wildFrom(run))
          if (plainCells(p, reel, from) >= RUN.wildCount && (s[from] ?? 0) > RUN.wildCount) options.push({ kind: 'swap', from, to: 'wild', count: RUN.wildCount, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  /** SWAP, any direction: turn a few of one of your symbols into another (small counts). */
  const anySwapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    const syms = swappable(run);
    p.strips.forEach((s, reel) => {
      for (const from of syms)
        for (const to of syms) {
          if (from === to || (s[from] ?? 0) < RUN.anySwapCount + 1) continue;
          options.push({ kind: 'swap', from, to, count: RUN.anySwapCount, reel });
        }
    });
    return options.length ? rng.pick(options) : null;
  };

  // The draft only edits your reels: symbols in, out and across, WILDS and Charms (user, 2026-10-15: the draft and the
  // Cashier did the same job). Levels, relics and heals are the Cashier's.
  push(gildCard() ?? swapCard());
  const r = rng.next();
  push((r < 0.35 ? wildCard() : r < 0.7 ? swapCard() : null) ?? clearCard() ?? gildCard() ?? addCard());
  push((rng.next() < 0.6 ? anySwapCard() : null) ?? gildCard() ?? addCard());
  let guard = 0;
  while (out.length < RUN.draftSize && guard++ < 30) push(guard % 3 === 0 ? addCard() : guard % 3 === 1 ? swapCard() : anySwapCard());
  return out;
}

export function applyOption(run: RunState, o: DraftOption, asPick = true): void {
  const p = run.player;
  switch (o.kind) {
    case 'add':
      p.strips[o.reel][o.symbol] = (p.strips[o.reel][o.symbol] ?? 0) + (o.count ?? 1);
      break;
    case 'swap': {
      const s = p.strips[o.reel];
      const n = Math.min(o.count, s[o.from] ?? 0);
      s[o.from] = (s[o.from] ?? 0) - n;
      s[o.to] = (s[o.to] ?? 0) + n;
      break;
    }
    case 'clear':
      p.strips[o.reel].rock = 0;
      break;
    case 'relic':
      if (!p.relics.includes(o.relic)) p.relics.push(o.relic);
      break;
    case 'gild':
      addCharms(p, o.reel, o.symbol, o.enh, o.n);
      break;
    case 'symLevel':
      p.levels.sym[o.symbol] = symLevel(p.levels, o.symbol) + levelStep(run);
      break;
    case 'charmLevel':
      // (Charms have no levels now: an old save's charm level card does nothing.)
      break;
    case 'remove': {
      const n = p.strips[o.reel][o.symbol] ?? 0;
      if (n > 0) p.strips[o.reel][o.symbol] = n - 1;
      break;
    }
    case 'heal':
      p.hp = Math.min(p.maxHp, p.hp + o.amount);
      break;
    case 'maxHp':
      p.maxHp += o.amount;
      p.hp += o.amount;
      break;
  }
  // A charm lasts while its cell is on the reel.
  normalizeCharms(p);
  const last = run.records.at(-1);
  if (last && asPick) last.pick = o;
}

// ---- elite spoils & the Cashier --------------------------------------------------------

export function takeSpoils(run: RunState, relic: RelicId): void {
  if (!run.pendingSpoils?.includes(relic)) return;
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


/** Strips after taking a card (for the before/after stat line). */
export function stripsAfter(run: RunState, o: DraftOption): StripCounts[] {
  const copy: RunState = {
    ...run,
    player: {
      ...run.player,
      strips: run.player.strips.map((s) => ({ ...s })),
      relics: [...run.player.relics],
      gilded: run.player.gilded.map((g) => ({ ...g })),
      levels: cloneLevels(run.player.levels),
      chips: run.player.chips,
    },
    records: [],
  };
  applyOption(copy, o);
  return copy.player.strips;
}

const plural = (s: SymbolId, n: number) => `${symLabel(s)}${n > 1 ? 'S' : ''}`;

export const charmRule = charmRuleText;
/** LV2, or MAX at the cap. */

/** A pick or buy already taken, for the run-over table and COPY RUN: a level card says +1 LEVEL (describeOption names
 * the NEXT level, which after the pick is one too high). */
export function takenLabel(o: DraftOption): string {
  if (o.kind === 'charmLevel') return `${charmName(o.enh)} CHARM +1 LEVEL`;
  if (o.kind === 'symLevel') return `${symLabel(o.symbol)} +1 LEVEL`;
  return describeOption(o).title;
}

export function describeOption(o: DraftOption, run?: RunState): { title: string; text: string } {
  const lv = run?.player.levels;
  const ticket = !!run?.player.relics.includes('ticket');
  switch (o.kind) {
    case 'add': {
      const n = o.count ?? 1;
      return { title: `+${n} ${plural(o.symbol, n)}`, text: `ADD ${n} ${plural(o.symbol, n)} TO REEL ${o.reel + 1}` };
    }
    case 'swap':
      return { title: `${o.count} ${plural(o.from, o.count)} TO ${plural(o.to, o.count)}`, text: `ON REEL ${o.reel + 1}` };
    case 'clear':
      return { title: 'CLEAR ROCKS', text: `REMOVE ROCKS ON REEL ${o.reel + 1}` };
    case 'relic':
      // (An old save's record can name a relic that was cut: its id stands in.)
      return RELICS[o.relic] ? { title: RELICS[o.relic].name, text: relicText(o.relic, run?.cabinet) } : { title: String(o.relic).toUpperCase(), text: '' };
    case 'heal':
      return { title: 'HEAL', text: `RESTORE ${o.amount} HP` };
    case 'maxHp':
      return { title: `+${o.amount} MAX HP`, text: `GAIN ${o.amount} MAX HP AND HEAL ${o.amount} HP` };
    case 'gild':
      return {
        title: `${o.n} ${charmName(o.enh)} CHARM${o.n > 1 ? 'S' : ''}`,
        text: `REEL ${o.reel + 1} ${plural(o.symbol, o.n)}: ${charmShortText(o.enh, charmLevel(lv, o.enh, ticket))}`,
      };
    case 'symLevel': {
      const now = symLevel(lv, o.symbol);
      const next = now + (run ? levelStep(run) : 1);
      // User, content audit 2026-10-08: level cards show the step, in the symbol's own currency.
      const word = o.symbol === 'shield' ? 'SHIELD' : o.symbol === 'bolt' ? 'LIGHTNING CHARGE' : 'DAMAGE';
      return { title: `${plural(o.symbol, 2)} LV${next}`, text: `${symValue(now)} -> ${symValue(next)} ${word}` };
    }
    case 'charmLevel':
      return { title: `${charmName(o.enh)} CHARM`, text: 'CHARMS HAVE NO LEVELS NOW' };
    case 'remove':
      return { title: `-1 ${symLabel(o.symbol)}`, text: `REMOVE A ${symLabel(o.symbol)} FROM REEL ${o.reel + 1}` };
  }
}

/** The tag a charm shows at your current level (e.g. X2, +5). */
export const charmTagFor = (run: RunState, enh: Enh) => charmTag(enh, charmLevel(run.player.levels, enh, run.player.relics.includes('ticket')));
// ---- ENDLESS: TONIGHT'S RULE ------------------------------------------------------------

/**
 * TONIGHT'S RULE (user, 2026-10-14): each ENDLESS loop plays under one rule, the same for both machines, never the
 * same two loops running.
 */
export type NightId = NonNullable<GameConfig['night']>;
/** TONIGHT'S RULE numbers (fight.ts reads happy / showdown / iron). */
export const NIGHT = { limitHp: 1.15, luckyWilds: 2, fastMeter: 1.5 };
export const NIGHTS: Record<NightId, { title: string; text: string }> = {
  happy: { title: 'HAPPY HOUR', text: 'JACKPOTS PAY X2' },
  limit: { title: 'HIGH LIMIT', text: 'WINS PAY X2 CHIPS. ENEMIES HAVE +15% HP' },
  lucky: { title: 'LUCKY NIGHT', text: 'EVERY REEL HAS 2 MORE WILDS' },
  showdown: { title: 'SHOWDOWN', text: 'EVERY HIT PAYS X1.5' },
  iron: { title: 'IRON NIGHT', text: 'SHIELDS BLOCK X2' },
  fast: { title: 'FAST NIGHT', text: 'ABILITIES CHARGE 1 TURN FASTER. METERS FILL X1.5' },
};
export const NIGHT_IDS = Object.keys(NIGHTS) as NightId[];
/** TONIGHT'S RULE: what the loop plays under, for both machines. */
/** TONIGHT'S RULE in play: the ENDLESS path's. */
export const nightId = (run: RunState): NightId | undefined => run.endless?.night;
export const nightOf = (run: RunState) => { const n = nightId(run); return n ? NIGHTS[n] : null; };
/** Each loop cleared grows the pot (the ENDLESS score) by this, on top of x1.5. */
export const POT_PER_LOOP = 1500;
/** A cleared loop: the pot grows x1.5, plus POT_PER_LOOP. */
export const nextPot = (pot: number) => Math.round(pot * ENDLESS.potGrowth) + POT_PER_LOOP;
