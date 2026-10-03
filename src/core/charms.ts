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
export const SYM_VALUE = [0, 10, 13, 18, 25];

/** Each charm's number by level (1..4; level 4 only with the Golden Ticket). */
export const CHARM_VALUE: Record<Enh, number[]> = {
  /** GOLD: this cell's share of the group multiplier (x2 plain). */
  gold: [0, 2, 3, 4, 5],
  /** KEEN: added to the sword group's BASE for EVERY sword in the group (and the group pierces shields). A flat +20 on one
   * cell lost to taking no charm at all (EXPERT_PLAYTEST_10 D1). */
  keen: [0, 20, 30, 40, 50],
  /** CHARGED: added to the bolt group's BASE (TESLA). Was 5/10/15: a tax TESLA always held. */
  charged: [0, 10, 15, 20, 25],
  /** VAMP: heal when the sword group hits, ONCE per group however many vamp cells are in it. Was 20/30/40 per cell: the auto-pick. */
  vamp: [0, 15, 20, 30, 40],
  /** LUCKY: % chance the cell lands as a WILD. */
  lucky: [0, 40, 55, 70, 85],
  /** BLAZE: added to TESLA's special for every blaze cell you own. */
  blaze: [0, 10, 15, 20, 25],
  /** BULWARK (id 'spiked'): a shield cell with it also deals this % of its share of the group as damage. Was 50/75/100: KNIGHT's own
   * charm cost KNIGHT runs. */
  spiked: [0, 100, 125, 150, 175],
};

/** Which symbols each charm can go on. */
export const CHARM_SYMBOLS: Record<Enh, SymbolId[]> = {
  gold: ['sword', 'shield', 'bolt'],
  keen: ['sword'],
  charged: ['bolt'],
  vamp: ['sword'],
  lucky: ['sword', 'shield', 'bolt'],
  blaze: ['bolt'],
  spiked: ['shield'],
};

/** One charm's rule at a level, as plain card text (never an expected value). */
export function charmRuleText(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  switch (enh) {
    case 'gold':
      return `X${v} TO ITS GROUP (GOLD IN A GROUP ADDS UP)`;
    case 'keen':
      return `+${v} TO EACH SWORD IN ITS GROUP, WHICH PIERCES SHIELDS`;
    case 'charged':
      return `+${v} TO ITS GROUP`;
    case 'vamp':
      return `HEALS ${v} WHEN ITS GROUP HITS (ONCE PER GROUP)`;
    case 'lucky':
      return `${v}% TO LAND AS A WILD`;
    case 'blaze':
      return `YOUR SPECIAL DEALS +${v}`;
    case 'spiked':
      return `ALSO HITS FOR ${v}% OF ITS SHIELD`;
  }
}

/** A charm's name as players see it (the id 'spiked' is BULWARK). */
export const charmName = (enh: Enh): string => (enh === 'spiked' ? 'BULWARK' : enh.toUpperCase());

/** The number shown on a charmed cell's top-right tag (coloured by charm). */
export function charmTag(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  return enh === 'gold' ? `X${v}` : enh === 'lucky' || enh === 'spiked' ? `${v}%` : `+${v}`;
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
export const symValue = (lvl: number) => SYM_VALUE[clampLvl(lvl, LEVEL_CAP + 1)];
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
