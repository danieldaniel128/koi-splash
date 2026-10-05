import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { createGameEvents } from '../src/game/events';
import { GameScene } from '../src/game/GameScene';
import type { GameSceneDeps } from '../src/game/GameScene';
import type { GameStatus } from '../src/game/GameStatus';
import type { GameEventBus } from '../src/game/events';
import type { Board } from '../src/model/Board';
import type { Pad } from '../src/model/pads';
import { findMove } from '../src/model/rules';
import type { Cell } from '../src/model/types';

const done = (): Promise<void> => Promise.resolve();
/** Lets a turn played through the stubs (which finish at once) run to its end. */
const turnPlayed = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** What the stubbed scene was told and what it said: its board, each status, the pads, the bumps, its events. */
interface Seen {
  board: Board | null;
  events: GameEventBus;
  statuses: GameStatus[];
  pads: Pad[];
  nudged: Cell[];
  bumped: Cell[];
  said: string[];
  playable: boolean[];
}

/** A scene with every display stubbed out, recording what it was told and what it said. */
function stubScene(): Seen & { scene: GameScene } {
  const events = createGameEvents();
  const seen: Seen = {
    board: null,
    events,
    statuses: [],
    pads: [],
    nudged: [],
    bumped: [],
    said: [],
    playable: [],
  };
  const { statuses, pads, nudged, bumped, said, playable } = seen;
  events.on('invalidSwap', () => said.push('invalidSwap'));
  const deps = {
    spec: { cols: 7, rows: 9, kinds: 5 },
    level: {
      moves: 10,
      pointsPerPiece: 10,
      goalBonus: 500,
      goals: [{ type: 'lotus', count: 1 }],
      pads: { buds: 1, emptyPads: 0, hitsToBloom: 2, hitsToDrift: 1, spacing: 2 },
      stars: { scores: [100, 200, 300] },
    },
    rng: new Random(3),
    view: {
      render: (board: Board) => {
        seen.board = board;
      },
      setPlayable: (on: boolean) => playable.push(on),
    },
    animator: {
      bumpPad: done,
      bumpBank: (_koi: unknown, bank: Cell) => {
        bumped.push(bank);
        return done();
      },
      invalidSwap: done,
      swap: done,
      playStep: done,
      playBooster: done,
    },
    status: { update: (status: GameStatus) => statuses.push(status) },
    pads: {
      reset: (placed: readonly Pad[]) => pads.push(...placed),
      play: done,
      nudge: (cell: Cell) => {
        nudged.push(cell);
        return done();
      },
    },
    result: { show: () => undefined, hide: () => undefined },
    events,
  } as unknown as GameSceneDeps;
  const scene = new GameScene(deps);
  return { scene, ...seen };
}

describe('GameScene', () => {
  it('a koi swiped into a lily pad bumps it and spends no move', async () => {
    const { scene, statuses, pads, nudged } = stubScene();
    const pad = pads[0];
    if (!pad) throw new Error('no pad placed');
    // the koi next to the pad, on whichever side is on the board
    const from =
      pad.at.row > 0 ? { col: pad.at.col, row: pad.at.row - 1 } : { col: pad.at.col, row: pad.at.row + 1 };

    scene.handleSwipe(from, pad.at);
    await turnPlayed();

    expect(nudged).toEqual([pad.at]);
    expect(statuses.at(-1)?.movesLeft).toBe(10);
  });

  it('a koi swiped into the bank is refused like a bad swap and spends no move', async () => {
    const { scene, statuses, pads, bumped, said, playable } = stubScene();
    const row = [0, 1, 2].find((r) => !pads.some((pad) => pad.at.col === 0 && pad.at.row === r)) ?? 0;
    scene.handleSwipe({ col: 0, row }, { col: -1, row }); // a koi on the left edge, swiped left
    await turnPlayed();

    expect(bumped).toEqual([{ col: -1, row }]);
    expect(said).toEqual(['invalidSwap']);
    expect(statuses.at(-1)?.movesLeft).toBe(10);
    expect(scene.canSwap).toBe(true); // the board takes the next move
    expect(playable).toEqual([true, false, true]); // and shows it only between turns
  });

  it('the swap booster takes two koi of one colour and moves a special without firing it, as in the prototype', async () => {
    const { scene, board } = stubScene();
    if (!board) throw new Error('nothing rendered');
    const cells = [...board.cells()].filter((cell) => board.get(cell));
    const a = cells[0];
    const b = cells.find((cell) => cell !== a && board.get(cell)?.kind === (a && board.get(a)?.kind));
    if (!a || !b) throw new Error('no two koi of one colour');
    const other = board.get(b);

    expect(await scene.useBooster({ type: 'special', at: a, special: { type: 'whirl' } })).toBe(true);
    // the koi trade places but the colours stay put, so nothing matches: the whirlpool just moves
    expect(await scene.useBooster({ type: 'swap', a, b })).toBe(true);
    expect(board.get(b)?.special).toEqual({ type: 'whirl' });
    expect(board.get(a)).toBe(other);
  });

  it('announces a new level start on Play again, so the music and the rest can start over', async () => {
    const { scene, board, events, statuses } = stubScene();
    if (!board) throw new Error('nothing rendered');
    let starts = 0;
    events.on('levelStarted', () => {
      starts++;
    });
    for (let move = findMove(board); move && statuses.at(-1)?.movesLeft !== 0; move = findMove(board)) {
      scene.handleSwipe(move[0], move[1]);
      await turnPlayed();
    }
    expect(starts).toBe(0);
    scene.restart();
    expect(starts).toBe(1);
    expect(statuses.at(-1)?.movesLeft).toBe(10);
  });
});
