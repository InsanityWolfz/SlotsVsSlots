/** What enemies do to your machine: writers, statuses, abilities, THE WHEEL's bets, THE HOUSE's pot (split from fight.ts, 2026-10-29). */
import { UNIT, unitsRound, unitsUp, type AbilityDef, type Enh, type SymbolId } from './config';
import type { CombatEvent, LineCard } from './events';
import { BOMB, POT } from './relics';
import { STAKE } from './stakes';
import { ENDLESS, GATEKEEPER, OWNER_RULES, OWNER_TRICKS, TUNE, WHEEL_RULES } from './enemies';
import { type LineScore } from './scoring';
import { BONUS_SYMBOLS, cellValue, DEAD, effectiveSymbol, insertOffscreen, symbolValue, visibleCells, type CellRef } from './strip';
import type { Fight } from './fight';
import { MIDAS, MARK_DAMAGE, RAKE_CUT, PAIR_PAY, JACKPOT_PAY, allInRange, FAKE_TURNS, REEL_WRITES, FIZZLE_SINGLES, WRITER_ABILITIES, type Combatant, other, statusSize } from './fightRules';

// ---- writers: what an enemy does to your machine ------------------------------------

export function write(f: Fight, me: Combatant, foe: Combatant, sym: SymbolId, amount: number, reels: number[], events: CombatEvent[]): void {
  // HOLY WATER: the first cheat on your reels each fight washes off (singles that fizzle anyway don't use it).
  if (foe.side === 'player' && foe.relics.has('holywater') && !f.holyWater && REEL_WRITES.has(sym) && !(FIZZLE_SINGLES.has(sym) && amount < PAIR_PAY)) {
    f.holyWater = true;
    events.push({ type: 'relic', side: 'player', relic: 'holywater' });
    return f.fizzle(me, sym, reels, events);
  }
  switch (sym) {
    case 'slime':
      // One slimed cell per UNIT of slime pay (a double slimes 4, a jackpot 9).
      return applySlime(f, me, foe, Math.round(amount / UNIT), reels, events);
    case 'ice':
      // 1 reel × 1 turn, a double 2 × 2, a jackpot 2 × 3 (never all three reels).
      return applyStatus(f, me, foe, 'frozen', amount >= PAIR_PAY ? 2 : 1, amount >= JACKPOT_PAY ? 3 : amount >= PAIR_PAY ? 2 : 1, reels, events);
    case 'lock':
      // Jams bite hard (the reel scores nothing): single locks fizzle, doubles jam 1 reel,
      // jackpots 2, always for one turn.
      if (amount < PAIR_PAY) return f.fizzle(me, 'lock', reels, events);
      return applyStatus(f, me, foe, 'locked', amount >= JACKPOT_PAY ? 2 : 1, 1, reels, events);
    case 'claw':
      return steal(f, me, foe, statusSize(amount), reels, events);
    case 'rock':
      // Rocks are permanent for the run: single rocks fizzle, doubles add 1, jackpots 2.
      if (amount < PAIR_PAY) return f.fizzle(me, 'rock', reels, events);
      return junk(f, me, foe, amount >= JACKPOT_PAY ? 2 : 1, reels, events);
    case 'ball':
      // THE WHEEL's ball: a pair bets 1 more chip on you, a jackpot 2 (singles fizzle).
      if (amount < PAIR_PAY) return f.fizzle(me, sym, reels, events);
      return placeBets(f, me, foe, amount >= JACKPOT_PAY ? 2 : 1, events, true);
    case 'coin': {
      f.pot += amount;
      events.push({ type: 'pot', side: me.side, reels, amount, total: f.pot });
    }
      return;
    case 'bomb':
      // 1 bomb, a double 2, a jackpot 3.
      return plantBombs(f, me, foe, statusSize(amount), reels, events);
    case 'hex':
      // Single hexes fizzle; a double hexes 1 reel × 2 turns, a jackpot 2 × 2.
      if (amount < PAIR_PAY) return f.fizzle(me, 'hex', reels, events);
      return hex(f, me, foe, amount >= JACKPOT_PAY ? 2 : 1, 2, reels, events);
    case 'fangs': {
      // Drain: hurts you and heals the vampire by what got through.
      const dmg = (amount >= JACKPOT_PAY ? 7 : amount >= PAIR_PAY ? 4 : 2) * UNIT;
      const got = f.hit(me, foe, dmg, reels, events, false, 'drain');
      if (!f.over && got > 0) f.heal(me, got, 'drain', events);
      return;
    }
    case 'card':
      // Mark 1 / 2 / 3 of your visible cells.
      return markCells(f, me, foe, statusSize(amount), reels, events);
    case 'gavel':
      // Singles fizzle; a double confiscates 1 gild, a jackpot 2 (for the fight).
      if (amount < PAIR_PAY) return f.fizzle(me, 'gavel', reels, events);
      return confiscate(f, me, foe, amount >= JACKPOT_PAY ? 4 : 2, reels, events);
    case 'rake':
      // 1 turn, a double 2, a jackpot 3.
      return applyRake(f, me, foe, statusSize(amount), reels, events);
    case 'fake':
      // 1 cell, a double 2, a jackpot 3 (gilded cells, visible first), plain for 2 turns.
      return fakeGilds(f, me, foe, 2 * statusSize(amount), FAKE_TURNS, reels, events);
    case 'mimicSym': {
      // The Mimic copies your last spin's biggest group (half on a single, double on a jackpot).
      const best = f.last[foe.side].best;
      const dmg = Math.min(12 * UNIT, Math.max(UNIT, amount >= JACKPOT_PAY ? best * 2 : amount >= PAIR_PAY ? best : unitsUp(best / 2)));
      f.hit(me, foe, dmg, reels, events, false, 'mimic');
      return;
    }
  }
}

// ---- act 2 writers --------------------------------------------------------------------

/** Stick bombs on the foe's visible cells. Each burns a fuse on its owner's turns. */
export function plantBombs(f: Fight, me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
  const free = f.rng.shuffle(
    visibleCells(foe.reels).filter((ref) => {
      const c = foe.reels[ref.reel].cells[ref.index];
      // Never on the payline itself... unless the House cheats (BLACK stake).
      const cheat = f.isBoss && (f.cfg.stake ?? 0) >= STAKE.houseDirty;
      return !c.bomb && !c.stolen && !BONUS_SYMBOLS.has(c.symbol) && (cheat || ref.index !== foe.reels[ref.reel].stop);
    }),
  );
  // Never on the payline itself: it would look defused without being so.
  const cells = free.slice(0, count);
  for (const ref of cells) foe.reels[ref.reel].cells[ref.index].bomb = BOMB.fuse;
  if (cells.length) events.push({ type: 'bomb', from: me.side, to: foe.side, reels, cells });
  else f.fizzle(me, 'bomb', reels, events);
}

// ---- act 3 writers --------------------------------------------------------------------

/** Mark visible cells as dead CARDs for the fight. */
export function markCells(f: Fight, me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
  const pool = f.rng.shuffle(
    visibleCells(foe.reels).filter((ref) => {
      const c = foe.reels[ref.reel].cells[ref.index];
      return !c.carded && !c.stolen && symbolValue(c.symbol) > 0;
    }),
  );
  pool.sort((a, b) => cellValue(foe.reels[b.reel].cells[b.index]) - cellValue(foe.reels[a.reel].cells[a.index]));
  // At most MARKS_PER_REEL marked cells per reel: the fight stays a duel (EXPERT_PLAYTEST_3 E4).
  const perReel = foe.reels.map((reel) => reel.cells.filter((c) => c.carded).length);
  const cells: CellRef[] = [];
  for (const ref of pool) {
    if (cells.length >= count) break;
    if (perReel[ref.reel] >= TUNE.marksPerReel) continue;
    perReel[ref.reel]++;
    cells.push(ref);
  }
  if (!cells.length) return f.fizzle(me, 'card', reels, events);
  for (const ref of cells) foe.reels[ref.reel].cells[ref.index].carded = true;
  if (me.side === 'enemy') f.marksPlaced += cells.length;
  events.push({ type: 'mark', from: me.side, to: foe.side, reels, cells });
}

/** Marked cards on your payline bite for MARK_DAMAGE each (shield blocks). */
export function markedCards(f: Fight, me: Combatant, events: CombatEvent[]): void {
  const cells: CellRef[] = [];
  me.reels.forEach((reel, r) => reel.cells[reel.stop]?.carded && cells.push({ reel: r, index: reel.stop }));
  if (!cells.length) return;
  const amount = MARK_DAMAGE * cells.length;
  const h = f.damage(me, amount, false);
  events.push({ type: 'markedHit', side: me.side, cells, amount, ...h });
  f.checkDeath(me, events);
}

/** The Pit Boss confiscates `count` charmed cells (visible ones first) for the fight. */
export function confiscate(f: Fight, me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
  const cells = charmedTargets(f, foe, count);
  if (!cells.length) return f.fizzle(me, 'gavel', reels, events);
  const enhs = new Set<Enh>();
  for (const ref of cells) {
    const c = foe.reels[ref.reel].cells[ref.index];
    enhs.add(c.enh!);
    c.confiscated = c.enh;
    delete c.enh;
  }
  events.push({ type: 'confiscate', from: me.side, to: foe.side, reels, cells, enhs: [...enhs] });
}

  /** THE REPO MAN: repossess your best cell (a charmed one first), up to GATEKEEPER.maxTakes a fight. */
export function repossess(f: Fight, me: Combatant, foe: Combatant, events: CombatEvent[]): void {
  if (f.repoTaken >= GATEKEEPER.maxTakes) return f.fizzle(me, 'gavel', [], events);
  f.repoTaken++;
  const at = events.length;
  // A charm for the fight (it comes back when the fight ends); nothing charmed, nothing to take.
  if (!charmedTargets(f, foe, 1).length) return f.fizzle(me, 'gavel', [], events);
  confiscate(f, me, foe, 1, [], events);
  // The presentation calls it what it is: REPOSSESSED, held until the act's boss falls.
  for (const e of events.slice(at)) if (e.type === 'confiscate' || e.type === 'steal') e.repo = true;
}

/** Charmed cells to target: visible first (gold first), then the rest of the strips. */
export function charmedTargets(f: Fight, foe: Combatant, count: number, skip: (c: { faked?: number }) => boolean = () => false): CellRef[] {
  const vis = new Set(visibleCells(foe.reels).map((r) => `${r.reel}:${r.index}`));
  const all: CellRef[] = [];
  foe.reels.forEach((reel, r) => reel.cells.forEach((c, i) => c.enh && !c.stolen && !skip(c) && all.push({ reel: r, index: i })));
  const gold = (x: CellRef) => (foe.reels[x.reel].cells[x.index].enh === 'gold' ? 1 : 0);
  const order = (xs: CellRef[]) => f.rng.shuffle(xs).sort((a, b) => gold(b) - gold(a));
  return [...order(all.filter((x) => vis.has(`${x.reel}:${x.index}`))), ...order(all.filter((x) => !vis.has(`${x.reel}:${x.index}`)))].slice(0, count);
}

/** The Croupier's rake: your groups pay RAKE_CUT less for `turns` of your turns. */
export function applyRake(_f: Fight, me: Combatant, foe: Combatant, turns: number, reels: number[], events: CombatEvent[]): void {
  foe.raked = Math.max(foe.raked, turns);
  events.push({ type: 'rake', from: me.side, to: foe.side, reels, turns: foe.raked, cut: RAKE_CUT });
}

// ---- the Dealer's cards ---------------------------------------------------------------

export function deal(f: Fight, me: Combatant, foe: Combatant, events: CombatEvent[]): void {
  const card = f.nextDeal;
  f.dealt = true;
  if (card === 'card') {
    // BUST: a card face-up over the payline of your best reel (the most value on its strip): it pays nothing next spin.
    const worth = foe.reels.map((reel) => reel.cells.reduce((a, c) => a + cellValue(c), 0));
    const reel = worth.indexOf(Math.max(...worth));
    const kind: LineCard = 'bust';
    f.lineCard = { reel, card: kind };
    events.push({ type: 'lineCard', side: foe.side, reel, card: kind });
  } else {
    f.dealerAllIn = true;
    events.push({ type: 'allInArmed', side: me.side, cap: allInRange(foe.maxHp, Infinity, f.cfg.enemy.loop ?? 0), floor: allInRange(foe.maxHp, 0, f.cfg.enemy.loop ?? 0) });
  }
  events.push({ type: 'dealNext', side: me.side, card: f.nextDeal });
}

/** Slap counterfeit coins over the foe's charmed cells (visible first): their charms go plain for `turns`. */
export function fakeGilds(f: Fight, me: Combatant, foe: Combatant, count: number, turns: number, reels: number[], events: CombatEvent[]): void {
  const cells = charmedTargets(f, foe, count, (c) => (c.faked ?? 0) > 0);
  if (!cells.length) return f.fizzle(me, 'fake', reels, events);
  for (const ref of cells) foe.reels[ref.reel].cells[ref.index].faked = turns;
  const enhs = [...new Set(cells.map((ref) => foe.reels[ref.reel].cells[ref.index].enh!))];
  events.push({ type: 'fake', from: me.side, to: foe.side, reels, cells, turns, enhs });
}

/** Counterfeit coins wear off after their owner's turns. */
export function tickFakes(_f: Fight, me: Combatant, events: CombatEvent[]): void {
  const cells: CellRef[] = [];
  const left: number[] = [];
  me.reels.forEach((reel, r) =>
    reel.cells.forEach((c, i) => {
      if (!c.faked || c.faked <= 0) return;
      c.faked -= 1;
      cells.push({ reel: r, index: i });
      left.push(c.faked);
      if (c.faked <= 0) delete c.faked;
    }),
  );
  if (cells.length) events.push({ type: 'fakeTick', side: me.side, cells, left });
}

/** Bombs that land on your payline are defused. */
export function defuse(_f: Fight, me: Combatant, events: CombatEvent[]): void {
  const cells: CellRef[] = [];
  me.reels.forEach((reel, r) => {
    const cell = reel.cells[reel.stop];
    if (cell.bomb) {
      delete cell.bomb;
      cells.push({ reel: r, index: reel.stop });
    }
  });
  if (cells.length) events.push({ type: 'defuse', side: me.side, cells });
}

/** At the end of your turn every bomb on your strips burns a turn; the ones at 0 go off (shield blocks). */
export function burnFuses(f: Fight, me: Combatant, events: CombatEvent[]): void {
  const live: CellRef[] = [];
  const fuses: number[] = [];
  const boom: CellRef[] = [];
  me.reels.forEach((reel, r) =>
    reel.cells.forEach((cell, i) => {
      if (!cell.bomb) return;
      cell.bomb -= 1;
      live.push({ reel: r, index: i });
      fuses.push(cell.bomb);
      if (cell.bomb <= 0) {
        delete cell.bomb;
        boom.push({ reel: r, index: i });
      }
    }),
  );
  if (!live.length) return;
  events.push({ type: 'fuse', side: me.side, cells: live, fuses });
  for (const cell of boom) {
    const h = f.damage(me, BOMB.damage, false);
    events.push({ type: 'blast', side: me.side, cell, amount: BOMB.damage, ...h });
    f.checkDeath(me, events);
    if (f.over) return;
  }
}

/** Hex the foe's most valuable reels (most gilded cells first): they pay half and gilds go dark. */
export function hex(f: Fight, me: Combatant, foe: Combatant, count: number, turns: number, reels: number[], events: CombatEvent[]): void {
  const worth = (r: number) => foe.reels[r].cells.filter((c) => c.enh).length * 10 + (foe.hexed[r] > 0 ? -100 : 0);
  const order = f.rng.shuffle(foe.reels.map((_, r) => r)).sort((a, b) => worth(b) - worth(a));
  const targets = order.slice(0, count).sort((a, b) => a - b);
  for (const r of targets) foe.hexed[r] = Math.max(foe.hexed[r], turns);
  events.push({ type: 'hex', from: me.side, to: foe.side, reels, targets, turns });
}

export function applySlime(f: Fight, me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
  const clean = visibleCells(foe.reels).filter((ref) => {
    const c = foe.reels[ref.reel].cells[ref.index];
    return !c.slimed && !c.stolen && !BONUS_SYMBOLS.has(c.symbol);
  });
  // Slime goes for gilded cells first.
  const gilded = f.rng.shuffle(clean.filter((ref) => foe.reels[ref.reel].cells[ref.index].enh));
  const plain = f.rng.shuffle(clean.filter((ref) => !foe.reels[ref.reel].cells[ref.index].enh));
  const cells: CellRef[] = [...gilded, ...plain].slice(0, amount);
  for (const ref of cells) foe.reels[ref.reel].cells[ref.index].slimed = true;
  events.push({ type: 'slime', from: me.side, to: foe.side, reels, amount, cells, wasted: amount - cells.length });
}

/**
 * Freeze/jam `count` of the foe's reels for `turns` of their turns.
 * Freeze: targets the reels showing the least useful payline symbol, first clunks each one
 * stop to its least useful visible cell, and never holds a reels 1+2 match (a frozen pair
 * would be a free double every turn). Jam: targets the most useful reels.
 */
export function applyStatus(f: Fight, me: Combatant, foe: Combatant, status: 'frozen' | 'locked', count: number, turns: number, reels: number[], events: CombatEvent[]): void {
  const ice = status === 'frozen';
  const arr = foe[status];
  const valueAt = (r: number, stop: number) => {
    const c = foe.reels[r].cells[stop];
    return symbolValue(effectiveSymbol(c)) + (c.enh && !c.slimed && !c.stolen ? 3 : 0);
  };
  // Thaw immunity covers your whole machine for the next enemy turn (one reel wasn't enough: EXPERT_PLAYTEST_4 C2).
  const order = f.rng.shuffle(foe.reels.map((_, r) => r)).filter(() => foe.side !== 'player' || f.thawShield.size === 0);
  order.sort((a, b) => (ice ? valueAt(a, foe.reels[a].stop) - valueAt(b, foe.reels[b].stop) : valueAt(b, foe.reels[b].stop) - valueAt(a, foe.reels[a].stop)));
  let targets = order.slice(0, count).sort((a, b) => a - b);

  if (!ice) {
    if (!targets.length) return;
    for (const r of targets) arr[r] = Math.max(arr[r], turns);
    events.push({ type: 'lock', from: me.side, to: foe.side, reels, targets, turns });
    return;
  }

  const len = (r: number) => foe.reels[r].cells.length;
  const sym = (r: number) => effectiveSymbol(foe.reels[r].cells[foe.reels[r].stop]);
  const clunk = (r: number, avoid: ReadonlySet<SymbolId> = new Set()) => {
    const reel = foe.reels[r];
    const options = [reel.stop, (reel.stop + len(r) - 1) % len(r), (reel.stop + 1) % len(r)].filter((st) => !BONUS_SYMBOLS.has(reel.cells[st].symbol));
    const ok = options.filter((st) => !avoid.has(effectiveSymbol(reel.cells[st])));
    const pool = ok.length ? ok : options;
    let best = pool[0];
    for (const st of pool) if (valueAt(r, st) < valueAt(r, best)) best = st;
    reel.stop = best;
  };
  // Never more than 2 reels frozen at once (freezes stack across turns).
  const alreadyFrozen = arr.filter((t, r) => t > 0 && !targets.includes(r)).length;
  targets = targets.slice(0, Math.max(0, 2 - alreadyFrozen));
  if (!targets.length) return;
  for (const r of targets) clunk(r);
  // No two frozen reels may show the same payline symbol — a frozen pair or triple would be a
  // free win every turn. Re-clunk a clashing target away from the others, or drop it.
  const frozenNow = () => foe.reels.map((_, r) => r).filter((r) => targets.includes(r) || arr[r] > 0);
  for (const r of [...targets]) {
    const others = frozenNow().filter((o) => o !== r);
    if (!others.some((o) => sym(o) === sym(r))) continue;
    clunk(r, new Set(others.map(sym)));
    if (others.some((o) => sym(o) === sym(r))) targets = targets.filter((t) => t !== r);
  }
  if (!targets.length) return;
  for (const r of targets) arr[r] = Math.max(arr[r], turns);
  events.push({ type: 'freeze', from: me.side, to: foe.side, reels, targets, turns, stops: targets.map((r) => foe.reels[r].stop) });
}

export function tickStatuses(f: Fight, me: Combatant, events: CombatEvent[]): void {
  for (const status of ['frozen', 'locked', 'hexed'] as const) {
    const ended: number[] = [];
    me[status].forEach((t, r) => {
      if (t <= 0) return;
      me[status][r] = t - 1;
      if (t - 1 === 0) ended.push(r);
    });
    if (ended.length) events.push({ type: 'thaw', side: me.side, reels: ended, status });
    if (me.side === 'player' && status !== 'hexed') for (const r of ended) f.thawShield.add(r);
  }
  if (me.raked > 0) {
    me.raked -= 1;
    if (me.raked === 0) events.push({ type: 'thaw', side: me.side, reels: [], status: 'raked' });
  }
}

export function steal(f: Fight, me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
  const pool = f.rng.shuffle(
    visibleCells(foe.reels).filter((ref) => {
      const c = foe.reels[ref.reel].cells[ref.index];
      return !c.stolen && !c.slimed && symbolValue(c.symbol) > 0;
    }),
  );
  pool.sort((a, b) => cellValue(foe.reels[b.reel].cells[b.index]) - cellValue(foe.reels[a.reel].cells[a.index]));
  const cells = pool.slice(0, amount);
  const symbols = cells.map((ref) => foe.reels[ref.reel].cells[ref.index].symbol);
  for (const ref of cells) foe.reels[ref.reel].cells[ref.index].stolen = true;
  events.push({ type: 'steal', from: me.side, to: foe.side, reels, cells, symbols, wasted: amount - cells.length });
}

export function junk(f: Fight, me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
  const inserts: CellRef[] = [];
  // A jackpot of rocks shouldn't bury a strip outright: cap per fight via strip length.
  const n = Math.min(amount, 6);
  for (let i = 0; i < n; i++) {
    const candidates = foe.reels.map((r, idx) => ({ r, idx })).filter(({ r }) => r.cells.length < 24);
    if (!candidates.length) break;
    const { r, idx } = f.rng.pick(candidates);
    const index = insertOffscreen(r, { symbol: 'rock', slimed: false }, f.rng);
    inserts.push({ reel: idx, index });
  }
  events.push({ type: 'junk', from: me.side, to: foe.side, reels, inserts });
}

/** Every stolen cell on your strips comes back. */
export function recover(_f: Fight, me: Combatant, events: CombatEvent[]): void {
  const cells: CellRef[] = [];
  me.reels.forEach((reel, r) =>
    reel.cells.forEach((cell, i) => {
      if (!cell.stolen) return;
      delete cell.stolen;
      cells.push({ reel: r, index: i });
    }),
  );
  events.push({ type: 'recover', side: me.side, cells });
}

export function cleanse(_f: Fight, me: Combatant, reels: number[], events: CombatEvent[], onlyThese = false): void {
  const cells: CellRef[] = [];
  me.reels.forEach((reel, r) =>
    reel.cells.forEach((cell, i) => {
      if (!cell.slimed || (onlyThese && !reels.includes(r))) return;
      cell.slimed = false;
      cells.push({ reel: r, index: i });
    }),
  );
  events.push({ type: 'cleanse', side: me.side, reels, cells });
}

// ---- enemy ability (passive telegraph) ---------------------------------------------

export function chargeAbility(f: Fight, me: Combatant, events: CombatEvent[]): void {
  const ab = me.ability!;
  me.charge++;
  // THE WHEEL: PLACE YOUR BETS on its turns; NO MORE BETS when the countdown runs out (its last bets go down first).
  if (ab.kind === 'bets') {
    if (me.charge >= ab.every) {
      // Its last bets go down as the ball drops: those can't be swept (every machine feels the drop).
      if (WHEEL_RULES.betOnDrop) placeBets(f, me, f.sides[other(me.side)], f.fast ? WHEEL_RULES.fast : ab.power, events);
      me.charge = 0;
      events.push({ type: 'abilityCharge', side: me.side, charge: ab.every, every: ab.every, kind: ab.kind });
      events.push({ type: 'ability', side: me.side, kind: ab.kind, power: ab.power });
      noMoreBets(f, me, f.sides[other(me.side)], events);
      if (f.over) return;
    } else placeBets(f, me, f.sides[other(me.side)], f.fast ? WHEEL_RULES.fast : ab.power, events);
    events.push({ type: 'abilityCharge', side: me.side, charge: me.charge, every: ab.every, kind: ab.kind });
    return;
  }
  // THE HOUSE's LAST CALL: from turn POT.lastCall it skims every turn (no 30-turn House: BOSS_REDESIGN 2).
  if (ab.kind === 'jackpot' && f.isBoss && !f.cfg.enemy.endless && f.turn + 2 >= POT.lastCall) {
    if (!f.houseLastCall) {
      f.houseLastCall = true;
      events.push({ type: 'lastCall', side: me.side, house: true });
    }
    me.charge = Math.max(me.charge, ab.every);
  }
  if (ab.kind === 'jackpot' && me.charge >= ab.every) {
    me.charge = ab.every;
    f.cashPending = true;
    events.push({ type: 'abilityCharge', side: me.side, charge: ab.every, every: ab.every, kind: ab.kind });
    return;
  }
  if (me.charge >= ab.every) {
    me.charge = 0;
    events.push({ type: 'abilityCharge', side: me.side, charge: ab.every, every: ab.every, kind: shownKind(f, ab) });
    // The Hourglass slowed this one down.
    if (me.side === 'enemy' && f.sides.player.relics.has('sandglass') && ab.kind !== 'deal') events.push({ type: 'relic', side: 'player', relic: 'sandglass' });
    // THE OWNER: EVERY TRICK IN THE BOOK, the next trick each time (it's announced as that trick).
    const fire = ab.kind === 'owner' ? { ...ab, ...OWNER_TRICKS[f.ownerTricks++ % OWNER_TRICKS.length] } : ab;
    events.push({ type: 'ability', side: me.side, kind: fire.kind, power: fire.power });
    fireAbility(f, me, fire, events);
    if (f.over) return;
  }
  events.push({ type: 'abilityCharge', side: me.side, charge: me.charge, every: ab.every, kind: shownKind(f, ab) });
}

/** The ability as its HUD shows it: THE OWNER's is his next trick (THE HAMMER is telegraphed this way). */
export function shownKind(f: Fight, ab: AbilityDef): AbilityDef['kind'] {
  return ab.kind === 'owner' ? OWNER_TRICKS[f.ownerTricks % OWNER_TRICKS.length].kind : ab.kind;
}

export function fireAbility(f: Fight, me: Combatant, ab: AbilityDef, events: CombatEvent[]): void {
  const foe = f.sides[other(me.side)];
  if (foe.side === 'player' && foe.relics.has('holywater') && !f.holyWater && WRITER_ABILITIES.has(ab.kind)) {
    f.holyWater = true;
    events.push({ type: 'relic', side: 'player', relic: 'holywater' });
    return;
  }
  switch (ab.kind) {
    case 'flood':
      return applySlime(f, me, foe, ab.power, [], events);
    case 'smash':
      f.hit(me, foe, ab.power, [], events);
      return;
    case 'fortify':
      me.shield += ab.power;
      events.push({ type: 'shieldGain', side: me.side, reels: [], amount: ab.power, total: me.shield });
      return;
    case 'blizzard':
      return applyStatus(f, me, foe, 'frozen', ab.power, 2, [], events);
    case 'jam':
      return applyStatus(f, me, foe, 'locked', 1, ab.power, [], events);
    case 'pilfer':
      return steal(f, me, foe, ab.power, [], events);
    case 'quake':
      return junk(f, me, foe, ab.power, [], events);
    case 'jackpot':
      return cashPot(f, me, foe, events);
    case 'carpet':
      return plantBombs(f, me, foe, ab.power, [], events);
    case 'curse':
      return hex(f, me, foe, ab.power, 3, [], events);
    case 'bloodmoon':
      return f.heal(me, ab.power, 'ability', events);
    case 'gulp':
      f.chipsEaten += ab.power;
      events.push({ type: 'gulp', from: me.side, chips: ab.power });
      return;
    case 'mark':
      return markCells(f, me, foe, ab.power, [], events);
    case 'penalty':
      // AUDIT: confiscates two of your charmed cells, then hits.
      confiscate(f, me, foe, 2, [], events);
      if (!f.over) f.hit(me, foe, ab.power, [], events);
      return;
    case 'houseTake':
      return applyRake(f, me, foe, ab.power, [], events);
    case 'repo':
      return repossess(f, me, foe, events);
    case 'deal':
      return deal(f, me, foe, events);
    case 'hammer': {
      // THE OWNER's HAMMER: a share of your max HP, through shields (his phase raises it with his other hits).
      const amount = unitsRound(foe.maxHp * OWNER_RULES.hammer * (1 + OWNER_RULES.phaseDmg * f.ownerPhase));
      f.hit(me, foe, amount, [], events, true, undefined, true);
      return;
    }
    case 'launder':
      // Takes your chips and turns them into its HP (x3).
      f.chipsEaten += ab.power;
      events.push({ type: 'gulp', from: me.side, chips: ab.power });
      return f.heal(me, ab.power * 3 * UNIT, 'ability', events);
  }
}

// ---- THE WHEEL: PLACE YOUR BETS ---------------------------------------------------------

/** What one chip hits for at NO MORE BETS: a share of your max HP (never less than 1 unit). */

/** THE WHEEL drops `n` chips on your reels: different reels while it can (a reel holds WHEEL_RULES.maxPerReel). */
export function placeBets(f: Fight, me: Combatant, foe: Combatant, n: number, events: CombatEvent[], ball = false): void {
  const reels: number[] = [];
  for (let i = 0; i < n; i++) {
    const open = [0, 1, 2].filter((r) => f.bets[r] < WHEEL_RULES.maxPerReel);
    if (!open.length) break;
    const fresh = open.filter((r) => !reels.includes(r));
    const r = f.rng.pick(fresh.length ? fresh : open);
    f.bets[r]++;
    reels.push(r);
  }
  // Turns to NO MORE BETS once this turn ends (its ball writes land before the turn's charge: one more to count).
  const ab = me.ability;
  const left = ab ? Math.max(0, ab.every - me.charge - (ball ? 1 : 0)) : 0;
  events.push({ type: 'betPlaced', side: foe.side, reels, bets: [...f.bets], left, per: f.betPer(foe), ...(ball ? { ball } : {}) });
}

/** Your spin's pairs sweep the bets off their reels; a jackpot (THE DROP's lit notes count as reels) clears the table. */
export function sweepBets(f: Fight, me: Combatant, score: LineScore, events: CombatEvent[]): void {
  if (f.betTotal <= 0) return;
  // Dead symbols never sweep (rocks, slime, stolen cells...): only a live group does.
  const live = score.groups.filter((g) => !DEAD.has(g.symbol) && ((g.matched && (g.reels.length >= 2 || !!g.jackpot)) || (!!g.drop && g.amount > 0)));
  if (!live.length) return;
  const lit = new Set(live.flatMap((g) => [...g.reels, ...(g.drop && f.dropOff ? f.dropOff.cells.map((c) => c.reel) : [])]));
  const table = live.some((g) => (g.matched && g.reels.length >= 3) || !!g.jackpot) || lit.size >= 3;
  const reels = (table ? [0, 1, 2] : [...lit]).filter((r) => f.bets[r] > 0).sort();
  if (!reels.length) return;
  const chips = reels.reduce((a, r) => a + f.bets[r], 0);
  for (const r of reels) f.bets[r] = 0;
  events.push({ type: 'betSwept', side: me.side, reels, chips, bets: [...f.bets], table });
  // Every chip you sweep is yours (CASSIDY's land in his hand at once: HIGH ROLLER counts them).
  const got = chips * WHEEL_RULES.sweepChips;
  if (got > 0) {
    f.betChips += got;
    f.midasChips += got;
    events.push({ type: 'midasChips', side: me.side, amount: got, total: f.midasChips });
  }
}

/** NO MORE BETS: the ball drops. Every chip left on your reels hits for its share of your max HP (one shielded hit). */
export function noMoreBets(f: Fight, me: Combatant, foe: Combatant, events: CombatEvent[]): void {
  const chips = f.betTotal;
  const per = f.betPer(foe);
  const amount = Math.min(ENDLESS.clamp, chips * per);
  const h = f.damage(foe, amount, false);
  events.push({ type: 'noMoreBets', from: me.side, to: foe.side, chips, per, amount, ...h });
  if (WHEEL_RULES.clearOnDrop) for (let r = 0; r < 3; r++) f.bets[r] = 0;
  f.checkDeath(foe, events);
}

// ---- boss: the progressive pot ------------------------------------------------------

/** The House skims half the pot (rounded up) as damage (shield blocks); the rest keeps growing. */
export function cashPot(f: Fight, me: Combatant, foe: Combatant, events: CombatEvent[]): void {
  // It takes half the pot out of the pot; the endless loop's growth only multiplies the hit. (The boosted hit used to come
  // out of the pot too: from loop 4 that was more than the pot held, and the pot went negative: user playtest.)
  const taken = Math.min(f.pot, unitsUp(f.pot * POT.skim));
  f.pot -= taken;
  const amount = unitsUp(taken * (f.cfg.enemy.dmgMul ?? 1) * (f.cfg.enemy.endless ? ENDLESS.housePot : 1));
  // MIDAS's rival: the House skims his chips too (2 per cash-out).
  if (foe.side === 'player' && f.meter?.kind === 'vault') {
    const took = Math.min(MIDAS.houseSkim, (f.cfg.player.chipsHeld ?? 0) + f.midasChips);
    if (took > 0) {
      f.midasChips -= took;
      events.push({ type: 'midasChips', side: foe.side, amount: -took, total: f.midasChips });
    }
  }
  const h = f.damage(foe, amount, false);
  events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h, potLeft: f.pot });
  f.checkDeath(foe, events);
}

/** Any player jackpot steals the pot (a High Roller double steals half), ignoring shield. */
export function winPot(f: Fight, me: Combatant, events: CombatEvent[], share = 1): void {
  if (f.pot <= 0) return;
  const foe = f.sides[other(me.side)];
  const amount = unitsUp(f.pot * share);
  f.pot -= amount;
  const h = f.damage(foe, amount, true);
  events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h, potLeft: f.pot });
  f.checkDeath(foe, events);
}
