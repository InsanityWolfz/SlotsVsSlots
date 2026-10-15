/**
 * THE SIM (2026-10-12): plays one whole run with the sim bot (bot.ts) and returns a log of it. tools/sim/balance.ts
 * runs thousands of these in parallel and reports win rates against the targets in docs/GAME.md. Deterministic per
 * seed: fights draw from their own per-run stream, so a change in one run never desyncs another (paired ladders).
 */
import type { GameConfig, RelicId } from '../core/config';
import { CABINETS, type CabinetId } from '../core/cabinets';
import { Fight } from '../core/fight';
import type { CombatEvent } from '../core/events';
import { Rng } from '../core/rng';
import {
  applyOption,
  createRun,
  chooseRoute,
  currentStop,
  draftOffers,
  finishFight,
  fightConfig,
  isBossNext,
  isEncounterNow,
  isShopNow,
  letItRide,
  needsRoute,
  playEncounter,
  takeLegend,
  takeSpoils,
  takeStart,
  type RunState,
} from '../core/run';
import { greedyValue, pickEncounter, pickRoute, RELIC_VALUE, shop, SIM_BIAS, type DraftPolicy } from './bot';

export interface FightLog {
  act: number;
  kind: 'fight' | 'elite' | 'boss';
  archetype: string;
  /** Enemy max HP at the start. */
  hp: number;
  turns: number;
  won: boolean;
  /** Your HP going in and coming out, as a share of max HP. */
  hpIn: number;
  hpOut: number;
}

export interface RunLog {
  cabinet: CabinetId;
  stake: number;
  won: boolean;
  /** The act the run ended in (a win ends in the last act). */
  act: number;
  fights: FightLog[];
  relics: RelicId[];
  /** Charms owned at the end: type -> cells. */
  charms: Record<string, number>;
  /** Encounters: id, the choice taken, chips and HP before and after. */
  encounters: { id: string; choice: number; chips: number; hp: number }[];
  /** Elites taken / elites offered on the chosen routes' alternatives (route picks with an elite in them). */
  routes: { elites: number; options: number[] }[];
  /** ENDLESS: loops cleared when the bot lets it ride (only with `ride`). */
  loops?: number;
  chipsEnd: number;
}

export interface PlayOpts {
  policy?: DraftPolicy;
  act3?: boolean;
  /** LET IT RIDE after the Dealer, and log the loops cleared. */
  ride?: boolean;
  /** Changes made to the run before it starts (probes: a forced relic, a charm...). */
  setup?: (run: RunState) => void;
  /** A forced build for the bot (bot.ts SIM_BIAS.style). */
  style?: 'rush' | 'turtle';
  /** Called before every fight and once at the end (tools/sim/fuzz.ts checks invariants here). */
  onFight?: (run: RunState) => void;
  onEnd?: (run: RunState) => void;
  /** Every fight step's events (probes: where the damage comes from). */
  onEvents?: (events: CombatEvent[], run: RunState, fight: Fight) => void;
  /** HOLD (experiment): HOLDs a fight, played by holdPolicy. */
  holds?: number;
  /** THE SCORE RACE (sandbox): every fight is a race (its HOLDs played by holdPolicy). */
  race?: boolean;
}

/**
 * The bot's HOLD play: after a spin that paid a PAIR of your attack symbol (or shields at low HP), hold that pair for
 * a jackpot try, if the HOLDs cover it. A decent player's habit, not the best play.
 */
export function holdPolicy(fight: Fight, last: { line: string[]; tier: string; groups: { reels: number[]; matched: boolean; symbol: string }[] } | null, attack: string): void {
  // THE SCORE RACE: free an iced or jammed reel first (a HOLD does).
  if (fight.cfg.race)
    for (let r = 0; r < 3; r++)
      if (fight.holdsLeft - fight.held.filter(Boolean).length > 0 && (fight.sides.player.frozen[r] > 0 || fight.sides.player.locked[r] > 0)) fight.hold(r);
  if (!last || last.tier !== 'pair' || fight.holdsLeft < 2) return;
  const g = last.groups.find((x) => x.matched && x.reels.length === 2);
  if (!g) return;
  const lowHp = fight.sides.player.hp < fight.sides.player.maxHp * 0.35;
  if (g.symbol !== attack && !(lowHp && g.symbol === 'shield')) return;
  for (const r of g.reels) fight.hold(r);
}

/**
 * The bot's NUDGE / RESPIN play once its spin has landed: take the NUDGE that pays most (if it pays more), else RESPIN
 * the odd reel out of a pair. A decent player's habit, not the best play.
 */
export function landPolicy(fight: Fight): void {
  for (let guard = 0; guard < 4 && fight.landed; guard++) {
    const now = fight.previewPay(fight.landed);
    let bestReel = -1;
    let bestPay = now;
    if (fight.nudgesLeft > 0)
      for (let r = 0; r < 3; r++) {
        if (fight.sides.player.frozen[r] > 0) continue;
        const n = fight.sides.player.reels[r].cells.length;
        const stops = fight.landed.map((x, i) => (i === r ? (x - 1 + n) % n : x));
        const pay = fight.previewPay(stops);
        if (pay > bestPay) [bestReel, bestPay] = [r, pay];
      }
    if (bestReel >= 0) {
      fight.nudge(bestReel);
      continue;
    }
    if (fight.respinsLeft > 0) {
      const line = fight.sides.player.reels.map((reel, r) => reel.cells[fight.landed![r]].symbol);
      const odd = line[0] === line[1] && line[2] !== line[0] ? 2 : line[1] === line[2] && line[0] !== line[1] ? 0 : line[0] === line[2] && line[1] !== line[0] ? 1 : -1;
      if (odd >= 0 && fight.sides.player.frozen[odd] === 0) fight.respin(odd);
    }
    return;
  }
}

const best = <T>(xs: T[], v: (x: T) => number): T => xs.reduce((a, b) => (v(b) > v(a) ? b : a));

export function playRun(base: GameConfig, seed: number, cabinet: CabinetId, stake: number, opts: PlayOpts = {}): RunLog {
  const policy = opts.policy ?? 'greedy';
  SIM_BIAS.style = opts.style;
  const run = createRun(base, seed, cabinet, stake, opts.act3 ?? stake >= 2);
  if (opts.race) run.race = true;
  opts.setup?.(run);
  const pick = new Rng((seed ^ 0x5eed) >>> 0);
  const fightSeeds = new Rng((seed ^ 0x5f3759df) >>> 0);
  const log: RunLog = { cabinet, stake, won: false, act: 1, fights: [], relics: [], charms: {}, encounters: [], routes: [], chipsEnd: 0 };
  if (run.pendingStart?.length) {
    const st = run.pendingStart;
    takeStart(run, policy === 'random' ? pick.pick(st) : best(st, (r) => RELIC_VALUE[r] ?? 5));
    run.pendingStart = null;
  }
  for (let guard = 0; guard < 400 && !run.over; guard++) {
    walk(run, policy, pick, log);
    if (run.over) break;
    opts.onFight?.(run);
    const boss = isBossNext(run);
    const stop = currentStop(run);
    const cfg = fightConfig(run, base);
    if (opts.holds) cfg.player.holds = opts.holds;
    const fight = new Fight(cfg, fightSeeds.int(0xffffffff));
    const hpIn = run.player.hp / run.player.maxHp;
    const enemyHp = fight.sides.enemy.maxHp;
    const act = run.act;
    const arch = run.enemies[run.depth]?.archetype ?? '?';
    let lastSpin: Parameters<typeof holdPolicy>[1] = null;
    while (!fight.over && fight.turn < 2000) {
      if ((opts.holds || cfg.race) && fight.next === 'player') holdPolicy(fight, lastSpin, CABINETS[run.cabinet].attack);
      // THE SCORE RACE: the spin lands, the bot may NUDGE or RESPIN, then it scores.
      if (cfg.race && fight.next === 'player' && fight.land()) landPolicy(fight);
      const { events } = fight.step();
      for (const e of events) if (e.type === 'spin' && e.side === 'player') lastSpin = e.score;
      opts.onEvents?.(events, run, fight);
    }
    const won = fight.winner === 'player';
    log.fights.push({ act, kind: boss ? 'boss' : stop?.kind === 'elite' ? 'elite' : 'fight', archetype: arch, hp: enemyHp, turns: fight.turn, won, hpIn, hpOut: Math.max(0, fight.sides.player.hp) / run.player.maxHp });
    finishFight(run, fight);
    if (opts.ride && run.over && run.won && !run.endless) {
      log.won = true;
      log.act = act;
      letItRide(run);
    }
    if (run.endless && run.endless.loop > 30) run.over = true;
    if (!run.over && run.pendingLegend) {
      const lg = run.pendingLegend;
      if (lg.length) takeLegend(run, policy === 'random' ? pick.pick(lg) : best(lg, (r) => RELIC_VALUE[r] ?? 5));
      run.pendingLegend = null;
      continue;
    }
    if (!run.over && run.pendingSpoils) {
      const sp = run.pendingSpoils;
      takeSpoils(run, policy === 'random' ? pick.pick(sp) : best(sp, (r) => greedyValue(run, { kind: 'relic', relic: r })));
    }
    if (!run.over) {
      const offers = draftOffers(run);
      if (offers.length) applyOption(run, policy === 'random' ? pick.pick(offers) : best(offers, (o) => greedyValue(run, o)));
    }
  }
  if (!log.won) {
    log.won = run.won;
    log.act = run.act;
  }
  if (run.endless) log.loops = run.endless.loop - 1;
  log.relics = [...run.player.relics];
  for (const g of run.player.gilded) log.charms[g.enh] = (log.charms[g.enh] ?? 0) + g.n;
  log.chipsEnd = run.player.chips;
  opts.onEnd?.(run);
  return log;
}

/** Walk the map up to the next fight (bot.ts walkStops), logging the route picked and each encounter's net result. */
function walk(run: RunState, policy: DraftPolicy, rng: Rng, log: RunLog): void {
  let enc: RunLog['encounters'][number] | null = null;
  let at = '';
  for (let guard = 0; guard < 40 && !run.over; guard++) {
    if (needsRoute(run)) {
      const i = pickRoute(run, policy, rng);
      const elites = run.map.routes.map((r) => r.filter((s) => s.kind === 'elite').length);
      log.routes.push({ elites: elites[i], options: elites });
      chooseRoute(run, i);
    } else if (isShopNow(run)) shop(run, policy, rng);
    else if (isEncounterNow(run)) {
      const here = `${run.act}:${run.stop}`;
      if (here !== at) {
        at = here;
        enc = { id: currentStop(run)?.encounter ?? '?', choice: -1, chips: -run.player.chips, hp: -run.player.hp };
        log.encounters.push(enc);
      }
      const i = pickEncounter(run, policy, rng);
      if (enc!.choice < 0) enc!.choice = i;
      // (A chip bet, for the games that take one: a quarter of what you hold.)
      playEncounter(run, i, Math.max(1, Math.floor(run.player.chips / 4)));
      if (!isEncounterNow(run) || `${run.act}:${run.stop}` !== here) {
        enc!.chips += run.player.chips;
        enc!.hp += run.player.hp;
        at = '';
      }
    } else return;
  }
}
