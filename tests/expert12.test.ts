import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, fightConfig, finishFight, gildsFor, offerChoices } from '../src/core/run';
import { GATEKEEPER } from '../src/core/enemies';
import { Rng } from '../src/core/rng';

const base = defaultConfig();

function on(cabinet: CabinetId, mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.bonusSymbols = false;
  mut?.(c);
  return new Fight(c, seed);
}

describe('EXPERT_PLAYTEST_12: THORNY (BRIAR)', () => {
  it('banks its value into your thorns when it lands on the payline', () => {
    const plain = on('thorn');
    plain.forceNext('player', ['thorn', 'thorn', 'shield']);
    plain.step();
    const thorny = on('thorn', (c) => (c.player.gilded = [{ reel: 0, symbol: 'thorn', enh: 'thorny', n: 6 }]));
    thorny.forceNext('player', ['thorn', 'thorn', 'shield']);
    thorny.step();
    expect(thorny.sides.player.energy - plain.sides.player.energy).toBe(50);
  });

  it('is offered to BRIAR only', () => {
    for (const cab of ['knight', 'tesla', 'joker', 'midas'] as CabinetId[]) expect(gildsFor(createRun(base, 3, cab))).not.toContain('thorny');
    expect(gildsFor(createRun(base, 3, 'thorn'))).toContain('thorny');
  });

  it('THE REPO MAN can take a THORNY charm, and paying it off gives it back', () => {
    const run = createRun(base, 5, 'thorn');
    run.pendingStart = null;
    run.chosen = run.chosen.map(() => true);
    run.depth = GATEKEEPER.depth;
    run.player.gilded = [{ reel: 1, symbol: 'thorn', enh: 'thorny', n: 2 }];
    const f = new Fight(fightConfig(run, base), 3);
    const cell = f.sides.player.reels[1].cells.find((c) => c.enh === 'thorny')!;
    cell.confiscated = cell.enh;
    delete cell.enh;
    f.winner = 'player';
    finishFight(run, f);
    expect(run.liens).toEqual([{ reel: 1, symbol: 'thorn', enh: 'thorny' }]);
    expect(run.player.gilded).toEqual([{ reel: 1, symbol: 'thorn', enh: 'thorny', n: 1 }]);
    applyOption(run, { kind: 'payLien' });
    expect(run.player.gilded).toEqual([{ reel: 1, symbol: 'thorn', enh: 'thorny', n: 2 }]);
  });
});

describe('EXPERT_PLAYTEST_12: THE FORGE when every symbol is maxed', () => {
  it('is never offered (MASTERWORK and ARMS RACE would do nothing)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = createRun(base, seed, 'knight');
      for (const s of ['sword', 'shield'] as const) run.player.levels.sym[s] = 3;
      offerChoices(run, new Rng(seed));
      expect(run.choiceSets).not.toContain(0);
    }
  });
});
