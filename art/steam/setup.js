const E = await import('/src/core/enemies.ts'); const R = await import('/src/core/rng.ts');
window.scene = (cab, id, act = 1, seed = 7) => {
  const g = dbg.game; g.publicBuild = true; g.menus.hide();
  g.startRun(seed, cab, 0); const run = g.run; run.pendingStart = null;
  const boss = ['house', 'wheel', 'dealer', 'owner'].includes(id);
  const a = id === 'house' ? E.BOSS : id === 'wheel' ? E.WHEEL : id === 'dealer' ? E.DEALER : id === 'owner' ? E.OWNER : id === 'repo' ? E.REPO_MAN : E.ARCHETYPES.find((x) => x.id === id);
  if (boss) dbg.toBoss();
  run.enemies[run.depth] = E.makeEnemy(a, 0, new R.Rng(seed), boss, act);
  g.beginRunFight();
  return g.fight.sides.enemy.name;
};
return 'ok';
