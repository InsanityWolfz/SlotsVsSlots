import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { actLength, generateRunPaths } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { Rng } from '../src/core/rng';
import { createRun, enemyHp, fightConfig, fightNumber, finishFight, runActs, totalFights } from '../src/core/run';
import { STAKE } from '../src/core/stakes';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 99, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}
const dealerCfg = (c: GameConfig) => (c.enemy = { hp: 100, strips: reels3({ shield: 12 }), ability: { kind: 'deal', every: 1, power: 0 }, boss: 'dealer' });

describe('ACT 3: the run', () => {
  it('act 3 needs the unlock AND GREEN stake; it has 3 fights, a fork in the middle, and the Dealer', () => {
    expect(runActs(createRun(base, 1, 'knight', 1, true))).toBe(2);
    expect(runActs(createRun(base, 1, 'knight', STAKE.act3, false))).toBe(2);
    const run = createRun(base, 1, 'knight', STAKE.act3, true);
    expect(runActs(run)).toBe(3);
    expect(totalFights(run)).toBe(16);
    const paths = generateRunPaths(new Rng(3), 3);
    expect(paths.length).toBe(actLength(3) + 1);
    expect(paths.map((o) => o.length)).toEqual([1, 2, 1, 1]);
    expect(paths[3][0].boss).toBe('dealer');
  });

  it('beating the Mirror at GREEN goes to act 3 (full heal, Cashier, no legendary); beating the Dealer wins', () => {
    const run = createRun(base, 2, 'knight', STAKE.act3, true);
    run.act = 2;
    run.paths = generateRunPaths(new Rng(4), 2);
    run.enemies = run.paths.map((o) => o[0]);
    run.depth = actLength(2);
    run.player.hp = 3;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.over).toBe(false);
    expect(run.act).toBe(3);
    expect(run.player.hp).toBe(run.player.maxHp);
    expect(run.pendingLegend).toBeNull();
    expect(run.actIntro).toBe(true);
    expect(fightNumber(run)).toBe(13);
    run.depth = actLength(3);
    const cfg = fightConfig(run, base);
    expect(cfg.enemy.boss).toBe('dealer');
    expect(cfg.enemy.hp).toBe(enemyHp(run, run.enemies[actLength(3)]));
    const d = new Fight(cfg, 2);
    d.winner = 'player';
    finishFight(run, d);
    expect(run.over && run.won).toBe(true);
  });
});

describe('ACT 3: enemies', () => {
  it('CARD SHARP: marked cards are dead and bite on your payline', () => {
    const f = fight((c) => (c.player.strips = [{ sword: 11, bolt: 1 }, { sword: 12 }, { sword: 12 }]));
    const reel = f.sides.player.reels[0];
    const i = reel.cells.findIndex((c) => c.symbol === 'bolt');
    reel.cells[i].carded = true;
    f.forceNext('player', ['card', 'sword', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'spin')[0].score.line[0]).toBe('card');
    expect(ofType(events, 'markedHit')[0]).toMatchObject({ amount: 2 });
  });

  it('PIT BOSS confiscates a gild (your set first) for the fight', () => {
    const f = fight((c) => {
      c.enemy = { hp: 99, strips: [{ gavel: 12 }, { gavel: 12 }, { shield: 12 }] };
      c.player.gilded = [
        ...[0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const })),
        { reel: 0, symbol: 'bolt' as SymbolId, enh: 'charged' as const },
      ];
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['gavel', 'gavel', 'shield']);
    const c = ofType(f.step().events, 'confiscate')[0];
    expect(c.enhs).toEqual(['gold']);
    for (const ref of c.cells) expect(f.sides.player.reels[ref.reel].cells[ref.index].enh).toBeUndefined();
  });

  it('CROUPIER rakes: your groups pay 1 less while it lasts', () => {
    const f = fight((c) => (c.player.strips = reels3({ sword: 12 })));
    f.sides.player.raked = 2;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(8);
    expect(f.sides.player.raked).toBe(1);
  });
});

describe('THE DEALER', () => {
  it('telegraphs its first card, and cannot fall below half HP before it has dealt', () => {
    const f = fight((c) => {
      dealerCfg(c);
      c.player.strips = reels3({ sword: 12 });
    });
    f.sides.enemy.hp = 52;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'dealNext').length).toBe(1);
    expect(f.sides.enemy.hp).toBe(50);
  });

  it('SHUFFLE swaps cells between two reels (a live FULL SET is immune); CUT removes one cell per reel', () => {
    const f = fight((c) => {
      dealerCfg(c);
      c.player.strips = [{ sword: 12 }, { bolt: 12 }, { shield: 12 }];
    });
    f.nextDeal = 'shuffle';
    f.next = 'enemy';
    const sh = ofType(f.step().events, 'shuffle')[0];
    expect(sh.swaps.length).toBe(5);
    const [a, b] = sh.reels;
    expect(f.sides.player.reels[a].cells.some((c) => c.symbol !== f.sides.player.reels[a].cells[0].symbol || true)).toBe(true);
    const mixed = f.sides.player.reels[a].cells.filter((c) => c.symbol === f.sides.player.reels[b].cells[sh.swaps[0][1]].symbol).length;
    expect(mixed).toBeGreaterThan(0);

    const g = fight((c) => {
      dealerCfg(c);
      c.player.strips = reels3({ sword: 8, shield: 4 });
    });
    g.nextDeal = 'cut';
    g.next = 'enemy';
    const cut = ofType(g.step().events, 'cut')[0];
    expect(cut.cells.length).toBe(3);
    expect(g.sides.player.reels.every((r) => r.cells.length === 11)).toBe(true);
  });

  it('RAISE doubles its next hit and your next jackpot', () => {
    const f = fight((c) => {
      dealerCfg(c);
      c.enemy!.strips = reels3({ sword: 12 });
      c.player.strips = reels3({ sword: 12 });
    });
    f.nextDeal = 'raise';
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'shield', 'shield']);
    f.step(); // it swings (1), then deals RAISE
    expect(f.raiseEnemy && f.raisePlayer).toBe(true);
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const g = ofType(f.step().events, 'spin')[0].score.groups[0];
    expect(g.notes).toContain('RAISE X2');
    expect(g.amount).toBe(18);
  });
});
