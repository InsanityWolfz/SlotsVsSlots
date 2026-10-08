import { UNIT, type Enh, type Gild, type Levels, type StripCounts, type SymbolId } from './config';

export type CabinetId = 'knight' | 'midas' | 'thorn' | 'tesla' | 'joker' | 'jukebox';

/**
 * What a slot machine's signature symbol fills, and what the full meter does (the Tuesday rework):
 * - special (TESLA): bolts charge the lightning special, which fires at `cost` and ignores shields;
 * - touch (MIDAS): gold bars fill the meter (no cap); when full, the swords and shields on your next such spin
 *   gain a gold touch (x2 each, max 3 per cell) for the rest of the fight; every extra full meter touches one more cell;
 * - thorns (BRIAR): thorns bank their pay; the next time you're attacked the bank hits back, then clears;
 * - jackpots (JAX): each WILD on the payline fills the meter; when full, the next spin's three payline
 *   cells each pay as a jackpot of themselves.
 * - volume (THE JUKEBOX): each NOTE on the payline turns the volume up 1 (+10% damage each); a spin with no note drops it
 *   2; at the max the next spin is THE DROP: every NOTE you can see in the 3x3 window hits. Then it falls back to 2.
 * Every payoff also heals you a little (`heal`). KNIGHT has no meter.
 */
export type MeterKind = 'special' | 'touch' | 'thorns' | 'jackpots' | 'vault' | 'volume';
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
  /** The symbol this machine attacks with (the sim's bot values it highest). */
  attack: SymbolId;
  /** Starting symbol / charm levels. */
  levels?: Levels;
  chipsPerWin?: number;
  /** Chips this machine starts a run with (default CHIPS.start). */
  startChips?: number;
  enemyAbilityMinus?: number;
  specialCost?: number;
  specialDamage?: number;
  /** A WILD anywhere on the line lets any two matching reels pay as a double. */
  jokerWilds?: boolean;
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
    attack: 'sword',
    levels: { sym: { sword: 2, shield: 2 }, charm: {} },
    rule: 'HALF SWORDS, HALF SHIELDS, BOTH AT LEVEL 2. NO METER. 300 HP.',
    unlock: '',
  },
  midas: {
    id: 'midas',
    hero: 'CASH CASSIDY',
    heroSprite: 'heroMidas',
    name: 'THE BANKROLL',
    sprite: 'cabinetMidas',
    blurb: 'MAKE IT RAIN.',
    // 360 HP (was 300): MIDAS trailed every table, its GREEN deaths spread over the whole run (EXPERT_PLAYTEST_9 D6).
    hp: 36 * UNIT,
    // No swords (2026-10-07): CASSIDY flings his chips. Each chip symbol hits, pays a chip and fills the bar.
    strips: r3({ shield: 6, goldbar: 6 }),
    // No gold-sword start (a leftover from MIDAS): 8 more chips instead (user playtest).
    gilded: [],
    favors: 'gold',
    meter: { kind: 'vault', symbol: 'goldbar', cost: 10 * UNIT, heal: 2 * UNIT },
    startChips: 24,
    symbols: ['goldbar', 'shield'],
    attack: 'goldbar',
    rule: 'MORE CHIPS, BIGGER PAYS. A CHIP JACKPOT MAKES IT RAIN! 360 HP.',
    unlock: 'CLEAR A RUN',
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
    // No swords (2026-10-07): BRIAR is all retaliation. Thorns bank; a hit that gets through fires the bank.
    strips: r3({ shield: 6, thorn: 6 }),
    gilded: [],
    favors: 'thorny',
    // No volley heal (her volleys fire so often now that 10 each kept her topped up); ROSE HIP is her sustain.
    meter: { kind: 'thorns', symbol: 'thorn', cost: 0, heal: 0 },
    symbols: ['thorn', 'shield'],
    attack: 'thorn',
    rule: 'THORNS ADD UP. EACH SPIN, HALF OF THEM LASH OUT. A HIT THAT GETS THROUGH FIRES THE REST. 300 HP.',
    unlock: 'BEAT THE HOUSE',
  },
  tesla: {
    id: 'tesla',
    hero: 'DOC VOLTZ',
    heroSprite: 'heroTesla',
    name: 'TESLA',
    sprite: 'cabinetTesla',
    blurb: 'IT HUMS WHEN YOU LOOK AT IT',
    hp: 25 * UNIT,
    // No swords (2026-10-07): bolts are TESLA's weapon, and their damage is the lightning.
    strips: r3({ shield: 6, bolt: 6 }),
    gilded: [{ reel: 0, symbol: 'bolt', enh: 'charged', n: 4 }],
    favors: 'charged',
    // Heal per strike 20 -> 5: with 6 bolts a reel lightning fires far more often, and 20 a strike made TESLA unkillable (94% WHITE).
    meter: { kind: 'special', symbol: 'bolt', cost: 4 * UNIT, heal: UNIT / 2 },
    symbols: ['bolt', 'shield'],
    attack: 'bolt',
    rule: 'BOLTS CHARGE LIGHTNING: 60 DAMAGE THROUGH SHIELDS. 250 HP.',
    rodDamage: 9 * UNIT,
    unlock: 'REACH THE HOUSE',
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
    // Cards, not swords (2026-10-07): JAX throws playing cards. They hit like swords.
    strips: r3({ ace: 5, shield: 5, wild: 2 }),
    gilded: [],
    favors: 'lucky',
    meter: { kind: 'jackpots', symbol: 'wild', cost: 10 * UNIT, heal: 3 * UNIT, perWild: 2 * UNIT },
    symbols: ['ace', 'shield'],
    attack: 'ace',
    rule: 'WILDS FILL A METER: THEN ALL 3 CELLS PAY JACKPOTS. 220 HP.',
    unlock: 'BEAT THE HOUSE WITH WILDS',
    jokerWilds: true,
  },
  jukebox: {
    id: 'jukebox',
    hero: 'DJ DECIBEL',
    heroSprite: 'heroJukebox',
    name: 'THE JUKEBOX',
    sprite: 'cabinetJukebox',
    blurb: 'TURN IT UP',
    hp: 32 * UNIT,
    // Replaces BRIAR (user, 2026-10-08): notes and shields. NOTES turn up the volume; at the max the beat drops.
    strips: r3({ note: 6, shield: 6 }),
    gilded: [],
    favors: 'echo',
    meter: { kind: 'volume', symbol: 'note', cost: 6 * UNIT, heal: 2 * UNIT },
    symbols: ['note', 'shield'],
    attack: 'note',
    rule: 'NOTES TURN UP THE VOLUME. AT MAX THE BEAT DROPS: EVERY NOTE HITS. 320 HP.',
    unlock: 'BEAT THE HOUSE',
  },
};

/** The playable lineup, in unlock order. MIDAS is shelved for a rework (2026-09-28): hidden, but kept in saves. */
/** BRIAR ('thorn') is retired (2026-10-08): THE JUKEBOX takes her slot. Her id stays in saves (ALL_CABINETS). */
export const CABINET_ORDER: CabinetId[] = ['knight', 'tesla', 'jukebox', 'joker', 'midas'];
/** Every machine id a save may hold (shelved ones included), so loading a save never drops an unlock. */
export const ALL_CABINETS: CabinetId[] = ['knight', 'midas', 'thorn', 'tesla', 'joker', 'jukebox'];

/** This machine has the lightning special (TESLA; also the bare engine with no machine, for tests). */
export const hasSpecial = (c: Cabinet | null | undefined) => !c || c.meter?.kind === 'special';
