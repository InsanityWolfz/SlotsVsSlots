// Expert playtest 4 (throwaway): the Dealer as a finale, plus act 3 grading. npx tsx tools/balance/expert4_dealer.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../src/core/run';
const N = Number(process.argv[2] ?? 300);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; };
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
for (const id of CABINET_ORDER as CabinetId[]) {
  const d = { n: 0, lost: 0, turns: [] as number[], big: [] as number[], allInPct: [] as number[], cards: {} as Record<string, number>, lossWithBig: 0, lossAfterAllIn: 0, hpLeft: [] as number[], enemyActsBeforeDeath: 0 };
  const a3 = { n: 0, noEnemyTurn: 0, cover: 0, lost: [] as number[] };
  const arrival: number[] = []; // HP% into the Dealer for ALL act 3 entrants (dead = 0)
  SIM_BIAS.onEnd = (run: RunState) => {
    const entered = run.records.some((r) => r.act === 3);
    if (!entered) return;
    const dealerRec = run.records.find((r) => r.act === 3 && r.archetype === 'dealer');
    arrival.push(dealerRec ? dealerRec.hpBefore / run.player.maxHp : 0);
  };
  SIM_BIAS.onFight = (run: RunState) => {
    if (run.act !== 3 || run.endless) return;
    const cfg = fightConfig(run, defaultConfig());
    const f = new Fight(cfg, (run.seed ^ 0x4242 ^ run.depth) >>> 0);
    const max = run.player.maxHp;
    const hp0 = f.sides.player.hp;
    if (cfg.enemy.boss === 'dealer') {
      let big = 0;
      let lastBigAllIn = false;
      while (!f.over && f.turn < 2000) {
        const before = f.sides.player.hp;
        const { side, events } = f.step();
        for (const ev of events) {
          if (ev.type === 'lineCard') d.cards[ev.card] = (d.cards[ev.card] ?? 0) + 1;
          if (ev.type === 'allInHit') d.allInPct.push(ev.hpDamage / max);
        }
        if (side === 'enemy') {
          const t = (before - f.sides.player.hp) / max;
          big = Math.max(big, t);
          if (f.sides.player.hp <= 0) lastBigAllIn = events.some((e) => e.type === 'allInHit');
        }
      }
      d.n++;
      d.turns.push(f.turn);
      d.big.push(big);
      if (f.winner === 'enemy') { d.lost++; if (big >= 0.4) d.lossWithBig++; if (lastBigAllIn) d.lossAfterAllIn++; }
      else d.hpLeft.push(f.sides.player.hp / max);
    } else if (!cfg.enemy.boss) {
      let enemyTurns = 0;
      let cover = false;
      while (!f.over && f.turn < 2000) {
        const { side, events } = f.step();
        if (side === 'enemy') enemyTurns++;
        if (events.some((e) => e.type === 'coverCharge')) cover = true;
      }
      a3.n++;
      if (enemyTurns === 0) a3.noEnemyTurn++;
      if (cover) a3.cover++;
      a3.lost.push(Math.max(0, hp0 - Math.max(0, f.sides.player.hp)) / max);
    }
  };
  simulateRuns(defaultConfig(), N, 'greedy', 4242, id, 2, true);
  const cards = Object.values(d.cards).reduce((x, y) => x + y, 0);
  console.log(`${id.padEnd(7)} DEALER n ${d.n} lost ${pct(d.lost, d.n)}%  turns p50 ${q(d.turns, 0.5)} p90 ${q(d.turns, 0.9)}  biggest turn p50 ${(100 * q(d.big, 0.5)).toFixed(0)}% p90 ${(100 * q(d.big, 0.9)).toFixed(0)}%  losses w/ >=40% turn ${pct(d.lossWithBig, d.lost)}%  killing blow = ALL IN ${pct(d.lossAfterAllIn, d.lost)}%  ALL IN hp dmg p50 ${(100 * q(d.allInPct, 0.5)).toFixed(0)}% p90 ${(100 * q(d.allInPct, 0.9)).toFixed(0)}% (n ${d.allInPct.length})  winners' HP left p50 ${(100 * q(d.hpLeft, 0.5)).toFixed(0)}%  cards ${Object.entries(d.cards).map(([k, v]) => `${k} ${pct(v, cards)}%`).join(' ')}`);
  console.log(`${id.padEnd(7)} ACT3 regulars n ${a3.n}  enemy never took a turn ${pct(a3.noEnemyTurn, a3.n)}%  cover charge landed ${pct(a3.cover, a3.n)}%  HP lost p25 ${(100 * q(a3.lost, 0.25)).toFixed(0)}% p50 ${(100 * q(a3.lost, 0.5)).toFixed(0)}% p90 ${(100 * q(a3.lost, 0.9)).toFixed(0)}%`);
  console.log(`${id.padEnd(7)} HP into the Dealer, all act 3 entrants (dead = 0): p25 ${(100 * q(arrival, 0.25)).toFixed(0)}% p50 ${(100 * q(arrival, 0.5)).toFixed(0)}% p75 ${(100 * q(arrival, 0.75)).toFixed(0)}%  reached ${pct(arrival.filter((x) => x > 0).length, arrival.length)}%`);
}
