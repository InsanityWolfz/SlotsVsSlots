import { UNIT, type Enh, type Gild, type Levels, type StripCounts, type SymbolId } from './config';

export type CabinetId = 'knight' | 'midas' | 'thorn' | 'tesla' | 'joker';

/**
 * What a slot machine's signature symbol fills, and what the full meter does (the Tuesday rework):
 * - special (TESLA): bolts charge the lightning special, which fires at `cost` and ignores shields;
 * - raise (MIDAS): gold bars fill the meter; when full, your next PAYING group pays x4;
 * - thorns (BRIAR): thorns bank their pay; the next time you're attacked the bank hits back, then clears;
 * - jackpots (JAX): each WILD on the payline fills the meter; when full, the next spin's three payline
 *   cells each pay as a jackpot of themselves.
 * Every payoff also heals you a little (`heal`). KNIGHT has no meter.
 */
export type MeterKind = 'special' | 'raise' | 'thorns' | 'jackpots';
export interface Meter {
  kind: MeterKind;
  /** The symbol that fills it. */
  symbol: SymbolId;
  /** Full at this much (x10 units; BRIAR's bank has no cap). */
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
  /** Gild offers lean toward this enhancement. */
  favors: Enh | null;
  /** Rule text for the pick card. */
  rule: string;
  /** How to unlock it (shown while locked). */
  unlock: string;
  // Rules (read by run.ts / fight.ts):
  /** The signature meter (none for KNIGHT). */
  meter: Meter | null;
  /** The symbols this machine's swap cards move between. */
  symbols: SymbolId[];
  /** Starting symbol / charm levels. */
  levels?: Levels;
  chipsPerWin?: number;
  enemyAbilityMinus?: number;
  specialCost?: number;
  specialDamage?: number;
  /** A WILD anywhere on the line lets any two matching reels pay as a double. */
  jokerWilds?: boolean;
  /** Act 2 signature, applied when the House falls (ITERATION_8 Package P). */
  act2?: { text: string; maxHp?: number; wilds?: { reel: number; count: number } };
  /** Lightning Rod special damage for this cabinet (default 12). */
  rodDamage?: number;
}

const r3 = (c: StripCounts): StripCounts[] => [{ ...c }, { ...c }, { ...c }];

export const CABINETS: Record<CabinetId, Cabinet> = {
  knight: {
    id: 'knight',
    hero: 'SIR REGINALD',
    heroSprite: 'heroKnight',
    name: 'KNIGHT',
    sprite: 'cabinetKnight',
    blurb: 'THE DEPENDABLE ONE',
    hp: 30 * UNIT,
    // FORGED STEEL: half swords, half shields, and they start at level 2.
    strips: r3({ sword: 6, shield: 6 }),
    gilded: [],
    favors: null,
    meter: null,
    symbols: ['sword', 'shield'],
    levels: { sym: { sword: 2, shield: 2 }, charm: {} },
    rule: 'HALF SWORDS, HALF SHIELDS, BOTH AT LEVEL 2. NO METER. 300 HP.',
    act2: { text: '+60 MAX HP', maxHp: 6 * UNIT },
    unlock: '',
  },
  midas: {
    id: 'midas',
    hero: 'KING AURUM',
    heroSprite: 'heroMidas',
    name: 'MIDAS MACHINE',
    sprite: 'cabinetMidas',
    blurb: 'EVERYTHING IT TOUCHES...',
    hp: 19 * UNIT,
    strips: r3({ sword: 4, shield: 4, goldbar: 4 }),
    gilded: [{ reel: 0, symbol: 'sword', enh: 'gold', n: 4 }],
    favors: 'gold',
    meter: { kind: 'raise', symbol: 'goldbar', cost: 2 * UNIT, heal: 2 * UNIT },
    symbols: ['sword', 'shield', 'goldbar'],
    rule: 'GOLD BARS FILL A METER: THEN YOUR NEXT PAY IS X4. +1 CHIP A WIN. 190 HP.',
    act2: { text: 'THE +1 CHIP PER WIN KEEPS PAYING' },
    unlock: 'REACH THE HOUSE',
    chipsPerWin: 1,
  },
  thorn: {
    id: 'thorn',
    hero: 'BRIAR',
    heroSprite: 'heroThorn',
    name: 'THORN',
    sprite: 'cabinetThorn',
    blurb: 'TOUCH IT. I DARE YOU.',
    hp: 30 * UNIT,
    strips: r3({ sword: 4, shield: 4, thorn: 4 }),
    gilded: [],
    favors: 'vamp',
    meter: { kind: 'thorns', symbol: 'thorn', cost: 0, heal: UNIT / 2 },
    symbols: ['sword', 'shield', 'thorn'],
    rule: 'THORNS BANK THEIR PAY. WHEN YOU ARE ATTACKED, THE BANK HITS BACK. 300 HP.',
    act2: { text: '+40 MAX HP', maxHp: 4 * UNIT },
    unlock: 'BEAT AN ELITE',
  },
  tesla: {
    id: 'tesla',
    hero: 'DOC VOLTZ',
    heroSprite: 'heroTesla',
    name: 'TESLA',
    sprite: 'cabinetTesla',
    blurb: 'IT HUMS WHEN YOU LOOK AT IT',
    hp: 25 * UNIT,
    strips: r3({ sword: 4, shield: 4, bolt: 4 }),
    gilded: [{ reel: 0, symbol: 'bolt', enh: 'charged', n: 4 }],
    favors: 'charged',
    meter: { kind: 'special', symbol: 'bolt', cost: 4 * UNIT, heal: 2 * UNIT },
    symbols: ['sword', 'shield', 'bolt'],
    rule: 'BOLTS CHARGE LIGHTNING: 60 DAMAGE THROUGH SHIELDS. 250 HP.',
    rodDamage: 9 * UNIT,
    act2: { text: 'CHEAP SPECIALS KEEP FIRING' },
    unlock: 'BEAT THE HOUSE',
    specialCost: 4 * UNIT,
    specialDamage: 6 * UNIT,
  },
  joker: {
    id: 'joker',
    hero: 'JESTER JAX',
    heroSprite: 'heroJoker',
    name: 'JOKER',
    sprite: 'cabinetJoker',
    blurb: 'NOTHING IS WHAT IT SEEMS',
    hp: 22 * UNIT,
    strips: r3({ sword: 5, shield: 5, wild: 2 }),
    gilded: [],
    favors: 'lucky',
    meter: { kind: 'jackpots', symbol: 'wild', cost: 10 * UNIT, heal: 3 * UNIT, perWild: 2 * UNIT },
    symbols: ['sword', 'shield'],
    rule: 'WILDS FILL A METER: THEN ALL 3 CELLS PAY JACKPOTS. 220 HP.',
    act2: { text: '2 SHIELDS ON REEL 3 BECOME WILDS', wilds: { reel: 2, count: 2 } },
    unlock: 'BEAT THE HOUSE WITH WILDS',
    jokerWilds: true,
  },
};

export const CABINET_ORDER: CabinetId[] = ['knight', 'midas', 'thorn', 'tesla', 'joker'];

/** This machine has the lightning special (TESLA; also the bare engine with no machine, for tests). */
export const hasSpecial = (c: Cabinet | null | undefined) => !c || c.meter?.kind === 'special';
