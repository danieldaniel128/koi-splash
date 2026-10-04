import type { PointData } from 'pixi.js';
import { SPECIAL_MENU } from '../config/ui';
import type { SpecialPicker } from '../game/BoosterControl';
import type { Cell, Special } from '../model/types';
import type { UiLayer } from './UiLayer';
import { el } from './UiLayer';

/** One petal: which special it makes, its name, and a picture of the koi as that special. */
export interface PetalChoice {
  readonly type: Special['type'];
  readonly name: string;
}

/** Where the menu finds things: a cell's centre (stage px), the stage's width, and a koi's picture as a special. */
export interface MenuBoard {
  cellCentre(cell: Cell): PointData;
  readonly stageWidth: number;
  preview(cell: Cell, type: Special['type']): string;
}

/**
 * Where three petals go round a koi (after the prototype): on an arc `reach` px out, `spread` rad apart, fanned up
 * (or down, for a koi in the top rows), left to right, the whole fan shifted to stay `edge` px inside the stage.
 */
export function petalSpots(
  centre: PointData,
  fanDown: boolean,
  look: { reach: number; spread: number; edge: number; stageWidth: number },
): PointData[] {
  const base = fanDown ? Math.PI / 2 : -Math.PI / 2;
  const spots = [0, 1, 2].map((k) => {
    const angle = base + (fanDown ? -1 : 1) * (k - 1) * look.spread;
    return { x: centre.x + Math.cos(angle) * look.reach, y: centre.y + Math.sin(angle) * look.reach };
  });
  const xs = spots.map((spot) => spot.x);
  const low = Math.min(...xs) - look.edge;
  const high = Math.max(...xs) + look.edge - look.stageWidth;
  const shift = low < 0 ? -low : high > 0 ? -high : 0;
  return spots.map((spot) => ({ x: spot.x + shift, y: spot.y }));
}

/**
 * The special booster's choice (after the prototype's petal menu): three frosted-glass petals bloom round the picked
 * koi, each showing the koi as that special with its name; tapping one chooses it, tapping anywhere else closes
 * them. The pond behind dims.
 */
export class SpecialMenu implements SpecialPicker {
  private readonly root = el('div', 'petals');
  private settle: ((choice: Special['type'] | null) => void) | null = null;

  constructor(
    private readonly layer: UiLayer,
    private readonly board: MenuBoard,
    private readonly choices: readonly PetalChoice[],
    private readonly cell: number,
  ) {
    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.finish(null); // tapped away from the petals
    });
  }

  pick(at: Cell): Promise<Special['type'] | null> {
    this.finish(null);
    const centre = this.board.cellCentre(at);
    const look = SPECIAL_MENU;
    const spots = petalSpots(centre, at.row < look.topRows, {
      reach: look.reach * this.cell,
      spread: look.spread,
      edge: look.edge,
      stageWidth: this.board.stageWidth,
    });
    const petals = this.choices.map((choice, k) => this.petal(choice, at, spots[k] ?? centre, centre, k));
    this.root.replaceChildren(...petals);
    this.layer.root.append(this.root);
    return new Promise((resolve) => {
      this.settle = resolve;
    });
  }

  close(): void {
    this.finish(null);
  }

  private petal(choice: PetalChoice, at: Cell, spot: PointData, from: PointData, k: number): HTMLElement {
    const size = SPECIAL_MENU.petal * this.cell;
    const picture = el('img', 'petal__koi');
    picture.src = this.board.preview(at, choice.type);
    picture.alt = '';
    const petal = el('button', 'petal', picture, el('span', 'petal__name', choice.name));
    petal.type = 'button';
    petal.setAttribute('aria-label', choice.name);
    Object.assign(petal.style, {
      left: `${spot.x - size / 2}px`,
      top: `${spot.y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    });
    petal.animate(
      [
        { transform: `translate(${from.x - spot.x}px, ${from.y - spot.y}px) scale(0.2)`, opacity: 0 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      {
        duration: SPECIAL_MENU.open * 1000,
        delay: k * SPECIAL_MENU.stagger * 1000,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'backwards',
      },
    );
    petal.addEventListener('click', () => {
      this.finish(choice.type);
    });
    return petal;
  }

  private finish(choice: Special['type'] | null): void {
    this.root.remove();
    const settle = this.settle;
    this.settle = null;
    settle?.(choice);
  }
}
