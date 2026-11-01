/**
 * Pre-launch audit, relic group B: each relic's text (full and card face, per machine) against what the engine does.
 * The claims the code broke were fixed on 2026-11-01 (code or text); a question still open for the user is an
 * `it.skip('OPEN CALL: ...')`.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type GameConfig, type RelicId, type SymbolId } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { LEGEND_RELIC, LEGENDARY, NEW_RELIC, relicText, RELICS } from '../src/core/relics';
import { ALL_CABINETS, shortRelicText } from '../src/ui/run/cardText';
import {
  applyOption,
  chooseRoute,
  createRun,
  currentStop,
  describeOption,
  encounterChoices,
  fightConfig,
  finishFight,
  playEncounter,
  relicFits,
  shopOffers,
  skipToBoss,
  type RunState,
} from '../src/core/run';
import { bjState, BJ, CLAW, HILO, hiloState } from '../src/core/encounters';
import { STAKE } from '../src/core/stakes';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) => events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
const spinOf = (events: CombatEvent[]) => ofType(events, 'spin')[0];
const groupOf = (events: CombatEvent[], sym: SymbolId, reel?: number) => spinOf(events).score.groups.find((g) => g.symbol === sym && (reel === undefined || g.reels.includes(reel)))!;

/** A bare fight (no machine): the enemy spins nothing that does anything unless a test says so. */
function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.seed = seed;
  c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }) };
  mut(c);
  return new Fight(c, seed);
}
/** One player spin on a forced payline (optionally after some setup spins). */
function playerSpin(mut: (c: GameConfig) => void, line: SymbolId[], seed = 7): CombatEvent[] {
  const f = fight(mut, seed);
  f.forceNext('player', line);
  return f.step().events;
}
function run(cab: CabinetId, relics: RelicId[], seed = 3): RunState {
  const r = createRun(base, seed, cab);
  r.pendingStart = null;
  r.player.relics = [...relics];
  return r;
}
function win(r: RunState): ReturnType<typeof finishFight> {
  const f = new Fight(fightConfig(r, base), 1);
  f.winner = 'player';
  return finishFight(r, f);
}
/** Every machine this relic can show on (its exclusions and machine lock respected). */
const machinesFor = (id: RelicId): CabinetId[] =>
  ALL_CABINETS.filter((cab) => {
    const r = run(cab, []);
    // (Build enablers aside from the meter don't apply to this group.)
    return relicFits(r, id);
  });

const LIST: RelicId[] = ['hotstreak', 'pitboss', 'bash', 'dryspell', 'punchcard', 'goldenspin', 'insurance', 'housetax', 'regular', 'secondline', 'devilsdue', 'longgame', 'glasscannon', 'quickening'];

describe('audit B: texts per machine', () => {
  it('each relic shows on the machines it should, and its full and card texts are what this audit checked', () => {
    const where: Record<string, CabinetId[]> = {};
    for (const id of LIST) where[id] = machinesFor(id);
    expect(where.bash).toEqual(['knight', 'midas', 'jukebox']);
    expect(where.quickening).toEqual(['midas', 'tesla', 'joker', 'jukebox']);
    for (const id of LIST.filter((x) => x !== 'bash' && x !== 'quickening')) expect(where[id]).toEqual(ALL_CABINETS);
    // Only QUICKENING has a machine-specific wording in this group (YOUR METER); the rest read the same everywhere.
    for (const id of LIST.filter((x) => x !== 'quickening')) for (const cab of where[id]) expect(relicText(id, cab)).toBe(RELICS[id].text);
    expect(relicText('quickening', 'tesla')).toBe('YOUR LIGHTNING STARTS EVERY FIGHT HALF FULL. ENEMY ABILITIES CHARGE 1 SPIN FASTER');
    expect(relicText('quickening', 'midas')).toBe('YOUR HIGH ROLLER STARTS EVERY FIGHT HALF FULL. ENEMY ABILITIES CHARGE 1 SPIN FASTER');
    expect(relicText('quickening', 'joker')).toBe('YOUR JACKPOT METER STARTS EVERY FIGHT HALF FULL. ENEMY ABILITIES CHARGE 1 SPIN FASTER');
    expect(relicText('quickening', 'jukebox')).toBe('YOUR VOLUME STARTS EVERY FIGHT HALF FULL. ENEMY ABILITIES CHARGE 1 SPIN FASTER');
    const face = (id: RelicId, cab: CabinetId) => shortRelicText(id, relicText(id, cab));
    expect(face('quickening', 'tesla')).toBe('LIGHTNING STARTS AT HALF. ENEMIES FASTER');
    expect(face('quickening', 'midas')).toBe('HIGH ROLLER STARTS AT HALF. ENEMIES FASTER');
    expect(face('quickening', 'joker')).toBe('METER STARTS AT HALF. ENEMIES FASTER');
    expect(face('quickening', 'jukebox')).toBe('VOLUME STARTS AT HALF. ENEMIES FASTER');
    // The numbers the texts print are the engine's.
    expect(RELICS.secondline.text).toContain('15% HARDER');
    expect(RELICS.devilsdue.text).toBe("EVERYTHING PAYS X1.75. -8% MAX HP AFTER EVERY FIGHT YOU WIN");
    expect(RELICS.longgame.text).toBe('EVERYTHING PAYS 20% LESS, +3% FOR EVERY FIGHT YOU WIN');
    expect(RELICS.glasscannon.text).toBe("EVERYTHING PAYS X1.5. NO HEALING BETWEEN FIGHTS (BEATING AN ACT'S BOSS STILL HEALS YOU)");
    expect(NEW_RELIC.taxChips).toBe(5);
    expect(NEW_RELIC.punchEvery).toBe(6);
    expect(NEW_RELIC.insuranceShield).toBe(100);
    expect(NEW_RELIC.goldenChance).toBe(0.1);
    expect(NEW_RELIC.goldenMul).toBe(3);
    expect(NEW_RELIC.regularPlays).toBe(2);
    expect(1 + NEW_RELIC.dryStep).toBe(1.5);
    expect(1 + NEW_RELIC.dryStep * NEW_RELIC.dryMax).toBe(4);
  });
});

// ---- HOT STREAK: AFTER A JACKPOT, YOUR NEXT SPIN PAYS X2 -----------------------------------------------------------

describe('HOT STREAK', () => {
  const strips = reels3({ sword: 6, shield: 6 });
  /** A forced jackpot, the enemy's (empty) turn, then `line`. */
  const after = (relics: RelicId[], first: SymbolId[], line: SymbolId[]) => {
    const f = fight((c) => {
      c.relics = relics;
      c.player.strips = strips;
    });
    f.forceNext('player', first);
    f.step();
    f.step();
    f.forceNext('player', line);
    return f.step().events;
  };
  const JACK: SymbolId[] = ['sword', 'sword', 'sword'];
  const PAIR: SymbolId[] = ['sword', 'sword', 'shield'];
  const NONE: SymbolId[] = ['sword', 'shield', 'sword'];

  it('after a jackpot, the next spin\'s pair and jackpot pay x2', () => {
    expect(groupOf(after(['hotstreak'], JACK, PAIR), 'sword').amount).toBe(2 * groupOf(after([], JACK, PAIR), 'sword').amount);
    expect(groupOf(after(['hotstreak'], JACK, JACK), 'sword').amount).toBe(2 * groupOf(after([], JACK, JACK), 'sword').amount);
  });
  it('only the NEXT spin: a pair after a non-jackpot spin pays normally', () => {
    expect(groupOf(after(['hotstreak'], PAIR, PAIR), 'sword').amount).toBe(groupOf(after([], PAIR, PAIR), 'sword').amount);
    // jackpot, then a pair (doubled), then another pair: not doubled.
    const f = fight((c) => {
      c.relics = ['hotstreak'];
      c.player.strips = strips;
    });
    f.forceNext('player', JACK);
    f.step();
    f.step();
    f.forceNext('player', PAIR);
    f.step();
    f.step();
    f.forceNext('player', PAIR);
    expect(groupOf(f.step().events, 'sword').amount).toBe(groupOf(after([], PAIR, PAIR), 'sword').amount);
  });
  it('jackpot after jackpot keeps it going', () => {
    const f = fight((c) => {
      c.relics = ['hotstreak'];
      c.player.strips = strips;
    });
    for (let i = 0; i < 2; i++) {
      f.forceNext('player', JACK);
      f.step();
      f.step();
    }
    f.forceNext('player', PAIR);
    expect(groupOf(f.step().events, 'sword').amount).toBe(2 * groupOf(after([], PAIR, PAIR), 'sword').amount);
  });
  // The text says the next spin's PAIRS AND JACKPOTS (2026-11-01): its singles pay x1.
  it("the text names the next spin's pairs and jackpots; singles on the hot spin pay x1", () => {
    expect(RELICS.hotstreak.text).toBe("AFTER A JACKPOT, YOUR NEXT SPIN'S PAIRS AND JACKPOTS PAY X2");
    expect(groupOf(after(['hotstreak'], JACK, NONE), 'sword', 0).amount).toBe(groupOf(after([], JACK, NONE), 'sword', 0).amount);
  });
});

// ---- PIT BOSS: THE ENEMY'S FIRST JACKPOT EACH FIGHT DOESN'T COUNT ---------------------------------------------------

describe('PIT BOSS', () => {
  const enemyJackpots = (relics: RelicId[], sym: SymbolId, n: number) => {
    const f = fight((c) => {
      c.relics = relics;
      c.enemy = { hp: 1e9, strips: reels3({ [sym]: 12 }) };
      c.player.strips = reels3({ sword: 12 });
    });
    const out: CombatEvent[][] = [];
    for (let i = 0; i < n; i++) {
      f.next = 'enemy';
      f.forceNext('enemy', [sym, sym, sym]);
      out.push(f.step().events);
    }
    return { f, out };
  };
  const dealt = (ev: CombatEvent[]) => ofType(ev, 'attack').filter((a) => a.from === 'enemy').reduce((t, a) => t + a.amount, 0);

  it('the first enemy jackpot does nothing; the second hits in full (once per fight)', () => {
    const { out } = enemyJackpots(['pitboss'], 'sword', 2);
    const plain = enemyJackpots([], 'sword', 1).out[0];
    expect(dealt(plain)).toBeGreaterThan(0);
    expect(dealt(out[0])).toBe(0);
    expect(ofType(out[0], 'relic').some((e) => e.relic === 'pitboss')).toBe(true);
    expect(dealt(out[1])).toBe(dealt(plain));
    expect(ofType(out[1], 'relic').some((e) => e.relic === 'pitboss')).toBe(false);
  });
  it('an enemy pair does not use it up', () => {
    const f = fight((c) => {
      c.relics = ['pitboss'];
      c.enemy = { hp: 1e9, strips: reels3({ sword: 6, empty: 6 }) };
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'empty']);
    expect(dealt(f.step().events)).toBeGreaterThan(0);
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    expect(dealt(f.step().events)).toBe(0);
  });
  it('each fight gets its own (a new fight voids its first jackpot again)', () => {
    expect(dealt(enemyJackpots(['pitboss'], 'sword', 1).out[0])).toBe(0);
    expect(dealt(enemyJackpots(['pitboss'], 'sword', 1).out[0])).toBe(0);
  });
  // A voided jackpot of a WRITER symbol writes nothing either (fixed 2026-11-01: it froze / stole / planted a single's worth).
  it("a voided ICE jackpot freezes nothing", () => {
    const { f } = enemyJackpots(['pitboss'], 'ice', 1);
    expect(f.sides.player.frozen.reduce((a, b) => a + b, 0)).toBe(0);
  });
  it('a voided ICE / CLAW / BOMB jackpot freezes / steals / plants nothing', () => {
    const ice = enemyJackpots(['pitboss'], 'ice', 1);
    expect(ofType(ice.out[0], 'relic').some((e) => e.relic === 'pitboss')).toBe(true);
    expect(ice.f.sides.player.frozen.filter((t) => t > 0).length).toBe(0);
    const claw = enemyJackpots(['pitboss'], 'claw', 1).out[0];
    expect(ofType(claw, 'steal').reduce((a, e) => a + e.cells.length, 0)).toBe(0);
    const bomb = enemyJackpots(['pitboss'], 'bomb', 1).out[0];
    expect(ofType(bomb, 'bomb').reduce((a, e) => a + e.cells.length, 0)).toBe(0);
    // (Without PIT BOSS the jackpot writes its full size.)
    expect(ofType(enemyJackpots([], 'claw', 1).out[0], 'steal').reduce((a, e) => a + e.cells.length, 0)).toBe(3);
  });
});

// ---- SHIELD BASH: LEFTOVER SHIELD EACH SPIN HITS THE ENEMY ---------------------------------------------------------

describe('SHIELD BASH', () => {
  for (const cab of ['knight', 'midas', 'jukebox'] as CabinetId[]) {
    it(`${cab}: the shield left at the start of your next spin hits the enemy for all of it`, () => {
      const r = run(cab, ['bash']);
      const cfg = fightConfig(r, base);
      cfg.player.strips = reels3({ shield: 6, empty: 6 });
      cfg.enemy = { hp: 1e6, strips: reels3({ empty: 12 }) };
      const f = new Fight(cfg, 7);
      f.forceNext('player', ['shield', 'shield', 'shield']);
      f.step();
      const held = f.sides.player.shield;
      expect(held).toBeGreaterThan(0);
      f.step();
      const hp0 = f.sides.enemy.hp;
      f.forceNext('player', ['empty', 'empty', 'empty']);
      const ev = f.step().events;
      const bash = ofType(ev, 'attack').find((a) => a.from === 'player');
      expect(ofType(ev, 'relic').some((e) => e.relic === 'bash')).toBe(true);
      // (Rounded to 10s, like every hit: 144 held hits for 140.)
      expect(bash?.amount).toBe(Math.round(held / UNIT) * UNIT);
      expect(hp0 - f.sides.enemy.hp).toBe(bash?.amount);
    });
  }
  it('shield the enemy spent is not leftover (it bashes for what is left)', () => {
    const f = fight((c) => {
      c.relics = ['bash'];
      c.player.strips = reels3({ shield: 6, empty: 6 });
      c.enemy = { hp: 1e6, strips: reels3({ sword: 6, empty: 6 }) };
    });
    f.forceNext('player', ['shield', 'shield', 'shield']);
    f.step();
    const held = f.sides.player.shield;
    f.forceNext('enemy', ['sword', 'sword', 'empty']);
    f.step();
    const left = f.sides.player.shield;
    expect(left).toBeLessThan(held);
    f.forceNext('player', ['empty', 'empty', 'empty']);
    const bash = ofType(f.step().events, 'attack').find((a) => a.from === 'player');
    expect(bash?.amount).toBe(left);
  });
  it('no shield, no bash', () => {
    const f = fight((c) => {
      c.relics = ['bash'];
      c.player.strips = reels3({ empty: 12 });
    });
    f.step();
    f.step();
    expect(ofType(f.step().events, 'relic').some((e) => e.relic === 'bash')).toBe(false);
  });
});

// ---- DRY SPELL: EACH SPIN WITH NO PAIR: YOUR NEXT PAIR OR JACKPOT PAYS +50% (STACKS TO X4) ------------------------

describe('DRY SPELL', () => {
  const strips = reels3({ sword: 6, shield: 6 });
  const PAIR: SymbolId[] = ['sword', 'sword', 'shield'];
  const DRY: SymbolId[] = ['sword', 'shield', 'sword'];
  const afterDry = (relics: RelicId[], dry: number, line: SymbolId[]) => {
    const f = fight((c) => {
      c.relics = relics;
      c.player.strips = strips;
    });
    for (let i = 0; i < dry; i++) {
      f.forceNext('player', DRY);
      f.step();
      f.step();
    }
    f.forceNext('player', line);
    return { f, ev: f.step().events };
  };
  const pair0 = groupOf(afterDry([], 0, PAIR).ev, 'sword').amount;
  const jack0 = groupOf(afterDry([], 0, ['sword', 'sword', 'sword']).ev, 'sword').amount;

  it('+50% per dry spin on the next pair or jackpot', () => {
    expect(groupOf(afterDry(['dryspell'], 0, PAIR).ev, 'sword').amount).toBe(pair0);
    expect(groupOf(afterDry(['dryspell'], 1, PAIR).ev, 'sword').amount).toBe(pair0 * 1.5);
    expect(groupOf(afterDry(['dryspell'], 2, PAIR).ev, 'sword').amount).toBe(pair0 * 2);
    expect(groupOf(afterDry(['dryspell'], 1, ['sword', 'sword', 'sword']).ev, 'sword').amount).toBe(jack0 * 1.5);
  });
  it('stacks to x4 (6 dry spins) and no further', () => {
    expect(groupOf(afterDry(['dryspell'], 6, PAIR).ev, 'sword').amount).toBe(pair0 * 4);
    expect(groupOf(afterDry(['dryspell'], 9, PAIR).ev, 'sword').amount).toBe(pair0 * 4);
  });
  it('the pair spends the stacks; singles on a dry spin get nothing', () => {
    const { f, ev } = afterDry(['dryspell'], 3, PAIR);
    expect(f.drySpell).toBe(0);
    expect(groupOf(ev, 'sword').amount).toBe(pair0 * 2.5);
    const single = afterDry(['dryspell'], 3, DRY).ev;
    expect(groupOf(single, 'sword', 0).amount).toBe(groupOf(afterDry([], 3, DRY).ev, 'sword', 0).amount);
  });
});

// ---- PUNCH CARD: EVERY 6TH FIGHT YOU WIN: PICK A LEGENDARY RELIC ---------------------------------------------------

describe('PUNCH CARD', () => {
  it('wins 1-5 give nothing; the 6th gives a pick of legendaries that fit; then it counts again', () => {
    const r = run('tesla', ['punchcard'], 41);
    for (let i = 1; i <= 5; i++) {
      r.depth = 0;
      win(r);
      expect(r.punches).toBe(i);
      expect(r.pendingLegend).toBeNull();
    }
    r.depth = 0;
    win(r);
    expect(r.punches).toBe(0);
    expect(r.pendingLegend!.length).toBe(3);
    for (const p of r.pendingLegend!) {
      expect(LEGENDARY.has(p)).toBe(true);
      expect(relicFits(r, p)).toBe(true);
    }
  });
  it('a lost fight is not punched', () => {
    const r = run('knight', ['punchcard'], 41);
    r.punches = 5;
    const f = new Fight(fightConfig(r, base), 1);
    f.winner = 'enemy';
    finishFight(r, f);
    expect(r.punches).toBe(5);
    expect(r.pendingLegend).toBeNull();
  });
  it('a 6th win that is also an act boss queues both picks', () => {
    const r = run('knight', ['punchcard'], 41);
    skipToBoss(r);
    r.punches = 5;
    win(r);
    expect(r.pendingLegend!.length).toBe(3);
    expect(r.legendQueue?.length).toBe(1);
  });
});

// ---- GOLDEN SPIN: 1 SPIN IN 10 IS GOLDEN: EVERYTHING PAYS X3 -------------------------------------------------------

describe('GOLDEN SPIN', () => {
  const LINE: SymbolId[] = ['sword', 'sword', 'shield'];
  const strips = reels3({ sword: 6, shield: 6 });
  it('about 1 player spin in 10 is golden', () => {
    let golden = 0;
    let spins = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const f = fight((c) => {
        c.relics = ['goldenspin'];
        c.player.strips = strips;
      }, seed);
      for (let i = 0; i < 20; i++) {
        const { side, events } = f.step();
        if (side !== 'player') continue;
        spins++;
        if (spinOf(events).score.relics?.includes('goldenspin')) golden++;
      }
    }
    expect(golden / spins).toBeGreaterThan(0.08);
    expect(golden / spins).toBeLessThan(0.12);
  });
  it('a golden spin pays every group x3 (the pair AND the single)', () => {
    const plain = playerSpin((c) => (c.player.strips = strips), LINE);
    let found = false;
    for (let seed = 1; seed < 400 && !found; seed++) {
      const ev = playerSpin((c) => {
        c.relics = ['goldenspin'];
        c.player.strips = strips;
      }, LINE, seed);
      if (!spinOf(ev).score.relics?.includes('goldenspin')) {
        expect(groupOf(ev, 'sword').amount).toBe(groupOf(plain, 'sword').amount);
        continue;
      }
      found = true;
      expect(groupOf(ev, 'sword').amount).toBe(3 * groupOf(plain, 'sword').amount);
      expect(groupOf(ev, 'shield').amount).toBe(3 * groupOf(plain, 'shield').amount);
    }
    expect(found).toBe(true);
  });
  it('never on the enemy', () => {
    const f = fight((c) => {
      c.relics = ['goldenspin'];
      c.enemy = { hp: 1e9, strips: reels3({ sword: 12 }) };
    });
    for (let i = 0; i < 60 && !f.over; i++) {
      f.sides.player.hp = f.sides.player.maxHp;
      const { side, events } = f.step();
      if (side === 'enemy') expect(spinOf(events)?.score.relics ?? []).not.toContain('goldenspin');
    }
  });
});

// ---- INSURANCE POLICY: THE FIRST TIME EACH FIGHT YOU DROP UNDER 25% HP: GAIN 100 SHIELD -----------------------------

describe('INSURANCE POLICY', () => {
  const setup = (relics: RelicId[], hpShare: number) => {
    const f = fight((c) => {
      c.relics = relics;
      c.player.strips = reels3({ empty: 12 });
      c.enemy = { hp: 1e9, strips: reels3({ sword: 6, empty: 6 }) };
    });
    const p = f.sides.player;
    p.hp = Math.round(p.maxHp * hpShare);
    return f;
  };
  const enemyPair = (f: Fight) => {
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'empty']);
    return f.step().events;
  };
  const gains = (ev: CombatEvent[]) => ofType(ev, 'shieldGain').filter((e) => e.source === 'insurance');

  it('dropping under 25% gains 100 shield, once a fight', () => {
    const f = setup(['insurance'], 0.4);
    const p = f.sides.player;
    let fired = 0;
    for (let i = 0; i < 4 && p.hp > 0; i++) {
      const before = p.hp;
      const ev = enemyPair(f);
      const g = gains(ev);
      if (g.length) {
        expect(before).toBeGreaterThanOrEqual(p.maxHp * 0.25);
        expect(p.hp).toBeLessThan(p.maxHp * 0.25);
        expect(g[0].amount).toBe(100);
      }
      fired += g.length;
    }
    expect(fired).toBe(1);
  });
  it('a hit that leaves you at 25% or more does nothing', () => {
    const f = setup(['insurance'], 1);
    expect(gains(enemyPair(f))).toHaveLength(0);
  });
  // The shield lands on the ENEMY's turn, so it skips your next turn-start reset and blocks their next spin (fixed
  // 2026-11-01: it was wiped before the enemy spun again).
  it('the 100 shield is still up when the enemy next spins', () => {
    const f = setup(['insurance'], 0.4);
    while (!gains(enemyPair(f)).length);
    f.forceNext('player', ['empty', 'empty', 'empty']);
    f.step();
    expect(f.sides.player.shield).toBeGreaterThanOrEqual(100);
  });
  it('it survives one reset only: the turn after, it resets like any shield', () => {
    const f = setup(['insurance'], 0.4);
    let guard = 0;
    while (!gains(enemyPair(f)).length && guard++ < 5);
    expect(f.sides.player.shield).toBe(100);
    f.forceNext('player', ['empty', 'empty', 'empty']);
    const ev = f.step().events;
    expect(ofType(ev, 'shieldReset').find((e) => e.side === 'player')?.lost ?? 0).toBe(0);
    expect(f.sides.player.shield).toBe(100);
    // The enemy's spin (no hit), then your next turn start: gone.
    f.forceNext('enemy', ['empty', 'empty', 'empty']);
    f.step();
    f.forceNext('player', ['empty', 'empty', 'empty']);
    f.step();
    expect(f.sides.player.shield).toBe(0);
  });
});

// ---- HOUSE TAX: EVERY ENEMY JACKPOT PAYS YOU 5 CHIPS ----------------------------------------------------------------

describe('HOUSE TAX', () => {
  it('5 chips per enemy jackpot (not pairs), banked when you win', () => {
    const play = (relics: RelicId[]) => {
      const r = run('knight', relics, 9);
      r.player.chips = 0;
      const cfg = fightConfig(r, base);
      cfg.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
      const f = new Fight(cfg, 3);
      for (const line of [['shield', 'shield', 'shield'], ['shield', 'shield', 'shield'], ['shield', 'shield', 'shield']] as SymbolId[][]) {
        f.next = 'enemy';
        f.forceNext('enemy', line);
        f.step();
      }
      f.winner = 'player';
      finishFight(r, f);
      return { f, chips: r.player.chips };
    };
    const taxed = play(['housetax']);
    const plain = play([]);
    expect(taxed.f.taxChips).toBe(15);
    expect(plain.f.taxChips).toBe(0);
    expect(taxed.chips - plain.chips).toBeGreaterThanOrEqual(15);
    const f = fight((c) => {
      c.relics = ['housetax'];
      c.enemy = { hp: 1e9, strips: reels3({ shield: 6, empty: 6 }) };
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['shield', 'shield', 'empty']);
    f.step();
    expect(f.taxChips).toBe(0);
  });
  it('UNCLEAR: with PIT BOSS, the voided jackpot pays no tax', () => {
    const f = fight((c) => {
      c.relics = ['housetax', 'pitboss'];
      c.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['shield', 'shield', 'shield']);
    f.step();
    expect(f.taxChips).toBe(0);
  });
});

// ---- REGULAR: ENCOUNTER GAMES GIVE YOU TWO MORE PLAYS ---------------------------------------------------------------

describe('REGULAR', () => {
  const atGame = (id: string, relics: RelicId[]) => {
    const r = createRun(base, 2, 'knight');
    r.pendingStart = null;
    r.map.routes[0][0] = { kind: 'encounter', encounter: id };
    r.depth = 1;
    r.stop = 1;
    chooseRoute(r, 0);
    r.player.chips = 500;
    r.player.relics = [...relics];
    return r;
  };
  it('TWENTY-ONE: 3 hands, 5 with REGULAR', () => {
    const hands = (relics: RelicId[]) => {
      const r = atGame('bj', relics);
      let n = 0;
      for (let g = 0; g < 200 && currentStop(r)?.encounter === 'bj'; g++) {
        const res = playEncounter(r, bjState(r) ? 1 : 0, 1);
        if (res?.hand && res.hand.outcome !== 'push') n++;
      }
      return n;
    };
    expect(hands([])).toBe(BJ.hands);
    expect(hands(['regular'])).toBe(BJ.hands + 2);
  });
  it('HIGHER OR LOWER: 1 game, 3 with REGULAR', () => {
    const games = (relics: RelicId[]) => {
      const r = atGame('hilo', relics);
      let n = 0;
      for (let g = 0; g < 500 && currentStop(r)?.encounter === 'hilo'; g++) {
        const st = hiloState(r);
        if (!st) {
          n++;
          playEncounter(r, 0, 1);
        } else playEncounter(r, st.card < 8 ? 0 : 1, 1);
      }
      return n;
    };
    expect(games([])).toBe(HILO.games);
    expect(games(['regular'])).toBe(HILO.games + 2);
  });
  it('CLAW MACHINE: 3 goes, 5 with REGULAR (while prizes are left)', () => {
    const goes = (relics: RelicId[]) => {
      const r = atGame('claw', relics);
      let n = 0;
      for (let g = 0; g < 20 && currentStop(r)?.encounter === 'claw'; g++) {
        const pick = encounterChoices(r).findIndex((c) => !c.disabled);
        playEncounter(r, pick, 1);
        n++;
      }
      return n;
    };
    expect(goes([])).toBe(CLAW.tries);
    expect(goes(['regular'])).toBe(CLAW.tries + 2);
  });
});

// ---- SECOND PAYLINE: THE ROW ABOVE YOUR PAYLINE PAYS ITS PAIRS AND JACKPOTS AT HALF. ENEMIES HIT 15% HARDER ----------

describe('SECOND PAYLINE', () => {
  const secondOf = (ev: CombatEvent[]) => ofType(ev, 'secondLine')[0];
  it('a pair on the row above pays half; a jackpot there pays half', () => {
    // Reels 1-2 all swords, reel 3 all shields: the row above is a sword pair like the payline.
    const strips = [{ sword: 12 }, { sword: 12 }, { shield: 12 }];
    const ev = playerSpin((c) => {
      c.relics = ['secondline'];
      c.player.strips = strips;
    }, ['sword', 'sword', 'shield']);
    const line2 = secondOf(ev);
    expect(line2.line).toEqual(['sword', 'sword', 'shield']);
    expect(line2.groups).toHaveLength(1);
    expect(line2.groups[0].amount).toBe(groupOf(ev, 'sword').amount / 2);
    const jack = playerSpin((c) => {
      c.relics = ['secondline'];
      c.player.strips = reels3({ sword: 12 });
    }, ['sword', 'sword', 'sword']);
    expect(secondOf(jack).groups[0].amount).toBe(Math.round(groupOf(jack, 'sword').amount / 2 / UNIT) * UNIT);
    // The half really lands: enemy HP down by both lines.
    const f = fight((c) => {
      c.relics = ['secondline'];
      c.player.strips = strips;
      c.enemy = { hp: 10000, strips: reels3({ empty: 12 }) };
    });
    f.forceNext('player', ['sword', 'sword', 'shield']);
    f.step();
    expect(10000 - f.sides.enemy.hp).toBe(40 + 20);
  });
  it('the row above never pays its singles; nothing without the relic', () => {
    const strips = [{ sword: 12 }, { shield: 12 }, { sword: 12 }];
    const ev = playerSpin((c) => {
      c.relics = ['secondline'];
      c.player.strips = strips;
    }, ['sword', 'shield', 'sword']);
    expect(secondOf(ev)).toBeUndefined();
    expect(secondOf(playerSpin((c) => (c.player.strips = reels3({ sword: 12 })), ['sword', 'sword', 'sword']))).toBeUndefined();
  });
  it('enemy sword hits are x1.15', () => {
    const hit = (relics: RelicId[]) => {
      const r = run('knight', relics);
      const cfg = fightConfig(r, base);
      cfg.player.strips = reels3({ empty: 12 });
      cfg.enemy = { ...cfg.enemy, hp: 1e6, strips: reels3({ sword: 12 }), ability: undefined };
      const f = new Fight(cfg, 5);
      f.next = 'enemy';
      f.forceNext('enemy', ['sword', 'sword', 'sword']);
      return spinOf(f.step().events).score.groups[0].amount;
    };
    const plain = hit([]);
    const harder = hit(['secondline']);
    expect(Math.abs(harder - plain * LEGEND_RELIC.lineDmg)).toBeLessThanOrEqual(1);
  });
  it('enemy ability hits are harder too (rounded to 10s)', () => {
    const smash = (relics: RelicId[]) => {
      const r = run('knight', relics);
      const cfg = fightConfig(r, base);
      cfg.player.strips = reels3({ empty: 12 });
      cfg.enemy = { ...cfg.enemy, hp: 1e6, strips: reels3({ empty: 12 }), ability: { kind: 'smash', every: 2, power: 100 } };
      const f = new Fight(cfg, 5);
      f.sides.enemy.charge = 1;
      f.next = 'enemy';
      return ofType(f.step().events, 'attack').find((a) => a.from === 'enemy')!.amount;
    };
    expect(smash(['secondline'])).toBe(Math.round((smash([]) * 1.15) / UNIT) * UNIT);
  });
});

// ---- DEVIL'S DUE / THE LONG GAME / GLASS CANNON (the pay multipliers) ----------------------------------------------

describe('pay multipliers', () => {
  /** One forced player spin on a run's real fight config (knight, levels 1). */
  const pay = (r: RunState, line: SymbolId[]) => {
    const cfg = fightConfig(r, base);
    cfg.player.strips = reels3({ sword: 6, shield: 6 });
    cfg.enemy = { hp: 1e9, strips: reels3({ empty: 12 }) };
    const f = new Fight(cfg, 7);
    f.forceNext('player', line);
    return f.step().events;
  };
  const PAIR: SymbolId[] = ['sword', 'sword', 'shield'];
  const JACK: SymbolId[] = ['sword', 'sword', 'sword'];
  const NONE: SymbolId[] = ['sword', 'shield', 'sword'];
  const ratio = (relics: RelicId[], line: SymbolId[], sym: SymbolId, reel?: number, mut?: (r: RunState) => void) => {
    const a = run('knight', relics);
    mut?.(a);
    return groupOf(pay(a, line), sym, reel).amount / groupOf(pay(run('knight', []), line), sym, reel).amount;
  };

  it("DEVIL'S DUE: everything pays x1.75 (pairs, jackpots, singles, shields)", () => {
    expect(ratio(['devilsdue'], PAIR, 'sword')).toBe(1.75);
    expect(ratio(['devilsdue'], JACK, 'sword')).toBe(1.75);
    expect(ratio(['devilsdue'], NONE, 'sword', 0)).toBe(1.75);
    expect(ratio(['devilsdue'], PAIR, 'shield')).toBe(1.75);
  });
  it("DEVIL'S DUE: every win takes 8% of max HP (rounded to 10s), compounding; a loss doesn't", () => {
    const r = run('knight', ['devilsdue']);
    for (let i = 0; i < 3; i++) {
      const max = r.player.maxHp;
      r.depth = 0;
      win(r);
      expect(r.player.maxHp).toBe(max - Math.round((max * 0.08) / UNIT) * UNIT);
      expect(r.player.hp).toBeLessThanOrEqual(r.player.maxHp);
    }
  });
  it('THE LONG GAME: x0.8, +0.03 per win, on every group', () => {
    // (KNIGHT's level-1 swords are worth 12: 0.8 rounds to the point.)
    expect(ratio(['longgame'], PAIR, 'sword')).toBeCloseTo(0.8, 1);
    expect(ratio(['longgame'], NONE, 'sword', 0)).toBeCloseTo(0.8, 1);
    const r = run('knight', ['longgame']);
    for (let i = 0; i < 4; i++) {
      r.depth = 0;
      win(r);
    }
    expect(fightConfig(r, base).player.payMul).toBeCloseTo(0.92, 5);
    // A loss doesn't count.
    const f = new Fight(fightConfig(r, base), 1);
    f.winner = 'enemy';
    finishFight(r, f);
    expect(r.longGame).toBe(4);
  });
  it('THE LONG GAME: no cap (past 7 wins it pays more than x1)', () => {
    const r = run('knight', ['longgame']);
    r.longGame = 10;
    expect(fightConfig(r, base).player.payMul).toBeCloseTo(1.1, 5);
  });
  it('GLASS CANNON: pairs and jackpots pay x1.5', () => {
    expect(ratio(['glasscannon'], PAIR, 'sword')).toBe(1.5);
    expect(ratio(['glasscannon'], JACK, 'sword')).toBe(1.5);
  });
  // EVERYTHING PAYS X1.5 (the text said pairs and jackpots; 2026-11-01): singles too.
  it('GLASS CANNON pays singles x1.5 too', () => {
    expect(ratio(['glasscannon'], NONE, 'sword', 0)).toBe(1.5);
  });
  it('GLASS CANNON: no BANDAGE heal after a win, no heal at the Cashier', () => {
    const r = run('knight', ['glasscannon', 'bandage'], 6);
    r.player.hp = 100;
    const f = new Fight(fightConfig(r, base), 1);
    f.winner = 'player';
    finishFight(r, f);
    expect(r.player.hp).toBe(f.sides.player.hp);
    r.player.hp = 50;
    r.player.chips = 999;
    expect(shopOffers(r).some((i) => i.option.kind === 'heal')).toBe(false);
  });
  // The text says so (2026-11-01): BEATING AN ACT'S BOSS STILL HEALS YOU.
  it('GLASS CANNON: an act boss still heals you to full, as the text says', () => {
    const r = run('knight', ['glasscannon'], 6);
    skipToBoss(r);
    r.player.hp = 50;
    win(r);
    expect(r.act).toBe(2);
    expect(r.player.hp).toBe(r.player.maxHp);
  });
  // The Cashier's +MAX HP card doesn't heal under GLASS CANNON (fixed 2026-11-01).
  it('GLASS CANNON: the +MAX HP card does not heal', () => {
    const r = run('knight', ['glasscannon'], 6);
    r.player.hp = 50;
    applyOption(r, { kind: 'maxHp', amount: 40 }, false);
    expect(r.player.hp).toBe(50);
  });
  it("GLASS CANNON: the +MAX HP card is still sold, and its text drops the heal", () => {
    const r = run('knight', ['glasscannon'], 6);
    expect(shopOffers(r).some((i) => i.option.kind === 'maxHp')).toBe(true);
    expect(describeOption({ kind: 'maxHp', amount: 40 }, r).text).toBe('GAIN 40 MAX HP');
    expect(describeOption({ kind: 'maxHp', amount: 40 }, run('knight', [], 6)).text).toBe('GAIN 40 MAX HP AND HEAL 40 HP');
  });
  it('they stack: GLASS CANNON x DEVIL\'S DUE x LONG GAME', () => {
    expect(ratio(['glasscannon', 'devilsdue', 'longgame'], PAIR, 'sword')).toBeCloseTo(1.5 * 1.75 * 0.8, 1);
  });
});

// ---- QUICKENING: YOUR <METER> STARTS EVERY FIGHT HALF FULL. ENEMY ABILITIES CHARGE 1 SPIN FASTER --------------------

describe('QUICKENING', () => {
  const opening = (cab: CabinetId, relics: RelicId[], chips = 0) => {
    const r = run(cab, relics);
    r.player.chips = chips;
    const f = new Fight(fightConfig(r, base), 1);
    return { f, r };
  };
  for (const cab of ['tesla', 'midas', 'joker', 'jukebox'] as CabinetId[]) {
    it(`${cab}: the meter starts at exactly half of full (no chips held)`, () => {
      const { f } = opening(cab, ['quickening']);
      expect(f.meterCost).toBeGreaterThan(0);
      expect(f.sides.player.energy).toBe(f.meterCost / 2);
      expect(f.sides.player.armed).toBe(false);
      const plain = opening(cab, []).f;
      expect(plain.sides.player.energy).toBe(0);
    });
  }
  it('jukebox: half full is volume 3 of 6; joker: one WILD from full', () => {
    expect(opening('jukebox', ['quickening']).f.volume).toBe(3);
    const j = opening('joker', ['quickening']).f;
    expect(j.sides.player.energy + (j.meter?.perWild ?? 0)).toBe(j.meterCost);
  });
  // CASSIDY's HIGH ROLLER bar already starts filled by the chips he holds; QUICKENING never lowers it (fixed 2026-11-01).
  it('midas: QUICKENING never starts the HIGH ROLLER bar lower than it would be without it', () => {
    expect(opening('midas', ['quickening'], 40).f.sides.player.energy).toBeGreaterThanOrEqual(opening('midas', [], 40).f.sides.player.energy);
  });
  it('midas: 40 chips start the bar at 90 either way; 0 chips start it at half with QUICKENING', () => {
    expect(opening('midas', [], 40).f.sides.player.energy).toBe(90);
    expect(opening('midas', ['quickening'], 40).f.sides.player.energy).toBe(90);
    expect(opening('midas', ['quickening'], 0).f.sides.player.energy).toBe(50);
  });
  it('knight: never offered, and does nothing if held', () => {
    expect(relicFits(run('knight', []), 'quickening')).toBe(false);
    const k = opening('knight', ['quickening']);
    expect(fightConfig(k.r, base).enemy.ability?.every).toBe(fightConfig(run('knight', []), base).enemy.ability?.every);
  });
  for (const cab of ['tesla', 'midas', 'joker', 'jukebox'] as CabinetId[]) {
    it(`${cab}: the run's enemy ability fires 1 enemy turn sooner each time (every n-1, floor 2)`, () => {
      const fired = (relics: RelicId[]) => {
        const r = run(cab, relics);
        const cfg = fightConfig(r, base);
        cfg.enemy = { ...cfg.enemy, hp: 1e6, strips: reels3({ empty: 12 }) };
        const f = new Fight(cfg, 1);
        const at: number[] = [];
        for (let t = 0; t < 30 && !f.over; t++) {
          f.sides.player.hp = f.sides.player.maxHp;
          const { side, events } = f.step();
          if (side === 'enemy' && ofType(events, 'ability').length) at.push(Math.ceil(f.turn / 2));
        }
        return { at, every: f.sides.enemy.ability!.every };
      };
      const plain = fired([]);
      const quick = fired(['quickening']);
      expect(quick.every).toBe(Math.max(2, plain.every - 1));
      const gaps = (xs: number[]) => [...new Set(xs.slice(1).map((x, i) => x - xs[i]))];
      expect(gaps(plain.at)).toEqual([plain.every]);
      expect(gaps(quick.at)).toEqual([quick.every]);
      expect(quick.at.length).toBeGreaterThan(plain.at.length);
    });
  }
  it('the act 1-3 regular clock is 3: QUICKENING makes it 2', () => {
    const r = run('tesla', ['quickening']);
    const e = fightConfig(run('tesla', []), base).enemy.ability!;
    expect(e.every).toBe(3);
    expect(fightConfig(r, base).enemy.ability!.every).toBe(2);
  });
  // OPEN CALL (user): the clock floors at 2, so at stake 5+ QUICKENING's cost vanishes (in the player's favour).
  it.skip('OPEN CALL: at stake 5, enemy abilities still charge 1 spin faster with QUICKENING', () => {
    const at = (relics: RelicId[]) => {
      const r = createRun(base, 3, 'tesla', 5);
      r.pendingStart = null;
      r.player.relics = relics;
      const f = new Fight(fightConfig(r, base), 1);
      return f.sides.enemy.ability!.every;
    };
    expect(at(['quickening'])).toBe(at([]) - 1);
  });
  it('ACTUAL: at stake 5 the regulars charge every 2 either way', () => {
    const at = (relics: RelicId[]) => {
      const r = createRun(base, 3, 'tesla', 5);
      r.pendingStart = null;
      r.player.relics = relics;
      return new Fight(fightConfig(r, base), 1).sides.enemy.ability!.every;
    };
    expect(STAKE.fasterAll).toBe(5);
    expect(at(['quickening'])).toBe(2);
    expect(at([])).toBe(2);
  });
});
