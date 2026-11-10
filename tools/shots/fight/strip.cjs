// Task B: the win text over time. A long win chain (KNIGHT, a pile of multipliers) as a strip of frames with
// timestamps, at SPEED 1X and 2X; the same frames as a clip; and how long turns take (a scripted set and a natural
// AUTO fight), to compare before and after.
//   node tools/shots/fight/strip.cjs <tag>   -> tools/out/ui/strip_<tag>/...
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { open, setup, game, BASE } = require('./lib.cjs');
const TAG = process.argv[2] || 'before';
const ONLY = process.argv[3] || '';
const OUT = path.join(BASE, `strip_${TAG}`);
fs.mkdirSync(OUT, { recursive: true });

const RELICS = ['greatsword', 'coup', 'crusade', 'hotstreak', 'underdog', 'glasscannon', 'devilsdue', 'goldenspin', 'pairstreak', 'steadyhands', 'secondline', 'bash', 'tower', 'dryspell'];
const GILD = [
  { reel: 0, symbol: 'sword', enh: 'gold', n: 3 },
  { reel: 1, symbol: 'sword', enh: 'gold', n: 3 },
  { reel: 2, symbol: 'sword', enh: 'gold', n: 3 },
];
const CROP = { x: 370, y: 392, w: 540, h: 272 };

async function tools(page) {
  await page.evaluate((CROP) => {
    const K = 2;
    const cv = Object.assign(document.createElement('canvas'), { width: 1280 * K, height: 720 * K });
    const ctx = cv.getContext('2d');
    const crop = Object.assign(document.createElement('canvas'), { width: CROP.w * K, height: CROP.h * K });
    const cctx = crop.getContext('2d');
    const g = window.dbg.game;
    const wrap = () => {
      const d = g.director;
      if (d.__wrapped) return d;
      const orig = d.playTurn.bind(d);
      d.__count = { started: 0, done: 0 };
      d.playTurn = async (res) => {
        d.__count.started++;
        try {
          await orig(res);
        } finally {
          d.__count.done++;
        }
      };
      d.__wrapped = true;
      return d;
    };
    const tick = async () => {
      if (g.awaitingSpin) g.requestSpin();
      if (g.coach.active) g.coach.skipAll();
      window.__real(1 / 60);
      await window.__yield();
    };
    const shot = (full) => {
      ctx.setTransform(K, 0, 0, K, 0, 0);
      ctx.imageSmoothingEnabled = false;
      g.draw(ctx);
      if (full) return cv.toDataURL('image/png');
      cctx.drawImage(cv, CROP.x * K, CROP.y * K, CROP.w * K, CROP.h * K, 0, 0, crop.width, crop.height);
      return crop.toDataURL('image/png');
    };
    /** A pay banner is up (a Banner over the machines' bottom half). */
    const payUp = () => g.stage.fx.items.some((i) => 'subParts' in i && i.y > 400 && i.scale > 0.05);
    window.__strip = {
      /** Play `n` turns, counting real 60ths. */
      async turns(n) {
        const d = wrap();
        const target = d.__count.done + n;
        let steps = 0;
        while (d.__count.done < target && steps < 60 * 900 && g.phase === 'fighting' && !g.screens.active) {
          await tick();
          steps++;
        }
        return steps;
      },
      /** Your next turn: frames from the moment the pay banner opens, every `every` 60ths, `count` of them. Also how
       * long the banner blocked the turn and how long the turn took. */
      async pay(every, count, clipEvery, clipFrames) {
        const d = wrap();
        const target = d.__count.done + 1;
        let steps = 0;
        let t0 = -1;
        const frames = [];
        const clip = [];
        let bannerEnd = -1;
        let turnEnd = -1;
        while (steps < 60 * 30) {
          await tick();
          steps++;
          if (t0 < 0 && payUp()) t0 = steps;
          if (t0 >= 0) {
            const k = steps - t0;
            if (bannerEnd < 0 && !payUp()) bannerEnd = k;
            if (turnEnd < 0 && d.__count.done >= target) turnEnd = k;
            if (k % every === 0 && frames.length < count) frames.push({ t: k / 60, png: shot(false) });
            if (clipEvery && k % clipEvery === 0 && clip.length < clipFrames) clip.push(shot(false));
            if (frames.length >= count && (!clipEvery || clip.length >= clipFrames) && turnEnd >= 0) break;
          }
          if (t0 < 0 && d.__count.done >= target) break;
        }
        return { frames, clip, bannerSec: bannerEnd / 60, turnSec: turnEnd / 60, spinToBanner: t0 / 60 };
      },
    };
  }, CROP);
}

async function scene(page, speed, auto, extra = {}) {
  await setup(page, { cab: 'knight', act: 1, enemy: 'brute', relics: RELICS, gilded: GILD, chips: 1234, stake: 2, auto, speed, seed: 7, ...extra });
  await tools(page);
  await game(page, `g.publicBuild = true; g.syncButtons(); dbg.station(1); const f = g.fight; f.sides.enemy.maxHp = f.sides.enemy.hp = 60000; Object.assign(g.stage.huds.enemy, { maxHp: 60000, hp: 60000, ghost: 60000 });`);
}

(async () => {
  const { browser, page, errs } = await open({ dsf: 1 });
  const report = {};
  // 1. The long chain, as strips (and a clip at 2X).
  for (const speed of [1, 2]) {
    if (ONLY && ONLY !== 'strip') break;
    await scene(page, speed, false);
    await page.evaluate(() => window.__strip.turns(2));
    await game(page, `const f = g.fight; f.turn = 15; f.buildUp = 3; g.stage.gutter.buildUp = f.buildUpMul(); dbg.hp(160); f.sides.enemy.hp = f.sides.enemy.maxHp; f.forceNext('player', ['sword', 'sword', 'sword']);`);
    // 8 frames: every 0.3 s of real time at 2X, every 0.5 s at 1X.
    const every = speed === 1 ? 30 : 18;
    const res = await page.evaluate(([e, sp]) => window.__strip.pay(e, 8, sp === 2 ? 2 : 0, 100), [every, speed]);
    const files = [];
    res.frames.forEach((f, i) => {
      const file = path.join(OUT, `f_${speed}x_${i}.png`);
      fs.writeFileSync(file, Buffer.from(f.png.split(',')[1], 'base64'));
      files.push('-label', `${f.t.toFixed(2)} s`, file);
    });
    execFileSync('montage', [...files, '-tile', '4x2', '-geometry', '+6+6', '-background', '#140c1c', '-fill', '#f4ead2', '-pointsize', '30', path.join(OUT, `strip_${speed}x.png`)]);
    if (res.clip.length) {
      const dir = path.join(OUT, 'clip');
      fs.mkdirSync(dir, { recursive: true });
      res.clip.forEach((png, i) => fs.writeFileSync(path.join(dir, `c_${String(i).padStart(3, '0')}.png`), Buffer.from(png.split(',')[1], 'base64')));
    }
    report[`chain_${speed}x`] = { bannerSec: res.bannerSec, turnSec: res.turnSec, steps: await game(page, `const s = g.director.lastScore; const m = s.groups.find((x) => x.matched); return { notes: m.notes, base: m.base, mult: m.mult }`) };
    console.log(`chain ${speed}X`, JSON.stringify(report[`chain_${speed}x`]));
  }
  // 2. How long your paying turns take, by chain length (real seconds, from the banner opening to the turn's end).
  const cases = [
    { name: 'pair_plain', relics: [], gilded: [], line: ['sword', 'sword', 'shield'], hacks: '' },
    { name: 'jackpot_plain', relics: [], gilded: [], line: ['sword', 'sword', 'sword'], hacks: '' },
    { name: 'pair_3steps', relics: ['greatsword', 'underdog'], gilded: [], line: ['sword', 'sword', 'shield'], hacks: 'dbg.hp(160);' },
    { name: 'jackpot_6steps', relics: ['greatsword', 'underdog', 'coup', 'glasscannon'], gilded: GILD, line: ['sword', 'sword', 'sword'], hacks: 'dbg.hp(160); f.turn = 15;' },
    { name: 'jackpot_long', relics: RELICS, gilded: GILD, line: ['sword', 'sword', 'sword'], hacks: 'dbg.hp(160); f.turn = 15; f.buildUp = 3;' },
  ];
  for (const c of cases) {
    if (ONLY && ONLY !== 'time') break;
    for (const speed of [1, 2]) {
      await scene(page, speed, false, { relics: c.relics, gilded: c.gilded });
      await page.evaluate(() => window.__strip.turns(2));
      await game(page, `const f = g.fight; ${c.hacks} f.sides.enemy.hp = f.sides.enemy.maxHp; f.forceNext('player', arg);`, c.line);
      const res = await page.evaluate(() => window.__strip.pay(999, 0, 0, 0));
      const n = await game(page, `const s = g.director.lastScore; const m = s.groups.find((x) => x.matched); return (m.notes ?? []).length`);
      report[`${c.name}_${speed}x`] = { notes: n, bannerSec: +res.bannerSec.toFixed(2), turnSec: +res.turnSec.toFixed(2) };
      console.log(c.name, `${speed}X`, JSON.stringify(report[`${c.name}_${speed}x`]));
    }
  }
  // 3. A natural fight on AUTO (the same seed, so the same spins before and after): real seconds for 40 turns.
  for (const [cab, relics] of [['knight', ['greatsword', 'hotstreak']], ['knight', RELICS], ['tesla', ['livewire', 'capacitor']], ['midas', ['compound']]]) {
    if (ONLY && ONLY !== 'time' && ONLY !== 'auto') break;
    for (const speed of [1, 2]) {
      await setup(page, { cab, act: 2, relics, chips: 50, stake: 0, auto: true, speed, seed: 21 });
      await tools(page);
      await game(page, `const f = g.fight; f.sides.enemy.maxHp = f.sides.enemy.hp = 200000; f.sides.player.maxHp = f.sides.player.hp = 200000;`);
      const steps = await page.evaluate(() => window.__strip.turns(40));
      const key = `auto_${cab}_${relics.length}relics_${speed}x`;
      report[key] = { sec40turns: +(steps / 60).toFixed(1), perTurn: +(steps / 60 / 40).toFixed(2) };
      console.log(key, JSON.stringify(report[key]));
    }
  }
  fs.writeFileSync(path.join(OUT, `report${ONLY ? '_' + ONLY : ''}.json`), JSON.stringify(report, null, 1));
  console.log(errs.slice(0, 3));
  await browser.close();
})();
