import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { BJ, bjState, bjTotal, CLAW, ENCOUNTERS, HILO, hiloPot, hiloState } from '../src/core/encounters';
import { chooseRoute, createRun, currentStop, encounterChoices, migrateRun, playEncounter } from '../src/core/run';

const base = defaultConfig();

describe('HIGHER OR LOWER (back, user 2026-10-29)', () => {
  const at = (seed = 2, chips = 40) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'hilo' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = chips;
    run.player.relics = [];
    return run;
  };
  /** Still at the table (the next stop can be another HIGHER OR LOWER). */
  const here = (run: ReturnType<typeof at>) => run.stop === 1 && run.act === 1;
  /** Call the likelier side (HIGHER under an 8). */
  const call = (card: number) => (card < 8 ? 0 : 1);

  it('deals for a chip bet (up to the table limit): a card up; CASH OUT is off until a right call', () => {
    const run = at();
    expect(encounterChoices(run).map((c) => c.label)).toEqual(['DEAL', 'WALK AWAY']);
    playEncounter(run, 0, 99);
    const st = hiloState(run)!;
    expect(st.bet).toBe(HILO.maxBet);
    expect(run.player.chips).toBe(40 - HILO.maxBet);
    expect(st.card).toBeGreaterThanOrEqual(2);
    expect(st.card).toBeLessThanOrEqual(14);
    const c = encounterChoices(run);
    expect(c.map((x) => x.label)).toEqual(['HIGHER', 'LOWER', 'CASH OUT']);
    expect(c[2].disabled).toBe(true);
    // Nothing beats an ace, nothing goes under a 2.
    expect(c[0].disabled).toBe(st.card === 14);
    expect(c[1].disabled).toBe(st.card === 2);
  });

  it('WALK AWAY leaves at once; no chips, no deal', () => {
    const run = at();
    const res = playEncounter(run, 1)!;
    expect(res.title).toBe('WALKED AWAY');
    expect(here(run)).toBe(false);
    expect(run.player.chips).toBe(40);
  });

  it('a right call grows the pot x1.35, a wrong one loses it, the same card is a push; one game a visit', () => {
    const seen = { right: 0, wrong: 0, push: 0 };
    for (let seed = 0; seed < 200; seed++) {
      const run = at(seed);
      playEncounter(run, 0, 10);
      for (let guard = 0; guard < 40 && here(run); guard++) {
        const st = hiloState(run)!;
        const res = playEncounter(run, call(st.card))!;
        expect(res.card).toBe(st.card);
        if (res.next === st.card) {
          expect(res.title).toBe('SAME CARD: PUSH');
          expect(hiloState(run)).toMatchObject({ pot: st.pot, right: st.right, bet: 10 });
          seen.push++;
        } else if (res.good) {
          expect(call(st.card) === 0 ? res.next! > st.card : res.next! < st.card).toBe(true);
          expect(res.pot).toBe(hiloPot(10, st.right + 1));
          if (st.right + 1 < HILO.calls) expect(hiloState(run)).toMatchObject({ card: res.next, right: st.right + 1, pot: res.pot });
          seen.right++;
        } else {
          expect(res.title).toBe('WRONG');
          expect(res.text).toBe('-10 CHIPS');
          // One game a visit: a lost game moves you on.
          expect(here(run)).toBe(false);
          expect(run.player.chips).toBe(30);
          seen.wrong++;
        }
      }
      expect(here(run)).toBe(false);
    }
    expect(seen.right).toBeGreaterThan(0);
    expect(seen.wrong).toBeGreaterThan(0);
    expect(seen.push).toBeGreaterThan(0);
    expect([1, 2, 3, 6].map((k) => hiloPot(10, k))).toEqual([13, 18, 24, 60]);
    // A 1-chip bet still grows.
    expect(hiloPot(1, 1)).toBe(2);
  });

  it('CASH OUT after a right call pays the pot; the 6th right call pays it out by itself', () => {
    let cashed = 0;
    let topped = 0;
    for (let seed = 0; seed < 400; seed++) {
      const run = at(seed);
      playEncounter(run, 0, 5);
      // Cash out at 2 right calls on even seeds; ride it out on odd ones.
      for (let guard = 0; guard < 40 && here(run); guard++) {
        const st = hiloState(run)!;
        if (seed % 2 === 0 && st.right === 2) {
          const res = playEncounter(run, 2)!;
          expect(res.text).toBe(`+${hiloPot(5, 2)} CHIPS`);
          expect(run.player.chips).toBe(35 + hiloPot(5, 2));
          cashed++;
        } else {
          const res = playEncounter(run, call(st.card))!;
          if (res.title === `${HILO.calls} RIGHT!`) {
            expect(run.player.chips).toBe(35 + hiloPot(5, HILO.calls));
            topped++;
          }
        }
      }
      expect(here(run)).toBe(false);
      expect(run.encounterState).toBeUndefined();
    }
    expect(cashed).toBeGreaterThan(0);
    expect(topped).toBeGreaterThan(0);
  });

  it('REGULAR: two more games a visit', () => {
    const run = at(3, 200);
    run.player.relics = ['regular'];
    let deals = 0;
    for (let guard = 0; guard < 80 && here(run); guard++) {
      const st = hiloState(run);
      if (!st) deals++;
      playEncounter(run, st ? (st.right >= 1 ? 2 : call(st.card)) : 0, 5);
    }
    expect(deals).toBe(HILO.games + 2);
  });

  it('is seeded: the same stop deals and turns the same cards', () => {
    const play = () => {
      const run = at(6);
      const out = [playEncounter(run, 0, 5)];
      for (let guard = 0; guard < 40 && here(run); guard++) out.push(playEncounter(run, call(hiloState(run)!.card)));
      return [out, run.player.chips];
    };
    expect(play()).toEqual(play());
  });

  it('a game in play is saved with the run: a quit resumes it, and the next card is the same', () => {
    const run = at(8);
    playEncounter(run, 0, 5);
    const saved = JSON.parse(JSON.stringify(run));
    const st = hiloState(run)!;
    const a = playEncounter(run, call(st.card))!;
    const b = playEncounter(migrateRun(saved), call(st.card))!;
    expect(b.next).toBe(a.next);
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
  it('a saved map with one becomes HIGHER OR LOWER, and a debt is forgiven', () => {
    const run = createRun(base, 2, 'knight');
    run.map.routes[0][1] = { kind: 'encounter', encounter: 'shark' };
    (run as unknown as { debt: number }).debt = 30;
    migrateRun(run);
    expect(run.map.routes[0][1].encounter).toBe('hilo');
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
  it('RED OR BLACK and UNDER OR OVER are out of the pool (HIGHER OR LOWER came back, 2026-10-29)', () => {
    for (const id of ['roulette', 'dice']) expect(ENCOUNTERS[id]).toBeUndefined();
  });
});

describe('v1.0 scope: TWENTY-ONE, the CLAW and HIGHER OR LOWER (user, 2026-10-29)', () => {
  it('are the pool; a saved stop of a game that went (LUCKY SEVENS, RAT RACE, SCRATCH-OFF, ...) plays as HIGHER OR LOWER', () => {
    expect(Object.keys(ENCOUNTERS).sort()).toEqual(['bj', 'claw', 'hilo']);
    for (const id of ['slot', 'rats', 'scratch', 'roulette', 'dice', 'blood']) {
      expect(ENCOUNTERS[id]).toBeUndefined();
      const run = createRun(base, 4, 'knight');
      run.map.routes[0][1] = { kind: 'encounter', encounter: id };
      migrateRun(run);
      expect(run.map.routes[0][1].encounter).toBe('hilo');
    }
  });

  it('a game of one in progress starts over at the new table', () => {
    const run = createRun(base, 4, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: 'scratch' };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.encounterState = { ticket: [1, 2, 3], scratched: [0] };
    run.encounterPlays = 1;
    migrateRun(run);
    expect(currentStop(run)?.encounter).toBe('hilo');
    expect(run.encounterState).toBeUndefined();
    expect(run.encounterPlays).toBe(0);
    expect(encounterChoices(run).map((c) => c.label)).toEqual(['DEAL', 'WALK AWAY']);
  });
});
