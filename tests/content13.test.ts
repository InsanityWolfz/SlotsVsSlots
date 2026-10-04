import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { charmLevel } from '../src/core/charms';
import { createRun, fightConfig, finishFight, gildsFor } from '../src/core/run';

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

describe('CONTENT_13: charms', () => {
  it('every new charm starts at LV1 (the round-12 prototype bug)', () => {
    for (const e of ['lucre', 'trick'] as const) expect(charmLevel(createRun(base, 1, 'knight').player.levels, e)).toBe(1);
  });

  it('locks: TRICK is JOKER only; the CHIP charm (lucre) on every machine', () => {
    for (const cab of ['knight', 'tesla', 'thorn', 'joker', 'midas'] as CabinetId[]) {
      const g = gildsFor(createRun(base, 3, cab));
      expect(g.includes('trick')).toBe(cab === 'joker');
      expect(g).toContain('lucre');
    }
  });

  it('LUCRE: +3 chips each time its group pays, capped at 6 a fight, banked on a win', () => {
    const run = createRun(base, 5, 'knight');
    run.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'lucre' as const, n: 4 }));
    const cfg = fightConfig(run, base);
    cfg.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
    cfg.player.bonusSymbols = false;
    const f = new Fight(cfg, 3);
    for (let i = 0; i < 3; i++) {
      f.forceNext('player', ['sword', 'sword', 'sword']);
      f.step();
      f.step();
    }
    expect(f.lucreChips).toBe(6);
    f.winner = 'player';
    const before = run.player.chips;
    const rec = finishFight(run, f);
    expect(run.player.chips - before).toBeGreaterThanOrEqual(6);
    expect(rec.chips).toBeGreaterThanOrEqual(6);
  });

  it('TRICK fills JOKER\'s meter when it lands', () => {
    const plain = on('joker');
    plain.forceNext('player', ['sword', 'shield', 'shield']);
    plain.step();
    const trick = on('joker', (c) => (c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'trick', n: 4 }]));
    trick.forceNext('player', ['sword', 'shield', 'shield']);
    trick.step();
    expect(trick.sides.player.energy - plain.sides.player.energy).toBe(30);
  });

});

describe('CONTENT_13: relics', () => {
  const sword3 = (relics: string[], gilded: GameConfig['player']['gilded'] = []) =>
    on('knight', (c) => {
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.player.gilded = gilded;
      c.relics = relics as GameConfig['relics'];
    });

  it('CHARM BRACELET: +5% per charm type you own', () => {
    const g = [{ reel: 0, symbol: 'sword' as const, enh: 'gold' as const, n: 1 }, { reel: 1, symbol: 'shield' as const, enh: 'vamp' as const, n: 1 }];
    const plain = sword3([], g);
    plain.forceNext('player', ['sword', 'sword', 'shield']);
    const a = ofType(plain.step().events, 'attack')[0].amount;
    const br = sword3(['bracelet'], g);
    br.forceNext('player', ['sword', 'sword', 'shield']);
    expect(ofType(br.step().events, 'attack')[0].amount).toBe(Math.round(a * 1.1));
  });

  it('METRONOME: your 3rd spin pays x1.5', () => {
    const plain = sword3([]);
    const m = sword3(['metronome']);
    const amounts = (f: Fight) =>
      [0, 1, 2].map(() => {
        f.forceNext('player', ['sword', 'sword', 'shield']);
        const a = ofType(f.step().events, 'attack')[0]?.amount ?? 0;
        f.step();
        return a;
      });
    const [p, q] = [amounts(plain), amounts(m)];
    expect(q[0]).toBe(p[0]);
    expect(q[2]).toBe(Math.round(p[2] * 1.5));
  });

  it('SNAKE EYES heals on an enemy jackpot; PIT BOSS cancels the first one', () => {
    const s = sword3(['snakeeyes']);
    s.sides.player.hp -= 100;
    s.next = 'enemy';
    s.forceNext('enemy', ['shield', 'shield', 'shield']);
    expect(ofType(s.step().events, 'heal').some((h) => h.source === 'snakeeyes')).toBe(true);
    const hitBy = (relics: string[]) => {
      const f = sword3(relics);
      f.next = 'enemy';
      f.forceNext('enemy', ['sword', 'sword', 'sword']);
      return ofType(f.step().events, 'attack')[0].amount;
    };
    expect(hitBy([])).toBeGreaterThan(0);
    expect(hitBy(['pitboss'])).toBe(0);
  });

  it('TESLA COIL: a bolt next to the payline charges 5', () => {
    const t = on('tesla', (c) => {
      c.player.strips = reels3({ bolt: 12 });
      c.relics = ['coil'];
    });
    t.forceNext('player', ['bolt', 'bolt', 'bolt']);
    expect(ofType(t.step().events, 'relic').some((e) => e.relic === 'coil')).toBe(true);
  });
});
