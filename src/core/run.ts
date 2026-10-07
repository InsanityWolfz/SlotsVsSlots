import { BLADES, cloneConfig, defaultConfig, symLabel, emptyLevels, UNIT, unitsRound, type Enh, type GameConfig, type Gild, type Levels, type RelicId, type StripCounts, type SymbolId } from './config';
import { ACT3_DEPTH_MUL, ACTS, actLength, ARCHETYPES, ELITE_HP_MUL_2, GATEKEEPER, generateRunPaths, makeEnemy, REPO_MAN, TUNE, type EnemyDef, ENDLESS } from './enemies';
import { MAX_STAKE, MIRROR_COPYABLE, mirrorCanUse, STAKE } from './stakes';
import { Fight as FightCtor, type Fight } from './fight';
import {
  BANDAGE_HEAL,
  BELL_MULT,
  KEY_MULT,
  BOSS_HP_PER_RELIC,
  BUILD_ENABLER,
  ELITE_ONLY,
  NEW_RELIC,
  MACHINE_EXCLUDE,
  relicText,
  LEGENDARY,
  RELIC_TIER,
  RELICS,
  RUSH,
  type Enabler,
  LOADED_MUL,
} from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { CHARM_SYMBOLS, charmLevel, charmRuleText, charmShortText, charmTag, charmValue, LEVEL_CAP, playerSymValue, symLevel, symValue, charmName } from './charms';
import { Rng } from './rng';
import { dailyEdge, dailyFightSeed } from './daily';
import { BET_CAP, BETS, MARKER_REFUND, betPayout, betsFrom, dealerBets, betState, HOT_HAND, newTrack, trackEvent, type BetTrack, type PlacedBet, type SideBet } from './bets';
import { scoreLine } from './scoring';
import { BONUS_SYMBOLS, stripCounts } from './strip';

/** Run-level tunables. */
export const RUN = {
  startHp: 32 * UNIT,
  /** Fraction of max HP restored after every won fight (low, so HP cards matter). */
  /** 25% (was 20%): with stacked VAMP gone, sustain is more of a baseline and less a charm tax (EXPERT_PLAYTEST_10). */
  postFightHeal: 0.25,
  /** Act 3's share of the post-fight heal (it had none). */
  act3HealMul: 0.33,
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
  /** Rocks added during one fight that stay for the rest of the run; the rest crumble. */
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
export const ACT1_GILDS: Enh[] = ['gold', 'keen', 'vamp', 'charged', 'spiked', 'thorny', 'lucre', 'trick'];
export const ACT2_GILDS: Enh[] = ['lucky', 'blaze'];
const TESLA_ONLY: ReadonlySet<Enh> = new Set(['charged', 'blaze']);
/** BULWARK (id 'spiked') is KNIGHT's own charm. */
const KNIGHT_ONLY: ReadonlySet<Enh> = new Set(['spiked']);
/** THORNY is BRIAR's own charm. */
const BRIAR_ONLY: ReadonlySet<Enh> = new Set(['thorny']);
/** TRICK is JOKER's (CONTENT_13). */
const JOKER_ONLY: ReadonlySet<Enh> = new Set(['trick']);
/** LUCKY is a later-machine charm (a wild barely changes KNIGHT's or MIDAS's two-symbol line). */
export const LUCKY_MACHINES: ReadonlySet<CabinetId> = new Set(['thorn', 'tesla', 'joker']);
export const gildsFor = (run: RunState): Enh[] =>
  [...ACT1_GILDS, ...(run.act > 1 ? ACT2_GILDS : [])].filter(
    (e) =>
      (run.cabinet === 'tesla' || !TESLA_ONLY.has(e)) &&
      (run.cabinet === 'knight' || !KNIGHT_ONLY.has(e)) &&
      (run.cabinet === 'thorn' || !BRIAR_ONLY.has(e)) &&
      (run.cabinet === 'joker' || !JOKER_ONLY.has(e)) &&
      (e !== 'lucky' || LUCKY_MACHINES.has(run.cabinet)) &&
      // A charm with nothing on your reels to go on is never offered (KEEN on a machine with no swords).
      charmSymbols(run, e).some((sym) => run.player.strips.some((st) => (st[sym] ?? 0) > 0)),
  );
/** Symbols this machine's swap cards move between. */
export const swappable = (run: RunState): SymbolId[] => CABINETS[run.cabinet].symbols;
/** The symbol +2 / rock-swap cards give (the signature symbol, or swords for KNIGHT and JAX). */
export const sigSymbol = (run: RunState): SymbolId => {
  const m = CABINETS[run.cabinet].meter;
  return m && m.symbol !== 'wild' ? m.symbol : CABINETS[run.cabinet].attack;
};

/** Chip economy (earning is passive, spending happens only at the Cashier). */
export const CHIPS = {
  win: 2,
  eliteBonus: 2,
  /** Act 2 elites pay these chips instead of a relic. */
  act2EliteChips: 6,
  perJackpot: 1,
  /** +1 chip per this much overkill on the killing blow. */
  overkillPer: 5 * UNIT,
  /** +1 interest per this many banked chips, capped. */
  interestPer: 5,
  interestCap: 3,
  /** Boss fight: every this many unspent chips = +10 shield at the start of each House turn. */
  stackPer: 8,
  /** Every run starts with a little float so shop 1 is a real visit. */
  start: 8,
  /** Overkill pays at most this many chips per fight (late one-shots were flooding the Cashier). */
  overkillCap: 3,
  prices: { gild: 10, relic: 12, wild: 6, remove: 4, heal: 5, legend: 20, level: 12 },
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
  /** The Cashier: pay off THE REPO MAN's oldest lien. */
  | { kind: 'payLien' }
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
  /** Chips the Mimic ate. */
  chipsEaten?: number;
  /** Chips an act 2 elite paid. */
  eliteChips?: number;
  /** SCARS (RED stake): the reel that took a permanent rock. */
  scar?: number;
  /** Bonus prizes won in this fight. */
  bonuses?: string[];
  rocksAdded: number;
  /** THE REPO MAN: cells and charms he took that stay gone until the act's boss falls. */
  liens?: number;
  rocksCrumbled: number;
  /** Relic taken from an elite's spoils. */
  eliteRelic?: RelicId;
  /** Chips earned from this fight (including interest). */
  chips?: number;
  pick?: DraftOption;
  /** What was bought at the Cashier after this fight. */
  bought?: DraftOption[];
  /** SIDE BET placed on this fight, and whether it paid. */
  bet?: PlacedBet & { won: boolean; refunded?: boolean };
  /** The BIG CHOICE taken after this (boss) fight. */
  choice?: BigChoiceId;
}

/** A cell THE REPO MAN holds: its reel and symbol, and its charm if it had one. */
export interface Lien {
  reel: number;
  symbol: SymbolId;
  enh?: Enh;
}

export interface RunState {
  seed: number;
  /** Index of the next fight (0..5; 5 = boss). */
  depth: number;
  /** Enemy options per depth (2 at a fork). */
  paths: EnemyDef[][];
  /** The enemy chosen (or only option) per depth. */
  enemies: EnemyDef[];
  /** Whether the player has picked at a fork. */
  chosen: boolean[];
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
  /** Current act (1 = the House, 2 = the Mirror). */
  act: number;
  /** An act's boss fell: choose 1 of these legendary relics. */
  pendingLegend: RelicId[] | null;
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
  /** BLOOD PACT: your meter fills twice as fast. */
  bloodPact?: boolean;
  /** SIDE BETS on the next fight: the table's offer (keyed to the fight) and the bet you placed. */
  bets?: { key: string; offer: SideBet[] } | null;
  bet?: PlacedBet | null;
  /** THE REPO MAN's liens: cells (and charms) he holds until the act's boss falls. */
  liens?: Lien[];
  /** THE DAILY RUN: the day it belongs to (its fights are seeded from the day), and the day's HOUSE EDGE. */
  daily?: string;
  dailyEdge?: EdgeId;
  /** THE WEEKLY CHALLENGE (its ISO week key, e.g. 2026-W40): fights fixed by the week, like the daily. */
  weekly?: string;
  /** A CHALLENGE run (its id, or "weekly"), and the HOUSE EDGES it plays under. */
  challenge?: string;
  mods?: EdgeId[];
  /** Liens paid off at the Cashier (achievements). */
  liensPaid?: number;
  /** Side bets placed this run (the bet relics show up after the first). */
  betsPlaced?: number;
  /** MARKER: the act (and loop) whose first busted bet was refunded. */
  markerUsed?: string;
  /** HOT HAND: side bets won in a row (a bust resets it). */
  betStreak?: number;
  /** MASTERWORK: these symbols can't gain levels. */
  levelLock?: SymbolId[];
}

export function createRun(_base: GameConfig, seed = Rng.randomSeed(), cabinet: CabinetId = 'knight', stake = 0, act3 = false): RunState {
  const rng = new Rng(seed);
  const paths = generateRunPaths(rng);
  const cab = CABINETS[cabinet];
  const run: RunState = {
    seed,
    depth: 0,
    paths,
    enemies: paths.map((opts) => opts[0]),
    chosen: paths.map((opts) => opts.length === 1),
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
  const fits = (r: RelicId) => relicFits(run, r) && !LEGENDARY.has(r) && !ELITE_ONLY.has(r);
  const mine = rng.shuffle((Object.keys(RELICS) as RelicId[]).filter((r) => RELICS[r].machine === run.cabinet && !RELICS[r].addon && fits(r))).slice(0, 2);
  const general = RELIC_TIER.common.filter((r) => !isIdentityRelic(r) && fits(r) && r !== 'crown');
  return [...mine, ...rng.shuffle(general)].slice(0, 3);
}

export function takeStart(run: RunState, relic: RelicId): void {
  if (!run.pendingStart?.includes(relic)) return;
  if (!run.player.relics.includes(relic)) run.player.relics.push(relic);
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
    const pool = RELIC_TIER[t].filter((r) => !owned(r) && relicFits(run, r) && !(r === 'crown' && (run.act > 1 || run.depth >= actLength(1))));
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
/** Fights in the base run (2 acts, bosses included) — the most fights any act 1-2 run can have. */
export const TOTAL_FIGHTS = ACTS * (actLength(1) + 1);
/** Fights in this run, bosses included. */
export const totalFights = (run: RunState) => Array.from({ length: runActs(run) }, (_, i) => actLength(i + 1) + 1).reduce((a, b) => a + b, 0);
/** 1-based fight number across the whole run. */
export const fightNumber = (run: RunState) => Array.from({ length: run.act - 1 }, (_, i) => actLength(i + 1) + 1).reduce((a, b) => a + b, 0) + run.depth + 1;

/** The act's boss fell: a new map, a full heal, and a legendary pick. */
function startNextAct(run: RunState): void {
  run.act++;
  run.depth = 0;
  const rng = new Rng((run.seed ^ Math.imul(run.act, 0x3c6ef372)) >>> 0);
  run.paths = generateRunPaths(rng, run.act);
  // BLUE stake: one act 2 fork is your counter (marked on its card).
  if (run.stake >= STAKE.counterForks) offerCounter(run, rng);
  run.enemies = run.paths.map((opts) => opts[0]);
  run.chosen = run.paths.map((opts) => opts.length === 1);
  run.player.hp = run.player.maxHp;
  run.actIntro = true;
  offerChoices(run, rng);
  // Act 3 (THE DEALER): a full heal, a big choice and the Cashier — the legendary pick stays act 2's decision.
  if (run.act > 2) return;
  const pool = [...LEGENDARY].filter((r) => !run.player.relics.includes(r) && relicFits(run, r));
  run.pendingLegend = rng.shuffle(pool).slice(0, RUN.legendPick);
}

/** What answers your build: TESLA's lightning → the Grounder; a charm build → the Counterfeiter; any other meter → the Grounder. */
export function counterFor(run: RunState): string | null {
  const charms = run.player.gilded.reduce((a, g) => a + g.n, 0);
  if (run.cabinet === 'tesla') return 'grounder';
  if (charms >= 4) return 'counterfeiter';
  return CABINETS[run.cabinet].meter ? 'grounder' : null;
}


/** BLUE stake: your counter takes the non-elite slot of ONE act 2 fork (fight 3), marked YOUR COUNTER. */
function offerCounter(run: RunState, rng: Rng): void {
  const id = counterFor(run);
  const arch = id ? ARCHETYPES.find((a) => a.id === id) : undefined;
  if (!arch) return;
  const depth = 2;
  const opts = run.paths[depth];
  if (!opts || opts.length < 2) return;
  const had = opts.findIndex((e) => e.archetype === id);
  const i = had >= 0 ? had : opts.findIndex((e) => !e.elite);
  if (i < 0) return;
  if (had < 0) opts[i] = makeEnemy(arch, depth, rng, false, run.act);
  opts[i].counter = true;
  run.enemies = run.paths.map((o) => o[0]);
}

/** GREEN stake: the relic the Mirror copies — your legendary if it can use it, else your best usable relic. */
export function mirrorCopy(run: RunState): RelicId | null {
  if (run.stake < STAKE.mirrorRelic) return null;
  const own = run.player.relics;
  const legend = own.find((r) => LEGENDARY.has(r) && mirrorCanUse(r));
  return legend ?? MIRROR_COPYABLE.find((r) => own.includes(r)) ?? null;
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
  run.pendingLegend = null;
}

export const currentEnemy = (run: RunState): EnemyDef => run.enemies[Math.min(run.depth, run.enemies.length - 1)];
export const isBossNext = (run: RunState) => run.depth >= actLength(run.act);
/** The next fight is a fork the player hasn't chosen yet. */
export const needsChoice = (run: RunState) => !run.over && !run.chosen[run.depth];

export function chooseEnemy(run: RunState, option: number): void {
  const opts = run.paths[run.depth];
  run.enemies[run.depth] = opts[Math.max(0, Math.min(opts.length - 1, option))];
  run.chosen[run.depth] = true;
}

/** The GameConfig for the run's next fight. */
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
    ...(run.glass ? { payMul: BIG.glassPay } : {}),
    ...(run.bloodPact ? { meterMul: 2 } : {}),
    // BLACK stake: the House ignores your chip shield.
    // No bonus in the run's final fight: a voucher could never be spent (QA_1 B11).
    bonusSymbols: !(e.isBoss && run.act >= runActs(run)),
    chipsHeld: run.player.chips,
    ...(run.bet ? { sideBet: { ...run.bet } } : {}),
    // Saved chips shield you at every boss, capped (a MIDAS hoard made the House untouchable). A side bet's stake
    // doesn't: at the Dealer, ALL IN would otherwise cost nothing (EXPERT_PLAYTEST_8 E9).
    stackShield: e.isBoss && !(e.boss === 'house' && run.stake >= STAKE.houseDirty) ? Math.min(MIRROR_CHIP_SHIELD_CAP, chipShield(run.player.chips)) : 0,
  };
  const hp = enemyHp(run, e);
  cfg.enemy = { hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  // The Mirror plays its own reels (swords, shields, SHARDS): a turn never deals more than REFLECT_CAP of your max HP.
  if (e.boss === 'mirror') cfg.player.stackShield = Math.min(MIRROR_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
  cfg.relics = [...run.player.relics];
  cfg.cabinet = run.cabinet;
  cfg.stake = run.stake;
  cfg.enemy.act = run.act;
  // BLACK stake: the House plants bombs (even on your payline).
  if (e.boss === 'house' && run.stake >= STAKE.houseDirty) cfg.enemy.strips = cfg.enemy.strips.map((s) => ({ ...s, bomb: (s.bomb ?? 0) + STAKE.houseBombsPerReel }));
  if (e.boss === 'dealer') {
    cfg.player.stackShield = Math.min(MIRROR_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
    cfg.player.startMarks = run.deckMarks ?? 0;
  }
  // GREEN stake: the Mirror copies one of your relics.
  if (e.boss === 'mirror' && run.stake >= STAKE.mirrorRelic) {
    const copy = mirrorCopy(run);
    if (copy) cfg.enemy.relics = [copy];
  }
  // HOUSE EDGES bend the fight: the ones taken in endless, and THE DAILY RUN's edge of the day.
  const edges = new Set<EdgeId>([...(run.endless?.edges ?? []), ...(run.dailyEdge ? [run.dailyEdge] : []), ...(run.mods ?? [])]);
  if (edges.has('fast') && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: Math.max(2, cfg.enemy.ability.every - 2) };
  if (edges.has('marked')) cfg.player.startMarks = Math.max(cfg.player.startMarks ?? 0, 3);
  if (edges.has('heal')) cfg.player.healMul = 0.5;
  if (edges.has('rollers')) cfg.enemy.hp = unitsRound(cfg.enemy.hp * 1.3);
  // ENDLESS: damage grows per loop.
  if (run.endless) {
    // The loop House is a race: it cashes its pot every 2 turns.
    if (e.boss === 'house' && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: ENDLESS.houseEvery };
    cfg.enemy.endless = true;
    cfg.enemy.dmgMul = Math.pow(ENDLESS.dmgBy[run.cabinet] ?? ENDLESS.dmg, run.endless.loop);
  }
  // THE DAILY RUN: every fight is fixed by the day, so everyone meets the same fights.
  // The daily locks its spins too (one try: the purest comparison). The weekly locks the map, enemies and offers, but
  // its spins are fresh every try: a retry used to replay the same spins (user playtest).
  cfg.seed = run.daily ? dailyFightSeed(run.seed, run.act, run.depth, run.endless?.loop ?? 0) : null;
  return cfg;
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

/** THE REPO MAN's takes (confiscated charms, repossessed cells) leave your machine as liens. */
function takeLiens(run: RunState, fight: Fight): void {
  const p = run.player;
  const liens: Lien[] = [];
  fight.sides.player.reels.forEach((reel, r) =>
    reel.cells.forEach((c) => {
      // His second take can steal the cell his first one stripped: the cell goes first, then its charm (paying off
      // in that order puts the cell back before the charm needs it).
      if (c.stolen) liens.push({ reel: r, symbol: c.symbol });
      if (c.confiscated) liens.push({ reel: r, symbol: c.symbol, enh: c.confiscated });
    }),
  );
  for (const l of liens.slice(0, GATEKEEPER.maxTakes)) {
    if (l.enh) {
      const g = p.gilded.find((x) => x.reel === l.reel && x.symbol === l.symbol && x.enh === l.enh);
      if (!g) continue;
      g.n--;
      p.gilded = p.gilded.filter((x) => x.n > 0);
    } else {
      const n = p.strips[l.reel][l.symbol] ?? 0;
      if (n <= 0) continue;
      p.strips[l.reel][l.symbol] = n - 1;
    }
    (run.liens ??= []).push(l);
  }
}

/** A lien comes back: the cell, or the charm onto its cell. */
function returnLien(run: RunState, l: Lien): void {
  const p = run.player;
  if (l.enh) addCharms(p, l.reel, l.symbol, l.enh, 1);
  else p.strips[l.reel][l.symbol] = (p.strips[l.reel][l.symbol] ?? 0) + 1;
}

/** A lien in words ("A GOLD CHARM ON A REEL 2 SWORD"). */
export const lienText = (l: Lien) => (l.enh ? `A ${charmName(l.enh)} CHARM ON A REEL ${l.reel + 1} ${symLabel(l.symbol)}` : `A ${symLabel(l.symbol)} ON REEL ${l.reel + 1}`);

/** SIDE BETS are offered before regular fights (not bosses, not the tutorial's first fight, not at a fork). */
export function betsOpen(run: RunState): boolean {
  const e = run.enemies[run.depth];
  // Not on act 1's first fight: a new player meets the table after their first spins (EXPERT_PLAYTEST_9 D8).
  return !run.over && !!e && (!e.isBoss || e.boss === 'dealer') && !needsChoice(run) && !(run.act === 1 && run.depth === 0 && !run.endless);
}

/** The Cashier's table for the next fight: 2 bets, sized by rehearsing this very fight on other seeds. */
export function offerBets(run: RunState, base: GameConfig): SideBet[] {
  if (!betsOpen(run)) return [];
  const key = `${run.act}:${run.endless?.loop ?? 0}:${run.depth}:${run.betStreak ?? 0}`;
  if (run.bets?.key === key) return run.bets.offer;
  const cfg = fightConfig(run, base);
  const rng = new Rng((run.seed ^ Math.imul(fightNumber(run) + 31 + (run.endless?.loop ?? 0) * 97, 0x27d4eb2f)) >>> 0);
  const all: { t: BetTrack; won: boolean }[] = [];
  // The Dealer (one fight a run, long odds) gets twice the rehearsals.
  const samples = cfg.enemy.boss === 'dealer' ? BETS.samples * 2 : BETS.samples;
  for (let i = 0; i < samples; i++) {
    const f = new FightCtor(cfg, rng.int(0xffffffff));
    const t = newTrack();
    while (!f.over && f.turn < 400) for (const e of f.step().events) trackEvent(t, e);
    all.push({ t, won: f.winner === 'player' });
  }
  // The Dealer has his own table (win before his FINAL HAND; survive an ALL IN).
  // One bet a fight (2026-10-07): the Dealer's is his first (win before his FINAL HAND, when it makes a line).
  const raw = cfg.enemy.boss === 'dealer'
    ? dealerBets(all, rng, cfg.enemy.hp, run.player.maxHp).slice(0, 1)
    : betsFrom(all.filter((x) => x.won).map((x) => x.t), BETS.samples, rng, cfg.enemy.hp, run.betStreak ?? 0, run.player.maxHp);
  // LOADED DICE: every line pays more (shown on the card).
  const offer = run.player.relics.includes('loaded') ? raw.map((b) => ({ ...b, pay: Math.round(b.pay * LOADED_MUL * 10) / 10 })) : raw;
  run.bets = { key, offer };
  return offer;
}

/** Stake chips on one of the table's bets (a new bet replaces the old one and refunds it). */
export function placeBet(run: RunState, i: number, stake: number): boolean {
  const b = run.bets?.offer[i];
  if (!b) return false;
  clearBet(run);
  if (run.player.chips < stake) return false;
  run.player.chips -= stake;
  run.bet = { ...b, stake };
  run.betsPlaced = (run.betsPlaced ?? 0) + 1;
  return true;
}

/** MARKER refunds a bust up to this. */
export const markerRefund = (run: RunState) => MARKER_REFUND * stakeMul(run);
/** HIGH LIMIT doubles the stake cap. */
export const stakeMul = (run: RunState) => (run.player.relics.includes('highlimit') ? 2 : 1);
/** The most you may stake: 20 a run, 40 in endless (x2 with HIGH LIMIT). */
export const stakeCap = (run: RunState) => (run.endless ? BET_CAP.endless : BET_CAP.run) * stakeMul(run);
/** The most you can stake right now: the cap, or every chip you hold (counting the one on the table). */
export const maxStake = (run: RunState) => Math.min(stakeCap(run), run.player.chips + (run.bet?.stake ?? 0));
/** The stepper: move your stake on the fight's bet by `delta` (0 takes it off the table). Returns the new stake. */
export function stepStake(run: RunState, delta: number): number {
  const next = Math.max(0, Math.min(maxStake(run), (run.bet?.stake ?? 0) + delta));
  if (next === 0) clearBet(run);
  else if (next !== run.bet?.stake) {
    const placed = !!run.bet;
    placeBet(run, 0, next);
    // Changing the stake isn't a new bet.
    if (placed) run.betsPlaced = Math.max(0, (run.betsPlaced ?? 1) - 1);
  }
  return run.bet?.stake ?? 0;
}

/** Interest paid after a win on the chips you hold then (chips on the table don't count). */
export const interestOn = (chips: number) => Math.min(CHIPS.interestCap, Math.floor(chips / CHIPS.interestPer));

/** Take a placed bet back off the table. */
export function clearBet(run: RunState): void {
  if (run.bet) run.player.chips += run.bet.stake;
  run.bet = null;
}

/** CASH OUT: the pot plus your unspent chips x10. */
export const cashOutValue = (run: RunState) => (run.endless?.pot ?? 0) + run.player.chips * 10;

/** LET IT RIDE: after beating the Dealer, keep going (the win is already recorded). */
export function letItRide(run: RunState): void {
  if (!run.won || run.endless) return;
  run.over = false;
  run.endless = { loop: 1, edges: [], pot: 0 };
  startEndlessLoop(run);
}

/** A new endless loop: 3 fights and a boss (cycling House, Mirror, Dealer), after a HOUSE EDGE pick. */
function startEndlessLoop(run: RunState): void {
  const loop = run.endless!.loop;
  run.act = 4;
  run.depth = 0;
  const rng = new Rng((run.seed ^ Math.imul(loop + 40, 0x3c6ef372)) >>> 0);
  run.paths = generateRunPaths(rng, 4, loop);
  run.enemies = run.paths.map((opts) => opts[0]);
  run.chosen = run.paths.map((opts) => opts.length === 1);
  // NO COMPS: a new loop heals only half your HP.
  run.player.hp = run.endless!.edges.includes('nocomps') ? Math.min(run.player.maxHp, run.player.hp + Math.round(run.player.maxHp / 2)) : run.player.maxHp;
  run.actIntro = false;
  // Never offer an edge you already took (EXPERT_PLAYTEST_4 B4); 3 offered, pick 1, each paying for its cost.
  const open = EDGES.filter((x) => !run.endless!.edges.includes(x));
  const pick = rng.shuffle(open).slice(0, 3);
  // The reward on the card is what you'll really get (no silent swap to chips: EXPERT_PLAYTEST_5 B7).
  const p = run.player;
  const hasLegend = [...LEGENDARY].some((x) => !p.relics.includes(x) && relicFits(run, x));
  const hasRelic = (Object.keys(RELICS) as RelicId[]).some((x) => !p.relics.includes(x) && !LEGENDARY.has(x) && !ELITE_ONLY.has(x) && relicFits(run, x) && !RELICS[x].retired);
  const pay = (t: 'chips' | 'relic' | 'legend'): 'chips' | 'relic' | 'legend' => (t === 'legend' && !hasLegend ? (hasRelic ? 'relic' : 'chips') : t === 'relic' && !hasRelic ? 'chips' : t);
  const edges = pick.map((edge): BigChoice => ({ id: 'edge', edge, reward: pay(EDGE_TIER[edge]) }));
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

export const EDGE_TEXT: Record<EdgeId, { title: string; text: string }> = {
  fast: { title: 'FAST HANDS', text: 'ENEMY ABILITIES CHARGE 2 TURNS FASTER' },
  marked: { title: 'MARKED DECK', text: 'EVERY FIGHT OPENS WITH 1 MARK PER REEL ON YOU' },
  heal: { title: 'HOUSE CUT', text: 'YOUR HEALING IS HALVED' },
  rollers: { title: 'HIGH ROLLERS', text: 'ENEMIES HAVE +30% HP' },
  nocomps: { title: 'NO COMPS', text: 'A NEW LOOP HEALS ONLY HALF YOUR HP' },
  frail: { title: 'GLASS JAW', text: '-10% MAX HP' },
};

/**
 * An enemy's real HP for this run. Bosses grow with the relics you bring in; the Mirror is sized to
 * you (a mirror match needs your relics to win).
 */
/** The tutorial's first opponent has this much of its HP (you're reading callouts, not building). */
export const TUTORIAL_OPENER_MUL = 0.75;

export function enemyHp(run: RunState, e: EnemyDef): number {
  const gold = e.isBoss && run.stake >= STAKE.fasterAll ? STAKE.goldBossHp : 1;
  const tutorial = run.tutorial && run.act === 1 && e.depth === 0 ? TUTORIAL_OPENER_MUL : 1;
  const loop = run.endless ? Math.pow(ENDLESS.hpBy[run.cabinet] ?? ENDLESS.hp, run.endless.loop) : 1;
  // THE DAILY RUN plays act 3 at base-stake numbers: its act 3 (the Dealer included) is lighter.
  const daily = fixedRun(run) && run.act >= 3 && !run.endless ? TUNE.dailyAct3 : 1;
  // Per machine: THE REPO MAN's HP (his liens cost machines differently: MIDAS loses its gold).
  const gate = e.archetype === REPO_MAN.id ? (BOSS_MUL[run.cabinet].gate ?? 1) : 1;
  return Math.min(ENDLESS.clamp, unitsRound(baseEnemyHp(run, e) * gold * tutorial * loop * daily * gate));
}

function baseEnemyHp(run: RunState, e: EnemyDef): number {
  // Act 3 regulars grow with your machine (never below their curve).
  if (!e.isBoss && run.act >= 3) {
    const arch = ARCHETYPES.find((a) => a.id === e.archetype);
    const mul = (ACT3_DEPTH_MUL[Math.min(e.depth, ACT3_DEPTH_MUL.length - 1)] ?? 1) * (arch?.hpMul ?? 1) * (e.elite ? ELITE_HP_MUL_2 : 1);
    return Math.max(unitsRound(e.hp * (BOSS_MUL[run.cabinet].act3Floor ?? 1)), unitsRound((TUNE.act3Power * BOSS_MUL[run.cabinet].act3 * sizingPower(run, 'act3') + TUNE.act3Flat) * mul));
  }
  // Act 2 regulars grow with your machine too (fixed HP turned them to paper for strong builds: EXPERT_PLAYTEST_2 G6).
  if (!e.isBoss && run.act === 2) {
    const arch = ARCHETYPES.find((a) => a.id === e.archetype);
    const mul = (ACT3_DEPTH_MUL[Math.min(e.depth, ACT3_DEPTH_MUL.length - 1)] ?? 1) * (arch?.hpMul ?? 1) * (e.elite ? ELITE_HP_MUL_2 : 1);
    // Per machine: act 2 fight length (BRIAR ran ~30 turns, JAX ~9: EXPERT_PLAYTEST_3 E11).
    const m2 = BOSS_MUL[run.cabinet].act2 ?? 1;
    return unitsRound(Math.max(e.hp, TUNE.act2Power * BOSS_MUL[run.cabinet].act3 * sizingPower(run, 'mirror') * mul) * m2);
  }
  // Per machine: act 1 regular HP (MIDAS is slow to start: EXPERT_PLAYTEST_5).
  const m1 = run.act === 1 ? (BOSS_MUL[run.cabinet].act1 ?? 1) : 1;
  if (!e.isBoss) return unitsRound((run.act === 1 && e.depth === 0 && CABINETS[run.cabinet].hp < FRAGILE_HP ? e.hp * FRAGILE_OPENER_MUL : e.hp) * m1);
  // ENDLESS: loop bosses are sized from your power (the loop House was a free win; the loop Dealer a sponge).
  if (run.endless) {
    const regular = TUNE.act3Power * BOSS_MUL[run.cabinet].act3 * sizingPower(run, 'act3') + TUNE.act3Flat;
    const share = e.boss === 'house' ? ENDLESS.houseHp : e.boss === 'dealer' ? ENDLESS.dealerHp : ENDLESS.mirrorHp;
    return unitsRound(regular * share);
  }
  // The Mirror grows with your machine and (like the House) with every relic you carry in.
  const cm = BOSS_MUL[run.cabinet];
  // GREEN+: the Mirror copies one of your relics, so it gets less HP (it was the run's real wall: EXPERT_PLAYTEST_6 E10).
  // THE DAILY RUN goes on to the Dealer too, so its Mirror is the eased one (without the copied relic).
  if (e.boss === 'mirror') return unitsRound((unitsRound(TUNE.mirrorPower * cm.mirror * sizingPower(run, 'mirror')) + TUNE.mirrorFlat + TUNE.mirrorPerRelic * run.player.relics.length) * (run.stake >= STAKE.mirrorRelic || fixedRun(run) ? TUNE.greenMirror : 1));
  if (e.boss === 'dealer') return unitsRound(TUNE.dealerPower * cm.dealer * sizingPower(run, 'dealer')) + TUNE.dealerFlat + TUNE.mirrorPerRelic * run.player.relics.length;
  // BLACK+: the House cheats (faster skims, payline bombs, no chip shield) instead of just being tougher.
  const house = run.stake >= STAKE.houseDirty ? Math.sqrt(cm.house) : cm.house;
  return unitsRound(e.hp * house) + BOSS_HP_PER_RELIC * run.player.relics.length;
}

/**
 * Your machine's damage per turn, MEASURED: the real engine plays POWER_SPINS of your turns (your strips,
 * charms, levels, relics and meter) against a dummy that attacks back, deterministic per run and fight.
 * Each turn is capped at the 90th percentile so one freak jackpot doesn't size a boss. Bosses and act 3
 * regulars are sized from it, so they keep up with any build without a fixed curve.
 */
export function machinePower(run: RunState): number {
  const key = `${run.seed}:${run.act}:${run.depth}:${JSON.stringify(run.player)}`;
  const hit = powerCache.get(key);
  if (hit !== undefined) return hit;
  const cfg = defaultConfig();
  cfg.player = { hp: 99999 * UNIT, strips: run.player.strips.map((s) => ({ ...s })), gilded: run.player.gilded.map((g) => ({ ...g })), levels: cloneLevels(run.player.levels), ...(run.glass ? { payMul: BIG.glassPay } : {}), ...(run.bloodPact ? { meterMul: 2 } : {}), chipsHeld: Math.min(run.player.chips, 20) };
  cfg.enemy = { hp: 99999 * UNIT, strips: [{ sword: 8, shield: 4 }, { sword: 8, shield: 4 }, { sword: 8, shield: 4 }], ability: null };
  cfg.relics = run.player.relics.filter((r) => r !== 'phoenix');
  cfg.cabinet = run.cabinet;
  const f = new FightCtor(cfg, (run.seed ^ Math.imul(run.act * 16 + run.depth + 1, 0x2545f491)) >>> 0);
  const turns: number[] = [];
  for (let t = 0; t < POWER_SPINS * 2 && !f.over; t++) {
    const { side, events } = f.step();
    let d = 0;
    for (const e of events) if ((e.type === 'attack' || e.type === 'specialFire') && e.from === 'player') d += e.hpDamage;
    if (side === 'player') turns.push(d);
    else if (turns.length) turns[turns.length - 1] += d;
  }
  const sorted = [...turns].sort((x, y) => x - y);
  const cap = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
  const power = turns.reduce((a, d) => a + Math.min(d, cap), 0) / Math.max(1, turns.length);
  if (powerCache.size > 5000) powerCache.clear();
  powerCache.set(key, power);
  return power;
}
const POWER_SPINS = 40;

/**
 * Typical measured power at each late point, per slot machine (median greedy GREEN run,
 * tools/balance/power_ref.ts). Late enemies are sized from REF x (your power / REF)^powerElastic, so
 * a build twice as strong as usual faces ~1.4x the HP, not 2x: getting stronger pays off.
 */
export const POWER_REF: Record<CabinetId, { mirror: number; act3: number; dealer: number }> = {
  knight: { mirror: 405, act3: 1578, dealer: 2375 },
  midas: { mirror: 761, act3: 1494, dealer: 1851 },
  thorn: { mirror: 159, act3: 317, dealer: 695 },
  tesla: { mirror: 246, act3: 566, dealer: 872 },
  joker: { mirror: 826, act3: 6465, dealer: 8499 },
};
export function sizingPower(run: RunState, at: 'mirror' | 'act3' | 'dealer'): number {
  const ref = POWER_REF[run.cabinet][at];
  return ref * Math.pow(Math.max(1, machinePower(run)) / ref, TUNE.powerElastic);
}
/**
 * Per slot machine: how much of your measured power the Mirror, the Dealer and act 3 regulars are sized
 * to. Machines race differently (KNIGHT's shields, JAX's rare huge payoffs, BRIAR's thorns that need to
 * be hit), so the same HP formula would give each a different win rate.
 */
/** TOLL BOOTH: chips per held lien per win (EXPERT_PLAYTEST_11 D5). */
export const TOLL_PER_LIEN = 2;

export const BOSS_MUL: Record<CabinetId, { house: number; mirror: number; dealer: number; act3: number; act2?: number; act1?: number; gate?: number; act3Floor?: number }> = {
  knight: { house: 2.0, mirror: 1.6, dealer: 0.8, act3: 0.5, gate: 1.3 },
  // act3Floor: MIDAS's act-3 regulars may go below their curve (the act3 knob did nothing under the floor: EXPERT_PLAYTEST_11 D4).
  midas: { house: 3, mirror: 2.5, dealer: 2.1, act3: 0.12, act1: 0.55, act2: 0.55, gate: 0.8, act3Floor: 1 },
  thorn: { house: 0.85, mirror: 75, dealer: 2.2, act3: 1.3, act2: 0.6, gate: 1.55 },
  tesla: { house: 1.5, mirror: 3.1, dealer: 3, act3: 1.6, act1: 1.35, act2: 1.2, gate: 1.0 },
  joker: { house: 2.2, mirror: 3.1, dealer: 0.8, act3: 0.35, act2: 1.8, gate: 0.85 },
};
const powerCache = new Map<string, number>();
/** Saved chips shield at most this much per Mirror turn (hoarding guard). */
export const MIRROR_CHIP_SHIELD_CAP = 4 * UNIT;
/** Cabinets this fragile face a softer opener (ITERATION_8: 3-5% opener deaths). */
const FRAGILE_HP = 26 * UNIT;
const FRAGILE_OPENER_MUL = 0.85;

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
  // Rocks are real cells, but only a couple per fight stay for good; the rest crumble.
  let extra = rocksIn(next) - rocksIn(old) - RUN.permanentRocksPerFight;
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
  // Chips: interest on what you banked, then the win, elite bonus, jackpots and overkill.
  const beaten = currentEnemy(run);
  const interest = interestOn(run.player.chips);
  // PIGGY BANK: more interest on what you hold.
  const piggy = run.player.relics.includes('piggy') ? Math.min(NEW_RELIC.piggyMax, Math.floor(run.player.chips / NEW_RELIC.piggyPer)) : 0;
  const earned =
    interest +
    piggy +
    CHIPS.win +
    (CABINETS[run.cabinet].chipsPerWin ?? 0) +
    (beaten.elite ? CHIPS.eliteBonus : 0) +
    fight.playerJackpots * CHIPS.perJackpot +
    Math.min(CHIPS.overkillCap, Math.floor(fight.overkill / CHIPS.overkillPer));
  run.player.chips += earned;
  record.chips = earned + fight.lucreChips;
  // SIDE BET: paid stake x pay if it came in (a lost fight ends the run, bet and all).
  if (run.bet) {
    const won = betState(run.bet, fight.betTrack, true) === 'won';
    // (MIDAS was already paid mid-fight, with his gold-bar chips.)
    if (won && !fight.betPaid) run.player.chips += betPayout(run.bet);
    record.bet = { ...run.bet, won };
    // MARKER: the first bust each act (each loop in endless) is refunded.
    const act = `${run.act}:${run.endless?.loop ?? 0}`;
    if (!won && run.player.relics.includes('marker') && run.markerUsed !== act) {
      run.markerUsed = act;
      // Up to a small stake (a big one was a free roll: EXPERT_PLAYTEST_7 E1).
      run.player.chips += Math.min(run.bet.stake, markerRefund(run));
      record.bet.refunded = true;
    }
    run.betStreak = won ? Math.min(HOT_HAND.max, (run.betStreak ?? 0) + 1) : 0;
  }
  run.bet = null;
  run.bets = null;
  // THE REPO MAN fell: what he holds stays gone until the act's boss falls (or you pay it off).
  if (beaten.archetype === REPO_MAN.id) {
    const before = run.liens?.length ?? 0;
    if (GATEKEEPER.persist) takeLiens(run, fight);
    const taken = (run.liens?.length ?? 0) - before;
    if (taken) record.liens = taken;
    // His bounty (the fork he replaced could have paid an elite's spoils).
    run.player.chips += GATEKEEPER.bounty;
    record.chips = (record.chips ?? 0) + GATEKEEPER.bounty;
  }
  // TOLL BOOTH: every lien THE REPO MAN holds pays 2 chips after each win (keep them, or pay them off). 1 was dead weight.
  if (record.won && run.player.relics.includes('toll') && run.liens?.length) {
    run.player.chips += TOLL_PER_LIEN * run.liens.length;
    record.chips = (record.chips ?? 0) + TOLL_PER_LIEN * run.liens.length;
  }
  // Act 2 elites pay chips (more relics made the Mirror a walkover: ITERATION_8).
  if (beaten.elite && run.act > 1) {
    run.player.chips += CHIPS.act2EliteChips;
    record.chips = (record.chips ?? 0) + CHIPS.act2EliteChips;
    record.eliteChips = CHIPS.act2EliteChips;
  }
  // Act 1 elites offer their spoils: choose 1 of 2 relics.
  if (beaten.elite && run.act === 1) {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && relicFits(run, r) && !LEGENDARY.has(r));
    const rng = new Rng((run.seed ^ Math.imul(run.depth + 7 + run.act * 100, 0x85ebca6b)) >>> 0);
    const spoils = pickRelics(pool, 2, rng);
    if (spoils.length) run.pendingSpoils = spoils;
  }
  // Act 3: THE HOUSE DOESN'T COMP — no patch-up between fights.
  // GLASS CANNON: no healing between fights at all.
  let hp = p.hp + (run.glass ? 0 : unitsRound(run.player.maxHp * RUN.postFightHeal * (run.stake >= STAKE.halfHeal ? 0.5 : 1) * (run.act >= 3 ? RUN.act3HealMul : 1)));
  // THE DECK REMEMBERS: the Card Sharp's marks carry into the Dealer fight.
  // The Dealer's own marks don't carry on; the deck resets once it falls.
  run.deckMarks = beaten.boss === 'dealer' ? 0 : Math.min(DECK_MARKS_CAP, (run.deckMarks ?? 0) + fight.marksPlaced);
  if (run.player.relics.includes('bandage') && !run.glass) hp += BANDAGE_HEAL;
  // BANK VAULT (CASH CASSIDY): after each win, a plain sword gets a GOLD charm.
  if (run.player.relics.includes('vault')) {
    const reels = [0, 1, 2].filter((r) => plainCells(run.player, r, 'sword') > 0);
    if (reels.length) addCharms(run.player, new Rng((run.seed ^ Math.imul(fightNumber(run) + 11, 0x9e3779b1)) >>> 0).pick(reels), 'sword', 'gold', 1);
  }
  // TROPHY BELT: every win adds max HP.
  if (run.player.relics.includes('trophy')) {
    run.player.maxHp += NEW_RELIC.trophyHp;
    hp += NEW_RELIC.trophyHp;
  }
  run.player.hp = Math.min(run.player.maxHp, hp);
  // Bonus vouchers from this fight pay out now that you've won it (after the HP settles, so a
  // wheel HEAL / MAX HP isn't overwritten — QA_1 B2).
  run.bonusLog = fight.vouchers.map((v) => payVoucher(run, v, !holdWheel));
  if (run.bonusLog.length) record.bonuses = run.bonusLog.map((b) => b.label);
  run.depth++;
  if (run.depth > actLength(run.act)) {
    // The act's boss fell: THE REPO MAN gives everything back.
    for (const l of run.liens ?? []) returnLien(run, l);
    run.liens = [];
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
  /** Expected meter fill per spin (TESLA energy, MIDAS gold, BRIAR thorns, JAX wilds). */
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

export const isRelicDraft = (run: RunState) => RUN.relicDraftsAfter.includes(run.depth);

/** Every CHARM card you could be offered: `n` charms on plain cells of one symbol on one reel. */
/** Symbols a charm can go on for this run (relics bend it: charms on your signature symbol). */
export function charmSymbols(run: RunState, enh: Enh): SymbolId[] {
  const has = (r: RelicId) => run.player.relics.includes(r);
  const out = new Set<SymbolId>(CHARM_SYMBOLS[enh]);
  if ((enh === 'gold' || enh === 'vamp') && has('graft')) out.add('thorn');
  // LOADED CHIPS (CASH CASSIDY): gold and vamp fit chip symbols, so MAKE IT RAIN can be charmed.
  if ((enh === 'gold' || enh === 'vamp') && has('loadedchips')) out.add('goldbar');
  if ((enh === 'gold' || enh === 'keen' || enh === 'vamp') && has('stacked')) out.add('wild');
  if (enh === 'vamp' && has('kiss')) for (const s of ['shield', 'bolt', 'goldbar', 'thorn'] as SymbolId[]) out.add(s);
  return [...out];
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
    const favored = CABINETS[run.cabinet].favors;
    const pool = gildsFor(run);
    // Act 2: the new charms show up half the time.
    const act2 = pool.filter((e) => ACT2_GILDS.includes(e));
    const enh = favored && pool.includes(favored) && rng.next() < 0.5 ? favored : act2.length && rng.next() < 0.5 ? rng.pick(act2) : rng.pick(pool.filter((e) => !ACT2_GILDS.includes(e)));
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
      else if (plainCells(p, reel, 'shield') >= RUN.wildCount && (s.shield ?? 0) > RUN.wildCount) options.push({ kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  const hpCard = (): DraftOption => (p.hp < p.maxHp * 0.75 && !run.glass ? { kind: 'heal', amount: RUN.healCard } : { kind: 'maxHp', amount: RUN.maxHpCard });
  const relicCard = (): DraftOption | null => {
    const pool = (Object.keys(RELICS) as RelicId[]).filter(
      (r) => !p.relics.includes(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && (run.act > 1 || !LEGENDARY.has(r)) && !out.some((o) => o.kind === 'relic' && o.relic === r),
    );
    // One relic card per draft is yours: your machine's or your charms' (while any are left).
    const ident = pool.filter(isIdentityRelic);
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
    case 'payLien':
      if (run.liens?.length) {
        returnLien(run, run.liens.shift()!);
        run.liensPaid = (run.liensPaid ?? 0) + 1;
      }
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

export const isShopNow = (run: RunState) => (run.endless ? !run.over && run.depth === 2 : isShopNowActs(run));
const isShopNowActs = (run: RunState) => !run.over && (RUN.shopAfter.includes(run.depth) || run.actIntro);
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
  const favored = CABINETS[run.cabinet].favors;
  const extend = gildOptions.filter((o) => o.kind === 'gild' && (p.gilded.some((g) => g.enh === o.enh) || o.enh === favored));
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
  const legends = run.act > 1 ? [...LEGENDARY].filter((r) => !p.relics.includes(r) && relicFits(run, r)) : [];
  if (legends.length) add({ kind: 'relic', relic: rng.pick(legends) }, P.legend);
  else add(relics.length ? { kind: 'relic', relic: rng.pick(relics) } : null, P.relic);
  const u = rng.next();
  if (u < 0.35) {
    const reels = p.strips.map((s, reel) => ({ s, reel })).filter(({ s, reel }) => (s.shield ?? 0) > RUN.wildCount && plainCells(p, reel, 'shield') >= RUN.wildCount);
    add(reels.length ? { kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel: rng.pick(reels).reel } : null, P.wild);
  } else if (u < 0.7) {
    const junk = p.strips.flatMap((s, reel) => (['rock', 'shield'] as SymbolId[]).filter((sym) => (s[sym] ?? 0) > 0).map((symbol) => ({ kind: 'remove' as const, symbol, reel })));
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
  if (items.length < 4) add({ kind: 'maxHp', amount: RUN.maxHpCard }, P.heal);
  // Rerolls also redraw the layout: the four slots come in a new order.
  const shelf = run.shopRerolls > 0 ? rng.shuffle(items.slice(0, 4)) : items.slice(0, 4);
  run.shelfKeys = shelf.map((i) => JSON.stringify(i.option));
  // HEAL is a permanent service slot, sized to what you're missing (hidden when nearly full).
  const missing = p.maxHp - p.hp;
  if (missing >= 3 * UNIT && !run.glass) shelf.push({ option: { kind: 'heal', amount: Math.min(RUN.healCard, missing) }, price: P.heal, sold: false });
  // THE REPO MAN's liens: pay one off (a service slot, like the heal).
  if (run.liens?.length) shelf.push({ option: { kind: 'payLien' }, price: GATEKEEPER.lienPrice, sold: false });
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
const BET_RELICS: ReadonlySet<RelicId> = new Set<RelicId>(['loaded', 'marker', 'highlimit']);

export function relicFits(run: RunState, r: RelicId): boolean {
  const def = RELICS[r];
  // Slot machine relics only on their machine; charm relics once you own the charm (or your machine favours it).
  if (def.retired || MACHINE_EXCLUDE[r]?.includes(run.cabinet)) return false;
  // Bet relics show up once you've placed a side bet this run (dead picks otherwise).
  if (BET_RELICS.has(r) && !run.betsPlaced) return false;
  if (def.machine && def.machine !== run.cabinet) return false;
  if (def.charm && charmCount(run.player, def.charm) === 0) return false;
  const need = BUILD_ENABLER[r];
  if (!need) return true;
  const has = (n: Enabler): boolean => {
    if (n === 'wild') return run.player.strips.some((s) => (s.wild ?? 0) > 0);
    if (n === 'charm') return run.player.gilded.length > 0;
    if (n === 'meter') return !!CABINETS[run.cabinet].meter;
    if (n === 'thorns') return CABINETS[run.cabinet].meter?.kind === 'thorns';
    return charmCount(run.player, n) > 0;
  };
  return (Array.isArray(need) ? need : [need]).every(has);
}

export function buy(run: RunState, item: ShopItem): boolean {
  if (item.sold || run.player.chips < item.price) return false;
  run.player.chips -= item.price;
  applyOption(run, item.option, false);
  item.sold = true;
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
  run.actIntro = false;
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
      return { title: 'CLEAR ROCKS', text: `SMASH EVERY ROCK ON REEL ${o.reel + 1}` };
    case 'relic':
      return { title: RELICS[o.relic].name, text: relicText(o.relic, run?.cabinet) };
    case 'heal':
      return { title: `HEAL ${o.amount}`, text: `RESTORE ${o.amount} HP NOW` };
    case 'maxHp':
      return { title: `+${o.amount} MAX HP`, text: `GAIN ${o.amount} MAX HP (AND HEAL IT)` };
    case 'payLien': {
      const l = run?.liens?.[0];
      return { title: 'PAY OFF A LIEN', text: l ? `THE REPO MAN GIVES BACK ${lienText(l)}` : 'NOTHING OWED' };
    }
    case 'gild':
      return {
        title: `${o.n} ${charmName(o.enh)} CHARM${o.n > 1 ? 'S' : ''}`,
        text: `REEL ${o.reel + 1} ${plural(o.symbol, o.n)}: ${charmShortText(o.enh, charmLevel(lv, o.enh, ticket))}`,
      };
    case 'symLevel': {
      const cap = run ? levelCap(run) : LEVEL_CAP;
      const next = Math.min(cap, symLevel(lv, o.symbol) + 1);
      return { title: `${plural(o.symbol, 2)} ${lvTag(next, cap)}`, text: `EVERY ${symLabel(o.symbol)} IS WORTH ${symValue(next)}` };
    }
    case 'charmLevel': {
      const cap = run ? levelCap(run) : LEVEL_CAP;
      const next = Math.min(cap, charmLevel(lv, o.enh) + 1);
      return { title: `${charmName(o.enh)} ${lvTag(next, cap)}`, text: `ALL ${charmName(o.enh)}: ${charmShortText(o.enh, next + (ticket ? 1 : 0))}` };
    }
    case 'remove':
      return { title: `-1 ${symLabel(o.symbol)}`, text: `REMOVE A ${symLabel(o.symbol)} FROM REEL ${o.reel + 1}` };
  }
}

/** The tag a charm shows at your current level (e.g. X2, +5). */
export const charmTagFor = (run: RunState, enh: Enh) => charmTag(enh, charmLevel(run.player.levels, enh, run.player.relics.includes('ticket')));
// ---- post-boss BIG CHOICES (Tuesday Step E) ------------------------------------------------

/**
 * After the House and the Mirror you pick 1 of 3 build-defining moves from one set (never the same set
 * twice in a run). Strong options carry a real, visible cost; each set has one safe pick.
 */
export type BigChoiceId = 'edge' | 'cashOut' | 'ride' | 'armsRace' | 'masterwork' | 'whetstone' | 'meltDown' | 'gildLot' | 'polish' | 'cleanCut' | 'twinReel' | 'sweepUp' | 'glassCannon' | 'bloodPact' | 'secondWind';
/** HOUSE EDGES: endless-mode rules you take on, each paying a reward. */
export type EdgeId = 'fast' | 'marked' | 'heal' | 'rollers' | 'nocomps' | 'frail';
export const EDGES: EdgeId[] = ['fast', 'marked', 'heal', 'rollers', 'nocomps', 'frail'];
/** How much each edge costs you, and so what it pays (EXPERT_PLAYTEST_4 C1: rewards sized to cost). */
export const EDGE_TIER: Record<EdgeId, 'chips' | 'relic' | 'legend'> = { frail: 'chips', heal: 'relic', fast: 'chips', marked: 'legend', rollers: 'legend', nocomps: 'chips' };
/** The endless Cashier sells levels past the cap. */
export const levelCap = (run: RunState) => (run.endless ? LEVEL_CAP + 1 : LEVEL_CAP);
/** RIDE AGAIN: each loop cleared adds this x loop to the pot; a bust banks half. */
export const POT_PER_LOOP = 1500;
/** Loop bosses by name (the RIDE card says who's next). */
const BOSS_NAME: Record<string, string> = { house: 'THE HOUSE', mirror: 'THE MIRROR', dealer: 'THE DEALER' };
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
}
export const BIG_SETS: BigChoiceId[][] = [
  ['armsRace', 'masterwork', 'whetstone'],
  ['meltDown', 'gildLot', 'polish'],
  ['cleanCut', 'twinReel', 'sweepUp'],
  ['glassCannon', 'bloodPact', 'secondWind'],
];
export const BIG_SET_NAMES = ['THE FORGE', 'THE MELT', 'SURGERY', "DEVIL'S BARGAIN"];
/** The safe pick in each set (no cost). */
export const SAFE_CHOICES: ReadonlySet<BigChoiceId> = new Set(['whetstone', 'polish', 'sweepUp', 'secondWind']);
export const BIG = { armsRaceHp: 6 * UNIT, sweepHeal: 10 * UNIT, secondWindHp: 4 * UNIT, secondWindShare: 0.2, bloodPactHp: 0.25, gildLotHp: 0.25, gildLotCells: 3, glassPay: 1.5 };

const SYM_NAME = (s: SymbolId) => `${symLabel(s)}S`;

/** Title, rule and cost as plain card text (no expected values). */
export function describeChoice(run: RunState, c: BigChoice): { title: string; rule: string; cost: string } {
  const meter = !!CABINETS[run.cabinet].meter;
  switch (c.id) {
    case 'edge': {
      const t = EDGE_TEXT[c.edge!];
      return { title: t.title, rule: c.reward === 'legend' ? 'PICK A LEGENDARY RELIC' : c.reward === 'relic' ? 'PICK A RELIC' : `+${ENDLESS.edgeChips} CHIPS`, cost: `HOUSE EDGE: ${t.text}` };
    }
    case 'cashOut':
      return { title: 'CASH OUT', rule: `BANK THE POT: ${cashOutValue(run)} POINTS (INCLUDES ${run.player.chips} CHIPS X10). THE RUN ENDS.`, cost: '' };
    case 'ride':
      return { title: 'RIDE AGAIN', rule: `LOOP ${run.endless?.loop ?? 1}: ${BOSS_NAME[run.enemies[run.enemies.length - 1]?.boss ?? 'house'] ?? 'THE HOUSE'}. YOU ${run.player.hp}/${run.player.maxHp} HP. CLEAR IT AND THE POT GROWS TO ${nextPot(run.endless?.pot ?? 0)}.`, cost: `BUST AND YOU BANK A THIRD OF THE POT: ${bustPot(run.endless?.pot ?? 0)} (YOUR CHIPS ARE SAFE)` };
    case 'armsRace':
      return { title: 'ARMS RACE', rule: '+1 LEVEL TO ALL YOUR SYMBOLS', cost: `-${BIG.armsRaceHp} MAX HP` };
    case 'masterwork':
      return { title: 'MASTERWORK', rule: `+2 LEVELS TO YOUR ${SYM_NAME(c.symbol!)}`, cost: 'YOUR OTHER SYMBOLS CAN NEVER LEVEL UP AGAIN' };
    case 'whetstone':
      return { title: 'WHETSTONE', rule: `+1 LEVEL TO YOUR ${SYM_NAME(c.symbol!)}`, cost: '' };
    case 'meltDown':
      return { title: 'MELT IT DOWN', rule: 'EVERY CHARM ON YOUR REELS BECOMES GOLD, AT YOUR BEST CHARM LEVEL', cost: 'YOUR OTHER CHARM LEVELS ARE GONE' };
    case 'gildLot':
      return { title: 'SOLID GOLD', rule: `EVERY REEL GETS ${BIG.gildLotCells} GOLD CHARMS (ON PLAIN ${SYM_NAME(CABINETS[run.cabinet].attack)}, SHIELDS OR BOLTS)`, cost: `YOUR SYMBOLS LOSE A LEVEL, -${Math.round(BIG.gildLotHp * 100)}% MAX HP` };
    case 'polish':
      return { title: 'POLISH', rule: `+1 LEVEL TO YOUR ${charmName(c.enh!)} CHARMS`, cost: '' };
    case 'cleanCut':
      return { title: 'CLEAN CUT', rule: `REMOVE EVERY SHIELD FROM REEL ${c.reel! + 1}. +1 LEVEL TO ${SYM_NAME(CABINETS[run.cabinet].attack)}`, cost: 'THOSE SHIELDS AND THEIR CHARMS ARE GONE' };
    case 'twinReel':
      return { title: 'TWIN REEL', rule: 'REEL 3 BECOMES AN EXACT COPY OF REEL 1, CHARMS INCLUDED', cost: "REEL 3'S OLD CELLS ARE GONE" };
    case 'sweepUp':
      return { title: 'SWEEP UP', rule: run.player.hp >= run.player.maxHp ? `+${BIG.sweepHeal / 2} MAX HP AND SMASH EVERY ROCK ON YOUR REELS` : `HEAL ${BIG.sweepHeal} AND SMASH EVERY ROCK ON YOUR REELS`, cost: '' };
    case 'glassCannon':
      return { title: 'GLASS CANNON', rule: `EVERY PAYING GROUP PAYS X${BIG.glassPay}`, cost: 'NO MORE HEALING BETWEEN FIGHTS, BANDAGE AND CASHIER INCLUDED' };
    case 'bloodPact':
      return meter
        ? { title: 'BLOOD PACT', rule: 'YOUR METER FILLS TWICE AS FAST', cost: `-${Math.round(BIG.bloodPactHp * 100)}% MAX HP` }
        : { title: 'BLOOD PACT', rule: '+1 LEVEL TO SWORDS AND SHIELDS', cost: `-${Math.round(BIG.bloodPactHp * 100)}% MAX HP` };
    case 'secondWind':
      return { title: 'SECOND WIND', rule: `HEAL TO FULL, +${secondWindHp(run)} MAX HP AND +1 LEVEL TO SHIELDS`, cost: '' };
  }
}

/** SECOND WIND grows with you: +20% max HP (at least 40). A flat +40 was the weakest pick by 3 GREEN points. */
const secondWindHp = (run: RunState) => Math.max(BIG.secondWindHp, unitsRound(run.player.maxHp * BIG.secondWindShare));

/** Your symbols (on your strips) that levels apply to. */
const levelSyms = (run: RunState) => CABINETS[run.cabinet].symbols.filter((s) => run.player.strips.some((x) => (x[s] ?? 0) > 0));

/** Roll the three choices of one set (targets included). */
export function rollChoices(run: RunState, set: number, rng: Rng): BigChoice[] {
  const p = run.player;
  const syms = levelSyms(run);
  const count = (s: SymbolId) => p.strips.reduce((a, x) => a + (x[s] ?? 0), 0);
  // Targets below the level cap only: a level card that lands on a maxed type does nothing.
  const open = syms.filter((s) => symLevel(p.levels, s) < LEVEL_CAP);
  const most = open.reduce((a, b) => (count(b) > count(a) ? b : a), open[0] ?? syms[0] ?? 'sword');
  const lowest = [...syms].sort((a, b) => symLevel(p.levels, a) - symLevel(p.levels, b) || count(b) - count(a))[0] ?? 'shield';
  const charms = [...new Set(p.gilded.map((g) => g.enh))].filter((e) => charmLevel(p.levels, e) < LEVEL_CAP);
  const topCharm = charms.reduce((a, b) => (charmCount(p, b) > charmCount(p, a) ? b : a), charms[0] ?? 'gold');
  const shieldReel = [0, 1, 2].reduce((a, b) => ((p.strips[b].shield ?? 0) > (p.strips[a].shield ?? 0) ? b : a), 0);
  void rng;
  return BIG_SETS[set].map((id): BigChoice => {
    if (id === 'masterwork') return { id, symbol: most };
    // Nothing left to level: the set's safe pick becomes SECOND WIND (its shield level aside, it always does something).
    if (id === 'whetstone') return open.length ? { id, symbol: lowest } : { id: 'secondWind' };
    if (id === 'polish') return charms.length ? { id, enh: topCharm } : { id: 'secondWind' };
    if (id === 'cleanCut') return { id, reel: shieldReel };
    return { id };
  });
}

/** A boss fell: roll one set you haven't seen this run (THE MELT needs a charm to melt; THE FORGE a symbol to level). */
export function offerChoices(run: RunState, rng: Rng): void {
  const used = run.choiceSets ?? [];
  // Every symbol at the cap: MASTERWORK and ARMS RACE would be dead cards (EXPERT_PLAYTEST_12 D5).
  const forgeDead = levelSyms(run).every((s) => symLevel(run.player.levels, s) >= LEVEL_CAP);
  const ok = [0, 1, 2, 3].filter((i) => !used.includes(i) && (i !== 1 || run.player.gilded.length > 0) && (i !== 0 || !forgeDead));
  if (!ok.length) return;
  const set = rng.pick(ok);
  run.choiceSets = [...used, set];
  run.pendingChoice = rollChoices(run, set, rng);
}

export function takeChoice(run: RunState, c: BigChoice): void {
  if (!run.pendingChoice?.some((x) => x.id === c.id)) return;
  const p = run.player;
  const lock = (s: SymbolId) => run.levelLock?.includes(s);
  const up = (s: SymbolId, n = 1) => {
    if (!lock(s)) p.levels.sym[s] = Math.min(LEVEL_CAP, symLevel(p.levels, s) + n);
  };
  const loseMax = (n: number) => {
    p.maxHp = Math.max(UNIT, p.maxHp - n);
    p.hp = Math.min(p.hp, p.maxHp);
  };
  switch (c.id) {
    case 'edge': {
      run.endless?.edges.push(c.edge!);
      if (c.edge === 'frail') loseMax(Math.round(p.maxHp * 0.1 / UNIT) * UNIT);
      const rng = new Rng((run.seed ^ (run.endless?.loop ?? 1) * 977) >>> 0);
      const legends = [...LEGENDARY].filter((x) => !p.relics.includes(x) && relicFits(run, x));
      const relics = (Object.keys(RELICS) as RelicId[]).filter((x) => !p.relics.includes(x) && !LEGENDARY.has(x) && !ELITE_ONLY.has(x) && relicFits(run, x) && !RELICS[x].retired);
      if (c.reward === 'legend' && legends.length) run.pendingLegend = rng.shuffle(legends).slice(0, RUN.legendPick);
      else if (c.reward === 'relic' && relics.length) run.pendingLegend = rng.shuffle(relics).slice(0, RUN.legendPick);
      else p.chips += ENDLESS.edgeChips;
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
      loseMax(BIG.armsRaceHp);
      break;
    case 'masterwork':
      up(c.symbol!, 2);
      run.levelLock = CABINETS[run.cabinet].symbols.filter((s) => s !== c.symbol);
      break;
    case 'whetstone':
      up(c.symbol!);
      break;
    case 'meltDown': {
      const best = Math.max(1, ...p.gilded.map((g) => charmLevel(p.levels, g.enh)));
      for (const g of p.gilded) g.enh = 'gold';
      // Merge entries that now say the same thing.
      const merged: Gild[] = [];
      for (const g of p.gilded) {
        const m = merged.find((x) => x.reel === g.reel && x.symbol === g.symbol && x.enh === g.enh);
        if (m) m.n += g.n;
        else merged.push({ ...g });
      }
      p.gilded = merged;
      p.levels.charm = { gold: best };
      break;
    }
    case 'gildLot':
      p.strips.forEach((_s, reel) => {
        let left = BIG.gildLotCells;
        for (const sym of [...new Set<SymbolId>([CABINETS[run.cabinet].attack, 'sword', 'bolt', 'shield'])]) {
          const k = Math.min(left, plainCells(p, reel, sym));
          addCharms(p, reel, sym, 'gold', k);
          left -= k;
        }
      });
      for (const s of Object.keys(p.levels.sym) as SymbolId[]) p.levels.sym[s] = Math.max(1, symLevel(p.levels, s) - 1);
      loseMax(Math.round(p.maxHp * BIG.gildLotHp));
      break;
    case 'polish':
      p.levels.charm[c.enh!] = Math.min(LEVEL_CAP, charmLevel(p.levels, c.enh!) + 1);
      break;
    case 'cleanCut':
      p.strips[c.reel!].shield = 0;
      normalizeCharms(p);
      up(CABINETS[run.cabinet].attack);
      break;
    case 'twinReel':
      p.strips[2] = { ...p.strips[0] };
      p.gilded = [...p.gilded.filter((g) => g.reel !== 2), ...p.gilded.filter((g) => g.reel === 0).map((g) => ({ ...g, reel: 2 }))];
      break;
    case 'sweepUp':
      for (const s of p.strips) s.rock = 0;
      // At full HP the heal would be wasted: grow max HP instead.
      if (p.hp >= p.maxHp) {
        p.maxHp += BIG.sweepHeal / 2;
        p.hp = p.maxHp;
      } else p.hp = Math.min(p.maxHp, p.hp + BIG.sweepHeal);
      break;
    case 'glassCannon':
      run.glass = true;
      break;
    case 'bloodPact':
      if (CABINETS[run.cabinet].meter) run.bloodPact = true;
      else {
        up('sword');
        up('shield');
      }
      loseMax(Math.round(p.maxHp * BIG.bloodPactHp));
      break;
    case 'secondWind':
      up('shield');
      p.maxHp += secondWindHp(run);
      p.hp = p.maxHp;
      break;
  }
  for (const s of p.strips) for (const k of Object.keys(s) as SymbolId[]) if ((s[k] ?? 0) <= 0) delete s[k];
  normalizeCharms(p);
  const last = run.records.at(-1);
  if (last) last.choice = c.id;
  run.pendingChoice = run.over ? null : (run.choiceQueue?.shift() ?? null);
}
