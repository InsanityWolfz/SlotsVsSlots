// Act 1 pacing (2026-11-09, the user's call 2 from the launch QA): the spill cap and the two machines' new numbers.
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { CABINETS } from '../src/core/cabinets';
import { Fight } from '../src/core/fight';
import { TUNE } from '../src/core/enemies';
import { KEYWORDS } from '../src/ui/keywords';

const spilled = (f: Fight) => f.sides.player.reels.reduce((a, r) => a + r.cells.filter((c) => c.slimed).length, 0);
const cells = (f: Fight) => f.sides.player.reels.reduce((a, r) => a + r.cells.length, 0);

describe('the spill cap: never more than a third of your symbols spilled at once', () => {
  it('spill jackpot after spill jackpot stops at a third, and the rest lands nowhere', () => {
    const cfg = defaultConfig();
    cfg.player = { hp: 1e6, strips: reels3({ sword: 6, shield: 6 }) };
    cfg.enemy = { hp: 1e9, strips: reels3({ slime: 12 }) };
    const f = new Fight(cfg, 11);
    const cap = Math.floor(cells(f) * TUNE.spillCap);
    let wasted = 0;
    for (let i = 0; i < 12; i++) {
      // Your spin turns new symbols up (only what shows can be spilled), then their spill jackpot.
      f.next = 'player';
      f.step();
      f.next = 'enemy';
      f.forceNext('enemy', ['slime', 'slime', 'slime']);
      for (const e of f.step().events) if (e.type === 'slime' && e.to === 'player') wasted += e.wasted;
      expect(spilled(f)).toBeLessThanOrEqual(cap);
    }
    expect(spilled(f)).toBe(cap);
    expect(wasted).toBeGreaterThan(0);
  });
  it('the SPILL keyword (the glossary and the BARFLY card back) says so', () => {
    expect(KEYWORDS.find((k) => k.word === 'SPILL')!.text).toContain('NEVER MORE THAN A THIRD OF YOUR SYMBOLS AT ONCE');
  });
});

describe('TESLA and BANKROLL start with more attack (act 1 pacing)', () => {
  it('TESLA: 340 HP, 4 CHARGED bolts on reel 1 and 1 on reel 2; the pitch says 340', () => {
    expect(CABINETS.tesla.hp).toBe(340);
    expect(CABINETS.tesla.gilded).toEqual([
      { reel: 0, symbol: 'bolt', enh: 'charged', n: 4 },
      { reel: 1, symbol: 'bolt', enh: 'charged', n: 1 },
    ]);
    expect(CABINETS.tesla.rule).toContain('340 HP');
  });
  it('BANKROLL: 400 HP, 6 chips and 6 shields a reel (7 / 5 was reverted with free floor rains); the pitch says 400', () => {
    expect(CABINETS.midas.hp).toBe(400);
    for (const s of CABINETS.midas.strips) expect(s).toEqual({ shield: 6, goldbar: 6 });
    expect(CABINETS.midas.rule).toContain('400 HP');
  });
});
