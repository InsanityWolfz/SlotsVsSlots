import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { NEW_RELIC, RELICS } from '../src/core/relics';
import { charmOptions, charmSymbols, createRun, draftOffers, fightConfig, finishFight, gildsFor, isRelicDraft, relicFits, startRelics, takeStart } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A fight on a slot machine with a punching-bag enemy. */
function on(cabinet: CabinetId, relics: RelicId[], mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.bonusSymbols = false;
  c.relics = relics;
  mut?.(c);
  return new Fight(c, seed);
}
const playerAttack = (ev: CombatEvent[]) => ofType(ev, 'attack').filter((a) => a.from === 'player');

describe('slot machine relics', () => {
  it('WAR DRUM: each paying spin adds +5 to swords this fight (max 5 stacks)', () => {
    const f = on('knight', ['drum']);
    f.sides.player.levels = { sym: { sword: 1, shield: 1 }, charm: {} };
    f.forceNext('player', ['sword', 'shield', 'shield']);
    const first = playerAttack(f.step().events)[0].amount;
    f.step();
    f.forceNext('player', ['sword', 'shield', 'shield']);
    expect(playerAttack(f.step().events)[0].amount).toBe(first + NEW_RELIC.drumStep);
    expect(f.drum).toBe(2);
  });

  it('SHIELD BASH that kills at turn start: no spin after the enemy falls', () => {
    const f = on('knight', ['bash']);
    f.step();
    f.step();
    f.sides.enemy.hp = 20;
    f.sides.player.shield = 200;
    const ev = f.step().events;
    expect(f.winner).toBe('player');
    expect(ofType(ev, 'spin')).toHaveLength(0);
  });

  it('charm relics need the charm; GOLD LEAF is retired; OVERCHARGE never shows on BRIAR', () => {
    const run = createRun(base, 4, 'joker');
    run.act = 2;
    expect(relicFits(run, 'horseshoe')).toBe(false);
    run.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'lucky', n: 2 });
    expect(relicFits(run, 'horseshoe')).toBe(true);
    const midas = createRun(base, 4, 'midas');
    midas.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'gold', n: 2 });
    expect(relicFits(midas, 'midas')).toBe(false);
    expect(relicFits(createRun(base, 4, 'thorn'), 'overcharge')).toBe(false);
    expect(relicFits(createRun(base, 4, 'tesla'), 'overcharge')).toBe(true);
  });

  it('CHAINMAIL heals 10% of leftover shield; SHIELD BASH hits for half of it', () => {
    const f = on('knight', ['chainmail', 'bash']);
    f.sides.player.hp = 100;
    f.step();
    f.step();
    f.sides.player.shield = 100;
    const ev = f.step().events;
    expect(ofType(ev, 'heal').find((h) => h.source === 'chainmail')?.amount).toBe(10);
    expect(playerAttack(ev)[0].amount).toBe(50);
  });

  it('ROSE HIP: a thorn volley heals 10% of what it fired', () => {
    const f = on('thorn', ['rosehip']);
    f.sides.player.hp = 100;
    f.sides.player.energy = 100;
    f.step();
    f.forceNext('enemy', ['sword', 'sword', 'sword']);
    expect(ofType(f.step().events, 'heal').find((h) => h.source === 'rosehip')?.amount).toBe(10);
  });

  it('FARADAY CAGE: shields charge lightning; STATIC: being attacked charges 5', () => {
    const f = on('tesla', ['faraday']);
    f.forceNext('player', ['shield', 'shield', 'sword']);
    const ev = f.step().events;
    expect(ofType(ev, 'energyGain').some((e) => e.amount > 0)).toBe(true);
    const s = on('tesla', ['static']);
    s.step();
    s.forceNext('enemy', ['sword', 'sword', 'sword']);
    expect(ofType(s.step().events, 'energyGain').find((e) => e.side === 'player')?.amount).toBe(NEW_RELIC.staticCharge);
  });

  it('CAP AND BELLS heals per wild; STACKED DECK: a charmed wild fills double', () => {
    const f = on('joker', ['capbells', 'stacked'], (c) => {
      c.player.strips = reels3({ sword: 4, shield: 4, wild: 4 });
      c.player.gilded = [{ reel: 0, symbol: 'wild', enh: 'gold', n: 4 }];
    });
    f.sides.player.hp = 100;
    f.forceNext('player', ['wild', 'shield', 'wild']);
    const ev = f.step().events;
    expect(ofType(ev, 'heal').find((h) => h.source === 'capbells')?.amount).toBe(2 * NEW_RELIC.capbellsHeal);
    expect(ofType(ev, 'meter')[0].amount).toBe(60);
  });
});

describe('charm and general relics', () => {
  it('HORSESHOE: a group with a lucky-born wild pays x3', () => {
    const f = on('tesla', ['horseshoe'], (c) => {
      c.player.strips = reels3({ sword: 6, shield: 6 });
      c.player.gilded = [{ reel: 1, symbol: 'shield', enh: 'lucky', n: 6 }];
      c.player.levels = { sym: {}, charm: { lucky: 4 } };
    });
    let hits = 0;
    for (let i = 0; i < 12 && !hits; i++) {
      f.forceNext('player', ['sword', 'shield', 'sword']);
      const spin = ofType(f.step().events, 'spin')[0];
      if (spin.luckyWilds?.length) hits = spin.score.groups.filter((g) => g.notes?.includes(`X${NEW_RELIC.horseshoeMul}`)).length;
      if (!f.over) f.step();
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('UNDERDOG pays x1.5 under half HP; FIRST BLOOD pays x3 once', () => {
    const f = on('knight', ['firstblood']);
    f.forceNext('player', ['sword', 'shield', 'shield']);
    expect(ofType(f.step().events, 'spin')[0].score.groups[0].notes).toContain(`X${NEW_RELIC.firstbloodMul} FIRST`);
    f.step();
    f.forceNext('player', ['sword', 'shield', 'shield']);
    expect(ofType(f.step().events, 'spin')[0].score.groups[0].notes ?? []).not.toContain(`X${NEW_RELIC.firstbloodMul} FIRST`);
    const u = on('knight', ['underdog']);
    u.sides.player.hp = 10;
    u.forceNext('player', ['sword', 'shield', 'shield']);
    expect(ofType(u.step().events, 'spin')[0].score.groups[0].notes).toContain(`X${NEW_RELIC.underdogMul}`);
  });

  it('HOLY WATER washes off the first cheat each fight', () => {
    const f = on('knight', ['holywater'], (c) => (c.enemy = { hp: 9999, strips: reels3({ slime: 12 }) }));
    f.step();
    f.forceNext('enemy', ['slime', 'slime', 'slime']);
    const ev = f.step().events;
    expect(ofType(ev, 'relic').some((r) => r.relic === 'holywater')).toBe(true);
    expect(f.sides.player.reels.every((r) => r.cells.every((c) => !c.slimed))).toBe(true);
  });

  it('TROPHY BELT adds max HP per win; PIGGY BANK adds interest', () => {
    const run = createRun(base, 3, 'knight');
    run.pendingStart = null;
    run.player.relics = ['trophy', 'piggy'];
    run.player.chips = 20;
    const max = run.player.maxHp;
    const f = new Fight(fightConfig(run, base), 1);
    f.winner = 'player';
    const rec = finishFight(run, f);
    expect(run.player.maxHp).toBe(max + NEW_RELIC.trophyHp);
    const plain = createRun(base, 3, 'knight');
    plain.player.chips = 20;
    const g = new Fight(fightConfig(plain, base), 1);
    g.winner = 'player';
    expect(rec.chips! - finishFight(plain, g).chips!).toBe(4);
  });

  it('charm-on-symbol relics widen charm targets', () => {
    const run = createRun(base, 3, 'thorn');
    expect(charmSymbols(run, 'gold')).not.toContain('thorn');
    run.player.relics.push('graft');
    expect(charmSymbols(run, 'gold')).toContain('thorn');
    expect(charmSymbols(run, 'keen')).not.toContain('thorn');
    run.player.relics.push('kiss');
    expect(charmSymbols(run, 'vamp')).toEqual(expect.arrayContaining(['shield', 'goldbar']));
  });
});

describe('relic pools, the starting pick and lucky', () => {
  it('a new run offers 1 of 3 starting relics: your machine relics first, then a general one', () => {
    for (const cab of ['knight', 'midas', 'thorn', 'tesla', 'joker'] as CabinetId[]) {
      const run = createRun(base, 11, cab);
      const st = run.pendingStart!;
      expect(st).toHaveLength(3);
      expect(RELICS[st[0]].machine).toBe(cab);
      expect(RELICS[st[2]].machine).toBeUndefined();
      takeStart(run, st[0]);
      expect(run.player.relics).toEqual([st[0]]);
      expect(run.pendingStart).toBeNull();
      expect(startRelics(run).length).toBeGreaterThan(0);
    }
  });

  it('relic drafts put one of your identity relics first; other machines never show up', () => {
    for (let s = 0; s < 30; s++) {
      const run = createRun(base, s, 'thorn');
      run.pendingStart = null;
      for (let d = 0; d < 6; d++) {
        run.depth = d;
        if (!isRelicDraft(run)) continue;
        const relics = draftOffers(run).flatMap((o) => (o.kind === 'relic' ? [o.relic] : []));
        for (const r of relics) expect([undefined, 'thorn']).toContain(RELICS[r].machine);
        expect(RELICS[relics[0]].machine === 'thorn' || !!RELICS[relics[0]].charm).toBe(true);
      }
    }
  });

  it('LUCKY is a later-machine charm (BRIAR, TESLA, JAX)', () => {
    for (const [cab, ok] of [['knight', false], ['midas', false], ['thorn', true], ['tesla', true], ['joker', true]] as [CabinetId, boolean][]) {
      const run = createRun(base, 2, cab);
      run.act = 2;
      expect(gildsFor(run).includes('lucky')).toBe(ok);
      expect(charmOptions(run, 2).some((o) => o.kind === 'gild' && o.enh === 'lucky')).toBe(ok);
    }
  });
});

describe('enemy effect symbols say what they do', () => {
  it('effect text follows the write() tiers', async () => {
    const { effectText } = await import('../src/core/fight');
    expect(effectText('slime', 90)).toBe('SLIMES 9 CELLS');
    expect(effectText('slime', 10)).toBe('SLIMES 1 CELL');
    expect(effectText('ice', 90)).toBe('FREEZES 2 REELS FOR 3 TURNS');
    expect(effectText('lock', 10)).toBe('FIZZLES');
    expect(effectText('claw', 40)).toBe('STEALS 2 CELLS');
  });
});

describe('playtest bugs (2026-09-29)', () => {
  it('the Mirror never throws lightning, even with a copied Jackpot Bell', () => {
    const c = defaultConfig();
    c.relics = [];
    c.enemy = { hp: 9999, strips: reels3({ sword: 6, bolt: 6 }), boss: 'mirror', relics: ['bell'] };
    const f = new Fight(c, 5);
    f.step();
    f.forceNext('enemy', ['bolt', 'bolt', 'bolt']);
    const ev = f.step().events;
    expect(ofType(ev, 'specialFire')).toHaveLength(0);
    expect(ofType(ev, 'energyGain')).toHaveLength(0);
  });

  it('3 WILDS: the wheel picks a symbol AND its charm, and the jackpot pays with that charm', () => {
    let seen = false;
    for (let seed = 1; seed < 40 && !seen; seed++) {
      const f = on('joker', [], (c) => {
        c.player.strips = reels3({ sword: 4, wild: 4 });
        c.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'gold' as const, n: 4 }));
      }, seed);
      f.forceNext('player', ['wild', 'wild', 'wild']);
      const s = ofType(f.step().events, 'spin')[0].score;
      expect(s.wildPick).toBe('sword');
      expect(s.wildPickEnh).toBe('gold');
      expect(s.groups[0].notes?.some((n) => n.includes('GOLD'))).toBe(true);
      seen = true;
    }
    expect(seen).toBe(true);
  });
});
