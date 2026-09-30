import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { betState, newTrack, trackEvent } from '../src/core/bets';
import { Fight } from '../src/core/fight';
import { allInStake, betsOpen, clearBet, createRun, fightConfig, finishFight, offerBets, placeBet } from '../src/core/run';

describe('SIDE BETS', () => {
  it('each kind settles on its own condition', () => {
    const t = newTrack();
    expect(betState({ kind: 'quick', target: 3, pay: 2 }, t, false)).toBe('live');
    t.spins = 4;
    expect(betState({ kind: 'quick', target: 3, pay: 2 }, t, true)).toBe('lost');
    t.lost = 20;
    expect(betState({ kind: 'clean', target: 20, pay: 2 }, t, true)).toBe('won');
    expect(betState({ kind: 'clean', target: 10, pay: 2 }, t, false)).toBe('lost');
    t.jackpots = 2;
    expect(betState({ kind: 'jackpot', target: 2, pay: 3 }, t, false)).toBe('won');
    expect(betState({ kind: 'big', target: 100, pay: 2 }, t, true)).toBe('lost');
    expect(betState({ kind: 'early', target: 0, pay: 3 }, t, true)).toBe('won');
    expect(betState({ kind: 'survive', target: 0, pay: 2 }, t, false)).toBe('live');
    t.finalHand = true;
    t.allIns = 1;
    expect(betState({ kind: 'early', target: 0, pay: 3 }, t, false)).toBe('lost');
    expect(betState({ kind: 'survive', target: 0, pay: 2 }, t, false)).toBe('won');
  });

  it('the engine tracks spins, jackpots and your best turn', () => {
    const t = newTrack();
    const f = new Fight(defaultConfig(), 5);
    while (!f.over) for (const e of f.step().events) trackEvent(t, e);
    expect(f.betTrack).toEqual(t);
    expect(t.spins).toBeGreaterThan(0);
    expect(t.best).toBeGreaterThan(0);
  });

  it('the table offers 2 bets before a regular fight (the same ones every time), none before a boss', () => {
    const base = defaultConfig();
    const run = createRun(base, 99, 'knight');
    run.pendingStart = null;
    expect(betsOpen(run)).toBe(true);
    const a = offerBets(run, base);
    expect(a.length).toBe(2);
    run.bets = null;
    expect(offerBets(run, base)).toEqual(a);
    const boss = createRun(base, 99, 'knight');
    boss.depth = boss.enemies.length - 1;
    expect(betsOpen(boss)).toBe(false);
  });

  it('a stake comes off your chips, can be taken back, and pays stake x pay when it comes in', () => {
    const base = defaultConfig();
    const run = createRun(base, 99, 'knight');
    run.pendingStart = null;
    run.player.chips = 20;
    offerBets(run, base);
    expect(placeBet(run, 0, 6)).toBe(true);
    expect(run.player.chips).toBe(14);
    clearBet(run);
    expect(run.player.chips).toBe(20);
    expect(placeBet(run, 0, 30)).toBe(false);
    // A bet you can't lose: win by your 999th spin.
    placeBet(run, 0, 6);
    run.bet = { kind: 'quick', target: 999, pay: 2, stake: 6 };
    let fight: Fight;
    let seed = 1;
    do fight = new Fight(fightConfig(run, base), seed++);
    while ((() => { while (!fight.over) fight.step(); return fight.winner !== 'player'; })());
    const before = run.player.chips;
    const rec = finishFight(run, fight);
    expect(rec.bet?.won).toBe(true);
    expect(run.player.chips - before - (rec.chips ?? 0)).toBe(12);
    expect(run.bet).toBeNull();
  });

  it('ALL IN stakes what you hold, capped at 20; HOT HAND pays x3 then x4 on a streak', () => {
    const base = defaultConfig();
    const run = createRun(base, 99, 'knight');
    run.pendingStart = null;
    run.player.chips = 7;
    expect(allInStake(run)).toBe(7);
    run.player.chips = 40;
    expect(allInStake(run)).toBe(20);
    expect(offerBets(run, base).every((b) => b.pay <= 3)).toBe(true);
    run.betStreak = 1;
    expect(offerBets(run, base).every((b) => b.pay === 3)).toBe(true);
    run.betStreak = 2;
    expect(offerBets(run, base).every((b) => b.pay === 4)).toBe(true);
  });
});
