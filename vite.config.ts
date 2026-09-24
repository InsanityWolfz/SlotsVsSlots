import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works from any folder (itch.io, GitHub Pages, Netlify...).
  base: './',
  server: { port: 5173 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
