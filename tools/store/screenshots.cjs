// Steam store screenshots (2026-11-05): the game's real screens at 2560x1440 (2x, whole pixels), set up through
// window.dbg so each one lands on its moment. The dev build's TUNE button is hidden; nothing else is staged.
// Needs a dev server:   npx vite --port 5190 &   then   node tools/store/screenshots.cjs [outDir] [port]
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const OUT = process.argv[2] || 'tools/out/store';
const PORT = process.argv[3] || '5190';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => {
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, speed: 2, unlocked: ['knight', 'tesla', 'jukebox', 'joker', 'midas'] }));
  });
  await p.goto(`http://localhost:${PORT}/`);
  await sleep(3000);
  const ev = (code) => p.evaluate(new Function('return (async () => {' + code + '})()'));
  const wait = 'const w=(ms)=>new Promise(r=>setTimeout(r,ms));';
  const hideTune = `for (const b of dbg.game.buttons) if (b.label === 'TUNE') b.visible = false;`;
  // The dev build's TUNE button stays hidden (its row is rebuilt every screen), and no focus ring shows in a shot.
  await ev(`setInterval(() => { for (const b of dbg.game.buttons) if (b.label === 'TUNE') b.visible = false; }, 10);`);
  const shot = async (name) => {
    await ev(`dbg.game.focus.hide(); await new Promise(r=>setTimeout(r,60));`);
    await p.screenshot({ path: `${OUT}/${name}.png` });
    console.log(name);
  };
  const run = (seed, cab, stake) => ev(`${wait} const g=dbg.game; dbg.run(${seed},'${cab}',${stake}); g.skipTutorial?.(); await w(900); return g.phase`);

  // In a run: press on (A / Enter) until `done` holds, picking whatever is focused (for walking between screens).
  const pressUntil = (done, max = 40) => ev(`${wait} const g=dbg.game; for (let i=0;i<${max};i++){ if (${done}) return true; g.key('enter'); await w(700); } return ${done};`);
  // A boss fight in a real run (the boss's card, FIGHT!, then into the fight).
  const toBoss = () => ev(`${wait} const g=dbg.game; dbg.toBoss(); await w(1400); g.key('enter'); await w(500); g.key('enter'); await w(2600); ${hideTune}`);

  // 1. A jackpot: the pay climbs over the alley.
  await run(11, 'knight', 0);
  await pressUntil(`g.phase === 'fighting' && g.awaitingSpin`);
  await ev(`${wait} ${hideTune} await w(600); dbg.force('player',['sword','sword','sword']); dbg.game.key(' '); await w(1700);`);
  await shot('shot1_jackpot');

  // 2. A mid-run reward: the draft after that win.
  await ev(`${wait} dbg.forceWin(); dbg.game.key(' '); await w(4500);`);
  await pressUntil(`g.screens.active && g.screens.mode === 'draft'`);
  await ev(`${wait} await w(1500);`);
  await shot('shot2_draft');

  // 3. THE HOUSE: its pot.
  await run(12, 'tesla', 0);
  await toBoss();
  await ev(`${wait} for (let i=0;i<2;i++){ dbg.force('enemy',['coin','coin','sword']); dbg.game.key(' '); await w(4200); }`);
  await shot('shot3_house');

  // 4. THE WHEEL (act 2): chips bet on your reels. Beat THE HOUSE first.
  await ev(`${wait} dbg.forceWin(); dbg.game.key(' '); await w(5000);`);
  await pressUntil(`g.run && g.run.act === 2 && g.screens.active && g.screens.mode === 'next'`, 60);
  await toBoss();
  await ev(`${wait} dbg.game.key(' '); await w(3800); for (let i=0;i<30 && !(dbg.game.fight.bets.reduce((a,b)=>a+b,0) > 0);i++) await w(200); await w(900);`);
  await shot('shot4_wheel');

  // 5. The next fight's card over the act's map.
  await run(31, 'joker', 0);
  await ev(`${wait} await w(600);`);
  await pressUntil(`g.screens.active && g.screens.mode === 'next'`);
  await ev(`${wait} await w(1500);`);
  await shot('shot5_next');

  // 6. The Cashier.
  await run(41, 'midas', 0);
  await ev(`${wait} dbg.shop(); await w(1800);`);
  await shot('shot6_cashier');

  // 7. CHOOSE YOUR MACHINE.
  await ev(`${wait} const g=dbg.game; g.chooseCabinet(); await w(1500);`);
  await shot('shot7_machines');

  if (errs.length) {
    console.error(errs.join('\n'));
    process.exit(1);
  }
  await b.close();
})();
