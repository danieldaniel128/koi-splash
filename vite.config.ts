import { runnerImport } from 'vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// base './' keeps asset paths relative, so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  base: './',
  plugins: [themeInPage()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    rolldownOptions: {
      output: {
        // The libraries get chunks of their own, so the game's chunk stays small and a new build of the game doesn't
        // make the browser download them again. Each group takes only what loads at startup ('$initial'), not what
        // that pulls in, so the setup PixiJS loads on its own (browserAll, init) stays lazy and PixiJS's chunk stays
        // under the 500 kB warning.
        codeSplitting: {
          groups: [
            {
              name: 'pixi',
              test: /node_modules[\\/]pixi\.js/,
              priority: 2,
              tags: ['$initial'],
              includeDependenciesRecursively: false,
            },
            {
              name: 'gsap',
              test: /node_modules[\\/]gsap/,
              priority: 1,
              tags: ['$initial'],
              includeDependenciesRecursively: false,
            },
            {
              // the small libraries PixiJS uses: left in the game's chunk, PixiJS's chunk would import them from
              // it while the game's chunk imports PixiJS, a loop that breaks at startup
              name: 'vendor',
              test: /node_modules/,
              tags: ['$initial'],
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
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
