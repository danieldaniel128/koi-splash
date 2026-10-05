import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus';

interface Events {
  match: { round: number };
  win: undefined;
}

describe('EventBus listeners', () => {
  it('does nothing for an event nobody listens to', () => {
    const bus = new EventBus<Events>();
    expect(() => {
      bus.emit('win');
    }).not.toThrow();
  });

  it('hears only the events it listens to', () => {
    const bus = new EventBus<Events>();
    const heard: string[] = [];
    bus.on('win', () => heard.push('win'));
    bus.emit('match', { round: 0 });
    expect(heard).toEqual([]);
  });

  it('stops one listener without stopping the others, and stopping it again is harmless', () => {
    const bus = new EventBus<Events>();
    const heard: string[] = [];
    const stopA = bus.on('match', () => heard.push('a'));
    bus.on('match', () => heard.push('b'));
    bus.on('win', () => heard.push('win'));
    stopA();
    stopA();
    bus.emit('match', { round: 0 });
    bus.emit('win');
    expect(heard).toEqual(['b', 'win']);
  });

  it('stops a listener of one event only, when the same function listens to two', () => {
    const bus = new EventBus<Events>();
    let count = 0;
    const listener = (): void => {
      count++;
    };
    const stopMatch = bus.on('match', listener);
    bus.on('win', listener);
    stopMatch();
    bus.emit('match', { round: 0 });
    bus.emit('win');
    expect(count).toBe(1);
  });

  it('lets a listener added while an event is told hear the next one, not that one', () => {
    const bus = new EventBus<Events>();
    const heard: number[] = [];
    bus.on('match', () => {
      bus.on('match', ({ round }) => heard.push(round));
    });
    bus.emit('match', { round: 1 });
    expect(heard).toEqual([]);
    bus.emit('match', { round: 2 });
    expect(heard).toEqual([2]);
  });
});
