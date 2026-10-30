// usage: node run.mjs <draw.js> <out.png> [w] [h]   draw.js body gets (ctx, m, W, H) where m = loaded game modules
import { readFileSync, writeFileSync } from 'node:fs';
const [file, out, w = 920, h = 430] = process.argv.slice(2);
const body = (process.env.G ? 'const GG = ' + process.env.G + ';\n' : '') + readFileSync(new URL('./bg.js', import.meta.url), 'utf8') + '\n' + readFileSync(file, 'utf8');
const code = `
const m = {
  sprites: await import('/src/render/sprites.ts'),
  title: await import('/src/ui/menu/title.ts'),
  text: await import('/src/render/text.ts'),
  layout: await import('/src/present/layout.ts'),
};
const W = ${w}, H = ${h};
const c = document.createElement('canvas'); c.width = W; c.height = H;
const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
await (async (ctx, m, W, H) => { ${body} })(ctx, m, W, H);
return c.toDataURL('image/png');`;
const r = await fetch('http://localhost:5301/eval', { method: 'POST', body: code });
const j = await r.json();
if (typeof j !== 'string') { console.error(j); process.exit(1); }
writeFileSync(out, Buffer.from(j.split(',')[1], 'base64'));
console.log(out);
