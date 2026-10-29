// Fight length (roadmap phase 0, 2026-10-29): spins a fight by act and kind, the long fights (who and what build), the
// biggest enemy turn as a share of your max HP, and spins a decision. A "spin" is one of yours (fight.turn counts both).
//   npx tsx tools/sim/length.ts [runs] [stakes] [rush|turtle] [overtime]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { playRun } from '../../src/sim/play';

const runs = +(process.argv[2] ?? 300);
const stakes = (process.argv[3] ?? '0,2').split(',').map(Number);
const style = (process.argv[4] ?? 'rush') as 'rush' | 'turtle';
const overtime = process.argv[5] === 'overtime';
const base = defaultConfig();
type F = { cab: string; stake: number; act: number; kind: string; arch: string; spins: number; won: boolean; shieldShare: number; heal: number; shield: number; maxHit: number; dealt: number };
const fights: F[] = [];
const perRun: { cab: string; stake: number; spins: number; decisions: number; won: boolean; maxFight: number }[] = [];
for (const cab of CABINET_ORDER) for (const stake of stakes) for (let i = 0; i < runs; i++) {
  let cur: F | null = null;
  let prevHp = 0, side = 'player';
  const mine: F[] = [];
  const log = playRun(base, 10_000 + i, cab, stake, {
    act3: stake >= 2,
    style,
    setup: overtime ? (run) => (run.overtime = true) : undefined,
    onFight: (run) => {
      const cells = run.player.strips.reduce((a, s) => a + Object.values(s).reduce((x, y) => x + (y ?? 0), 0), 0);
      const sh = run.player.strips.reduce((a, s) => a + (s.shield ?? 0), 0);
      cur = { cab, stake, act: run.act, kind: '', arch: '', spins: 0, won: false, shieldShare: sh / Math.max(1, cells), heal: 0, shield: 0, maxHit: 0, dealt: 0 };
      mine.push(cur);
      prevHp = run.player.hp;
    },
    onEvents: (events, run, fight) => {
      if (!cur) return;
      for (const e of events) {
        if (e.type === 'turnStart') { side = e.side; if (e.side === 'player') cur.spins++; }
        if (e.type === 'heal' && e.side === 'player') cur.heal += e.amount / run.player.maxHp;
        if (e.type === 'shieldGain' && e.side === 'player') cur.shield += e.amount / run.player.maxHp;
      }
      if (side === 'enemy') {
        // HP lost to this enemy turn (heals in the same turn would hide some; rare).
        const lost = (prevHp - Math.max(0, fight.sides.player.hp)) / run.player.maxHp;
        cur.maxHit = Math.max(cur.maxHit, lost);
      }
      prevHp = Math.max(0, fight.sides.player.hp);
    },
  });
  log.fights.forEach((f, k) => { if (mine[k]) Object.assign(mine[k], { kind: f.kind, arch: f.archetype, won: f.won }); });
  fights.push(...mine.slice(0, log.fights.length));
  const spins = mine.reduce((a, f) => a + f.spins, 0);
  const won = log.fights.filter((f) => f.won).length;
  // Decisions: a pick after every won fight (draft, spoils or legendary), each route pick, each encounter, each Cashier (~1 an act).
  const decisions = 1 + won + log.routes.length + log.encounters.length + log.act;
  perRun.push({ cab, stake, spins, decisions, won: log.won, maxFight: Math.max(...mine.map((f) => f.spins)) });
}
const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
const r1 = (x: number) => Math.round(x * 10) / 10;
console.log(`runs ${runs} a machine a stake; a "spin" is one of your spins (fight.turn counts both sides)\n`);
for (const stake of stakes) {
  console.log(`== stake ${stake} ==`);
  console.log('machine   act kind   n    median p90  max  <=2 spins  >12 spins  >6 spins');
  for (const cab of CABINET_ORDER) for (const act of [1, 2, 3]) for (const kind of ['fight', 'elite', 'boss']) {
    const fs = fights.filter((f) => f.cab === cab && f.stake === stake && f.act === act && f.kind === kind);
    if (!fs.length) continue;
    const s = fs.map((f) => f.spins);
    console.log(`${cab.padEnd(9)} ${act}   ${kind.padEnd(6)} ${String(fs.length).padEnd(5)}${String(q(s, 0.5)).padEnd(7)}${String(q(s, 0.9)).padEnd(5)}${String(Math.max(...s)).padEnd(5)}${(pct(s.filter((x) => x <= 2).length, s.length) + '%').padEnd(11)}${(pct(s.filter((x) => x > 12).length, s.length) + '%').padEnd(11)}${pct(s.filter((x) => x > 6).length, s.length)}%`);
  }
  const rs = perRun.filter((r) => r.stake === stake);
  for (const cab of CABINET_ORDER) {
    const c = rs.filter((r) => r.cab === cab);
    console.log(`  ${cab}: run win ${pct(c.filter((r) => r.won).length, c.length)}%, spins a decision median ${r1(q(c.map((r) => r.spins / r.decisions), 0.5))}, longest fight a run median ${q(c.map((r) => r.maxFight), 0.5)} p90 ${q(c.map((r) => r.maxFight), 0.9)}`);
  }
  // Long fights: who and what build.
  const all = fights.filter((f) => f.stake === stake && f.kind !== 'boss');
  const long = all.filter((f) => f.spins > 12), rest = all.filter((f) => f.spins <= 12);
  const mean = (xs: F[], k: keyof F) => r1((100 * xs.reduce((a, f) => a + (f[k] as number) / (k === 'shieldShare' ? 1 : Math.max(1, f.spins)), 0)) / Math.max(1, xs.length));
  console.log(`  non-boss fights >12 spins: ${long.length} of ${all.length}. shield share of reels ${mean(long, 'shieldShare')}% vs ${mean(rest, 'shieldShare')}%; heal ${mean(long, 'heal')}% vs ${mean(rest, 'heal')}% max HP a spin; shield gained ${mean(long, 'shield')}% vs ${mean(rest, 'shield')}% a spin`);
  const by = (k: 'cab' | 'arch') => Object.entries(long.reduce((m, f) => ((m[f[k]] = (m[f[k]] ?? 0) + 1), m), {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, c]) => `${n} ${c}`).join(', ');
  console.log(`  long by machine: ${by('cab')}\n  long by enemy: ${by('arch')}`);
  const bossLong = fights.filter((f) => f.stake === stake && f.kind === 'boss' && f.spins > 12);
  console.log(`  bosses >12 spins: ${bossLong.length} of ${fights.filter((f) => f.stake === stake && f.kind === 'boss').length}; by machine ${Object.entries(bossLong.reduce((m, f) => ((m[f.cab + ' a' + f.act] = (m[f.cab + ' a' + f.act] ?? 0) + 1), m), {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, c]) => `${n} ${c}`).join(', ')}`);
  const hits = fights.filter((f) => f.stake === stake);
  const reg = hits.filter((f) => f.kind !== 'boss').map((f) => f.maxHit), bs = hits.filter((f) => f.kind === 'boss').map((f) => f.maxHit);
  console.log(`  biggest enemy turn (share of your max HP): regular p50 ${r1(100 * q(reg, 0.5))}% p99 ${r1(100 * q(reg, 0.99))}% max ${r1(100 * Math.max(...reg))}%; boss p50 ${r1(100 * q(bs, 0.5))}% p99 ${r1(100 * q(bs, 0.99))}% max ${r1(100 * Math.max(...bs))}%\n`);
}
