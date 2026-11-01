/**
 * Launch audit, group relics_c2: JOKER and JUKEBOX machine relics, HORSESHOE, and the per-machine texts of VAMPIRE FANG,
 * OVERCHARGE and JACKPOT BELL. Each test forces the exact situation a relic's text describes and checks the number it
 * promises. The claims the code broke were fixed on 2026-11-01 (code or text).
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId, type StripCounts, type SymbolId } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { CHARM_VALUE } from '../src/core/charms';
import { relicText, RELICS, NEW_RELIC } from '../src/core/relics';
import { shortRelicText } from '../src/ui/run/cardText';
import { createRun, fightConfig, relicFits } from '../src/core/run';
import type { ScoreGroup } from '../src/core/scoring';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A fight on a slot machine against a punching bag (shields only, so it never threatens you). */
function on(cab: CabinetId, relics: RelicId[], mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cab), base);
  c.enemy = { hp: 99999, strips: reels3({ shield: 12 }) };
  c.relics = relics;
  mut?.(c);
  return new Fight(c, seed);
}
/** Your spin only. */
function play(f: Fight, line: SymbolId[]): CombatEvent[] {
  f.forceNext('player', line);
  return f.step().events;
}
/** Your spin, then the enemy's. */
function round(f: Fight, line: SymbolId[]): CombatEvent[] {
  const ev = play(f, line);
  if (!f.over) f.step();
  return ev;
}
const hits = (ev: CombatEvent[]) => ofType(ev, 'attack').filter((a) => a.from === 'player');
const score = (ev: CombatEvent[]) => ofType(ev, 'spin')[0].score;
const relicFired = (ev: CombatEvent[], r: RelicId) => ofType(ev, 'relic').some((e) => e.relic === r);
const healed = (ev: CombatEvent[]) => ofType(ev, 'heal').filter((h) => h.side === 'player').reduce((a, h) => a + h.amount, 0);
const group = (ev: CombatEvent[], sym: SymbolId, matched = true): ScoreGroup => score(ev).groups.find((g) => g.symbol === sym && g.matched === matched)!;
/** Arm the player's meter (JOKER's jackpot meter, BANKROLL's HIGH ROLLER bar, THE JUKEBOX's volume). */
function arm(f: Fight): void {
  f.sides.player.energy = f.meterCost;
  f.sides.player.armed = true;
}
/** LUCKY at 100% for the body (charms have one value; the act 2 tests raise it the same way). */
function sureLucky(body: () => void): void {
  const old = CHARM_VALUE.lucky[1];
  CHARM_VALUE.lucky[1] = 100;
  try {
    body();
  } finally {
    CHARM_VALUE.lucky[1] = old;
  }
}

describe('texts and card faces, per machine', () => {
  it('each relic is offered only where its text makes sense', () => {
    const fits = (cab: CabinetId, r: RelicId) => relicFits(createRun(base, 1, cab), r);
    for (const r of ['encore', 'deckdrum', 'houseofcards', 'highcard'] as RelicId[]) {
      expect(RELICS[r].machine).toBe('joker');
      expect(fits('joker', r)).toBe(true);
      expect(fits('jukebox', r)).toBe(false);
    }
    for (const r of ['turntable', 'mixtape', 'subwoofer', 'hitmaker', 'hypeman'] as RelicId[]) {
      expect(RELICS[r].machine).toBe('jukebox');
      expect(fits('jukebox', r)).toBe(true);
      expect(fits('joker', r)).toBe(false);
    }
    // FANG and OVERCHARGE need a meter (never KNIGHT); OVERCHARGE never on THE JUKEBOX. BELL goes everywhere.
    expect(fits('knight', 'fang')).toBe(false);
    for (const cab of ['tesla', 'midas', 'joker', 'jukebox'] as CabinetId[]) expect(fits(cab, 'fang')).toBe(true);
    expect(fits('knight', 'overcharge')).toBe(false);
    expect(fits('jukebox', 'overcharge')).toBe(false);
    for (const cab of ['tesla', 'midas', 'joker'] as CabinetId[]) expect(fits(cab, 'overcharge')).toBe(true);
    for (const cab of ['knight', 'tesla', 'midas', 'joker', 'jukebox'] as CabinetId[]) expect(fits(cab, 'bell')).toBe(true);
    // HORSESHOE needs a LUCKY Charm.
    const run = createRun(base, 1, 'knight');
    expect(relicFits(run, 'horseshoe')).toBe(false);
    run.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'lucky', n: 1 });
    expect(relicFits(run, 'horseshoe')).toBe(true);
  });

  it('the machine texts and card faces read as audited', () => {
    expect(relicText('fang', 'tesla')).toBe('EACH LIGHTNING STORM HEALS 15 MORE HP');
    expect(relicText('fang', 'midas')).toBe('HIGH ROLLER PAYOFFS HEAL 30 MORE HP');
    expect(relicText('fang', 'joker')).toBe('ALL-JACKPOT SPINS HEAL 30 MORE HP');
    expect(relicText('fang', 'jukebox')).toBe('THE DROP HEALS 30 MORE HP');
    expect(relicText('overcharge', 'tesla')).toBe('LIGHTNING DAMAGE +30%');
    expect(shortRelicText('overcharge', relicText('overcharge', 'midas'))).toBe('HIGH ROLLER PAYOFFS ECHO FOR 1/3');
    expect(shortRelicText('overcharge', relicText('overcharge', 'joker'))).toBe('ALL-JACKPOT SPINS ECHO FOR 1/3');
    expect(shortRelicText('overcharge', relicText('overcharge', 'tesla'))).toBe('LIGHTNING DAMAGE +30%');
    const bell = (c: CabinetId) => shortRelicText('bell', relicText('bell', c));
    expect(bell('knight')).toBe('JACKPOTS PAY X2');
    expect(bell('tesla')).toBe('JACKPOTS PAY X2, FULL LIGHTNING');
    expect(bell('midas')).toBe('JACKPOTS PAY X2, FILL HIGH ROLLER');
    expect(bell('joker')).toBe('JACKPOTS PAY X1.25, FILL THE METER');
    expect(bell('jukebox')).toBe('JACKPOTS PAY X2, MAX VOLUME');
    expect(relicText('deckdrum', 'joker')).toBe('EVERY SPIN THAT PAYS: +1 CARD DAMAGE FOR THE REST OF THE FIGHT (MAX +5)');
    expect(shortRelicText('deckdrum', relicText('deckdrum', 'joker'))).toBe('+1 CARD DAMAGE PER SPIN THAT PAYS, MAX +5');
    expect(shortRelicText('hypeman', relicText('hypeman', 'jukebox'))).toBe('+1 VOLUME EVERY 2ND SPIN. NOTES PAY HALF');
    expect(relicText('hitmaker', 'jukebox')).toBe('EACH DROP HITS +60% MORE FOR EVERY DROP BEFORE IT THIS FIGHT');
    expect(shortRelicText('hitmaker', relicText('hitmaker', 'jukebox'))).toBe('EACH DROP: +60% PER DROP BEFORE IT');
  });
});

describe('ENCORE (JOKER): REFUND 30 TO YOUR JACKPOT METER AFTER IT PAYS', () => {
  it('after the payoff the meter holds 30 (0 without ENCORE)', () => {
    for (const [relics, want] of [[['encore'], 30], [[], 0]] as const) {
      const f = on('joker', [...relics]);
      arm(f);
      const ev = round(f, ['ace', 'shield', 'ace']);
      expect(score(ev).jackpots).toBe(true);
      expect(f.sides.player.armed).toBe(false);
      expect(f.sides.player.energy).toBe(want);
      expect(relicFired(ev, 'encore')).toBe(relics.length > 0);
    }
  });
  it("the payoff line's own WILDS add on top of the 30", () => {
    const f = on('joker', ['encore']);
    arm(f);
    round(f, ['wild', 'ace', 'ace']);
    expect(f.sides.player.energy).toBe(30 + 50);
  });
  it('no payoff, no refund', () => {
    const f = on('joker', ['encore']);
    const ev = round(f, ['ace', 'ace', 'ace']);
    expect(f.sides.player.energy).toBe(0);
    expect(relicFired(ev, 'encore')).toBe(false);
  });
});

describe('DECK DRUM (JOKER): EACH PAIR AND JACKPOT INCREASES CARD DAMAGE BY +1 EACH FIGHT (MAX +5)', () => {
  it('a pair adds a stack; the next card group gets +1 a card (before the pair multiplier)', () => {
    const f = on('joker', ['deckdrum']);
    const a = round(f, ['ace', 'ace', 'shield']);
    expect(f.drum).toBe(1);
    const b = round(f, ['ace', 'ace', 'shield']);
    expect(ofType(b, 'spin')[0].symBonus?.ace).toBe(1);
    expect(group(b, 'ace').base - group(a, 'ace').base).toBe(2);
    expect(hits(b)[0].amount - hits(a)[0].amount).toBe(2 * base.pairMult);
  });
  it('a jackpot adds a stack', () => {
    const f = on('joker', ['deckdrum']);
    round(f, ['ace', 'ace', 'ace']);
    expect(f.drum).toBe(1);
  });
  it('caps at +5', () => {
    const f = on('joker', ['deckdrum']);
    for (let i = 0; i < 8; i++) round(f, ['ace', 'ace', 'shield']);
    expect(f.drum).toBe(NEW_RELIC.drumCap);
    expect(NEW_RELIC.drumCap).toBe(5);
    const ev = round(f, ['ace', 'ace', 'shield']);
    expect(ofType(ev, 'spin')[0].symBonus?.ace).toBe(5);
  });
  it('stacks are for the fight: the next fight starts at +0', () => {
    const f = on('joker', ['deckdrum']);
    round(f, ['ace', 'ace', 'shield']);
    expect(f.drum).toBe(1);
    expect(on('joker', ['deckdrum']).drum).toBe(0);
  });
  // EVERY SPIN THAT PAYS (the text said pairs and jackpots; 2026-11-01): a spin with no pair still adds a stack.
  it('a spin with no pair and no jackpot that pays adds a stack', () => {
    const f = on('joker', ['deckdrum']);
    const ev = round(f, ['ace', 'shield', 'ace']);
    expect(score(ev).tier).toBe('none');
    expect(f.drum).toBe(1);
  });
  it('a spin that pays only lone shields adds a stack too', () => {
    const f = on('joker', ['deckdrum']);
    round(f, ['shield', 'ace', 'shield']);
    expect(f.drum).toBe(1);
  });
});

describe('HOUSE OF CARDS (JOKER): EACH JACKPOT METER PAYOFF ADDS A WILD TO 2 REELS FOR THE FIGHT', () => {
  const wilds = (f: Fight) => f.sides.player.reels.map((r) => r.cells.filter((c) => c.symbol === 'wild').length);
  it('each payoff adds one WILD to each of 2 different reels', () => {
    const f = on('joker', ['houseofcards']);
    const w0 = wilds(f);
    arm(f);
    const ev = round(f, ['ace', 'shield', 'ace']);
    const d1 = wilds(f).map((n, r) => n - w0[r]);
    expect(d1.reduce((a, n) => a + n, 0)).toBe(2);
    expect(Math.max(...d1)).toBe(1);
    expect(ofType(ev, 'relic').find((e) => e.relic === 'houseofcards')?.inserts).toHaveLength(2);
    // A second payoff adds 2 more.
    arm(f);
    round(f, ['ace', 'shield', 'ace']);
    expect(wilds(f).reduce((a, n) => a + n, 0) - w0.reduce((a, n) => a + n, 0)).toBe(4);
  });
  it('no payoff, no WILDS; without the relic a payoff adds none', () => {
    const f = on('joker', ['houseofcards']);
    const w0 = wilds(f);
    round(f, ['ace', 'ace', 'ace']);
    expect(wilds(f)).toEqual(w0);
    const g = on('joker', []);
    const g0 = wilds(g);
    arm(g);
    round(g, ['ace', 'shield', 'ace']);
    expect(wilds(g)).toEqual(g0);
  });
  it('the WILDS end with the fight (the run keeps its strips)', () => {
    const run = createRun(base, 1, 'joker');
    const c = fightConfig(run, base);
    c.enemy = { hp: 99999, strips: reels3({ shield: 12 }) };
    c.relics = ['houseofcards'];
    const before = JSON.stringify(run.player.strips);
    const f = new Fight(c, 7);
    arm(f);
    round(f, ['ace', 'shield', 'ace']);
    expect(JSON.stringify(run.player.strips)).toBe(before);
    expect(JSON.stringify(c.player.strips)).toBe(before);
  });
});

describe('HIGH CARD (JOKER): JACKPOTS AND JACKPOT METER PAYOFFS PAY X1.5. PAIRS PAY HALF', () => {
  const pair = (relics: RelicId[], line: SymbolId[], sym: SymbolId) => group(round(on('joker', relics), line), sym);
  it('a jackpot pays x1.5', () => {
    const hc = pair(['highcard'], ['ace', 'ace', 'ace'], 'ace');
    const no = pair([], ['ace', 'ace', 'ace'], 'ace');
    expect(hc.mult / no.mult).toBeCloseTo(1.5);
    expect(Math.abs(hc.amount - no.amount * 1.5)).toBeLessThanOrEqual(1);
  });
  it('a pair pays half (cards and shields)', () => {
    expect(pair(['highcard'], ['ace', 'ace', 'shield'], 'ace').mult / pair([], ['ace', 'ace', 'shield'], 'ace').mult).toBeCloseTo(0.5);
    expect(pair(['highcard'], ['shield', 'shield', 'ace'], 'shield').mult / pair([], ['shield', 'shield', 'ace'], 'shield').mult).toBeCloseTo(0.5);
  });
  it('the jackpot meter payoff: every cell pays x1.5', () => {
    const run = (relics: RelicId[]) => {
      const f = on('joker', relics);
      arm(f);
      return score(round(f, ['ace', 'shield', 'ace'])).groups;
    };
    const hc = run(['highcard']);
    const no = run([]);
    expect(hc).toHaveLength(3);
    hc.forEach((g, i) => expect(g.mult / no[i].mult).toBeCloseTo(1.5));
  });
  it('singles are untouched', () => {
    const hc = round(on('joker', ['highcard']), ['ace', 'shield', 'ace']);
    const no = round(on('joker', []), ['ace', 'shield', 'ace']);
    expect(hits(hc).map((a) => a.amount)).toEqual(hits(no).map((a) => a.amount));
  });
});

describe('HORSESHOE (LUCKY): PAIRS AND JACKPOTS MADE WITH A LUCKY WILD PAY X3', () => {
  const knight = (relics: RelicId[], strips: StripCounts[], luckyReel: number, luckySym: SymbolId) =>
    on('knight', relics, (c) => {
      c.player.strips = strips;
      c.player.gilded = [{ reel: luckyReel, symbol: luckySym, enh: 'lucky', n: 12 }];
    });
  it('a jackpot made with a LUCKY WILD pays x3', () =>
    sureLucky(() => {
      const strips: StripCounts[] = [{ sword: 12 }, { sword: 12 }, { shield: 12 }];
      const a = play(knight(['horseshoe'], strips, 2, 'shield'), ['sword', 'sword', 'shield']);
      const b = play(knight([], strips, 2, 'shield'), ['sword', 'sword', 'shield']);
      expect(ofType(a, 'spin')[0].luckyWilds).toEqual([2]);
      expect(score(a).tier).toBe('triple');
      expect(group(a, 'sword').mult / group(b, 'sword').mult).toBeCloseTo(3);
    }));
  it('a pair made with a LUCKY WILD pays x3', () =>
    sureLucky(() => {
      const strips: StripCounts[] = [{ sword: 12 }, { shield: 12 }, { shield: 12 }];
      const a = play(knight(['horseshoe'], strips, 1, 'shield'), ['sword', 'shield', 'shield']);
      const b = play(knight([], strips, 1, 'shield'), ['sword', 'shield', 'shield']);
      expect(score(a).tier).toBe('pair');
      expect(group(a, 'sword').mult / group(b, 'sword').mult).toBeCloseTo(3);
    }));
  it("a WILD that was printed on the reel (not LUCKY's) doesn't count", () => {
    const f = on('knight', ['horseshoe'], (c) => (c.player.strips = [{ sword: 12 }, { wild: 12 }, { shield: 12 }]));
    const ev = play(f, ['sword', 'wild', 'shield']);
    expect(score(ev).tier).toBe('pair');
    expect(score(ev).relics ?? []).not.toContain('horseshoe');
  });
  // A LUCKY WILD that completes nothing isn't tripled (fixed 2026-11-01: it paid x3 alone).
  it('a LUCKY WILD that makes no pair or jackpot is not tripled', () =>
    sureLucky(() => {
      const f = knight(['horseshoe'], [{ sword: 12 }, { shield: 12 }, { shield: 12 }], 2, 'shield');
      const ev = play(f, ['sword', 'shield', 'shield']);
      expect(ofType(ev, 'spin')[0].luckyWilds).toEqual([2]);
      expect(score(ev).tier).toBe('none');
      expect(score(ev).relics ?? []).not.toContain('horseshoe');
    }));
});

describe('THE JUKEBOX relics', () => {
  const juke = (relics: RelicId[], mut?: (c: GameConfig) => void, seed = 7) => on('jukebox', relics, mut, seed);

  it('TURNTABLE: AFTER THE DROP, THE VOLUME FALLS TO 5, NOT 3', () => {
    for (const [relics, want] of [[['turntable'], 5], [[], 3]] as const) {
      const f = juke([...relics]);
      arm(f);
      const ev = round(f, ['note', 'note', 'note']);
      expect(ofType(ev, 'drop')).toHaveLength(1);
      expect(f.volume).toBe(want);
    }
  });

  it('MIXTAPE: A SPIN WITH NO NOTE KEEPS THE VOLUME (notes still raise it)', () => {
    const f = juke(['mixtape']);
    round(f, ['note', 'note', 'shield']);
    expect(f.volume).toBe(2);
    const ev = round(f, ['shield', 'shield', 'shield']);
    expect(f.volume).toBe(2);
    expect(relicFired(ev, 'mixtape')).toBe(true);
    round(f, ['note', 'shield', 'shield']);
    expect(f.volume).toBe(3);
    const g = juke([]);
    round(g, ['note', 'note', 'shield']);
    round(g, ['shield', 'shield', 'shield']);
    expect(g.volume).toBe(0);
  });

  it('SUBWOOFER: THE DROP ALSO HITS FOR ALL THE SHIELD YOU HOLD', () => {
    const f = juke(['subwoofer']);
    arm(f);
    const ev = play(f, ['note', 'note', 'shield']);
    const held = f.sides.player.shield;
    expect(held).toBeGreaterThan(0);
    const h = hits(ev);
    expect(h).toHaveLength(2);
    expect(h[1].amount).toBe(held);
    expect(relicFired(ev, 'subwoofer')).toBe(true);
    // Without the relic, only the notes hit.
    const g = juke([]);
    arm(g);
    expect(hits(play(g, ['note', 'note', 'shield']))).toHaveLength(1);
  });
  it('SUBWOOFER: no shield, no extra hit; no DROP, no extra hit', () => {
    const f = juke(['subwoofer']);
    arm(f);
    const ev = play(f, ['note', 'note', 'note']);
    expect(hits(ev)).toHaveLength(1);
    const g = juke(['subwoofer']);
    const ev2 = play(g, ['note', 'shield', 'shield']);
    expect(g.sides.player.shield).toBeGreaterThan(0);
    expect(hits(ev2)).toHaveLength(1);
    expect(relicFired(ev2, 'subwoofer')).toBe(false);
  });

  const drops = (relics: RelicId[], n: number) => {
    const f = juke(relics, (c) => (c.player.strips = reels3({ note: 12 })));
    const out: ScoreGroup[] = [];
    for (let i = 0; i < n; i++) {
      arm(f);
      out.push(score(round(f, ['note', 'note', 'note'])).groups.find((g) => g.drop)!);
    }
    return out;
  };
  it('CERTIFIED HITMAKER: the 1st DROP is plain, the 2nd +60%, the 3rd +120% (of the plain drop)', () => {
    const hm = drops(['hitmaker'], 3);
    const no = drops([], 3);
    expect(hm[0].mult / no[0].mult).toBeCloseTo(1);
    expect(hm[1].mult / no[1].mult).toBeCloseTo(1.6);
    expect(hm[2].mult / no[2].mult).toBeCloseTo(2.2);
    expect(hm[1].notes).toContain('X1.6 HIT');
    // A new fight starts over.
    expect(drops(['hitmaker'], 1)[0].notes ?? []).not.toContain('X1.6 HIT');
  });
  // +60% FOR EVERY DROP BEFORE IT (2026-11-01; it read as compounding): the 4th DROP is x2.8 of a plain one.
  it('each DROP gets +60% for every DROP before it (x1, x1.6, x2.2, x2.8)', () => {
    const hm = drops(['hitmaker'], 4);
    const no = drops([], 4);
    hm.forEach((g, i) => expect(g.mult / no[i].mult).toBeCloseTo(1 + 0.6 * i));
  });

  it('HYPE MAN: +1 VOLUME BEFORE EVERY OTHER SPIN (spins 1, 3, 5...), before the notes are scored', () => {
    const f = juke(['hypeman']);
    const g = juke([]);
    const a1 = round(f, ['note', 'shield', 'shield']);
    round(g, ['note', 'shield', 'shield']);
    expect(relicFired(a1, 'hypeman')).toBe(true);
    expect(group(a1, 'note', false).notes).toContain('VOL +32%');
    expect(f.volume).toBe(2);
    expect(g.volume).toBe(1);
    const a2 = round(f, ['note', 'shield', 'shield']);
    round(g, ['note', 'shield', 'shield']);
    expect(relicFired(a2, 'hypeman')).toBe(false);
    expect(f.volume).toBe(3);
    const a3 = round(f, ['note', 'shield', 'shield']);
    expect(relicFired(a3, 'hypeman')).toBe(true);
    expect(f.volume).toBe(5);
  });
  it('HYPE MAN: notes pay half off THE DROP, full on it', () => {
    const at = (relics: RelicId[], armed: boolean) => {
      const f = juke(relics);
      round(f, ['shield', 'shield', 'shield']);
      f.sides.player.energy = 20;
      if (armed) arm(f);
      return group(round(f, ['note', 'note', 'shield']), 'note');
    };
    expect(at(['hypeman'], false).mult / at([], false).mult).toBeCloseTo(0.5);
    expect(at(['hypeman'], true).mult / at([], true).mult).toBeCloseTo(1);
  });
  it('HYPE MAN: the +1 that fills the volume makes that same spin THE DROP', () => {
    const f = juke(['hypeman']);
    f.sides.player.energy = 50;
    const ev = round(f, ['note', 'note', 'note']);
    expect(ofType(ev, 'drop')).toHaveLength(1);
  });
});

describe('VAMPIRE FANG, per machine (the base rule: every meter payoff heals 15)', () => {
  const payoffHeal = (cab: CabinetId, relics: RelicId[]) => {
    const f = on(cab, relics, (c) => {
      if (cab === 'tesla') c.player.gilded = [];
    });
    f.sides.player.hp = 100;
    if (cab === 'tesla') return healed(play(f, ['bolt', 'bolt', 'shield']));
    arm(f);
    const line: SymbolId[] = cab === 'midas' ? ['goldbar', 'shield', 'shield'] : cab === 'joker' ? ['ace', 'shield', 'ace'] : ['note', 'note', 'note'];
    return healed(play(f, line));
  };
  it('FANG adds 30 to a payoff on BANKROLL, JOKER and THE JUKEBOX (15 -> 45), 15 to a TESLA storm (15 -> 30)', () => {
    for (const cab of ['midas', 'joker', 'jukebox'] as CabinetId[]) {
      expect(payoffHeal(cab, [])).toBe(15);
      expect(payoffHeal(cab, ['fang'])).toBe(45);
    }
    expect(payoffHeal('tesla', [])).toBe(15);
    expect(payoffHeal('tesla', ['fang'])).toBe(30);
  });
  it('TESLA: once a storm, however many strikes', () => {
    const f = on('tesla', ['fang'], (c) => (c.player.gilded = []));
    f.sides.player.hp = 100;
    f.sides.player.energy = 200;
    const ev = play(f, ['bolt', 'bolt', 'shield']);
    expect(ofType(ev, 'specialFire').length).toBeGreaterThan(3);
    expect(ofType(ev, 'heal').filter((h) => h.side === 'player')).toHaveLength(1);
    expect(healed(ev)).toBe(30);
  });
  // The machine texts say MORE (2026-11-01): FANG heals that much on top of the payoff's own 15.
  it('a FANG payoff heals the MORE its machine text names (TESLA +15, the others +30)', () => {
    expect(payoffHeal('tesla', ['fang']) - payoffHeal('tesla', [])).toBe(15);
    for (const cab of ['midas', 'joker', 'jukebox'] as CabinetId[]) expect(payoffHeal(cab, ['fang']) - payoffHeal(cab, [])).toBe(30);
  });
  // With OVERCHARGE too, FANG heals once (fixed 2026-11-01: it healed again after the echo).
  it('FANG + OVERCHARGE: the payoff heals 45 (FANG once)', () => {
    for (const cab of ['midas', 'joker'] as CabinetId[]) expect(payoffHeal(cab, ['fang', 'overcharge'])).toBe(45);
  });
});

describe('OVERCHARGE, per machine', () => {
  it('BANKROLL: the HIGH ROLLER payoff echoes for 1/3 of its damage', () => {
    const f = on('midas', ['overcharge']);
    arm(f);
    const h = hits(play(f, ['goldbar', 'shield', 'shield']));
    const main = h.filter((a) => a.note !== 'echo');
    const echo = h.filter((a) => a.note === 'echo');
    expect(echo).toHaveLength(1);
    expect(echo[0].amount).toBe(Math.round(main.reduce((a, x) => a + x.amount, 0) / 3));
    // No payoff, no echo.
    const g = on('midas', ['overcharge'], (c) => (c.player.chipsHeld = 0));
    expect(hits(play(g, ['goldbar', 'shield', 'shield'])).filter((a) => a.note === 'echo')).toHaveLength(0);
  });
  it("JOKER: the all-jackpots spin echoes for 1/3 of its damage", () => {
    const f = on('joker', ['overcharge']);
    arm(f);
    const h = hits(play(f, ['ace', 'shield', 'ace']));
    const main = h.filter((a) => a.note !== 'echo');
    expect(main).toHaveLength(2);
    const echo = h.filter((a) => a.note === 'echo');
    expect(echo).toHaveLength(1);
    expect(echo[0].amount).toBe(Math.round(main.reduce((a, x) => a + x.amount, 0) / 3));
    const g = on('joker', ['overcharge']);
    expect(hits(play(g, ['ace', 'ace', 'ace'])).filter((a) => a.note === 'echo')).toHaveLength(0);
  });
  const tesla = (relics: RelicId[]) => on('tesla', relics, (c) => (c.player.gilded = []));
  it('TESLA: lightning gets 30% more charge (more strikes over a fight)', () => {
    const a = ofType(play(tesla(['overcharge']), ['bolt', 'bolt', 'shield']), 'energyGain')[0].amount;
    const b = ofType(play(tesla([]), ['bolt', 'bolt', 'shield']), 'energyGain')[0].amount;
    expect(a).toBe(Math.round(b * 1.3));
    // Over many spins the total lightning damage is about 30% more.
    const total = (relics: RelicId[]) => {
      const f = tesla(relics);
      let d = 0;
      for (let i = 0; i < 20; i++) d += ofType(round(f, ['bolt', 'bolt', 'shield']), 'specialFire').reduce((s, e) => s + e.amount, 0);
      return d;
    };
    expect(total(['overcharge']) / total([])).toBeGreaterThan(1.25);
    expect(total(['overcharge']) / total([])).toBeLessThan(1.35);
  });
  // TESLA's text is LIGHTNING DAMAGE +30% (2026-11-01; it said each strike hits harder): the strikes stay the same size,
  // the +30% is over a fight (the test above).
  it('TESLA: each strike stays the same size (the +30% is more strikes)', () => {
    const a = ofType(play(tesla(['overcharge']), ['bolt', 'bolt', 'shield']), 'specialFire')[0].amount;
    const b = ofType(play(tesla([]), ['bolt', 'bolt', 'shield']), 'specialFire')[0].amount;
    expect(a).toBe(b);
  });
});

describe('JACKPOT BELL, per machine', () => {
  const jackpotMul = (cab: CabinetId, line: SymbolId[], sym: SymbolId) => {
    const g = (relics: RelicId[]) => group(play(on(cab, relics), line), sym);
    return g(['bell']).mult / g([]).mult;
  };
  it('KNIGHT: JACKPOTS PAY X2 (pairs untouched, no meter)', () => {
    expect(jackpotMul('knight', ['sword', 'sword', 'sword'], 'sword')).toBeCloseTo(2);
    expect(jackpotMul('knight', ['sword', 'sword', 'shield'], 'sword')).toBeCloseTo(1);
    const ev = play(on('knight', ['bell']), ['sword', 'sword', 'sword']);
    expect(ofType(ev, 'meter')).toHaveLength(0);
    expect(ofType(ev, 'energyGain')).toHaveLength(0);
  });
  it('TESLA: JACKPOTS PAY X2 AND FULLY CHARGE YOUR LIGHTNING', () => {
    expect(jackpotMul('tesla', ['shield', 'shield', 'shield'], 'shield')).toBeCloseTo(2);
    const f = on('tesla', ['bell'], (c) => (c.player.gilded = []));
    const ev = play(f, ['shield', 'shield', 'shield']);
    expect(ofType(ev, 'energyGain')[0].amount).toBe(f.meterCost);
    expect(ofType(ev, 'specialFire')).toHaveLength(1);
    expect(ofType(play(on('tesla', [], (c) => (c.player.gilded = [])), ['shield', 'shield', 'shield']), 'specialFire')).toHaveLength(0);
  });
  it('BANKROLL: JACKPOTS PAY X2', () => {
    expect(jackpotMul('midas', ['shield', 'shield', 'shield'], 'shield')).toBeCloseTo(2);
  });
  // (Fixed 2026-11-01: it added one pip, 10 of 100.)
  it('BANKROLL: a jackpot fills the HIGH ROLLER bar from empty', () => {
    const f = on('midas', ['bell'], (c) => (c.player.chipsHeld = 0));
    expect(f.sides.player.energy).toBe(0);
    play(f, ['shield', 'shield', 'shield']);
    expect(f.sides.player.armed).toBe(true);
    expect(f.sides.player.energy).toBe(f.meterCost);
  });
  it('JOKER: JACKPOTS PAY X1.25 AND FILL YOUR JACKPOT METER (not on the payoff spin itself)', () => {
    expect(jackpotMul('joker', ['ace', 'ace', 'ace'], 'ace')).toBeCloseTo(1.25);
    const f = on('joker', ['bell']);
    play(f, ['ace', 'ace', 'ace']);
    expect(f.sides.player.armed).toBe(true);
    expect(f.sides.player.energy).toBe(f.meterCost);
    // The payoff spin pays its jackpots x1.25 but doesn't refill the meter it just emptied.
    const g = on('joker', ['bell']);
    arm(g);
    const ev = play(g, ['ace', 'shield', 'ace']);
    expect(score(ev).groups[0].notes).toContain('X1.25 BELL');
    expect(g.sides.player.armed).toBe(false);
    expect(g.sides.player.energy).toBe(0);
  });
  it('THE JUKEBOX: JACKPOTS PAY X2 AND MAX YOUR VOLUME (NOT ON THE DROP)', () => {
    expect(jackpotMul('jukebox', ['shield', 'shield', 'shield'], 'shield')).toBeCloseTo(2);
    const f = on('jukebox', ['bell']);
    play(f, ['shield', 'shield', 'shield']);
    expect(f.volume).toBe(6);
    expect(f.sides.player.armed).toBe(true);
    // A jackpot on THE DROP still pays x2, but the volume falls as usual.
    const run = (relics: RelicId[]) => {
      const g = on('jukebox', relics);
      arm(g);
      const ev = play(g, ['note', 'note', 'note']);
      return { g, drop: score(ev).groups.find((x) => x.drop)! };
    };
    const a = run(['bell']);
    expect(a.g.volume).toBe(3);
    expect(a.g.sides.player.armed).toBe(false);
    expect(a.drop.mult / run([]).drop.mult).toBeCloseTo(2);
  });
});
