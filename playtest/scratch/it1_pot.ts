// Boss pot variants (monkeypatched on Fight.prototype, src untouched). Player: base strips, 32 HP, 2 random relics.
import type { RelicId } from '../../src/core/config';
import { BOSS, makeEnemy } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { BASE, Fight, Rng } from './it1_lib';

const proto = Fight.prototype as any;
const origCharge = proto.chargeAbility;
let V = { seed: 0, perTurn: 0, every: 5, coinMul: 1, hp: 50, stealOnPair: false };
proto.chargeAbility = function (me: any, events: any[]) {
  if (this.isBoss && me.side === 'enemy' && V.perTurn) { this.pot += V.perTurn; events.push({ type: 'pot', side: 'enemy', reels: [], amount: V.perTurn, total: this.pot }); }
  return origCharge.call(this, me, events);
};
const origWrite = proto.write;
proto.write = function (me: any, foe: any, sym: string, amount: number, reels: number[], events: any[]) {
  return origWrite.call(this, me, foe, sym, sym === 'coin' ? amount * V.coinMul : amount, reels, events);
};
const origStep = proto.step;
proto.step = function () {
  const r = origStep.call(this);
  if (V.stealOnPair && this.isBoss && r.side === 'player' && !this.over) {
    const sp = r.events.find((e: any) => e.type === 'spin');
    if (sp.score.tier === 'pair') this.winPot(this.sides.player, r.events);
  }
  return r;
};

const relics: RelicId[] = ['clover', 'whetstone', 'soap', 'battery', 'mirror', 'fang', 'bandage', 'hourglass', 'magnet'];
const variants: [string, typeof V][] = [
  ['now: every5, coins x1, hp50', { seed: 0, perTurn: 0, every: 5, coinMul: 1, hp: 50, stealOnPair: false }],
  ['seed 6 +1/house turn, every5, hp50', { seed: 6, perTurn: 1, every: 5, coinMul: 1, hp: 50, stealOnPair: false }],
  ['seed 6 +1/turn, coins x2, every5, hp44', { seed: 6, perTurn: 1, every: 5, coinMul: 2, hp: 44, stealOnPair: false }],
  ['seed 5 +1/turn, every6, hp44', { seed: 5, perTurn: 1, every: 6, coinMul: 1, hp: 44, stealOnPair: false }],
  ['seed 5 +1/turn, every6, hp44, steal on pair too', { seed: 5, perTurn: 1, every: 6, coinMul: 1, hp: 44, stealOnPair: true }],
];
const rng = new Rng(21);
for (const [name, v] of variants) {
  V = v;
  const N = 15000;
  let loss = 0, potDeaths = 0, cash = 0, cashN = 0, steal = 0, stealN = 0, bigSteal = 0, turns = 0, bigCash = 0;
  for (let i = 0; i < N; i++) {
    const cfg = cloneConfig(BASE);
    const e = makeEnemy(BOSS, 5, new Rng(1), true);
    cfg.player = { ...cfg.player, hp: 32, startHp: 32 };
    cfg.enemy = { hp: v.hp, strips: e.strips, ability: { ...e.ability, every: v.every }, boss: 'house' };
    const a = rng.pick(relics); let b = rng.pick(relics); while (b === a) b = rng.pick(relics);
    cfg.relics = [a, b];
    const f = new Fight(cfg, rng.int(0xffffffff));
    f.pot = v.seed;
    let last = '';
    while (!f.over) {
      const r = f.step();
      for (const ev of r.events as any[]) {
        if (ev.type === 'potWin' && ev.from === 'enemy') { cash += ev.amount; cashN++; if (ev.amount >= 10) bigCash++; last = 'pot'; }
        else if (ev.type === 'attack' && ev.from === 'enemy') last = 'hit';
        if (ev.type === 'potWin' && ev.from === 'player') { steal += ev.amount; stealN++; if (ev.amount >= 8) bigSteal++; }
      }
    }
    turns += f.turn;
    if (f.winner !== 'player') { loss++; if (last === 'pot') potDeaths++; }
  }
  console.log(`${name.padEnd(46)} loss ${(100 * loss / N).toFixed(1)}%  turns ${(turns / N).toFixed(1)}  cashouts/fight ${(cashN / N).toFixed(2)} avg ${(cash / Math.max(1, cashN)).toFixed(1)} (>=10: ${(bigCash / N).toFixed(2)}/fight)  steals/fight ${(stealN / N).toFixed(2)} avg ${(steal / Math.max(1, stealN)).toFixed(1)}  fights w/ big steal(>=8) ${(100 * bigSteal / N).toFixed(0)}%  deaths by pot ${(100 * potDeaths / Math.max(1, loss)).toFixed(0)}%`);
}
