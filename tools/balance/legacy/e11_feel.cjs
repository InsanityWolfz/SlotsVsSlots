// EXPERT_PLAYTEST_11 (throwaway): watch a JOKER fight holding the JACKPOT BELL at play speed; log the meter each half second.
const { chromium } = require('playwright');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = '/tmp/e11/feel';
const CAB = process.argv[2] || 'joker', RELIC = process.argv[3] || 'bell', FIGHT = Number(process.argv[4] || 0);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('framenavigated', () => console.log('NAV'));
  await p.addInitScript(() => {
    localStorage.setItem('slotvslot.profile.v1', JSON.stringify({ name: 'E11', xp: 400 * 13 * 12, stats: { runs: 30, wins: 9, dailies: 3 }, achievements: {}, challenges: {}, runs: [], found: { relics: [], charms: [] } }));
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, unlocked: ['knight', 'tesla', 'thorn', 'joker', 'midas'] }));
  });
  await p.goto('http://localhost:5182/');
  await sleep(2500);
  await p.mouse.click(640, 400);
  await sleep(600);
  const game = (code) => p.evaluate((c) => new Function('g', 'dbg', c)(window.dbg.game, window.dbg), code);
  await game(`g.menus.hide(); g.startRun(5, '${CAB}', 0); const r = g.run; r.pendingStart = null; if ('${RELIC}' !== '-') r.player.relics.push('${RELIC}'); r.chosen = r.chosen.map(() => true); r.depth = ${FIGHT}; g.beginRunFight(0);`);
  let last = '';
  const t0 = Date.now();
  for (let i = 0; i < 160; i++) {
    await sleep(500);
    const s = await game(`const f = g.fight; const pl = f.sides.player, en = f.sides.enemy; return [f.turn ?? '', pl.hp, pl.energy, pl.armed ? 'ARMED' : '', en.hp, f.over ? 'OVER' : ''].join(' ');`);
    if (s !== last) { console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', s); last = s; }
    if (i % 8 === 0) await p.screenshot({ path: `${OUT}/${CAB}_${String(i).padStart(3, '0')}.png` });
    if (s.endsWith('OVER')) break;
  }
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
