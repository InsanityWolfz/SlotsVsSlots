// The capsule directions (v3, 2026-11-11), rendered by the game's own room and sprite modules in a headless browser.
//   node art/capsule/v3/make.mjs [a b c] [--out <dir>]
// It starts its own vite server (no dev server needed), opens art/capsule/v3/index.html, imports each direction
// (a.js, b.js, c.js: each exports main() and small(), which return { canvas, px, detail }) and writes, per direction x:
//   x_main.png        1232x706  Steam's main capsule
//   x_small.png       462x174   Steam's small capsule (its own composition)
//   x_small_half.png  231x87    the small capsule as lists show it (the art's own pixels: its grid is 2 screen px)
//   x_detail.png      600x400   the focal action of the main capsule at 2x, to check the pixels
// A direction draws on an art canvas, one art pixel a grid pixel; this file only multiplies it up (nearest neighbour,
// whole numbers) and crops to Steam's size, so every element shares one pixel grid.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? resolve(args.splice(oi, 2)[1]) : resolve(here, 'out');
const names = args.length ? args : ['a', 'b', 'c'];
const SIZES = { main: [1232, 706], small: [462, 174] };

const server = await createServer({ root, logLevel: 'error', server: { port: 5187, strictPort: false } });
await server.listen();
const port = server.httpServer.address().port;
const browser = await chromium.launch();
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  // The rooms' live layers call Math.random (rain, sparks, confetti): a seeded one, so every render is the same.
  await page.addInitScript(() => {
    let s = 1;
    globalThis.__capsuleSeed = (n) => (s = n >>> 0);
    Math.random = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  mkdirSync(out, { recursive: true });
  for (const name of names) {
    // (a fresh page for each direction: the rooms keep state in their modules)
    await page.goto(`http://localhost:${port}/art/capsule/v3/index.html`);
    const shots = await page.evaluate(
      async ({ name, SIZES }) => {
        const mod = await import(`/art/capsule/v3/${name}.js?t=${Date.now()}`);
        const res = {};
        const png = (art, k, w, h, sx = 0, sy = 0) => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.drawImage(art, -sx * k, -sy * k, art.width * k, art.height * k);
          return c.toDataURL('image/png');
        };
        // A sketch sheet (rough.js): `sketches` maps a name to a main capsule only. Each gets x_main.png and x_half.png:
        // a band of the main (full width, 1232x464) shrunk to 231x87, to see whether the idea survives small. That one
        // is a smoothed shrink of the main, not a composed small capsule.
        for (const [key, fn] of Object.entries(mod.sketches ?? {})) {
          const r = await fn();
          const [w, h] = SIZES.main;
          if (r.canvas.width * r.px < w || r.canvas.height * r.px < h) throw new Error(`${key}: art too small`);
          const url = png(r.canvas, r.px, w, h, Math.floor((r.canvas.width * r.px - w) / 2) / r.px, Math.floor((r.canvas.height * r.px - h) / 2) / r.px);
          res[`${key}_main`] = url;
          const img = new Image();
          img.src = url;
          await img.decode();
          let c = document.createElement('canvas');
          c.width = 1232;
          c.height = 464;
          c.getContext('2d').drawImage(img, 0, -Math.round((706 - 464) * (r.band ?? 0.5)));
          for (const [w2, h2] of [[616, 232], [308, 116], [231, 87]]) {
            const d = document.createElement('canvas');
            d.width = w2;
            d.height = h2;
            const dg = d.getContext('2d');
            dg.imageSmoothingQuality = 'high';
            dg.drawImage(c, 0, 0, w2, h2);
            c = d;
          }
          res[`${key}_half`] = c.toDataURL('image/png');
        }
        for (const kind of mod.sketches ? [] : ['main', 'small']) {
          const r = await mod[kind]();
          const [w, h] = SIZES[kind];
          if (r.canvas.width * r.px < w || r.canvas.height * r.px < h) throw new Error(`${name}.${kind}: art ${r.canvas.width}x${r.canvas.height} at ${r.px}px is smaller than ${w}x${h}`);
          // (art a few screen pixels larger than Steam's size is centre-cropped: the edge art pixels lose a sliver)
          res[`${name}_${kind}`] = png(r.canvas, r.px, w, h, Math.floor((r.canvas.width * r.px - w) / 2) / r.px, Math.floor((r.canvas.height * r.px - h) / 2) / r.px);
          if (kind === 'small') res[`${name}_small_half`] = png(r.canvas, r.px / 2, w / 2, h / 2);
          // the detail: an art-pixel window of the main capsule at twice its size
          if (kind === 'main') {
            const k = r.px * 2;
            const dw = Math.round(600 / k);
            const dh = Math.round(400 / k);
            const [dx, dy] = r.detail ?? [Math.round((r.canvas.width - dw) / 2), Math.round((r.canvas.height - dh) / 2)];
            res[`${name}_detail`] = png(r.canvas, k, dw * k, dh * k, dx, dy);
          }
        }
        return res;
      },
      { name, SIZES },
    );
    for (const [k, v] of Object.entries(shots)) {
      writeFileSync(`${out}/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
      console.log(`${out}/${k}.png`);
    }
  }
} catch (e) {
  failed = true;
  console.error(String(e && e.message ? e.message : e));
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
