import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { betState, newTrack, trackEvent } from '../src/core/bets';
import { Fight } from '../src/core/fight';
import { allInStake, betStakes, betsOpen, clearBet, createRun, fightConfig, finishFight, offerBets, placeBet } from '../src/core/run';

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
    // Across a few fights: a HOT HAND bolds only the long shot (x4, then x5); the safe bet stays x1.5.
    const seen: Record<number, number[]> = { 1: [], 2: [] };
    for (const seed of [99, 7, 21, 55, 300]) {
      for (const streak of [1, 2]) {
        const r2 = createRun(base, seed, 'knight');
        r2.pendingStart = null;
        r2.betStreak = streak;
        const o = offerBets(r2, base);
        seen[streak].push(...o.filter((b) => b.hot).map((b) => b.pay));
        expect(o.filter((b) => b.hot).length).toBeLessThanOrEqual(1);
        expect(o.every((b) => b.hot || b.pay <= 3)).toBe(true);
      }
    }
    expect(seen[1].length).toBeGreaterThan(0);
    expect(seen[1].every((p) => p === 4)).toBe(true);
    expect(seen[2].every((p) => p === 5)).toBe(true);
  });

  it('bet relics: LOADED DICE pays x0.5 more, HIGH LIMIT doubles the stakes, MARKER refunds the first bust in an act', () => {
    const base = defaultConfig();
    const run = createRun(base, 99, 'knight');
    run.pendingStart = null;
    run.player.chips = 60;
    const plain = offerBets(run, base).map((b) => b.pay);
    run.bets = null;
    run.player.relics.push('loaded', 'highlimit', 'marker');
    expect(offerBets(run, base).map((b) => b.pay)).toEqual(plain.map((x) => x + 0.5));
    expect(betStakes(run)).toEqual([4, 10]);
    expect(allInStake(run)).toBe(40);
    // A bet you can't win: land 99 jackpots.
    placeBet(run, 0, 10);
    run.bet = { kind: 'jackpot', target: 99, pay: 2, stake: 10 };
    let fight: Fight;
    let seed = 1;
    do fight = new Fight(fightConfig(run, base), seed++);
    while ((() => { while (!fight.over) fight.step(); return fight.winner !== 'player'; })());
    const before = run.player.chips;
    const rec = finishFight(run, fight);
    expect(rec.bet?.refunded).toBe(true);
    expect(run.player.chips - before - (rec.chips ?? 0)).toBe(10);
  });
});
