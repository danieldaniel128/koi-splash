import { defineConfig } from 'vitest/config';

// base './' keeps asset paths relative, so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  server: { host: true }, // reachable from a phone on the same Wi-Fi
  test: { include: ['tests/**/*.test.ts'] },
});
