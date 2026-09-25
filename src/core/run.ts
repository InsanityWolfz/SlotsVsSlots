import { cloneConfig, defaultConfig, type Enh, type GameConfig, type Gild, type RelicId, type StripCounts, type SymbolId } from './config';
import { ACTS, actLength, ARCHETYPES, generateRunPaths, makeEnemy, TUNE, type EnemyDef } from './enemies';
import { MAX_STAKE, MIRROR_COPYABLE, mirrorCanUse, STAKE } from './stakes';
import type { Fight } from './fight';
import {
  BANDAGE_HEAL,
  BATTERY_ENERGY,
  BELL_MULT,
  BLAZE_BONUS,
  KEY_MULT,
  BOSS_HP_PER_RELIC,
  BUILD_ENABLER,
  CACTUS_DAMAGE,
  COUNTER_RELICS,
  COUNTERS,
  ELITE_ONLY,
  HONE_BONUS,
  KEEN_BONUS,
  LEGENDARY,
  LUCKY_CHANCE,
  OVERCHARGE_ECHO,
  REFLECT_CAP,
  REFLECT_MIN,
  RELIC_TIER,
  RELICS,
  RUSH,
  ROD_SPECIAL_COST,
  ROD_SPECIAL_DAMAGE,
  SPIKED_DAMAGE,
  TIER_STEP,
  VAMP_CAP,
} from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { Rng } from './rng';
import { scoreLine } from './scoring';
import { BONUS_SYMBOLS, stripCounts } from './strip';

/** Run-level tunables. */
export const RUN = {
  startHp: 32,
  /** Fraction of max HP restored after every won fight (low, so HP cards matter). */
  postFightHeal: 0.2,
  healCard: 8,
  maxHpCard: 4,
  /** A strip can't be thinned below this many cells. */
  minStrip: 6,
  draftSize: 3,
  /** Rocks added during one fight that stay for the rest of the run; the rest crumble. */
  permanentRocksPerFight: 2,
  /** Drafts right after these fights (1-based) offer relics (2 relics + 1 other). */
  relicDraftsAfter: [2, 4],
  swapCount: 3,
  addCount: 2,
  wildCount: 2,
  /** The Cashier opens after these fights (1-based), after the draft. */
  shopAfter: [1, 3, 5],
  /** Legendary relics offered when an act's boss falls. */
  legendPick: 3,
};

/** Which gild goes on which symbols (act 2 unlocks VAMP, LUCKY and BLAZE). */
export const GILD_SYMBOLS: Record<Enh, SymbolId[]> = {
  gold: ['sword', 'bolt', 'shield'],
  keen: ['sword'],
  charged: ['bolt'],
  spiked: ['shield'],
  vamp: ['sword'],
  lucky: ['shield', 'bolt'],
  blaze: ['bolt'],
};
export const ACT1_GILDS: Enh[] = ['gold', 'keen', 'charged', 'spiked'];
export const ACT2_GILDS: Enh[] = ['vamp', 'lucky', 'blaze'];
export const gildsFor = (run: RunState): Enh[] => (run.act > 1 ? [...ACT1_GILDS, ...ACT2_GILDS] : ACT1_GILDS);

/** Chip economy (earning is passive, spending happens only at the Cashier). */
export const CHIPS = {
  win: 2,
  eliteBonus: 2,
  /** Act 2 elites pay these chips instead of a relic. */
  act2EliteChips: 6,
  perJackpot: 1,
  /** +1 chip per this much overkill on the killing blow. */
  overkillPer: 5,
  /** +1 interest per this many banked chips, capped. */
  interestPer: 5,
  interestCap: 3,
  /** Boss fight: every this many unspent chips = +1 shield at the start of each House turn. */
  stackPer: 8,
  /** Every run starts with a little float so shop 1 is a real visit. */
  start: 4,
  prices: { gild: 10, relic: 12, wild: 6, remove: 4, heal: 5, legend: 20, tierUp: 10 },
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
  | { kind: 'gild'; enh: Enh; symbol: SymbolId; reel: number; tier?: 2 }
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
  /** Gilded symbols per reel (every cell of that symbol on that reel): persist for the run. */
  gilded: Gild[];
  /** Casino chips: earned by winning, spent at the Cashier, and a shield stack vs the House. */
  chips: number;
}

export interface FightRecord {
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
  rocksCrumbled: number;
  /** Relic taken from an elite's spoils. */
  eliteRelic?: RelicId;
  /** Chips earned from this fight (including interest). */
  chips?: number;
  pick?: DraftOption;
  /** What was bought at the Cashier after this fight. */
  bought?: DraftOption[];
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
  /** Rerolls used at the current Cashier visit. */
  shopRerolls: number;
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
}

export function createRun(_base: GameConfig, seed = Rng.randomSeed(), cabinet: CabinetId = 'knight', stake = 0, act3 = false): RunState {
  const rng = new Rng(seed);
  const paths = generateRunPaths(rng);
  const cab = CABINETS[cabinet];
  return {
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
      chips: CHIPS.start,
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
  for (const enh of gildsFor(run))
    for (const symbol of GILD_SYMBOLS[enh])
      for (const reel of [0, 1, 2]) if ((p.strips[reel][symbol] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === symbol)) push({ kind: 'gild', enh, symbol, reel });
  tierUps(run).forEach(push);
  p.strips.forEach((s, reel) => {
    if ((s.rock ?? 0) > 0) push({ kind: 'clear', symbol: 'rock', reel });
    if ((s.shield ?? 0) > RUN.wildCount) push({ kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel });
    if ((s.shield ?? 0) >= 2) push({ kind: 'swap', from: 'shield', to: 'bolt', count: Math.min(RUN.swapCount, s.shield ?? 0), reel });
  });
  push({ kind: 'add', symbol: 'bolt', reel: rng.int(3), count: RUN.addCount });
  push({ kind: 'maxHp', amount: RUN.maxHpCard });
  if (p.hp < p.maxHp) push({ kind: 'heal', amount: RUN.healCard });
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
export const runActs = (run: RunState) => (run.stake >= STAKE.act3 ? 3 : ACTS);
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
  // Act 3 (THE DEALER): a full heal and the Cashier only — the legendary pick stays act 2's decision.
  if (run.act > 2) return;
  applySignature(run);
  const pool = [...LEGENDARY].filter((r) => !run.player.relics.includes(r) && relicFits(run, r));
  run.pendingLegend = rng.shuffle(pool).slice(0, RUN.legendPick);
}

/** Each cabinet's act 2 signature (shown on its card and on the act transition screen). */
export function applySignature(run: RunState): void {
  const sig = CABINETS[run.cabinet].act2;
  if (!sig) return;
  if (sig.tierII) {
    const own = new Set(CABINETS[run.cabinet].gilded.map((g) => g.enh));
    for (const g of run.player.gilded) if (own.has(g.enh)) g.tier = 2;
  }
  if (sig.maxHp) {
    run.player.maxHp += sig.maxHp;
    run.player.hp = run.player.maxHp;
  }
  if (sig.wilds) {
    const s = run.player.strips[sig.wilds.reel];
    const n = Math.min(sig.wilds.count, Math.max(0, (s.shield ?? 0) - 1));
    s.shield = (s.shield ?? 0) - n;
    s.wild = (s.wild ?? 0) + n;
  }
}

/** What answers your build: specials → the Grounder; a gild build → the Counterfeiter. */
export function counterFor(run: RunState): string | null {
  const g = run.player.gilded;
  const specials = run.cabinet === 'tesla' || g.some((x) => x.enh === 'charged' || x.enh === 'blaze') || run.player.relics.includes('rod');
  if (specials) return 'grounder';
  return g.length >= 2 ? 'counterfeiter' : null;
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
    // BLACK stake: the House ignores your chip shield.
    // No bonus in the run's final fight: a voucher could never be spent (QA_1 B11).
    bonusSymbols: !(e.isBoss && run.act >= runActs(run)),
    stackShield: e.isBoss && !(e.boss === 'house' && run.stake >= STAKE.houseDirty) ? Math.floor(run.player.chips / CHIPS.stackPer) : 0,
  };
  const hp = enemyHp(run, e);
  cfg.enemy = { hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  // The Mirror plays a copy of your machine: your strips and gilds (not your relics).
  if (e.boss === 'mirror') {
    cfg.enemy.strips = run.player.strips.map((s) => ({ ...s }));
    // It copies what you hit with: never your spikes.
    // It copies what you hit with, but not your spikes and not your edge (KEEN).
    cfg.enemy.gilded = run.player.gilded.filter((g) => g.enh !== 'spiked' && g.enh !== 'keen').map((g) => ({ reel: g.reel, symbol: g.symbol, enh: g.enh }));
    cfg.player.stackShield = Math.min(MIRROR_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
    // REFLECTION is capped relative to you: two from full HP kill you.
    if (cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, power: Math.max(REFLECT_MIN, Math.round(run.player.maxHp * REFLECT_CAP)) };
  }
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
  cfg.seed = null;
  return cfg;
}

/**
 * An enemy's real HP for this run. Bosses grow with the relics you bring in; the Mirror is sized to
 * you (a mirror match needs your relics to win).
 */
/** The tutorial's first opponent has this much of its HP (you're reading callouts, not building). */
export const TUTORIAL_OPENER_MUL = 0.75;

export function enemyHp(run: RunState, e: EnemyDef): number {
  const gold = e.isBoss && run.stake >= STAKE.fasterAll ? STAKE.goldBossHp : 1;
  const tutorial = run.tutorial && run.act === 1 && e.depth === 0 ? TUTORIAL_OPENER_MUL : 1;
  return Math.round(baseEnemyHp(run, e) * gold * tutorial);
}

function baseEnemyHp(run: RunState, e: EnemyDef): number {
  if (!e.isBoss) return run.act === 1 && e.depth === 0 && CABINETS[run.cabinet].hp < FRAGILE_HP ? Math.round(e.hp * FRAGILE_OPENER_MUL) : e.hp;
  // The Mirror grows with your machine and (like the House) with every relic you carry in.
  if (e.boss === 'mirror') return Math.round(TUNE.mirrorPower * machinePower(run)) + TUNE.mirrorFlat + TUNE.mirrorPerRelic * run.player.relics.length;
  if (e.boss === 'dealer') return Math.round(TUNE.dealerPower * machinePower(run)) + TUNE.dealerFlat + TUNE.mirrorPerRelic * run.player.relics.length;
  return e.hp + BOSS_HP_PER_RELIC * run.player.relics.length;
}

/**
 * Your machine's damage on a TYPICAL spin: swords (each spin capped at 20, so rare gold jackpots
 * don't inflate it) plus energy turned into specials, counting Rod, Battery and Overcharge.
 */
export function machinePower(run: RunState): number {
  const base = defaultConfig();
  const cab = CABINETS[run.cabinet];
  const { relics, gilded } = run.player;
  const s = stripStats(run.player.strips, base, relics, gilded, POWER_CAP);
  const rod = relics.includes('rod') && gilded.some((g) => g.enh === 'charged');
  const cost = rod ? ROD_SPECIAL_COST : cab.specialCost ?? base.specialCost;
  let dmg = Math.max(cab.specialDamage ?? base.specialDamage, rod ? cab.rodDamage ?? ROD_SPECIAL_DAMAGE : 0) + s.specialBonus;
  if (relics.includes('overcharge')) dmg += Math.ceil(dmg * OVERCHARGE_ECHO);
  // Battery: a head start worth about one extra special over a Mirror fight (~8 of your spins).
  const energy = s.energy + (relics.includes('battery') ? BATTERY_ENERGY / 8 : 0);
  // Specials pierce shields and the Mirror has none of its own: they count extra toward its HP.
  return s.damage + TUNE.mirrorSpecialWeight * (energy / cost) * Math.min(POWER_CAP, dmg);
}
const POWER_CAP = 20;
/** Saved chips shield at most this much per Mirror turn (hoarding guard). */
export const MIRROR_CHIP_SHIELD_CAP = 4;
/** Cabinets this fragile face a softer opener (ITERATION_8: 3-5% opener deaths). */
const FRAGILE_HP = 26;
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
  // Chips: interest on what you banked, then the win, elite bonus, jackpots and overkill.
  const beaten = currentEnemy(run);
  const interest = Math.min(CHIPS.interestCap, Math.floor(run.player.chips / CHIPS.interestPer));
  const earned =
    interest +
    CHIPS.win +
    (CABINETS[run.cabinet].chipsPerWin ?? 0) +
    (beaten.elite ? CHIPS.eliteBonus : 0) +
    fight.playerJackpots * CHIPS.perJackpot +
    Math.floor(fight.overkill / CHIPS.overkillPer);
  run.player.chips += earned;
  record.chips = earned;
  // Act 2 elites pay chips (more relics made the Mirror a walkover: ITERATION_8).
  if (beaten.elite && run.act > 1) {
    run.player.chips += CHIPS.act2EliteChips;
    record.chips = (record.chips ?? 0) + CHIPS.act2EliteChips;
    record.eliteChips = CHIPS.act2EliteChips;
  }
  // Act 1 elites offer their spoils: choose 1 of 2 relics.
  if (beaten.elite && run.act === 1) {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && !COUNTER_RELICS.has(r) && relicFits(run, r) && !LEGENDARY.has(r));
    const rng = new Rng((run.seed ^ Math.imul(run.depth + 7 + run.act * 100, 0x85ebca6b)) >>> 0);
    const spoils = rng.shuffle(pool).slice(0, 2);
    if (spoils.length) run.pendingSpoils = spoils;
  }
  // Act 3: THE HOUSE DOESN'T COMP — no patch-up between fights.
  let hp = p.hp + Math.round(run.player.maxHp * RUN.postFightHeal * (run.stake >= STAKE.halfHeal ? 0.5 : 1) * (run.act >= 3 ? 0 : 1));
  // THE DECK REMEMBERS: the Card Sharp's marks carry into the Dealer fight.
  run.deckMarks = Math.min(DECK_MARKS_CAP, (run.deckMarks ?? 0) + fight.marksPlaced);
  if (run.player.relics.includes('bandage')) hp += BANDAGE_HEAL;
  run.player.hp = Math.min(run.player.maxHp, hp);
  // Bonus vouchers from this fight pay out now that you've won it (after the HP settles, so a
  // wheel HEAL / MAX HP isn't overwritten — QA_1 B2).
  run.bonusLog = fight.vouchers.map((v) => payVoucher(run, v, !holdWheel));
  if (run.bonusLog.length) record.bonuses = run.bonusLog.map((b) => b.label);
  run.depth++;
  if (run.depth > actLength(run.act)) {
    if (run.act < runActs(run)) startNextAct(run);
    else {
      run.over = true;
      run.won = true;
    }
  }
  return record;
}

// ---- strip math (shown on cards so reel targeting is legible) --------------------------

export interface StripStats {
  /** Expected per spin, before shields. */
  damage: number;
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
}

export function stripStats(strips: StripCounts[], base: GameConfig, relics: RelicId[] = [], gilded: Gild[] = [], damageCap = Infinity): StripStats {
  const gildOf = (reel: number, sym: SymbolId) => gilded.find((g) => g.reel === reel && g.symbol === sym);
  const enhOf = (reel: number, sym: SymbolId) => gildOf(reel, sym)?.enh;
  const sets = fullSets(gilded, relics);
  const setStep = relics.includes('ticket') ? 2 : 1;
  const lvlOf = (reel: number, sym: SymbolId) => {
    const g = gildOf(reel, sym);
    // A FULL SET needs all 3 charmed cells on the payline at once: rare enough to leave out of the averages.
    void sets;
    void setStep;
    return g ? 1 + (g.tier ? TIER_STEP : 0) : 0;
  };
  // Each line entry: [shown symbol, probability, the cell's own symbol (for its gild)].
  const probs = strips.map((s, reel) => {
    const total = Object.values(s).reduce((a, n) => a + (n ?? 0), 0) || 1;
    return (Object.entries(s) as [SymbolId, number][])
      .filter(([, n]) => n > 0)
      .flatMap(([sym, n]) => {
        const p = n / total;
        if (enhOf(reel, sym) !== 'lucky') return [[sym, p, sym] as const];
        const c = Math.min(0.8, LUCKY_CHANCE.each + LUCKY_CHANCE.step * (lvlOf(reel, sym) - 1));
        return [[sym, p * (1 - c), sym] as const, ['wild' as SymbolId, p * c, sym] as const];
      });
  });
  const cfg = { ...base, pairRule: relics.includes('mirror') ? ('anyTwo' as const) : base.pairRule };
  const out = { damage: 0, energy: 0, shield: 0, pairPct: 0, jackpotPct: 0, spinsPerSpecial: 0, heal: 0, specialBonus: 0 };
  strips.forEach((s, reel) => {
    const sym = (Object.keys(s) as SymbolId[]).find((k) => enhOf(reel, k) === 'blaze' && (s[k] ?? 0) > 0);
    if (sym) out.specialBonus += BLAZE_BONUS.each + lvlOf(reel, sym) - 1;
  });
  for (const [a, pa, oa] of probs[0])
    for (const [b, pb, ob] of probs[1])
      for (const [c, pc, oc] of probs[2]) {
        const p = pa * pb * pc;
        const line = [a, b, c];
        const own = [oa, ob, oc];
        const sc = scoreLine(line, cfg);
        for (const g of sc.groups) {
          for (const r of g.reels) {
            const enh = enhOf(r, own[r]);
            const lvl = lvlOf(r, own[r]);
            if (enh === 'keen' && g.symbol === 'sword') g.amount += KEEN_BONUS * lvl + (relics.includes('hone') ? HONE_BONUS : 0);
            if (enh === 'charged' && g.symbol === 'bolt') g.amount += lvl;
          }
          const goldLevels = g.reels.filter((r) => enhOf(r, own[r]) === 'gold').reduce((a, r) => a + lvlOf(r, own[r]), 0);
          if (goldLevels) g.amount *= 1 + goldLevels;
          if (relics.includes('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) g.amount *= 2;
          if (relics.includes('key') && g.matched && g.reels.length === 2) g.amount = Math.ceil(g.amount * KEY_MULT);
          if (relics.includes('bell') && g.matched && g.reels.length === 3) g.amount *= BELL_MULT;
          if (g.symbol === 'sword' && g.amount > 0) for (const r of g.reels) if (enhOf(r, own[r]) === 'vamp') out.heal += p * lvlOf(r, own[r]);
        }
        sc.totals = {};
        for (const g of sc.groups) sc.totals[g.symbol] = (sc.totals[g.symbol] ?? 0) + g.amount;
        out.damage += p * Math.min(damageCap, (sc.totals.sword ?? 0) + (relics.includes('pickaxe') ? sc.totals.rock ?? 0 : 0));
        out.energy += p * (sc.totals.bolt ?? 0);
        out.shield += p * (sc.totals.shield ?? 0);
        if (sc.tier === 'pair') out.pairPct += p * 100;
        if (sc.tier === 'triple') out.jackpotPct += p * 100;
      }
  out.spinsPerSpecial = out.energy > 0 ? base.specialCost / out.energy : Infinity;
  return out;
}

// ---- drafting --------------------------------------------------------------------------

function keyOf(o: DraftOption): string {
  return JSON.stringify(o);
}

/** Cards that differ only by reel read as the same choice (ITERATION_8 G7). */
function similarKey(o: DraftOption): string {
  if (o.kind === 'gild') return `gild:${o.enh}:${o.symbol}:${o.tier ?? 1}`;
  if (o.kind === 'swap') return `swap:${o.from}:${o.to}`;
  if (o.kind === 'add') return `add:${o.symbol}`;
  return keyOf(o);
}

export const isRelicDraft = (run: RunState) => RUN.relicDraftsAfter.includes(run.depth);

/**
 * Three reward cards after a won fight. Relic drafts (after fights 2 and 4) show 2 relics + 1
 * other, so relic-vs-relic is the choice; the rest are strip/HP decisions. Deterministic.
 */
export function draftOffers(run: RunState): DraftOption[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 1 + (run.act - 1) * 50, 0x9e3779b1)) >>> 0);
  const p = run.player;
  const out: DraftOption[] = [];
  const push = (o: DraftOption | null) => {
    if (o && out.length < RUN.draftSize && !out.some((x) => keyOf(x) === keyOf(o) || similarKey(x) === similarKey(o))) out.push(o);
  };

  const swapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const from of ['rock', 'shield'] as SymbolId[]) {
        const n = s[from] ?? 0;
        if (n <= 0 || (from === 'shield' && n < 2)) continue;
        options.push({ kind: 'swap', from, to: 'bolt', count: Math.min(RUN.swapCount, n), reel });
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
  const addCard = (): DraftOption => ({ kind: 'add', symbol: 'bolt', reel: rng.int(3), count: RUN.addCount });
  /** GILD: enhance one cell (GOLD any symbol, KEEN sword, CHARGED bolt, SPIKED shield). */
  const gildCard = (): DraftOption | null => {
    // Act 2: upgrade a gild you own to TIER II.
    const ups = tierUps(run).filter((u) => !out.some((o) => keyOf(o) === keyOf(u)));
    if (ups.length && rng.next() < 0.4) return rng.pick(ups);
    // EXTEND: half the time, offer the same gild you already own on another reel (builds!).
    if (p.gilded.length && rng.next() < 0.5) {
      const own = rng.pick(p.gilded);
      const reels = [0, 1, 2].filter((r) => r !== own.reel && (p.strips[r][own.symbol] ?? 0) > 0 && !p.gilded.some((g) => g.reel === r && g.symbol === own.symbol));
      const pickable = reels.filter((r) => !out.some((o) => o.kind === 'gild' && o.reel === r && o.symbol === own.symbol));
      if (pickable.length) return { kind: 'gild', enh: own.enh, symbol: own.symbol, reel: rng.pick(pickable) };
    }
    const favored = CABINETS[run.cabinet].favors;
    // Act 2: the new gilds show up half the time.
    const enh = favored && rng.next() < 0.5 ? favored : run.act > 1 && rng.next() < 0.5 ? rng.pick(ACT2_GILDS) : rng.pick(ACT1_GILDS);
    const symbols = GILD_SYMBOLS[enh];
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const symbol of symbols) {
        const taken = p.gilded.some((g) => g.reel === reel && g.symbol === symbol);
        if ((s[symbol] ?? 0) > 0 && !taken) options.push({ kind: 'gild', enh, symbol, reel });
      }
    });
    return options.length ? rng.pick(options) : null;
  };
  /** WILD: turn a shield (or rock) on a reel into a WILD. */
  const wildCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      const gildedShield = p.gilded.some((g) => g.reel === reel && g.symbol === 'shield');
      if ((s.rock ?? 0) > 0) options.push({ kind: 'swap', from: 'rock', to: 'wild', count: Math.min(RUN.wildCount, s.rock ?? 0), reel });
      else if ((s.shield ?? 0) > RUN.wildCount && !gildedShield) options.push({ kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  const hpCard = (): DraftOption => (p.hp < p.maxHp * 0.75 ? { kind: 'heal', amount: RUN.healCard } : { kind: 'maxHp', amount: RUN.maxHpCard });
  const relicCard = (): DraftOption | null => {
    const pool = (Object.keys(RELICS) as RelicId[]).filter(
      (r) =>
        !p.relics.includes(r) &&
        !COUNTER_RELICS.has(r) &&
        !ELITE_ONLY.has(r) &&
        relicFits(run, r) &&
        (run.act > 1 || !LEGENDARY.has(r)) &&
        !out.some((o) => o.kind === 'relic' && o.relic === r),
    );
    // Act 2 relic drafts lean legendary.
    const legends = pool.filter((r) => LEGENDARY.has(r));
    if (legends.length && rng.next() < 0.4) return { kind: 'relic', relic: rng.pick(legends) };
    return pool.length ? { kind: 'relic', relic: rng.pick(pool) } : null;
  };
  /** PREP: a counter relic for an enemy on the very next fight/fork. */
  const prepCard = (): DraftOption | null => {
    const next = run.paths[run.depth] ?? [];
    const counters = next.map((e) => COUNTERS[e.archetype]).filter((r): r is RelicId => !!r && !p.relics.includes(r));
    return counters.length ? { kind: 'relic', relic: rng.pick(counters) } : null;
  };

  if (isRelicDraft(run)) {
    push(relicCard());
    push(relicCard());
    push(rng.next() < 0.5 ? hpCard() : swapCard() ?? hpCard());
  } else {
    push(gildCard() ?? swapCard());
    const r = rng.next();
    push((r < 0.35 ? wildCard() : r < 0.65 ? swapCard() : null) ?? clearCard() ?? gildCard() ?? addCard());
    push((rng.next() < 0.6 ? prepCard() : null) ?? hpCard());
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
    case 'gild': {
      const own = p.gilded.find((g) => g.reel === o.reel && g.symbol === o.symbol && g.enh === o.enh);
      if (o.tier) for (const g of p.gilded) if (g.enh === o.enh) g.tier = 2;
      // New cells of a gild you've upgraded come in at TIER II too.
      const tiered = o.tier || p.gilded.some((g) => g.enh === o.enh && g.tier);
      if (!own) p.gilded.push({ reel: o.reel, symbol: o.symbol, enh: o.enh, ...(tiered ? { tier: 2 as const } : {}) });
      break;
    }
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
  // A gild lasts while its symbol is on the reel.
  p.gilded = p.gilded.filter((g) => (p.strips[g.reel][g.symbol] ?? 0) > 0);
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

export const isShopNow = (run: RunState) => !run.over && (RUN.shopAfter.includes(run.depth) || run.actIntro);
export const rerollCost = (run: RunState) => CHIPS.rerollBase + run.shopRerolls;
/** Shield per House turn your current chips would give in the final fight. */
export const chipShield = (chips: number) => Math.floor(chips / CHIPS.stackPer);

/**
 * The Cashier's four slots: two targeted gilds, a relic, and a utility (WILDs, remove a symbol,
 * or a heal). Deterministic per run seed + depth + rerolls.
 */
export function shopOffers(run: RunState): ShopItem[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 31 + run.act * 64, 0x27d4eb2f) ^ Math.imul(run.shopRerolls + 1, 0x165667b1)) >>> 0);
  const p = run.player;
  const items: ShopItem[] = [];
  const P = CHIPS.prices;
  const add = (option: DraftOption | null, price: number) => {
    if (option && !items.some((i) => JSON.stringify(i.option) === JSON.stringify(option))) items.push({ option, price, sold: false });
  };
  const gildOptions: DraftOption[] = [];
  p.strips.forEach((s, reel) => {
    for (const enh of gildsFor(run))
      for (const symbol of GILD_SYMBOLS[enh])
        if ((s[symbol] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === symbol)) gildOptions.push({ kind: 'gild', enh, symbol, reel });
  });
  // Prefer extending what you already own, so builds can be finished on purpose.
  const favored = CABINETS[run.cabinet].favors;
  const extend = gildOptions.filter((o) => o.kind === 'gild' && (p.gilded.some((g) => g.enh === o.enh && g.symbol === o.symbol) || o.enh === favored));
  const ups = tierUps(run);
  if (ups.length && rng.next() < 0.5) add(rng.pick(ups), P.tierUp);
  else add(extend.length ? rng.pick(extend) : gildOptions.length ? rng.pick(gildOptions) : null, P.gild);
  add(gildOptions.length ? rng.pick(gildOptions) : null, P.gild);
  const lastShop = run.act === runActs(run) && run.depth >= Math.min(actLength(run.act), RUN.shopAfter[RUN.shopAfter.length - 1]);
  const relics = (Object.keys(RELICS) as RelicId[]).filter(
    (r) => !p.relics.includes(r) && !COUNTER_RELICS.has(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && !(lastShop && r === 'bandage') && !LEGENDARY.has(r),
  );
  // Act 2: the relic slot holds a legendary, priced like one.
  const legends = run.act > 1 ? [...LEGENDARY].filter((r) => !p.relics.includes(r) && relicFits(run, r)) : [];
  if (legends.length) add({ kind: 'relic', relic: rng.pick(legends) }, P.legend);
  else add(relics.length ? { kind: 'relic', relic: rng.pick(relics) } : null, P.relic);
  const u = rng.next();
  if (u < 0.35) {
    const reels = p.strips
      .map((s, reel) => ({ s, reel }))
      .filter(({ s, reel }) => (s.shield ?? 0) > RUN.wildCount && !p.gilded.some((g) => g.reel === reel && g.symbol === 'shield'));
    add(reels.length ? { kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel: rng.pick(reels).reel } : null, P.wild);
  } else if (u < 0.7) {
    const junk = p.strips.flatMap((s, reel) => (['rock', 'shield'] as SymbolId[]).filter((sym) => (s[sym] ?? 0) > 0).map((symbol) => ({ kind: 'remove' as const, symbol, reel })));
    add(junk.length ? (junk.find((j) => j.symbol === 'rock') ?? rng.pick(junk)) : null, P.remove);
  }
  // Never a thin shelf: top up with gilds, then a rock/shield removal.
  for (const o of rng.shuffle(gildOptions)) {
    if (items.length >= 4) break;
    add(o, P.gild);
  }
  if (items.length < 4) {
    const junk = p.strips.flatMap((s, reel) => (['rock', 'shield'] as SymbolId[]).filter((sym) => (s[sym] ?? 0) > 1).map((symbol) => ({ kind: 'remove' as const, symbol, reel })));
    if (junk.length) add(rng.pick(junk), P.remove);
  }
  const shelf = items.slice(0, 4);
  // HEAL is a permanent service slot, sized to what you're missing (hidden when nearly full).
  const missing = p.maxHp - p.hp;
  if (missing >= 3) shelf.push({ option: { kind: 'heal', amount: Math.min(RUN.healCard, missing) }, price: P.heal, sold: false });
  return shelf;
}

/** Build relics are only offered once you own what they amplify. */
export function relicFits(run: RunState, r: RelicId): boolean {
  const need = BUILD_ENABLER[r];
  if (!need) return true;
  if (need === 'wild') return run.player.strips.some((s) => (s.wild ?? 0) > 0);
  if (need === 'full') return run.player.gilded.length > 0;
  return run.player.gilded.some((g) => g.enh === need);
}

/** Charms spread over enough reels to line up as a FULL SET on the payline (all 3 reels; any 2 with the Golden Ticket). */
export function fullSets(gilded: Gild[], relics: RelicId[]): Set<Enh> {
  const need = relics.includes('ticket') ? 2 : 3;
  const reels = new Map<Enh, Set<number>>();
  for (const g of gilded) (reels.get(g.enh) ?? reels.set(g.enh, new Set()).get(g.enh)!).add(g.reel);
  return new Set([...reels].filter(([, r]) => r.size >= need).map(([e]) => e));
}

/** This charm card/item would put the charm on enough reels to hit FULL SETS. */
export function completesSet(run: RunState, o: DraftOption): boolean {
  if (o.kind !== 'gild') return false;
  const before = fullSets(run.player.gilded, run.player.relics);
  return !before.has(o.enh) && fullSets(gildsAfter(run, o), run.player.relics).has(o.enh);
}

/** How many reels already carry this gild (for the set pips). */
export const setProgress = (run: RunState, enh: Enh) => new Set(run.player.gilded.filter((g) => g.enh === enh).map((g) => g.reel)).size;

/** Card/shop items that extend what you're already building (for the FITS tag). */
export function fitsBuild(run: RunState, o: DraftOption): boolean {
  const p = run.player;
  const favored = CABINETS[run.cabinet].favors;
  if (o.kind === 'gild') return p.gilded.some((g) => g.enh === o.enh) || o.enh === favored;
  // THORN's act 2 build is HP (ITERATION_9).
  if (o.kind === 'maxHp') return run.cabinet === 'thorn' && run.act > 1;
  if (o.kind === 'relic') {
    // Legendaries that feed what you're doing.
    const spec = p.gilded.some((g) => g.enh === 'charged' || g.enh === 'blaze') || run.cabinet === 'tesla';
    if (o.relic === 'overcharge') return spec;
    if (o.relic === 'bell' || o.relic === 'key') return p.gilded.some((g) => g.enh === 'gold');
    return !!BUILD_ENABLER[o.relic] && relicFits(run, o.relic);
  }
  if (o.kind === 'swap' && o.to === 'wild') return p.relics.includes('prism') || (p.strips.some((s) => (s.wild ?? 0) > 0) && run.cabinet === 'joker');
  return false;
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

/** Act 2: TIER II upgrades for gilds you own. */
export function tierUps(run: RunState): DraftOption[] {
  if (run.act < 2) return [];
  // One offer per gild type: TIER II upgrades every reel that carries it.
  const seen = new Set<Enh>();
  const out: DraftOption[] = [];
  for (const g of run.player.gilded) {
    if (g.tier || seen.has(g.enh)) continue;
    seen.add(g.enh);
    out.push({ kind: 'gild', enh: g.enh, symbol: g.symbol, reel: g.reel, tier: 2 });
  }
  return out;
}

/** Gilds after taking a card. */
export function gildsAfter(run: RunState, o: DraftOption): Gild[] {
  if (o.kind !== 'gild') return run.player.gilded;
  const own = run.player.gilded.find((g) => g.reel === o.reel && g.symbol === o.symbol && g.enh === o.enh);
  if (own) return run.player.gilded.map((g) => (g.enh === o.enh && o.tier ? { ...g, tier: 2 as const } : g));
  const tiered = run.player.gilded.some((g) => g.enh === o.enh && g.tier);
  return [...run.player.gilded, { reel: o.reel, symbol: o.symbol, enh: o.enh, ...(tiered ? { tier: 2 as const } : {}) }];
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
      chips: run.player.chips,
    },
    records: [],
  };
  applyOption(copy, o);
  return copy.player.strips;
}

const NAME: Partial<Record<SymbolId, string>> = { sword: 'SWORD', shield: 'SHIELD', bolt: 'BOLT', rock: 'ROCK', wild: 'WILD' };
const ENH_TEXT: Record<Enh, (s: string, reel: number) => string> = {
  gold: (s, r) => `${s}S ON REEL ${r} PAY X2`,
  keen: (s, r) => `${s}S ON REEL ${r} DEAL +1 AND PIERCE SHIELDS`,
  charged: (s, r) => `${s}S ON REEL ${r} GIVE +1 ENERGY`,
  spiked: (s, r) => `${s}S ON REEL ${r} HIT BACK FOR 2 WHEN YOU ARE HIT`,
  vamp: (s, r) => `${s}S ON REEL ${r} HEAL YOU 1 WHEN THEY HIT`,
  lucky: (s, r) => `${s}S ON REEL ${r}: ${Math.round(LUCKY_CHANCE.each * 100)}% CHANCE TO LAND AS A WILD`,
  blaze: (_s, r) => `BLAZE REEL ${r}: YOUR SPECIAL DEALS +${BLAZE_BONUS.each}`,
};
const TIER_TEXT: Record<Enh, (s: string, reel: number) => string> = {
  gold: (s, r) => `${s}S ON REEL ${r} PAY X4`,
  keen: (s, r) => `${s}S ON REEL ${r} DEAL +3 AND PIERCE`,
  charged: (s, r) => `${s}S ON REEL ${r} GIVE +3 ENERGY`,
  spiked: (s, r) => `${s}S ON REEL ${r} HIT BACK FOR 6`,
  vamp: (s, r) => `${s}S ON REEL ${r} HEAL 3 WHEN THEY HIT`,
  lucky: (s, r) => `${s}S ON REEL ${r}: 65% CHANCE TO LAND AS A WILD`,
  blaze: (_s, r) => `BLAZE REEL ${r}: YOUR SPECIAL DEALS +5`,
};
/** What a gild card's cell will really do, at the level it will have after you take it. */
function levelText(run: RunState, o: Extract<DraftOption, { kind: 'gild' }>): string {
  const after = gildsAfter(run, o);
  const g = after.find((x) => x.reel === o.reel && x.symbol === o.symbol && x.enh === o.enh);
  const lvl = 1 + (g?.tier ? TIER_STEP : 0);
  const set = '';
  const spikeBase = run.player.relics.includes('cactus') ? CACTUS_DAMAGE : SPIKED_DAMAGE;
  switch (o.enh) {
    case 'gold':
      return `PAY X${1 + lvl}${set}`;
    case 'keen':
      return `+${KEEN_BONUS * lvl + (run.player.relics.includes('hone') ? HONE_BONUS : 0)} DAMAGE AND PIERCE${set}`;
    case 'charged':
      return `+${lvl} ENERGY${set}`;
    case 'spiked':
      return `HIT BACK FOR ${spikeBase + 2 * (lvl - 1)}${set}`;
    case 'vamp':
      return `HEAL ${Math.min(VAMP_CAP, lvl)} WHEN THEY HIT${set}`;
    case 'lucky':
      return `${Math.round(100 * Math.min(0.8, LUCKY_CHANCE.each + LUCKY_CHANCE.step * (lvl - 1)))}% TO LAND AS A WILD${set}`;
    case 'blaze':
      return `YOUR SPECIAL DEALS +${BLAZE_BONUS.each + lvl - 1}${set}`;
  }
}

const plural = (s: SymbolId, n: number) => `${NAME[s] ?? s.toUpperCase()}${n > 1 ? 'S' : ''}`;

export function describeOption(o: DraftOption, run?: RunState): { title: string; text: string } {
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
      return { title: COUNTER_RELICS.has(o.relic) ? `PREP: ${RELICS[o.relic].name}` : RELICS[o.relic].name, text: RELICS[o.relic].text };
    case 'heal':
      return { title: `HEAL ${o.amount}`, text: `RESTORE ${o.amount} HP NOW` };
    case 'maxHp':
      return { title: `+${o.amount} MAX HP`, text: `GAIN ${o.amount} MAX HP (AND HEAL IT)` };
    case 'gild': {
      let text = ENH_TEXT[o.enh](NAME[o.symbol] ?? '', o.reel + 1);
      if (o.enh === 'spiked' && run?.player.relics.includes('cactus')) text = text.replace(`FOR ${SPIKED_DAMAGE}`, `FOR ${CACTUS_DAMAGE}`);
      if (run) {
        const live = levelText(run, o);
        if (o.tier) return { title: `${o.enh.toUpperCase()} CHARM II`, text: `EVERY ${o.enh.toUpperCase()} CHARM: ${live}` };
        return { title: `${o.enh.toUpperCase()} CHARM`, text: `${NAME[o.symbol]}S ON REEL ${o.reel + 1}: ${live}` };
      }
      if (o.tier) return { title: `${o.enh.toUpperCase()} CHARM II`, text: `UPGRADE: ${TIER_TEXT[o.enh](NAME[o.symbol] ?? '', o.reel + 1)}` };
      return { title: `${o.enh.toUpperCase()} CHARM`, text };
    }
    case 'remove':
      return { title: `-1 ${NAME[o.symbol]}`, text: `REMOVE A ${NAME[o.symbol]} FROM REEL ${o.reel + 1}` };
  }
}

/** Up to two "before TO after" lines for strip cards: the biggest gain, then the biggest cost. */
export function optionDeltas(run: RunState, o: DraftOption, base: GameConfig): { gain: string; loss: string } {
  if (o.kind !== 'add' && o.kind !== 'swap' && o.kind !== 'clear' && o.kind !== 'gild' && o.kind !== 'remove') return { gain: '', loss: '' };
  const a = stripStats(run.player.strips, base, run.player.relics, run.player.gilded);
  const b = stripStats(stripsAfter(run, o), base, run.player.relics, gildsAfter(run, o));
  const rows: [string, number, number][] = [
    ['ENERGY', a.energy, b.energy],
    ['DAMAGE', a.damage, b.damage],
    ['SHIELD', a.shield, b.shield],
    ['HEAL', a.heal, b.heal],
    ['SPECIAL DMG', a.specialBonus, b.specialBonus],
  ];
  const fmt = ([label, from, to]: [string, number, number]) =>
    label === 'SPECIAL DMG' ? `SPECIAL +${from} TO +${to}` : `${label} ${from.toFixed(2)} TO ${to.toFixed(2)}`;
  const gains = rows.filter((r) => r[2] - r[1] > 0.005).sort((x, y) => y[2] - y[1] - (x[2] - x[1]));
  const losses = rows.filter((r) => r[1] - r[2] > 0.005).sort((x, y) => y[1] - y[2] - (x[1] - x[2]));
  return { gain: gains[0] ? fmt(gains[0]) : '', loss: losses[0] ? fmt(losses[0]) : '' };
}

/** One "before TO after" line for strip cards, picking the stat that moves the most. */
export function optionDelta(run: RunState, o: DraftOption, base: GameConfig): string {
  if (o.kind !== 'add' && o.kind !== 'swap' && o.kind !== 'clear') return '';
  const a = stripStats(run.player.strips, base, run.player.relics, run.player.gilded);
  const b = stripStats(stripsAfter(run, o), base, run.player.relics, gildsAfter(run, o));
  const rows: [string, number, number][] = [
    ['ENERGY', a.energy, b.energy],
    ['DAMAGE', a.damage, b.damage],
    ['SHIELD', a.shield, b.shield],
  ];
  rows.sort((x, y) => Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1]));
  const [label, from, to] = rows[0];
  return `${label} ${from.toFixed(2)} TO ${to.toFixed(2)}`;
}
