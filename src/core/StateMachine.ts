/** A move from one state to another, allowed only while its guard (if any) returns true. */
export interface Transition<TState extends string, TContext> {
  readonly from: TState;
  readonly to: TState;
  readonly when?: (context: TContext) => boolean;
}

/**
 * Quick, synchronous reactions to entering or leaving a state (lock input, open a screen). Animations don't belong
 * here: the turn's flow stays readable in the scene that drives the machine.
 */
export interface StateHooks<TContext> {
  readonly onEnter?: (context: TContext) => void;
  readonly onExit?: (context: TContext) => void;
}

/**
 * A finite state machine driven by a transition table with guard predicates. It knows nothing about the game: the
 * context (whatever the guards need to read) is injected. Unexpected moves throw instead of silently corrupting state.
 */
export class StateMachine<TState extends string, TContext> {
  private current: TState;

  constructor(
    initial: TState,
    private readonly transitions: readonly Transition<TState, TContext>[],
    private readonly context: TContext,
    private readonly hooks: Partial<Record<TState, StateHooks<TContext>>> = {},
  ) {
    this.current = initial;
  }

  get state(): TState {
    return this.current;
  }

  is(state: TState): boolean {
    return this.current === state;
  }

  /** True when a transition from the current state to `to` exists and its guard passes. */
  can(to: TState): boolean {
    return this.transitions.some((t) => t.from === this.current && t.to === to && this.passes(t));
  }

  /** Moves to `to`. Throws when no transition allows it right now. */
  transition(to: TState): void {
    if (!this.can(to)) throw new Error(`illegal transition ${this.current} -> ${to}`);
    this.enter(to);
  }

  /**
   * Takes the first transition out of the current state whose guard passes, in table order, and returns the new
   * state, or null when none applies. Table order is the priority: list the most specific transitions first.
   */
  next(): TState | null {
    const found = this.transitions.find((t) => t.from === this.current && this.passes(t));
    if (!found) return null;
    this.enter(found.to);
    return found.to;
  }

  private passes(transition: Transition<TState, TContext>): boolean {
    return transition.when?.(this.context) ?? true;
  }

  private enter(to: TState): void {
    this.hooks[this.current]?.onExit?.(this.context);
    this.current = to;
    this.hooks[to]?.onEnter?.(this.context);
  }
}
