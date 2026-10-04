/** A rectangle on the stage (stage px). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** What the layout is built from: the grid, the bands above and below it, and the spacing. Stage px. */
export interface LayoutConfig {
  readonly cols: number;
  readonly rows: number;
  /** The design size: the stage is never smaller than this, so nothing gets cramped on small screens. */
  readonly designWidth: number;
  readonly designHeight: number;
  /** The HUD band above the pond and the specials bar below it. */
  readonly hudHeight: number;
  readonly barHeight: number;
  /** Space between the screen edges and everything (the pond's shore too), and between the HUD, the pond and the bar. */
  readonly sidePadding: number;
  readonly sectionGap: number;
  /** Water between the board and the pond's shore on each side. The whole pond stays on screen. */
  readonly pondMargin: {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  };
  /** Water between neighbouring cells: koi and pads are drawn inside cell - gap. */
  readonly cellGap: number;
  /** Bounds for a cell's size, so a tablet doesn't get giant koi and a small phone tiny ones. */
  readonly minCell: number;
  readonly maxCell: number;
  /** The HUD and the bar never get wider than this, on wide screens. */
  readonly maxPanelWidth: number;
}

/** The phone's own unsafe edges (notch, home bar), in screen px (CSS env(safe-area-inset-*)). */
export interface SafeInsets {
  readonly top: number;
  readonly bottom: number;
}

export interface GameLayout {
  /** The stage covers the whole screen; `scale` maps stage px to screen px. */
  readonly stage: { readonly width: number; readonly height: number; readonly scale: number };
  readonly hud: Rect;
  /** The board: where the grid starts, its size, the distance between cell centres and the size of a piece. */
  readonly board: Rect & { readonly cell: number; readonly piece: number };
  readonly pond: Rect;
  readonly bar: Rect;
}

/**
 * Lays the game out for a screen: the stage is the design size scaled to fit, then grown to cover the whole screen
 * (tall phones get more height, tablets more width, never letterboxing). Top to bottom: the HUD, the pond centred
 * with the board in it, the specials bar. The cell is as big as the space allows, within minCell..maxCell.
 */
export function layoutGame(
  screen: { width: number; height: number },
  insets: SafeInsets,
  config: LayoutConfig,
): GameLayout {
  const scale = Math.min(screen.width / config.designWidth, screen.height / config.designHeight);
  const stage = { width: screen.width / scale, height: screen.height / scale, scale };
  const top = insets.top / scale + config.sidePadding;
  const bottom = stage.height - insets.bottom / scale - config.sidePadding;

  const panelWidth = Math.min(stage.width - config.sidePadding * 2, config.maxPanelWidth);
  const panelX = (stage.width - panelWidth) / 2;
  const hud = { x: panelX, y: top, width: panelWidth, height: config.hudHeight };
  const bar = { x: panelX, y: bottom - config.barHeight, width: panelWidth, height: config.barHeight };

  const margin = config.pondMargin;
  const bandTop = hud.y + hud.height + config.sectionGap + margin.top;
  const bandBottom = bar.y - config.sectionGap - margin.bottom;
  const cell = cellSize(stage.width - margin.left - margin.right, bandBottom - bandTop, config);
  const width = cell * config.cols;
  const height = cell * config.rows;
  const board = {
    x: (stage.width - width - margin.left - margin.right) / 2 + margin.left,
    y: bandTop + (bandBottom - bandTop - height) / 2,
    width,
    height,
    cell,
    piece: cell - config.cellGap,
  };
  const pond = {
    x: board.x - margin.left,
    y: board.y - margin.top,
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom,
  };
  return { stage, hud, board, pond, bar };
}

/** The biggest cell that fits: the board in the width left beside the pond's margins, and in the band between them. */
function cellSize(boardRoom: number, bandHeight: number, config: LayoutConfig): number {
  const byWidth = (boardRoom - config.sidePadding * 2) / config.cols;
  const byHeight = bandHeight / config.rows;
  return Math.min(Math.max(Math.min(byWidth, byHeight), config.minCell), config.maxCell);
}
