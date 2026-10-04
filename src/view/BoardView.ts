import { Container, Point, Rectangle, Sprite } from 'pixi.js';
import type { PointData, Texture } from 'pixi.js';
import { WATER } from '../config/water';
import type { Board } from '../model/Board';
import type { Cell, Piece } from '../model/types';
import { Koi } from './Koi';
import type { KoiTextures } from './KoiTextures';

export interface BoardViewLayout {
  readonly cols: number;
  readonly rows: number;
  readonly cellSize: number;
  readonly koiSize: number;
}

/** A koi on screen, its shadow on the pond bottom and its shape at the waterline (for the pond's foam). */
interface PieceSprites {
  readonly koi: Koi;
  readonly shadow: Sprite;
  readonly contact: Sprite;
  /** The contact shapes, one per pose, and their scale against the koi's (they're baked coarser). */
  readonly contactPoses: readonly Texture[];
  readonly contactScale: number;
  /** Where the koi was last frame, to tell how fast it moves. */
  readonly last: Point;
}

/**
 * Draws the board: one koi per piece, found by the piece id so a koi keeps its sprite while it moves. Every koi
 * casts a soft shadow onto the pond bottom; the shadows sit in their own layer under all the koi. Every koi also has
 * a contact shape in `contacts`, a layer that is never shown: the pond draws it into a mask each frame to put foam
 * along the waterline around the koi.
 */
export class BoardView extends Container {
  /** Where each koi meets the water, in the board's space; drawn by the pond, not shown (see `follow`). */
  readonly contacts = new Container();
  private readonly pieces = new Map<number, PieceSprites>();
  private readonly shadowLayer = new Container();
  private readonly koiLayer = new Container();

  constructor(
    private readonly textures: KoiTextures,
    private readonly layout: BoardViewLayout,
    private readonly random: () => number = Math.random,
  ) {
    super();
    // the whole board area takes pointer input, including the gaps between koi
    this.hitArea = new Rectangle(0, 0, layout.cols * layout.cellSize, layout.rows * layout.cellSize);
    this.addChild(this.shadowLayer, this.koiLayer);
  }

  /**
   * Makes the sprites match the board: adds new pieces, moves existing ones, removes the ones that are gone.
   * O(N) over the cells plus O(S) over the sprites; each sprite is found by id in O(1). Runs once per turn.
   */
  render(board: Board): void {
    const seen = new Set<number>();
    for (const cell of board.cells()) {
      const piece = board.get(cell);
      if (!piece) continue;
      seen.add(piece.id);
      const koi = this.pieces.get(piece.id)?.koi ?? this.createSprites(piece.id, piece.kind);
      koi.position.copyFrom(this.cellToPoint(cell));
    }
    this.removeSpritesNotIn(seen);
  }

  /** The koi showing a piece. Throws when the piece has no koi, which means the view fell out of sync. */
  spriteOf(id: number): Koi {
    const sprites = this.pieces.get(id);
    if (!sprites) throw new Error(`no sprite for piece ${id}`);
    return sprites.koi;
  }

  /** Every koi on the board, for the effects that follow the fish (swimming, wakes). O(K) to walk. */
  *koi(): IterableIterator<Koi> {
    for (const { koi } of this.pieces.values()) yield koi;
  }

  /**
   * Shadows and contact shapes follow their koi: same position, turn and scale. A shadow is offset away from the
   * moon (further for a koi lifted toward the surface) and fades with its koi. A contact shape carries how much foam
   * the koi makes in its tint: red, the koi is at the surface (it fades as the koi dives); blue, the koi stirs the
   * water (moving, or lifted while swapping). Call once per frame after the koi have moved, before the pond draws.
   * O(K), K = koi.
   */
  follow(deltaSeconds: number): void {
    const [offsetX, offsetY] = WATER.shadowOffset;
    for (const { koi, shadow, contact, contactPoses, contactScale, last } of this.pieces.values()) {
      const lift = Math.max(1, koi.scale.x / koi.restScale);
      const reach = 1 + (lift - 1) * 6;
      shadow.position.set(koi.x + offsetX * reach, koi.y + offsetY * reach);
      shadow.scale.copyFrom(koi.scale); // same pixel density as the koi texture, the extra canvas is blur room
      shadow.rotation = koi.rotation;
      shadow.alpha = koi.alpha * WATER.shadowAlpha;

      const moved = Number.isNaN(last.x) ? 0 : Math.hypot(koi.x - last.x, koi.y - last.y);
      last.copyFrom(koi.position);
      const stir = Math.max(moved / Math.max(deltaSeconds, 1e-3) / WATER.contactStirSpeed, (lift - 1) * 6);
      contact.texture = contactPoses[koi.pose] ?? contact.texture;
      contact.position.copyFrom(koi.position);
      contact.scale.set(koi.scale.x * contactScale, koi.scale.y * contactScale);
      contact.rotation = koi.rotation;
      contact.tint = contactTint(koi.alpha * koi.alpha, stir);
    }
  }

  /** Adds a koi for a new piece at a cell. */
  addPiece(piece: Piece, at: Cell): Koi {
    const koi = this.createSprites(piece.id, piece.kind);
    koi.position.copyFrom(this.cellToPoint(at));
    return koi;
  }

  removePiece(id: number): void {
    const sprites = this.pieces.get(id);
    sprites?.koi.destroy();
    sprites?.shadow.destroy();
    sprites?.contact.destroy();
    this.pieces.delete(id);
  }

  /** Draws a koi above all the others (the one the player drags passes over the one it swaps with). */
  bringToFront(koi: Koi): void {
    this.koiLayer.addChild(koi);
  }

  /** Centre of a cell, in this container's space. */
  cellToPoint(cell: Cell): Point {
    const half = this.layout.cellSize / 2;
    return new Point(cell.col * this.layout.cellSize + half, cell.row * this.layout.cellSize + half);
  }

  /** The cell under a point in this container's space, or null when the point is off the board. */
  pointToCell(point: PointData): Cell | null {
    const col = Math.floor(point.x / this.layout.cellSize);
    const row = Math.floor(point.y / this.layout.cellSize);
    const onBoard = col >= 0 && col < this.layout.cols && row >= 0 && row < this.layout.rows;
    return onBoard ? { col, row } : null;
  }

  /** Creates a piece's koi, shadow and contact sprites and returns the koi, which the animations move. */
  private createSprites(id: number, kind: number): Koi {
    const koi = new Koi(kind, this.textures.swim(kind), this.layout.koiSize, this.random);
    const shadow = new Sprite(this.textures.shadow(kind));
    shadow.anchor.set(0.5);
    shadow.tint = WATER.shadowColor;
    const contactPoses = this.textures.contact(kind);
    const contact = new Sprite(contactPoses[0]);
    contact.anchor.set(0.5);
    const contactScale = koi.texture.width / contact.texture.width;
    this.pieces.set(id, { koi, shadow, contact, contactPoses, contactScale, last: new Point(NaN, NaN) });
    this.koiLayer.addChild(koi);
    this.shadowLayer.addChild(shadow);
    this.contacts.addChild(contact);
    return koi;
  }

  private removeSpritesNotIn(ids: ReadonlySet<number>): void {
    for (const id of this.pieces.keys()) {
      if (!ids.has(id)) this.removePiece(id);
    }
  }
}

/** A contact shape's tint: red = how much the koi is at the surface, blue = how much it stirs the water (0..1). */
function contactTint(atSurface: number, stir: number): number {
  const byte = (share: number): number => Math.round(Math.min(Math.max(share, 0), 1) * 255);
  return (byte(atSurface) << 16) | (0xff << 8) | byte(stir);
}
