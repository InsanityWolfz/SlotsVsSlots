// Shared helpers for iteration-1 playtest analysis. Reviewer scratch; does not modify src/.
import { defaultConfig, type GameConfig, type RelicId } from '../../src/core/config';
import { RUN_FIGHTS } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import { applyOption, createRun, draftOffers, finishFight, fightConfig, type DraftOption, type RunState } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';

export const BASE: GameConfig = defaultConfig();

export interface FightFeel {
  arch: string;
  depth: number;
  won: boolean;
  turns: number;
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  playerTurns: number;
  deadTurns: number; // player turns producing no dmg/energy/shield/cleanse
  longestDead: number;
  frozenTurns: number; // player turns with >=1 frozen reel
  lockedTurns: number;
  allFrozenOrLocked: number; // player turns with 2+ reels disabled
  steals: number;
  rocks: number;
  burstDeath: boolean; // died having >=50% HP at start of the enemy's penultimate turn
  hpTwoEnemyTurnsBeforeDeath: number;
  killer: string;
  potCashouts: number[];
  potSteals: number[];
  maxPot: number;
}

export function playFight(fight: Fight, arch: string, depth: number): FightFeel {
  const p = fight.sides.player;
  const f: FightFeel = {
    arch, depth, won: false, turns: 0, hpBefore: p.hp, hpAfter: 0, maxHp: p.maxHp, playerTurns: 0, deadTurns: 0, longestDead: 0,
    frozenTurns: 0, lockedTurns: 0, allFrozenOrLocked: 0, steals: 0, rocks: 0, burstDeath: false, hpTwoEnemyTurnsBeforeDeath: 0,
    killer: '', potCashouts: [], potSteals: [], maxPot: 0,
  };
  const hpAtEnemyTurnStart: number[] = [];
  let streak = 0;
  let lastAbility = false;
  while (!fight.over && fight.turn < 2000) {
    const side = fight.next;
    if (side === 'enemy') hpAtEnemyTurnStart.push(p.hp);
    const r = fight.step();
    lastAbility = false;
    let productive = false;
    for (const e of r.events) {
      if (side === 'player') {
        if (e.type === 'spin') {
          const fz = e.frozen.filter(Boolean).length, lk = e.locked.filter(Boolean).length;
          if (fz) f.frozenTurns++;
          if (lk) f.lockedTurns++;
          if (fz + lk >= 2) f.allFrozenOrLocked++;
        }
        if ((e.type === 'attack' && e.from === 'player' && e.amount > 0) || e.type === 'energyGain' || e.type === 'shieldGain' || e.type === 'cleanse' || e.type === 'potWin') productive = true;
      }
      if (e.type === 'steal' && e.to === 'player') f.steals += e.cells.length;
      if (e.type === 'junk' && e.to === 'player') f.rocks += e.inserts.length;
      if (e.type === 'ability' && side === 'enemy') lastAbility = true;
      if (e.type === 'potWin' && e.from === 'enemy') f.potCashouts.push(e.amount);
      if (e.type === 'potWin' && e.from === 'player') f.potSteals.push(e.amount);
      if (e.type === 'pot') f.maxPot = Math.max(f.maxPot, e.total);
      if (e.type === 'death' && e.side === 'player') {
        const last = r.events.filter((x) => x.type === 'attack' || x.type === 'potWin').at(-1) as any;
        f.killer = last?.type === 'potWin' ? 'pot' : lastAbility ? 'ability' : 'spin';
      }
    }
    if (side === 'player') {
      f.playerTurns++;
      if (productive) streak = 0; else { f.deadTurns++; streak++; f.longestDead = Math.max(f.longestDead, streak); }
    }
  }
  f.turns = fight.turn;
  f.won = fight.winner === 'player';
  f.hpAfter = p.hp;
  if (!f.won) {
    const h = hpAtEnemyTurnStart.at(-2) ?? f.hpBefore;
    f.hpTwoEnemyTurnsBeforeDeath = h / f.maxHp;
    f.burstDeath = h / f.maxHp >= 0.5;
  }
  return f;
}

export type Picker = (run: RunState, offers: DraftOption[], rng: Rng) => DraftOption;

const best = (run: RunState, offers: DraftOption[], score: (o: DraftOption) => number) =>
  offers.reduce((a, b) => (score(b) > score(a) ? b : a));

export const POLICIES: Record<string, Picker> = {
  greedy: (run, o) => best(run, o, (x) => greedyValue(run, x)),
  random: (_run, o, rng) => rng.pick(o),
  first: (_run, o) => o[0],
  relicFirst: (run, o) => best(run, o, (x) => (x.kind === 'relic' ? 100 : 0) + greedyValue(run, x)),
  swordFirst: (run, o) => best(run, o, (x) => (x.kind === 'add' && x.symbol === 'sword' ? 100 : 0) + greedyValue(run, x)),
  boltFirst: (run, o) => best(run, o, (x) => (x.kind === 'add' && x.symbol === 'bolt' ? 100 : 0) + greedyValue(run, x)),
  healLow: (run, o) => best(run, o, (x) => (x.kind === 'heal' && run.player.hp < run.player.maxHp * 0.6 ? 100 : 0) + greedyValue(run, x)),
  maxHpFirst: (run, o) => best(run, o, (x) => (x.kind === 'maxHp' ? 100 : 0) + greedyValue(run, x)),
  removeFirst: (run, o) => best(run, o, (x) => (x.kind === 'remove' ? 100 : 0) + greedyValue(run, x)),
  avoidRelic: (run, o) => best(run, o, (x) => (x.kind === 'relic' ? -100 : 0) + greedyValue(run, x)),
};

export interface RunOut {
  won: boolean;
  deathDepth: number;
  fights: FightFeel[];
  relics: RelicId[];
  picks: DraftOption[];
  rocksEnd: number;
  hpIntoBoss: number;
}

export function playRun(seed: number, picker: Picker, pickRng: Rng, fightRng: Rng, startAt?: { run: RunState }): RunOut {
  const run = startAt?.run ?? createRun(BASE, seed);
  const out: RunOut = { won: false, deathDepth: -1, fights: [], relics: [], picks: [], rocksEnd: 0, hpIntoBoss: -1 };
  while (!run.over) {
    if (run.depth === RUN_FIGHTS) out.hpIntoBoss = run.player.hp / run.player.maxHp;
    const e = run.enemies[run.depth];
    const fight = new Fight(fightConfig(run, BASE), fightRng.int(0xffffffff));
    const depth = run.depth;
    out.fights.push(playFight(fight, e.archetype, depth));
    finishFight(run, fight);
    if (run.over && !run.won) out.deathDepth = depth;
    if (!run.over) {
      const offers = draftOffers(run);
      const o = picker(run, offers, pickRng);
      out.picks.push(o);
      applyOption(run, o);
    }
  }
  out.won = run.won;
  out.relics = [...run.player.relics];
  out.rocksEnd = run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
  return out;
}

export const cloneRun = (r: RunState): RunState => JSON.parse(JSON.stringify(r));

/** Win probability of the rest of a run from `run` (state just before a fight) under a picker. */
export function rollout(run: RunState, picker: Picker, n: number, rng: Rng): number {
  let w = 0;
  for (let i = 0; i < n; i++) {
    const r = playRun(0, picker, rng, rng, { run: cloneRun(run) });
    if (r.won) w++;
  }
  return w / n;
}

export const optKey = (o: DraftOption): string =>
  o.kind === 'add' ? `+${o.symbol} r${o.reel + 1}` : o.kind === 'remove' ? `-${o.symbol} r${o.reel + 1}` : o.kind === 'relic' ? `relic:${o.relic}` : o.kind;
export const optType = (o: DraftOption): string =>
  o.kind === 'add' ? `+${o.symbol}` : o.kind === 'remove' ? `-${o.symbol}` : o.kind === 'relic' ? `relic:${o.relic}` : o.kind;

export { createRun, draftOffers, applyOption, finishFight, fightConfig, Fight, Rng, RUN_FIGHTS };
