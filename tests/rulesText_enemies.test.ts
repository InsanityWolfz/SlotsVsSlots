/**
 * Rules text (QA RULES stream, 2026-11-09): every enemy card's ability line (front: abilityWhat, back: abilityText
 * "TURN 1, THEN EVERY N: ...") and the bosses' rules against the engine, in a real run fight (fightConfig) where the
 * cadence matters. The cards now read their clocks from the fight's own setup (fightSetup shownAbility).
 */
import { describe, expect, it } from 'vitest';
import { defaultConfig, reels3, UNIT, type RelicId } from '../src/core/config';
import type { CabinetId } from '../src/core/cabinets';
import type { CombatEvent } from '../src/core/events';
import { Fight } from '../src/core/fight';
import { ARCHETYPES, ENDLESS, makeEnemy, REPO_MAN, WHEEL, BOSS, DEALER, type Archetype } from '../src/core/enemies';
import { Rng } from '../src/core/rng';
import { createRun, skipToBoss, type RunState } from '../src/core/run';
import { fightConfig, shownAbility } from '../src/core/fightSetup';
import { POT } from '../src/core/relics';
import { abilityText, abilityWhat } from '../src/ui/run/shared';
import { bossRules } from '../src/ui/bossRules';
import { KEYWORDS } from '../src/ui/keywords';
import { BOMB } from '../src/core/relics';

const ofType = <T extends CombatEvent['type']>(evs: CombatEvent[], t: T) => evs.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === t);
const arch = (id: string): Archetype => (id === 'repo' ? REPO_MAN : ARCHETYPES.find((a) => a.id === id)!);
const actOf = (a: Archetype) => (a.acts?.includes(1) || !a.acts ? 1 : a.acts.includes(2) ? 2 : 3);

function runVs(id: string, o: { cab?: CabinetId; stake?: number; relics?: RelicId[]; act?: number } = {}): RunState {
  const r = createRun(defaultConfig(), 11, o.cab ?? 'knight', o.stake ?? 0);
  r.pendingStart = null;
  r.player.relics = [...(o.relics ?? [])];
  const a = arch(id);
  r.act = o.act ?? (id === 'repo' ? 1 : actOf(a));
  r.enemies[r.depth] = makeEnemy(a, 2, new Rng(3), false, r.act);
  return r;
}
/** What the enemy card's back says the cadence is (enemyCard.ts everyOf). */
function cardEvery(r: RunState): number {
  const e = r.enemies[r.depth];
  return shownAbility(r, e.ability!, e.boss).every;
}
/** The enemy turns (1, 2, 3...) on which its ability fired, over `turns` fight turns (both machines). */
function fireTurns(f: Fight, turns: number, onEvents?: (e: CombatEvent[], enemyTurn: number) => void): number[] {
  const out: number[] = [];
  let et = 0;
  for (let i = 0; i < turns && !f.over; i++) {
    const side = f.next;
    const r = f.step();
    if (side === 'enemy') {
      et++;
      if (r.events.some((e) => e.type === 'ability' && e.side === 'enemy')) out.push(et);
      onEvents?.(r.events, et);
    }
  }
  return out;
}
/** A run fight where you can't die or kill (huge HP both ways), so the clock plays out. */
function longFight(r: RunState): Fight {
  const cfg = fightConfig(r, defaultConfig());
  cfg.player.hp = cfg.player.startHp = 1e6;
  cfg.enemy.hp = 1e9;
  return new Fight(cfg, 4);
}

describe('enemy card fronts: one line of what the ability does (WHITE, act of the enemy)', () => {
  const want: Record<string, string> = {
    slime: 'SPILLS 3 OF YOUR SYMBOLS',
    brute: 'SWINGS FOR 40',
    frost: 'FREEZES 1 REEL FOR 2 TURNS',
    thief: 'STEALS 1 SYMBOL',
    golem: 'ADDS 2 ROCKS TO YOUR REELS',
    gremlin: 'JAMS 1 REEL FOR 1 TURN',
    bomber: 'STICKS 2 IOUS ON YOUR SYMBOLS',
    hexer: 'JINXES 1 REEL FOR 3 TURNS',
    vampire: 'HEALS 80 HP',
    counterfeiter: 'TAKES 2 OF YOUR CHIPS, HEALS 60',
    sharp: 'MARKS 3 OF YOUR SYMBOLS',
    pitboss: 'TAKES 2 OF YOUR CHARMS FOR THE FIGHT, THEN HITS FOR 40',
    croupier: 'RAKES YOUR PAYS FOR 3 TURNS',
    repo: 'TAKES A CHARM FOR THE FIGHT',
  };
  for (const [id, text] of Object.entries(want)) it(`${id}: ${text}`, () => expect(abilityWhat(runVs(id).enemies[runVs(id).depth], runVs(id))).toBe(text));
});

describe('the ability does what the card says (a real run fight, WHITE)', () => {
  it('BARFLY: 3 symbols spilled', () => {
    const f = longFight(runVs('slime'));
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    expect(ofType(evs, 'slime').find((e) => e.reels.length === 0)!.cells.length).toBe(3);
  });
  it('LEG BREAKER: THE SWING hits 40', () => {
    const f = longFight(runVs('brute'));
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    const swing = ofType(evs, 'attack').find((e) => e.from === 'enemy' && e.reels.length === 0)!;
    expect(swing.amount).toBe(4 * UNIT);
  });
  it('COOLER: the frozen reel sits out 2 of your spins', () => {
    const f = longFight(runVs('frost'));
    let frozenAt = -1;
    let spinsFrozen = 0;
    for (let i = 0; i < 20 && !f.over; i++) {
      const side = f.next;
      const r = f.step();
      const fz = ofType(r.events, 'freeze').find((e) => e.reels.length === 0 && e.to === 'player');
      if (fz && frozenAt < 0) frozenAt = fz.targets[0];
      if (side === 'player' && frozenAt >= 0) {
        const sp = ofType(r.events, 'spin')[0];
        if (sp.frozen[frozenAt]) spinsFrozen++;
        else if (spinsFrozen) break;
      }
    }
    expect(spinsFrozen).toBe(2);
  });
  it('MECHANIC: one reel jammed for 1 of your spins', () => {
    const f = longFight(runVs('gremlin'));
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    const jam = ofType(evs, 'lock').find((e) => e.reels.length === 0)!;
    expect(jam.targets.length).toBe(1);
    expect(jam.turns).toBe(1);
  });
  it('FENCE: 2 rocks added', () => {
    const f = longFight(runVs('golem'));
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    expect(ofType(evs, 'junk').find((e) => e.reels.length === 0)!.inserts.length).toBe(2);
  });
  it(`LOAN SHARK: 2 IOUs, each due in ${BOMB.fuse} of your spins, ${BOMB.damage} a blast`, () => {
    const f = longFight(runVs('bomber'));
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    expect(ofType(evs, 'bomb').find((e) => e.reels.length === 0)!.cells.length).toBe(2);
  });
  it('JINX: one reel jinxed for 3 of your spins', () => {
    const f = longFight(runVs('hexer'));
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    const h = ofType(evs, 'hex').find((e) => e.reels.length === 0)!;
    expect([h.targets.length, h.turns]).toEqual([1, 3]);
  });
  it('CROUPIER: your pays raked for 3 of your spins, 10 off each pay', () => {
    // A bare fight: the rake once (every 99 after a head start), then your sword pairs.
    const c = defaultConfig();
    c.seed = 3;
    c.player = { hp: 1e6, strips: reels3({ sword: 6, shield: 3, empty: 3 }) };
    c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }), ability: { kind: 'houseTake', every: 1, power: 3 } };
    const f = new Fight(c, 3);
    f.forceNext('player', ['sword', 'shield', 'empty']);
    f.step();
    f.step();
    f.sides.enemy.ability = { kind: 'houseTake', every: 99, power: 3 };
    const raked: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      f.forceNext('player', ['sword', 'sword', 'empty']);
      const g = ofType(f.step().events, 'spin')[0].score.groups.find((x) => x.symbol === 'sword' && x.matched)!;
      raked.push(!!g.notes?.includes('-10 RAKE'));
      f.step();
    }
    expect(raked).toEqual([true, true, true, false, false]);
  });
  it('PIT BOSS: AUDIT takes 2 Charms and hits 40', () => {
    const r = runVs('pitboss');
    r.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 3 }, { reel: 1, symbol: 'sword', enh: 'gold', n: 3 }];
    const f = longFight(r);
    const evs: CombatEvent[] = [];
    fireTurns(f, 4, (e) => evs.push(...e));
    const c = ofType(evs, 'confiscate').find((e) => e.reels.length === 0)!;
    expect(c.cells.length).toBe(2);
    // (Act 3's COVER CHARGE takes the first hit's first 10% of your max HP as its own event.)
    const cover = ofType(evs, 'coverCharge').reduce((a, e) => a + e.amount, 0);
    const hit = ofType(evs, 'attack').filter((e) => e.from === 'enemy' && e.reels.length === 0).reduce((a, e) => a + e.amount, 0);
    expect(cover + hit).toBe(4 * UNIT);
  });
  it('THE REPO MAN: "TURN 1 AND TURN 4: TAKES A CHARM" - he takes on turns 1 and 4, then never again', () => {
    const r = runVs('repo');
    r.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 3 }, { reel: 1, symbol: 'sword', enh: 'gold', n: 3 }, { reel: 2, symbol: 'sword', enh: 'gold', n: 3 }];
    const f = longFight(r);
    const takes: number[] = [];
    fireTurns(f, 22, (e, et) => ofType(e, 'confiscate').length && takes.push(et));
    expect(abilityText(r.enemies[r.depth], cardEvery(r), r)).toBe('TURN 1 AND TURN 4: TAKES A CHARM FOR THE FIGHT');
    expect(takes).toEqual([1, 4]);
  });
  it('THE REPO MAN: after his last take his countdown goes (a done abilityCharge), and nothing fires after it', () => {
    const r = runVs('repo');
    r.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold', n: 3 }, { reel: 1, symbol: 'sword', enh: 'gold', n: 3 }];
    const f = longFight(r);
    const evs: CombatEvent[] = [];
    const fired = fireTurns(f, 30, (e) => evs.push(...e));
    expect(fired).toEqual([1, 4]);
    const done = ofType(evs, 'abilityCharge').findIndex((e) => e.done);
    expect(done).toBeGreaterThanOrEqual(0);
    expect(ofType(evs, 'abilityCharge').slice(done + 1).length).toBe(0);
  });
});

describe('enemy card backs: "EVERY N TURNS" against the fight\'s clock', () => {
  it('act 1 regulars: the card says TURN 1, THEN EVERY 3, and the ability fires on the enemy\'s turn 1, then every 3', () => {
    const r = runVs('slime');
    expect(abilityText(r.enemies[r.depth], cardEvery(r), r).startsWith('TURN 1, THEN EVERY 3:')).toBe(true);
    expect(fireTurns(longFight(r), 16)).toEqual([1, 4, 7]);
  });
  for (const id of ['slime', 'gremlin', 'bomber', 'sharp'])
    it(`ESPRESSO SHOT (TESLA): ${id}'s card says the same EVERY N the fight plays`, () => {
      const r = runVs(id, { cab: 'tesla', relics: ['quickening'] });
      const f = longFight(r);
      expect(cardEvery(r)).toBe(f.sides.enemy.ability!.every);
    });
  it('the GOLDEN HOURGLASS: the card and the fight agree (4 for a regular)', () => {
    const r = runVs('slime', { relics: ['sandglass'] });
    expect(cardEvery(r)).toBe(longFight(r).sides.enemy.ability!.every);
  });
  it('the card\'s first turn is the turn the fight fires first (the Hourglass: TURN 2, THEN EVERY 4)', () => {
    const r = runVs('slime', { relics: ['sandglass'] });
    const text = abilityText(r.enemies[r.depth], cardEvery(r), r);
    const [, first, every] = /^TURN (\d+), THEN EVERY (\d+)/.exec(text)!.map(Number);
    expect(fireTurns(longFight(r), 20).slice(0, 2)).toEqual([first, first + every]);
  });
});

describe('boss rules vs the fight', () => {
  const bossRun = (act: number, o: { stake?: number; relics?: RelicId[]; cab?: CabinetId } = {}) => {
    const r = createRun(defaultConfig(), 11, o.cab ?? 'tesla', o.stake ?? 0);
    r.pendingStart = null;
    r.player.relics = [...(o.relics ?? [])];
    r.act = act;
    r.map.boss = makeEnemy(act === 1 ? BOSS : WHEEL, 5, new Rng(1), true, act);
    skipToBoss(r);
    return r;
  };
  it("THE WHEEL with ESPRESSO SHOT: its rules' NO MORE BETS clock is the fight's (3: the relic no longer speeds it up)", () => {
    const r = bossRun(2, { relics: ['quickening'] });
    const every = shownAbility(r, WHEEL.ability!, 'wheel').every;
    const text = bossRules('wheel', { stake: 0, cabinet: 'tesla', houseEvery: 3, wheelEvery: every }).rules[1].text;
    expect(text.startsWith(`EVERY ${longFight(r).sides.enemy.ability!.every} OF HER SPINS SHE CALLS NO MORE BETS`)).toBe(true);
    expect(every).toBe(3);
  });
  it("THE HOUSE with ESPRESSO SHOT: the pre-fight card's EVERY N (houseEvery) matches the fight's skim clock", () => {
    const r = bossRun(1, { relics: ['quickening'] });
    const shown = shownAbility(r, { kind: 'jackpot', every: POT.cashEvery, power: 1 }, 'house').every;
    expect(shown).toBe(longFight(r).sides.enemy.ability!.every);
  });
  it('THE HOUSE: "EVERY 3 OF HIS SPINS HE SKIMS" - its first skim lands on its 4th turn, then every 3', () => {
    const r = bossRun(1);
    expect(fireTurns(longFight(r), 18)).toEqual([4, 7]);
  });
  it('THE HOUSE: "FROM SPIN 20 HE SKIMS ON EACH OF HIS SPINS" - it skims on spins 20, 22, 24...', () => {
    const r = bossRun(1);
    const f = longFight(r);
    const spins: number[] = [];
    for (let i = 0; i < 30 && !f.over; i++) {
      const res = f.step();
      if (res.events.some((e) => e.type === 'potWin' && e.from === 'enemy')) spins.push(res.turn);
    }
    const late = spins.filter((t) => t >= 18);
    expect(late.slice(0, 3)).toEqual([20, 22, 24]);
    expect(bossRules('house', { stake: 0, houseEvery: 3 }).rules.map((x) => x.text).join(' ')).toContain('FROM SPIN 20 HE SKIMS ON EACH OF HIS SPINS');
  });
  it('THE HOUSE: "YOUR JACKPOTS WIN HIS POT AND HIT HIM WITH IT" - a jackpot empties the pot onto him, past his shield', () => {
    const f = longFight(bossRun(1, { cab: 'knight' }));
    f.forceNext('player', ['sword', 'sword', 'sword']);
    const won = ofType(f.step().events, 'potWin')[0];
    expect([won.from, won.to, won.potLeft]).toEqual(['player', 'enemy', 0]);
    expect(won.amount).toBe(POT.seed);
    expect(won.hpDamage).toBe(POT.seed);
    expect(bossRules('house', { stake: 0, houseEvery: 3 }).win).toBe('YOUR JACKPOTS WIN HIS POT AND HIT HIM WITH IT');
  });
});

describe('ENDLESS: the boss cards against the loop fights', () => {
  const loopRun = (boss: 'house' | 'wheel') => {
    const r = createRun(defaultConfig(), 11, 'knight', 2);
    r.pendingStart = null;
    r.act = 4;
    r.endless = { loop: boss === 'house' ? 1 : 2, pot: 0 };
    r.map.boss = makeEnemy(boss === 'house' ? BOSS : WHEEL, 3, new Rng(1), true, 4);
    skipToBoss(r);
    return r;
  };
  it("the loop WHEEL's front card ('EACH CHIP LEFT ON YOUR REELS HITS N') says the N the fight hits for", () => {
    const r = loopRun('wheel');
    const e = r.enemies[r.depth];
    const n = Number(/HITS (\d+)/.exec(abilityWhat(e, r))![1]);
    const f = new Fight(fightConfig(r, defaultConfig()), 3);
    expect(n).toBe(f.betPer());
  });
  it("the loop HOUSE's card (houseEvery: 'EVERY N OF HIS SPINS HE SKIMS') says the N the fight plays", () => {
    const r = loopRun('house');
    const shown = shownAbility(r, { kind: 'jackpot', every: POT.cashEvery, power: 1 }, 'house').every;
    const f = new Fight(fightConfig(r, defaultConfig()), 3);
    expect(shown).toBe(f.sides.enemy.ability!.every);
  });
  it("the loop HOUSE's rules say what the loop fight does: no skim on each spin from spin 20, and a jackpot wins A THIRD OF HIS POT", () => {
    const br = bossRules('house', { stake: 2, houseEvery: ENDLESS.houseEvery, loop: 1 });
    expect(br.rules.map((x) => x.text).join(' ')).not.toContain('FROM SPIN');
    expect(br.win).toBe('YOUR JACKPOTS WIN A THIRD OF HIS POT AND HIT HIM WITH IT');
    // The fight: his skims stay 2 of his spins apart past spin 20 (act 1's DOORMAN skims on 20, 22, 24).
    // (The loop's pot is sized to your HP when the fight is built: the HP that keeps both machines up is set after.)
    const f = new Fight(fightConfig(loopRun('house'), defaultConfig()), 4);
    f.sides.player.maxHp = f.sides.player.hp = 1e9;
    f.sides.enemy.maxHp = f.sides.enemy.hp = 1e12;
    const spins: number[] = [];
    for (let i = 0; i < 30 && !f.over; i++) {
      const res = f.step();
      if (res.events.some((e) => e.type === 'potWin' && e.from === 'enemy')) spins.push(res.turn);
    }
    const late = spins.filter((t) => t >= 18);
    expect(late.length).toBeGreaterThan(1);
    for (let i = 1; i < late.length; i++) expect(late[i] - late[i - 1]).toBe(2 * ENDLESS.houseEvery);
    // A jackpot of yours: a third of the pot (ENDLESS.potSteal), the rest stays.
    const g = new Fight(fightConfig(loopRun('house'), defaultConfig()), 4);
    g.forceNext('player', ['sword', 'sword', 'sword']);
    const won = ofType(g.step().events, 'potWin')[0];
    expect(won.from).toBe('player');
    // (34% of it, rounded up to a whole 10: 50 of a 120 pot.)
    expect(won.amount).toBe(Math.ceil(((won.amount + won.potLeft) * ENDLESS.potSteal) / UNIT) * UNIT);
    expect(ENDLESS.potSteal).toBeCloseTo(1 / 3, 1);
    expect(won.potLeft).toBeGreaterThan(won.amount);
  });
});

describe('BOUNCER: "THE FIRST ENEMY ABILITY EACH FIGHT THAT HITS YOUR REELS DOES NOTHING"', () => {
  const dealerRun = (relics: RelicId[]) => {
    const r = createRun(defaultConfig(), 11, 'knight', 1);
    r.pendingStart = null;
    r.player.relics = relics;
    r.act = 3;
    r.map.boss = makeEnemy(DEALER, 5, new Rng(1), true, 3);
    skipToBoss(r);
    return r;
  };
  it("THE DEALER's first BUST (a card over your best reel's payline) is blocked", () => {
    const f = longFight(dealerRun(['holywater']));
    const evs: CombatEvent[] = [];
    fireTurns(f, 8, (e) => evs.push(...e));
    const first = evs.findIndex((e) => e.type === 'ability' && e.side === 'enemy');
    expect(first).toBeGreaterThanOrEqual(0);
    // Blocked: BOUNCER fires and no BUST card lands on your payline from that ability.
    expect(evs.slice(first).find((e) => e.type === 'lineCard' || (e.type === 'relic' && e.relic === 'holywater'))?.type).toBe('relic');
  });
  it("THE CROUPIER's RAKE (your pays, not your reels) is not what BOUNCER blocks", () => {
    const f = longFight(runVs('croupier', { relics: ['holywater'] }));
    const evs: CombatEvent[] = [];
    fireTurns(f, 2, (e) => evs.push(...e));
    // Its first RAKE lands (BOUNCER waits for an ability on your reels).
    expect(evs.some((e) => e.type === 'relic' && e.relic === 'holywater')).toBe(false);
  });
});

describe('FREEZE (glossary): "A FROZEN REEL DOESN\'T SPIN. AS IT FREEZES IT CAN SLIP ONE SPOT, TO THE WORSE SYMBOL"', () => {
  it('a COLD STREAK sometimes slips the frozen reel one cell (the glossary says so)', () => {
    // Your reels: swords with a few empties; the freeze picks your weakest-looking reel and may shift it a cell.
    const c = defaultConfig();
    c.seed = 8;
    c.player = { hp: 1e6, strips: reels3({ sword: 9, empty: 3 }) };
    c.enemy = { hp: 1e9, strips: reels3({ empty: 12 }), ability: { kind: 'blizzard', every: 1, power: 1 } };
    let moved = 0;
    let frozen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const f = new Fight({ ...c, seed }, seed);
      f.step();
      const before = f.sides.player.reels.map((r) => r.cells[r.stop].symbol);
      const fz = ofType(f.step().events, 'freeze')[0];
      if (!fz) continue;
      frozen++;
      for (const r of fz.targets) if (f.sides.player.reels[r].cells[f.sides.player.reels[r].stop].symbol !== before[r]) moved++;
    }
    expect(frozen).toBeGreaterThan(0);
    expect(moved).toBeGreaterThan(0);
    expect(KEYWORDS.find((k) => k.word === 'FREEZE')!.text).toContain('SLIP ONE SPOT');
  });
});

describe("THE WHEEL's rules card names every rule that changes how you beat it", () => {
  it('a hit big enough to kill THE WHEEL from full HP stops at half HP, as her rules say (THE SPIN ... STOPS THERE)', () => {
    const c = defaultConfig();
    c.seed = 4;
    c.player = { hp: 400, strips: reels3({ sword: 12 }) };
    c.enemy = { hp: 4000, strips: reels3({ empty: 12 }), ability: { kind: 'bets', every: 3, power: 2 }, boss: 'wheel' };
    c.base = { ...c.base, sword: 1000 };
    const f = new Fight(c, 4);
    f.forceNext('player', ['sword', 'sword', 'sword']);
    f.step();
    const text = bossRules('wheel', { stake: 0, cabinet: 'knight', houseEvery: 3 }).rules.map((r) => r.text).join(' ');
    expect(text).toMatch(/THE SPIN THAT TAKES HER TO HALF HP STOPS THERE/);
    expect(f.sides.enemy.hp).toBe(2000);
  });
});

describe('elite names', () => {
  it('an elite drops its adjective, a hyphenated one too (ELITE COUNTERFEITER, not ELITE TWO-BIT COUNTERFEITER)', () => {
    const names: string[] = [];
    for (let seed = 1; seed <= 300; seed++)
      for (const route of createRun(defaultConfig(), seed, 'knight', 4).map.routes) for (const st of route) if (st.kind === 'elite' && st.enemy) names.push(st.enemy.name ?? '');
    expect(names.length).toBeGreaterThan(50);
    for (const n of names) expect(/TWO-BIT|GRUMPY|SNEAKY|SHADY|SLICK|CROOKED|BROKE|SPITEFUL|DESPERATE|GREEDY/.test(n), n).toBe(false);
  });
});
