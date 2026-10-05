import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/core/StateMachine';
import type { StateHooks, Transition } from '../src/core/StateMachine';

type Turn = 'idle' | 'busy' | 'over';

interface Context {
  movesLeft: number;
  log: string[];
}

const TABLE: Transition<Turn, Context>[] = [
  { from: 'idle', to: 'busy', when: (c) => c.movesLeft > 0 },
  { from: 'busy', to: 'over', when: (c) => c.movesLeft === 0 },
  { from: 'busy', to: 'idle', when: (c) => c.movesLeft > 0 },
  { from: 'over', to: 'over' }, // playing the level again from its end
];

function makeTurn(context: Context): StateMachine<Turn, Context> {
  const logged = (state: Turn): StateHooks<Context> => ({
    onEnter: (c: Context) => c.log.push(`enter ${state}`),
    onExit: (c: Context) => c.log.push(`exit ${state}`),
  });
  return new StateMachine<Turn, Context>('idle', TABLE, context, {
    idle: logged('idle'),
    busy: logged('busy'),
    over: logged('over'),
  });
}

describe('StateMachine guards', () => {
  it('refuses a move with no row in the table, leaving the state and running no hooks', () => {
    const context: Context = { movesLeft: 3, log: [] };
    const turn = makeTurn(context);
    expect(turn.can('over')).toBe(false);
    expect(() => {
      turn.transition('over');
    }).toThrow('illegal transition idle -> over');
    expect(turn.state).toBe('idle');
    expect(context.log).toEqual([]);
  });

  it('reads the context afresh every time it asks a guard', () => {
    const context: Context = { movesLeft: 0, log: [] };
    const turn = makeTurn(context);
    expect(turn.can('busy')).toBe(false);
    context.movesLeft = 2;
    expect(turn.can('busy')).toBe(true);
    turn.transition('busy');
    expect(turn.is('busy')).toBe(true);
  });

  it('next() stays put and returns null when no guard passes', () => {
    const context: Context = { movesLeft: 0, log: [] };
    const turn = makeTurn(context);
    expect(turn.next()).toBeNull();
    expect(turn.state).toBe('idle');
    expect(context.log).toEqual([]);
  });

  it('next() skips a row whose guard fails for a later one that passes', () => {
    const context: Context = { movesLeft: 1, log: [] };
    const turn = makeTurn(context);
    turn.transition('busy');
    expect(turn.next()).toBe('idle'); // 'over' is listed first, but moves are left
  });

  it('runs the exit hook before the enter hook, also when a state goes to itself', () => {
    const context: Context = { movesLeft: 1, log: [] };
    const turn = makeTurn(context);
    turn.transition('busy');
    context.movesLeft = 0;
    turn.next();
    turn.transition('over');
    expect(context.log).toEqual([
      'exit idle',
      'enter busy',
      'exit busy',
      'enter over',
      'exit over',
      'enter over',
    ]);
  });
});
