import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
let commit = '';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  // No git (a source zip): the version alone.
}

export default defineConfig({
  // Relative asset paths so the build works from any folder (itch.io, GitHub Pages, Netlify...).
  base: './',
  server: { port: 5173 },
  // Shown on the main menu and in crash reports, so a bug report can name its build.
  define: { __APP_VERSION__: JSON.stringify(commit ? `${pkg.version}+${commit}` : pkg.version) },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
