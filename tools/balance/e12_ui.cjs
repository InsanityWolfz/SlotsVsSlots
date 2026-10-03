// EXPERT_PLAYTEST_12 (throwaway): the 67b UI in the browser. Relic tooltips (draft, shop, fight HUD, next screen),
// LV/MAX badges under YOUR REELS, LV3 MAX level cards, short charm text, big choices with a maxed type.
//   npx vite --port 5182 &   then   node tools/balance/e12_ui.cjs <outDir> 5182
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const OUT = process.argv[2] || 'tools/out/e12';
const PORT = process.argv[3] || '5182';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => {
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, unlocked: ['knight', 'tesla', 'thorn', 'joker', 'midas'] }));
  });
  await p.goto(`http://localhost:${PORT}/`);
  await sleep(2500);
  await p.mouse.click(640, 400);
  await sleep(600);
  const shot = (name) => p.screenshot({ path: `${OUT}/${name}.png` });
  const game = (code) => p.evaluate((c) => new Function('g', 'dbg', c)(window.dbg.game, window.dbg), code);
  const log = [];
  // Hover every relic spot the run screens registered and screenshot each tip.
  const hoverTips = async (tag) => {
    const spots = await p.evaluate(() => (window.dbg.game.screens.tips.spots || []).map((s) => ({ relic: s.relic, x: s.x, y: s.y })));
    log.push(`${tag}: ${spots.length} relic spots: ${spots.map((s) => s.relic).join(',')}`);
    for (const [k, s] of spots.entries()) {
      // The canvas may be scaled: map game coords to page coords.
      const pt = await p.evaluate(({ x, y }) => {
        const c = document.querySelector('canvas');
        const r = c.getBoundingClientRect();
        return { x: r.left + (x * r.width) / 1280, y: r.top + (y * r.height) / 720 };
      }, s);
      await p.mouse.move(pt.x, pt.y);
      await sleep(250);
      if (k < 3) await shot(`${tag}_tip${k}_${s.relic}`);
    }
    await p.mouse.move(5, 5);
  };
  const setup = `
    g.menus.hide(); g.startRun(77, 'thorn', 2); const r = g.run; r.pendingStart = null; r.chosen = r.chosen.map(() => true);
    r.player.relics = ['bell', 'cactus', 'rosehip', 'toll', 'clover'];
    r.player.gilded = [{ reel: 0, symbol: 'sword', enh: 'vamp', n: 2 }, { reel: 1, symbol: 'shield', enh: 'gold', n: 2 }, { reel: 2, symbol: 'sword', enh: 'keen', n: 2 }];
    r.player.levels.charm = { vamp: 3, gold: 2, keen: 1 }; r.player.levels.sym = { thorn: 3, sword: 2 };
    r.player.chips = 40; r.depth = 2;`;
  await game(setup + ` g.screens.showNext(r);`);
  await sleep(800);
  await shot('01_next');
  await hoverTips('01_next');

  const run = await import('node:path'); void run;
  await game(`const r = g.run; return import('/src/core/run.ts').then((m) => { g.screens.showDraft(r, m.draftOffers(r), null, 'draft'); });`);
  await sleep(900);
  await shot('02_draft');
  await hoverTips('02_draft');

  await game(`const r = g.run; r.depth = 3; return import('/src/core/run.ts').then((m) => { g.screens.showShop(r, m.shopOffers(r)); });`);
  await sleep(900);
  await shot('03_shop');
  await hoverTips('03_shop');
  // Card texts in the shop (short charm text, LV3 MAX).
  const shopText = await game(`return g.screens.shopItems.map((i) => JSON.stringify(i.option));`);
  log.push(`shop items: ${shopText.join(' | ')}`);

  // A level card for a type at LV2 (gold): it should read LV3 MAX.
  await game(`const r = g.run; g.screens.showDraft(r, [{ kind: 'charmLevel', enh: 'gold' }, { kind: 'symLevel', symbol: 'sword' }, { kind: 'gild', enh: 'vamp', symbol: 'sword', reel: 1, n: 2 }], null, 'draft');`);
  await sleep(900);
  await shot('04_level_cards');

  // Big choices with VAMP and thorns maxed: POLISH should target gold/keen; WHETSTONE a symbol below the cap.
  const ch = await game(`const r = g.run; r.player.levels.charm = { vamp: 3, gold: 3, keen: 3 }; r.player.levels.sym = { thorn: 3, sword: 3, shield: 3 };
    return Promise.all([import('/src/core/run.ts'), import('/src/core/rng.ts')]).then(([m, q]) => { const out = []; for (let s = 0; s < 4; s++) { const cs = m.rollChoices(r, s, new q.Rng(s + 1)); out.push(cs.map((c) => c.id + (c.enh ? ':' + c.enh : '') + (c.symbol ? ':' + c.symbol : '')).join(',')); } return out; }).catch((e) => ['ERR ' + e]);`);
  log.push(`big choices, all maxed: ${JSON.stringify(ch)}`);

  // The fight HUD with five relics: hover the HUD relic slots.
  await game(`const r = g.run; r.player.levels.charm = { vamp: 3, gold: 2, keen: 1 }; g.screens.close && g.screens.close(); g.beginRunFight(0);`);
  await sleep(1500);
  await game(`dbg.pause && dbg.pause();`);
  await shot('05_fight');
  const slots = await p.evaluate(() => import('/src/present/layout.ts').then((m) => [0, 1, 2, 3, 4].map((i) => (m.relicSlot ? m.relicSlot(i) : null))).catch(() => []));
  log.push(`hud relic slots: ${JSON.stringify(slots)}`);
  for (const [k, s] of slots.entries()) {
    if (!s) continue;
    await p.mouse.move(s.x, s.y);
    await sleep(300);
    if (k < 2) await shot(`05_fight_tip${k}`);
  }
  console.log(log.join('\n'));
  if (errs.length) {
    console.log('PAGE ERRORS:\n' + errs.join('\n'));
    process.exitCode = 1;
  }
  await b.close();
})();
