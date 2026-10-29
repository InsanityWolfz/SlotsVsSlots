import { describe, expect, it } from 'vitest';
import { defaultConfig, type RelicId } from '../src/core/config';
import { BJ, bjState, bjTotal, CLAW, ENCOUNTERS, SLOT, slotLine, slotRun, SLOT_STRIPS } from '../src/core/encounters';
import { Rng } from '../src/core/rng';
import { chooseRoute, createRun, currentStop, encounterChoices, migrateRun, playEncounter } from '../src/core/run';

const base = defaultConfig();
const slot = ENCOUNTERS.slot;
const ctx = (ups: string[] = []) => ({ relics: ['bandage', 'hotstreak', 'fang'] as RelicId[], upgrade: () => (ups.push('LEVEL'), 'LEVEL'), charm: () => (ups.push('CHARM'), '2 GOLD CHARMS') });

describe('LUCKY SEVENS', () => {
  it('offers three buy-ins (chips, HP, a relic the house names), then WALK AWAY', () => {
    const run = createRun(base, 3, 'knight');
    run.player.relics = ['greatsword', 'tower'];
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
    run.player.relics = ['greatsword', 'tower', 'coup'];
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

describe('TWENTY-ONE', () => {
  const atTable = (seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'bj' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 40;
    run.player.relics = ['greatsword', 'tower'];
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

describe('CLAW MACHINE (2026-10-14)', () => {
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

describe('the coin-flip games are gone (user, 2026-10-15)', () => {
  it('RED OR BLACK, HIGHER OR LOWER and UNDER OR OVER are out of the pool; a saved one plays as LUCKY SEVENS', () => {
    for (const id of ['roulette', 'hilo', 'dice']) expect(ENCOUNTERS[id]).toBeUndefined();
    expect(Object.keys(ENCOUNTERS).sort()).toEqual(['bj', 'claw', 'slot']);
  });
});

describe('v1.0 scope: RAT RACE and SCRATCH-OFF go to after launch (user, 2026-10-29)', () => {
  it('they are out of the pool, and a saved stop of either plays as LUCKY SEVENS', () => {
    for (const id of ['rats', 'scratch']) {
      expect(ENCOUNTERS[id]).toBeUndefined();
      const run = createRun(base, 4, 'knight');
      run.map.routes[0][1] = { kind: 'encounter', encounter: id };
      migrateRun(run);
      expect(run.map.routes[0][1].encounter).toBe('slot');
    }
  });
});
