import { describe, expect, it } from 'vitest';
import { BootPipeline } from '../src/core/BootPipeline';

/** Runs a pipeline without a browser: no pauses, and every progress report kept. */
async function runQuietly<T extends object>(
  pipeline: BootPipeline<T>,
): Promise<{ made: T; progress: number[]; pauses: number }> {
  const progress: number[] = [];
  let pauses = 0;
  const made = await pipeline.run(
    (done) => progress.push(done),
    () => {
      pauses++;
      return Promise.resolve();
    },
  );
  return { made, progress, pauses };
}

describe('BootPipeline', () => {
  it('runs the steps in order, handing each what the steps before it made', async () => {
    const order: string[] = [];
    const pipeline = new BootPipeline()
      .step('pond', 1, () => {
        order.push('pond');
        return { width: 300 };
      })
      .step('koi', 1, async ({ pond }) => {
        order.push('koi');
        await Promise.resolve();
        return pond.width / 10;
      })
      .step('stage', 1, ({ pond, koi }) => {
        order.push('stage');
        return `${pond.width}:${koi}`;
      });
    const { made } = await runQuietly(pipeline);
    expect(order).toEqual(['pond', 'koi', 'stage']);
    expect(made).toEqual({ pond: { width: 300 }, koi: 30, stage: '300:30' });
  });

  it('reports the share done by weight, from 0 to 1, and pauses for the browser before every step', async () => {
    const pipeline = new BootPipeline()
      .step('fonts', 1, () => undefined)
      .step('koi', 3, () => undefined)
      .step('pond', 4, () => undefined);
    const { progress, pauses } = await runQuietly(pipeline);
    expect(progress).toEqual([0, 0.125, 0.5, 1]);
    expect(pauses).toBe(3);
  });

  it('stops at a failing step and rejects with its name, the error as the cause', async () => {
    const failure = new Error('no WebGL');
    const ran: string[] = [];
    const pipeline = new BootPipeline()
      .step('fonts', 1, () => ran.push('fonts'))
      .step('pond', 1, () => {
        throw failure;
      })
      .step('stage', 1, () => ran.push('stage'));
    const progress: number[] = [];
    const run = pipeline.run(
      (done) => progress.push(done),
      () => Promise.resolve(),
    );
    await expect(run).rejects.toThrow('boot step "pond" failed');
    await expect(run).rejects.toHaveProperty('cause', failure);
    expect(ran).toEqual(['fonts']);
    expect(progress).toEqual([0, 1 / 3]);
  });

  it('refuses two steps with the same name, since what they make is kept by name', () => {
    const pipeline = new BootPipeline().step('koi', 1, () => 1);
    expect(() => pipeline.step('koi', 1, () => 2)).toThrow('boot step "koi" is listed twice');
  });
});
