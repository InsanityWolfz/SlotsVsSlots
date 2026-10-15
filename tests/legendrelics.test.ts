import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId, type SymbolId } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { BIG_LEGENDS, LEGEND_RELIC, LEGENDARY, RELIC_TIER, RELICS } from '../src/core/relics';
import { createRun, fightConfig, finishFight, migrateRun, relicFits, type RunState } from '../src/core/run';
import type { CabinetId } from '../src/core/cabinets';

/** The ten BIG CHOICES that became legendary relics (user, 2026-10-15). */
const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) => events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function run(cab: CabinetId, relics: RelicId[], seed = 3): RunState {
  const r = createRun(base, seed, cab);
  r.pendingStart = null;
  r.player.relics = [...relics];
  return r;
}
/** Win the run's current fight outright. */
function win(r: RunState): void {
  const f = new Fight(fightConfig(r, base), 1);
  f.winner = 'player';
  finishFight(r, f);
}
/** One player spin on a bare config with a forced payline; returns its events. */
function spin(mut: (c: GameConfig) => void, line: SymbolId[]): CombatEvent[] {
  const c = defaultConfig();
  c.seed = 7;
  c.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
  mut(c);
  const f = new Fight(c, 7);
  f.forceNext('player', line);
  return f.step().events;
}
const group = (events: CombatEvent[], sym: SymbolId) => ofType(events, 'spin')[0].score.groups.find((g) => g.symbol === sym)!;

describe('legendary relics from the big choices (2026-10-15)', () => {
  it('all ten are legendary, have a sprite, and fit only their machines', () => {
    expect(BIG_LEGENDS).toHaveLength(10);
    for (const r of BIG_LEGENDS) {
      expect(LEGENDARY.has(r)).toBe(true);
      expect(RELIC_TIER.legendary).toContain(r);
      expect(RELICS[r].text.length).toBeGreaterThan(0);
    }
    expect(relicFits(run('knight', []), 'crusade')).toBe(true);
    expect(relicFits(run('tesla', []), 'crusade')).toBe(false);
    expect(relicFits(run('knight', []), 'quickening')).toBe(false);
    expect(relicFits(run('tesla', []), 'quickening')).toBe(true);
    expect(relicFits(run('tesla', []), 'chainlightning')).toBe(true);
    expect(relicFits(run('joker', []), 'highcard')).toBe(true);
    expect(relicFits(run('jukebox', []), 'hypeman')).toBe(true);
    expect(relicFits(run('midas', []), 'openbar')).toBe(true);
    expect(relicFits(run('midas', []), 'hypeman')).toBe(false);
  });

  it('SECOND PAYLINE: a pair on the row above pays at half; enemies hit 15% harder', () => {
    const events = spin((c) => {
      c.relics = ['secondline'];
      c.player.strips = reels3({ sword: 12 });
    }, ['sword', 'sword', 'sword']);
    const line2 = ofType(events, 'secondLine')[0];
    expect(line2).toBeTruthy();
    expect(line2.groups[0].amount).toBe(Math.max(10, Math.round(group(events, 'sword').amount / 2 / 10) * 10));
    const none = spin((c) => (c.player.strips = reels3({ sword: 12 })), ['sword', 'sword', 'sword']);
    expect(ofType(none, 'secondLine')).toHaveLength(0);
    expect(fightConfig(run('knight', ['secondline']), base).enemy.lineDmg).toBe(LEGEND_RELIC.lineDmg);
    expect(fightConfig(run('knight', []), base).enemy.lineDmg).toBeUndefined();
  });

  it("DEVIL'S DUE: everything pays x1.75; -8% max HP after every win", () => {
    const r = run('knight', ['devilsdue']);
    expect(fightConfig(r, base).player.payMul).toBe(1.75);
    const max = r.player.maxHp;
    win(r);
    expect(r.player.maxHp).toBe(max - Math.round((max * 0.08) / 10) * 10);
  });

  it('THE LONG GAME: pays x0.8 at first, +3% for every fight won after you get it', () => {
    const r = run('knight', ['longgame'], 51);
    expect(fightConfig(r, base).player.payMul).toBeCloseTo(0.8);
    win(r);
    expect(r.longGame).toBe(1);
    expect(fightConfig(r, base).player.payMul).toBeCloseTo(0.83);
  });

  it('QUICKENING: the meter starts full; enemy abilities charge a spin faster', () => {
    const plain = run('tesla', []);
    const r = run('tesla', ['quickening']);
    const every = fightConfig(plain, base).enemy.ability?.every;
    if (every) expect(fightConfig(r, base).enemy.ability?.every).toBe(Math.max(2, every - 1));
    const f = new Fight(fightConfig(r, base), 1);
    expect(f.sides.player.energy).toBe(f.meterCost - 1);
    // KNIGHT has no meter: it does nothing there (and is never offered).
    const k = run('knight', ['quickening']);
    const kEvery = fightConfig(run('knight', []), base).enemy.ability?.every;
    expect(fightConfig(k, base).enemy.ability?.every).toBe(kEvery);
  });

  it('GLASS CANNON: pays x1.5, and no healing between fights (BANDAGE does nothing)', () => {
    const r = run('knight', ['glasscannon', 'bandage'], 6);
    const cfg = fightConfig(r, base);
    expect(cfg.player.payMul).toBe(1.5);
    r.player.hp = 100;
    const f = new Fight(cfg, 1);
    f.winner = 'player';
    finishFight(r, f);
    expect(r.player.hp).toBe(f.sides.player.hp);
  });

  it('CRUSADE: +5 sword damage for every fight won after you get it', () => {
    const r = run('knight', ['crusade']);
    expect(fightConfig(r, base).player.swordBonus).toBeUndefined();
    win(r);
    win(r);
    expect(r.crusadeWins).toBe(2);
    expect(fightConfig(r, base).player.swordBonus).toBe(2 * LEGEND_RELIC.crusadeStep);
    const line: SymbolId[] = ['sword', 'sword', 'sword'];
    const plain = group(spin(() => {}, line), 'sword').amount;
    const holy = group(spin((c) => (c.player.swordBonus = 10), line), 'sword');
    expect(holy.amount).toBeGreaterThan(plain);
    expect(holy.notes).toContain('CRUSADE +10');
  });

  it('CHAIN LIGHTNING: lightning damage +100%', () => {
    const strike = (relics: RelicId[]) => {
      const cfg = fightConfig(run('tesla', relics), base);
      cfg.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
      const f = new Fight(cfg, 7);
      f.sides.player.energy = cfg.specialCost - 1;
      f.forceNext('player', ['bolt', 'bolt', 'bolt']);
      return ofType(f.step().events, 'specialFire')[0].amount;
    };
    expect(strike(['chainlightning'])).toBe(2 * strike([]));
  });

  it('HIGH CARD: jackpots pay x1.5, pairs pay half', () => {
    const jack: SymbolId[] = ['sword', 'sword', 'sword'];
    const pair: SymbolId[] = ['sword', 'sword', 'shield'];
    const j0 = group(spin(() => {}, jack), 'sword').amount;
    const j1 = group(spin((c) => (c.relics = ['highcard']), jack), 'sword').amount;
    expect(Math.abs(j1 - j0 * 1.5)).toBeLessThanOrEqual(5);
    const p0 = group(spin(() => {}, pair), 'sword').amount;
    const p1 = group(spin((c) => (c.relics = ['highcard']), pair), 'sword').amount;
    expect(Math.abs(p1 - p0 / 2)).toBeLessThanOrEqual(5);
  });

  it('HYPE MAN: +1 volume before every other spin; notes pay half off the drop', () => {
    const first = (relics: RelicId[]) => {
      const cfg = fightConfig(run('jukebox', relics), base);
      cfg.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
      const f = new Fight(cfg, 7);
      f.forceNext('player', ['note', 'note', 'shield']);
      return f.step().events;
    };
    const hyped = first(['hypeman']);
    const plain = first([]);
    const before = (ev: CombatEvent[]) => ev.findIndex((e) => e.type === 'meter') >= 0 && ev.findIndex((e) => e.type === 'meter') < ev.findIndex((e) => e.type === 'spin');
    expect(before(hyped)).toBe(true);
    expect(before(plain)).toBe(false);
    expect(group(hyped, 'note').amount).toBeLessThan(group(plain, 'note').amount);
  });

  it('OPEN BAR: MAKE IT RAIN costs nothing; wins pay no chips', () => {
    const rain = (relics: RelicId[]) => {
      const cfg = fightConfig(run('midas', relics), base);
      cfg.player.chipsHeld = 0;
      cfg.enemy = { hp: 1e9, strips: reels3({ shield: 12 }) };
      const f = new Fight(cfg, 7);
      f.forceNext('player', ['goldbar', 'goldbar', 'goldbar']);
      return group(f.step().events, 'goldbar').rain;
    };
    expect(rain(['openbar'])).toBe(true);
    expect(rain([])).toBeFalsy();
    const r = run('midas', ['openbar']);
    r.player.chips = 0;
    win(r);
    expect(r.player.chips).toBe(0);
  });

  it('old saves: taken big choices become their relics; the offer and old fields are gone', () => {
    const r = run('knight', ['bandage']) as RunState & Record<string, unknown>;
    Object.assign(r, { pendingChoice: [{ id: 'temper' }], choiceQueue: [[{ id: 'heist' }]], glass: true, devil: true, crusade: true, noWinChips: true, bloodPact: true, bossHpMul: 2, trustFund: 2, big: { secondLine: true, swordBonus: 15, jackpotMul: 1.5, hype: true, strikeTwice: true, startFull: true }, abilityFaster: true, longGame: 4 });
    migrateRun(r);
    for (const k of ['glasscannon', 'devilsdue', 'crusade', 'openbar', 'secondline', 'highcard', 'hypeman', 'chainlightning', 'quickening', 'longgame'] as RelicId[]) expect(r.player.relics).toContain(k);
    expect(r.crusadeWins).toBe(3);
    expect(r.longGame).toBe(4);
    for (const k of ['pendingChoice', 'choiceQueue', 'glass', 'devil', 'crusade', 'noWinChips', 'bloodPact', 'bossHpMul', 'trustFund', 'big', 'abilityFaster']) expect(k in r).toBe(false);
    // A run with none keeps just what it had.
    const clean = run('tesla', ['bandage']);
    migrateRun(clean);
    expect(clean.player.relics).toEqual(['bandage']);
  });
});
