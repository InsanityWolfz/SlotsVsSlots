// Rollout value of every draft card + fork. npx tsx playtest/scratch/it3_decisions.ts [points] [rollouts] [cont] [seed]
import { applyOption, chooseEnemy, cloneRun, createRun, draftOffers, fightConfig, finishFight, Fight, FORKS, needsChoice, optType, optTypeReel, POLICIES, rollout, Rng, BASE } from './it3_lib';
import type { RunState } from '../../src/core/run';
import { writeFileSync } from 'node:fs';

const POINTS = Number(process.argv[2] ?? 300);
const R = Number(process.argv[3] ?? 200);
const contName = process.argv[4] ?? 'greedy';
const SEED = Number(process.argv[5] ?? 555);
const cont = POLICIES[contName];
const forkCont = FORKS.sim;
const rng = new Rng(SEED * 7 + 1);
const seeds = new Rng(SEED);
const rows: any[] = [];
const forkRows: any[] = [];
let collected = 0;

function forkPoint(run: RunState) {
  const opts = run.paths[run.depth];
  const vals = opts.map((_, i) => { const r2 = cloneRun(run); chooseEnemy(r2, i); return rollout(r2, cont, forkCont, R, rng); });
  forkRows.push({ depth: run.depth, hpFrac: run.player.hp / run.player.maxHp, opts: opts.map((o) => ({ a: o.archetype, elite: !!o.elite })), vals, sim: FORKS.sim(run, rng), relics: run.player.relics.length, gilds: run.player.gilded.length });
  return vals.indexOf(Math.max(...vals));
}

while (collected < POINTS) {
  const run = createRun(BASE, seeds.int(0xffffffff));
  while (!run.over && collected < POINTS) {
    if (needsChoice(run)) chooseEnemy(run, forkPoint(run));
    const fight = new Fight(fightConfig(run, BASE), rng.int(0xffffffff));
    while (!fight.over && fight.turn < 2000) fight.step();
    finishFight(run, fight);
    if (run.over) break;
    const offers = draftOffers(run);
    const vals = offers.map((o) => { const r2 = cloneRun(run); applyOption(r2, o); return rollout(r2, cont, forkCont, R, rng); });
    const pol: Record<string, number> = {};
    for (const p of Object.keys(POLICIES)) pol[p] = offers.indexOf(POLICIES[p](run, offers, new Rng(collected)));
    rows.push({ depth: run.depth, hpFrac: run.player.hp / run.player.maxHp, gildsHeld: run.player.gilded.map((g) => `${g.enh}-${g.symbol}-r${g.reel + 1}`), relics: [...run.player.relics], offers: offers.map(optType), offersR: offers.map(optTypeReel), vals, pol });
    applyOption(run, offers[vals.indexOf(Math.max(...vals))]);
    collected++;
    if (collected % 25 === 0) process.stderr.write(`${collected} `);
  }
}
writeFileSync(`playtest/scratch/it3_dec_${contName}_${SEED}.json`, JSON.stringify({ R, rows, forkRows }));
console.log('saved', rows.length, forkRows.length);
