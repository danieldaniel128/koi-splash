import { describe, expect, it } from 'vitest';
import { planBackdrop } from '../src/art/backdrop';
import { GARDEN_ROOM, LAYOUT } from '../src/config/layout';
import { LEVEL } from '../src/config/level';
import { layoutGame } from '../src/layout/gameLayout';
import { parseShape } from '../src/model/shape';
import type { LayoutConfig } from '../src/config/layout';
import type { GameLayout } from '../src/layout/gameLayout';

const CONFIG: LayoutConfig = {
  cols: 7,
  rows: 9,
  designWidth: 360,
  designHeight: 640,
  hudHeight: 56,
  barHeight: 64,
  sidePadding: 12,
  sectionGap: 14,
  shoreWidth: 12,
  pondMargin: { left: 26, right: 26, top: 24, bottom: 70 },
  cellGap: 4,
  pondAlign: 0.5,
  garden: { beside: 120, sky: 0 },
  minCell: 36,
  pillHeight: 40,
  pillGap: 12,
};
const NO_INSETS = { top: 0, bottom: 0 };

describe('layoutGame', () => {
  it('fills the screen with no letterboxing', () => {
    for (const screen of [
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
    ]) {
      const { stage } = layoutGame(screen, NO_INSETS, CONFIG);
      expect(stage.width * stage.scale).toBeCloseTo(screen.width);
      expect(stage.height * stage.scale).toBeCloseTo(screen.height);
      expect(stage.width).toBeGreaterThanOrEqual(360 - 1e-6);
      expect(stage.height).toBeGreaterThanOrEqual(640 - 1e-6);
    }
  });

  it('stacks the HUD, the pond and the bar without overlap, inside the stage', () => {
    const { stage, hud, pond, bar } = layoutGame(
      { width: 390, height: 844 },
      { top: 47, bottom: 34 },
      CONFIG,
    );
    expect(hud.y).toBeGreaterThanOrEqual(47 / stage.scale);
    expect(pond.y - CONFIG.shoreWidth).toBeGreaterThanOrEqual(hud.y + hud.height);
    expect(bar.y).toBeGreaterThanOrEqual(pond.y + pond.height + CONFIG.shoreWidth);
    expect(bar.y + bar.height).toBeLessThanOrEqual(stage.height - 34 / stage.scale);
  });

  it('puts the instruction pill just over the board, lined up with the HUD', () => {
    const { hud, board, pill } = layoutGame({ width: 390, height: 844 }, NO_INSETS, CONFIG);
    expect(pill.y + pill.height + CONFIG.pillGap).toBeCloseTo(board.y);
    expect(pill.height).toBe(CONFIG.pillHeight);
    expect([pill.x, pill.width]).toEqual([hud.x, hud.width]);
  });

  it('on a tall phone the pond takes the full width, on screen, and the bar moves down to the bottom', () => {
    const design = layoutGame({ width: 360, height: 640 }, NO_INSETS, CONFIG);
    const tall = layoutGame({ width: 390, height: 844 }, NO_INSETS, CONFIG);
    const edge = CONFIG.sidePadding + CONFIG.shoreWidth; // the shore's stones stay on screen
    expect(tall.pond.x).toBeCloseTo(edge);
    expect(tall.pond.width).toBeCloseTo(tall.stage.width - edge * 2);
    expect(tall.bar.y).toBeGreaterThan(design.bar.y);
  });

  it('on a tablet the stage grows wider and the koi grow on screen, with the board centred', () => {
    const design = layoutGame({ width: 360, height: 640 }, NO_INSETS, CONFIG);
    const tablet = layoutGame({ width: 768, height: 1024 }, NO_INSETS, CONFIG);
    expect(tablet.stage.width).toBeGreaterThan(design.stage.width);
    expect(tablet.board.cellSize * tablet.stage.scale).toBeGreaterThan(
      design.board.cellSize * design.stage.scale,
    );
    expect(tablet.pond.x * 2 + tablet.pond.width).toBeCloseTo(tablet.stage.width);
  });

  it('on a wide screen the HUD and the bar line up with the pond and its shore', () => {
    const { hud, bar, pond } = layoutGame({ width: 1280, height: 720 }, NO_INSETS, CONFIG);
    expect(hud.width).toBeCloseTo(pond.width + CONFIG.shoreWidth * 2);
    expect(hud.x).toBeCloseTo(pond.x - CONFIG.shoreWidth);
    expect(bar.x).toBeCloseTo(hud.x);
  });

  it('sits the pond low when asked, leaving the scene above it', () => {
    const screen = { width: 390, height: 844 };
    const centred = layoutGame(screen, NO_INSETS, CONFIG);
    const low = layoutGame(screen, NO_INSETS, { ...CONFIG, pondAlign: 0.8 });
    expect(low.pond.y).toBeGreaterThan(centred.pond.y);
    expect(low.scene.height).toBeCloseTo(low.pond.y - CONFIG.shoreWidth);
    expect(low.bar.y).toBeGreaterThanOrEqual(low.pond.y + low.pond.height + CONFIG.shoreWidth);
  });

  it('keeps the gap between pieces', () => {
    const tablet = layoutGame({ width: 1024, height: 1366 }, NO_INSETS, CONFIG).board;
    expect(tablet.koiSize).toBe(tablet.cellSize - 4);
  });

  it("shrinks the cell for the garden's sky only down to minCell", () => {
    const greedy = { ...CONFIG, garden: { beside: 120, sky: 400 } };
    expect(layoutGame({ width: 360, height: 640 }, NO_INSETS, greedy).board.cellSize).toBeCloseTo(
      CONFIG.minCell,
    );
  });
});

describe("layoutGame with the game's own layout", () => {
  /** The garden's frame for a layout, as the game paints it. */
  const gardenOf = (layout: GameLayout): ReturnType<typeof planBackdrop> & { sky: number } => {
    const { stage, hud, pond, scene } = layout;
    const shore = LAYOUT.shoreWidth;
    const open = hud.y + hud.height;
    const plan = planBackdrop({
      width: stage.width,
      height: stage.height,
      open,
      sceneBottom: scene.height,
      pond: { left: pond.x - shore, right: pond.x + pond.width + shore },
    });
    return { ...plan, sky: scene.height - open };
  };
  const shape = parseShape(LEVEL.shape);
  const gameConfig = { ...LAYOUT, cols: shape.cols, rows: shape.rows };
  const noSky = { ...gameConfig, garden: { ...gameConfig.garden, sky: 0 } };

  it('leaves the garden its sky above the pond on 16:9 phones and upright tablets', () => {
    for (const screen of [
      { width: 360, height: 640 },
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
    ]) {
      const layout = layoutGame(screen, NO_INSETS, gameConfig);
      const garden = gardenOf(layout);
      expect(garden.wide).toBe(false);
      expect(garden.sky).toBeGreaterThanOrEqual(GARDEN_ROOM.sky);
      expect(layout.board.cellSize).toBeGreaterThanOrEqual(LAYOUT.minCell);
      expect(layout.hud.width).toBeCloseTo(LAYOUT.designWidth - LAYOUT.sidePadding * 2); // room for the HUD
    }
  });

  it('keeps the full-size board where the garden already has room: a tall phone, a wide screen', () => {
    for (const screen of [
      { width: 390, height: 844 },
      { width: 1366, height: 768 },
    ]) {
      const layout = layoutGame(screen, NO_INSETS, gameConfig);
      expect(layout.board.cellSize).toBeCloseTo(layoutGame(screen, NO_INSETS, noSky).board.cellSize);
    }
    expect(gardenOf(layoutGame({ width: 1366, height: 768 }, NO_INSETS, gameConfig)).wide).toBe(true);
  });
});
