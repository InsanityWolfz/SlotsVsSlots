// Scratch renderer for preview sprites: the game's palette + its 1px outline rule, written as PNGs (no deps).
import { writeFileSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
const src = readFileSync(new URL('../build-art.mjs', import.meta.url), 'utf8');
export const PALETTE = Function(`return ${src.slice(src.indexOf('const PALETTE = {') + 16, src.indexOf('};', src.indexOf('const PALETTE = {')) + 1)}`)();
export function outline(rows, c = 'K') {
  const h = rows.length, w = rows[0].length;
  const g = rows.map((r) => r.split(''));
  const out = g.map((r) => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== '.') continue;
    const n = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.');
    if (n) out[y][x] = c;
  }
  return out.map((r) => r.join(''));
}
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
export function png(rows, scale, bg = null) {
  const h = rows.length, w = rows[0].length, W = w * scale, H = h * scale;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0;
    for (let x = 0; x < W; x++) {
      const ch = rows[Math.floor(y / scale)][Math.floor(x / scale)];
      const hex = ch === '.' ? bg : PALETTE[ch];
      if (ch !== '.' && !hex) throw new Error(`bad char ${ch}`);
      const o = y * (W * 4 + 1) + 1 + x * 4;
      if (hex) { raw[o] = parseInt(hex.slice(1, 3), 16); raw[o + 1] = parseInt(hex.slice(3, 5), 16); raw[o + 2] = parseInt(hex.slice(5, 7), 16); raw[o + 3] = 255; }
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
export function check(name, rows, size) {
  if (rows.length !== size) throw new Error(`${name}: ${rows.length} rows, want ${size}`);
  rows.forEach((r, i) => { if (r.length !== size) throw new Error(`${name} row ${i}: ${r.length} cols, want ${size}`); });
}
