// Builds tools/art-preview.html from src/render/spriteData.ts + fontData.ts.
// Run: node tools/build-art-preview.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Strip the (small, known) TypeScript syntax used in the data files and evaluate them. */
function loadTs(file, names) {
  let src = readFileSync(join(ROOT, file), 'utf8');
  src = src.replace(/export type[\s\S]*?;[^\n]*\n/g, '');
  src = src.replace(/:\s*Record<[^>]*>/g, '');
  src = src.replace(/^export /gm, '');
  return new Function(`${src}\nreturn { ${names.join(', ')} };`)();
}

const art = loadTs('src/render/spriteData.ts', ['PALETTE', 'UI_COLORS', 'SPRITES']);
const font = loadTs('src/render/fontData.ts', ['FONT_W', 'FONT_H', 'GLYPHS']);

// self-check
const errs = [];
for (const [id, rows] of Object.entries(art.SPRITES)) {
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) errs.push(`${id} row ${i} width ${r.length} != ${w}`);
    for (const c of r) if (c !== '.' && !(c in art.PALETTE)) errs.push(`${id} row ${i} bad char ${c}`);
  });
}
for (const [ch, rows] of Object.entries(font.GLYPHS)) {
  if (rows.length !== font.FONT_H) errs.push(`glyph ${ch} has ${rows.length} rows`);
  rows.forEach((r) => { if (r.length !== font.FONT_W || /[^#.]/.test(r)) errs.push(`glyph ${ch} bad row "${r}"`); });
}
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Slot vs Slot art preview</title>
<style>
  body { margin: 0; background: #0d0519; color: #f4eee0; font: 13px monospace; }
  canvas { display: block; image-rendering: pixelated; }
</style></head>
<body><canvas id="c"></canvas>
<script>
const PALETTE = ${JSON.stringify(art.PALETTE)};
const UI_COLORS = ${JSON.stringify(art.UI_COLORS)};
const SPRITES = ${JSON.stringify(art.SPRITES)};
const FONT_W = ${font.FONT_W}, FONT_H = ${font.FONT_H};
const GLYPHS = ${JSON.stringify(font.GLYPHS)};

const W = 1400, H = 1180;
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#29123d'); bg.addColorStop(1, '#0d0519');
ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

function spr(id, x, y, s, alpha = 1, flip = false) {
  const rows = SPRITES[id]; ctx.globalAlpha = alpha;
  rows.forEach((r, j) => [...r].forEach((c, i) => {
    if (c === '.') return; ctx.fillStyle = PALETTE[c];
    const xx = flip ? x + (r.length - 1 - i) * s : x + i * s;
    ctx.fillRect(xx, y + j * s, s, s);
  }));
  ctx.globalAlpha = 1;
}
function text(str, x, y, s, color = UI_COLORS.text) {
  // outline pass then ink pass
  for (const [ox, oy, col] of [[-1,0,'#140c1c'],[1,0,'#140c1c'],[0,-1,'#140c1c'],[0,1,'#140c1c'],[1,1,'#140c1c'],[-1,-1,'#140c1c'],[1,-1,'#140c1c'],[-1,1,'#140c1c'],[0,0,color]]) {
    ctx.fillStyle = col; let cx = x;
    for (const ch of str) {
      const g = GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || GLYPHS['?'];
      g.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') ctx.fillRect(cx + (i + ox) * s, y + (j + oy) * s, s, s); }));
      cx += (FONT_W + 1) * s;
    }
  }
}
function label(t, x, y) { ctx.fillStyle = '#9a8fb0'; ctx.font = '12px monospace'; ctx.fillText(t, x, y); }

// Close-up review helper for the devtools console: zoomView(['sword','shield'], 40)
window.zoomView = (ids, s) => {
  ctx.fillStyle = '#1f0c2e'; ctx.fillRect(0, 0, W, H); let zx = 10, zy = 10;
  for (const id of ids) {
    const w = SPRITES[id][0].length, h = SPRITES[id].length;
    if (zx + w * s > W) { zx = 10; zy += (h + 1) * s; }
    if (id === 'goo') spr('sword', zx, zy, s, 0.2);
    spr(id, zx, zy, s); zx += (w + 1) * s;
  }
};
window.drawAll = () => {
ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
// 1) every sprite at 1x, 3x, 5x
let x = 20, y = 30, rowH = 0;
for (const id of Object.keys(SPRITES)) {
  const w = SPRITES[id][0].length, h = SPRITES[id].length;
  const cellW = 10 + w + 8 + w * 3 + 8 + w * 5 + 16;
  if (x + cellW > W - 10) { x = 20; y += rowH + 30; rowH = 0; }
  label(id, x, y - 8);
  spr(id, x, y, 1); spr(id, x + w + 8, y, 3); spr(id, x + w * 4 + 16, y, 5);
  x += cellW; rowH = Math.max(rowH, h * 5);
}
y += rowH + 40;

// 2) font
text('SLOT VS SLOT 0123456789 JACKPOT! DOUBLE! BLOCK +4 -10', 20, y, 3); y += 32;
text("ABCDEFGHIJKLMNOPQRSTUVWXYZ ! ? . , : - + / % x ( ) ' ×", 20, y, 3, UI_COLORS.energy); y += 32;
text('CLEANSED ×14!', 20, y, 5, UI_COLORS.gold); text('SLIMED!', 460, y, 5, UI_COLORS.slime); text('-10', 760, y, 6, UI_COLORS.hp);
y += 64;

// 3) mock 3x3 reel grid at 5x (96px cells), one slimed sword
const grid = [['sword','bolt','shield'],['shield','sword','sword'],['bolt','shield','bolt']];
const gx = 20, gy = y;
ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(gx - 8, gy - 8, 96 * 3 + 16, 96 * 3 + 16);
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(gx - 4, gy - 4, 96 * 3 + 8, 96 * 3 + 8);
const g2 = ctx.createLinearGradient(0, gy, 0, gy + 288); g2.addColorStop(0, '#29123d'); g2.addColorStop(1, '#0d0519');
ctx.fillStyle = g2; ctx.fillRect(gx, gy, 288, 288);
grid.forEach((row, j) => row.forEach((id, i) => {
  const cx = gx + i * 96 + 8, cy = gy + j * 96 + 8;
  if (i === 0 && j === 0) { spr(id, cx, cy, 5, 0.2); spr('goo', cx, cy, 5); }
  else spr(id, cx, cy, 5);
}));
// enemy grid
const ex = 360;
const egrid = [['slime','sword','shield'],['sword','slime','slime'],['shield','sword','slime']];
ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(ex - 8, gy - 8, 96 * 3 + 16, 96 * 3 + 16);
ctx.fillStyle = g2; ctx.fillRect(ex, gy, 288, 288);
egrid.forEach((row, j) => row.forEach((id, i) => spr(id, ex + i * 96 + 8, gy + j * 96 + 8, 5)));

// HUD mock
let hx = 700, hy = gy;
spr('playerPortrait', hx, hy, 4); spr('enemyPortrait', hx + 110, hy, 4);
hy += 110;
spr('heart', hx, hy, 4); ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(hx + 40, hy + 4, 240, 24);
ctx.fillStyle = UI_COLORS.hpGhost; ctx.fillRect(hx + 40, hy + 4, 180, 24); ctx.fillStyle = UI_COLORS.hp; ctx.fillRect(hx + 40, hy + 4, 140, 24);
hy += 40;
spr('shieldIcon', hx, hy, 4); ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(hx + 40, hy + 4, 240, 24);
ctx.fillStyle = UI_COLORS.shield; ctx.fillRect(hx + 40, hy + 4, 90, 24);
hy += 40;
spr('boltIcon', hx, hy, 4);
for (let i = 0; i < 5; i++) spr(i < 3 ? 'pipFull' : 'pipEmpty', hx + 40 + i * 40, hy, 4);
hy += 50;
spr('swordProjectile', hx, hy, 5); spr('swordProjectile', hx + 80, hy, 5, 1, true);
spr('slimeBlob', hx + 170, hy + 10, 5); spr('spark', hx + 230, hy + 10, 6); spr('spark', hx + 270, hy + 20, 3);
};
drawAll();
</script></body></html>
`;
writeFileSync(join(ROOT, 'tools/art-preview.html'), html);
console.log('tools/art-preview.html written');
