// QA_1: does a BONUS WHEEL heal / +max HP survive finishFight?  npx tsx playtest/scratch/qa_wheel_heal.ts
import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { createRun, fightConfig, finishFight, payVoucher, wheelOptions } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
const base = defaultConfig();
let tried = 0, healCases = 0, lost = 0, maxCases = 0, maxLost = 0;
for (let s = 1; s < 4000 && (healCases < 40 || maxCases < 40); s++) {
  const run = createRun(base, s, "knight"); run.player.hp = run.player.maxHp - 12;
  const f = new Fight(fightConfig(run, base), s);
  f.forceBonus = 'wheel';
  while (!f.over) f.step();
  if (f.winner !== 'player') continue;
  tried++;
  // what will the wheel pick? replay payVoucher on a clone
  const clone = JSON.parse(JSON.stringify(run));
  const pay = payVoucher(clone, f.vouchers[0]);
  const o = pay.options[pay.pick];
  if (o.kind !== 'heal' && o.kind !== 'maxHp') continue;
  // expected: fight hp + post-fight heal + wheel effect
  const ctrl = JSON.parse(JSON.stringify(run));
  const f2 = Object.assign(Object.create(Object.getPrototypeOf(f)), f, { vouchers: [] });
  finishFight(ctrl, f2);
  finishFight(run, f);
  if (o.kind === 'heal') { healCases++; if (run.player.hp <= ctrl.player.hp && ctrl.player.hp < ctrl.player.maxHp) lost++; }
  else { maxCases++; if (run.player.hp - ctrl.player.hp < o.amount && ctrl.player.hp + o.amount <= run.player.maxHp) maxLost++; }
}
console.log(`won fights ${tried}; wheel HEAL landed ${healCases}x, heal had no effect ${lost}x; wheel +MAX HP landed ${maxCases}x, current HP bonus lost ${maxLost}x`);
