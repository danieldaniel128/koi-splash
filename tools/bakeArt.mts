// npm run bake:art: bakes the game's art into the texture atlases it ships (see "Asset pipeline" in the README).
// It starts Vite and a headless Chrome (or Edge), opens the bake page (tools/bake), and for each tier has it paint
// every picture with the game's own painters and pack them into sheets. Each sheet is written to public/art/@<n>x/
// as a PNG and a Pixi spritesheet JSON, with sheets.json listing them for the game to load.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { Browser } from 'playwright-core';
import { createServer } from 'vite';

/** One packed sheet, as the bake page hands it over (see tools/bake/bakePage.ts). */
interface BakedSheet {
  readonly png: string;
  readonly width: number;
  readonly height: number;
  readonly frames: Record<string, { x: number; y: number; width: number; height: number }>;
}

/** What the bake page puts on its window. */
interface BakePage {
  readonly artTiers: readonly number[];
  readonly bakeArt: (tier: number) => BakedSheet[];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'art');

/** Pixi's spritesheet JSON for one sheet: every frame untrimmed, at one pixel per texture pixel. */
function spritesheetJson(sheet: BakedSheet, image: string): string {
  const frames = Object.fromEntries(
    Object.entries(sheet.frames).map(([name, { x, y, width: w, height: h }]) => [
      name,
      {
        frame: { x, y, w, h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w, h },
        sourceSize: { w, h },
      },
    ]),
  );
  const meta = { image, format: 'RGBA8888', size: { w: sheet.width, h: sheet.height }, scale: '1' };
  return `${JSON.stringify({ frames, meta })}\n`;
}

/** Writes one tier's sheets into public/art/@<tier>x/, replacing what was there. */
function writeTier(tier: number, sheets: readonly BakedSheet[]): void {
  const folder = path.join(OUT, `@${tier}x`);
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  const listed = sheets.map((sheet, i) => {
    const image = `sheet-${i}.png`;
    writeFileSync(
      path.join(folder, image),
      Buffer.from(sheet.png.replace(/^data:image\/png;base64,/, ''), 'base64'),
    );
    writeFileSync(path.join(folder, `sheet-${i}.json`), spritesheetJson(sheet, image));
    return `sheet-${i}.json`;
  });
  writeFileSync(path.join(folder, 'sheets.json'), `${JSON.stringify(listed)}\n`);
  const frames = sheets.reduce((sum, sheet) => sum + Object.keys(sheet.frames).length, 0);
  console.warn(`@${tier}x: ${frames} frames on ${sheets.length} sheet(s)`); // the bake's report, on stderr
}

/** A headless Chrome, or Edge when there is no Chrome. */
async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return chromium.launch({ channel: 'msedge' });
  }
}

const server = await createServer({ root: ROOT, logLevel: 'warn', server: { port: 0 } });
await server.listen();
const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  page.on('pageerror', (error) => {
    console.error(error);
  });
  const base = server.resolvedUrls?.local[0] ?? 'http://localhost:5173/';
  await page.goto(new URL('tools/bake/index.html', base).href);
  await page.waitForFunction(
    () => typeof (globalThis as unknown as Partial<BakePage>).bakeArt === 'function',
  );
  const tiers = await page.evaluate(() => [...(globalThis as unknown as BakePage).artTiers]);
  for (const tier of tiers) {
    writeTier(tier, await page.evaluate((t) => (globalThis as unknown as BakePage).bakeArt(t), tier));
  }
} finally {
  await browser.close();
  await server.close();
}
