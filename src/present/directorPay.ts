/** The spin's payoff on screen: the payline numbers, THE CLIMB, PAIR! / JACKPOT! / BIG WIN banners, the WILDS bonus reel and LUCKY WILDs (split from director.ts, 2026-11-05). */
import { defaultConfig, symLabel, type Enh, type SideId, type SymbolId } from '../core/config';
import { effectText, other, WHEEL_SYMBOLS, wheelCharm, WRITERS } from '../core/fight';
import type { LineScore, ScoreGroup, Tier } from '../core/scoring';
import { backOut, cubicIn, cubicOut, sineIn } from './ease';
import { Banner, Projectile, SymbolWheel } from './fx';
import { cellCenter, COLORS, MACHINE_H, MACHINE_TOP, reelWindow, W } from './layout';
import type { SpriteId } from '../render/sprites';
import { fmtNum, textWidth } from '../render/text';
import { charmLevel, charmTag, charmValue, CHARM_COLOR, playerSymValue } from '../core/charms';
import { DEAD } from '../core/strip';
import { ENH_SPRITE } from './reel';
import type { Director } from './director';

/** Base symbol values (the payline numbers). */
const BASE = defaultConfig().base;

/** Banners sit in the top gutter between the HUD panels, never over the reels. */
export const BANNER_Y = 172;
/** PAIR! / JACKPOT!: mid-machine, like BUST! and ALL IN (at BANNER_Y they covered both HP bars as the hit landed). */
const PAY_BANNER_Y = MACHINE_TOP + MACHINE_H / 2;
/** THE PAYOUT LADDER: a pay this share of the HP bar it lands on is a BIG WIN, this much a MEGA WIN. */
export const LADDER = { big: 0.3, mega: 0.65 };
const TIER_MUL = { pair: defaultConfig().pairMult, triple: defaultConfig().tripleMult };
/** One step of THE CLIMB: what it says and the running pay after it. */
interface ClimbStep {
  label: string;
  value: number;
}
/** An engine note as a multiplier step: "X1.5 DRY", "HOT X2", "HIGH ROLLER X2", "VOL +32%". Flat notes (+N, ECHO,
 * RAKE, HALF) aren't steps: their effect is already in the base or shows as the red cut. */
export function noteStep(n: string): { f: number; text: string } | null {
  let m = /^X(\d+(?:\.\d+)?)\s*(.*)$/.exec(n);
  if (m) return { f: Number(m[1]), text: `×${m[1]}${m[2] ? ` ${m[2]}` : ''}` };
  m = /^(.+?)\s+X(\d+(?:\.\d+)?)$/.exec(n);
  if (m) return { f: Number(m[2]), text: `×${m[2]} ${m[1]}` };
  m = /^(.+?)\s*\+(\d+)%$/.exec(n);
  if (m) return { f: 1 + Number(m[2]) / 100, text: n };
  return null;
}
/**
 * THE CLIMB for a paying group: the base, then the line (PAIR / JACKPOT), then each multiplier the engine noted, ending
 * on the engine's exact total. Where the notes don't multiply out to the total exactly (TESLA's pooled lightning, a
 * rounding), the gap is spread evenly over the steps, so the count only ever lands on the true number.
 */
export function climbSteps(g: ScoreGroup, tier: Tier): ClimbStep[] {
  const gross = Math.round(g.base * g.mult);
  const raw: { f: number; text: string }[] = [];
  const count = g.reels.length;
  if (g.matched && count >= 2 && tier !== 'none') raw.push(count >= 3 ? { f: TIER_MUL.triple, text: `×${TIER_MUL.triple} JACKPOT` } : { f: TIER_MUL.pair, text: `×${TIER_MUL.pair} PAIR` });
  for (const n of g.notes ?? []) {
    const st = noteStep(n);
    if (st && st.f !== 1) raw.push(st);
  }
  if (!raw.length && gross !== g.base && g.base > 0) raw.push({ f: gross / g.base, text: '' });
  const prod = raw.reduce((a, st) => a * st.f, Math.max(1, g.base));
  const k = raw.length && prod > 0 ? (gross / prod) ** (1 / raw.length) : 1;
  const out: ClimbStep[] = [{ label: '', value: g.base }];
  let v = g.base;
  raw.forEach((st, i) => {
    v *= st.f * k;
    out.push({ label: st.text, value: i === raw.length - 1 ? gross : v });
  });
  if (out.length === 1) out.push({ label: '', value: gross });
  return out;
}

/**
 * Reels 1+2 matched, the slow reel 3 missed: if the triple symbol is sitting one stop off,
 * point at it and groan. Otherwise the tease just ends as a normal double.
 */
export function missedTriple(d: Director, side: SideId, want: SymbolId): void {
  const reel = d.s.machines[side].reels[2];
  for (const row of [0, 2]) {
    const cell = reel.cellAtRow(row);
    if ((cell.slimed ? 'slime' : cell.symbol) !== want) continue;
    const fx = reel.rows[row];
    fx.glowColor = '#ff5a4a';
    d.bg(d.c.tween({ from: 0.9, to: 0, dur: 0.7, onUpdate: (v) => (fx.glow = v) }));
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (fx.wobble = v) }));
    const p = cellCenter(side, 2, row);
    d.bg(d.popText('SO CLOSE!', p.x - 20, row === 0 ? p.y - 30 : p.y + 30, 2, '#ff8a7a', 10, 0.4));
    d.s.sounds.nearMissAww();
    return;
  }
}

/** The numbers on a landed payline symbol: its value (bottom-left) and its charm's tag (top-right). */
export function setTag(d: Director, side: SideId, r: number, jammed = false): void {
  const m = d.s.machines[side];
  const cell = m.reels[r].cellAtRow(1);
  if (jammed || (cell.stolen ?? 0) > 0 || cell.slimed || cell.carded) return;
  const lv = d.s.levels[side];
  const player = side === 'player';
  if ((player && DEAD.has(cell.symbol)) || cell.symbol === 'wild' || cell.symbol === 'empty') return;
  // Enemy effect symbols (slime, ice, claws...) don't pay a number: the banner says what they do.
  if (!player && WRITERS.has(cell.symbol)) return;
  const base = BASE[cell.symbol] ?? 0;
  const bonus = d.symBonus[side]?.[cell.symbol] ?? 0;
  const charm = cell.enh && !(cell.faked && cell.faked > 0) && m.hexed[r] <= 0 ? cell.enh : undefined;
  const lvl = charm ? (player ? charmLevel(lv, charm, d.s.ticket) : 1) : 1;
  // What the cell really hits (or blocks) for: its share of its group's FINAL pay, after every multiplier, so the
  // numbers on the line add up to the banner's total (user: the cells said 13 while the hit was 7,000).
  // Each reel's LANDED payline cell: the reels to its right may still be spinning when this one's number pops (an
  // enemy shield jackpot read 9 / 11 / 15 under a 15 x 3 banner).
  const stops = d.lastStops[side];
  const cellBase = (rr: number): number => {
    const reel = m.reels[rr];
    const c = stops ? reel.cells[((stops[rr] % reel.cells.length) + reel.cells.length) % reel.cells.length] : reel.cellAtRow(1);
    const b = (lv ? playerSymValue(lv, c.symbol, BASE[c.symbol] ?? 0) : !player && c.symbol === 'shield' ? Math.round((BASE[c.symbol] ?? 0) * d.s.enemyShield) : BASE[c.symbol] ?? 0) + (d.symBonus[side]?.[c.symbol] ?? 0);
    const k = c.enh === 'keen' && !(c.faked && c.faked > 0) && m.hexed[rr] <= 0 ? charmValue('keen', player ? charmLevel(lv, 'keen', d.s.ticket) : 1) : 0;
    return b + k;
  };
  let value: number;
  const g = d.lastScore?.groups.find((x) => x.reels.includes(r) && x.base > 0);
  if (g && g.amount > 0) {
    const mine = cellBase(r);
    // THE DROP's group counts its notes off the payline too (in its BASE); other groups split by their cells.
    const denom = g.drop ? g.base : g.reels.reduce((a, rr) => a + cellBase(rr), 0);
    value = g.reels.length === 1 && !g.drop ? g.amount : denom > 0 ? Math.round((g.amount * mine) / denom) : Math.round(g.amount / g.reels.length);
  } else value = (lv ? playerSymValue(lv, cell.symbol, base) : !player && cell.symbol === 'shield' ? Math.round(base * d.s.enemyShield) : base) + bonus;
  if (!value && !charm) return;
  const tag = { value: value ? fmtNum(value) : '', ...(charm ? { charm: charmTag(charm, lvl), color: CHARM_COLOR[charm] } : {}), pop: 0, alpha: 1 };
  m.tags[r] = tag;
  d.bg(d.c.tween({ from: 0, to: 1, dur: 0.18, ease: backOut(3), onUpdate: (v) => (tag.pop = v) }));
}

/** WILDS: a small wheel of every symbol + charm you own spins and lands on the one whose jackpot pays. */
export async function bonusReel(d: Director, side: SideId, pick: SymbolId, pickEnh?: Enh): Promise<void> {
  d.s.sounds.lucky();
  // One segment per live symbol + charm on YOUR machine (what the engine's pick can land on).
  const key = (sym: SymbolId, enh?: Enh) => `${sym}:${enh ?? ''}`;
  const seen = new Map<string, { symbol: SymbolId; enh?: Enh }>();
  for (const reel of d.s.machines[side].reels)
    for (const c of reel.cells) {
      if (c.slimed || (c.stolen ?? 0) > 0 || c.carded || (c.bomb ?? 0) > 0 || !WHEEL_SYMBOLS.has(c.symbol)) continue;
      const enh = wheelCharm(c);
      seen.set(key(c.symbol, enh), { symbol: c.symbol, ...(enh ? { enh } : {}) });
    }
  if (!seen.has(key(pick, pickEnh))) seen.set(key(pick, pickEnh), { symbol: pick, ...(pickEnh ? { enh: pickEnh } : {}) });
  const order = ['sword', 'ace', 'shield', 'bolt', 'goldbar'];
  const pool = [...seen.values()].sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol) || (a.enh ?? '').localeCompare(b.enh ?? ''));
  const at = pool.findIndex((p) => key(p.symbol, p.enh) === key(pick, pickEnh));
  const cx = W / 2;
  const cy = MACHINE_TOP + MACHINE_H / 2 + 60;
  // The Dealer's table panel sits where the wheel spins: it steps aside meanwhile (playtest).
  d.s.gutter.wheelUp = true;
  const wheel = d.s.fx.add(new SymbolWheel(pool.map((p) => ({ sprite: p.symbol as SpriteId, ...(p.enh ? { charm: ENH_SPRITE[p.enh] } : {}) })), cx, cy, pool.length > 4 ? 90 : 70));
  await d.c.tween({ from: 0, to: 1, dur: 0.18, ease: backOut(2), onUpdate: (v) => (wheel.scale = v) });
  const end = wheel.stopAngle(at, 3);
  const seg = (Math.PI * 2) / pool.length;
  let last = 0;
  await d.c.tween({
    from: 0,
    to: end,
    dur: 1.3,
    ease: cubicOut,
    onUpdate: (v) => {
      wheel.angle = v;
      const tick = Math.floor(Math.abs(v) / seg);
      if (tick !== last) {
        last = tick;
        d.s.sounds.reelStop(tick % 3, 1.2);
      }
    },
  });
  wheel.landed = at;
  d.bg(d.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (wheel.flash = v) }));
  d.bg(d.popText(`WILD ${pickEnh ? `${pickEnh.toUpperCase()} ` : ''}${symLabel(pick)} JACKPOT!`, cx, cy - 120, 2.5, '#ff6ad5', 16, 0.4));
  await d.c.wait(0.4);
  d.bg(d.c.tween({ from: 1, to: 0, dur: 0.2, onUpdate: (v) => (wheel.alpha = v) }).then(() => {
    d.s.fx.remove(wheel);
    d.s.gutter.wheelUp = false;
  }));
}

/** Juice §3, mapped to tiers: none → small, pair → medium, triple → jackpot. */
export async function winPresentation(d: Director, side: SideId, score: LineScore): Promise<void> {
  const m = d.s.machines[side];
  const { tier } = score;
  const matched = score.groups.find((g) => g.matched);
  d.bg(m.focusPayline(d.c, true));
  m.payline.color = tier === 'triple' ? COLORS.triple : tier === 'pair' ? COLORS.goldLight : '#c9b8ff';
  m.payline.alpha = tier === 'none' ? 0.6 : 1;
  await d.c.tween({ dur: tier === 'none' ? 0.12 : 0.2, onUpdate: (v) => (m.payline.progress = v) });

  if (tier === 'none') {
    d.s.sounds.stingerSmall();
    // Reels 2+3 matching looks like a double but isn't (in-order rule) — say so.
    const [a, b, c] = score.line;
    if (b === c && a !== b) {
      const p = cellCenter(side, 1.5, 0);
      d.bg(d.popText('NO PAIR', p.x, p.y - 20, 2, COLORS.textDim, 12, 0.3));
    }
    await d.c.wait(0.08);
    return;
  }

  if (tier === 'triple') d.s.cheer?.(side === 'player');
  // Per-symbol glow + punch along the matched run, 60ms apart, with ascending dings.
  for (const [i, r] of matched!.reels.entries()) {
    const fx = m.reels[r].rows[1];
    fx.glowColor = tier === 'triple' ? '#ff8a5a' : COLORS.goldLight;
    d.s.sounds.ding(i);
    d.bg(
      d.c
        .tween({ from: 1, to: 1.15, dur: 0.12, ease: backOut(), onUpdate: (v) => (fx.punch = v) })
        .then(() => d.c.tween({ from: 1.15, to: 1, dur: 0.16, ease: sineIn, onUpdate: (v) => (fx.punch = v) })),
    );
    d.bg(d.c.tween({ from: 0, to: 0.75, dur: 0.1, onUpdate: (v) => (fx.glow = v) }).then(() => d.c.to(fx, 'glow', 0.25, 0.5)));
    await d.c.wait(0.06);
  }

  const sym = matched!.symbol;
  const slimeCleanse = sym === 'slime' && side === 'player';
  const g = matched!;
  const gross = Math.round(g.base * g.mult);
  // One decimal unless it makes the sum read wrong (39 x 11.3 = 439): then two.
  const fmt = (x: number) => (Number.isInteger(x) ? String(x) : Math.round(g.base * Number(x.toFixed(1))) === gross ? x.toFixed(1) : String(Number(x.toFixed(2))));
  const effect = side === 'enemy' && WRITERS.has(sym) ? effectText(sym, g.amount) : '';
  // THE PAYOUT LADDER (feel playtest, 2026-10-15: "JACKPOT!" every two spins meant nothing). A pay is sized by the HP
  // bar it lands on: a hit by the enemy's (a block by your own), so a small jackpot stays small and BIG WIN / MEGA WIN
  // are earned. PAIR and JACKPOT still name the line; the size names the moment.
  // (Blocks stay off the ladder: BIG WIN and MEGA WIN mean damage. Feel playtest #2: shield jackpots took 3 of 5.)
  const attack = sym !== 'shield';
  const bar = d.s.huds[other(side)].maxHp;
  const share = slimeCleanse || effect || !attack ? 0 : gross / Math.max(1, bar);
  const size: 'small' | 'big' | 'mega' = share >= LADDER.mega ? 'mega' : share >= LADDER.big ? 'big' : 'small';
  const mine = side === 'player';
  const title = size === 'mega' ? (mine ? 'MEGA WIN!' : 'HUGE HIT!') : size === 'big' ? (mine ? 'BIG WIN!' : 'BIG HIT!') : tier === 'triple' ? 'JACKPOT!' : 'PAIR!';
  const color = size === 'mega' ? (mine ? COLORS.mega : '#ff4a4a') : size === 'big' ? (mine ? COLORS.bigWin : '#ff7a5a') : tier === 'triple' ? COLORS.triple : COLORS.pair;
  const fixed = slimeCleanse
    ? [{ text: 'CLEANSE!', color: COLORS.slime }]
    : effect
      ? [{ text: effect, color: '#ff8a7a' }]
      : null;
  // THE CLIMB: your pay builds on screen, one multiplier at a time (the line, then each Charm and relic as it fires),
  // counting up to the total. The enemy's pays show the short sum (its turns are the waiting half of a fight).
  const climb = !fixed && mine ? climbSteps(g, tier) : null;
  const parts = fixed ?? [
    { text: `${g.base}`, color: '#ffffff' },
    { text: ' × ', color: COLORS.goldLight },
    { text: fmt(g.mult), color: COLORS.goldLight },
    { text: ' = ', color: '#ffffff' },
    { text: `${gross}!`, color: tier === 'triple' ? '#ff8a5a' : COLORS.goldLight },
    ...(g.cut ? [{ text: ` -${g.cut}`, color: '#ff5a5a' }] : []),
  ];
  const hold = size === 'mega' ? 1.3 : size === 'big' ? 0.9 : tier === 'triple' ? 0.45 : 0.3;
  if (size === 'small') {
    // A small pay: quick and light (a small jackpot still glows orange, without the confetti storm).
    if (tier === 'pair') d.s.sounds.stingerMedium();
    else {
      d.s.sounds.stingerMedium();
      d.s.sounds.coin(3);
    }
    // THE JACKPOT beat (the retail list): yours gets one strong moment, a heavier kick, a soft gold tint (never a
    // white flash), a fountain from both sides of your machine and sparks off the payline.
    const big = tier === 'triple' && mine;
    d.shake(big ? 8 : tier === 'triple' ? 5 : 3, big ? 0.3 : 0.18);
    d.s.camera.chromaPulse(tier === 'triple' ? 0.3 : 0.15);
    if (big) {
      d.s.camera.flashScreen(0.12, '#ffd23f');
      d.s.camera.punchZoom(0.03, 0.3);
    }
    if (tier === 'triple') {
      const c = d.machineCenter(side);
      d.s.particles.burst({ x: c.x, y: c.y - 60, count: big ? 70 : 40, colors: ['#ff8a5a', '#ffd23f', '#ffffff'], speed: [180, 420], angle: -Math.PI / 2, spread: Math.PI * 0.9, gravity: 700, drag: 1.2, life: [0.6, 1.1], size: [4, 7], kind: 'confetti' });
      if (big) {
        const w = reelWindow(side);
        for (const sx of [w.x - 10, w.x + w.w + 10])
          d.s.particles.burst({ x: sx, y: c.y, count: 36, colors: ['#ffd23f', '#ffe08a', '#ff8a5a'], speed: [260, 560], angle: -Math.PI / 2 + (sx < c.x ? -0.35 : 0.35), spread: Math.PI * 0.35, gravity: 800, drag: 1, life: [0.7, 1.2], size: [4, 7], kind: 'confetti' });
        d.s.particles.burst({ x: c.x, y: c.y, count: 30, colors: ['#ffffff', '#ffd23f'], speed: [200, 520], angle: 0, spread: Math.PI * 2, gravity: 0, drag: 3, life: [0.25, 0.5], size: [2, 4], kind: 'spark' });
      }
    }
    const show = payBanner(d, title, color, tier === 'triple' ? 1.25 : 1.15, hold, parts, climb, tier === 'triple' ? 4.5 : 4, 'small');
    if (climb) await show;
    else {
      d.bg(show);
      await d.c.wait(0.3);
    }
  } else {
    d.s.sounds.fanfareJackpot();
    d.hitstop(size === 'mega' ? 8 : 4);
    d.shake(size === 'mega' ? 12 : 9, size === 'mega' ? 0.7 : 0.5);
    d.s.camera.punchZoom(size === 'mega' ? 0.08 : 0.05, size === 'mega' ? 0.6 : 0.45);
    d.s.camera.chromaPulse(0.85);
    d.s.camera.dimTarget = 0.35;
    const c = d.machineCenter(side);
    d.s.particles.burst({
      x: c.x,
      y: c.y - 60,
      count: size === 'mega' ? 320 : 200,
      colors: ['#ff3a2e', '#ffd23f', '#3b8ef0', '#5ed15a', '#ffffff', '#ff6ad5'],
      speed: [250, size === 'mega' ? 900 : 750],
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
      gravity: 700,
      drag: 1.2,
      life: [1.2, 2.2],
      size: [5, 9],
      kind: 'confetti',
    });
    await payBanner(d, title, color, size === 'mega' ? 1.7 : 1.5, hold, parts, climb, size === 'mega' ? 6 : 5, size);
    d.s.camera.dimTarget = 0;
  }
}

/**
 * The pay banner. With a climb, the sub line counts up through each step (LABEL VALUE), a rising ding a step, then
 * slams on the total; without one it builds the short sum part by part.
 */
export async function payBanner(d: Director, title: string, color: string, overshoot: number, hold: number, parts: { text: string; color: string }[], climb: ClimbStep[] | null, textScale: number, size: 'small' | 'big' | 'mega'): Promise<void> {
  if (!climb) return d.banner(title, color, overshoot, hold, parts, PAY_BANNER_Y, textScale);
  if (!d.s.juice.banners) return;
  const b = d.s.fx.add(new Banner(title, color, W / 2, PAY_BANNER_Y, textScale));
  // Wide enough for the longest step, so the panel doesn't twitch as the labels change.
  b.minW = Math.max(...climb.map((st) => textWidth(`${st.label}  ${fmtNum(st.value)}`, 4))) + 60;
  const show = (label: string, value: number, end = false) =>
    (b.subParts = [
      ...(label ? [{ text: `${label}  `, color: COLORS.goldLight }] : []),
      { text: `${fmtNum(Math.round(value))}${end ? '!' : ''}`, color: end ? color : '#ffffff' },
    ]);
  show(climb[0].label, climb[0].value);
  await d.c.tween({ from: 0, to: overshoot, dur: 0.22, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
  await d.c.tween({ from: overshoot, to: 1, dur: 0.12, ease: sineIn, onUpdate: (v) => (b.scale = v) });
  // Each step: count from the last value to this one; bigger moments climb slower.
  const per = size === 'mega' ? 0.24 : size === 'big' ? 0.18 : 0.11;
  for (let i = 1; i < climb.length; i++) {
    const from = climb[i - 1].value;
    const st = climb[i];
    d.s.sounds.ding(i + 1);
    await d.c.tween({ from, to: st.value, dur: per, ease: cubicOut, onUpdate: (v) => show(st.label, v) });
    d.bg(d.c.tween({ from: 1.08, to: 1, dur: 0.12, onUpdate: (v) => (b.scale = v) }));
  }
  // The slam: the total, in the banner's colour.
  const total = climb[climb.length - 1].value;
  show('', total, true);
  d.s.sounds.coin(5);
  d.bg(d.c.tween({ from: 1.2, to: 1, dur: 0.18, ease: backOut(3), onUpdate: (v) => (b.scale = v) }));
  await d.c.wait(hold);
  await d.c.tween({ from: 1, to: 0, dur: 0.15, ease: cubicIn, onUpdate: (v) => ((b.scale = 0.6 + 0.4 * v), (b.alpha = v)) });
  d.s.fx.remove(b);
}

/** LUCKY gilds that turned WILD on this spin. */
export async function luckyWilds(d: Director, side: SideId, cells: { reel: number; row: number }[]): Promise<void> {
  const m = d.s.machines[side];
  d.s.sounds.lucky();
  for (const { reel: r, row } of cells) {
    const p = cellCenter(side, r, row);
    const fx = m.reels[r].rows[row];
    fx.glowColor = '#7dff7a';
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.8, onUpdate: (v) => (fx.glow = v) }));
    const w = d.s.fx.add(new Projectile('wild', p.x, p.y, 0));
    d.bg(
      d.c
        .tween({ from: 0, to: 6, dur: 0.2, ease: backOut(3), onUpdate: (v) => (w.scale = v) })
        .then(() => d.c.wait(0.35))
        .then(() => d.c.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (w.alpha = v) }))
        .then(() => d.s.fx.remove(w)),
    );
    d.s.particles.burst({ x: p.x, y: p.y, count: 20, colors: ['#7dff7a', '#ffffff', '#ffd23f'], speed: [80, 260], gravity: -100, life: [0.3, 0.6], size: [2, 4] });
    d.bg(d.popText('LUCKY WILD!', p.x, p.y - 60, 2, '#7dff7a', 16, 0.4));
  }
  await d.c.wait(0.45);
}
