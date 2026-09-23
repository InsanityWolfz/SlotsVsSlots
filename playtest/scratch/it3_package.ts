// Test proposed Package I variants via hooks (no src edits). npx tsx playtest/scratch/it3_package.ts [runs] [variants,comma]
import { RUN_FIGHTS, ELITE_HP_MUL } from '../../src/core/enemies';
import { BANDAGE_HEAL, POT } from '../../src/core/relics';
import { RUN } from '../../src/core/run';
import { BASE, FORKS, POLICIES, playFight, Rng, createRun, chooseEnemy, draftOffers, applyOption, fightConfig, finishFight, needsChoice, Fight, type Picker, type ForkPicker } from './it3_lib';
import type { RunState } from '../../src/core/run';

const N = Number(process.argv[2] ?? 3000);
const pick = process.argv[3]?.split(',');

const NEWDANGER: Record<string, number> = { brute: 20, thief: 13, gremlin: 12, frost: 8, slime: 5, golem: 4 };
type V = { recal?: boolean; eliteMul?: number; eliteNoHeal?: boolean; cashFirst?: boolean; bossPerRelic?: number; eliteHeal?: boolean };
const VARIANTS: Record<string, V> = {
  current: {},
  recal: { recal: true },
  'recal+x1.4': { recal: true, eliteMul: 1.4 },
  'recal+noHeal': { recal: true, eliteNoHeal: true },
  'recal+noHeal+x1.4': { recal: true, eliteNoHeal: true, eliteMul: 1.4 },
  cashFirst: { cashFirst: true },
  'boss+2/relic': { bossPerRelic: 2 },
  'I: recal+noHeal+cashFirst+boss2/relic': { recal: true, eliteNoHeal: true, cashFirst: true, bossPerRelic: 2 },
  'J: recal+cashFirst+boss3/relic': { recal: true, cashFirst: true, bossPerRelic: 3 },
  'J2: recal+x1.3+cashFirst+boss3/relic': { recal: true, eliteMul: 1.3, cashFirst: true, bossPerRelic: 3 },
  'J3: recal+cashFirst+boss2/relic': { recal: true, cashFirst: true, bossPerRelic: 2 },
  'I2: recal+x1.4+noHeal+cashFirst+boss2/relic': { recal: true, eliteNoHeal: true, eliteMul: 1.4, cashFirst: true, bossPerRelic: 2 },
};

let CASH_FIRST = false;
const origStep = Fight.prototype.step;
(Fight.prototype as any).step = function (this: any) {
  if (CASH_FIRST && this.isBoss && this.next === 'enemy' && !this.over) {
    const me = this.sides.enemy;
    if (me.charge === me.ability.every - 1) {
      const events: any[] = [];
      this.cashPot(me, this.sides.player, events);
      me.charge = -1;
      if (this.over) { this.turn++; return { turn: this.turn, side: 'enemy', events }; }
    }
  }
  return origStep.call(this);
};

function adjust(run: RunState, v: V) {
  for (let d = 0; d < run.paths.length; d++) {
    const opts = run.paths[d];
    if (opts.length < 2) continue;
    for (const o of opts) if (o.elite) { o.hp = Math.round(o.hp / ELITE_HP_MUL); o.elite = false; }
    const table = v.recal ? NEWDANGER : { slime: 5, frost: 8, golem: 4, gremlin: 6, thief: 33, brute: 16 } as Record<string, number>;
    const e = opts.reduce((a, b) => ((table[b.archetype] ?? 0) > (table[a.archetype] ?? 0) ? b : a));
    e.elite = true; e.hp = Math.round(e.hp * (v.eliteMul ?? ELITE_HP_MUL));
  }
  run.enemies = run.paths.map((o) => o[0]);
}

function play(seed: number, picker: Picker, fork: ForkPicker, pr: Rng, fr: Rng, v: V) {
  const run = createRun(BASE, seed);
  adjust(run, v);
  let bossTurns = -1; let relicsIn = 0, gildsIn = 0, bossWon = -1, deathDepth = -1, lethalWarned = 0, potDeath = 0;
  let eliteN = 0;
  while (!run.over) {
    if (needsChoice(run)) { chooseEnemy(run, fork(run, pr)); if (run.enemies[run.depth].elite) eliteN++; }
    if (run.depth === RUN_FIGHTS) {
      relicsIn = run.player.relics.length; gildsIn = run.player.gilded.length;
      if (v.bossPerRelic) run.enemies[run.depth] = { ...run.enemies[run.depth], hp: run.enemies[run.depth].hp + v.bossPerRelic * relicsIn };
    }
    const e = run.enemies[run.depth];
    CASH_FIRST = !!v.cashFirst;
    const fight = new Fight(fightConfig(run, BASE), fr.int(0xffffffff));
    const depth = run.depth;
    const ff = playFight(fight, e.archetype, depth, !!e.elite);
    if (e.isBoss) { bossTurns = ff.turns; bossWon = ff.won ? 1 : 0; if (!ff.won && ff.killer === 'pot') { potDeath = 1; if (ff.lethalCashouts > 0) lethalWarned = 1; } }
    finishFight(run, fight);
    if (!run.over && e.elite && v.eliteNoHeal) {
      run.player.hp = Math.min(run.player.maxHp, fight.sides.player.hp + (run.player.relics.includes('bandage') ? BANDAGE_HEAL : 0));
    }
    if (run.over && !run.won) deathDepth = depth;
    if (!run.over) { const offers = draftOffers(run); applyOption(run, picker(run, offers, pr)); }
  }
  return { bossTurns, won: run.won, deathDepth, relicsIn, gildsIn, bossWon, eliteN, potDeath, lethalWarned };
}

for (const [name, v] of Object.entries(VARIANTS)) {
  if (pick && !pick.includes(name)) continue;
  const row: string[] = [];
  let detail = '';
  for (const [dp, fp] of [['greedy', 'sim'], ['greedy', 'safe'], ['greedy', 'elite'], ['greedy', 'eliteIfHealthy'], ['hpFirst', 'sim'], ['gildFirst', 'sim'], ['random', 'random']] as const) {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    let w = 0; const deaths = Array(6).fill(0);
    const byRelic: Record<number, [number, number]> = {};
    let pd = 0, lw = 0; const bt: number[] = [];
    for (let i = 0; i < N; i++) {
      const r = play(seeds.int(0xffffffff), POLICIES[dp], FORKS[fp], pr, fr, v);
      if (r.won) w++; else deaths[r.deathDepth]++;
      if (r.bossWon >= 0) { const b = (byRelic[Math.min(r.relicsIn, 6)] ??= [0, 0]); b[0]++; b[1] += r.bossWon; }
      pd += r.potDeath; lw += r.lethalWarned; if (r.bossTurns > 0) bt.push(r.bossTurns);
    }
    row.push(`${dp}/${fp} ${(100 * w / N).toFixed(1)}`);
    if (dp === 'greedy' && (fp === 'sim' || fp === 'elite')) detail += `\n    ${fp}: deaths ${deaths.map((d) => (100 * d / N).toFixed(1)).join('/')}; boss win by relics-in ${Object.entries(byRelic).map(([k, [n, b]]) => `${k}:${(100 * b / n).toFixed(0)}%(${n})`).join(' ')}; boss turns ${(bt.reduce((a, b) => a + b, 0) / bt.length).toFixed(1)}; pot deaths warned by LETHAL ${(100 * lw / Math.max(1, pd)).toFixed(0)}% of ${pd}`;
  }
  console.log(`${name.padEnd(44)} ${row.join('  ')}${detail}`);
}
void RUN; void POT;
