import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, type GameConfig, type RelicId } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { LEGENDARY, NEW_RELIC, RELICS } from '../src/core/relics';
import { charmOptions, createRun, draftOffers, fightConfig, gildsFor, isIdentityRelic, migrateRun, shopOffers, relicFits, startRelics, takeStart } from '../src/core/run';

const base = defaultConfig();
const ofType = <T extends CombatEvent['type']>(events: CombatEvent[], t: T) =>
  events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A fight on a slot machine with a punching-bag enemy. */
function on(cabinet: CabinetId, relics: RelicId[], mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  c.relics = relics;
  mut?.(c);
  return new Fight(c, seed);
}
const playerAttack = (ev: CombatEvent[]) => ofType(ev, 'attack').filter((a) => a.from === 'player');

describe('slot machine relics', () => {
  it('DECK DRUM: each paying spin adds to every card this fight', () => {
    const f = on('joker', ['deckdrum']);
    f.forceNext('player', ['ace', 'shield', 'shield']);
    const first = playerAttack(f.step().events)[0].amount;
    f.step();
    f.forceNext('player', ['ace', 'shield', 'shield']);
    expect(playerAttack(f.step().events)[0].amount).toBeGreaterThan(first);
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

  it('charm relics need the charm; OVERCHARGE never shows on THE JUKEBOX', () => {
    const run = createRun(base, 4, 'joker');
    run.act = 2;
    expect(relicFits(run, 'horseshoe')).toBe(false);
    run.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'lucky', n: 2 });
    expect(relicFits(run, 'horseshoe')).toBe(true);
    expect(relicFits(createRun(base, 4, 'jukebox'), 'overcharge')).toBe(false);
    expect(relicFits(createRun(base, 4, 'tesla'), 'overcharge')).toBe(true);
  });

  it('SHIELD BASH hits for all of the leftover shield', () => {
    const f = on('knight', ['bash']);
    f.sides.player.hp = 100;
    f.step();
    f.step();
    f.sides.player.shield = 100;
    const ev = f.step().events;
    expect(playerAttack(ev)[0].amount).toBe(100); // full share (was half)
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
      if (spin.luckyWilds?.length) hits = spin.score.groups.filter((g) => g.notes?.includes(`X${NEW_RELIC.horseshoeMul} HORSESHOE`)).length;
      if (!f.over) f.step();
    }
    expect(hits).toBeGreaterThan(0);
  });

  it('UNDERDOG pays x1.5 under half HP', () => {
    const u = on('knight', ['underdog']);
    u.sides.player.hp = 10;
    u.forceNext('player', ['sword', 'shield', 'shield']);
    expect(ofType(u.step().events, 'spin')[0].score.groups[0].notes).toContain(`X${NEW_RELIC.underdogMul} UNDERDOG`);
  });

  it('HOLY WATER blocks the first enemy ability on your reels each fight (user, 2026-11-01)', () => {
    const f = on('knight', ['holywater'], (c) => (c.enemy = { hp: 9999, strips: reels3({ shield: 12 }), ability: { kind: 'flood', every: 1, power: 3 } }));
    f.step();
    const ev = f.step().events;
    expect(ofType(ev, 'relic').some((r) => r.relic === 'holywater')).toBe(true);
    expect(f.sides.player.reels.every((r) => r.cells.every((c) => !c.slimed))).toBe(true);
  });
});

describe('relic pools, the starting pick and lucky', () => {
  it('a new run offers 1 of 3 starting relics: your machine relics first, then a general one', () => {
    for (const cab of ['knight', 'midas', 'jukebox', 'tesla', 'joker'] as CabinetId[]) {
      const run = createRun(base, 11, cab);
      const st = run.pendingStart!;
      expect(st).toHaveLength(3);
      expect(RELICS[st[0]].machine).toBe(cab);
      expect(isIdentityRelic(st[2])).toBe(false);
      takeStart(run, st[0]);
      expect(run.player.relics).toEqual([st[0]]);
      expect(run.pendingStart).toBeNull();
      expect(startRelics(run).length).toBeGreaterThan(0);
    }
  });

  it('the Cashier puts one of your identity relics first; other machines never show up', () => {
    for (let seed = 0; seed < 30; seed++) {
      const run = createRun(base, seed, 'jukebox');
      run.pendingStart = null;
      for (let d = 0; d < 6; d++) {
        run.depth = d;
        const relics = shopOffers(run).flatMap((i) => (i.option.kind === 'relic' && !i.showcase ? [i.option.relic] : []));
        for (const r of relics) expect([undefined, 'jukebox']).toContain(RELICS[r].machine);
        expect(RELICS[relics[0]].machine === 'jukebox' || !!RELICS[relics[0]].charm).toBe(true);
      }
    }
  });

  it('the draft only edits reels; the Cashier sells levels, relics, max HP, a heal and THE BIG ONE', () => {
    const edits = new Set(['add', 'swap', 'clear', 'gild']);
    for (let seed = 0; seed < 40; seed++) {
      const run = createRun(base, seed, (['knight', 'tesla', 'joker', 'jukebox', 'midas'] as const)[seed % 5]);
      run.pendingStart = null;
      run.player.hp = Math.round(run.player.maxHp * 0.2);
      for (let d = 0; d < 6; d++) {
        run.depth = d;
        const draft = draftOffers(run);
        expect(draft.length).toBe(3);
        for (const o of draft) expect(edits.has(o.kind)).toBe(true);
        const shelf = shopOffers(run);
        for (const i of shelf) expect(['symLevel', 'relic', 'maxHp', 'heal']).toContain(i.option.kind);
        const big = shelf.filter((i) => i.showcase);
        expect(big.length).toBe(1);
        expect(big[0].option.kind === 'relic' && LEGENDARY.has(big[0].option.relic)).toBe(true);
        expect(shelf.some((i) => i.option.kind === 'symLevel')).toBe(true);
        expect(shelf.some((i) => i.option.kind === 'heal')).toBe(true);
      }
    }
  });

  it('LUCKY is a later-machine charm (TESLA, JAX, THE JUKEBOX)', () => {
    for (const [cab, ok] of [['knight', false], ['midas', false], ['tesla', true], ['joker', true]] as [CabinetId, boolean][]) {
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
    expect(effectText('slime', 90)).toBe('SPILLS ON 9 CELLS');
    expect(effectText('slime', 10)).toBe('SPILLS ON 1 CELL');
    expect(effectText('ice', 90)).toBe('FREEZES 2 REELS FOR 3 TURNS');
    expect(effectText('lock', 10)).toBe('FIZZLES');
    expect(effectText('claw', 40)).toBe('STEALS 2 CELLS');
  });
});

describe('playtest bugs (2026-09-29)', () => {
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

describe('the relic cut (2026-10-15)', () => {
  const CUT = ['clover', 'battery', 'chalice', 'hone', 'wildcard', 'loadedreel', 'metronome', 'firstblood', 'snakeeyes', 'bracelet', 'drum', 'chainmail', 'headsman', 'faraday', 'static', 'coil', 'capbells', 'downpour', 'slushfund', 'tipjar', 'piggy', 'belt', 'pulse', 'trophy'];

  it('the cut relics are gone, and ~50 are left', () => {
    for (const r of CUT) expect(r in RELICS).toBe(false);
    expect(Object.keys(RELICS).length).toBeLessThanOrEqual(52);
  });

  it('every machine still starts with a pick of 3, two of them its own relics', () => {
    for (const cab of ['knight', 'tesla', 'jukebox', 'joker', 'midas'] as CabinetId[])
      for (let seed = 1; seed <= 20; seed++) {
        const run = createRun(base, seed, cab);
        const pick = run.pendingStart!;
        expect(pick).toHaveLength(3);
        expect(pick.every((r) => r in RELICS && relicFits(run, r))).toBe(true);
        expect(pick.filter((r) => RELICS[r].machine === cab)).toHaveLength(2);
      }
  });

  it('a saved run holding a cut relic drops it (its relics and any pick waiting)', () => {
    const run = createRun(base, 5, 'knight');
    const old = CUT.slice(0, 3) as RelicId[];
    run.player.relics = ['bandage', ...old];
    run.pendingSpoils = ['drum', 'greatsword'] as RelicId[];
    run.pendingLegend = ['clover'] as unknown as RelicId[];
    run.legendQueue = [['key', 'coil'] as RelicId[]];
    run.pendingStart = ['belt', 'chainmail'] as unknown as RelicId[];
    migrateRun(run);
    expect(run.player.relics).toEqual(['bandage']);
    expect(run.pendingSpoils).toEqual(['greatsword']);
    expect(run.pendingLegend).toEqual(['key']);
    expect(run.pendingStart!.every((r) => r in RELICS)).toBe(true);
    expect(run.pendingStart!.length).toBeGreaterThan(0);
  });
});
