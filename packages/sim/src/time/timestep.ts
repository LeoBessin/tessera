/**
 * The simulation advances in fixed, equal steps and never in variable ones.
 *
 * A fixed step is what makes a run reproducible, lets the client predict the
 * server by executing the same code, and keeps physics stable regardless of
 * frame rate. Rendering interpolates between steps using {@link Accumulator.alpha}.
 */

/** Matches the server's `setFixedTimestep` rate; clients are told this on join. */
export const TICK_RATE_HZ = 30;

export const FIXED_DT = 1 / TICK_RATE_HZ;

/**
 * Upper bound on steps executed for a single frame. Without it, one long stall
 * schedules a burst of catch-up steps that causes the next stall — the
 * "spiral of death".
 */
export const MAX_CATCHUP_STEPS = 5;

export interface Accumulator {
  /** Consumes a frame's elapsed seconds and reports how many fixed steps to run. */
  advance(frameSeconds: number): number;
  /** Fraction of the next step already elapsed, in `[0, 1)`, for interpolation. */
  readonly alpha: number;
}

export function createAccumulator(
  fixedDt: number = FIXED_DT,
  maxSteps: number = MAX_CATCHUP_STEPS,
): Accumulator {
  let pending = 0;

  return {
    advance(frameSeconds) {
      if (!Number.isFinite(frameSeconds) || frameSeconds <= 0) return 0;

      pending += frameSeconds;
      let steps = Math.floor(pending / fixedDt);

      if (steps > maxSteps) {
        // Deliberately forfeit the backlog: time is lost, but the frame recovers.
        steps = maxSteps;
        pending = 0;
        return steps;
      }

      pending -= steps * fixedDt;
      return steps;
    },
    get alpha() {
      return pending / fixedDt;
    },
  };
}
