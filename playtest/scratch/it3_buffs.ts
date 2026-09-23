// Single-fight tests of WILD / KEEN / +2 BOLT buff proposals (patches Fight.prototype.score).
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import type { Gild, StripCounts } from '../../src/core/config';
import { BASE, Fight, Rng } from './it3_lib';

const N = Number(process.argv[2] ?? 3000);
let MODE = '';
const orig = (Fight.prototype as any).score;
(Fight.prototype as any).score = function (this: any, me: any, line: string[]) {
  const s = orig.call(this, me, line);
  for (const g of s.groups) {
    if (MODE === 'wildx2' && g.matched && g.reels.some((r: number) => line[r] === 'wild')) g.amount *= 2;
    if (MODE === 'keen+1' && g.symbol === 'sword') for (const r of g.reels) { const c = me.reels[r].cells[me.reels[r].stop]; if (c.enh === 'keen' && !c.slimed && !c.stolen) g.amount += 1; }
  }
  s.totals = {}; for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
  return s;
};
const start: StripCounts[] = [0, 1, 2].map(() => ({ sword: 4, shield: 4, bolt: 4 }));
const sw = (reel: number, to: string, n: number, from = 'shield') => start.map((s: any, i) => (i === reel ? { ...s, [from]: s[from] - n, [to]: (s[to] ?? 0) + n } : { ...s }));
const kits: { name: string; strips?: StripCounts[]; gilds?: Gild[]; mode?: string }[] = [
  { name: 'baseline' },
  { name: 'WILD r2 (current)', strips: sw(1, 'wild', 1) },
  { name: 'WILD r2 pays x2 in a match', strips: sw(1, 'wild', 1), mode: 'wildx2' },
  { name: '2 WILDs r2', strips: sw(1, 'wild', 2) },
  { name: '2 WILDs r2, x2', strips: sw(1, 'wild', 2), mode: 'wildx2' },
  { name: 'KEEN r1 (current)', gilds: [{ reel: 0, symbol: 'sword', enh: 'keen' }] },
  { name: 'KEEN r1 +1 dmg', gilds: [{ reel: 0, symbol: 'sword', enh: 'keen' }], mode: 'keen+1' },
  { name: '+2 bolt r1 (current)', strips: start.map((s, i) => (i === 0 ? { ...s, bolt: 6 } : { ...s })) },
  { name: '+3 bolt r1', strips: start.map((s, i) => (i === 0 ? { ...s, bolt: 7 } : { ...s })) },
  { name: 'gold bolt r2 (ref)', gilds: [{ reel: 1, symbol: 'bolt', enh: 'gold' }] },
];
const panel = [ARCHETYPES.find((a) => a.id === 'brute')!, ARCHETYPES.find((a) => a.id === 'thief')!, ARCHETYPES.find((a) => a.id === 'frost')!, BOSS];
console.log('kit'.padEnd(30) + ['brute', 'thief', 'frost', 'HOUSE', 'avg'].map((s) => s.padStart(8)).join(''));
for (const k of kits) {
  MODE = k.mode ?? '';
  const ls = panel.map((a, pi) => {
    const rng = new Rng(500 + pi); let lost = 0;
    for (let i = 0; i < N; i++) {
      const e = makeEnemy(a, a.id === 'house' ? 5 : 3, new Rng(i * 31 + 7), a.id === 'house');
      const cfg = JSON.parse(JSON.stringify(BASE));
      cfg.enemy = { hp: e.hp, strips: e.strips, ability: e.ability, boss: e.boss };
      cfg.player = { ...cfg.player, hp: 32, startHp: 24, strips: (k.strips ?? start).map((s) => ({ ...s })), gilded: k.gilds ?? [] };
      const f = new Fight(cfg, rng.int(0xffffffff));
      while (!f.over && f.turn < 2000) f.step();
      if (f.winner !== 'player') lost++;
    }
    return lost / N;
  });
  console.log(k.name.padEnd(30) + [...ls, ls.reduce((a, b) => a + b) / ls.length].map((l) => (100 * l).toFixed(1).padStart(8)).join(''));
}
