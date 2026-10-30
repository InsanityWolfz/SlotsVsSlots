// Keyword icon sheet: every kw_<word>.mjs outlined, at x4 and x2, on the panel colour, labelled, in keyword order.
// usage: node sheet.mjs [out.png]   (also checks size and the 1px transparent margin)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { PALETTE, outline } from '../render.mjs';
const dir = new URL('.', import.meta.url).pathname;
export const ORDER = ['payline', 'pair', 'jackpot', 'wild', 'shield', 'pierce', 'heal', 'charm', 'level', 'meter', 'bust', 'allin', 'hold', 'overtime', 'sabotage', 'mark', 'spill', 'rock', 'iou', 'frozen', 'jinx', 'steal'];
const LABEL = { allin: 'ALL IN' };
const COLOR = { payline: '#fff6c0', pair: '#ffc93c', jackpot: '#ff6a4a', wild: '#ff9ab0', shield: '#6ab4ff', pierce: '#bff4ff', heal: '#7dff7a', charm: '#c9a0ff', level: '#5ad8e8', meter: '#ffd23f', bust: '#ff8a7a', allin: '#ff6a5a', hold: '#ffe28a', overtime: '#ff9a3a', sabotage: '#d0a0ff', mark: '#ffb0ff', spill: '#4cc234', rock: '#c9bba8', iou: '#ff9a3a', frozen: '#b4f4ff', jinx: '#c795f0', steal: '#f4c09a' };
// 3x5 pixel font
const F = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000' };
const ARGS = process.argv.slice(2);
const out = ARGS[0] || `${dir}keyword_icons.png`;
const only = ARGS[1] ? ARGS[1].split(',') : ORDER;
const icons = [];
for (const n of only) {
  const r = (await import(`${dir}kw_${n}.mjs?${Date.now()}`)).rows();
  if (r.length !== 12 || r.some((x) => x.length !== 12)) throw new Error(`${n}: not 12x12`);
  r.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.' && (x === 0 || y === 0 || x === 11 || y === 11)) throw new Error(`${n}: margin pixel at ${x},${y}`); if (c !== '.' && !PALETTE[c]) throw new Error(`${n}: bad colour ${c}`); }));
  const filled = r.join('').replace(/\./g, '').length;
  icons.push({ n, o: outline(r), filled });
}
const COLS = 6, BG = [0x1a, 0x14, 0x26];
const cellW = 12 * 4 + 12 * 2 + 4 * 3 + 16, cellH = 48 + 18;
const W = COLS * cellW + 16;
let lines = 1; { let tx = 8; for (const { n } of icons) { const wpx = 26 + (LABEL[n] || n).length * 8 + 12; if (tx + wpx > W - 8) { tx = 8; lines++; } tx += wpx; } }
const stripY = Math.ceil(icons.length / COLS) * cellH + 16;
const H = stripY + lines * 28 + 8;
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) px.set(BG, i * 3);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) px.set(c, (j * W + i) * 3); };
const sprite = (rows, x, y, s) => rows.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') rect(x + i * s, y + j * s, s, s, hex(PALETTE[c])); }));
const text = (s, x, y, sc, c) => { [...s].forEach((ch, k) => { const g = F[ch] || F[' ']; for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') rect(x + (k * 4 + i) * sc, y + j * sc, sc, sc, c); }); };
icons.forEach(({ n, o }, k) => {
  const cx = 8 + (k % COLS) * cellW, cy = 8 + Math.floor(k / COLS) * cellH;
  sprite(o, cx, cy, 4);
  sprite(o, cx + 52, cy + 12, 2);
  sprite(o, cx + 52 + 28, cy + 18, 1);
  text((LABEL[n] || n).toUpperCase(), cx, cy + 52, 2, hex(COLOR[n]));
});
// in-context strip: x2 icon beside its word at x2, as a tooltip line would show it
{
  let tx = 8, ty = stripY;
  icons.forEach(({ n, o }) => {
    const word = (LABEL[n] || n).toUpperCase();
    const wpx = 26 + word.length * 8 + 12;
    if (tx + wpx > W - 8) { tx = 8; ty += 28; }
    sprite(o, tx, ty, 2); text(word, tx + 28, ty + 7, 2, hex(COLOR[n])); tx += wpx;
  });
}
// PNG (RGB)
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(out, icons.map((i) => `${i.n}:${i.filled}`).join(' '));
