import { avg, batch, CABINET_ORDER, pct } from './it6_lib';
for (const p of ['greedy', 'commit'] as const) {
  const at: number[] = []; const intro: number[] = [];
  let legendBuys = 0, runsA2 = 0;
  for (const c of CABINET_ORDER) {
    const rs = batch(c, { draft: p, fork: 'greedy', shop: p, legend: 'value', hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 5) at.push(run.player.chips); } } }, 600, 99);
    for (const r of rs) if (r.fights.some((f) => f.act === 2)) { runsA2++; intro.push(r.chipsAt[3] ?? 0); legendBuys += r.bought.filter((b) => ['ticket', 'bell', 'phoenix', 'overcharge', 'key', 'sandglass'].includes(b)).length; }
  }
  console.log(`${p}: chips arriving at act 2 intro Cashier ${avg(intro).toFixed(1)}; chips left unspent at the Mirror ${avg(at).toFixed(1)} (>=10 in ${pct(at.filter((x) => x >= 10).length, at.length)}%); legendary buys per act-2 run ${(legendBuys / runsA2).toFixed(2)}`);
}
