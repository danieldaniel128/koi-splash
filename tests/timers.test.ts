import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Timers } from '../src/core/Timers';

describe('Timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs each one after its time', () => {
    const timers = new Timers();
    const ran: number[] = [];
    timers.after(0.4, () => ran.push(1));
    timers.after(0.75, () => ran.push(2));
    vi.advanceTimersByTime(500);
    expect(ran).toEqual([1]);
    vi.advanceTimersByTime(500);
    expect(ran).toEqual([1, 2]);
  });

  it('cancels the ones still waiting, so nothing runs after its owner has closed', () => {
    const timers = new Timers();
    const ran: number[] = [];
    timers.after(0.4, () => ran.push(1));
    timers.after(0.75, () => ran.push(2));
    vi.advanceTimersByTime(500);
    timers.cancelAll();
    vi.advanceTimersByTime(1000);
    expect(ran).toEqual([1]);
  });
});
