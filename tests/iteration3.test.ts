import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { ELITE_HP_MUL } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, RUN } from '../src/core/run';
import { effectiveSymbol } from '../src/core/strip';

const base = defaultConfig();

describe('package H', () => {
  it('every fork has exactly one elite, with boosted HP', () => {
    for (let s = 0; s < 50; s++) {
      const run = createRun(base, s);
      for (const opts of run.paths) {
        const elites = opts.filter((e) => e.elite);
        expect(elites.length).toBe(opts.length > 1 ? 1 : 0);
        if (elites[0]) expect(elites[0].name?.startsWith('ELITE ')).toBe(true);
      }
    }
    expect(ELITE_HP_MUL).toBeGreaterThan(1);
  });

  it('+symbol cards add 2 and swaps move up to 3', () => {
    const run = createRun(base, 9, 'tesla');
    applyOption(run, { kind: 'add', symbol: 'bolt', reel: 0, count: RUN.addCount });
    expect(run.player.strips[0].bolt).toBe(6);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'sword', count: RUN.swapCount, reel: 1 });
    expect(run.player.strips[1]).toMatchObject({ shield: 1, sword: 7 });
  });

  it('no two frozen reels ever show the same payline symbol', () => {
    for (let seed = 0; seed < 300; seed++) {
      const c = defaultConfig();
      c.enemy = { hp: 9999, strips: reels3({ ice: 12 }) };
      const f = new Fight(c, seed);
      for (let t = 0; t < 8 && !f.over; t++) {
        f.step();
        const p = f.sides.player;
        const frozen = p.reels.map((r, i) => (p.frozen[i] > 0 ? effectiveSymbol(r.cells[r.stop]) : null)).filter(Boolean);
        expect(new Set(frozen).size).toBe(frozen.length);
      }
    }
  });
});

describe('wilds and gilds', () => {
  const cfg = defaultConfig();
  it('WILD completes runs and pays as the symbol it completes', async () => {
    const { scoreLine } = await import('../src/core/scoring');
    expect(scoreLine(['wild', 'sword', 'sword'], cfg)).toMatchObject({ tier: 'triple', tierSymbol: 'sword' });
    expect(scoreLine(['sword', 'wild', 'bolt'], cfg).totals).toEqual({ sword: 40, bolt: 10 });
    expect(scoreLine(['wild', 'wild', 'shield'], cfg)).toMatchObject({ tier: 'triple', tierSymbol: 'shield' });
    expect(scoreLine(['sword', 'bolt', 'wild'], cfg).totals).toEqual({ sword: 10, bolt: 20 }); // lone wild pays as a bolt (bare engine)
  });

  it('GOLD multiplies its group, CHARGED adds to its bolts, KEEN pierces (charms sit on cells)', () => {
    const c = defaultConfig();
    c.enemy = { hp: 9999, strips: reels3({ sword: 12 }) };
    c.player.gilded = [
      { reel: 0, symbol: 'sword', enh: 'gold', n: 4 },
      { reel: 1, symbol: 'bolt', enh: 'charged', n: 4 },
      { reel: 2, symbol: 'sword', enh: 'keen', n: 4 },
    ];
    const f = new Fight(c, 3);
    f.forceNext('player', ['sword', 'bolt', 'bolt']);
    const e1 = f.step().events;
    const atk = e1.find((e) => e.type === 'attack')!;
    expect(atk.type === 'attack' && atk.amount).toBe(20); // gold single sword: 10 x2 (keen is on reel 3)
    const en = e1.find((e) => e.type === 'energyGain')!;
    expect(en.type === 'energyGain' && en.amount).toBe(20); // reels 2+3 aren't a double: the charged bolt alone, 10 + 10

    const g = new Fight(c, 4);
    g.sides.enemy.shield = 50;
    g.forceNext('player', ['bolt', 'bolt', 'sword']);
    const pierce = g.step().events.find((e) => e.type === 'attack' && e.note === 'pierce');
    expect(pierce && pierce.type === 'attack' && pierce.blocked).toBe(0);
  });

  it('the thief goes for gilded cells first', () => {
    const c = defaultConfig();
    c.enemy = { hp: 9999, strips: reels3({ claw: 12 }) };
    c.player.gilded = [{ reel: 1, symbol: 'shield', enh: 'gold', n: 4 }];
    let gildedTaken = 0;
    let chances = 0;
    for (let s = 0; s < 100; s++) {
      const f = new Fight(c, s);
      f.step();
      const visibleGild = [0, 1, 2].some((row) => {
        const r = f.sides.player.reels[1];
        return r.cells[(r.stop + row - 1 + r.cells.length) % r.cells.length].enh;
      });
      f.forceNext('enemy', ['claw', 'sword', 'shield']);
      const st = f.step().events.find((e) => e.type === 'steal');
      if (!visibleGild || !st || st.type !== 'steal') continue;
      chances++;
      if (st.cells.some((ref) => f.sides.player.reels[ref.reel].cells[ref.index].enh)) gildedTaken++;
    }
    expect(gildedTaken).toBe(chances);
  });

  it('charm cards charm N plain cells; swaps take plain cells first, then charmed ones', () => {
    const run = createRun(base, 12); // KNIGHT: 6 shields per reel
    applyOption(run, { kind: 'gild', enh: 'gold', symbol: 'shield', reel: 0, n: 2 });
    expect(run.player.gilded).toEqual([{ reel: 0, symbol: 'shield', enh: 'gold', n: 2 }]);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'sword', count: 4, reel: 0 });
    expect(run.player.gilded[0].n).toBe(2);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'sword', count: 1, reel: 0 });
    expect(run.player.gilded[0].n).toBe(1);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'sword', count: 1, reel: 0 });
    expect(run.player.gilded).toHaveLength(0);
  });
});
