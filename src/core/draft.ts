/** The draft: charms on cells, the strip math, the reward cards and their labels (split from run.ts, 2026-11-05). */
import { BLADES, symLabel, emptyLevels, type Enh, type GameConfig, type Gild, type Levels, type RelicId, type StripCounts, type SymbolId } from './config';
import { BELL_MULT, CONTENT_1107, KEY_MULT, relicText, RELICS } from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { CHARM_SYMBOLS, charmLevel, charmRuleText, charmShortText, charmTag, charmValue, playerSymValue, symLevel, symValue, charmName } from './charms';
import { Rng } from './rng';
import { scoreLine } from './scoring';
import { ACT2_GILDS, cloneLevels, gildsFor, passedThisAct, passOn, RUN, sigSymbol, swappable, wildFrom, type DraftOption, type RunPlayer, type RunState } from './run';
import { noHealing } from './fightSetup';

// ---- charms on cells -------------------------------------------------------------------

/** Charmed cells of `symbol` on `reel`. */
export const charmedCells = (p: RunPlayer, reel: number, symbol: SymbolId) => p.gilded.reduce((a, g) => a + (g.reel === reel && g.symbol === symbol ? g.n : 0), 0);
/** Plain (uncharmed) cells of `symbol` on `reel`: what a charm card can target. */
export const plainCells = (p: RunPlayer, reel: number, symbol: SymbolId) => Math.max(0, (p.strips[reel]?.[symbol] ?? 0) - charmedCells(p, reel, symbol));
/** Cells you own with this charm (any reel). */
export const charmCount = (p: RunPlayer, enh: Enh) => p.gilded.reduce((a, g) => a + (g.enh === enh ? g.n : 0), 0);

/** Add `n` charms of a kind to a (reel, symbol), merging with an entry you already have. */
function addCharms(p: RunPlayer, reel: number, symbol: SymbolId, enh: Enh, n: number): void {
  const k = Math.min(n, plainCells(p, reel, symbol));
  if (k <= 0) return;
  const own = p.gilded.find((g) => g.reel === reel && g.symbol === symbol && g.enh === enh);
  if (own) own.n += k;
  else p.gilded.push({ reel, symbol, enh, n: k });
}

/** A charm lives on a cell: when cells leave a reel (swaps, removals), plain cells go first, then charmed ones. */
export function normalizeCharms(p: RunPlayer): void {
  for (let reel = 0; reel < p.strips.length; reel++)
    for (const symbol of new Set(p.gilded.filter((g) => g.reel === reel).map((g) => g.symbol))) {
      let over = charmedCells(p, reel, symbol) - (p.strips[reel][symbol] ?? 0);
      for (let i = p.gilded.length - 1; i >= 0 && over > 0; i--) {
        const g = p.gilded[i];
        if (g.reel !== reel || g.symbol !== symbol) continue;
        const k = Math.min(g.n, over);
        g.n -= k;
        over -= k;
      }
    }
  p.gilded = p.gilded.filter((g) => g.n > 0);
}

// ---- strip math (boss HP sizing and the sims) ---------------------------------------------

export interface StripStats {
  /** Expected per spin, before shields. */
  damage: number;
  /** Expected meter fill per spin (TESLA energy, MIDAS gold, JAX wilds). */
  meter: number;
  /** TESLA energy per spin (= meter for TESLA). */
  energy: number;
  shield: number;
  pairPct: number;
  jackpotPct: number;
  /** Spins per special on average. */
  spinsPerSpecial: number;
  /** VAMP healing per spin. */
  heal: number;
  /** BLAZE: extra damage on each special. */
  specialBonus: number;
  /** One payline cell paid as a jackpot of itself, on average (JAX's payoff). */
  jackpotDamage: number;
}

export function stripStats(
  strips: StripCounts[],
  base: GameConfig,
  relics: RelicId[] = [],
  gilded: Gild[] = [],
  damageCap = Infinity,
  levels: Levels = emptyLevels(),
  cabinet: CabinetId | null = null,
): StripStats {
  const cab = cabinet ? CABINETS[cabinet] : null;
  const ticket = relics.includes('ticket');
  const cv = (e: Enh) => charmValue(e, charmLevel(levels, e, ticket));
  const value = (s: SymbolId) => playerSymValue(levels, s, base.base[s]);
  // Each reel: [shown symbol, probability, the cell's own charm].
  const probs = strips.map((s, reel) => {
    const total = Object.values(s).reduce((a, n) => a + (n ?? 0), 0) || 1;
    const out: [SymbolId, number, Enh | undefined][] = [];
    for (const [sym, n] of Object.entries(s) as [SymbolId, number][]) {
      if (!n) continue;
      let plain = n;
      for (const g of gilded) {
        if (g.reel !== reel || g.symbol !== sym) continue;
        const k = Math.min(plain, g.n);
        plain -= k;
        const p = k / total;
        if (g.enh === 'lucky') {
          const c = cv('lucky') / 100;
          out.push([sym, p * (1 - c), g.enh], ['wild', p * c, g.enh]);
        } else out.push([sym, p, g.enh]);
      }
      if (plain > 0) out.push([sym, plain / total, undefined]);
    }
    return out;
  });
  const special = !cab || cab.meter?.kind === 'special';
  const alone: SymbolId = special ? 'bolt' : (cab?.attack ?? 'sword');
  const cfg = { ...base, pairRule: relics.includes('mirror') || cab?.jokerWilds ? ('anyTwo' as const) : base.pairRule };
  const out = { damage: 0, meter: 0, energy: 0, shield: 0, pairPct: 0, jackpotPct: 0, spinsPerSpecial: 0, heal: 0, specialBonus: 0, jackpotDamage: 0 };
  // BLAZE: every blaze cell you own adds to the special.
  out.specialBonus = gilded.reduce((a, g) => a + (g.enh === 'blaze' ? g.n : 0), 0) * cv('blaze');
  const meterSym = cab?.meter?.symbol;
  for (const [a, pa, ea] of probs[0])
    for (const [b, pb, eb] of probs[1])
      for (const [c, pc, ec] of probs[2]) {
        const p = pa * pb * pc;
        const line = [a, b, c];
        const enh = [ea, eb, ec];
        // (A 3-WILD line pays a jackpot of one of your symbols: counted as a sword jackpot here.)
        const sc = scoreLine(line, cfg, { value, wildAlone: alone });
        let dmg = 0;
        for (const g of sc.groups) {
          let gold = 0;
          for (const r of g.reels) {
            const e = enh[r];
            if (e === 'keen' && BLADES.has(g.symbol)) g.base += cv('keen');
            if (e === 'charged' && g.symbol === 'bolt') g.base += cv('charged');
            if (e === 'gold') gold += cv('gold');
            if (e === 'vamp' && BLADES.has(g.symbol)) out.heal += p * cv('vamp');
          }
          let mult = g.mult * (gold || 1);
          if (relics.includes('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) mult *= 2;
          if (relics.includes('key') && g.matched && g.reels.length === 2) mult *= KEY_MULT;
          if (relics.includes('bell') && g.matched && g.reels.length === 3) mult *= BELL_MULT;
          const amt = g.base * mult;
          if (BLADES.has(g.symbol)) dmg += amt;
          else if (g.symbol === 'shield') out.shield += p * amt;
          else if (g.symbol === 'bolt' && special) {
            out.energy += p * amt;
            out.meter += p * amt;
          } else if (g.symbol === meterSym) out.meter += p * amt;
        }
        if (cab?.meter?.kind === 'jackpots') out.meter += p * line.filter((s) => s === 'wild').length * (cab.meter.perWild ?? 0);
        out.damage += p * Math.min(damageCap, dmg);
        if (sc.tier === 'pair') out.pairPct += p * 100;
        if (sc.tier === 'triple') out.jackpotPct += p * 100;
      }
  // One payline cell as a jackpot of itself (swords only count as damage), averaged over the three reels.
  for (const reel of probs) for (const [s, p, e] of reel) if (BLADES.has(s) || s === 'wild') out.jackpotDamage += (p / 3) * 3 * (value(BLADES.has(s) ? s : (cab?.attack ?? 'sword')) + (e === 'keen' ? cv('keen') : 0)) * 3 * (e === 'gold' ? 3 * cv('gold') : 1);
  out.spinsPerSpecial = out.energy > 0 ? base.specialCost / out.energy : Infinity;
  return out;
}

// ---- drafting --------------------------------------------------------------------------

function keyOf(o: DraftOption): string {
  return JSON.stringify(o);
}

/** Cards that differ only by reel read as the same choice (ITERATION_8 G7). */
function similarKey(o: DraftOption): string {
  if (o.kind === 'gild') return `gild:${o.enh}:${o.symbol}`;
  if (o.kind === 'swap') return `swap:${o.from}:${o.to}`;
  if (o.kind === 'add') return `add:${o.symbol}`;
  if (o.kind === 'remove') return `cut:${o.symbol}`;
  return keyOf(o);
}

/** Relic drafts follow the act's 2nd and 4th won fights (a route with fewer fights gets fewer of these). */
/** The drafts after an act's 2nd and 4th won fights offer relics, unless that fight was an elite: its spoils were
 * already a relic pick, and two relic picks back to back made each relic feel small (feel playtest, 2026-10-15). */

/** Every CHARM card you could be offered: `n` charms on plain cells of one symbol on one reel. */
/** Symbols a charm can go on for this run. */
export function charmSymbols(_run: RunState, enh: Enh): SymbolId[] {
  return [...CHARM_SYMBOLS[enh]];
}

export function charmOptions(run: RunState, n: number, enhs: Enh[] = gildsFor(run)): DraftOption[] {
  const p = run.player;
  const out: DraftOption[] = [];
  for (const enh of enhs)
    for (const symbol of charmSymbols(run, enh))
      for (let reel = 0; reel < p.strips.length; reel++) if (plainCells(p, reel, symbol) >= n) out.push({ kind: 'gild', enh, symbol, reel, n });
  return out;
}

/** LEVEL cards you could be offered: your machine's symbols on your reels (no cap; Charms have no levels). */
export function levelOptions(run: RunState): DraftOption[] {
  const p = run.player;
  const owned = new Set(p.strips.flatMap((s) => Object.keys(s).filter((k) => (s[k as SymbolId] ?? 0) > 0)));
  return CABINETS[run.cabinet].symbols.filter((symbol) => owned.has(symbol)).map((symbol): DraftOption => ({ kind: 'symLevel', symbol }));
}

/** A reel's cells. */
export const reelCells = (s: StripCounts) => Object.values(s).reduce((a, n) => a + (n ?? 0), 0);

/** Every CUT card you could be offered: 1 of your machine's symbols off a reel, a plain cell only (never a charmed
 * one), and never taking a reel under CONTENT_1107.cutFloor cells (user, 2026-11-07). */
export function cutOptions(run: RunState): DraftOption[] {
  const p = run.player;
  const out: DraftOption[] = [];
  p.strips.forEach((s, reel) => {
    if (reelCells(s) <= CONTENT_1107.cutFloor) return;
    for (const symbol of CABINETS[run.cabinet].symbols) if (plainCells(p, reel, symbol) > 0) out.push({ kind: 'remove', symbol, reel });
  });
  return out;
}

/** Levels a symbol card gives: 1, or 2 with STAR CHART. */
export const levelStep = (run: RunState) => (run.player.relics.includes('starchart') ? 2 : 1);
/** Levels gained this run over the machine's starting levels (the Cashier's level price climbs with them). */
export function levelsGained(run: RunState): number {
  const start = CABINETS[run.cabinet].levels?.sym ?? {};
  return CABINETS[run.cabinet].symbols.reduce((a, s) => a + Math.max(0, symLevel(run.player.levels, s) - (start[s] ?? 1)), 0);
}

/**
 * Three reward cards after a won fight. Relic drafts (after fights 2 and 4) show 2 relics + 1
 * other, so relic-vs-relic is the choice; the rest are strip/HP decisions. Deterministic.
 */
export function draftOffers(run: RunState): DraftOption[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 1 + (run.act - 1) * 50, 0x9e3779b1)) >>> 0);
  const p = run.player;
  const out: DraftOption[] = [];
  // A card turned down this act isn't dealt again this act (2 SHIELDS TO SWORDS came up 5 times in two runs: expert
  // playtest 2026-11-06), unless nothing else fills the deal.
  const passed = passedThisAct(run);
  let strict = true;
  const push = (o: DraftOption | null) => {
    if (o && out.length < size && !(strict && passed.has(similarKey(o))) && !out.some((x) => keyOf(x) === keyOf(o) || similarKey(x) === similarKey(o))) out.push(o);
  };
  const size = RUN.draftSize;
  const sig = sigSymbol(run);

  const swapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const from of ['rock', 'shield'] as SymbolId[]) {
        const n = s[from] ?? 0;
        if (n <= 0 || (from === 'shield' && n < 2) || from === sig) continue;
        // Only plain cells convert: a swap never eats a charm you drafted (playtest 2026-10-31: 2 SHIELDS TO BOLTS
        // took a CHIP-charmed shield).
        const plain = plainCells(p, reel, from);
        if (plain <= 0) continue;
        options.push({ kind: 'swap', from, to: sig, count: Math.min(RUN.swapCount, plain), reel });
      }
    });
    // Rocks-to-something first when you're carrying junk.
    const rocky = options.filter((o) => o.kind === 'swap' && o.from === 'rock');
    return rocky.length && rng.next() < 0.6 ? rng.pick(rocky) : options.length ? rng.pick(options) : null;
  };
  const clearCard = (): DraftOption | null => {
    const rocky = p.strips.map((s, reel) => ({ reel, n: s.rock ?? 0 })).filter((x) => x.n > 0);
    if (!rocky.length) return null;
    rocky.sort((a, b) => b.n - a.n);
    return { kind: 'clear', symbol: 'rock', reel: rocky[0].reel };
  };
  const addCard = (): DraftOption => ({ kind: 'add', symbol: sig, reel: rng.int(3), count: RUN.addCount });
  /** CUT: 1 of your symbols off a reel (plain cells, never under the floor). */
  const cutCard = (): DraftOption | null => {
    const options = cutOptions(run);
    return options.length ? rng.pick(options) : null;
  };
  /** CHARM: N charms on plain cells of one symbol on one reel. */
  const gildCard = (): DraftOption | null => {
    const n = RUN.charmCells;
    const taken = (o: DraftOption) => out.some((x) => x.kind === 'gild' && o.kind === 'gild' && x.enh === o.enh && x.symbol === o.symbol);
    // PIVOT: when you own charms, often a charm TYPE you don't own yet (offers were too "fitted": EXPERT_PLAYTEST_2 C).
    const owned = new Set(p.gilded.map((g) => g.enh));
    const unowned = gildsFor(run).filter((e) => !owned.has(e));
    if (owned.size && unowned.length && rng.next() < RUN.pivotChance) {
      const fresh = charmOptions(run, n, [rng.pick(unowned)]).filter((o) => !taken(o));
      if (fresh.length) return rng.pick(fresh);
    }
    // EXTEND: sometimes more of a charm you already own (builds!).
    if (p.gilded.length && rng.next() < RUN.extendChance) {
      const own = charmOptions(run, n, [rng.pick(p.gilded).enh]).filter((o) => !taken(o));
      if (own.length) return rng.pick(own);
    }
    // Every Charm your machine can take is equally likely (2026-10-12, user: no machine leans to one Charm).
    const pool = gildsFor(run);
    // Act 2: the new charms show up half the time.
    const act2 = pool.filter((e) => ACT2_GILDS.includes(e));
    const base = pool.filter((e) => !ACT2_GILDS.includes(e));
    // (No Charm fits anything on your reels: no card, instead of a crash. Stress test 2026-11-02.)
    if (!act2.length && !base.length) return null;
    const enh = act2.length && (!base.length || rng.next() < 0.5) ? rng.pick(act2) : rng.pick(base);
    const options = charmOptions(run, n, [enh]).filter((o) => !taken(o));
    return options.length ? rng.pick(options) : null;
  };
  /** WILD: turn a shield (or rock) on a reel into a WILD. */
  const wildCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      if ((s.rock ?? 0) > 0) options.push({ kind: 'swap', from: 'rock', to: 'wild', count: Math.min(RUN.wildCount, s.rock ?? 0), reel });
      // Shields or your attack symbol to WILDS (user, content audit 2026-10-08: both directions).
      else
        for (const from of wildFrom(run))
          if (plainCells(p, reel, from) >= RUN.wildCount && (s[from] ?? 0) > RUN.wildCount) options.push({ kind: 'swap', from, to: 'wild', count: RUN.wildCount, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  /** SWAP, any direction: turn a few of one of your symbols into another (small counts). */
  const anySwapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    const syms = swappable(run);
    p.strips.forEach((s, reel) => {
      for (const from of syms)
        for (const to of syms) {
          if (from === to || (s[from] ?? 0) < RUN.anySwapCount + 1) continue;
          options.push({ kind: 'swap', from, to, count: RUN.anySwapCount, reel });
        }
    });
    return options.length ? rng.pick(options) : null;
  };

  // The draft only edits your reels: symbols in, out and across, WILDS and Charms (user, 2026-10-15: the draft and the
  // Cashier did the same job). Levels, relics and heals are the Cashier's.
  push(gildCard() ?? swapCard());
  const r = rng.next();
  // (CUT, user 2026-11-07: the second card's last 30%, after CLEAR ROCKS: about as often as a WILD card.)
  push((r < 0.35 ? wildCard() : r < 0.7 ? swapCard() : null) ?? clearCard() ?? cutCard() ?? gildCard() ?? addCard());
  push((rng.next() < 0.6 ? anySwapCard() : null) ?? gildCard() ?? addCard());
  let guard = 0;
  while (out.length < RUN.draftSize && guard++ < 30) push(guard % 3 === 0 ? addCard() : guard % 3 === 1 ? swapCard() : anySwapCard());
  strict = false;
  while (out.length < RUN.draftSize && guard++ < 60) push(guard % 3 === 0 ? addCard() : guard % 3 === 1 ? swapCard() : anySwapCard());
  return out;
}

/** Take a draft card: the other cards dealt with it are turned down for the rest of the act. */
export function takeDraft(run: RunState, o: DraftOption): void {
  const others = draftOffers(run).filter((x) => keyOf(x) !== keyOf(o));
  passOn(run, others.map(similarKey));
  applyOption(run, o);
}

export function applyOption(run: RunState, o: DraftOption, asPick = true): void {
  const p = run.player;
  switch (o.kind) {
    case 'add':
      p.strips[o.reel][o.symbol] = (p.strips[o.reel][o.symbol] ?? 0) + (o.count ?? 1);
      break;
    case 'swap': {
      const s = p.strips[o.reel];
      const n = Math.min(o.count, s[o.from] ?? 0);
      s[o.from] = (s[o.from] ?? 0) - n;
      s[o.to] = (s[o.to] ?? 0) + n;
      break;
    }
    case 'clear':
      // (A reel never ends up empty: an all-rock reel keeps one, stress test 2026-11-02.)
      p.strips[o.reel].rock = Object.entries(p.strips[o.reel]).some(([k, v]) => k !== 'rock' && (v ?? 0) > 0) ? 0 : 1;
      break;
    case 'relic':
      if (!p.relics.includes(o.relic)) p.relics.push(o.relic);
      break;
    case 'gild':
      addCharms(p, o.reel, o.symbol, o.enh, o.n);
      break;
    case 'symLevel':
      p.levels.sym[o.symbol] = symLevel(p.levels, o.symbol) + levelStep(run);
      break;
    case 'charmLevel':
      // (Charms have no levels now: an old save's charm level card does nothing.)
      break;
    case 'remove':
      // CUT: a plain cell only, and never under the floor (a stale card does nothing).
      if (plainCells(p, o.reel, o.symbol) > 0 && reelCells(p.strips[o.reel]) > CONTENT_1107.cutFloor) p.strips[o.reel][o.symbol] = (p.strips[o.reel][o.symbol] ?? 0) - 1;
      break;
    case 'heal':
      p.hp = Math.min(p.maxHp, p.hp + o.amount);
      break;
    case 'maxHp':
      p.maxHp += o.amount;
      // GLASS CANNON: no healing between fights, this card's heal included (audit 2026-11-01).
      if (!noHealing(run)) p.hp += o.amount;
      break;
  }
  // A charm lasts while its cell is on the reel.
  normalizeCharms(p);
  const last = run.records.at(-1);
  if (last && asPick) last.pick = o;
}

/** Strips after taking a card (for the before/after stat line). */
export function stripsAfter(run: RunState, o: DraftOption): StripCounts[] {
  const copy: RunState = {
    ...run,
    player: {
      ...run.player,
      strips: run.player.strips.map((s) => ({ ...s })),
      relics: [...run.player.relics],
      gilded: run.player.gilded.map((g) => ({ ...g })),
      levels: cloneLevels(run.player.levels),
      chips: run.player.chips,
    },
    records: [],
  };
  applyOption(copy, o);
  return copy.player.strips;
}

const plural = (s: SymbolId, n: number) => `${symLabel(s)}${n > 1 ? 'S' : ''}`;

export const charmRule = charmRuleText;
/** LV2, or MAX at the cap. */

/** A pick or buy already taken, for the run-over table and COPY RUN: a level card says +1 LEVEL (describeOption names
 * the NEXT level, which after the pick is one too high). */
export function takenLabel(o: DraftOption): string {
  if (o.kind === 'charmLevel') return `${charmName(o.enh)} CHARM +1 LEVEL`;
  if (o.kind === 'symLevel') return `${symLabel(o.symbol)} +1 LEVEL`;
  if (o.kind === 'remove') return `CUT 1 ${symLabel(o.symbol)} (REEL ${o.reel + 1})`;
  return describeOption(o).title;
}

/** A Charm card's full rule, for its detail box (audit 2026-11-01: the box showed the short face, so ONCE PER GROUP,
 * ON A WIN and FOR GOOD were never seen in a run). */
export function charmCardFull(o: Extract<DraftOption, { kind: 'gild' }>, run?: RunState): string {
  const ticket = !!run?.player.relics.includes('ticket');
  return `REEL ${o.reel + 1} ${plural(o.symbol, o.n)}: ${charmRuleText(o.enh, charmLevel(run?.player.levels, o.enh, ticket))}`;
}

export function describeOption(o: DraftOption, run?: RunState): { title: string; text: string } {
  const lv = run?.player.levels;
  const ticket = !!run?.player.relics.includes('ticket');
  switch (o.kind) {
    case 'add': {
      const n = o.count ?? 1;
      return { title: `+${n} ${plural(o.symbol, n)}`, text: `ADD ${n} ${plural(o.symbol, n)} TO REEL ${o.reel + 1}` };
    }
    case 'swap':
      return { title: `${o.count} ${plural(o.from, o.count)} TO ${plural(o.to, o.count)}`, text: `ON REEL ${o.reel + 1}` };
    case 'clear':
      return { title: 'CLEAR ROCKS', text: `REMOVE ROCKS ON REEL ${o.reel + 1}` };
    case 'relic':
      // (An old save's record can name a relic that was cut: its id stands in.)
      return RELICS[o.relic] ? { title: RELICS[o.relic].name, text: relicText(o.relic, run?.cabinet) } : { title: String(o.relic).toUpperCase(), text: '' };
    case 'heal':
      return { title: 'HEAL', text: `RESTORE ${o.amount} HP` };
    case 'maxHp':
      return { title: `+${o.amount} MAX HP`, text: run && noHealing(run) ? `GAIN ${o.amount} MAX HP` : `GAIN ${o.amount} MAX HP AND HEAL ${o.amount} HP` };
    case 'gild':
      return {
        title: `${o.n} ${charmName(o.enh)} CHARM${o.n > 1 ? 'S' : ''}`,
        text: `REEL ${o.reel + 1} ${plural(o.symbol, o.n)}: ${charmShortText(o.enh, charmLevel(lv, o.enh, ticket))}`,
      };
    case 'symLevel': {
      const now = symLevel(lv, o.symbol);
      const next = now + (run ? levelStep(run) : 1);
      // User, content audit 2026-10-08: level cards show the step, in the symbol's own currency.
      const word = o.symbol === 'shield' ? 'SHIELD' : o.symbol === 'bolt' ? 'LIGHTNING CHARGE' : 'DAMAGE';
      return { title: `${plural(o.symbol, 2)} LV${next}`, text: `${symValue(now)} -> ${symValue(next)} ${word}` };
    }
    case 'charmLevel':
      return { title: `${charmName(o.enh)} CHARM`, text: 'CHARMS HAVE NO LEVELS NOW' };
    case 'remove':
      return { title: 'CUT', text: `REMOVE 1 ${symLabel(o.symbol)} FROM REEL ${o.reel + 1}` };
  }
}

/** The tag a charm shows at your current level (e.g. X2, +5). */
export const charmTagFor = (run: RunState, enh: Enh) => charmTag(enh, charmLevel(run.player.levels, enh, run.player.relics.includes('ticket')));
