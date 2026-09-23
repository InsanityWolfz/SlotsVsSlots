import { FONT_H, FONT_W, GLYPHS } from './fontData';

const OUTLINE = '#140c1c';
const cache = new Map<string, HTMLCanvasElement>();

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** Render a string at 1x with a 1px outline ring. Cached per (text, color, outline). */
function textCanvas(text: string, color: string, outline: string | null): HTMLCanvasElement {
  const key = `${text}|${color}|${outline}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const chars = [...text.toUpperCase()];
  const pad = outline ? 1 : 0;
  const w = Math.max(1, chars.length * (FONT_W + 1) - 1 + pad * 2);
  const h = FONT_H + pad * 2;
  const ink = new Uint8Array(w * h);
  chars.forEach((ch, n) => {
    const g = GLYPHS[ch] ?? GLYPHS[' '];
    if (!g) return;
    const ox = pad + n * (FONT_W + 1);
    for (let y = 0; y < FONT_H; y++) for (let x = 0; x < FONT_W; x++) if (g[y]?.[x] === '#') ink[(y + pad) * w + ox + x] = 1;
  });

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const [r, gg, b] = hexToRgb(color);
  const o = outline ? hexToRgb(outline) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let px: [number, number, number] | null = null;
      if (ink[i]) px = [r, gg, b];
      else if (o) {
        outer: for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h && ink[yy * w + xx]) {
              px = o;
              break outer;
            }
          }
      }
      if (!px) continue;
      img.data[i * 4] = px[0];
      img.data[i * 4 + 1] = px[1];
      img.data[i * 4 + 2] = px[2];
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (cache.size > 600) cache.clear();
  cache.set(key, c);
  return c;
}

export interface TextOpts {
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  outline?: string | null;
  alpha?: number;
  /** Extra scale multiplier around the anchor point (for punches). */
  punch?: number;
  rot?: number;
}

export function textWidth(text: string, scale: number): number {
  return ([...text].length * (FONT_W + 1) - 1) * scale;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string, o: TextOpts = {}): void {
  if (!text) return;
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  const img = textCanvas(text, color, o.outline === undefined ? OUTLINE : o.outline);
  const k = scale * (o.punch ?? 1);
  const w = img.width * k;
  const h = img.height * k;
  const ax = o.align === 'left' ? 0 : o.align === 'right' ? w : w / 2;
  const ay = o.valign === 'top' ? 0 : o.valign === 'bottom' ? h : h / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.drawImage(img, -ax, -ay, w, h);
  ctx.restore();
}
