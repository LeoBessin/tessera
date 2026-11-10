import type { MoveCommand } from '@tessera/sim';

/**
 * Keyboard input, as a domain concern rather than a DOM one.
 *
 * The game is played entirely from the keyboard, so input deserves a real model
 * instead of event handlers scattered through the render loop. Keys are mapped
 * to *intents*; everything downstream speaks intents. That makes rebinding a
 * data change, makes the whole module testable without a browser, and keeps
 * `KeyboardEvent` from leaking into the game.
 */

export type Intent = 'up' | 'down' | 'left' | 'right' | 'dash' | 'interact';

/** Keyed by `KeyboardEvent.code`, so the layout works on AZERTY as well as QWERTY. */
export const DEFAULT_BINDINGS: ReadonlyMap<string, Intent> = new Map([
  ['KeyW', 'up'],
  ['ArrowUp', 'up'],
  ['KeyS', 'down'],
  ['ArrowDown', 'down'],
  ['KeyA', 'left'],
  ['ArrowLeft', 'left'],
  ['KeyD', 'right'],
  ['ArrowRight', 'right'],
  ['Space', 'dash'],
  ['KeyE', 'interact'],
]);

/**
 * The camera looks along the world diagonal, so "up" on the keyboard is not
 * "up" in the world. Input is rotated by this much to put movement where the
 * player can see it going.
 */
export const ISO_YAW = -Math.PI / 4;

/**
 * Converts a screen-space direction into world space.
 *
 * Without this, holding "up" in an isometric view sends the character off at
 * 45° to the screen — the single most disorienting bug an isometric game can
 * ship, and one that no amount of play-testing makes tolerable.
 */
export function screenToWorld(screen: MoveCommand): MoveCommand {
  const cos = Math.cos(ISO_YAW);
  const sin = Math.sin(ISO_YAW);
  return {
    moveX: screen.moveX * cos - screen.moveY * sin,
    moveY: screen.moveX * sin + screen.moveY * cos,
  };
}

/**
 * Which intents are currently held.
 *
 * Deliberately knows nothing about events or elements: a caller feeds it key
 * codes, a test feeds it the same key codes.
 */
export class IntentState {
  readonly #held = new Set<Intent>();
  readonly #bindings: ReadonlyMap<string, Intent>;

  constructor(bindings: ReadonlyMap<string, Intent> = DEFAULT_BINDINGS) {
    this.#bindings = bindings;
  }

  /** Returns whether the key was bound — callers use it to decide on preventDefault. */
  press(code: string): boolean {
    const intent = this.#bindings.get(code);
    if (intent === undefined) return false;
    this.#held.add(intent);
    return true;
  }

  release(code: string): boolean {
    const intent = this.#bindings.get(code);
    if (intent === undefined) return false;
    this.#held.delete(intent);
    return true;
  }

  /**
   * Forgets everything held.
   *
   * Called when the window loses focus. Without it, alt-tabbing mid-stride
   * leaves a key logically down and the character walks into a wall forever —
   * the browser never delivers the keyup that happened elsewhere.
   */
  releaseAll(): void {
    this.#held.clear();
  }

  isActive(intent: Intent): boolean {
    return this.#held.has(intent);
  }

  /** Held direction in screen space: `+x` right, `+y` up. Opposites cancel. */
  screenDirection(): MoveCommand {
    return {
      moveX: (this.isActive('right') ? 1 : 0) - (this.isActive('left') ? 1 : 0),
      moveY: (this.isActive('up') ? 1 : 0) - (this.isActive('down') ? 1 : 0),
    };
  }

  /** The command to send this tick, already rotated into world space. */
  toCommand(): MoveCommand {
    return screenToWorld(this.screenDirection());
  }
}
