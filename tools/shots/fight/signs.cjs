// Where the rooms' own signs are, per room (the layout probe's background layer): node tools/shots/fight/signs.cjs [shots]
const fs = require('node:fs');
const path = require('node:path');
const { open, setup, game, step, sleep, BASE } = require('./lib.cjs');
const SHOTS = process.argv[2] === 'shots';
(async () => {
  const { browser, page, errs } = await open({ dsf: 1 });
  const rooms = [];
  for (const act of [1, 2, 3]) {
    for (const st of [0, 1, 2, 3]) rooms.push({ name: `act${act}_station${st}`, act, station: st });
    rooms.push({ name: `act${act}_boss`, act, boss: true });
  }
  for (const loop of [1, 2, 3, 4]) {
    rooms.push({ name: `endless${loop}`, endless: loop });
    rooms.push({ name: `endless${loop}_boss`, endless: loop, boss: true });
  }
  rooms.push({ name: 'endless5_owner', endless: 5, boss: true });
  const out = {};
  for (const r of rooms) {
    // Rooms paint to their own low-res buffers (some layers once, then cached): watch every string drawn anywhere
    // but the screen while this room is set up and shown.
    await page.evaluate(() => {
      window.__signs = [];
      window.dbg.probe((kind, label, c, x, y, w, h) => {
        if (kind !== 'text' || c.canvas === document.getElementById('game') || c.canvas.width > 1280) return;
        if (c.canvas.width !== 320 && c.canvas.width !== 640 && c.canvas.width !== 1280) return;
        const k = 1280 / c.canvas.width;
        const m = c.getTransform();
        const r = [m.a * x + m.e, m.d * y + m.f, m.a * (x + w) + m.e, m.d * (y + h) + m.f].map((v) => Math.round(v * k));
        const key = label + r.join(',');
        if (!window.__signs.some((q) => q.key === key)) window.__signs.push({ key, label, r, cw: c.canvas.width });
      });
    });
    await setup(page, { cab: 'knight', ...r, auto: false });
    await game(page, `dbg.station(${r.station ?? 'null'})`);
    await step(page, 0.3);
    await sleep(200);
    const signs = await page.evaluate(() => (window.dbg.probe(null), window.__signs.map(({ label, r, cw }) => ({ label, r, cw }))));
    out[r.name] = signs;
    console.log(r.name.padEnd(18), signs.map((s) => `${s.label}[${s.r}]`).join('  '));
    if (SHOTS) {
      await sleep(80);
      await page.screenshot({ path: path.join(BASE, `room_${r.name}.png`) });
    }
  }
  fs.writeFileSync(path.join(BASE, 'signs.json'), JSON.stringify(out, null, 1));
  console.log(errs.slice(0, 3));
  await browser.close();
})();
