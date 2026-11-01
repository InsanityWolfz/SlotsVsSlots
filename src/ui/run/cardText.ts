import type { RelicId } from '../../core/config';
import type { CabinetId } from '../../core/cabinets';
import { RELICS, RELIC_TIER } from '../../core/relics';
import { describeOption, type DraftOption, type RunState } from '../../core/run';

/**
 * Cards say at most two lines at body size (the UI kit, user 2026-10-30). The rules' full wording stays in the core
 * (relicText, describeOption) and shows in the card's detail box on hover, focus or tap; these are the card faces'
 * short versions, for the texts that run past two lines. A function gets the full text (some vary by machine).
 */
const SHORT: Partial<Record<RelicId, string | ((full: string) => string)>> = {
  mirror: 'ANY 2 MATCHING REELS ARE A PAIR',
  prism: 'WINS THAT USE A WILD PAY X2',
  starchart: 'SYMBOL LEVELS YOU GAIN ARE DOUBLED',
  bell: (t) =>
    t
      .replace(' AND FILL YOUR HIGH ROLLER BAR', ', FILL HIGH ROLLER')
      .replace(' AND FULLY CHARGE YOUR LIGHTNING', ', FULL LIGHTNING')
      .replace(' AND FILL YOUR JACKPOT METER', ', FILL THE METER')
      .replace(' AND MAX YOUR VOLUME (NOT ON THE DROP)', ', MAX VOLUME'),
  phoenix: 'SURVIVE A KILLING HIT ONCE A FIGHT',
  overcharge: (t) =>
    t
      .replace(/^YOUR ALL-JACKPOTS SPIN ECHOES FOR 1\/3 OF ITS DAMAGE$/, 'ALL-JACKPOT SPINS ECHO FOR 1/3')
      .replace(/^YOUR (.+) PAYOFF ECHOES FOR 1\/3( OF ITS)? DAMAGE$/, '$1 PAYOFFS ECHO FOR 1/3'),
  sandglass: 'ENEMY ABILITIES CHARGE A SPIN SLOWER',
  tower: 'KEEP 25% OF YOUR SHIELD EACH SPIN',
  capacitor: 'LEFTOVER SHIELD CHARGES LIGHTNING',
  livewire: 'LIGHTNING DAMAGE +30%. STORMS COST 1 HP',
  encore: 'THE JACKPOT METER KEEPS 30 AFTER IT PAYS',
  coup: (t) => t.replace(' WHILE YOU HAVE MORE HP LEFT THAN THE ENEMY', ' WHILE YOU LEAD ON HP'),
  compound: 'HIGH ROLLER CAPS AT X4',
  meltdown: 'LIGHTNING DAMAGE +1% PER MISSING HP',
  deckdrum: '+1 CARD DAMAGE PER WIN (MAX +5)',
  horseshoe: 'WINS WITH A LUCKY WILD PAY X3',
  underdog: 'EVERYTHING PAYS X1.5 UNDER HALF HP',
  holywater: 'IGNORE THE FIRST SABOTAGE A FIGHT',
  hotstreak: 'AFTER A JACKPOT, NEXT SPIN PAYS X2',
  pitboss: "ENEMY'S FIRST JACKPOT A FIGHT IS VOID",
  rainmaker: 'MAKE IT RAIN COSTS 2 CHIPS',
  bash: 'LEFTOVER SHIELD HITS THE ENEMY',
  turntable: 'AFTER THE DROP, VOLUME FALLS TO 5',
  mixtape: 'A SPIN WITH NO NOTE KEEPS THE VOLUME',
  subwoofer: 'THE DROP: SHIELDS YOU CAN SEE SHIELD YOU',
  armoredcar: 'SHIELD YOU GAIN FILLS HIGH ROLLER',
  safedeposit: 'CHIPS ALSO HIT FOR SHIELD GAINED',
  dryspell: 'EVERY SPIN WITHOUT A PAIR: NEXT WIN +50%',
  punchcard: 'EVERY 6TH WIN: A LEGENDARY RELIC',
  goldenspin: '1 SPIN IN 10 PAYS X3',
  insurance: 'ONCE A FIGHT, UNDER 25% HP: +100 SHIELD',
  housetax: 'ENEMY JACKPOTS PAY YOU 5 CHIPS',
  regular: 'ENCOUNTER GAMES: 2 MORE PLAYS',
  hitmaker: 'EACH DROP HITS 60% MORE THAN THE LAST',
  houseofcards: 'METER PAYOFFS ADD WILDS FOR THE FIGHT',
  parachute: 'PAY 10 CHIPS TO SURVIVE A KILLING HIT',
  secondline: 'ROW ABOVE PAYS HALF. ENEMIES HIT +15%',
  devilsdue: 'EVERYTHING X1.75. -8% MAX HP PER WIN',
  longgame: 'EVERYTHING -20%, +3% PER FIGHT WON',
  quickening: (t) => t.replace(/^YOUR (.+) STARTS EVERY FIGHT HALF FULL\..*$/, (_, m: string) => `${m.endsWith('METER') ? 'METER' : m} STARTS AT HALF. ENEMIES FASTER`),
  glasscannon: 'WINS PAY X1.5. NO HEALING BETWEEN FIGHTS',
  crusade: (t) => t.replace(' FOR EVERY FIGHT YOU WIN', ' PER FIGHT WON'),
  highcard: 'JACKPOTS X1.5. PAIRS PAY HALF',
  hypeman: '+1 VOLUME EVERY 2ND SPIN. NOTES PAY HALF',
  openbar: 'MAKE IT RAIN IS FREE. WINS PAY NO CHIPS',
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
  if (o.kind === 'gild') return { title, text: text.replace(/^REEL \d+ /, 'ON '), full: text };
  return { title, text, full: text };
}

/** Every machine, for checking the short texts. */
export const ALL_CABINETS: CabinetId[] = ['knight', 'midas', 'tesla', 'joker', 'jukebox'];

/** Characters per line on a card face (a three-card draft card at body size). */
export const CARD_COLS = 22;
