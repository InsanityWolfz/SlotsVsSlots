// node make2.mjs [name...]: renders the capsule v2 direction thumbnails (vs, poster, payline) at the main capsule size
// (1232x706) into OUT (default ../../../tools/out/capsule2). Needs serve.cjs (EVAL_PORT) on a game dev server.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const here = (f) => new URL(f, import.meta.url);
const OUT = process.env.OUT || new URL('../../../tools/out/capsule2/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
mkdirSync(here('./out/').pathname, { recursive: true });
const kit = readFileSync(here('./kit.js'), 'utf8');
const P = +(process.env.P || 5);
for (const name of process.argv.length > 2 ? process.argv.slice(2) : ['vs', 'poster', 'payline']) {
  const js = `const PP = ${P};\n` + kit + '\n' + readFileSync(here(`./${name}.js`), 'utf8');
  const tmp = here(`./out/${name}.js`).pathname;
  writeFileSync(tmp, js);
  execFileSync('node', [here('../run.mjs').pathname, tmp, `${OUT}/${name}.png`, '1232', '706'], { env: { ...process.env, G: String(P) }, stdio: 'inherit' });
}
