import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { GATEKEEPER } from '../src/core/enemies';
import { Fight } from '../src/core/fight';
import { applyOption, createRun, fightConfig, finishFight, shopOffers } from '../src/core/run';

describe('THE GATEKEEPER: the REPO MAN', () => {
  it("what he holds when he falls leaves your machine; pay it off at the Cashier, or the act's boss gives it back", () => {
    const base = defaultConfig();
    const run = createRun(base, 5, 'knight');
    run.pendingStart = null;
    run.chosen = run.chosen.map(() => true);
    run.depth = GATEKEEPER.depth;
    expect(run.enemies[run.depth].archetype).toBe('repo');
    run.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 2 }];
    const swords1 = run.player.strips[1].sword ?? 0;
    const f = new Fight(fightConfig(run, base), 3);
    // He took a gold charm on reel 1 and a sword on reel 2.
    const gold = f.sides.player.reels[0].cells.find((c) => c.enh === 'gold')!;
    gold.confiscated = gold.enh;
    delete gold.enh;
    f.sides.player.reels[1].cells.find((c) => c.symbol === 'sword')!.stolen = true;
    f.winner = 'player';
    finishFight(run, f);
    expect(run.liens).toEqual([{ reel: 0, symbol: 'sword', enh: 'gold' }, { reel: 1, symbol: 'sword' }]);
    expect(run.player.gilded).toEqual([{ reel: 0, symbol: 'sword', enh: 'gold', n: 1 }]);
    expect(run.player.strips[1].sword).toBe(swords1 - 1);
    // The Cashier sells a pay-off; it gives back the oldest lien.
    expect(shopOffers(run).some((i) => i.option.kind === 'payLien' && i.price === GATEKEEPER.lienPrice)).toBe(true);
    applyOption(run, { kind: 'payLien' });
    expect(run.player.gilded).toEqual([{ reel: 0, symbol: 'sword', enh: 'gold', n: 2 }]);
    expect(run.liens).toHaveLength(1);
    // The boss falls: the rest comes back.
    run.depth = run.enemies.length - 1;
    const b = new Fight(fightConfig(run, base), 3);
    b.winner = 'player';
    finishFight(run, b);
    expect(run.liens).toEqual([]);
    expect(run.player.strips[1].sword).toBe(swords1);
  });
});
