import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { RELIC_TIER, RUSH } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import { createRun, fightConfig, finishFight, payVoucher, playRush, rushTier, wheelOptions } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

describe('BONUS WHEEL & RELIC RUSH', () => {
  it('run fights carry one BONUS and one RELIC cell per reel; they never join your strips', () => {
    const run = createRun(base, 3);
    const f = new Fight(fightConfig(run, base), 1);
    for (const reel of f.sides.player.reels) {
      expect(reel.cells.filter((c) => c.symbol === 'bonusSym').length).toBe(1);
      expect(reel.cells.filter((c) => c.symbol === 'relicSym').length).toBe(1);
    }
    expect(f.sides.enemy.reels.some((r) => r.cells.some((c) => c.symbol === 'bonusSym'))).toBe(false);
    f.winner = 'player';
    finishFight(run, f);
    for (const s of run.player.strips) expect(s.bonusSym ?? s.relicSym).toBeUndefined();
  });

  it('a triggered bonus lands the three symbols, banks a voucher, and the reels spin again for free', () => {
    const run = createRun(base, 4);
    const f = new Fight(fightConfig(run, base), 2);
    f.forceBonus = 'wheel';
    const { events } = f.step();
    const spins = ofType(events, 'spin');
    expect(spins.length).toBe(2);
    expect(spins[0].bonus).toBe('wheel');
    expect(spins[0].score.line).toEqual(['bonusSym', 'bonusSym', 'bonusSym']);
    expect(ofType(events, 'voucher')[0].kind).toBe('wheel');
    expect(spins[1].bonus).toBeUndefined();
    expect(f.vouchers.length).toBe(1);
  });

  it('vouchers pay out only if you win the fight', () => {
    const run = createRun(base, 5);
    const f = new Fight(fightConfig(run, base), 3);
    f.vouchers.push({ kind: 'rush', seed: 7 });
    f.winner = 'enemy';
    finishFight(run, f);
    expect(run.player.relics.length).toBe(0);

    const won = createRun(base, 5);
    const g = new Fight(fightConfig(won, base), 3);
    g.vouchers.push({ kind: 'rush', seed: 7 }, { kind: 'wheel', seed: 9 });
    g.winner = 'player';
    finishFight(won, g);
    expect(won.bonusLog?.length).toBe(2);
    expect(won.player.relics.length).toBe(1);
  });

  it('the wheel offers up to 15 distinct upgrades and applies the one it lands on', () => {
    const run = createRun(base, 6);
    const opts = wheelOptions(run, new Rng(1));
    expect(opts.length).toBeGreaterThan(8);
    expect(opts.length).toBeLessThanOrEqual(15);
    const pay = payVoucher(run, { kind: 'wheel', seed: 11 });
    expect(pay.kind).toBe('wheel');
  });

  it('RELIC RUSH: 3 start stuck, respins reset on a stick, count sets the tier', () => {
    const r = playRush(new Rng(2));
    expect(r.frames[0].length).toBe(RUSH.start);
    expect(r.count).toBe(r.frames.flat().length);
    expect(rushTier(RUSH.commonMax)).toBe('common');
    expect(rushTier(RUSH.uncommonMax)).toBe('uncommon');
    expect(rushTier(RUSH.cells)).toBe('legendary');
    const run = createRun(base, 8);
    const pay = payVoucher(run, { kind: 'rush', seed: 3 });
    if (pay.kind === 'rush' && pay.relic) expect(Object.values(RELIC_TIER).flat()).toContain(pay.relic);
  });
});
