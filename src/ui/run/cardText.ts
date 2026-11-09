import type { RelicId } from '../../core/config';
import type { CabinetId } from '../../core/cabinets';
import { RELICS, RELIC_TIER } from '../../core/relics';
import { type DraftOption, type RunState } from '../../core/run';
import { charmCardFull, describeOption } from '../../core/draft';
import { RAIN } from '../../core/fightRules';

/**
 * Cards say at most two lines at body size (the UI kit, user 2026-10-30). The rules' full wording stays in the core
 * (relicText, describeOption) and shows in the card's detail box on hover, focus or tap; these are the card faces'
 * short versions, for the texts that run past two lines. A function gets the full text (some vary by machine).
 */
const SHORT: Partial<Record<RelicId, string | ((full: string) => string)>> = {
  mirror: 'ANY 2 MATCHING REELS ARE A PAIR',
  prism: 'PAIRS AND JACKPOTS WITH A WILD PAY X2',
  starchart: 'SYMBOL LEVELS YOU GAIN ARE DOUBLED',
  bell: (t) =>
    t
      .replace(' AND FILL YOUR HIGH ROLLER BAR', ', FILL HIGH ROLLER')
      .replace(' AND FULLY CHARGE YOUR LIGHTNING', ', FULL LIGHTNING')
      .replace(' AND FILL YOUR JACKPOT METER', ', FILL THE METER')
      .replace(/^JACKPOTS PAY X2 AND MAX YOUR VOLUME \(NOT ON THE DROP\)$/, 'JACKPOTS X2 + MAX VOLUME (NOT AT DROP)'),
  phoenix: 'SURVIVE A KILLING HIT AT 1 HP, ONCE A FIGHT',
  overcharge: (t) =>
    t
      .replace(/^YOUR ALL-JACKPOTS SPIN ECHOES FOR 1\/3 OF ITS DAMAGE$/, 'ALL-JACKPOT SPINS ECHO FOR 1/3')
      .replace(/^YOUR (.+) PAYOFF ECHOES FOR 1\/3( OF ITS)? DAMAGE$/, '$1 PAYOFFS ECHO FOR 1/3'),
  sandglass: 'SLOWER ENEMY ABILITIES (NOT WHEEL OR DEALER)',
  tower: 'KEEP 25% OF SHIELD, MAX 10% OF YOUR HP',
  capacitor: '25% OF LEFTOVER SHIELD CHARGES LIGHTNING',
  livewire: 'LIGHTNING DAMAGE +30%. STORMS COST 1 HP',
  encore: 'THE JACKPOT METER KEEPS 30 AFTER IT PAYS',
  coup: (t) => t.replace(' WHILE YOU HAVE MORE HP LEFT THAN THE ENEMY', ' WHILE YOU LEAD ON HP'),
  compound: 'HIGH ROLLER CAPS AT X4',
  meltdown: 'LIGHTNING DAMAGE: +1% PER MISSING HP, TO 50%',
  deckdrum: '+1 CARD DAMAGE PER SPIN THAT PAYS, MAX +5',
  horseshoe: 'PAIRS AND JACKPOTS WITH A LUCKY WILD X3',
  underdog: 'EVERYTHING PAYS X1.5 UNDER HALF HP',
  holywater: 'EACH FIGHT: BLOCKS 1ST ABILITY ON YOUR REELS',
  hotstreak: "JACKPOT: NEXT SPIN'S PAIRS AND JACKPOTS X2",
  pitboss: "ENEMY'S FIRST JACKPOT A FIGHT IS VOID",
  rainmaker: `MAKE IT RAIN COSTS ${RAIN.rainmakerCost} CHIPS, NOT ${RAIN.cost}`,
  bash: 'LEFTOVER SHIELD HITS THE ENEMY',
  turntable: 'AFTER THE DROP, VOLUME FALLS TO 5, NOT 3',
  mixtape: 'A SPIN WITH NO NOTE KEEPS THE VOLUME',
  subwoofer: 'THE DROP ALSO HITS FOR YOUR SHIELD',
  armoredcar: 'HIGH ROLLER: 5 SHIELD COUNTS AS 1 CHIP',
  safedeposit: 'CHIPS ALSO HIT FOR YOUR SHIELD',
  dryspell: 'BUILD-UP GROWS +50% A SPIN, UP TO X4',
  punchcard: 'EVERY 6TH WIN: A LEGENDARY RELIC',
  goldenspin: '1 SPIN IN 10 PAYS X3',
  insurance: 'ONCE A FIGHT, UNDER 25% HP: +100 SHIELD',
  housetax: 'ENEMY JACKPOTS PAY YOU 5 CHIPS',
  regular: 'ENCOUNTER GAMES: 2 MORE PLAYS',
  hitmaker: 'EACH DROP: +60% PER DROP BEFORE IT',
  houseofcards: 'METER PAYOFFS: A WILD ON 2 REELS ALL FIGHT',
  parachute: 'ONCE A FIGHT, PAY 10 CHIPS TO LIVE AT 25%',
  secondline: 'ROW ABOVE PAYS HALF. ENEMIES HIT +15%',
  devilsdue: 'EVERYTHING X1.5. -8% MAX HP PER WIN',
  longgame: 'EVERYTHING -20%, +3% PER FIGHT WON',
  quickening: (t) => t.replace(/^YOUR (.+) STARTS EVERY FIGHT HALF FULL\..*$/, (_, m: string) => `${m.endsWith('METER') ? 'METER' : m} STARTS AT HALF. ENEMIES FASTER`),
  glasscannon: 'EVERYTHING X1.5. NO HEALS BETWEEN FIGHTS',
  crusade: (t) => t.replace(' FOR EVERY FIGHT YOU WIN', ' PER FIGHT WON'),
  highcard: 'JACKPOTS X1.5. PAIRS PAY HALF',
  hypeman: '+1 VOLUME EVERY 2ND SPIN. NOTES PAY HALF',
  openbar: 'MAKE IT RAIN IS FREE. WINS PAY NO CHIPS',
  lean: 'REELS OF 11 SYMBOLS OR FEWER: EACH X1.5',
  steadyhands: '+1 HOLD A FIGHT. HELD JACKPOTS PAY X2',
  pairstreak: 'ATTACK PAIRS IN A ROW: +50% EACH, MAX X2.5',
  sticky: 'SABOTAGED SYMBOL OR REEL: +1 CHIP, MAX 5',
};

/** A card face's short text for a relic (the full rule if it already fits). */
export function shortRelicText(id: RelicId, full: string): string {
  const s = SHORT[id];
  return s === undefined ? full : typeof s === 'string' ? s : s(full);
}

/** The card's rarity frame: relics by their tier, everything else common. */
export function rarityOf(o: DraftOption): 'common' | 'uncommon' | 'legendary' {
  if (o.kind !== 'relic') return 'common';
  if (RELIC_TIER.legendary.includes(o.relic)) return 'legendary';
  if (RELIC_TIER.uncommon.includes(o.relic)) return 'uncommon';
  return 'common';
}

/** A card face: its name, its short text (two lines at most), and the full rule for the detail box. */
export function cardFace(o: DraftOption, run?: RunState): { title: string; text: string; full: string } {
  const { title, text } = describeOption(o, run);
  if (o.kind === 'relic' && RELICS[o.relic]) return { title, text: shortRelicText(o.relic, text), full: text };
  // A Charm card's reel is on its marker: the face starts at the symbol.
  if (o.kind === 'gild') return { title, text: text.replace(/^REEL \d+ /, 'ON '), full: charmCardFull(o, run) };
  return { title, text, full: text };
}

/** Every machine, for checking the short texts. */
export const ALL_CABINETS: CabinetId[] = ['knight', 'midas', 'tesla', 'joker', 'jukebox'];

/** Characters per line on a card face (a three-card draft card at body size). */
export const CARD_COLS = 22;
