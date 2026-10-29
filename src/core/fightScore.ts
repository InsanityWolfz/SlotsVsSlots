/** Scoring a spin's payline: groups, Charms, relic boosts, OVERTIME (split from fight.ts, 2026-10-29). */
import { BLADES, type Enh, type GameConfig, type RelicId, type SymbolId } from './config';
import { charmValue, GLASS_BREAK, playerSymValue } from './charms';
import { BELL_MULT, BELL_MULT_JOKER, KEY_MULT, NEW_RELIC, LEGEND_RELIC } from './relics';
import { stakeOf } from './stakes';
import { overtimeMul, TUNE } from './enemies';
import { multFor, scoreLine, type LineScore, type ScoreGroup } from './scoring';
import type { Fight } from './fight';
import { MIDAS, PAY, VOLUME, RAIN, RAKE_CUT, DEALER_RULES, PAYING, OVERTIME_HITS, type Combatant, other } from './fightRules';

export function scoreSpin(f: Fight, me: Combatant, line: SymbolId[]): LineScore {
  const player = me.side === 'player';
  const joker = player && f.cabinet?.jokerWilds && line.includes('wild');
  const pairRule = me.relics.has('mirror') || joker ? 'anyTwo' : f.cfg.pairRule;
  const cfg = { ...f.cfg, pairRule } as GameConfig;
  // Your symbols are worth their level.
  const lv = player ? me.levels : undefined;
  // Enemy shields are worth less than yours (your damage is mostly swords now; only TESLA pierces).
  const value = (s: SymbolId) => (lv ? playerSymValue(lv, s, f.cfg.base[s]) : s === 'shield' && !player ? Math.round(f.cfg.base[s] * TUNE.enemyShield) : f.cfg.base[s]);
  // 3 WILDS: the bonus reel picks one of your symbols and the line pays its jackpot.
  const allWild = line.every((s) => s === 'wild');
  const pick = allWild ? f.wildPick(me) : undefined;
  const jackpots = player && me.armed && f.meter?.kind === 'jackpots';
  f.pickEnh.clear();
  let s = scoreLine(line, cfg, { value, wildAlone: pick?.symbol ?? f.wildAlone(me) });
  if (pick) {
    s.wildPick = pick.symbol;
    if (pick.enh) {
      s.wildPickEnh = pick.enh;
      line.forEach((_x, r) => f.pickEnh.set(r, pick.enh!));
    }
  }
  if (jackpots) {
    // JAX's payoff: each payline cell pays as a jackpot of itself (a WILD spins the wheel: a symbol and its charm).
    const picks: { reel: number; symbol: SymbolId; enh?: Enh }[] = [];
    const groups: ScoreGroup[] = line.map((raw, r) => {
      let symbol = raw;
      if (raw === 'wild') {
        const p = f.wildPick(me);
        symbol = p.symbol;
        picks.push({ reel: r, ...p });
        if (p.enh) f.pickEnh.set(r, p.enh);
      }
      const base = 3 * value(symbol);
      return { symbol, reels: [r], amount: base * multFor(3, cfg), base, mult: multFor(3, cfg), matched: true, jackpot: true };
    });
    const totals: Partial<Record<SymbolId, number>> = {};
    s = { line, tier: 'triple', tierSymbol: null, groups, totals, jackpots: true, ...(picks.length ? { picks } : {}) };
  }
  const fired = new Set<RelicId>();
  const has = (r: RelicId) => player && me.relics.has(r);
  const pays = (g: ScoreGroup) => g.base > 0 && (PAYING.has(g.symbol) || !!g.rain);
  const cellSym = (r: number) => me.reels[r].cells[me.reels[r].stop]?.symbol;
  const notesOf = new Map<ScoreGroup, string[]>();
  // PAY.additive: your MULT bonuses pool (each adds what it's worth over x1), applied once after them all.
  const pool = new Map<ScoreGroup, number>();
  const boost = (g: ScoreGroup, m: number) => {
    if ((PAY.additive || (PAY.lightningAdd && f.special && g.symbol === 'bolt')) && player) pool.set(g, (pool.get(g) ?? 0) + (m - 1));
    else g.mult *= m;
  };
  // MIDAS TOUCH: a full meter turns the swords and shields on this spin gold for the fight.
  const touchMeter = player && f.meter?.kind === 'touch';
  const touchable = (r: number) => {
    const c = me.reels[r].cells[me.reels[r].stop];
    return touchMeter && (line[r] === 'sword' || line[r] === 'shield') && !!c && c.symbol === line[r] && !c.slimed && !c.stolen;
  };
  if (touchMeter && me.armed && line.some((_x, r) => touchable(r))) {
    s.touched = f.midasTouch(me, line, touchable);
    s.raised = true;
  }
  // CASH CASSIDY: MAKE IT RAIN! A chip jackpot with enough chips held
  // hits for the chips in hand x2, counted before it costs them.
  if (player && f.meter?.kind === 'vault' && f.chipsNow() >= f.rainCost(me)) {
    const g = s.groups.find((x) => x.symbol === 'goldbar' && x.matched && x.reels.length >= 3);
    if (g) {
      g.rain = true;
      g.base = Math.round((RAIN.maxChips ? Math.min(RAIN.maxChips, f.chipsNow()) : f.chipsNow()) * RAIN.perChip);
    }
  }
  let vaultGroup: ScoreGroup | null = null;
  // CASH CASSIDY: a full HIGH ROLLER bar multiplies your first paying group (MAKE IT RAIN first, then swords), then
  // resets to its resting level.
  if (player && f.meter?.kind === 'vault' && me.armed) {
    // Your best paying group: swords first, then the biggest (never a lone shield if anything better paid).
    const g0 = s.groups.filter(pays).sort((a, b) => Number(!!b.rain) - Number(!!a.rain) || Number(f.isAttack(b.symbol)) - Number(f.isAttack(a.symbol)) || b.base * b.mult - a.base * a.mult)[0];
    if (g0) {
      // (This spin's shield, for ARMORED CAR: the shield groups' pay before the multiplier lands.)
      const lineShield = s.groups.filter((g) => g.symbol === 'shield').reduce((a, g) => a + g.base * g.mult, 0);
      const mul = f.vaultMul(lineShield);
      if (has('compound') && mul > MIDAS.maxMul) fired.add('compound');
      if (has('armoredcar') && lineShield >= NEW_RELIC.armoredShield) fired.add('armoredcar');
      boost(g0, mul);
      vaultGroup = g0;
      s.raised = true;
      f.vaultPaid = mul;
    }
  }
  const foe = f.sides[other(me.side)];
  // THE DROP: every note off the payline joins your biggest note group (or hits as a group of its own).
  f.dropOff = null;
  let dropGroup: ScoreGroup | null = null;
  let off: ReturnType<Fight['dropNotes']> | null = null;
  if (player && f.dropNow && f.meter?.kind === 'volume') {
    // Every note group on the payline joins the biggest (two lone notes are still one drop).
    const noteGroups = s.groups.filter((g) => g.symbol === 'note' && g.base > 0).sort((a, b) => b.reels.length - a.reels.length);
    dropGroup = noteGroups[0] ?? null;
    for (const g of noteGroups.slice(1)) {
      dropGroup!.base += g.base;
      dropGroup!.reels = [...dropGroup!.reels, ...g.reels].sort((a, b) => a - b);
      s.groups.splice(s.groups.indexOf(g), 1);
    }
    // A hexed payline reel halves the whole group, so the cells off it aren't halved twice.
    off = f.dropNotes(me, !!dropGroup?.reels.some((r) => me.hexed[r] > 0));
    if (!dropGroup && off.cells.length) {
      dropGroup = { symbol: 'note', reels: [], amount: 0, base: 0, mult: 1, matched: false };
      s.groups.push(dropGroup);
    }
    if (dropGroup) dropGroup.drop = true;
    // VAMP on the payline already heals with its group: the cells off it don't heal again.
    const paylineVamp = !!dropGroup?.reels.some((r) => f.enhsAt(me, r).includes('vamp'));
    f.dropOff = { cells: off.cells, vamp: paylineVamp ? 0 : off.vamp };
  }
  for (const g of s.groups) {
    const notes: string[] = [];
    notesOf.set(g, notes);
    if (g === vaultGroup) notes.push(`HIGH ROLLER X${f.vaultPaid}`);
    if (g.rain) notes.push('MAKE IT RAIN!');
    // A jackpot of one cell counts that cell's charm three times.
    const copies = g.jackpot && g.reels.length === 1 ? 3 : 1;
    let gold = 0;
    let anyGold = false;
    let anyGlass = false;
    for (const r of g.reels)
      for (const enh of f.enhsAt(me, r)) {
      const v = charmValue(enh, f.charmLvl(me, enh)) * copies;
      // KEEN adds to every sword in its group, and the group pierces.
      if (enh === 'keen' && BLADES.has(g.symbol)) {
        g.base += v * g.reels.length;
        g.pierce = true;
      }
      if (enh === 'charged' && g.symbol === 'bolt') g.base += v;
      if (enh === 'gold') {
        gold += v;
        anyGold = true;
      }
      // GLASS: adds in like GOLD; when its group pays, 1 in 4 it shatters (the cell loses it after this spin).
      if (enh === 'glass') {
        gold += v;
        anyGlass = true;
        if (pays(g) && f.rng.next() < GLASS_BREAK) f.glassBreaks.push(r);
      }
    }
    let echoes = g.reels.filter((r) => f.enhsAt(me, r).includes('echo')).length;
    let noteCells = g.reels.length;
    if (g === dropGroup && off) {
      g.base += off.base;
      echoes += off.echoes;
      noteCells += off.cells.length;
      if (off.keen) g.pierce = true;
      if (me.relics.has('subwoofer')) {
        if (!g.pierce && foe.shield > 0) fired.add('subwoofer');
        g.pierce = true;
      }
      if (off.cells.length) notes.push(`DROP +${off.cells.length}`);
    }
    // MIDAS TOUCH: each gold touch on a sword or shield counts as a gold charm.
    if (touchMeter && (g.symbol === 'sword' || g.symbol === 'shield'))
      for (const r of g.reels) if (touchable(r)) gold += (f.touches.get(me.reels[r].cells[me.reels[r].stop]) ?? 0) * charmValue('gold', f.charmLvl(me, 'gold')) * copies;
    // DECK DRUM (JAX): every paying spin this fight adds to EACH card (shown on the card's number).
    if (has('deckdrum') && BLADES.has(g.symbol) && f.drum > 0 && g.base > 0) {
      g.base += NEW_RELIC.deckdrumStep * f.drum * g.reels.length;
      fired.add('deckdrum');
    }
    // THE JUKEBOX: notes hit +25% per volume; at THE DROP an ECHO note hits again (HEADLINER: the drop hits x2);
    // HYPE MAN cuts notes off the drop.
    if (player && f.meter?.kind === 'volume' && g.symbol === 'note' && g.base > 0) {
      const vol = f.volume;
      if (vol > 0) {
        boost(g, 1 + VOLUME.perLevel * vol);
        notes.push(`VOL +${Math.round(VOLUME.perLevel * vol * 100)}%`);
      }
      if (f.dropNow) {
        if (echoes && noteCells) {
          const ev = charmValue('echo', f.charmLvl(me, 'echo'));
          boost(g, 1 + ((ev - 1) * echoes) / noteCells);
          notes.push('ECHO');
        }
      } else if (me.relics.has('hypeman')) g.mult *= VOLUME.hypePay;
    }
    // CRUSADE and HIGH CARD (legendary relics) on your groups.
    if (player && g.base > 0) {
      const crusade = f.cfg.player.swordBonus ?? 0;
      if (crusade && g.symbol === 'sword') {
        g.base += crusade * g.reels.length;
        notes.push(`CRUSADE +${crusade}`);
        if (has('crusade')) fired.add('crusade');
      }
      if (has('highcard') && PAYING.has(g.symbol) && g.matched) {
        fired.add('highcard');
        if (g.reels.length >= 3 || !!g.jackpot) {
          boost(g, LEGEND_RELIC.highCardMul);
          notes.push(`X${LEGEND_RELIC.highCardMul} HIGH CARD`);
        } else if (g.reels.length === 2) boost(g, LEGEND_RELIC.highCardPairMul);
      }
    }
    // GOLD charms in a group ADD (x2 + x2 + x2 = x6), then multiply with the double/jackpot.
    if (gold) {
      boost(g, gold);
      // (The climb names it: GOLD, GLASS, or both.)
      notes.push(`X${gold} ${anyGlass ? (anyGold ? 'GOLD+GLASS' : 'GLASS') : 'GOLD'}`);
    }
    const paying = pays(g);
    // Prism: a match that used a WILD pays double.
    if (me.relics.has('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) {
      fired.add('prism');
      boost(g, 2);
      notes.push('X2 PRISM');
    }
    // HORSESHOE: a group with a lucky-born wild.
    if (has('horseshoe') && paying && g.reels.some((r) => line[r] === 'wild' && cellSym(r) !== 'wild' && f.paylineEnh(me, r) === 'lucky')) {
      fired.add('horseshoe');
      boost(g, NEW_RELIC.horseshoeMul);
      notes.push(`X${NEW_RELIC.horseshoeMul} HORSESHOE`);
    }
    // Legendaries: Skeleton Key (doubles) and Jackpot Bell (jackpots).
    if (me.relics.has('key') && g.matched && g.reels.length === 2) {
      fired.add('key');
      boost(g, KEY_MULT);
      notes.push(`X${KEY_MULT} KEY`);
    }
    if (me.relics.has('bell') && g.matched && (g.reels.length === 3 || g.jackpot)) {
      fired.add('bell');
      const bell = f.meter?.kind === 'jackpots' ? BELL_MULT_JOKER : BELL_MULT;
      boost(g, bell);
      notes.push(`X${bell} BELL`);
    }
    if (player && f.hotStreak && g.matched) {
      fired.add('hotstreak');
      boost(g, 2);
      notes.push('HOT X2');
    }
    // GREATSWORD (KNIGHT): sword groups pay x1.5.
    if (has('greatsword') && g.symbol === 'sword' && g.base > 0) {
      fired.add('greatsword');
      boost(g, NEW_RELIC.greatswordMul);
      notes.push(`X${NEW_RELIC.greatswordMul} GREATSWORD`);
    }
    // COUP DE GRACE (KNIGHT, user 2026-10-13): swords pay x2 while your HP is higher than the enemy's. In the score,
    // so the climb and the banner show the real hit (it was doubled after them: feel playtest #2, MEGA WIN 264 that
    // killed a 340 HP enemy).
    if (has('coup') && g.symbol === 'sword' && g.base > 0 && me.hp > foe.hp) {
      fired.add('coup');
      boost(g, NEW_RELIC.coupBossMul);
      notes.push(`X${NEW_RELIC.coupBossMul} COUP`);
    }
    // UNDERDOG: under half HP, every paying group.
    if (has('underdog') && paying && me.hp < me.maxHp / 2) {
      fired.add('underdog');
      boost(g, NEW_RELIC.underdogMul);
      notes.push(`X${NEW_RELIC.underdogMul} UNDERDOG`);
    }
    // DRY SPELL: the stacks from dry spins on this pair or jackpot.
    if (has('dryspell') && f.drySpell > 0 && paying && g.matched && (g.reels.length >= 2 || !!g.jackpot)) {
      fired.add('dryspell');
      const k = 1 + NEW_RELIC.dryStep * f.drySpell;
      boost(g, k);
      notes.push(`X${Math.round(k * 100) / 100} DRY`);
    }
    // GOLDEN SPIN: everything pays x3.
    if (player && f.goldenNow && paying) {
      fired.add('goldenspin');
      boost(g, NEW_RELIC.goldenMul);
      notes.push(`X${NEW_RELIC.goldenMul} GOLDEN`);
    }
    // CERTIFIED HITMAKER: each drop this fight hits harder than the last.
    if (has('hitmaker') && f.dropNow && f.drops > 0 && g.symbol === 'note' && g.base > 0) {
      fired.add('hitmaker');
      const k = 1 + NEW_RELIC.hitmakerStep * f.drops;
      boost(g, k);
      notes.push(`X${Math.round(k * 100) / 100} HIT`);
    }
    // GLASS CANNON: every paying group pays x1.5.
    if (player && paying && f.cfg.player.payMul) {
      boost(g, f.cfg.player.payMul);
      notes.push(`X${f.cfg.player.payMul}`);
    }
    // VETERAN (KNIGHT, ENDLESS): every loop cleared, swords and shields pay more.
    if (player && paying && f.cfg.player.veteranMul) {
      boost(g, f.cfg.player.veteranMul);
      notes.push(`X${Math.round(f.cfg.player.veteranMul * 100) / 100} VETERAN`);
    }
    // TONIGHT'S RULE (ENDLESS), for both machines.
    const night = f.cfg.night;
    if (night === 'happy' && g.matched && (g.reels.length >= 3 || !!g.jackpot) && g.base > 0) {
      boost(g, 2);
      notes.push('X2 HAPPY HOUR');
    } else if (night === 'showdown' && paying && g.symbol !== 'shield') {
      boost(g, 1.5);
      notes.push('X1.5 SHOWDOWN');
    } else if (night === 'iron' && g.symbol === 'shield' && g.base > 0) {
      boost(g, 2);
      notes.push('X2 IRON NIGHT');
    }
    // OVERTIME: every group that hits, on both machines, a true multiplier (never pooled with TESLA's boosts).
    // Shields don't grow (a clock that grows defence can't break a shield stall), and nor do TESLA's bolts: they only
    // charge, and its strikes grow where they land (growing the charge grew every storm and its heals: TESLA GREEN
    // run win 57%, sim 2026-10-29).
    const ot = f.cfg.overtime ? overtimeMul(f.turn) : 1;
    if (ot > 1 && g.base > 0 && OVERTIME_HITS.has(g.symbol)) {
      g.mult *= ot;
      notes.push(`X${ot} OVERTIME`);
    }
    // Late in act 3 / an endless loop, enemy swords and sevens hit harder: on the banner, not a hidden multiplier.
    if (!player && (g.symbol === 'sword' || g.symbol === 'seven') && g.base > 0) {
      const all = f.enemyDmgMul();
      // An elite's x1.25 is its own note; endless loops and act 3's ramp are LATE.
      const elite = f.cfg.enemy.endless ? 1 : (f.cfg.enemy.dmgMul ?? 1);
      const stake = f.cfg.enemy.stakeDmg ?? 1;
      const line2 = f.cfg.enemy.lineDmg ?? 1;
      const late = all / elite / stake / line2;
      g.mult *= all;
      const raise = f.isDealer && f.dealerHand >= 2 ? DEALER_RULES.raiseMul : 1;
      if (elite !== 1) notes.push(`X${Math.round(elite * 100) / 100} ELITE`);
      if (stake !== 1) notes.push(`X${Math.round(stake * 100) / 100} ${stakeOf(f.cfg.stake ?? 0).name}`);
      if (line2 !== 1) notes.push(`X${Math.round(line2 * 100) / 100} 2ND LINE`);
      if (raise !== 1) notes.push(`X${raise} RAISE`);
      const rest = late / raise;
      if (Math.abs(rest - 1) > 1e-9) notes.push(`X${Math.round(rest * 100) / 100} LATE`);
    }
  }
  for (const g of s.groups) {
    const notes = notesOf.get(g)!;
    const bonus = pool.get(g) ?? 0;
    if (bonus) g.mult *= 1 + bonus;
    g.amount = Math.round(g.base * g.mult);
    // RAKE: the Croupier takes a cut of each group.
    if (me.raked > 0 && g.amount > 0) {
      const cut = Math.min(g.amount, RAKE_CUT);
      g.amount -= cut;
      g.cut = (g.cut ?? 0) + cut;
      notes.push(`-${cut} RAKE`);
    }
    // HEX: a group touching a hexed reel pays half.
    if (g.reels.some((r) => me.hexed[r] > 0) && g.amount > 0) {
      const cut = g.amount - Math.floor(g.amount / 2);
      g.amount -= cut;
      g.cut = (g.cut ?? 0) + cut;
      notes.push('HALF');
    }
    if (notes.length) g.notes = notes;
    // Twin Reels: a pair that only pays because any two reels count.
    if (me.relics.has('mirror') && g.matched && g.reels.length === 2 && !(g.reels[0] === 0 && g.reels[1] === 1)) fired.add('mirror');
    if (me.relics.has('ticket') && g.reels.some((r) => f.paylineEnh(me, r))) fired.add('ticket');
  }
  // PIT BOSS: the enemy's first jackpot each fight doesn't count: it pays nothing (user playtest: "as a pair" wasn't
  // worth taking).
  if (!player && s.tier === 'triple' && !f.pitUsed && f.sides.player.relics.has('pitboss')) {
    const g = s.groups.find((x) => x.matched && x.reels.length >= 3);
    if (g) {
      f.pitUsed = true;
      g.base = 0;
      g.amount = 0;
      g.notes = [...(g.notes ?? []), 'PIT BOSS'];
      s.tier = 'none';
      f.pitJustFired = true;
    }
  }
  if (fired.size) s.relics = [...fired];
  s.totals = {};
  for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
  return s;
}

