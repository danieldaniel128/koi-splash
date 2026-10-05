import { describe, expect, it } from 'vitest';
import { Random } from '../src/core/Random';
import { createGameEvents } from '../src/game/events';
import { GameScene } from '../src/game/GameScene';
import type { GameSceneDeps } from '../src/game/GameScene';
import type { GameStatus } from '../src/game/GameStatus';
import type { Pad } from '../src/model/pads';
import type { Cell } from '../src/model/types';

const done = (): Promise<void> => Promise.resolve();

/** A scene with every display stubbed out, recording what it was told and what it said. */
function stubScene(): {
  scene: GameScene;
  statuses: GameStatus[];
  pads: Pad[];
  nudged: Cell[];
  bumped: Cell[];
  said: string[];
} {
  const statuses: GameStatus[] = [];
  const pads: Pad[] = [];
  const nudged: Cell[] = [];
  const bumped: Cell[] = [];
  const said: string[] = [];
  const events = createGameEvents();
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
    view: { render: () => undefined },
    animator: {
      bumpPad: done,
      bumpBank: (_koi: unknown, bank: Cell) => {
        bumped.push(bank);
        return done();
      },
      invalidSwap: done,
      swap: done,
      playStep: done,
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
  return { scene: new GameScene(deps), statuses, pads, nudged, bumped, said };
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

  it('a koi swiped into the bank is refused like a bad swap and spends no move', async () => {
    const { scene, statuses, pads, bumped, said } = stubScene();
    const row = [0, 1, 2].find((r) => !pads.some((pad) => pad.at.col === 0 && pad.at.row === r)) ?? 0;
    scene.handleSwipe({ col: 0, row }, { col: -1, row }); // a koi on the left edge, swiped left
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(bumped).toEqual([{ col: -1, row }]);
    expect(said).toEqual(['invalidSwap']);
    expect(statuses.at(-1)?.movesLeft).toBe(10);
    expect(scene.canBoost).toBe(true); // the board takes the next move
  });
});
