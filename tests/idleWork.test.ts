import { describe, expect, it, vi } from 'vitest';
import { runWhenIdle } from '../src/core/idleWork';

/** Idle moments on demand: each `idle()` call is one moment the browser can spare. */
function fakeIdle(): { wait: (next: () => void) => void; idle: () => void } {
  const waiting: (() => void)[] = [];
  return {
    wait: (next) => waiting.push(next),
    idle: () => {
      waiting.shift()?.();
    },
  };
}

describe('runWhenIdle', () => {
  it('runs the jobs in order, one per idle moment', async () => {
    const ran: string[] = [];
    const { wait, idle } = fakeIdle();
    const done = runWhenIdle(
      ['striped', 'whirlpool', 'pictures'].map((name) => () => ran.push(name)),
      wait,
    );
    expect(ran).toEqual([]); // nothing until the browser has a moment
    idle();
    expect(ran).toEqual(['striped']);
    idle();
    idle();
    expect(ran).toEqual(['striped', 'whirlpool', 'pictures']);
    idle();
    await expect(done).resolves.toBeUndefined();
  });

  it('reports a failed job and goes on with the rest', async () => {
    const failure = new Error('no 2D canvas');
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ran: string[] = [];
    const { wait, idle } = fakeIdle();
    const done = runWhenIdle(
      [
        () => {
          throw failure;
        },
        () => ran.push('second'),
      ],
      wait,
    );
    for (let i = 0; i < 3; i++) idle();
    await done;
    expect(ran).toEqual(['second']);
    expect(report).toHaveBeenCalledWith(failure);
    report.mockRestore();
  });
});
