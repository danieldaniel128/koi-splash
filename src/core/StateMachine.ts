/** For each state, the states it may move to next. */
export type Transitions<TState extends string> = Readonly<Record<TState, readonly TState[]>>;

/**
 * A small finite state machine. The allowed moves come from one table, so an unexpected move (input arriving in the
 * middle of a cascade, say) fails loudly instead of silently corrupting the turn.
 */
export class StateMachine<TState extends string> {
  private current: TState;

  constructor(
    initial: TState,
    private readonly transitions: Transitions<TState>,
  ) {
    this.current = initial;
  }

  get state(): TState {
    return this.current;
  }

  is(state: TState): boolean {
    return this.current === state;
  }

  can(next: TState): boolean {
    return this.transitions[this.current].includes(next);
  }

  /** Moves to `next`. Throws when the table does not allow it. */
  transition(next: TState): void {
    if (!this.can(next)) throw new Error(`illegal transition ${this.current} -> ${next}`);
    this.current = next;
  }
}
