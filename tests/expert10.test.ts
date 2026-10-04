import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { createRun, fightConfig, finishFight } from '../src/core/run';
import { GATEKEEPER } from '../src/core/enemies';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function on(cabinet: CabinetId, mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.bonusSymbols = false;
  mut?.(c);
  return new Fight(c, seed);
}

describe('EXPERT_PLAYTEST_10: charms', () => {
  it('KEEN adds to every sword in its group; VAMP heals once per group', () => {
    const plain = on('knight', (c) => (c.player.strips = reels3({ sword: 6, shield: 6 })));
    plain.forceNext('player', ['sword', 'sword', 'sword']);
    const p = ofType(plain.step().events, 'attack')[0].amount;
    const keen = on('knight', (c) => {
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'keen', n: 6 }];
    });
    keen.forceNext('player', ['sword', 'sword', 'sword']);
    // One keen cell in a 3-sword jackpot: +40 for each of the 3 swords, x3 for the jackpot (CONTENT_13: was 20).
    expect(ofType(keen.step().events, 'attack')[0].amount - p).toBe(40 * 3 * 3);
    const vamp = on('knight', (c) => {
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'vamp' as const, n: 6 }));
    });
    vamp.sides.player.hp -= 100;
    vamp.forceNext('player', ['sword', 'sword', 'sword']);
    const heals = ofType(vamp.step().events, 'heal').filter((e) => e.source === 'vamp');
    expect(heals.map((h) => h.amount)).toEqual([20]);
  });
});

describe('EXPERT_PLAYTEST_10: new relics', () => {
  it('HOT STREAK: after a jackpot, the next spin pays x2', () => {
    const f = on('knight', (c) => {
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.relics = ['hotstreak'];
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const first = ofType(f.step().events, 'attack')[0].amount;
    f.step(); // enemy
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(first * 2);
  });

  it('WHETSTONE BELT: a blocked hit sharpens every sword in the next sword group', () => {
    const f = on('knight', (c) => {
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.relics = ['belt'];
    });
    f.sides.player.shield = 50;
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'shield']);
    const ev = f.step().events;
    expect(ofType(ev, 'relic').some((e) => e.relic === 'belt')).toBe(true);
    const g = on('knight', (c) => (c.player.strips = reels3({ sword: 6, shield: 6 })));
    g.forceNext('player', ['sword', 'sword', 'sword']);
    const plain = ofType(g.step().events, 'attack')[0].amount;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(plain + 10 * 3 * 3);
  });

  it('TOLL BOOTH: each held lien pays a chip after a win', () => {
    const run = createRun(base, 5, 'knight');
    run.pendingStart = null;
    run.chosen = run.chosen.map(() => true);
    run.depth = GATEKEEPER.depth + 1;
    run.liens = [{ reel: 0, symbol: 'sword' }, { reel: 1, symbol: 'shield' }];
    run.player.relics.push('toll');
    const chips = run.player.chips;
    const f = new Fight(fightConfig(run, base), 3);
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(run.player.chips - chips).toBeGreaterThanOrEqual(2);
    expect(rec.chips).toBeGreaterThanOrEqual(2);
  });
});

describe('charm levels: no dead level picks', () => {
  it('POLISH and WHETSTONE never target a maxed type (SECOND WIND instead when nothing is left)', async () => {
    const { rollChoices, BIG_SETS } = await import('../src/core/run');
    const { Rng } = await import('../src/core/rng');
    const run = createRun(base, 5, 'knight');
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'vamp', n: 2 }];
    run.player.levels.charm = { vamp: 3 };
    for (const s of ['sword', 'shield'] as const) run.player.levels.sym[s] = 3;
    for (const set of [0, 1]) {
      const ids = rollChoices(run, set, new Rng(1)).map((c) => c.id);
      expect(ids).not.toContain(BIG_SETS[set][2]);
      expect(ids).toContain('secondWind');
    }
  });
});
