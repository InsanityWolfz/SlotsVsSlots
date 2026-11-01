/**
 * Launch audit, group relics_a: does each relic do exactly what its card says?
 * mirror, fang, bandage, prism, ticket, starchart, bell, phoenix, overcharge, key, sandglass, underdog, holywater.
 * (fang, overcharge and bell: the generic text and KNIGHT here; their other machine texts are another group's.)
 * A claim the code breaks is kept as `it.skip('MISMATCH: ...')`, with what really happens in a comment.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type Enh, type GameConfig, type RelicId, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { CHARM_VALUE, charmShortText, symLevel } from '../src/core/charms';
import { BANDAGE_HEAL, FANG_HEAL, MACHINE_EXCLUDE, NEW_RELIC, RELICS, relicText } from '../src/core/relics';
import { effectiveAbility } from '../src/core/stakes';
import { CABINETS, type CabinetId } from '../src/core/cabinets';
import { applyOption, createRun, describeOption, fightConfig, finishFight, levelsGained, relicFits, takenLabel, type RunState } from '../src/core/run';
import { shortRelicText } from '../src/ui/run/cardText';

const base = defaultConfig();
const MACHINES: CabinetId[] = ['knight', 'midas', 'tesla', 'joker', 'jukebox'];
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) => events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function run(cab: CabinetId, relics: RelicId[] = [], seed = 3): RunState {
  const r = createRun(base, seed, cab);
  r.pendingStart = null;
  r.player.relics = [...relics];
  return r;
}

/** A real fight config for a machine, against a harmless dummy (shields only, no ability, huge HP). */
function machineCfg(cab: CabinetId, relics: RelicId[], mut?: (c: GameConfig) => void): GameConfig {
  const c = fightConfig(run(cab, relics), base);
  c.enemy = { hp: 1e7, strips: reels3({ shield: 12 }) };
  // Every reel can show a WILD (PRISM).
  c.player.strips = c.player.strips.map((s) => ({ ...s, wild: 2 }));
  mut?.(c);
  return c;
}

/** One player spin with a forced payline; hpFrac sets your HP first. */
function spin(cab: CabinetId, relics: RelicId[], line: SymbolId[], hpFrac = 1): { events: CombatEvent[]; f: Fight } {
  const f = new Fight(machineCfg(cab, relics), 7);
  f.sides.player.hp = Math.round(f.sides.player.maxHp * hpFrac);
  f.forceNext('player', line);
  return { events: f.step().events, f };
}
const scoreOf = (events: CombatEvent[]) => ofType(events, 'spin')[0].score;
/** The group on these reels (the matched one first). */
const groupOn = (events: CombatEvent[], reels: number[]) => scoreOf(events).groups.find((g) => g.reels.join() === reels.join())!;
const ATTACK: Record<CabinetId, SymbolId> = { knight: 'sword', midas: 'goldbar', tesla: 'bolt', joker: 'ace', jukebox: 'note' };
const near = (a: number, b: number) => Math.abs(a - b) <= 1;

/** The card face and full text a player sees for a relic on a machine. */
const face = (id: RelicId, cab: CabinetId) => {
  const full = relicText(id, cab);
  return { full, short: shortRelicText(id, full) };
};

// ---------------------------------------------------------------------------------------------------------------------
describe('TWIN REELS (mirror): ANY TWO MATCHING REELS COUNT AS A PAIR', () => {
  it('texts: the same on every machine, and the card face says the same thing', () => {
    for (const cab of MACHINES) {
      expect(face('mirror', cab).full).toBe('ANY TWO MATCHING REELS COUNT AS A PAIR');
      expect(face('mirror', cab).short).toBe('ANY 2 MATCHING REELS ARE A PAIR');
    }
  });
  for (const cab of MACHINES) {
    const a = ATTACK[cab];
    it(`${cab}: reels 1+3 and reels 2+3 pair (they don't without it), and pay a full pair`, () => {
      const plain = groupOn(spin(cab, [], [a, a, 'shield']).events, [0, 1]).amount;
      const ends = spin(cab, ['mirror'], [a, 'shield', a]).events;
      expect(scoreOf(ends).tier).toBe('pair');
      expect(groupOn(ends, [0, 2]).amount).toBe(plain);
      expect(scoreOf(ends).relics).toContain('mirror');
      const right = spin(cab, ['mirror'], ['shield', a, a]).events;
      expect(scoreOf(right).tier).toBe('pair');
      // (TESLA's reel 1 holds a CHARGED bolt, so reels 2+3 are worth less: a full pair is x2 their two singles.)
      const singles = spin(cab, [], ['shield', a, a]).events;
      expect(groupOn(right, [1, 2]).amount).toBe(2 * (groupOn(singles, [1]).amount + groupOn(singles, [2]).amount));
      // Without it neither is a pair.
      expect(scoreOf(spin(cab, [], [a, 'shield', a]).events).tier).toBe('none');
      expect(scoreOf(spin(cab, [], ['shield', a, a]).events).tier).toBe('none');
    });
  }
  it('no match, no pair (the condition false)', () => {
    const f = new Fight(machineCfg('knight', ['mirror'], (c) => (c.player.strips = reels3({ sword: 4, shield: 4, bolt: 4 }))), 7);
    f.forceNext('player', ['sword', 'shield', 'bolt']);
    const s = scoreOf(f.step().events);
    expect(s.line).toEqual(['sword', 'shield', 'bolt']);
    expect(s.tier).toBe('none');
    expect(s.relics ?? []).not.toContain('mirror');
    // A pair made on reels 1+2 is a plain pair: TWIN REELS doesn't claim it.
    expect(scoreOf(spin('knight', ['mirror'], ['sword', 'sword', 'shield']).events).relics ?? []).not.toContain('mirror');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('VAMPIRE FANG (fang): generic text and KNIGHT', () => {
  it('never offered on KNIGHT (no meter), so the generic "YOUR METER" text is never shown on any machine', () => {
    expect(relicFits(run('knight'), 'fang')).toBe(false);
    for (const cab of MACHINES) if (relicFits(run(cab), 'fang')) expect(relicText('fang', cab)).not.toBe(RELICS.fang.text);
  });

  it('JOKER: FANG alone adds 30 to the payoff heal', () => {
    const heal = (relics: RelicId[]) => {
      const f = new Fight(machineCfg('joker', relics), 7);
      const p = f.sides.player;
      p.hp = 100;
      p.energy = f.meterCost;
      p.armed = true;
      f.forceNext('player', ['shield', 'shield', 'shield']);
      f.step();
      return p.hp - 100;
    };
    // (Shield groups don't heal; the meter heal is 15.)
    expect(heal(['fang']) - heal([])).toBe(FANG_HEAL);
  });

  // MISMATCH (interaction): with OVERCHARGE too, FANG heals a second time after the echo (fight.ts:959,
  // payoffAfter: `if (me.relics.has('fang')) this.heal(..FANG_HEAL..)` inside the OVERCHARGE block), so a JOKER /
  // BANKROLL payoff heals 30 + 30 from FANG. Measured: FANG alone +30 over no relic; FANG + OVERCHARGE +60 over
  // OVERCHARGE alone. Neither card says the echo heals.
  it.skip('MISMATCH: FANG + OVERCHARGE on JOKER: FANG still heals 30 a payoff (it heals 60)', () => {
    const heal = (relics: RelicId[]) => {
      const f = new Fight(machineCfg('joker', relics), 7);
      const p = f.sides.player;
      p.hp = 100;
      p.energy = f.meterCost;
      p.armed = true;
      f.forceNext('player', ['ace', 'ace', 'ace']);
      f.step();
      return p.hp - 100;
    };
    expect(heal(['fang', 'overcharge']) - heal(['overcharge'])).toBe(FANG_HEAL);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('BANDAGE: HEAL 60 HP AFTER EACH FIGHT', () => {
  const after = (cab: CabinetId, relics: RelicId[], hp: number) => {
    const r = run(cab, relics, 11);
    const f = new Fight(fightConfig(r, base), 1);
    f.sides.player.hp = hp;
    f.winner = 'player';
    finishFight(r, f);
    return r.player.hp;
  };
  it('texts', () => {
    for (const cab of MACHINES) expect(face('bandage', cab)).toEqual({ full: 'HEAL 60 HP AFTER EACH FIGHT', short: 'HEAL 60 HP AFTER EACH FIGHT' });
    expect(BANDAGE_HEAL).toBe(60);
  });
  for (const cab of MACHINES)
    it(`${cab}: a won fight heals exactly 60 (none without it), never past max HP`, () => {
      expect(after(cab, ['bandage'], 100)).toBe(160);
      expect(after(cab, [], 100)).toBe(100);
      const max = run(cab).player.maxHp;
      expect(after(cab, ['bandage'], max - 20)).toBe(max);
    });
  it('every fight, not once: two wins heal twice', () => {
    const r = run('knight', ['bandage'], 11);
    for (let i = 0; i < 2; i++) {
      const f = new Fight(fightConfig(r, base), 1);
      f.sides.player.hp = 100 + i * 60;
      f.winner = 'player';
      finishFight(r, f);
    }
    expect(r.player.hp).toBe(220);
  });
  it("GLASS CANNON's NO HEALING BETWEEN FIGHTS turns it off (said on GLASS CANNON's card)", () => {
    expect(after('knight', ['bandage', 'glasscannon'], 100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('PRISM: A PAIR OR JACKPOT THAT USES A WILD PAYS X2', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('prism', cab)).toEqual({ full: 'A PAIR OR JACKPOT THAT USES A WILD PAYS X2', short: 'WINS THAT USE A WILD PAY X2' });
  });
  for (const cab of MACHINES) {
    const a = ATTACK[cab];
    it(`${cab}: a pair and a jackpot with a WILD pay x2; without a WILD, no change`, () => {
      const pair = (r: RelicId[]) => groupOn(spin(cab, r, [a, 'wild', 'shield']).events, [0, 1]).amount;
      expect(pair(['prism'])).toBe(2 * pair([]));
      const jp = (r: RelicId[]) => groupOn(spin(cab, r, [a, 'wild', a]).events, [0, 1, 2]).amount;
      expect(jp(['prism'])).toBe(2 * jp([]));
      const noWild = (r: RelicId[]) => groupOn(spin(cab, r, [a, a, 'shield']).events, [0, 1]).amount;
      expect(noWild(['prism'])).toBe(noWild([]));
      // A lone WILD that matches nothing isn't a pair or jackpot.
      const lone = spin(cab, ['prism'], ['shield', a, 'wild']).events;
      if (scoreOf(lone).tier === 'none') expect(scoreOf(lone).relics ?? []).not.toContain('prism');
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
describe('GOLDEN TICKET (ticket): EVERY CHARM IS ONE STEP STRONGER', () => {
  const ENHS = Object.keys(CHARM_VALUE) as Enh[];
  it('texts', () => {
    for (const cab of MACHINES) expect(face('ticket', cab)).toEqual({ full: 'EVERY CHARM IS ONE STEP STRONGER', short: 'EVERY CHARM IS ONE STEP STRONGER' });
  });
  it('every Charm reads its step-2 value in a fight, and every step 2 is stronger than step 1', () => {
    const f = new Fight(machineCfg('knight', ['ticket']), 7);
    const plain = new Fight(machineCfg('knight', []), 7);
    for (const e of ENHS) {
      expect(f.charmLvl(f.sides.player, e)).toBe(2);
      expect(plain.charmLvl(plain.sides.player, e)).toBe(1);
      expect(CHARM_VALUE[e][2]).toBeGreaterThan(CHARM_VALUE[e][1]);
      expect(charmShortText(e, 2)).not.toBe(charmShortText(e, 1));
    }
  });
  const withCharm = (relics: RelicId[], enh: Enh) => {
    const c = machineCfg('knight', relics, (c) => {
      c.player.strips = reels3({ sword: 12, shield: 6 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh, n: 12 }));
    });
    const f = new Fight(c, 7);
    f.sides.player.hp = 100;
    f.forceNext('player', ['sword', 'sword', 'shield']);
    const events = f.step().events;
    return { g: groupOn(events, [0, 1]), hp: f.sides.player.hp };
  };
  it('GOLD x2 -> x3 on each cell; KEEN +40 -> +50 a sword; VAMP heals 20 -> 30', () => {
    // Two GOLD cells add: x2+x2 = x4 vs x3+x3 = x6 on the pair.
    expect(withCharm(['ticket'], 'gold').g.amount / withCharm([], 'gold').g.amount).toBeCloseTo(6 / 4);
    // (Each KEEN cell adds to each sword in its group: 2 cells x 2 swords.)
    expect(withCharm(['ticket'], 'keen').g.base - withCharm([], 'keen').g.base).toBe(2 * 2 * (CHARM_VALUE.keen[2] - CHARM_VALUE.keen[1]));
    expect(withCharm(['ticket'], 'vamp').hp - 100).toBe(CHARM_VALUE.vamp[2]);
    expect(withCharm([], 'vamp').hp - 100).toBe(CHARM_VALUE.vamp[1]);
  });
  it('the Charm cards a TICKET holder is offered show the stronger number', () => {
    const r = run('knight', ['ticket']);
    expect(describeOption({ kind: 'gild', enh: 'gold', symbol: 'sword', reel: 0, n: 2 }, r).text).toBe('REEL 1 SWORDS: X3 PAY');
    expect(describeOption({ kind: 'gild', enh: 'gold', symbol: 'sword', reel: 0, n: 2 }, run('knight')).text).toBe('REEL 1 SWORDS: X2 PAY');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('STAR CHART (starchart): EVERY SYMBOL LEVEL YOU GAIN IS DOUBLED', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('starchart', cab)).toEqual({ full: 'EVERY SYMBOL LEVEL YOU GAIN IS DOUBLED', short: 'SYMBOL LEVELS YOU GAIN ARE DOUBLED' });
  });
  for (const cab of MACHINES)
    it(`${cab}: a level card gives 2 (1 without), and the card says the right LV`, () => {
      const sym = CABINETS[cab].attack;
      for (const [relics, step] of [[['starchart'], 2], [[], 1]] as [RelicId[], number][]) {
        const r = run(cab, relics);
        const was = symLevel(r.player.levels, sym);
        expect(describeOption({ kind: 'symLevel', symbol: sym }, r).title).toContain(`LV${was + step}`);
        applyOption(r, { kind: 'symLevel', symbol: sym });
        expect(symLevel(r.player.levels, sym)).toBe(was + step);
      }
    });
  it("a boss's levels are doubled too (KNIGHT: 3 -> 6)", () => {
    const boss = (relics: RelicId[]) => {
      const r = run('knight', relics, 5);
      r.enemies[r.depth] = { ...r.enemies[r.depth], isBoss: true };
      const was = symLevel(r.player.levels, 'sword');
      const f = new Fight(fightConfig(r, base), 1);
      f.winner = 'player';
      finishFight(r, f);
      return symLevel(r.player.levels, 'sword') - was;
    };
    expect(boss([])).toBe(CABINETS.knight.bossLevels);
    expect(boss(['starchart'])).toBe(2 * CABINETS.knight.bossLevels!);
  });
  // UNCLEAR (log text, not the relic): the run-over table and COPY RUN name a taken level card "+1 LEVEL" even when STAR
  // CHART made it +2 (run.ts takenLabel).
  // UNCLEAR: the Cashier's level price climbs 4 chips a level GAINED (run.ts:1396), so with STAR CHART it climbs twice as
  // fast per card bought (and a boss's 6 levels add 24). True to the Cashier's rule, but nothing on the card says so.
  it('UNCLEAR: one STAR CHART level card counts as 2 levels gained for the Cashier price', () => {
    const r = run('knight', ['starchart']);
    applyOption(r, { kind: 'symLevel', symbol: 'sword' });
    expect(levelsGained(r)).toBe(2);
  });
  it('UNCLEAR: the run log calls a STAR CHART level card +1 LEVEL', () => {
    expect(takenLabel({ kind: 'symLevel', symbol: 'sword' })).toBe('SWORD +1 LEVEL');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('JACKPOT BELL (bell) on KNIGHT: JACKPOTS PAY X2', () => {
  it('texts: KNIGHT drops the meter half', () => {
    expect(face('bell', 'knight')).toEqual({ full: 'JACKPOTS PAY X2', short: 'JACKPOTS PAY X2' });
    expect(relicFits(run('knight'), 'bell')).toBe(true);
  });
  it('a sword or shield jackpot pays x2; a pair pays the same; no meter moves', () => {
    const jp = (r: RelicId[], s: SymbolId) => groupOn(spin('knight', r, [s, s, s]).events, [0, 1, 2]).amount;
    expect(jp(['bell'], 'sword')).toBe(2 * jp([], 'sword'));
    expect(jp(['bell'], 'shield')).toBe(2 * jp([], 'shield'));
    const pair = (r: RelicId[]) => groupOn(spin('knight', r, ['sword', 'sword', 'shield']).events, [0, 1]).amount;
    expect(pair(['bell'])).toBe(pair([]));
    const { events } = spin('knight', ['bell'], ['sword', 'sword', 'sword']);
    expect(ofType(events, 'meter')).toHaveLength(0);
    expect(ofType(events, 'energyGain')).toHaveLength(0);
    expect(ofType(events, 'specialFire')).toHaveLength(0);
  });
  it('the damage dealt doubles too (not just the number)', () => {
    const dmg = (r: RelicId[]) => ofType(spin('knight', r, ['sword', 'sword', 'sword']).events, 'attack').reduce((a, e) => a + e.amount, 0);
    expect(dmg(['bell'])).toBe(2 * dmg([]));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('PHOENIX FEATHER (phoenix): SURVIVE LETHAL DAMAGE AT 1 HP ONCE PER FIGHT', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('phoenix', cab)).toEqual({ full: 'SURVIVE LETHAL DAMAGE AT 1 HP ONCE PER FIGHT', short: 'SURVIVE A KILLING HIT ONCE A FIGHT' });
  });
  const hitMe = (f: Fight, hp: number) => {
    f.sides.player.hp = hp;
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    return f.step().events;
  };
  for (const cab of MACHINES)
    it(`${cab}: the first killing hit leaves you at exactly 1 HP; the second kills`, () => {
      const f = new Fight(machineCfg(cab, ['phoenix'], (c) => (c.enemy = { hp: 1e7, strips: reels3({ sword: 12 }) })), 7);
      const first = hitMe(f, 30);
      expect(ofType(first, 'phoenix')).toHaveLength(1);
      expect(f.sides.player.hp).toBe(1);
      expect(f.over).toBe(false);
      const second = hitMe(f, 30);
      expect(ofType(second, 'phoenix')).toHaveLength(0);
      expect(f.over).toBe(true);
      expect(f.winner).toBe('enemy');
    });
  it("a hit that doesn't kill doesn't spend it; without it the killing hit kills", () => {
    const f = new Fight(machineCfg('knight', ['phoenix'], (c) => (c.enemy = { hp: 1e7, strips: reels3({ sword: 12 }) })), 7);
    hitMe(f, 300);
    expect(f.phoenixUsed).toBe(false);
    hitMe(f, 30);
    expect(f.sides.player.hp).toBe(1);
    const g = new Fight(machineCfg('knight', [], (c) => (c.enemy = { hp: 1e7, strips: reels3({ sword: 12 }) })), 7);
    hitMe(g, 30);
    expect(g.winner).toBe('enemy');
  });
  it('once per FIGHT: a new fight has it again', () => {
    for (let i = 0; i < 2; i++) {
      const f = new Fight(machineCfg('knight', ['phoenix'], (c) => (c.enemy = { hp: 1e7, strips: reels3({ sword: 12 }) })), 7);
      hitMe(f, 30);
      expect(f.sides.player.hp).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('OVERCHARGE: generic text and KNIGHT', () => {
  it('never offered on KNIGHT (no meter) or JUKEBOX (excluded), so the generic text is never shown', () => {
    expect(relicFits(run('knight'), 'overcharge')).toBe(false);
    expect(relicFits(run('jukebox'), 'overcharge')).toBe(false);
    expect(MACHINE_EXCLUDE.overcharge).toContain('jukebox');
    for (const cab of MACHINES) if (relicFits(run(cab), 'overcharge')) expect(relicText('overcharge', cab)).not.toBe(RELICS.overcharge.text);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('SKELETON KEY (key): YOUR PAIRS PAY X2', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('key', cab)).toEqual({ full: 'YOUR PAIRS PAY X2', short: 'YOUR PAIRS PAY X2' });
  });
  for (const cab of MACHINES) {
    const a = ATTACK[cab];
    it(`${cab}: a pair pays x2 (attack and shield); a jackpot and a single don't change`, () => {
      const pair = (r: RelicId[], s: SymbolId) => groupOn(spin(cab, r, [s, s, s === 'shield' ? a : 'shield']).events, [0, 1]).amount;
      expect(pair(['key'], a)).toBe(2 * pair([], a));
      expect(pair(['key'], 'shield')).toBe(2 * pair([], 'shield'));
      const jp = (r: RelicId[]) => groupOn(spin(cab, r, [a, a, a]).events, [0, 1, 2]).amount;
      expect(jp(['key'])).toBe(jp([]));
      const single = (r: RelicId[]) => groupOn(spin(cab, r, [a, 'shield', 'shield']).events, [0]).amount;
      expect(single(['key'])).toBe(single([]));
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
describe('GOLDEN HOURGLASS (sandglass): ENEMY ABILITIES CHARGE 1 SPIN SLOWER', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('sandglass', cab)).toEqual({ full: 'ENEMY ABILITIES CHARGE 1 SPIN SLOWER', short: 'ENEMY ABILITIES CHARGE A SPIN SLOWER' });
  });
  /** The enemy turns (1, 2, ...) its ability fires on, over 16 enemy turns. */
  const fires = (relics: RelicId[], kind: 'smash' | 'flood' = 'smash') => {
    const f = new Fight(machineCfg('knight', relics, (c) => {
      c.player.strips = reels3({ shield: 12 });
      c.enemy = { hp: 1e7, strips: reels3({ shield: 12 }), ability: { kind, every: 4, power: 10 } };
    }), 7);
    const at: number[] = [];
    let n = 0;
    for (let i = 0; i < 32 && !f.over; i++) {
      f.sides.player.hp = f.sides.player.maxHp;
      const { side, events } = f.step();
      if (side !== 'enemy') continue;
      n++;
      if (ofType(events, 'ability').length) at.push(n);
    }
    return at;
  };
  it('a regular enemy: its first ability comes 1 enemy spin later, then every 5 spins instead of 4', () => {
    const plain = fires([]);
    const slow = fires(['sandglass']);
    expect(slow[0]).toBe(plain[0] + 1);
    expect(plain[1] - plain[0]).toBe(4);
    expect(slow[1] - slow[0]).toBe(5);
    expect(slow[2] - slow[1]).toBe(5);
  });
  it('THE HOUSE (skim), THE OWNER and every regular ability kind get +1', () => {
    for (const kind of ['jackpot', 'owner', 'flood', 'smash', 'blizzard', 'pilfer', 'quake', 'jam', 'carpet', 'curse', 'bloodmoon', 'launder', 'mark', 'penalty', 'houseTake', 'repo'] as const) {
      const ab = { kind, every: 3, power: 1 };
      expect(effectiveAbility(ab, { stake: 0, act: 1, sandglass: true }).every).toBe(4);
    }
  });
  // MISMATCH: THE WHEEL's NO MORE BETS ('bets') and THE DEALER's deals ('deal') ignore the Hourglass on purpose
  // (stakes.ts:56, "ITERATION_12 L6: it disabled the boss mechanic"): every stays 3. The card says ENEMY ABILITIES.
  it.skip("MISMATCH: THE WHEEL's and THE DEALER's abilities charge 1 spin slower", () => {
    for (const kind of ['bets', 'deal'] as const) expect(effectiveAbility({ kind, every: 3, power: 1 }, { stake: 0, act: 2, sandglass: true }).every).toBe(4);
  });
  it('(what happens: the Wheel and the Dealer keep their clocks)', () => {
    for (const kind of ['bets', 'deal'] as const) expect(effectiveAbility({ kind, every: 3, power: 1 }, { stake: 0, act: 2, sandglass: true }).every).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('UNDERDOG: EVERYTHING PAYS X1.5 WHEN YOU ARE UNDER HALF HP', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('underdog', cab)).toEqual({ full: 'EVERYTHING PAYS X1.5 WHEN YOU ARE UNDER HALF HP', short: 'EVERYTHING PAYS X1.5 UNDER HALF HP' });
    expect(NEW_RELIC.underdogMul).toBe(1.5);
  });
  for (const cab of MACHINES) {
    const a = ATTACK[cab];
    it(`${cab}: under half HP a pair, a jackpot, a single and a shield pay x1.5; at half or above, nothing`, () => {
      const line: SymbolId[] = [a, a, 'shield'];
      const pay = (r: RelicId[], hp: number, reels: number[], l = line) => groupOn(spin(cab, r, l, hp).events, reels).amount;
      expect(near(pay(['underdog'], 0.4, [0, 1]), 1.5 * pay([], 0.4, [0, 1]))).toBe(true);
      expect(near(pay(['underdog'], 0.4, [2]), 1.5 * pay([], 0.4, [2]))).toBe(true);
      expect(near(pay(['underdog'], 0.4, [0, 1, 2], [a, a, a]), 1.5 * pay([], 0.4, [0, 1, 2], [a, a, a]))).toBe(true);
      expect(near(pay(['underdog'], 0.4, [0], [a, 'shield', 'shield']), 1.5 * pay([], 0.4, [0], [a, 'shield', 'shield']))).toBe(true);
      expect(pay(['underdog'], 0.5, [0, 1])).toBe(pay([], 0.5, [0, 1]));
      expect(pay(['underdog'], 0.9, [0, 1])).toBe(pay([], 0.9, [0, 1]));
    });
  }
  it('KNIGHT: the damage dealt is x1.5, not just the number', () => {
    const dmg = (r: RelicId[]) => ofType(spin('knight', r, ['sword', 'sword', 'sword'], 0.3).events, 'attack').reduce((x, e) => x + e.amount, 0);
    expect(near(dmg(['underdog']), 1.5 * dmg([]))).toBe(true);
  });
  // UNCLEAR: SECOND PAYLINE's row pays "at half" of its own unboosted pay: UNDERDOG (and KEY, PRISM, BELL) don't reach it
  // (fight.ts secondLine: "Meters, Charms and relics stay the main payline's").
  it('UNCLEAR: with SECOND PAYLINE, the row above is not boosted by UNDERDOG', () => {
    const second = (relics: RelicId[]) => {
      const f = new Fight(machineCfg('knight', relics, (c) => (c.player.strips = reels3({ sword: 12 }))), 7);
      f.sides.player.hp = Math.round(f.sides.player.maxHp * 0.3);
      f.forceNext('player', ['sword', 'sword', 'sword']);
      return ofType(f.step().events, 'secondLine')[0]?.groups[0]?.amount ?? 0;
    };
    expect(second(['secondline', 'underdog'])).toBe(second(['secondline']));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('HOLY WATER (holywater): IGNORE THE FIRST SABOTAGE EACH FIGHT', () => {
  it('texts', () => {
    for (const cab of MACHINES) expect(face('holywater', cab)).toEqual({ full: 'IGNORE THE FIRST SABOTAGE EACH FIGHT', short: 'IGNORE THE FIRST SABOTAGE A FIGHT' });
  });
  const slimeFight = (relics: RelicId[], cab: CabinetId = 'knight') =>
    new Fight(machineCfg(cab, relics, (c) => (c.enemy = { hp: 1e7, strips: reels3({ slime: 12 }) })), 7);
  const enemySpin = (f: Fight, line: SymbolId[]) => {
    f.next = 'enemy';
    f.forceNext('enemy', line);
    return f.step().events;
  };
  const slimed = (f: Fight) => f.sides.player.reels.reduce((a, r) => a + r.cells.filter((c) => c.slimed).length, 0);
  for (const cab of MACHINES)
    it(`${cab}: the first spill washes off, the second lands`, () => {
      const f = slimeFight(['holywater'], cab);
      const first = enemySpin(f, ['slime', 'slime', 'slime']);
      expect(ofType(first, 'relic').some((e) => e.relic === 'holywater')).toBe(true);
      expect(ofType(first, 'slime')).toHaveLength(0);
      expect(slimed(f)).toBe(0);
      const second = enemySpin(f, ['slime', 'slime', 'slime']);
      expect(ofType(second, 'slime')).toHaveLength(1);
      expect(slimed(f)).toBeGreaterThan(0);
      // Without it the first lands.
      const g = slimeFight([], cab);
      enemySpin(g, ['slime', 'slime', 'slime']);
      expect(slimed(g)).toBeGreaterThan(0);
    });
  it('a single jam (it fizzles anyway) does not use it up', () => {
    const f = new Fight(machineCfg('knight', ['holywater'], (c) => (c.enemy = { hp: 1e7, strips: [{ lock: 12 }, { shield: 12 }, { shield: 12 }] })), 7);
    enemySpin(f, ['lock', 'shield', 'shield']);
    expect(f.holyWater).toBe(false);
  });
  /** An enemy whose ability fires on its first turn. */
  const abilityFight = (relics: RelicId[], kind: 'flood' | 'smash' | 'penalty' | 'repo', gilded = true) =>
    new Fight(
      machineCfg('knight', relics, (c) => {
        c.player.strips = reels3({ sword: 12 });
        if (gilded) c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'gold' as const, n: 4 }));
        c.enemy = { hp: 1e7, strips: reels3({ shield: 12 }), ability: { kind, every: 1, power: kind === 'flood' ? 3 : 10 } };
      }),
      7,
    );
  it('the first sabotage ability (a SPILL flood) washes off; a hit ability (smash) is not sabotage and does not use it', () => {
    const f = abilityFight(['holywater'], 'flood');
    enemySpin(f, ['shield', 'shield', 'shield']);
    expect(f.holyWater).toBe(true);
    expect(slimed(f)).toBe(0);
    enemySpin(f, ['shield', 'shield', 'shield']);
    expect(slimed(f)).toBeGreaterThan(0);
    const s = abilityFight(['holywater'], 'smash');
    enemySpin(s, ['shield', 'shield', 'shield']);
    expect(s.holyWater).toBe(false);
  });
  it('each fight: a new fight has it again', () => {
    for (let i = 0; i < 2; i++) {
      const f = slimeFight(['holywater']);
      enemySpin(f, ['slime', 'slime', 'slime']);
      expect(slimed(f)).toBe(0);
    }
  });
  it("THE REPO MAN's take (a Charm off your reels) is washed off", () => {
    const f = abilityFight(['holywater'], 'repo');
    const ev = enemySpin(f, ['shield', 'shield', 'shield']);
    expect(ofType(ev, 'confiscate')).toHaveLength(0);
    expect(f.holyWater).toBe(true);
  });
  // MISMATCH: the PIT BOSS's AUDIT ('penalty': confiscates two Charms, then hits) is not in WRITER_ABILITIES
  // (fightRules.ts:69), so HOLY WATER never stops it, while the same confiscation from THE REPO MAN's ability and from
  // the PIT BOSS's own gavel pairs (REEL_WRITES) is washed off. Measured: a 'confiscate' event lands, holyWater stays false.
  it.skip("MISMATCH: the PIT BOSS's AUDIT (it confiscates your Charms) is washed off", () => {
    const f = abilityFight(['holywater'], 'penalty');
    const ev = enemySpin(f, ['shield', 'shield', 'shield']);
    expect(ofType(ev, 'confiscate')).toHaveLength(0);
  });
  it("(what happens: AUDIT confiscates through HOLY WATER, which stays unspent)", () => {
    const f = abilityFight(['holywater'], 'penalty');
    const ev = enemySpin(f, ['shield', 'shield', 'shield']);
    expect(ofType(ev, 'confiscate')).toHaveLength(1);
    expect(f.holyWater).toBe(false);
  });
  // UNCLEAR: an ability that would do nothing still spends it (THE REPO MAN with no Charm to take: his take fizzles anyway,
  // but HOLY WATER is checked first, fightTricks.ts:468). "The first sabotage" reads like the first that would land.
  it('UNCLEAR: THE REPO MAN with nothing to take still uses it up', () => {
    const f = abilityFight(['holywater'], 'repo', false);
    enemySpin(f, ['shield', 'shield', 'shield']);
    expect(f.holyWater).toBe(true);
  });
});
