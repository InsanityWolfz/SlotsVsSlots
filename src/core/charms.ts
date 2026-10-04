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
  keen: [0, 40, 50, 60, 70],
  /** CHARGED: added to the bolt group's BASE (TESLA). Was 5/10/15: a tax TESLA always held. */
  charged: [0, 10, 15, 20, 25],
  /** VAMP: heal when the sword group hits, ONCE per group however many vamp cells are in it (stacked vamp was the auto-pick:
   * EXPERT_PLAYTEST_10). Values as before (15/20/30 took the whole game's sustain: WHITE 41 -> 39); the stacking was the exploit. */
  vamp: [0, 20, 30, 40, 50],
  /** LUCKY: % chance the cell lands as a WILD. */
  lucky: [0, 40, 55, 70, 85],
  /** BLAZE: added to TESLA's special for every blaze cell you own. */
  blaze: [0, 10, 15, 20, 25],
  /** BULWARK (id 'spiked'): a shield cell with it also deals this % of its share of the group as damage. Was 50/75/100: KNIGHT's own
   * charm cost KNIGHT runs. */
  spiked: [0, 100, 125, 150, 175],
  /** THORNY (BRIAR only): banked into your thorns when it lands on the payline. BRIAR's charms were a trap: a no-charms
   * drafter won +9 WHITE (EXPERT_PLAYTEST_12 D1). 20/30/40 measured 42.1/14.6 for BRIAR: a trap of its own (the round's
   * prototype read LV4 from the start). */
  thorny: [0, 50, 60, 70, 80],
  /** LUCRE: the per-fight chip cap (+LUCRE_CHIPS each time its group pays, paid on a win). +1 a hit measured under
   * taking no charm (CONTENT_13). */
  lucre: [0, 6, 9, 12, 15],
  /** TRICK (JOKER only): into the jackpot meter when it lands. */
  trick: [0, 25, 35, 50, 60],
  /** INGOT (MIDAS only): gold meter pips when it lands (draft cards only: sold at the Cashier, MIDAS fell to 32 WHITE). */
  ingot: [0, 2, 3, 4, 5],
};
/** LUCRE: chips each time its group pays (up to its cap). */
export const LUCRE_CHIPS = 3;

/** Which symbols each charm can go on. */
export const CHARM_SYMBOLS: Record<Enh, SymbolId[]> = {
  gold: ['sword', 'shield', 'bolt'],
  keen: ['sword'],
  charged: ['bolt'],
  vamp: ['sword'],
  lucky: ['sword', 'shield', 'bolt'],
  blaze: ['bolt'],
  spiked: ['shield'],
  thorny: ['thorn'],
  lucre: ['sword', 'shield', 'bolt'],
  trick: ['sword', 'shield'],
  ingot: ['goldbar'],
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
    case 'thorny':
      return `+${v} TO YOUR THORNS WHEN IT LANDS`;
    case 'lucre':
      return `+${LUCRE_CHIPS} CHIPS WHEN ITS GROUP PAYS (MAX ${v} A FIGHT, ON A WIN)`;
    case 'trick':
      return `+${v} TO YOUR JACKPOT METER WHEN IT LANDS`;
    case 'ingot':
      return `+${v} TO YOUR GOLD METER WHEN IT LANDS`;
  }
}

/** The same rule in a few words, for shop and draft cards (the collection and tooltips keep the long form). */
export function charmShortText(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  switch (enh) {
    case 'gold':
      return `X${v} PAY, GOLD STACKS`;
    case 'keen':
      return `+${v} PER SWORD, PIERCES`;
    case 'charged':
      return `+${v} BOLT PAY`;
    case 'vamp':
      return `HEAL ${v} ON A HIT`;
    case 'lucky':
      return `${v}% TO BE WILD`;
    case 'blaze':
      return `SPECIAL +${v}`;
    case 'spiked':
      return `HITS FOR ${v}% OF ITS SHIELD`;
    case 'thorny':
      return `+${v} THORNS WHEN IT LANDS`;
    case 'lucre':
      return `+${LUCRE_CHIPS} CHIPS ON A HIT, MAX ${v}`;
    case 'trick':
      return `+${v} METER WHEN IT LANDS`;
    case 'ingot':
      return `+${v} GOLD METER WHEN IT LANDS`;
  }
}

/** A charm's name as players see it (the id 'spiked' is BULWARK). */
export const charmName = (enh: Enh): string => (enh === 'spiked' ? 'BULWARK' : enh.toUpperCase());

/** The number shown on a charmed cell's top-right tag (coloured by charm). */
export function charmTag(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  // LUCRE's number is its cap; its tag shows what a hit pays.
  return enh === 'gold' ? `X${v}` : enh === 'lucky' || enh === 'spiked' ? `${v}%` : enh === 'lucre' ? `+${LUCRE_CHIPS}` : `+${v}`;
}

export const CHARM_COLOR: Record<Enh, string> = {
  gold: '#ffd23f',
  keen: '#9fe8ff',
  charged: '#fff27a',
  vamp: '#ff5a6a',
  lucky: '#7dff7a',
  blaze: '#ff9a3a',
  thorny: '#ff9ec8',
  lucre: '#ffd23f',
  trick: '#c795f0',
  ingot: '#d3dde8',
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
