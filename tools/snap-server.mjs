// Tiny dev-only helper: receives canvas PNG data URLs from the game page and writes them to disk,
// so frames can be inspected even when the browser pane isn't painting (window hidden).
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), 'tools', 'snaps');
mkdirSync(out, { recursive: true });
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.end();
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const name = (new URL(req.url, 'http://x').searchParams.get('name') || `snap-${Date.now()}`).replace(/[^\w-]/g, '');
    const b64 = body.replace(/^data:image\/\w+;base64,/, '');
    const file = join(out, `${name}.png`);
    writeFileSync(file, Buffer.from(b64, 'base64'));
    res.end(file);
  });
}).listen(5199, () => console.log('snap server on :5199 ->', out));
