/** What the player needs to see about the level right now. Read by the turn guards and shown by the HUD. */
export interface GameStatus {
  readonly movesLeft: number;
  readonly score: number;
  readonly targetScore: number;
}
