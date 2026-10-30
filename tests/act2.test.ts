import { ACT2_NEW } from '../src/core/enemies';
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { ARCHETYPES, generateActMap, TUNE, WHEEL } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { BOMB, LEGENDARY, SANDGLASS_SLOW } from '../src/core/relics';
import { CHARM_VALUE } from '../src/core/charms';
import { Rng } from '../src/core/rng';
import {
  CHIPS,
  createRun,
  draftOffers,
  enemyHp,
  fightConfig,
  finishFight,
  isShopNow,
  leaveShop,
  shopOffers,
  stripStats,
  takeLegend,
  skipToBoss,
  currentEnemy,
} from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 9999, strips: reels3({ shield: 12 }) };
  mut(c);
  return new Fight(c, seed);
}

/** Put a bomb with this fuse on the player's (only) bolt cell of reel 0. */
function bombTheBolt(f: Fight, fuse: number) {
  const reel = f.sides.player.reels[0];
  const i = reel.cells.findIndex((c) => c.symbol === 'bolt');
  reel.cells[i].bomb = fuse;
  return i;
}

describe('act 2 writers', () => {
  it('BOMBER: plants bombs on visible cells; a bomb whose fuse runs out blasts you (shield blocks)', () => {
    const f = fight((c) => (c.enemy = { hp: 9999, strips: [{ bomb: 12 }, { sword: 12 }, { shield: 12 }] }));
    f.next = 'enemy';
    f.forceNext('enemy', ['bomb', 'sword', 'shield']);
    const planted = ofType(f.step().events, 'bomb');
    expect(planted.length).toBe(1);
    expect(planted[0].cells.length).toBe(1);
    const ref = planted[0].cells[0];
    expect(f.sides.player.reels[ref.reel].cells[ref.index].bomb).toBe(BOMB.fuse);

    const g = fight((c) => (c.player.strips = [{ sword: 11, bolt: 1 }, { sword: 12 }, { sword: 12 }]));
    bombTheBolt(g, 1);
    g.forceNext('player', ['sword', 'sword', 'sword']);
    const hp = g.sides.player.hp;
    const { events } = g.step();
    const blast = ofType(events, 'blast');
    expect(blast.length).toBe(1);
    expect(blast[0].amount).toBe(BOMB.damage);
    expect(g.sides.player.hp).toBe(hp - BOMB.damage);
  });

  it('BOMBER: landing a bomb on your payline defuses it', () => {
    const f = fight((c) => (c.player.strips = [{ sword: 11, bolt: 1 }, { sword: 12 }, { sword: 12 }]));
    const i = bombTheBolt(f, 2);
    f.forceNext('player', ['bolt', 'sword', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'defuse')[0].cells).toEqual([{ reel: 0, index: i }]);
    expect(f.sides.player.reels[0].cells[i].bomb).toBeUndefined();
    expect(ofType(events, 'blast').length).toBe(0);
  });

  it('JINX: a jinxed reel pays half; its Charm stays lit (user, 2026-10-30)', () => {
    const f = fight((c) => {
      c.enemy = { hp: 9999, strips: [{ hex: 12 }, { hex: 12 }, { shield: 12 }] };
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 12 }];
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['hex', 'hex', 'shield']);
    const hex = ofType(f.step().events, 'hex')[0];
    expect(hex.targets).toEqual([0]); // the gilded reel
    expect(hex.turns).toBe(2);
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const spin = ofType(f.step().events, 'spin')[0];
    // Jackpot 90, doubled by its gold (still lit), then halved.
    expect(spin.score.groups[0].amount).toBe(90);
    expect(spin.hexed).toEqual([true, false, false]);
  });

  it('VAMPIRE: drains HP and heals by what got through', () => {
    const f = fight((c) => (c.enemy = { hp: 9999, strips: [{ fangs: 12 }, { fangs: 12 }, { shield: 12 }] }));
    f.sides.enemy.hp = 90;
    f.next = 'enemy';
    f.forceNext('enemy', ['fangs', 'fangs', 'shield']);
    const { events } = f.step();
    const hit = ofType(events, 'attack')[0];
    expect(hit.note).toBe('drain');
    expect(hit.amount).toBe(40);
    expect(ofType(events, 'heal')[0].amount).toBe(40);
    expect(f.sides.enemy.hp).toBe(130);
  });

  it('MIMIC: copies your last big group (half on a single)', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.enemy = { hp: 9999, strips: [{ mimicSym: 12 }, { shield: 12 }, { shield: 12 }] };
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    f.step(); // a 90-damage jackpot
    f.forceNext('enemy', ['mimicSym', 'shield', 'shield']);
    const hit = ofType(f.step().events, 'attack').find((a) => a.note === 'mimic')!;
    expect(hit.amount).toBe(50); // half, rounded up to tens
  });

  it('MIMIC: GULP eats chips from the run purse', () => {
    const run = createRun(base, 11);
    run.player.chips = 5;
    const f = new Fight(fightConfig(run, base), 1);
    f.chipsEaten = 2;
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(rec.chipsEaten).toBe(2);
  });
});

describe('act 2 gilds', () => {
  it('VAMP swords heal when they hit; BLAZE adds special damage per blaze cell', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'vamp', n: 12 }];
    });
    f.sides.player.hp = 10;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'heal')[0]).toMatchObject({ amount: 20, source: 'vamp' });

    const g = fight((c) => {
      c.player.strips = reels3({ bolt: 12 });
      c.player.gilded = [0, 1].map((reel) => ({ reel, symbol: 'bolt' as SymbolId, enh: 'blaze' as const, n: 1 }));
    });
    g.forceNext('player', ['bolt', 'bolt', 'bolt']);
    expect(ofType(g.step().events, 'specialFire')[0].amount).toBe(base.specialDamage + 10);
  });

  it('LUCKY cells sometimes land as a WILD', () => {
    const old = CHARM_VALUE.lucky[1];
    CHARM_VALUE.lucky[1] = 100;
    try {
      const f = fight((c) => {
        c.player.strips = [{ sword: 12 }, { sword: 12 }, { shield: 12 }];
        c.player.gilded = [{ reel: 2, symbol: 'shield', enh: 'lucky', n: 12 }];
      });
      f.forceNext('player', ['sword', 'sword', 'shield']);
      const spin = ofType(f.step().events, 'spin')[0];
      expect(spin.luckyWilds).toEqual([2]);
      expect(spin.score.tier).toBe('triple');
    } finally {
      CHARM_VALUE.lucky[1] = old;
    }
  });
});

describe('legendary relics', () => {
  it('PHOENIX: survive one lethal hit at 1 HP', () => {
    const f = fight((c) => {
      c.relics = ['phoenix'];
      c.enemy = { hp: 9999, strips: reels3({ sword: 12 }) };
    });
    f.sides.player.hp = 3;
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'phoenix').length).toBe(1);
    expect(f.sides.player.hp).toBe(1);
    expect(f.over).toBe(false);
  });

  it('OVERCHARGE: lightning hits 30% harder (one strike, no echo); KEY doubles x2; BELL jackpots x2; HOURGLASS slows abilities', () => {
    const f = fight((c) => {
      c.relics = ['overcharge'];
      c.player.strips = reels3({ bolt: 12 });
    });
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const fires = ofType(f.step().events, 'specialFire');
    expect(fires.map((x) => x.amount)).toEqual([Math.ceil((base.specialDamage * 1.3) / 10) * 10]);

    const k = fight((c) => {
      c.relics = ['key'];
      c.player.strips = reels3({ sword: 6, shield: 6 });
    });
    k.forceNext('player', ['sword', 'sword', 'shield']);
    expect(ofType(k.step().events, 'attack')[0].amount).toBe(80);

    const b = fight((c) => {
      c.relics = ['bell'];
      c.player.strips = reels3({ sword: 12 });
    });
    b.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(b.step().events, 'attack')[0].amount).toBe(180);

    const s = fight((c) => {
      c.relics = ['sandglass'];
      c.enemy = { hp: 9999, strips: reels3({ shield: 12 }), ability: { kind: 'smash', every: 3, power: 4 } };
    });
    expect(s.sides.enemy.ability!.every).toBe(3 + SANDGLASS_SLOW);
  });

  it('GOLDEN TICKET: every charm is one level higher', () => {
    const f = fight((c) => {
      c.relics = ['ticket'];
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 6 }];
    });
    f.forceNext('player', ['sword', 'shield', 'shield']);
    expect(ofType(f.step().events, 'attack')[0].amount).toBe(30); // x3 instead of x2
  });
});

describe('act structure', () => {
  it('beating the House starts act 2: new map, full heal, a legendary pick and the Cashier', () => {
    const run = createRun(base, 21);
    skipToBoss(run);
    run.player.hp = 5;
    const f = new Fight(fightConfig(run, base), 3);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.over).toBe(false);
    expect(run.act).toBe(2);
    expect(run.depth).toBe(0);
    expect(run.player.hp).toBe(run.player.maxHp);
    expect(run.pendingLegend!.length).toBe(3);
    for (const r of run.pendingLegend!) expect(LEGENDARY.has(r)).toBe(true);
    takeLegend(run, run.pendingLegend![0]);
    expect(run.player.relics.length).toBe(1);
    expect(isShopNow(run)).toBe(true);
    const shelf = shopOffers(run);
    expect(shelf.some((i) => i.option.kind === 'relic' && LEGENDARY.has(i.option.relic) && i.price === CHIPS.prices.legend)).toBe(true);
    leaveShop(run);
    expect(isShopNow(run)).toBe(false);
    // The act 2 map ends with THE WHEEL; it opens on a new face, and every route meets one.
    expect(run.map.boss.boss).toBe('wheel');
    expect(ACT2_NEW.has(run.map.opener.archetype)).toBe(true);
    for (const route of run.map.routes) expect(route.some((st) => st.enemy && ACT2_NEW.has(st.enemy.archetype))).toBe(true);
  });

  it('beating THE WHEEL wins the run (WHITE)', () => {
    const run = createRun(base, 22);
    run.act = 2;
    run.map = generateActMap(new Rng(4), 2);
    run.route = null;
    skipToBoss(run);
    const f = new Fight(fightConfig(run, base), 3);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.over && run.won).toBe(true);
  });

  it('THE WHEEL plays its own reels (swords, shields, sevens, BALLS) and has the same HP on every machine; it SPINS FASTER at half HP', () => {
    const run = createRun(base, 23, 'midas');
    run.act = 2;
    run.map = generateActMap(new Rng(5), 2);
    run.route = null;
    skipToBoss(run);
    run.player.relics = ['bandage', 'fang'];
    const cfg = fightConfig(run, base);
    expect(cfg.enemy.strips.every((st) => (st.ball ?? 0) > 0)).toBe(true);
    expect(cfg.enemy.gilded ?? []).toEqual([]);
    expect(cfg.enemy.hp).toBe(enemyHp(run, currentEnemy(run)));
    expect(cfg.enemy.hp).toBe(TUNE.wheelHp);
    expect(cfg.enemy.ability).toEqual(WHEEL.ability);

    const f = new Fight(cfg, 9);
    f.sides.enemy.hp = Math.floor(f.sides.enemy.maxHp / 2) + 1;
    f.forceNext('player', ['goldbar', 'goldbar', 'shield']);
    const { events } = f.step();
    expect(ofType(events, 'wheelFast').length).toBe(1);
  });

  it('act 2 archetypes exist with art ids and only appear in act 2', () => {
    for (const id of ['bomber', 'hexer', 'vampire']) expect(ARCHETYPES.find((a) => a.id === id)?.acts).toEqual([2]);
    const m = generateActMap(new Rng(1), 1);
    const act1 = [m.opener, ...m.routes.flat().map((st) => st.enemy).filter((e) => !!e)].map((e) => e!.archetype);
    expect(act1.some((a) => ['bomber', 'hexer', 'vampire'].includes(a))).toBe(false);
  });
});

describe('ITERATION_5 fixes', () => {
  it('more gold cells mean more expected damage; the heal slot is sized to what is missing', () => {
    const strips = reels3({ sword: 6, shield: 3, bolt: 3 });
    const two = [0, 1].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const, n: 3 }));
    const three = [...two, { reel: 2, symbol: 'sword' as SymbolId, enh: 'gold' as const, n: 3 }];
    expect(stripStats(strips, base, [], three).damage).toBeGreaterThan(stripStats(strips, base, [], two).damage);

    const run = createRun(base, 31);
    run.depth = 1;
    run.player.hp = run.player.maxHp - 10;
    expect(shopOffers(run).some((i) => i.option.kind === 'heal')).toBe(false);
    run.player.hp = run.player.maxHp - 50;
    expect(shopOffers(run).find((i) => i.option.kind === 'heal')?.option).toEqual({ kind: 'heal', amount: 50 });
  });

  it('the shelf always has at least 4 items before the heal slot', () => {
    for (let s = 0; s < 40; s++) {
      const run = createRun(base, s);
      run.depth = 1;
      expect(shopOffers(run).filter((i) => i.option.kind !== 'heal').length).toBeGreaterThanOrEqual(4);
    }
  });

  it('act 2 drafts can offer the new gilds, and its Cashier legendaries', () => {
    let newGild = false;
    let legend = false;
    for (let s = 0; s < 60; s++) {
      const run = createRun(base, s);
      run.act = 2;
      for (const d of [1, 2, 3, 4]) {
        run.depth = d;
        for (const o of draftOffers(run)) if (o.kind === 'gild' && ['vamp', 'lucky', 'blaze'].includes(o.enh)) newGild = true;
        for (const i of shopOffers(run)) if (i.option.kind === 'relic' && LEGENDARY.has(i.option.relic)) legend = true;
      }
    }
    expect(newGild && legend).toBe(true);
  });
});
