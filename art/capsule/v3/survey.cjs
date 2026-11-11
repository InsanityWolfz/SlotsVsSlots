// Survey: every new room and the key sprites as PNGs (reference for the capsule). node survey.cjs <outDir> [port]
const { chromium } = require('playwright');
const fs = require('node:fs');
const out = process.argv[2];
const PORT = process.argv[3] || '5186';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.error('[page]', e.message));
  await p.goto(`http://localhost:${PORT}/`);
  await p.waitForFunction(() => document.querySelector('canvas'));
  const shots = await p.evaluate(async () => {
    const ent = await import('/src/render/roomEntrance.ts');
    const street = await import('/src/render/roomStreet.ts');
    const floor = await import('/src/render/roomCasinoFloor.ts');
    const wheel = await import('/src/render/roomWheel.ts');
    const hr = await import('/src/render/roomHighRoller.ts');
    const menu = await import('/src/render/roomMenu.ts');
    const sp = await import('/src/render/sprites.ts');
    const sd = await import('/src/render/spriteData.ts');
    const res = {};
    const shot = (name, fn, w = 1280, h = 720) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; fn(g); res[name] = c.toDataURL('image/png'); };
    for (let i = 0; i < 12; i++) ent.entranceUpdate(0.1);
    shot('entrance', (g) => ent.drawEntrance(g, { pot: 300, foeHp: 1, turn: 'player', time: 3.3 }));
    shot('entrance_open', (g) => { for (let i = 0; i < 80; i++) ent.drawEntrance(g, { pot: 300, foeHp: 0.05, turn: 'player', time: 3.3 }); });
    for (let i = 0; i < 4; i++) shot('street' + i, (g) => { street.drawStreet(g, { station: i, time: 2 }); street.drawStreet(g, { station: i, time: 2.05 }); });
    for (let i = 0; i < 4; i++) shot('floor' + i, (g) => floor.drawFloorStation(g, { station: i, time: 2 }));
    shot('wheel', (g) => wheel.drawWheelRoom(g, { time: 2, foeHp: 1, bets: 0, left: 3, fast: false, angle: 0.4 }));
    for (let i = 0; i < 4; i++) shot('hr' + i, (g) => hr.drawHighRoller(g, { place: i, time: 2 }));
    shot('hrtable', (g) => hr.drawHighRoller(g, { place: 'table', time: 2 }));
    shot('menu', (g) => menu.drawMenuStreet(g, 2));
    // sprite sheet: every sprite >= 24px, labelled
    const ids = Object.keys(sd.SPRITES).filter((id) => sd.SPRITES[id].length >= 24);
    res.ids = Object.keys(sd.SPRITES).map((id) => id + ':' + sd.SPRITES[id][0].length + 'x' + sd.SPRITES[id].length).join(' ');
    const text = await import('/src/render/text.ts');
    shot('sprites', (g) => { g.fillStyle = '#2a2140'; g.fillRect(0, 0, 1600, 1400); let x = 4, y = 4, rowH = 0; for (const id of ids) { const s = sp.spriteSize(id); const sc = 2; if (x + s.w * sc > 1590) { x = 4; y += rowH + 14; rowH = 0; } g.drawImage(sp.sprite(id), x, y, s.w * sc, s.h * sc); text.drawText(g, id.slice(0, 14), x + s.w, y + s.h * sc + 5, 1, '#fff'); x += Math.max(s.w * sc, 90) + 6; rowH = Math.max(rowH, s.h * sc); } }, 1600, 1400);
    return res;
  });
  fs.mkdirSync(out, { recursive: true });
  for (const [k, v] of Object.entries(shots)) { if (k === 'ids') { fs.writeFileSync(out + '/ids.txt', v); continue; } fs.writeFileSync(`${out}/${k}.png`, Buffer.from(v.split(',')[1], 'base64')); }
  console.log(Object.keys(shots).join(' '));
  await b.close();
})();
