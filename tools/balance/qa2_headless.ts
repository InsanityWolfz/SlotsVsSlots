// QA_2: headless verification of QA_1 fixes B2, B11, rush pool.  npx tsx playtest/scratch/qa2_headless.ts
import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { createRun, fightConfig, finishFight, payVoucher, runActs, currentEnemy, totalFights } from '../../src/core/run';
import { BONUS, RELIC_TIER } from '../../src/core/relics';
import { STAKE } from '../../src/core/stakes';
const base = defaultConfig();
console.log('BONUS rates', JSON.stringify(BONUS), 'common rush pool', RELIC_TIER.common.join(','));

// B2: wheel HEAL / +MAX HP survive finishFight
{
  let tried = 0, heal = 0, healOk = 0, healNoop = 0, max = 0, maxOk = 0, hpOverMax = 0;
  for (let s = 1; s < 6000 && (heal < 60 || max < 60); s++) {
    const run = createRun(base, s, 'knight');
    run.player.hp = run.player.maxHp - 14;
    const f = new Fight(fightConfig(run, base), s);
    f.forceBonus = 'wheel';
    while (!f.over) f.step();
    if (f.winner !== 'player' || !f.vouchers.length) continue;
    tried++;
    const ctrl = JSON.parse(JSON.stringify(run));
    const f2 = Object.assign(Object.create(Object.getPrototypeOf(f)), f, { vouchers: [] });
    finishFight(ctrl, f2);
    finishFight(run, f);
    if (run.player.hp > run.player.maxHp) hpOverMax++;
    const b: any = run.bonusLog[0];
    const o = b.options[b.pick];
    if (o.kind === 'heal') {
      heal++;
      const expect = Math.min(ctrl.player.maxHp, ctrl.player.hp + o.amount);
      if (run.player.hp === expect) healOk++;
      if (run.player.hp === ctrl.player.hp && ctrl.player.hp < ctrl.player.maxHp) healNoop++;
    } else if (o.kind === 'maxHp') {
      max++;
      if (run.player.maxHp === ctrl.player.maxHp + o.amount && run.player.hp === ctrl.player.hp + o.amount) maxOk++;
    }
  }
  console.log(`B2: won fights ${tried}; HEAL ${heal} (correct ${healOk}, no-op ${healNoop}); +MAX HP ${max} (correct ${maxOk}); hp>maxHp ${hpOverMax}`);
}

// B11: which boss fights carry chase symbols?
{
  const rows: string[] = [];
  for (const [stake, a3] of [[0, false], [STAKE.act3, true], [STAKE.act3, false]] as [number, boolean][]) {
    const run = createRun(base, 5, 'knight', stake, a3);
    const out: string[] = [];
    // walk the run forcing wins
    for (let n = 0; n < 20 && !run.over; n++) {
      if (!run.chosen[run.depth]) run.chosen[run.depth] = true;
      const e = currentEnemy(run);
      const cfg = fightConfig(run, base);
      if (e.isBoss || e.boss) out.push(`${e.boss ?? e.name}@act${run.act}:${cfg.player.bonusSymbols}`);
      const f = new Fight(cfg, n + 1);
      f.sides.enemy.hp = 1; f.sides.enemy.shield = 0;
      f.forceNext('player', ['sword', 'sword', 'sword']);
      let k = 0;
      while (!f.over && k++ < 400) { f.step(); if (!f.over && f.next === 'player') { f.sides.enemy.hp = 1; f.forceNext('player', ['sword', 'sword', 'sword']); } }
      if (f.winner !== 'player') { out.push('LOST?'); break; }
      finishFight(run, f);
      (run as any).actIntro = false;
    }
    rows.push(`stake ${stake} act3 ${a3} (runActs ${runActs(run)}, total ${totalFights(run)}): ${out.join(' ')} over=${run.over} won=${run.won}`);
  }
  console.log('B11:\n  ' + rows.join('\n  '));
}

// Rush pool: no counter relics, no crown after act 1
{
  const got: Record<string, number> = {};
  for (const act of [1, 2]) {
    const run = createRun(base, 9, 'knight');
    run.act = act;
    for (let s = 0; s < 2000; s++) {
      const r = JSON.parse(JSON.stringify(run));
      const q: any = payVoucher(r, { kind: 'rush', seed: s });
      const k = `a${act}:${q.relic ?? 'none'}`;
      got[k] = (got[k] ?? 0) + 1;
    }
  }
  console.log('rush prizes fresh knight /2000 per act:', JSON.stringify(got));
  // Rush at the House (act 1 boss fight): crown still possible (it's paid while run.act is still 1)
  const run = createRun(base, 11, 'knight');
  run.depth = 5; // House
  let crown = 0;
  for (let s = 0; s < 2000; s++) { const r = JSON.parse(JSON.stringify(run)); const q: any = payVoucher(r, { kind: 'rush', seed: s }); if (q.relic === 'crown') crown++; }
  console.log(`rush paid for a House win (act 1, depth ${run.depth}): HIGH ROLLER ${crown}/2000`);
  // Empty-pool text: filters vs actually owning every relic
  const r2 = createRun(base, 12, 'knight');
  r2.act = 2;
  r2.player.relics = [...RELIC_TIER.common.filter((x) => x !== 'crown'), ...RELIC_TIER.uncommon, ...RELIC_TIER.legendary];
  const q: any = payVoucher(r2, { kind: 'rush', seed: 3 });
  console.log(`act 2, owns all but HIGH ROLLER -> relic ${q.relic} chips ${q.chips} label "${q.label}"`);
}
