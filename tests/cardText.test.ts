import { describe, expect, it } from 'vitest';
import { RELICS, relicText } from '../src/core/relics';
import { charmShortText } from '../src/core/charms';
import type { Enh, RelicId } from '../src/core/config';
import { ACT1_GILDS } from '../src/core/run';
import { ALL_CABINETS, CARD_COLS, cardFace, shortRelicText } from '../src/ui/run/cardText';
import { wrap } from '../src/ui/run/shared';

// The UI kit (user, 2026-10-30): a card says at most two lines at body size. Every card face must fit.
describe('card faces fit two lines', () => {
  it('every relic, on every machine', () => {
    const over: string[] = [];
    for (const id of Object.keys(RELICS) as RelicId[])
      for (const cab of ALL_CABINETS) {
        const t = shortRelicText(id, relicText(id, cab));
        if (wrap(t, CARD_COLS).length > 2) over.push(`${id}/${cab}: ${t}`);
      }
    expect(over).toEqual([]);
  });

  it('every Charm card', () => {
    const over: string[] = [];
    for (const enh of ACT1_GILDS as Enh[])
      for (const n of [1, 2]) {
        const f = cardFace({ kind: 'gild', enh, n, reel: 2, symbol: 'shield' } as never);
        if (wrap(f.text, CARD_COLS).length > 2) over.push(`${enh}: ${f.text} (${charmShortText(enh, 1)})`);
      }
    expect(over).toEqual([]);
  });
});
