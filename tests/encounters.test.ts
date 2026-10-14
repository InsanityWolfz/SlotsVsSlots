import { describe, expect, it } from 'vitest';
import { defaultConfig, type RelicId } from '../src/core/config';
import { BJ, bjState, bjTotal, CLAW, DICE, RACE, RATS, ENCOUNTERS, hiloPot, hiloState, pocketColor, ROULETTE, rouletteMax, SLOT, slotLine, slotRun, SLOT_STRIPS, WHEEL_ORDER } from '../src/core/encounters';
import { Rng } from '../src/core/rng';
import { chooseRoute, createRun, currentStop, encounterChoices, migrateRun, playEncounter } from '../src/core/run';

const base = defaultConfig();
const slot = ENCOUNTERS.slot;
const ctx = (ups: string[] = []) => ({ relics: ['clover', 'battery', 'fang'] as RelicId[], upgrade: () => (ups.push('LEVEL'), 'LEVEL'), charm: () => (ups.push('CHARM'), '2 GOLD CHARMS') });

describe('LUCKY SEVENS', () => {
  it('offers three buy-ins (chips, HP, a relic the house names), then WALK AWAY', () => {
    const run = createRun(base, 3, 'knight');
    run.player.relics = ['drum', 'chainmail'];
    const c = slot.choices(run, new Rng(9));
    expect(c.filter((x) => x.stake)).toHaveLength(3);
    expect(c.at(-1)!.label).toBe('WALK AWAY');
    expect(c[0].stake).toBe(`${SLOT.low.chips} CHIPS`);
    expect(c[2].relic && run.player.relics.includes(c[2].relic)).toBe(true);
    // No relic to stake: HIGH is off.
    run.player.relics = [];
    expect(slot.choices(run, new Rng(9))[2].disabled).toBe(true);
  });

  it('a buy-in takes its stake and plays its pulls; HIGH takes the very relic its card named', () => {
    const run = createRun(base, 4, 'knight');
    run.player.chips = 20;
    const low = slot.play(run, 0, new Rng(1), ctx());
    expect(low.pulls).toHaveLength(SLOT.low.pulls);
    run.player.relics = ['drum', 'chainmail', 'belt'];
    const named = slot.choices(run, new Rng(5))[2].relic;
    const high = slot.play(run, 2, new Rng(5), { ...ctx(), relics: [] });
    expect(high.pulls).toHaveLength(SLOT.high.pulls);
    expect(run.player.relics).not.toContain(named);
  });

  it('is seeded: the same stop plays out the same way', () => {
    const play = () => {
      const run = createRun(base, 6, 'knight');
      run.player.chips = 20;
      return [slot.play(run, 0, new Rng(77), ctx()), run.player.chips];
    };
    expect(play()).toEqual(play());
  });

  it('pays only 3, 4 or 5 in a row from the left reel on the payline (WILDs stand in)', () => {
    expect(slotRun(['chip', 'chip', 'chip', 'seven', 'star'])).toEqual({ sym: 'chip', count: 3 });
    expect(slotRun(['wild', 'seven', 'wild', 'seven', 'heart'])).toEqual({ sym: 'seven', count: 4 });
    expect(slotRun(['chip', 'chip', 'star', 'chip', 'chip']).count).toBe(0);
    expect(slotRun(['star', 'chip', 'chip', 'chip', 'chip']).count).toBe(0);
    expect(slotRun(['wild', 'wild', 'wild', 'wild', 'wild'])).toEqual({ sym: 'seven', count: 5 });
    // The middle row of each reel's stop is the line.
    expect(slotLine([0, 1, 2, 3, 4])).toEqual(SLOT_STRIPS.map((st, r) => st[r]));
  });

  it('pays mostly chips, and roughly what a buy-in costs (a first pass: tune with the new sim)', () => {
    let chips = 0;
    let other = 0;
    let paid = 0;
    let pulls = 0;
    for (let i = 0; i < 1500; i++) {
      const run = createRun(base, i + 1, 'knight');
      run.player.chips = 40;
      run.player.hp = Math.round(run.player.maxHp / 2);
      const ups: string[] = [];
      const c0 = run.player.chips;
      const r0 = run.player.relics.length;
      const res = slot.play(run, 0, new Rng(i * 13 + 1), ctx(ups));
      pulls += res.pulls!.length;
      paid += res.pulls!.filter((p) => p.wins.length).length;
      chips += run.player.chips - c0 + SLOT.low.chips;
      other += (ups.length + run.player.relics.length - r0) * 12;
    }
    const share = chips / (chips + other);
    expect(share).toBeGreaterThan(0.65);
    expect(share).toBeLessThan(0.9);
    const back = (chips + other) / 1500 / SLOT.low.chips;
    // (HP prizes aren't counted here, so this sits a little under the full return.)
    expect(back).toBeGreaterThan(0.75);
    expect(back).toBeLessThan(1.15);
    // Like a real slot: about a third of the pulls pay.
    expect(paid / pulls).toBeGreaterThan(0.2);
    expect(paid / pulls).toBeLessThan(0.4);
  });
});

describe('RED OR BLACK', () => {
  /** A run standing at a RED OR BLACK stop (the first stop of its first route). */
  const atTable = (seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'roulette' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 40;
    return run;
  };

  it('pays the bet again on the colour called; the green zero (and the other colour) takes it', () => {
    for (let seed = 1; seed < 40; seed++) {
      const run = atTable(seed);
      const before = run.player.chips;
      const res = playEncounter(run, 0, 5)!;
      const col = pocketColor(res.pocket!);
      expect(run.player.chips - before).toBe(col === 'red' ? 5 : -5);
    }
    expect(pocketColor(0)).toBe('green');
    expect(WHEEL_ORDER).toHaveLength(37);
  });

  it('allows 3 spins at the stop; walking away (or the last spin) moves on', () => {
    const run = atTable();
    const stop = run.stop;
    expect(playEncounter(run, 1, 2)!.more).toBe(true);
    expect(playEncounter(run, 0, 2)!.more).toBe(true);
    expect(run.stop).toBe(stop);
    expect(playEncounter(run, 0, 2)!.more).toBeFalsy();
    expect(run.stop).toBe(stop + 1);
    const walk = atTable();
    expect(playEncounter(walk, 2)!.good).toBeNull();
    expect(walk.stop).toBe(stop + 1);
  });

  it('a bet is clamped to the table limit and to your chips', () => {
    const run = atTable();
    run.player.chips = 3;
    const before = run.player.chips;
    playEncounter(run, 0, 99);
    expect(Math.abs(run.player.chips - before)).toBe(3);
    expect(rouletteMax({ ...run, player: { ...run.player, chips: 500 } })).toBe(ROULETTE.maxBet);
  });

  it('a quit replays the same spin (the spin count is saved with the run)', () => {
    const run = atTable(7);
    playEncounter(run, 0, 1);
    const saved = JSON.parse(JSON.stringify(run));
    const a = playEncounter(run, 0, 1)!.pocket;
    const b = playEncounter(saved, 1, 1)!.pocket;
    expect(b).toBe(a);
  });
});

describe('HIGHER OR LOWER', () => {
  const atTable = (seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'hilo' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 40;
    return run;
  };

  it('deals for a bet, grows the pot on each right call, and loses it on a wrong one (or a tie)', () => {
    for (let seed = 1; seed < 60; seed++) {
      const run = atTable(seed);
      const dealt = playEncounter(run, 0, 10)!;
      expect(run.player.chips).toBe(30);
      expect(dealt.more).toBe(true);
      const card = hiloState(run)!.card;
      const res = playEncounter(run, card <= 8 ? 0 : 1)!;
      const right = card <= 8 ? res.next! > card : res.next! < card;
      expect(res.good).toBe(right);
      if (right) expect(hiloState(run)!.calls).toBe(1);
      else {
        expect(run.encounterState).toBeUndefined();
        expect(run.player.chips).toBe(30);
      }
    }
  });

  it('cashing out pays the pot and moves on; five right calls cash out by themselves', () => {
    expect(hiloPot(10, 0)).toBe(10);
    expect(hiloPot(10, 2)).toBe(19);
    let cashed = 0;
    for (let seed = 1; seed < 200 && !cashed; seed++) {
      const run = atTable(seed);
      playEncounter(run, 0, 10);
      const c = hiloState(run)!.card;
      const r = playEncounter(run, c <= 8 ? 0 : 1)!;
      if (!r.good) continue;
      const stop = run.stop;
      const out = playEncounter(run, 2)!;
      expect(out.text).toBe(`+${hiloPot(10, 1)} CHIPS`);
      expect(run.player.chips).toBe(30 + hiloPot(10, 1));
      expect(run.stop).toBe(stop + 1);
      cashed++;
    }
    expect(cashed).toBe(1);
  });

  it('played sensibly it is about even (cash out after two right calls)', () => {
    let back = 0;
    const N = 4000;
    for (let seed = 0; seed < N; seed++) {
      const run = atTable(seed);
      run.player.chips = 100;
      playEncounter(run, 0, 10);
      for (let k = 0; k < 6 && hiloState(run); k++) {
        const st = hiloState(run)!;
        playEncounter(run, st.calls >= 2 ? 2 : st.card <= 8 ? 0 : 1);
      }
      back += run.player.chips - 90;
    }
    const ret = back / N / 10;
    expect(ret).toBeGreaterThan(0.85);
    expect(ret).toBeLessThan(1.1);
  });
});

describe('TWENTY-ONE', () => {
  const atTable = (seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'bj' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 40;
    run.player.relics = ['drum', 'chainmail'];
    return run;
  };
  /** Play a visit out: deal (bet 5), hit below 17, stand, until the table lets you go. Returns the finished hands. */
  const playOut = (run: ReturnType<typeof atTable>) => {
    const hands = [];
    for (let guard = 0; guard < 80 && currentStop(run)?.encounter === 'bj'; guard++) {
      const st = bjState(run);
      const res = playEncounter(run, st ? (bjTotal(st.p) < 17 ? 0 : 1) : 0, 5)!;
      if (res.hand) hands.push(res);
    }
    return hands;
  };

  it('totals hands with aces as 11 or 1', () => {
    expect(bjTotal([14, 13])).toBe(21);
    expect(bjTotal([14, 14, 9])).toBe(21);
    expect(bjTotal([14, 9, 5])).toBe(15);
    expect(bjTotal([10, 12, 5])).toBe(25);
  });

  it(`a visit plays ${BJ.hands} hands, each a chip bet: dealt, hit or stood, settled`, () => {
    const run = atTable(3);
    // A push is dealt again: it doesn't use up a hand.
    const hands = playOut(run).filter((h) => h.hand!.outcome !== 'push');
    expect(hands).toHaveLength(BJ.hands);
    expect(hands.map((h) => h.hand!.no)).toEqual(Array.from({ length: BJ.hands }, (_, k) => k + 1));
    expect(run.encounterState).toBeUndefined();
  });

  it('a win pays the bet 1 to 1, a natural 2 to 1, a loss costs it; a tie is a push (bet back, dealt again); the dealer stands on 17', () => {
    const seen = { win: 0, natural: 0, tie: 0 };
    for (let seed = 0; seed < 300; seed++) {
      const run = atTable(seed);
      for (const h of playOut(run)) {
        const me = bjTotal(h.hand!.p);
        const dealer = bjTotal(h.hand!.d);
        if (h.hand!.outcome === 'natural') {
          expect(h.text).toBe(`+${5 * BJ.naturalPays} CHIPS`);
          seen.natural++;
        } else if (h.hand!.outcome === 'win') {
          expect(h.text).toBe('+5 CHIPS');
          expect(dealer > 21 || me > dealer).toBe(true);
          seen.win++;
        } else if (h.hand!.outcome === 'push') {
          expect(h.text).toBe('BET BACK');
          expect(dealer).toBe(me);
          expect(h.more).toBe(true);
          seen.tie++;
        } else {
          expect(h.text).toBe('-5 CHIPS');
          if (h.hand!.outcome === 'lose') expect(dealer).toBeGreaterThanOrEqual(BJ.standOn);
          if (h.hand!.outcome === 'lose') expect(dealer).not.toBe(me);
        }
      }
    }
    expect(seen.win).toBeGreaterThan(0);
    expect(seen.natural).toBeGreaterThan(0);
    expect(seen.tie).toBeGreaterThan(0);
  });

  it('chips add up: 40 in, 3 hands of 5, out with 40 plus the wins minus the losses', () => {
    const run = atTable(9);
    const hands = playOut(run);
    const net = hands.reduce((a, h) => a + Number(h.text.replace(' CHIPS', '')), 0);
    expect(run.player.chips).toBe(40 + net);
  });
});

describe('UNDER OR OVER', () => {
  const atTable = (seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'dice' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 40;
    return run;
  };

  it('UNDER / OVER pay 1 to 1 (a seven gives the bet back); SEVEN pays 4 to 1', () => {
    for (let seed = 0; seed < 80; seed++)
      for (const call of [0, 1, 2]) {
        const run = atTable(seed);
        const res = playEncounter(run, call, 5)!;
        const sum = res.dice![0] + res.dice![1];
        const net = run.player.chips - 40;
        if (call === 1) expect(net).toBe(sum === 7 ? 5 * DICE.sevenPays : -5);
        else if (sum === 7) expect(net).toBe(0);
        else expect(net).toBe((call === 0 ? sum < 7 : sum > 7) ? 5 : -5);
      }
  });

  it('UNDER is about even; SEVEN is the long shot with the house edge', () => {
    const ret = (call: number) => {
      let net = 0;
      for (let seed = 0; seed < 3000; seed++) {
        const run = atTable(seed);
        playEncounter(run, call, 10);
        net += run.player.chips - 40;
      }
      return 1 + net / 3000 / 10;
    };
    expect(ret(0)).toBeGreaterThan(0.9);
    expect(ret(0)).toBeLessThan(1.1);
    expect(ret(1)).toBeLessThan(ret(0));
  });
});

describe('the offers are gone (user, 2026-10-14)', () => {
  it('a saved map with one becomes LUCKY SEVENS, and a debt is forgiven', () => {
    const run = createRun(base, 2, 'knight');
    run.map.routes[0][1] = { kind: 'encounter', encounter: 'shark' };
    (run as unknown as { debt: number }).debt = 30;
    migrateRun(run);
    expect(run.map.routes[0][1].encounter).toBe('slot');
    expect('debt' in run).toBe(false);
    expect(Object.keys(ENCOUNTERS)).not.toContain('blood');
  });
});

describe('RAT RACE, SCRATCH-OFF, CLAW MACHINE (2026-10-14)', () => {
  const at = (id: string, seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: id };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 100;
    return run;
  };

  it('RAT RACE: your rat first pays the bet times its odds; two races a visit', () => {
    let races = 0;
    for (let seed = 0; seed < 60; seed++) {
      const run = at('rats', seed);
      const stop = run.stop;
      for (let guard = 0; guard < 10 && run.stop === stop; guard++) {
        const before = run.player.chips;
        const res = playEncounter(run, 1, 5)!;
        races++;
        const won = res.race!.winner === 1;
        expect(run.player.chips - before).toBe(won ? 5 * (RATS[1].pays - 1) : -5);
      }
    }
    expect(races).toBe(60 * RACE.races);
  });

  it('SCRATCH-OFF: buy, scratch 3 panels; three of a kind is a win, and a loser never shows three alike', () => {
    let wins = 0;
    for (let seed = 0; seed < 200; seed++) {
      const run = at('scratch', seed);
      const res0 = playEncounter(run, 0)!;
      expect(res0.more).toBe(true);
      let last = res0;
      for (const panel of [2, 4, 6]) last = playEncounter(run, panel)!;
      const g = last.scratch!.grid!;
      const shown = [g[2], g[4], g[6]];
      const three = shown.every((x) => x === shown[0]);
      expect(three).toBe(!!last.good);
      if (last.good) wins++;
    }
    expect(wins).toBeGreaterThan(60);
    expect(wins).toBeLessThan(140);
  });

  it('CLAW MACHINE: a held prize leaves the pit; each go costs its price', () => {
    const run = at('claw', 5);
    const before = run.player.chips;
    const res = playEncounter(run, 0)!;
    expect(res.claw!.prize).toBe(0);
    if (res.claw!.held) {
      expect(run.player.chips).toBe(before - CLAW.price + CLAW.chips);
      expect(encounterChoices(run)[0].disabled).toBe(true);
    } else expect(run.player.chips).toBe(before - CLAW.price);
  });
});
