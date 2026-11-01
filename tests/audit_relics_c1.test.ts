/**
 * Launch audit, group relics_c1: KNIGHT, BANKROLL (midas) and TESLA machine relics. Each test forces the exact situation
 * a relic's text describes and checks the number the text promises. The claims the code broke were fixed on 2026-11-01
 * (code or text); a question still open for the user is an `it.skip('OPEN CALL: ...')`.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type Gild, type RelicId, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight, MIDAS, RAIN, highRollerMul } from '../src/core/fight';
import { LEGEND_RELIC, NEW_RELIC, RELICS, relicText } from '../src/core/relics';
import { createRun, fightConfig, finishFight, interestOn, type RunState } from '../src/core/run';
import type { CabinetId } from '../src/core/cabinets';
import { shortRelicText } from '../src/ui/run/cardText';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) => events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A fight on a real machine: no Charms (so forced stops are plain), a huge enemy that hasn't spun (no shield). */
function mk(cab: CabinetId, relics: RelicId[], opts: { chips?: number; enemyHp?: number; enemy?: SymbolId; gilded?: Gild[]; mut?: (c: GameConfig) => void } = {}): Fight {
  const c = fightConfig(createRun(base, 3, cab), base);
  c.enemy = { hp: opts.enemyHp ?? 1e6, strips: reels3({ [opts.enemy ?? 'shield']: 12 }) };
  c.player.gilded = opts.gilded ?? [];
  c.player.chipsHeld = opts.chips ?? 0;
  c.relics = relics;
  opts.mut?.(c);
  return new Fight(c, 7);
}
/** One forced player spin. */
function spin(f: Fight, line: SymbolId[]): CombatEvent[] {
  f.next = 'player';
  f.forceNext('player', line);
  return f.step().events;
}
const score = (ev: CombatEvent[]) => ofType(ev, 'spin')[0].score;
const grp = (ev: CombatEvent[], sym: SymbolId) => score(ev).groups.find((g) => g.symbol === sym)!;
const dealt = (ev: CombatEvent[]) => ofType(ev, 'attack').filter((e) => e.from === 'player').reduce((a, e) => a + e.amount, 0);
const bolts = (ev: CombatEvent[]) => ofType(ev, 'specialFire').filter((e) => e.from === 'player');
const relicFired = (ev: CombatEvent[], r: RelicId) => ofType(ev, 'relic').some((e) => e.relic === r) || !!score(ev).relics?.includes(r);
/** Arm BANKROLL's HIGH ROLLER bar. */
const arm = (f: Fight) => {
  f.sides.player.energy = f.meterCost;
  f.sides.player.armed = true;
};
/** A lethal enemy turn (sword jackpot) on a player at `hp`. */
function lethal(f: Fight, hp: number): CombatEvent[] {
  f.sides.player.hp = hp;
  f.sides.player.shield = 0;
  f.next = 'enemy';
  f.forceNext('enemy', ['sword', 'sword', 'sword']);
  return f.step().events;
}

describe('texts: full and card face, on the one machine each can appear on', () => {
  const machineOf: Record<string, CabinetId> = {
    tower: 'knight', coup: 'knight', greatsword: 'knight', crusade: 'knight',
    compound: 'midas', rainmaker: 'midas', armoredcar: 'midas', safedeposit: 'midas', parachute: 'midas', openbar: 'midas',
    capacitor: 'tesla', livewire: 'tesla', meltdown: 'tesla', chainlightning: 'tesla',
  };
  it('each is locked to its machine, and no word swap changes its text there', () => {
    for (const [id, cab] of Object.entries(machineOf) as [RelicId, CabinetId][]) {
      expect(RELICS[id].machine).toBe(cab);
      expect(relicText(id, cab)).toBe(RELICS[id].text);
    }
  });
  it('the texts the player reads (snapshot of what was audited)', () => {
    const faces = Object.fromEntries(Object.entries(machineOf).map(([id, cab]) => [id, [relicText(id as RelicId, cab), shortRelicText(id as RelicId, relicText(id as RelicId, cab))]]));
    expect(faces.tower).toEqual(['RETAIN 25% OF YOUR SHIELD EACH SPIN (MAX 10% OF YOUR HP)', 'KEEP 25% OF SHIELD, MAX 10% OF YOUR HP']);
    expect(faces.coup).toEqual(['SWORDS PAY X2 WHILE YOU HAVE MORE HP LEFT THAN THE ENEMY', 'SWORDS PAY X2 WHILE YOU LEAD ON HP']);
    expect(faces.greatsword).toEqual(['YOUR SWORDS PAY X1.5', 'YOUR SWORDS PAY X1.5']);
    expect(faces.crusade).toEqual(['+5 SWORD DAMAGE FOR EVERY FIGHT YOU WIN', '+5 SWORD DAMAGE PER FIGHT WON']);
    expect(faces.compound).toEqual(['HIGH ROLLER CAP INCREASES TO X4', 'HIGH ROLLER CAPS AT X4']);
    expect(faces.rainmaker).toEqual(['MAKE IT RAIN COSTS 2 CHIPS INSTEAD OF 10', 'MAKE IT RAIN COSTS 2 CHIPS']);
    expect(faces.armoredcar).toEqual(["HIGH ROLLER PAYOFFS COUNT THAT SPIN'S SHIELD AS CHIPS: 1 PER 5", 'HIGH ROLLER: 5 SHIELD COUNTS AS 1 CHIP']);
    expect(faces.safedeposit).toEqual(["WHEN CHIPS HIT, THEY ALSO HIT FOR THAT SPIN'S SHIELD", 'CHIPS ALSO HIT FOR YOUR SHIELD']);
    expect(faces.parachute).toEqual(['A HIT THAT WOULD KILL YOU: PAY 10 CHIPS, LAND AT 25% HP (ONCE PER FIGHT)', 'ONCE A FIGHT, PAY 10 CHIPS TO LIVE AT 25%']);
    expect(faces.openbar).toEqual(['MAKE IT RAIN COSTS NOTHING. WINS PAY NO CHIPS', 'MAKE IT RAIN IS FREE. WINS PAY NO CHIPS']);
    expect(faces.capacitor).toEqual(['25% OF LEFTOVER SHIELD CHARGES LIGHTNING', 'LEFTOVER SHIELD CHARGES LIGHTNING']);
    expect(faces.livewire).toEqual(['LIGHTNING DAMAGE +30%. EACH STORM COSTS 1 HP', 'LIGHTNING DAMAGE +30%. STORMS COST 1 HP']);
    expect(faces.meltdown).toEqual(['LIGHTNING DAMAGE +1% FOR EACH HP YOU ARE MISSING (MAX 50%)', 'LIGHTNING DAMAGE: +1% PER MISSING HP, TO 50%']);
    expect(faces.chainlightning).toEqual(['LIGHTNING DAMAGE +100%', 'LIGHTNING DAMAGE +100%']);
  });
  // Card faces keep the limits the full text has (fixed 2026-11-01: they promised more than the game gives).
  it('TOWER SHIELD face names the cap', () => {
    expect(shortRelicText('tower', RELICS.tower.text)).toMatch(/MAX/);
  });
  it('MELTDOWN face names the 50% cap', () => {
    expect(shortRelicText('meltdown', RELICS.meltdown.text)).toMatch(/50%/);
  });
  it('ARMORED CAR face names the rate (5 shield = 1 chip)', () => {
    expect(shortRelicText('armoredcar', RELICS.armoredcar.text)).toMatch(/5/);
  });
  it('GOLDEN PARACHUTE face names ONCE A FIGHT', () => {
    expect(shortRelicText('parachute', RELICS.parachute.text)).toMatch(/ONCE|A FIGHT/);
  });
});

describe('KNIGHT', () => {
  // TOWER SHIELD: shields reset at the start of your own spin; TOWER keeps a share of what's left.
  const towerKeep = (held: number, relics: RelicId[] = ['tower']) => {
    const f = mk('knight', relics);
    f.sides.player.shield = held;
    const ev = spin(f, ['sword', 'sword', 'sword']); // no shield this spin, so what's left is what was kept
    return { kept: f.sides.player.shield, fired: relicFired(ev, 'tower'), maxHp: f.sides.player.maxHp };
  };
  it('TOWER SHIELD: retains 25% of the leftover shield (80 -> 20, 120 -> 30)', () => {
    expect(towerKeep(80).kept).toBe(20);
    expect(towerKeep(120).kept).toBe(30);
    expect(towerKeep(80, []).kept).toBe(0);
  });
  it('TOWER SHIELD: capped at 10% of your max HP (390 HP: 400 leftover keeps 39)', () => {
    const r = towerKeep(400);
    expect(r.maxHp).toBe(390);
    expect(r.kept).toBe(Math.round(r.maxHp * NEW_RELIC.towerCap));
    expect(r.kept).toBe(39);
  });
  it('TOWER SHIELD: it carries on every spin (a kept shield decays 39 -> 10 -> 3 with no new shields)', () => {
    const f = mk('knight', ['tower']);
    f.sides.player.shield = 160;
    spin(f, ['sword', 'sword', 'sword']);
    expect(f.sides.player.shield).toBe(39);
    spin(f, ['sword', 'sword', 'sword']);
    expect(f.sides.player.shield).toBe(10);
  });
  it('TOWER SHIELD: a lone KNIGHT shield left over (16) keeps 4 (whole HP, not tens)', () => {
    const r = towerKeep(16);
    expect(r.kept).toBe(4);
    expect(r.fired).toBe(true);
  });
  it('TOWER SHIELD: 16 keeps 4, 32 keeps 8, 48 keeps 12 (exactly 25%)', () => {
    expect([16, 32, 48].map((h) => towerKeep(h).kept)).toEqual([4, 8, 12]);
  });

  it('COUP DE GRACE: swords pay x2 while your HP is above the enemy\'s', () => {
    const pair: SymbolId[] = ['sword', 'sword', 'shield'];
    const plain = grp(spin(mk('knight', [], { enemyHp: 100 }), pair), 'sword').amount;
    const ev = spin(mk('knight', ['coup'], { enemyHp: 100 }), pair);
    expect(grp(ev, 'sword').amount).toBe(plain * 2);
    expect(relicFired(ev, 'coup')).toBe(true);
    // A single sword too ("SWORDS").
    const one: SymbolId[] = ['sword', 'shield', 'shield'];
    expect(grp(spin(mk('knight', ['coup'], { enemyHp: 100 }), one), 'sword').amount).toBe(2 * grp(spin(mk('knight', [], { enemyHp: 100 }), one), 'sword').amount);
  });
  it('COUP DE GRACE: no x2 when the HP is equal or the enemy has more; shields never double', () => {
    const pair: SymbolId[] = ['sword', 'sword', 'shield'];
    const plain = grp(spin(mk('knight', [], { enemyHp: 1e6 }), pair), 'sword').amount;
    expect(grp(spin(mk('knight', ['coup'], { enemyHp: 1e6 }), pair), 'sword').amount).toBe(plain);
    const eq = mk('knight', ['coup'], { enemyHp: 390 });
    expect(eq.sides.player.hp).toBe(390);
    expect(grp(spin(eq, pair), 'sword').amount).toBe(plain);
    const lead = spin(mk('knight', ['coup'], { enemyHp: 100 }), pair);
    expect(grp(lead, 'shield').amount).toBe(grp(spin(mk('knight', [], { enemyHp: 100 }), pair), 'shield').amount);
  });
  it('COUP DE GRACE: it reads current HP, not max (hurt to 100 vs an enemy at 150: no x2)', () => {
    const f = mk('knight', ['coup'], { enemyHp: 150 });
    f.sides.player.hp = 100;
    const pair: SymbolId[] = ['sword', 'sword', 'shield'];
    expect(relicFired(spin(f, pair), 'coup')).toBe(false);
  });

  it('GREATSWORD: swords pay x1.5 (single, pair and jackpot); shields don\'t', () => {
    for (const line of [['sword', 'shield', 'shield'], ['sword', 'sword', 'shield'], ['sword', 'sword', 'sword']] as SymbolId[][]) {
      const plain = grp(spin(mk('knight', []), line), 'sword').amount;
      expect(grp(spin(mk('knight', ['greatsword']), line), 'sword').amount).toBe(Math.round(plain * 1.5));
    }
    const line: SymbolId[] = ['sword', 'sword', 'shield'];
    expect(grp(spin(mk('knight', ['greatsword']), line), 'shield').amount).toBe(grp(spin(mk('knight', []), line), 'shield').amount);
  });
  it('GREATSWORD and COUP stack (x1.5 x2 = x3)', () => {
    const line: SymbolId[] = ['sword', 'sword', 'shield'];
    const plain = grp(spin(mk('knight', [], { enemyHp: 100 }), line), 'sword').amount;
    expect(grp(spin(mk('knight', ['greatsword', 'coup'], { enemyHp: 100 }), line), 'sword').amount).toBe(plain * 3);
  });

  describe('CRUSADE', () => {
    const run = (relics: RelicId[]): RunState => {
      const r = createRun(base, 3, 'knight');
      r.pendingStart = null;
      r.player.relics = [...relics];
      return r;
    };
    const win = (r: RunState) => {
      const f = new Fight(fightConfig(r, base), 1);
      f.winner = 'player';
      finishFight(r, f);
    };
    const swordPay = (r: RunState, line: SymbolId[]) => {
      const c = fightConfig(r, base);
      c.enemy = { hp: 1e6, strips: reels3({ shield: 12 }) };
      c.player.gilded = [];
      const f = new Fight(c, 7);
      f.sides.player.hp = f.sides.player.maxHp;
      return grp(spin(f, line), 'sword').amount;
    };
    it('+5 per sword per fight won since you took it (one win: a single sword +5; two wins: +10)', () => {
      const r = run(['crusade']);
      const one: SymbolId[] = ['sword', 'shield', 'shield'];
      const s0 = swordPay(r, one);
      win(r);
      expect(swordPay(r, one)).toBe(s0 + 5);
      win(r);
      expect(swordPay(r, one)).toBe(s0 + 10);
      // A pair: each sword +10, then the pair's x2 (so +40 on the hit).
      const pair: SymbolId[] = ['sword', 'sword', 'shield'];
      expect(swordPay(r, pair)).toBe(swordPay(run(['crusade']), pair) + 2 * 10 * base.pairMult);
    });
    it('wins before you took it don\'t count; a lost fight doesn\'t count', () => {
      const r = run([]);
      win(r);
      win(r);
      r.player.relics.push('crusade');
      expect(fightConfig(r, base).player.swordBonus).toBeUndefined();
      win(r);
      expect(fightConfig(r, base).player.swordBonus).toBe(LEGEND_RELIC.crusadeStep);
      const f = new Fight(fightConfig(r, base), 1);
      f.winner = 'enemy';
      finishFight(r, f);
      expect(r.crusadeWins).toBe(1);
    });
  });
});

describe('BANKROLL', () => {
  it('COMPOUND: the HIGH ROLLER cap goes from x2.5 to x4 (60+ chips)', () => {
    const pay = (relics: RelicId[], chips: number) => {
      const f = mk('midas', relics, { chips });
      arm(f);
      const ev = spin(f, ['goldbar', 'goldbar', 'shield']);
      return { mul: f.vaultPaid || ofType(ev, 'payoff')[0]?.mul, amt: grp(ev, 'goldbar').amount, fired: relicFired(ev, 'compound') };
    };
    expect(pay([], 100).mul).toBe(MIDAS.maxMul);
    expect(pay(['compound'], 60).mul).toBe(4);
    expect(pay(['compound'], 100).mul).toBe(4);
    expect(pay(['compound'], 100).amt).toBe(pay([], 100).amt * (4 / 2.5));
    // Under the old cap it changes nothing.
    expect(pay(['compound'], 20).mul).toBe(pay([], 20).mul);
    expect(pay(['compound'], 20).fired).toBe(false);
  });

  describe('RAINMAKER', () => {
    it('MAKE IT RAIN costs 2 chips instead of 10', () => {
      const f = mk('midas', ['rainmaker'], { chips: 20 });
      const ev = spin(f, ['goldbar', 'goldbar', 'goldbar']);
      expect(ofType(ev, 'makeItRain')[0].cost).toBe(2);
      expect(f.chipsNow()).toBe(20 + 3 - RAIN.chipLess - 2);
      const g = mk('midas', [], { chips: 20 });
      expect(ofType(spin(g, ['goldbar', 'goldbar', 'goldbar']), 'makeItRain')[0].cost).toBe(RAIN.cost);
      expect(RAIN.cost).toBe(10);
    });
    it('it rains from 2 chips held (not 10)', () => {
      expect(ofType(spin(mk('midas', ['rainmaker'], { chips: 2 }), ['goldbar', 'goldbar', 'goldbar']), 'makeItRain')).toHaveLength(1);
      expect(ofType(spin(mk('midas', [], { chips: 9 }), ['goldbar', 'goldbar', 'goldbar']), 'makeItRain')).toHaveLength(0);
      expect(ofType(spin(mk('midas', ['rainmaker'], { chips: 1 }), ['goldbar', 'goldbar', 'goldbar']), 'makeItRain')).toHaveLength(0);
    });
    it('with 2-4 chips the rain still hits at least the plain chip jackpot it replaces (the floor)', () => {
      const plain = dealt(spin(mk('midas', [], { chips: 3 }), ['goldbar', 'goldbar', 'goldbar']));
      const rain = dealt(spin(mk('midas', ['rainmaker'], { chips: 3 }), ['goldbar', 'goldbar', 'goldbar']));
      expect(plain).toBe(90);
      expect(rain).toBe(plain);
    });
  });

  describe('ARMORED CAR', () => {
    // HIGH ROLLER's multiplier for a chip count is highRollerMul(chips): 1 + chips / 20 in quarter steps, max x2.5.
    const payoff = (relics: RelicId[], line: SymbolId[], chips: number, gilded: Gild[] = []) => {
      const f = mk('midas', relics, { chips, gilded });
      arm(f);
      const ev = spin(f, line);
      const shieldGained = ofType(ev, 'shieldGain').filter((e) => e.side === 'player').reduce((a, e) => a + e.amount, 0);
      return { mul: ofType(ev, 'payoff')[0]?.mul ?? 0, shieldGained, chipAmt: grp(ev, 'goldbar')?.amount ?? 0, fired: relicFired(ev, 'armoredcar') };
    };
    it('a HIGH ROLLER payoff counts that spin\'s shield as chips, 1 per 5 (40 shield = 8 chips)', () => {
      const line: SymbolId[] = ['shield', 'shield', 'goldbar'];
      const on = payoff(['armoredcar'], line, 20);
      expect(on.shieldGained).toBe(40);
      expect(on.mul).toBe(highRollerMul(20 + 40 / 5));
      expect(on.mul).toBe(2.5);
      expect(payoff([], line, 20).mul).toBe(2);
      expect(on.fired).toBe(true);
      // From 0 chips: 40 shield = 8 chips = x1.4, shown in quarter steps as x1.5.
      expect(payoff(['armoredcar'], line, 0).mul).toBe(highRollerMul(8));
    });
    it('1 per 5 means whole fives only: a 10 shield is 2 chips (x1.1 rounds to x1 on the quarter steps)', () => {
      const one = payoff(['armoredcar'], ['goldbar', 'goldbar', 'shield'], 0);
      expect(one.shieldGained).toBe(10);
      expect(one.mul).toBe(highRollerMul(2));
    });
    it('the HIGH ROLLER cap still holds (x2.5; x4 with COMPOUND)', () => {
      expect(payoff(['armoredcar'], ['shield', 'shield', 'goldbar'], 60).mul).toBe(2.5);
      expect(payoff(['armoredcar', 'compound'], ['shield', 'shield', 'goldbar'], 60).mul).toBe(highRollerMul(68, 4));
    });
    it('only on a HIGH ROLLER payoff: an unarmed bar changes nothing', () => {
      const run = (relics: RelicId[]) => {
        const f = mk('midas', relics, { chips: 20 });
        return grp(spin(f, ['shield', 'shield', 'goldbar']), 'goldbar').amount;
      };
      expect(run(['armoredcar'])).toBe(run([]));
    });
    it('it only reads the shield: the chips you hold don\'t change', () => {
      const f = mk('midas', ['armoredcar'], { chips: 20 });
      arm(f);
      spin(f, ['shield', 'shield', 'goldbar']);
      expect(f.chipsNow()).toBe(20 + 1);
    });
    it("\"THAT SPIN'S SHIELD\" is the shield as it lands: a GOLD shield pair gains 160 and counts as 32 chips", () => {
      // (Fixed 2026-11-01: it read the shield before GOLD and the relics, 40 of the 160.)
      const gilded: Gild[] = [0, 1].map((reel) => ({ reel, symbol: 'shield', enh: 'gold', n: 6 }));
      const r = payoff(['armoredcar'], ['shield', 'shield', 'goldbar'], 0, gilded);
      expect(r.shieldGained).toBe(160);
      expect(r.mul).toBe(highRollerMul(160 / 5));
    });
    it('with two GOLD shields: 160 shield gained, HIGH ROLLER pays x2.5 (the cap), as SAFE DEPOSIT would count it', () => {
      const gilded: Gild[] = [0, 1].map((reel) => ({ reel, symbol: 'shield', enh: 'gold', n: 6 }));
      const r = payoff(['armoredcar'], ['shield', 'shield', 'goldbar'], 0, gilded);
      expect(r.shieldGained).toBe(160);
      expect(r.mul).toBe(2.5);
    });
  });

  describe('SAFE DEPOSIT', () => {
    it('a chip hit also hits for that spin\'s shield (40 chips + 10 shield = 50)', () => {
      const line: SymbolId[] = ['goldbar', 'goldbar', 'shield'];
      const plain = dealt(spin(mk('midas', []), line));
      const ev = spin(mk('midas', ['safedeposit']), line);
      expect(plain).toBe(40);
      expect(dealt(ev)).toBe(50);
      expect(relicFired(ev, 'safedeposit')).toBe(true);
    });
    it('the shield is that spin\'s (gained), not the shield you already hold', () => {
      const f = mk('midas', ['safedeposit']);
      f.sides.player.shield = 0;
      // Held shield from before resets at your spin's start anyway; a spin with no shield adds nothing.
      const ev = spin(f, ['goldbar', 'goldbar', 'goldbar']);
      expect(relicFired(ev, 'safedeposit')).toBe(false);
      expect(dealt(ev)).toBe(dealt(spin(mk('midas', []), ['goldbar', 'goldbar', 'goldbar'])));
    });
    it('it counts the shield after Charms (two GOLD shields: 160 gained, the chip hits for +160)', () => {
      const gilded: Gild[] = [0, 1].map((reel) => ({ reel, symbol: 'shield', enh: 'gold', n: 6 }));
      const ev = spin(mk('midas', ['safedeposit'], { gilded }), ['shield', 'shield', 'goldbar']);
      const gained = ofType(ev, 'shieldGain').reduce((a, e) => a + e.amount, 0);
      expect(gained).toBe(160);
      expect(dealt(ev)).toBe(grp(ev, 'goldbar').amount + 160);
    });
    it('the extra isn\'t multiplied by HIGH ROLLER (it adds after)', () => {
      const f = mk('midas', ['safedeposit'], { chips: 20 });
      arm(f);
      const ev = spin(f, ['goldbar', 'goldbar', 'shield']);
      expect(dealt(ev)).toBe(grp(ev, 'goldbar').amount + 10);
    });
    it('two chip singles on one spin: only the first gets the shield (once a spin)', () => {
      const ev = spin(mk('midas', ['safedeposit']), ['goldbar', 'shield', 'goldbar']);
      const hits = ofType(ev, 'attack').filter((e) => e.from === 'player').map((e) => e.amount);
      expect(hits).toEqual([20, 10]);
    });
  });

  describe('GOLDEN PARACHUTE', () => {
    it('a killing hit: pay 10 chips, land at 25% HP (340 HP: 85)', () => {
      const f = mk('midas', ['parachute'], { chips: 10, enemy: 'sword' });
      const ev = lethal(f, 5);
      expect(f.over).toBe(false);
      expect(relicFired(ev, 'parachute')).toBe(true);
      expect(f.parachuteChips).toBe(10);
      expect(f.sides.player.maxHp).toBe(340);
      expect(f.sides.player.hp).toBe(85);
    });
    it('"LAND AT 25% HP" is exactly 25%, rounded to a whole HP', () => {
      const f = mk('midas', ['parachute'], { chips: 10, enemy: 'sword' });
      lethal(f, 5);
      expect(f.sides.player.hp).toBe(Math.round(f.sides.player.maxHp * 0.25));
    });
    it('under 10 chips it can\'t pay: you fall', () => {
      const f = mk('midas', ['parachute'], { chips: 9, enemy: 'sword' });
      lethal(f, 5);
      expect(f.over).toBe(true);
      expect(f.winner).toBe('enemy');
    });
    it('chips won this fight count toward the 10', () => {
      const f = mk('midas', ['parachute'], { chips: 9, enemy: 'sword' });
      spin(f, ['goldbar', 'goldbar', 'shield']); // +1 chip
      lethal(f, 5);
      expect(f.over).toBe(false);
    });
    it('once per fight: the second killing hit kills (with 20+ chips)', () => {
      const f = mk('midas', ['parachute'], { chips: 50, enemy: 'sword' });
      lethal(f, 5);
      expect(f.over).toBe(false);
      lethal(f, 5);
      expect(f.over).toBe(true);
      expect(f.parachuteChips).toBe(10);
    });
    it('no killing hit, no charge', () => {
      const f = mk('midas', ['parachute'], { chips: 50, enemy: 'sword' });
      lethal(f, 300);
      expect(f.over).toBe(false);
      expect(f.parachuteChips).toBe(0);
    });
    it('the 10 chips come off your purse after the fight', () => {
      const r = createRun(base, 3, 'midas');
      r.pendingStart = null;
      r.player.relics = ['parachute', 'openbar'];
      r.player.chips = 30;
      const f = new Fight(fightConfig(r, base), 1);
      f.sides.enemy.reels.forEach((reel) => reel.cells.push({ symbol: 'sword', slimed: false }));
      expect(relicFired(lethal(f, 5), 'parachute')).toBe(true);
      expect(f.chipsNow()).toBe(20);
      f.winner = 'player';
      finishFight(r, f);
      // (OPEN BAR keeps the win's chips out of the sum: 30 - 10 once, then interest on the 20.)
      expect(r.player.chips).toBe(20 + interestOn(20));
    });
    it('the 10 chips leave your hand when it fires (HIGH ROLLER and MAKE IT RAIN no longer count them)', () => {
      // (Fixed 2026-11-01: chipsNow() still counted them for the rest of the fight.)
      const f = mk('midas', ['parachute'], { chips: 10, enemy: 'sword' });
      lethal(f, 5);
      expect(f.chipsNow()).toBe(0);
    });
    it('after paying, the same 10 chips can\'t make it rain', () => {
      const f = mk('midas', ['parachute'], { chips: 10, enemy: 'sword' });
      lethal(f, 5);
      expect(f.chipsNow()).toBe(0);
      expect(ofType(spin(f, ['goldbar', 'goldbar', 'goldbar']), 'makeItRain')).toHaveLength(0);
    });
  });

  describe('OPEN BAR', () => {
    it('MAKE IT RAIN costs nothing (chips held stay, plus the jackpot\'s own)', () => {
      const f = mk('midas', ['openbar'], { chips: 40 });
      const ev = spin(f, ['goldbar', 'goldbar', 'goldbar']);
      expect(ofType(ev, 'makeItRain')[0].cost).toBe(0);
      expect(f.chipsNow()).toBe(40 + 3 - RAIN.chipLess);
    });
    it('wins pay no chips (the win, the machine\'s +1, elite and jackpot chips); interest still pays', () => {
      const r = createRun(base, 3, 'midas');
      r.pendingStart = null;
      r.player.relics = ['openbar'];
      r.player.chips = 30;
      const f = new Fight(fightConfig(r, base), 1);
      f.playerJackpots = 3;
      f.winner = 'player';
      finishFight(r, f);
      expect(r.player.chips).toBe(30 + interestOn(30));
      const p = createRun(base, 3, 'midas');
      p.pendingStart = null;
      p.player.chips = 30;
      const g = new Fight(fightConfig(p, base), 1);
      g.playerJackpots = 3;
      g.winner = 'player';
      finishFight(p, g);
      expect(p.player.chips).toBeGreaterThan(30 + interestOn(30));
    });
    it('chips won by chip symbols mid-fight are still paid', () => {
      const f = mk('midas', ['openbar']);
      spin(f, ['goldbar', 'goldbar', 'shield']);
      expect(f.midasChips).toBe(1);
    });
    // (user, 2026-11-01: a rain never hits for less than the chip jackpot it replaces.)
    it('with 0 chips, OPEN BAR\'s free rain still hits at least the plain chip jackpot', () => {
      const f = mk('midas', ['openbar'], { chips: 0 });
      expect(dealt(spin(f, ['goldbar', 'goldbar', 'goldbar']))).toBeGreaterThanOrEqual(90);
    });
  });
});

describe('TESLA (one axis: boosts add charge, half-size bolts of 22 for 20 charge)', () => {
  it('the machine as audited: 20 charge a bolt, 22 a bolt, a bolt pair is 40 charge (2 bolts)', () => {
    const f = mk('tesla', []);
    expect(f.cfg.specialCost).toBe(20);
    expect(f.cfg.specialDamage).toBe(22);
    const ev = spin(f, ['bolt', 'bolt', 'shield']);
    expect(ofType(ev, 'energyGain')[0].amount).toBe(40);
    expect(bolts(ev).map((b) => b.amount)).toEqual([22, 22]);
  });
  /** Lightning over a fight: the damage dealt plus the charge still waiting (at 22 per 20). */
  const lightning = (relics: RelicId[], spins: number, line: SymbolId[] = ['bolt', 'bolt', 'shield'], hurt = 0) => {
    // (OVERTIME off: 20 spins in, it grows every strike, with or without a relic.)
    const f = mk('tesla', relics, { mut: (c) => (c.overtime = false) });
    let dmg = 0;
    for (let i = 0; i < spins; i++) {
      f.sides.player.hp = f.sides.player.maxHp - hurt;
      dmg += bolts(spin(f, line)).reduce((a, b) => a + b.amount, 0);
    }
    return { dmg, total: dmg + (f.sides.player.energy * f.cfg.specialDamage) / f.cfg.specialCost };
  };

  describe('LIVE WIRE', () => {
    it('lightning damage +30% over a fight (20 bolt pairs: 40 bolts -> 52)', () => {
      const plain = lightning([], 20);
      const live = lightning(['livewire'], 20);
      expect(plain.dmg).toBe(40 * 22);
      expect(live.dmg).toBe(52 * 22);
      expect(live.total / plain.total).toBeCloseTo(1.3, 5);
    });
    it('(documented) one storm: the +30% is charge, so a single bolt pair still fires 2 bolts (44), 12 charge waits', () => {
      const f = mk('tesla', ['livewire']);
      const ev = spin(f, ['bolt', 'bolt', 'shield']);
      expect(bolts(ev).reduce((a, b) => a + b.amount, 0)).toBe(44);
      expect(f.sides.player.energy).toBe(12);
    });
    it('each storm costs 1 HP, once a storm however many bolts it fires', () => {
      const f = mk('tesla', ['livewire']);
      f.sides.player.hp = 200;
      const ev = spin(f, ['bolt', 'bolt', 'bolt']);
      expect(bolts(ev).length).toBeGreaterThan(2);
      expect(ofType(ev, 'hpCost')).toHaveLength(1);
      expect(ofType(ev, 'hpCost')[0].amount).toBe(1);
      // (The storm's heal of 15 lands after it.)
      expect(f.sides.player.hp).toBe(200 - 1 + 15);
    });
    it('no storm, no cost; never lethal at 1 HP', () => {
      const f = mk('tesla', ['livewire']);
      f.sides.player.hp = 200;
      const ev = spin(f, ['bolt', 'shield', 'shield']); // 10 charge: no storm
      expect(bolts(ev)).toHaveLength(0);
      expect(ofType(ev, 'hpCost')).toHaveLength(0);
      const g = mk('tesla', ['livewire']);
      g.sides.player.hp = 1;
      const ev2 = spin(g, ['bolt', 'bolt', 'shield']);
      expect(ofType(ev2, 'hpCost')).toHaveLength(0);
      expect(g.over).toBe(false);
    });
  });

  describe('MELTDOWN', () => {
    const gain = (relics: RelicId[], missing: number) => {
      const f = mk('tesla', relics);
      f.sides.player.hp = f.sides.player.maxHp - missing;
      const ev = spin(f, ['bolt', 'bolt', 'shield']);
      return { charge: ofType(ev, 'energyGain')[0].amount, dmg: bolts(ev).reduce((a, b) => a + b.amount, 0), fired: relicFired(ev, 'meltdown') };
    };
    it('+1% per HP missing (30 missing: 40 charge -> 52)', () => {
      expect(gain(['meltdown'], 30).charge).toBe(52);
      expect(gain(['meltdown'], 10).charge).toBe(44);
    });
    it('max +50% (50 HP missing reaches it; 200 missing is still +50%)', () => {
      expect(gain(['meltdown'], 50).charge).toBe(60);
      expect(gain(['meltdown'], 200).charge).toBe(60);
      expect(gain(['meltdown'], 200).dmg).toBe(66);
      expect(gain([], 200).dmg).toBe(44);
    });
    it('at full HP it does nothing', () => {
      expect(gain(['meltdown'], 0).charge).toBe(40);
      expect(gain(['meltdown'], 0).fired).toBe(false);
    });
    it('over a fight at 30 HP missing it is +30% lightning damage', () => {
      expect(lightning(['meltdown'], 20, undefined, 30).total / lightning([], 20, undefined, 30).total).toBeCloseTo(1.3, 5);
    });
  });

  describe('CHAIN LIGHTNING', () => {
    it('lightning damage +100% (a bolt pair: 2 bolts -> 4, each the same 22)', () => {
      const f = mk('tesla', ['chainlightning']);
      const ev = spin(f, ['bolt', 'bolt', 'shield']);
      expect(bolts(ev).map((b) => b.amount)).toEqual([22, 22, 22, 22]);
      expect(lightning(['chainlightning'], 20).total / lightning([], 20).total).toBeCloseTo(2, 5);
    });
    it('the boosts add (LIVE WIRE + CHAIN = +130%, not x2.6)', () => {
      expect(lightning(['chainlightning', 'livewire'], 20).total / lightning([], 20).total).toBeCloseTo(2.3, 5);
    });
  });

  describe('CAPACITOR', () => {
    const cap = (relics: RelicId[], held: number) => {
      const f = mk('tesla', relics);
      f.sides.player.shield = held;
      const ev = spin(f, ['shield', 'shield', 'shield']);
      const fromCap = ofType(ev, 'energyGain').filter((e) => e.reels.length === 0).reduce((a, e) => a + e.amount, 0);
      return { fromCap, fired: relicFired(ev, 'capacitor') };
    };
    it('25% of leftover shield charges lightning (40 -> 10, 80 -> 20)', () => {
      expect(cap(['capacitor'], 40).fromCap).toBe(10);
      expect(cap(['capacitor'], 80).fromCap).toBe(20);
      expect(cap([], 80).fromCap).toBe(0);
    });
    it('no leftover shield, no charge', () => {
      expect(cap(['capacitor'], 0).fired).toBe(false);
    });
    it('the lightning boosts grow that charge too (one axis: LIVE WIRE makes 80 leftover charge 26)', () => {
      expect(cap(['capacitor', 'livewire'], 80).fromCap).toBe(26);
    });
    it('it fires the storm on your spin (a charge that reaches 20 strikes)', () => {
      const f = mk('tesla', ['capacitor']);
      f.sides.player.shield = 80;
      expect(bolts(spin(f, ['shield', 'shield', 'shield']))).toHaveLength(1);
    });
    it('a lone TESLA shield left over (10) charges 3 (whole charge, not tens)', () => {
      expect(cap(['capacitor'], 10).fromCap).toBeGreaterThan(0);
    });
    it('25%, rounded to a whole charge: 10 -> 3, 20 -> 5, 30 -> 8, 60 -> 15', () => {
      expect([10, 20, 30, 60].map((h) => cap(['capacitor'], h).fromCap)).toEqual([3, 5, 8, 15]);
    });
  });
});
