import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus';

interface Events {
  match: { round: number };
  win: undefined;
}

describe('EventBus', () => {
  it('tells every listener of an event its payload, in order', () => {
    const bus = new EventBus<Events>();
    const heard: string[] = [];
    bus.on('match', ({ round }) => heard.push(`a${round}`));
    bus.on('match', ({ round }) => heard.push(`b${round}`));
    bus.on('win', () => heard.push('win'));
    bus.emit('match', { round: 2 });
    bus.emit('win');
    expect(heard).toEqual(['a2', 'b2', 'win']);
  });

  it('stops a listener when asked, and keeps going past one that throws', () => {
    const bus = new EventBus<Events>();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const heard: number[] = [];
    const stop = bus.on('match', ({ round }) => heard.push(round));
    bus.on('match', () => {
      throw new Error('boom');
    });
    bus.on('match', ({ round }) => heard.push(round * 10));
    bus.emit('match', { round: 1 });
    stop();
    bus.emit('match', { round: 2 });
    expect(heard).toEqual([1, 10, 20]);
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
