import { describe, expect, it } from 'vitest';
import { PAYTABLE, Race, RACE, RIVAL_STRIP, YOUR_STRIP, payline, scoreLine, symbolAt } from '../src/race/race';

/** Play a whole race with no tools. */
function plain(seed: number): Race {
  const r = new Race({ seed });
  while (r.phase !== 'over') {
    r.rivalSpin();
    r.spin();
    r.pay();
  }
  return r;
}

describe('the new race (step 2)', () => {
  it('pays pairs and triples from the paytable, the richest match first', () => {
    expect(scoreLine(['seven', 'seven', 'seven']).pay).toBe(PAYTABLE.seven.triple);
    expect(scoreLine(['cherry', 'coin', 'cherry'])).toMatchObject({ tier: 'pair', symbol: 'cherry', reels: [0, 2], pay: PAYTABLE.cherry.pair });
    expect(scoreLine(['cherry', 'coin', 'seven'])).toMatchObject({ tier: 'none', pay: 0 });
    expect(scoreLine(['coin', 'coin', 'bar'], 3).pay).toBe(PAYTABLE.coin.pair * 3);
  });

  it('builds 20-cell strips with the signed-off counts', () => {
    const r = new Race({ seed: 1 });
    const count = (strip: string[], s: string) => strip.filter((x) => x === s).length;
    for (const strip of r.you.reels) for (const [s, n] of Object.entries(YOUR_STRIP)) expect(count(strip, s)).toBe(n);
    for (const strip of r.rival.reels) for (const [s, n] of Object.entries(RIVAL_STRIP)) expect(count(strip, s)).toBe(n);
    expect(r.you.reels[0].length).toBe(20);
  });

  it('the rival spins first each round, you last; both spin RACE.spins times', () => {
    const r = new Race({ seed: 2 });
    expect(r.phase).toBe('rival');
    expect(() => r.spin()).toThrow();
    for (let i = 0; i < RACE.spins; i++) {
      r.rivalSpin();
      expect(r.phase).toBe('hold');
      r.spin();
      expect(r.phase).toBe('landed');
      r.pay();
    }
    expect(r.phase).toBe('over');
    expect(r.log.you.length).toBe(RACE.spins);
    expect(r.log.rival.length).toBe(RACE.spins);
    expect(r.score.you).toBe(r.log.you.reduce((a, p) => a + p.pay, 0));
  });

  it('a tie is yours', () => {
    const r = plain(3);
    r.score = { you: 50, rival: 50 };
    expect(r.won).toBe(true);
    expect(r.need).toBe(0);
  });

  it('HOLD: each held reel costs a HOLD, at most 2 a spin, first spin included; held reels keep their symbols', () => {
    const r = new Race({ seed: 4, holds: 4 });
    r.rivalSpin();
    const before = payline(r.you);
    expect(r.toggleHold(0)).toBe(true);
    expect(r.toggleHold(1)).toBe(true);
    expect(r.toggleHold(2)).toBe(false); // never all 3
    expect(r.toggleHold(1)).toBe(false); // let go
    expect(r.toggleHold(2)).toBe(true);
    r.spin();
    expect(r.holdsLeft).toBe(2);
    expect(symbolAt(r.you, 0)).toBe(before[0]);
    expect(symbolAt(r.you, 2)).toBe(before[2]);
    r.pay();
    expect(r.held).toEqual([false, false, false]);
  });

  it('HOLD: you can only hold as many reels as you have HOLDs', () => {
    const r = new Race({ seed: 5, holds: 1 });
    r.rivalSpin();
    expect(r.toggleHold(0)).toBe(true);
    expect(r.toggleHold(1)).toBe(false);
    r.spin();
    expect(r.holdsLeft).toBe(0);
    r.pay();
    r.rivalSpin();
    expect(r.canHold(0)).toBe(false);
  });

  it('NUDGE: the symbol above drops onto the payline, one a spin, and pay() scores where it stopped', () => {
    const r = new Race({ seed: 6 });
    r.rivalSpin();
    r.spin();
    const above = symbolAt(r.you, 1, 0);
    expect(r.nudge(1)).toBe(true);
    expect(symbolAt(r.you, 1)).toBe(above);
    expect(r.nudge(0)).toBe(false); // one a spin
    expect(r.nudgesLeft).toBe(RACE.nudges - 1);
    const line = payline(r.you);
    expect(r.pay().pay).toBe(scoreLine(line).pay);
  });

  it('NUDGE runs out', () => {
    const r = new Race({ seed: 7, nudges: 1 });
    r.rivalSpin();
    r.spin();
    r.nudge(0);
    r.pay();
    r.rivalSpin();
    r.spin();
    expect(r.canStillNudge).toBe(false);
    expect(r.nudge(0)).toBe(false);
  });

  it('the rival pays times its BET', () => {
    const r = new Race({ seed: 8, bet: 3 });
    const p = r.rivalSpin();
    expect(p.pay).toBe(scoreLine(payline(r.rival)).pay * 3);
  });

  it('records the gap before your last spin', () => {
    const r = plain(9);
    expect(r.lastSpinGap).not.toBeNull();
  });

  it('is deterministic for a seed', () => {
    expect(plain(10).score).toEqual(plain(10).score);
  });
});
