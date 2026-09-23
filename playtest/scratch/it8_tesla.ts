// TESLA levers (act 2 from identical B1 snapshots, commit). Variants patch Fight.gainEnergy / cabinet stats.
//   npx tsx playtest/scratch/it8_tesla.ts [N]
import { Fight } from '../../src/core/fight';
import { CABINETS } from '../../src/core/cabinets';
import { FANG_HEAL, OVERCHARGE_ECHO } from '../../src/core/relics';
import type { RunState } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 600);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const opts = { maxSpecials: 99, fangOnce: false };
const orig = (Fight.prototype as any).gainEnergy;
(Fight.prototype as any).gainEnergy = function (this: any, me: any, amount: number, reels: number[], events: any[]) {
  if (opts.maxSpecials >= 99 && !opts.fangOnce) return orig.call(this, me, amount, reels, events);
  const foe = this.sides[me.side === 'player' ? 'enemy' : 'player'];
  me.energy += amount;
  events.push({ type: 'energyGain', side: me.side, reels, amount, total: me.energy });
  let n = 0, healed = false;
  while (me.energy >= this.cfg.specialCost && !this.over && n < opts.maxSpecials) {
    n++;
    me.energy -= this.cfg.specialCost;
    const dmg = this.cfg.specialDamage + (me.side === 'player' ? this.blaze : 0);
    const h = this.damage(foe, dmg, this.cfg.specialIgnoresShield);
    events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: dmg, ...h, energyLeft: me.energy });
    this.checkDeath(foe, events);
    if (!this.over && me.relics.has('overcharge')) {
      const echo = Math.ceil(dmg * OVERCHARGE_ECHO);
      const h2 = this.damage(foe, echo, this.cfg.specialIgnoresShield);
      events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: echo, ...h2, energyLeft: me.energy });
      this.checkDeath(foe, events);
    }
    if (!this.over && me.relics.has('fang') && !(opts.fangOnce && healed)) { this.heal(me, FANG_HEAL, 'fang', events); healed = true; }
  }
};
const V: Record<string, () => () => void> = {
  base: () => () => {},
  'max 2 specials/spin': () => { opts.maxSpecials = 2; return () => { opts.maxSpecials = 99; }; },
  'max 3 specials/spin': () => { opts.maxSpecials = 3; return () => { opts.maxSpecials = 99; }; },
  'fang once/spin': () => { opts.fangOnce = true; return () => { opts.fangOnce = false; }; },
  'TESLA special 6 dmg': () => { const c = CABINETS.tesla as any; const o = c.specialDamage; c.specialDamage = 6; return () => { c.specialDamage = o; }; },
  'TESLA 23 HP (act2 -2 max)': () => () => {},
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const [vn, v] of Object.entries(V)) {
  const undo = v();
  const vals = CABINET_ORDER.map((cab) => {
    let w = 0;
    snaps[cab].forEach((s, i) => { const r0 = cloneRun(s); if (vn.startsWith('TESLA 23') && cab === 'tesla') { r0.player.maxHp -= 2; r0.player.hp = Math.min(r0.player.hp, r0.player.maxHp); } if (playRun(0, r0.cabinet, pol, new Rng(9000 + i), r0).won) w++; });
    return (100 * w) / snaps[cab].length;
  });
  undo();
  console.log(`${vn.padEnd(26)} ${CABINET_ORDER.map((c, i) => `${c} ${vals[i].toFixed(1)}`).join('  ')}  avg ${avg(vals).toFixed(1)}  tesla-knight ${(vals[3] - vals[0]).toFixed(1)}`);
}
