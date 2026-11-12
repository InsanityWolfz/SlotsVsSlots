/**
 * Rules text (QA RULES stream, 2026-11-09): achievements' text against their unlock checks, the tutorial / meter
 * callouts, card faces and the machine pitches against the engine's numbers.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type GameConfig, type SymbolId } from '../src/core/config';
import { CABINETS, CABINET_ORDER } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { createRun, finishFight, takeStart, startRelics } from '../src/core/run';
import { fightConfig } from '../src/core/fightSetup';
import { runEntry } from '../src/core/profile';
import { ACHIEVEMENTS, newAchievements } from '../src/core/meta';
import { METER_TIPS, TUTORIAL } from '../src/ui/coach';
import { RELICS } from '../src/core/relics';
import { cardFace } from '../src/ui/run/cardText';

const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
const ctxOf = (e: ReturnType<typeof runEntry>) => ({
  won: e.won,
  acts: e.acts,
  act: e.act,
  cabinet: e.cabinet,
  stake: e.stake,
  score: e.score ?? 0,
  chips: e.chips,
  relics: e.relics.length,
  loops: e.loops ?? 0,
  killer: e.killer,
  daily: false,
  tutorial: false,
  stats: { runs: 1, wins: 0, dailies: 0 },
  have: {},
  found: 0,
  collection: 99,
});

describe('achievements: text vs check', () => {
  it('FIRST BLOOD, "WIN A FIGHT.": a run lost in its first fight (no fight won) does not earn it', () => {
    for (const cab of ['knight', 'tesla'] as const) {
      const r = createRun(defaultConfig(), 21, cab, 0);
      takeStart(r, startRelics(r)[0]);
      const f = new Fight(fightConfig(r, defaultConfig()), 1);
      f.winner = 'enemy';
      finishFight(r, f);
      const e = runEntry(r, 1);
      expect(e.fights).toBe(0);
      const got = newAchievements(ctxOf(e)).map((a) => a.id);
      expect(got).not.toContain('first_win');
    }
  });
  it('every achievement has a text that names its condition (no empty or stale ones)', () => {
    for (const a of ACHIEVEMENTS) expect(a.text.length).toBeGreaterThan(5);
    expect(ACHIEVEMENTS.find((a) => a.id === 'turbo')!.text).toBe('BEAT THE OWNER.');
  });
});

describe('meter callouts (metersExplained) and machine pitches: "HEAL 15" on every meter machine', () => {
  it('each meter machine heals 15 a payoff (TESLA: once a storm, 5 a bolt x 3)', () => {
    for (const id of CABINET_ORDER) {
      const m = CABINETS[id].meter;
      if (!m) continue;
      const heal = m.kind === 'special' ? m.heal * 3 : m.heal;
      expect(heal).toBe(15);
      expect(METER_TIPS[id]!.text).toContain('15');
      expect(CABINETS[id].rule).toContain('15');
    }
  });
  it('every pitch names its real HP', () => {
    for (const id of CABINET_ORDER) expect(CABINETS[id].rule).toContain(`${CABINETS[id].hp} HP`);
  });
  it('KNIGHT: "EACH BOSS YOU BEAT GIVES YOUR SWORDS 4 LEVELS"', () => {
    expect(CABINETS.knight.rule).toContain('EACH BOSS YOU BEAT GIVES YOUR SWORDS 4 LEVELS');
    expect(CABINETS.knight.bossLevels).toBe(4);
  });
  it('JOKER: "EACH WILD ON YOUR PAYLINE FILLS HALF THE METER"', () => {
    expect(CABINETS.joker.meter!.perWild! * 2).toBe(CABINETS.joker.meter!.cost);
  });
});

describe('tutorial: "THAT\'S A SPIN": "EVERY SYMBOL ON THE PAYLINE PAID THE NUMBER ON IT. A PAIR PAYS X2, A JACKPOT X3"', () => {
  const spin = (line: SymbolId[]) => {
    const c: GameConfig = defaultConfig();
    c.seed = 2;
    c.player = { hp: 400, strips: reels3({ sword: 4, shield: 4, empty: 4 }) };
    c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }) };
    const f = new Fight(c, 2);
    f.forceNext('player', line);
    return ofType(f.step().events, 'spin')[0].score.groups;
  };
  it('a sword pair pays 2 x 10 x 2, a jackpot 3 x 10 x 3', () => {
    expect(spin(['sword', 'sword', 'empty']).find((g) => g.symbol === 'sword')!.amount).toBe(2 * UNIT * 2);
    expect(spin(['sword', 'sword', 'sword']).find((g) => g.symbol === 'sword')!.amount).toBe(3 * UNIT * 3);
  });
});

describe('relic card faces vs the full rule', () => {
  it('GLASS CANNON\'s face "NO HEALING BETWEEN FIGHTS": a VAMP sword pair still heals in a fight', () => {
    expect(cardFace({ kind: 'relic', relic: 'glasscannon' }).text).toBe('EVERYTHING PAYS X1.5. NO HEALING BETWEEN FIGHTS');
    const c = defaultConfig();
    c.seed = 2;
    c.relics = ['glasscannon'];
    c.player = { hp: 400, startHp: 200, strips: reels3({ sword: 6, empty: 6 }), gilded: [{ reel: 0, symbol: 'sword', enh: 'vamp', n: 6 }] };
    c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }) };
    const f = new Fight(c, 2);
    f.forceNext('player', ['sword', 'sword', 'empty']);
    const heals = ofType(f.step().events, 'heal').filter((e) => e.side === 'player');
    // In-fight heals stay (only the heals between fights go).
    expect(heals.length).toBeGreaterThan(0);
  });
  it('the full text is honest about it ("NO HEALING BETWEEN FIGHTS")', () => {
    expect(RELICS.glasscannon.text).toContain('NO HEALING BETWEEN FIGHTS');
  });
});

describe('the tutorial: "THE CASE ALWAYS HOLDS ONE LEGENDARY RELIC"', () => {
  it('(text present)', () => expect(TUTORIAL.shop[1].text).toContain('ALWAYS HOLDS ONE LEGENDARY'));
});
