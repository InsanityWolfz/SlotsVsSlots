// Iteration-3 playtest helpers: elites, gilds, wilds, skim boss telemetry. Reviewer scratch.
import { defaultConfig, type GameConfig, type RelicId } from '../../src/core/config';
import { RUN_FIGHTS } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import { COUNTERS, POT } from '../../src/core/relics';
import { applyOption, chooseEnemy, createRun, draftOffers, finishFight, fightConfig, needsChoice, stripStats, type DraftOption, type RunState } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';

export const BASE: GameConfig = defaultConfig();

export interface FightFeel {
  arch: string; depth: number; elite: boolean; won: boolean; turns: number; hpBefore: number; hpAfter: number; maxHp: number;
  gilds: number; wildCells: number;
  pierces: number; pierceBypass: number; spikedHits: number; spikedDmg: number;
  gildStolen: number; gildSlimed: number; plainStolen: number; plainSlimed: number;
  gildLinesLive: number; // player spins where a live gild was on a scoring group
  wildLines: number; // player spins with wild on payline in a matched group
  wildJackpots: number;
  killer: string; burstDeath: boolean;
  potCashouts: number[]; potSteals: number[]; maxPot: number; allIn: boolean; allInTurn: number;
  lethalTurns: number; lethalCashouts: number; lethalSeen: boolean; enemyHpAtDeath: number;
}

export function playFight(fight: Fight, arch: string, depth: number, elite = false): FightFeel {
  const p = fight.sides.player;
  const gildCount = p.reels.reduce((a, r) => a + r.cells.filter((c) => c.enh).length, 0);
  const wildCells = p.reels.reduce((a, r) => a + r.cells.filter((c) => c.symbol === 'wild').length, 0);
  const f: FightFeel = {
    arch, depth, elite, won: false, turns: 0, hpBefore: p.hp, hpAfter: 0, maxHp: p.maxHp, gilds: gildCount, wildCells,
    pierces: 0, pierceBypass: 0, spikedHits: 0, spikedDmg: 0, gildStolen: 0, gildSlimed: 0, plainStolen: 0, plainSlimed: 0,
    gildLinesLive: 0, wildLines: 0, wildJackpots: 0, killer: '', burstDeath: false,
    potCashouts: [], potSteals: [], maxPot: fight.pot, allIn: false, allInTurn: 0, lethalTurns: 0, lethalCashouts: 0, lethalSeen: false, enemyHpAtDeath: 0,
  };
  const hpHist: number[] = [];
  while (!fight.over && fight.turn < 2000) {
    const side = fight.next;
    if (side === 'enemy') hpHist.push(p.hp);
    const shieldBefore = fight.sides.enemy.shield;
    const r = fight.step();
    let lastAbility = false;
    for (const e of r.events) {
      if (e.type === 'spin' && side === 'player') {
        const line = e.score.line;
        const cells = p.reels.map((rl) => rl.cells[rl.stop]);
        const matched = e.score.groups.filter((g) => g.matched).flatMap((g) => g.reels);
        if (cells.some((c, i) => c.enh && !c.slimed && !c.stolen && !e.locked[i])) f.gildLinesLive++;
        if (matched.some((i) => cells[i].symbol === 'wild' && !cells[i].slimed && !cells[i].stolen)) { f.wildLines++; if (e.score.tier === 'triple') f.wildJackpots++; }
        void line;
      }
      if (e.type === 'attack' && e.note === 'pierce') { f.pierces++; f.pierceBypass += Math.min(shieldBefore, e.amount); }
      if (e.type === 'attack' && e.note === 'spiked' && e.from === 'player') { f.spikedHits++; f.spikedDmg += e.hpDamage; }
      if (e.type === 'steal' && e.to === 'player') for (const c of e.cells) (p.reels[c.reel].cells[c.index].enh ? f.gildStolen++ : f.plainStolen++);
      if (e.type === 'slime' && e.to === 'player') for (const c of e.cells) (p.reels[c.reel].cells[c.index].enh ? f.gildSlimed++ : f.plainSlimed++);
      if (e.type === 'ability' && side === 'enemy') lastAbility = true;
      if (e.type === 'potWin' && e.from === 'enemy') { f.potCashouts.push(e.amount); if (f.lethalSeen) f.lethalCashouts++; }
      if (e.type === 'potWin' && e.from === 'player') f.potSteals.push(e.amount);
      if (e.type === 'pot') f.maxPot = Math.max(f.maxPot, e.total);
      if (e.type === 'phase') { f.allIn = true; f.allInTurn = fight.turn; f.maxPot = Math.max(f.maxPot, e.pot); }
      if (e.type === 'death' && e.side === 'player') {
        const last = r.events.filter((x) => x.type === 'attack' || x.type === 'potWin' || x.type === 'specialFire').at(-1) as any;
        f.killer = last?.type === 'potWin' ? 'pot' : lastAbility ? 'ability' : 'spin';
        f.enemyHpAtDeath = fight.sides.enemy.hp / fight.sides.enemy.maxHp;
      }
    }
    if (fight.isBoss && !fight.over) {
      const lethal = Math.ceil(fight.pot * POT.skim) >= p.hp + p.shield;
      if (lethal) { f.lethalTurns++; f.lethalSeen = true; } else f.lethalSeen = false;
    }
  }
  f.turns = fight.turn; f.won = fight.winner === 'player'; f.hpAfter = p.hp;
  if (!f.won) f.burstDeath = (hpHist.at(-2) ?? f.hpBefore) / f.maxHp >= 0.5;
  return f;
}

export type Picker = (run: RunState, offers: DraftOption[], rng: Rng) => DraftOption;
export type ForkPicker = (run: RunState, rng: Rng) => number;
const best = (offers: DraftOption[], score: (o: DraftOption) => number) => offers.reduce((a, b) => (score(b) > score(a) ? b : a));

const SIMDANGER: Record<string, number> = { slime: 3, frost: 6, golem: 5, thief: 11, gremlin: 15, brute: 15 };
export const FORKS: Record<string, ForkPicker> = {
  sim: (run) => {
    const opts = run.paths[run.depth];
    const score = (i: number) => {
      const a = opts[i].archetype;
      const c = COUNTERS[a] && run.player.relics.includes(COUNTERS[a]!);
      const eb = opts[i].elite ? (run.player.hp / run.player.maxHp > 0.7 ? -4 : 3) : 0;
      return (SIMDANGER[a] ?? 8) * (c ? 0.4 : 1) * (opts[i].elite ? 1.25 : 1) + eb;
    };
    return opts.map((_, i) => i).reduce((b, i) => (score(i) < score(b) ? i : b), 0);
  },
  safe: (run) => Math.max(0, run.paths[run.depth].findIndex((e) => !e.elite)),
  elite: (run) => Math.max(0, run.paths[run.depth].findIndex((e) => !!e.elite)),
  random: (run, rng) => rng.int(run.paths[run.depth].length),
  eliteIfHealthy: (run) => (run.player.hp / run.player.maxHp >= 0.7 ? FORKS.elite(run, null as any) : FORKS.safe(run, null as any)),
};

const isWild = (o: DraftOption) => o.kind === 'swap' && o.to === 'wild';
export const POLICIES: Record<string, Picker> = {
  greedy: (run, o) => best(o, (x) => greedyValue(run, x)),
  random: (_r, o, rng) => rng.pick(o),
  hpFirst: (run, o) => best(o, (x) => (x.kind === 'heal' || x.kind === 'maxHp' ? 100 : 0) + greedyValue(run, x)),
  relicFirst: (run, o) => best(o, (x) => (x.kind === 'relic' ? 100 : 0) + greedyValue(run, x)),
  gildFirst: (run, o) => best(o, (x) => (x.kind === 'gild' ? 100 : 0) + greedyValue(run, x)),
  neverGild: (run, o) => best(o, (x) => (x.kind === 'gild' ? -100 : 0) + greedyValue(run, x)),
  wildFirst: (run, o) => best(o, (x) => (isWild(x) ? 100 : 0) + greedyValue(run, x)),
  neverWild: (run, o) => best(o, (x) => (isWild(x) ? -100 : 0) + greedyValue(run, x)),
  swapFirst: (run, o) => best(o, (x) => (x.kind === 'swap' && !isWild(x) ? 100 : 0) + greedyValue(run, x)),
  prepFirst: (run, o) => best(o, (x) => (x.kind === 'relic' && Object.values(COUNTERS).includes(x.relic) ? 100 : 0) + greedyValue(run, x)),
  neverPrep: (run, o) => best(o, (x) => (x.kind === 'relic' && Object.values(COUNTERS).includes(x.relic) ? -100 : 0) + greedyValue(run, x)),
  gildWildFirst: (run, o) => best(o, (x) => (x.kind === 'gild' || isWild(x) ? 100 : 0) + (x.kind === 'gild' && x.enh === 'gold' ? 5 : 0) + greedyValue(run, x)),
};

export interface RunOut { won: boolean; deathDepth: number; fights: FightFeel[]; relics: RelicId[]; picks: DraftOption[]; forks: { arch: string; elite: boolean }[]; hpIntoBoss: number; }

export function playRun(seed: number, picker: Picker, fork: ForkPicker, pickRng: Rng, fightRng: Rng, startAt?: RunState): RunOut {
  const run = startAt ?? createRun(BASE, seed);
  const out: RunOut = { won: false, deathDepth: -1, fights: [], relics: [], picks: [], forks: [], hpIntoBoss: -1 };
  while (!run.over) {
    if (needsChoice(run)) { chooseEnemy(run, fork(run, pickRng)); const e = run.enemies[run.depth]; out.forks.push({ arch: e.archetype, elite: !!e.elite }); }
    if (run.depth === RUN_FIGHTS) out.hpIntoBoss = run.player.hp / run.player.maxHp;
    const e = run.enemies[run.depth];
    const fight = new Fight(fightConfig(run, BASE), fightRng.int(0xffffffff));
    const depth = run.depth;
    out.fights.push(playFight(fight, e.archetype, depth, !!e.elite));
    finishFight(run, fight);
    if (run.over && !run.won) out.deathDepth = depth;
    if (!run.over) { const offers = draftOffers(run); const o = picker(run, offers, pickRng); out.picks.push(o); applyOption(run, o); }
  }
  out.won = run.won; out.relics = [...run.player.relics];
  return out;
}

export const cloneRun = (r: RunState): RunState => JSON.parse(JSON.stringify(r));
export function rollout(run: RunState, picker: Picker, fork: ForkPicker, n: number, rng: Rng): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (playRun(0, picker, fork, rng, rng, cloneRun(run)).won) w++;
  return w / n;
}

export const optType = (o: DraftOption): string =>
  o.kind === 'add' ? `+${o.count ?? 1}${o.symbol}` : o.kind === 'swap' ? `swap ${o.from}->${o.to}` : o.kind === 'clear' ? 'clear rocks' : o.kind === 'relic' ? (Object.values(COUNTERS).includes(o.relic) ? `prep:${o.relic}` : `relic:${o.relic}`) : o.kind === 'gild' ? `gild ${o.enh} ${o.symbol}` : o.kind;
export const optTypeReel = (o: DraftOption): string => optType(o) + ('reel' in o ? ` r${o.reel + 1}` : '');

export { createRun, draftOffers, applyOption, finishFight, fightConfig, needsChoice, chooseEnemy, stripStats, Fight, Rng, RUN_FIGHTS };
