import type { Enh, Gild, StripCounts } from './config';

export type CabinetId = 'knight' | 'midas' | 'thorn' | 'tesla' | 'joker';

/**
 * Starting machines: each run begins on one. They give a run its identity (a starting build,
 * an HP pool and one rule) and bias gild offers toward their enhancement.
 */
export interface Cabinet {
  id: CabinetId;
  name: string;
  sprite: string;
  blurb: string;
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
  chipsPerWin?: number;
  enemyAbilityMinus?: number;
  specialCost?: number;
  specialDamage?: number;
  /** A WILD anywhere on the line lets any two matching reels pay as a double. */
  jokerWilds?: boolean;
}

const r3 = (c: StripCounts): StripCounts[] => [{ ...c }, { ...c }, { ...c }];

export const CABINETS: Record<CabinetId, Cabinet> = {
  knight: {
    id: 'knight',
    name: 'KNIGHT',
    sprite: 'cabinetKnight',
    blurb: 'THE DEPENDABLE ONE',
    hp: 32,
    strips: r3({ sword: 4, shield: 4, bolt: 4 }),
    gilded: [],
    favors: null,
    rule: 'NO SPECIAL RULES. 32 HP.',
    unlock: '',
  },
  midas: {
    id: 'midas',
    name: 'MIDAS MACHINE',
    sprite: 'cabinetMidas',
    blurb: 'EVERYTHING IT TOUCHES...',
    hp: 22,
    strips: r3({ sword: 4, shield: 4, bolt: 4 }),
    gilded: [{ reel: 0, symbol: 'sword', enh: 'gold' }],
    favors: 'gold',
    rule: 'GOLD SWORDS ON REEL 1. MORE GOLD OFFERS. +1 CHIP PER WIN. 22 HP.',
    unlock: 'REACH THE HOUSE',
    chipsPerWin: 1,
  },
  thorn: {
    id: 'thorn',
    name: 'THORN',
    sprite: 'cabinetThorn',
    blurb: 'TOUCH IT. I DARE YOU.',
    hp: 28,
    strips: r3({ sword: 4, shield: 4, bolt: 4 }),
    gilded: [{ reel: 0, symbol: 'shield', enh: 'spiked' }],
    favors: 'spiked',
    rule: 'SPIKED SHIELDS ON REEL 1. SPIKED OFFERS MORE OFTEN. 28 HP.',
    unlock: 'BEAT AN ELITE',
  },
  tesla: {
    id: 'tesla',
    name: 'TESLA',
    sprite: 'cabinetTesla',
    blurb: 'IT HUMS WHEN YOU LOOK AT IT',
    hp: 25,
    strips: r3({ sword: 4, shield: 4, bolt: 4 }),
    gilded: [{ reel: 0, symbol: 'bolt', enh: 'charged' }],
    favors: 'charged',
    rule: 'CHARGED BOLTS ON REEL 1. SPECIAL COSTS 4 BUT HITS FOR 7. 25 HP.',
    unlock: 'WIN A RUN',
    specialCost: 4,
    specialDamage: 7,
  },
  joker: {
    id: 'joker',
    name: 'JOKER',
    sprite: 'cabinetJoker',
    blurb: 'NOTHING IS WHAT IT SEEMS',
    hp: 27,
    strips: [
      { sword: 4, shield: 4, bolt: 4 },
      { sword: 4, shield: 2, bolt: 4, wild: 2 },
      { sword: 4, shield: 4, bolt: 4 },
    ],
    gilded: [],
    favors: null,
    rule: '2 WILDS ON REEL 2. WITH A WILD ON THE LINE, ANY TWO REELS CAN PAY A DOUBLE. 27 HP.',
    unlock: 'WIN A RUN WITH WILDS',
    jokerWilds: true,
  },
};

export const CABINET_ORDER: CabinetId[] = ['knight', 'midas', 'thorn', 'tesla', 'joker'];
