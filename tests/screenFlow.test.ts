import { describe, expect, it } from 'vitest';
import type { GameStatus } from '../src/game/GameStatus';
import { ScreenFlow } from '../src/game/ScreenFlow';

const STATUS: GameStatus = { movesLeft: 0, moves: 15, score: 1200, stars: 2, goals: [] };

/** A screen flow over fake views that write down what happens to them, in order. */
function makeFlow(): { flow: ScreenFlow; log: string[] } {
  const log: string[] = [];
  const flow = new ScreenFlow({
    loader: {
      hide: () => {
        log.push('loader hidden');
        return Promise.resolve();
      },
    },
    game: { focus: () => log.push('game focused') },
    card: {
      show: (outcome) => log.push(`card shows ${outcome}`),
      hide: () => log.push('card hidden'),
      focus: () => log.push('card focused'),
    },
  });
  return { flow, log };
}

describe('ScreenFlow', () => {
  it('starts on the loading screen, and gives the game the focus once the loading screen is gone', async () => {
    const { flow, log } = makeFlow();
    expect(flow.screen).toBe('loading');
    await flow.start();
    expect(flow.screen).toBe('playing');
    expect(log).toEqual(['loader hidden', 'game focused']);
  });

  it('opens the end card over the game and moves the focus to it', async () => {
    const { flow, log } = makeFlow();
    await flow.start();
    flow.show('won', STATUS);
    expect(flow.screen).toBe('result');
    expect(log.slice(2)).toEqual(['card shows won', 'card focused']);
  });

  it('plays again from the end card: the level starts over and the game has the focus back', async () => {
    const { flow, log } = makeFlow();
    flow.onReplay(() => {
      log.push('level restarted');
      flow.hide(); // as the scene does when it starts over
    });
    await flow.start();
    flow.show('lost', STATUS);
    flow.replay();
    expect(flow.screen).toBe('playing');
    expect(log.slice(4)).toEqual(['level restarted', 'card hidden', 'game focused']);
  });

  it('only plays again from the end card', async () => {
    const { flow, log } = makeFlow();
    let restarts = 0;
    flow.onReplay(() => restarts++);
    flow.replay();
    await flow.start();
    flow.replay();
    expect(restarts).toBe(0);
    expect(flow.screen).toBe('playing');
    expect(log).toEqual(['loader hidden', 'game focused']);
  });

  it('never opens the end card while the game is still loading', () => {
    const { flow } = makeFlow();
    expect(() => {
      flow.show('won', STATUS);
    }).toThrow('illegal transition loading -> result');
  });
});
