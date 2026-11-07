/**
 * The content batch (user, 2026-11-07): CUT, LEAN MACHINE, STEADY HANDS, PAIR STREAK and STICKY FINGERS. One test per
 * claim on each face (the audit_*.test.ts style), plus CUT's floor and its charmed-cell rule.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId, type SymbolId } from '../src/core/config';
import { CABINETS, type CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { CONTENT_1107, LEGENDARY, RELICS, RELIC_TIER, relicText, WAVE1 } from '../src/core/relics';
import { createRun, finishFight, startRelics, type RunState } from '../src/core/run';
import { applyOption, cutOptions, describeOption, draftOffers, reelCells, takenLabel } from '../src/core/draft';
import { fightConfig, HOLD } from '../src/core/fightSetup';
import { relicFits } from '../src/core/shop';
import { spoiledCells } from '../src/core/fightTricks';
import { ALL_CABINETS, CARD_COLS, cardFace, shortRelicText } from '../src/ui/run/cardText';
import { wrap } from '../src/ui/run/shared';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
const spinOf = (evs: CombatEvent[]) => ofType(evs, 'spin').find((e) => e.side === 'player')!;
const group = (evs: CombatEvent[], sym: SymbolId) => spinOf(evs).score.groups.find((g) => g.symbol === sym && g.matched)!;
const notes = (evs: CombatEvent[], sym: SymbolId) => group(evs, sym)?.notes ?? [];
const fired = (evs: CombatEvent[], r: RelicId) => !!spinOf(evs).score.relics?.includes(r);

/** A bare fight against a punching bag that spins nothing unless a test says so. */
function fight(relics: RelicId[], mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.seed = seed;
  c.relics = relics;
  c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }) };
  mut?.(c);
  return new Fight(c, seed);
}
/** Your spin on a forced payline, then the enemy's (empty) spin. */
function round(f: Fight, line: SymbolId[]): CombatEvent[] {
  f.forceNext('player', line);
  const ev = f.step().events;
  if (!f.over) f.step();
  return ev;
}
function run(cab: CabinetId, relics: RelicId[] = [], seed = 3): RunState {
  const r = createRun(base, seed, cab);
  r.pendingStart = null;
  r.player.relics = [...relics];
  return r;
}
const fits2 = (t: string) => wrap(t, CARD_COLS).length <= 2;

describe('the four relics: tiers, faces and offers', () => {
  const NEW: RelicId[] = ['lean', 'steadyhands', 'pairstreak', 'sticky'];
  it('LEAN MACHINE, STEADY HANDS and PAIR STREAK are uncommon, STICKY FINGERS common; none legendary', () => {
    for (const r of ['lean', 'steadyhands', 'pairstreak'] as RelicId[]) expect(RELIC_TIER.uncommon).toContain(r);
    expect(RELIC_TIER.common).toContain('sticky');
    for (const r of NEW) expect(LEGENDARY.has(r)).toBe(false);
  });
  it('their full texts, the same on every machine, and card faces of two lines', () => {
    expect(RELICS.lean.text).toBe('A REEL WITH 11 SYMBOLS OR FEWER: EACH OF ITS SYMBOLS IS WORTH X1.5');
    expect(RELICS.steadyhands.text).toBe('+1 HOLD A FIGHT. A JACKPOT YOU HELD FOR PAYS X2');
    expect(RELICS.pairstreak.text).toBe('EACH PAIR OF YOUR ATTACK SYMBOL IN A ROW PAYS +50% MORE THAN THE LAST, UP TO X2.5. A SPIN WITHOUT ONE RESETS IT');
    expect(RELICS.sticky.text).toBe('EACH SYMBOL OR REEL AN ENEMY SABOTAGES: +1 CHIP (MAX 5 A FIGHT)');
    for (const r of NEW)
      for (const cab of ALL_CABINETS) {
        expect(relicText(r, cab)).toBe(RELICS[r].text);
        expect(fits2(shortRelicText(r, relicText(r, cab)))).toBe(true);
      }
  });
  it('offered on every machine from the first fight (LEAN MACHINE too: it is the plan you draft toward)', () => {
    for (const cab of ALL_CABINETS) for (const r of NEW) expect(relicFits(run(cab), r)).toBe(true);
  });
  it('STICKY FINGERS is never a starting pick (an economy relic, like HOUSE TAX)', () => {
    expect(WAVE1.has('sticky')).toBe(true);
    for (let seed = 0; seed < 60; seed++) expect(startRelics(createRun(base, seed, ALL_CABINETS[seed % 5]))).not.toContain('sticky');
  });
});

// ---- CUT: REMOVE 1 [SYMBOL] FROM REEL [N] -------------------------------------------------------------------------

describe('CUT', () => {
  it('its face: CUT, REMOVE 1 SHIELD FROM REEL 2 (two lines at most)', () => {
    const o = { kind: 'remove', symbol: 'shield', reel: 1 } as const;
    expect(describeOption(o)).toEqual({ title: 'CUT', text: 'REMOVE 1 SHIELD FROM REEL 2' });
    expect(describeOption({ kind: 'remove', symbol: 'goldbar', reel: 0 }).text).toBe('REMOVE 1 CHIP FROM REEL 1');
    for (const cab of ALL_CABINETS) for (const symbol of CABINETS[cab].symbols) expect(fits2(cardFace({ kind: 'remove', symbol, reel: 2 }).text)).toBe(true);
    expect(takenLabel(o)).toBe('CUT 1 SHIELD (REEL 2)');
  });
  it('REMOVE 1: exactly one cell of that symbol leaves that reel, nothing else changes', () => {
    const r = run('knight');
    const before = r.player.strips.map((s) => ({ ...s }));
    applyOption(r, { kind: 'remove', symbol: 'shield', reel: 1 });
    expect(r.player.strips[1].shield).toBe((before[1].shield ?? 0) - 1);
    expect(r.player.strips[1].sword).toBe(before[1].sword);
    expect(r.player.strips[0]).toEqual(before[0]);
    expect(r.player.strips[2]).toEqual(before[2]);
  });
  it('ANY OF YOUR SYMBOLS, ANY REEL: every one of your machine\'s symbols on every reel is offered, nothing else', () => {
    for (const cab of ALL_CABINETS) {
      const opts = cutOptions(run(cab));
      for (const o of opts) if (o.kind === 'remove') expect(CABINETS[cab].symbols).toContain(o.symbol);
      expect(opts.length).toBe(3 * CABINETS[cab].symbols.length);
      expect(new Set(opts.map((o) => (o.kind === 'remove' ? o.reel : -1)))).toEqual(new Set([0, 1, 2]));
    }
  });
  it('plain cells only: never a charmed cell (all shields on a reel charmed: no CUT of a shield there)', () => {
    const r = run('knight');
    const n = r.player.strips[0].shield ?? 0;
    r.player.gilded.push({ reel: 0, symbol: 'shield', enh: 'gold', n });
    const opts = cutOptions(r);
    expect(opts.some((o) => o.kind === 'remove' && o.reel === 0 && o.symbol === 'shield')).toBe(false);
    expect(opts.some((o) => o.kind === 'remove' && o.reel === 1 && o.symbol === 'shield')).toBe(true);
    // A stale card (taken from an old offer) can't eat a Charm either.
    applyOption(r, { kind: 'remove', symbol: 'shield', reel: 0 });
    expect(r.player.strips[0].shield).toBe(n);
    expect(r.player.gilded.find((g) => g.reel === 0 && g.enh === 'gold')?.n).toBe(n);
    // With one plain shield left, the cut takes that one and the Charms stay.
    r.player.gilded[r.player.gilded.length - 1].n = n - 1;
    applyOption(r, { kind: 'remove', symbol: 'shield', reel: 0 });
    expect(r.player.strips[0].shield).toBe(n - 1);
    expect(r.player.gilded.find((g) => g.reel === 0 && g.enh === 'gold')?.n).toBe(n - 1);
  });
  it('a reel never goes below 6 cells: no CUT offered on a reel of 6, and a stale one does nothing', () => {
    expect(CONTENT_1107.cutFloor).toBe(6);
    const r = run('knight');
    r.player.strips[0] = { sword: 3, shield: 3 };
    r.player.strips[1] = { sword: 4, shield: 3 };
    const opts = cutOptions(r);
    expect(opts.some((o) => o.kind === 'remove' && o.reel === 0)).toBe(false);
    expect(opts.some((o) => o.kind === 'remove' && o.reel === 1)).toBe(true);
    applyOption(r, { kind: 'remove', symbol: 'sword', reel: 0 });
    expect(reelCells(r.player.strips[0])).toBe(6);
    applyOption(r, { kind: 'remove', symbol: 'sword', reel: 1 });
    expect(reelCells(r.player.strips[1])).toBe(6);
    // Every reel at the floor: no CUT anywhere, and the draft still deals 3 cards.
    r.player.strips = [{ sword: 3, shield: 3 }, { sword: 3, shield: 3 }, { sword: 3, shield: 3 }];
    expect(cutOptions(r)).toEqual([]);
    for (let d = 0; d < 6; d++) {
      r.depth = d;
      const offers = draftOffers(r);
      expect(offers.length).toBe(3);
      expect(offers.some((o) => o.kind === 'remove')).toBe(false);
    }
  });
  it('dealt about as often as a reel-edit card, not every draft', () => {
    let drafts = 0;
    let cuts = 0;
    let wilds = 0;
    for (let seed = 0; seed < 200; seed++) {
      const r = run(ALL_CABINETS[seed % 5], [], seed);
      for (let d = 0; d < 5; d++) {
        r.depth = d;
        const offers = draftOffers(r);
        drafts++;
        if (offers.some((o) => o.kind === 'remove')) cuts++;
        if (offers.some((o) => o.kind === 'swap' && o.to === 'wild')) wilds++;
      }
    }
    expect(cuts / drafts).toBeGreaterThan(0.1);
    expect(cuts / drafts).toBeLessThan(0.5);
    expect(Math.abs(cuts - wilds) / drafts).toBeLessThan(0.2);
  });
});

// ---- LEAN MACHINE: A REEL WITH 11 SYMBOLS OR FEWER: EACH OF ITS SYMBOLS IS WORTH X1.5 ----------------------------------------

describe('LEAN MACHINE', () => {
  const lean = (strips: GameConfig['player']['strips'], relics: RelicId[] = ['lean']) => fight(relics, (c) => (c.player.strips = strips));
  const r10 = { sword: 5, shield: 5 };
  const r11 = { sword: 6, shield: 5 };
  const r12 = { sword: 6, shield: 6 };
  it('a pair on two reels of 10 cells pays x1.5, and names itself (X1.5 LEAN)', () => {
    const on = round(lean([r10, r10, r12]), ['sword', 'sword', 'shield']);
    const off = round(lean([r10, r10, r12], []), ['sword', 'sword', 'shield']);
    expect(group(on, 'sword').amount).toBe(group(off, 'sword').amount * 1.5);
    expect(notes(on, 'sword')).toContain('X1.5 LEAN');
    expect(fired(on, 'lean')).toBe(true);
  });
  it('11 OR FEWER: a reel of 12 cells pays as usual, reels of 11 and 7 are lean', () => {
    const at12 = round(lean([r12, r12, r12]), ['sword', 'sword', 'shield']);
    expect(notes(at12, 'sword').some((n) => n.endsWith('LEAN'))).toBe(false);
    expect(fired(at12, 'lean')).toBe(false);
    const at11 = round(lean([r11, r11, r12]), ['sword', 'sword', 'shield']);
    expect(notes(at11, 'sword')).toContain('X1.5 LEAN');
    const at7 = round(lean([{ sword: 4, shield: 3 }, { sword: 4, shield: 3 }, r12]), ['sword', 'sword', 'shield']);
    expect(notes(at7, 'sword')).toContain('X1.5 LEAN');
  });
  it('ITS SYMBOLS: a pair across a lean reel and a full one pays for the lean cell only (X1.25 LEAN)', () => {
    const on = round(lean([r10, r12, r12]), ['sword', 'sword', 'shield']);
    const off = round(lean([r10, r12, r12], []), ['sword', 'sword', 'shield']);
    expect(group(on, 'sword').amount).toBe(group(off, 'sword').amount * 1.25);
    expect(notes(on, 'sword')).toContain('X1.25 LEAN');
  });
  it('ITS SYMBOLS: shields on a lean reel are worth x1.5 too, and a lone cell there', () => {
    const on = round(lean([r12, r12, r10]), ['sword', 'shield', 'shield']);
    const off = round(lean([r12, r12, r10], []), ['sword', 'shield', 'shield']);
    // (reels 2 and 3 aren't a pair: pairs start on reel 1. The lone shield on reel 3 is the lean one.)
    const sh = (ev: CombatEvent[]) => spinOf(ev).score.groups.find((g) => g.symbol === 'shield' && g.reels.includes(2))!;
    expect(sh(on).amount).toBe(sh(off).amount * 1.5);
  });
  it('counted as you built the reel: rocks an enemy adds mid-fight do not switch it off', () => {
    const f = lean([r10, r10, r12]);
    f.sides.player.reels[0].cells.push({ symbol: 'rock', slimed: false }, { symbol: 'rock', slimed: false });
    expect(notes(round(f, ['sword', 'sword', 'shield']), 'sword')).toContain('X1.5 LEAN');
  });
});

// ---- STEADY HANDS: +1 HOLD A FIGHT. A JACKPOT YOU HELD FOR PAYS X2 -------------------------------------------------

describe('STEADY HANDS', () => {
  it('+1 HOLD A FIGHT: a run fight gives 3 HOLDs with it, 2 without', () => {
    expect(fightConfig(run('knight', ['steadyhands']), base).player.holds).toBe(HOLD.perFight + 1);
    expect(fightConfig(run('knight'), base).player.holds).toBe(HOLD.perFight);
    expect(new Fight(fightConfig(run('knight', ['steadyhands']), base), 1).holdsLeft).toBe(3);
  });
  const held = (relics: RelicId[], hold: number[], line: SymbolId[]) => {
    const f = fight(relics, (c) => (c.player.holds = 3));
    round(f, ['sword', 'sword', 'shield']);
    for (const r of hold) expect(f.hold(r)).toBe(true);
    return round(f, line);
  };
  it('A JACKPOT YOU HELD FOR PAYS X2 (named X2 STEADY HANDS)', () => {
    const on = held(['steadyhands'], [0, 1], ['sword', 'sword', 'sword']);
    const off = held([], [0, 1], ['sword', 'sword', 'sword']);
    expect(group(on, 'sword').reels.length).toBe(3);
    expect(group(on, 'sword').amount).toBe(group(off, 'sword').amount * 2);
    expect(notes(on, 'sword')).toContain('X2 STEADY HANDS');
    expect(fired(on, 'steadyhands')).toBe(true);
  });
  it('one held reel is enough; a jackpot you did not hold for, or a held pair, pays as usual', () => {
    expect(notes(held(['steadyhands'], [0], ['sword', 'sword', 'sword']), 'sword')).toContain('X2 STEADY HANDS');
    const free = fight(['steadyhands'], (c) => (c.player.holds = 3));
    round(free, ['sword', 'sword', 'shield']);
    expect(notes(round(free, ['sword', 'sword', 'sword']), 'sword')).not.toContain('X2 STEADY HANDS');
    expect(notes(held(['steadyhands'], [0, 1], ['sword', 'sword', 'shield']), 'sword')).not.toContain('X2 STEADY HANDS');
  });
});

// ---- PAIR STREAK: EACH PAIR OF YOUR ATTACK SYMBOL IN A ROW PAYS +50% MORE THAN THE LAST, UP TO X2.5. A SPIN WITHOUT ONE RESETS IT ------

describe('PAIR STREAK', () => {
  const P: SymbolId[] = ['sword', 'sword', 'shield'];
  const J: SymbolId[] = ['sword', 'sword', 'sword'];
  const DEAD: SymbolId[] = ['shield', 'sword', 'shield'];
  /** The pay ratio and note of each spin, against the same spins without the relic. */
  const streak = (lines: SymbolId[][]) => {
    const on = fight(['pairstreak']);
    const off = fight([]);
    return lines.map((l) => {
      const a = round(on, l);
      const b = round(off, l);
      const g = group(a, 'sword');
      return g?.reels.length >= 2 ? { k: g.amount / group(b, 'sword').amount, note: (g.notes ?? []).find((n) => n.endsWith('PAIR STREAK')) } : null;
    });
  };
  it('the first pays as usual, each pair in a row +50% more than the last, up to x2.5', () => {
    const s = streak([P, P, P, P, P]);
    expect(s.map((x) => x?.k)).toEqual([1, 1.5, 2, 2.5, 2.5]);
    expect(s.map((x) => x?.note)).toEqual([undefined, 'X1.5 PAIR STREAK', 'X2 PAIR STREAK', 'X2.5 PAIR STREAK', 'X2.5 PAIR STREAK']);
  });
  it('a jackpot counts as a pair', () => {
    expect(streak([P, J, P]).map((x) => x?.k)).toEqual([1, 1.5, 2]);
  });
  it('A SPIN WITHOUT A PAIR RESETS IT (a shield pair is no attack pair: it resets too)', () => {
    expect(streak([P, P, DEAD, P]).map((x) => x?.k)).toEqual([1, 1.5, undefined, 1]);
    expect(streak([P, P, ['shield', 'shield', 'sword'], P]).map((x) => x?.k)).toEqual([1, 1.5, undefined, 1]);
  });
  it('per fight: a new fight starts the streak over', () => {
    const f = fight(['pairstreak']);
    round(f, P);
    round(f, P);
    expect(f.pairStreak).toBe(2);
    expect(fight(['pairstreak']).pairStreak).toBe(0);
  });
});

// ---- STICKY FINGERS: EACH SYMBOL OR REEL AN ENEMY SABOTAGES: +1 CHIP (MAX 5 A FIGHT) -------------------------------

describe('STICKY FINGERS', () => {
  /** The enemy spins this line once (a slime pair slimes 4 of your cells, a jackpot 9). */
  const slimed = (relics: RelicId[], lines: SymbolId[][]) => {
    const f = fight(relics, (c) => (c.enemy = { hp: 1e9, strips: reels3({ slime: 6, empty: 6 }) }));
    const evs: CombatEvent[] = [];
    for (const l of lines) {
      f.next = 'enemy';
      f.forceNext('enemy', l);
      evs.push(...f.step().events);
    }
    return { f, evs };
  };
  it('EACH SYMBOL AN ENEMY SABOTAGES: +1 CHIP (a slime pair spoils 4 cells: 4 chips), shown as it lands', () => {
    const { f, evs } = slimed(['sticky'], [['slime', 'slime', 'empty']]);
    const cells = ofType(evs, 'slime')[0].cells.length;
    expect(cells).toBe(4);
    expect(f.stickyChips).toBe(4);
    const chip = ofType(evs, 'stickyChips');
    expect(chip.map((e) => e.amount)).toEqual([4]);
    expect(ofType(evs, 'relic').some((e) => e.relic === 'sticky')).toBe(true);
    // Right after the slime, not at the end of the turn.
    expect(evs.indexOf(chip[0])).toBe(evs.indexOf(ofType(evs, 'slime')[0]) + 2);
    expect(slimed([], [['slime', 'slime', 'empty']]).f.stickyChips).toBe(0);
  });
  it('MAX 5 A FIGHT', () => {
    const { f, evs } = slimed(['sticky'], [['slime', 'slime', 'slime'], ['slime', 'slime', 'empty']]);
    expect(f.stickyChips).toBe(5);
    expect(ofType(evs, 'stickyChips').map((e) => e.amount)).toEqual([5]);
  });
  it('the chips are yours when you win (on the RESULTS line too)', () => {
    const play = (relics: RelicId[]) => {
      const r = run('knight', relics, 9);
      r.player.chips = 0;
      const cfg = fightConfig(r, base);
      cfg.enemy = { hp: 1e9, strips: reels3({ slime: 6, empty: 6 }) };
      const f = new Fight(cfg, 3);
      f.next = 'enemy';
      f.forceNext('enemy', ['slime', 'slime', 'empty']);
      f.step();
      f.winner = 'player';
      const rec = finishFight(r, f);
      return { chips: r.player.chips, line: rec.chips ?? 0 };
    };
    const a = play(['sticky']);
    const b = play([]);
    expect(a.chips - b.chips).toBe(4);
    expect(a.line - b.line).toBe(4);
  });
  it('what counts: cells spilled, stolen, rocked, IOUs, marked, faked, confiscated; reels frozen, jammed, jinxed', () => {
    const cells = [{ reel: 0, index: 1 }, { reel: 1, index: 2 }];
    const at = { from: 'enemy' as const, to: 'player' as const, reels: [] as number[] };
    const ev: CombatEvent[] = [
      { type: 'slime', ...at, amount: 2, cells, wasted: 0 },
      { type: 'steal', ...at, cells, symbols: ['sword', 'sword'], wasted: 0 },
      { type: 'junk', ...at, inserts: cells },
      { type: 'bomb', ...at, cells },
      { type: 'mark', ...at, cells },
      { type: 'fake', ...at, cells, turns: 2, enhs: ['gold'] },
      { type: 'confiscate', ...at, cells, enhs: ['gold'] },
      { type: 'freeze', ...at, targets: [0, 2], turns: 1, stops: [0, 0] },
      { type: 'lock', ...at, targets: [0, 2], turns: 1 },
      { type: 'hex', ...at, targets: [0, 2], turns: 2 },
    ];
    for (const e of ev) expect(spoiledCells(e)).toBe(2);
    // Not: the rake, THE DEALER's BUST card, THE WHEEL's bets, your own writes on the enemy.
    expect(spoiledCells({ type: 'rake', ...at, turns: 2, cut: 10 })).toBe(0);
    expect(spoiledCells({ type: 'lineCard', side: 'player', reel: 0, card: 'bust' })).toBe(0);
    expect(spoiledCells({ type: 'betPlaced', side: 'player', reels: [0], bets: [1, 0, 0], left: 3, per: 10 })).toBe(0);
    expect(spoiledCells({ type: 'slime', from: 'player', to: 'enemy', reels: [], amount: 2, cells, wasted: 0 })).toBe(0);
  });
});
