import { defaultConfig, type GameConfig } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { Rng } from '../src/core/rng';
import { slimeFraction } from '../src/core/strip';

export interface Deep {
  win: number; turns: number; t10: number; t50: number; t90: number;
  pPair: number; pTrip: number; eTrip: number; eSlimeTrip: number; specials: number; spFirst: number;
  cleanses: number; cleanseFightPct: number; slimeEvents: number; cellsSlimed: number; endSlime: number;
  slimeOnLinePct: number; deadSpinPct: number; specialDmgShare: number;
  pDmgTurn: number; eDmgTurn: number; pZeroStreak4Pct: number; comebackPct: number; burstLossPct: number;
  closePct: number; leadChanges: number; stomp: number; pHpLeftOnWin: number; pWhiffPct: number;
}
const pct = (a: number[], q: number) => a[Math.min(a.length - 1, Math.floor(a.length * q))];

export function deep(cfg: GameConfig, n = 20000, seed = 777): Deep {
  const seeds = new Rng(seed);
  const turns: number[] = [];
  const acc: Record<string, number> = {};
  const add = (k: string, v: number) => (acc[k] = (acc[k] ?? 0) + v);
  for (let i = 0; i < n; i++) {
    const f = new Fight(cfg, seeds.int(0xffffffff));
    const P = f.sides.player, E = f.sides.enemy;
    let zero = 0, maxZero = 0, minPHp = P.hp, lead = 0, changes = 0, spinsP = 0;
    const pHpHist: number[] = [];
    let firstSpecial = -1, cleansed = 0, spDmg = 0, swDmg = 0;
    while (!f.over && f.turn < 1000) {
      const r = f.step();
      let dealt = 0;
      for (const e of r.events) {
        if (e.type === 'spin') {
          if (e.side === 'player') {
            spinsP++;
            const ln = e.score.line;
            if (ln.includes('slime')) add('slimeLine', 1);
            const useful = e.score.groups.some((g) => g.symbol !== 'slime' || (g.matched && g.reels.length === 3));
            if (!useful) add('dead', 1);
            if (e.score.tier === 'pair') add('pPair', 1);
            if (e.score.tier === 'triple') add('pTrip', 1);
          } else if (e.score.tier === 'triple') {
            add('eTrip', 1);
            if (e.score.tierSymbol === 'slime') add('eSlimeTrip', 1);
          }
        }
        if (e.type === 'attack' || e.type === 'specialFire') {
          if (e.from === 'player') {
            dealt += e.hpDamage;
            if (e.type === 'specialFire') spDmg += e.hpDamage; else swDmg += e.hpDamage;
            add('pDmg', e.hpDamage);
          } else add('eDmg', e.hpDamage);
        }
        if (e.type === 'specialFire') { add('specials', 1); if (firstSpecial < 0) firstSpecial = f.turn; }
        if (e.type === 'cleanse') { add('cleanses', 1); cleansed = 1; }
        if (e.type === 'slime' && e.cells.length) { add('slimeEvents', 1); add('cells', e.cells.length); }
      }
      if (r.side === 'player') {
        if (dealt === 0) add('whiff', 1);
        zero = dealt === 0 ? zero + 1 : 0;
        maxZero = Math.max(maxZero, zero);
      } else pHpHist.push(P.hp);
      minPHp = Math.min(minPHp, P.hp);
      const d = P.hp / P.maxHp - E.hp / E.maxHp;
      const s = Math.sign(d);
      if (s !== 0 && lead !== 0 && s !== lead) changes++;
      if (s !== 0) lead = s;
    }
    const won = f.winner === 'player';
    turns.push(f.turn);
    add('win', won ? 1 : 0);
    add('endSlime', slimeFraction(P.reels));
    add('cleanseFight', cleansed);
    if (firstSpecial >= 0) { add('spFirst', firstSpecial); add('spFirstN', 1); }
    add('spDmg', spDmg); add('swDmg', swDmg);
    add('spinsP', spinsP); add('spinsE', f.turn - spinsP);
    add('zero4', maxZero >= 4 ? 1 : 0);
    add('changes', changes);
    if (won && minPHp <= 0.25 * P.maxHp) add('comeback', 1);
    if (won) add('hpLeft', P.hp / P.maxHp);
    if (!won) {
      const back = pHpHist[pHpHist.length - 3];
      if (back !== undefined && back >= 0.6 * P.maxHp) add('burst', 1);
    }
    const wHp = won ? P.hp / P.maxHp : E.hp / E.maxHp;
    if (wHp <= 0.25) add('close', 1);
    if (wHp >= 0.75) add('stomp', 1);
  }
  turns.sort((a, b) => a - b);
  const g = (k: string) => acc[k] ?? 0;
  return {
    win: (100 * g('win')) / n, turns: turns.reduce((a, b) => a + b, 0) / n, t10: pct(turns, 0.1), t50: pct(turns, 0.5), t90: pct(turns, 0.9),
    pPair: g('pPair') / n, pTrip: g('pTrip') / n, eTrip: g('eTrip') / n, eSlimeTrip: g('eSlimeTrip') / n,
    specials: g('specials') / n, spFirst: g('spFirst') / Math.max(1, g('spFirstN')),
    cleanses: g('cleanses') / n, cleanseFightPct: (100 * g('cleanseFight')) / n, slimeEvents: g('slimeEvents') / n, cellsSlimed: g('cells') / n,
    endSlime: (100 * g('endSlime')) / n, slimeOnLinePct: (100 * g('slimeLine')) / g('spinsP'), deadSpinPct: (100 * g('dead')) / g('spinsP'),
    specialDmgShare: (100 * g('spDmg')) / (g('spDmg') + g('swDmg')), pDmgTurn: g('pDmg') / g('spinsP'), eDmgTurn: g('eDmg') / g('spinsE'),
    pZeroStreak4Pct: (100 * g('zero4')) / n, comebackPct: (100 * g('comeback')) / Math.max(1, g('win')),
    burstLossPct: (100 * g('burst')) / Math.max(1, n - g('win')),
    closePct: (100 * g('close')) / n, leadChanges: g('changes') / n, stomp: (100 * g('stomp')) / n,
    pHpLeftOnWin: (100 * g('hpLeft')) / Math.max(1, g('win')), pWhiffPct: (100 * g('whiff')) / g('spinsP'),
  };
}

export function row(name: string, d: Deep): string {
  const f = (x: number, p = 1) => x.toFixed(p);
  return [
    name.padEnd(28),
    `win ${f(d.win, 0)}%`,
    `turns ${f(d.turns)} (p10 ${d.t10} p50 ${d.t50} p90 ${d.t90})`,
    `spec ${f(d.specials)} first@T${f(d.spFirst)}`,
    `slimeEv ${f(d.slimeEvents)} cells ${f(d.cellsSlimed)} endSlime ${f(d.endSlime, 0)}%`,
    `cleanse ${f(d.cleanses, 2)} (${f(d.cleanseFightPct, 0)}%)`,
    `pTrip ${f(d.pTrip, 2)} eTrip ${f(d.eTrip, 2)} eSlimeTrip ${f(d.eSlimeTrip, 2)}`,
    `slimeLine ${f(d.slimeOnLinePct, 0)}% dead ${f(d.deadSpinPct, 0)}% whiff ${f(d.pWhiffPct, 0)}%`,
    `close ${f(d.closePct, 0)}% stomp ${f(d.stomp, 0)}% comeback ${f(d.comebackPct, 0)}% burstLoss ${f(d.burstLossPct, 0)}%`,
    `leadCh ${f(d.leadChanges)} 0dmg4+ ${f(d.pZeroStreak4Pct, 0)}% spShare ${f(d.specialDmgShare, 0)}% dmg/t P ${f(d.pDmgTurn, 2)} E ${f(d.eDmgTurn, 2)} hpLeftWin ${f(d.pHpLeftOnWin, 0)}%`,
  ].join(' | ');
}

const isMain = process.argv[1]?.includes('deep');
if (isMain) {
  const base = defaultConfig();
  const tri = (sw: number, sh: number, sl: number) => [0, 1, 2].map(() => ({ sword: sw, shield: sh, slime: sl }));
  const V: [string, (c: GameConfig) => void][] = [
    ['default 20/40', () => {}],
    ['no slime effect', (c) => (c.base.slime = 0)],
    ['no cleanse', (c) => (c.cleanseOnSlimeTriple = false)],
    ['ehp 30', (c) => (c.enemy.hp = 30)],
    ['ehp 35', (c) => (c.enemy.hp = 35)],
    ['ehp 45', (c) => (c.enemy.hp = 45)],
    ['php 25', (c) => (c.player.hp = 25)],
    ['special 8', (c) => (c.specialDamage = 8)],
    ['special 6', (c) => (c.specialDamage = 6)],
    ['specialCost 6', (c) => (c.specialCost = 6)],
    ['special hits shield', (c) => (c.specialIgnoresShield = false)],
    ['enemy 5/4/3', (c) => (c.enemy.strips = tri(5, 4, 3))],
    ['enemy 5/3/4', (c) => (c.enemy.strips = tri(5, 3, 4))],
    ['enemy 4/3/5', (c) => (c.enemy.strips = tri(4, 3, 5))],
    ['tripleMult 4', (c) => (c.tripleMult = 4)],
    ['anyTwo', (c) => (c.pairRule = 'anyTwo')],
  ];
  for (const [nm, m] of V) {
    const c = JSON.parse(JSON.stringify(base)) as GameConfig;
    m(c);
    console.log(row(nm, deep(c, 20000)));
  }
}
