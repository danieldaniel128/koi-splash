import { runnerImport } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// base './' keeps asset paths relative, so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  base: './',
  plugins: [themeInPage()],
  build: { target: 'es2022', outDir: 'dist' },
  server: { host: true }, // reachable from a phone on the same Wi-Fi
  test: { include: ['tests/**/*.test.ts'] },
});

/** The part of src/theme/theme.ts the page needs. */
interface ThemeModule {
  pageTheme(): { readonly styleSheet: string; readonly themeColor: string };
}

/**
 * Writes the theme into index.html: its tokens as CSS variables and the browser's theme colour, so the page is
 * styled from its very first paint, before any script has run. The theme is TypeScript, so Vite's own module runner
 * loads it, the way it loads the game.
 */
function themeInPage(): Plugin {
  return {
    name: 'theme-in-page',
    async transformIndexHtml() {
      const { module } = await runnerImport<ThemeModule>('/src/theme/theme.ts', { configFile: false });
      const page = module.pageTheme();
      return [
        { tag: 'meta', attrs: { name: 'theme-color', content: page.themeColor }, injectTo: 'head' },
        { tag: 'style', children: page.styleSheet, injectTo: 'head' },
      ];
    },
  };
}
