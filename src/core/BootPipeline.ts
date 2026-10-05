/** One named piece of loading work and its weight: about how long it takes next to the others. */
interface BootStep {
  readonly name: string;
  readonly weight: number;
  readonly run: (made: Record<string, unknown>) => unknown;
  /** True when the step hands back small jobs to run one at a time (see jobs). */
  readonly inJobs?: boolean;
}

/**
 * How long a step's jobs may run back to back before the loading screen gets a paint (ms): long enough that the
 * pauses don't add up, short enough that the bar keeps moving.
 */
const PAINT_EVERY_MS = 50;

/** A small piece of loading work (see jobs). */
export type BootJob = () => void;

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
 * under its own name, so adding an asset is one more step. `run` does the work in order. After each step it reports
 * the share done (0..1), and between steps it hands the main thread back to the browser so the loading screen can
 * paint it. A step that fails stops the run, and the run rejects with an error that names the step.
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

  /**
   * A copy of the pipeline with one more step at the end, made of small jobs (`work` lists them, from what the steps
   * before it made). The jobs run in order, with a pause for the browser whenever they've run for PAINT_EVERY_MS,
   * and the share done moves on after each one, so a long step neither freezes the loading screen nor holds its bar
   * still.
   */
  jobs(name: string, weight: number, work: (made: TMade) => readonly BootJob[]): BootPipeline<TMade> {
    if (this.steps.some((step) => step.name === name)) throw new Error(`boot step "${name}" is listed twice`);
    const run = (made: Record<string, unknown>): unknown => work(made as TMade);
    return new BootPipeline([...this.steps, { name, weight, run, inJobs: true }]);
  }

  /** Runs every step in order and resolves with what they made, by name. */
  async run(onProgress: (done: number) => void, pause: () => Promise<void> = afterNextPaint): Promise<TMade> {
    const total = this.steps.reduce((sum, step) => sum + step.weight, 0);
    const made: Record<string, unknown> = {};
    let done = 0;
    onProgress(0);
    for (const [i, step] of this.steps.entries()) {
      if (i > 0) await pause();
      const result = await runStep(step, made);
      if (step.inJobs) {
        const share = (part: number): void => {
          onProgress(total > 0 ? (done + step.weight * part) / total : 1);
        };
        await runJobs(step.name, result as readonly BootJob[], share, pause);
      } else made[step.name] = result;
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

/** Runs a step's jobs in order, pausing whenever they've run for PAINT_EVERY_MS, and reports the share done after each. */
async function runJobs(
  name: string,
  jobs: readonly BootJob[],
  share: (part: number) => void,
  pause: () => Promise<void>,
): Promise<void> {
  let since = performance.now();
  for (const [k, job] of jobs.entries()) {
    if (performance.now() - since >= PAINT_EVERY_MS) {
      await pause();
      since = performance.now();
    }
    try {
      job();
    } catch (cause) {
      throw new Error(`boot step "${name}" failed`, { cause });
    }
    share((k + 1) / jobs.length);
  }
}
