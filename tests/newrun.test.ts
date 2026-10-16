import { describe, expect, it } from 'vitest';
import { PAYTABLE, Race, RACE, payline, scoreLine } from '../src/race/race';
import { Run, RUN } from '../src/race/run';

/** A finished race with the scores forced (won: you >= rival). */
function decided(run: Run, won: boolean): Race {
  const r = run.newRace();
  r.score = won ? { you: 100, rival: 50 } : { you: 10, rival: 50 };
  return r;
}

describe('the run (step 3)', () => {
  it('climbs 9 races in 3 stops of race, race, boss, with the signed-off BETs', () => {
    const run = new Run(1);
    expect(Run.races).toBe(9);
    expect(run.bet).toBe(RUN.bets[0][0]);
    expect(run.bossBet).toBe(RUN.bets[0][2]);
    const bosses: boolean[] = [];
    while (!run.over) {
      bosses.push(run.isBoss);
      run.finish(decided(run, true));
      if (run.offer) run.pick(run.offer[0]);
    }
    expect(run.won).toBe(true);
    expect(bosses).toEqual([false, false, true, false, false, true, false, false, true]);
  });

  it('a win offers 3 different X2 cards; a pick doubles that symbol, and picks stack', () => {
    const run = new Run(2);
    run.finish(decided(run, true));
    expect(run.offer).toHaveLength(RUN.offer);
    expect(new Set(run.offer).size).toBe(RUN.offer);
    const s = run.offer![0];
    run.pick(s);
    expect(run.mult(s)).toBe(2);
    expect(run.offer).toBeNull();
    run.offer = [s, 'cherry', 'bar'];
    run.pick(s);
    expect(run.mult(s)).toBe(4);
  });

  it('a lost race costs a credit and its prize; a lost boss is replayed; no credits is GAME OVER', () => {
    const run = new Run(3);
    run.finish(decided(run, false));
    expect(run.credits).toBe(RUN.credits - 1);
    expect(run.offer).toBeNull();
    expect(run.index).toBe(1);
    run.finish(decided(run, true));
    run.offer = null;
    expect(run.isBoss).toBe(true);
    run.finish(decided(run, false));
    expect(run.replay).toBe(true);
    expect(run.index).toBe(2);
    run.finish(decided(run, false));
    expect(run.over).toBe(true);
    expect(run.won).toBe(false);
  });

  it('a race uses the run BET and your MULTs (pays and the SWORD EDGE)', () => {
    const run = new Run(4);
    run.mults = { coin: 4, sword: 2 };
    const r = run.newRace();
    expect(r.bet).toBe(RUN.bets[0][0]);
    expect(r.edge).toBe(RACE.edge * 2);
    const at = (reel: number, s: string) => r.you.reels[reel].indexOf(s as never);
    r.rivalSpin();
    r.spin();
    r.you.stops = [at(0, 'coin'), at(1, 'coin'), at(2, 'cherry')];
    expect(r.pay().pay).toBe(PAYTABLE.coin.pair * 4);
  });

  it('the rival pays its BET, rounded down', () => {
    const r = new Race({ seed: 5, bet: 1.5 });
    const p = r.rivalSpin();
    expect(p.pay).toBe(scoreLine(payline(r.rival), 1.5).pay);
    expect(Number.isInteger(p.pay)).toBe(true);
  });
});
