// Steam store art (2026-11-05): the capsules, the library art and the screenshots, drawn from the game's own pixel art
// at whole-number scales, so they regenerate whenever the art changes. Sizes: Steamworks' current templates
// (header 920x430, small 462x174, main 1232x706, vertical 748x896, library 600x900, hero 3840x1240, logo 1280 wide).
// Store capsules carry only the art and the logo (Steam's rule: no other words).
// Needs a dev server (window.dbg):   npx vite --port 5190 &   then   node tools/store/capsules.cjs [outDir] [port]
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const OUT = process.argv[2] || 'tools/out/store';
const PORT = process.argv[3] || '5190';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

/** The compositions, drawn in the page. `left`/`right`: the two Slot Machines that face off. */
const ASSETS = [
  { name: 'header_capsule', w: 920, h: 430, logo: 3, cab: 4, logoY: 0.27, cabY: 0.72, gap: 0.33 },
  { name: 'small_capsule', w: 462, h: 174, logo: 2, cab: 2, logoY: 0.5, cabY: 0.6, gap: 0.42, logoOver: true },
  { name: 'main_capsule', w: 1232, h: 706, logo: 4, cab: 6, logoY: 0.22, cabY: 0.7, gap: 0.3 },
  { name: 'vertical_capsule', w: 748, h: 896, logo: 4, cab: 6, logoY: 0.16, cabY: 0.6, gap: 0.24 },
  { name: 'library_capsule', w: 600, h: 900, logo: 3, cab: 5, logoY: 0.16, cabY: 0.6, gap: 0.24 },
  { name: 'library_header', w: 920, h: 430, logo: 3, cab: 4, logoY: 0.27, cabY: 0.72, gap: 0.33 },
  { name: 'library_hero', w: 3840, h: 1240, logo: 0, cab: 10, logoY: 0, cabY: 0.6, gap: 0.36, roomScale: 3 },
  { name: 'library_logo', w: 1280, h: 352, logo: 8, cab: 0, logoY: 0.5, cabY: 0, gap: 0, clear: true },
];

async function compose(page, a) {
  return page.evaluate(async (a) => {
    const S = await import('/src/render/sprites.ts');
    const T = await import('/src/ui/menu/title.ts');
    const R = await import('/src/render/rooms.ts');
    const cv = document.createElement('canvas');
    cv.width = a.w;
    cv.height = a.h;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (!a.clear) {
      // The casino floor, at its own pixel scale (the room is drawn at 1280x720 = its 320x180 art at 4x), cropped to fit.
      const room = document.createElement('canvas');
      room.width = 1280;
      room.height = 720;
      const rg = room.getContext('2d');
      rg.imageSmoothingEnabled = false;
      const rooms = new R.Rooms();
      const scene = { room: 'floor', boss: null, loop: 0, hp: 1, foeHp: 1, turn: 'player', fight: true };
      for (let i = 0; i < 90; i++) rooms.update?.(1 / 30);
      rooms.draw(rg, scene, 7.9);
      const k = a.roomScale ?? Math.max(1, Math.ceil(Math.max(a.w / 1280, a.h / 720)));
      const rw = 1280 * k;
      const rh = 720 * k;
      ctx.drawImage(room, Math.round((a.w - rw) / 2), Math.round((a.h - rh) / 2), rw, rh);
      // Darker at the edges, so the machines and the sign read first.
      const g = ctx.createRadialGradient(a.w / 2, a.h / 2, Math.min(a.w, a.h) * 0.2, a.w / 2, a.h / 2, Math.max(a.w, a.h) * 0.7);
      g.addColorStop(0, 'rgba(7,3,13,0.15)');
      g.addColorStop(1, 'rgba(7,3,13,0.72)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, a.w, a.h);
    }
    if (a.cab) {
      // Two Slot Machines face off: KNIGHT on the left, TESLA turned to face it on the right, a spotlight under each.
      const cy = Math.round(a.h * a.cabY);
      const dx = Math.round(a.w * a.gap);
      for (const [id, x, flip] of [['cabinetKnight', a.w / 2 - dx, false], ['cabinetTesla', a.w / 2 + dx, true]]) {
        const spot = ctx.createRadialGradient(x, cy + 32 * a.cab * 0.45, 4, x, cy + 32 * a.cab * 0.45, 30 * a.cab);
        spot.addColorStop(0, 'rgba(255,214,120,0.35)');
        spot.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = spot;
        ctx.fillRect(x - 40 * a.cab, cy - 40 * a.cab, 80 * a.cab, 80 * a.cab);
        S.drawSprite(ctx, id, Math.round(x), cy, a.cab, { flipX: flip });
      }
      // Between them: the spark of the fight (the game's own bolt and coin art).
      if (S.hasSprite('boltIcon')) S.drawSprite(ctx, 'boltIcon', Math.round(a.w / 2), cy - 6 * a.cab, Math.max(2, Math.round(a.cab * 1.5)));
      for (const [ox, oy, s] of [[-14, -22, 0.6], [12, -30, 0.5], [-4, 10, 0.55], [16, 4, 0.45]])
        if (S.hasSprite('coin')) S.drawSprite(ctx, 'coin', Math.round(a.w / 2 + ox * a.cab), Math.round(cy + oy * a.cab), Math.max(1, Math.round(a.cab * s)));
    }
    if (a.logo) {
      const ly = Math.round(a.h * a.logoY);
      if (a.logoOver) {
        // The small capsule: a dark band under the sign so it reads at 462 px.
        ctx.fillStyle = 'rgba(7,3,13,0.55)';
        ctx.fillRect(0, ly - 30 * a.logo, a.w, 60 * a.logo);
      }
      T.drawLogo(ctx, Math.round(a.w / 2), ly, a.logo, { lit: 1, on: 1, chase: 0 });
    }
    return cv.toDataURL('image/png');
  }, a);
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.addInitScript(() => {
    localStorage.setItem('slotvslot.prefs.v2', JSON.stringify({ tutorialDone: true, unlocked: ['knight', 'tesla', 'jukebox', 'joker', 'midas'] }));
  });
  await p.goto(`http://localhost:${PORT}/`);
  await sleep(3000);
  for (const a of ASSETS) {
    const url = await compose(p, a);
    writeFileSync(`${OUT}/${a.name}.png`, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`${a.name} ${a.w}x${a.h}`);
  }
  if (errs.length) {
    console.error(errs.join('\n'));
    process.exit(1);
  }
  await b.close();
})();
