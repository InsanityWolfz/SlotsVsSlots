import type { Enh, GameConfig, RelicId } from '../core/config';
import type { CabinetId } from '../core/cabinets';
import { actLength, DANGER } from '../core/enemies';
import { Fight } from '../core/fight';
import { Rng } from '../core/rng';
import {
  applyOption,
  buy,
  chooseEnemy,
  CHIPS,
  createRun,
  draftOffers,
  finishFight,
  fightConfig,
  fightNumber,
  takeLegend,
  takeChoice,
  type BigChoice,
  type BigChoiceId,
  isShopNow,
  leaveShop,
  needsChoice,
  shopOffers,
  takeSpoils,
  takeStart,
  type DraftOption,
  type RunState,
  letItRide,
  nextPot,
  bustPot,
} from '../core/run';

export type DraftPolicy = 'greedy' | 'random' | 'relic';

/** Balance probes (tools/balance/builds.ts): start with a relic, draft only one charm, or force a big choice. */
export const SIM_BIAS: { ride?: boolean; onEnd?: (run: RunState) => void; startRelic?: RelicId; noStart?: boolean; enh?: Enh; choice?: BigChoiceId; onFight?: (run: RunState) => void } = {};

const RELIC_VALUE: Record<RelicId, number> = {
  mirror: 10,
  battery: 9,
  fang: 9,
  crown: 8,
  clover: 7.5,
  bandage: 6,
  // Build relics are worth a lot more once you own the gild they amplify.
  midas: 4,
  rod: 4,
  cactus: 3,
  prism: 3,
  hone: 3,
  // Legendaries.
  ticket: 8,
  bell: 8,
  phoenix: 9,
  overcharge: 9.5,
  key: 9,
  sandglass: 8.5,
  chalice: 3,
  // Slot machine relics (only offered on their machine).
  drum: 8,
  chainmail: 8,
  vault: 8,
  decree: 8.5,
  rosehip: 9,
  graft: 5,
  faraday: 7,
  static: 8.5,
  capbells: 8.5,
  stacked: 8.5,
  kiss: 7.5,
  horseshoe: 8,
  underdog: 8,
  firstblood: 7.5,
  piggy: 5,
  trophy: 6,
  holywater: 6,
  bash: 5.5,
};
const BUILD: Partial<Record<RelicId, (run: RunState) => boolean>> = {
  rod: (r) => r.player.gilded.some((g) => g.enh === 'charged'),
  cactus: (r) => r.cabinet === 'thorn',
  chalice: (r) => r.player.gilded.some((g) => g.enh === 'vamp'),
  prism: (r) => r.player.strips.some((s) => (s.wild ?? 0) > 0),
};


/** A reasonable human-ish drafter, tuned against rollout values from playtest ITERATION_1. */
export function greedyValue(run: RunState, o: DraftOption): number {
  const p = run.player;
  switch (o.kind) {
    case 'relic': {
      if (BUILD[o.relic]?.(run)) return 10;
      return RELIC_VALUE[o.relic];
    }
    case 'heal':
      return (1 - p.hp / p.maxHp) * 14;
    case 'maxHp':
      return 3.5;
    case 'swap': {
      if (o.to === 'wild') return run.cabinet === 'joker' ? 8 : 6;
      // Shields are the weakest symbol, your signature symbol the strongest.
      const worth = (x: string) => (x === 'rock' ? -2 : x === 'shield' ? 0 : x === 'sword' ? 2 : 3);
      return worth(o.to) - worth(o.from) + (o.count >= 3 ? 6 : 4);
    }
    case 'gild':
      if (SIM_BIAS.enh) return o.enh === SIM_BIAS.enh ? 9.5 : 0;
      return { gold: 9, charged: 8.5, spiked: 0, keen: 6.5, vamp: 7, lucky: run.cabinet === 'joker' ? 8.5 : 7, blaze: 8 }[o.enh] + (p.gilded.some((g) => g.enh === o.enh) ? 0.5 : 0);
    case 'symLevel':
      return o.symbol === 'sword' ? 8 : o.symbol === 'shield' ? 5 : 7.5;
    case 'charmLevel':
      if (SIM_BIAS.enh) return o.enh === SIM_BIAS.enh ? 9.5 : 0;
      return Math.min(9.5, 6.5 + p.gilded.reduce((a, g) => a + (g.enh === o.enh ? g.n : 0), 0) / 2);
    case 'clear':
      return 3 + (p.strips[o.reel].rock ?? 0) * 2;
    case 'add':
      return o.symbol === 'sword' ? 3 : 4;
    case 'remove':
      return o.symbol === 'rock' ? 5 : o.symbol === 'shield' ? 3 : 0;
  }
}

/** Big choices: strong picks are worth more, but the costs bite when you're low or already built. */
export function choiceValue(run: RunState, c: BigChoice): number {
  const p = run.player;
  const hp = p.hp / p.maxHp;
  const charms = p.gilded.reduce((a, g) => a + g.n, 0);
  const gold = p.gilded.reduce((a, g) => a + (g.enh === 'gold' ? g.n : 0), 0);
  switch (c.id) {
    case 'armsRace':
      return 8 - (p.maxHp < 300 ? 2 : 0);
    case 'masterwork':
      return c.symbol === 'shield' ? 4 : 7;
    case 'whetstone':
      return c.symbol === 'shield' ? 4 : 6;
    case 'meltDown':
      return 4 + (charms - gold) * 0.5;
    case 'gildLot':
      return 8;
    case 'polish':
      return 5 + Math.min(3, charms / 3);
    case 'cleanCut':
      return 6.5;
    case 'twinReel':
      return 5;
    case 'sweepUp':
      return 3 + (1 - hp) * 4 + p.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
    case 'glassCannon':
      return 7;
    case 'bloodPact':
      return 6.5;
    case 'secondWind':
      return 4 + (1 - hp) * 6;
    case 'cashOut': {
      // Cash out when riding is worth less than the pot in hand: p(clear) x the grown pot + p(bust) x a third
      // (HP proxies p(clear); later loops are harder).
      const L = run.endless?.loop ?? 1;
      const pot = run.endless?.pot ?? 0;
      const pClear = (run.player.hp / run.player.maxHp) * Math.pow(0.8, L - 1);
      return pClear * nextPot(pot) + (1 - pClear) * bustPot(pot) < pot ? 2 : -1;
    }
    case 'ride':
      return 1;
    case 'edge':
      // Endless house edges: legendaries beat chips; the harsh edges cost more.
      return (c.reward === 'legend' ? 6 : 3) - (c.edge === 'frail' || c.edge === 'heal' ? 2 : c.edge === 'fast' ? 1 : 0);
  }
}
export const CHOICE_LOG: Record<string, [number, number]> = {};

function pickEnemy(run: RunState, policy: DraftPolicy, rng: Rng): number {
  const opts = run.paths[run.depth];
  if (policy === 'random') return rng.int(opts.length);
  const score = (i: number) => {
    const a = opts[i].archetype;
    // Elites are tougher but pay a relic: take them when healthy.
    const eliteBonus = opts[i].elite ? (run.player.hp / run.player.maxHp > 0.7 ? -4 : 3) : 0;
    return (DANGER[a] ?? 8) * (opts[i].elite ? 1.25 : 1) + eliteBonus;
  };
  return opts.map((_, i) => i).reduce((best, i) => (score(i) < score(best) ? i : best), 0);
}

/** Cashier policy: greedy buys the best value-per-chip items, keeping a reserve before the boss. */
function shop(run: RunState, policy: DraftPolicy, rng: Rng): void {
  const items = shopOffers(run);
  if (policy === 'random') {
    for (const it of items) if (rng.next() < 0.5) buy(run, it);
  } else {
    const reserve = run.depth >= actLength(run.act) ? CHIPS.stackPer * 2 : 0;
    const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
    for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
  }
  leaveShop(run);
}

export interface RunSummary {
  runs: number;
  winPct: number;
  /** % of runs that died at each fight across the run (index 5 = the House, 11 = the Mirror). */
  deathsAtDepth: number[];
  /** % of runs that beat the House (cleared act 1). */
  act1Pct: number;
  reachedMirrorPct: number;
  mirrorWinPct: number;
  avgHpIntoMirror: number;
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
}

export function simulateRuns(base: GameConfig, runs: number, policy: DraftPolicy, seed = Rng.randomSeed(), cabinet: CabinetId = 'knight', stake = 0, act3 = false): RunSummary {
  const seeds = new Rng(seed);
  const pick = new Rng(seed ^ 0x5eed);
  let wins = 0;
  const deaths = Array(24).fill(0);
  let reachedDealer = 0;
  let dealerWins = 0;
  let act1 = 0;
  let reachedMirror = 0;
  let mirrorHp = 0;
  let mirrorWins = 0;
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

  for (let i = 0; i < runs; i++) {
    const runSeed = seeds.int(0xffffffff);
    const run = createRun(base, runSeed, cabinet, stake, act3);
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
      }
      if (run.depth === actLength(2) && run.act === 2) {
        reachedMirror++;
        mirrorHp += run.player.hp;
      }
      SIM_BIAS.onFight?.(run);
      const arch = run.enemies[run.depth].archetype;
      faced[arch] = (faced[arch] ?? 0) + 1;
      const fight = new Fight(fightConfig(run, base), fightSeeds.int(0xffffffff));
      while (!fight.over && fight.turn < 2000) fight.step();
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
      if (regular && act === 3) {
        a3.n++;
        a3.turns += fight.turn;
        a3.lost += (hpBefore - Math.max(0, fight.sides.player.hp)) / maxBefore;
        if (fight.winner !== 'player') a3.die++;
      }
      finishFight(run, fight);
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
      if (run.act === 3 && act === 2) mirrorWins++;
      else if (run.won && act === 2) mirrorWins++;
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
    reachedMirrorPct: (100 * reachedMirror) / runs,
    mirrorWinPct: reachedMirror ? (100 * mirrorWins) / reachedMirror : 0,
    avgHpIntoMirror: reachedMirror ? mirrorHp / reachedMirror : 0,
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
  };
}

export function formatRunSummary(s: RunSummary): string {
  return [
    `run win ${s.winPct.toFixed(1)}%  | ACT 1: reached House ${s.reachedBossPct.toFixed(0)}%  House win ${s.bossWinPct.toFixed(0)}%  hp in ${s.avgHpIntoBoss.toFixed(1)}  cleared ${s.act1Pct.toFixed(1)}%`,
    `ACT 2: reached Mirror ${s.reachedMirrorPct.toFixed(0)}%  Mirror win ${s.mirrorWinPct.toFixed(0)}%  hp in ${s.avgHpIntoMirror.toFixed(1)}${s.reachedDealerPct ? `  | ACT 3: reached Dealer ${s.reachedDealerPct.toFixed(0)}%  Dealer win ${s.dealerWinPct.toFixed(0)}%` : ''}`,
    `turns/fight ${s.avgTurnsPerFight.toFixed(1)}  rocks at end ${s.avgRocksAtEnd.toFixed(1)}`,
    `deaths by fight: ${s.deathsAtDepth.map((d, i) => `${i === 5 ? 'HOUSE' : i === 11 ? 'MIRROR' : i === 15 ? 'DEALER' : i < 6 ? `A${i + 1}` : i < 12 ? `B${i - 5}` : `C${i - 11}`} ${d.toFixed(0)}%`).filter((_, i) => i < 12 || s.reachedDealerPct > 0).join(' ')}`,
    `kill rate by enemy: ${Object.entries(s.killRate).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
    `relics: ${Object.entries(s.relicWin).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
  ].join('\n');
}
