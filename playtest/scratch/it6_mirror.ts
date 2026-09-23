// THE MIRROR deep dive: fight length, how often REFLECTION actually fires, what kills you, telegraph accuracy,
// and what predicts a win.   npx tsx playtest/scratch/it6_mirror.ts [N]
import { Fight } from '../../src/core/fight';
import { TUNE } from '../../src/core/enemies';
import { REFLECT_MIN } from '../../src/core/relics';
import { fullSets } from '../../src/core/run';
import { avg, batch, CABINET_ORDER, pct, type Policy, type RunRec } from './it6_lib';

const N = Number(process.argv[2] ?? 800);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };

// Telegraph accuracy + per-turn trace, collected by wrapping Fight.step for mirror fights.
const tele = { shown: 0, exact: 0, under: 0, over: 0, diffs: [] as number[], firstFireTurn: [] as number[], spinsBeforeEnd: [] as number[] };
const trace: { turnsToKill: number; mirrorFirst: number; ownDmg: number[] }[] = [];
const hooks = {
  preFight: (run: any, fight: Fight) => {
    if (!fight.isMirror) return;
    const orig = fight.step.bind(fight);
    let pendingShown: number | null = null;
    (fight as any).step = () => {
      const r = orig();
      const e = fight.sides.enemy;
      const ab = e.ability!;
      // After the enemy's turn: if the countdown reads 1 ("REFLECTS NEXT TURN!"), record what the panel shows.
      if (r.side === 'enemy' && !fight.over && ab && ab.every - e.charge <= 1) {
        pendingShown = Math.max(REFLECT_MIN, Math.min(ab.power, fight.last.player.damage));
      }
      if (r.side === 'enemy') {
        const fire = r.events.find((ev) => ev.type === 'attack' && ev.note === 'reflect') as any;
        if (fire && pendingShown !== null) {
          tele.shown++;
          if (fire.amount === pendingShown) tele.exact++;
          else if (fire.amount > pendingShown) tele.under++;
          else tele.over++;
          tele.diffs.push(fire.amount - pendingShown);
        }
        if (fire) pendingShown = null;
      }
      return r;
    };
  },
};

const rows: string[] = [];
const allM: any[] = [];
for (const cab of CABINET_ORDER) {
  const rs: RunRec[] = batch(cab, { ...pol, hooks }, N, 777);
  const ms = rs.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2).map((f) => ({ f, r })));
  allM.push(...ms);
  const fires = ms.map(({ f }) => f.reflects.length);
  rows.push(
    `${cab.padEnd(7)} n ${String(ms.length).padStart(4)} win ${pct(ms.filter(({ f }) => f.won).length, ms.length)}%  turns ${avg(ms.map(({ f }) => f.turns)).toFixed(1)}  playerSpins ${avg(ms.map(({ f }) => f.spins)).toFixed(1)}  ` +
      `reflect fired 0x ${pct(fires.filter((x) => x === 0).length, ms.length)}% 1x ${pct(fires.filter((x) => x === 1).length, ms.length)}% 2+ ${pct(fires.filter((x) => x >= 2).length, ms.length)}%  ` +
      `mirrorHP ${avg(ms.map(({ f }) => f.enemyHp)).toFixed(0)} playerMax ${avg(ms.map(({ f }) => f.maxHp)).toFixed(0)}  maxSpin ${avg(ms.map(({ f }) => f.maxSpinDmg)).toFixed(0)}`,
  );
}
console.log(rows.join('\n'));
const ms = allM;
const lost = ms.filter(({ f }) => !f.won);
const killers: Record<string, number> = {};
for (const { f } of lost) killers[f.killer] = (killers[f.killer] ?? 0) + 1;
console.log(`\nMirror deaths by killing blow: ${Object.entries(killers).map(([k, v]) => `${k} ${pct(v, lost.length)}%`).join(' | ')}`);
const dmg: Record<string, number> = {};
for (const { f } of ms) for (const [k, v] of Object.entries(f.dmgBy)) dmg[k] = (dmg[k] ?? 0) + (v as number);
const tot = Object.values(dmg).reduce((a, b) => a + b, 0);
console.log(`Mirror HP damage to player by source: ${Object.entries(dmg).map(([k, v]) => `${k} ${pct(v, tot)}%`).join(' | ')}`);
const turnsHist: Record<string, number> = {};
for (const { f } of ms) { const k = f.turns <= 2 ? '1-2' : f.turns <= 4 ? '3-4' : f.turns <= 6 ? '5-6' : f.turns <= 8 ? '7-8' : f.turns <= 12 ? '9-12' : '13+'; turnsHist[k] = (turnsHist[k] ?? 0) + 1; }
console.log(`Mirror fight length (total turns): ${['1-2', '3-4', '5-6', '7-8', '9-12', '13+'].map((k) => `${k}: ${pct(turnsHist[k] ?? 0, ms.length)}%`).join('  ')}`);
console.log(`Mirror cracked (reached half HP alive) ${pct(ms.filter(({ f }) => f.shatter).length, ms.length)}%`);
console.log(`Deaths before the first Reflection ever fired: ${pct(lost.filter(({ f }) => f.reflects.length === 0).length, lost.length)}% of Mirror deaths`);
console.log(`Telegraph ('REFLECTS NEXT TURN!' number vs what hit): shown ${tele.shown}, exact ${pct(tele.exact, tele.shown)}%, hit harder ${pct(tele.under, tele.shown)}%, hit softer ${pct(tele.over, tele.shown)}%, mean |diff| ${avg(tele.diffs.map(Math.abs)).toFixed(1)}`);
console.log(`Reflection amounts: mean ${avg(ms.flatMap(({ f }) => f.reflects)).toFixed(1)}  at cap (${20}) ${pct(ms.flatMap(({ f }) => f.reflects).filter((x: number) => x >= 20).length, ms.flatMap(({ f }) => f.reflects).length)}%  at min ${pct(ms.flatMap(({ f }) => f.reflects).filter((x: number) => x <= 3).length, ms.flatMap(({ f }) => f.reflects).length)}%`);

// What predicts a win?
const by = (label: string, key: (m: any) => string) => {
  const g: Record<string, [number, number]> = {};
  for (const m of ms) { const k = key(m); const e = (g[k] ??= [0, 0]); e[0]++; if (m.f.won) e[1]++; }
  console.log(`${label}: ${Object.entries(g).sort().map(([k, [n, w]]) => `${k} ${pct(w, n)}% (n${n})`).join(' | ')}`);
};
by('win by legendary', (m) => m.r.legend ?? 'none');
by('win by full sets at mirror', (m) => String(m.r.setsAtMirror.length));
by('win by set kind', (m) => m.r.setsAtMirror.join('+') || 'none');
by('win by player max HP', (m) => (m.f.maxHp < 30 ? '<30' : m.f.maxHp < 36 ? '30-35' : m.f.maxHp < 42 ? '36-41' : '42+'));
by('win by relics held', (m) => String(Math.min(8, m.f.relics)));
by('win by HP in (% of max)', (m) => (m.f.hpBefore / m.f.maxHp >= 0.95 ? 'full' : m.f.hpBefore / m.f.maxHp >= 0.75 ? '75-95' : '<75'));
void TUNE; void fullSets;
