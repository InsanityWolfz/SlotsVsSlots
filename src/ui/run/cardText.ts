import type { RelicId } from '../../core/config';
import type { CabinetId } from '../../core/cabinets';
import { RELICS, RELIC_TIER } from '../../core/relics';
import { type DraftOption, type RunState } from '../../core/run';
import { charmCardFull, describeOption } from '../../core/draft';

/**
 * Cards say at most two lines at body size (the UI kit, user 2026-10-30; a card may run to three where a clear line
 * needs them: THREE_LINES). One wording for each relic (term sheet rule 13, user 2026-11-12): the full rule lives in the
 * core (relicText) and is the card face too whenever it fits. Where it doesn't, the face is the full rule with detail
 * LEFT OUT, never reworded: each entry here lists the words its face drops, in order (tests/cardText.test.ts checks
 * every face is its rule's own words, in the rule's order). The full rule shows in the relic's tip and the COLLECTION.
 */
const LEAVE_OUT: Partial<Record<RelicId, (string | RegExp)[]>> = {
  // (Its example.)
  ticket: [/\. GOLD PAYS .*$/],
  // (JOKER's and THE JUKEBOX's own sentences. THE JUKEBOX's face: JACKPOTS PAY X2 AND FILL THE VOLUME, the user's
  // line with PAY put back, 2026-11-12.)
  bell: [/\. A JACKPOT ON AN ALL JACKPOTS SPIN .*$/, /\. A JACKPOT ON THE DROP .*$/],
  sandglass: [/\. THE WHEEL .*$/],
  tower: [' YOUR LEFTOVER', ' EACH SPIN', ' YOUR'],
  livewire: [' DAMAGE', /LIGHTNING (?=STORMS)/, / EACH$/],
  coup: [' THAN YOU'],
  deckdrum: [' FOR THE REST OF THE FIGHT'],
  // (The user's line, 2026-11-12: FIRST ENEMY SABOTAGE IS BLOCKED EACH FIGHT.)
  holywater: [/^THE /, ' ABILITY THAT', /(?<=SABOTAGE)S YOUR REELS/],
  armoredcar: [' EVERY', ' YOU GAIN ON THE SAME SPIN', /\. MORE CHIPS .*$/],
  safedeposit: [/^ONCE EACH SPIN /, / THAT SPIN$/],
  hitmaker: [' THIS FIGHT'],
  // (The user's line, 2026-11-12: EACH METER PAYOFF GIVES YOUR REELS 2 TEMPORARY WILDS. Three lines.)
  houseofcards: [/\. THEY LAST .*$/],
  parachute: [' WITH 25% HP'],
  secondline: [/^THE /, ' YOUR PAYLINE', ', FOR PAIRS AND JACKPOTS ONLY'],
  devilsdue: [' OF YOUR', / EACH$/],
  longgame: [' WITH NO LIMIT'],
  glasscannon: [/\. BEATING .*$/],
  pairstreak: [' THEN', ' THEN', /\. A SPIN WITHOUT .*$/],
  sticky: [/\. YOU GET .*$/],
};

/** A card face's text for a relic: its full rule, less the detail the face has no room for. */
export function shortRelicText(id: RelicId, full: string): string {
  return (LEAVE_OUT[id] ?? []).reduce((t: string, cut) => t.replace(cut, ''), full);
}

/** The card's rarity frame: relics by their tier, everything else common. */
export function rarityOf(o: DraftOption): 'common' | 'uncommon' | 'legendary' {
  if (o.kind !== 'relic') return 'common';
  if (RELIC_TIER.legendary.includes(o.relic)) return 'legendary';
  if (RELIC_TIER.uncommon.includes(o.relic)) return 'uncommon';
  return 'common';
}

/** A card face: its name, its text (two lines; three for THREE_LINES), and the full rule. */
export function cardFace(o: DraftOption, run?: RunState): { title: string; text: string; full: string } {
  const { title, text } = describeOption(o, run);
  if (o.kind === 'relic' && RELICS[o.relic]) return { title, text: shortRelicText(o.relic, text), full: text };
  // A Charm card's reel is on its marker: the face starts at the symbol.
  if (o.kind === 'gild') return { title, text, full: charmCardFull(o, run) };
  return { title, text, full: text };
}

/** Every machine, for checking the short texts. */
export const ALL_CABINETS: CabinetId[] = ['knight', 'midas', 'tesla', 'joker', 'jukebox'];

/** The card faces allowed a third line (the card draws three lines tighter). */
// (DECK DRUM and SAFE DEPOSIT, 2026-11-12: their two-line faces could not be understood. A cold reader asked what
// 1 CARD DAMAGE was and what the shield was added to.)
export const THREE_LINES: RelicId[] = ['houseofcards', 'meltdown', 'glasscannon', 'hypeman', 'deckdrum', 'safedeposit'];

/** Characters per line on a card face (a three-card draft card at body size). */
export const CARD_COLS = 22;
