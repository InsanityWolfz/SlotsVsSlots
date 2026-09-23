import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3 } from '../src/core/config';
import { ELITE_HP_MUL } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { COUNTER_RELICS, COUNTERS } from '../src/core/relics';
import { applyOption, createRun, draftOffers, RUN } from '../src/core/run';
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

  it('counter relics only ever appear as PREP for an enemy on the next fight', () => {
    for (let s = 0; s < 60; s++) {
      const run = createRun(base, s);
      for (let d = 1; d <= 5; d++) {
        run.depth = d;
        for (const o of draftOffers(run)) {
          if (o.kind !== 'relic' || !COUNTER_RELICS.has(o.relic)) continue;
          const next = run.paths[d].map((e) => COUNTERS[e.archetype]);
          expect(next).toContain(o.relic);
        }
      }
    }
  });

  it('+bolt cards add 2 and swaps move up to 3', () => {
    const run = createRun(base, 9);
    applyOption(run, { kind: 'add', symbol: 'bolt', reel: 0, count: RUN.addCount });
    expect(run.player.strips[0].bolt).toBe(6);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'sword', count: RUN.swapCount, reel: 1 });
    expect(run.player.strips[1]).toMatchObject({ shield: 1, sword: 7 });
  });

  it('no two frozen reels ever show the same payline symbol', () => {
    for (let seed = 0; seed < 300; seed++) {
      const c = defaultConfig();
      c.enemy = { hp: 99, strips: reels3({ ice: 12 }) };
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
    expect(scoreLine(['sword', 'wild', 'bolt'], cfg).totals).toEqual({ sword: 4, bolt: 1 });
    expect(scoreLine(['wild', 'wild', 'shield'], cfg)).toMatchObject({ tier: 'triple', tierSymbol: 'shield' });
    expect(scoreLine(['sword', 'bolt', 'wild'], cfg).totals).toEqual({ sword: 1, bolt: 2 }); // lone wild pays as a bolt
  });

  it('GOLD doubles, CHARGED adds energy, KEEN pierces, SPIKED hits back', () => {
    const c = defaultConfig();
    c.enemy = { hp: 99, strips: reels3({ sword: 12 }) };
    c.player.gilded = [
      { reel: 0, symbol: 'sword', enh: 'gold' },
      { reel: 1, symbol: 'bolt', enh: 'charged' },
      { reel: 2, symbol: 'sword', enh: 'keen' },
      { reel: 0, symbol: 'shield', enh: 'spiked' },
    ];
    const f = new Fight(c, 3);
    f.forceNext('player', ['sword', 'bolt', 'bolt']);
    const e1 = f.step().events;
    const atk = e1.find((e) => e.type === 'attack')!;
    expect(atk.type === 'attack' && atk.amount).toBe(2); // gold single sword x2 (keen is on reel 3)
    const en = e1.find((e) => e.type === 'energyGain')!;
    expect(en.type === 'energyGain' && en.amount).toBe(2); // bolt + charged(+1) on reel 2... reel 3 bolt plain

    const g = new Fight(c, 4);
    g.sides.enemy.shield = 5;
    g.forceNext('player', ['bolt', 'bolt', 'sword']);
    const pierce = g.step().events.find((e) => e.type === 'attack' && e.note === 'pierce');
    expect(pierce && pierce.type === 'attack' && pierce.blocked).toBe(0);

    const h = new Fight(c, 5);
    h.forceNext('player', ['shield', 'bolt', 'bolt']);
    h.step();
    h.forceNext('enemy', ['sword', 'sword', 'sword']);
    const back = h.step().events.find((e) => e.type === 'attack' && e.note === 'spiked');
    expect(back && back.type === 'attack' && back.amount).toBe(2);
  });

  it('the thief goes for gilded cells first', () => {
    const c = defaultConfig();
    c.enemy = { hp: 99, strips: reels3({ claw: 12 }) };
    c.player.gilded = [{ reel: 1, symbol: 'shield', enh: 'gold' }];
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

  it('gild cards gild a whole symbol on a reel and survive until the symbol is gone', () => {
    const run = createRun(base, 12);
    applyOption(run, { kind: 'gild', enh: 'gold', symbol: 'shield', reel: 0 });
    expect(run.player.gilded).toHaveLength(1);
    applyOption(run, { kind: 'swap', from: 'shield', to: 'bolt', count: 4, reel: 0 });
    expect(run.player.gilded).toHaveLength(0);
  });
});
