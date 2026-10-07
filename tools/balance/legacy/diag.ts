// Per-machine fight profile: bare starting machine vs act 1 enemies (no drafting).
// npx tsx tools/balance/diag.ts [root] [N]   (root lets it run against an old worktree)
const root = process.argv[2] && !process.argv[2].match(/^\d+$/) ? process.argv[2] : '../..';
const N = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 300);
const { defaultConfig } = await import(root + '/src/core/config.ts');
const { createRun, fightConfig, chooseEnemy } = await import(root + '/src/core/run.ts');
const { Fight } = await import(root + '/src/core/fight.ts');
const { CABINET_ORDER } = await import(root + '/src/core/cabinets.ts');
for (const cab of CABINET_ORDER) {
  const t = { turns: 0, pDmg: 0, eDmg: 0, win: 0, heal: 0, src: {} as Record<string, number>, n: 0, lost: 0 };
  for (let i = 0; i < N; i++) {
    const run = createRun(defaultConfig(), 1000 + i, cab, 0);
    run.depth = 2;
    if (run.paths[2].length > 1) chooseEnemy(run, i % 2);
    const f = new Fight(fightConfig(run, defaultConfig()), 5000 + i);
    while (!f.over && f.turn < 400) {
      for (const e of f.step().events as any[]) {
        if ((e.type === 'attack' || e.type === 'specialFire' || e.type === 'potWin') && e.from === 'player') {
          t.pDmg += e.hpDamage;
          const k = e.type === 'specialFire' ? 'special' : e.note ?? 'sword';
          t.src[k] = (t.src[k] ?? 0) + e.hpDamage;
        }
        if ((e.type === 'attack' || e.type === 'potWin' || e.type === 'blast' || e.type === 'markedHit') && e.from !== 'player' && (e.to ?? e.side) === 'player') t.eDmg += e.hpDamage;
        if (e.type === 'heal' && e.side === 'player') t.heal += e.amount;
      }
    }
    t.turns += f.turn;
    t.n++;
    if (f.winner === 'player') t.win++;
    t.lost += (f.sides.player.maxHp - f.sides.player.hp) / f.sides.player.maxHp;
  }
  const pt = t.turns / 2;
  console.log(
    `${cab.padEnd(7)} win ${((100 * t.win) / t.n).toFixed(0).padStart(3)}%  turns ${(t.turns / t.n).toFixed(1)}  pDmg/turn ${(t.pDmg / pt).toFixed(1)}  eDmg/turn ${(t.eDmg / pt).toFixed(1)}  heal/turn ${(t.heal / pt).toFixed(1)}  hpLost ${((100 * t.lost) / t.n).toFixed(0)}%  src ${Object.entries(t.src).map(([k, v]) => `${k} ${((100 * v) / t.pDmg).toFixed(0)}%`).join(' ')}`,
  );
}
