import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/core/StateMachine';

type Light = 'red' | 'green' | 'yellow';

const makeLight = (): StateMachine<Light> =>
  new StateMachine<Light>('red', { red: ['green'], green: ['yellow'], yellow: ['red'] });

describe('StateMachine', () => {
  it('starts in the initial state', () => {
    expect(makeLight().state).toBe('red');
  });

  it('follows allowed transitions', () => {
    const light = makeLight();
    light.transition('green');
    light.transition('yellow');
    expect(light.is('yellow')).toBe(true);
  });

  it('throws on a transition the table does not allow', () => {
    const light = makeLight();
    expect(light.can('yellow')).toBe(false);
    expect(() => {
      light.transition('yellow');
    }).toThrow('illegal transition red -> yellow');
  });
});
