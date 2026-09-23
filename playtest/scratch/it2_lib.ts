// Iteration-2 playtest helpers: forks, new draft kinds, boss/freeze/resist telemetry. Reviewer scratch.
import { defaultConfig, type GameConfig, type RelicId } from '../../src/core/config';
import { RUN_FIGHTS } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import { applyOption, chooseEnemy, createRun, draftOffers, finishFight, fightConfig, needsChoice, stripStats, type DraftOption, type RunState } from '../../src/core/run';
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
  deadTurns: number;
  longestDead: number;
  frozenTurns: number;
  lockedTurns: number;
  twoDisabled: number;
  freezeEvents: number;
  frozenJackpots: number; // player jackpot while 2+ reels frozen
  frozenPairs: number; // player pair with reel1+2 frozen
  steals: number;
  rocks: number;
  resists: Record<string, number>;
  snapDmg: number;
  burstDeath: boolean;
  killer: string;
  // boss
  potCashouts: number[];
  potSteals: number[];
  maxPot: number;
  allIn: boolean;
  allInPot: number;
  allInTurn: number;
  potAtEnd: number;
  cashAfterAllIn: number[];
  stealsAfterAllIn: number[];
  enemyHpAtDeath: number; // boss hp fraction when player died
}

export function playFight(fight: Fight, arch: string, depth: number): FightFeel {
  const p = fight.sides.player;
  const f: FightFeel = {
    arch, depth, won: false, turns: 0, hpBefore: p.hp, hpAfter: 0, maxHp: p.maxHp, playerTurns: 0, deadTurns: 0, longestDead: 0,
    frozenTurns: 0, lockedTurns: 0, twoDisabled: 0, freezeEvents: 0, frozenJackpots: 0, frozenPairs: 0, steals: 0, rocks: 0, resists: {}, snapDmg: 0,
    burstDeath: false, killer: '', potCashouts: [], potSteals: [], maxPot: fight.pot, allIn: false, allInPot: 0, allInTurn: 0, potAtEnd: 0,
    cashAfterAllIn: [], stealsAfterAllIn: [], enemyHpAtDeath: 0,
  };
  const hpAtEnemyTurnStart: number[] = [];
  let streak = 0;
  while (!fight.over && fight.turn < 2000) {
    const side = fight.next;
    if (side === 'enemy') hpAtEnemyTurnStart.push(p.hp);
    const r = fight.step();
    let lastAbility = false;
    let productive = false;
    let sawResist = false;
    for (const e of r.events) {
      if (side === 'player') {
        if (e.type === 'spin') {
          const fz = e.frozen.filter(Boolean).length, lk = e.locked.filter(Boolean).length;
          if (fz) f.frozenTurns++;
          if (lk) f.lockedTurns++;
          if (fz + lk >= 2) f.twoDisabled++;
          if (fz >= 2 && e.score.tier === 'triple') f.frozenJackpots++;
          if (e.frozen[0] && e.frozen[1] && e.score.tier === 'pair') f.frozenPairs++;
        }
        if ((e.type === 'attack' && e.from === 'player' && e.amount > 0) || e.type === 'energyGain' || e.type === 'shieldGain' || e.type === 'cleanse' || e.type === 'potWin') productive = true;
      }
      if (e.type === 'freeze' && e.to === 'player') f.freezeEvents++;
      if (e.type === 'steal' && e.to === 'player') f.steals += e.cells.length;
      if (e.type === 'junk' && e.to === 'player') f.rocks += e.inserts.length;
      if (e.type === 'resist') { f.resists[e.relic] = (f.resists[e.relic] ?? 0) + 1; sawResist = e.relic === 'mousetrap'; }
      if (e.type === 'attack' && e.from === 'player' && sawResist && e.reels.length === 0) { f.snapDmg += e.hpDamage; sawResist = false; }
      if (e.type === 'ability' && side === 'enemy') lastAbility = true;
      if (e.type === 'potWin' && e.from === 'enemy') { f.potCashouts.push(e.amount); if (f.allIn) f.cashAfterAllIn.push(e.amount); }
      if (e.type === 'potWin' && e.from === 'player') { f.potSteals.push(e.amount); if (f.allIn) f.stealsAfterAllIn.push(e.amount); }
      if (e.type === 'pot') f.maxPot = Math.max(f.maxPot, e.total);
      if (e.type === 'phase') { f.allIn = true; f.allInPot = e.pot; f.allInTurn = fight.turn; f.maxPot = Math.max(f.maxPot, e.pot); }
      if (e.type === 'death' && e.side === 'player') {
        const last = r.events.filter((x) => x.type === 'attack' || x.type === 'potWin' || x.type === 'specialFire').at(-1) as any;
        f.killer = last?.type === 'potWin' ? 'pot' : lastAbility ? 'ability' : 'spin';
        f.enemyHpAtDeath = fight.sides.enemy.hp / fight.sides.enemy.maxHp;
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
  f.potAtEnd = fight.pot;
  if (!f.won) {
    const h = hpAtEnemyTurnStart.at(-2) ?? f.hpBefore;
    f.burstDeath = h / f.maxHp >= 0.5;
  }
  return f;
}

export type Picker = (run: RunState, offers: DraftOption[], rng: Rng) => DraftOption;
export type ForkPicker = (run: RunState, rng: Rng) => number;

const best = (offers: DraftOption[], score: (o: DraftOption) => number) => offers.reduce((a, b) => (score(b) > score(a) ? b : a));

// ---- fork pickers ----
const DANGER: Record<string, number> = { slime: 3, frost: 6, golem: 5, thief: 11, gremlin: 15, brute: 15 };
const COUNTER: Record<string, RelicId> = { frost: 'mittens', gremlin: 'lockpick', thief: 'mousetrap', golem: 'pickaxe' };
/** Measured (it2) single-fight danger, used by the 'informed' fork picker. Filled lazily by scripts if wanted. */
export const DANGER2: Record<string, number> = { ...DANGER };
export const FORKS: Record<string, ForkPicker> = {
  simGreedy: (run) => {
    const opts = run.paths[run.depth];
    const score = (i: number) => {
      const a = opts[i].archetype;
      const c = COUNTER[a] && run.player.relics.includes(COUNTER[a]);
      return (DANGER[a] ?? 8) * (c ? 0.4 : 1);
    };
    return opts.map((_, i) => i).reduce((b, i) => (score(i) < score(b) ? i : b), 0);
  },
  random: (run, rng) => rng.int(run.paths[run.depth].length),
  first: () => 0,
  hardest: (run) => {
    const opts = run.paths[run.depth];
    return opts.map((_, i) => i).reduce((b, i) => ((DANGER[opts[i].archetype] ?? 8) > (DANGER[opts[b].archetype] ?? 8) ? i : b), 0);
  },
};

export const POLICIES: Record<string, Picker> = {
  greedy: (run, o) => best(o, (x) => greedyValue(run, x)),
  random: (_run, o, rng) => rng.pick(o),
  first: (_run, o) => o[0],
  relicRandom: (run, o, rng) => { const r = o.filter((x) => x.kind === 'relic'); return r.length ? rng.pick(r) : best(o, (x) => greedyValue(run, x)); },
  hpFirst: (run, o) => best(o, (x) => (x.kind === 'heal' || x.kind === 'maxHp' ? 100 : 0) + greedyValue(run, x)),
  swapFirst: (run, o) => best(o, (x) => (x.kind === 'swap' ? 100 : 0) + greedyValue(run, x)),
  neverRelic: (run, o) => best(o, (x) => (x.kind === 'relic' ? -100 : 0) + greedyValue(run, x)),
  crownFirst: (run, o) => best(o, (x) => (x.kind === 'relic' && x.relic === 'crown' ? 100 : 0) + greedyValue(run, x)),
  stripStat: (run, o) => best(o, (x) => {
    // A human reading the before->after line: pick the card with the largest energy*2+damage gain; HP/relic via greedy.
    if (x.kind === 'swap' || x.kind === 'add' || x.kind === 'clear') return 0;
    return greedyValue(run, x);
  }),
};

export interface RunOut {
  won: boolean;
  deathDepth: number;
  fights: FightFeel[];
  relics: RelicId[];
  picks: DraftOption[];
  forks: string[];
  rocksEnd: number;
  hpIntoBoss: number;
}

export const HOOK: { onCreate: ((r: RunState) => void) | null; afterWin: ((r: RunState, arch: string, depth: number) => void) | null } = { onCreate: null, afterWin: null };
export function playRun(seed: number, picker: Picker, fork: ForkPicker, pickRng: Rng, fightRng: Rng, startAt?: RunState): RunOut {
  const run = startAt ?? createRun(BASE, seed);
  if (!startAt && HOOK.onCreate) HOOK.onCreate(run);
  const out: RunOut = { won: false, deathDepth: -1, fights: [], relics: [], picks: [], forks: [], rocksEnd: 0, hpIntoBoss: -1 };
  while (!run.over) {
    if (needsChoice(run)) {
      chooseEnemy(run, fork(run, pickRng));
      out.forks.push(run.enemies[run.depth].archetype);
    }
    if (run.depth === RUN_FIGHTS) out.hpIntoBoss = run.player.hp / run.player.maxHp;
    const e = run.enemies[run.depth];
    const fight = new Fight(fightConfig(run, BASE), fightRng.int(0xffffffff));
    const depth = run.depth;
    out.fights.push(playFight(fight, e.archetype, depth));
    finishFight(run, fight);
    if (run.over && !run.won) out.deathDepth = depth;
    if (!run.over && HOOK.afterWin) HOOK.afterWin(run, e.archetype, depth);
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

export function rollout(run: RunState, picker: Picker, fork: ForkPicker, n: number, rng: Rng): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (playRun(0, picker, fork, rng, rng, cloneRun(run)).won) w++;
  return w / n;
}

export const optType = (o: DraftOption): string =>
  o.kind === 'add' ? `+${o.symbol}` : o.kind === 'swap' ? `swap ${o.from}->${o.to}` : o.kind === 'clear' ? 'clear rocks' : o.kind === 'relic' ? `relic:${o.relic}` : o.kind;

export { createRun, draftOffers, applyOption, finishFight, fightConfig, needsChoice, chooseEnemy, stripStats, Fight, Rng, RUN_FIGHTS };
