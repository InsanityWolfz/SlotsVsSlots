// Iteration-6 playtest helpers: full 12-fight runs (act 1 + act 2) with pluggable policies and
// per-fight instrumentation for the act 2 mechanics. Reviewer scratch.
import { defaultConfig, type Enh, type RelicId } from '../../src/core/config';
import { CABINETS, CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { DANGER, RUN_FIGHTS } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { LEGENDARY } from '../../src/core/relics';
import { Rng } from '../../src/core/rng';
import {
  applyOption, buy, CHIPS, chooseEnemy, completesSet, createRun, draftOffers, finishFight, fightConfig, fullSets, isShopNow, leaveShop, needsChoice,
  shopOffers, takeLegend, takeSpoils, type DraftOption, type RunState, type ShopItem,
} from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';

export { Rng, CABINET_ORDER, CABINETS, LEGENDARY };
export type { CabinetId };
export const BASE = defaultConfig();

export interface FightRec {
  act: number; depth: number; arch: string; elite: boolean; boss: boolean; won: boolean;
  hpBefore: number; hpAfter: number; maxHp: number; turns: number; enemyHp: number;
  bombs: number; defused: number; blasts: number; blastHp: number; blastBlocked: number;
  hexes: number; hexedSpins: number; hexLoss: number;
  drainHp: number; enemyHeal: number; vampHeal: number; mimicHp: number; mimicHits: number; gulped: number;
  reflects: number[]; reflectHp: number; mirrorOwnHp: number; shatter: boolean;
  killer: string; phoenix: number; luckyWilds: number; spins: number; playerDmg: number; maxSpinDmg: number;
  chipsEarned: number; chipsEaten: number; relics: number; fullSets: number;
  /** Enemy HP-damage dealt by source category. */
  dmgBy: Record<string, number>;
}
export interface RunRec {
  cabinet: CabinetId; won: boolean; deathFight: number; fights: FightRec[]; legend: RelicId | null; legendOffer: RelicId[];
  relics: RelicId[]; gilds: Enh[]; act2Gilds: Enh[]; hpIntoMirror: number; hpIntoAct2: number; chipsAt: number[]; bought: string[]; setsAtMirror: Enh[];
}

type Picker = (run: RunState, offers: DraftOption[], rng: Rng) => DraftOption;
type ForkPicker = (run: RunState, rng: Rng) => number;
type Shopper = (run: RunState, rng: Rng) => void;
type LegendPicker = (run: RunState, offer: RelicId[], rng: Rng) => RelicId;

// ---- policies -----------------------------------------------------------------------
const COUNTER: Record<string, RelicId> = { frost: 'mittens', gremlin: 'lockpick', thief: 'mousetrap', golem: 'pickaxe' };
const BUILD_RELIC: Partial<Record<Enh, RelicId>> = { gold: 'midas', charged: 'rod', spiked: 'cactus', keen: 'hone' };
export const reelsWith = (run: RunState, enh: Enh) => new Set(run.player.gilded.filter((g) => g.enh === enh).map((g) => g.reel));
export function buildOf(run: RunState): Enh | null {
  const fav = CABINETS[run.cabinet].favors;
  if (fav) return fav;
  const c = new Map<Enh, number>();
  for (const g of run.player.gilded) c.set(g.enh, (c.get(g.enh) ?? 0) + 1);
  let best: Enh | null = null;
  for (const [e, n] of c) if (!best || n > c.get(best)!) best = e;
  return best;
}
const best = <T>(xs: T[], s: (x: T) => number) => xs.reduce((a, b) => (s(b) > s(a) ? b : a));
const growsSet = (run: RunState, o: DraftOption, b: Enh | null) => o.kind === 'gild' && !!b && o.enh === b && !reelsWith(run, b).has(o.reel);

export const DRAFTS: Record<string, Picker> = {
  greedy: (run, offers) => best(offers, (o) => greedyValue(run, o)),
  random: (_run, offers, rng) => rng.pick(offers),
  commit: (run, offers) => {
    const b = buildOf(run);
    return best(offers, (o) =>
      (completesSet(run, o) ? 200 : 0) + (growsSet(run, o, b) ? 120 : 0) + (o.kind === 'gild' && !b ? 100 : 0) +
      (o.kind === 'relic' && b && BUILD_RELIC[b] === o.relic ? 100 : 0) + (o.kind === 'relic' && LEGENDARY.has(o.relic) ? 60 : 0) + greedyValue(run, o));
  },
};
/** Act 2: chase one specific new gild (to value VAMP/LUCKY/BLAZE); otherwise commit. */
export function chaseDraft(enh: Enh): Picker {
  return (run, offers, rng) => {
    if (run.act > 1) {
      const hit = offers.find((o) => o.kind === 'gild' && o.enh === enh);
      if (hit) return hit;
    }
    return DRAFTS.commit(run, offers, rng);
  };
}

export const FORKS: Record<string, ForkPicker> = {
  greedy: (run) => {
    const opts = run.paths[run.depth];
    const score = (i: number) => {
      const a = opts[i].archetype;
      const countered = COUNTER[a] && run.player.relics.includes(COUNTER[a]);
      const eliteBonus = opts[i].elite ? (run.player.hp / run.player.maxHp > 0.7 ? -4 : 3) : 0;
      return (DANGER[a] ?? 8) * (countered ? 0.4 : 1) * (opts[i].elite ? 1.25 : 1) + eliteBonus;
    };
    return opts.map((_, i) => i).reduce((b, i) => (score(i) < score(b) ? i : b), 0);
  },
  random: (run, rng) => rng.int(run.paths[run.depth].length),
  safe: (run) => Math.max(0, run.paths[run.depth].findIndex((e) => !e.elite)),
  elite: (run) => Math.max(0, run.paths[run.depth].findIndex((e) => e.elite)),
};

function buyWhile(run: RunState, score: (it: ShopItem) => number, reserve = 0, min = 4.99) {
  const items = shopOffers(run);
  for (;;) {
    const c = items.filter((i) => !i.sold && run.player.chips - i.price >= reserve && score(i) > min).sort((a, b) => score(b) - score(a));
    if (!c.length) return;
    buy(run, c[0]);
  }
}
const hurt = (run: RunState, t = 0.7) => run.player.hp < run.player.maxHp * t;
export const SHOPS: Record<string, Shopper> = {
  /** Replica of simulateRun.shop (greedy). */
  greedy: (run) => {
    const items = shopOffers(run);
    const reserve = run.act === 1 && run.depth >= RUN_FIGHTS ? CHIPS.stackPer * 2 : 0;
    const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
    for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
  },
  random: (run, rng) => { for (const it of shopOffers(run)) if (rng.next() < 0.5) buy(run, it); },
  never: () => {},
  commit: (run) => {
    const b = buildOf(run);
    buyWhile(run, (i) => {
      const o = i.option;
      if (o.kind === 'heal') return hurt(run) ? 50 : -1;
      if (completesSet(run, o)) return 60;
      if (o.kind === 'relic' && LEGENDARY.has(o.relic)) return 40;
      if (growsSet(run, o, b)) return 30;
      if (o.kind === 'relic' && b && BUILD_RELIC[b] === o.relic) return 30;
      return o.kind === 'gild' ? -1 : greedyValue(run, o);
    });
  },
};

const LEG_VALUE: Record<string, number> = { ticket: 8, bell: 8, phoenix: 9, overcharge: 9.5, key: 9, sandglass: 8.5 };
export const LEGENDS: Record<string, LegendPicker> = {
  value: (_r, offer) => best(offer, (x) => LEG_VALUE[x] ?? 0),
  random: (_r, offer, rng) => rng.pick(offer),
};

export interface Policy { draft: string | Picker; fork: string; shop: string; legend: string | LegendPicker; forceLegend?: RelicId; hooks?: { preFight?: (run: RunState, fight: Fight) => void } }

// ---- instrumented play ----------------------------------------------------------------
function playFight(run: RunState, fight: Fight): FightRec {
  const e = run.enemies[run.depth];
  const r: FightRec = {
    act: run.act, depth: run.depth, arch: e.archetype, elite: !!e.elite, boss: e.isBoss, won: false, hpBefore: run.player.hp, hpAfter: 0,
    maxHp: run.player.maxHp, turns: 0, enemyHp: fight.sides.enemy.maxHp, bombs: 0, defused: 0, blasts: 0, blastHp: 0, blastBlocked: 0, hexes: 0, hexedSpins: 0, hexLoss: 0,
    drainHp: 0, enemyHeal: 0, vampHeal: 0, mimicHp: 0, mimicHits: 0, gulped: 0, reflects: [], reflectHp: 0, mirrorOwnHp: 0, shatter: false, killer: '',
    phoenix: 0, luckyWilds: 0, spins: 0, playerDmg: 0, maxSpinDmg: 0, chipsEarned: 0, chipsEaten: 0, relics: run.player.relics.length, fullSets: fight.fullSet.size, dmgBy: {},
  };
  let lastHurt = '';
  while (!fight.over && fight.turn < 2000) {
    const res = fight.step();
    let spinDmg = 0;
    for (const ev of res.events) {
      switch (ev.type) {
        case 'spin':
          if (ev.side === 'player') {
            r.spins++;
            if (ev.luckyWilds) r.luckyWilds += ev.luckyWilds.length;
            if (ev.hexed?.some(Boolean)) {
              r.hexedSpins++;
              for (const g of ev.score.groups) if (g.notes?.includes('HALF')) r.hexLoss += (g.base ?? 0) - g.amount; // approx (ignores gild loss)
            }
          }
          break;
        case 'attack':
        case 'specialFire':
          if (ev.from === 'player') { spinDmg += ev.amount; r.playerDmg += ev.hpDamage; }
          if (ev.to === 'player') {
            const cat = ev.type === 'specialFire' ? 'special' : ev.note === 'drain' ? 'drain' : ev.note === 'mimic' ? 'mimic' : ev.note === 'reflect' ? 'reflect' : ev.note === 'spiked' ? 'spiked' : 'sword';
            r.dmgBy[cat] = (r.dmgBy[cat] ?? 0) + ev.hpDamage;
            if (cat === 'drain') r.drainHp += ev.hpDamage;
            if (cat === 'mimic') { r.mimicHp += ev.hpDamage; r.mimicHits++; }
            if (cat === 'reflect') { r.reflects.push(ev.amount); r.reflectHp += ev.hpDamage; }
            if (r.boss && run.act === 2 && cat !== 'reflect') r.mirrorOwnHp += ev.hpDamage;
            if (ev.hpDamage > 0) lastHurt = cat;
          }
          break;
        case 'blast':
          if (ev.side === 'player') { r.blasts++; r.blastHp += ev.hpDamage; r.blastBlocked += ev.blocked; r.dmgBy.bomb = (r.dmgBy.bomb ?? 0) + ev.hpDamage; if (ev.hpDamage > 0) lastHurt = 'bomb'; }
          break;
        case 'potWin':
          if (ev.to === 'player') { r.dmgBy.pot = (r.dmgBy.pot ?? 0) + ev.hpDamage; if (ev.hpDamage > 0) lastHurt = 'pot'; }
          break;
        case 'bomb': r.bombs += ev.cells.length; break;
        case 'defuse': if (ev.side === 'player') r.defused += ev.cells.length; break;
        case 'hex': r.hexes++; break;
        case 'heal':
          if (ev.side === 'enemy') r.enemyHeal += ev.amount;
          if (ev.side === 'player' && ev.source === 'vamp') r.vampHeal += ev.amount;
          break;
        case 'gulp': r.gulped += ev.chips; break;
        case 'phoenix': r.phoenix++; break;
        case 'shatter': r.shatter = true; break;
      }
    }
    if (res.side === 'player') r.maxSpinDmg = Math.max(r.maxSpinDmg, spinDmg);
  }
  r.turns = fight.turn;
  r.won = fight.winner === 'player';
  r.hpAfter = fight.sides.player.hp;
  if (!r.won) r.killer = lastHurt;
  return r;
}

export function playRun(seed: number, cabinet: CabinetId, pol: Policy, rng: Rng, start?: RunState): RunRec {
  const run = start ?? createRun(BASE, seed, cabinet);
  const draft: Picker = typeof pol.draft === 'string' ? DRAFTS[pol.draft] : pol.draft;
  const fork = FORKS[pol.fork];
  const shop = SHOPS[pol.shop];
  const legendPick: LegendPicker = typeof pol.legend === 'string' ? LEGENDS[pol.legend] : pol.legend;
  const out: RunRec = { cabinet: run.cabinet, won: false, deathFight: -1, fights: [], legend: null, legendOffer: [], relics: [], gilds: [], act2Gilds: [], hpIntoMirror: -1, hpIntoAct2: -1, chipsAt: [], bought: [], setsAtMirror: [] };
  const gildsAtAct2: number[] = [];
  while (!run.over) {
    if (needsChoice(run)) chooseEnemy(run, fork(run, rng));
    if (run.act === 2 && run.depth === RUN_FIGHTS) { out.hpIntoMirror = run.player.hp / run.player.maxHp; out.setsAtMirror = [...fullSets(run.player.gilded, run.player.relics)]; }
    const fight = new Fight(fightConfig(run, BASE), rng.int(0xffffffff));
    pol.hooks?.preFight?.(run, fight);
    const fr = playFight(run, fight);
    const act = run.act;
    const rec = finishFight(run, fight);
    fr.chipsEarned = rec.chips ?? 0;
    fr.chipsEaten = rec.chipsEaten ?? 0;
    out.fights.push(fr);
    if (run.over && !run.won) out.deathFight = (act - 1) * 6 + fr.depth;
    if (run.over) break;
    if (run.pendingLegend) {
      out.hpIntoAct2 = 1;
      gildsAtAct2.push(run.player.gilded.length);
      let offer = run.pendingLegend;
      if (pol.forceLegend) offer = run.pendingLegend = (pol.forceLegend as string) === 'none' ? [] : [pol.forceLegend];
      out.legendOffer = [...offer];
      if (offer.length) { const l = legendPick(run, offer, rng); takeLegend(run, l); out.legend = l; }
      run.pendingLegend = null;
      if (isShopNow(run)) { out.chipsAt.push(run.player.chips); shop(run, rng); leaveShop(run); }
      continue;
    }
    if (run.pendingSpoils) {
      const sp = run.pendingSpoils;
      takeSpoils(run, best(sp, (x) => greedyValue(run, { kind: 'relic', relic: x }) + (LEGENDARY.has(x) ? 3 : 0)));
    }
    const offers = draftOffers(run);
    applyOption(run, draft(run, offers, rng));
    if (isShopNow(run)) {
      out.chipsAt.push(run.player.chips);
      const before = run.records.at(-1)?.bought?.length ?? 0;
      shop(run, rng);
      for (const b of (run.records.at(-1)?.bought ?? []).slice(before)) out.bought.push(b.kind === 'relic' ? b.relic : b.kind === 'gild' ? `gild:${b.enh}` : b.kind);
      leaveShop(run);
    }
  }
  out.won = run.won;
  out.relics = [...run.player.relics];
  out.gilds = run.player.gilded.map((g) => g.enh);
  out.act2Gilds = run.player.gilded.slice(gildsAtAct2[0] ?? run.player.gilded.length).map((g) => g.enh);
  return out;
}

export function batch(cabinet: CabinetId, pol: Policy, N: number, seed = 4242): RunRec[] {
  const seeds = new Rng(seed);
  const rng = new Rng(seed ^ 0x77);
  const out: RunRec[] = [];
  for (let i = 0; i < N; i++) out.push(playRun(seeds.int(0xffffffff), cabinet, pol, rng));
  return out;
}

export const cloneRun = (r: RunState): RunState => JSON.parse(JSON.stringify(r));
export const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
export const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
export const LABEL = (i: number) => (i === 5 ? 'HOUSE' : i === 11 ? 'MIRROR' : `${i < 6 ? 'A' : 'B'}${(i % 6) + 1}`);

export function summary(rs: RunRec[]): string {
  const N = rs.length;
  const d = Array(12).fill(0);
  rs.forEach((r) => r.deathFight >= 0 && d[r.deathFight]++);
  const act1 = rs.filter((r) => r.fights.some((f) => f.act === 2)).length;
  const mir = rs.filter((r) => r.hpIntoMirror >= 0);
  // per-attempt lethality
  const att = Array(12).fill(0);
  rs.forEach((r) => r.fights.forEach((f) => att[(f.act - 1) * 6 + f.depth]++));
  return `win ${pct(rs.filter((r) => r.won).length, N)}% act1 ${pct(act1, N)}% mirror ${pct(mir.filter((r) => r.won).length, mir.length)}% (hpIn ${(100 * avg(mir.map((r) => r.hpIntoMirror))).toFixed(0)}%)\n  lethality/attempt: ${d.map((x, i) => `${LABEL(i)} ${pct(x, att[i])}`).join(' ')}`;
}
