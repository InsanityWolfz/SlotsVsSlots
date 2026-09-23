import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type SymbolId } from '../src/core/config';
import { ARCHETYPES, generateRunPaths, MIRROR, RUN_FIGHTS, TUNE } from '../src/core/enemies';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { BOMB, LEGENDARY, LUCKY_CHANCE, SANDGLASS_SLOW } from '../src/core/relics';
import { Rng } from '../src/core/rng';
import {
  CHIPS,
  completesSet,
  createRun,
  draftOffers,
  enemyHp,
  fightConfig,
  finishFight,
  fullSets,
  machinePower,
  isShopNow,
  leaveShop,
  shopOffers,
  stripStats,
  takeLegend,
  TOTAL_FIGHTS,
} from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

function fight(mut: (c: GameConfig) => void, seed = 7): Fight {
  const c = defaultConfig();
  c.enemy = { hp: 99, strips: reels3({ shield: 12 }) };
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
    const f = fight((c) => (c.enemy = { hp: 99, strips: [{ bomb: 12 }, { sword: 12 }, { shield: 12 }] }));
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

  it('HEXER: a hexed reel pays half and its gilds go dark', () => {
    const f = fight((c) => {
      c.enemy = { hp: 99, strips: [{ hex: 12 }, { hex: 12 }, { shield: 12 }] };
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold' }];
    });
    f.next = 'enemy';
    f.forceNext('enemy', ['hex', 'hex', 'shield']);
    const hex = ofType(f.step().events, 'hex')[0];
    expect(hex.targets).toEqual([0]); // the gilded reel
    expect(hex.turns).toBe(2);
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const spin = ofType(f.step().events, 'spin')[0];
    // Jackpot 9, gold is dark while hexed, then halved.
    expect(spin.score.groups[0].amount).toBe(4);
    expect(spin.hexed).toEqual([true, false, false]);
  });

  it('VAMPIRE: drains HP and heals by what got through', () => {
    const f = fight((c) => (c.enemy = { hp: 99, strips: [{ fangs: 12 }, { fangs: 12 }, { shield: 12 }] }));
    f.sides.enemy.hp = 90;
    f.next = 'enemy';
    f.forceNext('enemy', ['fangs', 'fangs', 'shield']);
    const { events } = f.step();
    const hit = ofType(events, 'attack')[0];
    expect(hit.note).toBe('drain');
    expect(hit.amount).toBe(4);
    expect(ofType(events, 'heal')[0].amount).toBe(4);
    expect(f.sides.enemy.hp).toBe(94);
  });

  it('MIMIC: copies your last big group (half on a single)', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.enemy = { hp: 99, strips: [{ mimicSym: 12 }, { shield: 12 }, { shield: 12 }] };
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    f.step(); // a 9-damage jackpot
    f.forceNext('enemy', ['mimicSym', 'shield', 'shield']);
    const hit = ofType(f.step().events, 'attack').find((a) => a.note === 'mimic')!;
    expect(hit.amount).toBe(5);
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
  it('VAMP swords heal when they hit; BLAZE adds special damage per reel', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'vamp' }];
    });
    f.sides.player.hp = 10;
    f.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'heal')[0]).toMatchObject({ amount: 1, source: 'vamp' });

    const g = fight((c) => {
      c.player.strips = reels3({ bolt: 12 });
      c.player.gilded = [0, 1].map((reel) => ({ reel, symbol: 'bolt' as SymbolId, enh: 'blaze' as const }));
    });
    g.forceNext('player', ['bolt', 'bolt', 'bolt']);
    expect(ofType(g.step().events, 'specialFire')[0].amount).toBe(base.specialDamage + 6);
  });

  it('LUCKY cells sometimes land as a WILD', () => {
    const old = LUCKY_CHANCE.each;
    LUCKY_CHANCE.each = 1;
    try {
      const f = fight((c) => {
        c.player.strips = [{ sword: 12 }, { sword: 12 }, { shield: 12 }];
        c.player.gilded = [{ reel: 2, symbol: 'shield', enh: 'lucky' }];
      });
      f.forceNext('player', ['sword', 'sword', 'shield']);
      const spin = ofType(f.step().events, 'spin')[0];
      expect(spin.luckyWilds).toEqual([2]);
      expect(spin.score.tier).toBe('triple');
    } finally {
      LUCKY_CHANCE.each = old;
    }
  });
});

describe('legendary relics', () => {
  it('PHOENIX: survive one lethal hit at 1 HP', () => {
    const f = fight((c) => {
      c.relics = ['phoenix'];
      c.enemy = { hp: 99, strips: reels3({ sword: 12 }) };
    });
    f.sides.player.hp = 3;
    f.next = 'enemy';
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    const { events } = f.step();
    expect(ofType(events, 'phoenix').length).toBe(1);
    expect(f.sides.player.hp).toBe(1);
    expect(f.over).toBe(false);
  });

  it('OVERCHARGE echoes the special; KEY doubles x2; BELL jackpots x2; HOURGLASS slows abilities', () => {
    const f = fight((c) => {
      c.relics = ['overcharge'];
      c.player.strips = reels3({ bolt: 12 });
    });
    f.forceNext('player', ['bolt', 'bolt', 'bolt']);
    const fires = ofType(f.step().events, 'specialFire');
    expect(fires.map((x) => x.amount)).toEqual([base.specialDamage, Math.ceil(base.specialDamage / 3)]);

    const k = fight((c) => {
      c.relics = ['key'];
      c.player.strips = reels3({ sword: 6, shield: 6 });
    });
    k.forceNext('player', ['sword', 'sword', 'shield']);
    expect(ofType(k.step().events, 'attack')[0].amount).toBe(8);

    const b = fight((c) => {
      c.relics = ['bell'];
      c.player.strips = reels3({ sword: 12 });
    });
    b.forceNext('player', ['sword', 'sword', 'sword']);
    expect(ofType(b.step().events, 'attack')[0].amount).toBe(18);

    const s = fight((c) => {
      c.relics = ['sandglass'];
      c.enemy = { hp: 99, strips: reels3({ shield: 12 }), ability: { kind: 'smash', every: 3, power: 4 } };
    });
    expect(s.sides.enemy.ability!.every).toBe(3 + SANDGLASS_SLOW);
  });

  it('GOLDEN TICKET: a gild on any 2 reels is a FULL SET', () => {
    const gilded = [0, 1].map((reel) => ({ reel, symbol: 'bolt' as SymbolId, enh: 'gold' as const }));
    expect(fightSets(gilded, [])).toBe(false);
    expect(fightSets(gilded, ['ticket'])).toBe(true);
    expect(fullSets(gilded, ['ticket']).has('gold')).toBe(true);
  });
});

function fightSets(gilded: { reel: number; symbol: SymbolId; enh: 'gold' }[], relics: ('ticket' | 'bell')[]): boolean {
  return fight((c) => {
    c.player.gilded = gilded;
    c.relics = relics;
  }).fullSet.has('gold');
}

describe('act structure', () => {
  it('beating the House starts act 2: new map, full heal, a legendary pick and the Cashier', () => {
    const run = createRun(base, 21);
    run.depth = RUN_FIGHTS;
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
    // The act 2 map ends with the Mirror and shows new faces at every fork.
    expect(run.paths[RUN_FIGHTS][0].boss).toBe('mirror');
    expect(run.paths.slice(0, RUN_FIGHTS).every((opts) => opts.some((e) => ['bomber', 'hexer', 'vampire', 'mimic'].includes(e.archetype)))).toBe(true);
    expect(TOTAL_FIGHTS).toBe(12);
  });

  it('beating the Mirror wins the run', () => {
    const run = createRun(base, 22);
    run.act = 2;
    run.paths = generateRunPaths(new Rng(4), 2);
    run.enemies = run.paths.map((o) => o[0]);
    run.depth = RUN_FIGHTS;
    const f = new Fight(fightConfig(run, base), 3);
    f.winner = 'player';
    finishFight(run, f);
    expect(run.over && run.won).toBe(true);
  });

  it('the Mirror copies your strips and gilds and is sized to your HP; it cracks at half HP', () => {
    const run = createRun(base, 23, 'midas');
    run.act = 2;
    run.paths = generateRunPaths(new Rng(5), 2);
    run.enemies = run.paths.map((o) => o[0]);
    run.depth = RUN_FIGHTS;
    run.player.relics = ['battery', 'fang'];
    const cfg = fightConfig(run, base);
    expect(cfg.enemy.strips).toEqual(run.player.strips);
    expect(cfg.enemy.gilded).toEqual(run.player.gilded);
    expect(cfg.enemy.hp).toBe(enemyHp(run, run.enemies[RUN_FIGHTS]));
    expect(cfg.enemy.hp).toBe(Math.round(TUNE.mirrorPower * machinePower(run)) + TUNE.mirrorFlat);
    expect(cfg.enemy.ability?.kind).toBe(MIRROR.ability.kind);

    const f = new Fight(cfg, 9);
    f.sides.enemy.hp = Math.floor(f.sides.enemy.maxHp / 2) + 1;
    f.forceNext('player', ['sword', 'sword', 'shield']);
    const { events } = f.step();
    expect(ofType(events, 'shatter').length).toBe(1);
    expect(f.sides.enemy.ability!.every).toBe(MIRROR.ability.every - 1);
  });

  it('REFLECTION throws your last spin damage back (min 3)', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ sword: 12 });
      c.enemy = { hp: 99, strips: reels3({ shield: 12 }), ability: { kind: 'reflect', every: 1, power: 20 }, boss: 'mirror' };
    });
    f.forceNext('player', ['sword', 'sword', 'sword']);
    f.step();
    const hit = ofType(f.step().events, 'attack').find((a) => a.note === 'reflect')!;
    expect(hit.amount).toBe(9);
  });

  it('act 2 archetypes exist with art ids and only appear in act 2', () => {
    for (const id of ['bomber', 'hexer', 'vampire', 'mimic']) expect(ARCHETYPES.find((a) => a.id === id)?.acts).toEqual([2]);
    const act1 = generateRunPaths(new Rng(1), 1).flat().map((e) => e.archetype);
    expect(act1.some((a) => ['bomber', 'hexer', 'vampire', 'mimic'].includes(a))).toBe(false);
  });
});

describe('ITERATION_5 fixes', () => {
  it('the SPIKED full set flags its banner; stat lines count FULL SETs', () => {
    const f = fight((c) => {
      c.player.strips = reels3({ shield: 12 });
      c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'shield' as SymbolId, enh: 'spiked' as const }));
    });
    f.forceNext('player', ['shield', 'shield', 'shield']);
    expect(ofType(f.step().events, 'spin')[0].fullSet).toBe(true);

    const strips = reels3({ sword: 6, shield: 3, bolt: 3 });
    const two = [0, 1].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const }));
    const three = [...two, { reel: 2, symbol: 'sword' as SymbolId, enh: 'gold' as const }];
    const a = stripStats(strips, base, [], two).damage;
    const b = stripStats(strips, base, [], three).damage;
    expect(b / a).toBeGreaterThan(2);
  });

  it('COMPLETES SET is detected; the heal slot is sized to what is missing', () => {
    const run = createRun(base, 31);
    run.player.gilded = [0, 1].map((reel) => ({ reel, symbol: 'sword' as SymbolId, enh: 'gold' as const }));
    expect(completesSet(run, { kind: 'gild', enh: 'gold', symbol: 'sword', reel: 2 })).toBe(true);
    expect(completesSet(run, { kind: 'gild', enh: 'keen', symbol: 'sword', reel: 2 })).toBe(false);
    run.depth = 1;
    run.player.hp = run.player.maxHp - 1;
    expect(shopOffers(run).some((i) => i.option.kind === 'heal')).toBe(false);
    run.player.hp = run.player.maxHp - 5;
    expect(shopOffers(run).find((i) => i.option.kind === 'heal')?.option).toEqual({ kind: 'heal', amount: 5 });
  });

  it('the shelf always has at least 4 items before the heal slot', () => {
    for (let s = 0; s < 40; s++) {
      const run = createRun(base, s);
      run.depth = 1;
      expect(shopOffers(run).filter((i) => i.option.kind !== 'heal').length).toBeGreaterThanOrEqual(4);
    }
  });

  it('act 2 drafts can offer the new gilds and legendaries', () => {
    let newGild = false;
    let legend = false;
    for (let s = 0; s < 60; s++) {
      const run = createRun(base, s);
      run.act = 2;
      for (const d of [1, 2, 3, 4]) {
        run.depth = d;
        for (const o of draftOffers(run)) {
          if (o.kind === 'gild' && ['vamp', 'lucky', 'blaze'].includes(o.enh)) newGild = true;
          if (o.kind === 'relic' && LEGENDARY.has(o.relic)) legend = true;
        }
      }
    }
    expect(newGild && legend).toBe(true);
  });
});
