/**
 * Rules text (QA RULES stream, 2026-11-09): each stake's text against what it does, and the "ENEMY REELS HIT N%
 * HARDER" / elite "HITS 25% HARDER" / OVERTIME "EVERY HIT FROM THE REELS" claims against every kind of enemy damage.
 * The texts were fixed to say what the game does (no balance change), so these pin both the claim and its edge.
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type AbilityDef, type GameConfig } from '../src/core/config';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { effectiveAbility, STAKES, stakeDmg } from '../src/core/stakes';
import { createRun, finishFight, skipToBoss, type RunState } from '../src/core/run';
import { fightConfig } from '../src/core/fightSetup';
import { BOSS, DEALER, makeEnemy, OWNER, WHEEL, ARCHETYPES } from '../src/core/enemies';
import { Rng } from '../src/core/rng';

const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);

/** A bare fight: the player spins swords into a 1e9-HP enemy that only uses its ability (its reels are empty). */
function bare(ability: AbilityDef, mut?: (c: GameConfig) => void, seed = 5): Fight {
  const c = defaultConfig();
  c.seed = seed;
  c.player = { hp: 1e6, strips: reels3({ sword: 6, shield: 3, empty: 3 }) };
  c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }), ability };
  mut?.(c);
  return new Fight(c, seed);
}
function play(f: Fight, turns: number, force = true): CombatEvent[] {
  const all: CombatEvent[] = [];
  for (let i = 0; i < turns && !f.over; i++) {
    // The player's spins pay nothing (an empty line), so only the enemy's ability acts.
    if (force && f.next === 'player') f.forceNext('player', ['sword', 'shield', 'empty']);
    all.push(...f.step().events);
  }
  return all;
}
const swingHits = (evs: CombatEvent[]) => ofType(evs, 'attack').filter((e) => e.from === 'enemy').map((e) => e.amount);

describe('GREEN+: ENEMY REELS HIT 5% HARDER (10% BLACK, 15% BLUE, 20% GOLD)', () => {
  it('the texts and stakeDmg agree (GREEN 1.05 ... GOLD 1.20), and WHITE / RED are x1', () => {
    expect(STAKES.map((s) => stakeDmg(s.level))).toEqual([1, 1, 1.05, 1.1, 1.15, 1.2]);
    expect(STAKES[2].rule).toContain('ENEMY REELS HIT 5% HARDER');
    expect(STAKES[5].rule).toContain('ENEMY REELS HIT 20% HARDER');
    // (No stake says ENEMIES HIT: the bosses' own hits, IOUs and marks keep their numbers.)
    for (const s of STAKES) expect(s.rule).not.toContain('ENEMIES HIT');
  });
  it('an enemy sword pair hits x1.05 at GREEN (named X1.05 GREEN)', () => {
    const pair = (stake: number) => {
      const f = bare({ kind: 'flood', every: 99, power: 0 }, (c) => {
        c.stake = stake;
        if (stakeDmg(stake) !== 1) c.enemy.stakeDmg = stakeDmg(stake);
        c.enemy.strips = reels3({ sword: 6, shield: 3, empty: 3 });
      });
      f.forceNext('player', ['sword', 'shield', 'empty']);
      f.step();
      f.forceNext('enemy', ['sword', 'sword', 'empty']);
      return ofType(f.step().events, 'spin')[0].score.groups.find((x) => x.symbol === 'sword' && x.matched)!;
    };
    expect(pair(2).notes).toContain('X1.05 GREEN');
    expect(pair(2).amount).toBe(Math.round(pair(0).amount * 1.05));
  });
  // THE SWING (LEG BREAKER, 40) is an ability, not a reel hit: ability hits round to whole tens, so +5% and +10% round away.
  for (const [stake, want] of [
    [2, 40],
    [3, 40],
  ] as const)
    it(`THE SWING (40) at ${STAKES[stake].name} still hits ${want} (an ability, not a reel hit)`, () => {
      const f = bare({ kind: 'smash', every: 1, power: 4 * UNIT }, (c) => {
        c.stake = stake;
        c.enemy.stakeDmg = stakeDmg(stake);
      });
      const hits = swingHits(play(f, 4));
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0]).toBe(want);
    });
  // The bosses' own hits and the act 2-3 writers' bites are dealt straight to your HP, past the stake's multiplier.
  it("THE HOUSE's SKIM is the same at GREEN as at WHITE (not a reel hit)", () => {
    const skim = (stake: number) =>
      ofType(
        play(
          bare({ kind: 'jackpot', every: 3, power: 1 }, (c) => {
            c.stake = stake;
            c.enemy.boss = 'house';
            if (stakeDmg(stake) !== 1) c.enemy.stakeDmg = stakeDmg(stake);
          }),
          10,
        ),
        'potWin',
      ).filter((e) => e.from === 'enemy')[0].amount;
    expect(skim(0)).toBeGreaterThan(0);
    expect(skim(2)).toBe(skim(0));
  });
  it("THE WHEEL's NO MORE BETS hits the same a chip at GOLD as at WHITE (not a reel hit)", () => {
    const drop = (stake: number) =>
      ofType(
        play(
          bare({ kind: 'bets', every: 3, power: 2 }, (c) => {
            c.stake = stake;
            c.player.hp = 1000;
            c.enemy.boss = 'wheel';
            if (stakeDmg(stake) !== 1) c.enemy.stakeDmg = stakeDmg(stake);
          }),
          6,
        ),
        'noMoreBets',
      )[0];
    const w = drop(0);
    const g = drop(5);
    // (Same chips on both: GOLD's 3-a-turn start comes from GREEN's STARTS FAST in the run; the bare fight places 2.)
    expect(g.amount / g.chips).toBe(w.amount / w.chips);
  });
  it("an IOU's blast (LOAN SHARK) is the same at GREEN (not a reel hit)", () => {
    const blast = (stake: number) =>
      ofType(
        play(
          bare({ kind: 'carpet', every: 1, power: 2 }, (c) => {
            c.stake = stake;
            if (stakeDmg(stake) !== 1) c.enemy.stakeDmg = stakeDmg(stake);
          }),
          12,
        ),
        'blast',
      )[0].amount;
    expect(blast(2)).toBe(blast(0));
  });
});

describe('ELITE: "HITS 25% HARDER" (the elite card back; LOAN SHARK and CARD SHARP elites say "ITS REELS HIT")', () => {
  it("an elite's sword pair is x1.25 (named X1.25 ELITE)", () => {
    const f = bare({ kind: 'flood', every: 99, power: 0 }, (c) => {
      c.enemy.dmgMul = 1.25;
      c.enemy.strips = reels3({ sword: 6, shield: 3, empty: 3 });
    });
    f.forceNext('player', ['sword', 'shield', 'empty']);
    f.step();
    f.forceNext('enemy', ['sword', 'sword', 'empty']);
    const g = ofType(f.step().events, 'spin')[0].score.groups.find((x) => x.symbol === 'sword' && x.matched)!;
    expect(g.notes).toContain('X1.25 ELITE');
  });
  it("an elite LOAN SHARK's IOU blast is the same as a regular one's (its card says ITS REELS HIT)", () => {
    const blast = (mul: number) =>
      ofType(
        play(
          bare({ kind: 'carpet', every: 1, power: 2 }, (c) => (c.enemy.dmgMul = mul)),
          12,
        ),
        'blast',
      )[0].amount;
    expect(blast(1.25)).toBe(blast(1));
  });
  it("an elite CARD SHARP's marked cards bite the same as a regular one's (its card says ITS REELS HIT)", () => {
    const bite = (mul: number) =>
      ofType(
        play(
          bare({ kind: 'mark', every: 1, power: 3 }, (c) => (c.enemy.dmgMul = mul)),
          120,
          false,
        ),
        'markedHit',
      )[0];
    const r = bite(1);
    const e = bite(1.25);
    expect(e.amount / e.cells.length).toBe(r.amount / r.cells.length);
  });
});

describe('OVERTIME (glossary: "EVERY HIT FROM THE REELS ON BOTH MACHINES PAYS X1.25 ... ABILITIES AND SHIELDS DON\'T GROW")', () => {
  it('an enemy sword pair in round 6 pays x1.25 (named X1.25 OVERTIME)', () => {
    const f = bare({ kind: 'flood', every: 99, power: 0 }, (c) => {
      c.overtime = true;
      c.enemy.strips = reels3({ sword: 6, shield: 3, empty: 3 });
    });
    for (let i = 0; i < 11; i++) {
      f.forceNext(f.next, ['sword', 'shield', 'empty']);
      f.step();
    }
    f.forceNext('enemy', ['sword', 'sword', 'empty']);
    const g = ofType(f.step().events, 'spin')[0].score.groups.find((x) => x.symbol === 'sword' && x.matched)!;
    expect(g.notes).toContain('X1.25 OVERTIME');
  });
  it("THE SWING (an ability hit) doesn't grow in OVERTIME", () => {
    const f = bare({ kind: 'smash', every: 1, power: 4 * UNIT }, (c) => (c.overtime = true));
    const evs: { turn: number; amount: number }[] = [];
    for (let i = 0; i < 16 && !f.over; i++) {
      if (f.next === 'player') f.forceNext('player', ['sword', 'shield', 'empty']);
      const r = f.step();
      for (const a of swingHits(r.events)) evs.push({ turn: r.turn, amount: a });
    }
    const early = evs.find((e) => e.turn < 11)!.amount;
    const late = evs.filter((e) => e.turn >= 14).at(-1)!.amount;
    expect(late).toBe(early);
  });
});

describe('GOLD: "ACT 1\'S ABILITIES CHARGE FASTER TOO (NOT THE DOORMAN\'S)"; BLUE: "FROM ACT 2 ... (NOT THE WHEEL\'S)"', () => {
  const at = (kind: AbilityDef['kind'], every: number, stake: number, act = 1) => effectiveAbility({ kind, every, power: 1 }, { stake, act, sandglass: false }).every;
  it('regulars (3 -> 2), THE REPO MAN (3 -> 2) and THE DEALER\'s BUST (3 -> 2) do', () => {
    expect(at('flood', 3, 5)).toBe(2);
    expect(at('repo', 3, 5)).toBe(2);
    expect(at('deal', 3, 5, 3)).toBe(2);
  });
  it("THE DOORMAN's SKIM keeps BLACK's every 2 at GOLD (the text: NOT THE DOORMAN'S)", () => {
    expect(at('jackpot', 3, 5)).toBe(at('jackpot', 3, 3));
    expect(STAKES[5].rule).toContain("NOT THE DOORMAN'S");
  });
  it("THE WHEEL's NO MORE BETS keeps its clock at BLUE and GOLD (the text: NOT THE WHEEL'S)", () => {
    expect(at('bets', 3, 5, 2)).toBe(at('bets', 3, 0, 2));
    expect(STAKES[4].rule).toContain("NOT THE WHEEL'S");
  });
  it('no ability charges faster than every 2 (THE OWNER is already there)', () => {
    expect(at('owner', 2, 5, 4)).toBe(2);
  });
});

describe('BLUE: "FROM ACT 2, ENEMY ABILITIES CHARGE FASTER"', () => {
  it('act 2 regulars charge faster (3 -> 2)', () => {
    expect(effectiveAbility({ kind: 'carpet', every: 3, power: 2 }, { stake: 4, act: 2, sandglass: false }).every).toBe(2);
  });
  it('act 1 regulars keep their clock', () => {
    expect(effectiveAbility({ kind: 'flood', every: 3, power: 3 }, { stake: 4, act: 1, sandglass: false }).every).toBe(3);
  });
  it('act 3 regulars charge faster at BLUE too (FROM ACT 2)', () => {
    expect(effectiveAbility({ kind: 'mark', every: 3, power: 3 }, { stake: 4, act: 3, sandglass: false }).every).toBe(2);
    expect(STAKES[4].rule.startsWith('FROM ACT 2')).toBe(true);
  });
});

describe('GOLD: "BOSSES HAVE +8% HP"', () => {
  const hpAt = (stake: number, boss: 'house' | 'wheel' | 'dealer') => {
    const r = createRun(defaultConfig(), 3, 'knight', stake);
    r.pendingStart = null;
    r.act = boss === 'house' ? 1 : boss === 'wheel' ? 2 : 3;
    const e = makeEnemy(boss === 'house' ? BOSS : boss === 'wheel' ? WHEEL : DEALER, 5, new Rng(1), true, r.act);
    r.enemies = [e];
    r.depth = 0;
    r.map.boss = e;
    skipToBoss(r);
    return fightConfig(r, defaultConfig()).enemy.hp;
  };
  it('THE HOUSE and THE DEALER: x1.08 at GOLD vs BLACK', () => {
    expect(hpAt(5, 'house') / hpAt(3, 'house')).toBeCloseTo(1.08, 2);
  });
  it('makeEnemy gives THE OWNER no GOLD bonus (ENDLESS only; noted, not asserted against the text)', () => {
    expect(OWNER.id).toBe('owner');
  });
});

describe('RED: "SCARS: EVERY 4TH FIGHT YOU WIN LEAVES A PERMANENT ROCK ON YOUR MACHINE"', () => {
  const winOnce = (r: RunState) => {
    const f = new Fight(fightConfig(r, defaultConfig()), 1);
    f.winner = 'player';
    const rec = finishFight(r, f);
    r.depth++;
    return rec;
  };
  it('wins 1-3 leave no scar; the 4th does, and the rock stays on your strips after the fight', () => {
    const r = createRun(defaultConfig(), 9, 'knight', 1);
    r.pendingStart = null;
    const rocks = () => r.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
    for (let i = 0; i < 3; i++) expect(winOnce(r).scar).toBeUndefined();
    expect(rocks()).toBe(0);
    const rec = winOnce(r);
    expect(rec.scar).toBeDefined();
    expect(rocks()).toBe(1);
  });
  it('WHITE: no scar on the 4th win', () => {
    const r = createRun(defaultConfig(), 9, 'knight', 0);
    r.pendingStart = null;
    for (let i = 0; i < 4; i++) expect(winOnce(r).scar).toBeUndefined();
  });
});

describe('enemy rocks crumble after a fight (HP_GAME: "Every enemy\'s rocks crumble after the fight, an elite\'s too")', () => {
  it('a FENCE that rocked your reels leaves none after you win (elite too)', () => {
    for (const elite of [false, true]) {
      const r = createRun(defaultConfig(), 4, 'knight', 0);
      r.pendingStart = null;
      const fence = makeEnemy(ARCHETYPES.find((a) => a.id === 'golem')!, 2, new Rng(2), false, 1);
      fence.elite = elite;
      r.enemies[r.depth] = fence;
      const f = new Fight(fightConfig(r, defaultConfig()), 2);
      // Two quakes' worth of rocks onto your strips.
      for (let i = 0; i < 12 && !f.over; i++) {
        if (f.next === 'player') f.forceNext('player', ['sword', 'shield', 'empty']);
        f.step();
      }
      const during = f.sides.player.reels.reduce((a, reel) => a + reel.cells.filter((c) => c.symbol === 'rock').length, 0);
      expect(during).toBeGreaterThan(0);
      f.winner = 'player';
      finishFight(r, f);
      expect(r.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0)).toBe(0);
    }
  });
});
