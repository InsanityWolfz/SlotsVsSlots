/**
 * LAUNCH AUDIT (2026-11-01): every Charm does what its player-facing text says.
 *
 * Each claim in a Charm's full rule (charmRuleText), its card face (charmShortText via describeOption / cardFace) and its
 * GOLDEN TICKET step gets a behaviour test that forces the exact situation and checks the exact number. A claim the code
 * does NOT keep was fixed (2026-11-01); a question still open for the user is an `it.skip('OPEN CALL: ...')`.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type Enh, type Gild, type RelicId, type StripCounts, type SymbolId } from '../src/core/config';
import { CABINETS, type CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { CHARM_SYMBOLS, CHARM_VALUE, GLASS_BREAK, LUCRE_CHIPS, TESLA_STRIKE, blazePct, charmLevel, charmRuleText, charmShortText, charmValue } from '../src/core/charms';
import { RELICS } from '../src/core/relics';
import { charmOptions, createRun, describeOption, fightConfig, finishFight, gildsFor, interestOn, type DraftOption, type RunState } from '../src/core/run';
import type { LineScore, ScoreGroup } from '../src/core/scoring';
import { cardFace } from '../src/ui/run/cardText';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

const ALL: Enh[] = ['gold', 'keen', 'charged', 'vamp', 'lucky', 'blaze', 'spiked', 'lucre', 'trick', 'echo', 'glass'];
const MACHINES: CabinetId[] = ['knight', 'midas', 'tesla', 'joker', 'jukebox'];

const KNIGHT = () => reels3({ sword: 6, shield: 6 });
const TESLA = () => reels3({ shield: 6, bolt: 6 });
const JOKER = () => reels3({ ace: 6, shield: 6 });
const JUKEBOX = () => reels3({ note: 6, shield: 6 });
/** Every cell of `symbol` on `reel` carries the charm (n = the whole reel's count), so a forced stop always lands on it. */
const on = (reel: number, symbol: SymbolId, enh: Enh, n = 6): Gild => ({ reel, symbol, enh, n });

interface Setup {
  strips: StripCounts[];
  gilded?: Gild[];
  relics?: RelicId[];
  seed?: number;
}

/** A fight on `cab` with exactly these strips, charms and relics, against a tall dummy (the player spins first). */
function make(cab: CabinetId, s: Setup): Fight {
  const c = fightConfig(createRun(base, 1, cab), base);
  c.enemy = { hp: 99999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.strips = s.strips.map((x) => ({ ...x }));
  c.player.gilded = (s.gilded ?? []).map((g) => ({ ...g }));
  c.relics = s.relics ?? [];
  return new Fight(c, s.seed ?? 7);
}

function spin(f: Fight, line: SymbolId[]): { events: CombatEvent[]; score: LineScore; luckyWilds: number[] } {
  f.forceNext('player', line);
  const { events } = f.step();
  const sp = ofType(events, 'spin').find((e) => e.side === 'player')!;
  return { events, score: sp.score, luckyWilds: sp.luckyWilds ?? [] };
}

/** The group of `symbol` that covers `reel`. */
const group = (score: LineScore, symbol: SymbolId, reel = 0): ScoreGroup => score.groups.find((g) => g.symbol === symbol && g.reels.includes(reel))!;

/** One forced spin's group on `reel`. */
function groupAfter(cab: CabinetId, s: Setup, line: SymbolId[], symbol: SymbolId, reel = 0): ScoreGroup {
  return group(spin(make(cab, s), line).score, symbol, reel);
}

const SSS: SymbolId[] = ['sword', 'sword', 'sword'];
const BBB: SymbolId[] = ['bolt', 'bolt', 'bolt'];

/** A run of this machine holding the GOLDEN TICKET (or not). */
function runOf(cab: CabinetId, ticket = false): RunState {
  const run = createRun(base, 3, cab);
  if (ticket) run.player.relics.push('ticket');
  return run;
}

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: where each Charm is offered (draft, Cashier-free; CLAW uses the same charmOptions)', () => {
  const expected: Record<CabinetId, Enh[]> = {
    knight: ['gold', 'keen', 'vamp', 'lucre', 'glass'],
    midas: ['gold', 'lucre', 'glass'],
    tesla: ['gold', 'charged', 'lucre', 'lucky', 'blaze', 'glass'],
    joker: ['gold', 'keen', 'vamp', 'lucre', 'trick', 'lucky', 'glass'],
    jukebox: ['gold', 'keen', 'vamp', 'lucre', 'lucky', 'echo', 'glass'],
  };
  for (const cab of MACHINES)
    it(`${cab}: offers exactly ${expected[cab].join(', ')}`, () => {
      expect([...gildsFor(createRun(base, 3, cab))].sort()).toEqual([...expected[cab]].sort());
    });

  it('machine locks: CHARGED/BLAZE TESLA only, TRICK JOKER only, ECHO JUKEBOX only, LUCKY never on KNIGHT or CASSIDY', () => {
    for (const cab of MACHINES) {
      const g = gildsFor(createRun(base, 3, cab));
      expect(g.includes('charged')).toBe(cab === 'tesla');
      expect(g.includes('blaze')).toBe(cab === 'tesla');
      expect(g.includes('trick')).toBe(cab === 'joker');
      expect(g.includes('echo')).toBe(cab === 'jukebox');
      expect(g.includes('lucky')).toBe(cab === 'tesla' || cab === 'joker' || cab === 'jukebox');
    }
  });

  it('BULWARK (spiked) is never offered on any machine (retired; its KNIGHT_ONLY lock is dead code)', () => {
    for (const cab of MACHINES) expect(gildsFor(createRun(base, 3, cab))).not.toContain('spiked');
  });

  it('every offered card puts the Charm on a symbol where the engine reads it', () => {
    // Where each Charm DOES something in fight.ts / fightScore.ts.
    const works: Record<Enh, SymbolId[]> = {
      gold: ['sword', 'ace', 'goldbar', 'shield', 'bolt', 'note'],
      glass: ['sword', 'ace', 'goldbar', 'shield', 'bolt', 'note'],
      lucre: ['sword', 'ace', 'goldbar', 'shield', 'bolt', 'note'],
      lucky: ['sword', 'ace', 'shield', 'bolt', 'note'],
      keen: ['sword', 'ace', 'note'], // BLADES
      vamp: ['sword', 'ace', 'note', 'shield', 'bolt', 'goldbar'],
      charged: ['bolt'],
      blaze: ['bolt'],
      spiked: ['shield'],
      trick: ['sword', 'ace', 'shield'],
      echo: ['note'],
    };
    for (const cab of MACHINES) {
      const run = createRun(base, 3, cab);
      for (const o of charmOptions(run, 2)) {
        if (o.kind !== 'gild') continue;
        expect(works[o.enh], `${cab} ${o.enh} on ${o.symbol}`).toContain(o.symbol);
        expect(CABINETS[cab].symbols, `${cab} ${o.enh} on ${o.symbol}`).toContain(o.symbol);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: GOLD "X2 TO ITS GROUP (GOLD IN A GROUP ADDS UP)" / card "X2 PAY"', () => {
  const plain = groupAfter('knight', { strips: KNIGHT() }, SSS, 'sword');

  it('X2: the same forced jackpot pays exactly twice as much with one GOLD cell in it', () => {
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'gold')] }, SSS, 'sword');
    expect(g.amount / plain.amount).toBe(2);
  });

  it('ADDS UP: two GOLDs in a group are X4, three are X6 (x2 + x2 + x2, not x8)', () => {
    const two = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'gold'), on(1, 'sword', 'gold')] }, SSS, 'sword');
    const three = groupAfter('knight', { strips: KNIGHT(), gilded: [0, 1, 2].map((r) => on(r, 'sword', 'gold')) }, SSS, 'sword');
    expect(two.amount / plain.amount).toBe(4);
    expect(three.amount / plain.amount).toBe(6);
  });

  it('TO ITS GROUP: a GOLD lone sword doubles; the shields beside it pay the same', () => {
    const line: SymbolId[] = ['sword', 'shield', 'shield'];
    const p = spin(make('knight', { strips: KNIGHT() }), line).score;
    const g = spin(make('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'gold')] }), line).score;
    expect(group(g, 'sword', 0).amount).toBe(2 * group(p, 'sword', 0).amount);
    expect(group(g, 'shield', 1).amount).toBe(group(p, 'shield', 1).amount);
    expect(group(g, 'shield', 2).amount).toBe(group(p, 'shield', 2).amount);
  });

  it('works on shields too (the shield gained doubles)', () => {
    const line: SymbolId[] = ['shield', 'shield', 'shield'];
    const p = groupAfter('knight', { strips: KNIGHT() }, line, 'shield');
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'shield', 'gold')] }, line, 'shield');
    expect(g.amount).toBe(2 * p.amount);
  });

  it('GOLDEN TICKET: X3 (and the card says X3)', () => {
    const p = groupAfter('knight', { strips: KNIGHT(), relics: ['ticket'] }, SSS, 'sword');
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'gold')], relics: ['ticket'] }, SSS, 'sword');
    expect(g.amount / p.amount).toBe(3);
    expect(charmShortText('gold', 2)).toBe('X3 PAY');
  });

  it('TESLA (actual): a GOLD bolt next to another multiplier ADDS into a pool (HOT STREAK x2 + GOLD x2 = x3, not x4)', () => {
    const run = (gilded: Gild[]) => {
      const f = make('tesla', { strips: TESLA(), gilded });
      f.hotStreak = true;
      return group(spin(f, BBB).score, 'bolt');
    };
    const p = run([]);
    const g = run([on(0, 'bolt', 'gold')]);
    expect(g.amount / p.amount).toBeCloseTo(1.5, 5);
  });

  // OPEN CALL (user): on TESLA (PAY.lightningAdd) bolt multipliers pool additively, so GOLD next to HOT STREAK is x1.5, not x2.
  it.skip('OPEN CALL: TESLA GOLD bolt doubles its group even with another multiplier on it (actually x1.5)', () => {
    const f0 = make('tesla', { strips: TESLA() });
    f0.hotStreak = true;
    const f1 = make('tesla', { strips: TESLA(), gilded: [on(0, 'bolt', 'gold')] });
    f1.hotStreak = true;
    expect(group(spin(f1, BBB).score, 'bolt').amount / group(spin(f0, BBB).score, 'bolt').amount).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: KEEN "+40 TO EACH ONE IN ITS GROUP, WHICH PIERCES SHIELDS" / card "+40 DAMAGE AND PIERCES SHIELDS"', () => {
  const plain = groupAfter('knight', { strips: KNIGHT() }, SSS, 'sword');

  it('+40 to EACH sword in its group: a 3-sword jackpot gets +120 BASE (x3 jackpot = +360 damage)', () => {
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'keen')] }, SSS, 'sword');
    expect(g.base - plain.base).toBe(40 * 3);
    expect(g.amount - plain.amount).toBe(40 * 3 * 3);
  });

  it('a pair gets +80 BASE; a lone keen sword +40', () => {
    const pairP = groupAfter('knight', { strips: KNIGHT() }, ['sword', 'sword', 'shield'], 'sword');
    const pairK = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'keen')] }, ['sword', 'sword', 'shield'], 'sword');
    expect(pairK.base - pairP.base).toBe(80);
    const loneP = groupAfter('knight', { strips: KNIGHT() }, ['sword', 'shield', 'shield'], 'sword');
    const loneK = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'keen')] }, ['sword', 'shield', 'shield'], 'sword');
    expect(loneK.base - loneP.base).toBe(40);
  });

  it('two KEENs in a group add (+40 each to each sword: +240 BASE on a jackpot)', () => {
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'keen'), on(1, 'sword', 'keen')] }, SSS, 'sword');
    expect(g.base - plain.base).toBe(240);
  });

  it('PIERCES SHIELDS: the whole keen group goes through the enemy shield; a plain one is blocked', () => {
    const hit = (gilded: Gild[]) => {
      const f = make('knight', { strips: KNIGHT(), gilded });
      f.sides.enemy.shield = 5000;
      return ofType(spin(f, SSS).events, 'attack').find((e) => e.from === 'player')!;
    };
    const p = hit([]);
    const k = hit([on(0, 'sword', 'keen')]);
    expect(p.hpDamage).toBe(0);
    expect(k.hpDamage).toBe(k.amount);
    expect(k.note).toBe('pierce');
  });

  it('KEEN works on THE JUKEBOX notes and JOKER cards (BLADES)', () => {
    const n0 = groupAfter('jukebox', { strips: JUKEBOX() }, ['note', 'shield', 'shield'], 'note');
    const n1 = groupAfter('jukebox', { strips: JUKEBOX(), gilded: [on(0, 'note', 'keen')] }, ['note', 'shield', 'shield'], 'note');
    expect(n1.base - n0.base).toBe(40);
    const a0 = groupAfter('joker', { strips: JOKER() }, ['ace', 'shield', 'shield'], 'ace');
    const a1 = groupAfter('joker', { strips: JOKER(), gilded: [on(0, 'ace', 'keen')] }, ['ace', 'shield', 'shield'], 'ace');
    expect(a1.base - a0.base).toBe(40);
  });

  it('GOLDEN TICKET: +50 to each (card says +50)', () => {
    const p = groupAfter('knight', { strips: KNIGHT(), relics: ['ticket'] }, SSS, 'sword');
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'keen')], relics: ['ticket'] }, SSS, 'sword');
    expect(g.base - p.base).toBe(50 * 3);
    expect(charmShortText('keen', 2)).toBe('+50 DAMAGE AND PIERCES SHIELDS');
  });

  // UNCLEAR (card face): "+40 DAMAGE" undersells it: +40 per sword in the group, then x the pair/jackpot multiplier and
  // every other multiplier (a KNIGHT jackpot: +360). The full rule ("TO EACH ONE IN ITS GROUP") is right.
  it('UNCLEAR card face: "+40 DAMAGE" on a jackpot is really +360 damage', () => {
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'keen')] }, SSS, 'sword');
    expect(g.amount - plain.amount).not.toBe(40);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: CHARGED "+10 TO ITS GROUP" / card "+10 CHARGE" (TESLA)', () => {
  const plain = groupAfter('tesla', { strips: TESLA() }, BBB, 'bolt');

  it('+10 to the bolt group BASE (once per charged cell, not per bolt)', () => {
    const g = groupAfter('tesla', { strips: TESLA(), gilded: [on(0, 'bolt', 'charged')] }, BBB, 'bolt');
    expect(g.base - plain.base).toBe(10);
    const two = groupAfter('tesla', { strips: TESLA(), gilded: [on(0, 'bolt', 'charged'), on(1, 'bolt', 'charged')] }, BBB, 'bolt');
    expect(two.base - plain.base).toBe(20);
  });

  it('it becomes charge: the energy gained grows', () => {
    const e = (gilded: Gild[]) => ofType(spin(make('tesla', { strips: TESLA(), gilded }), BBB).events, 'energyGain')[0].amount;
    expect(e([on(0, 'bolt', 'charged')])).toBeGreaterThan(e([]));
  });

  it('GOLDEN TICKET: +20', () => {
    const p = groupAfter('tesla', { strips: TESLA(), relics: ['ticket'] }, BBB, 'bolt');
    const g = groupAfter('tesla', { strips: TESLA(), gilded: [on(0, 'bolt', 'charged')], relics: ['ticket'] }, BBB, 'bolt');
    expect(g.base - p.base).toBe(20);
    expect(charmShortText('charged', 2)).toBe('+20 CHARGE');
  });

  // UNCLEAR: the +10 is BASE, so a jackpot multiplies it (+30 charge before TESLA's own boosts): "+10 CHARGE" undersells.
  it('UNCLEAR card face: on a jackpot "+10 CHARGE" is +30 charge before boosts', () => {
    const g = groupAfter('tesla', { strips: TESLA(), gilded: [on(0, 'bolt', 'charged')] }, BBB, 'bolt');
    expect(g.amount - plain.amount).toBe(30);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: VAMP "HEALS 20 WHEN ITS GROUP HITS (ONCE PER GROUP)" / card "+20 HP"', () => {
  const vampHeals = (cab: CabinetId, s: Setup, line: SymbolId[], prep?: (f: Fight) => void) => {
    const f = make(cab, s);
    f.sides.player.hp -= 150;
    prep?.(f);
    return ofType(spin(f, line).events, 'heal')
      .filter((e) => e.source === 'vamp')
      .map((e) => e.amount);
  };

  it('heals 20 when its group hits', () => {
    expect(vampHeals('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'vamp')] }, SSS)).toEqual([20]);
    expect(vampHeals('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'vamp')] }, ['sword', 'shield', 'shield'])).toEqual([20]);
  });

  it('ONCE PER GROUP: three VAMP swords in one jackpot heal 20, not 60', () => {
    expect(vampHeals('knight', { strips: KNIGHT(), gilded: [0, 1, 2].map((r) => on(r, 'sword', 'vamp')) }, SSS)).toEqual([20]);
  });

  it('two separate groups with VAMP heal twice', () => {
    // inOrder: [sword, shield, sword] is three lone groups.
    expect(vampHeals('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'vamp'), on(2, 'sword', 'vamp')] }, ['sword', 'shield', 'sword'])).toEqual([20, 20]);
  });

  it('THE DROP: a payline VAMP note plus VAMP notes off the payline still heal once', () => {
    const heals = vampHeals('jukebox', { strips: JUKEBOX(), gilded: [on(0, 'note', 'vamp')] }, ['note', 'note', 'note'], (f) => {
      f.sides.player.armed = true;
      f.sides.player.energy = f.meterCost;
    });
    expect(heals).toEqual([20]);
  });

  it('GOLDEN TICKET: heals 30 (card says +30 HP)', () => {
    expect(vampHeals('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'vamp')], relics: ['ticket'] }, SSS)).toEqual([30]);
    expect(charmShortText('vamp', 2)).toBe('+30 HP');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: LUCKY "40% TO LAND AS A WILD" / card "40% CHANCE TO BE A WILD"', () => {
  const rate = (relics: RelicId[], n = 1500) => {
    let wild = 0;
    for (let seed = 1; seed <= n; seed++) {
      const f = make('joker', { strips: JOKER(), gilded: [on(0, 'ace', 'lucky')], relics, seed });
      if (spin(f, ['ace', 'shield', 'shield']).luckyWilds.includes(0)) wild++;
    }
    return wild / n;
  };

  it('a LUCKY cell on the payline turns WILD about 40% of the time (1500 seeded spins, +-4 points)', () => {
    expect(Math.abs(rate([]) - 0.4)).toBeLessThan(0.04);
  });

  it('GOLDEN TICKET: about 55%', () => {
    expect(Math.abs(rate(['ticket']) - 0.55)).toBeLessThan(0.04);
    expect(charmShortText('lucky', 2)).toBe('55% CHANCE TO BE A WILD');
  });

  it('a plain cell never does', () => {
    for (let seed = 1; seed <= 200; seed++) expect(spin(make('joker', { strips: JOKER(), seed }), ['ace', 'shield', 'shield']).luckyWilds).toEqual([]);
  });

  it('the WILD really plays as one (the payline symbol is wild)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = spin(make('joker', { strips: JOKER(), gilded: [on(0, 'ace', 'lucky')], seed }), ['ace', 'shield', 'shield']);
      if (r.luckyWilds.includes(0)) {
        expect(r.score.line[0]).toBe('wild');
        return;
      }
    }
    throw new Error('no lucky wild in 50 seeds');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: BLAZE "LIGHTNING DAMAGE +11% FOR EVERY BLAZE CHARM YOU OWN" / card "+11% LIGHTNING DAMAGE" (TESLA)', () => {
  const storm = (gilded: Gild[], line: SymbolId[] = BBB, relics: RelicId[] = []) => {
    const ev = spin(make('tesla', { strips: TESLA(), gilded, relics }), line).events;
    return { strikes: ofType(ev, 'specialFire').filter((e) => e.from === 'player').map((e) => e.amount), charge: ofType(ev, 'energyGain')[0]?.amount ?? 0, group: ofType(ev, 'spin')[0].score };
  };
  const fullStrike = CABINETS.tesla.specialDamage!;

  // TESLA's one axis: BLAZE adds blaze/44 to the CHARGE each bolt group gives (more bolts, never bigger ones), which is
  // the +11% of lightning damage its text names (blazePct).
  it('the texts name the % of a full strike: +11% (LV1), +23% (GOLDEN TICKET), and the strike is TESLA\'s own', () => {
    expect(TESLA_STRIKE).toBe(CABINETS.tesla.specialDamage);
    expect(blazePct(charmValue('blaze', 1))).toBe(Math.round((5 / fullStrike) * 100));
    expect(charmShortText('blaze', 1)).toBe('+11% LIGHTNING DAMAGE');
    expect(charmRuleText('blaze', 1)).toBe('LIGHTNING DAMAGE +11% FOR EVERY BLAZE CHARM YOU OWN');
  });

  it('strikes hit the same with or without BLAZE; BLAZE raises the charge by 5/44 per cell you own', () => {
    const p = storm([]);
    const b = storm([on(1, 'bolt', 'blaze', 1)]);
    expect(p.strikes.length).toBeGreaterThan(0);
    expect(new Set([...p.strikes, ...b.strikes]).size).toBe(1);
    const pay = group(p.group, 'bolt').amount;
    expect(p.charge).toBe(pay);
    expect(b.charge).toBe(Math.round(pay * (1 + 5 / fullStrike)));
    // Two blaze cells: twice the boost.
    const b2 = storm([on(1, 'bolt', 'blaze', 2)]);
    expect(b2.charge).toBe(Math.round(pay * (1 + 10 / fullStrike)));
  });

  it('BLAZE counts every blaze cell you own, on the payline or not', () => {
    // The blaze cell is on reel 1; the forced line has no bolt on reel 1.
    const line: SymbolId[] = ['bolt', 'shield', 'shield'];
    expect(storm([on(1, 'bolt', 'blaze', 1)], line).charge).toBeGreaterThan(storm([], line).charge);
  });

  it('GOLDEN TICKET: +10 (charge x (1 + 10/44))', () => {
    const p = storm([], BBB, ['ticket']);
    const b = storm([on(1, 'bolt', 'blaze', 1)], BBB, ['ticket']);
    expect(b.charge).toBe(Math.round(group(p.group, 'bolt').amount * (1 + 10 / fullStrike)));
    expect(charmShortText('blaze', 2)).toBe('+23% LIGHTNING DAMAGE');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: BULWARK (spiked) "ALSO HITS FOR 100% OF ITS SHIELD" (retired: old saves only)', () => {
  it('a BULWARK shield in a pair also hits for its share of the pair\'s shield (rounded to 10)', () => {
    const f = make('knight', { strips: KNIGHT(), gilded: [on(0, 'shield', 'spiked')] });
    const { events, score } = spin(f, ['shield', 'shield', 'sword']);
    const g = group(score, 'shield', 0);
    const share = g.amount / g.reels.length;
    const hit = ofType(events, 'attack').find((e) => e.from === 'player' && e.reels.join() === g.reels.join())!;
    expect(hit.amount).toBe(Math.round(share / UNIT) * UNIT);
    expect(Math.abs(hit.amount - share)).toBeLessThanOrEqual(UNIT / 2);
  });

  it('no BULWARK, no hit from the shields', () => {
    const { events, score } = spin(make('knight', { strips: KNIGHT() }), ['shield', 'shield', 'sword']);
    const g = group(score, 'shield', 0);
    expect(ofType(events, 'attack').some((e) => e.from === 'player' && e.reels.join() === g.reels.join())).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: CHIP (lucre) "+3 CHIPS WHEN ITS GROUP PAYS (MAX 6 A FIGHT, ON A WIN)" / card "+3 CHIPS (MAX 6 PER FIGHT)"', () => {
  const lucreRun = (gilded: Gild[], relics: RelicId[] = []) => {
    const run = createRun(base, 5, 'knight');
    run.player.strips = KNIGHT();
    run.player.gilded = gilded.map((g) => ({ ...g }));
    run.player.relics = [...relics];
    const cfg = fightConfig(run, base);
    cfg.enemy = { hp: 99999, strips: reels3({ sword: 6, shield: 6 }) };
    const f = new Fight(cfg, 3);
    return { run, f };
  };
  const chipEvents = (f: Fight, spins: number, line: SymbolId[] = SSS) => {
    const out: number[] = [];
    for (let i = 0; i < spins; i++) {
      out.push(...ofType(spin(f, line).events, 'lucreChips').map((e) => e.amount));
      f.step(); // the enemy's turn
    }
    return out;
  };

  it('+3 each time its group pays, capped at 6 a fight', () => {
    const { f } = lucreRun([on(0, 'sword', 'lucre')]);
    expect(chipEvents(f, 4)).toEqual([LUCRE_CHIPS, LUCRE_CHIPS]);
    expect(f.lucreChips).toBe(6);
  });

  it('a shield group pays too', () => {
    const { f } = lucreRun([on(0, 'shield', 'lucre')]);
    expect(chipEvents(f, 1, ['shield', 'sword', 'sword'])).toEqual([3]);
  });

  it('ON A WIN: banked when you win (on top of what the same win pays without it)', () => {
    const plain = lucreRun([]);
    chipEvents(plain.f, 3);
    plain.f.winner = 'player';
    const before = plain.run.player.chips;
    finishFight(plain.run, plain.f);
    const plainGain = plain.run.player.chips - before;
    const l = lucreRun([on(0, 'sword', 'lucre')]);
    chipEvents(l.f, 3);
    l.f.winner = 'player';
    finishFight(l.run, l.f);
    // LUCRE is banked before interest is counted, so it can also tip the interest.
    const extraInterest = interestOn(before + 6) - interestOn(before);
    expect(l.run.player.chips - before - plainGain).toBe(6 + extraInterest);
  });

  it('ON A WIN: a lost fight banks nothing', () => {
    const l = lucreRun([on(0, 'sword', 'lucre')]);
    chipEvents(l.f, 3);
    expect(l.f.lucreChips).toBe(6);
    l.f.winner = 'enemy';
    const before = l.run.player.chips;
    finishFight(l.run, l.f);
    expect(l.run.player.chips).toBe(before);
  });

  it('GOLDEN TICKET: the cap is 9 (card "+3 CHIPS (MAX 9 PER FIGHT)")', () => {
    const { f } = lucreRun([on(0, 'sword', 'lucre')], ['ticket']);
    expect(chipEvents(f, 5)).toEqual([3, 3, 3]);
    expect(charmShortText('lucre', 2)).toBe('+3 CHIPS (MAX 9 PER FIGHT)');
  });

  // UNCLEAR: two CHIP Charms in the same group pay +3 once (fight.ts cellCharms: `n('lucre') > 0`), and the cap is one
  // fight-wide 6 however many CHIP Charms you own (Fight.lucreChips). A second CHIP card never raises it.
  it('UNCLEAR: three CHIP cells in one group pay +3, and owning more never lifts MAX 6', () => {
    const { f } = lucreRun([0, 1, 2].map((r) => on(r, 'sword', 'lucre')));
    expect(chipEvents(f, 4)).toEqual([3, 3]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: TRICK "+30 TO YOUR JACKPOT METER WHEN IT LANDS" (JOKER)', () => {
  const meterAfter = (gilded: Gild[], line: SymbolId[], relics: RelicId[] = []) => {
    const f = make('joker', { strips: JOKER(), gilded, relics });
    spin(f, line);
    return f.sides.player.energy;
  };

  it('+30 when it lands on the payline', () => {
    const line: SymbolId[] = ['ace', 'shield', 'shield'];
    expect(meterAfter([on(0, 'ace', 'trick')], line) - meterAfter([], line)).toBe(30);
  });

  it('two TRICK cells landing: +60 (per cell)', () => {
    const line: SymbolId[] = ['ace', 'ace', 'shield'];
    expect(meterAfter([on(0, 'ace', 'trick'), on(1, 'ace', 'trick')], line) - meterAfter([], line)).toBe(60);
  });

  it('on a shield too', () => {
    const line: SymbolId[] = ['shield', 'ace', 'ace'];
    expect(meterAfter([on(0, 'shield', 'trick')], line) - meterAfter([], line)).toBe(30);
  });

  it('GOLDEN TICKET: +40', () => {
    const line: SymbolId[] = ['ace', 'shield', 'shield'];
    expect(meterAfter([on(0, 'ace', 'trick')], line, ['ticket']) - meterAfter([], line, ['ticket'])).toBe(40);
    expect(charmShortText('trick', 2)).toBe('+40 TO YOUR JACKPOT METER');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: ECHO "AT THE DROP, ITS NOTE HITS X2" / card "AT THE DROP, ITS NOTE HITS X2" (JUKEBOX)', () => {
  // Reel 0 holds a single note (the ECHO one), so no other ECHO note can sit above or below the payline.
  const strips = (): StripCounts[] => [{ note: 1, shield: 6 }, { note: 6, shield: 6 }, { note: 6, shield: 6 }];
  const drop = (gilded: Gild[], relics: RelicId[] = [], armed = true) => {
    const f = make('jukebox', { strips: strips(), gilded, relics });
    if (armed) {
      f.sides.player.armed = true;
      f.sides.player.energy = f.meterCost;
    }
    const r = spin(f, ['note', 'note', 'note']);
    const g = r.score.groups.find((x) => x.symbol === 'note')!;
    const notes = ofType(r.events, 'drop')[0]?.cells.length ?? 3;
    return { g, notes };
  };
  const echo = [on(0, 'note', 'echo', 1)];

  it('ITS NOTE HITS X2: the drop grows by exactly one note\'s share (1 + 1/notes in the drop)', () => {
    const p = drop([]);
    const e = drop(echo);
    expect(e.notes).toBe(p.notes);
    expect(e.g.base).toBe(p.g.base);
    expect(e.g.mult / p.g.mult).toBeCloseTo(1 + 1 / p.notes, 9);
    expect(Math.abs(e.g.amount - p.g.amount - p.g.amount / p.notes)).toBeLessThanOrEqual(1);
  });

  it('AT THE DROP only: no drop, no echo', () => {
    expect(drop(echo, [], false).g.amount).toBe(drop([], [], false).g.amount);
  });

  it('GOLDEN TICKET: X2.5 (its note adds 1.5 shares)', () => {
    const p = drop([], ['ticket']);
    const e = drop(echo, ['ticket']);
    expect(e.g.mult / p.g.mult).toBeCloseTo(1 + 1.5 / p.notes, 9);
    expect(charmShortText('echo', 2)).toBe('AT THE DROP, ITS NOTE HITS X2.5');
  });

  // The card face says what the full rule says: only its note's share doubles (a 3-note drop hits x1.33), not the whole DROP.
  it('the card face names its note, not the whole DROP', () => {
    expect(charmShortText('echo', 1)).toBe('AT THE DROP, ITS NOTE HITS X2');
    const ratio = drop(echo).g.amount / drop([]).g.amount;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: GLASS "X5 TO ITS GROUP (ADDS UP LIKE GOLD). 1 IN 4 TO SHATTER FOR GOOD WHEN IT PAYS" / card "X5 PAY. 1 IN 4 TO SHATTER"', () => {
  const plain = groupAfter('knight', { strips: KNIGHT() }, SSS, 'sword');

  it('X5 to its group', () => {
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'glass')] }, SSS, 'sword');
    expect(g.amount / plain.amount).toBe(5);
  });

  it('ADDS UP LIKE GOLD: GLASS + GOLD = X7, two GLASS = X10', () => {
    const gg = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'glass'), on(1, 'sword', 'gold')] }, SSS, 'sword');
    expect(gg.amount / plain.amount).toBe(7);
    const two = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'glass'), on(1, 'sword', 'glass')] }, SSS, 'sword');
    expect(two.amount / plain.amount).toBe(10);
  });

  it('1 IN 4 TO SHATTER when it pays (2000 seeded paying spins, +-3 points)', () => {
    let broke = 0;
    const n = 2000;
    for (let seed = 1; seed <= n; seed++) {
      const r = spin(make('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'glass')], seed }), ['sword', 'shield', 'shield']);
      if (ofType(r.events, 'glassBreak').length) broke++;
    }
    expect(GLASS_BREAK).toBe(0.25);
    expect(Math.abs(broke / n - 0.25)).toBeLessThan(0.03);
  });

  it('FOR GOOD: the cell loses it in the fight, and the run loses that Charm after a win', () => {
    for (let seed = 1; seed < 100; seed++) {
      const run = createRun(base, 5, 'knight');
      run.player.strips = KNIGHT();
      run.player.gilded = [on(0, 'sword', 'glass')];
      const cfg = fightConfig(run, base);
      cfg.enemy = { hp: 99999, strips: reels3({ sword: 6, shield: 6 }) };
      const f = new Fight(cfg, seed);
      const r = spin(f, ['sword', 'shield', 'shield']);
      const br = ofType(r.events, 'glassBreak')[0];
      if (!br) continue;
      const cell = f.sides.player.reels[br.cells[0].reel].cells[br.cells[0].index];
      expect(cell.enh).toBeUndefined();
      f.winner = 'player';
      finishFight(run, f);
      expect(run.player.gilded.find((g) => g.enh === 'glass')?.n).toBe(5);
      return;
    }
    throw new Error('no shatter in 100 seeds');
  });

  it('GOLDEN TICKET: X6 (card "X6 PAY. 1 IN 4 TO SHATTER")', () => {
    const p = groupAfter('knight', { strips: KNIGHT(), relics: ['ticket'] }, SSS, 'sword');
    const g = groupAfter('knight', { strips: KNIGHT(), gilded: [on(0, 'sword', 'glass')], relics: ['ticket'] }, SSS, 'sword');
    expect(g.amount / p.amount).toBe(6);
    expect(charmShortText('glass', 2)).toBe('X6 PAY. 1 IN 4 TO SHATTER');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: GOLDEN TICKET "EVERY CHARM IS ONE STEP STRONGER"', () => {
  it('the relic says so', () => {
    expect(RELICS.ticket.text).toBe('EVERY CHARM IS ONE STEP STRONGER');
  });

  it('every Charm reads its index-2 value with the ticket, and it is stronger than index 1', () => {
    for (const e of ALL) {
      expect(charmLevel(undefined, e, false)).toBe(1);
      expect(charmLevel(undefined, e, true)).toBe(2);
      expect(charmValue(e, 2)).toBe(CHARM_VALUE[e][2]);
      expect(CHARM_VALUE[e][2]).toBeGreaterThan(CHARM_VALUE[e][1]);
    }
  });

  it('the draft card shows the stepped-up number when you hold the ticket, and the plain one when you do not', () => {
    for (const cab of MACHINES)
      for (const e of gildsFor(runOf(cab))) {
        const o: DraftOption = { kind: 'gild', enh: e, symbol: CHARM_SYMBOLS[e].find((s) => CABINETS[cab].symbols.includes(s))!, reel: 0, n: 2 };
        expect(describeOption(o, runOf(cab)).text.endsWith(charmShortText(e, 1))).toBe(true);
        expect(describeOption(o, runOf(cab, true)).text.endsWith(charmShortText(e, 2))).toBe(true);
      }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('AUDIT: card face vs full rule', () => {
  const card = (e: Enh, sym: SymbolId) => cardFace({ kind: 'gild', enh: e, symbol: sym, reel: 0, n: 2 }, runOf('knight'));

  it('the card face is the short text', () => {
    for (const e of ALL) {
      const sym = CHARM_SYMBOLS[e][0];
      expect(card(e, sym).text.endsWith(charmShortText(e, 1))).toBe(true);
    }
  });

  it('the card faces at LV1', () => {
    expect(ALL.map((e) => charmShortText(e, 1))).toEqual([
      'X2 PAY',
      '+40 DAMAGE AND PIERCES SHIELDS',
      '+10 CHARGE',
      '+20 HP',
      '40% CHANCE TO BE A WILD',
      '+11% LIGHTNING DAMAGE',
      'HITS FOR 100% OF ITS SHIELD',
      '+3 CHIPS (MAX 6 PER FIGHT)',
      '+30 TO YOUR JACKPOT METER',
      'AT THE DROP, ITS NOTE HITS X2',
      'X5 PAY. 1 IN 4 TO SHATTER',
    ]);
  });

  // The card's detail box (hover, focus or tap) shows the full rule: ONCE PER GROUP, ON A WIN, ITS NOTE, FOR GOOD.
  it('a Charm card\'s detail box shows the full rule', () => {
    for (const e of ALL) expect(card(e, CHARM_SYMBOLS[e][0]).full).toContain(charmRuleText(e, 1));
  });
});
