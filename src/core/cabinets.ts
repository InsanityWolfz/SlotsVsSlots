import { UNIT, type Gild, type Levels, type StripCounts, type SymbolId } from './config';

export type CabinetId = 'knight' | 'midas' | 'tesla' | 'joker' | 'jukebox';

/**
 * What a slot machine's signature symbol fills, and what the full meter does (the Tuesday rework):
 * - special (TESLA): bolts charge the lightning special, which fires at `cost` and ignores shields;
 * - touch (MIDAS): gold bars fill the meter (no cap); when full, the swords and shields on your next such spin
 *   gain a gold touch (x2 each, max 3 per cell) for the rest of the fight; every extra full meter touches one more cell;
 * - jackpots (JAX): each WILD on the payline fills the meter; when full, the next spin's three payline
 *   cells each pay as a jackpot of themselves.
 * - volume (THE JUKEBOX): each NOTE on the payline turns the volume up 1 (+10% damage each); a spin with no note drops it
 *   2; at the max the next spin is THE DROP: every NOTE you can see in the 3x3 window hits. Then it falls back to 2.
 * Every payoff also heals you a little (`heal`). KNIGHT has no meter.
 */
export type MeterKind = 'special' | 'touch' | 'jackpots' | 'vault' | 'volume';
export interface Meter {
  kind: MeterKind;
  /** The symbol that fills it. */
  symbol: SymbolId;
  /** Full at this much (x10 units). */
  cost: number;
  /** HP healed each time the payoff fires. */
  heal: number;
  /** JAX: meter per WILD on the payline. */
  perWild?: number;
}

/**
 * Starting machines: each run begins on one. They give a run its identity (a starting build,
 * an HP pool, a signature symbol and meter) and bias charm offers toward their charm.
 */
export interface Cabinet {
  id: CabinetId;
  name: string;
  sprite: string;
  blurb: string;
  /** The player avatar in the HUD frame for runs on this machine. */
  hero: string;
  heroSprite: string;
  hp: number;
  strips: StripCounts[];
  gilded: Gild[];
  /** Rule text for the pick card. */
  rule: string;
  /** THE SCORE RACE: the rule as it races (no HP, no hits: pay). */
  raceRule?: string;
  /** How to unlock it (shown while locked). */
  unlock: string;
  // Rules (read by run.ts / fight.ts):
  /** The signature meter (none for KNIGHT). */
  meter: Meter | null;
  /** The symbols this machine's swap cards move between. */
  symbols: SymbolId[];
  /** The symbol this machine attacks with (the sim's bot values it highest). */
  attack: SymbolId;
  /** Starting symbol / charm levels. */
  levels?: Levels;
  chipsPerWin?: number;
  /** Levels an act boss pays this machine's attack symbol (default RUN.bossLevels). */
  bossLevels?: number;
  /** Chips this machine starts a run with (default CHIPS.start). */
  startChips?: number;
  enemyAbilityMinus?: number;
  specialCost?: number;
  specialDamage?: number;
  /** A WILD anywhere on the line lets any two matching reels pay as a double. */
  jokerWilds?: boolean;
}

// HP +30% on every machine (2026-10-12): the heal after each fight is gone, so HP is the run's resource.
const r3 = (c: StripCounts): StripCounts[] => [{ ...c }, { ...c }, { ...c }];

export const CABINETS: Record<CabinetId, Cabinet> = {
  knight: {
    id: 'knight',
    hero: 'SIR REGINALD',
    heroSprite: 'heroKnight',
    name: 'KNIGHT',
    sprite: 'cabinetKnight',
    blurb: 'THE DEPENDABLE ONE',
    hp: 39 * UNIT,
    // FORGED STEEL: half swords, half shields, both from level 2 (2026-10-15: levels have no cap).
    strips: r3({ sword: 6, shield: 6 }),
    // No meter, so KNIGHT's late game is levels: each act boss pays its swords 3 (draft/Cashier split, 2026-10-15:
    // 470 HP and 1 level was 73 / 20 WHITE / GREEN, 390 HP and 3 levels 69 / 30).
    bossLevels: 3,
    gilded: [],
    meter: null,
    symbols: ['sword', 'shield'],
    attack: 'sword',
    levels: { sym: { sword: 2, shield: 2 }, charm: {} },
    rule: 'HALF SWORDS, HALF SHIELDS. NO METER: EACH BOSS PAYS 3 SWORD LEVELS. 390 HP.',
    raceRule: 'SWORDS PAY, SHIELDS GUARD. NO METER: EACH BOSS PAYS 3 SWORD LEVELS.',
    unlock: '',
  },
  midas: {
    id: 'midas',
    hero: 'CASH CASSIDY',
    heroSprite: 'heroMidas',
    name: 'BANKROLL',
    sprite: 'cabinetMidas',
    blurb: 'MAKE IT RAIN.',
    hp: 29 * UNIT,
    // No swords (2026-10-07): CASSIDY flings his chips. Each chip symbol hits, pays a chip and fills the bar.
    strips: r3({ shield: 6, goldbar: 6 }),
    // No gold-sword start (a leftover from MIDAS): 8 more chips instead (user playtest).
    gilded: [],
    meter: { kind: 'vault', symbol: 'goldbar', cost: 10 * UNIT, heal: 2 * UNIT },
    startChips: 24,
    symbols: ['goldbar', 'shield'],
    attack: 'goldbar',
    rule: 'CHIPS HIT AND WIN CHIPS. FULL BAR: HIT HARDER, HEAL 20. JACKPOTS MAKE IT RAIN. 290 HP.',
    raceRule: 'CHIPS PAY AND WIN CHIPS. FULL BAR: THEY PAY MORE. CHIP JACKPOTS MAKE IT RAIN.',
    unlock: 'CLEAR A RUN',
    chipsPerWin: 1,
  },
  tesla: {
    id: 'tesla',
    hero: 'DOC VOLTZ',
    heroSprite: 'heroTesla',
    name: 'TESLA',
    sprite: 'cabinetTesla',
    blurb: 'IT HUMS WHEN YOU LOOK AT IT',
    hp: 31.5 * UNIT,
    // No swords (2026-10-07): bolts are TESLA's weapon, and their damage is the lightning.
    strips: r3({ shield: 6, bolt: 6 }),
    gilded: [{ reel: 0, symbol: 'bolt', enh: 'charged', n: 4 }],
    // Heal per strike 20 -> 5: with 6 bolts a reel lightning fires far more often, and 20 a strike made TESLA unkillable (94% WHITE).
    meter: { kind: 'special', symbol: 'bolt', cost: 4 * UNIT, heal: UNIT / 2 },
    symbols: ['bolt', 'shield'],
    attack: 'bolt',
    rule: 'BOLTS CHARGE LIGHTNING: 60 DAMAGE, PIERCES SHIELDS, HEALS 5. 315 HP.',
    raceRule: 'BOLTS CHARGE THE LIGHTNING: WHEN IT FILLS IT STRIKES FOR 60.',
    unlock: 'REACH THE HOUSE',
    // 40 (2026-10-12): LIGHTNING ROD is gone (97% of TESLA runs took it; it set the cost to 40 and hit 90).
    specialCost: 4 * UNIT,
    // 60 -> 50 (2026-10-12): TESLA turned its pay into damage faster than anyone (sim: 1125 / spin in act 3 vs ~540).
    specialDamage: 6 * UNIT,
  },
  joker: {
    id: 'joker',
    hero: 'JESTER JAX',
    heroSprite: 'heroJoker',
    name: 'JOKER',
    sprite: 'cabinetJoker',
    blurb: 'NOTHING IS WHAT IT SEEMS',
    // 2026-10-12 (user): 380 HP and its jackpot payoff no longer heals (its healing grew with its WILDS: GREEN 53).
    // 335 -> 390 with the draft/Cashier split (2026-10-15: it bought WILDS at the Cashier; sim 44 / 26 -> 57 / 35).
    hp: 39 * UNIT,
    // Cards, not swords (2026-10-07): JAX throws playing cards. They hit like swords.
    strips: r3({ ace: 5, shield: 5, wild: 2 }),
    gilded: [],
    // A WILD fills 40 of 100 (was 20: in act 1 the meter rarely filled, so JAX's payoff never showed: feel playtest).
    meter: { kind: 'jackpots', symbol: 'wild', cost: 10 * UNIT, heal: 0, perWild: 5 * UNIT },
    symbols: ['ace', 'shield'],
    attack: 'ace',
    rule: 'WILDS FILL A METER: THEN ALL 3 CELLS PAY JACKPOTS. 390 HP.',
    raceRule: 'WILDS FILL A METER: THEN ALL 3 CELLS PAY JACKPOTS.',
    unlock: 'BEAT THE HOUSE WITH WILDS',
    jokerWilds: true,
  },
  jukebox: {
    id: 'jukebox',
    hero: 'DJ DECIBEL',
    heroSprite: 'heroJukebox',
    name: 'JUKEBOX',
    sprite: 'cabinetJukebox',
    blurb: 'TURN IT UP',
    hp: 39.5 * UNIT,
    // Replaces BRIAR (user, 2026-10-08): notes and shields. NOTES turn up the volume; at the max the beat drops.
    strips: r3({ note: 6, shield: 6 }),
    gilded: [],
    meter: { kind: 'volume', symbol: 'note', cost: 6 * UNIT, heal: 2 * UNIT },
    symbols: ['note', 'shield'],
    attack: 'note',
    rule: 'NOTES RAISE THE VOLUME. AT MAX THE BEAT DROPS: NOTES HIT, YOU HEAL 20. 395 HP.',
    raceRule: 'NOTES RAISE THE VOLUME: LOUDER PAYS MORE. AT MAX THE BEAT DROPS: EVERY NOTE IN SIGHT PAYS.',
    unlock: 'BEAT THE HOUSE',
  },
};

/** The playable lineup, in unlock order. MIDAS is shelved for a rework (2026-09-28): hidden, but kept in saves. */
export const CABINET_ORDER: CabinetId[] = ['knight', 'tesla', 'jukebox', 'joker', 'midas'];
/** Every machine id a save may hold (shelved ones included), so loading a save never drops an unlock. */
export const ALL_CABINETS: CabinetId[] = ['knight', 'midas', 'tesla', 'joker', 'jukebox'];

/** This machine has the lightning special (TESLA; also the bare engine with no machine, for tests). */
export const hasSpecial = (c: Cabinet | null | undefined) => !c || c.meter?.kind === 'special';
