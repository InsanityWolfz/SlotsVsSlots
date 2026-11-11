// Steam store screenshots (2026-11-11, in the new rooms): the game's real screens at 2560x1440 (2x, whole pixels).
// Each fight is a real run fight with a build a run could have, stepped frame by frame (the fight harness's clock), so
// a shot lands on the same moment every time. The dev build's TUNE button is hidden; nothing else is staged.
//   npx vite --port 5190 --strictPort &
//   PORT=5190 node tools/store/screenshots.cjs [outDir]            the 8 shots
//   PORT=5190 CAND=1 node tools/store/screenshots.cjs [outDir]     every candidate frame of the fight shots (to pick from)
process.env.PORT = process.env.PORT || '5190';
const fs = require('node:fs');
const { open, setup, game, step } = require('../shots/fight/lib.cjs');
const OUT = process.argv[2] || 'tools/out/store';
const CAND = !!process.env.CAND;
fs.mkdirSync(OUT, { recursive: true });

const gold = (sym, reels, n = 3) => reels.map((reel) => ({ reel, symbol: sym, enh: 'gold', n }));
// A fight shot: the run's build, the lines forced on each turn, and the moment (seconds after the last SPIN).
const FIGHTS = [
  {
    // A jackpot on the casino floor: the pay climbs and its chain stays readable under the banner.
    name: '01_jackpot',
    sc: { cab: 'knight', act: 2, station: 1, seed: 21, chips: 23, speed: 2, relics: ['greatsword', 'key', 'bell', 'hotstreak'], gilded: gold('sword', [0, 1]), levels: { sword: 3 }, enemy: 'bomber', foeHp: 1700 },
    turns: [{ player: ['sword', 'sword', 'shield'], enemy: ['sword', 'shield', 'shield'] }, { player: ['sword', 'sword', 'sword'] }],
    at: 4.9,
    cand: [3.6, 4.0, 4.3, 4.6, 4.9, 5.2, 5.6, 6.0],
  },
  {
    // THE DOORMAN at the casino's door: TESLA's lightning storm.
    name: '02_doorman',
    sc: { cab: 'tesla', act: 1, boss: true, seed: 12, chips: 14, speed: 2, relics: ['livewire', 'capacitor'], gilded: [{ reel: 0, symbol: 'bolt', enh: 'charged', n: 3 }], levels: { bolt: 2 } },
    turns: [{ player: ['bolt', 'bolt', 'bolt'], enemy: ['coin', 'coin', 'sword'] }, { player: ['bolt', 'bolt', 'bolt'] }],
    at: 6.2,
    cand: [4.6, 5.0, 5.4, 5.8, 6.2, 6.6, 7.0, 7.6],
  },
  {
    // THE WHEEL: chips bet on your reels.
    name: '03_wheel',
    sc: { cab: 'midas', act: 2, boss: true, seed: 5, chips: 31, speed: 2, relics: ['compound', 'safedeposit', 'key'], levels: { goldbar: 2 } },
    turns: [{ player: ['goldbar', 'goldbar', 'shield'], enemy: ['ball', 'seven', 'sword'] }, { player: ['goldbar', 'goldbar', 'goldbar'] }],
    at: 3.6,
    cand: [3.6],
  },
  {
    // THE DEALER in the high-roller room: JOKER's jackpot meter pays.
    name: '04_dealer',
    sc: { cab: 'joker', act: 3, boss: true, seed: 9, chips: 42, speed: 2, relics: ['highcard', 'encore', 'bell', 'underdog'], gilded: gold('ace', [0, 2]), levels: { ace: 3 } },
    turns: [{ player: ['wild', 'ace', 'wild'], enemy: ['seven', 'sword', 'shield'] }, { player: ['ace', 'ace', 'ace'] }],
    at: 4.0,
    cand: [4.0],
  },
];

(async () => {
  const { browser, page, errs } = await open({ dsf: 2 });
  // The dev build's TUNE button stays hidden (its row is rebuilt every screen), and no focus ring shows in a shot.
  await page.evaluate(() => setInterval(() => { for (const b of window.dbg.game.buttons) if (b.label === 'TUNE') b.visible = false; }, 10));
  const shot = async (name) => {
    await game(page, 'g.focus.hide()');
    await step(page, 0.05);
    await new Promise((r) => setTimeout(r, 120));
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(name);
  };

  for (const f of FIGHTS) {
    await game(page, 'dbg.station(arg)', f.sc.station ?? null);
    await setup(page, f.sc);
    // (The harness mutes the game: the button should read SOUND.)
    await game(page, 'g.prefs.muted = false');
    await step(page, 1.2);
    for (let k = 0; k < f.turns.length; k++) {
      const t = f.turns[k];
      const last = k === f.turns.length - 1;
      await game(page, `dbg.force('player', arg.player); if (arg.enemy) dbg.force('enemy', arg.enemy); g.requestSpin();`, t);
      if (!last) {
        // Play the whole turn out (yours and theirs), until SPIN waits again.
        for (let i = 0; i < 400 && !(await game(page, 'return g.awaitingSpin')); i++) await step(page, 0.1);
        await step(page, 0.3);
      }
    }
    if (CAND) {
      let t = 0;
      for (const c of f.cand) {
        await step(page, c - t);
        t = c;
        await shot(`cand_${f.name}_${String(c).replace('.', '_')}`);
      }
    } else {
      await step(page, f.at);
      await shot(f.name);
    }
  }
  await game(page, 'dbg.station(null)');

  if (!CAND) {
    // The screens between fights: a run in act 2 with a build, then the draft, the map and the Cashier; then the pawn shop.
    const build = `const r = g.run; r.pendingStart = null; r.tutorial = false; r.player.chips = 34; r.player.relics = ['greatsword', 'key', 'bandage'];`;
    await game(page, `g.menus.hide(); g.startRun(31, 'knight', 0); ${build} dbg.screenAt('draft', 2);`);
    await step(page, 1.5);
    await shot('05_draft');
    await game(page, `g.startRun(33, 'jukebox', 0); ${build.replace("'greatsword', 'key', 'bandage'", "'subwoofer', 'turntable'")} dbg.screenAt('map', 2);`);
    await step(page, 1.5);
    await shot('06_map');
    await game(page, `g.startRun(41, 'tesla', 0); ${build.replace("'greatsword', 'key', 'bandage'", "'livewire'")} dbg.act(2); dbg.shop();`);
    await step(page, 1.8);
    await shot('07_cashier');
    await game(page, `g.chooseCabinet();`);
    await step(page, 1.5);
    await shot('08_machines');
  }

  if (errs.length) {
    console.error(errs.join('\n'));
    process.exit(1);
  }
  await browser.close();
})();
