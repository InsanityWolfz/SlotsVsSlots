// The fight-UI stress harness (user, 2026-11-10: "take a screen where you're triggering every single UI label and
// element at once... see what's overlapping"). Dev only: it drives the dev build through window.dbg and the layout
// probe (dbg.probe), and writes to tools/out/ui (not committed).
//   npx vite --port 5182 --strictPort &
//   node tools/shots/fight/scan.cjs <tag> ["" k/n]   long fights, every machine x boss / trick: which words collide
//   node tools/shots/fight/merge.cjs <tag>           -> tools/out/ui/scan_<tag>.txt, one line per kind of collision
//   node tools/shots/fight/scenes.cjs <tag>          scripted stress scenes: each turn's worst frame at 2x
//   node tools/shots/fight/strip.cjs <tag>           a long win chain as frame strips, and how long turns take
//   node tools/shots/fight/signs.cjs [shots]         where each room's own signs are
// A collision filed as pop:<kind> involves a banner mid-pop (its entrance overshoot): a moment's edge, not a rest.
// Known false alarms: a number on a reel cell that is scrolling outside the reel window (the probe can't see the clip).
const path = require('node:path');
const BASE = path.join(__dirname, '../../out/ui');
require('node:fs').mkdirSync(BASE, { recursive: true });
const { chromium } = require('playwright');
const PORT = process.env.PORT || '5182';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open({ width = 1280, height = 720, dsf = 2 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.addInitScript(() => {
    localStorage.setItem(
      'slotvslot.prefs.v2',
      JSON.stringify({ tutorialDone: true, muted: true, unlocked: ['knight', 'tesla', 'jukebox', 'joker', 'midas'], paylineHints: 99 }),
    );
  });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.dbg, null, { timeout: 15000 });
  await sleep(1200);
  return { browser, page, errs };
}

/**
 * Start a run fight. sc: { cab, stake, act, endless, boss, enemy, relics, gilded, levels, chips, auto, speed, seed, hp, foeHp }
 * The game's own frame loop keeps drawing, but its update is handed to the harness (window.__step(sec)), so every scene
 * is stepped deterministically.
 */
async function setup(page, sc) {
  await page.evaluate(async (sc) => {
    const dbg = window.dbg;
    const g = dbg.game;
    if (!window.__real) {
      window.__real = g.update.bind(g);
      g.update = () => {};
      // A macrotask between frames, so the fight's awaits run (as they do between real frames).
      const ch = new MessageChannel();
      let wake = null;
      ch.port1.onmessage = () => wake && wake();
      window.__yield = () => new Promise((r) => ((wake = r), ch.port2.postMessage(0)));
      window.__step = async (sec) => {
        for (let i = 0; i < Math.round(sec * 60); i++) {
          window.__real(1 / 60);
          await window.__yield();
        }
      };
    }
    const E = await import('/src/core/enemies.ts');
    const R = await import('/src/core/rng.ts');
    g.menus.hide();
    g.prefs.auto = !!sc.auto;
    g.prefs.speed = sc.speed ?? 2;
    g.prefs.paylineHints = 99;
    g.prefs.metersExplained = ['knight', 'tesla', 'midas', 'joker', 'jukebox'];
    g.startRun(sc.seed ?? 7, sc.cab ?? 'knight', sc.stake ?? 0);
    const r = g.run;
    r.pendingStart = null;
    r.tutorial = false;
    if (sc.relics) r.player.relics = [...sc.relics];
    if (sc.chips !== undefined) r.player.chips = sc.chips;
    if (sc.gilded) r.player.gilded = sc.gilded.map((x) => ({ ...x }));
    if (sc.levels) Object.assign(r.player.levels.sym, sc.levels);
    if (sc.maxHp) r.player.maxHp = r.player.hp = sc.maxHp;
    if (sc.endless) dbg.endless(sc.endless);
    else dbg.act(sc.act ?? 1);
    if (sc.boss) dbg.toBoss();
    if (sc.enemy) {
      const a = sc.enemy === 'repo' ? E.REPO_MAN : E.ARCHETYPES.find((x) => x.id === sc.enemy);
      const e = E.makeEnemy(a, r.depth || 2, new R.Rng(5), false, sc.endless ? 3 : (sc.act ?? 1));
      if (sc.elite) e.elite = true;
      r.enemies[r.depth] = e;
    }
    g.beginRunFight();
    if (g.coach.active) g.coach.skipAll();
    if (g.stage.entrance) g.skipEntrance();
    await window.__step(0.5);
    const f = g.fight;
    if (sc.foeHp) {
      f.sides.enemy.maxHp = f.sides.enemy.hp = sc.foeHp;
      Object.assign(g.stage.huds.enemy, { maxHp: sc.foeHp, hp: sc.foeHp, ghost: sc.foeHp });
    }
    if (sc.hp) {
      f.sides.player.maxHp = f.sides.player.hp = sc.hp;
      Object.assign(g.stage.huds.player, { maxHp: sc.hp, hp: sc.hp, ghost: sc.hp });
    }
  }, sc);
}

const game = (page, code, arg) => page.evaluate(([c, a]) => new Function('g', 'dbg', 'arg', c)(window.dbg.game, window.dbg, a), [code, arg]);
const step = (page, sec) => page.evaluate((s) => window.__step(s), sec);

module.exports = { open, setup, game, step, sleep, PORT, BASE };
