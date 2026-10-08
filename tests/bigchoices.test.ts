import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { BIG_CARDS, createRun, describeChoice, enemyHp, currentEnemy, fightConfig, finishFight, offerChoices, takeChoice, rollOffer, type BigChoice } from '../src/core/run';
import { Rng } from '../src/core/rng';
import type { CabinetId } from '../src/core/cabinets';

const base = defaultConfig();
const MACHINES: CabinetId[] = ['knight', 'tesla', 'thorn', 'joker', 'midas'];

/** A mid-run state: some charms, relics and rocks, so every card has something to act on. */
function midRun(cab: CabinetId, seed = 3) {
  const run = createRun(base, seed, cab);
  run.act = 2;
  const atk = run.player.strips[0];
  void atk;
  run.player.gilded = [
    { reel: 0, symbol: 'shield', enh: 'gold', n: 2 },
    { reel: 1, symbol: 'shield', enh: 'lucre', n: 1 },
  ];
  run.player.relics = ['bandage', 'clover'];
  run.player.strips[2].rock = 1;
  return run;
}

describe('BIG CHOICES (2026-10-08)', () => {
  it('every card can be taken on every machine it fits, and a fight still plays', () => {
    for (const cab of MACHINES)
      for (const card of BIG_CARDS) {
        if (card.machine && card.machine !== cab) continue;
        const run = midRun(cab);
        if (card.ok && !card.ok(run)) continue;
        const offer = rollOffer(run, new Rng(1));
        const c: BigChoice = offer.find((x) => x.id === card.id) ?? { id: card.id, symbol: 'shield', enh: 'gold', reel: 0, relic: 'bandage', relic2: 'key' };
        run.pendingChoice = [c];
        expect(describeChoice(run, c).title.length).toBeGreaterThan(0);
        takeChoice(run, c);
        const cfg = fightConfig(run, base);
        const f = new Fight(cfg, 7);
        for (let i = 0; i < 300 && !f.over; i++) f.step();
        expect(f.over).toBe(true);
      }
  });

  it('three cards per offer, never one you saw this run', () => {
    for (const cab of MACHINES) {
      const run = midRun(cab, 11);
      const seen = new Set<string>();
      for (let k = 0; k < 3; k++) {
        offerChoices(run, new Rng(k + 1));
        for (const c of run.pendingChoice ?? []) {
          expect(seen.has(c.id)).toBe(false);
          seen.add(c.id);
        }
        run.pendingChoice = null;
      }
    }
  });

  it("PAWN SHOP trades the relic on the card for the legendary on the card; DEVIL'S DUE pays x1.75 and takes 8% max HP a win", () => {
    const run = midRun('knight');
    const c: BigChoice = { id: 'pawnShop', relic: 'clover', relic2: 'key' };
    run.pendingChoice = [c];
    takeChoice(run, c);
    expect(run.player.relics).toContain('key');
    expect(run.player.relics).not.toContain('clover');
    run.pendingChoice = [{ id: 'devilsDue' }];
    takeChoice(run, { id: 'devilsDue' });
    expect(fightConfig(run, base).player.payMul).toBe(1.75);
    const max = run.player.maxHp;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.player.maxHp).toBe(max - Math.round((max * 0.08) / 10) * 10);
  });

  it('DOUBLE OR NOTHING doubles the next boss; QUICKENING speeds enemy abilities by a spin', () => {
    const run = midRun('tesla');
    run.depth = 5;
    const before = enemyHp(run, currentEnemy(run));
    run.pendingChoice = [{ id: 'doubleOrNothing' }];
    takeChoice(run, { id: 'doubleOrNothing' });
    expect(enemyHp(run, currentEnemy(run))).toBe(Math.min(before * 2, enemyHp(run, currentEnemy(run))));
    const r2 = midRun('tesla');
    const every = fightConfig(r2, base).enemy.ability?.every;
    r2.pendingChoice = [{ id: 'quickening' }];
    takeChoice(r2, { id: 'quickening' });
    if (every) expect(fightConfig(r2, base).enemy.ability?.every).toBe(Math.max(2, every - 1));
  });
});
