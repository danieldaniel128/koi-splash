/** One named piece of loading work and its weight: about how long it takes next to the others. */
interface BootStep {
  readonly name: string;
  readonly weight: number;
  readonly run: (made: Record<string, unknown>) => unknown;
}

/** Waits until the browser has painted a frame, so whatever changed on the page shows before more work starts. */
export function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    // the frame callback runs just before the paint; the timeout after it
    requestAnimationFrame(() => setTimeout(resolve, 0));
  });
}

/**
 * Loading, as an ordered list of named steps, each weighted by about how long it takes (only the ratios matter).
 * `step` adds one at the end: its work gets what the steps before it made, by name, and what it returns is kept
 * under its own name, so adding an asset is one more step. `run` does the work in order. Before each step it hands
 * the main thread back to the browser so the loading screen can paint, and after each it reports the share done
 * (0..1). A step that fails stops the run, and the run rejects with an error that names the step.
 */
export class BootPipeline<TMade extends object = object> {
  constructor(private readonly steps: readonly BootStep[] = []) {}

  /** A copy of the pipeline with one more step at the end. */
  step<TName extends string, TResult>(
    name: TName,
    weight: number,
    work: (made: TMade) => TResult | Promise<TResult>,
  ): BootPipeline<TMade & Record<TName, TResult>> {
    if (this.steps.some((step) => step.name === name)) throw new Error(`boot step "${name}" is listed twice`);
    const run = (made: Record<string, unknown>): unknown => work(made as TMade);
    return new BootPipeline([...this.steps, { name, weight, run }]);
  }

  /** Runs every step in order and resolves with what they made, by name. */
  async run(onProgress: (done: number) => void, pause: () => Promise<void> = afterNextPaint): Promise<TMade> {
    const total = this.steps.reduce((sum, step) => sum + step.weight, 0);
    const made: Record<string, unknown> = {};
    let done = 0;
    onProgress(0);
    for (const step of this.steps) {
      await pause();
      made[step.name] = await runStep(step, made);
      done += step.weight;
      onProgress(total > 0 ? done / total : 1);
    }
    return made as TMade;
  }
}

/** Runs one step; a failure is passed on with the step's name, the original error as its cause. */
async function runStep(step: BootStep, made: Record<string, unknown>): Promise<unknown> {
  try {
    return await step.run(made);
  } catch (cause) {
    throw new Error(`boot step "${step.name}" failed`, { cause });
  }
}
