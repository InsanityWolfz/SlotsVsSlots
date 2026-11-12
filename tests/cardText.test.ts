import { describe, expect, it } from 'vitest';
import { RELICS, relicText } from '../src/core/relics';
import { CHARM_SYMBOLS, charmShortText } from '../src/core/charms';
import type { Enh, RelicId } from '../src/core/config';
import { ACT1_GILDS } from '../src/core/run';
import { ALL_CABINETS, CARD_COLS, cardFace, shortRelicText, THREE_LINES } from '../src/ui/run/cardText';
import { wrap } from '../src/ui/run/shared';

// The UI kit (user, 2026-10-30): a card says at most two lines at body size. Every card face must fit.
describe('card faces fit two lines', () => {
  it('every relic, on every machine', () => {
    const over: string[] = [];
    for (const id of Object.keys(RELICS) as RelicId[])
      for (const cab of ALL_CABINETS) {
        const t = shortRelicText(id, relicText(id, cab));
        if (wrap(t, CARD_COLS).length > (THREE_LINES.includes(id) ? 3 : 2)) over.push(`${id}/${cab}: ${t}`);
      }
    expect(over).toEqual([]);
  });

  // A Charm card names its symbol (ON SWORDS: ...), so three Charms' whole sentences run to a third line: KEEN and
  // CHIP on every symbol, GLASS on BANKROLL's CHIP SYMBOLS. Every other Charm card is two lines.
  it('every Charm card, on every symbol it goes on: two lines, three for KEEN, CHIP and GLASS on CHIP SYMBOLS', () => {
    const three: string[] = [];
    for (const enh of ACT1_GILDS as Enh[])
      for (const symbol of CHARM_SYMBOLS[enh])
        for (const n of [1, 2]) {
          const f = cardFace({ kind: 'gild', enh, n, reel: 2, symbol } as never);
          const lines = wrap(f.text, CARD_COLS).length;
          expect(lines, `${enh}: ${f.text} (${charmShortText(enh, 1)})`).toBeLessThanOrEqual(3);
          if (lines > 2) three.push(`${enh}/${symbol}`);
        }
    expect([...new Set(three)].filter((x) => !x.startsWith('keen/') && !x.startsWith('lucre/'))).toEqual(['glass/goldbar']);
  });
});

// Term sheet rule 13 (user, 2026-11-12): a card's face and its full rule say the same thing. The face is the rule's
// own words, in the rule's order, with detail left out: never a rewording.
describe('a relic card face is its full rule with words left out', () => {
  const words = (t: string) => t.replace(/[.,]/g, '').split(' ');
  it('every relic, on every machine', () => {
    const reworded: string[] = [];
    for (const id of Object.keys(RELICS) as RelicId[])
      for (const cab of ALL_CABINETS) {
        const full = relicText(id, cab);
        const fullWords = words(full);
        let at = 0;
        for (const w of words(shortRelicText(id, full))) {
          at = fullWords.indexOf(w, at) + 1;
          if (at === 0) {
            reworded.push(`${id}/${cab}: ${w}`);
            break;
          }
        }
      }
    // BOUNCER's face is the user's own line: FIRST ENEMY SABOTAGE, where its rule says ABILITY THAT SABOTAGES YOUR REELS.
    expect([...new Set(reworded.map((x) => x.replace(/\/\w+:/, ':')))]).toEqual(['holywater: SABOTAGE']);
  });
  it("the user's own lines are word for word", () => {
    expect(shortRelicText('holywater', relicText('holywater', 'knight'))).toBe('FIRST ENEMY SABOTAGE IS BLOCKED EACH FIGHT');
    expect(shortRelicText('bell', relicText('bell', 'jukebox'))).toBe('JACKPOTS X2 AND FILL THE VOLUME');
    expect(shortRelicText('quickening', relicText('quickening', 'tesla'))).toBe('LIGHTNING STARTS HALF CHARGED EACH FIGHT');
    expect(shortRelicText('hotstreak', relicText('hotstreak', 'knight'))).toBe('JACKPOTS MAKE YOUR NEXT SPIN PAY X2');
    expect(shortRelicText('houseofcards', relicText('houseofcards', 'joker'))).toBe('EACH METER PAYOFF GIVES YOUR REELS 2 TEMPORARY WILDS');
  });
  it('most relics have one wording: the face is the whole rule', () => {
    const one = (Object.keys(RELICS) as RelicId[]).filter((id) => ALL_CABINETS.every((cab) => shortRelicText(id, relicText(id, cab)) === relicText(id, cab)));
    expect(one.length).toBeGreaterThanOrEqual(35);
  });
});
