import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { GameScene } from '../src/game/GameScene';
import type { GameSceneDeps } from '../src/game/GameScene';
import type { GameStatus } from '../src/game/GameStatus';
import type { Pad } from '../src/model/pads';
import type { Cell } from '../src/model/types';

const done = (): Promise<void> => Promise.resolve();

/** A scene with every display stubbed out, recording what it was told. */
function stubScene(): { scene: GameScene; statuses: GameStatus[]; pads: Pad[]; nudged: Cell[] } {
  const statuses: GameStatus[] = [];
  const pads: Pad[] = [];
  const nudged: Cell[] = [];
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
    view: { render: () => undefined },
    animator: { bumpPad: done, invalidSwap: done, swap: done, playStep: done },
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
  } as unknown as GameSceneDeps;
  return { scene: new GameScene(deps), statuses, pads, nudged };
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
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(nudged).toEqual([pad.at]);
    expect(statuses.at(-1)?.movesLeft).toBe(10);
  });
});
