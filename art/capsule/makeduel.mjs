// node makeduel.mjs [name...]: renders THE DUEL variants (duel.json, duel.js) into out/<name>.png (needs serve.cjs)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const duel = readFileSync(new URL('./duel.js', import.meta.url), 'utf8');
const F = JSON.parse(readFileSync(new URL('./duel.json', import.meta.url), 'utf8'));
mkdirSync('out', { recursive: true });
for (const [name, fm] of Object.entries(F)) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(name)) continue;
  const js = `const L = ${JSON.stringify(fm.L).replace(/"(CHERRY|SEVEN|DIAMOND|SPADE)"/g, '$1')};\n` + duel;
  writeFileSync(`out/${name}.js`, js);
  execFileSync('node', ['run.mjs', `out/${name}.js`, `out/${name}.png`, String(fm.w), String(fm.h)], { env: { ...process.env, G: String(fm.G) }, stdio: 'inherit' });
}
