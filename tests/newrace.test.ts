import { describe, expect, it } from 'vitest';
import { GUNK, PAYTABLE, Race, RACE, RIVAL_STRIP, YOUR_STRIP, payline, scoreLine, symbolAt } from '../src/race/race';

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

  it('SWORD: never matches a payer; scoreLine lists the swords', () => {
    expect(scoreLine(['sword', 'sword', 'cherry'])).toMatchObject({ tier: 'none', pay: 0, swords: [0, 1] });
    expect(scoreLine(['sword', 'coin', 'coin'])).toMatchObject({ tier: 'pair', pay: PAYTABLE.coin.pair, swords: [0] });
  });

  /** A race on its first spin with your reels set to `line` (held reels stay put; unheld ones are pinned too). */
  const landed = (line: string[], held: number[] = [], seed = 12) => {
    const r = new Race({ seed, holds: 4 });
    const at = (reel: number, s: string) => r.you.reels[reel].indexOf(s as never);
    r.you.stops = line.map((s, i) => at(i, s));
    r.rivalSpin();
    held.forEach((i) => r.toggleHold(i));
    const stops = r.you.stops.slice();
    r.spin();
    r.you.stops = stops;
    return r;
  };

  it('SWORD: a fresh sword pays the EDGE on top of a pair, then doubles it', () => {
    const r = landed(['sword', 'coin', 'coin']);
    const p = r.pay();
    expect(p.pay).toBe(PAYTABLE.coin.pair + RACE.edge);
    expect(p.strikes).toEqual([{ reel: 0, pay: RACE.edge, sharpened: true }]);
    expect(r.edge).toBe(RACE.edge * 2);
  });

  it('SWORD: two fresh swords strike left to right (10 then 20), leaving the EDGE at 40', () => {
    const r = landed(['sword', 'cherry', 'sword']);
    const p = r.pay();
    expect(p.strikes.map((s) => s.pay)).toEqual([RACE.edge, RACE.edge * 2]);
    expect(p.pay).toBe(RACE.edge * 3);
    expect(r.edge).toBe(RACE.edge * 4);
  });

  it('SWORD: a held sword strikes but does not sharpen; a nudged sword does', () => {
    const r = landed(['sword', 'coin', 'bar'], [0]);
    const p = r.pay();
    expect(p.strikes).toEqual([{ reel: 0, pay: RACE.edge, sharpened: false }]);
    expect(r.edge).toBe(RACE.edge);
    // A NUDGE that drops a sword onto the line: fresh.
    const n = new Race({ seed: 13 });
    n.rivalSpin();
    n.spin();
    const strip = n.you.reels[1];
    n.you.stops[1] = (strip.indexOf('sword') + 1) % strip.length; // the sword sits just above the line
    n.you.stops[0] = n.you.reels[0].indexOf('cherry');
    n.you.stops[2] = n.you.reels[2].indexOf('bar');
    expect(n.nudge(1)).toBe(true);
    expect(n.pay().strikes).toEqual([{ reel: 1, pay: RACE.edge, sharpened: true }]);
    expect(n.edge).toBe(RACE.edge * 2);
  });

  it('SWORD: three swords are the jackpot, and the EDGE sharpens', () => {
    const r = landed(['sword', 'sword', 'sword']);
    const p = r.pay();
    expect(p).toMatchObject({ tier: 'triple', symbol: 'sword', pay: RACE.swordJackpot });
    expect(r.edge).toBe(RACE.edge * 2);
  });

  /** A race at the rival's turn of spin `spin`, your standing payline set to `line`. */
  const atRival = (line: string[], spin = GUNK.on[0], seed = 14) => {
    const r = new Race({ seed, holds: 9, nudges: 9 });
    for (let i = 1; i < spin; i++) {
      r.rivalSpin();
      r.spin();
      r.pay();
    }
    const at = (reel: number, s: string) => r.you.reels[reel].indexOf(s as never);
    r.you.stops = line.map((s, i) => at(i, s));
    return r;
  };

  it('GUNK: on its spins, the rival gunks the leftmost cell of your pair (else your best payer, never a sword)', () => {
    const a = atRival(['cherry', 'seven', 'seven']);
    a.rivalSpin();
    expect(a.gunk).toEqual({ reel: 1, cell: a.you.stops[1] });
    const b = atRival(['coin', 'sword', 'bar']);
    b.rivalSpin();
    expect(b.gunk?.reel).toBe(0);
    const c = atRival(['sword', 'sword', 'sword']);
    c.rivalSpin();
    expect(c.gunk).toBeNull();
    // Not on other spins.
    const d = new Race({ seed: 15 });
    d.rivalSpin();
    expect(d.gunk).toBeNull();
  });

  it('GUNK: a held gunked pair still matches but pays half (rounded down); it washes off after your spin', () => {
    const r = atRival(['seven', 'seven', 'cherry']);
    r.rivalSpin();
    r.toggleHold(0);
    r.toggleHold(1);
    const third = r.you.stops[2];
    r.spin();
    r.you.stops[2] = r.you.reels[2].indexOf('cherry'); // pin the spun reel: a pair, not three
    const p = r.pay();
    expect(p.tier).toBe('pair');
    expect(p.pay).toBe(Math.floor(PAYTABLE.seven.pair / 2));
    expect(p.cut).toBe(PAYTABLE.seven.pair - p.pay);
    expect(r.gunk).toBeNull();
    expect(third).toBeGreaterThanOrEqual(0);
  });

  it('GUNK: a gunked cell spun off the line costs nothing; a sword strike is never halved', () => {
    const r = atRival(['coin', 'coin', 'bar']);
    r.rivalSpin();
    const g = r.gunk!;
    r.spin();
    // Another COIN cell on the gunked reel lands: the gunk is off the line.
    const other = r.you.reels[0].findIndex((s, i) => s === 'coin' && i !== g.cell);
    r.you.stops = [other, r.you.reels[1].indexOf('coin'), r.you.reels[2].indexOf('sword')];
    expect(r.gunkOnLine).toBe(false);
    const p = r.pay();
    expect(p.cut).toBe(0);
    expect(p.pay).toBe(PAYTABLE.coin.pair + p.edge);
    expect(p.edge).toBe(r.edge / 2);
  });

  it('is deterministic for a seed', () => {
    expect(plain(10).score).toEqual(plain(10).score);
  });
});
