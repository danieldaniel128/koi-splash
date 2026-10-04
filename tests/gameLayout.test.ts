import { describe, expect, it } from 'vitest';
import { layoutGame } from '../src/layout/gameLayout';
import type { LayoutConfig } from '../src/layout/gameLayout';

const CONFIG: LayoutConfig = {
  cols: 7,
  rows: 9,
  designWidth: 360,
  designHeight: 640,
  hudHeight: 56,
  barHeight: 64,
  sidePadding: 12,
  sectionGap: 14,
  pondMargin: { left: 26, right: 26, top: 24, bottom: 70 },
  cellGap: 4,
  minCell: 36,
  maxCell: 56,
  maxPanelWidth: 420,
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
    expect(pond.y).toBeGreaterThanOrEqual(hud.y + hud.height);
    expect(bar.y).toBeGreaterThanOrEqual(pond.y + pond.height);
    expect(bar.y + bar.height).toBeLessThanOrEqual(stage.height - 34 / stage.scale);
  });

  it('on a tall phone the board takes the full width and the bar moves down to the bottom', () => {
    const design = layoutGame({ width: 360, height: 640 }, NO_INSETS, CONFIG);
    const tall = layoutGame({ width: 390, height: 844 }, NO_INSETS, CONFIG);
    expect(tall.board.width).toBeCloseTo(tall.stage.width - CONFIG.sidePadding * 2);
    expect(tall.bar.y).toBeGreaterThan(design.bar.y);
  });

  it('on a tablet the stage grows wider and the koi grow on screen, with the board centred', () => {
    const design = layoutGame({ width: 360, height: 640 }, NO_INSETS, CONFIG);
    const tablet = layoutGame({ width: 768, height: 1024 }, NO_INSETS, CONFIG);
    expect(tablet.stage.width).toBeGreaterThan(design.stage.width);
    expect(tablet.board.cell * tablet.stage.scale).toBeGreaterThan(design.board.cell * design.stage.scale);
    expect(tablet.board.x * 2 + tablet.board.width).toBeCloseTo(tablet.stage.width);
  });

  it('keeps the cell within its bounds and the gap between pieces', () => {
    const tablet = layoutGame({ width: 1024, height: 1366 }, NO_INSETS, CONFIG).board;
    expect(tablet.cell).toBeLessThanOrEqual(56);
    expect(tablet.piece).toBe(tablet.cell - 4);
  });
});
