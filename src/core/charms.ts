import { UNIT, type Enh, type Levels, type SymbolId } from './config';

/**
 * CHARMS and LEVELS (the Tuesday rework). A charm sits on one cell; levels live on the type, so a
 * level card upgrades every sword (or every gold charm), including ones added later.
 *
 * Pay math, per group on the payline: BASE (sum of its symbols' values, plus keen/charged) x MULT
 * (the double/jackpot multiplier x the group's gold, where gold charms ADD: x2 + x2 + x2 = x6).
 */
/**
 * SYMBOL LEVELS (user, 2026-10-15: like Balatro's planets): no cap, and every level adds the same step. They're hard to
 * stack: a level card is a sometimes draft card, and the Cashier's price climbs with every level you've gained, unless
 * you build for them (STAR CHART doubles each one).
 */
export const SYM = { base: 10, step: 6 };

/** Each charm's number (index 1; index 2 with the GOLDEN TICKET). CHARMS HAVE NO LEVELS (user, 2026-10-15); the rest of
 * each row is the old level table, kept for reference. */
export const CHARM_VALUE: Record<Enh, number[]> = {
  /** GOLD: this cell's share of the group multiplier (x2 plain). */
  gold: [0, 2, 3, 4, 5, 6, 7],
  /** KEEN: added to the sword group's BASE for EVERY sword in the group (and the group pierces shields). A flat +20 on one
   * cell lost to taking no charm at all (EXPERT_PLAYTEST_10 D1). */
  keen: [0, 40, 50, 60, 70, 80, 90],
  /** CHARGED: added to the bolt group's BASE (TESLA). Was 5/10/15: a tax TESLA always held. */
  charged: [0, 10, 20, 30, 40, 50, 60],
  /** VAMP: heal when the sword group hits, ONCE per group however many vamp cells are in it (stacked vamp was the auto-pick:
   * EXPERT_PLAYTEST_10). Values as before (15/20/30 took the whole game's sustain: WHITE 41 -> 39); the stacking was the exploit. */
  vamp: [0, 20, 30, 40, 50, 60, 70],
  /** LUCKY: % chance the cell lands as a WILD. */
  lucky: [0, 40, 55, 70, 85, 95, 100],
  /** BLAZE: added to TESLA's special for every blaze cell you own. */
  blaze: [0, 5, 10, 15, 20, 25, 30],
  /** BULWARK (id 'spiked'): a shield cell with it also deals this % of its share of the group as damage. Was 50/75/100: KNIGHT's own
   * charm cost KNIGHT runs. */
  spiked: [0, 100, 125, 150, 175, 200, 225],
  /** LUCRE: the per-fight chip cap (+LUCRE_CHIPS each time its group pays, paid on a win). +1 a hit measured under
   * taking no charm (CONTENT_13). */
  lucre: [0, 6, 9, 12, 15, 18, 21],
  /** TRICK (JOKER only): into the jackpot meter when it lands. */
  trick: [0, 30, 40, 55, 65, 75, 85],
  /** ECHO (THE JUKEBOX): at THE DROP its NOTE hits this many times (x2 at LV1). */
  echo: [0, 2, 2.5, 3, 3.5, 4, 4.5],
  /** GLASS (user, 2026-10-14): GOLD's big brother, added into the group like GOLD, but 1 in 4 to shatter for good when it pays. */
  glass: [0, 5, 6, 7, 8, 9, 10],
};
/** BLAZE as the % of TESLA's lightning it adds: each BLAZE adds its value over a full strike (TESLA's one axis turns it
 * into charge, so every bolt still hits the same; audit 2026-11-01). The strike is 4.4 UNIT (cabinets.ts, checked by a test). */
export const TESLA_STRIKE = 4.4 * UNIT;
export const blazePct = (v: number) => Math.round((v / TESLA_STRIKE) * 100);
/** GLASS: the chance it shatters each time its group pays. */
export const GLASS_BREAK = 0.25;
/** LUCRE: chips each time its group pays (up to its cap). */
export const LUCRE_CHIPS = 3;

/** Which symbols each charm can go on. */
export const CHARM_SYMBOLS: Record<Enh, SymbolId[]> = {
  gold: ['sword', 'ace', 'goldbar', 'shield', 'bolt', 'note'],
  keen: ['sword', 'ace', 'note'],
  charged: ['bolt'],
  vamp: ['sword', 'ace', 'note'],
  lucky: ['sword', 'ace', 'shield', 'bolt', 'note'],
  blaze: ['bolt'],
  spiked: ['shield'],
  lucre: ['sword', 'ace', 'goldbar', 'shield', 'bolt', 'note'],
  trick: ['sword', 'ace', 'shield'],
  echo: ['note'],
  glass: ['sword', 'ace', 'goldbar', 'shield', 'bolt', 'note'],
};

/** One charm's rule at a level, as plain card text (never an expected value). */
export function charmRuleText(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  switch (enh) {
    case 'gold':
      return `X${v} TO ITS GROUP (GOLD IN A GROUP ADDS UP)`;
    case 'keen':
      return `+${v} TO EACH ONE IN ITS GROUP, WHICH PIERCES SHIELDS`;
    case 'charged':
      return `+${v} TO ITS GROUP`;
    case 'vamp':
      return `HEALS ${v} WHEN ITS GROUP HITS (ONCE PER GROUP)`;
    case 'lucky':
      return `${v}% TO LAND AS A WILD`;
    case 'blaze':
      return `LIGHTNING DAMAGE +${blazePct(v)}% FOR EVERY BLAZE CHARM YOU OWN`;
    case 'spiked':
      return `ALSO HITS FOR ${v}% OF ITS SHIELD`;
    case 'lucre':
      return `+${LUCRE_CHIPS} CHIPS WHEN ITS GROUP PAYS (MAX ${v} A FIGHT, ON A WIN)`;
    case 'trick':
      return `+${v} TO YOUR JACKPOT METER WHEN IT LANDS`;
    case 'echo':
      return `AT THE DROP, ITS NOTE HITS X${v}`;
    case 'glass':
      return `X${v} TO ITS GROUP (ADDS UP LIKE GOLD). 1 IN 4 TO SHATTER FOR GOOD WHEN IT PAYS`;
  }
}

/**
 * The same rule in a few words, for shop and draft cards (the collection and tooltips keep the long form). The user's
 * words from the content audit (Claude Doc, Charms "codex text" and the upgrade cards: "REEL 1 SWORDS: X2 PAY").
 */
export function charmShortText(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  switch (enh) {
    case 'gold':
      return `X${v} PAY`;
    case 'keen':
      return `+${v} DAMAGE AND PIERCES SHIELDS`;
    case 'charged':
      return `+${v} CHARGE`;
    case 'vamp':
      return `+${v} HP`;
    case 'lucky':
      return `${v}% CHANCE TO BE A WILD`;
    case 'blaze':
      return `+${blazePct(v)}% LIGHTNING DAMAGE`;
    case 'spiked':
      return `HITS FOR ${v}% OF ITS SHIELD`;
    case 'lucre':
      return `+${LUCRE_CHIPS} CHIPS (MAX ${v} PER FIGHT)`;
    case 'trick':
      return `+${v} TO YOUR JACKPOT METER`;
    case 'echo':
      return `AT THE DROP, ITS NOTE HITS X${v}`;
    case 'glass':
      return `X${v} PAY. 1 IN 4 TO SHATTER`;
  }
}

/** A charm's name as players see it (the id 'spiked' is BULWARK). */
export const charmName = (enh: Enh): string => (enh === 'spiked' ? 'BULWARK' : enh === 'lucre' ? 'CHIP' : enh.toUpperCase());

/** The number shown on a charmed cell's top-right tag (coloured by charm). */
export function charmTag(enh: Enh, lvl: number): string {
  const v = charmValue(enh, lvl);
  // LUCRE's number is its cap; its tag shows what a hit pays.
  return enh === 'gold' || enh === 'echo' || enh === 'glass' ? `X${v}` : enh === 'lucky' || enh === 'spiked' ? `${v}%` : enh === 'lucre' ? `+${LUCRE_CHIPS}` : `+${v}`;
}

export const CHARM_COLOR: Record<Enh, string> = {
  gold: '#ffd23f',
  keen: '#9fe8ff',
  charged: '#fff27a',
  vamp: '#ff5a6a',
  lucky: '#7dff7a',
  blaze: '#ff9a3a',
  lucre: '#ffd23f',
  trick: '#c795f0',
  echo: '#5ad8e8',
  spiked: '#c9d0dc',
  glass: '#d8f6ff',
};

/** A symbol's value at a level (the base game's symbols; enemy symbols use the config base): no cap. */
export const symValue = (lvl: number) => SYM.base + SYM.step * (Math.max(1, Math.floor(lvl)) - 1);
export const charmValue = (enh: Enh, lvl: number) => CHARM_VALUE[enh][Math.max(1, Math.min(CHARM_VALUE[enh].length - 1, Math.floor(lvl)))];

/** Symbols the player's levels apply to. */
export const LEVELLED: ReadonlySet<SymbolId> = new Set(['sword', 'ace', 'shield', 'bolt', 'goldbar', 'note']);

export const symLevel = (lv: Levels | undefined, s: SymbolId) => lv?.sym[s] ?? 1;
/** Charms have no levels (user, 2026-10-15): a charm reads its one value, a step up with the GOLDEN TICKET. (An old
 * save's charm levels are ignored.) */
export const charmLevel = (_lv: Levels | undefined, _e: Enh, ticket = false) => 1 + (ticket ? 1 : 0);

/** Value of one player symbol on the payline. */
export function playerSymValue(lv: Levels | undefined, s: SymbolId, base: number): number {
  return LEVELLED.has(s) ? Math.round((symValue(symLevel(lv, s)) * base) / UNIT) : base;
}
