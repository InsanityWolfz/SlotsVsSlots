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
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, unlocked: ['knight', 'tesla', 'jukebox', 'joker'] }));
    localStorage.setItem('slotvslot.profile.v1', JSON.stringify({ name: 'REGGIE', xp: 400 * 13 * 6, stats: { runs: 12, wins: 3, dailies: 0 }, found: { relics: [], charms: [] }, achievements: {}, challenges: {}, runs: [] }));
    window.requestAnimationFrame = (cb) => { window.__rafCb = cb; return 1; };
  });
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'png', '-i', '-', '-c:v', 'libx264rgb', '-preset', 'veryfast', '-crf', '0', 'master.mkv'], { stdio: ['pipe', 'inherit', 'inherit'] });
  let n = 0;
  await p.exposeFunction('saveFrame', async (d) => {
    n++; if (n % 300 === 0) console.log('frame', n);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  });
  await p.goto('http://localhost:5173/');
  await p.waitForFunction(() => window.dbg && window.__rafCb, null, { timeout: 30000 });
  const bg = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  await p.evaluate(([o, e, s]) => { window.__bgOpen = o; window.__bgEnd = e; window.__song = s; }, [bg('tr_open.png'), bg('tr_end.png'), song]);
  console.log(await p.evaluate(new Function('return (async () => {' + fs.readFileSync('lib.js', 'utf8') + '})()')));
  const frames = await p.evaluate(() => window.trailer());
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  fs.writeFileSync('sfx.wav', Buffer.from(await p.evaluate(() => window.sfxWav()), 'base64'));
  fs.writeFileSync('music.wav', Buffer.from(await p.evaluate((s) => window.musicWav(s), frames / 60 + 1), 'base64'));
  console.log('frames', frames, 'errors', errs);
  await b.close();
})();
