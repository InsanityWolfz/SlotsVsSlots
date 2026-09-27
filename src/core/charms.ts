import { UNIT, type Enh, type Levels, type SymbolId } from './config';

/**
 * CHARMS and LEVELS (the Tuesday rework). A charm sits on one cell; levels live on the type, so a
 * level card upgrades every sword (or every gold charm), including ones added later.
 *
 * Pay math, per group on the payline: BASE (sum of its symbols' values, plus keen/charged) x MULT
 * (the double/jackpot multiplier x the group's gold, where gold charms ADD: x2 + x2 + x2 = x6).
 */
export const LEVEL_CAP = 3;
/** A symbol's value by level (1..3): the step grows so early levels don't snowball (user: +1 then bigger). */
export const SYM_VALUE = [0, 10, 13, 18];

/** Each charm's number by level (1..4; level 4 only with the Golden Ticket). */
export const CHARM_VALUE: Record<Enh, number[]> = {
  /** GOLD: this cell's share of the group multiplier (x2 plain). */
  gold: [0, 2, 3, 4, 5],
  /** KEEN: added to the sword group's BASE (and the group pierces shields). */
  keen: [0, 5, 10, 15, 20],
  /** CHARGED: added to the bolt group's BASE (TESLA). */
  charged: [0, 5, 10, 15, 20],
  /** VAMP: heal when the sword group hits. */
  vamp: [0, 10, 15, 20, 25],
  /** LUCKY: % chance the cell lands as a WILD. */
  lucky: [0, 35, 50, 65, 80],
  /** BLAZE: added to TESLA's special for every blaze cell you own. */
  blaze: [0, 10, 15, 20, 25],
  /** Retired. */
  spiked: [0, 0, 0, 0, 0],
};

/** Which symbols each charm can go on. */
export const CHARM_SYMBOLS: Record<Enh, SymbolId[]> = {
  gold: ['sword', 'shield', 'bolt'],
  keen: ['sword'],
  charged: ['bolt'],
  vamp: ['sword'],
  lucky: ['sword', 'shield', 'bolt'],
  blaze: ['bolt'],
  spiked: [],
};

/** The number shown on a charmed cell's top-right tag (coloured by charm). */
export function charmTag(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  return enh === 'gold' ? `X${v}` : enh === 'lucky' ? `${v}%` : `+${v}`;
}

export const CHARM_COLOR: Record<Enh, string> = {
  gold: '#ffd23f',
  keen: '#9fe8ff',
  charged: '#fff27a',
  vamp: '#ff5a6a',
  lucky: '#7dff7a',
  blaze: '#ff9a3a',
  spiked: '#c9d0dc',
};

const clampLvl = (l: number, max: number) => Math.max(1, Math.min(max, Math.floor(l)));

/** A symbol's value at a level (the base game's symbols; enemy symbols use the config base). */
export const symValue = (lvl: number) => SYM_VALUE[clampLvl(lvl, LEVEL_CAP)];
export const charmValue = (enh: Enh, lvl: number) => CHARM_VALUE[enh][clampLvl(lvl, 4)];

/** Symbols the player's levels apply to. */
export const LEVELLED: ReadonlySet<SymbolId> = new Set(['sword', 'shield', 'bolt', 'goldbar', 'thorn']);

export const symLevel = (lv: Levels | undefined, s: SymbolId) => lv?.sym[s] ?? 1;
/** The Golden Ticket makes every charm one level higher (past the cap). */
export const charmLevel = (lv: Levels | undefined, e: Enh, ticket = false) => (lv?.charm[e] ?? 1) + (ticket ? 1 : 0);

/** Value of one player symbol on the payline. */
export function playerSymValue(lv: Levels | undefined, s: SymbolId, base: number): number {
  return LEVELLED.has(s) ? Math.round((symValue(symLevel(lv, s)) * base) / UNIT) : base;
}
