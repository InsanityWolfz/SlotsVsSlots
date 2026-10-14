import { BLADES, cloneConfig, symLabel, emptyLevels, UNIT, unitsRound, type AbilityDef, type Enh, type GameConfig, type Gild, type Levels, type RelicId, type StripCounts, type SymbolId } from './config';
import { ACTS, actLength, ARCHETYPES, ELITE_DMG_MUL, GATEKEEPER, generateActMap, makeEnemy, REPO_MAN, TUNE, type ActMap, type EnemyDef, type Stop, ENDLESS, endlessMul, WHEEL } from './enemies';
import { effectiveAbility, MAX_STAKE, STAKE, stakeDmg } from './stakes';
import type { Fight } from './fight';
import {
  BANDAGE_HEAL,
  BELL_MULT,
  KEY_MULT,
  BUILD_ENABLER,
  ELITE_ONLY,
  NEW_RELIC,
  MACHINE_EXCLUDE,
  WAVE1,
  relicText,
  LEGENDARY,
  RELIC_TIER,
  RELICS,
  RUSH,
  type Enabler,
} from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { encounterOf, encounterRng, LOAN, type EncounterChoice, type EncounterResult } from './encounters';
import { BIG_CAP, CHARM_SYMBOLS, charmLevel, charmRuleText, charmShortText, charmTag, charmValue, LEVEL_CAP, playerSymValue, symLevel, symValue, charmName } from './charms';
import { Rng } from './rng';
import { dailyEdge, dailyFightSeed } from './daily';
import { scoreLine } from './scoring';
import { BONUS_SYMBOLS, stripCounts } from './strip';

/** Run-level tunables. */
export const RUN = {
  startHp: 32 * UNIT,
  healCard: 8 * UNIT,
  maxHpCard: 4 * UNIT,
  /** A strip can't be thinned below this many cells. */
  minStrip: 6,
  draftSize: 3,
  /** Drafts: chance a charm card is MORE of a charm you own (the rest lean to new charm types). */
  extendChance: 0.3,
  /** Drafts: chance a charm card is a charm type you DON'T own yet (a pivot), when you own some. */
  pivotChance: 0.5,
  /** Act 1 catch-up: a fight that cost at least this share of max HP adds a 4th card, a big heal. */
  catchUpLoss: 0.35,
  catchUpHeal: 0.35,
  /** Under this share of max HP, every draft holds a heal card. */
  lowHp: 0.25,
  /** ... and that heal is this share of max HP. */
  lowHeal: 0.25,
  /** Each Cashier heal bought this run costs this much more than the last. */
  healStep: 6,
  /** Rocks an ELITE adds during one fight that stay for the rest of the run; the rest (and every normal enemy's) crumble. */
  permanentRocksPerFight: 2,
  /** Drafts right after these fights (1-based) offer relics (2 relics + 1 other). */
  relicDraftsAfter: [2, 4],
  swapCount: 3,
  addCount: 2,
  wildCount: 2,
  /** Any-direction swap cards move this many cells. */
  anySwapCount: 2,
  /** Charm cards: cells charmed by a draft / wheel card, and by a Cashier item. */
  charmCells: 2,
  charmCellsShop: 3,
  /** Chance a draft's first card is a LEVEL card (when one can be offered). */
  levelCardChance: 0.35,
  /** The Cashier opens after these fights (1-based), after the draft. */
  shopAfter: [1, 3, 5],
  /** Legendary relics offered when an act's boss falls. */
  legendPick: 3,
};

/** Charms by act (act 2 unlocks LUCKY and BLAZE). CHARGED and BLAZE feed the lightning: TESLA only. */
// BULWARK (id 'spiked') retired 2026-10-07: SHIELD BASH (KNIGHT-only) is the shield-damage piece. The id stays for saves.
export const ACT1_GILDS: Enh[] = ['gold', 'keen', 'vamp', 'charged', 'lucre', 'trick', 'lucky', 'blaze', 'echo'];
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
      !run.noCharms?.includes(e) &&
      // A charm with nothing on your reels to go on is never offered (KEEN on a machine with no swords).
      charmSymbols(run, e).some((sym) => run.player.strips.some((st) => (st[sym] ?? 0) > 0)),
  );
/** Symbols this machine's swap cards move between. */
export const swappable = (run: RunState): SymbolId[] => CABINETS[run.cabinet].symbols;
/** What a WILD card can turn into wilds: shields and your attack symbol. */
const wildFrom = (run: RunState): SymbolId[] => [...new Set<SymbolId>(['shield', CABINETS[run.cabinet].attack])];
/** A removal never takes a reel's shields or attack symbols below this many. */
const REMOVE_FLOOR = 2;
/** The symbol +2 / rock-swap cards give (the signature symbol, or swords for KNIGHT and JAX). */
export const sigSymbol = (run: RunState): SymbolId => {
  const m = CABINETS[run.cabinet].meter;
  return m && m.symbol !== 'wild' ? m.symbol : CABINETS[run.cabinet].attack;
};

/** Chip economy (earning is passive, spending happens only at the Cashier). */
export const CHIPS = {
  /** Was 2 + up to 3 overkill chips; overkill removed 2026-10-08 (unexplained), +1 a fight folded in here (+2 overshot: chips/fight above the old economy). */
  win: 3,
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
  prices: { gild: 10, relic: 12, wild: 6, remove: 4, heal: 12, maxHp: 5, legend: 20, level: 12 },
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
  /** THE LOAN SHARK: chips he took after this fight, and max HP he took when the act's boss fell. */
  debtPaid?: number;
  debtHp?: number;
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
  /** The BIG CHOICES taken after this fight, by their card titles (an ENDLESS stop can take several). */
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
  /** Bonus vouchers paid out after the last fight (the screens animate these). */
  bonusLog?: BonusPayout[];
  /** The TUTORIAL run: its first fight is a little softer. */
  tutorial?: boolean;
  /** A boss fell: pick 1 of these BIG CHOICES (before the legendary pick). */
  pendingChoice?: BigChoice[] | null;
  /** ENDLESS (LET IT RIDE after the Dealer): the loop you're on and the HOUSE EDGES you've taken. */
  endless?: { loop: number; edges: EdgeId[]; pot: number; cashed?: boolean };
  /** Choices waiting behind the current one (after a loop boss: RIDE?, then a big choice, then the edge). */
  choiceQueue?: BigChoice[][];
  /** Big-choice sets already offered this run. */
  choiceSets?: number[];
  /** GLASS CANNON: paying groups x1.5, no healing between fights. */
  glass?: boolean;
  /** The Cashier's heal was bought this visit (it's once a visit). */
  healBought?: boolean;
  /** Cashier heals bought this run (each costs more). */
  healsBought?: number;
  /** BLOOD PACT: your meter fills twice as fast. */
  bloodPact?: boolean;
  /** THE DAILY RUN: the day it belongs to (its fights are seeded from the day), and the day's HOUSE EDGE. */
  daily?: string;
  dailyEdge?: EdgeId;
  /** THE WEEKLY CHALLENGE (its ISO week key, e.g. 2026-W40): fights fixed by the week, like the daily. */
  weekly?: string;
  /** A CHALLENGE run (its id, or "weekly"), and the HOUSE EDGES it plays under. */
  challenge?: string;
  mods?: EdgeId[];
  /** MASTERWORK (until 2026-10-08): these symbols can't gain levels. Old saves only. */
  levelLock?: SymbolId[];
  /** BIG CHOICES (2026-10-08): cards offered so far this run (never twice), and the fight rules they added. */
  choicesSeen?: BigChoiceId[];
  /** Big choices taken this run (gone for good), the last offers' cards (they rest a while), and every card shown. */
  choicesTaken?: BigChoiceId[];
  choicesRecent?: BigChoiceId[][];
  big?: import('./config').BigMods;
  /** DEVIL'S DUE: everything pays x2; -5% max HP after each win. */
  devil?: boolean;
  /** DOUBLE OR NOTHING: the next boss's HP multiplier (cleared when a boss falls). */
  bossHpMul?: number;
  /** Relic picks waiting behind the current one (CURSED IDOL / TREASURE after the act's legendary). */
  legendQueue?: RelicId[][];
  /** QUICKENING: enemy abilities charge one spin faster. */
  abilityFaster?: boolean;
  /** SUPERCELL: Charms never offered again. */
  noCharms?: Enh[];
  /** CRUSADE: swords +5 for every win from now on. */
  crusade?: boolean;
  /** OPEN BAR: wins pay no chips. */
  noWinChips?: boolean;
  /** TRUST FUND: chips after every win. */
  trustFund?: number;
  /** THE LOAN SHARK: chips owed (taken from winnings after each fight; settled when the act's boss falls). */
  debt?: number;
  /** Plays already made at the current encounter stop (RED OR BLACK's spins). */
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


// ---- BONUS WHEEL & RELIC RUSH ------------------------------------------------------------

export type RelicTier = 'common' | 'uncommon' | 'legendary';
export type BonusPayout =
  | { kind: 'wheel'; options: DraftOption[]; pick: number; label: string }
  | { kind: 'rush'; frames: number[][]; count: number; tier: RelicTier; relic: RelicId | null; chips: number; label: string };

/** Up to 15 distinct upgrades for the BONUS WHEEL, from the same pool as drafts. */
export function wheelOptions(run: RunState, rng: Rng): DraftOption[] {
  const p = run.player;
  const out: DraftOption[] = [];
  const push = (o: DraftOption) => {
    if (!out.some((x) => similarKey(x) === similarKey(o))) out.push(o);
  };
  for (const o of charmOptions(run, RUN.charmCells)) push(o);
  for (const o of levelOptions(run)) push(o);
  p.strips.forEach((s, reel) => {
    if ((s.rock ?? 0) > 0) push({ kind: 'clear', symbol: 'rock', reel });
    if ((s.shield ?? 0) > RUN.wildCount) push({ kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel });
    const sig = sigSymbol(run);
    if (sig !== 'shield' && (s.shield ?? 0) >= 2) push({ kind: 'swap', from: 'shield', to: sig, count: Math.min(RUN.swapCount, s.shield ?? 0), reel });
  });
  push({ kind: 'add', symbol: sigSymbol(run), reel: rng.int(3), count: RUN.addCount });
  push({ kind: 'maxHp', amount: RUN.maxHpCard });
  if (p.hp < p.maxHp && !run.glass) push({ kind: 'heal', amount: RUN.healCard });
  return rng.shuffle(out).slice(0, 15);
}


/** RELIC RUSH: 5x3 hold-and-spin. The 3 trigger symbols start stuck; 3 respins, reset by every new stick. */
export function playRush(rng: Rng): { frames: number[][]; count: number } {
  const stuck = new Set<number>();
  const first = rng.shuffle(Array.from({ length: RUSH.cells }, (_, i) => i)).slice(0, RUSH.start);
  first.forEach((i) => stuck.add(i));
  const frames: number[][] = [first];
  let respins = RUSH.respins;
  while (respins > 0 && stuck.size < RUSH.cells) {
    const fresh: number[] = [];
    for (let i = 0; i < RUSH.cells; i++) if (!stuck.has(i) && rng.next() < RUSH.stick) fresh.push(i);
    fresh.forEach((i) => stuck.add(i));
    frames.push(fresh);
    respins = fresh.length ? RUSH.respins : respins - 1;
  }
  return { frames, count: stuck.size };
}

export const rushTier = (count: number): RelicTier => (count <= RUSH.commonMax ? 'common' : count <= RUSH.uncommonMax ? 'uncommon' : 'legendary');

/** Pay a voucher: the prize is decided by its seed and applied to the run right away. */
/** collectWheel: apply the wheel's prize now (sims, tests). The game holds it for the player's COLLECT / PASS. */
export function payVoucher(run: RunState, v: { kind: 'wheel' | 'rush'; seed: number }, collectWheel = true): BonusPayout {
  const rng = new Rng(v.seed >>> 0);
  if (v.kind === 'wheel') {
    const options = wheelOptions(run, rng);
    const pick = rng.int(options.length);
    if (collectWheel) applyOption(run, options[pick], false);
    return { kind: 'wheel', options, pick, label: `WHEEL: ${describeOption(options[pick], run).title}` };
  }
  const { frames, count } = playRush(rng);
  const tier = rushTier(count);
  const owned = (r: RelicId) => run.player.relics.includes(r);
  // Your tier first; if you own them all, the next tier up, then down.
  const order: RelicTier[] = tier === 'common' ? ['common', 'uncommon', 'legendary'] : tier === 'uncommon' ? ['uncommon', 'legendary', 'common'] : ['legendary', 'uncommon', 'common'];
  let relic: RelicId | null = null;
  for (const t of order) {
    // High Roller only matters against the House.
    const pool = RELIC_TIER[t].filter((r) => !owned(r) && relicFits(run, r));
    if (pool.length) {
      relic = rng.pick(pool);
      break;
    }
  }
  if (relic) run.player.relics.push(relic);
  const chips = (count >= RUSH.cells ? RUSH.grandChips : 0) + (relic ? 0 : 10);
  run.player.chips += chips;
  return { kind: 'rush', frames, count, tier, relic, chips, label: relic ? `RUSH: ${RELICS[relic].name}` : `RUSH: +${chips} CHIPS` };
}

/** The deck can't remember more marks than this. */
const DECK_MARKS_CAP = 6;

/** Acts in this run: GREEN stake and up adds act 3 (THE DEALER). */
/** GREEN and up always go on to ACT 3 (the Dealer). */
/** Acts in this run: GREEN+ and THE DAILY RUN go on to the Dealer (act 3). */
/** THE DAILY RUN and THE WEEKLY CHALLENGE: fights fixed by the day / week, base-stake numbers, through the Dealer. */
export const fixedRun = (run: RunState) => !!(run.daily || run.weekly);
export const runActs = (run: RunState) => (run.stake >= STAKE.act3 || fixedRun(run) ? 3 : ACTS);
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
  const n = `FIGHT ${run.depth + 1}/${run.route === null && run.map.routes.length > 1 ? '?' : run.enemies.length}`;
  if (run.endless) return isBossNext(run) ? `LOOP ${run.endless.loop} BOSS` : `LOOP ${run.endless.loop} ${n}`;
  if (isBossNext(run)) return 'BOSS';
  return `${run.daily ? 'DAILY - ' : run.weekly ? 'WEEKLY - ' : run.challenge ? 'CHALLENGE - ' : ''}ACT ${run.act} ${n}`;
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
  offerChoices(run, rng);
  // Act 3 (THE DEALER): a full heal, a big choice and the Cashier — the legendary pick stays act 2's decision.
  if (run.act > 2) return;
  const pool = [...LEGENDARY].filter((r) => !run.player.relics.includes(r) && relicFits(run, r));
  run.pendingLegend = legendPick(run, rng, pool);
  markLegends(run, run.pendingLegend);
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
/** Remember the legendaries a pick showed this act / loop (every pick: the act's, HOUSE EDGE's, a big choice's). */
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
  const def = encounterOf(st.encounter);
  const result = def.play(run, i, encounterRng(run), { relics, upgrade }, bet);
  (run.encounters ??= []).push({ act: run.act, id: st.encounter ?? '?', choice: i, good: result.good, what: [result.title, result.text].filter(Boolean).join(' '), ...(result.more ? { more: true } : {}) });
  // A game with plays left (and something to play with) keeps you here; walking away, or the last play, moves on.
  const played = (run.encounterPlays ?? 0) + 1;
  // (A game that says for itself whether it goes on, like HIGHER OR LOWER, decides; others go by their play count.)
  const open = result.more ?? (!!def.plays && result.good !== null && played < def.plays && encounterChoices(run).some((c, k, all) => k < all.length - 1 && !c.disabled));
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
  const fix = (e: EnemyDef | undefined): EnemyDef | undefined => {
    if (!e || ((e.boss as string) !== 'mirror' && e.archetype !== 'mirror')) return e;
    return { ...e, archetype: WHEEL.id, boss: 'wheel', name: WHEEL.name, portrait: WHEEL.portrait, blurb: WHEEL.blurb, strips: [0, 1, 2].map(() => ({ ...WHEEL.strip })), ability: WHEEL.ability ? { ...WHEEL.ability } : null };
  };
  if (run.map?.boss) run.map.boss = fix(run.map.boss)!;
  if (Array.isArray(run.enemies)) run.enemies = run.enemies.map((e) => fix(e)!);
  // FEEDBACK is gone (user, 2026-10-13: MIXTAPE already keeps the record from skipping): a save offering it drops it.
  const gone = (c: { id: string }) => c.id !== 'feedback';
  if (Array.isArray(run.pendingChoice)) run.pendingChoice = run.pendingChoice.filter(gone);
  if (Array.isArray(run.choiceQueue)) run.choiceQueue = run.choiceQueue.map((q) => q.filter(gone)).filter((q) => q.length);
  if (run.pendingChoice && !run.pendingChoice.length) run.pendingChoice = run.choiceQueue?.shift() ?? null;
  return run;
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
  // CURSED IDOL / TREASURE: a relic pick waiting behind this one (owned relics dropped from it).
  const next = run.legendQueue?.shift()?.filter((r) => !run.player.relics.includes(r));
  run.pendingLegend = next?.length ? next : null;
  markLegends(run, run.pendingLegend);
}

export const currentEnemy = (run: RunState): EnemyDef => run.enemies[Math.min(run.depth, run.enemies.length - 1)];
export const isBossNext = (run: RunState) => !needsRoute(run) && !!currentEnemy(run)?.isBoss;

/** The GameConfig for the run's next fight. */
/** The HOUSE EDGES in play: the ones taken in endless, THE DAILY RUN's edge of the day, a weekly's mods. */
export const runEdges = (run: RunState) => new Set<EdgeId>([...(run.endless?.edges ?? []), ...(run.dailyEdge ? [run.dailyEdge] : []), ...(run.mods ?? [])]);
/** How many times an edge is in play: HOUSE EDGES stack in ENDLESS (II, III), the daily's / a weekly's count once. */
export const edgeLevel = (run: RunState, e: EdgeId) =>
  (run.endless?.edges ?? []).filter((x) => x === e).length + (run.dailyEdge === e ? 1 : 0) + ((run.mods ?? []).includes(e) ? 1 : 0);
/** FAST HANDS: abilities come 2 turns sooner per level (never under every 2). */
export const fastHands = (ab: AbilityDef, level = 1): AbilityDef => ({ ...ab, every: Math.max(2, ab.every - 2 * level) });

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
    ...(run.glass || run.devil ? { payMul: (run.glass ? BIG.glassPay : 1) * (run.devil ? BIG.devilPay : 1) } : {}),
    ...(run.bloodPact ? { meterMul: 2 } : {}),
    ...(run.big ? { big: { ...run.big } } : {}),
    // No bonus in the run's final fight: a voucher could never be spent (QA_1 B11).
    bonusSymbols: !(e.isBoss && run.act >= runActs(run)),
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
  // HOUSE EDGES bend the fight: the ones taken in endless, and THE DAILY RUN's edge of the day.
  // BLACK and up: enemies hit harder (stakes.ts stakeDmg).
  if (stakeDmg(run.stake) !== 1) cfg.enemy.stakeDmg = stakeDmg(run.stake);
  const edges = runEdges(run);
  const lvl = (e: EdgeId) => edgeLevel(run, e);
  if (edges.has('fast') && cfg.enemy.ability) cfg.enemy.ability = fastHands(cfg.enemy.ability, lvl('fast'));
  // MARKED DECK: one mark a fight, never more (user, 2026-10-14: it doesn't stack).
  if (edges.has('marked')) cfg.player.startMarks = Math.max(cfg.player.startMarks ?? 0, 1);
  if (edges.has('heal')) cfg.player.healMul = 0.5 ** lvl('heal');
  if (edges.has('rollers')) cfg.enemy.hp = unitsRound(cfg.enemy.hp * (1 + EDGE_ROLLERS * lvl('rollers')));
  // ENDLESS: damage grows per loop.
  if (run.endless) {
    // The loop House is a race: it cashes its pot every 2 turns.
    if (e.boss === 'house' && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: ENDLESS.houseEvery };
    cfg.enemy.endless = true;
    cfg.enemy.loop = run.endless.loop;
    cfg.enemy.dmgMul = (cfg.enemy.dmgMul ?? 1) * endlessMul(ENDLESS.dmg, run.endless.loop);
  }
  // THE DAILY RUN: every fight is fixed by the day, so everyone meets the same fights.
  // The daily locks its spins too (one try: the purest comparison). The weekly locks the map, enemies and offers, but
  // its spins are fresh every try: a retry used to replay the same spins (user playtest).
  // Every run fight is seeded from the run (was: the daily only). A run resumed after a quit replays the same fight,
  // so quitting can't re-roll a loss (STEAM_READINESS S1). The sim seeds its own fights.
  cfg.seed = dailyFightSeed(run.daily ? run.seed : (run.spinSeed ?? run.seed), run.act, run.depth, run.endless?.loop ?? 0);
  // QUICKENING (big choice): enemy abilities charge one spin faster.
  if (run.abilityFaster && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: Math.max(2, cfg.enemy.ability.every - 1) };
  return cfg;
}

/** THE DEALER's BUST clock (turns) in this run, as fightConfig and the fight set it: FAST HANDS, QUICKENING, the stakes. */
export function dealerEvery(run: RunState): number {
  let ab: AbilityDef = { kind: 'deal', every: 3, power: 0 };
  if (runEdges(run).has('fast')) ab = fastHands(ab, edgeLevel(run, 'fast'));
  if (run.abilityFaster) ab = { ...ab, every: Math.max(2, ab.every - 1) };
  return effectiveAbility(ab, { stake: run.stake, act: 3, sandglass: run.player.relics.includes('sandglass') }).every;
}

/** Enemy symbols that write on your machine (for the WRITER house edge). */


/** HOUSE EDGES that act at the start of a run: GLASS JAW takes its 10% of max HP. */
export function startEdges(run: RunState, edges: EdgeId[]): void {
  for (const e of edges)
    if (e === 'frail') {
      run.player.maxHp = Math.max(UNIT, run.player.maxHp - Math.round((run.player.maxHp * 0.1) / UNIT) * UNIT);
      run.player.hp = Math.min(run.player.hp, run.player.maxHp);
    }
}

/** Make a fresh run THE DAILY RUN of this day: fights fixed by the day, and the day's HOUSE EDGE. */
export function applyDaily(run: RunState, key: string): void {
  run.daily = key;
  run.dailyEdge = dailyEdge(key);
  startEdges(run, [run.dailyEdge]);
}

/** Interest paid after a win on the chips you hold then (chips on the table don't count). */
export const interestOn = (chips: number) => Math.min(CHIPS.interestCap, Math.floor(chips / CHIPS.interestPer));

/** CASH OUT: the pot plus your unspent chips x10. */
export const cashOutValue = (run: RunState) => (run.endless?.pot ?? 0) + run.player.chips * 10;

/** LET IT RIDE: after beating the Dealer, keep going (the win is already recorded). */
export function letItRide(run: RunState): void {
  if (!run.won || run.endless) return;
  run.over = false;
  run.endless = { loop: 1, edges: [], pot: 0 };
  startEndlessLoop(run);
}

/** A new endless loop: 3 fights and a boss (cycling House, THE WHEEL, Dealer), after a HOUSE EDGE pick. */
function startEndlessLoop(run: RunState): void {
  const loop = run.endless!.loop;
  run.act = 4;
  const rng = new Rng((run.seed ^ Math.imul(loop + 40, 0x3c6ef372)) >>> 0);
  setMap(run, generateActMap(rng, 4, loop, run.cabinet));
  // NO COMPS: a new loop heals only half your HP.
  const comps = edgeLevel(run, 'nocomps');
  run.player.hp = comps ? Math.min(run.player.maxHp, run.player.hp + Math.round(run.player.maxHp / 2 ** comps)) : run.player.maxHp;
  run.actIntro = false;
  // An edge you already took comes back one level up (II, III: harder, pays a tier more), up to EDGE_MAX (2026-10-12,
  // user: ENDLESS ran out of edges by loop 7). 3 offered, pick 1, each paying for its cost.
  const open = EDGES.filter((x) => edgeLevel(run, x) < edgeMax(x));
  const pick = rng.shuffle(open).slice(0, 3);
  // The reward on the card is what you'll really get (no silent swap to chips: EXPERT_PLAYTEST_5 B7).
  const p = run.player;
  const hasLegend = [...LEGENDARY].some((x) => !p.relics.includes(x) && relicFits(run, x));
  const hasRelic = (Object.keys(RELICS) as RelicId[]).some((x) => !p.relics.includes(x) && !LEGENDARY.has(x) && !ELITE_ONLY.has(x) && relicFits(run, x));
  const pay = (t: 'chips' | 'relic' | 'legend'): 'chips' | 'relic' | 'legend' => (t === 'legend' && !hasLegend ? (hasRelic ? 'relic' : 'chips') : t === 'relic' && !hasRelic ? 'chips' : t);
  const tiers = ['chips', 'relic', 'legend'] as const;
  const tierFor = (edge: EdgeId) => tiers[Math.min(2, tiers.indexOf(EDGE_TIER[edge]) + edgeLevel(run, edge))];
  const edges = pick.map((edge): BigChoice => ({ id: 'edge', edge, reward: pay(tierFor(edge)) }));
  const queue: BigChoice[][] = [];
  // After a cleared loop: RIDE AGAIN or CASH OUT the pot, then a big choice set.
  if (loop > 1) {
    queue.push([{ id: 'cashOut' }, { id: 'ride' }]);
    const set = rng.int(BIG_SETS.length);
    queue.push(rollChoices(run, set, rng));
  }
  if (edges.length) queue.push(edges);
  run.pendingChoice = queue.shift() ?? null;
  run.choiceQueue = queue;
}

/** HIGH ROLLERS: enemy HP + this per level. A HOUSE EDGE stacks up to EDGE_MAX levels. */
export const EDGE_ROLLERS = 0.3;
export const EDGE_MAX = 3;
/** MARKED DECK doesn't stack (user, 2026-10-14): one mark a fight is all it ever does. */
export const edgeMax = (e: EdgeId) => (e === 'marked' ? 1 : EDGE_MAX);
/** An edge's card at a level (II, III say what the stack does in all). */
export function edgeText(e: EdgeId, level: number): { title: string; text: string } {
  const t = EDGE_TEXT[e];
  if (level <= 1 || level > edgeMax(e)) return t;
  const title = `${t.title} ${level === 2 ? 'II' : 'III'}`;
  const text =
    e === 'fast' ? `ENEMY ABILITIES CHARGE ${2 * level} TURNS FASTER`
    : e === 'heal' ? `YOUR HEALING IN FIGHTS IS CUT TO 1/${2 ** level}`
    : e === 'rollers' ? `ENEMIES HAVE +${Math.round(EDGE_ROLLERS * level * 100)}% HP`
    : e === 'nocomps' ? `A NEW LOOP HEALS ONLY 1/${2 ** level} OF YOUR HP`
    : t.text;
  return { title, text };
}
export const EDGE_TEXT: Record<EdgeId, { title: string; text: string }> = {
  fast: { title: 'FAST HANDS', text: 'ENEMY ABILITIES CHARGE 2 TURNS FASTER' },
  marked: { title: 'MARKED DECK', text: 'EVERY FIGHT OPENS WITH 1 MARK ON YOUR REELS' },
  heal: { title: 'HOUSE CUT', text: 'YOUR HEALING IN FIGHTS IS HALVED' },
  rollers: { title: 'HIGH ROLLERS', text: 'ENEMIES HAVE +30% HP' },
  nocomps: { title: 'NO COMPS', text: 'A NEW LOOP HEALS ONLY HALF YOUR HP' },
  frail: { title: 'GLASS JAW', text: '-10% MAX HP' },
};

/**
 * An enemy's real HP for this run. Honest HP (2026-10-12): the same enemy has the same HP at the same stop on every
 * slot machine and every build. Machines are balanced by tuning the machines, not the enemies.
 */
/** The tutorial's first opponent has this much of its HP (you're reading callouts, not building). */
export const TUTORIAL_OPENER_MUL = 0.75;

export function enemyHp(run: RunState, e: EnemyDef): number {
  const gold = e.isBoss && run.stake >= STAKE.fasterAll ? STAKE.goldBossHp : 1;
  const tutorial = run.tutorial && run.act === 1 && e.depth === 0 ? TUTORIAL_OPENER_MUL : 1;
  const loop = run.endless ? endlessMul(ENDLESS.hp, run.endless.loop) : 1;
  // THE DAILY RUN plays act 3 at base-stake numbers: its act 3 (the Dealer included) is lighter.
  const daily = fixedRun(run) && run.act >= 3 && !run.endless ? TUNE.dailyAct3 : 1;
  // DOUBLE OR NOTHING (big choice): the next boss has double HP.
  const dare = e.isBoss ? run.bossHpMul ?? 1 : 1;
  return Math.min(ENDLESS.clamp, unitsRound(baseEnemyHp(run, e) * gold * tutorial * loop * daily * dare));
}

function baseEnemyHp(run: RunState, e: EnemyDef): number {
  // Regulars and elites: their act's curve (enemies.ts makeEnemy).
  if (!e.isBoss) return e.hp;
  // ENDLESS: the loop bosses are a multiple of an act 3 regular's HP (then x the loop's growth).
  if (run.endless) return unitsRound(TUNE.endlessBossBase * (e.boss === 'house' ? ENDLESS.houseHp : e.boss === 'dealer' ? ENDLESS.dealerHp : ENDLESS.wheelHp));
  // GREEN+: THE WHEEL STARTS FAST (3 chips a turn), so it gets less HP. THE DAILY RUN's WHEEL is the eased one too.
  if (e.boss === 'wheel') return unitsRound(TUNE.wheelHp * (run.stake >= STAKE.wheelFast || fixedRun(run) ? TUNE.greenWheel : 1));
  if (e.boss === 'dealer') return TUNE.dealerHp;
  return e.hp;
}
/** Saved chips shield at most this much per boss turn (hoarding guard). */
export const BOSS_CHIP_SHIELD_CAP = 4 * UNIT;

const rocksIn = (s: StripCounts[]) => s.reduce((a, x) => a + (x.rock ?? 0), 0);

/** Fold a finished fight back into the run: HP carry-over, capped permanent rocks, healing. */
/** holdWheel: BONUS WHEEL prizes wait for the player to COLLECT or PASS them (the game); sims collect. */
export function finishFight(run: RunState, fight: Fight, holdWheel = false): FightRecord {
  const p = fight.sides.player;
  const won = fight.winner === 'player';
  const before = run.player.hp;
  const old = run.player.strips;
  const next = p.reels.map((r) => stripCounts(r));
  // The chase symbols only ride along for the fight.
  for (const s of next) for (const sym of BONUS_SYMBOLS) delete s[sym];
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
    ...(scar !== undefined ? { scar } : {}),
    rocksAdded: Math.max(0, rocksIn(next) - rocksIn(old)),
    rocksCrumbled: crumbled,
  };
  run.records.push(record);
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
  // Chips: interest on what you banked, then the win, elite bonus and jackpots (overkill chips removed 2026-10-08: nothing explained them).
  const beaten = currentEnemy(run);
  const interest = interestOn(run.player.chips);
  // PIGGY BANK: more interest on what you hold.
  const piggy = run.player.relics.includes('piggy') ? Math.min(NEW_RELIC.piggyMax, Math.floor(run.player.chips / NEW_RELIC.piggyPer)) : 0;
  // OPEN BAR (big choice): wins pay no chips (interest still does). TRUST FUND: chips on top.
  const winChips = run.noWinChips ? 0 : CHIPS.win + (CABINETS[run.cabinet].chipsPerWin ?? 0) + (beaten.elite ? CHIPS.eliteBonus : 0) + fight.playerJackpots * CHIPS.perJackpot;
  const earned = interest + piggy + winChips + (run.trustFund ?? 0);
  run.player.chips += earned;
  // (THE WHEEL: the chips your sweeps won came in with the fight's mid-fight chips; the line counts them.)
  record.chips = earned + fight.lucreChips + fight.betChips;
  // THE LOAN SHARK takes what you owe out of this fight's winnings.
  if (run.debt) {
    const paid = Math.min(run.debt, Math.max(0, record.chips), run.player.chips);
    run.player.chips -= paid;
    run.debt -= paid;
    record.debtPaid = paid;
  }
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
  if (run.player.relics.includes('bandage') && !run.glass) hp += BANDAGE_HEAL;
  // (BANK VAULT is gone, user 2026-10-12: a GOLD Charm every win made BANKROLL's late fights one spin.)
  // TROPHY BELT: every win adds max HP.
  if (run.player.relics.includes('trophy')) {
    run.player.maxHp += NEW_RELIC.trophyHp;
    hp += NEW_RELIC.trophyHp;
  }
  // BIG CHOICES after a win: DEVIL'S DUE takes its toll, CRUSADE grows, DOUBLE OR NOTHING's boss is gone.
  if (run.devil) {
    run.player.maxHp = Math.max(UNIT, run.player.maxHp - unitsRound(run.player.maxHp * BIG.devilDecay));
  }
  if (run.crusade) {
    run.big ??= {};
    run.big.swordBonus = (run.big.swordBonus ?? 0) + BIG.crusadeStep;
  }
  if (beaten.isBoss) run.bossHpMul = undefined;
  run.player.hp = Math.min(run.player.maxHp, hp);
  // Bonus vouchers from this fight pay out now that you've won it (after the HP settles, so a
  // wheel HEAL / MAX HP isn't overwritten — QA_1 B2).
  run.bonusLog = fight.vouchers.map((v) => payVoucher(run, v, !holdWheel));
  if (run.bonusLog.length) record.bonuses = run.bonusLog.map((b) => b.label);
  run.depth++;
  run.stop++;
  if (beaten.isBoss) {
    // THE LOAN SHARK settles up: what's still owed comes out of your chips, and what they can't cover costs max HP.
    if (run.debt) {
      const fromChips = Math.min(run.debt, run.player.chips);
      run.player.chips -= fromChips;
      const short = run.debt - fromChips;
      if (short > 0) {
        run.player.maxHp = Math.max(UNIT, run.player.maxHp - short * LOAN.hpPerChip);
        run.player.hp = Math.min(run.player.hp, run.player.maxHp);
        record.debtHp = short * LOAN.hpPerChip;
      }
      record.debtPaid = (record.debtPaid ?? 0) + fromChips;
      run.debt = 0;
    }
    if (run.endless) {
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
export const isRelicDraft = (run: RunState) => RUN.relicDraftsAfter.includes(run.depth);

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

/** LEVEL cards you could be offered: your machine's symbols, and charms you own, below the cap. */
export function levelOptions(run: RunState): DraftOption[] {
  const p = run.player;
  const out: DraftOption[] = [];
  const owned = new Set(p.strips.flatMap((s) => Object.keys(s).filter((k) => (s[k as SymbolId] ?? 0) > 0)));
  for (const symbol of CABINETS[run.cabinet].symbols)
    if (owned.has(symbol) && symLevel(p.levels, symbol) < levelCap(run) && !run.levelLock?.includes(symbol)) out.push({ kind: 'symLevel', symbol });
  for (const enh of new Set(p.gilded.map((g) => g.enh))) if (charmLevel(p.levels, enh) < levelCap(run)) out.push({ kind: 'charmLevel', enh });
  return out;
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
  // ACT 1 CATCH-UP: a costly win adds a 4th card, a big heal (deaths at fights 2-3 were the run killer).
  const last = run.records[run.records.length - 1];
  const costly = run.act === 1 && !!last?.won && last.hpBefore - last.hpAfter >= p.maxHp * RUN.catchUpLoss && p.hp < p.maxHp;
  const size = RUN.draftSize + (costly ? 1 : 0);
  const sig = sigSymbol(run);

  const swapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const from of ['rock', 'shield'] as SymbolId[]) {
        const n = s[from] ?? 0;
        if (n <= 0 || (from === 'shield' && n < 2) || from === sig) continue;
        options.push({ kind: 'swap', from, to: sig, count: Math.min(RUN.swapCount, n), reel });
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
  /** LEVEL: +1 level to a symbol type or a charm you own. */
  const levelCard = (): DraftOption | null => {
    const options = levelOptions(run).filter((o) => !out.some((x) => keyOf(x) === keyOf(o)));
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
  const hpCard = (): DraftOption => (p.hp < p.maxHp * 0.75 && !run.glass ? { kind: 'heal', amount: RUN.healCard } : { kind: 'maxHp', amount: RUN.maxHpCard });
  const relicCard = (): DraftOption | null => {
    const pool = (Object.keys(RELICS) as RelicId[]).filter(
      (r) => !p.relics.includes(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && (run.act > 1 || !LEGENDARY.has(r)) && !legendShown(run, r) && !out.some((o) => o.kind === 'relic' && o.relic === r),
    );
    // One relic card per draft is yours: your machine's or your charms' (while any are left).
    // The identity slot draws from each machine's signature relics; wave relics compete in the open slots (with them in
  // the identity slot, BRIAR and JAX lost ~10 WHITE: their build-defining relics showed up half as often).
  const ident = pool.filter((r) => isIdentityRelic(r) && !WAVE1.has(r));
    if (ident.length && !out.some((o) => o.kind === 'relic')) return { kind: 'relic', relic: rng.pick(ident) };
    // Act 2 relic drafts lean legendary.
    const legends = pool.filter((r) => LEGENDARY.has(r));
    if (legends.length && rng.next() < 0.4) return { kind: 'relic', relic: rng.pick(legends) };
    return pool.length ? { kind: 'relic', relic: rng.pick(pool) } : null;
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

  if (isRelicDraft(run)) {
    push(relicCard());
    push(relicCard());
    push(rng.next() < 0.5 ? hpCard() : swapCard() ?? hpCard());
  } else {
    push((rng.next() < RUN.levelCardChance ? levelCard() : null) ?? gildCard() ?? swapCard());
    const r = rng.next();
    push((r < 0.35 ? wildCard() : r < 0.65 ? swapCard() : null) ?? clearCard() ?? gildCard() ?? levelCard() ?? addCard());
    push((rng.next() < 0.6 ? anySwapCard() : null) ?? hpCard());
  }
  if (size > RUN.draftSize) {
    // The catch-up heal replaces a smaller heal card already in the draft (HEAL 80 sat next to HEAL 170: EXPERT_PLAYTEST_10 D7).
    const catchUp: DraftOption = { kind: 'heal', amount: Math.max(UNIT, Math.round(Math.max(p.maxHp * RUN.catchUpHeal, p.maxHp - p.hp) / UNIT) * UNIT) };
    const i = out.findIndex((o) => o.kind === 'heal');
    if (i < 0) out.push(catchUp);
    else {
      out[i] = catchUp;
      out.push({ kind: 'maxHp', amount: RUN.maxHpCard });
    }
  }
  let guard = 0;
  while (out.length < RUN.draftSize && guard++ < 30) push(guard % 3 === 0 ? addCard() : guard % 3 === 1 ? swapCard() : { kind: 'maxHp', amount: RUN.maxHpCard });
  // Low HP, any act: a heal is always on offer (playtest: 58/330 HP and no heal card, with fights no longer healing).
  if (!run.glass && p.hp < p.maxHp * RUN.lowHp && !out.some((o) => o.kind === 'heal') && out.length) {
    out[out.length - 1] = { kind: 'heal', amount: Math.max(UNIT, Math.round((p.maxHp * RUN.lowHeal) / UNIT) * UNIT) };
  }
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
      p.levels.sym[o.symbol] = Math.min(levelCap(run), symLevel(p.levels, o.symbol) + 1);
      break;
    case 'charmLevel':
      p.levels.charm[o.enh] = Math.min(levelCap(run), charmLevel(p.levels, o.enh) + 1);
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
 * The Cashier's four slots: a level or charm (extending what you own), another charm, a relic, and a
 * utility (WILDs, remove a symbol), plus the HEAL service. Deterministic per run seed + depth + rerolls.
 */
export function shopOffers(run: RunState): ShopItem[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 31 + run.act * 64, 0x27d4eb2f) ^ Math.imul(run.shopRerolls + 1, 0x165667b1)) >>> 0);
  const p = run.player;
  const items: ShopItem[] = [];
  const P = CHIPS.prices;
  // A reroll never deals what was just on the shelf.
  const prev = new Set(run.shopRerolls > 0 ? (run.shelfKeys ?? []) : []);
  const add = (option: DraftOption | null, price: number) => {
    // MIDAS: the Cashier gives him 20% off.
    if (option && !prev.has(JSON.stringify(option)) && !items.some((i) => JSON.stringify(i.option) === JSON.stringify(option))) items.push({ option, price: run.cabinet === 'midas' ? Math.max(1, Math.ceil(price * 0.8)) : price, sold: false });
  };
  const gildOptions = charmOptions(run, RUN.charmCellsShop).filter((o) => !prev.has(JSON.stringify(o)));
  // Prefer extending what you already own, so builds can be finished on purpose.
  const extend = gildOptions.filter((o) => o.kind === 'gild' && p.gilded.some((g) => g.enh === o.enh));
  const levels = levelOptions(run);
  if (levels.length && rng.next() < 0.5) add(rng.pick(levels), P.level);
  else add(extend.length ? rng.pick(extend) : gildOptions.length ? rng.pick(gildOptions) : null, P.gild);
  // Slot 2: a DIFFERENT charm type from slot 1, leaning to types you don't own.
  const first = items.map((i) => i.option).find((o) => o.kind === 'gild' || o.kind === 'charmLevel');
  const firstEnh = first && (first.kind === 'gild' || first.kind === 'charmLevel') ? first.enh : undefined;
  const other = gildOptions.filter((o) => o.kind === 'gild' && o.enh !== firstEnh);
  const fresh = other.filter((o) => o.kind === 'gild' && !p.gilded.some((g) => g.enh === o.enh));
  add(fresh.length && rng.next() < 0.6 ? rng.pick(fresh) : other.length ? rng.pick(other) : gildOptions.length ? rng.pick(gildOptions) : null, P.gild);
  const lastShop = run.act === runActs(run) && run.depth >= Math.min(actLength(run.act), RUN.shopAfter[RUN.shopAfter.length - 1]);
  const relics = (Object.keys(RELICS) as RelicId[]).filter(
    (r) => !p.relics.includes(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && !(lastShop && r === 'bandage') && !LEGENDARY.has(r),
  );
  // Act 2: the relic slot holds a legendary, priced like one.
  const legends = run.act > 1 ? [...LEGENDARY].filter((r) => !p.relics.includes(r) && relicFits(run, r) && !legendShown(run, r)) : [];
  if (legends.length) add({ kind: 'relic', relic: rng.pick(legends) }, P.legend);
  else add(relics.length ? { kind: 'relic', relic: rng.pick(relics) } : null, P.relic);
  const u = rng.next();
  if (u < 0.35) {
    const wilds = p.strips.flatMap((s, reel) => wildFrom(run).filter((from) => (s[from] ?? 0) > RUN.wildCount && plainCells(p, reel, from) >= RUN.wildCount).map((from) => ({ kind: 'swap' as const, from, to: 'wild' as SymbolId, count: RUN.wildCount, reel })));
    add(wilds.length ? rng.pick(wilds) : null, P.wild);
  } else if (u < 0.7) {
    // Removals: rocks first, then a shield or one of your attack symbols (thin the strip either way).
    const atk = CABINETS[run.cabinet].attack;
    const junk = p.strips.flatMap((s, reel) => (['rock', 'shield', atk] as SymbolId[]).filter((sym) => (s[sym] ?? 0) > (sym === 'rock' ? 0 : REMOVE_FLOOR)).map((symbol) => ({ kind: 'remove' as const, symbol, reel })));
    add(junk.length ? (junk.find((j) => j.symbol === 'rock') ?? rng.pick(junk)) : null, P.remove);
  } else if (levels.length) add(rng.pick(levels), P.level);
  // Never a thin shelf: top up with charms, then a rock/shield removal.
  for (const o of rng.shuffle(gildOptions)) {
    if (items.length >= 4) break;
    add(o, P.gild);
  }
  if (items.length < 4) {
    const junk = p.strips.flatMap((s, reel) => (['rock', 'shield'] as SymbolId[]).filter((sym) => (s[sym] ?? 0) > 1).map((symbol) => ({ kind: 'remove' as const, symbol, reel })));
    if (junk.length) add(rng.pick(junk), P.remove);
  }
  // Never a thin shelf late: levels, a second relic, then max HP (EXPERT_PLAYTEST_3 B6).
  for (const o of rng.shuffle(levels)) {
    if (items.length >= 4) break;
    add(o, P.level);
  }
  if (items.length < 4 && relics.length) add({ kind: 'relic', relic: rng.pick(relics) }, P.relic);
  if (items.length < 4) add({ kind: 'maxHp', amount: RUN.maxHpCard }, P.maxHp);
  // Rerolls also redraw the layout: the four slots come in a new order.
  const shelf = run.shopRerolls > 0 ? rng.shuffle(items.slice(0, 4)) : items.slice(0, 4);
  run.shelfKeys = shelf.map((i) => JSON.stringify(i.option));
  // HEAL is a permanent service slot, sized to what you're missing (hidden when nearly full).
  const missing = p.maxHp - p.hp;
  // Once a visit: a reroll doesn't bring it back after you bought it.
  if (missing >= 3 * UNIT && !run.glass && !run.healBought) shelf.push({ option: { kind: 'heal', amount: Math.min(RUN.healCard, missing) }, price: P.heal + RUN.healStep * (run.healsBought ?? 0), sold: false });
  return shelf;
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
const lvTag = (lvl: number, cap: number) => (lvl >= cap ? `LV${lvl} MAX` : `LV${lvl}`);

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
      return { title: RELICS[o.relic].name, text: relicText(o.relic, run?.cabinet) };
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
      const cap = run ? levelCap(run) : LEVEL_CAP;
      const next = Math.min(cap, symLevel(lv, o.symbol) + 1);
      // User, content audit 2026-10-08: level cards show the step, in the symbol's own currency.
      const word = o.symbol === 'shield' ? 'SHIELD' : o.symbol === 'bolt' ? 'LIGHTNING CHARGE' : 'DAMAGE';
      return { title: `${plural(o.symbol, 2)} ${lvTag(next, cap)}`, text: `${symValue(next - 1)} -> ${symValue(next)} ${word}` };
    }
    case 'charmLevel': {
      const cap = run ? levelCap(run) : LEVEL_CAP;
      const next = Math.min(cap, charmLevel(lv, o.enh) + 1);
      return { title: `${charmName(o.enh)} CHARM ${lvTag(next, cap)}`, text: charmShortText(o.enh, next + (ticket ? 1 : 0)) };
    }
    case 'remove':
      return { title: `-1 ${symLabel(o.symbol)}`, text: `REMOVE A ${symLabel(o.symbol)} FROM REEL ${o.reel + 1}` };
  }
}

/** The tag a charm shows at your current level (e.g. X2, +5). */
export const charmTagFor = (run: RunState, enh: Enh) => charmTag(enh, charmLevel(run.player.levels, enh, run.player.relics.includes('ticket')));
// ---- post-boss BIG CHOICES (Tuesday Step E) ------------------------------------------------

/**
 * After the House and THE WHEEL you pick 1 of 3 build-defining moves from one set (never the same set
 * twice in a run). Strong options carry a real, visible cost; each set has one safe pick.
 */
export type BigChoiceId =
  | 'edge' | 'cashOut' | 'ride'
  | 'armsRace' | 'masterwork' | 'whetstone' | 'meltDown' | 'gildLot' | 'polish' | 'cleanCut' | 'twinReel' | 'sweepUp' | 'glassCannon' | 'bloodPact' | 'secondWind'
  | 'devilsDue' | 'allIn' | 'doubleOrNothing' | 'cursedIdol' | 'quickening' | 'warded' | 'pawnShop' | 'temper' | 'luckyBreak' | 'treasure' | 'houseMoney'
  | 'whetted' | 'bloodMoon' | 'cashIn' | 'fourLeaf' | 'overclock' | 'markedCards'
  | 'excalibur' | 'shieldWall' | 'shieldSlam' | 'crusade' | 'squire'
  | 'chainLightning' | 'madScience' | 'supercell' | 'stormFront' | 'groundWire'
  | 'jokersReel' | 'doubleFeature' | 'highCard' | 'cardShark' | 'trumpCard'
  | 'noLimit' | 'openBar' | 'heist' | 'monsoon' | 'trustFund'
  | 'headliner' | 'hypeMan' | 'encoreDrop' | 'backupDancers';
/** HOUSE EDGES: endless-mode rules you take on, each paying a reward. */
export type EdgeId = 'fast' | 'marked' | 'heal' | 'rollers' | 'nocomps' | 'frail';
export const EDGES: EdgeId[] = ['fast', 'marked', 'heal', 'rollers', 'nocomps', 'frail'];
/** How much each edge costs you, and so what it pays (EXPERT_PLAYTEST_4 C1: rewards sized to cost). */
export const EDGE_TIER: Record<EdgeId, 'chips' | 'relic' | 'legend'> = { frail: 'chips', heal: 'relic', fast: 'chips', marked: 'relic', rollers: 'legend', nocomps: 'chips' };
/** The endless Cashier sells levels past the cap. */
export const levelCap = (run: RunState) => (run.endless ? LEVEL_CAP + 1 : LEVEL_CAP) + (CABINETS[run.cabinet].levelCapBonus ?? 0);
/** RIDE AGAIN: each loop cleared adds this x loop to the pot; a bust banks half. */
export const POT_PER_LOOP = 1500;
/** Loop bosses by name (the RIDE card says who's next). */
const BOSS_NAME: Record<string, string> = { house: 'THE HOUSE', wheel: 'THE WHEEL', dealer: 'THE DEALER' };
/** A cleared loop: the pot grows x1.5, plus POT_PER_LOOP. */
export const nextPot = (pot: number) => Math.round(pot * ENDLESS.potGrowth) + POT_PER_LOOP;
/** What a bust banks of the pot. */
export const bustPot = (pot: number) => Math.floor(pot * ENDLESS.bustKeep);

export interface BigChoice {
  id: BigChoiceId;
  /** HOUSE EDGE picks: the edge and its reward. */
  edge?: EdgeId;
  reward?: 'chips' | 'relic' | 'legend';
  /** Rolled target: a symbol, a charm or a reel. */
  symbol?: SymbolId;
  enh?: Enh;
  reel?: number;
  /** PAWN SHOP: the relic you give up and the legendary you get. */
  relic?: RelicId;
  relic2?: RelicId;
}
/** The old fixed sets (until 2026-10-08). Kept for old tools and saves; the offer draws from BIG_CARDS now. */
export const BIG_SETS: BigChoiceId[][] = [
  ['armsRace', 'masterwork', 'whetstone'],
  ['meltDown', 'gildLot', 'polish'],
  ['cleanCut', 'twinReel', 'sweepUp'],
  ['glassCannon', 'bloodPact', 'secondWind'],
];
export const BIG_SET_NAMES = ['THE FORGE', 'THE MELT', 'SURGERY', "DEVIL'S BARGAIN"];
/** The picks with no cost. */
export const SAFE_CHOICES: ReadonlySet<BigChoiceId> = new Set(['whetstone', 'polish', 'sweepUp', 'secondWind', 'temper', 'luckyBreak', 'treasure', 'houseMoney']);
export const BIG = {
  armsRaceHp: 0.15, sweepHeal: 10 * UNIT, secondWindHp: 4 * UNIT, secondWindShare: 0.2, bloodPactHp: 0.25, gildLotHp: 0.2, gildLotCells: 3, glassPay: 1.5,
  devilPay: 1.75, devilDecay: 0.08, allInHp: 0.2, allInShare: 0.5, wardedHp: 0.15, wards: 3, houseMoney: 40, heist: 30, heistHp: 0.3, crusadeStep: 5, crusadeHp: 0.2,
  chainHp: 0.3, madMul: 2, madCost: 0.05, groundHeal: 5, jokerHp: 0.5, featureHp: 0.2, noLimitHp: 0.25, monsoonCost: 10, trustChips: 2,
  convertHp: 0.15, highCardMul: 1.5, headlinerMul: 2, headlinerMax: 8, encoreHp: 0.25, dancers: 2, fourLeafHp: 0.2, shieldWallKeep: 0.3, slamShare: 0.5, squireCells: 2, sharkWilds: 2, quickeningHp: 0,
};

/** One card of the pool: who it's for and when it shows up. */
interface BigCard {
  id: BigChoiceId;
  /** cost: has a real price; free: no cost; machine: that Slot Machine's own (either). */
  slot: 'cost' | 'free' | 'machine';
  machine?: CabinetId;
  /** H: after the House only. HM: not in endless loops. Otherwise: always. */
  when?: 'H' | 'HM';
  ok?: (run: RunState) => boolean;
}
const hasMeter = (run: RunState) => !!CABINETS[run.cabinet].meter;
const charmTotal = (run: RunState) => run.player.gilded.reduce((a, g) => a + g.n, 0);
const legendsFor = (run: RunState) => [...LEGENDARY].filter((r) => !run.player.relics.includes(r) && relicFits(run, r));
const relicsFor = (run: RunState) => (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && !LEGENDARY.has(r) && !ELITE_ONLY.has(r) && relicFits(run, r));
/** A Charm conversion: 3+ Charms, the Charm fits this machine, and not everything is that Charm already. */
// (Playtest: BLOOD MOON turned TRICK-on-shields into GOLD, no VAMP at all. At least one Charm must be able to take it.)
const convertOk = (enh: Enh) => (run: RunState) =>
  charmTotal(run) >= 3 && gildsFor(run).includes(enh) && run.player.gilded.some((g) => g.enh !== enh && charmSymbols(run, enh).includes(g.symbol));
/** The conversions that cost a shield level need one to lose (at LV1 the cost was free). */
const shieldConvertOk = (enh: Enh) => (run: RunState) => convertOk(enh)(run) && symLevel(run.player.levels, 'shield') > 1;
/** BIG CHOICES (user review 2026-10-08): general cards, Charm conversions, and five per Slot Machine. */
export const BIG_CARDS: BigCard[] = [
  { id: 'armsRace', slot: 'cost' },
  { id: 'masterwork', slot: 'cost', ok: (run) => CABINETS[run.cabinet].attack !== 'shield' },
  { id: 'glassCannon', slot: 'cost', when: 'H', ok: (run) => !run.glass },
  { id: 'bloodPact', slot: 'cost', ok: (run) => !run.bloodPact },
  { id: 'devilsDue', slot: 'cost', when: 'H', ok: (run) => !run.devil },
  { id: 'allIn', slot: 'cost', ok: (run) => run.player.strips.some((s) => (s.shield ?? 0) > 0) },
  { id: 'doubleOrNothing', slot: 'cost' },
  { id: 'meltDown', slot: 'cost', ok: (run) => run.player.gilded.length > 0 },
  { id: 'gildLot', slot: 'cost' },
  { id: 'cursedIdol', slot: 'cost', when: 'HM', ok: (run) => legendsFor(run).length > 0 },
  { id: 'quickening', slot: 'cost', ok: (run) => hasMeter(run) && !run.big?.startFull },
  { id: 'twinReel', slot: 'cost' },
  { id: 'cleanCut', slot: 'cost', ok: (run) => run.player.strips.some((s) => (s.shield ?? 0) > 0) },
  { id: 'warded', slot: 'cost', when: 'HM', ok: (run) => !run.big?.wards },
  { id: 'pawnShop', slot: 'cost', when: 'HM', ok: (run) => legendsFor(run).length > 0 && run.player.relics.some((r) => !LEGENDARY.has(r)) },
  { id: 'whetted', slot: 'cost', ok: convertOk('keen') },
  { id: 'bloodMoon', slot: 'cost', ok: shieldConvertOk('vamp') },
  // CASH IN: CHIP Charms only pay off on CASSIDY (3-9% win rate elsewhere: a trap).
  { id: 'cashIn', slot: 'cost', ok: (run) => run.cabinet === 'midas' && convertOk('lucre')(run) },
  { id: 'fourLeaf', slot: 'cost', ok: convertOk('lucky') },
  { id: 'overclock', slot: 'cost', ok: shieldConvertOk('charged') },
  { id: 'markedCards', slot: 'cost', ok: convertOk('trick') },
  { id: 'temper', slot: 'free' },
  { id: 'luckyBreak', slot: 'free', ok: (run) => run.player.gilded.length > 0 },
  { id: 'secondWind', slot: 'free' },
  { id: 'sweepUp', slot: 'free', ok: (run) => run.player.strips.some((s) => (s.rock ?? 0) > 0) },
  { id: 'treasure', slot: 'free', when: 'HM', ok: (run) => relicsFor(run).length >= 3 },
  { id: 'houseMoney', slot: 'free', when: 'HM', ok: (run) => run.cabinet !== 'midas' },
  // SIR REGINALD
  { id: 'excalibur', slot: 'machine', machine: 'knight' },
  { id: 'shieldWall', slot: 'machine', machine: 'knight' },
  { id: 'shieldSlam', slot: 'machine', machine: 'knight' },
  { id: 'crusade', slot: 'machine', machine: 'knight' },
  { id: 'squire', slot: 'machine', machine: 'knight' },
  // DOC VOLTZ
  { id: 'chainLightning', slot: 'machine', machine: 'tesla' },
  { id: 'madScience', slot: 'machine', machine: 'tesla' },
  { id: 'supercell', slot: 'machine', machine: 'tesla', ok: (run) => charmCount(run.player, 'charged') > 0 },
  { id: 'stormFront', slot: 'machine', machine: 'tesla' },
  { id: 'groundWire', slot: 'machine', machine: 'tesla' },
  // JESTER JAX
  { id: 'jokersReel', slot: 'machine', machine: 'joker' },
  { id: 'doubleFeature', slot: 'machine', machine: 'joker' },
  { id: 'highCard', slot: 'machine', machine: 'joker' },
  { id: 'cardShark', slot: 'machine', machine: 'joker' },
  { id: 'trumpCard', slot: 'machine', machine: 'joker' },
  // CASH CASSIDY
  { id: 'noLimit', slot: 'machine', machine: 'midas' },
  { id: 'openBar', slot: 'machine', machine: 'midas' },
  { id: 'heist', slot: 'machine', machine: 'midas' },
  { id: 'monsoon', slot: 'machine', machine: 'midas' },
  { id: 'trustFund', slot: 'machine', machine: 'midas' },
  // DJ DECIBEL
  { id: 'headliner', slot: 'machine', machine: 'jukebox' },
  { id: 'hypeMan', slot: 'machine', machine: 'jukebox' },
  { id: 'encoreDrop', slot: 'machine', machine: 'jukebox' },
  { id: 'backupDancers', slot: 'machine', machine: 'jukebox' },
];
/** Charm conversions: the Charm each one makes. */
const CONVERT: Partial<Record<BigChoiceId, Enh>> = { whetted: 'keen', bloodMoon: 'vamp', cashIn: 'lucre', fourLeaf: 'lucky', overclock: 'charged', markedCards: 'trick' };

const SYM_NAME = (s: SymbolId) => `${symLabel(s)}S`;
/** Each machine's meter by its own name. */
const METER_NAME: Partial<Record<CabinetId, string>> = { tesla: 'LIGHTNING METER', joker: 'JACKPOT METER', midas: 'HIGH ROLLER METER', jukebox: 'VOLUME' };
const pct = (run: RunState, share: number) => `-${unitsRound(run.player.maxHp * share)} MAX HP`;
/** The level a Charm or symbol type lands on (shown on the card). */
const bestCharmLevel = (run: RunState) => Math.max(1, ...run.player.gilded.map((g) => charmLevel(run.player.levels, g.enh)));
const what = (c: BigChoice) => (c.symbol ? SYM_NAME(c.symbol) : c.enh ? `${charmName(c.enh)} CHARMS` : '');

/** Title, rule and cost as plain card text (no expected values). */
export function describeChoice(run: RunState, c: BigChoice): { title: string; rule: string; cost: string } {
  const atk = SYM_NAME(CABINETS[run.cabinet].attack);
  const meter = METER_NAME[run.cabinet] ?? 'METER';
  switch (c.id) {
    case 'edge': {
      // The level this card would make it (an edge you hold comes back one up).
      const t = edgeText(c.edge!, edgeLevel(run, c.edge!) + 1);
      return { title: t.title, rule: c.reward === 'legend' ? 'PICK A LEGENDARY RELIC' : c.reward === 'relic' ? 'PICK A RELIC' : `+${ENDLESS.edgeChips} CHIPS`, cost: `HOUSE EDGE: ${t.text}` };
    }
    case 'cashOut':
      return { title: 'CASH OUT', rule: `BANK THE POT: ${cashOutValue(run)} POINTS (INCLUDES ${run.player.chips} CHIPS X10). THE RUN ENDS.`, cost: '' };
    case 'ride':
      return { title: 'RIDE AGAIN', rule: `LOOP ${run.endless?.loop ?? 1}: ${BOSS_NAME[run.enemies[run.enemies.length - 1]?.boss ?? 'house'] ?? 'THE HOUSE'}. YOU ${run.player.hp}/${run.player.maxHp} HP. CLEAR IT AND THE POT GROWS TO ${nextPot(run.endless?.pot ?? 0)}.`, cost: `BUST AND YOU BANK A THIRD OF THE POT: ${bustPot(run.endless?.pot ?? 0)} (YOUR CHIPS ARE SAFE)` };
    case 'armsRace':
      return { title: 'ARMS RACE', rule: '+1 LEVEL TO ALL YOUR SYMBOLS', cost: pct(run, BIG.armsRaceHp) };
    case 'masterwork':
      return { title: 'MASTERWORK', rule: `+2 LEVELS TO ${atk}`, cost: 'SHIELDS GO BACK TO LV1' };
    case 'whetstone':
    case 'polish':
    case 'temper':
      return { title: 'TEMPER', rule: `+1 LEVEL TO ${what(c)}`, cost: '' };
    case 'meltDown':
      return { title: 'MELT IT DOWN', rule: `EVERY CHARM BECOMES A GOLD CHARM AT LV${Math.min(BIG_CAP, bestCharmLevel(run) + 1)}`, cost: 'YOUR OTHER CHARM LEVELS ARE GONE' };
    case 'gildLot':
      return { title: 'SOLID GOLD', rule: `EVERY REEL GETS ${BIG.gildLotCells} GOLD CHARMS`, cost: pct(run, BIG.gildLotHp) };
    case 'cleanCut':
      return { title: 'CLEAN CUT', rule: `+1 LEVEL TO ${atk}`, cost: `REMOVES SHIELDS FROM REEL ${c.reel! + 1}` };
    case 'twinReel':
      return { title: 'TWIN REEL', rule: 'REEL 3 BECOMES AN EXACT COPY OF REEL 1', cost: 'REEL 3 IS OVERWRITTEN' };
    case 'sweepUp':
      return { title: 'SWEEP UP', rule: `+${BIG.sweepHeal / 2} MAX HP AND REMOVE ALL ROCKS`, cost: '' };
    case 'glassCannon':
      return { title: 'GLASS CANNON', rule: `PAIRS AND JACKPOTS PAY X${BIG.glassPay}`, cost: 'NO MORE HEALING BETWEEN FIGHTS' };
    case 'bloodPact':
      return hasMeter(run)
        ? { title: 'BLOOD PACT', rule: `YOUR ${meter} FILLS TWICE AS FAST`, cost: pct(run, BIG.bloodPactHp) }
        : { title: 'BLOOD PACT', rule: '+1 LEVEL TO SWORDS AND SHIELDS', cost: pct(run, BIG.bloodPactHp) };
    case 'secondWind':
      return { title: 'SECOND WIND', rule: `+${secondWindHp(run)} MAX HP AND +1 LEVEL TO SHIELDS`, cost: '' };
    case 'devilsDue':
      return { title: "DEVIL'S DUE", rule: `EVERYTHING PAYS X${BIG.devilPay}`, cost: `-${Math.round(BIG.devilDecay * 100)}% MAX HP AFTER EVERY FIGHT YOU WIN` };
    case 'allIn':
      return { title: 'GO FOR BROKE', rule: `HALF THE SHIELDS ON EACH REEL BECOME ${atk}`, cost: pct(run, BIG.allInHp) };
    case 'doubleOrNothing':
      return { title: 'DOUBLE OR NOTHING', rule: '+1 LEVEL TO EVERY SYMBOL AND CHARM', cost: 'THE NEXT BOSS HAS DOUBLE HP' };
    case 'cursedIdol':
      return { title: 'CURSED IDOL', rule: 'PICK A LEGENDARY RELIC', cost: 'EACH REEL GETS A ROCK' };
    case 'quickening':
      return { title: 'QUICKENING', rule: `YOUR ${meter} STARTS EVERY FIGHT FULL`, cost: 'ENEMY ABILITIES CHARGE 1 SPIN FASTER' };
    case 'warded':
      return { title: 'WARDED', rule: `IGNORE THE FIRST ${BIG.wards} SABOTAGES EACH FIGHT`, cost: pct(run, BIG.wardedHp) };
    case 'pawnShop':
      return { title: 'PAWN SHOP', rule: `TRADE ${RELICS[c.relic!].name} FOR ${RELICS[c.relic2!].name}`, cost: `${RELICS[c.relic!].name} IS GONE` };
    case 'luckyBreak':
    {
      // At the cap a level becomes 2 GOLD Charms: say so (playtest: +2 LEVELS gave +1).
      const room = c.enh ? Math.max(0, Math.min(2, BIG_CAP - charmLevel(run.player.levels, c.enh))) : 2;
      return { title: 'LUCKY BREAK', rule: room >= 2 ? `+2 LEVELS TO ${what(c)}` : `+${room} LEVEL TO ${what(c)}, ${(2 - room) * 2} GOLD CHARMS`, cost: '' };
    }
    case 'treasure':
      return { title: 'TREASURE', rule: 'PICK 1 OF 3 RELICS', cost: '' };
    case 'houseMoney':
      return { title: 'HOUSE MONEY', rule: `+${BIG.houseMoney} CHIPS`, cost: '' };
    case 'whetted':
    case 'bloodMoon':
    case 'cashIn':
    case 'fourLeaf':
    case 'overclock':
    case 'markedCards': {
      const enh = CONVERT[c.id]!;
      const title = { whetted: 'WHETTED', bloodMoon: 'BLOOD MOON', cashIn: 'CASH IN', fourLeaf: 'FOUR LEAF', overclock: 'OVERCLOCK', markedCards: 'MARKED CARDS' }[c.id];
      const cost = c.id === 'bloodMoon' || c.id === 'overclock' ? '-1 LEVEL TO SHIELDS' : c.id === 'cashIn' ? 'YOUR OTHER CHARM LEVELS ARE GONE' : pct(run, c.id === 'fourLeaf' ? BIG.fourLeafHp : BIG.convertHp);
      // Charms on symbols it can't go on become GOLD: say so.
      const misfit = run.player.gilded.some((g) => !charmSymbols(run, enh).includes(g.symbol));
      return { title, rule: `EVERY CHARM BECOMES ${charmName(enh)} AT LV${bestCharmLevel(run)}${misfit ? ` (GOLD WHERE ${charmName(enh)} CAN'T GO)` : ''}`, cost };
    }
    case 'excalibur':
      return { title: 'EXCALIBUR', rule: 'SWORD PAIRS PAY AS JACKPOTS', cost: 'SHIELD PAIRS BLOCK NOTHING' };
    case 'shieldWall':
      return { title: 'SHIELD WALL', rule: `YOUR SHIELD NEVER RESETS (MAX ${unitsRound(run.player.maxHp * BIG.shieldWallKeep)})`, cost: '-1 LEVEL TO SWORDS' };
    case 'shieldSlam':
      return { title: 'SHIELD SLAM', rule: 'EVERY SHIELD ALSO HITS FOR HALF WHAT IT BLOCKS', cost: '' };
    case 'crusade':
      return { title: 'CRUSADE', rule: `+${BIG.crusadeStep} DAMAGE TO SWORDS EACH FIGHT YOU WIN, FOR THE REST OF THE RUN`, cost: pct(run, BIG.crusadeHp) };
    case 'squire':
      return { title: 'SQUIRE', rule: `EVERY REEL GETS ${BIG.squireCells} KEEN CHARMS`, cost: '' };
    case 'chainLightning':
      return { title: 'CHAIN LIGHTNING', rule: 'LIGHTNING DAMAGE +100%', cost: pct(run, BIG.chainHp) };
    case 'madScience':
      return { title: 'MAD SCIENCE', rule: `LIGHTNING DAMAGE +${Math.round((BIG.madMul - 1) * 100)}%`, cost: `EACH STORM COSTS ${unitsRound(run.player.maxHp * BIG.madCost)} HP` };
    case 'supercell':
      return { title: 'SUPERCELL', rule: 'EVERY CHARGED CHARM BECOMES A BLAZE CHARM', cost: 'NO MORE CHARGED CHARMS' };
    case 'stormFront':
      return { title: 'STORM FRONT', rule: 'EACH FIGHT STARTS WITH A LIGHTNING STRIKE', cost: '' };
    case 'groundWire':
      return { title: 'GROUND WIRE', rule: `EACH LIGHTNING STRIKE HEALS ${BIG.groundHeal} HP`, cost: '' };
    case 'jokersReel':
      return { title: "JOKER'S REEL", rule: 'HALF OF REEL 2 BECOMES WILDS', cost: pct(run, BIG.jokerHp) };
    case 'doubleFeature':
      return { title: 'DOUBLE FEATURE', rule: 'YOUR JACKPOT METER PAYS TWO SPINS IN A ROW', cost: pct(run, BIG.featureHp) };
    case 'highCard':
      return { title: 'HIGH CARD', rule: `JACKPOTS AND JACKPOT METER PAYOFFS PAY X${BIG.highCardMul}`, cost: 'PAIRS PAY HALF' };
    case 'cardShark':
      return { title: 'CARD SHARK', rule: `+${BIG.sharkWilds} WILDS ON EVERY REEL`, cost: '-1 LEVEL TO CARDS' };
    case 'trumpCard':
      return { title: 'TRUMP CARD', rule: 'CARD DAMAGE PIERCES SHIELDS', cost: '' };
    case 'noLimit':
      return { title: 'NO LIMIT', rule: 'HIGH ROLLER HAS NO MAX', cost: pct(run, BIG.noLimitHp) };
    case 'openBar':
      return { title: 'OPEN BAR', rule: 'MAKE IT RAIN COSTS NOTHING', cost: 'NO CHIPS FROM WINS' };
    case 'heist':
      return { title: 'THE HEIST', rule: `+${BIG.heist} CHIPS`, cost: pct(run, BIG.heistHp) };
    case 'monsoon':
      return { title: 'MONSOON', rule: 'CHIP PAIRS CAUSE MAKE IT RAIN AT FULL DAMAGE', cost: `MAKE IT RAIN COSTS ${BIG.monsoonCost} CHIPS` };
    case 'headliner':
      return { title: 'HEADLINER', rule: `THE DROP HITS X${BIG.headlinerMul}`, cost: `THE VOLUME MAX GOES UP TO ${BIG.headlinerMax}` };
    case 'hypeMan':
      return { title: 'HYPE MAN', rule: '+1 VOLUME BEFORE EVERY OTHER SPIN', cost: 'NOTES PAY HALF WHEN IT ISN\'T THE DROP' };
    case 'encoreDrop':
      return { title: 'ENCORE', rule: 'AFTER THE DROP, THE NEXT SPIN IS A DROP TOO', cost: pct(run, BIG.encoreHp) };
    case 'backupDancers':
      return { title: 'BACKUP DANCERS', rule: `+${BIG.dancers} NOTES ON EVERY REEL`, cost: '' };
    case 'trustFund':
      return { title: 'TRUST FUND', rule: `+${BIG.trustChips} CHIPS AFTER EVERY FIGHT YOU WIN`, cost: '' };
  }
}

/** SECOND WIND grows with you: +20% max HP (at least 40). It used to heal to full too, but every act already does. */
const secondWindHp = (run: RunState) => Math.max(BIG.secondWindHp, unitsRound(run.player.maxHp * BIG.secondWindShare));

/** Your symbols (on your strips) that levels apply to. */
const levelSyms = (run: RunState) => CABINETS[run.cabinet].symbols.filter((s) => run.player.strips.some((x) => (x[s] ?? 0) > 0));

/** Resolve a card's target (picked at random among ties, shown on the card). */
function target(run: RunState, id: BigChoiceId, rng: Rng): BigChoice | null {
  const p = run.player;
  switch (id) {
    case 'cleanCut':
      return { id, reel: [0, 1, 2].reduce((a, b) => ((p.strips[b].shield ?? 0) > (p.strips[a].shield ?? 0) ? b : a), 0) };
    case 'temper': {
      // Your lowest symbol or Charm type; a tie picks one at random.
      const types: BigChoice[] = [...levelSyms(run).map((symbol) => ({ id, symbol })), ...[...new Set(p.gilded.map((g) => g.enh))].map((enh) => ({ id, enh }))];
      const lv = (c: BigChoice) => (c.symbol ? symLevel(p.levels, c.symbol) : charmLevel(p.levels, c.enh!));
      const open = types.filter((c) => lv(c) < BIG_CAP);
      if (!open.length) return null;
      const low = Math.min(...open.map(lv));
      return rng.pick(open.filter((c) => lv(c) === low));
    }
    case 'luckyBreak': {
      // Your most-used Charm; a tie picks one at random.
      const enhs = [...new Set(p.gilded.map((g) => g.enh))].filter((e) => charmLevel(p.levels, e) < BIG_CAP);
      if (!enhs.length) return null;
      const most = Math.max(...enhs.map((e) => charmCount(p, e)));
      return { id, enh: rng.pick(enhs.filter((e) => charmCount(p, e) === most)) };
    }
    case 'pawnShop': {
      // A relic of your lowest rarity, at random, for a random legendary (both shown on the card).
      const tiers: ('common' | 'uncommon')[] = ['common', 'uncommon'];
      const own = p.relics.filter((r) => !LEGENDARY.has(r));
      const tier = tiers.find((t) => own.some((r) => RELIC_TIER[t].includes(r)));
      const pool = tier ? own.filter((r) => RELIC_TIER[tier].includes(r)) : own;
      const legends = legendsFor(run);
      if (!pool.length || !legends.length) return null;
      return { id, relic: rng.pick(pool), relic2: rng.pick(legends) };
    }
    default:
      return { id };
  }
}

/**
 * A boss fell: three cards, one from each slot (a card with a real cost, one of your Slot Machine's own, one with no
 * cost), shown in random order. Never a card you've seen this run; never one with nothing to act on.
 */
/** A big choice you passed on sits out this many offers before it can come back. */
export const CHOICE_REST = 2;

export function rollOffer(run: RunState, rng: Rng): BigChoice[] {
  // (2026-10-12, user: ENDLESS ran dry.) Only a card you TAKE is gone for the run; one you passed on rests for
  // CHOICE_REST offers, then can come back. In ENDLESS every card is open, the ones held for earlier acts too.
  const shown = new Set(run.choicesSeen ?? []);
  const blocked = new Set([...(run.choicesTaken ?? []), ...(run.choicesRecent ?? []).flat()]);
  const stage = run.endless ? 'E' : run.act <= 2 ? 'H' : 'M';
  const timing = (c: BigCard) => !c.when || stage === 'E' || (c.when === 'H' ? stage === 'H' : true);
  const open = BIG_CARDS.filter((c) => !blocked.has(c.id) && (!c.machine || c.machine === run.cabinet) && timing(c) && (!c.ok || c.ok(run)));
  const out: BigChoice[] = [];
  const draw = (slot: BigCard['slot']) => {
    for (const c of rng.shuffle(open.filter((x) => x.slot === slot && !out.some((o) => o.id === x.id)))) {
      const t = target(run, c.id, rng);
      if (t) return out.push(t), true;
    }
    return false;
  };
  draw('cost');
  // No machine cards left (or none for this machine): another card with a cost.
  if (!draw('machine')) draw('cost');
  if (!draw('free')) out.push({ id: 'secondWind' });
  run.choicesSeen = [...new Set([...shown, ...out.map((c) => c.id)])];
  run.choicesRecent = [...(run.choicesRecent ?? []), out.map((c) => c.id)].slice(-CHOICE_REST);
  return rng.shuffle(out);
}

/** A boss fell: offer the three cards. */
export function offerChoices(run: RunState, rng: Rng): void {
  const cards = rollOffer(run, rng);
  if (cards.length) run.pendingChoice = cards;
}

/** Kept for old callers: a fresh offer (the old fixed set index is ignored). */
export function rollChoices(run: RunState, _set: number, rng: Rng): BigChoice[] {
  return rollOffer(run, rng);
}

export function takeChoice(run: RunState, c: BigChoice): void {
  takeChoiceInner(run, c);
  // A legendary pick waiting behind the choice drops what the choice just gave you (playtest: PAWN SHOP's hourglass
  // showed again in the act's pick, a wasted pick).
  if (run.pendingLegend) {
    const left = run.pendingLegend.filter((r) => !run.player.relics.includes(r));
    const pool = run.pendingLegend.every((r) => LEGENDARY.has(r)) ? legendsFor(run) : relicsFor(run);
    const refill = pool.filter((r) => !left.includes(r) && !run.pendingLegend!.includes(r));
    while (left.length < run.pendingLegend.length && refill.length) left.push(refill.shift()!);
    run.pendingLegend = left.length ? left : null;
  }
}

function takeChoiceInner(run: RunState, c: BigChoice): void {
  if (!run.pendingChoice?.some((x) => x.id === c.id)) return;
  // Its title as the card showed it (before it's applied: a HOUSE EDGE names the level it gives), for COPY RUN.
  const title = describeChoice(run, c).title;
  if (BIG_CARDS.some((b) => b.id === c.id)) run.choicesTaken = [...(run.choicesTaken ?? []), c.id];
  const p = run.player;
  const big = (run.big ??= {});
  // LIMIT BREAK: big choices level past the cap, up to LV5. A level with nowhere to go becomes 2 GOLD Charms there.
  const up = (s: SymbolId, n = 1) => {
    for (let i = 0; i < n; i++) {
      const lv = symLevel(p.levels, s);
      if (lv < BIG_CAP) p.levels.sym[s] = lv + 1;
      else overflow(s, 'gold');
    }
  };
  const upCharm = (e: Enh, n = 1) => {
    for (let i = 0; i < n; i++) {
      const lv = charmLevel(p.levels, e);
      if (lv < BIG_CAP) p.levels.charm[e] = lv + 1;
      else for (const g of p.gilded.filter((x) => x.enh === e).slice(0, 1)) overflow(g.symbol, e);
    }
  };
  const overflow = (s: SymbolId, e: Enh) => {
    let left = 2;
    for (const reel of [0, 1, 2]) {
      const k = Math.min(left, plainCells(p, reel, s));
      addCharms(p, reel, s, e, k);
      left -= k;
    }
  };
  const down = (s: SymbolId) => {
    p.levels.sym[s] = Math.max(1, symLevel(p.levels, s) - 1);
  };
  const loseMax = (n: number) => {
    p.maxHp = Math.max(UNIT, p.maxHp - n);
    p.hp = Math.min(p.hp, p.maxHp);
  };
  const losePct = (share: number) => loseMax(unitsRound(p.maxHp * share));
  const queueLegend = (picks: RelicId[]) => {
    if (!picks.length) return;
    if (run.pendingLegend?.length) (run.legendQueue ??= []).push(picks);
    else {
      run.pendingLegend = picks;
      markLegends(run, picks);
    }
  };
  const atk = CABINETS[run.cabinet].attack;
  const rng = new Rng((run.seed ^ Math.imul(fightNumber(run) + 57, 0x2c1b3c6d)) >>> 0);
  const convert = (enh: Enh) => {
    const best = bestCharmLevel(run);
    const fits = charmSymbols(run, enh);
    for (const g of p.gilded) g.enh = fits.includes(g.symbol) ? enh : 'gold';
    const merged: Gild[] = [];
    for (const g of p.gilded) {
      const m = merged.find((x) => x.reel === g.reel && x.symbol === g.symbol && x.enh === g.enh);
      if (m) m.n += g.n;
      else merged.push({ ...g });
    }
    p.gilded = merged;
    p.levels.charm = { [enh]: best, ...(merged.some((g) => g.enh === 'gold') ? { gold: best } : {}) };
  };
  switch (c.id) {
    case 'edge': {
      run.endless?.edges.push(c.edge!);
      if (c.edge === 'frail') loseMax(Math.round(p.maxHp * 0.1 / UNIT) * UNIT);
      const erng = new Rng((run.seed ^ (run.endless?.loop ?? 1) * 977) >>> 0);
      const legends = legendsFor(run);
      const relics = relicsFor(run);
      if (c.reward === 'legend' && legends.length) run.pendingLegend = legendPick(run, erng, legends);
      else if (c.reward === 'relic' && relics.length) run.pendingLegend = erng.shuffle(relics).slice(0, RUN.legendPick);
      else p.chips += ENDLESS.edgeChips;
      markLegends(run, run.pendingLegend);
      break;
    }
    case 'cashOut':
      if (run.endless) {
        run.endless.pot = cashOutValue(run);
        run.endless.cashed = true;
      }
      run.over = true;
      run.choiceQueue = [];
      break;
    case 'ride':
      break;
    case 'armsRace':
      levelSyms(run).forEach((s) => up(s));
      losePct(BIG.armsRaceHp);
      break;
    case 'masterwork':
      up(atk, 2);
      p.levels.sym.shield = 1;
      break;
    case 'whetstone':
    case 'polish':
    case 'temper':
      if (c.symbol) up(c.symbol);
      else if (c.enh) upCharm(c.enh);
      break;
    case 'meltDown': {
      const best = Math.min(BIG_CAP, bestCharmLevel(run) + 1);
      convert('gold');
      p.levels.charm = { gold: best };
      break;
    }
    case 'gildLot':
      p.strips.forEach((_s, reel) => {
        let left = BIG.gildLotCells;
        for (const sym of [...new Set<SymbolId>([atk, 'sword', 'bolt', 'shield'])]) {
          const k = Math.min(left, plainCells(p, reel, sym));
          addCharms(p, reel, sym, 'gold', k);
          left -= k;
        }
      });
      losePct(BIG.gildLotHp);
      break;
    case 'cleanCut':
      p.strips[c.reel!].shield = 0;
      normalizeCharms(p);
      up(atk);
      break;
    case 'twinReel':
      p.strips[2] = { ...p.strips[0] };
      p.gilded = [...p.gilded.filter((g) => g.reel !== 2), ...p.gilded.filter((g) => g.reel === 0).map((g) => ({ ...g, reel: 2 }))];
      break;
    case 'sweepUp':
      for (const s of p.strips) s.rock = 0;
      p.maxHp += BIG.sweepHeal / 2;
      p.hp = Math.min(p.maxHp, p.hp + BIG.sweepHeal / 2);
      break;
    case 'glassCannon':
      run.glass = true;
      break;
    case 'bloodPact':
      if (hasMeter(run)) run.bloodPact = true;
      else {
        up('sword');
        up('shield');
      }
      losePct(BIG.bloodPactHp);
      break;
    case 'secondWind': {
      const add = secondWindHp(run);
      up('shield');
      p.maxHp += add;
      p.hp = Math.min(p.maxHp, p.hp + add);
      break;
    }
    case 'devilsDue':
      run.devil = true;
      break;
    case 'allIn': {
      // Half the shields on each reel (rounded down), not all (user, 2026-10-13: all of them made one-symbol reels, every
      // spin a jackpot: TESLA won 75% of GREEN runs that took it, 40% without).
      const moved = p.strips.map((s) => {
        const n = Math.floor((s.shield ?? 0) * BIG.allInShare);
        s[atk] = (s[atk] ?? 0) + n;
        s.shield = (s.shield ?? 0) - n;
        return n;
      });
      // Charms on the moved shields go with them when they fit there (the rest stay on the shields left).
      p.gilded = p.gilded.flatMap((g) => {
        if (g.symbol !== 'shield' || !CHARM_SYMBOLS[g.enh].includes(atk) || moved[g.reel] <= 0) return [g];
        const k = Math.min(g.n, moved[g.reel]);
        moved[g.reel] -= k;
        return [{ ...g, symbol: atk, n: k }, ...(g.n > k ? [{ ...g, n: g.n - k }] : [])];
      });
      losePct(BIG.allInHp);
      break;
    }
    case 'doubleOrNothing':
      levelSyms(run).forEach((s) => up(s));
      [...new Set(p.gilded.map((g) => g.enh))].forEach((e) => upCharm(e));
      run.bossHpMul = 2;
      break;
    case 'cursedIdol':
      queueLegend(legendPick(run, rng, legendsFor(run)));
      for (const s of p.strips) s.rock = (s.rock ?? 0) + 1;
      break;
    case 'quickening':
      big.startFull = true;
      run.abilityFaster = true;
      break;
    case 'warded':
      big.wards = BIG.wards;
      losePct(BIG.wardedHp);
      break;
    case 'pawnShop':
      if (c.relic && c.relic2) {
        p.relics = p.relics.filter((r) => r !== c.relic);
        if (!p.relics.includes(c.relic2)) p.relics.push(c.relic2);
      }
      break;
    case 'luckyBreak':
      if (c.enh) upCharm(c.enh, 2);
      break;
    case 'treasure':
      queueLegend(rng.shuffle(relicsFor(run)).slice(0, RUN.legendPick));
      break;
    case 'houseMoney':
      p.chips += BIG.houseMoney;
      break;
    case 'whetted':
    case 'bloodMoon':
    case 'cashIn':
    case 'fourLeaf':
    case 'overclock':
    case 'markedCards':
      convert(CONVERT[c.id]!);
      if (c.id === 'bloodMoon' || c.id === 'overclock') down('shield');
      else if (c.id === 'fourLeaf') losePct(BIG.fourLeafHp);
      else if (c.id !== 'cashIn') losePct(BIG.convertHp);
      break;
    case 'excalibur':
      big.swordPairJackpot = true;
      big.shieldPairsBlockNothing = true;
      break;
    case 'shieldWall':
      big.shieldKeep = BIG.shieldWallKeep;
      down('sword');
      break;
    case 'shieldSlam':
      big.shieldSlam = BIG.slamShare;
      break;
    case 'crusade':
      run.crusade = true;
      losePct(BIG.crusadeHp);
      break;
    case 'squire':
      for (const reel of [0, 1, 2]) addCharms(p, reel, 'sword', 'keen', BIG.squireCells);
      break;
    case 'chainLightning':
      big.strikeTwice = true;
      losePct(BIG.chainHp);
      break;
    case 'madScience':
      big.lightningMul = BIG.madMul;
      big.stormCost = BIG.madCost;
      break;
    case 'supercell':
      for (const g of p.gilded) if (g.enh === 'charged') g.enh = 'blaze';
      p.levels.charm.blaze = Math.max(charmLevel(p.levels, 'blaze'), charmLevel(p.levels, 'charged'));
      delete p.levels.charm.charged;
      run.noCharms = [...new Set([...(run.noCharms ?? []), 'charged' as Enh])];
      break;
    case 'stormFront':
      big.startStrike = true;
      break;
    case 'groundWire':
      big.strikeHeal = BIG.groundHeal;
      break;
    case 'jokersReel': {
      // Half of reel 2 (its plain cells first) becomes wilds (all of it measured +13 WHITE on JAX).
      const s1 = p.strips[1];
      let left = Math.floor(Object.values(s1).reduce((a, n) => a + (n ?? 0), 0) / 2);
      for (const sym of Object.keys(s1) as SymbolId[]) {
        if (sym === 'wild' || left <= 0) continue;
        const k = Math.min(left, s1[sym] ?? 0);
        s1[sym] = (s1[sym] ?? 0) - k;
        s1.wild = (s1.wild ?? 0) + k;
        left -= k;
      }
      normalizeCharms(p);
      losePct(BIG.jokerHp);
      break;
    }
    case 'doubleFeature':
      big.doublePayoff = true;
      losePct(BIG.featureHp);
      break;
    case 'highCard':
      big.jackpotMul = BIG.highCardMul;
      big.pairMul = 0.5;
      break;
    case 'cardShark':
      for (const s of p.strips) s.wild = (s.wild ?? 0) + BIG.sharkWilds;
      down('ace');
      break;
    case 'trumpCard':
      big.pierce = [...new Set([...(big.pierce ?? []), 'ace' as SymbolId])];
      break;
    case 'noLimit':
      big.noHighRollerCap = true;
      losePct(BIG.noLimitHp);
      break;
    case 'openBar':
      big.rainCost = 0;
      run.noWinChips = true;
      break;
    case 'heist':
      p.chips += BIG.heist;
      losePct(BIG.heistHp);
      break;
    case 'monsoon':
      big.monsoon = true;
      big.rainCost = BIG.monsoonCost;
      break;
    case 'headliner':
      big.dropMul = BIG.headlinerMul;
      big.volumeMax = BIG.headlinerMax;
      break;
    case 'hypeMan':
      big.hype = true;
      break;
    case 'encoreDrop':
      big.encoreDrop = true;
      losePct(BIG.encoreHp);
      break;
    case 'backupDancers':
      for (const s of p.strips) s.note = (s.note ?? 0) + BIG.dancers;
      break;
    case 'trustFund':
      run.trustFund = (run.trustFund ?? 0) + BIG.trustChips;
      break;
  }
  for (const s of p.strips) for (const k of Object.keys(s) as SymbolId[]) if ((s[k] ?? 0) <= 0) delete s[k];
  normalizeCharms(p);
  const last = run.records.at(-1);
  if (last) last.choice = last.choice ? `${last.choice}, ${title}` : title;
  run.pendingChoice = run.over ? null : (run.choiceQueue?.shift() ?? null);
}
