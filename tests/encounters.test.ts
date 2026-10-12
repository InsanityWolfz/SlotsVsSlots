import { describe, expect, it } from 'vitest';
import { defaultConfig, type RelicId } from '../src/core/config';
import { BJ, bjState, bjTotal, BLOOD, DICE, ENCOUNTERS, LOAN, PAWN, hiloPot, hiloState, pocketColor, ROULETTE, rouletteMax, SLOT, slotLine, slotRun, SLOT_STRIPS, WHEEL_ORDER } from '../src/core/encounters';
import { Rng } from '../src/core/rng';
import { chooseRoute, createRun, encounterChoices, fightConfig, finishFight, playEncounter, skipToBoss } from '../src/core/run';
import { Fight } from '../src/core/fight';

const base = defaultConfig();
const slot = ENCOUNTERS.slot;
const ctx = (ups: string[] = []) => ({ relics: ['clover', 'battery', 'fang'] as RelicId[], upgrade: () => (ups.push('LEVEL'), 'LEVEL') });

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
  /** Play every hand out, hitting below 17. Returns the results of the finished hands. */
  const playOut = (run: ReturnType<typeof atTable>) => {
    const hands = [];
    for (let guard = 0; guard < 60 && bjState(run); guard++) {
      const res = playEncounter(run, bjTotal(bjState(run)!.p) < 17 ? 0 : 1)!;
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

  it('a buy-in buys hands (more for a bigger one); each hand is dealt, hit or stood, settled', () => {
    for (const [i, n] of [[0, BJ.low.hands], [1, BJ.mid.hands], [2, BJ.high.hands]] as const) {
      const run = atTable(i + 3);
      const first = playEncounter(run, i)!;
      const hands = [...(first.hand ? [first] : []), ...playOut(run)];
      expect(hands).toHaveLength(n);
      expect(hands.map((h) => h.hand!.no)).toEqual(Array.from({ length: n }, (_, k) => k + 1));
      expect(run.encounterState).toBeUndefined();
    }
  });

  it('a hand you win pays an upgrade (a natural 21 two); a tie goes to the dealer; the dealer stands on 17', () => {
    let seen = { win: 0, natural: 0, tie: 0 };
    for (let seed = 0; seed < 300; seed++) {
      const run = atTable(seed);
      const ups: string[] = [];
      const first = playEncounter(run, 2)!;
      for (const h of [...(first.hand ? [first] : []), ...playOut(run)]) {
        const me = bjTotal(h.hand!.p);
        const dealer = bjTotal(h.hand!.d);
        if (h.hand!.outcome === 'natural') {
          expect(h.gains).toHaveLength(2);
          seen.natural++;
        } else if (h.hand!.outcome === 'win') {
          expect(h.gains).toHaveLength(1);
          expect(dealer > 21 || me > dealer).toBe(true);
          seen.win++;
        } else if (h.hand!.outcome === 'lose') {
          expect(dealer).toBeGreaterThanOrEqual(BJ.standOn);
          if (dealer === me) seen.tie++;
        }
      }
      void ups;
    }
    expect(seen.win).toBeGreaterThan(0);
    expect(seen.natural).toBeGreaterThan(0);
    expect(seen.tie).toBeGreaterThan(0);
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

describe('the offers', () => {
  const at = (id: string, seed = 2) => {
    const run = createRun(base, seed, 'knight');
    run.pendingStart = null;
    run.map.routes[0][0] = { kind: 'encounter', encounter: id };
    run.depth = 1;
    run.stop = 1;
    chooseRoute(run, 0);
    run.player.chips = 10;
    run.player.relics = ['drum', 'chainmail', 'belt'];
    return run;
  };
  const win = (run: ReturnType<typeof at>) => {
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    return finishFight(run, f);
  };

  it('THE BLOOD BANK buys HP now, or max HP for good (for more)', () => {
    const a = at('blood');
    const hp = a.player.hp;
    playEncounter(a, 0);
    expect(a.player.hp).toBeLessThan(hp);
    expect(a.player.chips).toBe(10 + BLOOD.nowChips);
    const b = at('blood');
    const max = b.player.maxHp;
    playEncounter(b, 1);
    expect(b.player.maxHp).toBeLessThan(max);
    expect(b.player.chips).toBe(10 + BLOOD.maxChips);
  });

  it('THE PAWN SHOP takes the relic it named: for chips, or for another relic unseen', () => {
    const a = at('pawn');
    const named = encounterChoices(a)[0].relic!;
    playEncounter(a, 0);
    expect(a.player.relics).not.toContain(named);
    expect(a.player.chips).toBe(10 + PAWN.chips);
    const b = at('pawn');
    const named2 = encounterChoices(b)[1].relic!;
    playEncounter(b, 1);
    expect(b.player.relics).not.toContain(named2);
    expect(b.player.relics).toHaveLength(3);
  });

  it("THE LOAN SHARK lends now, takes it back from winnings, and settles at the act's boss (max HP if chips run short)", () => {
    const run = at('shark');
    playEncounter(run, 1);
    expect(run.player.chips).toBe(10 + LOAN.big.lend);
    expect(run.debt).toBe(LOAN.big.owe);
    const owed = run.debt!;
    const rec = win(run);
    expect(rec.debtPaid).toBeGreaterThan(0);
    expect(run.debt).toBe(owed - rec.debtPaid!);
    // At the boss: chips cover what they can; the rest costs max HP.
    run.player.chips = 3;
    const left = run.debt!;
    const max = run.player.maxHp;
    skipToBoss(run);
    const boss = win(run);
    expect(run.debt).toBe(0);
    // Every owed chip was paid in chips or in max HP (2 each).
    expect((boss.debtPaid ?? 0) + (boss.debtHp ?? 0) / LOAN.hpPerChip).toBe(left);
    expect(max - run.player.maxHp).toBe(boss.debtHp ?? 0);
  });
});
