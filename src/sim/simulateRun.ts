/**
 * The headless run simulator (2026-10-07 rewrite, step 1): plays whole runs with the sim bot (bot.ts) and reports
 * what the official table needs (tools/sim/table.ts): win rates, pacing, jackpot rate, chips, boss-sizing power and
 * endless depth. Deterministic per seed: fights draw from their own per-run stream, so runs stay paired.
 */
import type { GameConfig } from '../core/config';
import type { CabinetId } from '../core/cabinets';
import { actLength } from '../core/enemies';
import { Fight } from '../core/fight';
import { Rng } from '../core/rng';
import {
  applyOption,
  chooseEnemy,
  createRun,
  draftOffers,
  finishFight,
  fightConfig,
  fightNumber,
  takeLegend,
  takeChoice,
  isShopNow,
  machinePower,
  needsChoice,
  takeSpoils,
  takeStart,
  type RunState,
  letItRide,
} from '../core/run';
import { CHOICE_LOG, choiceValue, greedyValue, pickEnemy, RELIC_VALUE, shop, SIM_BIAS, type DraftPolicy } from './bot';

export { CHOICE_LOG, choiceValue, greedyValue, SIM_BIAS, type DraftPolicy } from './bot';

export interface RunSummary {
  runs: number;
  winPct: number;
  /** % of runs that died at each fight across the run (index 5 = the House, 11 = THE WHEEL). */
  deathsAtDepth: number[];
  /** % of runs that beat the House (cleared act 1). */
  act1Pct: number;
  reachedWheelPct: number;
  wheelWinPct: number;
  avgHpIntoWheel: number;
  dealerWinPct: number;
  reachedDealerPct: number;
  /** Deaths per archetype / fights against that archetype. */
  killRate: Record<string, string>;
  avgTurnsPerFight: number;
  avgHpIntoBoss: number;
  reachedBossPct: number;
  bossWinPct: number;
  relicWin: Record<string, string>;
  avgRocksAtEnd: number;
  /** HP into the Dealer as a share of max HP. */
  hpIntoDealerPct: number;
  /** Act 3 regular fights: count, % deaths, average % of max HP lost, average turns. */
  act3Regular: { n: number; diePct: number; lostPct: number; turns: number };
  /** Average turns per fight by act (regular fights only). */
  turnsByAct: number[];
  /** % of your (non-bonus) spins that land a jackpot. */
  jackpotPct: number;
  /** Chips earned per fight won (wins, jackpots, overkill, charms). */
  chipsPerFight: number;
  /** Median measured machinePower going into THE WHEEL, act 3 regulars and the Dealer (what sizes them). */
  power: { wheel: number; act3: number; dealer: number };
  /** HP into the House and THE WHEEL, as a % of max HP. */
  hpIntoHousePct: number;
  hpIntoWheelPct: number;
  /** ENDLESS (SIM_BIAS.ride): loops cleared by each rider, sorted. */
  endlessLoops: number[];
  /** Average turns (both sides' spins) per boss fight, and the act 2 regulars' deaths per 100 runs. */
  bossTurns: { house: number; act2: number; dealer: number };
  act2RegularDeaths: number;
}

export function simulateRuns(base: GameConfig, runs: number, policy: DraftPolicy, seed = Rng.randomSeed(), cabinet: CabinetId = 'knight', stake = 0, act3 = false, setup?: (run: RunState) => void): RunSummary {
  const seeds = new Rng(seed);
  const pick = new Rng(seed ^ 0x5eed);
  let wins = 0;
  const deaths = Array(24).fill(0);
  let reachedDealer = 0;
  let dealerWins = 0;
  let act1 = 0;
  let reachedWheel = 0;
  let wheelHp = 0;
  let wheelWins = 0;
  const faced: Record<string, number> = {};
  const killed: Record<string, number> = {};
  let fights = 0;
  let turns = 0;
  let bossHp = 0;
  let reachedBoss = 0;
  let bossWins = 0;
  let rocks = 0;
  const relicRuns: Record<string, [number, number]> = {};
  let dealerHpFrac = 0;
  const a3 = { n: 0, die: 0, lost: 0, turns: 0 };
  const actTurns = [0, 0, 0, 0];
  const actFights = [0, 0, 0, 0];
  let spins = 0;
  let jackpots = 0;
  let chips = 0;
  let wonFights = 0;
  const pw = { wheel: [] as number[], act3: [] as number[], dealer: [] as number[] };
  let houseFrac = 0;
  let wheelFrac = 0;
  const loops: number[] = [];
  const bt = { house: [0, 0], act2: [0, 0], dealer: [0, 0] };
  let act2Deaths = 0;

  for (let i = 0; i < runs; i++) {
    const runSeed = seeds.int(0xffffffff);
    const run = createRun(base, runSeed, cabinet, stake, act3);
    // A CHALLENGE / WEEKLY set-up (tools/balance/challenges.ts).
    setup?.(run);
    if (SIM_BIAS.startRelic && !run.player.relics.includes(SIM_BIAS.startRelic)) run.player.relics.push(SIM_BIAS.startRelic);
    // The starting relic pick (off in probes that start with a relic, so they stay comparable).
    if (run.pendingStart?.length) {
      const st = run.pendingStart;
      if (!SIM_BIAS.noStart && !SIM_BIAS.startRelic) takeStart(run, policy === 'random' ? pick.pick(st) : st.reduce((a, b) => (RELIC_VALUE[b] > RELIC_VALUE[a] ? b : a)));
      run.pendingStart = null;
    }
    // Fights draw from their own per-run stream, so a change in one run never desyncs the next (paired ladders).
    const fightSeeds = new Rng((runSeed ^ 0x5f3759df) >>> 0);
    while (!run.over) {
      if (needsChoice(run)) chooseEnemy(run, pickEnemy(run, policy, pick));
      if (run.depth === actLength(3) && run.act === 3) {
        reachedDealer++;
        dealerHpFrac += run.player.hp / run.player.maxHp;
      }
      if (run.depth === actLength(1) && run.act === 1) {
        reachedBoss++;
        bossHp += run.player.hp;
        houseFrac += run.player.hp / run.player.maxHp;
      }
      if (run.depth === actLength(2) && run.act === 2) {
        reachedWheel++;
        wheelHp += run.player.hp;
        wheelFrac += run.player.hp / run.player.maxHp;
        pw.wheel.push(machinePower(run));
      }
      if (run.act === 3 && !run.endless) (run.depth < actLength(3) ? pw.act3 : pw.dealer).push(machinePower(run));
      SIM_BIAS.onFight?.(run);
      const arch = run.enemies[run.depth].archetype;
      faced[arch] = (faced[arch] ?? 0) + 1;
      const fight = new Fight(fightConfig(run, base), fightSeeds.int(0xffffffff));
      while (!fight.over && fight.turn < 2000)
        for (const e of fight.step().events)
          if (e.type === 'spin' && e.side === 'player' && !e.bonus) {
            spins++;
            if (e.score.tier === 'triple') jackpots++;
          }
      fights++;
      turns += fight.turn;
      const depth = fightNumber(run) - 1;
      const act = run.act;
      const regular = run.depth < actLength(act);
      const hpBefore = run.player.hp;
      const maxBefore = run.player.maxHp;
      if (regular) {
        actTurns[act] += fight.turn;
        actFights[act]++;
      }
      if (!regular && !run.endless) {
        const k = act === 1 ? bt.house : act === 2 ? bt.act2 : bt.dealer;
        k[0] += fight.turn;
        k[1]++;
      }
      if (regular && act === 2 && fight.winner !== 'player') act2Deaths++;
      if (regular && act === 3) {
        a3.n++;
        a3.turns += fight.turn;
        a3.lost += (hpBefore - Math.max(0, fight.sides.player.hp)) / maxBefore;
        if (fight.winner !== 'player') a3.die++;
      }
      const rec = finishFight(run, fight);
      if (fight.winner === 'player') {
        wonFights++;
        chips += rec.chips ?? 0;
      }
      // ENDLESS probe: LET IT RIDE after the Dealer (a busted endless run keeps its win).
      if (SIM_BIAS.ride && run.over && run.won && !run.endless) letItRide(run);
      if (run.endless && run.endless.loop > 50) run.over = true;
      if (run.over && !run.won) {
        deaths[depth]++;
        killed[arch] = (killed[arch] ?? 0) + 1;
      }
      if (act === 1 && run.act > act) {
        bossWins++;
        act1++;
      }
      if (run.act === 3 && act === 2) wheelWins++;
      else if (run.won && act === 2) wheelWins++;
      if (run.won && act === 3) dealerWins++;
      while (!run.over && run.pendingChoice?.length) {
        const cs = run.pendingChoice;
        const forced = cs.find((x) => x.id === SIM_BIAS.choice);
        const c = forced ?? (policy === 'random' ? pick.pick(cs) : cs.reduce((a, b) => (choiceValue(run, b) > choiceValue(run, a) ? b : a)));
        takeChoice(run, c);
        (run as RunState & { took?: string[] }).took = [...((run as RunState & { took?: string[] }).took ?? []), c.id];
      }
      if (!run.over && run.pendingLegend) {
        const lg = run.pendingLegend;
        if (lg.length) takeLegend(run, policy === 'random' ? pick.pick(lg) : lg.reduce((a, b) => (RELIC_VALUE[b] > RELIC_VALUE[a] ? b : a)));
        run.pendingLegend = null;
        if (isShopNow(run)) shop(run, policy, pick);
        continue;
      }
      if (!run.over && run.pendingSpoils) {
        const sp = run.pendingSpoils;
        takeSpoils(run, policy === 'random' ? pick.pick(sp) : sp.reduce((a, b) => (greedyValue(run, { kind: 'relic', relic: b }) > greedyValue(run, { kind: 'relic', relic: a }) ? b : a)));
      }
      if (!run.over) {
        const offers = draftOffers(run);
        const relic = offers.find((x) => x.kind === 'relic');
        const o =
          policy === 'random'
            ? pick.pick(offers)
            : policy === 'relic' && relic
              ? relic
              : offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a));
        applyOption(run, o);
        if (isShopNow(run)) shop(run, policy, pick);
      }
    }
    SIM_BIAS.onEnd?.(run);
    if (run.endless) loops.push(run.endless.loop - 1);
    if (run.won) wins++;
    for (const id of (run as RunState & { took?: string[] }).took ?? []) {
      const e = (CHOICE_LOG[id] ??= [0, 0]);
      e[0]++;
      if (run.won) e[1]++;
    }
    rocks += run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
    for (const r of run.player.relics) {
      const e = (relicRuns[r] ??= [0, 0]);
      e[0]++;
      if (run.won) e[1]++;
    }
  }

  const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}%` : '-');
  return {
    runs,
    winPct: (100 * wins) / runs,
    deathsAtDepth: deaths.map((d) => (100 * d) / runs),
    act1Pct: (100 * act1) / runs,
    reachedWheelPct: (100 * reachedWheel) / runs,
    wheelWinPct: reachedWheel ? (100 * wheelWins) / reachedWheel : 0,
    avgHpIntoWheel: reachedWheel ? wheelHp / reachedWheel : 0,
    dealerWinPct: reachedDealer ? (100 * dealerWins) / reachedDealer : 0,
    reachedDealerPct: (100 * reachedDealer) / runs,
    killRate: Object.fromEntries(Object.keys(faced).map((k) => [k, `${pct(killed[k] ?? 0, faced[k])} of ${faced[k]}`])),
    avgTurnsPerFight: turns / fights,
    avgHpIntoBoss: reachedBoss ? bossHp / reachedBoss : 0,
    reachedBossPct: (100 * reachedBoss) / runs,
    bossWinPct: reachedBoss ? (100 * bossWins) / reachedBoss : 0,
    relicWin: Object.fromEntries(Object.entries(relicRuns).map(([k, [n, w]]) => [k, `${pct(w, n)} win (${n} runs)`])),
    avgRocksAtEnd: rocks / runs,
    hpIntoDealerPct: reachedDealer ? (100 * dealerHpFrac) / reachedDealer : 0,
    act3Regular: { n: a3.n, diePct: a3.n ? (100 * a3.die) / a3.n : 0, lostPct: a3.n ? (100 * a3.lost) / a3.n : 0, turns: a3.n ? a3.turns / a3.n : 0 },
    turnsByAct: [1, 2, 3].map((a) => (actFights[a] ? actTurns[a] / actFights[a] : 0)),
    jackpotPct: spins ? (100 * jackpots) / spins : 0,
    chipsPerFight: wonFights ? chips / wonFights : 0,
    power: { wheel: median(pw.wheel), act3: median(pw.act3), dealer: median(pw.dealer) },
    hpIntoHousePct: reachedBoss ? (100 * houseFrac) / reachedBoss : 0,
    hpIntoWheelPct: reachedWheel ? (100 * wheelFrac) / reachedWheel : 0,
    endlessLoops: loops.sort((a, b) => a - b),
    bossTurns: { house: bt.house[1] ? bt.house[0] / bt.house[1] : 0, act2: bt.act2[1] ? bt.act2[0] / bt.act2[1] : 0, dealer: bt.dealer[1] ? bt.dealer[0] / bt.dealer[1] : 0 },
    act2RegularDeaths: (100 * act2Deaths) / runs,
  };
}

const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

export function formatRunSummary(s: RunSummary): string {
  return [
    `run win ${s.winPct.toFixed(1)}%  | ACT 1: reached House ${s.reachedBossPct.toFixed(0)}%  House win ${s.bossWinPct.toFixed(0)}%  hp in ${s.avgHpIntoBoss.toFixed(1)}  cleared ${s.act1Pct.toFixed(1)}%`,
    `ACT 2: reached Wheel ${s.reachedWheelPct.toFixed(0)}%  Wheel win ${s.wheelWinPct.toFixed(0)}%  hp in ${s.avgHpIntoWheel.toFixed(1)}${s.reachedDealerPct ? `  | ACT 3: reached Dealer ${s.reachedDealerPct.toFixed(0)}%  Dealer win ${s.dealerWinPct.toFixed(0)}%` : ''}`,
    `turns/fight ${s.avgTurnsPerFight.toFixed(1)}  rocks at end ${s.avgRocksAtEnd.toFixed(1)}`,
    `deaths by fight: ${s.deathsAtDepth.map((d, i) => `${i === 5 ? 'HOUSE' : i === 11 ? 'WHEEL' : i === 15 ? 'DEALER' : i < 6 ? `A${i + 1}` : i < 12 ? `B${i - 5}` : `C${i - 11}`} ${d.toFixed(0)}%`).filter((_, i) => i < 12 || s.reachedDealerPct > 0).join(' ')}`,
    `kill rate by enemy: ${Object.entries(s.killRate).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
    `relics: ${Object.entries(s.relicWin).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
  ].join('\n');
}
