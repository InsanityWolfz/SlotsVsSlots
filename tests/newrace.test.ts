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

  it('builds strips with the signed-off counts (KNIGHT: 20 payers + 2 SWORDs)', () => {
    const r = new Race({ seed: 1 });
    const count = (strip: string[], s: string) => strip.filter((x) => x === s).length;
    for (const strip of r.you.reels) for (const [s, n] of Object.entries(YOUR_STRIP)) expect(count(strip, s)).toBe(n);
    for (const strip of r.rival.reels) for (const [s, n] of Object.entries(RIVAL_STRIP)) expect(count(strip, s)).toBe(n);
    expect(r.you.reels[0].length).toBe(22);
    expect(r.rival.reels[0].length).toBe(20);
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

  it('SWORD: never pays or matches; each on the line is +1 SHARP from the next paying spin on', () => {
    expect(scoreLine(['sword', 'sword', 'cherry'])).toMatchObject({ tier: 'none', pay: 0, swords: [0, 1] });
    expect(scoreLine(['sword', 'coin', 'coin'])).toMatchObject({ tier: 'pair', pay: PAYTABLE.coin.pair, swords: [0] });
    // SHARP adds to a paying line, never to a dead one.
    expect(scoreLine(['cherry', 'cherry', 'bar'], 1, 2)).toMatchObject({ pay: PAYTABLE.cherry.pair + 2 * RACE.sharpPay, sharp: 2 * RACE.sharpPay });
    expect(scoreLine(['cherry', 'coin', 'bar'], 1, 2)).toMatchObject({ pay: 0, sharp: 0 });
  });

  it('SWORD: the race counts SHARP after the spin pays, and a held sword sharpens again', () => {
    const r = new Race({ seed: 11, holds: 4 });
    // Put a sword on reel 0's payline and a coin pair on reels 1 and 2.
    const at = (reel: number, s: string) => r.you.reels[reel].indexOf(s as never);
    r.you.stops = [at(0, 'sword'), at(1, 'coin'), at(2, 'coin')];
    r.rivalSpin();
    r.toggleHold(0);
    r.toggleHold(1);
    r.toggleHold(2); // (never all 3)
    r.spin();
    expect(symbolAt(r.you, 0)).toBe('sword');
    // Hold reels 0 and 1 kept the sword and a coin; reel 2 spun.
    const p1 = r.pay();
    expect(p1.sharp).toBe(0); // this spin's sword sharpens after it pays
    expect(p1.swords).toContain(0);
    expect(r.sharp).toBe(p1.swords.length);
    const before = r.sharp;
    r.rivalSpin();
    r.toggleHold(0);
    r.spin();
    const line = payline(r.you);
    const p2 = r.pay();
    expect(p2.swords).toContain(0);
    expect(r.sharp).toBe(before + p2.swords.length);
    expect(p2.pay).toBe(scoreLine(line, 1, before).pay);
  });

  it('is deterministic for a seed', () => {
    expect(plain(10).score).toEqual(plain(10).score);
  });
});
