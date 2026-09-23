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

const W = 1400, H = 5400;
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
  ctx.fillStyle = '#1f0c2e'; ctx.fillRect(0, 0, W, H); let zx = 10, zy = 10, rowH = 0;
  for (const id of ids) {
    const w = SPRITES[id][0].length, h = SPRITES[id].length;
    if (zx + w * s > W) { zx = 10; zy += rowH + s; rowH = 0; }
    rowH = Math.max(rowH, h * s);
    if (id === 'goo') spr('sword', zx, zy, s, 0.2);
    if (id === 'frozenOverlay' || id === 'lockOverlay' || id.startsWith('enh')) spr(id === 'enhCharged' ? 'bolt' : 'sword', zx, zy, s);
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

// 4) run additions: overlays on player symbols at 5x
let ry = gy + 288 + 60;
label('overlays on sword / shield (5x)', 20, ry - 10);
const cellBg = (x, y) => { const gg = ctx.createLinearGradient(0, y, 0, y + 96); gg.addColorStop(0, '#29123d'); gg.addColorStop(1, '#0d0519'); ctx.fillStyle = gg; ctx.fillRect(x, y, 96, 96); };
[['sword','frozenOverlay'],['shield','frozenOverlay'],['sword','lockOverlay'],['shield','lockOverlay'],['bolt','frozenOverlay'],['slime','lockOverlay']].forEach(([a, o], i) => {
  const cx = 20 + i * 110; cellBg(cx, ry); spr(a, cx + 8, ry + 8, 5); spr(o, cx + 8, ry + 8, 5);
});
// enemy-written reel: player strip mixed with enemy symbols
const ex2 = 700; label('enemy symbols in a reel (5x)', ex2, ry - 10);
ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(ex2 - 8, ry - 8, 96 * 6 + 16, 96 + 16);
['ice','claw','rock','lock','coin','seven'].forEach((id, i) => { cellBg(ex2 + i * 96, ry); spr(id, ex2 + i * 96 + 8, ry + 8, 5); });
ry += 150;
// relics on a dark card panel
label('relics on card panel (4x)', 20, ry - 10);
const relics = Object.keys(SPRITES).filter((k) => k.startsWith('relic'));
for (let r0 = 0; r0 < relics.length; r0 += 14) {
  const row = relics.slice(r0, r0 + 14);
  ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(12, ry - 8, row.length * 84 + 16, 100);
  ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(16, ry - 4, row.length * 84 + 8, 92);
  row.forEach((id, i) => { ctx.fillStyle = UI_COLORS.panelLight; ctx.fillRect(24 + i * 84, ry + 4, 76, 76); spr(id, 30 + i * 84, ry + 10, 4); });
  ry += 110;
}
ry += 20;
// portraits line-up at 4x on a dark panel
label('enemy roster (4x)', 20, ry - 10);
['playerPortrait','enemyPortrait','enemyBrute','enemyFrost','enemyThief','enemyGolem','enemyGremlin','enemyBoss'].forEach((id, i) => {
  ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(20 + i * 116, ry, 108, 108); spr(id, 26 + i * 116, ry + 6, 4);
});
ry += 140;
// intent telegraph chips + map path
label('intent chips (4x) + map path (4x)', 20, ry - 10);
['icoFlood','icoSmash','icoFreeze','icoSteal','icoLock','icoRock','icoCoin','plusBadge','minusBadge','skull'].forEach((id, i) => {
  ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(20 + i * 52, ry, 44, 44); spr(id, 26 + i * 52, ry + 6, 4);
});
const mx = 580, my = ry + 20;
ctx.fillStyle = UI_COLORS.panelLight; ctx.fillRect(mx, my + 22, 7 * 90, 4);
['nodeDone','nodeDone','nodeFight','nodeFight','nodeFight','nodeFight','nodeBoss'].forEach((id, i) => spr(id, mx + i * 90, my, 4));
spr('nodeHere', mx + 2 * 90, my - 50, 4);
ry += 120;
// WILD next to the other reel symbols (5x)
label('wild among reel symbols (5x)', 20, ry - 10);
const reelIds = ['sword', 'wild', 'shield', 'bolt', 'slime', 'ice', 'coin', 'seven'];
ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(12, ry - 8, 96 * reelIds.length + 16, 96 + 16);
reelIds.forEach((id, i) => { cellBg(20 + i * 96, ry); spr(id, 28 + i * 96, ry + 8, 5); });
ry += 140;
// enhancement overlays over sword / shield / bolt (5x)
label('enhanced-cell overlays over sword / shield / bolt (5x)', 20, ry - 10);
const enh = ['enhGold', 'enhKeen', 'enhCharged', 'enhSpiked'];
enh.forEach((o, j) => ['sword', 'shield', 'bolt', 'wild'].forEach((a, i) => {
  const cx = 20 + ((j % 2) * 4 + i) * 102 + (j % 2) * 24, cy = ry + (j >> 1) * 110; cellBg(cx, cy); spr(a, cx + 8, cy + 8, 5); spr(o, cx + 8, cy + 8, 5);
}));
ry += 240;
// run/boss UI: lethal pot vs tier 3, fork card badges, cards (4x)
label('pots tier3 / tier4, elite badge + danger pips, cards (4x)', 20, ry - 10);
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(20, ry, 420, 110);
spr('potTier3', 30, ry + 6, 4); spr('potTier4', 140, ry + 6, 4);
spr('mapBadgeElite', 260, ry + 10, 4); spr('nodeBoss', 300, ry + 6, 4);
for (let i = 0; i < 3; i++) spr('dangerPip', 260 + i * 36, ry + 60, 4);
ctx.fillStyle = UI_COLORS.panelLight; ctx.fillRect(460, ry, 160, 110);
spr('cardPrep', 470, ry + 20, 4); spr('cardGild', 545, ry + 20, 4);
// 2x readability strip
['potTier4', 'mapBadgeElite', 'dangerPip', 'cardPrep', 'wild', 'cardGild'].forEach((id, i) => spr(id, 660 + i * 60, ry + 20, 2));
ry += 150;
// gild readability: X2 stamp popping off gilded cells, strip-map ticks (1x / 2x / 4x)
label('X2 stamp over gilded cells (5x) + strip-map ticks (1x, 2x, 4x, 6x)', 20, ry - 10);
['sword', 'bolt', 'shield'].forEach((a, i) => {
  const cx = 20 + i * 102; cellBg(cx, ry); spr(a, cx + 8, ry + 8, 5); spr('enhGold', cx + 8, ry + 8, 5); spr('stampX2', cx + 18, ry - 4 + i * 6, 5);
});
spr('stampX2', 340, ry + 10, 1); spr('stampX2', 360, ry + 10, 2); spr('stampX2', 400, ry + 10, 3);
const ticks = ['tickGold', 'tickKeen', 'tickCharged', 'tickSpiked'];
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(480, ry, 420, 96);
let tx = 490; [1, 2, 4, 6].forEach((s) => { ticks.forEach((id) => { spr(id, tx, ry + 10, s); tx += s * 5 + 4; }); tx += 16; });
// mini strip map: 3 reels x 8 cells with ticks beside symbols (2x)
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(920, ry, 380, 96);
const strip = ['sword', 'bolt', 'shield', 'sword', 'bolt', 'wild', 'shield', 'sword'];
strip.forEach((id, i) => {
  const sx = 930 + i * 44; spr(id, sx, ry + 10, 2);
  const t = [0, 2, -1, 1, 3, -1, 0, 1][i]; if (t >= 0) { spr(ticks[t], sx + 11, ry + 48, 2); spr(ticks[t], sx + 13, ry + 70, 1); }
});
ry += 140;
// redrawn keen / charged overlays over every player symbol (5x)
label('redrawn enhKeen / enhCharged over sword / shield / bolt / wild (5x)', 20, ry - 10);
['enhKeen', 'enhCharged'].forEach((o, j) => ['sword', 'shield', 'bolt', 'wild'].forEach((a, i) => {
  const cx = 20 + (j * 4 + i) * 102 + j * 24; cellBg(cx, ry); spr(a, cx + 8, ry + 8, 5); spr(o, cx + 8, ry + 8, 5);
}));
ry += 130;
// the cashier's shop: portrait, pot skim, chip economy, items on display cushions (4x)
label('THE CASHIER: portrait, skim, chips, shop slots with relics (4x)', 20, ry - 10);
ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(12, ry - 8, 1240, 132);
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(16, ry - 4, 1232, 124);
spr('cashierPortrait', 26, ry + 6, 4); spr('playerPortrait', 136, ry + 6, 4);
spr('potSkim', 250, ry + 10, 4); text('SKIM 22', 306, ry + 22, 3, UI_COLORS.gold);
spr('chip', 250, ry + 66, 4); text('x 137', 306, ry + 78, 3, UI_COLORS.text);
['relicMidas', 'relicRod', 'relicCactus', 'relicPrism', 'relicHone', 'cardGild'].forEach((id, i) => {
  const sx = 470 + i * 128; spr('shopSlot', sx, ry + 16, 4); spr(id, sx + 16, ry + 0, 4);
  spr('chip', sx + 20, ry + 102, 2); text(String(20 + i * 15), sx + 42, ry + 104, 2, UI_COLORS.gold);
});
ry += 150;
// 1x / 2x readability strip for all new sprites
label('new sprites at 1x and 2x', 20, ry - 10);
['relicMidas', 'relicRod', 'relicCactus', 'relicPrism', 'relicHone', 'stampX2', 'tickGold', 'tickKeen', 'tickCharged', 'tickSpiked', 'potSkim', 'chip', 'cashierPortrait', 'shopSlot', 'enhKeen', 'enhCharged']
  .forEach((id, i) => { spr(id, 20 + i * 70, ry, 1); spr(id, 20 + i * 70 + 26, ry, 2); });
ry += 80;
// run-select: the cabinets in a row at 3x on the dark UI panel
label('CABINETS: run-select row (3x) on #1a1426', 20, ry - 10);
const cabs = ['cabinetKnight', 'cabinetMidas', 'cabinetThorn', 'cabinetTesla', 'cabinetJoker', 'cabinetLocked'];
ctx.fillStyle = UI_COLORS.gold; ctx.fillRect(12, ry - 8, 6 * 164 + 24, 64 * 3 + 64);
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(16, ry - 4, 6 * 164 + 16, 64 * 3 + 56);
cabs.forEach((id, i) => {
  const cx = 28 + i * 164;
  if (i === 0) { ctx.fillStyle = UI_COLORS.panelLight; ctx.fillRect(cx - 6, ry + 2, 156, 64 * 3 + 12); }
  spr(id, cx, ry + 8, 3);
  text(['KNIGHT', 'MIDAS', 'THORN', 'TESLA', 'JOKER', '???'][i], cx + 8, ry + 64 * 3 + 20, 2, i === 5 ? UI_COLORS.textDim : UI_COLORS.gold);
});
// 1x / 2x readability of the cabinets
cabs.forEach((id, i) => spr(id, 1034 + (i % 3) * 54, ry + 8 + (i < 3 ? 0 : 72), 1));
spr('cabinetKnight', 1200, ry + 8, 2); // 1x strip + 2x knight
ry += 64 * 3 + 80;
// economy / shop UI: chip shield, FITS tag on a shop item, cashier heal tin, full-set star (4x) + 1x/2x strip
label('ECONOMY / FULL SET: chipShield, tagBuild over a shop slot, shopHeal, setStar (4x, 2x, 1x)', 20, ry - 10);
ctx.fillStyle = UI_COLORS.panel; ctx.fillRect(16, ry - 4, 1232, 130);
spr('chipShield', 30, ry + 10, 4); text('x 42', 88, ry + 22, 3, UI_COLORS.text);
spr('shopSlot', 230, ry + 16, 4); spr('relicHone', 246, ry + 0, 4); spr('tagBuild', 300, ry + 6, 3);
spr('shopSlot', 370, ry + 16, 4); spr('shopHeal', 386, ry + 0, 4); spr('chip', 390, ry + 104, 2); text('15', 412, ry + 106, 2, UI_COLORS.gold);
spr('setStar', 520, ry + 10, 4); text('FULL SET', 590, ry + 26, 3, UI_COLORS.gold);
['sword', 'bolt', 'shield'].forEach((a, i) => { const cx = 780 + i * 102; cellBg(cx, ry + 10); spr(a, cx + 8, ry + 18, 5); spr('enhGold', cx + 8, ry + 18, 5); });
spr('setStar', 1076, ry - 2, 3);
ry += 150;
['chipShield', 'tagBuild', 'shopHeal', 'setStar'].forEach((id, i) => { spr(id, 20 + i * 110, ry, 1); spr(id, 20 + i * 110 + 30, ry, 2); });
};
drawAll();
</script></body></html>
`;
writeFileSync(join(ROOT, 'tools/art-preview.html'), html);
console.log('tools/art-preview.html written');
