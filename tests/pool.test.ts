import { describe, expect, it } from 'vitest';
import { Pool } from '../src/core/Pool';

describe('Pool', () => {
  it('makes a new item while none is spare', () => {
    let made = 0;
    const pool = new Pool({ create: () => ({ id: made++ }), cap: 4 });
    expect(pool.acquire().id).toBe(0);
    expect(pool.acquire().id).toBe(1);
  });

  it('hands a released item out again, reset', () => {
    const pool = new Pool({
      create: () => ({ used: false }),
      reset: (item) => {
        item.used = false;
      },
      cap: 4,
    });
    const item = pool.acquire();
    item.used = true;
    pool.release(item);
    const again = pool.acquire();
    expect(again).toBe(item);
    expect(again.used).toBe(false);
  });

  it('keeps no more spare items than its cap, and discards the rest', () => {
    const discarded: number[] = [];
    let made = 0;
    const pool = new Pool({ create: () => made++, cap: 2, discard: (item) => discarded.push(item) });
    const items = [pool.acquire(), pool.acquire(), pool.acquire()];
    for (const item of items) pool.release(item);
    expect(pool.size).toBe(2);
    expect(discarded).toEqual([2]);
  });
});
