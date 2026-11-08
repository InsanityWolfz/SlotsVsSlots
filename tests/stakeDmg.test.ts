import { describe, expect, it } from 'vitest';
import { STAKES, stakeDmg } from '../src/core/stakes';

/** Enemies hit +5% harder a stake from GREEN (user, 2026-11-08), and each stake's card says its number. */
describe('stake damage ladder', () => {
  it('WHITE and RED none, then +5% a stake from GREEN', () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => Math.round((stakeDmg(s) - 1) * 100))).toEqual([0, 0, 5, 10, 15, 20]);
  });
  it("each stake's rule names its own number", () => {
    for (const s of STAKES) {
      const pct = Math.round((stakeDmg(s.level) - 1) * 100);
      if (pct > 0) expect(s.rule).toContain(`ENEMIES HIT ${pct}% HARDER`);
      else expect(s.rule).not.toContain('HARDER');
    }
  });
});
