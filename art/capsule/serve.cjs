// The eval server run.mjs talks to (:5301): a headless page on the game's dev server, which runs each POSTed body as
// an async function and answers with its JSON result. Start the game first (npx vite --port 5331), then:
//   node art/capsule/serve.cjs [gamePort=5331]      and, in art/capsule:  node make.mjs [name...]
const { chromium } = require('playwright');
const http = require('node:http');
const PORT = process.argv[2] || '5331';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.error('[page]', e.message));
  await p.goto(`http://localhost:${PORT}/`);
  await p.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 30000 });
  http
    .createServer((req, res) => {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', async () => {
        try {
          const out = await p.evaluate((code) => new Function(`return (async () => {${code}})()`)(), body);
          res.end(JSON.stringify(out));
        } catch (e) {
          res.end(JSON.stringify({ error: String(e && e.message) }));
        }
      });
    })
    .listen(+(process.env.EVAL_PORT || 5301), () => console.log('eval server on :5301, game on :' + PORT));
})();
