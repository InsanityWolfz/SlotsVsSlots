// Layout check: screenshots of the screens that have collided before, for a human (or agent) to look at before a layout
// change ships (EXPERT_PLAYTEST_10 D2). Needs a dev server (window.dbg):
//   npx vite --port 5190 &   then   node tools/shots/screens.cjs [outDir] [port]
// Writes PNGs to outDir (default tools/out/shots). Exits non-zero on any page error.
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const OUT = process.argv[2] || 'tools/out/shots';
const PORT = process.argv[3] || '5190';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const VETERAN = {
  found: { relics: ['clover', 'battery'], charms: ['gold'] },
  name: 'LAYOUT-CHK',
  xp: 400 * 13 * 12,
  stats: { runs: 30, wins: 9, dailies: 3 },
  achievements: { first_win: 1, house: 1, clear: 1 },
  challenges: { glass: { best: 2500, won: true, tries: 2 } },
  runs: [],
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript((v) => {
    localStorage.setItem('slotvslot.profile.v1', JSON.stringify(v));
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, unlocked: ['knight', 'tesla', 'thorn', 'joker', 'midas'] }));
  }, VETERAN);
  await p.goto(`http://localhost:${PORT}/`);
  await sleep(2500);
  await p.mouse.click(640, 400);
  await sleep(600);
  const shot = async (name) => p.screenshot({ path: `${OUT}/${name}.png` });
  const game = (code) => p.evaluate((c) => new Function('g', 'dbg', c)(window.dbg.game, window.dbg), code);

  await shot('01_main');
  await p.mouse.click(640, 504);
  await sleep(500);
  await shot('02_challenges');
  await game('g.showMenu()');
  await sleep(300);
  await p.mouse.click(640 + 0.5 * 97, 566);
  await sleep(500);
  await shot('03_trophies');
  await game('g.chooseCabinet()');
  await sleep(600);
  await shot('04_machine_select');

  // THE REPO MAN's preview, then the between-fights screens with two liens held, then the boss preview.
  await game(`g.menus.hide(); g.startRun(3, 'midas', 0); const r = g.run; r.pendingStart = null; r.chosen = r.chosen.map(() => true); r.depth = 3; g.screens.showNext(r);`);
  await sleep(700);
  await shot('05_repo_preview');
  await game(`const r = g.run; r.depth = 4; r.liens = [{ reel: 0, symbol: 'sword', enh: 'gold' }, { reel: 1, symbol: 'shield' }]; g.screens.showNext(r);`);
  await sleep(700);
  await shot('06_next_with_liens');
  await game(`const r = g.run; r.depth = 5; g.screens.showNext(r);`);
  await sleep(700);
  await shot('07_boss_preview_liens');

  // A loss at the House on a first-time-ish profile: the death recap + a machine unlock under the table, then RESULTS.
  await game(`g.prefs.unlocked = ['knight']; g.menus.hide(); g.startRun(11, 'knight', 0); const r = g.run; r.pendingStart = null; r.chosen = r.chosen.map(() => true); r.depth = 5; g.beginRunFight(0);`);
  await sleep(1500);
  await game(`g.setSpeed(8); g.fight.sides.player.hp = 1; g.fight.sides.player.shield = 0; g.fight.sides.enemy.hp = 99999;`);
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await p.evaluate(() => window.dbg.game.screens.mode === 'over')) break;
  }
  // Force the worst case under the table: a death recap and two unlocks (two stacked lines).
  await game(`const r = g.run; const rec = r.records[r.records.length - 1]; rec.hurt = [['SPIN HITS', 60], ['THE POT', 40]]; rec.stuck = [5, 9]; g.screens.setUnlockedNow(['tesla', 'thorn']); g.screens.showOver(r);`);
  await sleep(2500);
  await shot('08_results_card');
  await p.mouse.click(640, 400);
  await sleep(300);
  if (await p.evaluate(() => !!window.dbg.game.screens.results)) await p.mouse.click(640, 400);
  await sleep(400);
  await shot('09_runover_loss_unlock');

  await game('g.showMenu()');
  await sleep(300);
  await p.mouse.click(640 + 1.5 * 97, 566);
  await sleep(500);
  await shot('10_hiscores');

  console.log(`wrote ${OUT}/01..10 PNGs`);
  if (errs.length) {
    console.log(errs.join('\n'));
    process.exitCode = 1;
  }
  await b.close();
})();
