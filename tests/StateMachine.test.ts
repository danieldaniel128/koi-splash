import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/core/StateMachine';
import type { Transition } from '../src/core/StateMachine';

type Turn = 'idle' | 'playing' | 'won' | 'lost';

interface Context {
  movesLeft: number;
  goalDone: boolean;
  log: string[];
}

const TABLE: Transition<Turn, Context>[] = [
  { from: 'idle', to: 'playing', when: (c) => c.movesLeft > 0 },
  { from: 'playing', to: 'won', when: (c) => c.goalDone },
  { from: 'playing', to: 'lost', when: (c) => c.movesLeft === 0 },
  { from: 'playing', to: 'idle' },
];

function makeTurn(context: Context): StateMachine<Turn, Context> {
  return new StateMachine<Turn, Context>('idle', TABLE, context, {
    playing: { onEnter: (c) => c.log.push('enter playing'), onExit: (c) => c.log.push('exit playing') },
  });
}

describe('StateMachine', () => {
  it('only allows a transition when its guard passes', () => {
    const turn = makeTurn({ movesLeft: 0, goalDone: false, log: [] });
    expect(turn.can('playing')).toBe(false);
    expect(() => {
      turn.transition('playing');
    }).toThrow('illegal transition idle -> playing');
  });

  it('next() takes the first passing transition in table order', () => {
    // winning on the last move: both 'won' and 'lost' guards pass, 'won' is listed first
    const context = { movesLeft: 1, goalDone: false, log: [] };
    const turn = makeTurn(context);
    turn.transition('playing');
    context.movesLeft = 0;
    context.goalDone = true;
    expect(turn.next()).toBe('won');
  });

  it('falls back to the unguarded transition', () => {
    const turn = makeTurn({ movesLeft: 3, goalDone: false, log: [] });
    turn.transition('playing');
    expect(turn.next()).toBe('idle');
  });

  it('runs exit and enter hooks', () => {
    const context = { movesLeft: 3, goalDone: false, log: [] };
    const turn = makeTurn(context);
    turn.transition('playing');
    turn.next();
    expect(context.log).toEqual(['enter playing', 'exit playing']);
  });
});
