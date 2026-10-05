import { afterEach, describe, expect, it, vi } from 'vitest';
import { seeded } from '../src/core/Random';
import { createGameEvents } from '../src/game/events';
import { GameScene } from '../src/game/GameScene';
import type { GameSceneDeps, TurnAnimator } from '../src/game/GameScene';
import type { GameStatus } from '../src/game/GameStatus';
import type { GameEventBus } from '../src/game/events';
import type { Board } from '../src/model/Board';
import type { GoalDef } from '../src/model/goals';
import { findMove } from '../src/model/rules';
import type { Cell, Pad } from '../src/model/types';

const done = (): Promise<void> => Promise.resolve();
/** Lets a turn played through the stubs (which finish at once) run to its end. */
const turnPlayed = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** What the stubbed scene was told and what it said: its board, each status, the pads, the bumps, its events. */
interface Seen {
  board: Board | null;
  events: GameEventBus;
  statuses: GameStatus[];
  resets: GameStatus[];
  pads: Pad[];
  nudged: Cell[];
  bumped: Cell[];
  said: string[];
  playable: boolean[];
  outcomes: ('won' | 'lost')[];
}

/** The level the stubbed scene plays, and an animator to swap in (one that fails, say). */
interface StubLevel {
  readonly moves?: number;
  readonly goals?: readonly GoalDef[];
  readonly animator?: Partial<TurnAnimator>;
}

/** A scene with every display stubbed out, recording what it was told and what it said. */
function stubScene(stub: StubLevel = {}): Seen & { scene: GameScene } {
  const events = createGameEvents();
  const seen: Seen = {
    board: null,
    events,
    statuses: [],
    resets: [],
    pads: [],
    nudged: [],
    bumped: [],
    said: [],
    playable: [],
    outcomes: [],
  };
  events.on('invalidSwap', () => seen.said.push('invalidSwap'));
  const deps: GameSceneDeps = {
    spec: { cols: 7, rows: 9, kinds: 5 },
    level: {
      moves: stub.moves ?? 10,
      pointsPerPiece: 10,
      goalBonus: 500,
      goals: stub.goals ?? [{ type: 'lotus', count: 1 }],
      pads: { buds: 1, emptyPads: 0, hitsToBloom: 2, hitsToDrift: 1, spacing: 2 },
      stars: { scores: [100, 200, 300] },
    },
    rng: seeded(3),
    view: {
      render: (board) => {
        seen.board = board;
      },
      setPlayable: (on) => seen.playable.push(on),
    },
    animator: { ...stubAnimator(seen), ...stub.animator },
    status: { reset: (status) => seen.resets.push(status), update: (status) => seen.statuses.push(status) },
    pads: {
      reset: (placed) => seen.pads.push(...placed),
      play: done,
      nudge: (cell) => {
        seen.nudged.push(cell);
        return done();
      },
    },
    result: { show: (outcome) => seen.outcomes.push(outcome), hide: () => undefined },
    events,
  };
  const scene = new GameScene(deps);
  return { scene, ...seen };
}

/** An animator whose every motion ends at once; a bump into the bank is noted. */
function stubAnimator(seen: Seen): TurnAnimator {
  return {
    bumpPad: done,
    bumpBank: (_koi, bank) => {
      seen.bumped.push(bank);
      return done();
    },
    invalidSwap: done,
    swap: done,
    playStep: done,
    playBooster: done,
  };
}

/** Plays the board's first move. */
async function playAMove(scene: GameScene, board: Board | null): Promise<void> {
  const move = board && findMove(board);
  if (!move) throw new Error('no move on the board');
  scene.handleSwipe(move[0], move[1]);
  await turnPlayed();
}

describe('GameScene', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a koi swiped into a lily pad bumps it and spends no move', async () => {
    const { scene, resets, statuses, pads, nudged } = stubScene();
    const pad = pads[0];
    if (!pad) throw new Error('no pad placed');
    // the koi next to the pad, on whichever side is on the board
    const from =
      pad.at.row > 0 ? { col: pad.at.col, row: pad.at.row - 1 } : { col: pad.at.col, row: pad.at.row + 1 };

    scene.handleSwipe(from, pad.at);
    await turnPlayed();

    expect(nudged).toEqual([pad.at]);
    expect((statuses.at(-1) ?? resets.at(-1))?.movesLeft).toBe(10);
  });

  it('a koi swiped into the bank is refused like a bad swap and spends no move', async () => {
    const { scene, resets, statuses, pads, bumped, said, playable } = stubScene();
    const row = [0, 1, 2].find((r) => !pads.some((pad) => pad.at.col === 0 && pad.at.row === r)) ?? 0;
    scene.handleSwipe({ col: 0, row }, { col: -1, row }); // a koi on the left edge, swiped left
    await turnPlayed();

    expect(bumped).toEqual([{ col: -1, row }]);
    expect(said).toEqual(['invalidSwap']);
    expect((statuses.at(-1) ?? resets.at(-1))?.movesLeft).toBe(10);
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

  it('is won on the last move when every goal is met by then', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    const { scene, board, outcomes } = stubScene({ moves: 1, goals: [{ type: 'score', target: 1 }] });
    await playAMove(scene, board);
    expect(outcomes).toEqual([]); // the win is celebrated for a beat first
    vi.runAllTimers();
    vi.useRealTimers();
    expect(outcomes).toEqual(['won']);
    expect(scene.canSwap).toBe(false);
  });

  it('is lost on the last move when a goal is still open', async () => {
    const { scene, board, outcomes } = stubScene({ moves: 1, goals: [{ type: 'score', target: 1_000_000 }] });
    await playAMove(scene, board);
    expect(outcomes).toEqual(['lost']);
  });

  it('still ends the level, with the score and goals counted, when the last move fails to play', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing = { playStep: () => Promise.reject(new Error('a tween broke')) };
    const { scene, board, statuses, outcomes } = stubScene({
      moves: 1,
      goals: [{ type: 'score', target: 1 }],
      animator: failing,
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    await playAMove(scene, board);
    vi.runAllTimers();
    vi.useRealTimers();
    expect(outcomes).toEqual(['won']);
    const last = statuses.at(-1);
    expect(last?.score).toBeGreaterThan(0);
    expect(last?.goals[0]?.done).toBeGreaterThanOrEqual(1);
  });

  it('starts over on Play again: announced once, and the HUD reset to the full moves and no score', async () => {
    const { scene, board, events, resets, outcomes } = stubScene({ moves: 1 });
    let starts = 0;
    events.on('levelStarted', () => {
      starts++;
    });
    await playAMove(scene, board);
    expect(outcomes).toHaveLength(1);
    expect(starts).toBe(0);
    scene.restart();
    expect(starts).toBe(1);
    expect(resets).toHaveLength(2); // the first level, and this one
    expect(resets.at(-1)).toMatchObject({ movesLeft: 1, score: 0 });
    expect(scene.canSwap).toBe(true);
  });
});
