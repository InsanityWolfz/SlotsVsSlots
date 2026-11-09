// node rec.cjs [song]: records the trailer into master.mkv (lossless 1280x720@60) + sfx.wav + music.wav
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const song = process.argv[2] || 'house';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    // Pinned to cut 2's settings: 2X and the full mix (new saves start at 1X and volume 5 since 2026-11-08), and no
    // first-time callouts (the payline hint, each machine's meter tip) in the middle of a shot.
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, unlocked: ['knight', 'tesla', 'jukebox', 'joker'], speed: 2, speedV: 2, vol: { master: 10, music: 10, sfx: 10 }, paylineHints: 3, metersExplained: ['knight', 'tesla', 'jukebox', 'joker', 'midas'] }));
    localStorage.setItem('slotvslot.profile.v1', JSON.stringify({ name: 'REGGIE', xp: 400 * 13 * 6, stats: { runs: 12, wins: 3, dailies: 0 }, found: { relics: [], charms: [] }, achievements: {}, challenges: {}, runs: [] }));
    window.requestAnimationFrame = (cb) => { window.__rafCb = cb; return 1; };
  });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-', '-c:v', 'libx264rgb', '-preset', 'veryfast', '-crf', '0', 'master.mkv'], { stdio: ['pipe', 'inherit', 'inherit'] });
  let n = 0;
  await p.exposeFunction('saveFrame', async (d) => {
    n++; if (n % 300 === 0) console.log('frame', n);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  });
  await p.goto(`http://localhost:${process.env.GAME_PORT || 5173}/`);
  await p.waitForFunction(() => window.dbg && window.__rafCb, null, { timeout: 30000 });
  const bg = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  // COLD=0 records cut 2's opening; COLD_PRE=<frames> sets how far into the spin the cold open starts; COLD_ONLY=1
  // records the cold open alone (a quick take to check its timing)
  const cold = process.env.COLD !== '0', pre = process.env.COLD_PRE ? Number(process.env.COLD_PRE) : undefined;
  await p.evaluate(([o, e, s, c, pr]) => { window.__bgOpen = o; window.__bgEnd = e; window.__song = s; window.__cold = c; if (pr !== null) window.__coldPre = pr; }, [bg('tr_open.png'), bg('tr_end.png'), song, cold, pre ?? null]);
  console.log(await p.evaluate(new Function('return (async () => {' + fs.readFileSync('lib.js', 'utf8') + '})()')));
  const frames = await p.evaluate((only) => (only ? window.coldOnly() : window.trailer()), !!process.env.COLD_ONLY);
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  fs.writeFileSync('sfx.wav', Buffer.from(await p.evaluate(() => window.sfxWav()), 'base64'));
  fs.writeFileSync('music.wav', Buffer.from(await p.evaluate((s) => window.musicWav(s), frames / 60 + 1), 'base64'));
  console.log('frames', frames, 'errors', errs);
  await b.close();
})();
