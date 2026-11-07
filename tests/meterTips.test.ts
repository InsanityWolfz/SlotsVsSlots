import { describe, expect, it } from 'vitest';
import { CABINET_ORDER, CABINETS } from '../src/core/cabinets';
import { sanitizePrefs } from '../src/saves';
import { METER_TIPS } from '../src/ui/coach';

describe('meter callouts (demo playtest 2026-11-07)', () => {
  it('every Slot Machine with a meter has one, KNIGHT none', () => {
    for (const id of CABINET_ORDER) expect(!!METER_TIPS[id]).toBe(!!CABINETS[id].meter);
  });
  it('prefs remember which machines were explained, cleaned on load', () => {
    expect(sanitizePrefs({}, true).metersExplained).toEqual([]);
    expect(sanitizePrefs({ metersExplained: ['tesla', 'nope', 3] }, true).metersExplained).toEqual(['tesla']);
    expect(sanitizePrefs({ metersExplained: 'tesla' }, true).metersExplained).toEqual([]);
  });
});
